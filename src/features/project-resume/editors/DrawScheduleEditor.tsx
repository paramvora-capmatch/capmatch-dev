"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export interface DrawScheduleRow {
	drawNumber?: number;
	percentComplete?: number;
	amount?: number;
}

export interface DrawScheduleEditorProps {
	value: DrawScheduleRow[];
	onChange: (value: DrawScheduleRow[]) => void;
	disabled: boolean;
	fieldId: string;
	sectionId: string;
	title: string;
	required: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

export function DrawScheduleEditor({
	value,
	onChange,
	disabled,
	fieldId,
	title,
	required,
	fieldMetadata,
	lockButton,
	className,
}: DrawScheduleEditorProps): React.ReactElement {
	const rows = Array.isArray(value) ? value : [];
	const displayRows = rows.length > 0 ? rows : [{}];

	const handleRowChange = (
		index: number,
		key: "drawNumber" | "percentComplete" | "amount",
		raw: string
	) => {
		const next = [...rows];
		const current = next[index] || {};
		const v =
			raw.trim() === "" ? undefined : Number(raw);
		next[index] = {
			...current,
			[key]: typeof v === "number" && !Number.isNaN(v) ? v : undefined,
		};
		onChange(next);
	};

	const handleAddRow = () => {
		onChange([
			...rows,
			{
				drawNumber: (rows.length || 0) + 1,
				percentComplete: undefined,
				amount: undefined,
			},
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
								Draw #
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								% Complete
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Amount
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-100">
						{displayRows.map((row, idx) => (
							<tr key={idx}>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="number"
										min={1}
										className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.drawNumber ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"drawNumber",
												e.target.value
											)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<div className="flex items-center gap-1">
										<input
											type="number"
											min={0}
											max={100}
											className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
											value={row.percentComplete ?? ""}
											onChange={(e) =>
												handleRowChange(
													idx,
													"percentComplete",
													e.target.value
												)
											}
											disabled={disabled}
										/>
										<span className="text-gray-500">%</span>
									</div>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<div className="flex items-center gap-1">
										<span className="text-gray-500">$</span>
										<input
											type="number"
											min={0}
											className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
											value={row.amount ?? ""}
											onChange={(e) =>
												handleRowChange(
													idx,
													"amount",
													e.target.value
												)
											}
											disabled={disabled}
										/>
									</div>
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
								colSpan={4}
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
