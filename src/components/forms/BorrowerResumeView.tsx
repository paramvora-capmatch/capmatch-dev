"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { BorrowerResumeContent } from "@/lib/project-queries";
import { KeyValueDisplay } from "../om/KeyValueDisplay";
import { motion, AnimatePresence } from "framer-motion";
import {
	User,
	Briefcase,
	DollarSign,
	Globe,
	Award,
	AlertTriangle,
	FileText,
	AlertCircle,
	ChevronDown,
	Edit,
	Loader2,
	Sparkles,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { borrowerResumeFieldMetadata } from "@/lib/borrower-resume-field-metadata";
import borrowerFormSchema from "@/lib/borrower-resume-form.schema.json";
import { Button } from "../ui/Button";
import { Principal } from "@/types/enhanced-types";
import { useAutofill } from "@/hooks/useAutofill";
import { BorrowerResumeVersionHistory } from "./BorrowerResumeVersionHistory";

interface BorrowerResumeViewProps {
	resume: Partial<BorrowerResumeContent>;
	projectId: string;
	onEdit?: () => void;
	onVersionChange?: () => void;
	canEdit?: boolean;
}

// Utility functions - pure functions, no dependencies
const formatCurrency = (amount: number | null | undefined): string => {
	if (amount === null || amount === undefined) return "N/A";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

const formatPercent = (value: number | null | undefined, decimals: number = 1): string => {
	if (value === null || value === undefined) return "N/A";
	return `${value.toFixed(decimals)}%`;
};

const formatBoolean = (value: boolean | string | null | undefined): string => {
	if (value === null || value === undefined) return "N/A";
	if (typeof value === "string") {
		const normalized = value.toLowerCase().trim();
		if (normalized === "true") return "Yes";
		if (normalized === "false") return "No";
		return value;
	}
	return value ? "Yes" : "No";
};

const formatArray = (value: any): string => {
	if (!value) return "N/A";
	if (Array.isArray(value)) {
		if (value.length === 0) return "N/A";
		return value.map((item) => String(item)).join(", ");
	}
	return String(value);
};

const formatDate = (dateString: string | null | undefined): string => {
	if (!dateString) return "N/A";
	try {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	} catch {
		return "Invalid Date";
	}
};

const hasValue = (value: any): boolean => {
	if (value === null || value === undefined) return false;
	if (typeof value === "string" && value.trim() === "") return false;
	if (Array.isArray(value) && value.length === 0) return false;
	return true;
};

const getFieldValue = (resume: Partial<BorrowerResumeContent>, fieldId: string): any => {
	// Try direct property
	if ((resume as any)[fieldId] !== undefined) {
		const val = (resume as any)[fieldId];
		if (val && typeof val === "object" && "value" in val && !Array.isArray(val)) {
			return val.value;
		}
		return val;
	}

	// Try nested content
	if ((resume as any).content && (resume as any).content[fieldId] !== undefined) {
		const item = (resume as any).content[fieldId];
		if (item && typeof item === "object" && "value" in item) {
			return item.value;
		}
		return item;
	}

	// Check metadata
	if (resume._metadata && resume._metadata[fieldId]) {
		return resume._metadata[fieldId].value;
	}

	// Fallback: look into grouped section structure
	for (const [key, sectionData] of Object.entries(resume as any)) {
		const isLegacySection = key.startsWith("section_");
		const isNewSection = ["basic-info", "experience", "borrower-financials", "online-presence", "principals"].includes(key);
		if (!isLegacySection && !isNewSection) continue;
		if (sectionData && typeof sectionData === "object" && !Array.isArray(sectionData) && fieldId in sectionData) {
			const item = (sectionData as any)[fieldId];
			if (item && typeof item === "object" && "value" in item) {
				return item.value;
			}
			return item;
		}
	}

	return undefined;
};

const getFieldConfig = (fieldId: string): any => {
	const fieldsConfig = (borrowerFormSchema as any).fields || {};
	return fieldsConfig[fieldId] || {};
};

const formatFieldValue = (value: any, dataType?: string): string => {
	// Extract value from rich format object if present
	// Rich format: {value, source, warnings, other_values}
	if (
		value &&
		typeof value === "object" &&
		!Array.isArray(value) &&
		"value" in value
	) {
		value = value.value;
	}

	// Handle boolean values first, including false (which is a valid value)
	// Check this before hasValue() because false is falsy but is a valid boolean value
	if (typeof value === "boolean") {
		if (dataType && dataType !== "Boolean") {
			// Data type mismatch – underlying data is likely stale/incorrect.
			// Hide the bad value by treating it as missing.
			return "N/A";
		}
		return formatBoolean(value);
	}

	if (!hasValue(value)) return "N/A";

	// First, check the actual runtime type of the value
	// This handles cases where metadata says one thing but data is another

	// If it's actually an array, format as array
	if (Array.isArray(value)) {
		return formatArray(value);
	}

	// If it's actually a number, use metadata for specific formatting
	if (typeof value === "number") {
		switch (dataType) {
			case "Currency":
				return formatCurrency(value);
			case "Percent":
				return formatPercent(value);
			case "Decimal":
				return value.toFixed(2);
			case "Integer":
				return value.toLocaleString();
			default:
				return value.toLocaleString();
		}
	}

	// If it's a string, check metadata for special handling
	if (typeof value === "string") {
		switch (dataType) {
			case "Date":
				return formatDate(value);
			case "Boolean":
				// Handle string "true"/"false" from backend/mockAPI
				return formatBoolean(value);
			case "Currency":
			case "Percent":
			case "Decimal":
			case "Integer":
				// Try to parse and format
				const num = parseFloat(value);
				if (!isNaN(num)) {
					return formatFieldValue(num, dataType);
				}
				return value;
			case "Checklist":
			case "Multi-select":
			case "Checkbox":
				// Metadata says it should be an array, but it's a string
				// Return as-is (might be comma-separated or single value)
				return value;
			default:
				// Check if string is "true" or "false" even if dataType is not explicitly Boolean
				// This handles cases where backend returns boolean as string without proper metadata
				const normalized = value.toLowerCase().trim();
				if (normalized === "true" || normalized === "false") {
					return formatBoolean(value);
				}
				return value;
		}
	}

	// For other types, use metadata-based formatting
	// BUT: Check if value is still an object and try to extract numeric value
	if (value && typeof value === "object" && !Array.isArray(value)) {
		// Try to extract numeric value if it's a rich format object
		if (
			"value" in value &&
			(typeof value.value === "number" || typeof value.value === "string")
		) {
			const extractedValue = value.value;
			if (typeof extractedValue === "number") {
				switch (dataType) {
					case "Currency":
						return formatCurrency(extractedValue);
					case "Percent":
						return formatPercent(extractedValue);
					case "Decimal":
						return extractedValue.toFixed(2);
					case "Integer":
						return extractedValue.toLocaleString();
				}
			} else if (typeof extractedValue === "string") {
				// Try to parse as number
				const num = parseFloat(extractedValue);
				if (!isNaN(num)) {
					return formatFieldValue(num, dataType);
				}
			}
		}
		// If we can't extract a value, return string representation
		return String(value);
	}

	switch (dataType) {
		case "Currency":
			return typeof value === "number" ? formatCurrency(value) : "N/A";
		case "Percent":
			return typeof value === "number" ? formatPercent(value) : "N/A";
		case "Decimal":
			return typeof value === "number" ? value.toFixed(2) : "N/A";
		case "Integer":
			return typeof value === "number"
				? value.toLocaleString()
				: String(value);
		case "Boolean":
			return formatBoolean(value);
		case "Date":
			return formatDate(value);
		case "Textarea":
		case "Text":
			return String(value);
		default:
			return String(value);
	}
};

const getFieldLabel = (fieldId: string, fieldMeta?: { description: string }): string => {
	const config = getFieldConfig(fieldId);
	if (config.label) return config.label as string;
	if (fieldMeta) return fieldMeta.description.split(".")[0];
	return fieldId;
};

interface BorrowerFieldMeta {
	fieldId: string;
	section?: string;
	dataType?: string;
	description: string;
	[key: string]: any;
}

const AnimatedField: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => (
	<div>
		{children}
	</div>
));
AnimatedField.displayName = "AnimatedField";

const sectionIconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
	User,
	Briefcase,
	DollarSign,
	Globe,
	Award,
	AlertTriangle,
	FileText,
};

