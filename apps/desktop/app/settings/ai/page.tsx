"use client";

import type { IBit, UseQueryResult } from "@tm9657/flow-like-ui";
import {
	Bit,
	Button,
	IBitTypes,
	Input,
	useBackend,
	useInvoke,
	useMiniSearch,
} from "@tm9657/flow-like-ui";
import { Badge } from "@tm9657/flow-like-ui/components/ui/badge";
import {
	BentoGrid,
	BentoGridItem,
} from "@tm9657/flow-like-ui/components/ui/bento-grid";
import { BitCard } from "@tm9657/flow-like-ui/components/ui/bit-card";
import { Card, CardContent } from "@tm9657/flow-like-ui/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@tm9657/flow-like-ui/components/ui/dropdown-menu";
import { Skeleton } from "@tm9657/flow-like-ui/components/ui/skeleton";
import type { ISettingsProfile } from "@tm9657/flow-like-ui/types";
import {
	Bot,
	Database,
	Eye,
	Filter,
	Image,
	ListFilter,
	Loader2,
	Search,
	Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTauriInvoke } from "../../../components/useInvoke";

let counter = 0;

function bitTypeToFilter(bitType: IBitTypes) {
	switch (bitType) {
		case IBitTypes.Llm:
			return "LLM";
		case IBitTypes.Vlm:
			return "Vision LLM";
		case IBitTypes.Embedding:
			return "Embedding";
		case IBitTypes.ImageEmbedding:
			return "Image Embedding";
		default:
			return "Unknown";
	}
}

function getFilterIcon(filter: string) {
	switch (filter) {
		case "LLM":
			return <Bot className="h-3 w-3" />;
		case "Vision LLM":
			return <Eye className="h-3 w-3" />;
		case "Embedding":
			return <Database className="h-3 w-3" />;
		case "Image Embedding":
			return <Image className="h-3 w-3" />;
		case "In Profile":
			return <Sparkles className="h-3 w-3" />;
		case "Downloaded":
			return <Bot className="h-3 w-3" />;
		default:
			return <Filter className="h-3 w-3" />;
	}
}

