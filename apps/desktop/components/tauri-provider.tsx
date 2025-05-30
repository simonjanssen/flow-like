"use client";
import { Channel, invoke } from "@tauri-apps/api/core";
import { type Event, type UnlistenFn, listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
	type IApp,
	type IBackendState,
	type IBit,
	type IBitPack,
	type IBitTypes,
	type IBoard,
	type IDownloadProgress,
	type IExecutionStage,
	type IFileMetadata,
	type IGenericCommand,
	type IIntercomEvent,
	type ILog,
	type ILogLevel,
	type ILogMetadata,
	type INode,
	type IProfile,
	type IRunPayload,
	type ISettingsProfile,
	type IVersionType,
	useBackendStore,
	useDownloadManager,
} from "@tm9657/flow-like-ui";
import { useEffect, useState } from "react";

export class TauriBackend implements IBackendState {
	async getCatalog(): Promise<INode[]> {
		const nodes: INode[] = await invoke("get_catalog");
		return nodes;
	}

	async getBoard(
		appId: string,
		boardId: string,
		version?: [number, number, number],
	): Promise<IBoard> {
		const board: IBoard = await invoke("get_board", {
			appId: appId,
			boardId: boardId,
			version: version,
		});
		return board;
	}

	async createBoardVersion(
		appId: string,
		boardId: string,
		versionType: IVersionType,
	): Promise<[number, number, number]> {
		const newVersion: [number, number, number] = await invoke(
			"create_board_version",
			{
				appId: appId,
				boardId: boardId,
				versionType: versionType,
			},
		);

		return newVersion;
	}

	async getBoardVersions(
		appId: string,
		boardId: string,
	): Promise<[number, number, number][]> {
		const boardVersions: [number, number, number][] = await invoke(
			"get_board_versions",
			{
				appId: appId,
				boardId: boardId,
			},
		);
		return boardVersions;
	}

	async getOpenBoards(): Promise<[string, string, string][]> {
		const boards: [string, string, string][] = await invoke("get_open_boards");
		return boards;
	}

	async getBoardSettings(): Promise<"straight" | "step" | "simpleBezier"> {
		const profile: ISettingsProfile = await invoke("get_current_profile");
		return profile.flow_settings.connection_mode;
	}

	async executeBoard(
		appId: string,
		boardId: string,
		payload: IRunPayload,
		cb?: (event: IIntercomEvent[]) => void,
	): Promise<ILogMetadata | undefined> {
		const channel = new Channel<IIntercomEvent[]>();
		let closed = false;

		channel.onmessage = (events: IIntercomEvent[]) => {
			if (closed) {
				console.warn("Channel closed, ignoring events");
				return;
			}
			if (cb) cb(events);
		};

		const runId: ILogMetadata | undefined = await invoke("execute_board", {
			appId: appId,
			boardId: boardId,
			payload: payload,
			events: channel,
		});

		closed = true;

		return runId;
	}

	async listRuns(
		appId: string,
		boardId: string,
		nodeId?: string,
		from?: number,
		to?: number,
		status?: ILogLevel,
		limit?: number,
		offset?: number,
		lastMeta?: ILogMetadata,
	): Promise<ILogMetadata[]> {
		const runs: ILogMetadata[] = await invoke("list_runs", {
			appId: appId,
			boardId: boardId,
			nodeId: nodeId,
			from: from,
			to: to,
			status: status,
			limit: limit,
			offset: offset,
			lastMeta: lastMeta,
		});
		return runs;
	}

	async queryRun(
		logMeta: ILogMetadata,
		query: string,
		limit?: number,
		offset?: number,
	): Promise<ILog[]> {
		const runs: ILog[] = await invoke("query_run", {
			logMeta: logMeta,
			query: query,
			limit: limit,
			offset: offset,
		});
		return runs;
	}

	async finalizeRun(appId: string, runId: string) {
		await invoke("finalize_run", {
			appId: appId,
			runId: runId,
		});
	}

	async undoBoard(appId: string, boardId: string, commands: IGenericCommand[]) {
		await invoke("undo_board", {
			appId: appId,
			boardId: boardId,
			commands: commands,
		});
	}

	async redoBoard(appId: string, boardId: string, commands: IGenericCommand[]) {
		await invoke("redo_board", {
			appId: appId,
			boardId: boardId,
			commands: commands,
		});
	}

	async updateBoardMeta(
		appId: string,
		boardId: string,
		name: string,
		description: string,
		logLevel: ILogLevel,
		stage: IExecutionStage,
	) {
		await invoke("update_board_meta", {
			appId: appId,
			boardId: boardId,
			name: name,
			description: description,
			logLevel: logLevel,
			stage: stage,
		});
	}

	async closeBoard(boardId: string) {
		await invoke("close_board", {
			boardId: boardId,
		});
	}

	async getProfile(): Promise<IProfile> {
		const profile: ISettingsProfile = await invoke("get_current_profile");
		if (profile.hub_profile === undefined) {
			throw new Error("Profile not found");
		}
		return profile.hub_profile;
	}

