import { type IPin, IPinType } from "../../../../lib/schema/flow/pin";

export function VariableDescription({ pin }: Readonly<{ pin: IPin }>) {
	return (
		<small
			className={`w-fit text-nowrap ${pin.pin_type === IPinType.Input ? "text-start" : "translate-x-[-95%]"}`}
		>
			{pin.friendly_name}
		</small>
	);
}
