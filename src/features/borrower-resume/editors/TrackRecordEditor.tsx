"use client";

import React, { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import type { TrackRecordItem } from "@/lib/project-queries";
import { cn } from "@/utils/cn";

export interface TrackRecordEditorProps {
	value: TrackRecordItem[];
	onChange: (value: TrackRecordItem[]) => void;
	disabled?: boolean;
	fieldId: string;
	sectionId?: string;
	title?: string;
	required?: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

const defaultItem = (): TrackRecordItem => ({
	project: "",
	year: undefined,
	units: undefined,
	irr: undefined,
	market: "",
	type: "",
});

function parseNum(raw: string): number | undefined {
	const trimmed = raw.trim();
	if (trimmed === "") return undefined;
	const num = Number(trimmed);
	return Number.isNaN(num) ? undefined : num;
}

/**
 * Table editor for Track Record: Project, Year, Units, IRR, Market, Type, actions.
 * Add/remove rows; number parsing for year, units, irr.
 */
export function TrackRecordEditor({
	value,
	onChange,
	disabled = false,
	fieldId,
	title = "Track Record",
	fieldMetadata,
	lockButton,
	className,
}: TrackRecordEditorProps): React.ReactElement {
	const items = Array.isArray(value) ? value : [];
	const rowsToRender = items.length > 0 ? items : [];

	const handleRowChange = useCallback(
		(index: number, key: keyof TrackRecordItem, raw: unknown) => {
			const next = [...items];
			const current = next[index] ?? ({} as TrackRecordItem);
			let val: unknown = raw;
			if (
				(key === "year" || key === "units" || key === "irr") &&
				typeof raw === "string"
			) {
				val = parseNum(raw);
			}
			next[index] = { ...current, [key]: val };
			onChange(next);
		},
		[items, onChange]
	);

	const handleAdd = useCallback(() => {
		onChange([...items, defaultItem()]);
	}, [items, onChange]);

	const handleRemove = useCallback(
		(index: number) => {
			const next = [...items];
			next.splice(index, 1);
			onChange(next);
		},
		[items, onChange]
	);

	return (
		<div
			className={cn(
				"w-full border rounded-md text-sm transition-colors duration-200 p-4",
				className
			)}
		>
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
						{title}
					</h4>
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
								Project
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Year
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Units
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								IRR
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Market
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Type
							</th>
							<th className="px-3 py-2" />
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-100">
						{rowsToRender.map((item, idx) => (
							<tr key={idx}>
								<td className="px-3 py-2 align-middle">
									<input
										type="text"
										className="w-40 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={item.project ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "project", e.target.value)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<input
										type="number"
										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={item.year ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "year", e.target.value)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<input
										type="number"
										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={item.units ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "units", e.target.value)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<input
										type="number"
										step="0.1"
										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={item.irr ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "irr", e.target.value)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<input
										type="text"
										className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={item.market ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "market", e.target.value)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<input
										type="text"
										className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={item.type ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "type", e.target.value)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle text-right">
									<Button
										size="sm"
										variant="ghost"
										onClick={() => handleRemove(idx)}
										disabled={disabled}
										className="text-red-500 hover:bg-red-50"
									>
										<Trash2 size={16} />
									</Button>
								</td>
							</tr>
						))}
						<tr>
							<td colSpan={7} className="px-3 py-3 text-right">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={handleAdd}
									disabled={disabled}
								>
									<Plus className="h-4 w-4 mr-1" />
									Add Project
								</Button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
