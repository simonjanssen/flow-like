"use client";

import { useTheme } from "next-themes";
import {
	forwardRef,
	memo,
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
	onMessageUpdate?: (
		messageId: string,
		updates: Partial<IMessage>,
	) => void | Promise<void>;
	config?: Partial<IEventPayloadChat>;
	sessionId?: string;
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

const ChatInner = forwardRef<IChatRef, IChatProps>(
	(
		{ messages, onSendMessage, onMessageUpdate, config = {}, sessionId },
		ref,
	) => {
		const { resolvedTheme } = useTheme();
		const messagesEndRef = useRef<HTMLDivElement>(null);
		const scrollContainerRef = useRef<HTMLDivElement>(null);
		const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
		const [currentMessage, setCurrentMessage] = useState<IMessage | null>(null);
		const [localMessages, setLocalMessages] = useState<IMessage[]>(messages);
		const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);
		const chatBox = useRef<ChatBoxRef>(null);
		const isScrollingProgrammatically = useRef(false);

		// Sync external messages with local state
		useEffect(() => {
			setLocalMessages(messages);
		}, [messages]);

		// Initial scroll to bottom when messages first load
		useEffect(() => {
			if (localMessages.length > 0 && !hasInitiallyScrolled) {
				setTimeout(() => {
					scrollToBottom();
					setHasInitiallyScrolled(true);
				}, 100);
			}
		}, [localMessages.length, hasInitiallyScrolled]);

		const scrollToBottom = useCallback(() => {
			if (!messagesEndRef.current) return;
			if (!shouldAutoScroll) return;
			isScrollingProgrammatically.current = true;
			messagesEndRef.current.scrollIntoView({ behavior: "instant" });
			// Reset the flag after scroll animation completes
			setTimeout(() => {
				isScrollingProgrammatically.current = false;
			}, 500);
		}, [shouldAutoScroll]);

		const isAtBottom = useCallback(() => {
			if (!scrollContainerRef.current) return false;
			const { scrollTop, scrollHeight, clientHeight } =
				scrollContainerRef.current;
			const threshold = 100; // Larger threshold for better detection
			return Math.abs(scrollHeight - scrollTop - clientHeight) < threshold;
		}, []);

		const handleScroll = useCallback(() => {
			// Don't update auto-scroll state if we're programmatically scrolling
			const atBottom = isAtBottom();
			if (isScrollingProgrammatically.current) {
				console.log("Ignoring scroll - programmatic");
				if (!atBottom) {
					setShouldAutoScroll(false);
				}
				return;
			}

			console.log("Scroll event detected, at bottom:", atBottom);

			setShouldAutoScroll(atBottom);
		}, [isAtBottom]);

		// Auto-scroll when new messages arrive or current message updates, but only if should auto-scroll
		useEffect(() => {
			if (shouldAutoScroll && hasInitiallyScrolled) {
				scrollToBottom();
			}
		}, [
			localMessages,
			currentMessage,
			shouldAutoScroll,
			hasInitiallyScrolled,
			scrollToBottom,
		]);

		// When user sends a message, always scroll to bottom and enable auto-scroll
		const handleSendMessage = useCallback(
			async (content: string) => {
				setShouldAutoScroll(true);
				await onSendMessage(content);
				// Scroll after a brief delay to ensure the message is rendered
				setTimeout(() => {
					scrollToBottom();
				}, 50);
			},
			[onSendMessage, scrollToBottom],
		);

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
				sendMessage: handleSendMessage,
				scrollToBottom,
				clearMessages: () => {
					setLocalMessages([]);
					setHasInitiallyScrolled(false);
					setShouldAutoScroll(true);
				},
				focusInput: () => {
					chatBox.current?.focusInput?.();
				},
			}),
			[handleSendMessage, scrollToBottom, shouldAutoScroll],
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
								<MessageComponent
									message={message}
									onMessageUpdate={onMessageUpdate}
								/>
							</div>
						))}
						{currentMessage && (
							<div
								className="w-full max-w-screen-lg px-4 relative"
								key={currentMessage.id}
							>
								<PuffLoader
									color={resolvedTheme === "dark" ? "white" : "black"}
									className="mt-2 absolute left-0 top-0 translate-y-[2.5rem] translate-x-[-100%]"
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
							availableTools={config?.tools ?? []}
							defaultActiveTools={config?.default_tools ?? []}
							onSendMessage={handleSendMessage}
							fileUpload={config?.allow_file_upload ?? false}
							audioInput={config?.allow_voice_input ?? true}
						/>
					</div>
				</div>
			</main>
		);
	},
);

export const Chat = memo(ChatInner);
Chat.displayName = "Chat";
