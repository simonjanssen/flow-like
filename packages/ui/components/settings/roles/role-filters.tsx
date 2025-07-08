"use client";

import { Filter, Grid3X3, List, Search, X } from "lucide-react";
import {
	Badge,
	Button,
	Input,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../../";

interface RoleFiltersProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	selectedTag: string;
	onTagChange: (value: string) => void;
	availableTags: string[];
	viewMode: "grid" | "list" | "compact";
	onViewModeChange: (mode: "grid" | "list" | "compact") => void;
	sortBy: "name" | "created" | "permissions";
	onSortChange: (sort: "name" | "created" | "permissions") => void;
	totalRoles: number;
	filteredRoles: number;
}

export function RoleFilters({
	searchTerm,
	onSearchChange,
	selectedTag,
	onTagChange,
	availableTags,
	viewMode,
	onViewModeChange,
	sortBy,
	onSortChange,
	totalRoles,
	filteredRoles,
}: Readonly<RoleFiltersProps>) {
	return (
		<div className="space-y-4">
			<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
				<div className="flex flex-1 gap-2">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search roles..."
							value={searchTerm}
							onChange={(e) => onSearchChange(e.target.value)}
							className="pl-10"
						/>
					</div>

					<Select value={selectedTag} onValueChange={onTagChange}>
						<SelectTrigger className="w-40">
							<SelectValue placeholder="Filter by tag" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Tags</SelectItem>
							{availableTags.map((tag) => (
								<SelectItem key={tag} value={tag}>
									{tag}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={sortBy} onValueChange={onSortChange}>
						<SelectTrigger className="w-40">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="name">Sort by Name</SelectItem>
							<SelectItem value="created">Sort by Created</SelectItem>
							<SelectItem value="permissions">Sort by Permissions</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex border rounded-lg">
						<Button
							variant={viewMode === "grid" ? "default" : "ghost"}
							size="sm"
							onClick={() => onViewModeChange("grid")}
							className="rounded-r-none"
						>
							<Grid3X3 className="h-4 w-4" />
						</Button>
						<Button
							variant={viewMode === "compact" ? "default" : "ghost"}
							size="sm"
							onClick={() => onViewModeChange("compact")}
							className="rounded-none border-l"
						>
							<Filter className="h-4 w-4" />
						</Button>
						<Button
							variant={viewMode === "list" ? "default" : "ghost"}
							size="sm"
							onClick={() => onViewModeChange("list")}
							className="rounded-l-none border-l"
						>
							<List className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>

			{/* Active Filters */}
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<span>
					Showing {filteredRoles} of {totalRoles} roles
				</span>
				{(searchTerm || selectedTag !== "all") && (
					<div className="flex items-center gap-2">
						<span>•</span>
						<span>Filters:</span>
						{searchTerm && (
							<Badge variant="secondary" className="gap-1">
								Search: {searchTerm}
								<X
									className="h-3 w-3 cursor-pointer"
									onClick={() => onSearchChange("")}
								/>
							</Badge>
						)}
						{selectedTag !== "all" && (
							<Badge variant="secondary" className="gap-1">
								Tag: {selectedTag}
								<X
									className="h-3 w-3 cursor-pointer"
									onClick={() => onTagChange("all")}
								/>
							</Badge>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
