import type { IFileMetadata } from "../../lib";

export interface IHelperState {
	getPathMeta(folderPath: string): Promise<IFileMetadata[]>;
	openFileOrFolderMenu(
		multiple: boolean,
		directory: boolean,
		recursive: boolean,
	): Promise<string[] | string | undefined>;

	fileToUrl(file: File): Promise<string>;
}
