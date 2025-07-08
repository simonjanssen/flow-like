"use client";
import { Channel, invoke } from "@tauri-apps/api/core";
import { type Event, type UnlistenFn, listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { mkdir, open as openFile } from "@tauri-apps/plugin-fs";

import { createId } from "@paralleldrive/cuid2";
import {
	type IApp,
	type IAppState,
	IAppVisibility,
	type IBackendRole,
	type IBackendState,
	type IBit,
	type IBitPack,
	type IBitState,
	type IBoard,
	type IBoardState,
	type IDownloadProgress,
	type IEvent,
	type IEventState,
	type IExecutionStage,
	type IFileMetadata,
	type IGenericCommand,
	type IHelperState,
	type IIntercomEvent,
	type IInvite,
	type IInviteLink,
	type IJoinRequest,
	type ILog,
	type ILogLevel,
	type ILogMetadata,
	type IMember,
	type IMetadata,
	type INode,
	type IProfile,
	type IRoleState,
	type IRunPayload,
	type ISettingsProfile,
	type IStorageItemActionResult,
	type IStorageState,
	type ITeamState,
	type ITemplateState,
	type IUserState,
	type IVersionType,
	LoadingScreen,
	type QueryClient,
	injectData,
	injectDataFunction,
	isEqual,
	offlineSyncDB,
	useBackend,
	useBackendStore,
	useDownloadManager,
	useInvoke,
	useQueryClient,
} from "@tm9657/flow-like-ui";
import type { ICommandSync, IStorageItem } from "@tm9657/flow-like-ui/lib";
import type { IBitSearchQuery } from "@tm9657/flow-like-ui/lib/schema/hub/bit-search-query";
import type {
	INotificationsOverview,
	IUserLookup,
} from "@tm9657/flow-like-ui/state/backend-state/types";
import { useCallback, useEffect, useState, useTransition } from "react";
import { type AuthContextProps, useAuth } from "react-oidc-context";
import { toast } from "sonner";
import { fetcher, put } from "../lib/api";
import { appsDB } from "../lib/apps-db";
import { AppState } from "./tauri-provider/app-state";
import { BitState } from "./tauri-provider/bit-state";
import { BoardState } from "./tauri-provider/board-state";
import { EventState } from "./tauri-provider/event-state";
import { HelperState } from "./tauri-provider/helper-state";
import { RoleState } from "./tauri-provider/role-state";
import { StorageState } from "./tauri-provider/storage-state";
import { TeamState } from "./tauri-provider/team-state";
import { TemplateState } from "./tauri-provider/template-state";
import { UserState } from "./tauri-provider/user-state";

export class TauriBackend implements IBackendState {
	appState: IAppState;
	bitState: IBitState;
	boardState: IBoardState;
	eventState: IEventState;
	helperState: IHelperState;
	roleState: IRoleState;
	storageState: IStorageState;
	teamState: ITeamState;
	templateState: ITemplateState;
	userState: IUserState;

	constructor(
		public readonly backgroundTaskHandler: (task: Promise<any>) => void,
		public queryClient?: QueryClient,
		public auth?: AuthContextProps,
		public profile?: IProfile,
	) {
		this.appState = new AppState(this);
		this.bitState = new BitState(this);
		this.boardState = new BoardState(this);
		this.eventState = new EventState(this);
		this.helperState = new HelperState(this);
		this.roleState = new RoleState(this);
		this.storageState = new StorageState(this);
		this.teamState = new TeamState(this);
		this.templateState = new TemplateState(this);
		this.userState = new UserState(this);
	}

	pushProfile(profile: IProfile) {
		this.profile = profile;
	}

	pushAuthContext(auth: AuthContextProps) {
		this.auth = auth;
	}

	pushQueryClient(queryClient: QueryClient) {
		this.queryClient = queryClient;
	}

	async isOffline(appId: string): Promise<boolean> {
		const status = await appsDB.visibility.get(appId);
		if (typeof status !== "undefined") {
			return status.visibility === IAppVisibility.Offline;
		}
		return true;
	}

	async pushOfflineSyncCommand(
		appId: string,
		boardId: string,
		commands: IGenericCommand[],
	) {
		console.log("Pushing offline sync command", { appId, boardId, commands });
		await offlineSyncDB.commands.put({
			commandId: createId(),
			appId: appId,
			boardId: boardId,
			commands: commands,
			createdAt: new Date(),
		});
	}

	async getOfflineSyncCommands(
		appId: string,
		boardId: string,
	): Promise<ICommandSync[]> {
		const commands = await offlineSyncDB.commands
			.where({
				appId: appId,
				boardId: boardId,
			})
			.toArray();

		return commands.toSorted(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
		);
	}

	async clearOfflineSyncCommands(
		commandId: string,
		appId: string,
		boardId: string,
	): Promise<void> {
		await offlineSyncDB.commands.delete(commandId);
	}
}

export function TauriProvider({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const queryClient = useQueryClient();
	const { backend, setBackend } = useBackendStore();
	const { setDownloadBackend, download } = useDownloadManager();
	const [isPending, startTransition] = useTransition();

	const [resumedDownloads, setResumedDownloads] = useState(false);

	const resumeDownloads = useCallback(async () => {
		if (resumedDownloads) {
			console.log("Downloads already resumed, skipping...");
			return;
		}

		await new Promise((resolve) => setTimeout(resolve, 1000));
		console.time("Resuming Downloads");
		const downloads = await invoke<{ [key: string]: IBit }>("init_downloads");
		console.timeEnd("Resuming Downloads");
		const items = Object.keys(downloads).map((bitId) => {
			const bit: IBit = downloads[bitId];
			return bit;
		});

		console.time("Resuming download requests");
		const download_requests = items.map((item) => {
			console.log("Resuming download for item:", item);
			return download(item);
		});

		await Promise.allSettled([...download_requests]);
		console.timeEnd("Resuming download requests");
		setResumedDownloads(true);
	}, [download, setResumedDownloads, resumedDownloads]);

	useEffect(() => {
		if (!backend) return;
		setTimeout(() => {
			startTransition(() => {
				resumeDownloads();
			});
		}, 10000);
	}, [backend, resumeDownloads]);

	useEffect(() => {
		if (backend && backend instanceof TauriBackend && queryClient) {
			backend.pushQueryClient(queryClient);
		}
	}, [backend, queryClient]);

	useEffect(() => {
		console.time("TauriProvider Initialization");
		const backend = new TauriBackend((promise) => {
			promise
				.then((result) => {
					// Handle successful completion
					console.log("Background task completed:", result);
					// Maybe update some global state, cache, or UI
				})
				.catch((error) => {
					// Handle errors
					console.error("Background task failed:", error);
					// Maybe show a notification or log the error
				});
		}, queryClient);
		console.timeEnd("TauriProvider Initialization");
		console.time("Setting Backend");
		setBackend(backend);
		console.timeEnd("Setting Backend");
		console.time("Setting Download Backend");
		setDownloadBackend(backend);
		console.timeEnd("Setting Download Backend");
	}, []);

	if (!backend) {
		return <LoadingScreen progress={50} />;
	}

	return (
		<>
			{backend && <ProfileSyncer />}
			{children}
		</>
	);
}

function ProfileSyncer() {
	const backend = useBackend();
	const profile = useInvoke(
		backend.userState.getProfile,
		backend.userState,
		[],
		true,
	);

	useEffect(() => {
		if (profile.data && backend instanceof TauriBackend) {
			backend.pushProfile(profile.data);
		}
	}, [profile.data, backend]);

	return null;
}
