import { create } from "zustand";
import type {
	IApp,
	IBit,
	IBitPack,
	IBoard,
	IDownloadProgress,
	IEvent,
	IExecutionStage,
	IFileMetadata,
	IGenericCommand,
	IIntercomEvent,
	ILog,
	ILogLevel,
	ILogMetadata,
	IMetadata,
	INode,
	IProfile,
	IRunPayload,
	IVersionType,
	RolePermissions,
} from "../lib";
import type { IBitSearchQuery } from "../lib/schema/hub/bit-search-query";
import type { IStorageItem } from "../lib/schema/storage/storage-item";
import type { ISettingsProfile } from "../types";

export interface IStorageItemActionResult {
	prefix: string;
	url?: string;
	error?: string;
}

export interface IBackendRole {
	id: string;
	app_id: string;
	name: string;
	description: string;
	permissions: bigint;
	attributes?: string[];
	updated_at: string;
	created_at: string;
}

export interface IBackendState {
	createApp(
		metadata: IMetadata,
		bits: string[],
		template: string,
		online: boolean,
	): Promise<IApp>;
	getApps(): Promise<[IApp, IMetadata | undefined][]>;
	getApp(appId: string): Promise<IApp>;
	updateApp(app: IApp): Promise<void>;
	getAppMeta(appId: string, language?: string): Promise<IMetadata>;
	pushAppMeta(
		appId: string,
		metadata: IMetadata,
		language?: string,
	): Promise<void>;
	getBoards(appId: string): Promise<IBoard[]>;
	getCatalog(): Promise<INode[]>;
	getBoard(
		appId: string,
		boardId: string,
		version?: [number, number, number],
	): Promise<IBoard>;
	createBoardVersion(
		appId: string,
		boardId: string,
		versionType: IVersionType,
	): Promise<[number, number, number]>;
	getBoardVersions(
		appId: string,
		boardId: string,
	): Promise<[number, number, number][]>;
	// [AppId, BoardId, BoardName]
	getOpenBoards(): Promise<[string, string, string][]>;
	getBoardSettings(): Promise<"straight" | "step" | "simpleBezier">;

	executeBoard(
		appId: string,
		boardId: string,
		payload: IRunPayload,
		streamState?: boolean,
		eventId?: (id: string) => void,
		cb?: (event: IIntercomEvent[]) => void,
	): Promise<ILogMetadata | undefined>;

	executeEvent(
		appId: string,
		eventId: string,
		payload: IRunPayload,
		streamState?: boolean,
		onEventId?: (id: string) => void,
		cb?: (event: IIntercomEvent[]) => void,
	): Promise<ILogMetadata | undefined>;

	cancelExecution(runId: string): Promise<void>;

	listRuns(
		appId: string,
		boardId: string,
		nodeId?: string,
		from?: number,
		to?: number,
		status?: ILogLevel,
		limit?: number,
		offset?: number,
		lastMeta?: ILogMetadata,
	): Promise<ILogMetadata[]>;
	queryRun(
		logMeta: ILogMetadata,
		query: string,
		limit?: number,
		offset?: number,
	): Promise<ILog[]>;

	undoBoard(
		appId: string,
		boardId: string,
		commands: IGenericCommand[],
	): Promise<void>;
	redoBoard(
		appId: string,
		boardId: string,
		commands: IGenericCommand[],
	): Promise<void>;

	updateBoardMeta(
		appId: string,
		boardId: string,
		name: string,
		description: string,
		logLevel: ILogLevel,
		stage: IExecutionStage,
	): Promise<void>;

	closeBoard(boardId: string): Promise<void>;

	// Profile Operations
	getProfile(): Promise<IProfile>;
	getSettingsProfile(): Promise<ISettingsProfile>;

	// Board Operations
	executeCommand(
		appId: string,
		boardId: string,
		command: IGenericCommand,
	): Promise<IGenericCommand>;

	executeCommands(
		appId: string,
		boardId: string,
		commands: IGenericCommand[],
	): Promise<IGenericCommand[]>;

