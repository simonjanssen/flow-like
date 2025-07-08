import { create } from "zustand";
import type {
	IApp,
	IAppVisibility,
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

import type { IAppState } from "./backend-state/app-state";
import type { IBitState } from "./backend-state/bit-state";
import type { IBoardState } from "./backend-state/board-state";
import type { IEventState } from "./backend-state/event-state";
import type { IHelperState } from "./backend-state/helper-state";
import type { IRoleState } from "./backend-state/role-state";
import type { IStorageState } from "./backend-state/storage-state";
import type { ITeamState } from "./backend-state/team-state";
import type { ITemplateState } from "./backend-state/template-state";
import type {
	IBackendRole,
	IInvite,
	IInviteLink,
	IJoinRequest,
	IMember,
	INotificationsOverview,
	IStorageItemActionResult,
	IUserLookup,
} from "./backend-state/types";
import type { IUserState } from "./backend-state/user-state";

export type {
	IAppState,
	IBitState,
	IBoardState,
	IRoleState,
	IStorageState,
	ITeamState,
	IUserState,
	ITemplateState,
	IHelperState,
	IEventState,
};

export type {
	IBackendRole,
	IInvite,
	IInviteLink,
	IJoinRequest,
	IMember,
	IStorageItemActionResult,
} from "./backend-state/types";

export interface IBackendState {
	appState: IAppState;
	bitState: IBitState;
	boardState: IBoardState;
	userState: IUserState;
	teamState: ITeamState;
	roleState: IRoleState;
	storageState: IStorageState;
	templateState: ITemplateState;
	helperState: IHelperState;
	eventState: IEventState;
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
