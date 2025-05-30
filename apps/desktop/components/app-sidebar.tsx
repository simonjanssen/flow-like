import * as Sentry from "@sentry/nextjs";
import { invoke } from "@tauri-apps/api/core";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
	Button,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
	IBitTypes,
	Input,
	Label,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	Textarea,
	useBackend,
	useDownloadManager,
	useInvalidateInvoke,
	useInvoke,
	useQueryClient,
	useSidebar,
} from "@tm9657/flow-like-ui";
import type { ISettingsProfile } from "@tm9657/flow-like-ui/types";
import {
	BadgeCheck,
	Bell,
	BookOpenIcon,
	BotMessageSquareIcon,
	BugIcon,
	ChevronRight,
	ChevronsUpDown,
	CreditCard,
	DownloadIcon,
	Edit3Icon,
	ExternalLinkIcon,
	LayoutGridIcon,
	LibraryIcon,
	LogInIcon,
	LogOut,
	type LucideIcon,
	Moon,
	Plus,
	Settings2Icon,
	SidebarCloseIcon,
	SidebarOpenIcon,
	Sparkles,
	Sun,
	WorkflowIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTauriInvoke } from "./useInvoke";

const data = {
	navMain: [
		{
			title: "Apps",
			url: "/",
			icon: LayoutGridIcon,
			isActive: true,
			items: [
				{
					title: "Home",
					url: "/",
				},
				{
					title: "Explore Apps",
					url: "/store/explore/apps",
				},
				{
					title: "Explore Templates",
					url: "/store/explore/templates",
				},
			],
		},
		{
			title: "Library",
			url: "/library",
			icon: LibraryIcon,
			isActive: false,
			items: [
				{
					title: "Overview",
					url: "/library",
				},
				{
					title: "Your Apps",
					url: "/library/apps",
				},
				{
					title: "Your Templates",
					url: "/library/templates",
				},
				{
					title: "Favorites",
					url: "/library/favorites",
				},
				{
					title: "Create App",
					url: "/library/new",
				},
			],
		},
		{
			title: "Documentation",
			url: "https://docs.flow-like.com/",
			icon: BookOpenIcon,
		},
		{
			title: "Settings",
			url: "/settings",
			icon: Settings2Icon,
			items: [
				{
					title: "General",
					url: "/settings",
				},
				{
					title: "Storage",
					url: "/settings/storage",
				},
				{
					title: "Profile",
					url: "/settings/profile",
				},
				{
					title: "AI",
					url: "/settings/ai",
				},
				{
					title: "Theming",
					url: "/settings/theming",
				},
				{
					title: "Credentials",
					url: "/settings/powered-by",
				},
				{
					title: "System Info",
					url: "/settings/system",
				},
			],
		},
	],
};

interface IUser {
	name: string;
	email: string;
	avatar: string;
}

export function AppSidebar({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<SidebarProvider>
			<InnerSidebar />
			<main className="w-full h-full">
				<SidebarInset className="bg-dot-black/10 dark:bg-dot-white/10">
					{children}
				</SidebarInset>
			</main>
		</SidebarProvider>
	);
}

