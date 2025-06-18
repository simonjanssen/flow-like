"use client";
import {
	type IBoard,
	type IEvent,
	type IEventPayload,
	type INode,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Switch,
} from "@tm9657/flow-like-ui";
import { useCallback, useEffect, useState } from "react";

const EVENT_TYPE_LOOKUP: Record<string, string[]> = {
	events_chat: ["simple_chat", "complex_chat"],
	events_mail: ["user_mail"],
	events_api: ["api"],
	events_simple: ["quick_action", "webhook"],
};

export function EventTypeConfiguration({
	node,
	event,
	disabled,
	onUpdate,
}: Readonly<{
	node: INode;
	disabled: boolean;
	event: IEvent;
	onUpdate: (type: string) => void;
}>) {
	const availableTypes = EVENT_TYPE_LOOKUP[node.name] || [];

	useEffect(() => {
		const eventTypes = EVENT_TYPE_LOOKUP[node.name] || [];

		if (!eventTypes.includes(event.event_type)) {
			onUpdate(eventTypes[0]);
		}
	}, [node.name, event.event_type]);

	if (availableTypes.length <= 1) return null;
	return (
		<div className="space-y-3">
			<Label htmlFor="event_type">Event Type</Label>
			<Select
				disabled={disabled}
				value={event.event_type}
				onValueChange={onUpdate}
			>
				<SelectTrigger className="w-full">
					<SelectValue placeholder="Select event type" />
				</SelectTrigger>
				<SelectContent>
					{availableTypes.map((type) => (
						<SelectItem key={type} value={type}>
							{type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

export function EventTranslation({
	editing,
	board,
	nodeId,
	payload,
	onUpdate,
}: Readonly<{
	editing: boolean;
	payload: Partial<IEventPayload>;
	board: IBoard;
	nodeId?: string;
	onUpdate?: (payload: Partial<IEventPayload>) => void;
}>) {
	const node: INode | undefined = board.nodes[nodeId ?? ""];
	const [currentPayload, setCurrentPayload] = useState<Partial<IEventPayload>>(
		payload ?? {},
	);

	const setValue = useCallback(
		(key: string, value: any) => {
			setCurrentPayload((prev) => ({
				...prev,
				[key]: value,
			}));

			if (onUpdate) {
				onUpdate({
					...currentPayload,
					[key]: value,
				});
			}
		},
		[currentPayload, onUpdate],
	);

	if (!node) return <p className="text-red-500">Node not found.</p>;

	if (node.name === "events_chat") {
		return (
			<div className="w-full space-y-6">
				<div className="space-y-4">
					<div className="flex items-center space-x-2">
						<Switch
							disabled={!editing}
							id="allow_file_upload"
							checked={currentPayload?.allow_file_upload ?? true}
							onCheckedChange={(checked) => {
								setValue("allow_file_upload", checked);
							}}
						/>
						<Label htmlFor="allow_file_upload">Allow File Upload</Label>
					</div>
					<p className="text-sm text-muted-foreground">
						Enable users to upload files during chat conversations
					</p>
				</div>

				<div className="space-y-4">
					<div className="flex items-center space-x-2">
						<Switch
							disabled={!editing}
							id="allow_voice_input"
							checked={currentPayload?.allow_voice_input ?? false}
							onCheckedChange={(checked) => {
								setValue("allow_voice_input", checked);
							}}
						/>
						<Label htmlFor="allow_voice_input">Allow Voice Input</Label>
					</div>
					<p className="text-sm text-muted-foreground">
						Enable users to use voice input for chat messages
					</p>
				</div>

				<div className="space-y-3">
					<Label htmlFor="history_elements">History Elements</Label>
					{editing ? (
						<Input
							value={currentPayload?.history_elements ?? 5}
							onChange={(e) => {
								const value = e.target.value
									? Number.parseInt(e.target.value, 10)
									: 5;
								setValue("history_elements", value);
							}}
							type="number"
							id="history_elements"
							placeholder="5"
							min="1"
							max="100"
						/>
					) : (
						<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
							{currentPayload?.history_elements ?? 5}
						</div>
					)}
					<p className="text-sm text-muted-foreground">
						Number of previous messages to include in chat context
					</p>
				</div>

				<div className="space-y-3">
					<Label htmlFor="tools">Available Tools</Label>
					{editing ? (
						<div className="space-y-2">
							<div className="flex flex-wrap gap-2">
								{(currentPayload?.tools || []).map((tool, index) => (
									<div
										key={index}
										className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
									>
										<span>{tool}</span>
										<button
											type="button"
											onClick={() => {
												const newTools = [...(currentPayload?.tools || [])];
												newTools.splice(index, 1);
												setValue("tools", newTools);
											}}
											className="text-secondary-foreground/70 hover:text-secondary-foreground"
										>
											×
										</button>
									</div>
								))}
							</div>
							<Input
								placeholder="Type a tool name and press Enter"
								onKeyDown={(e) => {
									if (e.key === "Enter" && e.currentTarget.value.trim()) {
										e.preventDefault();
										const newTool = e.currentTarget.value.trim();
										const currentTools = currentPayload?.tools || [];
										if (!currentTools.includes(newTool)) {
											setValue("tools", [...currentTools, newTool]);
										}
										e.currentTarget.value = "";
									}
								}}
							/>
						</div>
					) : (
						<div className="space-y-2">
							{(currentPayload?.tools || []).length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{(currentPayload?.tools || []).map((tool, index) => (
										<div
											key={index}
											className="inline-flex items-center bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm"
										>
											{tool}
										</div>
									))}
								</div>
							) : (
								<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
									No tools configured
								</div>
							)}
						</div>
					)}
					<p className="text-sm text-muted-foreground">
						Tools available for this chat. Press Enter to add a new tool.
					</p>
				</div>

				<div className="space-y-3">
					<Label htmlFor="default_tools">Default Tools</Label>
					{editing ? (
						<div className="space-y-2">
							<div className="flex flex-wrap gap-2">
								{(currentPayload?.default_tools || []).map((tool, index) => (
									<div
										key={index}
										className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-md text-sm"
									>
										<span>{tool}</span>
										<button
											type="button"
											onClick={() => {
												const newTools = [
													...(currentPayload?.default_tools || []),
												];
												newTools.splice(index, 1);
												setValue("default_tools", newTools);
											}}
											className="text-primary-foreground/70 hover:text-primary-foreground"
										>
											×
										</button>
									</div>
								))}
							</div>
							<Input
								placeholder="Type a tool name and press Enter"
								onKeyDown={(e) => {
									if (e.key === "Enter" && e.currentTarget.value.trim()) {
										e.preventDefault();
										const newTool = e.currentTarget.value.trim();
										const currentTools = currentPayload?.default_tools || [];
										if (!currentTools.includes(newTool)) {
											setValue("default_tools", [...currentTools, newTool]);
										}
										e.currentTarget.value = "";
									}
								}}
							/>
						</div>
					) : (
						<div className="space-y-2">
							{(currentPayload?.default_tools || []).length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{(currentPayload?.default_tools || []).map((tool, index) => (
										<div
											key={index}
											className="inline-flex items-center bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm"
										>
											{tool}
										</div>
									))}
								</div>
							) : (
								<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
									No default tools
								</div>
							)}
						</div>
					)}
					<p className="text-sm text-muted-foreground">
						Tools enabled by default. Press Enter to add a new tool.
					</p>
				</div>

				<div className="space-y-3">
					<Label htmlFor="example_messages">Example Messages</Label>
					{editing ? (
						<div className="space-y-2">
							<div className="flex flex-wrap gap-2">
								{(currentPayload?.example_messages || []).map(
									(message, index) => (
										<div
											key={index}
											className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm max-w-xs"
										>
											<span className="truncate">{message}</span>
											<button
												type="button"
												onClick={() => {
													const newMessages = [
														...(currentPayload?.example_messages || []),
													];
													newMessages.splice(index, 1);
													setValue("example_messages", newMessages);
												}}
												className="text-secondary-foreground/70 hover:text-secondary-foreground flex-shrink-0"
											>
												×
											</button>
										</div>
									),
								)}
							</div>
							<Input
								placeholder="Type an example message and press Enter"
								onKeyDown={(e) => {
									if (e.key === "Enter" && e.currentTarget.value.trim()) {
										e.preventDefault();
										const newMessage = e.currentTarget.value.trim();
										const currentMessages =
											currentPayload?.example_messages || [];
										if (!currentMessages.includes(newMessage)) {
											setValue("example_messages", [
												...currentMessages,
												newMessage,
											]);
										}
										e.currentTarget.value = "";
									}
								}}
							/>
						</div>
					) : (
						<div className="space-y-2">
							{(currentPayload?.example_messages || []).length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{(currentPayload?.example_messages || []).map(
										(message, index) => (
											<div
												key={index}
												className="inline-flex items-center bg-muted text-muted-foreground px-2 py-1 rounded-md text-sm max-w-xs"
											>
												<span className="truncate">{message}</span>
											</div>
										),
									)}
								</div>
							) : (
								<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
									No example messages
								</div>
							)}
						</div>
					)}
					<p className="text-sm text-muted-foreground">
						Example messages to show users. Press Enter to add a new message.
					</p>
				</div>
			</div>
		);
	}

	if (node.name === "events_mail") {
		return (
			<div className="w-full space-y-6">
				<div className="space-y-3">
					<Label htmlFor="mail">Email Address</Label>
					{editing ? (
						<Input
							value={currentPayload?.mail ?? ""}
							onChange={(e) => setValue("mail", e.target.value)}
							type="email"
							id="mail"
							placeholder="your-email@example.com"
						/>
					) : (
						<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
							{currentPayload?.mail ?? "Not configured"}
						</div>
					)}
					<p className="text-sm text-muted-foreground">
						Primary email address for sending and receiving
					</p>
				</div>

				<div className="space-y-3">
					<Label htmlFor="sender_name">Sender Name</Label>
					{editing ? (
						<Input
							value={currentPayload?.sender_name ?? ""}
							onChange={(e) => setValue("sender_name", e.target.value)}
							type="text"
							id="sender_name"
							placeholder="Your App Name"
						/>
					) : (
						<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
							{currentPayload?.sender_name ?? "Not configured"}
						</div>
					)}
					<p className="text-sm text-muted-foreground">
						Display name shown to email recipients
					</p>
				</div>

				{/* Continue this pattern for all other mail fields... */}

				<div className="space-y-3">
					<Label htmlFor="secret_imap_password">IMAP Password</Label>
					{editing ? (
						<Input
							value={currentPayload?.secret_imap_password ?? ""}
							onChange={(e) => setValue("secret_imap_password", e.target.value)}
							type="password"
							id="secret_imap_password"
							placeholder="••••••••"
						/>
					) : (
						<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
							{currentPayload?.secret_imap_password
								? "••••••••"
								: "Not configured"}
						</div>
					)}
					<p className="text-sm text-muted-foreground">
						Password or app-specific password for IMAP
					</p>
				</div>
			</div>
		);
	}

	if (node.name === "events_api") {
		return (
			<div className="w-full space-y-6">
				<div className="space-y-3">
					<Label htmlFor="method">HTTP Method</Label>
					{editing ? (
						<select
							value={currentPayload?.method ?? "GET"}
							onChange={(e) => setValue("method", e.target.value)}
							id="method"
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="GET">GET</option>
							<option value="POST">POST</option>
							<option value="PUT">PUT</option>
							<option value="PATCH">PATCH</option>
							<option value="DELETE">DELETE</option>
						</select>
					) : (
						<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
							{currentPayload?.method ?? "GET"}
						</div>
					)}
					<p className="text-sm text-muted-foreground">
						HTTP method for the API endpoint
					</p>
				</div>

				<div className="space-y-4">
					<div className="flex items-center space-x-2">
						{editing ? (
							<Switch
								id="public_endpoint"
								checked={currentPayload?.public_endpoint ?? false}
								onCheckedChange={(checked) =>
									setValue("public_endpoint", checked)
								}
							/>
						) : (
							<div
								className={`h-5 w-9 rounded-full ${currentPayload?.public_endpoint ? "bg-primary" : "bg-muted"} flex items-center ${currentPayload?.public_endpoint ? "justify-end" : "justify-start"} px-0.5`}
							>
								<div className="h-4 w-4 rounded-full bg-white" />
							</div>
						)}
						<Label htmlFor="public_endpoint">Public Endpoint</Label>
						{!editing && (
							<span className="text-sm text-muted-foreground">
								{currentPayload?.public_endpoint ? "Enabled" : "Disabled"}
							</span>
						)}
					</div>
					<p className="text-sm text-muted-foreground">
						Allow access without authentication (use with caution)
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full space-y-4">
			<p className="text-sm text-muted-foreground">
				No specific configuration available for this event type.
			</p>
		</div>
	);
}
