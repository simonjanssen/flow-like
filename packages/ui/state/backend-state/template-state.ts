import type { IBoard, IMetadata, IVersionType } from "../../lib";

export interface ITemplateState {
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
}
