import { useEffect, useState } from "react";
import { IValueType } from "../../../lib/schema/flow/pin";
import {
	type IVariable,
	IVariableType,
} from "../../../lib/schema/flow/variable";
import { BoolArrayVariable } from "./bool-array-variable";
import { BoolSetVariable } from "./bool-set-variable";
import { BoolVariable } from "./bool-variable";
import { DateArrayVariable } from "./date-array-variable";
import { DateSetVariable } from "./date-set-variable";
import { DateVariable } from "./date-variable";
import { FloatArrayVariable } from "./float-array-variable";
import { FloatSetVariable } from "./float-set-variable";
import { FloatVariable } from "./float-variable";
import { IntegerArrayVariable } from "./integer-array-variable";
import { IntegerSetVariable } from "./integer-set-variable";
import { IntegerVariable } from "./integer-variable";
import { PathbufArrayVariable } from "./pathbuf-array-variable";
import { PathbufSetVariable } from "./pathbuf-set-variable";
import { PathbufVariable } from "./pathbuf-variable";
import { StringArrayVariable } from "./string-array-variable";
import { StringSetVariable } from "./string-set-variable";
import { StringVariable } from "./string-variable";

export function VariablesMenuEdit({
	variable,
	updateVariable,
}: Readonly<{
	variable: IVariable;
	updateVariable: (variable: IVariable) => Promise<void>;
}>) {
	const [intermediateValue, setIntermediateValue] = useState(variable);

	useEffect(() => {
		if (intermediateValue === variable) return;
		updateVariable(intermediateValue);
	}, [intermediateValue]);

	if (
		variable.data_type === IVariableType.String &&
		variable.value_type === IValueType.Normal
	) {
		return (
			<StringVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.String &&
		variable.value_type === IValueType.Array
	) {
		return (
			<StringArrayVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.String &&
		variable.value_type === IValueType.HashSet
	) {
		return (
			<StringSetVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Boolean &&
		variable.value_type === IValueType.Normal
	) {
		return (
			<BoolVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Boolean &&
		variable.value_type === IValueType.Array
	) {
		return (
			<BoolArrayVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Boolean &&
		variable.value_type === IValueType.HashSet
	) {
		return (
			<BoolSetVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Date &&
		variable.value_type === IValueType.Normal
	) {
		return (
			<DateVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Date &&
		variable.value_type === IValueType.Array
	) {
		return (
			<DateArrayVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Date &&
		variable.value_type === IValueType.HashSet
	) {
		return (
			<DateSetVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Float &&
		variable.value_type === IValueType.Normal
	) {
		return (
			<FloatVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Float &&
		variable.value_type === IValueType.Array
	) {
		return (
			<FloatArrayVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Float &&
		variable.value_type === IValueType.HashSet
	) {
		return (
			<FloatSetVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Integer &&
		variable.value_type === IValueType.Normal
	) {
		return (
			<IntegerVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Integer &&
		variable.value_type === IValueType.Array
	) {
		return (
			<IntegerArrayVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.Integer &&
		variable.value_type === IValueType.HashSet
	) {
		return (
			<IntegerSetVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.PathBuf &&
		variable.value_type === IValueType.Normal
	) {
		return (
			<PathbufVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.PathBuf &&
		variable.value_type === IValueType.Array
	) {
		return (
			<PathbufArrayVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	if (
		variable.data_type === IVariableType.PathBuf &&
		variable.value_type === IValueType.HashSet
	) {
		return (
			<PathbufSetVariable
				variable={intermediateValue}
				onChange={setIntermediateValue}
			/>
		);
	}

	return null;
}
