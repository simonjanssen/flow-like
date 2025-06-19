"use client";
import { Channel, convertFileSrc, invoke } from "@tauri-apps/api/core";
import { type Event, type UnlistenFn, listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import {
	type IApp,
	type IBackendState,
	type IBit,
	type IBitPack,
	type IBoard,
	type IDownloadProgress,
	type IEvent,
	type IExecutionStage,
	type IFileMetadata,
	type IGenericCommand,
	type IIntercomEvent,
	type ILog,
	type ILogLevel,
	type ILogMetadata,
	type IMetadata,
	type INode,
	type IProfile,
	type IRunPayload,
	type ISettingsProfile,
	type IVersionType,
	LoadingScreen,
	useBackendStore,
	useDownloadManager,
} from "@tm9657/flow-like-ui";
import type { IBitSearchQuery } from "@tm9657/flow-like-ui/lib/schema/hub/bit-search-query";
import { useEffect, useState } from "react";
import type { AuthContextProps } from "react-oidc-context";
export class TauriBackend implements IBackendState {
	constructor(private auth?: AuthContextProps) {}

	pushAuthContext(auth: AuthContextProps) {
		this.auth = auth;
	}

	async createApp(
		metadata: IMetadata,
		bits: string[],
		template: string,
	): Promise<IApp> {
		const app: IApp = await invoke("create_app", {
			metadata: metadata,
			bits: bits,
			template: template,
		});
		return app;
	}

	async updateApp(app: IApp): Promise<void> {
		await invoke("update_app", {
			app: app,
		});
	}

	async getAppMeta(appId: string, language?: string): Promise<IMetadata> {
		const meta: IMetadata = await invoke("get_app_meta", {
			appId: appId,
			language,
		});
		return meta;
	}

	async pushAppMeta(
		appId: string,
		metadata: IMetadata,
		language?: string,
	): Promise<void> {
		await invoke("push_app_meta", {
			appId: appId,
			metadata: metadata,
			language,
		});
	}

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
		return profile?.flow_settings?.connection_mode ?? "simpleBezier";
	}

	async executeBoard(
		appId: string,
		boardId: string,
		payload: IRunPayload,
		streamState?: boolean,
		eventId?: (id: string) => void,
		cb?: (event: IIntercomEvent[]) => void,
	): Promise<ILogMetadata | undefined> {
		const channel = new Channel<IIntercomEvent[]>();
		let closed = false;
		let foundRunId = false;

		channel.onmessage = (events: IIntercomEvent[]) => {
			if (closed) {
				console.warn("Channel closed, ignoring events");
				return;
			}

			if (!foundRunId && events.length > 0 && eventId) {
				const runId_event = events.find(
					(event) => event.event_type === "run_initiated",
				);

				if (runId_event) {
					const runId = runId_event.payload.run_id;
					eventId(runId);
					foundRunId = true;
				}
			}

			if (cb) cb(events);
		};

		const metadata: ILogMetadata | undefined = await invoke("execute_board", {
			appId: appId,
			boardId: boardId,
			payload: payload,
			events: channel,
			streamState: streamState,
		});

		closed = true;

		return metadata;
	}

	async executeEvent(
		appId: string,
		eventId: string,
		payload: IRunPayload,
		streamState?: boolean,
		onEventId?: (id: string) => void,
		cb?: (event: IIntercomEvent[]) => void,
	): Promise<ILogMetadata | undefined> {
		const channel = new Channel<IIntercomEvent[]>();
		let closed = false;
		let foundRunId = false;

		channel.onmessage = (events: IIntercomEvent[]) => {
			if (closed) {
				console.warn("Channel closed, ignoring events");
				return;
			}

			if (!foundRunId && events.length > 0 && eventId) {
				const runId_event = events.find(
					(event) => event.event_type === "run_initiated",
				);

				if (runId_event) {
					const runId = runId_event.payload.run_id;
					onEventId?.(runId);
					foundRunId = true;
				}
			}

			if (cb) cb(events);
		};

		const metadata: ILogMetadata | undefined = await invoke("execute_event", {
			appId: appId,
			eventId: eventId,
			payload: payload,
			events: channel,
			streamState: streamState,
		});

		closed = true;

		return metadata;
	}

	async cancelExecution(runId: string): Promise<void> {
		await invoke("cancel_execution", {
			runId: runId,
		});
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

	// Event Operations
	async getEvent(
		appId: string,
		eventId: string,
		version?: [number, number, number],
	): Promise<IEvent> {
		return await invoke("get_event", {
			appId: appId,
			eventId: eventId,
			version: version,
		});
	}

	async getEvents(appId: string): Promise<IEvent[]> {
		return await invoke("get_events", {
			appId: appId,
		});
	}

	async getEventVersions(
		appId: string,
		eventId: string,
	): Promise<[number, number, number][]> {
		return await invoke("get_event_versions", {
			appId: appId,
			eventId: eventId,
		});
	}

	async upsertEvent(
		appId: string,
		event: IEvent,
		versionType?: IVersionType,
	): Promise<IEvent> {
		return await invoke("upsert_event", {
			appId: appId,
			event: event,
			versionType: versionType,
		});
	}

	async deleteEvent(appId: string, eventId: string): Promise<void> {
		await invoke("delete_event", {
			appId: appId,
			eventId: eventId,
		});
	}

	async validateEvent(
		appId: string,
		eventId: string,
		version?: [number, number, number],
	): Promise<void> {
		return await invoke("validate_event", {
			appId: appId,
			eventId: eventId,
			version: version,
		});
	}

	async upsertEventFeedback(
		appId: string,
		eventId: string,
		messageId: string,
		feedback: {
			rating: number;
			history?: any[];
			globalState?: Record<string, any>;
			localState?: Record<string, any>;
			comment?: string;
			sub?: boolean;
		},
	): Promise<void> {
		// TODO: Only relevant for online events
	}

	// Template Operations

	async getTemplates(
		appId?: string,
		language?: string,
	): Promise<[string, string, IMetadata | undefined][]> {
		return await invoke("get_templates", {
			appId: appId,
			language: language,
		});
	}

	async getTemplate(
		appId: string,
		templateId: string,
		version?: [number, number, number],
	): Promise<IBoard> {
		return await invoke("get_template", {
			appId: appId,
			templateId: templateId,
			version: version,
		});
	}

	async upsertTemplate(
		appId: string,
		boardId: string,
		templateId?: string,
		boardVersion?: [number, number, number],
		versionType?: IVersionType,
	): Promise<[string, [number, number, number]]> {
		return await invoke("upsert_template", {
			appId: appId,
			boardId: boardId,
			templateId: templateId,
			boardVersion: boardVersion,
			versionType: versionType,
		});
	}

	async deleteTemplate(appId: string, templateId: string): Promise<void> {
		await invoke("delete_template", {
			appId: appId,
			templateId: templateId,
		});
	}

	async getTemplateMeta(
		appId: string,
		templateId: string,
		language?: string,
	): Promise<IMetadata> {
		return await invoke("get_template_meta", {
			appId: appId,
			templateId: templateId,
			language: language,
		});
	}

	async pushTemplateMeta(
		appId: string,
		templateId: string,
		metadata: IMetadata,
		language?: string,
	): Promise<void> {
		await invoke("push_template_meta", {
			appId: appId,
			templateId: templateId,
			metadata: metadata,
			language: language,
		});
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

	async searchBits(query: IBitSearchQuery): Promise<IBit[]> {
		return await invoke("search_bits", {
			query,
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
		console.log("Getting pack from bit:", bit);
		const pack = await invoke<{ bits: IBit[] }>("get_pack_from_bit", {
			bit: bit,
		});
		console.log("Pack retrieved:", pack);
		return pack;
	}

	async getPackSize(bits: IBit[]): Promise<number> {
		const size: number = await invoke("get_bit_size", {
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

	async getApps(): Promise<[IApp, IMetadata | undefined][]> {
		return await invoke("get_apps");
	}

	async getBit(id: string, hub?: string): Promise<IBit> {
		return await invoke("get_bit", {
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

	async fileToUrl(file: File): Promise<string> {
		// TODO: Determine where the execution will happen. If on server, just use signed urls
		// Copy it into the tauri app's storage and return the file path as signed url

		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = (error) =>
				reject(new Error("Error converting file to base64"));
		});
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
		return <LoadingScreen />;
	}

	return children;
}
