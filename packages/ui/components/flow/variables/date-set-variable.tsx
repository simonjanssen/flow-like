import { format } from "date-fns";
import { CalendarIcon, PlusCircleIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "../../..";
import { Calendar } from "../../../components/ui/calendar";
import type { ISystemTime } from "../../../lib/schema/flow/board";
import type { IVariable } from "../../../lib/schema/flow/variable";
import {
	convertJsonToUint8Array,
	parseUint8ArrayToJson,
} from "../../../lib/uint8";
import {
	Button,
	Input,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Separator,
} from "../../ui";

export function DateSetVariable({
	disabled,
	variable,
	onChange,
}: Readonly<{
	disabled?: boolean;
	variable: IVariable;
	onChange: (v: IVariable) => void;
}>) {
	// parse once per render
	const parsedTimes = useMemo<ISystemTime[]>(() => {
		const p = parseUint8ArrayToJson(variable.default_value);
		return Array.isArray(p) ? p : [];
	}, [variable.default_value]);

	// convert to Date[]
	const values = useMemo<Date[]>(
		() => parsedTimes.map((t) => new Date(t.secs_since_epoch * 1000)),
		[parsedTimes],
	);

	// state for the “new” entry
	const [newDate, setNewDate] = useState<Date>(new Date());
	const [newTime, setNewTime] = useState<string>(format(newDate, "HH:mm"));

	// keep time input in sync if calendar changes
	useEffect(() => {
		setNewTime(format(newDate, "HH:mm"));
	}, [newDate]);

	const handleAdd = useCallback(() => {
		if (disabled || !newDate || !newTime) return;
		const [hrs, mins] = newTime.split(":").map((n) => Number.parseInt(n, 10));
		const dt = new Date(
			newDate.getFullYear(),
			newDate.getMonth(),
			newDate.getDate(),
			hrs,
			mins,
		);
		const newSys: ISystemTime = {
			secs_since_epoch: Math.floor(dt.getTime() / 1000),
			nanos_since_epoch: dt.getTime() * 1_000_000,
		};
		const updated = [...parsedTimes, newSys];
		onChange({
			...variable,
			default_value: convertJsonToUint8Array(Array.from(new Set(updated))),
		});
	}, [newDate, newTime, parsedTimes, variable, onChange]);

	const handleRemove = useCallback(
		(idx: number) => {
			if (disabled) return;
			const updated = parsedTimes.filter((_, i) => i !== idx);
			onChange({
				...variable,
				default_value: convertJsonToUint8Array(Array.from(new Set(updated))),
			});
		},
		[parsedTimes, variable, onChange],
	);

	return (
		<div className="flex flex-col gap-2">
			{/* pick new date + time */}
			<div className="flex items-center gap-2 sticky top-0 bg-background pb-2">
				<Popover>
					<PopoverTrigger disabled={disabled} asChild>
						<Button
							disabled={disabled}
							variant={"outline"}
							className={cn(
								"w-full pl-3 text-left font-normal",
								!newDate && "text-muted-foreground",
							)}
						>
							{newDate ? (
								format(newDate, "PPP") + " - " + newTime
							) : (
								<span>Pick a date</span>
							)}
							<CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-2">
						<div className="flex flex-col items-center space-x-2 gap-2">
							<div className="flex flex-row items-center gap-2">
								<p className="text-nowrap">Time:</p>
								<Input
									disabled={disabled}
									type="time"
									value={newTime}
									onChange={(e) => setNewTime(e.target.value)}
								/>
							</div>
							<Calendar
								disabled={disabled}
								showOutsideDays
								ISOWeek
								captionLayout="dropdown"
								mode="single"
								selected={newDate}
								onSelect={(date) => {
									setNewDate(date ?? new Date());
								}}
								className="w-full"
							/>
						</div>
					</PopoverContent>
				</Popover>
				<Button
					disabled={disabled}
					size="icon"
					variant="default"
					onClick={handleAdd}
				>
					<PlusCircleIcon className="w-4 h-4" />
				</Button>
			</div>

			<Separator className="mb-2" />

			{/* existing dates */}
			{values.map((dt, idx) => (
				<div
					key={`${dt.toString()}-${idx}`}
					className="flex justify-between items-center border p-1"
				>
					<span className="px-2">
						{format(dt, "PPP")} – {format(dt, "HH:mm")}
					</span>
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
