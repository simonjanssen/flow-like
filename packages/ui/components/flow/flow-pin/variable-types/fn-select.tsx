import { useState } from "react";
import { type IBackendState, useBackend, useInvoke, useReactFlow } from "../../../..";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
} from "../../../../components/ui/select";
import type { IPin } from "../../../../lib/schema/flow/pin";
import {
	convertJsonToUint8Array,
	parseUint8ArrayToJson,
} from "../../../../lib/uint8";

export function FnVariable({
	pin,
	value,
	boardId,
	appId,
	setValue,
}: Readonly<{
	pin: IPin;
	value: number[] | undefined | null;
	boardId: string;
	appId: string;
	setValue: (value: any) => void;
}>) {
	const backend = useBackend();
	const board = useInvoke(backend.boardState.getBoard, backend.boardState, [appId, boardId]);

	return (
		<div className="flex flex-row items-center justify-start">
			<Select
				defaultValue={parseUint8ArrayToJson(value)}
				value={parseUint8ArrayToJson(value)}
				onValueChange={(value) => setValue(convertJsonToUint8Array(value))}
				onOpenChange={async () => {
					// const nodes = flow.getNodes();
				}}
			>
				<SelectTrigger className="w-full p-0 border-0 text-xs text-nowrap text-start max-h-fit h-4">
					<small className="text-nowrap text-start m-0">
						{!board.data && "Loading..."}
						{board.data && (board?.data?.nodes?.[parseUint8ArrayToJson(value)]?.friendly_name ?? "No Function Selected")}
					</small>
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						<SelectLabel>{pin.friendly_name}</SelectLabel>
						{Object.values(board?.data?.nodes ?? {})?.filter(node => node.start).map((node) => {
							return (
								<SelectItem key={node.id} value={node.id}>
									{node.friendly_name ?? node.name}
								</SelectItem>
							);
						})}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