export const BorrowerResumeView: React.FC<BorrowerResumeViewProps> = React.memo(({
	resume,
	projectId,
	onEdit,
	onVersionChange,
	canEdit = true,
}) => {
	// Memoize resume hash to detect actual changes
	const currentResumeHash = useMemo(() => {
		try {
			return JSON.stringify(resume);
		} catch {
			return "";
		}
	}, [resume]);

	// Ref to track last hash and cache
	const lastHashRef = useRef<string>("");
	const cacheRef = useRef<Record<string, any>>({});

	// Collapsed state with localStorage persistence
	const [collapsed, setCollapsed] = useState<boolean>(() => {
		if (typeof window === "undefined") return true;
		try {
			const stored = localStorage.getItem(`borrowerResumeCollapsed:${projectId}`);
			return stored ? JSON.parse(stored) : true;
		} catch {
			return true;
		}
	});

	// Persist collapsed state to localStorage (debounced)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const timeoutId = setTimeout(() => {
			try {
				localStorage.setItem(`borrowerResumeCollapsed:${projectId}`, JSON.stringify(collapsed));
			} catch {
				// Ignore localStorage errors
			}
		}, 100);
		return () => clearTimeout(timeoutId);
	}, [collapsed, projectId]);

	// Autofill hook - memoize to prevent re-creation
	const autofillHook = useAutofill(projectId, { context: "borrower" });
	const { isAutofilling, showSparkles, handleAutofill } = autofillHook;

	// Animation state
	const [autofillAnimationKey, setAutofillAnimationKey] = useState(0);
	const [showAutofillSuccess, setShowAutofillSuccess] = useState(false);

	// Memoized callbacks
	const handleToggleCollapsed = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		setCollapsed((prev) => !prev);
	}, []);

	const handleEditClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		onEdit?.();
	}, [onEdit]);

	const handleVersionHistoryOpen = useCallback(() => {
		setCollapsed(false);
	}, []);

	const handleAutofillClick = useCallback(async (e: React.MouseEvent) => {
		e.stopPropagation();
		await handleAutofill();
		setAutofillAnimationKey((prev) => prev + 1);
		setShowAutofillSuccess(true);
		setTimeout(() => setShowAutofillSuccess(false), 3000);
		onVersionChange?.();
	}, [handleAutofill, onVersionChange]);

	const handleRollbackSuccess = useCallback(() => {
		setAutofillAnimationKey((prev) => prev + 1);
		onVersionChange?.();
	}, [onVersionChange]);

	// Memoize schema steps to avoid re-computation
	const schemaSteps = useMemo(() => {
		return ((borrowerFormSchema as any).steps || []) as any[];
	}, []);

	// Memoize all field metadata
	const allFieldMetas = useMemo(() => {
		return Object.values(borrowerResumeFieldMetadata as Record<string, BorrowerFieldMeta>);
	}, []);

	// Memoize field values extraction to avoid re-computation
	// Only recalculate when resume content actually changes (detected via hash)
	const fieldValuesCache = useMemo(() => {
		// Only compute if hash changed
		if (currentResumeHash === lastHashRef.current) {
			// Return previous cache if hash hasn't changed
			return cacheRef.current;
		}
		// Hash changed, compute new cache
		lastHashRef.current = currentResumeHash;
		const cache: Record<string, any> = {};
		allFieldMetas.forEach((meta) => {
			cache[meta.fieldId] = getFieldValue(resume, meta.fieldId);
		});
		cacheRef.current = cache;
		return cache;
	}, [currentResumeHash, resume, allFieldMetas]);

	// Memoize principals - only recalculate when resume changes
	const principals = useMemo(() => {
		return getFieldValue(resume, "principals") as Principal[] | undefined;
	}, [resume]);

	return (
		<div
			className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:shadow-blue-100/30"
			aria-expanded={!collapsed}
		>
			<div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

			<div className="sticky top-[-8px] z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm rounded-t-2xl flex flex-row items-center justify-between relative px-3 py-4">
				<div className="ml-3 flex items-center gap-3">
					<h2 className="text-2xl font-semibold text-gray-800 flex items-center">
						<AlertCircle className="h-5 w-5 text-blue-600 mr-2 animate-pulse" />
						Borrower Resume
					</h2>
					{canEdit && onEdit && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleEditClick}
							className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 text-base"
						>
							<Edit className="h-5 w-5 text-gray-600 flex-shrink-0" />
							<span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[100px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
								Edit
							</span>
						</Button>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={handleToggleCollapsed}
						className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 text-base"
					>
						<ChevronDown
							className={cn(
								"h-5 w-5 text-gray-600 transition-transform duration-200",
								collapsed ? "" : "rotate-180"
							)}
						/>
						<span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[160px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
							{collapsed ? "Show Details" : "Hide Details"}
						</span>
					</Button>
					{canEdit && (
						<>
							<Button
								variant="outline"
								size="sm"
								onClick={handleAutofillClick}
								disabled={isAutofilling}
								className={cn(
									"group relative flex items-center gap-1 px-2 py-1.5 rounded-md border transition-all",
									isAutofilling
										? "border-blue-400 bg-blue-50 text-blue-700"
										: "border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700"
								)}
							>
								{isAutofilling ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Sparkles className="h-4 w-4 text-blue-600 mr-1" />
								)}
								<span className="text-xs font-medium">
									{isAutofilling ? "Autofilling..." : "Autofill"}
								</span>
								{showSparkles && (
									<span className="absolute -inset-1 pointer-events-none rounded-md border border-blue-200" />
								)}
							</Button>
							<div className="ml-2">
								<BorrowerResumeVersionHistory
									projectId={projectId}
									disabled={isAutofilling}
									onRollbackSuccess={handleRollbackSuccess}
									onOpen={handleVersionHistoryOpen}
								/>
							</div>
						</>
					)}
				</div>
			</div>

			<AnimatePresence initial={false}>
				{!collapsed && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.3, ease: "easeInOut" }}
						className="overflow-hidden relative z-10"
					>
						<div className="flex-1 p-6 relative overflow-hidden">
							<div className="space-y-6">
								{schemaSteps.map((step: any, stepIndex: number) => {
									const sectionId = step.id as string;
									const IconComponent = (step.icon && sectionIconComponents[step.icon as string]) || FileText;

									// Get field IDs for this section
									const schemaFieldIds: string[] = step.fields || [];
									const metadataFieldIdsForSection = allFieldMetas
										.filter((meta) => meta.section === sectionId)
										.map((meta) => meta.fieldId);
									const allFieldIds: string[] = Array.from(new Set([...schemaFieldIds, ...metadataFieldIdsForSection]));

									// Check if section has any visible value
									const hasAnyValue = allFieldIds.some((fieldId: string) => {
										const val = fieldValuesCache[fieldId];
										return hasValue(val);
									});

									const hasPrincipals = sectionId === "principals" && Array.isArray(principals) && principals.length > 0;

									if (!hasAnyValue && !hasPrincipals) return null;

									return (
										<motion.div
											key={sectionId}
											initial={{ opacity: 0, y: 10 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{
												duration: 0.3,
												delay: 0.1 * stepIndex,
											}}
										>
											<h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center">
												<IconComponent className="h-4 w-4 mr-2 text-blue-600" />
												{step.title}
											</h3>

											{step.subsections?.length > 0 ? (
												<div className="space-y-4">
													{step.subsections.map((sub: any) => (
														<div key={sub.id} className="space-y-3 rounded-md border border-gray-100 bg-gray-50/60 p-3">
															<h4 className="text-sm font-semibold text-gray-800">
																{sub.title.replace(/^\d+\.\d+\s*/, "")}
															</h4>
															{sub.id === "principal-details" && hasPrincipals ? (
																<div className="space-y-2">
																	{principals!.map((p, idx) => (
																		<div key={idx} className="p-3 bg-white border rounded-md shadow-sm">
																			<div className="flex justify-between items-start">
																				<div>
																					<p className="font-semibold text-gray-900">{p.principalLegalName}</p>
																					<p className="text-xs text-gray-600">
																						{p.principalRoleDefault}
																						{p.principalEmail && ` • ${p.principalEmail}`}
																					</p>
																				</div>
																				{p.ownershipPercentage && (
																					<span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium border border-blue-100">
																						{p.ownershipPercentage}%
																					</span>
																				)}
																			</div>
																			{p.principalBio && (
																				<p className="text-xs text-gray-700 mt-2 italic border-t border-gray-100 pt-2">
																					{p.principalBio}
																				</p>
																			)}
																		</div>
																	))}
																</div>
															) : (
																<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
																	{sub.fields.map((fid: string) => {
																		const meta = borrowerResumeFieldMetadata[fid];
																		const val = fieldValuesCache[fid];
																		if (!hasValue(val)) return null;
																		const isFull = meta?.dataType === "Textarea" || fid === "bioNarrative";
																		return (
																			<AnimatedField key={fid}>
																				<KeyValueDisplay
																					label={getFieldLabel(fid, meta)}
																					value={formatFieldValue(val, meta?.dataType)}
																					fullWidth={isFull}
																				/>
																			</AnimatedField>
																		);
																	})}
																</div>
															)}
														</div>
													))}
												</div>
											) : (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
													{allFieldMetas
														.filter((f: BorrowerFieldMeta) => {
															const val = fieldValuesCache[f.fieldId];
															return hasValue(val);
														})
														.map((f: BorrowerFieldMeta) => (
															<AnimatedField key={f.fieldId}>
																<KeyValueDisplay
																	label={getFieldLabel(f.fieldId, f)}
																	value={formatFieldValue(fieldValuesCache[f.fieldId], f.dataType)}
																	fullWidth={f.dataType === "Textarea"}
																/>
															</AnimatedField>
														))}
												</div>
											)}
										</motion.div>
									);
								})}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
});

BorrowerResumeView.displayName = "BorrowerResumeView";
