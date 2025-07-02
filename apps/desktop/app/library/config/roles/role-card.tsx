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
            className={`group flex flex-col relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${
                isOwner
                    ? "bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-yellow-50/40 border-amber-200/60 shadow-lg shadow-amber-100/20 dark:from-amber-950/20 dark:via-orange-950/15 dark:to-yellow-950/10 dark:border-amber-700/40"
                    : isDefault
                        ? "bg-gradient-to-br from-blue-50/80 via-indigo-50/60 to-violet-50/40 border-blue-200/60 shadow-lg shadow-blue-100/20 dark:from-blue-950/20 dark:via-indigo-950/15 dark:to-violet-950/10 dark:border-blue-700/40"
                        : "bg-white/80 backdrop-blur-sm border-slate-200/60 hover:border-slate-300/80 shadow-md dark:bg-slate-900/60 dark:border-slate-700/60"
            } ${compact ? "h-[220px]" : "min-h-[280px]"}`}
        >
            {/* Enhanced accent line with glow */}
            <div
                className={`absolute top-0 left-0 right-0 h-0.5 ${
                    isOwner
                        ? "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 shadow-sm shadow-amber-300/50"
                        : isDefault
                            ? "bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-500 shadow-sm shadow-blue-300/50"
                            : "bg-gradient-to-r from-slate-300 to-gray-400 dark:from-slate-600 dark:to-slate-500"
                }`}
            />

            <CardHeader className={`${compact ? "pb-3" : "pb-4"} relative`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Enhanced role icon with better shadows */}
                        <div
                            className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ring-1 transition-all group-hover:scale-105 ${
                                isOwner
                                    ? "bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700 ring-amber-200/50 dark:from-amber-900/30 dark:to-amber-800/20 dark:text-amber-300 dark:ring-amber-700/30"
                                    : isDefault
                                        ? "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 ring-blue-200/50 dark:from-blue-900/30 dark:to-blue-800/20 dark:text-blue-300 dark:ring-blue-700/30"
                                        : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 ring-slate-200/50 dark:from-slate-800 dark:to-slate-700 dark:text-slate-300 dark:ring-slate-600/30"
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
                                    className={`${compact ? "text-lg" : "text-xl"} font-bold text-slate-900 dark:text-slate-50 truncate tracking-tight`}
                                >
                                    {role.name}
                                </CardTitle>
                                {isDefault && (
                                    <Badge className="py-0.5 bg-blue-500/15 text-blue-700 border-blue-300/50 hover:bg-blue-500/25 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-600/30 transition-colors px-1">
                                        <Star className="h-3 w-3 fill-current" />
                                    </Badge>
                                )}
                            </div>

                            {!compact && role.description && (
                                <CardDescription className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium">
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
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
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
                {/* Enhanced Tags Section */}
                {(role.attributes?.length ?? 0) > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full" />
                            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Attributes
                            </Label>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {role.attributes?.slice(0, compact ? 3 : 5).map((tag) => (
                                <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs px-3 py-1.5 bg-slate-100/80 text-slate-700 border-0 hover:bg-slate-200/80 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700/80 transition-all duration-200 font-medium rounded-full"
                                >
                                    {tag}
                                </Badge>
                            ))}
                            {(role.attributes?.length ?? 0) > (compact ? 3 : 5) && (
                                <Badge
                                    variant="outline"
                                    className="text-xs px-3 py-1.5 text-slate-500 border-slate-300/60 bg-slate-50/80 hover:bg-slate-100/80 dark:border-slate-600/60 dark:bg-slate-800/40 dark:text-slate-400 transition-all duration-200 rounded-full"
                                >
                                    +{(role.attributes?.length ?? 0) - (compact ? 3 : 5)}
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                {/* Enhanced Permissions Section */}
                {!compact && (
                    <div className="space-y-3 flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full" />
                            <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Permissions
                            </Label>
                        </div>
                        <div className="flex flex-wrap gap-2 flex-1 content-start">
                            {visiblePermissions}
                            {permissionBadges.length > 6 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowAllPermissions(!showAllPermissions)}
                                    className="h-8 px-3 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 rounded-full font-medium"
                                >
                                    {showAllPermissions
                                        ? "Show Less"
                                        : `+${permissionBadges.length - 6} more`}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Enhanced Footer */}
                <div className={`${compact ? "mt-auto pt-3" : "pt-4 mt-auto"}`}>
                    <Separator className="mb-3 opacity-30" />
                    <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="font-medium">
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
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
