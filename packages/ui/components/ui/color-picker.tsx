"use client";

import { useMemo, useState } from "react";
import { HexAlphaColorPicker, HexColorPicker } from "react-colorful";
import { useForwardedRef } from "../../lib/use-forwarded-ref";
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
}

const ColorPicker = (
    {
        ref: forwardedRef,
        disabled,
        value,
        onChange,
        onBlur,
        name,
        className,
        ...props
    }
) => {
    const ref = useForwardedRef(forwardedRef);
    const parsedValue = useMemo(() => {
        return value || "#FFFFFFFF";
    }, [value]);

    return (
        <Popover onOpenChange={props.onOpenChange} open={props.open}>
            <PopoverTrigger asChild disabled={disabled} onBlur={onBlur}>
                <Button
                    {...props}
                    className={cn("block", className)}
                    name={name}
                    onClick={() => {
                        props.onOpenChange?.(true);
                    }}
                    size="icon"
                    style={{
                        backgroundColor: parsedValue,
                    }}
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
                    onChange={(e) => {
                        onChange(e?.currentTarget?.value);
                    }}
                    ref={ref}
                    value={parsedValue}
                />
            </PopoverContent>
        </Popover>
    );
};
ColorPicker.displayName = "ColorPicker";

export { ColorPicker };
