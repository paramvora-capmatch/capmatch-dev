"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export interface SensitivityAnalysisValue {
	rentGrowthImpact?: { growth?: string; irr?: number }[];
	constructionCostImpact?: { cost?: string; irr?: number }[];
}

export interface SensitivityAnalysisEditorProps {
	value: SensitivityAnalysisValue | null;
	onChange: (value: SensitivityAnalysisValue) => void;
	disabled: boolean;
	fieldId: string;
	sectionId: string;
	title: string;
	required: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

export function SensitivityAnalysisEditor({
	value,
	onChange,
	disabled,
	fieldId,
	title,
	required,
	fieldMetadata,
	lockButton,
	className,
}: SensitivityAnalysisEditorProps): React.ReactElement {
	const data =
		value && typeof value === "object" && !Array.isArray(value)
			? value
			: {};
	const rentRows = Array.isArray(data.rentGrowthImpact)
		? data.rentGrowthImpact
		: [];
	const costRows = Array.isArray(data.constructionCostImpact)
		? data.constructionCostImpact
		: [];
	const rentDisplay = rentRows.length > 0 ? rentRows : [{}];
	const costDisplay = costRows.length > 0 ? costRows : [{}];

	const updateRent = (next: { growth?: string; irr?: number }[]) => {
		onChange({ ...data, rentGrowthImpact: next });
	};
	const updateCost = (next: { cost?: string; irr?: number }[]) => {
		onChange({ ...data, constructionCostImpact: next });
	};

	const handleRentChange = (
		index: number,
		key: "growth" | "irr",
		raw: string
	) => {
		const next = [...rentRows];
		const current = next[index] || {};
		let v: string | number | undefined = raw;
		if (key === "irr") {
			v = raw.trim() === "" ? undefined : Number(raw);
			if (typeof v === "number" && Number.isNaN(v)) v = undefined;
		}
		next[index] = { ...current, [key]: v };
		updateRent(next);
	};
	const handleCostChange = (
		index: number,
		key: "cost" | "irr",
		raw: string
	) => {
		const next = [...costRows];
		const current = next[index] || {};
		let v: string | number | undefined = raw;
		if (key === "irr") {
			v = raw.trim() === "" ? undefined : Number(raw);
			if (typeof v === "number" && Number.isNaN(v)) v = undefined;
		}
		next[index] = { ...current, [key]: v };
		updateCost(next);
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
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<h5 className="text-xs font-medium text-gray-700 mb-2">
						Rent Growth Impact
					</h5>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
										Growth
									</th>
									<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
										IRR
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-100">
								{rentDisplay.map((row, idx) => (
									<tr key={idx}>
										<td className="px-3 py-2 align-middle">
											<input
												type="text"
												className="w-full max-w-[120px] rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
												value={row.growth ?? ""}
												onChange={(e) =>
													handleRentChange(
														idx,
														"growth",
														e.target.value
													)
												}
												disabled={disabled}
											/>
										</td>
										<td className="px-3 py-2 align-middle">
											<div className="flex items-center gap-1">
												<input
													type="number"
													className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
													value={row.irr ?? ""}
													onChange={(e) =>
														handleRentChange(
															idx,
															"irr",
															e.target.value
														)
													}
													disabled={disabled}
												/>
												<span className="text-gray-500">%</span>
											</div>
										</td>
										<td className="px-3 py-2 text-right align-middle">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => {
													const next = [...rentRows];
													next.splice(idx, 1);
													updateRent(next);
												}}
												disabled={
													disabled ||
													rentRows.length <= 1
												}
												className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
											>
												Remove
											</Button>
										</td>
									</tr>
								))}
								<tr>
									<td colSpan={3} className="px-3 pt-3">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												updateRent([
													...rentRows,
													{ growth: "", irr: undefined },
												])
											}
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
				<div>
					<h5 className="text-xs font-medium text-gray-700 mb-2">
						Construction Cost Impact
					</h5>
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200 text-sm">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
										Cost Change
									</th>
									<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
										IRR
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-100">
								{costDisplay.map((row, idx) => (
									<tr key={idx}>
										<td className="px-3 py-2 align-middle">
											<input
												type="text"
												className="w-full max-w-[120px] rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
												value={row.cost ?? ""}
												onChange={(e) =>
													handleCostChange(
														idx,
														"cost",
														e.target.value
													)
												}
												disabled={disabled}
											/>
										</td>
										<td className="px-3 py-2 align-middle">
											<div className="flex items-center gap-1">
												<input
													type="number"
													className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
													value={row.irr ?? ""}
													onChange={(e) =>
														handleCostChange(
															idx,
															"irr",
															e.target.value
														)
													}
													disabled={disabled}
												/>
												<span className="text-gray-500">%</span>
											</div>
										</td>
										<td className="px-3 py-2 text-right align-middle">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => {
													const next = [...costRows];
													next.splice(idx, 1);
													updateCost(next);
												}}
												disabled={
													disabled ||
													costRows.length <= 1
												}
												className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
											>
												Remove
											</Button>
										</td>
									</tr>
								))}
								<tr>
									<td colSpan={3} className="px-3 pt-3">
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() =>
												updateCost([
													...costRows,
													{ cost: "", irr: undefined },
												])
											}
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
			</div>
		</div>
	);
}
