import React, { useState, useEffect, useCallback } from "react";
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
}

const formatCurrency = (amount: number | null | undefined): string => {
	if (amount === null || amount === undefined) return "N/A";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

const formatPercent = (
	value: number | null | undefined,
	decimals: number = 1
): string => {
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

// Helper to get field value from resume (handles both direct properties, nested content, and rich format)
const getFieldValue = (
	resume: Partial<BorrowerResumeContent>,
	fieldId: string
): any => {
	// 1. Try direct property (flat format)
	if ((resume as any)[fieldId] !== undefined) {
		return (resume as any)[fieldId];
	}
	// 2. Try nested content (if structure wraps it)
	if (
		(resume as any).content &&
		(resume as any).content[fieldId] !== undefined
	) {
		const item = (resume as any).content[fieldId];
		// Check if it's in rich format {value, source, warnings}
		if (item && typeof item === "object" && "value" in item) {
			return item.value;
		}
		return item;
	}
	// 3. Check metadata for rich format values
	if (resume._metadata && resume._metadata[fieldId]) {
		return resume._metadata[fieldId].value;
	}
	return undefined;
};

const hasValue = (value: any): boolean => {
	if (value === null || value === undefined) return false;
	if (typeof value === "string" && value.trim() === "") return false;
	if (Array.isArray(value) && value.length === 0) return false;
	return true;
};

const getFieldConfig = (fieldId: string): any => {
	const fieldsConfig = (borrowerFormSchema as any).fields || {};
	return fieldsConfig[fieldId] || {};
};

const formatFieldValue = (value: any, dataType?: string): string => {
	if (typeof value === "boolean") return formatBoolean(value);
	if (!hasValue(value)) return "N/A";

	if (Array.isArray(value)) return formatArray(value);

	if (typeof value === "number") {
		if (dataType === "Currency") return formatCurrency(value);
		if (dataType === "Percent") return formatPercent(value);
		return value.toLocaleString();
	}

	if (typeof value === "string") {
		if (
			dataType === "Currency" &&
			!isNaN(parseFloat(value.replace(/[^0-9.-]+/g, "")))
		) {
			// Attempt to parse currency string if needed, though usually it's stored as number or pre-formatted string
			return value;
		}
		return value;
	}
	return String(value);
};

const AnimatedField: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => (
	<motion.div
		variants={{
			hidden: { opacity: 0 },
			visible: { opacity: 1 },
			autofill: {
				opacity: [0, 1],
				transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
			},
		}}
	>
		{children}
	</motion.div>
);

const getFieldLabel = (
	fieldId: string,
	fieldMeta?: { description: string }
): string => {
	const config = getFieldConfig(fieldId);
	if (config.label) return config.label as string;
	if (fieldMeta) return fieldMeta.description.split(".")[0];
	return fieldId;
};

export const BorrowerResumeView: React.FC<BorrowerResumeViewProps> = ({
	resume,
	projectId,
	onEdit,
	onVersionChange,
}) => {
	const [collapsed, setCollapsed] = useState<boolean>(() => {
		try {
			return JSON.parse(
				typeof window !== "undefined"
					? localStorage.getItem(
							`borrowerResumeCollapsed:${projectId}`
					  ) || "true"
					: "true"
			);
		} catch {
			return true;
		}
	});

	const { isAutofilling, showSparkles, handleAutofill } = useAutofill(
		projectId,
		{ context: "borrower" }
	);
	const [autofillAnimationKey, setAutofillAnimationKey] = useState(0);
	const [showAutofillSuccess, setShowAutofillSuccess] = useState(false);

	useEffect(() => {
		try {
			localStorage.setItem(
				`borrowerResumeCollapsed:${projectId}`,
				JSON.stringify(collapsed)
			);
		} catch {}
	}, [collapsed, projectId]);

	const handleVersionHistoryOpen = useCallback(() => {
		setCollapsed(false);
	}, []);

	const handleAutofillClick = async () => {
		await handleAutofill();
		setAutofillAnimationKey((prev) => prev + 1);
		setShowAutofillSuccess(true);
		setTimeout(() => setShowAutofillSuccess(false), 3000);
		// Reload will happen via realtime subscription, but trigger callback for parent
		if (onVersionChange) onVersionChange();
	};

	const sectionIconComponents: Record<
		string,
		React.ComponentType<{ className?: string }>
	> = {
		User,
		Briefcase,
		DollarSign,
		Globe,
		Award,
		AlertTriangle,
		FileText,
	};

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
					{onEdit && (
						<Button
							variant="outline"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								onEdit();
							}}
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
						onClick={(e) => {
							e.stopPropagation();
							setCollapsed((v) => !v);
						}}
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
					<Button
						variant="outline"
						size="sm"
						onClick={(e) => {
							e.stopPropagation();
							handleAutofillClick();
						}}
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
							onRollbackSuccess={() => {
								setAutofillAnimationKey((prev) => prev + 1);
								if (onVersionChange) onVersionChange();
							}}
							onOpen={handleVersionHistoryOpen}
						/>
					</div>
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
							<motion.div
								key={
									autofillAnimationKey > 0
										? `autofill-${autofillAnimationKey}`
										: "normal"
								}
								initial="hidden"
								animate={
									showAutofillSuccess &&
									autofillAnimationKey > 0
										? "autofill"
										: "visible"
								}
								variants={{
									visible: {
										transition: {
											staggerChildren: 0.05,
										},
									},
									autofill: {
										transition: {
											staggerChildren: 0.025,
											delayChildren: 0.05,
										},
									},
								}}
								className="space-y-6"
							>
								{(
									((borrowerFormSchema as any).steps ||
										[]) as any[]
								).map((step: any, stepIndex: number) => {
									const sectionId = step.id as string;
									const IconComponent =
										(step.icon &&
											sectionIconComponents[
												step.icon as string
											]) ||
										FileText;
									const allFieldIds: string[] =
										step.fields || [];

									// Determine if this section has any visible value.
									// Use the schema field IDs directly so we don't
									// depend on metadata being present for every field.
									const hasAnyValue = allFieldIds.some(
										(fieldId: string) =>
											hasValue(
												getFieldValue(resume, fieldId)
											)
									);
									const principals = getFieldValue(
										resume,
										"principals"
									);
									const hasPrincipals =
										sectionId === "principals" &&
										Array.isArray(principals) &&
										principals.length > 0;

									if (!hasAnyValue && !hasPrincipals)
										return null;

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
													{step.subsections.map(
														(sub: any) => (
															<div
																key={sub.id}
																className="space-y-3 rounded-md border border-gray-100 bg-gray-50/60 p-3"
															>
																<h4 className="text-sm font-semibold text-gray-800">
																	{sub.title.replace(
																		/^\d+\.\d+\s*/,
																		""
																	)}
																</h4>
																{sub.id ===
																	"principal-details" &&
																hasPrincipals ? (
																	<div className="space-y-2">
																		{(
																			principals as Principal[]
																		).map(
																			(
																				p,
																				idx
																			) => (
																				<div
																					key={
																						idx
																					}
																					className="p-3 bg-white border rounded-md shadow-sm"
																				>
																					<div className="flex justify-between items-start">
																						<div>
																							<p className="font-semibold text-gray-900">
																								{
																									p.principalLegalName
																								}
																							</p>
																							<p className="text-xs text-gray-600">
																								{
																									p.principalRoleDefault
																								}
																								{p.principalEmail &&
																									` • ${p.principalEmail}`}
																							</p>
																						</div>
																						{p.ownershipPercentage && (
																							<span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium border border-blue-100">
																								{
																									p.ownershipPercentage
																								}

																								%
																							</span>
																						)}
																					</div>
																					{p.principalBio && (
																						<p className="text-xs text-gray-500 mt-2 italic border-t border-gray-100 pt-2">
																							{
																								p.principalBio
																							}
																						</p>
																					)}
																				</div>
																			)
																		)}
																	</div>
																) : (
																	<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
																		{sub.fields.map(
																			(
																				fid: string
																			) => {
																				const meta =
																					borrowerResumeFieldMetadata[
																						fid
																					];
																				const val =
																					getFieldValue(
																						resume,
																						fid
																					);
																				if (
																					!hasValue(
																						val
																					)
																				)
																					return null;
																				const isFull =
																					meta?.dataType ===
																						"Textarea" ||
																					fid ===
																						"bioNarrative";
																				return (
																					<AnimatedField
																						key={
																							fid
																						}
																					>
																						<KeyValueDisplay
																							label={getFieldLabel(
																								fid,
																								meta
																							)}
																							value={formatFieldValue(
																								val,
																								meta?.dataType
																							)}
																							fullWidth={
																								isFull
																							}
																						/>
																					</AnimatedField>
																				);
																			}
																		)}
																	</div>
																)}
															</div>
														)
													)}
												</div>
											) : (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
													{allFieldMetas
														.filter((f) =>
															hasValue(
																getFieldValue(
																	resume,
																	f.fieldId
																)
															)
														)
														.map((f) => (
															<AnimatedField
																key={f.fieldId}
															>
																<KeyValueDisplay
																	label={getFieldLabel(
																		f.fieldId,
																		f
																	)}
																	value={formatFieldValue(
																		getFieldValue(
																			resume,
																			f.fieldId
																		),
																		f.dataType
																	)}
																	fullWidth={
																		f.dataType ===
																		"Textarea"
																	}
																/>
															</AnimatedField>
														))}
												</div>
											)}
										</motion.div>
									);
								})}
							</motion.div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};
