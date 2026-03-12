"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { Button } from "@/components/ui/Button";
import { X, Plus } from "lucide-react";
import { cn } from "@/utils/cn";

const NUMERIC_FIELDS = [
	"grossPotentialRent",
	"otherIncome",
	"concessions",
	"badDebt",
	"utilities",
	"realEstateTaxes",
	"insurance",
	"managementFee",
	"payroll",
	"repairsMaintenance",
	"contractServices",
	"marketing",
	"generalAdmin",
	"makeReady",
	"capex",
] as const;

const COLUMN_LABELS: Record<(typeof NUMERIC_FIELDS)[number], string> = {
	grossPotentialRent: "GPR",
	otherIncome: "Other Income",
	concessions: "Concessions",
	badDebt: "Bad Debt",
	utilities: "Utilities",
	realEstateTaxes: "RE Taxes",
	insurance: "Insurance",
	managementFee: "Mgmt Fee",
	payroll: "Payroll",
	repairsMaintenance: "R&M",
	contractServices: "Contract Svc",
	marketing: "Marketing",
	generalAdmin: "G&A",
	makeReady: "Make Ready",
	capex: "CapEx",
};

export interface T12MonthlyDataRow {
	month?: string;
	grossPotentialRent?: number;
	otherIncome?: number;
	concessions?: number;
	badDebt?: number;
	utilities?: number;
	realEstateTaxes?: number;
	insurance?: number;
	managementFee?: number;
	payroll?: number;
	repairsMaintenance?: number;
	contractServices?: number;
	marketing?: number;
	generalAdmin?: number;
	makeReady?: number;
	capex?: number;
}

export interface T12MonthlyDataEditorProps {
	value: T12MonthlyDataRow[];
	onChange: (value: T12MonthlyDataRow[]) => void;
	disabled: boolean;
	fieldId: string;
	sectionId: string;
	title: string;
	required: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

export function T12MonthlyDataEditor({
	value,
	onChange,
	disabled,
	fieldId,
	title,
	required,
	fieldMetadata,
	lockButton,
	className,
}: T12MonthlyDataEditorProps): React.ReactElement {
	const rows = Array.isArray(value) ? value : [];
	const displayRows = rows.length > 0 ? rows : [{}];

	const handleRowChange = (
		index: number,
		key: string,
		raw: string
	) => {
		const next = [...rows];
		const current = next[index] || {};
		let v: string | number | undefined = raw;
		if (NUMERIC_FIELDS.includes(key as (typeof NUMERIC_FIELDS)[number])) {
			v =
				raw.trim() === ""
					? undefined
					: Math.max(0, Number(raw));
			if (typeof v === "number" && Number.isNaN(v)) v = undefined;
		}
		next[index] = { ...current, [key]: v };
		onChange(next);
	};

	const handleAddRow = () => {
		onChange([
			...rows,
			{
				month: "",
				grossPotentialRent: undefined,
				otherIncome: undefined,
				concessions: undefined,
				badDebt: undefined,
				utilities: undefined,
				realEstateTaxes: undefined,
				insurance: undefined,
				managementFee: undefined,
				payroll: undefined,
				repairsMaintenance: undefined,
				contractServices: undefined,
				marketing: undefined,
				generalAdmin: undefined,
				makeReady: undefined,
				capex: undefined,
			},
		]);
	};

	const handleRemoveRow = (index: number) => {
		const next = [...rows];
		next.splice(index, 1);
		onChange(next);
	};

	return (
		<div className={cn(className, "p-4 mt-4")}>
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
								Month
							</th>
							{NUMERIC_FIELDS.map((field) => (
								<th
									key={field}
									className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
								>
									{COLUMN_LABELS[field]}
								</th>
							))}
							<th className="px-3 py-2" />
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-100">
						{displayRows.map((row, idx) => (
							<tr key={idx}>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="text"
										className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
										value={row.month ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"month",
												e.target.value
											)
										}
										disabled={disabled}
										placeholder="Jan-25"
									/>
								</td>
								{NUMERIC_FIELDS.map((field) => (
									<td
										key={field}
										className="px-3 py-2 whitespace-nowrap align-middle"
									>
										<div className="flex items-center gap-1">
											<span className="text-gray-500">$</span>
											<input
												type="number"
												className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
												value={row[field] ?? ""}
												onChange={(e) =>
													handleRowChange(
														idx,
														field,
														e.target.value
													)
												}
												disabled={disabled}
												placeholder="0"
											/>
										</div>
									</td>
								))}
								<td className="px-3 py-2 whitespace-nowrap align-middle text-right">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => handleRemoveRow(idx)}
										disabled={
											disabled || rows.length <= 1
										}
										className="text-red-500 hover:text-red-700 disabled:opacity-30 p-1 h-auto"
									>
										<X className="h-4 w-4" />
									</Button>
								</td>
							</tr>
						))}
						{!disabled && (
							<tr>
								<td
									colSpan={17}
									className="px-3 py-3"
								>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={handleAddRow}
										className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 p-0 h-auto"
									>
										<Plus className="h-4 w-4" />
										Add Month
									</Button>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
