"use client";

import { createId } from "@paralleldrive/cuid2";
import { useLiveQuery } from "dexie-react-hooks";
import { SidebarIcon, SidebarOpenIcon, SquarePenIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
	type RefObject,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { type IEvent, type IEventPayloadChat, IRole } from "../../lib";
import { useSetQueryParams } from "../../lib/set-query-params";
import { useBackend } from "../../state/backend-state";
import {
	Button,
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
	LoadingScreen,
} from "../ui";
import { fileToAttachment } from "./chat-default/attachment";
import { Chat, type IChatRef } from "./chat-default/chat";
import { type IMessage, chatDb } from "./chat-default/chat-db";
import type { ISendMessageFunction } from "./chat-default/chatbox";
import { ChatHistory } from "./chat-default/history";
import { ChatWelcome } from "./chat-default/welcome";
import type { ISidebarActions, IToolBarActions } from "./interfaces";

export const ChatInterface = memo(function ChatInterface({
	appId,
	event,
	config = {},
	toolbarRef,
	sidebarRef,
}: Readonly<{
	appId: string;
	event: IEvent;
	config?: Partial<IEventPayloadChat>;
	toolbarRef?: RefObject<IToolBarActions | null>;
	sidebarRef?: RefObject<ISidebarActions | null>;
}>) {
	const backend = useBackend();
	const searchParams = useSearchParams();
	const sessionIdParameter = searchParams.get("sessionId") ?? createId();
	const setQueryParams = useSetQueryParams();
	const chatRef = useRef<IChatRef>(null);

	const messages = useLiveQuery(
		() =>
			chatDb.messages
				.where("sessionId")
				.equals(sessionIdParameter)
				.sortBy("timestamp"),
		[sessionIdParameter],
	);

	const localState = useLiveQuery(
		() =>
			chatDb.localStage
				.where("[sessionId+eventId]")
				.equals([sessionIdParameter, event.id])
				.first(),
		[sessionIdParameter, event.id],
	);

	const globalState = useLiveQuery(
		() =>
			chatDb.globalState
				.where("[appId+eventId]")
				.equals([appId, event.id])
				.first(),
		[appId, event.id],
	);

	const updateSessionId = useCallback(
		(newSessionId: string) => {
			setQueryParams("sessionId", newSessionId);
		},
		[setQueryParams],
	);

	const handleSidebarToggle = useCallback(() => {
		sidebarRef?.current?.toggleOpen();
	}, [sidebarRef]);

	const handleNewChat = useCallback(() => {
		updateSessionId(createId());
	}, [updateSessionId]);

	const handleSessionChange = useCallback(
		(newSessionId: string) => {
			updateSessionId(newSessionId);
			chatRef.current?.scrollToBottom();
		},
		[updateSessionId],
	);

	const toolbarElements = useMemo(
		() => [
			<HoverCard key="chat-history" openDelay={200} closeDelay={100}>
				<HoverCardTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="hover:bg-accent hover:text-accent-foreground transition-colors"
						onClick={handleSidebarToggle}
					>
						<SidebarIcon className="w-4 h-4" />
					</Button>
				</HoverCardTrigger>
				<HoverCardContent
					side="bottom"
					align="center"
					className="w-auto p-2 bg-popover border shadow-lg"
					onClick={() => {
						// Handle chat history toggle
						console.log("Open chat history");
					}}
				>
					<div className="flex items-center gap-2 text-sm font-medium">
						<SidebarOpenIcon className="w-3 h-3" />
						Chat History
					</div>
				</HoverCardContent>
			</HoverCard>,
			<HoverCard key="new-chat" openDelay={200} closeDelay={100}>
				<HoverCardTrigger asChild>
					<Button
						onClick={handleNewChat}
						variant="ghost"
						size="icon"
						className="hover:bg-accent hover:text-accent-foreground transition-colors"
					>
						<SquarePenIcon className="w-4 h-4" />
					</Button>
				</HoverCardTrigger>
				<HoverCardContent
					side="bottom"
					align="center"
					className="w-auto p-2 bg-popover border shadow-lg"
					onClick={handleNewChat}
				>
					<div className="flex items-center gap-2 text-sm font-medium">
						<SquarePenIcon className="w-3 h-3" />
						New Chat
					</div>
				</HoverCardContent>
			</HoverCard>,
		],
		[handleSidebarToggle, handleNewChat],
	);

	const sidebarContent = useMemo(
		() => (
			<ChatHistory
				key={sessionIdParameter}
				appId={appId}
				sessionId={sessionIdParameter}
				onSessionChange={handleSessionChange}
				sidebarRef={sidebarRef}
			/>
		),
		[sessionIdParameter, appId, handleSessionChange, sidebarRef],
	);

	useEffect(() => {
		toolbarRef?.current?.pushToolbarElements(toolbarElements);
		sidebarRef?.current?.pushSidebar(sidebarContent);
	}, [toolbarElements, sidebarContent, toolbarRef, sidebarRef]);

	const handleSendMessage: ISendMessageFunction = useCallback(
		async (
			content,
			filesAttached,
			activeTools?: string[],
			audioFile?: File,
		) => {
			const files = await fileToAttachment(filesAttached ?? [], backend);
			if (audioFile) {
				files.push(...(await fileToAttachment([audioFile], backend)));
			}
			const userMessage: IMessage = {
				id: createId(),
				sessionId: sessionIdParameter,
				appId,
				files: files,
				inner: {
					role: IRole.User,
					content: content,
				},
				timestamp: Date.now(),
				tools: activeTools ?? [],
				actions: [],
			};

			const sessionExists = await chatDb.sessions
				.where("id")
				.equals(sessionIdParameter)
				.count();

			if (sessionExists <= 0) {
				await chatDb.sessions.add({
					id: sessionIdParameter,
					appId,
					summarization: content,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				});
			} else {
				await chatDb.sessions.update(sessionIdParameter, {
					updatedAt: Date.now(),
				});
			}

			await chatDb.messages.add(userMessage);

			const responseMessage: IMessage = {
				id: createId(),
				sessionId: sessionIdParameter,
				appId,
				files: [],
				inner: {
					role: IRole.Assistant,
					content: "",
				},
				explicit_name: event.name,
				timestamp: Date.now(),
				tools: [],
				actions: [],
			};

			chatRef.current?.pushCurrentMessageUpdate({ ...responseMessage });

			let chunk = 0;
			while (chunk < 20) {
				await new Promise((resolve) => setTimeout(resolve, 500));
				responseMessage.inner.content += ` This is a simulated response chunk ${chunk + 1}.`;
				chatRef.current?.pushCurrentMessageUpdate({ ...responseMessage });
				chatRef.current?.scrollToBottom();
				chunk++;
			}

			chatRef.current?.clearCurrentMessageUpdate();
			await chatDb.messages.add(responseMessage);
			await new Promise((resolve) => setTimeout(resolve, 100));
			chatRef.current?.scrollToBottom();
		},
		[backend, sessionIdParameter, appId, event.name],
	);

	const onMessageUpdate = useCallback(
		async (messageId: string, message: Partial<IMessage>) => {
			await chatDb.messages.update(messageId, {
				...message,
			});
		},
		[],
	);

	const showWelcome = useMemo(
		() => !messages || messages?.length === 0,
		[messages],
	);

	if (!messages) {
		return null;
	}

	return (
		<>
			{showWelcome ? (
				<ChatWelcome
					onSendMessage={handleSendMessage}
					event={event}
					config={config}
				/>
			) : (
				<Chat
					key={sessionIdParameter}
					ref={chatRef}
					sessionId={sessionIdParameter}
					messages={messages}
					onSendMessage={handleSendMessage}
					onMessageUpdate={onMessageUpdate}
					config={config}
				/>
			)}
		</>
	);
});
