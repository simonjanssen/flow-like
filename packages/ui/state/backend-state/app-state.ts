import type { IApp, IAppVisibility, IBoard, IMetadata } from "../../lib";

export interface IAppState {
	createApp(
		metadata: IMetadata,
		bits: string[],
		online: boolean,
		template?: IBoard,
	): Promise<IApp>;
	deleteApp(appId: string): Promise<void>;
	getApps(): Promise<[IApp, IMetadata | undefined][]>;
	getApp(appId: string): Promise<IApp>;
	updateApp(app: IApp): Promise<void>;
	getAppMeta(appId: string, language?: string): Promise<IMetadata>;
	pushAppMeta(
		appId: string,
		metadata: IMetadata,
		language?: string,
	): Promise<void>;
	changeAppVisibility(appId: string, visibility: IAppVisibility): Promise<void>;
}
