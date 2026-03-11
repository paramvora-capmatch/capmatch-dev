"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export interface DeliveryByQuarterRow {
	quarter?: string;
	units?: number;
}

export interface DeliveryByQuarterEditorProps {
	value: DeliveryByQuarterRow[];
	onChange: (value: DeliveryByQuarterRow[]) => void;
	disabled: boolean;
	fieldId: string;
	sectionId: string;
	title: string;
	required: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
	/** Optional placeholder for quarter input (e.g. "Q1 2025") */
	quarterPlaceholder?: string;
}

export function DeliveryByQuarterEditor({
	value,
	onChange,
	disabled,
	fieldId,
	title,
	required,
	fieldMetadata,
	lockButton,
	className,
	quarterPlaceholder,
}: DeliveryByQuarterEditorProps): React.ReactElement {
	const rows = Array.isArray(value) ? value : [];
	const displayRows = rows.length > 0 ? rows : [{}];

	const handleRowChange = (
		index: number,
		key: "quarter" | "units",
		raw: string
	) => {
		const next = [...rows];
		const current = next[index] || {};
		let v: string | number | undefined = raw;
		if (key === "units") {
			v =
				raw.trim() === ""
					? undefined
					: Number(raw);
			if (typeof v === "number" && Number.isNaN(v)) v = undefined;
		}
		next[index] = { ...current, [key]: v };
		onChange(next);
	};

	const handleAddRow = () => {
		onChange([
			...rows,
			{ quarter: "", units: undefined },
		]);
	};

	const handleRemoveRow = (index: number) => {
		const next = [...rows];
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
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200 text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Quarter
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Units
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-100">
						{displayRows.map((row, idx) => (
							<tr key={idx}>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="text"
										className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.quarter ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"quarter",
												e.target.value
											)
										}
										disabled={disabled}
										placeholder={quarterPlaceholder}
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="number"
										min={0}
										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.units ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"units",
												e.target.value
											)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 text-right align-middle">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => handleRemoveRow(idx)}
										disabled={
											disabled || rows.length <= 1
										}
										className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
									>
										Remove
									</Button>
								</td>
							</tr>
						))}
						<tr>
							<td
								colSpan={3}
								className="px-3 pt-3"
							>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={handleAddRow}
									disabled={disabled}
									className="text-xs px-3 py-1"
								>
									Add Row
								</Button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
