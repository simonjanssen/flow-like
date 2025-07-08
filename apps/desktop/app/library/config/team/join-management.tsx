"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	type IJoinRequest,
	Skeleton,
	useBackend,
	useInfiniteInvoke,
	useInvoke,
} from "@tm9657/flow-like-ui";
import { Check, Clock, UserCheck, X } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

const exampleRequest: IJoinRequest = {
	id: "req_123456789",
	user_id: "user_987654321",
	created_at: "2025-07-03T10:30:00Z",
	app_id: "app_123456789",
	updated_at: "2025-07-03T10:30:00Z",
	comment:
		"Hi! I'd love to join your team. I'm a frontend developer with 3 years of experience in React and TypeScript. I've been following your project and would be excited to contribute!",
};

const exampleUserData = {
	id: "user_987654321",
	username: "johndoe",
	name: "John Doe",
	email: "john.doe@example.com",
	avatar_url:
		"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
};

export function TeamJoinManagement({ appId }: Readonly<{ appId: string }>) {
	const backend = useBackend();
	const {
		data: requestsPages,
		isLoading,
		fetchNextPage,
		refetch,
		hasNextPage,
	} = useInfiniteInvoke(backend.teamState.getJoinRequests, backend.teamState, [
		appId,
	]);

	const requests = requestsPages?.pages.flat() ?? [];

	return (
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
					{requests.length === 0 ? (
						<div className="text-center py-8">
							<UserCheck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
							<h3 className="text-lg font-semibold">No pending requests</h3>
							<p className="text-muted-foreground">
								All join requests have been processed
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{requests.map((request) => (
								<RequestCard
									key={request.id}
									request={request}
									appId={appId}
									refresh={async () => {
										await refetch();
									}}
								/>
							))}
							{hasNextPage && (
								<Button
									variant="outline"
									className="w-full mt-4"
									onClick={() => fetchNextPage()}
									disabled={isLoading}
								>
									{isLoading ? "Loading..." : "Load More Requests"}
								</Button>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function RequestCard({
	appId,
	request,
	refresh,
}: Readonly<{ appId: string; request: IJoinRequest; refresh: () => void }>) {
	const backend = useBackend();
	const user = useInvoke(backend.userState.lookupUser, backend.userState, [
		request.user_id,
	]);
	const userData = user.data;

	const acceptRequest = useCallback(async () => {
		try {
			await backend.teamState.acceptJoinRequest(appId, request.id);
			refresh();
		} catch (error) {
			console.error("Failed to accept request:", error);
			toast.error("Failed to accept request try again later");
		}
	}, [backend, appId, request.id, refresh]);

	const declineRequest = useCallback(async () => {
		try {
			await backend.teamState.rejectJoinRequest(appId, request.id);
			refresh();
		} catch (error) {
			console.error("Failed to decline request:", error);
			toast.error("Failed to decline request try again later");
		}
	}, [backend, appId, request.id, refresh]);

	if (!userData) {
		return (
			<Card className="animate-pulse">
				<CardContent className="p-6">
					<div className="flex items-center space-x-4">
						<Skeleton className="h-12 w-12 rounded-full" />
						<div className="space-y-2 flex-1">
							<Skeleton className="h-4 w-[200px]" />
							<Skeleton className="h-3 w-[150px]" />
						</div>
						<div className="flex gap-2">
							<Skeleton className="h-9 w-20" />
							<Skeleton className="h-9 w-20" />
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	const evaluatedName =
		userData.username ?? userData.name ?? userData.email ?? "Unknown User";

	return (
		<Card className="group transition-all duration-200 hover:shadow-md border-l-4 border-l-secondary/20 hover:border-l-secondary rounded-lg animate-in fade-in-0 slide-in-from-top-1">
			<CardContent className="p-6">
				<div className="flex items-start justify-between gap-4">
					<div className="flex items-center gap-4 flex-1 min-w-0">
						<div className="relative">
							<Avatar className="h-14 w-14 ring-2 ring-background shadow-sm transition-transform group-hover:scale-105">
								<AvatarImage src={userData.avatar_url} alt={evaluatedName} />
								<AvatarFallback className="bg-gradient-to-br from-secondary to-tertiary text-white font-semibold">
									{evaluatedName
										.split(" ")
										.map((n) => n[0])
										.join("")
										.toUpperCase()}
								</AvatarFallback>
							</Avatar>
						</div>

						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<h3 className="font-semibold text-lg text-foreground truncate">
									{evaluatedName}
								</h3>
								<div className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full border border-amber-200">
									Pending
								</div>
							</div>

							<div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
								<span className="truncate">
									{userData.email ?? userData.username ?? "No contact details"}
								</span>
							</div>

							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<Clock className="h-3 w-3" />
								<span>
									Requested{" "}
									{new Date(Date.parse(request.created_at)).toLocaleDateString(
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

					<div className="flex gap-2 shrink-0">
						<Button
							size="sm"
							className="bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
							onClick={acceptRequest}
						>
							<Check className="h-4 w-4 mr-1.5" />
							Accept
						</Button>
						<Button
							size="sm"
							variant="destructive"
							className="shadow-sm transition-all duration-200 hover:scale-105 active:scale-95"
							onClick={declineRequest}
						>
							<X className="h-4 w-4 mr-1.5" />
							Decline
						</Button>
					</div>
				</div>

				{request.comment && (
					<div className="mt-4 p-4 bg-muted/30 border border-muted rounded-lg transition-colors group-hover:bg-muted/50">
						<div className="flex items-center gap-2 mb-2">
							<div className="h-1.5 w-1.5 bg-secondary rounded-full" />
							<span className="text-sm font-medium text-foreground">
								Message
							</span>
						</div>
						<p className="text-sm text-muted-foreground leading-relaxed pl-3.5">
							&quot;{request.comment}&quot;
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
