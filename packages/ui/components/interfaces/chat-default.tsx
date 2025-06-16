"use client";

import { createId } from "@paralleldrive/cuid2";
import { useLiveQuery } from "dexie-react-hooks";
import { SidebarOpenIcon, SquarePenIcon } from "lucide-react";
import {
	type RefObject,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	type IEvent,
	type IEventPayloadChat,
	type IHistoryMessage,
	IRole,
} from "../../lib";
import { useBackend } from "../../state/backend-state";
import { Button, HoverCard, HoverCardContent, HoverCardTrigger } from "../ui";
import { fileToAttachment } from "./chat-default/attachment";
import { Chat, type IChatProps, type IChatRef } from "./chat-default/chat";
import { type IMessage, chatDb } from "./chat-default/chat-db";
import type { ISendMessageFunction } from "./chat-default/chatbox";
import { ChatWelcome } from "./chat-default/welcome";
import type { IToolBarActions } from "./interfaces";

export function ChatInterface({
	appId,
	event,
	config = {},
	toolbarRef,
}: Readonly<{
	appId: string;
	event: IEvent;
	config?: Partial<IEventPayloadChat>;
	toolbarRef?: RefObject<IToolBarActions | null>;
}>) {
	const backend = useBackend();
	const [sessionId, setSessionId] = useState<string>(createId());
	const chatRef = useRef<IChatRef>(null);
	const messages = useLiveQuery(
		() =>
			chatDb.messages.where("sessionId").equals(sessionId).sortBy("timestamp"),
		[sessionId],
	);
	const localState = useLiveQuery(
		() =>
			chatDb.localStage
				.where("[sessionId+eventId]")
				.equals([sessionId, event.id])
				.first(),
		[sessionId, event.id],
	);
	const globalState = useLiveQuery(
		() =>
			chatDb.globalState
				.where("[appId+eventId]")
				.equals([appId, event.id])
				.first(),
		[appId, event.id],
	);

	useEffect(() => {
		toolbarRef?.current?.pushElements([
			<HoverCard key="chat-history" openDelay={200} closeDelay={100}>
				<HoverCardTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						className="hover:bg-accent hover:text-accent-foreground transition-colors"
					>
						<SidebarOpenIcon className="w-4 h-4" />
					</Button>
				</HoverCardTrigger>
				<HoverCardContent
					side="bottom"
					align="center"
					className="w-auto p-2 bg-popover border shadow-lg"
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
						onClick={() => {
							setSessionId(createId());
						}}
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
				>
					<div className="flex items-center gap-2 text-sm font-medium">
						<SquarePenIcon className="w-3 h-3" />
						New Chat
					</div>
				</HoverCardContent>
			</HoverCard>,
		]);
	}, []);

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
				sessionId,
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

			await chatDb.messages.add(userMessage);

			const responseMessage: IMessage = {
				id: createId(),
				sessionId,
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
		[chatDb, sessionId, event.id, appId, chatRef.current],
	);

	if (!messages || messages?.length === 0) {
		return (
			<ChatWelcome
				onSendMessage={handleSendMessage}
				event={event}
				config={config}
			/>
		);
	}

	return (
		<Chat
			ref={chatRef}
			messages={messages}
			onSendMessage={handleSendMessage}
			config={config}
		/>
	);
}
