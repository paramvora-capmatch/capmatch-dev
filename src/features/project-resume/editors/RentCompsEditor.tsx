"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

export interface RentCompRow {
	propertyName?: string;
	address?: string;
	distance?: number;
	yearBuilt?: number;
	totalUnits?: number;
	occupancyPercent?: number;
	avgRentMonth?: number;
	rentPSF?: number;
}

export interface RentCompsEditorProps {
	value: RentCompRow[];
	onChange: (value: RentCompRow[]) => void;
	disabled: boolean;
	fieldId: string;
	sectionId: string;
	title: string;
	required: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

const NUMERIC_KEYS = [
	"distance",
	"yearBuilt",
	"totalUnits",
	"occupancyPercent",
	"avgRentMonth",
	"rentPSF",
] as const;

export function RentCompsEditor({
	value,
	onChange,
	disabled,
	fieldId,
	title,
	required,
	fieldMetadata,
	lockButton,
	className,
}: RentCompsEditorProps): React.ReactElement {
	const rows = Array.isArray(value) ? value : [];
	const displayRows = rows.length > 0 ? rows : [{}];

	const handleRowChange = (
		index: number,
		key: keyof RentCompRow,
		raw: string
	) => {
		const next = [...rows];
		const current = next[index] || {};
		let v: string | number | undefined = raw;
		if (
			NUMERIC_KEYS.includes(key as (typeof NUMERIC_KEYS)[number])
		) {
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
				propertyName: "",
				address: "",
				distance: undefined,
				yearBuilt: undefined,
				totalUnits: undefined,
				occupancyPercent: undefined,
				avgRentMonth: undefined,
				rentPSF: undefined,
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
								Property Name
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Address
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Distance (mi)
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Year Built
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Units
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Occupancy %
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Avg Rent/Month
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Rent/PSF
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-100">
						{displayRows.map((row, idx) => (
							<tr key={idx}>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="text"
										className="w-40 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.propertyName ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"propertyName",
												e.target.value
											)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="text"
										className="w-56 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.address ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"address",
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
										step="0.01"
										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.distance ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"distance",
												e.target.value
											)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="number"
										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.yearBuilt ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"yearBuilt",
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
										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.totalUnits ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"totalUnits",
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
										step="0.1"
										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.occupancyPercent ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"occupancyPercent",
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
										value={row.avgRentMonth ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"avgRentMonth",
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
										step="0.01"
										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={row.rentPSF ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"rentPSF",
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
								colSpan={9}
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
