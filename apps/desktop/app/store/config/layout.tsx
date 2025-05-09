"use client";

import { invoke } from "@tauri-apps/api/core";
import {
	Badge,
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Button,
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
	type INode,
	Separator,
	humanFileSize,
	toastError,
	useBackend,
	useInvoke,
	useRunExecutionStore,
} from "@tm9657/flow-like-ui";
import { AlertTriangle, PlayCircleIcon, Vault } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTauriInvoke } from "../../../components/useInvoke";

export default function Id({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const backend = useBackend();
	const searchParams = useSearchParams();
	const id = searchParams.get("id");
	const currentRoute = usePathname();
	const isReady = useTauriInvoke<boolean>(
		"app_configured",
		{ appId: id },
		[id ?? ""],
		typeof id === "string",
	);
	const app = useInvoke(backend.getApp, [id ?? ""], typeof id === "string");
	const appSize = useTauriInvoke<number>(
		"get_app_size",
		{ appId: id },
		[id ?? ""],
		typeof id === "string",
	);
	const boards = useInvoke(
		backend.getBoards,
		[id ?? ""],
		typeof id === "string",
	);
	const { addRun, removeRun } = useRunExecutionStore();

	async function executeBoard(boardId: string, node: INode) {
		if (!id) return;
		await invoke("get_app_board", {
			appId: id,
			boardId: boardId,
			pushToRegistry: true,
		});
		const runMeta = await backend.executeBoard(
			id,
			boardId,
			{
				id: node.id,
			},
			(events) => {},
		);

		if (!runMeta) {
			toastError(
				"Failed to execute board",
				<PlayCircleIcon className="w-4 h-4" />,
			);
			return;
		}
		await addRun(runMeta.run_id, boardId, [node.id]);
		await invoke("execute_run", { id: runMeta });
		removeRun(runMeta.run_id);
		await invoke("get_run", { id: runMeta });
		await invoke("finalize_run", { id: runMeta });
	}

	return (
		<main className="lex min-h-screen max-h-screen overflow-hidden flex-col w-full p-4 px-6  flex">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/">Home</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/store/yours">Your Apps</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{app.data?.meta.en.name}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<div className="grid w-full gap-1 mt-2">
				<div className="flex flex-row items-center gap-2">
					<Vault />
					<h1 className="text-3xl font-semibold flex flex-row items-center">
						{app.data?.meta.en.name}
					</h1>
					<Badge variant={"outline"}>{humanFileSize(appSize.data ?? 0)}</Badge>
					{app.data?.meta.en.tags.map((tag) => (
						<Badge key={tag} variant={"secondary"}>
							{tag}
						</Badge>
					))}
					{!isReady.data && !isReady.isFetching && (
						<HoverCard>
							<HoverCardTrigger asChild>
								<AlertTriangle className="p-1 bg-destructive border rounded-lg w-6 h-6 text-destructive-foreground" />
							</HoverCardTrigger>
							<HoverCardContent className="bg-destructive">
								<p className="text-destructive-foreground text-xs">
									Setup not complete yet.
								</p>
							</HoverCardContent>
						</HoverCard>
					)}
				</div>

				<p className="leading-7 line-clamp-1">
					{app.data?.meta.en.description}
				</p>
			</div>
			<div className="grid w-full items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr] mt-8 h-full flex-grow overflow-hidden max-h-full">
				<nav className="flex flex-col gap-4 text-sm text-muted-foreground border-r h-full max-h-full overflow-hidden">
					<Link
						href={`/store/config?id=${app.data?.id}`}
						className={
							currentRoute.endsWith("/config")
								? "font-semibold text-primary"
								: ""
						}
					>
						General
					</Link>
					<Link
						href={`/store/config/configuration?id=${app.data?.id}`}
						className={
							currentRoute.endsWith("/configuration")
								? "font-semibold text-primary"
								: ""
						}
					>
						Configuration
					</Link>
					<Link
						href={`/store/config/logic?id=${app.data?.id}`}
						className={
							currentRoute.endsWith("/logic")
								? "font-semibold text-primary"
								: ""
						}
					>
						Logic
					</Link>
					<Link
						href={`/store/config/storage?id=${app.data?.id}`}
						className={
							currentRoute.endsWith("/storage")
								? "font-semibold text-primary"
								: ""
						}
					>
						Storage
					</Link>
					<Link
						href={`/store/config/explore?id=${app.data?.id}`}
						className={
							currentRoute.endsWith("/explore")
								? "font-semibold text-primary"
								: ""
						}
					>
						Explore Data
					</Link>
					<Link
						href={`/store/config/analytics?id=${app.data?.id}`}
						className={
							currentRoute.endsWith("/analytics")
								? "font-semibold text-primary"
								: ""
						}
					>
						Analytics
					</Link>
					<Link
						href={`/store/config/share?id=${app.data?.id}`}
						className={
							currentRoute.endsWith("/share")
								? "font-semibold text-primary"
								: ""
						}
					>
						Share
					</Link>
					<Link
						href={`/store/config/endpoints?id=${app.data?.id}`}
						className={
							currentRoute.endsWith("/endpoints")
								? "font-semibold text-primary"
								: ""
						}
					>
						Endpoints
					</Link>
					<Link
						href={`/store/config/export?id=${app.data?.id}`}
						className={
							currentRoute.endsWith("/export")
								? "font-semibold text-primary"
								: ""
						}
					>
						Export / Import
					</Link>
					<Separator className="my-2 w-[95%]" />
					<div
						id="actions"
						className="w-full pr-5 flex flex-col items-stretch gap-2 flex-grow max-h-full overflow-y-auto"
					>
						{boards.data
							?.flatMap((board) =>
								Object.values(board.nodes)
									.filter((node) => node.start)
									.map((node) => [board, node]),
							)
							.sort((a, b) =>
								a[1].friendly_name.localeCompare(b[1].friendly_name),
							)
							.map(([board, node]) => (
								<HoverCard key={node.id} openDelay={10} closeDelay={10}>
									<HoverCardTrigger asChild>
										<Button
											variant={"outline"}
											key={node.id}
											onClick={async () => {
												await executeBoard(board.id, node as INode);
											}}
										>
											{node.friendly_name}
										</Button>
									</HoverCardTrigger>
									<HoverCardContent side="right">
										<p>{board.name}</p>
										<small className="text-muted-foreground">
											{board.description}
										</small>
										<small className="text-muted-foreground">
											{node.comment}
										</small>
									</HoverCardContent>
								</HoverCard>
							))}
					</div>
				</nav>
				<div className="pb-4 pl-2 flex-grow max-h-full h-full overflow-auto">
					<Suspense>{children}</Suspense>
				</div>
			</div>
		</main>
	);
}
