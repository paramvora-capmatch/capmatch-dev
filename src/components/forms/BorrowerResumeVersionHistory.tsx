"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import {
	History,
	CheckCircle2,
	AlertCircle,
	GitCompare,
	Loader2,
	Lock,
} from "lucide-react";
import {
	formatDate,
	stringifyValue,
	normalizeValueForComparison,
	valuesAreEqual,
} from "../shared/resumeVersionUtils";
import { borrowerResumeFieldMetadata } from "@/lib/borrower-resume-field-metadata";
import borrowerFormSchema from "@/lib/borrower-resume-form.schema.json";
// Removed imports: isGroupedFormat, ungroupFromSections - storage is now always flat format

interface BorrowerResumeVersionHistoryProps {
	projectId: string;
	resourceId?: string | null;
	onRollbackSuccess?: () => void;
	onOpen?: () => void;
	disabled?: boolean;
}

interface ResumeVersionRow {
	id: string;
	version_number: number | null;
	created_at: string;
	created_by: string | null;
	creatorDisplayName: string;
}

interface CreatorProfile {
	id: string;
	full_name?: string | null;
	email?: string | null;
}

export const BorrowerResumeVersionHistory: React.FC<
	BorrowerResumeVersionHistoryProps
> = ({ projectId, resourceId, onRollbackSuccess, onOpen, disabled }) => {
	const [isOpen, setIsOpen] = useState(false);
	const [versions, setVersions] = useState<ResumeVersionRow[]>([]);
	const [resource, setResource] = useState<{
		id: string;
		current_version_id: string | null;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmRollback, setConfirmRollback] = useState<string | null>(null);
	const [isRollingBack, setIsRollingBack] = useState(false);
	const [comparePair, setComparePair] = useState<[string, string] | null>(
		null
	);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const prevIsOpenRef = useRef(false);

	const currentVersionId = useMemo(() => {
		if (resource?.current_version_id) return resource.current_version_id;
		return versions.length > 0 ? versions[0].id : null;
	}, [resource, versions]);

	const currentVersion = versions.find((v) => v.id === currentVersionId);

	const fetchVersions = useCallback(async () => {
		if (!projectId) return;
		setIsLoading(true);
		setError(null);

		try {
			let resolvedResourceId = resourceId;
			let currentVersionPointer: string | null = null;

			if (resolvedResourceId) {
				const { data, error: fetchError } = await supabase
					.from("resources")
					.select("id, current_version_id")
					.eq("id", resolvedResourceId)
					.single();
				if (fetchError && fetchError.code !== "PGRST116")
					throw fetchError;
				if (data) {
					currentVersionPointer = data.current_version_id;
					resolvedResourceId = data.id;
				}
			} else {
				const { data, error: fetchError } = await supabase
					.from("resources")
					.select("id, current_version_id")
					.eq("project_id", projectId)
					.eq("resource_type", "BORROWER_RESUME")
					.maybeSingle();
				if (fetchError) throw fetchError;
				if (data) {
					resolvedResourceId = data.id;
					currentVersionPointer = data.current_version_id;
				}
			}

			if (!resolvedResourceId) {
				throw new Error("Borrower resume resource not found.");
			}

			const { data: versionRows, error: versionsError } = await supabase
				.from("borrower_resumes")
				.select("id, version_number, created_at, created_by")
				.eq("project_id", projectId)
				.order("version_number", { ascending: false });

			if (versionsError) throw versionsError;

			const creatorIds = Array.from(
				new Set(
					(versionRows ?? []).map((v) => v.created_by).filter(Boolean)
				)
			);

			let creatorProfiles: CreatorProfile[] = [];
			if (creatorIds.length > 0) {
				try {
					const { data: directProfiles, error: directError } =
						await supabase
							.from("profiles")
							.select("id, full_name, email")
							.in("id", creatorIds);
					if (!directError && directProfiles)
						creatorProfiles = directProfiles as CreatorProfile[];
					if (directError) {
						console.error(
							"Error fetching creator profiles:",
							directError
						);
					}
				} catch (err) {
					console.error("Error fetching creator profiles:", err);
				}
			}

			const creatorMap = new Map(
				creatorProfiles.map((profile) => [profile.id, profile])
			);

			const decorated = (versionRows ?? []).map((version) => ({
				...version,
				creatorDisplayName:
					creatorMap.get(version.created_by ?? "")?.full_name ||
					creatorMap.get(version.created_by ?? "")?.email ||
					(version.created_by ? version.created_by : "System"),
			}));

			setResource({
				id: resolvedResourceId,
				current_version_id: currentVersionPointer,
			});
			setVersions(decorated);
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "Failed to load resume versions";
			setError(message);
		} finally {
			setIsLoading(false);
		}
	}, [projectId, resourceId]);

	useEffect(() => {
		if (isOpen) {
			void fetchVersions();
		}
	}, [isOpen, fetchVersions]);

	useEffect(() => {
		const wasOpen = prevIsOpenRef.current;
		const isOpening = isOpen && !wasOpen;
		if (isOpening && onOpen) {
			setTimeout(() => onOpen(), 0);
		}
		prevIsOpenRef.current = isOpen;
	}, [isOpen, onOpen]);

	useEffect(() => {
		const handleClickOutside = (event: globalThis.MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
				setConfirmRollback(null);
			}
		};
		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isOpen]);

	const handleRollback = useCallback(
		async (versionId: string) => {
			if (!resource?.id) {
				setError("Cannot rollback without a resume resource.");
				return;
			}

			setIsRollingBack(true);
			setError(null);
			try {
				const { error: rollbackError } = await supabase.rpc(
					"rollback_borrower_resume_version",
					{
						p_resource_id: resource.id,
						p_resume_id: versionId,
					}
				);
				if (rollbackError) throw rollbackError;

				setConfirmRollback(null);
				await fetchVersions();
				onRollbackSuccess?.();
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: "Failed to rollback version";
				setError(message);
			} finally {
				setIsRollingBack(false);
			}
		},
		[resource?.id, fetchVersions, onRollbackSuccess]
	);

	const currentVersionLabel = useMemo(
		() =>
			currentVersion?.version_number
				? `v${currentVersion.version_number}`
				: "Current version",
		[currentVersion]
	);

	return (
		<div className="relative" ref={dropdownRef}>
			<Button
				variant="outline"
				size="sm"
				className="group flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base"
				onClick={(event) => {
					event.stopPropagation();
					setIsOpen((prev) => !prev);
				}}
				onMouseDown={(event) => event.stopPropagation()}
				title="Resume versions"
				disabled={disabled}
			>
				<History className="h-5 w-5 text-gray-600 flex-shrink-0" />
				<span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[100px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
					Versions
				</span>
			</Button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg z-40">
					<div className="p-4">
						<div className="flex items-center justify-between mb-3">
							<h3 className="text-sm font-semibold text-gray-900">
								Version History
							</h3>
							<span className="text-xs text-gray-500">
								{currentVersionLabel}
							</span>
						</div>

						{error && (
							<div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">
								{error}
							</div>
						)}

						{isLoading ? (
							<div className="flex justify-center py-6">
								<Loader2 className="h-5 w-5 animate-spin text-blue-600" />
							</div>
						) : (
							<div className="space-y-2 max-h-80 overflow-y-auto">
								{versions.length === 0 ? (
									<div className="text-xs text-gray-500">
										No versions found yet
									</div>
								) : (
									versions.map((version) => {
										const isCurrentVersion =
											version.id === currentVersionId;
										const status = isCurrentVersion
											? "active"
											: "superseded";
										const shouldShowButtons =
											!isCurrentVersion;

										return (
											<div
												key={version.id}
												className={`p-3 rounded border ${
													isCurrentVersion
														? "border-blue-200 bg-blue-50"
														: "border-gray-200 bg-gray-50"
												}`}
											>
												{confirmRollback ===
												version.id ? (
													<div className="space-y-2 text-center">
														<p className="text-sm font-medium text-gray-900">
															Rollback to v
															{version.version_number ??
																version.id.slice(
																	0,
																	4
																)}
															?
														</p>
														<p className="text-xs text-gray-600">
															{formatDate(
																version.created_at
															)}
														</p>
														<div className="flex gap-2">
															<Button
																size="sm"
																variant="outline"
																fullWidth
																onClick={(
																	e
																) => {
																	e.stopPropagation();
																	setConfirmRollback(
																		null
																	);
																}}
																disabled={
																	isRollingBack
																}
															>
																Cancel
															</Button>
															<Button
																size="sm"
																variant="danger"
																fullWidth
																onClick={(
																	e
																) => {
																	e.stopPropagation();
																	handleRollback(
																		version.id
																	);
																}}
																isLoading={
																	isRollingBack
																}
															>
																Confirm
															</Button>
														</div>
													</div>
												) : (
													<div className="flex items-start justify-between gap-2">
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2">
																<span className="text-sm font-medium text-gray-900">
																	v
																	{version.version_number ??
																		"—"}
																</span>
																{status ===
																	"active" && (
																	<CheckCircle2 className="h-4 w-4 text-green-600" />
																)}
																{status ===
																	"superseded" && (
																	<AlertCircle className="h-4 w-4 text-amber-600" />
																)}
															</div>
															<p className="text-xs text-gray-600 mt-1">
																{formatDate(
																	version.created_at
																)}
															</p>
															<p className="text-xs text-gray-500">
																{
																	version.creatorDisplayName
																}
															</p>
														</div>

														<div className="flex gap-1">
															{shouldShowButtons && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={(
																		e
																	) => {
																		e.stopPropagation();
																		setConfirmRollback(
																			version.id
																		);
																	}}
																	disabled={
																		isRollingBack
																	}
																	title="Restore this version"
																>
																	Restore
																</Button>
															)}
															{shouldShowButtons &&
																currentVersionId && (
																	<Button
																		size="sm"
																		variant="outline"
																		onClick={(
																			e
																		) => {
																			e.stopPropagation();
																			setComparePair(
																				[
																					version.id,
																					currentVersionId,
																				]
																			);
																			onOpen?.();
																		}}
																		title={`Compare to ${currentVersionLabel}`}
																	>
																		<GitCompare className="h-4 w-4 mr-1" />
																		Compare
																	</Button>
																)}
														</div>
													</div>
												)}
											</div>
										);
									})
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{comparePair && (
				<BorrowerResumeVersionDiffModal
					isOpen={!!comparePair}
					versionIdA={comparePair[0]}
					versionIdB={comparePair[1]}
					onClose={() => setComparePair(null)}
				/>
			)}
		</div>
	);
};

interface DiffField {
	fieldId: string;
	label: string;
	section: string;
	before: unknown;
	after: unknown;
	beforeLocked?: boolean;
	afterLocked?: boolean;
	isTable: boolean;
}

interface DiffSection {
	sectionId: string;
	sectionName: string;
	fields: DiffField[];
}

const SECTION_NAMES: Record<string, string> = {
	"basic-info": "Borrower Identity & Contact",
	experience: "Sponsor Experience",
	"borrower-financials": "Financial Profile",
	"online-presence": "Online Presence",
	principals: "Key Principals",
};

// Helper to extract label for borrower fields
const getBorrowerFieldLabel = (fieldId: string): string => {
	const schemaFields = (borrowerFormSchema as any)?.fields || {};
	const schemaField = schemaFields[fieldId];
	if (schemaField?.label) {
		return schemaField.label;
	}
	const metadata = borrowerResumeFieldMetadata[fieldId];
	if (metadata) {
		return metadata.description.split(".")[0] || fieldId;
	}
	return fieldId;
};

// Helper to get field value directly from content (without flattening)
// Handles both grouped and flat structures, and extracts value from rich format {value: ...}
const getFieldValueFromContent = (
	content: Record<string, any> | null | undefined,
	fieldId: string
): any => {
	if (!content) return undefined;

	// Helper to extract value from a field object (handles rich format)
	const extractValue = (fieldObj: any): any => {
		if (fieldObj === null || fieldObj === undefined) return fieldObj;
		// If it's a rich format object with a value property, extract it
		if (
			typeof fieldObj === "object" &&
			!Array.isArray(fieldObj) &&
			"value" in fieldObj
		) {
			return (fieldObj as any).value;
		}
		// Otherwise return as-is (could be primitive, array, or plain object)
		return fieldObj;
	};

	// First, try to find the field directly at the root level
	if (content.hasOwnProperty(fieldId)) {
		return extractValue(content[fieldId]);
	}

	// If not found at root, check if content is grouped by sections
	// Look through all sections and subsections recursively
	const searchInObject = (obj: any, depth: number = 0): any => {
		if (!obj || typeof obj !== "object" || Array.isArray(obj))
			return undefined;
		if (depth > 5) return undefined; // Prevent infinite recursion

		// Check if this object has the field directly
		if (obj.hasOwnProperty(fieldId)) {
			return extractValue(obj[fieldId]);
		}

		// Recursively search in nested objects
		for (const [key, value] of Object.entries(obj)) {
			// Skip metadata fields
			if (key.startsWith("_")) continue;
			if (
				key === "completenessPercent" ||
				key === "projectSections" ||
				key === "borrowerSections"
			)
				continue;

			if (value && typeof value === "object" && !Array.isArray(value)) {
				const found = searchInObject(value, depth + 1);
				if (found !== undefined) return found;
			}
		}

		return undefined;
	};

	return searchInObject(content);
};

const BorrowerResumeVersionDiffModal: React.FC<{
	versionIdA: string;
	versionIdB: string;
	isOpen: boolean;
	onClose: () => void;
}> = ({ versionIdA, versionIdB, isOpen, onClose }) => {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [diffSections, setDiffSections] = useState<DiffSection[]>([]);
	const [title, setTitle] = useState("Comparing versions");

	useEffect(() => {
		if (!isOpen) return;
		if (!versionIdA || !versionIdB) {
			setError("Both versions must be specified.");
			return;
		}

		let cancelled = false;

		const loadComparison = async () => {
			setIsLoading(true);
			setError(null);
			try {
				const { data, error: versionError } = await supabase
					.from("borrower_resumes")
					.select("id, version_number, content")
					.in("id", [versionIdA, versionIdB]);

				if (versionError) throw versionError;
				if (!data || data.length < 2)
					throw new Error("Could not load both versions.");

				const versionMap = new Map(data.map((row) => [row.id, row]));
				const left = versionMap.get(versionIdA);
				const right = versionMap.get(versionIdB);
				if (!left || !right) throw new Error("Versions not found.");

				setTitle(
					`Compare v${left.version_number ?? "—"} vs v${
						right.version_number ?? "—"
					}`
				);

				const leftContent = left.content || {};
				const rightContent = right.content || {};
				const leftLocked = (leftContent as any)?._lockedFields || {};
				const rightLocked = (rightContent as any)?._lockedFields || {};

				// Helper to collect all field IDs from content (recursively, without flattening)
				const collectFieldIds = (
					content: Record<string, any>,
					fieldIds: Set<string>
				): void => {
					for (const [key, value] of Object.entries(content)) {
						// Skip metadata and special fields
						if (key.startsWith("_")) continue;
						if (
							key === "completenessPercent" ||
							key === "projectSections" ||
							key === "borrowerSections"
						)
							continue;

						// If this is a direct field (not a section), add it
						if (
							value !== null &&
							typeof value === "object" &&
							!Array.isArray(value)
						) {
							// Check if it's a rich format object with value property (a field)
							if ("value" in value || "source" in value) {
								fieldIds.add(key);
							} else {
								// It's a section or subsection - recurse
								collectFieldIds(value, fieldIds);
							}
						} else {
							// Primitive value or array - it's a field
							fieldIds.add(key);
						}
					}
				};

				// Collect all field IDs from both versions and schema
				const allFieldIds = new Set<string>();
				collectFieldIds(leftContent, allFieldIds);
				collectFieldIds(rightContent, allFieldIds);
				// Also include all schema fields
				const schemaFields = (borrowerFormSchema as any)?.fields || {};
				Object.keys(schemaFields).forEach((fid) =>
					allFieldIds.add(fid)
				);

				const diffFieldsMap = new Map<string, DiffField>();

				// Compare all fields one-to-one directly from content (no flattening)
				allFieldIds.forEach((fieldId) => {
					// Get values directly from content structure
					const beforeValue = getFieldValueFromContent(
						leftContent,
						fieldId
					);
					const afterValue = getFieldValueFromContent(
						rightContent,
						fieldId
					);

					// Normalize for comparison
					const normalizedBefore =
						normalizeValueForComparison(beforeValue);
					const normalizedAfter =
						normalizeValueForComparison(afterValue);

					// Skip if values are equal (including both undefined/null)
					if (valuesAreEqual(normalizedBefore, normalizedAfter))
						return;

					const metadata = borrowerResumeFieldMetadata[fieldId];
					diffFieldsMap.set(fieldId, {
						fieldId,
						label: getBorrowerFieldLabel(fieldId),
						section: metadata?.section || "unknown",
						before: normalizedBefore,
						after: normalizedAfter,
						beforeLocked: leftLocked[fieldId] === true,
						afterLocked: rightLocked[fieldId] === true,
						isTable: fieldId === "principals", // Special case for principals array
					});
				});

				// Group into sections using schema order
				const sections: DiffSection[] = [];
				const schemaSteps = (borrowerFormSchema as any).steps || [];

				for (const step of schemaSteps) {
					const sectionId = step.id;
					const sectionFields: DiffField[] = [];

					const processFields = (fields: string[]) => {
						fields.forEach((fid) => {
							if (diffFieldsMap.has(fid)) {
								sectionFields.push(diffFieldsMap.get(fid)!);
								diffFieldsMap.delete(fid); // Remove processed
							}
						});
					};

					if (step.subsections) {
						step.subsections.forEach((sub: any) =>
							processFields(sub.fields || [])
						);
					} else {
						processFields(step.fields || []);
					}

					if (sectionFields.length > 0) {
						sections.push({
							sectionId,
							sectionName:
								step.title ||
								SECTION_NAMES[sectionId] ||
								sectionId,
							fields: sectionFields,
						});
					}
				}

				// Remaining fields
				if (diffFieldsMap.size > 0) {
					const otherFields = Array.from(diffFieldsMap.values());
					sections.push({
						sectionId: "other",
						sectionName: "Other Fields",
						fields: otherFields.sort((a, b) =>
							a.label.localeCompare(b.label)
						),
					});
				}

				if (!cancelled) setDiffSections(sections);
			} catch (err) {
				if (!cancelled)
					setError(
						err instanceof Error ? err.message : "Comparison failed"
					);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		};

		loadComparison();
		return () => {
			cancelled = true;
		};
	}, [isOpen, versionIdA, versionIdB]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
			{error && (
				<div className="text-sm text-red-600 bg-red-50 p-3 rounded mb-3">
					{error}
				</div>
			)}
			{isLoading ? (
				<div className="flex justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-blue-600" />
				</div>
			) : (
				<div className="space-y-6 max-h-[70vh] overflow-y-auto">
					{diffSections.length === 0 ? (
						<div className="text-center py-8 text-gray-600 text-sm">
							No differences detected.
						</div>
					) : (
						diffSections.map((section) => (
							<div key={section.sectionId} className="space-y-4">
								<h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
									{section.sectionName}
								</h3>
								{section.fields.map((field) => (
									<DiffFieldRow
										key={field.fieldId}
										field={field}
									/>
								))}
							</div>
						))
					)}
				</div>
			)}
			<div className="mt-6 flex justify-end border-t pt-4">
				<Button onClick={onClose}>Close</Button>
			</div>
		</Modal>
	);
};

const DiffFieldRow: React.FC<{ field: DiffField }> = ({ field }) => {
	const beforeStr = stringifyValue(field.before);
	const afterStr = stringifyValue(field.after);
	const isRemoved = beforeStr !== "—" && afterStr === "—";
	const isAdded = beforeStr === "—" && afterStr !== "—";

	return (
		<div className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
			<div className="flex items-start justify-between mb-2">
				<p className="text-sm font-medium text-gray-900">
					{field.label}
				</p>
				{(field.beforeLocked || field.afterLocked) && (
					<div className="flex gap-1 items-center">
						{field.beforeLocked && (
							<span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded flex items-center gap-1">
								<Lock className="h-3 w-3" /> A
							</span>
						)}
						{field.afterLocked && (
							<span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded flex items-center gap-1">
								<Lock className="h-3 w-3" /> B
							</span>
						)}
					</div>
				)}
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div
					className={`rounded-md p-3 border ${
						isRemoved
							? "bg-red-50 border-red-200"
							: "bg-gray-50 border-gray-200"
					}`}
				>
					<p className="text-xs font-medium text-gray-500 mb-1">
						Version A
					</p>
					<p
						className={`text-sm whitespace-pre-wrap break-words ${
							isRemoved
								? "line-through text-red-700"
								: "text-gray-900"
						}`}
					>
						{beforeStr}
					</p>
				</div>
				<div
					className={`rounded-md p-3 border ${
						isAdded
							? "bg-green-50 border-green-200"
							: "bg-gray-50 border-gray-200"
					}`}
				>
					<p className="text-xs font-medium text-gray-500 mb-1">
						Version B
					</p>
					<p
						className={`text-sm whitespace-pre-wrap break-words ${
							isAdded
								? "text-green-700 font-medium"
								: "text-gray-900"
						}`}
					>
						{afterStr}
					</p>
				</div>
			</div>
		</div>
	);
};