	// Event Operations
	getEvent(
		appId: string,
		eventId: string,
		version?: [number, number, number],
	): Promise<IEvent>;
	getEvents(appId: string): Promise<IEvent[]>;
	getEventVersions(
		appId: string,
		eventId: string,
	): Promise<[number, number, number][]>;
	upsertEvent(
		appId: string,
		event: IEvent,
		versionType?: IVersionType,
	): Promise<IEvent>;
	deleteEvent(appId: string, eventId: string): Promise<void>;
	validateEvent(
		appId: string,
		eventId: string,
		version?: [number, number, number],
	): Promise<void>;
	upsertEventFeedback(
		appId: string,
		eventId: string,
		messageId: string,
		feedback: {
			// 0: remove, 1: positive, -1: negative
			rating: number;
			history?: any[];
			globalState?: Record<string, any>;
			localState?: Record<string, any>;
			comment?: string;
			sub?: boolean;
		},
	): Promise<void>;

	// Template Operations

	// Returns a list of templates for the given appId and language, if the appId is not given, returns all templates the user has access to.
	getTemplates(
		appId?: string,
		language?: string,
		// [appId, templateId, metadata]
	): Promise<[string, string, IMetadata | undefined][]>;
	getTemplate(
		appId: string,
		templateId: string,
		version?: [number, number, number],
	): Promise<IBoard>;
	upsertTemplate(
		appId: string,
		boardId: string,
		templateId?: string,
		boardVersion?: [number, number, number],
		versionType?: IVersionType,
	): Promise<[string, [number, number, number]]>;
	deleteTemplate(appId: string, templateId: string): Promise<void>;
	getTemplateMeta(
		appId: string,
		templateId: string,
		language?: string,
	): Promise<IMetadata>;
	pushTemplateMeta(
		appId: string,
		templateId: string,
		metadata: IMetadata,
		language?: string,
	): Promise<void>;

	// Storage Operations
	listStorageItems(appId: string, prefix: string): Promise<IStorageItem[]>;
	deleteStorageItems(appId: string, prefixes: string[]): Promise<void>;
	downloadStorageItems(
		appId: string,
		prefixes: string[],
	): Promise<IStorageItemActionResult[]>;
	uploadStorageItems(
		appId: string,
		prefix: string,
		files: File[],
		onProgress?: (progress: number) => void,
	): Promise<void>;

	// Additional Functionality
	getPathMeta(folderPath: string): Promise<IFileMetadata[]>;
	openFileOrFolderMenu(
		multiple: boolean,
		directory: boolean,
		recursive: boolean,
	): Promise<string[] | string | undefined>;

	getInstalledBit(bits: IBit[]): Promise<IBit[]>;
	getPackFromBit(bit: IBit): Promise<{
		bits: IBit[];
	}>;
	downloadBit(
		bit: IBit,
		pack: IBitPack,
		cb?: (progress: IDownloadProgress[]) => void,
	): Promise<IBit[]>;
	deleteBit(bit: IBit): Promise<void>;
	getBit(id: string, hub?: string): Promise<IBit>;
	addBit(bit: IBit, profile: ISettingsProfile): Promise<void>;
	removeBit(bit: IBit, profile: ISettingsProfile): Promise<void>;
	getPackSize(bits: IBit[]): Promise<number>;
	getBitSize(bit: IBit): Promise<number>;
	searchBits(type: IBitSearchQuery): Promise<IBit[]>;
	isBitInstalled(bit: IBit): Promise<boolean>;

	fileToUrl(file: File): Promise<string>;

	getRoles(appId: string): Promise<[string | undefined, IBackendRole[]]>;
	deleteRole(appId: string, roleId: string): Promise<void>;
	makeRoleDefault(appId: string, roleId: string): Promise<void>;
	upsertRole(appId: string, role: IBackendRole): Promise<void>;
	assignRole(appId: string, roleId: string, sub: string): Promise<void>;
}

interface BackendStoreState {
	backend: IBackendState | null;
	setBackend: (backend: IBackendState) => void;
}

export const useBackendStore = create<BackendStoreState>((set) => ({
	backend: null,
	setBackend: (backend: IBackendState) => set({ backend }),
}));

export function useBackend(): IBackendState {
	const backend = useBackendStore((state) => state.backend);
	if (!backend) throw new Error("Backend not initialized");
	return backend;
}
