"use client";

import { createId } from "@paralleldrive/cuid2";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	type IBackendRole,
	RolePermissions,
	useBackend,
	useInvoke,
} from "@tm9657/flow-like-ui";
import {
	BarChart3,
	ChartLine,
	Crown,
	Database,
	Edit,
	Eye,
	Layers,
	Plus,
	Rocket,
	ScrollText,
	Settings,
	Shield,
	Star,
	Users,
	Wrench,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { RoleCard } from "./role-card";
import { RoleDialog } from "./role-dialog";
import { RoleFilters } from "./role-filters";

const permissionIcons = {
	[RolePermissions.Owner.toBigInt().toString()]: {
		icon: Crown,
		label: "Owner",
		color: "text-amber-500",
	},
	[RolePermissions.Admin.toBigInt().toString()]: {
		icon: Shield,
		label: "Admin",
		color: "text-red-500",
	},
	[RolePermissions.ReadTeam.toBigInt().toString()]: {
		icon: Users,
		label: "Read Team",
		color: "text-blue-500",
	},
	[RolePermissions.ReadRoles.toBigInt().toString()]: {
		icon: Shield,
		label: "Read Roles",
		color: "text-purple-500",
	},
	[RolePermissions.ReadFiles.toBigInt().toString()]: {
		icon: Eye,
		label: "Read Files",
		color: "text-green-500",
	},
	[RolePermissions.WriteFiles.toBigInt().toString()]: {
		icon: Edit,
		label: "Write Files",
		color: "text-orange-500",
	},
	[RolePermissions.InvokeApi.toBigInt().toString()]: {
		icon: Edit,
		label: "Invoke API",
		color: "text-cyan-500",
	},
	[RolePermissions.WriteMeta.toBigInt().toString()]: {
		icon: Database,
		label: "Write Meta",
		color: "text-indigo-500",
	},
	[RolePermissions.ReadBoards.toBigInt().toString()]: {
		icon: Layers,
		label: "Read Boards",
		color: "text-teal-500",
	},
	[RolePermissions.ExecuteBoards.toBigInt().toString()]: {
		icon: Rocket,
		label: "Execute Boards",
		color: "text-pink-500",
	},
	[RolePermissions.WriteBoards.toBigInt().toString()]: {
		icon: Edit,
		label: "Write Boards",
		color: "text-violet-500",
	},
	[RolePermissions.ListReleases.toBigInt().toString()]: {
		icon: ScrollText,
		label: "List Releases",
		color: "text-slate-500",
	},
	[RolePermissions.ReadReleases.toBigInt().toString()]: {
		icon: Eye,
		label: "Read Releases",
		color: "text-emerald-500",
	},
	[RolePermissions.ExecuteReleases.toBigInt().toString()]: {
		icon: Rocket,
		label: "Execute Releases",
		color: "text-rose-500",
	},
	[RolePermissions.WriteReleases.toBigInt().toString()]: {
		icon: Edit,
		label: "Write Releases",
		color: "text-yellow-500",
	},
	[RolePermissions.ReadLogs.toBigInt().toString()]: {
		icon: ScrollText,
		label: "Read Logs",
		color: "text-gray-500",
	},
	[RolePermissions.ReadAnalytics.toBigInt().toString()]: {
		icon: ChartLine,
		label: "Read Analytics",
		color: "text-blue-600",
	},
	[RolePermissions.ReadConfig.toBigInt().toString()]: {
		icon: Settings,
		label: "Read Config",
		color: "text-purple-600",
	},
	[RolePermissions.WriteConfig.toBigInt().toString()]: {
		icon: Wrench,
		label: "Write Config",
		color: "text-red-600",
	},
	[RolePermissions.ReadTemplates.toBigInt().toString()]: {
		icon: Wrench,
		label: "Read Templates",
		color: "text-green-600",
	},
	[RolePermissions.WriteTemplates.toBigInt().toString()]: {
		icon: Wrench,
		label: "Write Templates",
		color: "text-orange-600",
	},
};

const allPermissions = [
	RolePermissions.Owner,
	RolePermissions.Admin,
	RolePermissions.ReadTeam,
	RolePermissions.ReadRoles,
	RolePermissions.ReadFiles,
	RolePermissions.WriteFiles,
	RolePermissions.InvokeApi,
	RolePermissions.WriteMeta,
	RolePermissions.ReadBoards,
	RolePermissions.ExecuteBoards,
	RolePermissions.WriteBoards,
	RolePermissions.ListReleases,
	RolePermissions.ReadReleases,
	RolePermissions.ExecuteReleases,
	RolePermissions.WriteReleases,
	RolePermissions.ReadLogs,
	RolePermissions.ReadAnalytics,
	RolePermissions.ReadConfig,
	RolePermissions.WriteConfig,
	RolePermissions.ReadTemplates,
	RolePermissions.WriteTemplates,
];

export default function RolesPage() {
	const searchParams = useSearchParams();
	const appId = searchParams.get("id");
	const backend = useBackend();
	const roles = useInvoke(
		backend.roleState.getRoles,
		backend.roleState,
		[appId!],
		typeof appId === "string",
	);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingRole, setEditingRole] = useState<IBackendRole | undefined>();
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedTag, setSelectedTag] = useState("all");
	const [viewMode, setViewMode] = useState<"grid" | "list" | "compact">("grid");
	const [sortBy, setSortBy] = useState<"name" | "created" | "permissions">(
		"name",
	);

	const { filteredAndSortedRoles, availableTags, defaultRole } = useMemo(() => {
		if (!roles.data)
			return {
				filteredAndSortedRoles: [],
				availableTags: [],
				defaultRole: undefined,
			};

		const defaultRoleId = roles.data[0];
		const foundRoles = roles.data[1];
		const defaultRole = foundRoles.find((role) => role.id === defaultRoleId);
		const availableTags = Array.from(
			new Set(foundRoles.flatMap((role) => role.attributes ?? [])),
		);
		const filtered = foundRoles.filter((role) => {
			const matchesSearch =
				role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				role.description.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesTag =
				selectedTag === "all" || role.attributes?.includes(selectedTag);
			return matchesSearch && matchesTag;
		});

		const filteredAndSortedRoles = filtered.toSorted((a, b) => {
			switch (sortBy) {
				case "name":
					return a.name.localeCompare(b.name);
				case "created":
					return Date.parse(b.created_at) - Date.parse(a.created_at);
				case "permissions":
					return Number(a.permissions - b.permissions);
				default:
					return 0;
			}
		});

		return {
			filteredAndSortedRoles,
			availableTags: ["all", ...availableTags].sort(),
			defaultRole: defaultRole,
		};
	}, [roles.data, searchTerm, selectedTag, sortBy]);

	const getPermissionBadges = (permissions: RolePermissions) => {
		return allPermissions
			.filter((perm) => permissions.contains(perm))
			.map((perm) => {
				const key = perm.toBigInt().toString();
				const config = permissionIcons[key];
				if (!config) return null;

				const Icon = config.icon;
				return (
					<Badge
						key={key}
						variant="outline"
						className="flex items-center gap-1 text-xs"
					>
						<Icon className={`h-3 w-3 ${config.color}`} />
						{config.label}
					</Badge>
				);
			})
			.filter(Boolean);
	};

	const handleCreateRole = () => {
		setEditingRole(undefined);
		setIsDialogOpen(true);
	};

	const handleEditRole = (role: IBackendRole) => {
		setEditingRole(role);
		setIsDialogOpen(true);
	};

	const handleSaveRole = useCallback(
		async (roleData: IBackendRole) => {
			if (!appId) return;
			roleData.app_id = appId;
			await backend.roleState.upsertRole(appId, roleData);
			await roles.refetch();
		},
		[appId, backend],
	);

	const handleDuplicateRole = useCallback(
		async (role: IBackendRole) => {
			if (!appId) return;
			await backend.roleState.upsertRole(appId, { ...role, id: createId() });
			await roles.refetch();
		},
		[appId, backend],
	);

	const handleDeleteRole = useCallback(
		async (roleId: string) => {
			if (!appId) return;
			await backend.roleState.deleteRole(appId, roleId);
			await roles.refetch();
		},
		[appId, backend],
	);

	const handleSetDefaultRole = useCallback(
		async (roleId: string) => {
			if (!appId) return;
			await backend.roleState.makeRoleDefault(appId, roleId);
			await roles.refetch();
		},
		[appId, backend],
	);

	const getGridClass = () => {
		switch (viewMode) {
			case "list":
				return "grid grid-cols-1 gap-4";
			case "compact":
				return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4";
			default:
				return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
		}
	};

	return (
		<div className="container mx-auto p-4 space-y-4 flex flex-col h-full max-h-full overflow-hidden">
			{/* Compact Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
						Role Management
					</h1>
				</div>
				<Button
					onClick={handleCreateRole}
					size="sm"
					className="bg-gradient-to-r from-primary to-tertiary hover:from-primary/50 hover:to-tertiary/50"
				>
					<Plus className="h-4 w-4 mr-2" />
					Create Role
				</Button>
			</div>

			{/* Default Role Info - More Compact */}
			{defaultRole && (
				<Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20 rounded-md">
					<CardHeader className="py-2">
						<div className="flex items-center gap-2">
							<Star className="h-4 w-4 text-blue-500" />
							<CardDescription className="text-sm m-0">
								Default role: <strong>{defaultRole.name}</strong>
							</CardDescription>
						</div>
					</CardHeader>
				</Card>
			)}

			{/* Compact Filters */}
			<RoleFilters
				searchTerm={searchTerm}
				onSearchChange={setSearchTerm}
				selectedTag={selectedTag}
				onTagChange={setSelectedTag}
				availableTags={availableTags}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
				sortBy={sortBy}
				onSortChange={setSortBy}
				totalRoles={roles.data?.[1].length ?? 0}
				filteredRoles={filteredAndSortedRoles.length}
			/>

			{/* Roles Grid - Maximum Space */}
			<div className="flex-1 overflow-auto">
				<div className={getGridClass()}>
					{filteredAndSortedRoles.map((role) => (
						<RoleCard
							key={role.id}
							defaultRole={defaultRole?.id}
							role={role}
							permissionIcons={permissionIcons}
							allPermissions={allPermissions}
							onEdit={handleEditRole}
							onDuplicate={handleDuplicateRole}
							onDelete={handleDeleteRole}
							onSetDefault={handleSetDefaultRole}
							getPermissionBadges={getPermissionBadges}
							compact={viewMode === "compact"}
						/>
					))}
				</div>

				{/* Empty State */}
				{filteredAndSortedRoles.length === 0 && (
					<div className="text-center py-8">
						<Shield className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
						<h3 className="text-base font-semibold mb-2">No roles found</h3>
						<p className="text-sm text-muted-foreground mb-3">
							{searchTerm || selectedTag !== "all"
								? "Try adjusting your filters"
								: "Create your first role to get started"}
						</p>
						{!searchTerm && selectedTag === "all" && (
							<Button onClick={handleCreateRole} size="sm">
								<Plus className="h-4 w-4 mr-2" />
								Create First Role
							</Button>
						)}
					</div>
				)}
			</div>

			{/* Role Dialog */}
			<RoleDialog
				open={isDialogOpen}
				onOpenChange={setIsDialogOpen}
				role={editingRole}
				allPermissions={allPermissions}
				permissionIcons={permissionIcons}
				onSave={handleSaveRole}
			/>
		</div>
	);
}
