"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../../lib";
import { Button, MarkdownComponent } from "../../ui";
import type { Message } from "../chat-default";

interface MessageProps {
	message: Message;
}

export function MessageComponent({ message }: Readonly<MessageProps>) {
	const isUser = message.role === "user";
	const [isExpanded, setIsExpanded] = useState(false);
	const [showToggle, setShowToggle] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);

	// Approximate 4 lines based on line-height (1.5 * 1rem = 1.5rem per line)
	const maxCollapsedHeight = "6rem"; // ~4 lines

	useEffect(() => {
		if (isUser && contentRef.current) {
			// Use setTimeout to ensure DOM is fully rendered
			setTimeout(() => {
				if (contentRef.current) {
					const element = contentRef.current;
					const actualHeight = element.scrollHeight;
					const maxHeight = Number.parseFloat(maxCollapsedHeight) * 16;
					console.log("Actual Height:", actualHeight, "Max Height:", maxHeight);
					setShowToggle(actualHeight > maxHeight);
				}
			}, 0);
		}
	}, [message.content, isUser, maxCollapsedHeight]);

	return (
		<div
			className={cn(
				"max-w-screen-lg flex gap-3",
				isUser ? "justify-end" : "justify-start",
			)}
		>
			<div
				className={cn(
					"rounded-xl rounded-tr-sm px-4 py-2 max-w-[80%] whitespace-break-spaces",
					isUser
						? "bg-muted text-foreground max-w-screen-md"
						: "bg-background text-foreground max-w-full w-full",
				)}
			>
				<div
					ref={contentRef}
					className={cn(
						"text-sm leading-relaxed whitespace-break-spaces text-wrap max-w-full w-full",
						isUser && !isExpanded && "overflow-hidden",
					)}
					style={
						isUser && !isExpanded
							? { maxHeight: maxCollapsedHeight }
							: undefined
					}
				>
					<MarkdownComponent content={message.content} />
				</div>
				{isUser && showToggle && (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsExpanded(!isExpanded)}
						className="h-auto p-0 text-xs text-foreground hover:text-foreground/80 mt-1 cursor-pointer"
					>
						{isExpanded ? (
							<>
								<ChevronUp className="w-3 h-3 mr-1" />
								Show less
							</>
						) : (
							<>
								<ChevronDown className="w-3 h-3 mr-1" />
								Show more
							</>
						)}
					</Button>
				)}
				{isUser && (
					<span className="text-xs text-muted-foreground mt-1 block">
						{message.timestamp.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				)}
			</div>
		</div>
	);
}
