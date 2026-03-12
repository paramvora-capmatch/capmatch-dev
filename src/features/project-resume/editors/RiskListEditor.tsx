"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { cn } from "@/utils/cn";

function normalizeItems(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((item) => {
			if (item != null && typeof item === "object" && !Array.isArray(item)) {
				const o = item as Record<string, unknown>;
				return String(o.risk ?? o.text ?? o.value ?? JSON.stringify(item));
			}
			return String(item);
		});
	}
	if (typeof value === "string") {
		return value
			.split(/[,\n]/)
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return [];
}

export interface RiskListEditorProps {
	value: unknown;
	onChange: (value: string[]) => void;
	disabled: boolean;
	fieldId: string;
	sectionId: string;
	title: string;
	required: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

export function RiskListEditor({
	value,
	onChange,
	disabled,
	fieldId,
	title,
	required,
	fieldMetadata,
	lockButton,
	className,
}: RiskListEditorProps): React.ReactElement {
	const items = normalizeItems(value);
	const displayItems = items.length > 0 ? items : [""];

	const handleItemChange = (index: number, newValue: string) => {
		const next = [...items];
		next[index] = newValue;
		onChange(next);
	};

	const handleAddItem = () => {
		onChange([...items, ""]);
	};

	const handleRemoveItem = (index: number) => {
		const next = [...items];
		next.splice(index, 1);
		onChange(next);
	};

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
			<div className="space-y-2">
				{displayItems.map((item, idx) => (
					<div
						key={idx}
						className="flex items-center gap-2"
					>
						<input
							type="text"
							className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
							value={item}
							onChange={(e) =>
								handleItemChange(idx, e.target.value)
							}
							disabled={disabled}
							placeholder="Enter risk item"
						/>
						<button
							type="button"
							onClick={() => handleRemoveItem(idx)}
							disabled={disabled || items.length <= 1}
							className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
						>
							Remove
						</button>
					</div>
				))}
				<button
					type="button"
					onClick={handleAddItem}
					disabled={disabled}
					className="text-xs px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50"
				>
					Add Item
				</button>
			</div>
		</div>
	);
}
