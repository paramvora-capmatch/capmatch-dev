"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

const ALL_USE_TYPES = [
	"landAcquisition",
	"baseConstruction",
	"contingency",
	"constructionFees",
	"aeFees",
	"developerFee",
	"interestReserve",
	"workingCapital",
	"opDeficitEscrow",
	"leaseUpEscrow",
	"ffe",
	"thirdPartyReports",
	"legalAndOrg",
	"titleAndRecording",
	"taxesDuringConstruction",
	"loanFees",
	"relocationCosts",
	"syndicationCosts",
	"enviroRemediation",
	"pfcStructuringFee",
] as const;

function formatUseTypeLabel(key: string): string {
	return key
		.replace(/([A-Z])/g, " $1")
		.replace(/^./, (str) => str.toUpperCase())
		.trim();
}

export interface CapitalUseTimingEditorProps {
	value: Record<string, string> | null;
	onChange: (value: Record<string, string>) => void;
	disabled: boolean;
	fieldId: string;
	sectionId: string;
	title: string;
	required: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

export function CapitalUseTimingEditor({
	value,
	onChange,
	disabled,
	fieldId,
	title,
	required,
	fieldMetadata,
	lockButton,
	className,
}: CapitalUseTimingEditorProps): React.ReactElement {
	const data =
		value && typeof value === "object" && !Array.isArray(value)
			? value
			: {};
	const useTypes = Object.keys(data);
	const displayRows =
		useTypes.length > 0
			? useTypes.map((useType) => ({
					useType,
					timing: data[useType] ?? "",
			  }))
			: [{ useType: "", timing: "" }];

	const handleChange = (useType: string, raw: string) => {
		const trimmed = raw.trim();
		onChange({
			...data,
			[useType]: trimmed || undefined,
		} as Record<string, string>);
	};

	const handleAddRow = () => {
		const unusedType = ALL_USE_TYPES.find((type) => !(type in data));
		if (unusedType) {
			onChange({ ...data, [unusedType]: "" });
		}
	};

	const handleRemoveRow = (useType: string) => {
		const updated = { ...data };
		delete updated[useType];
		onChange(updated);
	};

	const handleTypeChange = (oldType: string, newType: string) => {
		if (!newType) return;
		const updated = { ...data };
		if (oldType) delete updated[oldType];
		updated[newType] = (oldType ? data[oldType] : "") ?? "";
		onChange(updated);
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
								Use Type
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Timing
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-100">
						{displayRows.map((row, idx) => (
							<tr key={row.useType || idx}>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									{row.useType ? (
										<span>
											{formatUseTypeLabel(row.useType)}
										</span>
									) : (
										<select
											className="w-48 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
											value={row.useType}
											onChange={(e) =>
												handleTypeChange(
													row.useType,
													e.target.value
												)
											}
											disabled={disabled}
										>
											<option value="">
												Select Use Type
											</option>
											{ALL_USE_TYPES.filter(
												(type) =>
													!(type in data) ||
													type === row.useType
											).map((type) => (
												<option
													key={type}
													value={type}
												>
													{formatUseTypeLabel(type)}
												</option>
											))}
										</select>
									)}
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="text"
										className="w-40 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.timing ?? ""}
										onChange={(e) =>
											handleChange(
												row.useType,
												e.target.value
											)
										}
										disabled={disabled || !row.useType}
										placeholder="Months 1-24"
									/>
								</td>
								<td className="px-3 py-2 text-right align-middle">
									<Button
										type="button"
										variant="ghost"
										size="sm"
										onClick={() =>
											handleRemoveRow(row.useType)
										}
										disabled={
											disabled ||
											!row.useType ||
											useTypes.length <= 1
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
									disabled={
										disabled ||
										useTypes.length >= ALL_USE_TYPES.length
									}
									className="text-xs px-3 py-1"
								>
									Add Use Type
								</Button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
