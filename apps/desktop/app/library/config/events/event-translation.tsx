"use client";
import {
	type IBoard,
	type IEventPayload,
	Input,
	Label,
	Switch,
} from "@tm9657/flow-like-ui";
import { useCallback, useState } from "react";

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
	const node = board.nodes[nodeId ?? ""];
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
							{currentPayload?.mail || "Not configured"}
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
							{currentPayload?.sender_name || "Not configured"}
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

				{/* Apply same pattern to remaining fields */}
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
