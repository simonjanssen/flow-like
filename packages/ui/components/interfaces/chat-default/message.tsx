"use client";

import {
	ChevronDown,
	ChevronUp,
	CopyIcon,
	MessageSquareIcon,
	ThumbsDownIcon,
	ThumbsUpIcon,
	X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { IRole, cn } from "../../../lib";
import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Label,
	MarkdownComponent,
	Switch,
	Textarea,
} from "../../ui";
import { FilePreview, type ProcessedAttachment } from "./attachment";
import { FileDialog, FileDialogPreview } from "./attachment-dialog";
import type { IAttachment, IMessage } from "./chat-db";

interface MessageProps {
	message: IMessage;
	noToolbar?: boolean;
	onMessageUpdate?: (
		messageId: string,
		updates: Partial<IMessage>,
	) => void | Promise<void>;
}

export function MessageComponent({
	message,
	noToolbar,
	onMessageUpdate,
}: Readonly<MessageProps>) {
	const isUser = message.inner.role === IRole.User;
	const [isExpanded, setIsExpanded] = useState(false);
	const [showToggle, setShowToggle] = useState(false);
	const [fullscreenFile, setFullscreenFile] =
		useState<ProcessedAttachment | null>(null);
	const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
	const [feedbackComment, setFeedbackComment] = useState(
		message.ratingSettings?.comment || "",
	);
	const [includeChatHistory, setIncludeChatHistory] = useState(
		message.ratingSettings?.includeChatHistory || false,
	);
	const [canContact, setCanContact] = useState(
		message.ratingSettings?.canContact || false,
	);
	const contentRef = useRef<HTMLDivElement>(null);

	// Approximate 4 lines based on line-height (1.5 * 1rem = 1.5rem per line)
	const maxCollapsedHeight = "6rem"; // ~4 lines

	const messageContent = useMemo(() => {
		if (typeof message.inner.content === "string") {
			return { text: message.inner.content, attachments: message.files ?? [] };
		}

		let text = "";
		const attachments: IAttachment[] = [];

		for (const part of message.inner.content) {
			if (part.text) {
				text += `${part.text}\n`;
				continue;
			}

			if (part.image_url?.url) attachments.push(part.image_url?.url);
		}

		return { text, attachments: [...attachments, ...(message.files ?? [])] };
	}, [message.inner.content, message.files]);

	const processedAttachments = useMemo(() => {
		const processed: ProcessedAttachment[] = [];

		messageContent.attachments.forEach((attachment) => {
			const attachmentUrl =
				typeof attachment === "string" ? attachment : attachment.url;
			const attachmentData: Partial<IAttachment> =
				typeof attachment === "object" ? attachment : {};

			let type: ProcessedAttachment["type"] = "other";
			let name = attachmentData.name || "";
			let isDataUrl = false;

			// Handle different URL types
			if (attachmentUrl.startsWith("data:")) {
				// Base64 data URL
				isDataUrl = true;
				const mimeMatch = attachmentUrl.match(/^data:([^;]+)/);
				const mimeType = mimeMatch ? mimeMatch[1] : "";

				// Use provided type or determine from MIME type
				if (attachmentData.type) {
					if (attachmentData.type.startsWith("image/")) type = "image";
					else if (attachmentData.type.startsWith("video/")) type = "video";
					else if (attachmentData.type.startsWith("audio/")) type = "audio";
					else if (attachmentData.type === "application/pdf") type = "pdf";
					else if (
						attachmentData.type.includes("document") ||
						attachmentData.type.includes("text")
					)
						type = "document";
				} else {
					// Fallback to MIME type detection
					if (mimeType.startsWith("image/")) type = "image";
					else if (mimeType.startsWith("video/")) type = "video";
					else if (mimeType.startsWith("audio/")) type = "audio";
					else if (mimeType === "application/pdf") type = "pdf";
				}

				// Generate name if not provided
				if (!name) {
					const extension = mimeType.split("/")[1] || "file";
					name = `${type === "other" ? "Data" : type.charAt(0).toUpperCase() + type.slice(1)}.${extension}`;
				}
			} else {
				// Regular URL or signed URL
				try {
					const url = new URL(attachmentUrl);
					const pathname = url.pathname.toLowerCase();

					// Extract filename from pathname if name not provided
					if (!name) {
						const pathParts = pathname.split("/");
						const filename = pathParts[pathParts.length - 1];
						name = filename || url.hostname;
					}

					// Remove query parameters for file extension detection
					const cleanPath = pathname.split("?")[0];

					// Use provided type or determine from extension
					if (attachmentData.type) {
						if (attachmentData.type.startsWith("image/")) type = "image";
						else if (attachmentData.type.startsWith("video/")) type = "video";
						else if (attachmentData.type.startsWith("audio/")) type = "audio";
						else if (attachmentData.type === "application/pdf") type = "pdf";
						else if (
							attachmentData.type.includes("document") ||
							attachmentData.type.includes("text")
						)
							type = "document";
						else if (attachmentData.type.includes("html")) type = "website";
					} else {
						// Fallback to file extension detection
						if (cleanPath.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/)) {
							type = "image";
						} else if (
							cleanPath.match(/\.(mp4|webm|mov|avi|mkv|m4v|3gp|ogv)$/)
						) {
							type = "video";
						} else if (cleanPath.match(/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/)) {
							type = "audio";
						} else if (cleanPath.match(/\.pdf$/)) {
							type = "pdf";
						} else if (
							cleanPath.match(/\.(doc|docx|txt|md|rtf|xls|xlsx|ppt|pptx)$/)
						) {
							type = "document";
						} else if (url.protocol === "http:" || url.protocol === "https:") {
							type = "website";
							if (!name || name === url.hostname) {
								name = url.hostname;
							}
						}
					}
				} catch {
					// If URL parsing fails, try to determine type from file extension
					const lowerUrl = attachmentUrl.toLowerCase();
					if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/)) {
						type = "image";
						name = name || attachmentUrl.split("/").pop() || attachmentUrl;
					} else if (lowerUrl.match(/\.(mp4|webm|mov|avi|mkv|m4v|3gp|ogv)$/)) {
						type = "video";
						name = name || attachmentUrl.split("/").pop() || attachmentUrl;
					} else if (lowerUrl.match(/\.(mp3|wav|ogg|m4a|flac|aac|wma)$/)) {
						type = "audio";
						name = name || attachmentUrl.split("/").pop() || attachmentUrl;
					} else if (lowerUrl.match(/\.pdf$/)) {
						type = "pdf";
						name = name || attachmentUrl.split("/").pop() || attachmentUrl;
					} else if (
						lowerUrl.match(/\.(doc|docx|txt|md|rtf|xls|xlsx|ppt|pptx)$/)
					) {
						type = "document";
						name = name || attachmentUrl.split("/").pop() || attachmentUrl;
					} else {
						name = name || attachmentUrl.split("/").pop() || attachmentUrl;
					}
				}
			}

			processed.push({
				url: attachmentUrl,
				name,
				type,
				pageNumber: attachmentData.page,
				isDataUrl,
				thumbnailUrl: attachmentData.thumbnail_url,
				previewText: attachmentData.preview_text,
				size: attachmentData.size,
				anchor: attachmentData.anchor,
			});
		});

		return processed;
	}, [messageContent.attachments]);

	// Separate files by type with priority logic
	const audioFiles = processedAttachments.filter(
		(file) => file.type === "audio",
	);
	const imageFiles = processedAttachments.filter(
		(file) => file.type === "image",
	);
	const videoFiles = processedAttachments.filter(
		(file) => file.type === "video",
	);
	const otherFiles = processedAttachments.filter(
		(file) => !["audio", "image", "video"].includes(file.type),
	);

	// Layout logic: 1 audio (if any), up to 4 images in grid, 1 video, rest in dialog
	const visibleAudio = audioFiles.slice(0, 1);
	const visibleImages = imageFiles.slice(0, 4);
	const visibleVideo = videoFiles.slice(0, 1);

	const hiddenAudio = audioFiles.slice(1);
	const hiddenImages = imageFiles.slice(4);
	const hiddenVideos = videoFiles.slice(1);
	const allHiddenFiles = [
		...hiddenAudio,
		...hiddenImages,
		...hiddenVideos,
		...otherFiles,
	];

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
	}, [message.inner, isUser, maxCollapsedHeight]);

	const handleFileClick = (file: ProcessedAttachment) => {
		if (file.isDataUrl) {
			// For data URLs, create a blob and download or open
			if (file.type === "image") {
				// Open image in new tab
				const newWindow = window.open();
				if (newWindow) {
					newWindow.document.write(
						`<img src="${file.url}" style="max-width: 100%; height: auto;" />`,
					);
				}
			} else {
				// Download other data URLs
				const link = document.createElement("a");
				link.href = file.url;
				link.download = file.name || "file";
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
			}
		} else {
			// Open regular URLs in new tab
			window.open(file.url, "_blank", "noopener,noreferrer");
		}
	};

	const getImageGridClassName = (count: number) => {
		if (count === 1) return "grid-cols-1";
		if (count === 2) return "grid-cols-2";
		if (count >= 3) return "grid-cols-2";
		return "grid-cols-1";
	};

	const copyToClipboard = useCallback(() => {
		if (messageContent.text) {
			navigator.clipboard
				.writeText(messageContent.text)
				.then(() => {
					toast.success("Message copied to clipboard");
				})
				.catch((err) => {
					console.error("Failed to copy message: ", err);
				});
		}
	}, [messageContent.text]);

	const upsertFeedback = useCallback(
		(rating: number) => {
			if (!onMessageUpdate) return;

			const currentRating = message.rating ?? 0;
			const newRating = currentRating === rating ? 0 : rating;

			onMessageUpdate(message.id, {
				rating: newRating,
				ratingSettings: newRating === 0 ? undefined : message.ratingSettings,
			});

			if (newRating === 1) {
				toast.success("Thanks for the feedback! ❤️");
			} else if (newRating === -1) {
				toast.success("Thanks for the feedback! ❤️");
			}
		},
		[message.id, message.rating, message.ratingSettings, onMessageUpdate],
	);

	const handleFeedbackSubmit = useCallback(() => {
		if (!onMessageUpdate) return;

		const ratingSettings = {
			comment: feedbackComment.trim(),
			includeChatHistory,
			canContact,
		};

		onMessageUpdate(message.id, {
			ratingSettings,
		});

		setShowFeedbackDialog(false);
		toast.success("Feedback submitted successfully!");
	}, [
		message.id,
		feedbackComment,
		includeChatHistory,
		canContact,
		onMessageUpdate,
	]);

	const gaveMoreFeedback = useMemo(() => {
		return (
			message.ratingSettings &&
			(message.ratingSettings.comment ||
				message.ratingSettings.includeChatHistory ||
				message.ratingSettings.canContact)
		);
	}, [message.ratingSettings]);

	return (
		<div
			className={cn(
				"max-w-screen-lg flex gap-1 flex-col",
				isUser ? "items-end" : "items-start",
			)}
		>
			<div
				className={cn(
					"rounded-xl rounded-tr-sm p-4 pt-2 max-w-[80%] whitespace-break-spaces",
					isUser
						? "bg-muted dark:bg-muted/30 text-foreground max-w-screen-md"
						: "bg-background text-foreground max-w-full w-full pb-0",
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
					<MarkdownComponent content={messageContent.text} />
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

				{/* Audio Files - Show first one */}
				{visibleAudio.length > 0 && (
					<div className="mt-2 max-w-md">
						{visibleAudio.map((file) => (
							<FilePreview
								key={file.url}
								file={file}
								onClick={handleFileClick}
							/>
						))}
					</div>
				)}

				{/* Image Files - Grid layout up to 4 */}
				{visibleImages.length > 0 && (
					<div
						className={cn(
							"mt-2 grid gap-1.5 max-w-md",
							getImageGridClassName(visibleImages.length),
						)}
					>
						{visibleImages.map((file) => (
							<FilePreview
								key={file.url}
								file={file}
								showFullscreenButton={true}
								onFullscreen={setFullscreenFile}
							/>
						))}
					</div>
				)}

				{/* Video Files - Show first one below images */}
				{visibleVideo.length > 0 && (
					<div className="mt-2 max-w-md">
						{visibleVideo.map((file) => (
							<FilePreview
								key={file.url}
								file={file}
								onClick={handleFileClick}
							/>
						))}
					</div>
				)}

				{!(noToolbar ?? false) && (
					<div
						className={cn(
							"flex flex-row items-center gap-3 h-6 w-full mt-2",
							isUser ? "justify-end px-2 pt-2" : "justify-start",
						)}
					>
						{/* References Badge for hidden files */}
						{allHiddenFiles.length > 0 && (
							<FileDialog
								files={processedAttachments}
								handleFileClick={handleFileClick}
							/>
						)}
						{!isUser && (
							<button
								onClick={() => upsertFeedback(1)}
								className={`transition-colors ${(message.rating ?? 0) > 0 ? "text-emerald-500 dark:text-emerald-400 hover:text-emerald-300 dark:hover:text-emerald-300" : "text-muted-foreground hover:text-foreground"}`}
							>
								<ThumbsUpIcon className={`w-4 h-4`} />
							</button>
						)}
						{!isUser && (
							<button
								onClick={() => upsertFeedback(-1)}
								className={`transition-colors ${(message.rating ?? 0) < 0 ? "text-primary hover:text-primary/80" : "text-muted-foreground hover:text-foreground"}`}
							>
								<ThumbsDownIcon className={`w-4 h-4`} />
							</button>
						)}
						{(message.rating ?? 0) !== 0 && (
							<button onClick={() => setShowFeedbackDialog(true)}>
								<Badge
									variant={gaveMoreFeedback ? "outline" : "default"}
									className="h-6 rounded-full"
								>
									{gaveMoreFeedback
										? "✅ Feedback provided"
										: "Provide feedback"}
								</Badge>
							</button>
						)}
						<button
							onClick={copyToClipboard}
							className="text-muted-foreground hover:text-foreground transition-colors"
						>
							<CopyIcon className="w-4 h-4" />
						</button>
					</div>
				)}
			</div>

			{/* Fullscreen Modal */}
			{fullscreenFile && (
				<Dialog
					open={!!fullscreenFile}
					onOpenChange={() => setFullscreenFile(null)}
				>
					<DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black">
						<div className="relative h-full">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setFullscreenFile(null)}
								className="absolute top-4 right-4 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full h-8 w-8 p-0"
							>
								<X className="w-4 h-4" />
							</Button>
							<div className="p-4">
								<FileDialogPreview file={fullscreenFile} />
							</div>
							<div className="absolute bottom-4 left-4 right-4 text-center">
								<p className="text-white text-sm bg-black/50 rounded px-2 py-1 inline-block">
									{fullscreenFile.name}
								</p>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}
			{/* Feedback Dialog */}
			<Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<MessageSquareIcon className="w-5 h-5 text-primary" />
							Share Additional Feedback
						</DialogTitle>
						<DialogDescription>
							Help us improve by sharing more details about your experience with
							this response.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								Your feedback
							</Label>
							<Textarea
								placeholder="Tell us what you think about this response..."
								value={feedbackComment}
								onChange={(e) => setFeedbackComment(e.target.value)}
								className="min-h-[100px] resize-none"
							/>
						</div>

						<div className="space-y-3">
							<div className="flex items-center space-x-2">
								<Switch
									id="chat-history"
									checked={includeChatHistory}
									onCheckedChange={setIncludeChatHistory}
								/>
								<label
									htmlFor="chat-history"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Include chat history with feedback
								</label>
							</div>

							<div className="flex items-center space-x-2">
								<Switch
									id="can-contact"
									checked={canContact}
									onCheckedChange={setCanContact}
								/>
								<label
									htmlFor="can-contact"
									className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									You may contact me about this feedback
								</label>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowFeedbackDialog(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleFeedbackSubmit}
							className="bg-primary hover:bg-primary/90"
						>
							Submit Feedback
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
