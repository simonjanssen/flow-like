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
	Mail,
	MoreVertical,
	RefreshCw,
	Settings,
	Shield,
	Trash2,
	User,
	UserCheck,
	UserPlus,
	UserX,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InviteManagement } from "./invite-managment";
import { UserManagement } from "./user-managements";

interface JoinRequest {
	id: string;
	name: string;
	email: string;
	avatar?: string;
	requestedAt: string;
	message?: string;
}

export default function TeamManagementPage() {
	const [showRequestQueue] = useState(true); // This would be determined by project type

	const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([
		{
			id: "1",
			name: "David Wilson",
			email: "david@example.com",
			avatar:
				"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop&crop=face",
			requestedAt: "2024-03-10",
			message:
				"Hi! I'd love to join your project. I have 5 years of experience in frontend development.",
		},
		{
			id: "2",
			name: "Lisa Zhang",
			email: "lisa@example.com",
			requestedAt: "2024-03-12",
			message:
				"Hello, I'm interested in contributing to this project. I specialize in UI/UX design.",
		},
	]);

	return (
		<div className="container mx-auto p-6 space-y-8 flex flex-col overflow-hidden h-full flex-grow">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
						Team Management
					</h1>
					<p className="text-muted-foreground mt-2">
						Manage your team members, roles, and collaboration settings
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Badge variant="secondary" className="px-3 py-1">
						<Users className="w-4 h-4 mr-1" />0 members
					</Badge>
				</div>
			</div>

			<Tabs
				defaultValue="members"
				className="space-y-6 flex flex-col flex-1 min-h-0"
			>
				<TabsList className="grid w-full grid-cols-3 flex-shrink-0">
					<TabsTrigger value="members" className="flex items-center gap-2">
						<Users className="w-4 h-4" />
						Team Members
					</TabsTrigger>
					<TabsTrigger value="invite" className="flex items-center gap-2">
						<UserPlus className="w-4 h-4" />
						Invite & Access
					</TabsTrigger>
					{showRequestQueue && (
						<TabsTrigger value="requests" className="flex items-center gap-2">
							<Clock className="w-4 h-4" />
							Join Requests ({joinRequests.length})
						</TabsTrigger>
					)}
				</TabsList>

				{/* Team Members Tab */}
				<TabsContent value="members" className="flex-1 min-h-0">
					<div className="h-full overflow-y-auto">
						<UserManagement appId="your-app-id" />
					</div>
				</TabsContent>

				{/* Invite & Access Tab */}
				<TabsContent value="invite" className="flex-1 min-h-0">
					<div className="h-full overflow-y-auto">
						<InviteManagement appId="your-app-id" />
					</div>
				</TabsContent>

				{/* Join Requests Tab */}
				{showRequestQueue && (
					<TabsContent value="requests" className="flex-1 min-h-0">
						<div className="h-full overflow-y-auto">
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Clock className="w-5 h-5" />
										Join Requests
									</CardTitle>
									<CardDescription>
										Review and manage requests to join your team
									</CardDescription>
								</CardHeader>
								<CardContent>
									{joinRequests.length === 0 ? (
										<div className="text-center py-8">
											<UserCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
											<h3 className="text-lg font-semibold">
												No pending requests
											</h3>
											<p className="text-muted-foreground">
												All join requests have been processed
											</p>
										</div>
									) : (
										<div className="space-y-4">
											{joinRequests.map((request) => (
												<div
													key={request.id}
													className="border rounded-lg p-4 space-y-4"
												>
													<div className="flex items-start justify-between">
														<div className="flex items-center gap-4">
															<Avatar className="w-12 h-12">
																<AvatarImage src={request.avatar} />
																<AvatarFallback className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
																	{request.name
																		.split(" ")
																		.map((n) => n[0])
																		.join("")}
																</AvatarFallback>
															</Avatar>
															<div>
																<h3 className="font-semibold">
																	{request.name}
																</h3>
																<p className="text-sm text-muted-foreground">
																	{request.email}
																</p>
																<p className="text-xs text-muted-foreground">
																	Requested {request.requestedAt}
																</p>
															</div>
														</div>
														<div className="flex gap-2">
															<Button
																size="sm"
																className="bg-green-600 hover:bg-green-700"
															>
																<Check className="w-4 h-4 mr-1" />
																Accept
															</Button>
															<Button size="sm" variant="destructive">
																<X className="w-4 h-4 mr-1" />
																Decline
															</Button>
														</div>
													</div>
													{request.message && (
														<div className="bg-muted/50 rounded-lg p-3">
															<p className="text-sm text-muted-foreground font-medium mb-1">
																Message:
															</p>
															<p className="text-sm">{request.message}</p>
														</div>
													)}
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</TabsContent>
				)}
			</Tabs>
		</div>
	);
}
