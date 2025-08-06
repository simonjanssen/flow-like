"use client";

import { Check, Folder, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Badge,
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	useBackend,
	useInvoke,
} from "../../..";
import type { IMetadata } from "../../../lib";
import { TemplateCard } from "./template-card";

interface AppHeaderProps {
	appMeta: any;
	appId: string;
	onClose: () => void;
}

const AppHeader = ({ appMeta, appId, onClose }: AppHeaderProps) => (
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

interface TemplateGridProps {
	templates: [string, IMetadata][];
	appId: string;
	selectedTemplate: [string, string];
	onSelectTemplate: (appId: string, templateId: string) => void;
}

const TemplateGrid = ({
	templates,
	appId,
	selectedTemplate,
	onSelectTemplate,
}: TemplateGridProps) => (
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

interface AppTemplateFolderProps {
	appId: string;
	templates: [string, IMetadata][];
	selectedTemplate: [string, string];
	onSelectTemplate: (appId: string, templateId: string) => void;
}

export function AppTemplateFolder({
	appId,
	templates,
	selectedTemplate,
	onSelectTemplate,
}: Readonly<AppTemplateFolderProps>) {
	const backend = useBackend();
	const [isOpen, setIsOpen] = useState(false);
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

	const appName = appMeta.data?.name || appId;
	const appIcon = appMeta.data?.icon ?? "";
	const appThumbnail = appMeta.data?.thumbnail ?? "/placeholder-thumbnail.webp";

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className={`group cursor-pointer relative flex flex-col w-full transition-all duration-300 rounded-xl border border-border/40 bg-card shadow-sm hover:bg-card/95 h-[375px] overflow-hidden ${
					hasSelectedTemplate
						? "ring-2 ring-primary shadow-lg shadow-primary/20"
						: "hover:border-primary/20"
				}`}
			>
				<div className="relative w-full h-40 overflow-hidden">
					<img
						className="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
						src={appThumbnail}
						alt={appName}
						width={1280}
						height={640}
						loading="lazy"
						decoding="async"
						fetchPriority="low"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

					<div className="absolute top-3 right-3">
						<div className="bg-white/20 backdrop-blur-sm text-foreground rounded-full px-3 py-1 text-sm font-medium shadow-lg border border-white/30">
							{templates.length} template{templates.length !== 1 ? "s" : ""}
						</div>
					</div>

					<div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
						<Avatar className="w-16 h-16 shadow-lg bg-white/10 backdrop-blur-md rounded-xl">
							<AvatarImage
								className="scale-100 rounded-xl"
								src={appIcon}
								alt={`${appName} icon`}
							/>
							<AvatarFallback className="text-lg font-bold bg-white/20 backdrop-blur-md text-foreground border border-white/30 rounded-xl">
								<Folder className="h-8 w-8" />
							</AvatarFallback>
						</Avatar>
					</div>
				</div>

				<div className="flex flex-col p-5 flex-1">
					<h3 className="font-bold text-lg text-foreground text-left leading-tight line-clamp-1 min-h-6 mb-2">
						{appName}
					</h3>

					<div className="flex items-center gap-2 mb-3">
						<Badge variant="default" className="text-xs px-2 py-1">
							<Folder className="h-3 w-3 mr-1" />
							Templates
						</Badge>
						{appMeta.data?.tags?.slice(0, 1).map((tag) => (
							<Badge key={tag} variant="outline" className="text-xs px-2 py-1">
								{tag}
							</Badge>
						))}
						{(appMeta.data?.tags?.length ?? 0) > 1 && (
							<Badge variant="outline" className="text-xs px-2 py-1">
								+{(appMeta.data?.tags?.length ?? 0) - 1}
							</Badge>
						)}
					</div>

					<p className="text-sm text-muted-foreground text-left line-clamp-3 leading-relaxed min-h-[4.4rem] mb-3 overflow-hidden">
						{appMeta.data?.description ??
							"Collection of templates to get you started"}
					</p>

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{hasSelectedTemplate ? (
								<div className="flex items-center gap-1 text-primary">
									<Check className="h-4 w-4" />
									<span className="text-sm font-medium">Selected</span>
								</div>
							) : (
								<div className="flex items-center gap-1 text-muted-foreground">
									<Plus className="h-4 w-4" />
									<span className="text-sm">Browse templates</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</button>

			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="h-[90dvh] min-w-[90dvw] flex flex-col">
					<DialogHeader>
						<div className="flex items-center gap-3">
							<Avatar className="h-10 w-10 border border-border">
								<AvatarImage src={appIcon} />
								<AvatarFallback className="bg-gradient-to-br from-primary/10 to-secondary/10">
									<Folder className="h-5 w-5" />
								</AvatarFallback>
							</Avatar>
							<div>
								<DialogTitle className="font-semibold text-lg">
									{appName}
								</DialogTitle>
								<p className="text-sm text-muted-foreground">
									Choose a template to get started
								</p>
							</div>
						</div>
					</DialogHeader>
					<div className="flex-1 overflow-auto p-2">
						<TemplateGrid
							templates={templates}
							appId={appId}
							selectedTemplate={selectedTemplate}
							onSelectTemplate={onSelectTemplate}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
