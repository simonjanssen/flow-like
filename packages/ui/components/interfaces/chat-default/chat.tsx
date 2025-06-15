"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { IEventPayloadChat } from "../../../lib";
import type { Message } from "../chat-default";
import { ChatBox, type ChatBoxRef } from "./chatbox";
import { MessageComponent } from "./message";

interface ChatProps {
	messages: Message[];
	onSendMessage: (content: string) => void;
	isLoading: boolean;
	config?: Partial<IEventPayloadChat>;
}

export function Chat({
	messages,
	onSendMessage,
	isLoading,
	config = {},
}: Readonly<ChatProps>) {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
	const [userScrolled, setUserScrolled] = useState(false);
	const chatBox = useRef<ChatBoxRef>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messagesEndRef.current]);

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
	}, [messages, shouldAutoScroll]);

	return (
		<main className="flex flex-col h-full w-full items-center flex-grow bg-background max-h-full overflow-hidden ">
			<div className="h-full flex-grow flex flex-col bg-background max-h-full w-full overflow-auto">
				{/* Messages Container */}
				<div
					ref={scrollContainerRef}
					onScroll={handleScroll}
					className="flex-1 overflow-y-auto p-4 space-y-8  flex flex-col items-center flex-grow max-h-full overflow-hidden"
				>
					{messages.map((message) => (
						<div className="w-full max-w-screen-lg px-4" key={message.id}>
							<MessageComponent message={message} />
						</div>
					))}
					{isLoading && (
						<div className="flex justify-start">
							<div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
								<div className="flex space-x-1">
									<div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
									<div
										className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
										style={{ animationDelay: "0.1s" }}
									></div>
									<div
										className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
										style={{ animationDelay: "0.2s" }}
									></div>
								</div>
							</div>
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
}
