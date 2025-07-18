import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { IFileMetadata, IHelperState } from "@tm9657/flow-like-ui";
import type { TauriBackend } from "../tauri-provider";

export class HelperState implements IHelperState {
	constructor(private readonly backend: TauriBackend) {}

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
}
