"use client";
import {
	ArrowRight,
	ExternalLink,
	Play,
	Sparkles,
	TrendingUp,
} from "lucide-react";
import { useInvoke } from "../../../hooks";
import { type IBackendState, useBackend } from "../../../state/backend-state";
import { BitCard, Skeleton } from "../../ui";
import { AppCard } from "../../ui/app-card";

export interface ISwimlaneItem {
	id: string;
	type: "app" | "model" | "static";
	// For apps and models
	appId?: string;
	modelId?: string;
	hub?: string;
	// For static content
	title?: string;
	description?: string;
	image?: string;
	link?: string;
	badge?: string;
	icon?: React.ReactNode;
	gradient?: string;
}

export interface ISwimlane {
	id: string;
	title: string;
	subtitle?: string;
	size: "large" | "medium" | "small";
	items?: (ISwimlaneItem | ISwimlaneItem[])[]; // Allow arrays of items
	searchQuery?: string;
	viewAllLink?: string;
}

const SWIMLANES: ISwimlane[] = [
	{
		id: "featured",
		title: "Featured Apps",
		subtitle: "Discover the most popular and trending applications",
		size: "large",
		items: [
			[
				{
					id: "featured-1",
					type: "app",
					appId: "u5omdtl8ujlq244yhj6rter5",
				},
				{
					id: "featured-2",
					type: "app",
					appId: "tzo2wf3phvijkpklyoo5krol",
				},
			],
			{
				id: "featured-3",
				type: "static",
				title: "Build Your First Flow",
				description:
					"Learn how to create powerful workflows with our comprehensive guide",
				image: "/placeholder-thumbnail.webp",
				link: "/docs/getting-started",
				badge: "Tutorial",
				icon: <Play className="w-5 h-5" />,
				gradient: "from-blue-500 to-purple-600",
			},
		],
		viewAllLink: "/apps/featured",
	},
	{
		id: "ai-models",
		title: "AI Models",
		subtitle: "Cutting-edge embedding and image processing models",
		size: "medium",
		items: [
			{
				id: "model-1",
				type: "model",
				modelId: "do4rezco2ebwfipqzio6u6mk",
				hub: "api.alpha.flow-like.com",
			},
			{
				id: "model-2",
				type: "model",
				modelId: "jbr6vcrf6xmyswo5ldqr4l21",
				hub: "api.alpha.flow-like.com",
			},
			{
				id: "model-spotlight",
				type: "static",
				title: "New: Advanced Vision Models",
				description:
					"Experience next-generation image understanding with our latest model collection",
				image: "/swimlanes/gemma.jpg",
				badge: "New",
				icon: <Sparkles className="w-4 h-4" />,
				gradient: "from-emerald-500 to-teal-600",
			},
		],
		viewAllLink: "/settings/ai",
	},
	{
		id: "productivity",
		title: "Productivity Tools",
		size: "medium",
		items: [
			{
				id: "prod-1",
				type: "app",
				appId: "task-manager",
			},
			{
				id: "prod-2",
				type: "app",
				appId: "document-processor",
			},
			{
				id: "prod-3",
				type: "app",
				appId: "data-analyzer",
			},
		],
		viewAllLink: "/apps/productivity",
	},
	{
		id: "trending",
		title: "Trending This Week",
		size: "small",
		items: [
			[
				{
					id: "trend-1",
					type: "app",
					appId: "viral-app-1",
				},
				{
					id: "trend-2",
					type: "app",
					appId: "viral-app-2",
				},
				{
					id: "trend-3",
					type: "app",
					appId: "viral-app-3",
				},
			],
			{
				id: "trend-spotlight",
				type: "static",
				title: "Community Spotlight",
				description: "Check out what the community is building this week",
				badge: "Trending",
				icon: <TrendingUp className="w-4 h-4" />,
				gradient: "from-orange-500 to-red-500",
			},
			[
				{
					id: "trend-1",
					type: "app",
					appId: "viral-app-1",
				},
				{
					id: "trend-2",
					type: "app",
					appId: "viral-app-2",
				},
				{
					id: "trend-3",
					type: "app",
					appId: "viral-app-3",
				},
			],
		],
		viewAllLink: "/trending",
	},
	{
		id: "recent",
		title: "Recently Added",
		size: "small",
		searchQuery: "",
		viewAllLink: "/apps/recent",
	},
];

