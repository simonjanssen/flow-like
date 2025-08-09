import { invoke } from "@tauri-apps/api/core";
import {
	type IBoard,
	type IMetadata,
	type ITemplateState,
	type IVersionType,
	injectDataFunction,
} from "@tm9657/flow-like-ui";
import { isEqual } from "lodash-es";
import { fetcher } from "../../lib/api";
import type { TauriBackend } from "../tauri-provider";

export class TemplateState implements ITemplateState {
	constructor(private readonly backend: TauriBackend) {}
	async getTemplates(
		appId?: string,
		language?: string,
	): Promise<[string, string, IMetadata | undefined][]> {
		const templates = await invoke<[string, string, IMetadata | undefined][]>(
			"get_templates",
			{
				appId: appId,
				language: language,
			},
		);

		if (appId) {
			const isOffline = await this.backend.isOffline(appId);
			if (isOffline) {
				return templates;
			}

			if (!this.backend.profile || !this.backend.queryClient) {
				throw new Error("No profile set for Tauri backend");
			}

			const promise = injectDataFunction(
				async () => {
					const remoteData = await fetcher<[string, string, IMetadata][]>(
						this.backend.profile!,
						`apps/${appId}/templates`,
						undefined,
						this.backend.auth,
					);

					const mergedData = new Map<string, [string, string, IMetadata]>();

					for (const [id, templateId, meta] of templates) {
						if (!mergedData.has(id) && meta) {
							mergedData.set(id, [id, templateId, meta]);
						}
					}

					for (const [appId, templateId, metadata] of remoteData) {
						const found = mergedData.get(appId);
						if (found) {
							if (isEqual(found[2], metadata)) {
								// If metadata is the same, skip adding it again
								continue;
							}
						}
						mergedData.set(appId, [appId, templateId, metadata]);
						await invoke("push_template_meta", {
							appId: appId,
							templateId: templateId,
							metadata: metadata,
						});
						await this.getTemplate(appId, templateId);
					}

					return Array.from(mergedData.values());
				},
				this,
				this.backend.queryClient,
				this.getTemplates,
				[appId, language],
				[],
			);
			this.backend.backgroundTaskHandler(promise);

			return templates;
		}

		if (!this.backend.profile || !this.backend.queryClient) {
			return templates;
		}

		const limit = 100;
		let offset = 0;
		let foundAmount = 0;
		const mergedData = new Map<string, [string, string, IMetadata]>();
		for (const [id, name, meta] of templates) {
			if (!mergedData.has(id) && meta) {
				mergedData.set(id, [id, name, meta]);
			}
		}

		do {
			const remoteData = await fetcher<[string, string, IMetadata][]>(
				this.backend.profile,
				`user/templates?limit=${limit}&offset=${offset}`,
				undefined,
				this.backend.auth,
			);

			foundAmount = remoteData.length;
			offset += 100;

			for (const [appId, templateId, metadata] of remoteData) {
				const found = mergedData.get(appId);
				if (found) {
					if (isEqual(found[2], metadata)) {
						// If metadata is the same, skip adding it again
						continue;
					}
				}
				mergedData.set(appId, [appId, templateId, metadata]);
				await invoke("push_template_meta", {
					appId: appId,
					templateId: templateId,
					metadata: metadata,
				});
			}
		} while (foundAmount > 0);

		return Array.from(mergedData.values());
	}

	async getTemplate(
		appId: string,
		templateId: string,
		version?: [number, number, number],
	): Promise<IBoard> {
		let template: IBoard | undefined = undefined;
		const isOffline = await this.backend.isOffline(appId);

		try {
			template = await invoke<IBoard>("get_template", {
				appId: appId,
				templateId: templateId,
				version: version,
			});
			if (isOffline) {
				return template;
			}
		} catch (error) {
			console.error("Error fetching template:", error);
		}

		if (!this.backend.profile || !this.backend.queryClient) {
			throw new Error("No profile set for Tauri backend");
		}

		const remoteDataPromise: Promise<IBoard> = fetcher<IBoard>(
			this.backend.profile,
			`apps/${appId}/templates/${templateId}`,
			undefined,
			this.backend.auth,
		);

		if (template) {
			const promise = injectDataFunction(
				async () => {
					const remoteData = await remoteDataPromise;

					if (!isEqual(template, remoteData)) {
						await invoke("push_template_data", {
							appId: appId,
							templateId: templateId,
							data: remoteData,
							version: version,
						});

						return remoteData;
					}

					return template;
				},
				this,
				this.backend.queryClient,
				this.getTemplate,
				[appId, templateId, version],
				[],
			);
			this.backend.backgroundTaskHandler(promise);

			return template;
		}
		const remoteData = await remoteDataPromise;

		if (remoteData) {
			await invoke("push_template_data", {
				appId: appId,
				templateId: templateId,
				data: remoteData,
				version: version,
			});
		}

		return remoteData;
	}

