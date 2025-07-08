import { invoke } from "@tauri-apps/api/core";
import {
	type IApp,
	type IAppState,
	IAppVisibility,
	type IMetadata,
	injectDataFunction,
} from "@tm9657/flow-like-ui";
import { fetcher, put } from "../../lib/api";
import { appsDB } from "../../lib/apps-db";
import type { TauriBackend } from "../tauri-provider";
export class AppState implements IAppState {
	constructor(private readonly backend: TauriBackend) {}

	async createApp(
		metadata: IMetadata,
		bits: string[],
		template: string,
		online: boolean,
	): Promise<IApp> {
		let appId: string | undefined;
		let boardId: string | undefined;
		if (online && this.backend.profile) {
			const app: IApp = await put(
				this.backend.profile,
				`apps/new`,
				{
					meta: metadata,
				},
				this.backend.auth,
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
	async deleteApp(appId: string): Promise<void> {
		const isOffline = await this.backend.isOffline(appId);
		if (isOffline) {
			await invoke("delete_app", {
				appId: appId,
			});
			return;
		}

		if (
			!this.backend.profile ||
			!this.backend.auth ||
			!this.backend.queryClient
		) {
			throw new Error(
				"Profile, auth or query client not set. Cannot delete app.",
			);
		}

		await fetcher(
			this.backend.profile,
			`apps/${appId}`,
			{
				method: "DELETE",
			},
			this.backend.auth,
		);
		await invoke("delete_app", {
			appId: appId,
		});
	}

	async getApps(): Promise<[IApp, IMetadata | undefined][]> {
		const localApps = await invoke<[IApp, IMetadata | undefined][]>("get_apps");

		if (
			!this?.backend?.queryClient ||
			!this.backend.profile ||
			!this.backend.auth?.isAuthenticated
		) {
			console.warn(
				"Query client, profile or auth context not available, returning local apps only.",
			);
			console.warn({
				queryClient: this?.backend?.queryClient,
				profile: this?.backend?.profile,
				auth: this?.backend?.auth,
			});
			return localApps;
		}

		const promise = injectDataFunction(
			async () => {
				const remoteData = await fetcher<[IApp, IMetadata | undefined][]>(
					this.backend.profile!,
					"apps",
					undefined,
					this.backend.auth,
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
			this.backend,
			this.backend.queryClient,
			this.getApps,
			[],
			[],
		);
		this.backend.backgroundTaskHandler(promise);

		return localApps;
	}
	async getApp(appId: string): Promise<IApp> {
		const localApp: IApp = await invoke("get_app", {
			appId: appId,
		});

		if (
			!this?.backend?.queryClient ||
			!this.backend.profile ||
			!this.backend.auth?.isAuthenticated
		) {
			console.warn(
				"Query client, profile or auth context not available, returning local app only.",
			);
			console.warn({
				queryClient: this?.backend?.queryClient,
				profile: this?.backend?.profile,
				auth: this?.backend?.auth,
			});
			return localApp;
		}

		const promise = injectDataFunction(
			async () => {
				const remoteData = await fetcher<IApp>(
					this.backend.profile!,
					`apps/${appId}`,
					undefined,
					this.backend.auth,
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
			this.backend,
			this.backend.queryClient,
			this.getApp,
			[appId],
			[],
		);
		this.backend.backgroundTaskHandler(promise);

		return localApp;
	}
	async updateApp(app: IApp): Promise<void> {
		const isOffline = await this.backend.isOffline(app.id);

		if (isOffline) {
			await invoke("update_app", {
				app: app,
			});
			return;
		}

		if (
			!this.backend.profile ||
			!this.backend.auth ||
			!this.backend.queryClient
		) {
			throw new Error(
				"Profile, auth or query client not set. Cannot update app.",
			);
		}

		await fetcher(
			this.backend.profile,
			`apps/${app.id}`,
			{
				method: "PUT",
				body: JSON.stringify({
					app: app,
				}),
			},
			this.backend.auth,
		);
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
		const isOffline = await this.backend.isOffline(appId);

		if (isOffline) {
			await invoke("push_app_meta", {
				appId: appId,
				metadata: metadata,
				language,
			});
			return;
		}

		if (
			!this.backend.profile ||
			!this.backend.auth ||
			!this.backend.queryClient
		) {
			throw new Error(
				"Profile, auth or query client not set. Cannot push app meta.",
			);
		}
		await fetcher(
			this.backend.profile,
			`apps/${appId}/meta?language=${language ?? "en"}`,
			{
				method: "PUT",
				body: JSON.stringify(metadata),
			},
			this.backend.auth,
		);
		await invoke("push_app_meta", {
			appId: appId,
			metadata: metadata,
			language,
		});
	}

	async changeAppVisibility(
		appId: string,
		visibility: IAppVisibility,
	): Promise<void> {
		if (this.backend.profile && this.backend.auth && this.backend.queryClient) {
			await fetcher<IApp>(
				this.backend.profile,
				`apps/${appId}/visibility`,
				{
					method: "PATCH",
					body: JSON.stringify({
						visibility: visibility,
					}),
				},
				this.backend.auth,
			);
		}
	}
}
