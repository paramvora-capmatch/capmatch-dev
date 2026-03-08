"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { FieldWarningsTooltip } from "@/components/ui/FieldWarningsTooltip";

export interface ProjectFieldLabelRowProps {
	fieldId: string;
	labelText: string;
	required?: boolean;
	hasWarnings: boolean;
	warningMessages?: string[] | null;
	fieldWrapperRef?: React.RefObject<HTMLDivElement>;
	fieldMetadataItem?: Record<string, unknown> | null;
	onAskAI?: (fieldId: string) => void;
	lockButton: React.ReactNode;
}

/**
 * Label row for a project resume field: label, required asterisk,
 * help tooltip, optional warnings tooltip, Ask AI button, and lock button.
 */
export function ProjectFieldLabelRow({
	fieldId,
	labelText,
	required = false,
	hasWarnings,
	warningMessages,
	fieldWrapperRef,
	fieldMetadataItem,
	onAskAI,
	lockButton,
}: ProjectFieldLabelRowProps): React.ReactElement {
	return (
		<div className="mb-1">
			<label className="flex text-sm font-medium text-gray-700 items-center gap-2 relative group/field w-full">
				<span>
					{labelText}
					{required && (
						<span className="text-red-500 ml-1">*</span>
					)}
				</span>
				<FieldHelpTooltip
					fieldId={fieldId}
					fieldMetadata={fieldMetadataItem}
				/>
				{hasWarnings && fieldWrapperRef && (
					<FieldWarningsTooltip
						warnings={warningMessages ?? undefined}
						triggerRef={fieldWrapperRef}
						showIcon={true}
					/>
				)}
				<div className="ml-auto flex items-center gap-1">
					<button
						type="button"
						onClick={() => (onAskAI ?? (() => {}))(fieldId)}
						className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-medium text-blue-600 opacity-0 group-hover/field:opacity-100 transition-opacity"
					>
						Ask AI
					</button>
					{lockButton}
				</div>
			</label>
		</div>
	);
}
