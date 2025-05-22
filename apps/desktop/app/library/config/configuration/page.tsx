"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
	type IBoard,
	IValueType,
	type IVariable,
	type IVariableType,
	Label,
	Separator,
	VariablesMenuEdit,
	upsertVariableCommand,
	useBackend,
	useInvalidateInvoke,
	useInvoke,
} from "@tm9657/flow-like-ui";
import { typeToColor } from "@tm9657/flow-like-ui/components/flow/utils";
import { parseUint8ArrayToJson } from "@tm9657/flow-like-ui/lib/uint8";
import {
	EllipsisVerticalIcon,
	GripIcon,
	ListIcon,
	WorkflowIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

export default function Id() {
	const backend = useBackend();
	const searchParams = useSearchParams();
	const id = searchParams.get("id");
	const app = useInvoke(backend.getApp, [id ?? ""], typeof id === "string");

	const boards = useInvoke(
		backend.getBoards,
		[id ?? ""],
		typeof id === "string",
	);
	const variables = useMemo(() => {
		const vars = (boards.data ?? [])
			.map((board) => {
				return [
					board,
					Object.values(board.variables)
						.filter((variable) => variable.exposed && variable.editable)
						.sort((a, b) => a.name.localeCompare(b.name)),
				];
			})
			.filter(([boards, node]) => node.length > 0)
			.sort((a, b) =>
				(a[0] as IBoard).name.localeCompare((b[0] as IBoard).name),
			) as [IBoard, IVariable[]][];

		return vars;
	}, [boards.data]);

	if (variables.length === 0) {
		return (
			<main className="justify-start flex flex-col items-start w-full flex-1 max-h-full overflow-y-auto flex-grow gap-4">
				<div className="border p-4 rounded-lg bg-card w-full">
					<h4>✅ No Configuration necessary!</h4>
					<p className="mt-1 text-muted-foreground">You are ready to go 🚀</p>
				</div>
			</main>
		);
	}

	return (
		<main className="justify-start flex flex-col items-start w-full flex-1 max-h-full overflow-y-auto flex-grow gap-4 bg-background">
			<h2 className="sticky top-0 bg-background w-full py-2">Configuration</h2>
			{id &&
				app.data?.boards.map((boardId) => (
					<Accordion
						key={boardId}
						type="multiple"
						className="w-full gap-2 flex flex-col"
					>
						<BoardConfig appId={id} boardId={boardId} />
					</Accordion>
				))}
		</main>
	);
}

function BoardConfig({
	appId,
	boardId,
}: Readonly<{
	appId: string;
	boardId: string;
}>) {
	const backend = useBackend();
	const board = useInvoke(backend.getBoard, [appId, boardId]);
	const invalidate = useInvalidateInvoke();

	const upsertVariable = useCallback(
		async (variable: IVariable) => {
			if (!appId) return;

			const command = upsertVariableCommand({
				variable: variable,
			});

			await backend.executeCommand(appId, boardId, command);
			await invalidate(backend.getBoard, [appId, boardId]);
		},
		[appId, boardId, backend, invalidate],
	);

	const exposedVariables = useMemo(() => {
		if (!board.data) return [];
		return Object.values(board.data.variables).filter(
			(variable) => variable.exposed && variable.editable,
		);
	}, [board.data]);

	if (!board.data) return null;
	if (exposedVariables.length === 0) return null;

	return (
		<AccordionItem
			className="rounded-md px-2 w-full max-w-sm bg-background/50 border"
			value={board.data.id}
			key={board.data.id}
		>
			<AccordionTrigger>
				<div className="flex flex-row items-center pl-2 gap-2">
					<WorkflowIcon />
					<h4>{board.data.name}</h4>
				</div>
			</AccordionTrigger>
			<AccordionContent>
				<Separator className="" />
			</AccordionContent>
			{exposedVariables.map((variable) => (
				<AccordionContent
					key={variable.id}
					className="px-2 grid w-full max-w-sm items-center gap-1.5"
				>
					<div className="flex flex-row items-center gap-2">
						<VariableTypeIndicator
							type={variable.value_type}
							valueType={variable.data_type}
						/>
						<Label className="">{variable.name}</Label>
					</div>
					<VariablesMenuEdit
						variable={variable}
						updateVariable={async (variable) => {
							console.log(parseUint8ArrayToJson(variable.default_value));
							await upsertVariable(variable);
						}}
					/>
				</AccordionContent>
			))}
		</AccordionItem>
	);
}

function VariableTypeIndicator({
	type,
	valueType,
}: Readonly<{
	type: IValueType;
	valueType: IVariableType;
}>) {
	switch (type) {
		case IValueType.Normal:
			return (
				<div
					className="min-w-4 w-4 h-2 rounded-full"
					style={{ backgroundColor: typeToColor(valueType) }}
				/>
			);
		case IValueType.Array:
			return (
				<GripIcon
					className="min-w-4 w-4 h-4"
					style={{ color: typeToColor(valueType) }}
				/>
			);
		case IValueType.HashSet:
			return (
				<EllipsisVerticalIcon
					className="min-w-4 w-4 h-4"
					style={{ color: typeToColor(valueType) }}
				/>
			);
		case IValueType.HashMap:
			return (
				<ListIcon
					className="min-w-4 w-4 h-4"
					style={{ color: typeToColor(valueType) }}
				/>
			);
	}

	return <p>{type}</p>;
}
