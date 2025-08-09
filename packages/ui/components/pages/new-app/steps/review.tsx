"use client";

import { DownloadCloud, ExternalLink } from "lucide-react";
import type { IMetadata } from "../../../../lib";

export function ReviewStep({
	meta,
	isOffline,
	selectedTemplate,
	skipTemplate,
	selectedModels,
	skipModels,
}: Readonly<{
	meta: IMetadata;
	isOffline: boolean;
	selectedTemplate: [string, string];
	skipTemplate: boolean;
	selectedModels: string[];
	skipModels: boolean;
}>) {
	return (
		<div className="space-y-6">
			<div className="grid gap-4">
				<div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
					<span className="font-medium">App Name:</span>
					<span>{meta.name}</span>
				</div>
				<div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
					<span className="font-medium">Mode:</span>
					<span className="flex items-center gap-2">
						{isOffline ? (
							<>
								<DownloadCloud className="h-4 w-4" />
								Offline
							</>
						) : (
							<>
								<ExternalLink className="h-4 w-4" />
								Online
							</>
						)}
					</span>
				</div>
				<div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
					<span className="font-medium">Template:</span>
					<span>{skipTemplate ? "None selected" : "Custom template"}</span>
				</div>
				<div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
					<span className="font-medium">AI Models:</span>
					<span>
						{skipModels ? "None selected" : `${selectedModels.length} selected`}
					</span>
				</div>
			</div>
			<div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
				<p className="text-sm text-muted-foreground">
					Ready to create your app! Click "Create App" to proceed.
				</p>
			</div>
		</div>
	);
}
