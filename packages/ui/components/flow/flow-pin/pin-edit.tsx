"use client";

import { VariableIcon } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { IValueType } from "../../../lib";
import {
	type IPin,
	IPinType,
	IVariableType,
} from "../../../lib/schema/flow/pin";
import useFlowControlState from "../../../state/flow-control-state";
import { BitVariable } from "./variable-types/bit-select";
import { BooleanVariable } from "./variable-types/boolean-variable";
import { VariableDescription } from "./variable-types/default-text";
import { EnumVariable } from "./variable-types/enum-variable";
import { FnVariable } from "./variable-types/fn-select";

export function PinEdit({
	nodeId,
	pin,
	defaultValue,
	appId,
	boardId,
	changeDefaultValue,
}: Readonly<{
	nodeId: string;
	pin: IPin;
	defaultValue: any;
	appId: string;
	boardId: string;
	changeDefaultValue: (value: any) => void;
}>) {
	const [cachedDefaultValue, setCachedDefaultValue] = useState(defaultValue);

	useEffect(() => {
		changeDefaultValue(cachedDefaultValue);
	}, [cachedDefaultValue]);

	if (pin.pin_type === IPinType.Output)
		return <VariableDescription pin={pin} />;
	if (pin.depends_on.length > 0) return <VariableDescription pin={pin} />;
	if (pin.data_type === IVariableType.Boolean)
		return (
			<BooleanVariable
				pin={pin}
				value={cachedDefaultValue}
				setValue={setCachedDefaultValue}
			/>
		);
	if (
		(pin.options?.valid_values?.length ?? 0) > 0 &&
		pin.data_type === IVariableType.String
	)
		return (
			<EnumVariable
				pin={pin}
				value={cachedDefaultValue}
				setValue={setCachedDefaultValue}
			/>
		);

	if (
		pin.name.startsWith("bit_id") &&
		pin.data_type === IVariableType.String &&
		pin.value_type === IValueType.Normal
	) {
		return (
			<BitVariable
				pin={pin}
				value={cachedDefaultValue}
				appId={appId}
				setValue={setCachedDefaultValue}
			/>
		);
	}

	if (
		pin.name.startsWith("fn_ref") &&
		pin.data_type === IVariableType.String &&
		pin.value_type === IValueType.Normal
	) {
		return (
			<FnVariable
				boardId={boardId}
				pin={pin}
				value={cachedDefaultValue}
				appId={appId}
				setValue={setCachedDefaultValue}
			/>
		);
	}

	return (
		<WithMenu nodeId={nodeId} pin={pin} defaultValue={cachedDefaultValue} />
	);
}

function WithMenuInner({
	nodeId,
	pin,
	defaultValue,
}: Readonly<{
	nodeId: string;
	pin: IPin;
	defaultValue: number[] | undefined | null;
}>) {
	const { editPin } = useFlowControlState();
	return (
		<>
			<VariableDescription pin={pin} />
			<Button
				size={"icon"}
				variant={"ghost"}
				className="w-fit h-fit text-foreground"
				onClick={() => {
					editPin(nodeId, pin);
				}}
			>
				<VariableIcon
					className={`size-[0.45rem] ${(typeof defaultValue === "undefined" || defaultValue === null) && "text-primary"}`}
				/>
			</Button>
		</>
	);
}

const WithMenu = memo(WithMenuInner) as typeof WithMenuInner;
