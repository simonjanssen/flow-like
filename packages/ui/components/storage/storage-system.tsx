"use client";

import {
	FilesIcon,
	FolderPlusIcon,
	GridIcon,
	LayoutGridIcon,
	LinkIcon,
	ListIcon,
	MaximizeIcon,
	MinimizeIcon,
	SearchIcon,
	SortAscIcon,
	UploadIcon,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type IStorageItem, useBackend, useInvoke } from "../..";
import {
	Badge,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	EmptyState,
	FilePreviewer,
	Input,
	Progress,
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	Separator,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../ui";
import { StorageBreadcrumbs } from "./storage-breadcrumbs";
import { FileOrFolder } from "./storage-file-or-folder";

export function StorageSystem({
	appId,
	prefix,
	updatePrefix,
	fileToUrl,
}: Readonly<{
	appId: string;
	prefix: string;
	updatePrefix: (prefix: string) => void;
	fileToUrl: (prefix: string) => Promise<string>;
}>) {
	const fileReference = useRef<HTMLInputElement>(null);
	const folderReference = useRef<HTMLInputElement>(null);
	const backend = useBackend();
	const [preview, setPreview] = useState({
		url: "",
		file: "",
	});
	const [uploadProgress, setUploadProgress] = useState<{
		isUploading: boolean;
		progress: number;
		fileCount: number;
		currentFile: string;
	}>({
		isUploading: false,
		progress: 0,
		fileCount: 0,
		currentFile: "",
	});
	const files = useInvoke(
		backend.storageState.listStorageItems,
		backend.storageState,
		[appId, prefix],
	);

	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("list");
	const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">(
		"name",
	);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);

	const processFiles = useCallback(
		async (inputFiles: File[]) => {
			if (inputFiles.length === 0) return;
			const fileList = Array.from(inputFiles);

			setUploadProgress({
				isUploading: true,
				progress: 0,
				fileCount: fileList.length,
				currentFile: fileList[0]?.name || "",
			});

			try {
				await backend.storageState.uploadStorageItems(
					appId,
					prefix,
					fileList,
					(progress) => {
						setUploadProgress((prev) => ({
							...prev,
							progress: progress,
						}));
					},
				);

				setUploadProgress({
					isUploading: false,
					progress: 100,
					fileCount: 0,
					currentFile: "",
				});

				toast.success("Files uploaded successfully");
				files.refetch();
			} catch (error) {
				console.error(error);
				setUploadProgress({
					isUploading: false,
					progress: 0,
					fileCount: 0,
					currentFile: "",
				});
				toast.error("Failed to upload files");
			}
		},
		[prefix, backend, files.refetch],
	);

	const loadFile = useCallback(
		async (file: string) => {
			if (preview.file === file) {
				setPreview((old) => ({ ...old, file: "", url: "" }));
				return;
			}

			const url = await backend.storageState.downloadStorageItems(appId, [
				file,
			]);

			if (url.length === 0 || !url[0]?.url) {
				toast.error("Failed to load file preview");
				return;
			}

			const fileUrl = url[0].url;

			setPreview({
				url: fileUrl,
				file,
			});
		},
		[appId, preview],
	);

	const downloadFile = useCallback(
		async (file: string) => {
			if (preview.file === file) {
				setPreview((old) => ({ ...old, file: "", url: "" }));
				return;
			}

			const signedUrl = await backend.storageState.downloadStorageItems(appId, [
				file,
			]);


			if (signedUrl.length === 0 || !signedUrl[0]?.url) {
				toast.error("Failed to load file preview");
				return;
			}

			if(backend.storageState.writeStorageItems) {
				await backend.storageState.writeStorageItems(signedUrl)
				return;
			}

			const fileUrl = signedUrl[0].url;
			const fileName = fileUrl.split("/").pop()?.split("?")[0] || "downloaded_file";
            const fileContent = await fetch(fileUrl).then((res) => res.blob());
			const blob = new Blob([fileContent], { type: "application/octet-stream" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
		},
		[appId, preview],
	);

	const filteredFiles = useMemo(
		() =>
			files.data?.filter((file) =>
				file.location
					.split("/")
					.pop()
					?.toLowerCase()
					.includes(searchQuery.toLowerCase()),
			) ?? [],
		[files, searchQuery],
	);

	const sortedFiles = useMemo(
		() =>
			[...filteredFiles].sort((a, b) => {
				const getName = (file: IStorageItem) =>
					file.location.split("/").pop() ?? "";
				const isFolder = (file: IStorageItem) =>
					file.location.endsWith("_._path");

				// Always sort folders first
				if (isFolder(a) && !isFolder(b)) return -1;
				if (!isFolder(a) && isFolder(b)) return 1;

				let comparison = 0;

				switch (sortBy) {
					case "name":
						comparison = getName(a).localeCompare(getName(b));
						break;
					case "date":
						comparison =
							new Date(a.last_modified ?? 0).getTime() -
							new Date(b.last_modified ?? 0).getTime();
						break;
					case "size":
						comparison = (a.size ?? 0) - (b.size ?? 0);
						break;
					case "type": {
						const extA = getName(a).split(".").pop() ?? "";
						const extB = getName(b).split(".").pop() ?? "";
						comparison = extA.localeCompare(extB);
						break;
					}
				}

				return sortOrder === "asc" ? comparison : -comparison;
			}),
		[filteredFiles, sortBy, sortOrder],
	);

	const fileCount = files.data?.filter(
		(f) => !f.location.endsWith("_._path"),
	).length;
	const folderCount = files.data?.filter((f) =>
		f.location.endsWith("_._path"),
	).length;

	return (
		<div className="flex grow flex-col gap-4 min-h-full h-full max-h-full overflow-hidden w-full">
			<input
				ref={fileReference}
				type="file"
				className="hidden"
				id="file-upload"
				multiple
				onChange={(e) => {
					if (!e.target.files) return;
					const filesArray = Array.from(e.target.files);
					processFiles(filesArray);
					e.target.value = "";
				}}
			/>

			<input
				ref={folderReference}
				type="file"
				className="hidden"
				id="folder-upload"
				// @ts-ignore
				webkitdirectory={"true"}
				directory
				multiple
				onChange={(e) => {
					if (!e.target.files) return;
					const filesArray = Array.from(e.target.files);
					processFiles(filesArray);
					e.target.value = "";
				}}
			/>

			{/* Upload Progress Indicator */}
			{uploadProgress.isUploading && (
				<div className="mx-4 mt-4 p-4 border rounded-lg bg-card">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<UploadIcon className="h-4 w-4 text-primary animate-pulse" />
							<span className="text-sm font-medium">
								Uploading {uploadProgress.fileCount} file
								{uploadProgress.fileCount !== 1 ? "s" : ""}
							</span>
						</div>
						<span className="text-sm text-muted-foreground">
							{uploadProgress.progress.toFixed(2)}%
						</span>
					</div>
					<Progress value={uploadProgress.progress} className="mb-2" />
					<p className="text-xs text-muted-foreground truncate">
						{uploadProgress.currentFile}
					</p>
				</div>
			)}

			{/* Header Section */}
			<div className="flex flex-col gap-4 px-4 pt-4">
				<div className="flex flex-row items-center justify-between">
					<h2 className="text-2xl font-semibold tracking-tight">Storage</h2>
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-2">
							<div className="flex items-center gap-1 text-sm text-muted-foreground">
								<span>Sort by:</span>
								<span className="font-medium text-foreground capitalize">
									{sortBy === "date" ? "Date modified" : sortBy}
								</span>
								<span className="text-xs">
									{sortOrder === "asc" ? "↑" : "↓"}
								</span>
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="icon">
										<SortAscIcon className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={() => {
											setSortBy("name");
											setSortOrder(
												sortBy === "name" && sortOrder === "asc"
													? "desc"
													: "asc",
											);
										}}
										className="flex items-center justify-between"
									>
										Name
										{sortBy === "name" && (
											<span className="text-xs text-muted-foreground">
												{sortOrder === "asc" ? " ↑" : " ↓"}
											</span>
										)}
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => {
											setSortBy("date");
											setSortOrder(
												sortBy === "date" && sortOrder === "asc"
													? "desc"
													: "asc",
											);
										}}
										className="flex items-center justify-between"
									>
										Date modified
										{sortBy === "date" && (
											<span className="text-xs text-muted-foreground">
												{sortOrder === "asc" ? " ↑" : " ↓"}
											</span>
										)}
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => {
											setSortBy("size");
											setSortOrder(
												sortBy === "size" && sortOrder === "asc"
													? "desc"
													: "asc",
											);
										}}
										className="flex items-center justify-between"
									>
										Size
										{sortBy === "size" && (
											<span className="text-xs text-muted-foreground">
												{sortOrder === "asc" ? " ↑" : " ↓"}
											</span>
										)}
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() => {
											setSortBy("type");
											setSortOrder(
												sortBy === "type" && sortOrder === "asc"
													? "desc"
													: "asc",
											);
										}}
										className="flex items-center justify-between"
									>
										Type
										{sortBy === "type" && (
											<span className="text-xs text-muted-foreground">
												{sortOrder === "asc" ? " ↑" : " ↓"}
											</span>
										)}
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									onClick={() =>
										setViewMode(viewMode === "grid" ? "list" : "grid")
									}
								>
									{viewMode === "grid" ? (
										<ListIcon className="h-4 w-4" />
									) : (
										<GridIcon className="h-4 w-4" />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								Switch to {viewMode === "grid" ? "list" : "grid"} view
							</TooltipContent>
						</Tooltip>
						<Separator orientation="vertical" className="h-6" />

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									className="gap-2"
									onClick={() => fileReference.current?.click()}
								>
									<UploadIcon className="h-4 w-4" />
									Upload Files
								</Button>
							</TooltipTrigger>
							<TooltipContent>Upload files to current folder</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="outline"
									className="gap-2"
									onClick={() => folderReference.current?.click()}
								>
									<FolderPlusIcon className="h-4 w-4" />
									Upload Folder
								</Button>
							</TooltipTrigger>
							<TooltipContent>Upload entire folder</TooltipContent>
						</Tooltip>
					</div>
				</div>
				<div className="flex items-end gap-2 mt-2 justify-between">
					{(files.data?.length ?? 0) > 0 && (
						<StorageBreadcrumbs
							appId={appId}
							prefix={prefix}
							updatePrefix={(prefix) => updatePrefix(prefix)}
						/>
					)}
					{(files.data?.length ?? 0) > 0 && (
						<div className="relative">
							<SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search files and folders..."
								className="pl-10"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
					)}
				</div>
			</div>

			<Separator />

			{/* Content Section */}
			{(files.data?.length ?? 0) === 0 && (
				<div className="flex flex-col h-full w-full grow relative px-4">
					<EmptyState
						className="w-full h-full max-w-full border-2 border-dashed border-muted-foreground/25 rounded-lg"
						title="No Files Found"
						description="Get started by uploading your first files or folders to this storage space"
						action={[
							{
								label: "Upload Files",
								onClick: () => fileReference.current?.click(),
							},
							{
								label: "Upload Folder",
								onClick: () => folderReference.current?.click(),
							},
						]}
						icons={[LayoutGridIcon, FilesIcon, LinkIcon]}
					/>
				</div>
			)}

			{(files.data?.length ?? 0) > 0 && (
				<div className="flex flex-col gap-4 grow max-h-full h-full overflow-y-hidden px-4 pb-4">
					{preview.url !== "" && (
						<>
							{isPreviewMaximized && (
								<div className="fixed inset-0 z-50 bg-background">
									<div className="flex flex-col h-full w-full">
										<div className="p-4 border-b bg-background flex items-center justify-between">
											<h3 className="font-medium text-lg">
												Preview - {preview.file.split("/").pop()}
											</h3>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => setIsPreviewMaximized(false)}
												className="h-8 w-8 p-0"
											>
												<MinimizeIcon className="h-4 w-4" />
											</Button>
										</div>
										<div className="grow overflow-auto">
											<FilePreviewer url={preview.url} page={2} />
										</div>
									</div>
								</div>
							)}
							{!isPreviewMaximized && (
								<ResizablePanelGroup
									direction="horizontal"
									autoSaveId={"file_viewer"}
									className="border rounded-lg"
								>
									<ResizablePanel className="flex flex-col gap-2 grow overflow-y-hidden max-h-full h-full p-4 bg-background">
										<div
											key={sortBy}
											className="flex flex-col grow max-h-full h-full overflow-hidden gap-2"
										>
											<div className="flex items-center gap-2 mb-2">
												<h3 className="font-medium text-sm text-muted-foreground">
													Files & Folders
												</h3>
												<Badge
													variant="secondary"
													className="px-2 py-1 text-xs"
												>
													{fileCount} files
												</Badge>
												<Badge
													variant="secondary"
													className="px-2 py-1 text-xs"
												>
													{folderCount} folders
												</Badge>
											</div>
											<div className="flex flex-col gap-2 grow max-h-full h-full overflow-auto">
												{sortedFiles.map((file) => (
													<FileOrFolder
														highlight={preview.file === file.location}
														key={file.location}
														file={file}
														changePrefix={(new_prefix) =>
															updatePrefix(`${prefix}/${new_prefix}`)
														}
														loadFile={(file) => loadFile(file)}
														deleteFile={async (file) => {
															const filePrefix = `${prefix}/${file}`;
															await backend.storageState.deleteStorageItems(
																appId,
																[filePrefix],
															);
															await files.refetch();
															toast.success("File deleted successfully");
														}}
														shareFile={async (file) => {
															const downloadLinks =
																await backend.storageState.downloadStorageItems(
																	appId,
																	[file],
																);
															if (downloadLinks.length === 0) {
																return;
															}

															const firstItem = downloadLinks[0];
															if (!firstItem?.url) {
																return;
															}

															console.log(
																"Copying download link to clipboard:",
																firstItem.url,
															);
															try {
																await navigator.clipboard.writeText(
																	firstItem.url,
																);
																toast.success(
																	"Copied download link to clipboard",
																);
															} catch (error) {
																console.error(
																	"Failed to copy link to clipboard:",
																	error,
																);
															}
														}}
														downloadFile={async (file) => {
															downloadFile(file);
														}}
													/>
												))}
											</div>
										</div>
									</ResizablePanel>
									<ResizableHandle className="mx-2" />
									<ResizablePanel className="flex flex-col gap-2 grow overflow-y-hidden max-h-full h-full p-4 bg-background">
										<div className="flex flex-col grow overflow-auto max-h-full h-full bg-muted/50 rounded-md border">
											<div className="p-2 border-b bg-background rounded-t-md flex items-center justify-between">
												<h3 className="font-medium text-sm">Preview</h3>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setIsPreviewMaximized(true)}
													className="h-6 w-6 p-0"
												>
													<MaximizeIcon className="h-3 w-3" />
												</Button>
											</div>
											<div className="grow overflow-auto">
												<FilePreviewer url={preview.url} page={2} />
											</div>
										</div>
									</ResizablePanel>
								</ResizablePanelGroup>
							)}
						</>
					)}
					{preview.url === "" && (
						<div className="flex flex-col grow max-h-full h-full overflow-auto gap-2 border rounded-lg p-4 bg-background">
							<div className="flex items-center gap-2 mb-2">
								<h3 className="font-medium text-sm text-muted-foreground">
									Files & Folders
								</h3>
								<Badge variant="secondary" className="px-2 py-1 text-xs">
									{fileCount} files
								</Badge>
								<Badge variant="secondary" className="px-2 py-1 text-xs">
									{folderCount} folders
								</Badge>
							</div>
							<div
								className={`grid gap-2 ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}
							>
								{sortedFiles.map((file) => (
									<FileOrFolder
										highlight={preview.file === file.location}
										key={file.location}
										file={file}
										changePrefix={(new_prefix) => {
											setPreview({
												url: "",
												file: "",
											});
											updatePrefix(`${prefix}/${new_prefix}`);
										}}
										loadFile={loadFile}
										deleteFile={async (file) => {
											const filePrefix = `${prefix}/${file}`;
											await backend.storageState.deleteStorageItems(appId, [
												filePrefix,
											]);
											await files.refetch();
											toast.success("File deleted successfully");
										}}
										shareFile={async (file) => {
											const downloadLinks =
												await backend.storageState.downloadStorageItems(appId, [
													file,
												]);
											if (downloadLinks.length === 0) {
												return;
											}
											const firstItem = downloadLinks[0];
											if (!firstItem?.url) {
												return;
											}
											try {
												await navigator.clipboard.writeText(firstItem.url);
												toast.success("Copied download link to clipboard");
											} catch (error) {
												console.error(
													"Failed to copy link to clipboard:",
													error,
												);
											}
										}}
										downloadFile={async (file) => {
											downloadFile(file);
										}}
									/>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