function InnerSidebar() {
	const intervalRef = useRef<any>(null);
	const router = useRouter();
	const { resolvedTheme } = useTheme();
	const { manager } = useDownloadManager();
	const [user] = useState<IUser | undefined>();
	const { open, toggleSidebar } = useSidebar();
	const { setTheme } = useTheme();
	const [feedback, setFeedback] = useState({
		name: "",
		email: "",
		message: "",
	});
	const [stats, setStats] = useState({
		bytesPerSecond: 0,
		total: 0,
		progress: 0,
		max: 0,
	});

	useEffect(() => {
		intervalRef.current = setInterval(async () => {
			const stats = await manager.getSpeed();
			setStats(stats);
		}, 1000);

		return () => {
			clearInterval(intervalRef.current);
		};
	}, []);

	return (
		<Sidebar collapsible="icon" side="left">
			<SidebarHeader>
				<Profiles />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				<Flows />
			</SidebarContent>
			<SidebarFooter>
				<div className="flex flex-col gap-1">
					{stats.max > 0 && (
						<div>
							<SidebarMenuButton
								onClick={() => {
									router.push("/download");
								}}
							>
								<DownloadIcon />
								<span>
									Download:{" "}
									<b className="highlight">{stats.progress.toFixed(2)} %</b>
								</span>
							</SidebarMenuButton>
						</div>
					)}
					<Dialog>
						<DialogTrigger asChild>
							<SidebarMenuButton>
								<BugIcon />
								<span>Report Bug</span>
							</SidebarMenuButton>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle className="flex flex-row items-center gap-2">
									<BugIcon />
									{"Bug Report"}
								</DialogTitle>
								<DialogDescription>
									{
										"Please describe the bug you encountered, Name and Email are optional."
									}
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="grid grid-cols-4 items-center gap-4">
									<Label htmlFor="name" className="text-right">
										{"Name (optional)"}
									</Label>
									<Input
										id="name"
										value={feedback.name}
										onChange={(e) =>
											setFeedback({ ...feedback, name: e.target.value })
										}
										className="col-span-3"
									/>
								</div>
								<div className="grid grid-cols-4 items-center gap-4">
									<Label htmlFor="username" className="text-right">
										{"Email (optional)"}
									</Label>
									<Input
										id="username"
										value={feedback.email}
										onChange={(e) =>
											setFeedback({ ...feedback, email: e.target.value })
										}
										className="col-span-3"
									/>
								</div>
								<div className="grid grid-cols-4 items-center gap-4">
									<Label htmlFor="message" className="text-right">
										{"Message"}
									</Label>
									<Textarea
										id="message"
										value={feedback.message}
										onChange={(e) =>
											setFeedback({ ...feedback, message: e.target.value })
										}
										className="col-span-3"
									/>
								</div>
							</div>

							<DialogFooter>
								<DialogClose asChild>
									<Button
										disabled={feedback.message === ""}
										onClick={() => {
											Sentry.captureFeedback(
												{
													name:
														feedback.name === "" ? undefined : feedback.name, // optional
													email:
														feedback.email === "" ? undefined : feedback.email, // optional
													message: feedback.message, // required
												},
												{
													includeReplay: true, // optional
												},
											);
											toast("Feedback sent successfully ❤️");
											setFeedback({ name: "", email: "", message: "" });
										}}
									>
										Send
									</Button>
								</DialogClose>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton>
								<Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
								<Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
								<span>{"Toggle Theme"}</span>
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="center" side="right">
							<DropdownMenuItem onClick={() => setTheme("light")}>
								{"Light"}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setTheme("dark")}>
								{"Dark"}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setTheme("system")}>
								{"System Default"}
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<SidebarMenuButton onClick={toggleSidebar}>
						{open ? <SidebarCloseIcon /> : <SidebarOpenIcon />}
						<span className="w-full flex flex-row items-center justify-between">
							Toggle Sidebar{" "}
							<span className="ml-auto text-xs tracking-widest text-muted-foreground">
								⌘B
							</span>
						</span>
					</SidebarMenuButton>
				</div>

				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

