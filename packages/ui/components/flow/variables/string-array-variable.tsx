import { PlusCircleIcon, Trash2Icon } from "lucide-react";
import React, { useState, useMemo, useCallback } from "react";
import { Input } from "../../../components/ui/input";
import type { IVariable } from "../../../lib/schema/flow/variable";
import {
	convertJsonToUint8Array,
	parseUint8ArrayToJson,
} from "../../../lib/uint8";
import { Button, Separator } from "../../ui";

export function StringArrayVariable({
	variable,
	onChange,
}: Readonly<{ variable: IVariable; onChange: (variable: IVariable) => void }>) {
	const [newValue, setNewValue] = useState("");

	// parse once per render
	const values = useMemo<string[]>(() => {
		const parsed = parseUint8ArrayToJson(variable.default_value);
		return Array.isArray(parsed) ? parsed : [];
	}, [variable.default_value]);

	// add a new item
	const handleAdd = useCallback(() => {
		const trimmed = newValue.trim();
		if (!trimmed) return;
		const updated = [...values, trimmed];
		onChange({
			...variable,
			default_value: convertJsonToUint8Array(updated),
		});
		setNewValue("");
	}, [newValue, values, onChange, variable]);

	// remove an item by index
	const handleRemove = useCallback(
		(index: number) => {
			const updated = values.filter((_, i) => i !== index);
			onChange({
				...variable,
				default_value: convertJsonToUint8Array(updated),
			});
		},
		[values, onChange, variable],
	);

	return (
		<div className="grid w-full max-w-sm items-center gap-1.5">
			<div className="flex flex-row gap-2 items-center w-full sticky top-0 bg-background">
				<Input
					value={newValue}
					onChange={(e) => setNewValue(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleAdd()}
					type={variable.secret ? "password" : "text"}
					placeholder="Default Value"
				/>
				<Button
					size="icon"
					variant="default"
					onClick={handleAdd}
					disabled={!newValue.trim()}
				>
					<PlusCircleIcon className="w-4 h-4" />
				</Button>
			</div>

			<Separator className="my-2" />

			{values.map((value, idx) => (
				<div
					key={`${variable.name}-${idx}`}
					className="flex flex-row gap-2 items-center w-full justify-between border p-1"
				>
					<p className="px-2 truncate">{value}</p>
					<Button
						size="icon"
						variant="destructive"
						onClick={() => handleRemove(idx)}
					>
						<Trash2Icon className="w-4 h-4" />
					</Button>
				</div>
			))}
		</div>
	);
}
