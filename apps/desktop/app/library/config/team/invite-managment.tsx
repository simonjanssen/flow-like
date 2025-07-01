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
	EmptyState,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Separator,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
	Textarea,
} from "@tm9657/flow-like-ui";
import {
	Check,
	Clock,
	Copy,
	Crown,
	Link,
	LinkIcon,
	Mail,
	MailIcon,
	MoreVertical,
	Plus,
	RefreshCw,
	Settings,
	Shield,
	Trash2,
	User,
	UserCheck,
	UserPlus,
	UserX,
	Users,
	UsersIcon,
	X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface InviteLink {
	id: string;
	name: string;
	url: string;
	createdAt: Date;
	usageCount: number;
	maxUses?: number;
	expiresAt?: Date;
}

export function InviteManagement({ appId }: { appId: string }) {
	const [inviteLinks, setInviteLinks] = useState<InviteLink[]>([
		{
			id: "1",
			name: "General Invite",
			url: "https://yourapp.com/invite/abc123xyz",
			createdAt: new Date("2024-12-15"),
			usageCount: 5,
			maxUses: 10,
		},
		{
			id: "2",
			name: "Marketing Team",
			url: "https://yourapp.com/invite/def456uvw",
			createdAt: new Date("2024-12-20"),
			usageCount: 3,
		},
	]);

	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState("member");
	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const [showCreateLinkDialog, setShowCreateLinkDialog] = useState(false);
	const [newLinkName, setNewLinkName] = useState("");
	const [newLinkMaxUses, setNewLinkMaxUses] = useState<string>("");

	const copyInviteLink = (url: string) => {
		navigator.clipboard.writeText(url);
		toast.success("Invite link copied to clipboard!");
	};

	const createInviteLink = () => {
		const newLink: InviteLink = {
			id: Date.now().toString(),
			name: newLinkName || "Unnamed Link",
			url: `https://yourapp.com/invite/${Math.random().toString(36).substring(2, 15)}`,
			createdAt: new Date(),
			usageCount: 0,
			maxUses: newLinkMaxUses ? Number.parseInt(newLinkMaxUses) : undefined,
		};

		setInviteLinks([...inviteLinks, newLink]);
		setNewLinkName("");
		setNewLinkMaxUses("");
		setShowCreateLinkDialog(false);
		toast.success("New invite link created!");
	};

	const deleteInviteLink = (id: string) => {
		setInviteLinks(inviteLinks.filter((link) => link.id !== id));
		toast.success("Invite link deleted!");
	};

	return (
		<div className="grid gap-6 md:grid-cols-2 w-full pr-2">
			{/* Direct Invite Card - moved to top */}
			<Card className="md:col-span-2">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<UserPlus className="w-5 h-5" />
						Direct Invite
					</CardTitle>
					<CardDescription>Send a direct invitation via email</CardDescription>
				</CardHeader>
				<CardContent>
					<Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
						<DialogTrigger asChild>
							<Button className="w-full bg-gradient-to-r from-primary to-tertiary hover:from-primary/50 hover:to-tertiary/50">
								<Mail className="w-4 h-4 mr-2" />
								Send Invitation
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Invite New Member</DialogTitle>
								<DialogDescription>
									Send a direct invitation to join your team
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								<div>
									<Label htmlFor="email">Email Address</Label>
									<Input
										id="email"
										type="email"
										placeholder="Enter email address"
										value={inviteEmail}
										onChange={(e) => setInviteEmail(e.target.value)}
									/>
								</div>
								<div>
									<Label htmlFor="role">Role</Label>
									<Select value={inviteRole} onValueChange={setInviteRole}>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="viewer">Viewer</SelectItem>
											<SelectItem value="member">Member</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setShowInviteDialog(false)}
								>
									Cancel
								</Button>
								<Button>Send Invitation</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>

			{/* Invite Links Management - moved to bottom */}
			<Card className="md:col-span-2">
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Link className="w-5 h-5" />
								Invite Links
							</CardTitle>
							<CardDescription>
								Create and manage invite links for your team
							</CardDescription>
						</div>
						<Dialog
							open={showCreateLinkDialog}
							onOpenChange={setShowCreateLinkDialog}
						>
							<DialogTrigger asChild>
								<Button>
									<Plus className="w-4 h-4 mr-2" />
									Create Link
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Create New Invite Link</DialogTitle>
									<DialogDescription>
										Create a new invite link with optional usage limits
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-4">
									<div>
										<Label htmlFor="linkName">Link Name</Label>
										<Input
											id="linkName"
											placeholder="e.g., Marketing Team, Beta Users"
											value={newLinkName}
											onChange={(e) => setNewLinkName(e.target.value)}
										/>
									</div>
									<div>
										<Label htmlFor="maxUses">Max Uses (Optional)</Label>
										<Input
											id="maxUses"
											type="number"
											placeholder="Leave empty for unlimited"
											value={newLinkMaxUses}
											onChange={(e) => setNewLinkMaxUses(e.target.value)}
										/>
									</div>
								</div>
								<DialogFooter>
									<Button
										variant="outline"
										onClick={() => setShowCreateLinkDialog(false)}
									>
										Cancel
									</Button>
									<Button onClick={createInviteLink}>Create Link</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{inviteLinks.length === 0 && (
						<EmptyState
							className="w-full flex flex-grow min-w-fill flex-col max-w-full"
							title="No Invite Links"
							description="Create Invite Links to share your project"
							icons={[UsersIcon, LinkIcon, MailIcon]}
						/>
					)}
					{inviteLinks.length !== 0 &&
						inviteLinks.map((link) => (
							<div key={link.id} className="border rounded-lg p-4 space-y-3">
								<div className="flex items-start justify-between">
									<div className="space-y-1">
										<h4 className="font-medium">{link.name}</h4>
										<div className="flex items-center gap-4 text-sm text-muted-foreground">
											<span className="flex items-center gap-1">
												<UserCheck className="w-4 h-4" />
												{link.usageCount} joined
											</span>
											{link.maxUses && <span>Max: {link.maxUses}</span>}
											<span className="flex items-center gap-1">
												<Clock className="w-4 h-4" />
												{link.createdAt.toLocaleDateString()}
											</span>
										</div>
									</div>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="sm">
												<MoreVertical className="w-4 h-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												onClick={() => copyInviteLink(link.url)}
											>
												<Copy className="w-4 h-4 mr-2" />
												Copy Link
											</DropdownMenuItem>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<DropdownMenuItem
														onSelect={(e) => e.preventDefault()}
													>
														<Trash2 className="w-4 h-4 mr-2" />
														Delete
													</DropdownMenuItem>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															Delete Invite Link
														</AlertDialogTitle>
														<AlertDialogDescription>
															Are you sure you want to delete "{link.name}"?
															This action cannot be undone and the link will no
															longer work.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => deleteInviteLink(link.id)}
														>
															Delete
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
								<div className="flex gap-2">
									<Input
										value={link.url}
										readOnly
										className="font-mono text-sm"
									/>
									<Button
										onClick={() => copyInviteLink(link.url)}
										variant="outline"
										size="sm"
									>
										<Copy className="w-4 h-4" />
									</Button>
								</div>
								{link.maxUses && (
									<div className="flex items-center gap-2">
										<div className="flex-1 bg-muted rounded-full h-2">
											<div
												className="bg-primary h-2 rounded-full transition-all"
												style={{
													width: `${Math.min((link.usageCount / link.maxUses) * 100, 100)}%`,
												}}
											/>
										</div>
										<span className="text-xs text-muted-foreground">
											{link.usageCount}/{link.maxUses}
										</span>
									</div>
								)}
							</div>
						))}
				</CardContent>
			</Card>
		</div>
	);
}
