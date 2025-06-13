import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { saveParseInt } from "../../../lib/save-parse";
import type { IVariable } from "../../../lib/schema/flow/variable";
import {
	convertJsonToUint8Array,
	parseUint8ArrayToJson,
} from "../../../lib/uint8";

export function IntegerVariable({
	disabled,
	variable,
	onChange,
}: Readonly<{
	disabled?: boolean;
	variable: IVariable;
	onChange: (variable: IVariable) => void;
}>) {
	return (
		<div className="grid w-full items-center gap-1.5">
			<Label htmlFor="default_value">Default Value</Label>
			<Input
				disabled={disabled}
				value={parseUint8ArrayToJson(variable.default_value)}
				onChange={(e) => {
					onChange({
						...variable,
						default_value: convertJsonToUint8Array(
							saveParseInt(variable, e.target.value),
						),
					});
				}}
				type={variable.secret ? "password" : "number"}
				id="default_value"
				placeholder="Default Value"
				step={1}
			/>
		</div>
	);
}