export function HomeSwimlanes() {
	return (
		<main className="min-h-screen w-full max-h-dvh overflow-auto bg-background flex flex-col items-center">
			<div className="w-full space-y-8 p-6 max-w-[1800px]">
				{SWIMLANES?.map((swimlane) => (
					<SwimlaneSection key={swimlane.id} swimlane={swimlane} />
				))}
			</div>
		</main>
	);
}

function SwimlaneSection({ swimlane }: Readonly<{ swimlane: ISwimlane }>) {
	const backend = useBackend();
	const searchResults = useInvoke(
		backend.appState.searchApps,
		backend.appState,
		[undefined, swimlane.searchQuery || ""],
		!!swimlane.searchQuery,
	);

	const getGridCols = () => {
		switch (swimlane.size) {
			case "large":
				return "grid-cols-1 lg:grid-cols-2";
			case "medium":
				return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
			case "small":
				return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
		}
	};

	const getItemSize = () => {
		switch (swimlane.size) {
			case "large":
				return "extended";
			case "medium":
			case "small":
				return "small";
		}
	};

	const getMaxSearchItems = () => {
		switch (swimlane.size) {
			case "large":
				return 3;
			case "medium":
				return 4;
			case "small":
				return 5;
		}
	};

	const getSearchItems = (): ISwimlaneItem[] => {
		if (!searchResults.data) return [];

		return searchResults.data
			.slice(0, getMaxSearchItems())
			.map(([app, metadata], index) => ({
				id: `search-${app.id}-${index}`,
				type: "app" as const,
				appId: app.id,
			}));
	};

	const items = swimlane.searchQuery ? [getSearchItems()] : swimlane.items;

	if (
		swimlane.searchQuery &&
		(!searchResults.data || searchResults.data.length === 0)
	) {
		return (
			<section className="space-y-4">
				<SwimlaneHeader swimlane={swimlane} />
				<div className="flex items-center justify-center h-32 text-muted-foreground">
					<span>No results found for "{swimlane.searchQuery}"</span>
				</div>
			</section>
		);
	}

	return (
		<section className="space-y-4">
			<SwimlaneHeader swimlane={swimlane} />
			<div className={`grid ${getGridCols()} gap-4`}>
				{items?.map((item, index) => (
					<SwimlaneSlot
						key={`slot-${index}`}
						items={Array.isArray(item) ? item : [item]}
						size={swimlane.size}
						variant={getItemSize()}
					/>
				))}
			</div>
		</section>
	);
}

function SwimlaneSlot({
	items,
	size,
	variant,
}: Readonly<{
	items: ISwimlaneItem[];
	size: "large" | "medium" | "small";
	variant: "extended" | "small";
}>) {
	if (items.length === 1) {
		return <SwimlaneItem item={items[0]} size={size} variant={variant} />;
	}

	const isHorizontal = size === "large" || size === "medium";
	const scrollClass = isHorizontal
		? "flex gap-3 overflow-hidden scrollbar-hide pb-2 w-full flex-row justify-stretch"
		: "flex flex-col gap-3 overflow-y-auto scrollbar-hide max-h-[600px]";

	return (
		<div className={scrollClass}>
			{items.map((item) => (
				<div key={item.id} className={isHorizontal ? "flex-grow w-full" : ""}>
					<SwimlaneItem item={item} size={size} variant={variant} />
				</div>
			))}
		</div>
	);
}

function SwimlaneHeader({ swimlane }: Readonly<{ swimlane: ISwimlane }>) {
	return (
		<div className="flex items-center justify-between">
			<div className="space-y-1">
				<h2 className="text-2xl font-bold text-foreground">{swimlane.title}</h2>
				{swimlane.subtitle && (
					<p className="text-muted-foreground">{swimlane.subtitle}</p>
				)}
			</div>
			{swimlane.viewAllLink && (
				<a href={swimlane.viewAllLink}>
					<button
						type="button"
						className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
					>
						View All
						<ArrowRight className="w-4 h-4" />
					</button>
				</a>
			)}
		</div>
	);
}