	async upsertTemplate(
		appId: string,
		boardId: string,
		templateId?: string,
		boardVersion?: [number, number, number],
		versionType?: IVersionType,
	): Promise<[string, [number, number, number]]> {
		const isOffline = await this.backend.isOffline(appId);

		if (isOffline) {
			return await invoke("upsert_template", {
				appId: appId,
				boardId: boardId,
				templateId: templateId,
				boardVersion: boardVersion,
				versionType: versionType,
			});
		}

		if (!this.backend.profile || !this.backend.queryClient) {
			throw new Error("No profile set for Tauri backend");
		}

		const result = await fetcher<[string, [number, number, number]]>(
			this.backend.profile,
			`apps/${appId}/templates/${templateId ?? "new"}`,
			{
				method: "PUT",
				body: JSON.stringify({
					board_id: boardId,
					board_version: boardVersion,
					version_type: versionType,
				}),
			},
			this.backend.auth,
		);

		await invoke("upsert_template", {
			appId: appId,
			boardId: boardId,
			templateId: templateId,
			boardVersion: boardVersion,
			versionType: versionType,
		});

		return result;
	}

	async deleteTemplate(appId: string, templateId: string): Promise<void> {
		const isOffline = await this.backend.isOffline(appId);

		if (isOffline) {
			await invoke("delete_template", {
				appId: appId,
				templateId: templateId,
			});
			return;
		}

		if (!this.backend.profile || !this.backend.queryClient) {
			throw new Error("No profile set for Tauri backend");
		}

		await fetcher(
			this.backend.profile,
			`apps/${appId}/templates/${templateId}`,
			{
				method: "DELETE",
			},
			this.backend.auth,
		);

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
		const isOffline = await this.backend.isOffline(appId);

		let meta: IMetadata | undefined = undefined;

		try {
			meta = await invoke<IMetadata>("get_template_meta", {
				appId: appId,
				templateId: templateId,
				language: language,
			});
			if (isOffline) {
				return meta;
			}
		} catch (error) {
			console.error("Error fetching template meta:", error);
			if (isOffline) {
				throw new Error(
					"Cannot fetch template meta while offline. Please try again later.",
				);
			}
		}

		if (
			!this.backend.profile ||
			!this.backend.auth ||
			!this.backend.queryClient
		) {
			throw new Error(
				"Profile, auth or query client not set. Cannot get template meta.",
			);
		}

		const remoteMetaPromise: Promise<IMetadata> = fetcher<IMetadata>(
			this.backend.profile,
			`apps/${appId}/meta?language=${language ?? "en"}&template_id=${templateId}`,
			undefined,
			this.backend.auth,
		);

		if (meta) {
			const promise = injectDataFunction(
				async () => {
					const remoteMeta = await remoteMetaPromise;

					await invoke("push_template_meta", {
						appId: appId,
						templateId: templateId,
						metadata: remoteMeta,
						language,
					});

					return remoteMeta;
				},
				this,
				this.backend.queryClient,
				this.getTemplateMeta,
				[appId, templateId, language],
				[],
			);
			this.backend.backgroundTaskHandler(promise);

			return meta;
		}

		const remoteMeta = await remoteMetaPromise;

		if (remoteMeta) {
			await invoke("push_template_meta", {
				appId: appId,
				templateId: templateId,
				metadata: remoteMeta,
				language,
			});
		}

		return remoteMeta;
	}

	async pushTemplateMeta(
		appId: string,
		templateId: string,
		metadata: IMetadata,
		language?: string,
	): Promise<void> {
		const isOffline = await this.backend.isOffline(appId);

		await invoke("push_template_meta", {
			appId: appId,
			templateId: templateId,
			metadata: metadata,
			language: language,
		});

		if (isOffline) {
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
			`apps/${appId}/meta?language=${language ?? "en"}&template_id=${templateId}`,
			{
				method: "PUT",
				body: JSON.stringify(metadata),
			},
			this.backend.auth,
		);

		await invoke("push_template_meta", {
			appId: appId,
			templateId: templateId,
			metadata: metadata,
			language: language,
		});
	}
}
