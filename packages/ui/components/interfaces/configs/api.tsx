"use client";

import { Label, Switch } from "../../ui";
import type { IConfigInterfaceProps } from "../interfaces";

export function ApiConfig({
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
				<Label htmlFor="method">HTTP Method</Label>
				{isEditing ? (
					<select
						value={config?.method ?? "GET"}
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
						{config?.method ?? "GET"}
					</div>
				)}
				<p className="text-sm text-muted-foreground">
					HTTP method for the API endpoint
				</p>
			</div>

			<div className="space-y-4">
				<div className="flex items-center space-x-2">
					{isEditing ? (
						<Switch
							id="public_endpoint"
							checked={config?.public_endpoint ?? false}
							onCheckedChange={(checked) =>
								setValue("public_endpoint", checked)
							}
						/>
					) : (
						<div
							className={`h-5 w-9 rounded-full ${config?.public_endpoint ? "bg-primary" : "bg-muted"} flex items-center ${config?.public_endpoint ? "justify-end" : "justify-start"} px-0.5`}
						>
							<div className="h-4 w-4 rounded-full bg-white" />
						</div>
					)}
					<Label htmlFor="public_endpoint">Public Endpoint</Label>
					{!isEditing && (
						<span className="text-sm text-muted-foreground">
							{config?.public_endpoint ? "Enabled" : "Disabled"}
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
