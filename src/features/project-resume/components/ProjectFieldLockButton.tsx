"use client";

import React from "react";
import { Lock, Unlock } from "lucide-react";
import { cn } from "@/utils/cn";

export interface ProjectFieldLockButtonProps {
	fieldId: string;
	locked: boolean;
	hasValue: boolean;
	hasWarnings: boolean;
	onToggleLock: (fieldId: string) => void;
}

/**
 * Lock/unlock button for a single project resume field.
 * Disabled when empty (and not locked) or when field has warnings.
 */
export function ProjectFieldLockButton({
	fieldId,
	locked,
	hasValue,
	hasWarnings,
	onToggleLock,
}: ProjectFieldLockButtonProps): React.ReactElement {
	const isDisabled = (!hasValue && !locked) || hasWarnings;
	const tooltipTitle = isDisabled
		? hasWarnings
			? "Cannot lock a field with warnings. Please resolve warnings first."
			: "Cannot lock an empty field. Please fill in a value first."
		: locked
			? "Unlock field"
			: "Lock field";

	return (
		<div className="flex items-center" title={tooltipTitle}>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					e.preventDefault();
					if (isDisabled) return;
					onToggleLock(fieldId);
				}}
				disabled={isDisabled}
				className={cn(
					"flex items-center justify-center p-1 rounded transition-colors z-10",
					isDisabled
						? "cursor-not-allowed text-gray-300"
						: "cursor-pointer",
					locked
						? "text-emerald-600 hover:text-emerald-700"
						: "text-gray-400 hover:text-blue-600"
				)}
			>
				{locked ? (
					<Lock className="h-4 w-4" />
				) : (
					<Unlock className="h-4 w-4" />
				)}
			</button>
		</div>
	);
}
