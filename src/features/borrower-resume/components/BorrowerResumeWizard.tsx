"use client";

import React from "react";
import { FormWizard, type Step } from "@/components/ui/FormWizard";

export interface BorrowerResumeWizardProps {
	steps: Step[];
	initialStep?: number;
	onComplete?: () => void;
	onStepChange?: (stepId: string) => void;
}

/**
 * Wizard shell for borrower resume: FormWizard with fixed variant and nav options.
 */
export function BorrowerResumeWizard({
	steps,
	initialStep = 0,
	onComplete,
	onStepChange,
}: BorrowerResumeWizardProps): React.ReactElement {
	return (
		<FormWizard
			steps={steps}
			onComplete={onComplete}
			showProgressBar={false}
			showStepIndicators={false}
			allowSkip
			variant="tabs"
			showBottomNav
			nextButtonLabel="Next"
			initialStep={initialStep}
			onStepChange={onStepChange ? (stepId, _stepIndex) => onStepChange(stepId) : undefined}
		/>
	);
}
