"use client";

import { useTheme } from "next-themes";
import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import PuffLoader from "react-spinners/PuffLoader";
import type { IEventPayloadChat } from "../../../lib";
import type { IMessage } from "./chat-db";
import { ChatBox, type ChatBoxRef, type ISendMessageFunction } from "./chatbox";
import { MessageComponent } from "./message";

export interface IChatProps {
	messages: IMessage[];
	onSendMessage: ISendMessageFunction;
	config?: Partial<IEventPayloadChat>;
}

export interface IChatRef {
	pushCurrentMessageUpdate: (message: IMessage) => void;
	clearCurrentMessageUpdate: () => void;
	pushMessage: (message: IMessage) => void;
	sendMessage: ISendMessageFunction;
	scrollToBottom: () => void;
	clearMessages: () => void;
	focusInput: () => void;
}

export const Chat = forwardRef<IChatRef, IChatProps>(
	({ messages, onSendMessage, config = {} }, ref) => {
		const { resolvedTheme } = useTheme();
		const messagesEndRef = useRef<HTMLDivElement>(null);
		const scrollContainerRef = useRef<HTMLDivElement>(null);
		const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
		const [currentMessage, setCurrentMessage] = useState<IMessage | null>(null);
		const [userScrolled, setUserScrolled] = useState(false);
		const [localMessages, setLocalMessages] = useState<IMessage[]>(messages);
		const chatBox = useRef<ChatBoxRef>(null);

		// Sync external messages with local state
		useEffect(() => {
			setLocalMessages(messages);
		}, [messages]);

		const scrollToBottom = useCallback(() => {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}, []);

		const handleScroll = () => {
			if (!scrollContainerRef.current) return;

			const { scrollTop, scrollHeight, clientHeight } =
				scrollContainerRef.current;
			const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;

			if (isAtBottom) {
				setShouldAutoScroll(true);
				setUserScrolled(false);
			} else {
				setShouldAutoScroll(false);
				setUserScrolled(true);
			}
		};

		useEffect(() => {
			if (shouldAutoScroll) {
				scrollToBottom();
			}
		}, [localMessages, shouldAutoScroll, scrollToBottom]);

		// Expose methods via ref
		useImperativeHandle(
			ref,
			() => ({
				pushCurrentMessageUpdate: (message: IMessage) => {
					setCurrentMessage(message);
				},
				clearCurrentMessageUpdate: () => {
					setCurrentMessage(null);
				},
				pushMessage: (message: IMessage) => {
					setLocalMessages((prev) => [...prev, message]);
				},
				sendMessage: async (content: string) => {
					onSendMessage(content);
				},
				scrollToBottom,
				clearMessages: () => {
					setLocalMessages([]);
				},
				focusInput: () => {
					chatBox.current?.focusInput?.();
				},
			}),
			[onSendMessage, scrollToBottom],
		);

		return (
			<main className="flex flex-col h-full w-full items-center flex-grow bg-background max-h-full overflow-hidden ">
				<div className="h-full flex-grow flex flex-col bg-background max-h-full w-full overflow-auto">
					{/* Messages Container */}
					<div
						ref={scrollContainerRef}
						onScroll={handleScroll}
						className="flex-1 overflow-y-auto p-4 space-y-8  flex flex-col items-center flex-grow max-h-full overflow-hidden"
					>
						{localMessages.map((message) => (
							<div className="w-full max-w-screen-lg px-4" key={message.id}>
								<MessageComponent message={message} />
							</div>
						))}
						{currentMessage && (
							<div
								className="w-full max-w-screen-lg px-4 flex flex-row items-start gap-2"
								key={currentMessage.id}
							>
								<PuffLoader
									color={resolvedTheme === "dark" ? "white" : "black"}
									className="mt-2"
									size={30}
								/>
								<MessageComponent message={currentMessage} />
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>

					{/* ChatBox */}
					<div className="bg-transparent pb-4 max-w-screen-lg w-full mx-auto">
						<ChatBox
							ref={chatBox}
							availableTools={config.tools ?? []}
							defaultActiveTools={config.default_tools ?? []}
							onSendMessage={onSendMessage}
							fileUpload={config.allow_file_upload ?? false}
							audioInput={config.allow_voice_input ?? true}
						/>
					</div>
				</div>
			</main>
		);
	},
);

Chat.displayName = "Chat";
