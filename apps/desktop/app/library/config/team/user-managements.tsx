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
	Avatar,
	AvatarFallback,
	AvatarImage,
	Badge,
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
	Input,
	Label,
	ScrollArea,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Separator,
} from "@tm9657/flow-like-ui";
import {
	Crown,
	CrownIcon,
	Filter,
	MoreVertical,
	Search,
	Settings,
	Shield,
	Trash2,
	User,
	UserX,
	Users,
} from "lucide-react";
import { useMemo, useState } from "react";

const roleIcons = {
	owner: Crown,
};

const roleColors = {
	owner: "bg-gradient-to-r from-yellow-500 to-orange-500",
	admin: "bg-gradient-to-r from-purple-500 to-pink-500",
	member: "bg-gradient-to-r from-blue-500 to-cyan-500",
	viewer: "bg-gradient-to-r from-gray-500 to-slate-500",
};

interface TeamMember {
	id: string;
	name: string;
	username: string;
	email: string;
	avatar?: string;
	role: "owner" | "admin" | "member" | "viewer";
	joinedAt: string;
	status: "active" | "invited";
}

export function UserManagement({ appId }: { appId: string }) {
	const [members, setMembers] = useState<TeamMember[]>([
		{
			id: "1",
			name: "Felix Müller",
			username: "felix.muller",
			email: "felix@example.com",
			avatar:
				"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face",
			role: "owner",
			joinedAt: "2024-01-15",
			status: "active",
		},
		{
			id: "2",
			name: "Sarah Johnson",
			username: "sarah.j",
			email: "sarah@example.com",
			avatar:
				"https://images.unsplash.com/photo-1494790108755-2616b51829c1?w=32&h=32&fit=crop&crop=face",
			role: "admin",
			joinedAt: "2024-02-01",
			status: "active",
		},
		{
			id: "3",
			name: "Alex Chen",
			username: "alex.chen",
			email: "alex@example.com",
			avatar:
				"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face",
			role: "member",
			joinedAt: "2024-02-15",
			status: "active",
		},
		{
			id: "4",
			name: "Maria Garcia",
			username: "maria.garcia",
			email: "maria@example.com",
			role: "viewer",
			joinedAt: "2024-03-01",
			status: "invited",
		},
	]);

	const [searchQuery, setSearchQuery] = useState("");
	const [roleFilter, setRoleFilter] = useState<string>("all");

	const filteredMembers = useMemo(() => {
		return members.filter((member) => {
			// Search filter
			const matchesSearch =
				member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				member.email.toLowerCase().includes(searchQuery.toLowerCase());

			// Role filter
			const matchesRole = roleFilter === "all" || member.role === roleFilter;

			return matchesSearch && matchesRole;
		});
	}, [members, searchQuery, roleFilter]);

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
							<SelectItem value="owner">Owner</SelectItem>
							<SelectItem value="admin">Admin</SelectItem>
							<SelectItem value="member">Member</SelectItem>
							<SelectItem value="viewer">Viewer</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>

			<CardContent className="flex-1 min-h-0 p-0">
				<ScrollArea className="h-full px-6 pb-6">
					<div className="space-y-2">
						{filteredMembers.length === 0 ? (
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
							filteredMembers.map((member) => {
								return <Member key={member.id} sub={appId} member={member} />;
							})
						)}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}

function Member({ sub, member }: { sub: string; member: TeamMember }) {
	const RoleIcon =
		member.role === "owner" ? (
			<CrownIcon className="w-3 h-3 text-muted-foreground" />
		) : null;

	return (
		<div className="flex items-center justify-between p-2 py-1.5 border rounded-md hover:bg-muted/50 transition-colors">
			<div className="flex items-center gap-3 min-w-0 flex-1">
				<Avatar className="w-8 h-8 flex-shrink-0">
					<AvatarImage src={member.avatar} />
					<AvatarFallback
						className={`text-white text-xs ${roleColors[member.role]}`}
					>
						{member.name
							.split(" ")
							.map((n) => n[0])
							.join("")}
					</AvatarFallback>
				</Avatar>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<h3 className="font-medium text-sm truncate">{member.name}</h3>
						<span className="text-xs text-muted-foreground">
							@{member.username}
						</span>
						{member.status === "invited" && (
							<Badge variant="outline" className="text-xs px-1 py-0 h-4">
								Invited
							</Badge>
						)}
					</div>
					<div className="flex items-center gap-1">
						{RoleIcon}
						<span className="text-xs text-muted-foreground capitalize">
							{member.role}
						</span>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2 flex-shrink-0">
				{member.role !== "owner" && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="sm" className="h-6 w-6 p-0">
								<MoreVertical className="w-3 h-3" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-40">
							<Dialog>
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
											Select a new role for {member.name}
										</DialogDescription>
									</DialogHeader>
									<div className="space-y-4 py-4">
										<div className="space-y-2">
											<Label htmlFor="role">Role</Label>
											<Select defaultValue={member.role}>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="admin">
														<div className="flex items-center gap-2">
															<Shield className="w-4 h-4" />
															Admin
														</div>
													</SelectItem>
													<SelectItem value="member">
														<div className="flex items-center gap-2">
															<User className="w-4 h-4" />
															Member
														</div>
													</SelectItem>
													<SelectItem value="viewer">
														<div className="flex items-center gap-2">
															<Settings className="w-4 h-4" />
															Viewer
														</div>
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
									<DialogFooter>
										<Button variant="outline">Cancel</Button>
										<Button>Save Changes</Button>
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
											Are you sure you want to remove {member.name} from the
											team? This action cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction className="bg-red-600 hover:bg-red-700">
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
