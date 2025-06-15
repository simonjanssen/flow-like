"use client";

import { SidebarOpenIcon, SquarePenIcon } from "lucide-react";
import { type RefObject, useEffect, useState } from "react";
import type { IEvent, IEventPayloadChat } from "../../lib";
import { Button, HoverCard, HoverCardContent, HoverCardTrigger } from "../ui";
import { Chat } from "./chat-default/chat";
import { ChatWelcome } from "./chat-default/welcome";
import type { IToolBarActions } from "./interfaces";

export interface Message {
	id: string;
	content: string;
	role: "user" | "assistant";
	timestamp: Date;
}

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
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);

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

	const addMessage = (content: string, role: "user" | "assistant") => {
		const newMessage: Message = {
			id: Date.now().toString(),
			content,
			role,
			timestamp: new Date(),
		};
		setMessages((prev) => [...prev, newMessage]);
	};

	const handleSendMessage = async (content: string) => {
		addMessage(content, "user");
		setIsLoading(true);

		// Simulate API call - replace with actual implementation
		setTimeout(() => {
			addMessage("This is a simulated response from the chatbot.", "assistant");
			setIsLoading(false);
		}, 1000);
	};

	if (messages.length === 0) {
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
			messages={messages}
			onSendMessage={handleSendMessage}
			isLoading={isLoading}
			config={config}
		/>
	);
}
