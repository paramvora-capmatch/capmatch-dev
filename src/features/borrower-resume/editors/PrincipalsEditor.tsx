"use client";

import React, { useCallback, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { FieldHelpTooltip } from "@/components/ui/FieldHelpTooltip";
import type { Principal, PrincipalRole } from "@/types/enhanced-types";
import { principalRoleOptions } from "@/features/borrower-resume/constants";
import { cn } from "@/utils/cn";

export interface PrincipalsEditorProps {
	value: Principal[];
	onChange: (value: Principal[]) => void;
	disabled?: boolean;
	fieldId: string;
	sectionId?: string;
	title?: string;
	required?: boolean;
	fieldMetadata?: Record<string, unknown> | null;
	lockButton: React.ReactNode;
	className?: string;
}

const defaultPrincipal = (): Principal =>
	({
		id: Math.random().toString(36).slice(2),
		principalLegalName: "",
		principalRoleDefault: "Key Principal",
		principalEmail: "",
		ownershipPercentage: undefined as unknown as number,
		principalBio: "",
	} as Principal);

function parseOwnership(raw: string): number | undefined {
	const trimmed = raw.trim();
	if (trimmed === "") return undefined;
	const num = Number(trimmed);
	return Number.isNaN(num) ? undefined : num;
}

/**
 * Table editor for Key Principals: Name, Role, Email, Ownership %, Bio, actions.
 * Add/remove rows; cell changes with ownershipPercentage number parsing.
 */
export function PrincipalsEditor({
	value,
	onChange,
	disabled = false,
	fieldId,
	title = "Key Principals",
	fieldMetadata,
	lockButton,
	className,
}: PrincipalsEditorProps): React.ReactElement {
	const principals = useMemo(() => (Array.isArray(value) ? value : []), [value]);
	const rowsToRender = principals.length > 0 ? principals : [];

	const handleRowChange = useCallback(
		(index: number, key: keyof Principal, raw: unknown) => {
			const next = [...principals];
			const current = next[index] ?? ({} as Principal);
			let val: unknown = raw;
			if (key === "ownershipPercentage" && typeof raw === "string") {
				val = parseOwnership(raw);
			}
			next[index] = { ...current, [key]: val };
			onChange(next);
		},
		[principals, onChange]
	);

	const handleAdd = useCallback(() => {
		onChange([...principals, defaultPrincipal()]);
	}, [principals, onChange]);

	const handleRemove = useCallback(
		(index: number) => {
			const next = [...principals];
			next.splice(index, 1);
			onChange(next);
		},
		[principals, onChange]
	);

	return (
		<div className={cn("w-full border rounded-md text-sm transition-colors duration-200 p-4", className)}>
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
				<div className="flex items-center gap-1">
					{lockButton}
				</div>
			</div>
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200 text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Name
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Role
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Email
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Ownership %
							</th>
							<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
								Bio
							</th>
							<th className="px-3 py-2" />
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-100">
						{rowsToRender.map((p, idx) => (
							<tr key={p.id ?? idx}>
								<td className="px-3 py-2 align-middle">
									<input
										type="text"
										className="w-40 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={p.principalLegalName ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "principalLegalName", e.target.value)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<Select
										value={p.principalRoleDefault ?? "Key Principal"}
										onChange={(e) =>
											handleRowChange(
												idx,
												"principalRoleDefault",
												e.target.value as PrincipalRole
											)
										}
										options={principalRoleOptions.map((o) => ({
											label: o,
											value: o,
										}))}
										disabled={disabled}
										className="w-40"
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<input
										type="email"
										className="w-48 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={p.principalEmail ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "principalEmail", e.target.value)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<input
										type="number"
										min={0}
										className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
										value={p.ownershipPercentage ?? ""}
										onChange={(e) =>
											handleRowChange(
												idx,
												"ownershipPercentage",
												e.target.value
											)
										}
										disabled={disabled}
									/>
								</td>
								<td className="px-3 py-2 align-middle">
									<textarea
										className="w-64 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
										rows={2}
										value={p.principalBio ?? ""}
										onChange={(e) =>
											handleRowChange(idx, "principalBio", e.target.value)
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
							<td colSpan={6} className="px-3 py-3 text-right">
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={handleAdd}
									disabled={disabled}
								>
									<Plus className="h-4 w-4 mr-1" />
									Add Principal
								</Button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
