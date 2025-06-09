"use client";
import { invoke } from "@tauri-apps/api/core";
import {
	Badge,
	Button,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	type IApp,
	type IBoard,
	Input,
	Label,
	Separator,
	Skeleton,
	Textarea,
	type UseQueryResult,
	formatRelativeTime,
	useBackend,
	useFlowBoardParentState,
	useInvoke,
} from "@tm9657/flow-like-ui";
import {
	Calendar,
	Database,
	ExternalLink,
	Layers3,
	PlusCircleIcon,
	Settings,
	Trash2,
	WorkflowIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
	const backend = useBackend();
	const parentRegister = useFlowBoardParentState();
	const searchParams = useSearchParams();
	const id = searchParams.get("id");
	const app = useInvoke(backend.getApp, [id ?? ""], typeof id === "string");
	const boards = useInvoke(
		backend.getBoards,
		[id ?? ""],
		typeof id === "string",
	);

	useEffect(() => {
		if (!app.data) return;
		if (!boards.data) return;
		boards.data?.forEach((board) => {
			parentRegister?.addBoardParent(
				board.id,
				`/library/config/logic?id=${id}`,
			);
		});
	}, [boards.data, id]);

	const [boardCreation, setBoardCreation] = useState({
		open: false,
		name: "",
		description: "",
	});

	return (
		<main className="h-full flex flex-col overflow-hidden max-h-full">
			<div className="container mx-auto px-6 py-8 flex flex-col h-full">
				{/* Header Section */}
				<div className="flex flex-col space-y-6 flex-shrink-0">
					<div className="flex items-center justify-between">
						<div className="space-y-2">
							<h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
								Project Flows
							</h1>
							<p className="text-muted-foreground text-lg">
								Manage and organize your application workflows
							</p>
						</div>
						<Dialog
							open={boardCreation.open}
							onOpenChange={(open) =>
								setBoardCreation({ ...boardCreation, open })
							}
						>
							<DialogTrigger asChild>
								<Button
									size="lg"
									className="gap-2 shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-primary to-primary/80"
								>
									<PlusCircleIcon className="h-5 w-5" />
									Create New Flow
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-md">
								<DialogHeader>
									<DialogTitle className="text-2xl">
										Create New Board
									</DialogTitle>
									<DialogDescription className="text-base">
										Design a new workflow board for your application
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-4 py-4">
									<div className="space-y-2">
										<Label htmlFor="name" className="text-sm font-medium">
											Board Name
										</Label>
										<Input
											value={boardCreation.name}
											id="name"
											placeholder="Enter board name..."
											className="h-11"
											onChange={(e) => {
												setBoardCreation((old) => ({
													...old,
													name: e.target.value,
												}));
											}}
										/>
									</div>
									<div className="space-y-2">
										<Label
											htmlFor="description"
											className="text-sm font-medium"
										>
											Description
										</Label>
										<Textarea
											value={boardCreation.description}
											id="description"
											placeholder="Describe the purpose of this board..."
											className="min-h-[100px] resize-none"
											onChange={(e) => {
												setBoardCreation((old) => ({
													...old,
													description: e.target.value,
												}));
											}}
										/>
									</div>
								</div>
								<DialogFooter className="gap-3">
									<Button
										variant="outline"
										onClick={() =>
											setBoardCreation({ ...boardCreation, open: false })
										}
									>
										Cancel
									</Button>
									<Button
										onClick={async () => {
											await invoke("create_app_board", {
												appId: app.data?.id,
												name: boardCreation.name,
												description: boardCreation.description,
											});
											await Promise.allSettled([
												await boards.refetch(),
												await app.refetch(),
											]);
											setBoardCreation({
												name: "",
												description: "",
												open: false,
											});
										}}
										className="bg-gradient-to-r from-primary to-primary/80"
									>
										Create Board
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					</div>

					{/* Stats Overview */}
					{app.data && boards.data && (
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<Card className="border-0 shadow-sm bg-gradient-to-br from-card to-card/50">
								<CardContent className="p-4">
									<div className="flex items-center space-x-3">
										<Layers3 className="h-4 w-4 text-primary" />
										<div>
											<p className="text-xs font-medium text-muted-foreground">
												Total Boards
											</p>
											<p className="text-xl font-bold">{boards.data.length}</p>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card className="border-0 shadow-sm bg-gradient-to-br from-card to-card/50">
								<CardContent className="p-4">
									<div className="flex items-center space-x-3">
										<Database className="h-4 w-4 text-primary" />
										<div>
											<p className="text-xs font-medium text-muted-foreground">
												Total Nodes
											</p>
											<p className="text-xl font-bold">
												{boards.data.reduce(
													(acc, board) => acc + Object.keys(board.nodes).length,
													0,
												)}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
							<Card className="border-0 shadow-sm bg-gradient-to-br from-card to-card/50">
								<CardContent className="p-4">
									<div className="flex items-center space-x-3">
										<Settings className="h-4 w-4 text-primary" />
										<div>
											<p className="text-xs font-medium text-muted-foreground">
												Total Variables
											</p>
											<p className="text-xl font-bold">
												{boards.data.reduce(
													(acc, board) =>
														acc + Object.keys(board.variables).length,
													0,
												)}
											</p>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					)}
				</div>

				<Separator className="my-8" />

				{/* Boards Grid */}
				<div className="space-y-6 flex flex-1 flex-col flex-grow max-h-full h-full overflow-y-auto overflow-x-hidden">
					{boards.isLoading ? (
						<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
							{[...Array(6)].map((_, i) => (
								<Card key={`${i}-skeleton`} className="border-0 shadow-md">
									<CardHeader>
										<Skeleton className="h-6 w-3/4" />
										<Skeleton className="h-4 w-1/2" />
									</CardHeader>
									<CardContent>
										<Skeleton className="h-20 w-full" />
									</CardContent>
								</Card>
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
							{app.data &&
								boards.data?.map((board) => (
									<Board
										key={board.id}
										board={board}
										app={app.data}
										boardsQuery={boards}
									/>
								))}
						</div>
					)}

					{boards.data?.length === 0 && !boards.isLoading && (
						<Card className="border-0 shadow-md bg-gradient-to-br from-muted/50 to-muted/20">
							<CardContent className="flex flex-col items-center justify-center py-16">
								<WorkflowIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
								<h3 className="text-xl font-semibold mb-2">No boards yet</h3>
								<p className="text-muted-foreground text-center mb-6 max-w-md">
									Create your first workflow board to start building amazing
									automations
								</p>
								<Button
									onClick={() =>
										setBoardCreation({ ...boardCreation, open: true })
									}
									className="gap-2"
								>
									<PlusCircleIcon className="h-4 w-4" />
									Create Your First Board
								</Button>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</main>
	);
}

function Board({
	board,
	app,
	boardsQuery,
}: Readonly<{
	board: IBoard;
	app: IApp;
	boardsQuery: UseQueryResult<IBoard[]>;
}>) {
	const router = useRouter();

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>
				<Card className="relative group border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-card to-card/80 hover:from-card/90 hover:to-card/70">
					<CardHeader className="pb-3">
						<div className="flex items-start justify-between">
							<div className="flex items-center space-x-3">
								<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
									<WorkflowIcon className="h-5 w-5 text-primary" />
								</div>
								<div className="flex-1">
									<CardTitle className="text-lg group-hover:text-primary transition-colors">
										{board.name}
									</CardTitle>
									<div className="flex items-center gap-2 mt-1">
										<Badge variant="secondary" className="text-xs">
											{board.stage}
										</Badge>
										<Badge variant="outline" className="text-xs">
											{board.log_level}
										</Badge>
									</div>
								</div>
							</div>
							<ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<CardDescription className="text-sm leading-relaxed min-h-[2.5rem]">
							{board.description === "" ? (
								<span className="italic text-muted-foreground/70">
									No description provided
								</span>
							) : (
								board.description
							)}
						</CardDescription>

						<div className="flex items-center justify-between pt-2 border-t">
							<div className="flex items-center space-x-4 text-sm text-muted-foreground">
								<div className="flex items-center space-x-1">
									<Database className="h-3 w-3" />
									<span>{Object.keys(board.nodes).length}</span>
								</div>
								<div className="flex items-center space-x-1">
									<Settings className="h-3 w-3" />
									<span>{Object.keys(board.variables).length}</span>
								</div>
							</div>
							<div className="flex items-center space-x-1 text-xs text-muted-foreground">
								<Calendar className="h-3 w-3" />
								<span>{formatRelativeTime(board.updated_at)}</span>
							</div>
						</div>
					</CardContent>
					<button
						className="absolute inset-0 rounded-lg"
						onClick={async () => {
							await invoke("get_app_board", {
								appId: app.id,
								boardId: board.id,
								pushToRegistry: true,
							});
							router.push(`/flow?id=${board.id}&app=${app.id}`);
						}}
					/>
				</Card>
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem
					disabled={(boardsQuery.data?.length ?? 2) <= 1}
					onClick={async () => {
						await invoke("delete_app_board", {
							appId: app.id,
							boardId: board.id,
						});
						await boardsQuery.refetch();
					}}
					className="bg-destructive text-destructive-foreground"
				>
					<Trash2 className="h-4 w-4 mr-2" />
					Delete Board
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
