import { invoke } from "@tauri-apps/api/core";
import type {
	IBoard,
	IMetadata,
	ITemplateState,
	IVersionType,
} from "@tm9657/flow-like-ui";
import type { TauriBackend } from "../tauri-provider";

export class TemplateState implements ITemplateState {
	constructor(private readonly backend: TauriBackend) {}
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
}
