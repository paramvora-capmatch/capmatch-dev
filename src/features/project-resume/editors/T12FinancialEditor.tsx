"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { T12FinancialTable } from "@/components/project/T12FinancialTable";
import type { T12FinancialData } from "@/types/t12-financial";
import { cn } from "@/utils/cn";

export interface T12FinancialEditorProps {
	value: T12FinancialData | null;
	onChange: (value: T12FinancialData) => void;
	disabled: boolean;
	fieldId: string;
	sectionId: string;
	title: string;
	required: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

export function T12FinancialEditor({
	value,
	onChange,
	disabled,
	fieldId,
	title,
	required,
	fieldMetadata,
	lockButton,
	className,
}: T12FinancialEditorProps): React.ReactElement {
	return (
		<div className={cn(className, "p-4")}>
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
						{title}
					</h4>
					{required && (
						<span className="text-red-500 ml-1">*</span>
					)}
					<FieldHelpTooltip
						fieldId={fieldId}
						fieldMetadata={fieldMetadata ?? undefined}
					/>
				</div>
				<div className="flex items-center gap-1">{lockButton}</div>
			</div>
			<T12FinancialTable
				data={value}
				onChange={onChange}
				editable={!disabled}
			/>
		</div>
	);
}
