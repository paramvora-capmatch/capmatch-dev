"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export interface CommercialSpaceMixRow {
	spaceType?: string;
	squareFootage?: number;
	tenant?: string;
	leaseTerm?: string;
	annualRent?: number;
}

export interface CommercialSpaceMixEditorProps {
	value: CommercialSpaceMixRow[];
	onChange: (value: CommercialSpaceMixRow[]) => void;
	disabled: boolean;
	fieldId: string;
	sectionId: string;
	title: string;
	required: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

export function CommercialSpaceMixEditor({
	value,
	onChange,
	disabled,
	fieldId,
	title,
	required,
	fieldMetadata,
	lockButton,
	className,
}: CommercialSpaceMixEditorProps): React.ReactElement {
	const rows = Array.isArray(value) ? value : [];
	const displayRows = rows.length > 0 ? rows : [{}];

	const handleRowChange = (
		index: number,
		key:
			| "spaceType"
			| "squareFootage"
			| "tenant"
			| "leaseTerm"
			| "annualRent",
		raw: string
	) => {
		const next = [...rows];
		const current = next[index] || {};
		let v: string | number | undefined = raw;
		if (["squareFootage", "annualRent"].includes(key)) {
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
			{
				spaceType: "",
				squareFootage: undefined,
				tenant: "",
				leaseTerm: "",
				annualRent: undefined,
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
								Space Type
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Square Footage
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Tenant
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Lease Term
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Annual Rent
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
										value={row.spaceType ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"spaceType",
												e.target.value
											)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="number"
										min={0}
										className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.squareFootage ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"squareFootage",
												e.target.value
											)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="text"
										className="w-36 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.tenant ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"tenant",
												e.target.value
											)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="text"
										className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.leaseTerm ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"leaseTerm",
												e.target.value
											)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="number"
										min={0}
										className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.annualRent ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"annualRent",
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
								colSpan={6}
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
