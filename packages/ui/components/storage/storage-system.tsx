"use client";

import {
	FilesIcon,
	LayoutGridIcon,
	LinkIcon,
	UploadIcon,
	FolderPlusIcon,
	SearchIcon,
	GridIcon,
	ListIcon,
	SortAscIcon
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	Button,
	EmptyState,
	FilePreviewer,
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
	Input,
	Badge,
	Separator,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui";
import { StorageBreadcrumbs } from "./storage-breadcrumbs";
import { FileOrFolder, type IStorageItem } from "./storage-file-or-folder";

export function StorageSystem({
	appId,
	prefix,
	files,
	updatePrefix,
	fileToUrl,
	uploadFile,
	deleteFile,
	shareFile,
	moveFile,
	downloadFile,
}: Readonly<{
	appId: string;
	prefix: string;
	files: IStorageItem[];
	updatePrefix: (prefix: string) => void;
	fileToUrl: (prefix: string) => Promise<string>;
	uploadFile: (prefix: string, folder: boolean) => Promise<void>;
	deleteFile: (prefix: string) => Promise<void>;
	shareFile: (prefix: string) => Promise<void>;
	moveFile: (prefix: string, newPrefix: string) => Promise<void>;
	downloadFile?: (prefix: string) => Promise<void>;
}>) {
	const [preview, setPreview] = useState({
		url: "",
		file: "",
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"grid" | "list">("list");
	const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	const loadFile = useCallback(
		async (file: string) => {
			if (preview.file === file) {
				setPreview((old) => ({ ...old, file: "", url: "" }));
				return;
			}

			const url = await fileToUrl(file);
			setPreview({
				url,
				file,
			});
		},
		[appId, preview],
	);

	const filteredFiles = useMemo(() =>
		files.filter(file =>
			file.location.split("/").pop()?.toLowerCase().includes(searchQuery.toLowerCase())
		), [files, searchQuery]
	);

	const sortedFiles = useMemo(() =>
		[...filteredFiles].sort((a, b) => {
			const getName = (file: IStorageItem) => file.location.split("/").pop() ?? "";
			const isFolder = (file: IStorageItem) => file.location.endsWith("_._path");

			// Always sort folders first
			if (isFolder(a) && !isFolder(b)) return -1;
			if (!isFolder(a) && isFolder(b)) return 1;

			let comparison = 0;

			switch (sortBy) {
				case "name":
					comparison = getName(a).localeCompare(getName(b));
					break;
				case "date":
					comparison = new Date(a.last_modified ?? 0).getTime() - new Date(b.last_modified ?? 0).getTime();
					break;
				case "size":
					comparison = (a.size ?? 0) - (b.size ?? 0);
					break;
				case "type":
					const extA = getName(a).split('.').pop() ?? "";
					const extB = getName(b).split('.').pop() ?? "";
					comparison = extA.localeCompare(extB);
					break;
			}

			return sortOrder === "asc" ? comparison : -comparison;
		}), [filteredFiles, sortBy, sortOrder]
	);

	const fileCount = files.filter(f => !f.location.endsWith("_._path")).length;
	const folderCount = files.filter(f => f.location.endsWith("_._path")).length;

	return (
		<TooltipProvider>
			<div className="flex flex-grow flex-col gap-4 h-full max-h-full overflow-hidden w-full">
				{/* Header Section */}
				<div className="flex flex-col gap-4 px-4 pt-4">
					<div className="flex flex-row items-center justify-between">
						<div className="flex flex-col gap-1">
							<h2 className="text-2xl font-semibold tracking-tight">Storage</h2>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Badge variant="secondary" className="px-2 py-1">
									{fileCount} files
								</Badge>
								<Badge variant="secondary" className="px-2 py-1">
									{folderCount} folders
								</Badge>
							</div>
						</div>
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
												setSortOrder(sortBy === "name" && sortOrder === "asc" ? "desc" : "asc");
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
												setSortOrder(sortBy === "date" && sortOrder === "asc" ? "desc" : "asc");
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
												setSortOrder(sortBy === "size" && sortOrder === "asc" ? "desc" : "asc");
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
												setSortOrder(sortBy === "type" && sortOrder === "asc" ? "desc" : "asc");
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
										onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
									>
										{viewMode === "grid" ? <ListIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
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
										onClick={() => uploadFile(prefix, false)}
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
										onClick={() => uploadFile(prefix, true)}
									>
										<FolderPlusIcon className="h-4 w-4" />
										Upload Folder
									</Button>
								</TooltipTrigger>
								<TooltipContent>Upload entire folder</TooltipContent>
							</Tooltip>
						</div>
					</div>

					{files.length > 0 && (
						<>
							<StorageBreadcrumbs
								appId={appId}
								prefix={prefix}
								updatePrefix={(prefix) => updatePrefix(prefix)}
							/>

							<div className="relative">
								<SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Search files and folders..."
									className="pl-10"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
						</>
					)}
				</div>

				<Separator />

				{/* Content Section */}
				{files.length === 0 && (
					<div className="flex flex-col h-full w-full flex-grow relative px-4">
						<EmptyState
							className="w-full h-full max-w-full border-2 border-dashed border-muted-foreground/25 rounded-lg"
							title="No Files Found"
							description="Get started by uploading your first files or folders to this storage space"
							action={[
								{
									label: "Upload Files",
									onClick: () => uploadFile(prefix, false),
								},
								{
									label: "Upload Folder",
									onClick: () => uploadFile(prefix, true),
								},
							]}
							icons={[LayoutGridIcon, FilesIcon, LinkIcon]}
						/>
					</div>
				)}

				{files.length > 0 && (
					<div className="flex flex-col gap-4 flex-grow max-h-full h-full overflow-y-hidden px-4 pb-4">
						{preview.url !== "" && (
							<ResizablePanelGroup
								direction="horizontal"
								autoSaveId={"file_viewer"}
								className="border rounded-lg"
							>
								<ResizablePanel className="flex flex-col gap-2 flex-grow overflow-y-auto max-h-full h-full p-4 bg-background">
									<div key={sortBy} className="flex flex-col flex-grow max-h-full h-full overflow-auto gap-2">
										<h3 className="font-medium text-sm text-muted-foreground mb-2">Files & Folders</h3>
										{sortedFiles.map((file) => (
											<FileOrFolder
												highlight={preview.file === file.location}
												key={file.location}
												file={file}
												changePrefix={(new_prefix) =>
													updatePrefix(`${prefix}/${new_prefix}`)
												}
												loadFile={(file) => loadFile(file)}
												deleteFile={(file) => {
													const filePrefix = `${prefix}/${file}`;
													deleteFile(filePrefix);
												}}
												shareFile={(file) => {
													const filePrefix = `${prefix}/${file}`;
													shareFile(filePrefix);
												}}
												downloadFile={downloadFile}
											/>
										))}
									</div>
								</ResizablePanel>
								<ResizableHandle className="mx-2" />
								<ResizablePanel className="flex flex-col gap-2 flex-grow overflow-y-hidden max-h-full h-full p-4 bg-background">
									<div className="flex flex-col flex-grow overflow-auto max-h-full h-full bg-muted/50 rounded-md border">
										<div className="p-2 border-b bg-background rounded-t-md">
											<h3 className="font-medium text-sm">Preview</h3>
										</div>
										<div className="flex-grow overflow-auto">
											<FilePreviewer url={preview.url} page={2} />
										</div>
									</div>
								</ResizablePanel>
							</ResizablePanelGroup>
						)}
						{preview.url === "" && (
							<div className="flex flex-col flex-grow max-h-full h-full overflow-auto gap-2 border rounded-lg p-4 bg-background">
								<h3 className="font-medium text-sm text-muted-foreground mb-2">Files & Folders</h3>
								<div className={`grid gap-2 ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"}`}>
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
											deleteFile={(file) => {
												const filePrefix = `${prefix}/${file}`;
												deleteFile(filePrefix);
											}}
											shareFile={(file) => {
												const filePrefix = `${prefix}/${file}`;
												shareFile(filePrefix);
											}}
											downloadFile={downloadFile}
										/>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</TooltipProvider>
	);
}