export default function SettingsPage() {
	const backend = useBackend();
	const [searchTerm, setSearchTerm] = useState("");
	const [blacklist, setBlacklist] = useState(new Set<string>());

	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const profile: UseQueryResult<ISettingsProfile> = useTauriInvoke(
		"get_current_profile",
		{},
	);

	const foundBits = useInvoke(
		backend.bitState.searchBits,
		backend.bitState,
		[
			{
				bit_types: [
					IBitTypes.Llm,
					IBitTypes.Vlm,
					IBitTypes.Embedding,
					IBitTypes.ImageEmbedding,
				],
			},
		],
		typeof profile.data !== "undefined",
		[profile.data?.hub_profile.id ?? ""],
	);

	const imageBlacklist = useCallback(async () => {
		if (!foundBits.data) return;

		const dependencies = await Promise.all(
			foundBits.data
				.filter((bit) => bit.type === IBitTypes.ImageEmbedding)
				.map((bit) =>
					Bit.fromObject(bit).setBackend(backend).fetchDependencies(),
				),
		);
		const blacklist = new Set<string>(
			dependencies.flatMap((dep) =>
				dep.bits
					.filter((bit) => bit.type !== "ImageEmbedding")
					.map((bit) => bit.id),
			),
		);
		setBlacklist(blacklist);
	}, [blacklist, foundBits.data]);

	const [bits, setBits] = useState<IBit[]>([]);
	const [installedBits, setInstalledBits] = useState<Set<string>>(new Set());

	const [searchFilter, setSearchFilter] = useState<{
		appliedFilter: string[];
		filters: string[];
	}>({
		appliedFilter: ["All"],
		filters: [
			"LLM",
			"Vision LLM",
			"Embedding",
			"Image Embedding",
			"In Profile",
			"Downloaded",
		],
	});

	const { search, searchResults, addAllAsync, removeAll } = useMiniSearch<any>(
		[],
		{
			fields: [
				"authors",
				"file_name",
				"hub",
				"id",
				"name",
				"long_description",
				"description",
				"type",
			],
			storeFields: ["id"],
			searchOptions: {
				fuzzy: true,
				boost: {
					name: 2,
					type: 1.5,
					description: 1,
					long_description: 0.5,
				},
			},
		},
	);

	useEffect(() => {
		if (!foundBits.data) return;
		imageBlacklist();
	}, [foundBits.data]);

	useEffect(() => {
		if (!foundBits.data || !profile.data) return;

		// Check which bits are installed
		const checkInstalled = async () => {
			const installedSet = new Set<string>();
			for (const bit of foundBits.data) {
				const isInstalled = await backend.bitState.isBitInstalled(bit);
				if (isInstalled) {
					installedSet.add(bit.id);
				}
			}
			setInstalledBits(installedSet);
		};

		checkInstalled();
		imageBlacklist();
	}, [foundBits.data, profile.data]);

	useEffect(() => {
		if (!foundBits.data || !profile.data) return;

		const profileBitIds = new Set(
			profile.data.hub_profile.bits.map((id) => id.split(":").pop()),
		);

		const allBits = foundBits.data
			?.filter((bit) => {
				if (blacklist.has(bit.id)) return false;

				// Check which filters are applied
				const hasProfileFilter =
					searchFilter.appliedFilter.includes("In Profile");
				const hasDownloadedFilter =
					searchFilter.appliedFilter.includes("Downloaded");
				const hasAllFilter = searchFilter.appliedFilter.includes("All");

				// Get type filters (excluding "All", "In Profile", "Downloaded")
				const typeFilters = searchFilter.appliedFilter.filter(
					(filter) => !["All", "In Profile", "Downloaded"].includes(filter),
				);

				// Determine type match
				const typeMatch =
					hasAllFilter ||
					typeFilters.length === 0 || // No specific types selected - show all types
					typeFilters.includes(bitTypeToFilter(bit.type));

				// If no profile/download filters are applied, just return type match
				if (!hasProfileFilter && !hasDownloadedFilter) {
					return typeMatch;
				}

				// Check profile/download conditions
				const inProfile = profileBitIds.has(bit.id);
				const isDownloaded = installedBits.has(bit.id);

				// If only one filter is applied, check that specific condition
				if (hasProfileFilter && !hasDownloadedFilter) {
					return typeMatch && inProfile;
				}

				if (hasDownloadedFilter && !hasProfileFilter) {
					return typeMatch && isDownloaded;
				}

				// If both filters are applied, show bits that match either condition (OR logic)
				if (hasProfileFilter && hasDownloadedFilter) {
					return typeMatch && (inProfile || isDownloaded);
				}

				return typeMatch;
			})
			.sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated));

		console.groupCollapsed("Bit Filter Check");
		console.dir({
			allBits,
			profileBitIds,
			installedBits,
		});
		console.groupEnd();

		removeAll();
		setBits(allBits);
		addAllAsync(
			allBits.map((item) => ({
				...item,
				name: item.meta?.en?.name,
				long_description: item.meta?.en?.long_description,
				description: item.meta?.en?.description,
			})),
		);
	}, [foundBits.data, blacklist, searchFilter, profile.data, installedBits]);

	const activeFilterCount = searchFilter.appliedFilter.filter(
		(f) => f !== "All",
	).length;

	return (
		<main className="flex flex-grow h-full max-h-full overflow-hidden flex-col w-full">
			{/* Header Section */}
			<div
				className={`
                border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
                transition-transform duration-300 ease-in-out
            `}
			>
				<div
					className={`max-w-screen-xl mx-auto p-6 flex flex-col duration-200 transition-all ease-in-out space-y-4`}
				>
					{/* Title and Description */}
					<div className="flex flex-col space-y-2">
						<div className="flex items-center space-x-2">
							<Sparkles className="h-8 w-8 text-primary" />
							<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
								Model Catalog
							</h1>
						</div>
						<p className="text-lg text-muted-foreground max-w-2xl">
							Discover and configure AI models for your workflow. Browse through
							our collection of language models, vision models, and embeddings.
						</p>
					</div>

					{/* Search and Filter Controls */}
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
						<div className="flex flex-1 max-w-md">
							<div className="relative flex flex-row items-center w-full">
								<Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground -translate-y-1/2" />
								<Input
									type="search"
									placeholder="Search models, types, or descriptions..."
									onChange={(e) => {
										search(e.target.value);
										setSearchTerm(e.target.value);
									}}
									value={searchTerm}
									className="w-full rounded-lg bg-background pl-9 pr-4 py-2 border-2 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all duration-200"
								/>
							</div>
						</div>

						<div className="flex items-center space-x-2">
							{/* Active Filters Display */}
							{activeFilterCount > 0 && (
								<div className="flex items-center space-x-1">
									{searchFilter.appliedFilter
										.filter((f) => f !== "All")
										.map((filter) => (
											<Badge
												key={filter}
												variant="secondary"
												className="flex items-center space-x-1"
											>
												{getFilterIcon(filter)}
												<span>{filter}</span>
											</Badge>
										))}
								</div>
							)}

							{/* Filter Dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="h-9 gap-2 border-2 hover:bg-accent/50 transition-colors duration-200"
									>
										<ListFilter className="h-4 w-4" />
										<span className="hidden sm:inline-block">Filter</span>
										{activeFilterCount > 0 && (
											<Badge variant="secondary" className="ml-1 h-5 w-5 p-0">
												<small className="text-xs text-center ml-1">
													{activeFilterCount}
												</small>
											</Badge>
										)}
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-56">
									<DropdownMenuLabel className="flex items-center space-x-2">
										<Filter className="h-4 w-4" />
										<span>Filter by Type</span>
									</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuCheckboxItem
										checked={searchFilter.appliedFilter.includes("All")}
										onCheckedChange={(checked) => {
											if (checked) {
												setSearchFilter((old) => ({
													...old,
													appliedFilter: ["All"],
												}));
												return;
											}
											setSearchFilter((old) => ({
												...old,
												appliedFilter: old.appliedFilter.filter(
													(filter) => filter !== "All",
												),
											}));
										}}
										className="flex items-center space-x-2"
									>
										<Sparkles className="h-3 w-3" />
										<span>All Types</span>
									</DropdownMenuCheckboxItem>
									<DropdownMenuSeparator />
									{searchFilter.filters.map((filter) => (
										<DropdownMenuCheckboxItem
											checked={searchFilter.appliedFilter.includes(filter)}
											key={filter}
											onCheckedChange={(checked) => {
												if (checked) {
													setSearchFilter((old) => ({
														...old,
														appliedFilter: [
															...old.appliedFilter.filter(
																(filter) => filter !== "All",
															),
															filter,
														],
													}));
													return;
												}
												setSearchFilter((old) => ({
													...old,
													appliedFilter: old.appliedFilter.filter(
														(f) => f !== filter,
													),
												}));
											}}
											className="flex items-center space-x-2"
										>
											{getFilterIcon(filter)}
											<span>{filter}</span>
										</DropdownMenuCheckboxItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					{/* Results Summary */}
					{!foundBits.isLoading && (
						<div className="flex items-center justify-between text-sm text-muted-foreground">
							<div className="flex items-center space-x-2">
								<span>
									{searchTerm === ""
										? `${bits.length} models available`
										: `${searchResults?.length ?? 0} results for "${searchTerm}"`}
								</span>
								{searchFilter.appliedFilter.length > 0 &&
									!searchFilter.appliedFilter.includes("All") && (
										<Badge variant="outline" className="text-xs">
											Filtered
										</Badge>
									)}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Content Section */}
			<div
				ref={scrollContainerRef}
				className="flex flex-grow h-full max-h-full overflow-auto w-full"
			>
				<div className="w-full max-w-screen-xl mx-auto p-6">
					{foundBits.isLoading && (
						<div className="space-y-6">
							<div className="flex items-center justify-center py-8">
								<Card className="p-6 w-full max-w-md">
									<CardContent className="flex flex-col items-center space-y-4 p-0">
										<Loader2 className="h-8 w-8 animate-spin text-primary" />
										<div className="text-center space-y-2">
											<h3 className="font-semibold">Loading Models</h3>
											<p className="text-sm text-muted-foreground">
												Fetching the latest AI models from the catalog...
											</p>
										</div>
									</CardContent>
								</Card>
							</div>
							<BentoGrid className="mx-auto cursor-pointer w-full">
								{[...Array(6)].map((item, i) => {
									if (i === 0) counter = 0;
									const wide = counter === 3 || counter === 6;
									if (counter === 6) counter = 0;
									else counter += 1;
									return (
										<BentoGridItem
											className={`h-full w-full border-2 ${wide ? "md:col-span-2" : ""}`}
											key={`${i}__skeleton`}
											title={
												<div className="flex flex-row items-center space-x-2">
													<Skeleton className="h-4 w-[150px]" />
													<Skeleton className="h-4 w-[80px]" />
												</div>
											}
											description={
												<div className="space-y-2">
													<Skeleton className="h-20 w-full rounded-lg" />
													<div className="flex space-x-2">
														<Skeleton className="h-6 w-16 rounded-full" />
														<Skeleton className="h-6 w-20 rounded-full" />
													</div>
												</div>
											}
											header={
												<div className="space-y-3">
													<div className="flex flex-row items-center space-x-3">
														<Skeleton className="h-12 w-12 rounded-full" />
														<div className="space-y-1">
															<Skeleton className="h-4 w-[100px]" />
															<Skeleton className="h-3 w-[60px]" />
														</div>
													</div>
												</div>
											}
											icon={<Skeleton className="h-4 w-[120px]" />}
										/>
									);
								})}
							</BentoGrid>
						</div>
					)}
					{!foundBits.isLoading &&
						((searchTerm === "" ? bits : (searchResults ?? [])).length === 0 ? (
							<Card className="p-8 text-center max-w-md mx-auto mt-12">
								<CardContent className="space-y-4 p-0">
									<div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
										<Search className="h-8 w-8 text-muted-foreground" />
									</div>
									<div className="space-y-2">
										<h3 className="font-semibold text-lg">No models found</h3>
										<p className="text-muted-foreground">
											{searchTerm
												? `No models match "${searchTerm}". Try adjusting your search or filters.`
												: "No models available with the current filters."}
										</p>
									</div>
									{(searchTerm || activeFilterCount > 0) && (
										<Button
											variant="outline"
											onClick={() => {
												setSearchTerm("");
												search("");
												setSearchFilter((old) => ({
													...old,
													appliedFilter: ["All"],
												}));
											}}
											className="mt-4"
										>
											Clear filters
										</Button>
									)}
								</CardContent>
							</Card>
						) : (
							<BentoGrid className="mx-auto cursor-pointer w-full pb-20">
								{(searchTerm === "" ? bits : (searchResults ?? [])).map(
									(bit, i) => {
										if (i === 0) counter = 0;
										const wide = counter === 3 || counter === 6;
										if (counter === 6) counter = 0;
										else counter += 1;
										return <BitCard key={bit.id} bit={bit} wide={wide} />;
									},
								)}
							</BentoGrid>
						))}
				</div>
			</div>
		</main>
	);
}
