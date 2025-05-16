import { FileIcon, FolderIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import type { IFileMetadata } from "../../../lib/schema/files/file-metadata";
import type { IVariable } from "../../../lib/schema/flow/variable";
import { convertJsonToUint8Array } from "../../../lib/uint8";
import { cn } from "../../../lib/utils";
import { useBackend } from "../../../state/backend-state";

export function PathbufVariable({
	variable,
	onChange,
}: Readonly<{ variable: IVariable; onChange: (variable: IVariable) => void }>) {
	const backend = useBackend();
	const [files, setFiles] = useState<IFileMetadata[]>([]);
	const [folder, setFolder] = useState<string | undefined>();
	const [isFolder, setIsFolder] = useState<boolean>(false);

	async function loadFiles() {
		if (!folder) return;
		const files = await backend.getPathMeta(folder);
		setFiles(files);
	}

	useEffect(() => {
		setFolder(undefined);
		setFiles([]);
	}, [isFolder]);

	useEffect(() => {
		loadFiles();
	}, [folder]);

	return (
		<div className="grid w-full max-w-full grid-cols-6">
			<div className="flex items-center space-x-2 max-w-full overflow-hidden col-span-2">
				<Switch
					checked={isFolder}
					onCheckedChange={(checked) => {
						setIsFolder(checked);
					}}
					id="is_folder"
				/>
				<Label htmlFor="is_folder">Folder</Label>
			</div>
			<Button
				variant={"outline"}
				className={cn(
					"w-full justify-start text-left font-normal max-w-full col-span-4",
					files.length === 0 && "text-muted-foreground",
				)}
				onClick={async () => {
					const pathBuf: any = await backend.openFileOrFolderMenu(
						false,
						isFolder,
						true,
					);
					if (!pathBuf) return;

					if (!isFolder) {
						console.dir(pathBuf);
						const fileMetadata = await backend.getPathMeta(pathBuf);
						if (!fileMetadata || fileMetadata.length === 0) return;
						setFiles([fileMetadata[0]]);
						onChange({
							...variable,
							default_value: convertJsonToUint8Array(fileMetadata[0].file_path),
						});
						return;
					}

					setFolder(pathBuf);
					onChange({
						...variable,
						default_value: convertJsonToUint8Array(pathBuf),
					});
				}}
			>
				{isFolder && <FolderIcon className="mr-2 min-w-4 h-4 w-4" />}
				{!isFolder && <FileIcon className="mr-2 min-w-4 h-4 w-4" />}
				{isFolder &&
					(folder ? (
						<span className="text-nowrap truncate">
							{folder.split("/").pop()}
						</span>
					) : (
						<span>Pick a folder</span>
					))}
				{!isFolder &&
					(files.length > 0 ? (
						<span className="text-nowrap truncate">{files[0].file_name}</span>
					) : (
						<span>Pick a file</span>
					))}
			</Button>
		</div>
	);
}
