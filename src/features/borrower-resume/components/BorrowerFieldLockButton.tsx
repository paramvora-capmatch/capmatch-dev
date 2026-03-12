"use client";

import React from "react";
import { Lock, Unlock } from "lucide-react";
import { cn } from "@/utils/cn";

export interface BorrowerFieldLockButtonProps {
	fieldId: string;
	sectionId?: string;
	locked: boolean;
	hasValue: boolean;
	hasWarnings: boolean;
	onClick: (fieldId: string) => void;
	className?: string;
}

/**
 * Lock/unlock button for a single borrower resume field.
 * Disabled when empty (and not locked) or when field has warnings.
 */
export function BorrowerFieldLockButton({
	fieldId,
	locked,
	hasValue,
	hasWarnings,
	onClick,
	className,
}: BorrowerFieldLockButtonProps): React.ReactElement {
	const isDisabled = (!hasValue && !locked) || hasWarnings;
	const tooltipTitle = isDisabled
		? hasWarnings
			? "Cannot lock a field with warnings. Please resolve warnings first."
			: "Cannot lock an empty field. Please fill in a value first."
		: locked
			? "Unlock field"
			: "Lock field";

	return (
		<div className={cn("flex items-center", className)} title={tooltipTitle}>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					e.preventDefault();
					if (isDisabled) return;
					onClick(fieldId);
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
