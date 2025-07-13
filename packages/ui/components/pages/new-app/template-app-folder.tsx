"use client";

import { Check, Folder, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Badge,
	Card,
	CardContent,
	useBackend,
	useInvoke,
} from "../../..";
import type { IMetadata } from "../../../lib";
import { TemplateCard } from "./template-card";

const AppHeader = ({
	appMeta,
	appId,
	onClose,
}: {
	appMeta: any;
	appId: string;
	onClose: () => void;
}) => (
	<div className="flex items-center justify-between mb-6">
		<div className="flex items-center gap-3">
			<Avatar className="h-10 w-10 border border-border">
				<AvatarImage src={appMeta.data?.icon ?? ""} />
				<AvatarFallback className="bg-gradient-to-br from-primary/10 to-secondary/10">
					<Folder className="h-5 w-5" />
				</AvatarFallback>
			</Avatar>
			<div>
				<h2 className="font-semibold text-lg">{appMeta.data?.name || appId}</h2>
				<p className="text-sm text-muted-foreground">
					Choose a template to get started
				</p>
			</div>
		</div>
		<button
			onClick={onClose}
			className="p-2 hover:bg-muted rounded-lg transition-colors"
		>
			<X className="h-4 w-4" />
		</button>
	</div>
);

const TemplateGrid = ({
	templates,
	appId,
	selectedTemplate,
	onSelectTemplate,
}: {
	templates: [string, IMetadata][];
	appId: string;
	selectedTemplate: [string, string];
	onSelectTemplate: (appId: string, templateId: string) => void;
}) => (
	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in-0 zoom-in-95 duration-300">
		{templates.map(([templateId, metadata]) => (
			<TemplateCard
				key={templateId}
				appId={appId}
				templateId={templateId}
				metadata={metadata}
				selected={
					selectedTemplate[0] === appId && selectedTemplate[1] === templateId
				}
				onSelect={() => onSelectTemplate(appId, templateId)}
			/>
		))}
	</div>
);

export function AppTemplateFolder({
	appId,
	templates,
	selectedTemplate,
	onSelectTemplate,
}: Readonly<{
	appId: string;
	templates: [string, IMetadata][];
	selectedTemplate: [string, string];
	onSelectTemplate: (appId: string, templateId: string) => void;
}>) {
	const backend = useBackend();
	const [isExploded, setIsExploded] = useState(false);
	const appMeta = useInvoke(backend.appState.getAppMeta, backend.appState, [
		appId,
	]);

	const hasSelectedTemplate = useMemo(
		() =>
			templates.some(
				([templateId]) =>
					selectedTemplate[0] === appId && selectedTemplate[1] === templateId,
			),
		[templates, selectedTemplate, appId],
	);

	return (
		<>
			<Card
				className={`cursor-pointer transition-all duration-300 hover:shadow-md ${
					hasSelectedTemplate
						? "ring-2 ring-primary shadow-md shadow-primary/10 bg-gradient-to-br from-primary/5 to-transparent"
						: "hover:border-primary/20"
				}`}
				onClick={() => setIsExploded(true)}
			>
				<CardContent className="p-4">
					<div className="flex items-center gap-3 mb-3">
						<Avatar className="h-10 w-10 border border-border">
							<AvatarImage src={appMeta.data?.icon ?? ""} />
							<AvatarFallback className="bg-gradient-to-br from-primary/10 to-secondary/10">
								<Folder className="h-5 w-5" />
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 min-w-0">
							<h4 className="font-medium truncate text-sm">
								{appMeta.data?.name || appId}
							</h4>
							<div className="flex items-center gap-2 mt-1">
								<Badge variant="outline" className="text-xs">
									<Folder className="h-3 w-3 mr-1" />
									{templates.length} template{templates.length !== 1 ? "s" : ""}
								</Badge>
								{appMeta.data?.tags?.slice(0, 2).map((tag) => (
									<Badge key={tag} variant="secondary" className="text-xs">
										{tag}
									</Badge>
								))}
								{(appMeta.data?.tags?.length ?? 0) > 2 && (
									<Badge variant="secondary" className="text-xs">
										+{(appMeta.data?.tags?.length ?? 0) - 2}
									</Badge>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2">
							{hasSelectedTemplate ? (
								<div className="p-1.5 bg-primary rounded-full">
									<Check className="h-3 w-3 text-primary-foreground" />
								</div>
							) : (
								<div className="p-1.5 border-2 border-muted rounded-full">
									<Plus className="h-3 w-3 text-muted-foreground" />
								</div>
							)}
						</div>
					</div>
					{appMeta.data?.description && (
						<p className="text-xs text-muted-foreground line-clamp-2">
							{appMeta.data.description}
						</p>
					)}
				</CardContent>
			</Card>

			{isExploded && (
				<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
					<div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-background border rounded-lg shadow-lg">
						<div className="p-6 space-y-6">
							<AppHeader
								appMeta={appMeta}
								appId={appId}
								onClose={() => setIsExploded(false)}
							/>
							<TemplateGrid
								templates={templates}
								appId={appId}
								selectedTemplate={selectedTemplate}
								onSelectTemplate={onSelectTemplate}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