function Profiles() {
	const queryClient = useQueryClient();
	const backend = useBackend();
	const invalidate = useInvalidateInvoke();
	const { isMobile } = useSidebar();
	const profiles = useTauriInvoke<ISettingsProfile[]>("get_profiles", {});
	const currentProfile = useInvoke(backend.getSettingsProfile, []);

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage
										className="rounded-lg size-8 w-8 h-8"
										src={currentProfile.data?.hub_profile.thumbnail}
									/>
									<AvatarImage
										className="rounded-lg size-8 w-8 h-8"
										src="/app-logo.webp"
									/>
									<AvatarFallback>NA</AvatarFallback>
								</Avatar>
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight pl-1">
								<span className="truncate font-semibold">
									{currentProfile.data?.hub_profile.name}
								</span>
								<span className="truncate text-xs">
									{currentProfile.data?.hub_profile.hub?.replaceAll(
										"https://",
										"",
									)}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Profiles
						</DropdownMenuLabel>
						{profiles.data &&
							Object.values(profiles.data).map((profile, index) => (
								<DropdownMenuItem
									key={profile.hub_profile.id}
									onClick={async () => {
										if (profile.hub_profile.id !== "")
											await invoke("set_current_profile", {
												profileId: profile.hub_profile.id,
											});
										await Promise.allSettled([
											invalidate(backend.getProfile, []),
											invalidate(backend.getSettingsProfile, []),
											invalidate(backend.getApps, []),
											invalidate(backend.getBitsByCategory, [IBitTypes.Llm]),
											invalidate(backend.getBitsByCategory, [IBitTypes.Vlm]),
											invalidate(backend.getBitsByCategory, [
												IBitTypes.Embedding,
											]),
											invalidate(backend.getBitsByCategory, [
												IBitTypes.ImageEmbedding,
											]),
											invalidate(backend.getBitsByCategory, [
												IBitTypes.Template,
											]),
										]);
									}}
									className="gap-4 p-2"
								>
									<div className="flex size-6 items-center justify-center rounded-sm border">
										<Avatar className="h-8 w-8 rounded-sm">
											<AvatarImage
												className="rounded-sm w-8 h-8"
												src={profile.hub_profile.thumbnail}
											/>
											<AvatarImage
												className="rounded-sm w-8 h-8"
												src="/app-logo.webp"
											/>
											<AvatarFallback>NA</AvatarFallback>
										</Avatar>
									</div>
									{profile.hub_profile.name}
									<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
								</DropdownMenuItem>
							))}
						<DropdownMenuSeparator />
						<DropdownMenuItem className="gap-2 p-2">
							<div className="flex size-6 items-center justify-center rounded-md border bg-background">
								<Plus className="size-4" />
							</div>
							<div className="font-medium text-muted-foreground">
								Add profile
							</div>
						</DropdownMenuItem>
						<DropdownMenuItem className="gap-2 p-2">
							<div className="flex size-6 items-center justify-center rounded-md border bg-background">
								<Edit3Icon className="size-4" />
							</div>
							<div className="font-medium text-muted-foreground">
								Edit profile
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

function NavMain({
	items,
}: Readonly<{
	items: {
		title: string;
		url: string;
		icon?: LucideIcon;
		isActive?: boolean;
		items?: {
			title: string;
			url: string;
		}[];
	}[];
}>) {
	const router = useRouter();
	const pathname = usePathname();
	const { open } = useSidebar();

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Navigation</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) =>
					item.items && item.items.length > 0 ? (
						<Collapsible
							key={item.title}
							asChild
							defaultOpen={
								(localStorage.getItem(`sidebar:${item.title}`) ??
									(item.isActive ? "open" : "closed")) === "open"
							}
							onOpenChange={(open) => {
								localStorage.setItem(
									`sidebar:${item.title}`,
									open ? "open" : "closed",
								);
							}}
							className="group/collapsible"
						>
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton
										variant={
											pathname === item.url ||
											typeof item.items?.find(
												(item) => item.url === pathname,
											) !== "undefined"
												? "outline"
												: "default"
										}
										tooltip={item.title}
										onClick={() => {
											if (!open) router.push(item.url);
										}}
									>
										{item.icon && <item.icon />}
										<span>{item.title}</span>
										<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub>
										{item.items?.map((subItem) => (
											<SidebarMenuSubItem key={subItem.title}>
												<SidebarMenuSubButton asChild>
													<Link href={subItem.url}>
														<span
															className={
																pathname === subItem.url
																	? "font-bold text-primary"
																	: ""
															}
														>
															{subItem.title}
														</span>
													</Link>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										))}
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					) : (
						<SidebarMenuItem key={item.title}>
							<a href={item.url} target="_blank" rel="noreferrer">
								<SidebarMenuButton
									variant={pathname === item.url ? "outline" : "default"}
									tooltip={item.title}
								>
									{item.icon && <item.icon />}
									<span>{item.title}</span>
									<ExternalLinkIcon className="ml-auto" />
								</SidebarMenuButton>
							</a>
						</SidebarMenuItem>
					),
				)}
			</SidebarMenu>
		</SidebarGroup>
	);
}

