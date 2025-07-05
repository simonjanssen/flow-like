"use client";

import { useCallback, useState } from "react";
import { useInvalidateInvoke, useInvoke } from "../../hooks";
import {
	type IBoard,
	IExecutionStage,
	ILogLevel,
	IVersionType,
} from "../../lib";
import { useBackend } from "../../state/backend-state";
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Separator,
	Textarea,
} from "../ui";
export interface IBoardMeta {
	name: string;
	description: string;
	stage: IExecutionStage;
	logLevel: ILogLevel;
}

export function BoardMeta({
	appId,
	boardId,
	board,
	version,
	closeMeta,
	selectVersion,
}: Readonly<{
	appId: string;
	boardId: string;
	board: IBoard;
	version?: [number, number, number];
	closeMeta: () => void;
	selectVersion: (version?: [number, number, number]) => void;
}>) {
	const [boardMeta, setBoardMeta] = useState<IBoardMeta>({
		name: board.name,
		description: board.description,
		stage: board.stage,
		logLevel: board.log_level,
	});
	const backend = useBackend();
	const invalidate = useInvalidateInvoke();
	const versions = useInvoke(backend.getBoardVersions, [appId, boardId]);

	const [localVersion, setLocalVersion] = useState<
		[number, number, number] | undefined
	>(board.version as [number, number, number] | undefined);

	const invalidateBoard = useCallback(async () => {
		await invalidate(backend.getBoard, [appId, boardId]);
	}, [invalidate, appId, boardId, backend]);

	const saveMeta = useCallback(async () => {
		await backend.upsertBoard(
			appId,
			boardId,
			boardMeta.name,
			boardMeta.description,
			boardMeta.logLevel,
			boardMeta.stage,
		);

		await invalidateBoard();
		closeMeta();
	}, [appId, boardId, board, boardMeta, backend, invalidateBoard]);

	const createVersion = useCallback(
		async (type: IVersionType) => {
			const newVersion = await backend.createBoardVersion(appId, boardId, type);
			setLocalVersion(newVersion);
			await versions.refetch();
		},
		[appId, boardId, versions],
	);

	return (
		<Dialog
			open={true}
			onOpenChange={async (open) => {
				if (!open) closeMeta();
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Board Metadata</DialogTitle>
					<DialogDescription>
						Give your Board a name and Description for future use!
					</DialogDescription>
				</DialogHeader>
				<Separator />
				<div className="grid w-full items-center gap-1.5">
					<Label htmlFor="name">Name</Label>
					<Input
						value={boardMeta.name}
						onChange={(e) =>
							setBoardMeta((old) => ({ ...old, name: e.target.value }))
						}
						type="text"
						id="name"
						placeholder="Name"
					/>
				</div>
				<div className="grid w-full  items-center gap-1.5">
					<Label htmlFor="description">Description</Label>
					<Textarea
						value={boardMeta.description}
						onChange={(e) =>
							setBoardMeta((old) => ({
								...old,
								description: e.target.value,
							}))
						}
						id="description"
						placeholder="Description"
					/>
				</div>
				<div className="grid w-full items-center gap-1.5">
					<Label htmlFor="stage">Stage</Label>
					<Select
						value={boardMeta.stage}
						onValueChange={(e) =>
							setBoardMeta((old) => ({
								...old,
								stage: e as IExecutionStage,
							}))
						}
					>
						<SelectTrigger id="stage" className="w-full">
							<SelectValue placeholder="Stage" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={IExecutionStage.Dev}>Development</SelectItem>
							<SelectItem value={IExecutionStage.Int}>Integration</SelectItem>
							<SelectItem value={IExecutionStage.QA}>QA</SelectItem>
							<SelectItem value={IExecutionStage.PreProd}>
								Pre-Production
							</SelectItem>
							<SelectItem value={IExecutionStage.Prod}>Production</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="grid w-full  items-center gap-1.5">
					<Label htmlFor="stage">Log Level</Label>
					<Select
						value={boardMeta.logLevel}
						onValueChange={(e) =>
							setBoardMeta((old) => ({ ...old, logLevel: e as ILogLevel }))
						}
					>
						<SelectTrigger id="stage" className="w-full">
							<SelectValue placeholder="Stage" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ILogLevel.Debug}>Debug</SelectItem>
							<SelectItem value={ILogLevel.Info}>Info</SelectItem>
							<SelectItem value={ILogLevel.Warn}>Warning</SelectItem>
							<SelectItem value={ILogLevel.Error}>Error</SelectItem>
							<SelectItem value={ILogLevel.Fatal}>Fatal</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="grid w-full  items-center gap-1.5">
					<Label htmlFor="version">Version</Label>
					<Select
						value={version ? version.join(".") : "Latest"}
						onValueChange={(e) => {
							if (e === "Latest") {
								selectVersion(undefined);
							} else {
								const version = e.split(".").map(Number) as [
									number,
									number,
									number,
								];
								selectVersion(version);
							}
						}}
					>
						<SelectTrigger id="version" className="w-full">
							<SelectValue placeholder="Version" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="Latest">
								Latest ({localVersion?.join(".")})
							</SelectItem>
							{versions.data
								?.sort((a, b) => {
									if (a[0] !== b[0]) {
										return b[0] - a[0];
									}
									if (a[1] !== b[1]) {
										return b[1] - a[1];
									}
									return b[2] - a[2];
								})
								.map((version) => (
									<SelectItem key={version.join(".")} value={version.join(".")}>
										{version.join(".")}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</div>
				<div className="w-full flex flex-row gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant={"secondary"} className="w-1/3">
								Create Version
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuLabel>Version Type</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => createVersion(IVersionType.Major)}
							>
								Major
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => createVersion(IVersionType.Minor)}
							>
								Minor
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => createVersion(IVersionType.Patch)}
							>
								Patch
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<Button
						className="w-full"
						onClick={async () => {
							await saveMeta();
						}}
					>
						Save
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
