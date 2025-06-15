"use client";

import {
	type Node,
	type NodeProps,
	NodeResizer,
	type ResizeDragEvent,
	type ResizeParams,
	useReactFlow,
} from "@xyflow/react";
import {
	SquareChevronDownIcon,
	SquareChevronUpIcon,
	SquarePenIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "../../components/ui/context-menu";
import type { IComment } from "../../lib/schema/flow/board";
import { Button } from "../ui/button";
import { ColorPicker } from "../ui/color-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { MarkdownComponent } from "../ui/markdown";
import { Textarea } from "../ui/textarea";

export type CommentNode = Node<
	{
		comment: IComment;
		onUpsert: (comment: IComment) => Promise<void>;
		boardId: string;
		appId: string;
		hash: string;
	},
	"commentNode"
>;

export function CommentNode(props: NodeProps<CommentNode>) {
	const { getNodes } = useReactFlow();
	const [edit, setEdit] = useState({
		open: false,
		content: props.data.comment.content,
	});
	const [colorPickerOpen, setColorPickerOpen] = useState(false);
	const [currentColor, setCurrentColor] = useState<string | undefined>(
		props.data.comment.color ?? undefined,
	);

	const onResizeEnd = useCallback(
		async (event: ResizeDragEvent, params: ResizeParams) => {
			const node = getNodes().find((n) => n.id === props.id);
			if (!node) return;
			const comment = node.data.comment as IComment;
			props.data.onUpsert({
				...comment,
				coordinates: [params.x, params.y, props.data.comment.coordinates[2]],
				width: params.width,
				height: params.height,
			});
		},
		[props.data.comment, props.data.onUpsert, props.width, props.height],
	);

	const onColorChosen = useCallback(async () => {
		const node = getNodes().find((n) => n.id === props.id);
		if (!node) return;
		const comment = node.data.comment as IComment;
		props.data.onUpsert({
			...comment,
			color: currentColor,
		});
	}, [
		props.data.comment,
		props.data.onUpsert,
		props.width,
		props.height,
		currentColor,
	]);

	const onMoveLayer = useCallback(
		async (by: number) => {
			const node = getNodes().find((n) => n.id === props.id);
			if (!node) return;
			const comment = node.data.comment as IComment;
			props.data.onUpsert({
				...comment,
				z_index: (props.data.comment.z_index ?? 1) + by,
			});
		},
		[
			props.data.comment,
			props.data.onUpsert,
			props.width,
			props.height,
			currentColor,
		],
	);

	return (
		<>
			<NodeResizer
				color="#ff0071"
				handleStyle={{
					width: 10,
					height: 10,
					zIndex: (props.data.comment.z_index ?? 1) + 1,
				}}
				isVisible={props.selected}
				onResizeEnd={onResizeEnd}
				minWidth={30}
				minHeight={30}
			/>
			<ContextMenu>
				<ContextMenuTrigger>
					<div
						key={`${props.id}__node`}
						className={`bg-card p-1 react-flow__node-default selectable !w-full !h-full focus:ring-2 relative rounded-md !border-0 group opacity-80 ${props.selected && ""}`}
						style={{
							backgroundColor: currentColor,
						}}
					>
						{props.selected && (
							<ColorPicker
								className="z-50 absolute top-0 left-0 border translate-x-[-120%] "
								value={currentColor ?? "#ffffff"}
								onChange={(value) => setCurrentColor(value)}
								open={colorPickerOpen}
								onOpenChange={(open) => {
									setColorPickerOpen(open);
									if (!open) {
										onColorChosen();
									}
								}}
							/>
						)}
						<Dialog
							open={edit.open}
							onOpenChange={(open) => {
								setEdit((old) => ({ ...old, open }));
							}}
						>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Edit Comment</DialogTitle>
									<DialogDescription>
										Edit the text content of the comment.
									</DialogDescription>
								</DialogHeader>
								<Textarea
									rows={6}
									value={edit.content}
									onChange={(e) => {
										setEdit({ ...edit, content: e.target.value });
									}}
								/>
								<Button
									disabled={props.data.comment.content === edit.content}
									onClick={async () => {
										await props.data.onUpsert({
											...props.data.comment,
											content: edit.content,
										});
										setEdit((old) => ({ ...old, open: false }));
									}}
								>
									Save
								</Button>
							</DialogContent>
						</Dialog>
						<div className="text-start">
							<MarkdownComponent
								content={
									props.data.comment.content === ""
										? "Empty Comment"
										: props.data.comment.content
								}
							/>
						</div>
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent className="max-w-20">
					<ContextMenuItem
						className="flex flex-row items-center gap-2"
						onClick={() => {
							setEdit((old) => ({ ...old, open: true }));
						}}
					>
						<SquarePenIcon className="w-4 h-4" />
						Edit
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						className="flex flex-row items-center gap-2"
						onClick={() => {
							onMoveLayer(1);
						}}
					>
						<SquareChevronUpIcon className="w-4 h-4" />
						Move Up
					</ContextMenuItem>
					<ContextMenuItem
						className="flex flex-row items-center gap-2"
						onClick={() => {
							onMoveLayer(-1);
						}}
					>
						<SquareChevronDownIcon className="w-4 h-4" />
						Move Down
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
		</>
	);
}
