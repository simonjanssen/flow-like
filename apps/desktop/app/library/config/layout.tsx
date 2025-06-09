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
	CardDescription,
	CardHeader,
	CardTitle,
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
	type INode,
	ScrollArea,
	Separator,
	Skeleton,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	humanFileSize,
	toastError,
	useBackend,
	useInvoke,
	useRunExecutionStore,
} from "@tm9657/flow-like-ui";
import {
	AlertTriangle,
	CableIcon,
	ChartAreaIcon,
	CogIcon,
	DatabaseIcon,
	FolderArchiveIcon,
	FolderClosedIcon,
	GlobeIcon,
	HardDriveIcon,
	LayoutGridIcon,
	Maximize2Icon,
	Minimize2Icon,
	PlayCircleIcon,
	Share2Icon,
	SquarePenIcon,
	WorkflowIcon,
	ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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
		href: "/library/config/logic",
		label: "Logic",
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

export default function Id({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const backend = useBackend();
	const searchParams = useSearchParams();
	const id = searchParams.get("id");
	const currentRoute = usePathname();
	const isReady = useTauriInvoke<boolean>(
		"app_configured",
		{ appId: id },
		[id ?? ""],
		typeof id === "string",
	);
	const metadata = useInvoke(
		backend.getAppMeta,
		[id ?? ""],
		typeof id === "string",
	);
	const [isMaximized, setIsMaximized] = useState(false);
	const appSize = useTauriInvoke<number>(
		"get_app_size",
		{ appId: id },
		[id ?? ""],
		typeof id === "string",
	);
	const boards = useInvoke(
		backend.getBoards,
		[id ?? ""],
		typeof id === "string",
	);
	const { addRun, removeRun } = useRunExecutionStore();

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
			(events) => {},
		);

		if (!runMeta) {
			toastError(
				"Failed to execute board",
				<PlayCircleIcon className="w-4 h-4" />,
			);
			return;
		}
		await addRun(runMeta.run_id, boardId, [node.id]);
		await invoke("execute_run", { id: runMeta });
		removeRun(runMeta.run_id);
		await invoke("get_run", { id: runMeta });
		await invoke("finalize_run", { id: runMeta });
	}

	const quickActions = boards.data
		?.flatMap((board) =>
			Object.values(board.nodes)
				.filter((node) => node.start)
				.map((node) => [board, node]),
		)
		.sort((a, b) => a[1].friendly_name.localeCompare(b[1].friendly_name));

	return (
		<TooltipProvider>
			<main className="flex min-h-screen max-h-screen overflow-hidden flex-col w-full p-6 gap-6">
				{/* Enhanced Breadcrumb - Hidden when maximized */}
				{!isMaximized && (
					<Card className="border-0 shadow-sm bg-gradient-to-r from-background to-muted/20">
						<CardContent className="p-4">
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
						</CardContent>
					</Card>
				)}

				{/* Enhanced Header - Hidden when maximized */}
				{!isMaximized && (
					<Card className="border-0 shadow-md">
						<CardHeader className="pb-4 group">
							<div className="flex flex-row items-center gap-3">
								<Avatar className="w-14 h-14 border-2 border-border/50 shadow-sm transition-all duration-300 group-hover:scale-105">
									<AvatarImage
										src={metadata.data?.icon ?? "/app-logo.webp"}
										className="scale-105 transition-transform duration-300 group-hover:scale-110"
									/>
									<AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
										<WorkflowIcon className="h-6 w-6" />
									</AvatarFallback>
								</Avatar>
								<div className="flex-1">
									<CardTitle className="text-2xl flex flex-row items-center gap-3">
										{metadata.isFetching ? (
											<Skeleton className="h-8 w-48" />
										) : (
											metadata.data?.name
										)}
										<div className="flex items-center gap-2">
											<Tooltip>
												<TooltipTrigger asChild>
													<Badge variant="outline" className="gap-1">
														<HardDriveIcon className="w-3 h-3" />
														{appSize.isFetching ? (
															<Skeleton className="h-3 w-12" />
														) : (
															humanFileSize(appSize.data ?? 0)
														)}
													</Badge>
												</TooltipTrigger>
												<TooltipContent>App size on disk</TooltipContent>
											</Tooltip>
											{!isReady.data && !isReady.isFetching && (
												<Tooltip>
													<TooltipTrigger asChild>
														<Badge variant="destructive" className="gap-1">
															<AlertTriangle className="w-3 h-3" />
															Setup Required
														</Badge>
													</TooltipTrigger>
													<TooltipContent className="bg-destructive text-destructive-foreground">
														Setup not complete yet
													</TooltipContent>
												</Tooltip>
											)}
										</div>
									</CardTitle>
									<div className="flex flex-wrap gap-2 mt-2">
										{metadata.data?.tags.map((tag) => (
											<Badge key={tag} variant="secondary" className="text-xs">
												{tag}
											</Badge>
										))}
									</div>
								</div>
							</div>
							<CardDescription className="text-base leading-relaxed mt-2">
								{metadata.isFetching ? (
									<Skeleton className="h-4 w-full" />
								) : (
									metadata.data?.description
								)}
							</CardDescription>
						</CardHeader>
					</Card>
				)}

				{/* Enhanced Layout */}
				<div
					className={`grid w-full items-start gap-6 flex-grow overflow-hidden max-h-full transition-all duration-300 ${
						isMaximized
							? "grid-cols-1"
							: "md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr]"
					}`}
				>
					{/* Enhanced Navigation - Hidden when maximized */}
					{!isMaximized && (
						<Card className="h-full flex flex-col flex-grow max-h-full overflow-hidden">
							<CardHeader className="pb-3">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									Navigation
								</CardTitle>
							</CardHeader>
							<CardContent className="flex-1 p-0 overflow-hidden">
								<ScrollArea className="h-full px-3 flex-1">
									<nav className="flex flex-col gap-1 pb-4">
										{navigationItems.map((item) => {
											const isActive = currentRoute.endsWith(
												item.href.split("/").pop() || "",
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
