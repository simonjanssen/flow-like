import type { IFileMetadata, IHelperState } from "@tm9657/flow-like-ui";

export class EmptyHelperState implements IHelperState {
	getPathMeta(folderPath: string): Promise<IFileMetadata[]> {
		throw new Error("Method not implemented.");
	}
	openFileOrFolderMenu(
		multiple: boolean,
		directory: boolean,
		recursive: boolean,
	): Promise<string[] | string | undefined> {
		throw new Error("Method not implemented.");
	}
	fileToUrl(file: File): Promise<string> {
		throw new Error("Method not implemented.");
	}
}