function SwimlaneItem({
	item,
	size,
	variant,
}: Readonly<{
	item: ISwimlaneItem;
	size: "large" | "medium" | "small";
	variant: "extended" | "small";
}>) {
	const backend = useBackend();

	if (item.type === "app" && item.appId) {
		return (
			<AppCardLoading
				appId={item.appId}
				variant={variant}
				backend={backend}
				fill={size === "large"}
			/>
		);
	}

	if (item.type === "model" && item.modelId && item.hub) {
		return (
			<BitCardLoading backend={backend} bitId={item.modelId} hub={item.hub} />
		);
	}

	if (item.type === "static") {
		return <StaticCard item={item} size={size} />;
	}

	return null;
}

function StaticCard({
	item,
	size,
}: Readonly<{
	item: ISwimlaneItem;
	size: "large" | "medium" | "small";
}>) {
	const isLarge = size === "large";
	const cardHeight = isLarge ? "h-[375px]" : "min-h-[200px]";

	return (
		<button
			type="button"
			onClick={() => item.link && window.open(item.link, "_blank")}
			className={`group relative overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 ${cardHeight} w-full`}
		>
			{/* Background */}
			<div className="absolute inset-0">
				{item.image ? (
					<img
						src={item.image}
						alt={item.title}
						className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
					/>
				) : (
					<div
						className={`w-full h-full bg-gradient-to-br ${
							item.gradient || "from-primary/20 to-primary/40"
						}`}
					/>
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
			</div>

			{/* Content */}
			<div className="relative z-10 flex flex-col justify-between h-full p-6">
				{/* Badge */}
				{item.badge && (
					<div className="self-start">
						<div className="bg-white/90 backdrop-blur-sm text-gray-900 rounded-full px-3 py-1 text-xs font-bold shadow-lg">
							{item.badge}
						</div>
					</div>
				)}

				{/* Main Content */}
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						{item.icon && (
							<div className="p-2 bg-white/20 backdrop-blur-sm rounded-full">
								{item.icon}
							</div>
						)}
						<h3 className="font-bold text-white text-left text-lg leading-tight">
							{item.title}
						</h3>
					</div>
					{item.description && (
						<p className="text-white/90 text-left text-sm leading-relaxed max-w-md">
							{item.description}
						</p>
					)}
				</div>

				{/* Action */}
				{item.link && (
					<div className="flex items-center gap-2 text-white/80 group-hover:text-white transition-colors">
						<span className="text-sm font-medium">Learn More</span>
						<ExternalLink className="w-4 h-4" />
					</div>
				)}
			</div>
		</button>
	);
}

function BitCardLoading({
	bitId,
	hub,
	backend,
}: Readonly<{ bitId: string; hub: string; backend: IBackendState }>) {
	const bit = useInvoke(backend.bitState.getBit, backend.bitState, [
		bitId,
		hub,
	]);

	if (!bit.data) {
		return <Skeleton className="w-full h-full rounded-lg" />;
	}

	return <BitCard bit={bit.data} wide={false} />;
}

function AppCardLoading({
	appId,
	variant,
	backend,
	fill,
}: Readonly<{
	appId: string;
	backend: IBackendState;
	variant: "small" | "extended";
	fill?: boolean;
}>) {
	const app = useInvoke(backend.appState.searchApps, backend.appState, [appId]);

	if (!app.data || (app.data?.length ?? 0) <= 0) {
		return (
			<Skeleton
				className={`w-full h-full rounded-lg ${variant === "extended" ? "min-w-72 h-[375px]" : "h-[60px] min-w-1/3"}`}
			/>
		);
	}

	const meta = app.data[0][1];
	const data = app.data[0][0];

	return (
		<AppCard
			app={data}
			metadata={meta}
			variant={variant}
			className={
				(fill ?? false) ? "w-full max-w-full h-full flex flex-grow" : ""
			}
		/>
	);
}
