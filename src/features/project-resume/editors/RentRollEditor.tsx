"use client";

import React from "react";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import { Button } from "@/components/ui/Button";
import { X, Plus } from "lucide-react";
import { cn } from "@/utils/cn";

export interface RentRollUnitRow {
	unitNumber?: string;
	unitType?: string;
	beds?: number;
	baths?: number;
	sf?: number;
	status?: string;
	tenantName?: string;
	monthlyRent?: number;
	recurringCharges?: number;
	leaseStart?: string;
	leaseEnd?: string;
	nextRentIncreaseDate?: string;
	nextRentIncreaseAmount?: number;
}

const NUMERIC_KEYS = [
	"beds",
	"baths",
	"sf",
	"monthlyRent",
	"recurringCharges",
	"nextRentIncreaseAmount",
] as const;

export interface RentRollEditorProps {
	value: RentRollUnitRow[];
	onChange: (value: RentRollUnitRow[]) => void;
	disabled: boolean;
	fieldId: string;
	sectionId: string;
	title: string;
	required: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

export function RentRollEditor({
	value,
	onChange,
	disabled,
	fieldId,
	title,
	required,
	fieldMetadata,
	lockButton,
	className,
}: RentRollEditorProps): React.ReactElement {
	const rows = Array.isArray(value) ? value : [];
	const displayRows = rows.length > 0 ? rows : [{}];

	const totalUnits = rows.length;
	const occupied = rows.filter((u) => u.status === "Occupied").length;
	const vacant = rows.filter((u) => u.status === "Vacant").length;
	const occupancy = totalUnits > 0 ? (occupied / totalUnits) * 100 : 0;
	const totalRent = rows.reduce((acc, u) => {
		const rent =
			typeof u.monthlyRent === "string"
				? parseFloat(String(u.monthlyRent).replace(/[^0-9.]/g, ""))
				: (u.monthlyRent || 0);
		return acc + (Number.isNaN(rent) ? 0 : rent);
	}, 0);
	const avgRent = totalUnits > 0 ? totalRent / totalUnits : 0;

	const handleRowChange = (
		index: number,
		key: string,
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
				unitNumber: "",
				unitType: "",
				beds: undefined,
				baths: undefined,
				sf: undefined,
				status: "",
				tenantName: "",
				monthlyRent: undefined,
				recurringCharges: undefined,
				leaseStart: "",
				leaseEnd: "",
				nextRentIncreaseDate: "",
				nextRentIncreaseAmount: undefined,
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

			<div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
				<div className="bg-gray-50 p-2 rounded-md border border-gray-100">
					<div className="text-[10px] text-gray-400 uppercase font-semibold">
						Total Units
					</div>
					<div className="text-sm font-bold text-gray-700">
						{totalUnits}
					</div>
				</div>
				<div className="bg-gray-50 p-2 rounded-md border border-gray-100">
					<div className="text-[10px] text-gray-400 uppercase font-semibold">
						Occupied
					</div>
					<div className="text-sm font-bold text-gray-700">
						{occupied}
					</div>
				</div>
				<div className="bg-gray-50 p-2 rounded-md border border-gray-100">
					<div className="text-[10px] text-gray-400 uppercase font-semibold">
						Vacant
					</div>
					<div className="text-sm font-bold text-gray-700">
						{vacant}
					</div>
				</div>
				<div className="bg-gray-50 p-2 rounded-md border border-gray-100">
					<div className="text-[10px] text-gray-400 uppercase font-semibold">
						Occupancy
					</div>
					<div className="text-sm font-bold text-gray-700">
						{occupancy.toFixed(1)}%
					</div>
				</div>
				<div className="bg-gray-50 p-2 rounded-md border border-gray-100">
					<div className="text-[10px] text-gray-400 uppercase font-semibold">
						Total Rent
					</div>
					<div className="text-sm font-bold text-gray-700">
						${totalRent.toLocaleString()}
					</div>
				</div>
				<div className="bg-gray-50 p-2 rounded-md border border-gray-100">
					<div className="text-[10px] text-gray-400 uppercase font-semibold">
						Avg Rent
					</div>
					<div className="text-sm font-bold text-gray-700">
						$
						{avgRent.toLocaleString(undefined, {
							maximumFractionDigits: 0,
						})}
					</div>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200 text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Unit #
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Type
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Beds / Baths
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								SF
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Status
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Tenant
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Rent
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Rent/SF
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Recurring Charges
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Term
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Next Increase
							</th>
							<th className="px-3 py-2" />
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-100">
						{displayRows.map((row, idx) => (
							<tr key={idx}>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="text"
										className="w-16 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
										value={row.unitNumber ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"unitNumber",
												e.target.value
											)
										}
										disabled={disabled}
										placeholder="101"
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="text"
										className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
										value={row.unitType ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"unitType",
												e.target.value
											)
										}
										disabled={disabled}
										placeholder="1B/1B"
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<div className="flex items-center gap-1">
										<input
											type="number"
											className="w-12 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
											value={row.beds ?? ""}
											onChange={(e) =>
												handleRowChange(
													idx,
													"beds",
													e.target.value
												)
											}
											disabled={disabled}
											placeholder="Beds"
										/>
										<span className="text-gray-400">/</span>
										<input
											type="number"
											className="w-12 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
											value={row.baths ?? ""}
											onChange={(e) =>
												handleRowChange(
													idx,
													"baths",
													e.target.value
												)
											}
											disabled={disabled}
											placeholder="Baths"
										/>
									</div>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="number"
										className="w-16 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
										value={row.sf ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"sf",
												e.target.value
											)
										}
										disabled={disabled}
										placeholder="SF"
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<select
										className="rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
										value={row.status ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"status",
												e.target.value
											)
										}
										disabled={disabled}
									>
										<option value="">Select</option>
										<option value="Occupied">Occupied</option>
										<option value="Vacant">Vacant</option>
										<option value="Model">Model</option>
										<option value="Down">Down</option>
									</select>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<input
										type="text"
										className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
										value={row.tenantName ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"tenantName",
												e.target.value
											)
										}
										disabled={disabled}
										placeholder="Tenant Name"
									/>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<div className="flex items-center gap-1">
										<span className="text-gray-500">$</span>
										<input
											type="number"
											className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
											value={row.monthlyRent ?? ""}
											onChange={(e) =>
												handleRowChange(
													idx,
													"monthlyRent",
													e.target.value
												)
											}
											disabled={disabled}
											placeholder="Rent"
										/>
									</div>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<div className="text-sm text-gray-500 font-medium">
										{row.monthlyRent != null &&
										row.sf != null &&
										row.sf > 0
											? `$${(row.monthlyRent / row.sf).toFixed(2)}`
											: "N/A"}
									</div>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<div className="flex items-center gap-1">
										<span className="text-gray-500">$</span>
										<input
											type="number"
											className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
											value={row.recurringCharges ?? ""}
											onChange={(e) =>
												handleRowChange(
													idx,
													"recurringCharges",
													e.target.value
												)
											}
											disabled={disabled}
											placeholder="Charges"
										/>
									</div>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<div className="flex flex-col gap-1">
										<input
											type="date"
											className="w-32 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
											value={row.leaseStart ?? ""}
											onChange={(e) =>
												handleRowChange(
													idx,
													"leaseStart",
													e.target.value
												)
											}
											disabled={disabled}
										/>
										<input
											type="date"
											className="w-32 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
											value={row.leaseEnd ?? ""}
											onChange={(e) =>
												handleRowChange(
													idx,
													"leaseEnd",
													e.target.value
												)
											}
											disabled={disabled}
										/>
									</div>
								</td>
								<td className="px-3 py-2 whitespace-nowrap align-middle">
									<div className="flex flex-col gap-1">
										<input
											type="date"
											className="w-32 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
											value={
												row.nextRentIncreaseDate ?? ""
											}
											onChange={(e) =>
												handleRowChange(
													idx,
													"nextRentIncreaseDate",
													e.target.value
												)
											}
											disabled={disabled}
										/>
										<div className="flex items-center gap-1">
											<span className="text-[10px] text-gray-500">$</span>
											<input
												type="number"
												className="w-24 rounded-md border border-gray-200 px-1 py-0.5 text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
												value={
													row.nextRentIncreaseAmount ??
													""
												}
												onChange={(e) =>
													handleRowChange(
														idx,
														"nextRentIncreaseAmount",
														e.target.value
													)
												}
												disabled={disabled}
												placeholder="Amount"
											/>
										</div>
									</div>
								</td>
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
									colSpan={12}
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
										Add Unit
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
