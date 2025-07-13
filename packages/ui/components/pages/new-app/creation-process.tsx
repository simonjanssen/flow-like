"use client";
import { Check } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../../..";
import type { IMetadata } from "../../../lib";

export function CreationProgress({
	meta,
	skipTemplate,
	selectedTemplate,
	skipModels,
	selectedModels,
	isOffline,
	canCreate,
}: Readonly<{
	meta: IMetadata;
	skipTemplate: boolean;
	selectedTemplate: [string, string];
	skipModels: boolean;
	selectedModels: string[];
	isOffline: boolean;
	canCreate: boolean;
}>) {
	const progressItems = [
		{
			label: "App Name",
			completed: meta.name.trim() !== "",
		},
		{
			label: "Description",
			completed: meta.description.trim() !== "",
		},
		{
			label: skipTemplate ? "Template Skipped" : "Template Selected",
			completed: skipTemplate || selectedTemplate[1] !== "",
		},
		{
			label: skipModels
				? "Models Skipped"
				: selectedModels.length > 0
					? `${selectedModels.length} Model${selectedModels.length !== 1 ? "s" : ""} Selected`
					: "Model Selection",
			completed: skipModels || selectedModels.length > 0,
		},
		{
			label: isOffline ? "Offline Mode" : "Online Mode",
			completed: true,
		},
	];

	return (
		<Card className="border-2 bg-gradient-to-br from-primary/5 to-transparent">
			<CardHeader className="pb-4">
				<div className="flex items-center gap-3">
					<div className="p-2 bg-primary/10 rounded-lg">
						<Check className="h-5 w-5 text-primary" />
					</div>
					<div className="flex-1">
						<CardTitle className="text-lg">Creation Progress</CardTitle>
						<CardDescription className="text-sm">
							{canCreate ? "Ready to create" : "Complete all steps to proceed"}
						</CardDescription>
					</div>
					{canCreate && (
						<div className="flex items-center gap-1 text-emerald-600 text-sm">
							<Check className="h-4 w-4" />
							Ready
						</div>
					)}
				</div>
			</CardHeader>
			<CardContent className="pt-6">
				<div className="space-y-2">
					{progressItems.map((item, index) => (
						<div
							key={index}
							className={`flex items-center gap-2 text-sm ${
								item.completed ? "text-emerald-600" : "text-muted-foreground"
							}`}
						>
							{item.completed ? (
								<Check className="h-4 w-4" />
							) : (
								<div className="h-4 w-4 rounded-full border-2" />
							)}
							{item.label}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
