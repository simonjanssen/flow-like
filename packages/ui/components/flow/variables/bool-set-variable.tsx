import { PlusCircleIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import type { IVariable } from "../../../lib/schema/flow/variable";
import {
	convertJsonToUint8Array,
	parseUint8ArrayToJson,
} from "../../../lib/uint8";
import { Button, Separator } from "../../ui";

export function BoolSetVariable({
	disabled,
	variable,
	onChange,
}: Readonly<{
	disabled?: boolean;
	variable: IVariable;
	onChange: (variable: IVariable) => void;
}>) {
	const [newValue, setNewValue] = useState(false);

	const currentArray = Array.isArray(
		parseUint8ArrayToJson(variable.default_value),
	)
		? (parseUint8ArrayToJson(variable.default_value) as boolean[])
		: [];

	const addValue = () => {
		if (disabled || newValue === undefined) return;
		const updated = [...currentArray, newValue];
		onChange({
			...variable,
			default_value: convertJsonToUint8Array(Array.from(new Set(updated))),
		});
		setNewValue(false);
	};

	const removeAt = (idx: number) => {
		if (disabled || idx < 0 || idx >= currentArray.length) return;
		const updated = currentArray.slice();
		updated.splice(idx, 1);
		onChange({
			...variable,
			default_value: convertJsonToUint8Array(Array.from(new Set(updated))),
		});
	};

	return (
		<div className="grid w-full max-w-sm items-center gap-1.5">
			<div className="flex flex-row gap-2 items-center w-full sticky top-0 justify-between">
				<div className="flex flex-row gap-2 items-center">
					<Switch
						disabled={disabled}
						checked={newValue}
						onCheckedChange={setNewValue}
						id="new_value"
					/>
					<Label htmlFor="new_value">New Value</Label>
				</div>
				<Button
					disabled={disabled}
					size="icon"
					variant="default"
					onClick={addValue}
				>
					<PlusCircleIcon className="w-4 h-4" />
				</Button>
			</div>
			<Separator className="my-2" />
			{currentArray.map((val, idx) => (
				<div
					key={`${variable.name}-${idx}`}
					className="flex flex-row gap-2 items-center w-full justify-between border p-1"
				>
					<div className="flex items-center gap-1">
						<Switch
							disabled={disabled}
							checked={val}
							onCheckedChange={(v) => {
								const updated = currentArray.slice();
								updated[idx] = v;
								onChange({
									...variable,
									default_value: convertJsonToUint8Array(
										Array.from(new Set(updated)),
									),
								});
							}}
							id={`item-${idx}`}
						/>
						<Label htmlFor={`item-${idx}`}>Index {idx}</Label>
					</div>
					<Button
						disabled={disabled}
						size="icon"
						variant="destructive"
						onClick={() => removeAt(idx)}
					>
						<Trash2Icon className="w-4 h-4" />
					</Button>
				</div>
			))}
		</div>
	);
}
