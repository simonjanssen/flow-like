"use client";

import { Input, Label } from "../../ui";
import type { IConfigInterfaceProps } from "../interfaces";

export function UserMailConfig({
	isEditing,
	appId,
	boardId,
	config,
	nodeId,
	node,
	onConfigUpdate,
}: IConfigInterfaceProps) {
	const setValue = (key: string, value: any) => {
		if (onConfigUpdate) {
			onConfigUpdate({
				...config,
				[key]: value,
			});
		}
	};

	return (
		<div className="w-full space-y-6">
			<div className="space-y-3">
				<Label htmlFor="mail">Email Address</Label>
				{isEditing ? (
					<Input
						value={config?.mail ?? ""}
						onChange={(e) => setValue("mail", e.target.value)}
						type="email"
						id="mail"
						placeholder="your-email@example.com"
					/>
				) : (
					<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
						{config?.mail ?? "Not configured"}
					</div>
				)}
				<p className="text-sm text-muted-foreground">
					Primary email address for sending and receiving
				</p>
			</div>

			<div className="space-y-3">
				<Label htmlFor="sender_name">Sender Name</Label>
				{isEditing ? (
					<Input
						value={config?.sender_name ?? ""}
						onChange={(e) => setValue("sender_name", e.target.value)}
						type="text"
						id="sender_name"
						placeholder="Your App Name"
					/>
				) : (
					<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
						{config?.sender_name ?? "Not configured"}
					</div>
				)}
				<p className="text-sm text-muted-foreground">
					Display name shown to email recipients
				</p>
			</div>

			{/* Continue this pattern for all other mail fields... */}

			<div className="space-y-3">
				<Label htmlFor="secret_imap_password">IMAP Password</Label>
				{isEditing ? (
					<Input
						value={config?.secret_imap_password ?? ""}
						onChange={(e) => setValue("secret_imap_password", e.target.value)}
						type="password"
						id="secret_imap_password"
						placeholder="••••••••"
					/>
				) : (
					<div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
						{config?.secret_imap_password ? "••••••••" : "Not configured"}
					</div>
				)}
				<p className="text-sm text-muted-foreground">
					Password or app-specific password for IMAP
				</p>
			</div>
		</div>
	);
}
