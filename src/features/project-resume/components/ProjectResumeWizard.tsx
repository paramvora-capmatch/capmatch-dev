"use client";

import React from "react";
import { FormWizard, Step } from "@/components/ui/FormWizard";

export type { Step };

export interface ProjectResumeWizardProps {
	steps: Step[];
	initialStep: number;
	onComplete: () => void;
	onStepChange?: (stepId: string) => void;
}

/**
 * Wizard view for the project resume form: tabbed steps with bottom nav.
 * Wraps FormWizard with project-resume defaults.
 */
export function ProjectResumeWizard({
	steps,
	initialStep,
	onComplete,
	onStepChange,
}: ProjectResumeWizardProps): React.ReactElement {
	return (
		<FormWizard
			steps={steps}
			onComplete={onComplete}
			showProgressBar={false}
			showStepIndicators={false}
			allowSkip
			variant="tabs"
			showBottomNav
			initialStep={initialStep}
			onStepChange={onStepChange ? (stepId, _stepIndex) => onStepChange(stepId) : undefined}
		/>
	);
}
