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
import {
	BentoGrid,
	BentoGridItem,
} from "@tm9657/flow-like-ui/components/ui/bento-grid";
import { BitCard } from "@tm9657/flow-like-ui/components/ui/bit-card";
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
import { ListFilter, Search } from "lucide-react";
import MiniSearch from "minisearch";
import { useCallback, useEffect, useState } from "react";
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

export default function SettingsPage() {
	const backend = useBackend();
	const [searchTerm, setSearchTerm] = useState("");
	const [blacklist, setBlacklist] = useState(new Set<string>());
	const profile: UseQueryResult<ISettingsProfile> = useTauriInvoke(
		"get_current_profile",
		{},
	);

	const foundBits = useInvoke(
		backend.searchBits,
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

	const [searchFilter, setSearchFilter] = useState<{
		appliedFilter: string[];
		filters: string[];
	}>({
		appliedFilter: ["All"],
		filters: ["LLM", "Vision LLM", "Embedding", "Image Embedding"],
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
		if (!foundBits.data) return;
		const allBits = foundBits.data
			?.filter(
				(bit) =>
					!blacklist.has(bit.id) &&
					(searchFilter.appliedFilter.includes("All") ||
						searchFilter.appliedFilter.includes(bitTypeToFilter(bit.type))),
			)
			.sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated));

		removeAll();
		setBits(allBits);
		addAllAsync(
			allBits.map((item) => ({
				...item,
				name: item.meta["en"].name,
				long_description: item.meta["en"].long_description,
				description: item.meta["en"].description,
			})),
		);
	}, [foundBits.data, blacklist, searchFilter]);

	return (
		<main className="flex flex-grow h-full max-h-full overflow-hidden flex-col items-center w-full justify-center">
			<div className="flex flex-row items-center justify-between w-full mb-2 max-w-screen-xl">
				<h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
					Model Catalog
				</h1>
				<div className="flex flex-row items-center ml-2">
					<div className="relative flex flex-row items-center">
						<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Search..."
							onChange={(e) => {
								search(e.target.value);
								setSearchTerm(e.target.value);
							}}
							value={searchTerm}
							className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px] focus-visible:ring-0 focus-visible:ring-offset-0"
						/>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger
							asChild
							className="focus-visible:ring-0 focus-visible:ring-offset-0 mx-2"
						>
							<Button variant="outline" size="sm" className="h-8 gap-1">
								<ListFilter className="h-3.5 w-3.5" />
								<span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
									Filter
								</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuLabel>Filter by</DropdownMenuLabel>
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
							>
								All
							</DropdownMenuCheckboxItem>
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
								>
									{filter}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			<div
				className={
					"flex flex-grow h-full max-h-full overflow-auto w-full pr-2 max-w-screen-xl"
				}
			>
				{foundBits.isLoading && (
					<BentoGrid className="mx-auto cursor-pointer w-full">
						{[...Array(10)].map((item, i) => {
							if (i === 0) counter = 0;
							const wide = counter === 3 || counter === 6;
							if (counter === 6) counter = 0;
							else counter += 1;
							return (
								<BentoGridItem
									className={`h-full w-full ${wide ? "md:col-span-2" : ""}`}
									key={`${i}__skeleton`}
									title={
										<div className="flex flex-row items-center">
											<Skeleton className="h-4 w-[200px]" />{" "}
											<Skeleton className="h-4 ml-2 w-[100px]" />
										</div>
									}
									description={
										<Skeleton className="h-[125px] w-full rounded-xl" />
									}
									header={
										<div>
											<div className="flex flex-row items-center">
												<Skeleton className="h-14 w-14 rounded-full" />
												<Skeleton className="h-4 w-[40px] ml-2" />
												<Skeleton className="h-4 w-[40px] ml-2" />
											</div>
										</div>
									}
									icon={<Skeleton className="h-4 w-[200px]" />}
								/>
							);
						})}
					</BentoGrid>
				)}
				{!foundBits.isLoading && (
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
				)}
			</div>
		</main>
	);
}
