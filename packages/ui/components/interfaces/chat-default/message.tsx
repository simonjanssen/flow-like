"use client";

import { cn } from "../../../lib";
import type { Message } from "../chat-default";

import { Bot, User } from "lucide-react";

interface MessageProps {
	message: Message;
}

export function MessageComponent({ message }: Readonly<MessageProps>) {
	const isUser = message.role === "user";

	return (
		<div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
			{!isUser && (
				<div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
					<Bot className="w-4 h-4 text-primary-foreground" />
				</div>
			)}

			<div
				className={cn(
					"rounded-lg px-4 py-2 max-w-[80%]",
					isUser
						? "bg-primary text-primary-foreground"
						: "bg-muted text-muted-foreground",
				)}
			>
				<p className="text-sm leading-relaxed whitespace-pre-wrap">
					{message.content}
				</p>
				<span className="text-xs opacity-70 mt-1 block">
					{message.timestamp.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</span>
			</div>

			{isUser && (
				<div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
					<User className="w-4 h-4 text-muted-foreground" />
				</div>
			)}
		</div>
	);
}
