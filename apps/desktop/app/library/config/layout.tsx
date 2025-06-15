"use client";

import { invoke } from "@tauri-apps/api/core";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Badge,
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
	IAppVisibility,
	type INode,
	ScrollArea,
	Separator,
	Skeleton,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	toastError,
	useBackend,
	useInvoke,
	useRunExecutionStore,
} from "@tm9657/flow-like-ui";
import {
	CableIcon,
	ChartAreaIcon,
	CircleUserIcon,
	CloudAlertIcon,
	CogIcon,
	DatabaseIcon,
	FlaskConicalIcon,
	FolderArchiveIcon,
	FolderClosedIcon,
	GlobeIcon,
	GlobeLockIcon,
	LayoutGridIcon,
	Maximize2Icon,
	Minimize2Icon,
	PlayCircleIcon,
	Share2Icon,
	SparkleIcon,
	SparklesIcon,
	SquarePenIcon,
	WorkflowIcon,
	ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useTauriInvoke } from "../../../components/useInvoke";

const navigationItems = [
	{
		href: "/library/config",
		label: "General",
		icon: SquarePenIcon,
		description: "Basic app information and settings",
	},
	{
		href: "/library/config/configuration",
		label: "Configuration",
		icon: CogIcon,
		description: "App configuration and environment variables",
	},
	{
		href: "/library/config/flows",
		label: "Flows",
		icon: WorkflowIcon,
		description: "Business logic and workflow definitions",
	},
	{
		href: "/library/config/events",
		label: "Events",
		icon: CableIcon,
		description: "Event handling and triggers",
	},
	{
		href: "/library/config/storage",
		label: "Storage",
		icon: FolderClosedIcon,
		description: "Data storage and file management",
	},
	{
		href: "/library/config/explore",
		label: "Explore Data",
		icon: DatabaseIcon,
		description: "Browse and query your data",
	},
	{
		href: "/library/config/analytics",
		label: "Analytics",
		icon: ChartAreaIcon,
		description: "Performance metrics and insights",
	},
	{
		href: "/library/config/share",
		label: "Share",
		icon: Share2Icon,
		description: "Collaboration and sharing settings",
	},
	{
		href: "/library/config/endpoints",
		label: "Endpoints",
		icon: GlobeIcon,
		description: "API endpoints and integrations",
	},
	{
		href: "/library/config/export",
		label: "Export / Import",
		icon: FolderArchiveIcon,
		description: "Backup and restore functionality",
	},
];

export const USABLE_EVENTS = new Set(["simple_chat", "complex_chat"]);

