"use client";

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
import { useMemo, useState } from "react";
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
	const projectRoles = useInvoke(
		backend.getRoles,
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
		if (!projectRoles.data)
			return {
				filteredAndSortedRoles: [],
				availableTags: [],
				defaultRole: undefined,
			};

		const defaultRoleId = projectRoles.data[0];
		const roles = projectRoles.data[1];
		const defaultRole = roles.find((role) => role.id === defaultRoleId);
		const availableTags = Array.from(
			new Set(roles.flatMap((role) => role.tags || [])),
		);
		const filtered = roles.filter((role) => {
			const matchesSearch =
				role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				role.description.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesTag =
				selectedTag === "all" || role.tags?.includes(selectedTag);
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
	}, [projectRoles.data, searchTerm, selectedTag, sortBy]);

	const getPermissionCount = (permissions: RolePermissions) => {
		return allPermissions.filter((perm) => permissions.contains(perm)).length;
	};

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
						variant="secondary"
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

	const handleSaveRole = (roleData: Partial<IBackendRole>) => {
		// if (editingRole) {
		//   // Update existing role
		//   setRoles(prev => prev.map(role =>
		//     role.id === editingRole.id
		//       ? { ...role, ...roleData }
		//       : role
		//   ));
		// } else {
		//   // Create new role
		//   const newRole: Role = {
		//     id: Date.now().toString(),
		//     name: roleData.name!,
		//     description: roleData.description!,
		//     permissions: roleData.permissions!,
		//     tags: roleData.tags!,
		//     isDefault: false,
		//     createdAt: new Date(),
		//   };
		//   setRoles(prev => [...prev, newRole]);
		// }
	};

	const handleDuplicateRole = (role: IBackendRole) => {
		// const newRole: Role = {
		//   ...role,
		//   id: Date.now().toString(),
		//   name: `${role.name} Copy`,
		//   isDefault: false,
		//   createdAt: new Date(),
		// };
		// // Remove Owner permission from duplicated role
		// if (newRole.permissions.contains(RolePermissions.Owner)) {
		//   newRole.permissions = newRole.permissions.remove(RolePermissions.Owner);
		// }
		// setRoles(prev => [...prev, newRole]);
	};

	const handleDeleteRole = (roleId: string) => {
		// setRoles(prev => prev.filter(role => role.id !== roleId));
	};

	const handleSetDefaultRole = (roleId: string) => {
		// setRoles(prev => prev.map(role => ({
		//   ...role,
		//   isDefault: role.id === roleId
		// })));
	};

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
		<div className="container mx-auto p-6 space-y-8 flex flex-col h-full max-h-full overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
						Role Management
					</h1>
					<p className="text-muted-foreground mt-2">
						Manage project roles and permissions with granular control
					</p>
				</div>
				<Button
					onClick={handleCreateRole}
					className="bg-gradient-to-r from-primary to-tertiary hover:from-primary/50 hover:to-tertiary/50"
				>
					<Plus className="h-4 w-4 mr-2" />
					Create Role
				</Button>
			</div>

			{/* Default Role Info */}
			{defaultRole && (
				<Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
					<CardHeader className="py-3 pt-4">
						<div className="flex items-center gap-2">
							<Star className="h-4 w-4 text-blue-500" />
							<CardTitle className="text-base">Default Role</CardTitle>
						</div>
						<CardDescription className="text-sm">
							New users are automatically assigned the{" "}
							<strong>{defaultRole.name}</strong> role
						</CardDescription>
					</CardHeader>
				</Card>
			)}

			{/* Filters */}
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
				totalRoles={projectRoles.data?.[1].length ?? 0}
				filteredRoles={filteredAndSortedRoles.length}
			/>

			{/* Roles Grid */}
			<div className="flex flex-col flex-grow max-h-full h-full overflow-auto overflow-x-hidden">
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
			</div>

			{/* Empty State */}
			{filteredAndSortedRoles.length === 0 && (
				<div className="text-center py-12">
					<Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<h3 className="text-lg font-semibold mb-2">No roles found</h3>
					<p className="text-muted-foreground mb-4">
						{searchTerm || selectedTag !== "all"
							? "Try adjusting your filters to see more roles"
							: "Create your first role to get started"}
					</p>
					{!searchTerm && selectedTag === "all" && (
						<Button onClick={handleCreateRole}>
							<Plus className="h-4 w-4 mr-2" />
							Create First Role
						</Button>
					)}
				</div>
			)}

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
