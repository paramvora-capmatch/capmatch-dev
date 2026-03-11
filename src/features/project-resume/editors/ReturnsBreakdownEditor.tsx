"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { cn } from "@/utils/cn";

export interface ReturnsBreakdownValue {
	cashFlow?: number;
	assetAppreciation?: number;
	taxBenefits?: number;
	leverage?: number;
}

export interface ReturnsBreakdownEditorProps {
	value: ReturnsBreakdownValue | null;
	onChange: (value: ReturnsBreakdownValue) => void;
	disabled: boolean;
	fieldId: string;
	sectionId: string;
	title: string;
	required: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

const ROWS: { key: keyof ReturnsBreakdownValue; label: string }[] = [
	{ key: "cashFlow", label: "Cash Flow" },
	{ key: "assetAppreciation", label: "Asset Appreciation" },
	{ key: "taxBenefits", label: "Tax Benefits" },
	{ key: "leverage", label: "Leverage" },
];

export function ReturnsBreakdownEditor({
	value,
	onChange,
	disabled,
	fieldId,
	title,
	required,
	fieldMetadata,
	lockButton,
	className,
}: ReturnsBreakdownEditorProps): React.ReactElement {
	const data = value && typeof value === "object" && !Array.isArray(value)
		? value
		: {};

	const handleChange = (key: keyof ReturnsBreakdownValue, raw: string) => {
		const v =
			raw.trim() === "" ? undefined : Number(raw);
		const num = typeof v === "number" && !Number.isNaN(v) ? v : undefined;
		onChange({ ...data, [key]: num });
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
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200 text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Component
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Percentage
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-100">
						{ROWS.map(({ key, label }) => (
							<tr key={key}>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									{label}
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<div className="flex items-center gap-1">
										<input
											type="number"
											min={0}
											max={100}
											step="0.1"
											className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
											value={data[key] ?? ""}
											onChange={(e) =>
												handleChange(
													key,
													e.target.value
												)
											}
											disabled={disabled}
										/>
										<span className="text-gray-500">%</span>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
