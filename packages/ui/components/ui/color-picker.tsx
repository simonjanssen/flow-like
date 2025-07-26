"use client";

import { useMemo } from "react";
import { HexAlphaColorPicker } from "react-colorful";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface ColorPickerProps {
	value: string;
	open?: boolean;
	onChange: (value: string) => void;
	onBlur?: () => void;
	onOpenChange?: (open: boolean) => void;
	name?: string;
	className?: string;
	disabled?: boolean;
}

function ColorPicker({
	disabled,
	value,
	onChange,
	onBlur,
	name,
	className,
	open,
	onOpenChange,
	...props
}: Readonly<ColorPickerProps>) {
	const parsedValue = useMemo(() => value || "#FFFFFFFF", [value]);

	return (
		<Popover onOpenChange={onOpenChange} open={open}>
			<PopoverTrigger asChild disabled={disabled} onBlur={onBlur}>
				<Button
					{...props}
					className={cn("block", className)}
					name={name}
					onClick={() => onOpenChange?.(true)}
					size="icon"
					style={{ backgroundColor: parsedValue }}
					variant="outline"
				>
					<div />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full gap-4 flex flex-col">
				<HexAlphaColorPicker color={parsedValue} onChange={onChange} />
				<Input
					className="w-full max-w-[200px]"
					maxLength={9}
					onChange={(e) => onChange(e.currentTarget.value)}
					value={parsedValue}
				/>
			</PopoverContent>
		</Popover>
	);
}

ColorPicker.displayName = "ColorPicker";

export { ColorPicker };
