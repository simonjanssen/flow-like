"use client";
import type { UseQueryResult } from "@tanstack/react-query";
import {
	CameraIcon,
	DownloadCloudIcon,
	ExternalLinkIcon,
	FileIcon,
	FileSearch,
	GithubIcon,
	ImageIcon,
	MessagesSquareIcon,
	MinusIcon,
	Package2Icon,
	PackageCheckIcon,
	PlusIcon,
	ScanEyeIcon,
	SparklesIcon,
	TrashIcon,
	TrendingUpIcon,
	UniversityIcon,
	WorkflowIcon,
} from "lucide-react";
import { type JSX, useState } from "react";
import { Progress } from "../../components/ui/progress";
import { useInvoke } from "../../hooks/use-invoke";
import { Bit, Download, type IDownloadProgress } from "../../lib/bit/bit";
import { type IBit, IBitTypes } from "../../lib/schema/bit/bit";
import { humanFileSize } from "../../lib/utils";
import { useBackend } from "../../state/backend-state";
import { useDownloadManager } from "../../state/download-manager";
import type { ISettingsProfile } from "../../types";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { BentoGridItem } from "./bento-grid";
import { Button } from "./button";
import { Card, CardContent, CardHeader } from "./card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./dropdown-menu";

export function BitCard({
	bit,
	wide = false,
}: Readonly<{ bit: IBit; wide: boolean }>) {
	const backend = useBackend();
	const { download } = useDownloadManager();

	const [progress, setProgress] = useState<undefined | number>();
	const [isHovered, setIsHovered] = useState(false);
	const isInstalled: UseQueryResult<boolean> = useInvoke(
		backend.isBitInstalled,
		[bit],
	);
	const bitSize: UseQueryResult<number> = useInvoke(backend.getBitSize, [bit]);
	const currentProfile: UseQueryResult<ISettingsProfile> = useInvoke(
		backend.getSettingsProfile,
		[],
	);

	async function downloadBit(bit: IBit) {
		console.dir(bit);
		await download(bit, (dl) => {
			setProgress(dl.progress() * 100);
		});
		await isInstalled.refetch();
		setProgress(undefined);
	}

	async function toggleDownload() {
		if (isInstalled.data) {
			console.log("Deleting Bit");
			await backend.deleteBit(bit);
			await isInstalled.refetch();
			return;
		}

		await downloadBit(bit);
	}

	if (bit.meta["en"] === undefined) return null;

	const isInProfile =
		(currentProfile.data?.hub_profile.bits || []).findIndex(
			(id) => id.split(":")[1] === bit.id,
		) > -1;

	return (
		<button
			className={`${wide ? "md:col-span-2" : ""} group/card`}
			data-testid={"box"}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<Card
				className={`
                        relative h-full w-full cursor-pointer transition-all duration-300 ease-out
                        hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2
                        ${isInstalled.data ? "ring-2 ring-emerald-500/20 shadow-emerald-500/10" : ""}
                        ${isInProfile ? "bg-gradient-to-br from-primary/5 to-emerald-500/5" : ""}
                        overflow-hidden border-2 hover:border-primary/30
                        backdrop-blur-sm bg-card/80
                    `}
			>
				{/* Installed indicator */}
				{isInstalled.data && (
					<div className="absolute top-4 right-4 z-20">
						<div className="bg-emerald-500 text-white p-2 rounded-full shadow-lg animate-pulse">
							<PackageCheckIcon size={16} />
						</div>
					</div>
				)}

				{/* Progress overlay */}
				{progress !== undefined && (
					<div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-30 flex items-center justify-center">
						<div className="text-center space-y-4">
							<Progress value={progress} className="w-48" />
							<div className="flex flex-row items-center gap-2">
								<DownloadCloudIcon
									size={32}
									className="text-primary animate-pulse w-6 h-6"
								/>
								<p className="text-sm text-muted-foreground">
									{Math.round(progress)}% Downloaded
								</p>
							</div>
						</div>
					</div>
				)}

				<CardHeader className="pb-3">
					{/* Header with avatar and type indicator */}
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center space-x-4 flex-1 min-w-0">
							<div className="relative">
								<Avatar className="h-14 w-14 border-2 border-background shadow-lg ring-2 ring-primary/10 transition-all duration-300 group-hover/card:ring-primary/30">
									<AvatarImage
										src={bit.meta?.en?.icon ?? "/app-logo.webp"}
										className="transition-transform duration-300 group-hover/card:scale-110"
									/>
									<AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
										<BitTypeIcon type={bit.type} className="h-6 w-6" />
									</AvatarFallback>
								</Avatar>

								{/* Type badge */}
								<div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg">
									<BitTypeIcon type={bit.type} className="h-3 w-3" />
								</div>
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center space-x-2 mb-1">
									<h3 className="font-semibold text-lg truncate group-hover/card:text-primary transition-colors">
										{bit.meta.en.name}
									</h3>
									{isInProfile && (
										<SparklesIcon className="h-4 w-4 text-primary animate-pulse" />
									)}
									{/* Repository indicator moved here */}
									{bit.repository?.startsWith("https://huggingface.co/") && (
										<img
											src="/hf-logo.png"
											width={20}
											height={20}
											alt="Hugging Face"
											className="opacity-70 hover:opacity-100 transition-opacity ml-1"
										/>
									)}
								</div>

								<div className="flex items-center space-x-2">
									<Badge
										variant="secondary"
										className="text-xs font-medium text-secondary-foreground"
									>
										<BitTypeIcon
											type={bit.type}
											className="h-3 w-3 mr-1 text-secondary-foreground"
										/>
										{bitTypeToText(bit.type)}
									</Badge>

									<Badge
										variant={isInstalled.data ? "default" : "outline"}
										className={`text-xs font-medium transition-all ${
											isInstalled.data
												? "bg-emerald-500 hover:bg-emerald-600 text-white"
												: "hover:bg-primary/10"
										}`}
									>
										{isInstalled.data ? (
											<PackageCheckIcon className="h-3 w-3 mr-1" />
										) : (
											<DownloadCloudIcon className="h-3 w-3 mr-1" />
										)}
										{humanFileSize(bitSize.data ?? 0)}
									</Badge>
								</div>
							</div>
						</div>
					</div>
				</CardHeader>

				<CardContent className="pt-0 flex flex-col flex-1">
					{/* Description with fixed height */}
					<div className="h-16 mb-4 flex items-center">
						<p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 text-start">
							{bit.meta.en.description}
						</p>
					</div>

					{/* Tags */}
					<div className="flex flex-nowrap gap-2 mb-6">
						{bit.meta.en.tags.slice(0, 2).map((tag) => (
							<Badge
								key={tag}
								variant="outline"
								className="text-xs hover:bg-primary/10 transition-colors whitespace-nowrap"
							>
								{tag}
							</Badge>
						))}
						{bit.meta.en.tags.length > 2 && (
							<Badge variant="outline" className="text-xs">
								+{bit.meta.en.tags.length - 2}
							</Badge>
						)}
					</div>

					{/* Spacer to push action buttons to bottom */}
					<div className="flex-1" />

					{/* Action buttons - always at bottom */}
					<div
						className={`flex items-center justify-between transition-all duration-300 ${
							isHovered
								? "opacity-100 translate-y-0"
								: "opacity-0 translate-y-2"
						}`}
					>
						<div className="flex items-center space-x-2">
							{bit.repository && (
								<a href={bit.repository} target="_blank" rel="noreferrer">
									<Button size="sm" variant="ghost" className="h-8 px-3">
										<ExternalLinkIcon className="h-3 w-3 mr-1" />
										Repository
									</Button>
								</a>
							)}
						</div>

						<div className="flex items-center space-x-1">
							{(bit.type === "Embedding" ||
								bit.type === "ImageEmbedding" ||
								bit.type === "Vlm" ||
								bit.type === "Llm") && (
								<Button
									size="sm"
									variant={isInProfile ? "default" : "outline"}
									onClick={async (e) => {
										e.stopPropagation();
										const profile = currentProfile.data;
										if (!profile) return;
										const bitIndex = profile.hub_profile.bits.findIndex(
											(id) => id.split(":").pop() === bit.id,
										);
										if (bitIndex === -1) {
											await downloadBit(bit);
											await backend.addBit(bit, profile);
											await currentProfile.refetch();
											return;
										}

										await backend.removeBit(bit, profile);
										await currentProfile.refetch();
									}}
									className="h-8 px-3"
								>
									{isInProfile ? (
										<MinusIcon className="h-3 w-3 mr-1" />
									) : (
										<PlusIcon className="h-3 w-3 mr-1" />
									)}
									{isInProfile ? "Remove" : "Add"}
								</Button>
							)}

							<Button
								size="sm"
								variant={isInstalled.data ? "destructive" : "default"}
								onClick={(e) => {
									e.stopPropagation();
									toggleDownload();
								}}
								className="h-8 px-3"
							>
								{isInstalled.data ? (
									<TrashIcon className="h-3 w-3 mr-1" />
								) : (
									<DownloadCloudIcon className="h-3 w-3 mr-1" />
								)}
								{isInstalled.data ? "Delete" : "Download"}
							</Button>
						</div>
					</div>
				</CardContent>

				{/* Gradient overlay for visual appeal */}
				<div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none" />
			</Card>
		</button>
	);
}

export function BitTypeIcon({
	type,
	className,
}: { type: IBitTypes; className?: string }): JSX.Element | null {
	const combinedClass =
		"min-h-4 min-w-4 h-4 w-4 text-foreground" +
		(className ? ` ${className}` : "");

	switch (type) {
		case IBitTypes.Llm:
			return <MessagesSquareIcon className={combinedClass} />;
		case IBitTypes.Vlm:
			return <CameraIcon className={combinedClass} />;
		case IBitTypes.Embedding:
			return <FileSearch className={combinedClass} />;
		case IBitTypes.ImageEmbedding:
			return <ScanEyeIcon className={combinedClass} />;
		case IBitTypes.File:
			return <FileIcon className={combinedClass} />;
		case IBitTypes.Media:
			return <ImageIcon className={combinedClass} />;
		case IBitTypes.Template:
			return <WorkflowIcon className={combinedClass} />;
		case IBitTypes.Course:
			return <UniversityIcon className={combinedClass} />;
	}

	return <Package2Icon className={combinedClass} />;
}

export function bitTypeToText(bitType: IBitTypes): string {
	return bitType.replace(/([A-Z])/g, (match, letter, index) =>
		index === 0 ? letter : ` ${letter}`,
	);
}
