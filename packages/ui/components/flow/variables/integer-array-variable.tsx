import { PlusCircleIcon, Trash2Icon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Input } from "../../../components/ui/input";
import type { IVariable } from "../../../lib/schema/flow/variable";
import {
	convertJsonToUint8Array,
	parseUint8ArrayToJson,
} from "../../../lib/uint8";
import { Button, Separator } from "../../ui";

export function IntegerArrayVariable({
	disabled,
	variable,
	onChange,
}: Readonly<{
	disabled?: boolean;
	variable: IVariable;
	onChange: (variable: IVariable) => void;
}>) {
	const [newValue, setNewValue] = useState("");

	// parse once per render
	const values = useMemo<number[]>(() => {
		const parsed = parseUint8ArrayToJson(variable.default_value);
		if (!Array.isArray(parsed)) return [];
		return parsed.map((v) => {
			const n = Number.parseInt(String(v), 10);
			return Number.isNaN(n) ? 0 : n;
		});
	}, [variable.default_value]);

	// add a new integer
	const handleAdd = useCallback(() => {
		if (disabled) return;
		const trimmed = newValue.trim();
		if (!trimmed) return;
		const num = Number.parseInt(trimmed, 10);
		if (Number.isNaN(num)) return;
		const updated = [...values, num];
		onChange({
			...variable,
			default_value: convertJsonToUint8Array(updated),
		});
		setNewValue("");
	}, [disabled, newValue, values, onChange, variable]);

	// remove by index
	const handleRemove = useCallback(
		(index: number) => {
			if (disabled) return;
			const updated = values.filter((_, i) => i !== index);
			onChange({
				...variable,
				default_value: convertJsonToUint8Array(updated),
			});
		},
		[disabled, values, onChange, variable],
	);

	return (
		<div className="grid w-full items-center gap-1.5">
			<div className="flex flex-row gap-2 items-center w-full sticky top-0">
				<Input
					value={newValue}
					onChange={(e) => setNewValue(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleAdd()}
					type={variable.secret ? "password" : "number"}
					placeholder="Add integer"
					step={1}
				/>
				<Button
					size="icon"
					variant="default"
					onClick={handleAdd}
					disabled={
						newValue.trim() === "" || disabled || Number.isNaN(Number(newValue))
					}
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
						disabled={disabled}
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
