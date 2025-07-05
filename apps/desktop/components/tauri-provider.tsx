"use client";
import { Channel, invoke } from "@tauri-apps/api/core";
import { type Event, type UnlistenFn, listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { mkdir, open as openFile } from "@tauri-apps/plugin-fs";

import { createId } from "@paralleldrive/cuid2";
import {
	type IApp,
	IAppVisibility,
	type IBackendRole,
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
	type IRunPayload,
	type ISettingsProfile,
	type IStorageItemActionResult,
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
import { fetcher, put } from "../lib/api";
import { appsDB } from "../lib/apps-db";

export class TauriBackend implements IBackendState {
	constructor(
		private readonly backgroundTaskHandler: (task: Promise<any>) => void,
		private queryClient?: QueryClient,
		private auth?: AuthContextProps,
		private profile?: IProfile,
	) { }

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

	async createApp(
		metadata: IMetadata,
		bits: string[],
		template: string,
		online: boolean,
	): Promise<IApp> {
		let appId: string | undefined;
		let boardId: string | undefined;
		if (online && this.profile) {
			const app: IApp = await put(
				this.profile,
				`apps/new`,
				{
					meta: metadata,
				},
				this.auth,
			);

			await appsDB.visibility.put({
				visibility: IAppVisibility.Private,
				appId: app.id,
			});

			appId = app.id;
			if (app.boards.length > 0) {
				boardId = app.boards[0];
			}
		}

		const app: IApp = await invoke("create_app", {
			metadata: metadata,
			bits: bits,
			id: appId,
		});

		if (appId) {
			await invoke("update_app", {
				app: { ...app, visibility: IAppVisibility.Private },
			});
		}

		await invoke("upsert_board", {
			appId: app.id,
			boardId: boardId,
			name: "Main Board",
			description: "The main board for the app",
			template: template,
		});

		return app;
	}

	async updateApp(app: IApp): Promise<void> {
		await invoke("update_app", {
			app: app,
		});
	}

	async changeAppVisibility(
		appId: string,
		visibility: IAppVisibility,
	): Promise<void> {
		if (this.profile && this.auth && this.queryClient) {
			await fetcher<IApp>(
				this.profile,
				`apps/${appId}/visibility`,
				{
					method: "PATCH",
					body: JSON.stringify({
						visibility: visibility,
					}),
				},
				this.auth,
			);
		}
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

		const isOffline = await this.isOffline(appId);

		if (isOffline || !this.profile || !this.auth || !this.queryClient) {
			return board;
		}

		const getOfflineSyncCommands = this.getOfflineSyncCommands.bind(this);
		const clearOfflineSyncCommands = this.clearOfflineSyncCommands.bind(this);

		const promise = injectDataFunction(
			async () => {
				const unsyncedCommands = await getOfflineSyncCommands(appId, boardId);
				for (const commandSync of unsyncedCommands) {
					try {
						// Only sync commands up to a week old
						if (
							commandSync.createdAt.getTime() <
							Date.now() - 7 * 24 * 60 * 60 * 1000
						)
							await fetcher(
								this.profile!,
								`apps/${appId}/board/${boardId}`,
								{
									method: "POST",
									body: JSON.stringify({
										commands: commandSync.commands,
									}),
								},
								this.auth,
							);
						console.log(
							"Executed offline sync command:",
							commandSync.commandId,
						);
						await clearOfflineSyncCommands(
							commandSync.commandId,
							appId,
							boardId,
						);
					} catch (e) {
						console.warn("Failed to execute offline sync command:", e);
					}
				}

				const remoteData = await fetcher<IBoard>(
					this.profile!,
					`apps/${appId}/board/${boardId}`,
					{
						method: "GET",
					},
					this.auth,
				);

				if (!remoteData) {
					throw new Error("Failed to fetch board data");
				}

				if (!isEqual(remoteData, board) && typeof version === "undefined") {
					await invoke("upsert_board", {
						appId: appId,
						boardId: boardId,
						name: remoteData.name,
						description: remoteData.description,
						boardData: remoteData,
					});
				}

				return remoteData;
			},
			this,
			this.queryClient,
			this.getBoard,
			[appId, boardId, version],
			[],
			board,
		);

		this.backgroundTaskHandler(promise);

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

		const isOffline = await this.isOffline(appId);
		if (isOffline || !this.profile || !this.auth || !this.queryClient) {
			return newVersion;
		}

		const promise = injectDataFunction(
			async () => {
				const remoteData = await fetcher<[number, number, number]>(
					this.profile!,
					`apps/${appId}/board/${boardId}`,
					{
						method: "PATCH",
						body: JSON.stringify({
							version_type: versionType,
						}),
					},
					this.auth,
				);

				return remoteData;
			},
			this,
			this.queryClient,
			this.createBoardVersion,
			[appId, boardId, versionType],
			[],
			newVersion,
		);

		this.backgroundTaskHandler(promise);

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
		return profile?.hub_profile.settings?.connection_mode as any;
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
		lastMeta?: ILogMetadata,
		offset?: number,
		limit?: number,
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

	async upsertBoard(
		appId: string,
		boardId: string,
		name: string,
		description: string,
		logLevel: ILogLevel,
		stage: IExecutionStage,
	) {
		const isOffline = await this.isOffline(appId);

		if (isOffline) {
			await invoke("upsert_board", {
				appId: appId,
				boardId: boardId,
				name: name,
				description: description,
				logLevel: logLevel,
				stage: stage,
			});
			return;
		}

		if (!this.profile || !this.auth || !this.queryClient) {
			throw new Error(
				"Profile, auth or query client not set. Cannot push board update.",
			);
		}

		const boardUpdate = await fetcher<{ id: string }>(
			this.profile,
			`apps/${appId}/board/${boardId}`,
			{
				method: "PUT",
				body: JSON.stringify({
					name: name,
					description: description,
					log_level: logLevel,
					stage: stage,
				}),
			},
			this.auth,
		);

		if (!boardUpdate?.id) {
			throw new Error("Failed to update board");
		}
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
		const returnValue = await invoke<IGenericCommand>("execute_command", {
			appId: appId,
			boardId: boardId,
			command: command,
		});

		const isOffline = await this.isOffline(appId);
		if (isOffline) {
			return returnValue;
		}

		if (!this.profile || !this.auth || !this.queryClient) {
			await this.pushOfflineSyncCommand(appId, boardId, [command]);
			return returnValue;
		}

		try {
			await fetcher(
				this.profile,
				`apps/${appId}/board/${boardId}`,
				{
					method: "POST",
					body: JSON.stringify({
						commands: [command],
					}),
				},
				this.auth,
			);
		} catch (error) {
			console.error("Failed to push command to server:", error);
			await this.pushOfflineSyncCommand(appId, boardId, [command]);
		}

		return returnValue;
	}

	async executeCommands(
		appId: string,
		boardId: string,
		commands: IGenericCommand[],
	): Promise<IGenericCommand[]> {
		const returnValue = await invoke<IGenericCommand[]>("execute_commands", {
			appId: appId,
			boardId: boardId,
			commands: commands,
		});

		const isOffline = await this.isOffline(appId);
		if (isOffline) {
			return returnValue;
		}

		if (!this.profile || !this.auth || !this.queryClient) {
			await this.pushOfflineSyncCommand(appId, boardId, commands);
			return returnValue;
		}

		try {
			const pushTask = await fetcher(
				this.profile,
				`apps/${appId}/board/${boardId}`,
				{
					method: "POST",
					body: JSON.stringify({
						commands: commands,
					}),
				},
				this.auth,
			);
		} catch (error) {
			console.error("Failed to push commands to server:", error);
			await this.pushOfflineSyncCommand(appId, boardId, commands);
		}

		return returnValue;
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

	async deleteStorageItems(appId: string, prefixes: string[]): Promise<void> {
		const isOffline = await this.isOffline(appId);

		if (!isOffline && this.profile && this.auth && this.queryClient) {
			await fetcher<void>(
				this.profile,
				`apps/${appId}/data`,
				{
					method: "DELETE",
					body: JSON.stringify({
						prefixes: prefixes,
					}),
				},
				this.auth,
			);
		}

		await invoke("storage_remove", {
			appId: appId,
			prefixes: prefixes,
		});
	}

	async downloadStorageItems(
		appId: string,
		prefixes: string[],
	): Promise<IStorageItemActionResult[]> {
		const isOffline = await this.isOffline(appId);

		if (!isOffline && this.profile && this.auth && this.queryClient) {
			const files = await fetcher<IStorageItemActionResult[]>(
				this.profile,
				`apps/${appId}/data/download`,
				{
					method: "POST",
					body: JSON.stringify({
						prefixes: prefixes,
					}),
				},
				this.auth,
			);

			console.dir(files);

			return files;
		}

		console.dir({
			isOffline: isOffline,
			profile: this.profile,
			auth: this.auth,
			queryClient: this.queryClient,
			appId: appId,
		});

		const items = await invoke<IStorageItemActionResult[]>("storage_get", {
			appId: appId,
			prefixes: prefixes,
		});
		return items;
	}

	async listStorageItems(
		appId: string,
		prefix: string,
	): Promise<IStorageItem[]> {
		const isOffline = await this.isOffline(appId);

		const items = await invoke<IStorageItem[]>("storage_list", {
			appId: appId,
			prefix: prefix,
		});

		if (isOffline || !this.profile || !this.auth || !this.queryClient) {
			return items;
		}

		const promise = injectDataFunction(
			async () => {
				const remoteData = await fetcher<IStorageItem[]>(
					this.profile!,
					`apps/${appId}/data/list`,
					{
						method: "POST",
						body: JSON.stringify({
							prefix: prefix,
						}),
					},
					this.auth,
				);

				const merged = new Map<string, IStorageItem>();
				for (const item of items) {
					merged.set(item.location, item);
				}

				for (const item of remoteData) {
					merged.set(item.location, item);
				}

				return Array.from(merged.values());
			},
			this,
			this.queryClient,
			this.listStorageItems,
			[appId, prefix],
			[],
		);

		this.backgroundTaskHandler(promise);
		return items;
	}

	async uploadStorageItems(
		appId: string,
		prefix: string,
		files: File[],
		onProgress?: (progress: number) => void,
	): Promise<void> {
		let totalFiles = files.length;
		let completedFiles = 0;

		const yieldControl = () => new Promise((resolve) => setTimeout(resolve, 0));

		const batchSize = 2;
		const batches = [];
		for (let i = 0; i < files.length; i += batchSize) {
			batches.push(files.slice(i, i + batchSize));
		}

		const isOffline = await this.isOffline(appId);
		const promises = [] as Promise<void>[];

		if (!isOffline && this.profile && this.auth) {
			totalFiles = files.length * 2;
			const fileLookup = new Map(
				files.map((file) => {
					const filePath = `${prefix}/${file.webkitRelativePath ?? file.name}`;
					return [filePath, file];
				}),
			);
			const urls: IStorageItemActionResult[] = await put(
				this.profile,
				`apps/${appId}/data`,
				{
					prefixes: files.map(
						(file) => `${prefix}/${file.webkitRelativePath ?? file.name}`,
					),
				},
				this.auth,
			);

			for (const url of urls) {
				const file = fileLookup.get(url.prefix);
				if (!file) {
					console.warn(`File not found for URL: ${url.prefix}`);
					continue;
				}

				console.group("Uploading file to storage");
				console.dir({
					appId: appId,
					prefix: url.prefix,
					size: file.size,
				});
				console.groupEnd();

				if (url.url)
					promises.push(
						this.uploadSignedUrl(
							url.url,
							file,
							completedFiles,
							totalFiles,
							onProgress,
						),
					);
			}

			await Promise.all(promises);
		}

		for (const batch of batches) {
			await Promise.all(
				batch.map(async (file) => {
					let filePath = file.name;

					if (file.webkitRelativePath) {
						filePath = file.webkitRelativePath;
					}

					filePath = `${prefix}/${filePath}`;

					console.group("Uploading file to storage");
					console.dir({
						appId: appId,
						prefix: filePath,
						size: file.size,
					});
					console.groupEnd();

					const url = await invoke<string>("storage_add", {
						appId: appId,
						prefix: filePath,
					});

					if (url.startsWith("asset://")) {
						const path = decodeURIComponent(url.replace("asset://", ""));

						const parentDir = path.substring(0, path.lastIndexOf("/"));
						await mkdir(parentDir, { recursive: true });
						const fileHandle = await openFile(path, {
							append: false,
							create: true,
							write: true,
							truncate: true,
						});

						if (!fileHandle) {
							completedFiles++;
							onProgress?.((completedFiles / totalFiles) * 100);
							return;
						}

						const chunkSize = 8 * 1024 * 1024;
						if (file.size < chunkSize) {
							const bytes = new Uint8Array(await file.arrayBuffer());
							await fileHandle.write(bytes);
							await fileHandle.close();
							completedFiles++;
							onProgress?.((completedFiles / totalFiles) * 100);
							return;
						}

						const stream = file.stream();
						const reader = stream.getReader();
						let bytesWritten = 0;
						let chunkCount = 0;

						try {
							while (true) {
								const { done, value } = await reader.read();

								if (done) {
									break;
								}

								await fileHandle.write(value);
								bytesWritten += value.length;
								chunkCount++;

								// Update progress and yield control every few chunks
								if (chunkCount % 5 === 0) {
									const fileProgress = bytesWritten / file.size;
									const totalProgress =
										((completedFiles + fileProgress) / totalFiles) * 100;
									onProgress?.(totalProgress);

									await yieldControl();
								}
							}

							// Final progress update
							completedFiles++;
							onProgress?.((completedFiles / totalFiles) * 100);
						} finally {
							reader.releaseLock();
							await fileHandle.close();
						}
					} else {
						try {
							await this.uploadSignedUrl(
								url,
								file,
								completedFiles,
								totalFiles,
								onProgress,
							);
							completedFiles++;
							onProgress?.((completedFiles / totalFiles) * 100);
						} catch (error) {
							console.error(`Failed to upload file ${filePath}:`, error);
							completedFiles++;
							onProgress?.((completedFiles / totalFiles) * 100);
							throw error;
						}
					}
				}),
			);

			await yieldControl();
		}
	}

	private async uploadSignedUrl(
		signedUrl: string,
		file: File,
		completedFiles: number,
		totalFiles: number,
		onProgress?: (progress: number) => void,
	): Promise<void> {
		const formData = new FormData();
		formData.append("file", file);

		await new Promise<void>((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			xhr.upload.addEventListener("progress", (event) => {
				if (event.lengthComputable) {
					const fileProgress = event.loaded / event.total;
					const totalProgress =
						((completedFiles + fileProgress) / totalFiles) * 100;
					onProgress?.(totalProgress);
				}
			});

			xhr.addEventListener("load", () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve();
				} else {
					reject(new Error(`Upload failed with status: ${xhr.status}`));
				}
			});

			xhr.addEventListener("error", () => {
				reject(new Error("Upload failed"));
			});

			xhr.open("PUT", signedUrl);
			xhr.setRequestHeader(
				"Content-Type",
				file.type || "application/octet-stream",
			);
			xhr.send(file);
		});

		onProgress?.((completedFiles / totalFiles) * 100);
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
		const localApp: IApp = await invoke("get_app", {
			appId: appId,
		});

		if (!this?.queryClient || !this.profile || !this.auth?.isAuthenticated) {
			console.warn(
				"Query client, profile or auth context not available, returning local app only.",
			);
			console.warn({
				queryClient: this?.queryClient,
				profile: this?.profile,
				auth: this?.auth,
			});
			return localApp;
		}

		const promise = injectDataFunction(
			async () => {
				const remoteData = await fetcher<IApp>(
					this.profile!,
					`apps/${appId}`,
					undefined,
					this.auth,
				);

				await invoke("update_app", {
					app: remoteData,
				});

				await appsDB.visibility.put({
					visibility: remoteData.visibility ?? IAppVisibility.Private,
					appId: remoteData.id,
				});

				return remoteData;
			},
			this,
			this.queryClient,
			this.getApp,
			[appId],
			[],
		);
		this.backgroundTaskHandler(promise);

		return localApp;
	}

	async getApps(): Promise<[IApp, IMetadata | undefined][]> {
		const localApps = await invoke<[IApp, IMetadata | undefined][]>("get_apps");

		if (!this?.queryClient || !this.profile || !this.auth?.isAuthenticated) {
			console.warn(
				"Query client, profile or auth context not available, returning local apps only.",
			);
			console.warn({
				queryClient: this?.queryClient,
				profile: this?.profile,
				auth: this?.auth,
			});
			return localApps;
		}

		const promise = injectDataFunction(
			async () => {
				const remoteData = await fetcher<[IApp, IMetadata | undefined][]>(
					this.profile!,
					"apps",
					undefined,
					this.auth,
				);

				const mergedData = new Map<string, [IApp, IMetadata | undefined]>();

				for (const [app, meta] of remoteData) {
					await appsDB.visibility.put({
						visibility: app.visibility ?? IAppVisibility.Private,
						appId: app.id,
					});

					const exists = localApps.find(([localApp]) => localApp.id === app.id);
					if (exists) {
						await invoke("update_app", {
							app: app,
						});
						if (meta)
							await invoke("push_app_meta", {
								appId: app.id,
								metadata: meta,
							});
						continue;
					}

					if (meta)
						await invoke("create_app", {
							metadata: meta,
							bits: app.bits,
							template: "",
							id: app.id,
						});
				}

				localApps.forEach(([app, meta]) => {
					if (!mergedData.has(app.id)) {
						mergedData.set(app.id, [app, meta]);
					}
				});

				return Array.from(mergedData.values());
			},
			this,
			this.queryClient,
			this.getApps,
			[],
			[],
		);
		this.backgroundTaskHandler(promise);

		return localApps;
	}

	async getBit(id: string, hub?: string): Promise<IBit> {
		return await invoke("get_bit", {
			bit: id,
			hub: hub,
		});
	}

	async getBoards(appId: string): Promise<IBoard[]> {
		let boards: IBoard[] = await invoke("get_app_boards", {
			appId: appId,
		});
		boards = Array.from(new Map(boards.map((b) => [b.id, b])).values());

		const isOffline = await this.isOffline(appId);

		if (isOffline || !this.profile || !this.auth || !this.queryClient) {
			return boards;
		}

		const promise = injectDataFunction(
			async () => {
				const mergedBoards = new Map<string, IBoard>();
				const remoteData = await fetcher<IBoard[]>(
					this.profile!,
					`apps/${appId}/board`,
					{
						method: "GET",
					},
					this.auth,
				);

				for (const board of boards) {
					mergedBoards.set(board.id, board);
				}

				for (const board of remoteData) {
					if(!isEqual(board, mergedBoards.get(board.id))) await invoke("upsert_board", {
						appId: appId,
						boardId: board.id,
						name: board.name,
						description: board.description,
						boardData: board,
					});
					mergedBoards.set(board.id, board);
				}

				return Array.from(mergedBoards.values());
			},
			this,
			this.queryClient,
			this.getBoards,
			[appId],
			[],
			boards,
		);

		this.backgroundTaskHandler(promise);

		return boards;
	}

	async getRoles(appId: string): Promise<[string | undefined, IBackendRole[]]> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}
		const roles = await fetcher<[string | undefined, IBackendRole[]]>(
			this.profile,
			`apps/${appId}/roles`,
			undefined,
			this.auth,
		);
		console.dir(roles);
		return roles;
	}

	async makeRoleDefault(appId: string, roleId: string): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/roles/${roleId}/default`,
			{
				method: "PUT",
			},
			this.auth,
		);
	}

	async assignRole(appId: string, roleId: string, sub: string): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/roles/${roleId}/assign/${sub}`,
			{
				method: "POST",
			},
			this.auth,
		);
	}

	async deleteRole(appId: string, roleId: string): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/roles/${roleId}`,
			{
				method: "DELETE",
			},
			this.auth,
		);
	}

	async upsertRole(appId: string, role: IBackendRole): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/roles/${role.id}`,
			{
				method: "PUT",
				body: JSON.stringify(role, (key, value) =>
					typeof value === "bigint" ? Number(value) : value,
				),
			},
			this.auth,
		);
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

	async createInviteLink(
		appId: string,
		name: string,
		maxUses: number,
	): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/team/link`,
			{
				method: "PUT",
				body: JSON.stringify({
					name: name,
					max_uses: maxUses,
				}),
			},
			this.auth,
		);
	}

	async getInviteLinks(appId: string): Promise<IInviteLink[]> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		return await fetcher(
			this.profile,
			`apps/${appId}/team/link`,
			{
				method: "GET",
			},
			this.auth,
		);
	}

	async removeInviteLink(appId: string, linkId: string): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/team/link/${linkId}`,
			{
				method: "DELETE",
			},
			this.auth,
		);
	}

	async joinInviteLink(appId: string, token: string): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/team/link/join/${token}`,
			{
				method: "POST",
			},
			this.auth,
		);
	}

	async requestJoin(appId: string, comment: string): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/team/queue`,
			{
				method: "PUT",
				body: JSON.stringify({
					comment: comment,
				}),
			},
			this.auth,
		);
	}

	async getJoinRequests(
		appId: string,
		offset?: number,
		limit?: number,
	): Promise<IJoinRequest[]> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		let url = `apps/${appId}/team/queue`;

		offset = offset ?? 0;
		if (limit) {
			url += `?offset=${offset}&limit=${limit}`;
		}

		return await fetcher(
			this.profile,
			url,
			{
				method: "GET",
			},
			this.auth,
		);
	}

	async acceptJoinRequest(appId: string, requestId: string): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/team/queue/${requestId}`,
			{
				method: "POST",
			},
			this.auth,
		);
	}

	async rejectJoinRequest(appId: string, requestId: string): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/team/queue/${requestId}`,
			{
				method: "DELETE",
			},
			this.auth,
		);
	}

	async getTeam(
		appId: string,
		offset?: number,
		limit?: number,
	): Promise<IMember[]> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		let url = `apps/${appId}/team`;
		offset = offset ?? 0;
		limit = limit ?? 20;
		if (limit) {
			url += `?offset=${offset}&limit=${limit}`;
		}

		return await fetcher(
			this.profile,
			url,
			{
				method: "GET",
			},
			this.auth,
		);
	}

	async getInvites(offset?: number, limit?: number): Promise<IInvite[]> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		let url = `user/invites`;
		offset = offset ?? 0;
		limit = limit ?? 20;
		if (limit) {
			url += `?offset=${offset}&limit=${limit}`;
		}

		return await fetcher(
			this.profile,
			url,
			{
				method: "GET",
			},
			this.auth,
		);
	}

	async acceptInvite(inviteId: string): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`user/invites/${inviteId}`,
			{
				method: "POST",
			},
			this.auth,
		);
	}

	async rejectInvite(inviteId: string): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`user/invites/${inviteId}`,
			{
				method: "DELETE",
			},
			this.auth,
		);
	}

	async inviteUser(
		appId: string,
		user_id: string,
		message: string,
	): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/team/invite`,
			{
				method: "PUT",
				body: JSON.stringify({
					sub: user_id,
					message: message,
				}),
			},
			this.auth,
		);
	}

	async removeUser(appId: string, user_id: string): Promise<void> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		await fetcher(
			this.profile,
			`apps/${appId}/team/${user_id}`,
			{
				method: "DELETE",
			},
			this.auth,
		);
	}

	async lookupUser(userId: string): Promise<IUserLookup> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		const result = await fetcher<IUserLookup>(
			this.profile,
			`user/lookup/${userId}`,
			{
				method: "GET",
			},
			this.auth,
		);

		return result;
	}

	async searchUsers(query: string): Promise<IUserLookup[]> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		const result = await fetcher<IUserLookup[]>(
			this.profile,
			`user/search/${query}`,
			{
				method: "GET",
			},
			this.auth,
		);

		return result;
	}

	async getNotifications(): Promise<INotificationsOverview> {
		if (!this.profile || !this.auth) {
			throw new Error("Profile or auth context not available");
		}

		const result = await fetcher<INotificationsOverview>(
			this.profile,
			`user/notifications`,
			{
				method: "GET",
			},
			this.auth,
		);

		return result;
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
	const profile = useInvoke(backend.getProfile, [], true);

	useEffect(() => {
		if (profile.data && backend instanceof TauriBackend) {
			backend.pushProfile(profile.data);
		}
	}, [profile.data, backend]);

	return null;
}
