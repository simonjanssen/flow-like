"use client";
import { Check } from "lucide-react";
import { Progress } from "../../ui";
import type { ICreationStep } from "./create-page";

export function StepIndicator({
	steps,
	currentStepIndex,
	onStepClick,
}: Readonly<{
	steps: ICreationStep[];
	currentStepIndex: number;
	onStepClick: (index: number) => void;
}>) {
	return (
		<div className="mb-8">
			{/* Mobile: Vertical layout */}
			<div className="sm:hidden space-y-4">
				<div className="text-center">
					<div className="text-lg font-semibold">
						{steps[currentStepIndex].title}
					</div>
					<div className="text-sm text-muted-foreground">
						{steps[currentStepIndex].description}
					</div>
				</div>
				<div className="flex justify-center space-x-2">
					{steps.map((_, index) => (
						<StepDot
							key={index}
							index={index}
							currentStepIndex={currentStepIndex}
							onClick={() => index <= currentStepIndex && onStepClick(index)}
						/>
					))}
				</div>
			</div>

			{/* Desktop: Horizontal layout */}
			<div className="hidden sm:flex items-center justify-between">
				{steps.map((step, index) => (
					<StepItem
						key={step.id}
						step={step}
						index={index}
						currentStepIndex={currentStepIndex}
						onStepClick={onStepClick}
						isLast={index === steps.length - 1}
					/>
				))}
			</div>
		</div>
	);
}

function StepDot({
	index,
	currentStepIndex,
	onClick,
}: Readonly<{
	index: number;
	currentStepIndex: number;
	onClick: () => void;
}>) {
	const isActive = index === currentStepIndex;
	const isCompleted = index < currentStepIndex;
	const isClickable = index <= currentStepIndex;

	return (
		<button
			className={`w-3 h-3 rounded-full transition-all duration-200 ${
				isCompleted
					? "bg-primary"
					: isActive
						? "bg-primary"
						: "bg-muted-foreground/30"
			} ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}`}
			onClick={isClickable ? onClick : undefined}
			disabled={!isClickable}
		/>
	);
}

function StepItem({
	step,
	index,
	currentStepIndex,
	onStepClick,
	isLast,
}: Readonly<{
	step: ICreationStep;
	index: number;
	currentStepIndex: number;
	onStepClick: (index: number) => void;
	isLast: boolean;
}>) {
	const isActive = index === currentStepIndex;
	const isCompleted = index < currentStepIndex;
	const isClickable = index <= currentStepIndex;

	return (
		<div className="flex items-center flex-1">
			<button
				className={`flex flex-col items-center space-y-2 ${
					isClickable ? "cursor-pointer" : "cursor-not-allowed"
				}`}
				onClick={() => isClickable && onStepClick(index)}
				disabled={!isClickable}
			>
				<div
					className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
						isCompleted
							? "bg-primary border-primary text-primary-foreground"
							: isActive
								? "border-primary text-primary bg-primary/10"
								: "border-muted-foreground/30 text-muted-foreground"
					}`}
				>
					{isCompleted ? (
						<Check className="h-5 w-5" />
					) : (
						<step.icon className="h-5 w-5" />
					)}
				</div>
				<div className="text-center">
					<div
						className={`text-sm font-medium ${
							isActive
								? "text-primary"
								: isCompleted
									? "text-foreground"
									: "text-muted-foreground"
						}`}
					>
						{step.title}
					</div>
					<div className="text-xs text-muted-foreground">
						{step.description}
					</div>
				</div>
			</button>
		</div>
	);
}

export function ProgressBar({ percentage }: Readonly<{ percentage: number }>) {
	return (
		<div className="w-full">
			<Progress value={percentage} className="h-1" />
		</div>
	);
}
