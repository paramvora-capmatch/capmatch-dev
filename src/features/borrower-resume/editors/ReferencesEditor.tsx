"use client";

import React, { useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import type { ReferenceItem } from "@/lib/project-queries";
import { cn } from "@/utils/cn";

export interface ReferencesEditorProps {
	value: ReferenceItem[];
	onChange: (value: ReferenceItem[]) => void;
	disabled?: boolean;
	fieldId: string;
	sectionId?: string;
	title?: string;
	required?: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

const defaultItem = (): ReferenceItem => ({
	firm: "",
	relationship: "",
	years: "",
	contact: "",
});

/**
 * Table editor for Lender References: Firm, Relationship, Years, Contact, actions.
 * Add/remove rows; cell change for all string fields.
 */
export function ReferencesEditor({
	value,
	onChange,
	disabled = false,
	fieldId,
	title = "Lender References",
	fieldMetadata,
	lockButton,
	className,
}: ReferencesEditorProps): React.ReactElement {
	const items = Array.isArray(value) ? value : [];
	const rowsToRender = items.length > 0 ? items : [];

	const handleRowChange = useCallback(
		(index: number, key: keyof ReferenceItem, raw: string) => {
			const next = [...items];
			const current = next[index] ?? ({} as ReferenceItem);
			next[index] = { ...current, [key]: raw };
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
								Firm
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Relationship
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Years
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Contact
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
										className="w-48 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={item.firm ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "firm", e.target.value)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<input
										type="text"
										className="w-48 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={item.relationship ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "relationship", e.target.value)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<input
										type="text"
										className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={item.years ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "years", e.target.value)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<input
										type="text"
										className="w-64 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={item.contact ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "contact", e.target.value)
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
							<td colSpan={5} className="px-3 py-3 text-right">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={handleAdd}
									disabled={disabled}
								>
									<Plus className="h-4 w-4 mr-1" />
									Add Reference
								</Button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