export default function Id({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const backend = useBackend();
	const searchParams = useSearchParams();
	const id = searchParams.get("id");
	const currentRoute = usePathname();
	const metadata = useInvoke(
		backend.getAppMeta,
		[id ?? ""],
		typeof id === "string",
	);
	const app = useInvoke(backend.getApp, [id ?? ""], typeof id === "string");
	const [isMaximized, setIsMaximized] = useState(false);
	const events = useInvoke(backend.getEvents, [id ?? ""], (id ?? "") !== "");

	const boards = useInvoke(
		backend.getBoards,
		[id ?? ""],
		typeof id === "string",
	);

	async function executeBoard(boardId: string, node: INode) {
		if (!id) return;
		await invoke("get_app_board", {
			appId: id,
			boardId: boardId,
			pushToRegistry: true,
		});
		const runMeta = await backend.executeBoard(
			id,
			boardId,
			{
				id: node.id,
			},
			false,
			undefined,
			(events) => {},
		);

		if (!runMeta) {
			toastError(
				"Failed to execute board",
				<PlayCircleIcon className="w-4 h-4" />,
			);
		}
	}

	const quickActions = useMemo(
		() =>
			boards.data
				?.flatMap((board) =>
					Object.values(board.nodes)
						.filter((node) => node.start)
						.map((node) => [board, node]),
				)
				.sort((a, b) => a[1].friendly_name.localeCompare(b[1].friendly_name)),
		[boards.data],
	);

	return (
		<TooltipProvider>
			<main className="flex min-h-screen max-h-screen overflow-hidden flex-col w-full p-6 gap-6">
				{/* Enhanced Breadcrumb - Hidden when maximized */}
				{!isMaximized && (
					<Card className="border-0 shadow-sm bg-gradient-to-r from-background to-muted/20">
						<CardContent className="p-4 flex flex-row items-center justify-between">
							<Breadcrumb>
								<BreadcrumbList>
									<BreadcrumbItem>
										<BreadcrumbLink
											href="/library"
											className="flex items-center gap-1"
										>
											<LayoutGridIcon className="w-3 h-3" />
											Home
										</BreadcrumbLink>
									</BreadcrumbItem>
									<BreadcrumbSeparator />
									<BreadcrumbItem>
										<BreadcrumbLink href="/library/apps">
											Your Apps
										</BreadcrumbLink>
									</BreadcrumbItem>
									<BreadcrumbSeparator />
									<BreadcrumbItem>
										<BreadcrumbPage className="font-medium">
											{metadata.isFetching ? (
												<Skeleton className="h-4 w-24" />
											) : (
												metadata.data?.name
											)}
										</BreadcrumbPage>
									</BreadcrumbItem>
								</BreadcrumbList>
							</Breadcrumb>
							{/* Use App */}
							{events.data?.find((event) =>
								USABLE_EVENTS.has(event.event_type),
							) && (
								<div>
									<Link
										href={`/use?id=${id}&eventId=${
											events.data?.find((event) =>
												USABLE_EVENTS.has(event.event_type),
											)?.id
										}`}
										className="w-full"
									>
										<Button
											size={"sm"}
											className="flex items-center gap-2 w-full rounded-full px-4"
										>
											<SparklesIcon className="w-4 h-4" />
											<h4 className="text-sm font-medium">Use App</h4>
										</Button>
									</Link>
								</div>
							)}
						</CardContent>
					</Card>
				)}

				{/* Enhanced Layout */}
				<div
					className={`grid w-full items-start gap-6 flex-grow overflow-hidden max-h-full transition-all duration-300 ${
						isMaximized
							? "grid-cols-1"
							: "md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr]"
					}`}
				>
					{/* Enhanced Navigation - Hidden when maximized */}
					{!isMaximized && (
						<Card className="h-full flex flex-col flex-grow max-h-full overflow-hidden">
							<CardHeader className="pb-3 pt-3 border-b">
								<div className="flex flex-col gap-3">
									<div className="flex items-center gap-2">
										<div className="relative">
											<Avatar className="w-9 h-9 border border-border/50 shadow-sm transition-all duration-300 group-hover:scale-105">
												<AvatarImage
													className="scale-105 transition-transform duration-300 group-hover:scale-110"
													src={metadata.data?.icon ?? "/app-logo.webp"}
													alt={`${metadata.data?.name ?? id} icon`}
												/>
												<AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
													{(metadata.data?.name ?? id ?? "Unknown")
														.substring(0, 2)
														.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											{/* Visibility Badge Overlay */}
											{app.data?.visibility && (
												<div className="absolute -bottom-1 -right-1">
													{app.data?.visibility === IAppVisibility.Private && (
														<div className="bg-secondary border border-background rounded-full p-0.5">
															<CircleUserIcon className="w-2 h-2 text-secondary-foreground" />
														</div>
													)}
													{app.data?.visibility ===
														IAppVisibility.Prototype && (
														<div className="bg-muted border border-background rounded-full p-0.5">
															<FlaskConicalIcon className="w-4 h-4 text-muted-foreground" />
														</div>
													)}
													{app.data?.visibility ===
														IAppVisibility.PublicRequestAccess && (
														<div className="bg-destructive border border-background rounded-full p-0.5">
															<GlobeLockIcon className="w-2 h-2 text-destructive-foreground" />
														</div>
													)}
													{app.data?.visibility === IAppVisibility.Offline && (
														<div className="bg-muted-foreground/20 border border-background rounded-full p-0.5">
															<CloudAlertIcon className="w-4 h-4 text-muted-foreground" />
														</div>
													)}
												</div>
											)}
										</div>
										<div className="flex-1 min-w-0">
											<CardTitle className="text-sm truncate">
												{metadata.isFetching ? (
													<Skeleton className="h-4 w-24" />
												) : (
													metadata.data?.name
												)}
											</CardTitle>
										</div>
									</div>

									{/* Description */}
									{metadata.data?.description && (
										<p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
											{metadata.data.description}
										</p>
									)}

									{/* Tags and Status */}
									<div className="flex flex-col gap-2">
										{/* Tags */}
										{metadata.data?.tags && metadata.data.tags.length > 0 && (
											<div className="flex flex-wrap gap-1 mb-2">
												{metadata.data.tags.slice(0, 2).map((tag) => (
													<Badge
														key={tag}
														variant="secondary"
														className="text-xs px-2 py-0.5"
													>
														{tag}
													</Badge>
												))}
												{metadata.data.tags.length > 2 && (
													<Tooltip>
														<TooltipTrigger asChild>
															<Badge
																variant="outline"
																className="text-xs px-2 py-0.5"
															>
																+{metadata.data.tags.length - 2}
															</Badge>
														</TooltipTrigger>
														<TooltipContent side="right" className="max-w-xs">
															<div className="space-y-1">
																{metadata.data.tags.slice(2).map((tag) => (
																	<Badge
																		key={tag}
																		variant="secondary"
																		className="text-xs mr-1"
																	>
																		{tag}
																	</Badge>
																))}
															</div>
														</TooltipContent>
													</Tooltip>
												)}
											</div>
										)}
									</div>
								</div>
							</CardHeader>
							<CardContent className="flex-1 p-0 overflow-hidden">
								<ScrollArea className="h-full px-3 flex-1">
									<div className="pt-3">
										<CardTitle className="text-sm font-medium text-muted-foreground mb-3">
											Navigation
										</CardTitle>
									</div>
									<nav className="flex flex-col gap-1 pb-4">
										{navigationItems.map((item) => {
											const isActive = currentRoute.endsWith(
												item.href.split("/").pop() ?? "",
											);
											const Icon = item.icon;

											return (
												<Tooltip key={item.href} delayDuration={300}>
													<TooltipTrigger asChild>
														<Link
															href={`${item.href}?id=${id}`}
															className={`
                                                                flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                                                                ${
																																	isActive
																																		? "bg-primary text-primary-foreground shadow-sm font-medium"
																																		: "hover:bg-muted text-muted-foreground hover:text-foreground"
																																}
                                                            `}
														>
															<Icon className="w-4 h-4 flex-shrink-0" />
															<span className="truncate">{item.label}</span>
														</Link>
													</TooltipTrigger>
													<TooltipContent side="right" className="max-w-xs">
														<p className="font-bold">{item.label}</p>
														<p className="text-xs mt-1">{item.description}</p>
													</TooltipContent>
												</Tooltip>
											);
										})}
									</nav>

									<Separator className="my-4 mx-3" />

									{/* Enhanced Quick Actions */}
									<div className="px-3">
										<div className="flex items-center gap-2 mb-3">
											<ZapIcon className="w-4 h-4 text-primary" />
											<h4 className="text-sm font-medium">Quick Actions</h4>
										</div>
										<div className="flex flex-col gap-2 pb-4">
											{boards.isFetching ? (
												Array.from({ length: 3 }).map((_, i) => (
													<Skeleton key={i} className="h-9 w-full" />
												))
											) : quickActions && quickActions.length > 0 ? (
												quickActions.map(([board, node]) => (
													<HoverCard
														key={node.id}
														openDelay={100}
														closeDelay={100}
													>
														<HoverCardTrigger asChild>
															<Button
																variant="outline"
																size="sm"
																className="justify-start gap-2 h-auto py-2 px-3"
																onClick={async () => {
																	await executeBoard(board.id, node as INode);
																}}
															>
																<PlayCircleIcon className="w-3 h-3 text-green-600" />
																<span className="truncate text-xs">
																	{node.friendly_name}
																</span>
															</Button>
														</HoverCardTrigger>
														<HoverCardContent side="right" className="w-80">
															<div className="space-y-2">
																<div>
																	<h4 className="font-medium">{board.name}</h4>
																	<p className="text-sm text-muted-foreground">
																		{board.description}
																	</p>
																</div>
																{node.comment && (
																	<div>
																		<p className="text-xs text-muted-foreground">
																			<strong>Node:</strong> {node.comment}
																		</p>
																	</div>
																)}
															</div>
														</HoverCardContent>
													</HoverCard>
												))
											) : (
												<p className="text-xs text-muted-foreground py-2">
													No quick actions available
												</p>
											)}
										</div>
									</div>
								</ScrollArea>
							</CardContent>
						</Card>
					)}

					{/* Enhanced Content Area with Maximize Button */}
					<Card
						className={`h-full flex flex-col flex-grow overflow-hidden transition-all duration-300 bg-transparent ${
							isMaximized ? "shadow-2xl" : ""
						}`}
					>
						<CardHeader className="pb-0 pt-4 px-4">
							<div className="flex items-center justify-between">
								<div className="flex-1" />
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setIsMaximized(!isMaximized)}
											className="h-8 w-8 p-0"
										>
											{isMaximized ? (
												<Minimize2Icon className="w-4 h-4" />
											) : (
												<Maximize2Icon className="w-4 h-4" />
											)}
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										{isMaximized ? "Minimize" : "Maximize"}
									</TooltipContent>
								</Tooltip>
							</div>
						</CardHeader>
						<CardContent className="flex-1 p-6 pt-0 overflow-hidden">
							<Suspense
								fallback={
									<div className="space-y-4">
										<Skeleton className="h-8 w-full" />
										<Skeleton className="h-32 w-full" />
										<Skeleton className="h-24 w-full" />
									</div>
								}
							>
								{children}
							</Suspense>
						</CardContent>
					</Card>
				</div>
			</main>
		</TooltipProvider>
	);
}
