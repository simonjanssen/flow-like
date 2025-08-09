"use client";

import { ChevronLeft, ChevronRight, Rocket, Settings } from "lucide-react";
import { Button } from "../../ui";

export function StepNavigation({
	isFirstStep,
	isLastStep,
	canProceed,
	isCreating,
	onBack,
	onNext,
}: Readonly<{
	isFirstStep: boolean;
	isLastStep: boolean;
	canProceed: boolean;
	isCreating: boolean;
	onBack: () => void;
	onNext: () => void;
}>) {
	return (
		<div className="flex justify-between items-center">
			<Button
				variant="outline"
				onClick={onBack}
				disabled={isFirstStep || isCreating}
				className="flex items-center gap-2"
			>
				<ChevronLeft className="h-4 w-4" />
				Back
			</Button>

			<Button
				onClick={onNext}
				disabled={!canProceed || isCreating}
				className="flex items-center gap-2 min-w-[120px]"
			>
				{isCreating ? (
					<>
						<Settings className="h-4 w-4 animate-spin" />
						Creating...
					</>
				) : isLastStep ? (
					<>
						<Rocket className="h-4 w-4" />
						Create App
					</>
				) : (
					<>
						Next
						<ChevronRight className="h-4 w-4" />
					</>
				)}
			</Button>
		</div>
	);
}
