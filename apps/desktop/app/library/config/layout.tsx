"use client";

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
	type IEvent,
	ScrollArea,
	Separator,
	Skeleton,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
	VisibilityIcon,
	toastError,
	useBackend,
	useInvoke,
} from "@tm9657/flow-like-ui";
import { useLiveQuery } from "dexie-react-hooks";
import {
	CableIcon,
	ChartAreaIcon,
	CircleUserIcon,
	CloudAlertIcon,
	CogIcon,
	CrownIcon,
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
	SparklesIcon,
	SquarePenIcon,
	UsersRoundIcon,
	WorkflowIcon,
	ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { appsDB } from "../../../lib/apps-db";
import { EVENT_CONFIG } from "../../../lib/event-config";

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
		href: "/library/config/team",
		label: "Team",
		icon: UsersRoundIcon,
		description: "Manage team members and permissions",
		visibilities: [
			IAppVisibility.Public,
			IAppVisibility.Prototype,
			IAppVisibility.PublicRequestAccess,
		],
	},
	{
		href: "/library/config/roles",
		label: "Roles",
		icon: CrownIcon,
		description: "Define user roles and access levels",
		visibilities: [
			IAppVisibility.Public,
			IAppVisibility.Prototype,
			IAppVisibility.PublicRequestAccess,
		],
	},
	{
		href: "/library/config/analytics",
		label: "Analytics",
		icon: ChartAreaIcon,
		description: "Performance metrics and insights",
	},
	{
		href: "/library/config/endpoints",
		label: "Endpoints",
		icon: GlobeIcon,
		description: "API endpoints and integrations",
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
	const online = useLiveQuery(
		() =>
			appsDB.visibility
				.where("appId")
				.equals(id ?? "")
				.first(),
		[id ?? ""],
	) ?? { visibility: IAppVisibility.Offline };
	const currentRoute = usePathname();
	const metadata = useInvoke(
		backend.getAppMeta,
		[id ?? ""],
		typeof id === "string",
	);
	const app = useInvoke(backend.getApp, [id ?? ""], typeof id === "string");
	const [isMaximized, setIsMaximized] = useState(false);
	const events = useInvoke(backend.getEvents, [id ?? ""], (id ?? "") !== "");

	const usableEvents = useMemo(() => {
		const events = new Set<string>();
		Object.values(EVENT_CONFIG).forEach((config) => {
			const usable = Object.keys(config.useInterfaces);
			for (const eventType of usable) {
				if (config.eventTypes.includes(eventType)) {
					events.add(eventType);
				}
			}
		});
		return events;
	}, [EVENT_CONFIG]);

	async function executeEvent(event: IEvent) {
		if (!id) return;
		const runMeta = await backend.executeEvent(
			id,
			event.id,
			{
				id: event.node_id,
			},
			false,
			(eventId) => {},
			(events) => {},
		);

		if (!runMeta) {
			toastError(
				"Failed to execute board",
				<PlayCircleIcon className="w-4 h-4" />,
			);
		}
	}

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
								usableEvents.has(event.event_type),
							) && (
								<div>
									<Link
										href={`/use?id=${id}&eventId=${
											events.data?.find((event) =>
												usableEvents.has(event.event_type),
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
							<CardHeader className="pb-3 pt-3 border-b relative">
								<div className="flex flex-col gap-3">
									<div className="flex items-center gap-2 w-full">
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

										{/* Visibility Badge Overlay */}
										{app.data?.visibility && (
											<div className="absolute top-2.5 right-2.5 bg-background rounded-full">
												<VisibilityIcon visibility={app.data?.visibility} />
											</div>
										)}
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
									<nav
										className="flex flex-col gap-1 pb-4"
										key={id + (online?.visibility ?? "")}
									>
										{navigationItems
											.filter(
												(item) =>
													!item.visibilities ||
													(item.visibilities as IAppVisibility[]).includes(
														online?.visibility ?? IAppVisibility.Offline,
													),
											)
											.map((item) => {
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
											{events.data &&
											events.data.filter(
												(event) =>
													event.event_type === "quick_action" && event.active,
											).length > 0 ? (
												events.data
													.filter(
														(event) =>
															event.event_type === "quick_action" &&
															event.active,
													)
													.map((event) => (
														<HoverCard
															key={event.id}
															openDelay={100}
															closeDelay={100}
														>
															<HoverCardTrigger asChild>
																<Button
																	variant="outline"
																	size="sm"
																	className="justify-start gap-2 h-auto py-2 px-3"
																	onClick={async () => {
																		await executeEvent(event);
																	}}
																>
																	<PlayCircleIcon className="w-3 h-3 text-green-600" />
																	<span className="truncate text-xs">
																		{event.name}
																	</span>
																</Button>
															</HoverCardTrigger>
															<HoverCardContent side="right" className="w-80">
																<div className="space-y-2">
																	<div>
																		<h4 className="text-base font-medium">
																			{event.name}
																		</h4>
																		<p className="text-sm text-muted-foreground">
																			{event.description}
																		</p>
																	</div>
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
