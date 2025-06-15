"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "../chat-default";
import { ChatBox } from "./chatbox";
import { MessageComponent } from "./message";

interface ChatProps {
	messages: Message[];
	onSendMessage: (content: string) => void;
	isLoading: boolean;
}

export function Chat({
	messages,
	onSendMessage,
	isLoading,
}: Readonly<ChatProps>) {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
	const [userScrolled, setUserScrolled] = useState(false);

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
		<div className="flex flex-col h-screen bg-background">
			{/* Messages Container */}
			<div
				ref={scrollContainerRef}
				onScroll={handleScroll}
				className="flex-1 overflow-y-auto p-4 space-y-4"
			>
				{messages.map((message) => (
					<MessageComponent key={message.id} message={message} />
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
			<div className="border-t bg-background p-4">
				<ChatBox onSendMessage={onSendMessage} />
			</div>
		</div>
	);
}
