"use client";

import {
	CrownIcon,
	Filter,
	MoreVertical,
	Search,
	Settings,
	Trash2,
	UserX,
	Users,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
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
	Avatar,
	AvatarFallback,
	AvatarImage,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	type IBackendRole,
	type IMember,
	Input,
	Label,
	RolePermissions,
	ScrollArea,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Separator,
	Skeleton,
	useBackend,
	useInfiniteInvoke,
	useInvalidateInvoke,
	useInvoke,
} from "../../../";

export function UserManagement({ appId }: Readonly<{ appId: string }>) {
	const backend = useBackend();
	const {
		data: team,
		hasNextPage,
		fetchNextPage,
		isFetchingNextPage,
	} = useInfiniteInvoke(backend.teamState.getTeam, backend.teamState, [appId]);
	const roles = useInvoke(backend.roleState.getRoles, backend.roleState, [
		appId,
	]);

	const [searchQuery, setSearchQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState<string>("all");

	const filteredTeam = useMemo(() => {
		if (!team) return [];
		return team.pages.flat();
	}, [team, searchQuery, roleFilter]);

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="flex-shrink-0">
				<CardTitle className="flex items-center gap-2">
					<Users className="w-5 h-5" />
					Team Members
				</CardTitle>
				<CardDescription>
					Manage roles and permissions for your team members
				</CardDescription>

				{/* Search and Filter Controls */}
				<div className="flex items-center gap-3 pt-4">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
						<Input
							placeholder="Search team members..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Select value={roleFilter} onValueChange={setRoleFilter}>
						<SelectTrigger className="w-[140px]">
							<Filter className="w-4 h-4 mr-2" />
							<SelectValue placeholder="Filter by role" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Roles</SelectItem>
							{roles.data?.[1].map((role) => (
								<SelectItem key={role.id} value={role.id}>
									{role.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</CardHeader>

			<CardContent className="flex-1 min-h-0 p-0">
				<ScrollArea className="h-full px-6 pb-6">
					<div className="space-y-2">
						{filteredTeam.length === 0 || !roles.data ? (
							<div className="text-center py-8">
								<UserX className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
								<h3 className="text-lg font-semibold">No members found</h3>
								<p className="text-muted-foreground">
									{searchQuery || roleFilter !== "all"
										? "Try adjusting your search or filter criteria"
										: "No team members have been added yet"}
								</p>
							</div>
						) : (
							filteredTeam.map((member) => {
								return (
									<Member
										key={member.id}
										member={member}
										roles={roles.data?.[1]}
									/>
								);
							})
						)}
						{hasNextPage && (
							<Button
								variant="outline"
								className="w-full mt-4"
								onClick={() => fetchNextPage()}
								disabled={isFetchingNextPage}
							>
								{isFetchingNextPage ? "Loading..." : "Load More Members"}
							</Button>
						)}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}

function Member({
	member,
	roles,
}: Readonly<{ member: IMember; roles: IBackendRole[] }>) {
	const invalidate = useInvalidateInvoke();
	const userRole = roles.find((role) => role.id === member.role_id);
	const permission = new RolePermissions(userRole?.permissions ?? 0);
	const backend = useBackend();
	const user = useInvoke(backend.userState.lookupUser, backend.userState, [
		member.user_id,
	]);
	const userData = user.data;
	const RoleIcon = permission.contains(RolePermissions.Owner) ? (
		<CrownIcon className="w-3 h-3 text-muted-foreground" />
	) : null;

	const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false);
	const [selectedRoleId, setSelectedRoleId] = useState(member.role_id);

	const handleChangeRole = useCallback(
		async (roleId: string) => {
			if (!userRole) return;
			if (roleId === member.role_id) return;
			await backend.roleState.assignRole(
				userRole.app_id,
				roleId,
				member.user_id,
			);
			invalidate(backend.teamState.getTeam, [userRole.app_id]);
			setIsChangeRoleOpen(false);
		},
		[member.id, backend, userRole, invalidate],
	);

	const handleRemoveMember = useCallback(async () => {
		if (!userRole) return;
		await backend.teamState.removeUser(userRole.app_id, member.user_id);
		invalidate(backend.teamState.getTeam, [userRole.app_id]);
		toast.success(
			`${userData?.username ?? "User"} has been removed from the team.`,
		);
	}, [member.id, backend, userRole, userData, invalidate]);

	if (!userData) {
		return (
			<Skeleton className="h-10 w-full flex items-center gap-3 p-2 py-1.5 border rounded-md" />
		);
	}

	const evaluatedName =
		userData.name ??
		userData.preferred_username ??
		userData.username ??
		userData.email ??
		"Unknown User";

	return (
		<div className="flex items-center justify-between p-2 py-1.5 border rounded-md hover:bg-muted/50 transition-colors">
			<div className="flex items-center gap-3 min-w-0 flex-1">
				<Avatar className="w-8 h-8 flex-shrink-0">
					<AvatarImage src={user.data.avatar_url} />
					<AvatarFallback className={`text-foreground text-xs`}>
						{evaluatedName
							.split(" ")
							.map((n) => n[0])
							.join("")}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<a href={`/profile?sub=${userData.id}`}>
							<h3 className="font-medium text-sm truncate hover:underline">
								{evaluatedName}
							</h3>
						</a>
						<span className="text-xs text-muted-foreground">
							@
							{userData.preferred_username ??
								userData.username ??
								userData.email}
						</span>
					</div>
					<div className="flex items-center gap-1">
						{RoleIcon}
						<span className="text-xs text-muted-foreground capitalize">
							{userRole?.name ?? "No Role Assigned"}
						</span>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-shrink-0">
				{!permission.contains(RolePermissions.Owner) && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="h-6 w-6 p-0">
								<MoreVertical className="w-3 h-3" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-40">
							<Dialog
								open={isChangeRoleOpen}
								onOpenChange={setIsChangeRoleOpen}
							>
								<DialogTrigger asChild>
									<DropdownMenuItem
										onSelect={(e) => e.preventDefault()}
										className="text-xs"
									>
										<Settings className="w-3 h-3 mr-2" />
										Change Role
									</DropdownMenuItem>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Change Role</DialogTitle>
										<DialogDescription>
											Select a new role for {evaluatedName}
										</DialogDescription>
									</DialogHeader>
									<div className="space-y-4 py-4">
										<div className="space-y-2">
											<Label htmlFor="role">Role</Label>
											<Select
												value={selectedRoleId}
												onValueChange={setSelectedRoleId}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{roles.map((role) => (
														<SelectItem key={role.id} value={role.id}>
															<div className="flex items-center gap-2">
																{role.name}
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
									</div>
									<DialogFooter>
										<Button
											variant="outline"
											onClick={() => setIsChangeRoleOpen(false)}
										>
											Cancel
										</Button>
										<Button
											onClick={async () => {
												await handleChangeRole(selectedRoleId);
											}}
										>
											Save Changes
										</Button>
									</DialogFooter>
								</DialogContent>
							</Dialog>
							<Separator />
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<DropdownMenuItem
										onSelect={(e) => e.preventDefault()}
										className="text-destructive-foreground bg-destructive text-xs"
									>
										<Trash2 className="w-3 h-3 mr-2" />
										Remove
									</DropdownMenuItem>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Remove Team Member</AlertDialogTitle>
										<AlertDialogDescription>
											Are you sure you want to remove {evaluatedName} from the
											team? This action cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											className="bg-red-600 hover:bg-red-700"
											onClick={handleRemoveMember}
										>
											Remove
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>
		</div>
	);
}