	async getSettingsProfile(): Promise<ISettingsProfile> {
		const profile: ISettingsProfile = await invoke("get_current_profile");
		return profile;
	}

	async executeCommand(
		appId: string,
		boardId: string,
		command: IGenericCommand,
	): Promise<IGenericCommand> {
		return await invoke("execute_command", {
			appId: appId,
			boardId: boardId,
			command: command,
		});
	}

	async executeCommands(
		appId: string,
		boardId: string,
		commands: IGenericCommand[],
	): Promise<IGenericCommand[]> {
		return await invoke("execute_commands", {
			appId: appId,
			boardId: boardId,
			commands: commands,
		});
	}

	registerEvent(
		appId: string,
		boardId: string,
		nodeId: string,
		eventType: string,
		eventId: string,
		ttl?: number,
	): Promise<void> {
		throw new Error("Method not implemented.");
	}

	removeEvent(eventId: string, eventType: string): Promise<void> {
		throw new Error("Method not implemented.");
	}

	async getPathMeta(path: string): Promise<IFileMetadata[]> {
		return await invoke("get_path_meta", {
			path: path,
		});
	}

	async openFileOrFolderMenu(
		multiple: boolean,
		directory: boolean,
		recursive: boolean,
	): Promise<string[] | string | undefined> {
		return (
			(await open({
				multiple: multiple,
				directory: directory,
				recursive: recursive,
			})) ?? undefined
		);
	}

	async downloadBit(
		bit: IBit,
		pack: IBitPack,
		cb?: (progress: IDownloadProgress[]) => void,
	): Promise<IBit[]> {
		const unlistenFn: UnlistenFn[] = [];

		for (const deps of pack.bits) {
			unlistenFn.push(
				await listen(
					`download:${deps.hash}`,
					(event: Event<IIntercomEvent[]>) => {
						const downloadProgressEvents = event.payload.map(
							(item) => item.payload,
						);
						if (cb) cb(downloadProgressEvents);
					},
				),
			);
		}

		const bits: IBit[] = await invoke("download_bit", {
			bit: bit,
		});

		for (const unlisten of unlistenFn) {
			unlisten();
		}

		return bits;
	}

	async deleteBit(bit: IBit): Promise<void> {
		throw new Error("Method not implemented.");
	}

	async addBit(bit: IBit, profile: ISettingsProfile): Promise<void> {
		await invoke("add_bit", {
			bit: bit,
			profile: profile,
		});
	}

	async removeBit(bit: IBit, profile: ISettingsProfile): Promise<void> {
		await invoke("remove_bit", {
			bit: bit,
			profile: profile,
		});
	}

	async getBitsByCategory(type: IBitTypes): Promise<IBit[]> {
		return await invoke("get_bits_by_category", {
			bitType: type,
		});
	}

	async getBitSize(bit: IBit): Promise<number> {
		return await invoke("get_bit_size", {
			bit: bit,
		});
	}

	async getInstalledBit(bits: IBit[]): Promise<IBit[]> {
		return await invoke("get_installed_bit", {
			bits: bits,
		});
	}

	async getPackFromBit(bit: IBit): Promise<{ bits: IBit[] }> {
		return await invoke("get_pack_from_bit", {
			bit: bit,
		});
	}

	async getPackSize(bits: IBit[]): Promise<number> {
		const size: number = await invoke("get_pack_size", {
			bits: bits,
		});
		return size;
	}

	async isBitInstalled(bit: IBit): Promise<boolean> {
		return await invoke("is_bit_installed", {
			bit: bit,
		});
	}

	async getApp(appId: string): Promise<IApp> {
		return await invoke("get_app", {
			appId: appId,
		});
	}

	async getApps(): Promise<IApp[]> {
		return await invoke("get_apps");
	}

	async getBit(id: string, hub?: string): Promise<IBit> {
		return await invoke("get_bit_by_id", {
			bit: id,
			hub: hub,
		});
	}

	async getBoards(appId: string): Promise<IBoard[]> {
		const boards: IBoard[] = await invoke("get_app_boards", {
			appId: appId,
		});
		return boards;
	}
}

export function TauriProvider({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const [loaded, setLoaded] = useState(false);
	const { setBackend } = useBackendStore();
	const { setDownloadBackend, download } = useDownloadManager();

	async function resumeDownloads() {
		const downloads = await invoke<{ [key: string]: IBit }>("init_downloads");
		const items = Object.keys(downloads).map((bitId) => {
			const bit: IBit = downloads[bitId];
			return bit;
		});

		const download_requests = items.map((item) => {
			return download(item);
		});

		await Promise.allSettled([...download_requests]);
	}

	useEffect(() => {
		(async () => {
			const backend = new TauriBackend();
			setBackend(backend);
			setDownloadBackend(backend);
			await resumeDownloads();
			setLoaded(true);
		})();
	}, []);

	if (!loaded) {
		return <p>Loading...</p>;
	}

	return children;
}
