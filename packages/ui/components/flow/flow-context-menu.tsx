import { SquarePlusIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMiniSearch } from "react-minisearch";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "../../components/ui/context-menu";
import { doPinsMatch } from "../../lib";
import type { INode } from "../../lib/schema/flow/node";
import type { IPin } from "../../lib/schema/flow/pin";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { FlowContextMenuNodes } from "./flow-context-menu-nodes";

export function FlowContextMenu({
	nodes,
	refs,
	children,
	droppedPin,
	onNodePlace,
	onCommentPlace,
	onClose,
}: Readonly<{
	nodes: INode[];
	refs: { [key: string]: string };
	children: React.ReactNode;
	droppedPin?: IPin;
	onNodePlace: (node: INode) => void;
	onCommentPlace: () => void;
	onClose: () => void;
}>) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [filter, setFilter] = useState("");
	const [contextSensitive, setContextSensitive] = useState(true);
	const sortedNodes = useMemo(() => {
		if (!nodes) return [];
		return nodes
			.filter(
				(node) => node.name !== "variable_set" && node.name !== "variable_get",
			)
			.toSorted((a, b) => {
				if (a.friendly_name === b.friendly_name) {
					return a.category.localeCompare(b.category);
				}
				return a.friendly_name.localeCompare(b.friendly_name);
			});
	}, [nodes]);
	const { search, searchResults, addAllAsync, removeAll } =
		useMiniSearch<INode>([], {
			fields: [
				"name",
				"friendly_name",
				"category",
				"description",
				"pin_in_names",
				"pin_out_names",
			],
			storeFields: ["id"],
			searchOptions: {
				fuzzy: true,
				boost: {
					name: 3,
					friendly_name: 2,
					category: 1.5,
					description: 0.75,
					pin_in_names: 1,
					pin_out_names: 1,
				},
			},
		});

	useEffect(() => {
		inputRef.current?.focus();
	}, [filter]);

	useEffect(() => {
		removeAll();
		(async () => {
			if (!nodes) return;
			const allNodes: INode[] = nodes.map((node) => {
				return {
					...node,
					pin_in_names: Object.values(node.pins)
						.filter((pin) => pin.pin_type === "Input")
						.map((pin) => pin.friendly_name),
					pin_out_names: Object.values(node.pins)
						.filter((pin) => pin.pin_type === "Output")
						.map((pin) => pin.friendly_name),
				};
			});
			await addAllAsync(allNodes);
		})();
	}, [sortedNodes]);

	return (
		<ContextMenu
			onOpenChange={(open) => {
				if (!open) {
					onClose();
					setFilter("");
				}
			}}
		>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent className="w-80 max-h-96 overflow-y-hidden overflow-x-hidden">
				<div className="sticky">
					<div className="flex flex-row w-full items-center justify-between bg-accent text-accent-foreground p-1 mb-1">
						<small className="font-bold">Actions</small>
						{droppedPin && (
							<div className="flex flex-row items-center gap-2">
								<div className="grid gap-1.5 leading-none">
									<small>Context Sensitive</small>
								</div>
								<Checkbox
									id="context-sensitive"
									checked={contextSensitive}
									onCheckedChange={(checked) =>
										setContextSensitive(checked.valueOf() as boolean)
									}
								/>
							</div>
						)}
					</div>
					<ContextMenuItem
						className="flex flex-row gap-1 items-center"
						onClick={() => onCommentPlace()}
					>
						<SquarePlusIcon className="w-4 h-4" />
						Comment
					</ContextMenuItem>
					<ContextMenuItem
						className="flex flex-row gap-1 items-center"
						onClick={() => {
							const node_ref = sortedNodes.find(
								(node) => node.name === "events_simple",
							);
							if (node_ref) onNodePlace(node_ref);
						}}
					>
						<SquarePlusIcon className="w-4 h-4" />
						Event
					</ContextMenuItem>
					<Separator className="my-1" />
					<Input
						ref={inputRef}
						className="mb-1"
						autoFocus
						type="search"
						placeholder="Search..."
						value={filter}
						onChange={(e) => {
							setFilter(e.target.value);
							search(e.target.value);
						}}
					/>
				</div>
				<div className="pr-1">
					<ScrollArea
						className="h-52 w-[calc(20rem-0.5rem)] border rounded-md"
						onFocusCapture={() => {
							if (inputRef.current && filter !== "") {
								inputRef.current.focus();
							}
						}}
					>
						{nodes && (
							<FlowContextMenuNodes
								items={
									droppedPin && contextSensitive
										? [
												...(filter === ""
													? sortedNodes
													: (searchResults ?? [])
												).filter((node) => {
													const pins = Object.values(node.pins);
													return pins.some((pin) => {
														if (pin.pin_type === droppedPin.pin_type)
															return false;
														return doPinsMatch(pin, droppedPin, refs);
													});
												}),
											]
										: [...(filter === "" ? sortedNodes : (searchResults ?? []))]
								}
								filter={filter}
								onNodePlace={async (node) => onNodePlace(node)}
							/>
						)}
					</ScrollArea>
				</div>
			</ContextMenuContent>
		</ContextMenu>
	);
}
