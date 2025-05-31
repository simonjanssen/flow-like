"use client";
import type { UseQueryResult } from "@tanstack/react-query";
import {
	CameraIcon,
	DownloadCloudIcon,
	FileIcon,
	FileSearch,
	ImageIcon,
	MessagesSquareIcon,
	Package2Icon,
	PackageCheckIcon,
	ScanEyeIcon,
	UniversityIcon,
	WorkflowIcon,
} from "lucide-react";
import { type JSX, useState } from "react";
import { Progress } from "../../components/ui/progress";
import { useInvoke } from "../../hooks/use-invoke";
import { Bit, Download, type IDownloadProgress } from "../../lib/bit/bit";
import { type IBit, IBitTypes } from "../../lib/schema/bit/bit";
import { humanFileSize } from "../../lib/utils";
import { useBackend } from "../../state/backend-state";
import { useDownloadManager } from "../../state/download-manager";
import type { ISettingsProfile } from "../../types";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";
import { BentoGridItem } from "./bento-grid";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./dropdown-menu";

export function BitCard({
	bit,
	wide = false,
}: Readonly<{ bit: IBit; wide: boolean }>) {
	const backend = useBackend();
	const { download } = useDownloadManager();

	const [progress, setProgress] = useState<undefined | number>();
	const isInstalled: UseQueryResult<boolean> = useInvoke(
		backend.isBitInstalled,
		[bit],
	);
	const bitSize: UseQueryResult<number> = useInvoke(backend.getBitSize, [bit]);
	const currentProfile: UseQueryResult<ISettingsProfile> = useInvoke(
		backend.getSettingsProfile,
		[],
	);

	async function downloadBit(bit: IBit) {
		console.dir(bit);
		await download(bit, (dl) => {
			setProgress(dl.progress() * 100);
		});
		await isInstalled.refetch();
		setProgress(undefined);
	}

	async function toggleDownload() {
		if (isInstalled.data) {
			console.log("Deleting Bit");
			await backend.deleteBit(bit);
			await isInstalled.refetch();
			return;
		}

		await downloadBit(bit);
	}

	if (bit.meta["en"] === undefined) return null;

	return (
		<div
			className={`${wide ? "md:col-span-2 z-10" : "z-10"} focus:outline-none`}
			data-testid={"box"}
		>
			<DropdownMenu>
				<DropdownMenuTrigger className="relative w-full h-full text-start group">
					<BentoGridItem
						className={`h-full w-full overflow-x-hidden ${isInstalled.data && currentProfile.data?.hub_profile.bits.find((b) => b[1] === bit.id) && "!border-[#84cc16]"}`}
						title={
							<div className="flex flex-row items-center text-nowrap text-start">
								<p className="max-w-[60%] overflow-hidden text-ellipsis">
									{bit.meta.en.name}
								</p>{" "}
								<Badge variant={"outline"} className="ml-2">
									{isInstalled ? (
										<PackageCheckIcon
											color={"#84cc16"}
											size={15}
											className="mr-1"
										/>
									) : (
										<DownloadCloudIcon
											color="#db2777"
											size={15}
											className="mr-1"
										/>
									)}{" "}
									{humanFileSize(bitSize.data ?? 0)}
								</Badge>
							</div>
						}
						description={
							<div className="h-20 max-h-20 overflow-x-hidden overflow-y-hidden line-clamp-5">
								{bit.meta.en.description}
							</div>
						}
						header={
							<div>
								{progress && <Progress className="mb-2" value={progress} />}
								<div className="flex flex-row items-center justify-between">
									<div className="rounded-full w-14 h-14 flex items-center">
										<Avatar className="border bg-card z-10 overflow-hidden">
											<AvatarImage
												className="p-1 transition-transform duration-200 ease-in-out transform scale-110 group-hover:scale-150 rounded-full"
												src={bit.meta?.en?.icon ?? "/app-logo.webp"}
											/>
											<AvatarFallback>NA</AvatarFallback>
										</Avatar>
										<div className="flex flex-row items-center gap-2 flex-nowrap border-r border-t border-b p-[0.2rem] pl-4 pr-2 py-1 rounded-md translate-x-[-10px] justify-center w-full bg-background min-w-fit">
											<TypeToIcon type={bit.type} />
											<p className="whitespace-nowrap delay-0 group-hover:delay-200 max-w-0 group-hover:max-w-xs group-hover:w-fit transition-all duration-300 ease-in-out transform translate-x-[-100%] opacity-0 group-hover:translate-x-0 group-hover:opacity-100">
												{bitTypeToText(bit.type)}
											</p>
										</div>
									</div>
									{bit.repository?.startsWith("https://huggingface.co/") && (
										<img
											src={"/hf-logo.png"}
											width={25}
											height={25}
											alt="Huggingface Logo"
										/>
									)}
								</div>
							</div>
						}
						icon={
							<div className="text-left text-nowrap text-ellipsis max-w-full overflow-hidden flex flex-row items-center gap-2">
								{bit.meta.en.tags.map((category) => (
									<Badge variant="outline" key={category}>
										{category}
									</Badge>
								))}
							</div>
						}
					/>
					{isInstalled.data && (
						<div className="absolute bottom-0 right-0 bg-[#84cc16] w-8 h-8 p-2 flex flex-row items-center justify-center rounded-br-xl rounded-tl-xl">
							<PackageCheckIcon />
						</div>
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent>
					{(bit.type === "Embedding" ||
						bit.type === "ImageEmbedding" ||
						bit.type === "Vlm" ||
						bit.type === "Llm") && (
						<DropdownMenuItem
							onClick={async () => {
								const profile = currentProfile.data;
								if (!profile) return;
								const bitIndex = profile.hub_profile.bits.findIndex(
									([hub, id]) => id === bit.id,
								);
								if (bitIndex === -1) {
									await downloadBit(bit);
									await backend.addBit(bit, profile);
									await currentProfile.refetch();
									return;
								}

								await backend.removeBit(bit, profile);
								await currentProfile.refetch();
							}}
						>
							{(currentProfile.data?.hub_profile.bits || []).findIndex(
								([hub, b]) => bit.id === b,
							) > -1
								? "Remove from Profile"
								: "Add to Profile"}
						</DropdownMenuItem>
					)}
					<DropdownMenuItem
						onClick={async () => {
							toggleDownload();
						}}
					>
						{isInstalled.data ? "Delete" : "Download"}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					{bit.repository && (
						<DropdownMenuItem
							onClick={() => {
								if (bit.repository) open(bit.repository);
							}}
						>
							Open Repository
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

export function TypeToIcon({
	type,
	className,
}: { type: IBitTypes; className?: string }): JSX.Element | null {
	const combinedClass =
		"min-h-5 min-w-5 h-5 w-5 text-foreground" +
		(className ? ` ${className}` : "");
	switch (type) {
		case IBitTypes.Llm:
			return <MessagesSquareIcon className={combinedClass} />;
		case IBitTypes.Vlm:
			return <CameraIcon className={combinedClass} />;
		case IBitTypes.Embedding:
			return <FileSearch className={combinedClass} />;
		case IBitTypes.ImageEmbedding:
			return <ScanEyeIcon className={combinedClass} />;
		case IBitTypes.File:
			return <FileIcon className={combinedClass} />;
		case IBitTypes.Media:
			return <ImageIcon className={combinedClass} />;
		case IBitTypes.Template:
			return <WorkflowIcon className={combinedClass} />;
		case IBitTypes.Course:
			return <UniversityIcon className={combinedClass} />;
	}

	return <Package2Icon className={combinedClass} />;
}

export function bitTypeToText(bitType: IBitTypes): string {
	// Example name is PreprocessorConfig. We need to add a space before each capital letter except the first one.
	return bitType.replace(/([A-Z])/g, (match, letter, index) =>
		index === 0 ? letter : ` ${letter}`,
	);
}
