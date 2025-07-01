"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	type IBackendRole,
	Label,
	RolePermissions,
	Separator,
} from "@tm9657/flow-like-ui";
import {
	Calendar,
	Copy,
	Crown,
	Edit,
	MoreHorizontal,
	Shield,
	Star,
	Trash2,
	User2Icon,
} from "lucide-react";
import { type JSX, useState } from "react";

interface RoleCardProps {
	role: IBackendRole;
	defaultRole: string | undefined;
	permissionIcons: Record<
		string,
		{ icon: React.ComponentType<any>; label: string; color: string }
	>;
	allPermissions: RolePermissions[];
	onEdit: (role: IBackendRole) => void;
	onDuplicate: (role: IBackendRole) => void;
	onDelete: (roleId: string) => void;
	onSetDefault: (roleId: string) => void;
	getPermissionBadges: (permissions: RolePermissions) => (JSX.Element | null)[];
	compact?: boolean;
}

export function RoleCard({
	role,
	defaultRole,
	permissionIcons,
	allPermissions,
	onEdit,
	onDuplicate,
	onDelete,
	onSetDefault,
	getPermissionBadges,
	compact = false,
}: Readonly<RoleCardProps>) {
	const permission = new RolePermissions(role.permissions);
	const [showAllPermissions, setShowAllPermissions] = useState(false);
	const permissionBadges = getPermissionBadges(permission);
	const visiblePermissions = showAllPermissions
		? permissionBadges
		: permissionBadges.slice(0, compact ? 3 : 6);

	const isOwner = permission.contains(RolePermissions.Owner);
	const isAdmin = permission.contains(RolePermissions.Admin);
	const isDefault = role.id === defaultRole;

	return (
		<Card
			className={`group flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-xl  ${
				isOwner
					? "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border-amber-200 shadow-amber-100/50 dark:from-amber-950/10 dark:via-orange-950/10 dark:to-yellow-950/10 dark:border-amber-800/30"
					: isDefault
						? "bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 border-blue-200 shadow-blue-100/50 dark:from-blue-950/10 dark:via-indigo-950/10 dark:to-violet-950/10 dark:border-blue-800/30"
						: "bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200 hover:border-slate-300 dark:from-slate-950/50 dark:to-gray-950/50 dark:border-slate-800"
			} ${compact ? "h-[220px]" : "min-h-[280px]"}`}
		>
			{/* Accent line */}
			<div
				className={`absolute top-0 left-0 right-0 h-1 ${
					isOwner
						? "bg-gradient-to-r from-amber-400 to-orange-400"
						: isDefault
							? "bg-gradient-to-r from-blue-400 to-indigo-400"
							: "bg-gradient-to-r from-slate-300 to-gray-300 dark:from-slate-700 dark:to-gray-700"
				}`}
			/>

			<CardHeader className={`${compact ? "pb-3" : "pb-4"} relative`}>
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-start gap-3 min-w-0 flex-1">
						{/* Role Icon */}
						<div
							className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
								isOwner
									? "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
									: isDefault
										? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
										: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
							}`}
						>
							{isOwner ? (
								<Crown className="h-5 w-5" />
							) : isAdmin ? (
								<Shield className="h-5 w-5" />
							) : (
								<User2Icon className="h-5 w-5" />
							)}
						</div>

						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 mb-1">
								<CardTitle
									className={`${compact ? "text-lg" : "text-xl"} font-semibold text-slate-900 dark:text-slate-100 truncate`}
								>
									{role.name}
								</CardTitle>
								{isDefault && (
									<Badge className="px-1 bg-blue-500/10 text-blue-700 border-blue-200 hover:bg-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-800">
										<Star className="h-3 w-3" />
									</Badge>
								)}
							</div>

							{!compact && role.description && (
								<CardDescription className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
									{role.description}
								</CardDescription>
							)}
						</div>
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0 opacity-60 hover:opacity-100 transition-opacity group-hover:opacity-100"
							>
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem
								onClick={() => onEdit(role)}
								className="cursor-pointer"
							>
								<Edit className="h-4 w-4 mr-2" />
								Edit Role
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => onDuplicate(role)}
								className="cursor-pointer"
							>
								<Copy className="h-4 w-4 mr-2" />
								Duplicate
							</DropdownMenuItem>
							{!isDefault && !isOwner && (
								<DropdownMenuItem
									onClick={() => onSetDefault(role.id)}
									className="cursor-pointer"
								>
									<Star className="h-4 w-4 mr-2" />
									Set as Default
								</DropdownMenuItem>
							)}
							{!isOwner && (
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<DropdownMenuItem
											onSelect={(e) => e.preventDefault()}
											className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400"
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Delete Role
										</DropdownMenuItem>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Delete Role</AlertDialogTitle>
											<AlertDialogDescription>
												Are you sure you want to delete the "{role.name}" role?
												This action cannot be undone.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction
												onClick={() => onDelete(role.id)}
												className="bg-red-600 hover:bg-red-700"
											>
												Delete
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>

			<CardContent
				className={`${compact ? "flex-1 flex flex-col" : "flex flex-col flex-1"} space-y-4`}
			>
				{/* Tags Section */}
				{(role.tags?.length ?? 0) > 0 && (
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<div className="w-1 h-4 bg-slate-300 dark:bg-slate-600 rounded-full" />
							<Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
								Tags
							</Label>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{role.tags?.slice(0, compact ? 3 : 5).map((tag) => (
								<Badge
									key={tag}
									variant="secondary"
									className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 border-0 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
								>
									{tag}
								</Badge>
							))}
							{(role.tags?.length ?? 0) > (compact ? 3 : 5) && (
								<Badge
									variant="outline"
									className="text-xs px-2.5 py-1 text-slate-500 border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400"
								>
									+{(role.tags?.length ?? 0) - (compact ? 3 : 5)}
								</Badge>
							)}
						</div>
					</div>
				)}

				{/* Permissions Section */}
				{!compact && (
					<div className="space-y-2 flex flex-col flex-1">
						<div className="flex items-center gap-2">
							<div className="w-1 h-4 bg-slate-300 dark:bg-slate-600 rounded-full" />
							<Label className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
								Permissions
							</Label>
						</div>
						<div className="flex flex-wrap gap-1.5 flex-1 content-start">
							{visiblePermissions}
							{permissionBadges.length > 6 && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setShowAllPermissions(!showAllPermissions)}
									className="h-7 px-3 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
								>
									{showAllPermissions
										? "Show Less"
										: `+${permissionBadges.length - 6} more`}
								</Button>
							)}
						</div>
					</div>
				)}

				{/* Footer */}
				<div className={`${compact ? "mt-auto pt-3" : "pt-4 mt-auto"}`}>
					<Separator className="mb-3 opacity-50" />
					<div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
						<div className="flex items-center gap-1.5">
							<Calendar className="h-3 w-3" />
							<span>
								Created{" "}
								{new Date(Date.parse(role.created_at)).toLocaleDateString(
									"en-US",
									{
										month: "short",
										day: "numeric",
										year: "numeric",
									},
								)}
							</span>
						</div>
						<div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
							<div className="w-1.5 h-1.5 rounded-full bg-green-400" />
							<span className="text-xs">Active</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
