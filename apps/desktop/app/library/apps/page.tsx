"use client";

import {
	AppCard,
	Button,
	EmptyState,
	type IMetadata,
	Input,
	Separator,
	useBackend,
	useInvoke,
	useMiniSearch,
} from "@tm9657/flow-like-ui";
import {
	FilesIcon,
	Grid3X3,
	LayoutGridIcon,
	List,
	Search,
	SearchIcon,
	Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function YoursPage() {
	const backend = useBackend();
	const apps = useInvoke(backend.getApps, []);
	const router = useRouter();
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [searchQuery, setSearchQuery] = useState("");

	const allItems = useMemo(() => {
		return (
			apps.data?.map(([app, meta]) => ({ ...meta, id: app.id, app: app })) || []
		);
	}, [apps.data]);

	const { addAll, removeAll, clearSearch, search, searchResults } =
		useMiniSearch(
			apps.data?.map(([app, meta]) => ({ ...meta, id: app.id, app: app })) ||
				[],
			{
				fields: [
					"name",
					"description",
					"long_description",
					"tags",
					"category",
					"id",
				],
			},
		);

	useEffect(() => {
		if (apps.data) {
			removeAll();
			addAll(
				apps.data.map(([app, meta]) => ({ ...meta, id: app.id, app: app })),
			);
		}
		return () => {
			removeAll();
			clearSearch();
		};
	}, [apps.data]);

	function splitIntoColumns<T>(items: T[]): [T[], T[]] {
		const left: T[] = [];
		const right: T[] = [];
		items.forEach((item, i) =>
			i % 2 === 0 ? left.push(item) : right.push(item),
		);
		return [left, right];
	}

	const renderAppCards = (items: any[]) => {
		if (viewMode === "grid") {
			return (
				<div className="flex flex-row flex-wrap gap-2">
					{items.map((meta) => (
						<div key={viewMode + meta.id} className="group">
							<AppCard
								app={meta.app}
								metadata={meta as IMetadata}
								variant="extended"
								onClick={() => router.push(`/library/config?id=${meta.id}`)}
							/>
						</div>
					))}
				</div>
			);
		} else {
			const [left, right] = splitIntoColumns(items);
			return (
				<div className="flex flex-row gap-6">
					<div className="flex flex-col gap-2 flex-1">
						{left.map((meta) => (
							<div key={"left" + meta.id} className="group">
								<AppCard
									app={meta.app}
									metadata={meta as IMetadata}
									variant="small"
									onClick={() => router.push(`/library/config?id=${meta.id}`)}
									className="w-full"
								/>
							</div>
						))}
					</div>
					<div className="flex flex-col gap-2 flex-1">
						{right.map((meta) => (
							<div key={"right" + meta.id} className="group">
								<AppCard
									app={meta.app}
									metadata={meta as IMetadata}
									variant="small"
									onClick={() => router.push(`/library/config?id=${meta.id}`)}
									className="w-full"
								/>
							</div>
						))}
					</div>
				</div>
			);
		}
	};

	return (
		<main className="min-h-dvh max-h-dvh flex flex-col w-full p-6 bg-gradient-to-br from-background to-muted/20">
			{/* Header Section */}
			<div className="flex flex-col space-y-6 mb-8">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-3">
						<div className="p-2 rounded-xl bg-primary/10 text-primary">
							<LayoutGridIcon className="h-8 w-8" />
						</div>
						<div>
							<h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
								Your Apps
							</h1>
							<p className="text-muted-foreground mt-1">
								Manage and create your custom applications
							</p>
						</div>
					</div>
					<Link href={"/library/new"}>
						<Button
							size="lg"
							className="shadow-lg hover:shadow-xl transition-all duration-200"
						>
							<Sparkles className="mr-2 h-4 w-4" />
							Create App
						</Button>
					</Link>
				</div>

				{/* Search and Filter Bar */}
				<div className="flex items-center justify-between space-x-4">
					<div className="relative flex-1 max-w-md">
						<SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground h-4 w-4 z-10" />
						<Input
							placeholder="Search apps..."
							value={searchQuery}
							onChange={(e) => {
								search(e.target.value);
								setSearchQuery(e.target.value);
							}}
							className="pl-10 bg-background/50 backdrop-blur-sm border-border/50"
						/>
					</div>
					<div className="flex items-center space-x-2">
						<Button
							variant={viewMode === "grid" ? "default" : "outline"}
							size="sm"
							onClick={() => setViewMode("grid")}
						>
							<Grid3X3 className="h-4 w-4" />
						</Button>
						<Button
							variant={viewMode === "list" ? "default" : "outline"}
							size="sm"
							onClick={() => setViewMode("list")}
						>
							<List className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			<Separator className="mb-8" />

			{/* Content Section */}
			<div className="flex-1 overflow-auto">
				{apps.data?.length === 0 && (
					<EmptyState
						action={{
							label: "Create Your First App",
							onClick: () => {
								router.push("/library/new");
							},
						}}
						icons={[Sparkles, LayoutGridIcon, FilesIcon]}
						className="min-w-full min-h-full flex-grow h-full border-2 border-dashed border-border/50 rounded-xl bg-muted/20"
						title="Welcome to Your Library"
						description="Create powerful custom applications based on your data. Get started with your first app today - it's free and secure."
					/>
				)}

				{searchQuery === "" &&
					allItems.length > 0 &&
					renderAppCards(
						allItems.toSorted(
							(a, b) =>
								(b?.updated_at?.nanos_since_epoch ?? 0) -
								(a?.updated_at?.nanos_since_epoch ?? 0),
						),
					)}

				{searchQuery !== "" &&
					(searchResults?.length ?? 0) > 0 &&
					renderAppCards(
						(searchResults ?? []).toSorted(
							(a, b) =>
								(b?.updated_at?.nanos_since_epoch ?? 0) -
								(a?.updated_at?.nanos_since_epoch ?? 0),
						),
					)}

				{searchResults && searchResults.length === 0 && searchQuery && (
					<div className="flex flex-col items-center justify-center h-64 text-center">
						<Search className="h-12 w-12 text-muted-foreground mb-4" />
						<h3 className="text-lg font-semibold mb-2">No apps found</h3>
						<p className="text-muted-foreground">
							Try adjusting your search terms or create a new app.
						</p>
					</div>
				)}
			</div>
		</main>
	);
}