export function NavUser({
	user,
}: Readonly<{
	user?: IUser;
}>) {
	const { isMobile } = useSidebar();

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage src={user?.avatar} alt={user?.name ?? "Offline"} />
								<AvatarFallback className="rounded-lg">
									{(user?.name ?? "Anon").slice(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">
									{user?.name ?? "Offline"}
								</span>
								<span className="truncate text-xs">
									{user?.email ?? "Anonymous"}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage
										src={user?.avatar}
										alt={user?.name ?? "Offline"}
									/>
									<AvatarFallback className="rounded-lg">
										{(user?.name ?? "Anonymous").slice(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{user?.name ?? "Offline"}
									</span>
									<span className="truncate text-xs">
										{user?.email ?? "Anonymous"}
									</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{user && (
							<>
								<DropdownMenuGroup>
									<DropdownMenuItem className="gap-2">
										<Sparkles className="size-4" />
										Upgrade to Pro
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem className="gap-2">
										<BadgeCheck className="size-4" />
										Account
									</DropdownMenuItem>
									<DropdownMenuItem className="gap-2">
										<CreditCard className="size-4" />
										Billing
									</DropdownMenuItem>
									<DropdownMenuItem className="gap-2">
										<Bell className="size-4" />
										Notifications
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem className="gap-2">
									<LogOut className="size-4" />
									Log out
								</DropdownMenuItem>
							</>
						)}
						{!user && (
							<DropdownMenuItem className="gap-2">
								<LogInIcon className="size-4" />
								Log in
							</DropdownMenuItem>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

function Flows() {
	const backend = useBackend();
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const openBoards = useInvoke(backend.getOpenBoards, []);

	if ((openBoards.data?.length ?? 0) <= 0) return null;

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Flows</SidebarGroupLabel>
			<SidebarMenu>
				<Collapsible
					asChild
					defaultOpen={localStorage.getItem("sidebar:flows") === "open"}
					onOpenChange={(open) => {
						localStorage.setItem("sidebar:flows", open ? "open" : "closed");
					}}
					className="group/collapsible"
				>
					<SidebarMenuItem>
						<CollapsibleTrigger asChild>
							<SidebarMenuButton
								variant={pathname.startsWith("/flow") ? "outline" : "default"}
								tooltip={"Flows"}
								onClick={() => {
									const firstBoard = openBoards.data?.[0];
									if (firstBoard)
										router.push(
											`/flow?id=${firstBoard[1]}&app=${firstBoard[0]}`,
										);
								}}
							>
								<WorkflowIcon />
								<span>Open Flows</span>
								<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
							</SidebarMenuButton>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<SidebarMenuSub>
								{openBoards.data?.map(([appId, boardId, boardName]) => (
									<SidebarMenuSubItem key={boardId}>
										<SidebarMenuSubButton asChild>
											<Link href={`/flow?id=${boardId}&app=${appId}`}>
												<span
													className={
														params.get("id") === boardId
															? "font-bold text-primary"
															: ""
													}
												>
													{boardName}
												</span>
											</Link>
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
								))}
							</SidebarMenuSub>
						</CollapsibleContent>
					</SidebarMenuItem>
				</Collapsible>
			</SidebarMenu>
		</SidebarGroup>
	);
}
