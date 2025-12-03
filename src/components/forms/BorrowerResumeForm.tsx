"use client";

import React, {
	useState,
	useEffect,
	useMemo,
	useRef,
	useCallback,
} from "react";
import { FormWizard, Step } from "../ui/FormWizard";
import { FormGroup } from "../ui/Form";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { ButtonSelect } from "../ui/ButtonSelect";
import { AskAIButton } from "../ui/AskAIProvider";
import { FieldHelpTooltip } from "../ui/FieldHelpTooltip";
import { HelpCircle } from "lucide-react";
import { useAutofill } from "@/hooks/useAutofill";
import { cn } from "@/utils/cn";
import {
	FileText,
	DollarSign,
	Building,
	Globe,
	Calendar,
	Map,
	Users,
	Calculator,
	AlertTriangle,
	Info,
	Lock,
	Unlock,
	Sparkles,
	Loader2,
	BarChart,
	ChevronDown,
	ChevronRight,
	Copy,
	Briefcase,
	Award,
	Plus,
	Trash2,
} from "lucide-react";
import { BorrowerResumeContent } from "@/lib/project-queries";
import { saveProjectBorrowerResume } from "@/lib/project-queries";
import {
	computeBorrowerCompletion,
	BORROWER_REQUIRED_FIELDS,
} from "@/utils/resumeCompletion";
import formSchema from "@/lib/borrower-resume-form.schema.json";
import {
	borrowerResumeFieldMetadata,
	FieldMetadata as BorrowerFieldMeta,
} from "@/lib/borrower-resume-field-metadata";
import { Principal, PrincipalRole } from "@/types/enhanced-types";
import { useProjectBorrowerResumeRealtime } from "@/hooks/useProjectBorrowerResumeRealtime";
import { BorrowerResumeView } from "./BorrowerResumeView";
import { BorrowerResumeVersionHistory } from "./BorrowerResumeVersionHistory";
import { MultiSelectPills } from "../ui/MultiSelectPills";

interface BorrowerResumeFormProps {
	projectId: string;
	onComplete?: (profile: BorrowerResumeContent) => void;
	compact?: boolean;
	onAskAI?: (fieldId: string) => void;
	onFormDataChange?: (formData: Partial<BorrowerResumeContent>) => void;
	initialFocusFieldId?: string;
	onVersionChange?: () => void;
	// Borrower specific props
	onCopyBorrowerResume?: () => void;
	copyDisabled?: boolean;
	copyLoading?: boolean;
	progressPercent?: number;
	onProgressChange?: (percent: number) => void;
}

// Options Arrays
const entityStructureOptions = [
	"LLC",
	"LP",
	"S-Corp",
	"C-Corp",
	"Sole Proprietorship",
	"Trust",
	"Other",
];
const experienceRangeOptions = ["0-2", "3-5", "6-10", "11-15", "16+"];
const dealValueRangeOptions = [
	"N/A",
	"<$10M",
	"$10M-$50M",
	"$50M-$100M",
	"$100M-$250M",
	"$250M-$500M",
	"$500M+",
];
const creditScoreRangeOptions = [
	"N/A",
	"<600",
	"600-649",
	"650-699",
	"700-749",
	"750-799",
	"800+",
];
const netWorthRangeOptions = [
	"<$1M",
	"$1M-$5M",
	"$5M-$10M",
	"$10M-$25M",
	"$25M-$50M",
	"$50M-$100M",
	"$100M+",
];
const liquidityRangeOptions = [
	"<$100k",
	"$100k-$500k",
	"$500k-$1M",
	"$1M-$5M",
	"$5M-$10M",
	"$10M+",
];
const principalRoleOptions: PrincipalRole[] = [
	"Managing Member",
	"General Partner",
	"Developer",
	"Sponsor",
	"Key Principal",
	"Guarantor",
	"Limited Partner",
	"Other",
];
const assetClassOptions = [
	"Multifamily",
	"Office",
	"Retail",
	"Industrial",
	"Hospitality",
	"Land",
	"Mixed-Use",
	"Self-Storage",
	"Data Center",
	"Medical Office",
	"Senior Housing",
	"Student Housing",
	"Other",
];
const geographicMarketsOptions = [
	"Northeast",
	"Mid-Atlantic",
	"Southeast",
	"Midwest",
	"Southwest",
	"Mountain West",
	"West Coast",
	"Pacific Northwest",
	"Hawaii",
	"Alaska",
	"National",
];

const isValueProvided = (value: unknown): boolean => {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "number") return !Number.isNaN(value);
	if (typeof value === "boolean") return true;
	return false;
};

// Helper to determine if all principal rows are sufficiently filled in
const hasCompletePrincipals = (principals: unknown): boolean => {
	if (!Array.isArray(principals) || principals.length === 0) return false;
	return principals.every((p: any) => {
		const name = (p?.principalLegalName || "").trim();
		const role = (p?.principalRoleDefault || "").trim();
		return name.length > 0 && role.length > 0;
	});
};

// Sanitize incoming BorrowerContent
const sanitizeBorrowerProfile = (
	profile: Partial<BorrowerResumeContent>
): Partial<BorrowerResumeContent> => {
	const next: any = { ...profile };

	for (const [fieldId, meta] of Object.entries(borrowerResumeFieldMetadata)) {
		const dataType = (meta as any).dataType;
		if (!dataType || dataType === "Boolean") continue;

		const current = (next as any)[fieldId];
		if (typeof current === "boolean") {
			(next as any)[fieldId] = null;
		}
	}

	if (next._metadata && typeof next._metadata === "object") {
		const fixedMeta: Record<string, any> = { ...next._metadata };
		for (const [fieldId, meta] of Object.entries(fixedMeta)) {
			const fieldConfig = borrowerResumeFieldMetadata[fieldId];
			const dataType = (fieldConfig as any)?.dataType;
			if (!dataType || dataType === "Boolean") continue;

			if (meta && typeof meta === "object") {
				if (typeof meta.value === "boolean") {
					meta.value = null;
				}
				if (typeof meta.original_value === "boolean") {
					meta.original_value = null;
				}
			}
		}
		next._metadata = fixedMeta;
	}

	return next as Partial<BorrowerResumeContent>;
};

export const BorrowerResumeForm: React.FC<BorrowerResumeFormProps> = ({
	projectId,
	onComplete,
	compact,
	onAskAI,
	onFormDataChange,
	initialFocusFieldId,
	onVersionChange,
	onCopyBorrowerResume,
	copyDisabled,
	copyLoading,
	onProgressChange,
}) => {
	const {
		content: borrowerResume,
		isLoading: resumeLoading,
		save,
		reload: reloadBorrowerResume,
		isRemoteUpdate,
	} = useProjectBorrowerResumeRealtime(projectId);

	// State
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState<Partial<BorrowerResumeContent>>(
		borrowerResume ? sanitizeBorrowerProfile(borrowerResume) : {}
	);
	const [fieldMetadata, setFieldMetadata] = useState<Record<string, any>>(
		(borrowerResume as any)?._metadata || {}
	);

	// Initialize locked state from props/loaded data
	const [lockedFields, setLockedFields] = useState<Set<string>>(() => {
		const saved = (borrowerResume as any)?._lockedFields || {};
		return new Set(Object.keys(saved).filter((key) => saved[key] === true));
	});
	const [unlockedFields, setUnlockedFields] = useState<Set<string>>(
		new Set()
	);

	const [showAutofillNotification, setShowAutofillNotification] =
		useState(false);
	const [formSaved, setFormSaved] = useState(false);
	const [isRestoring, setIsRestoring] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);

	// Refs for autosave and dirty check
	const initialSnapshotRef = useRef<{
		formData: Partial<BorrowerResumeContent>;
		fieldMetadata: Record<string, any>;
		lockedFields: Set<string>;
	} | null>(null);
	const lastSavedSnapshotRef = useRef<{
		formData: Partial<BorrowerResumeContent>;
		fieldMetadata: Record<string, any>;
		lockedFields: Set<string>;
	} | null>(null);
	const stateRef = useRef({
		formData,
		fieldMetadata,
		lockedFields,
	});
	const isSavingRef = useRef(false);

	const {
		isAutofilling,
		showSparkles,
		handleAutofill: startAutofill,
	} = useAutofill(projectId, { context: "borrower" });

	// Effect to handle updates from parent/hook (e.g. after Autofill or Initial Load)
	useEffect(() => {
		if (isRestoring) return;
		if (!borrowerResume) return;

		const sanitized = sanitizeBorrowerProfile(borrowerResume);
		setFormData(sanitized);
		const metadata = (sanitized as any)._metadata || {};
		setFieldMetadata(metadata);

		// Update locks based on sources (AI vs user input)
		const newLockedFields = new Set(
			Object.keys((borrowerResume as any)._lockedFields || {}).filter(
				(k) => (borrowerResume as any)._lockedFields?.[k]
			)
		);

		Object.entries(metadata).forEach(([fieldId, meta]) => {
			const metaAny = meta as any;

			// Determine if field is AI-sourced based on its sources array
			const isAiSourced =
				Array.isArray(metaAny?.sources) &&
				metaAny.sources.some((src: any) => {
					if (!src) return false;
					if (typeof src === "string") {
						const normalized = src.toLowerCase();
						return (
							normalized !== "user_input" &&
							normalized !== "user input"
						);
					}
					if (
						typeof src === "object" &&
						"type" in src &&
						typeof (src as any).type === "string"
					) {
						const normalized = (src as any).type.toLowerCase();
						return (
							normalized !== "user_input" &&
							normalized !== "user input"
						);
					}
					return false;
				});

			const hasValue = isValueProvided((sanitized as any)[fieldId]);
			if (isAiSourced && hasValue) {
				newLockedFields.add(fieldId);
			}
		});

		setLockedFields(newLockedFields);

		const snapshot = {
			formData: sanitized,
			fieldMetadata: metadata,
			lockedFields: newLockedFields,
		};
		initialSnapshotRef.current = snapshot;
		lastSavedSnapshotRef.current = snapshot;
	}, [borrowerResume, isRestoring]);

	// Autosave Key
	const storageKey = useMemo(
		() => `capmatch_borrower_resume_draft_${projectId}`,
		[projectId]
	);

	// Restore from Local Storage
	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved) {
				const draft = JSON.parse(saved);
				if (draft.projectId === projectId) {
					console.log(
						"[BorrowerResumeForm] Restoring draft from local storage"
					);
					setIsRestoring(true);
					setFormData(draft.formData);
					setFieldMetadata(draft.fieldMetadata || {});
					if (draft.lockedFields) {
						setLockedFields(new Set(draft.lockedFields));
					}
					setLastSavedAt(draft.updatedAt);
					setTimeout(() => setIsRestoring(false), 100);
				}
			}
		} catch (err) {
			console.warn("[BorrowerResumeForm] Failed to restore draft:", err);
		}
	}, [projectId, storageKey]);

	// Update refs
	useEffect(() => {
		stateRef.current = { formData, fieldMetadata, lockedFields };
		onFormDataChange?.(formData);

		// Report progress
		const completeness = computeBorrowerCompletion(formData);
		onProgressChange?.(completeness);
	}, [
		formData,
		fieldMetadata,
		lockedFields,
		onFormDataChange,
		onProgressChange,
	]);

	// Save to Local Storage (Debounced)
	useEffect(() => {
		if (isRestoring) return;
		const handler = setTimeout(() => {
			if (typeof window === "undefined") return;
			try {
				const draft = {
					projectId,
					formData,
					fieldMetadata,
					lockedFields: Array.from(lockedFields),
					updatedAt: Date.now(),
				};
				localStorage.setItem(storageKey, JSON.stringify(draft));
				setLastSavedAt(Date.now());
			} catch (err) {
				console.warn("[BorrowerResumeForm] Failed to save draft:", err);
			}
		}, 1000);
		return () => clearTimeout(handler);
	}, [
		formData,
		fieldMetadata,
		lockedFields,
		projectId,
		storageKey,
		isRestoring,
	]);

	// Autosave notification handler
	useEffect(() => {
		const handler = async (e: any) => {
			if (
				e.detail?.projectId === projectId &&
				e.detail?.context === "borrower"
			) {
				setShowAutofillNotification(true);
				setTimeout(() => setShowAutofillNotification(false), 5000);
				// Reload borrower resume data after autofill completes
				await reloadBorrowerResume();
			}
		};
		if (typeof window !== "undefined") {
			window.addEventListener("autofill-completed", handler as any);
		}
		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener(
					"autofill-completed",
					handler as any
				);
			}
		};
	}, [projectId, reloadBorrowerResume]);

	const handleInputChange = useCallback((fieldId: string, value: any) => {
		setFormData((prev) => ({ ...prev, [fieldId]: value }));
		setFieldMetadata((prev) => {
			const currentMeta = prev[fieldId] || {
				value: value,
				sources: [],
				warnings: [],
				original_value: value,
			};
			return {
				...prev,
				[fieldId]: {
					...currentMeta,
					value: value,
					// Always record user edits as user_input in the sources array
					sources: [{ type: "user_input" }],
				},
			};
		});
	}, []);

	// Principals Management (table-style, similar to residential unit mix)
	const handleRemovePrincipal = useCallback(
		(index: number) => {
			const currentPrincipals = Array.isArray(formData.principals)
				? (formData.principals as Principal[])
				: [];
			const updatedPrincipals = [...currentPrincipals];
			updatedPrincipals.splice(index, 1);
			handleInputChange("principals", updatedPrincipals);
		},
		[formData.principals, handleInputChange]
	);

	const hasUnsavedChanges = useCallback((): boolean => {
		const baseline =
			lastSavedSnapshotRef.current || initialSnapshotRef.current;
		if (!baseline) return true;
		const current = stateRef.current;
		const lockedToArray = (s: Set<string>) => Array.from(s).sort();

		try {
			const formEqual =
				JSON.stringify(current.formData) ===
				JSON.stringify(baseline.formData);
			const metaEqual =
				JSON.stringify(current.fieldMetadata) ===
				JSON.stringify(baseline.fieldMetadata);
			const locksEqual =
				JSON.stringify(lockedToArray(current.lockedFields)) ===
				JSON.stringify(lockedToArray(baseline.lockedFields));
			return !(formEqual && metaEqual && locksEqual);
		} catch {
			return true;
		}
	}, []);

	const saveToDatabase = useCallback(
		async (
			finalData: Partial<BorrowerResumeContent>,
			createNewVersion: boolean
		) => {
			if (!hasUnsavedChanges()) {
				if (typeof window !== "undefined") {
					localStorage.removeItem(storageKey);
					setLastSavedAt(null);
				}
				return;
			}

			setFormSaved(true);
			isSavingRef.current = true;
			try {
				const lockedFieldsObj: Record<string, boolean> = {};
				lockedFields.forEach((id) => (lockedFieldsObj[id] = true));

				// Calculate completeness before saving
				const completenessPercent =
					computeBorrowerCompletion(finalData);

				const dataToSave = {
					...finalData,
					_metadata: fieldMetadata,
					completenessPercent,
				};

				await save(
					dataToSave,
					lockedFieldsObj,
					undefined,
					createNewVersion
				);

				// Reload to get updated content
				await reloadBorrowerResume();

				const snapshot = {
					formData: finalData,
					fieldMetadata,
					lockedFields: new Set(lockedFields),
				};
				lastSavedSnapshotRef.current = snapshot;
				stateRef.current = snapshot;

				if (typeof window !== "undefined") {
					localStorage.removeItem(storageKey);
					setLastSavedAt(null);
				}
			} catch (err) {
				console.error("Save failed:", err);
			} finally {
				isSavingRef.current = false;
				setTimeout(() => setFormSaved(false), 1500);
			}
		},
		[
			hasUnsavedChanges,
			lockedFields,
			fieldMetadata,
			save,
			storageKey,
			reloadBorrowerResume,
		]
	);

	const handleFormSubmit = useCallback(
		async (finalData?: Partial<BorrowerResumeContent>) => {
			const dataToSave = finalData || formData;
			await saveToDatabase(dataToSave, true);
			setIsEditing(false);
			onComplete?.(dataToSave as BorrowerResumeContent);
			reloadBorrowerResume();
		},
		[formData, saveToDatabase, onComplete, reloadBorrowerResume]
	);

	// Save on Unmount
	useEffect(() => {
		return () => {
			if (isSavingRef.current) return;
			if (!hasUnsavedChanges()) return;

			const {
				formData: currentData,
				fieldMetadata: currentMeta,
				lockedFields: currentLocks,
			} = stateRef.current;

			const lockedFieldsObj: Record<string, boolean> = {};
			currentLocks.forEach((id) => (lockedFieldsObj[id] = true));

			// Recompute completion for the background save
			const completenessPercent = computeBorrowerCompletion(currentData);

			const dataToSave = {
				...currentData,
				_metadata: currentMeta,
				_lockedFields: lockedFieldsObj,
				completenessPercent,
			};

			void saveProjectBorrowerResume(projectId, dataToSave, {
				// Background autosave on unmount should NOT create a new
				// borrower_resumes version row every time. Persist changes
				// in-place instead to avoid cluttering history with
				// minor/autosave-only snapshots.
				createNewVersion: false,
			})
				.then(() => {
					if (typeof window !== "undefined") {
						localStorage.removeItem(storageKey);
					}
				})
				.catch((err) =>
					console.error(
						"[BorrowerResumeForm] Unmount save failed",
						err
					)
				);
		};
	}, [hasUnsavedChanges, projectId, storageKey]);

	// Warn on close
	useEffect(() => {
		if (typeof window === "undefined") return;
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (!hasUnsavedChanges()) return;
			event.preventDefault();
			event.returnValue = "";
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [hasUnsavedChanges]);

	// Helpers for UI
	const isFieldLocked = useCallback(
		(fieldId: string, _sectionId?: string): boolean => {
			if (unlockedFields.has(fieldId)) return false;
			if (lockedFields.has(fieldId)) return true;
			return false;
		},
		[lockedFields, unlockedFields]
	);

	const toggleFieldLock = useCallback(
		(fieldId: string) => {
			const currentlyLocked = (() => {
				if (unlockedFields.has(fieldId)) return false;
				if (lockedFields.has(fieldId)) return true;
				return false;
			})();

			if (currentlyLocked) {
				setLockedFields((prev) => {
					const n = new Set(prev);
					n.delete(fieldId);
					return n;
				});
				setUnlockedFields((prev) => {
					const n = new Set(prev);
					n.add(fieldId);
					return n;
				});
			} else {
				setLockedFields((prev) => {
					const n = new Set(prev);
					n.add(fieldId);
					return n;
				});
				setUnlockedFields((prev) => {
					const n = new Set(prev);
					n.delete(fieldId);
					return n;
				});
			}
		},
		[unlockedFields, lockedFields]
	);

	const isSubsectionFullyLocked = useCallback(
		(fieldIds: string[]) => {
			if (fieldIds.length === 0) return false;
			return fieldIds.every(
				(id) => !unlockedFields.has(id) && lockedFields.has(id)
			);
		},
		[lockedFields, unlockedFields]
	);

	const toggleSubsectionLock = useCallback(
		(fieldIds: string[]) => {
			const isLocked = isSubsectionFullyLocked(fieldIds);
			setLockedFields((prev) => {
				const next = new Set(prev);
				fieldIds.forEach((id) => {
					let value = (formData as any)[id];
					let hasValue = isValueProvided(value);

					// Principals: require all rows to be complete before locking
					if (id === "principals") {
						hasValue = hasCompletePrincipals(
							(formData as any).principals
						);
					}

					if (isLocked) next.delete(id);
					else if (hasValue) next.add(id);
				});
				return next;
			});
			setUnlockedFields((prev) => {
				const next = new Set(prev);
				fieldIds.forEach((id) => next.delete(id));
				return next;
			});
		},
		[isSubsectionFullyLocked, formData]
	);

	const getFieldStylingClasses = useCallback(
		(fieldId: string, sectionId?: string) => {
			const value = (formData as any)[fieldId];
			const hasValue = isValueProvided(value);
			const locked = isFieldLocked(fieldId, sectionId);
			const meta = fieldMetadata[fieldId];
			const hasSources =
				meta && Array.isArray(meta.sources) && meta.sources.length > 0;

			const base =
				"w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm transition-colors duration-200";

			if (!hasValue) {
				if (hasSources) {
					if (locked)
						return cn(
							base,
							"border-emerald-500 bg-emerald-50 focus:ring-emerald-200 text-gray-800"
						);
					return cn(
						base,
						"border-blue-600 bg-blue-50 focus:ring-blue-200 text-gray-800"
					);
				}
				return cn(base, "border-gray-200 bg-white focus:ring-blue-200");
			}
			if (locked)
				return cn(
					base,
					"border-emerald-500 bg-emerald-50 focus:ring-emerald-200 text-gray-800"
				);
			return cn(
				base,
				"border-blue-600 bg-blue-50 focus:ring-blue-200 text-gray-800"
			);
		},
		[formData, fieldMetadata, isFieldLocked]
	);

	const isFieldBlue = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			const value = (formData as any)[fieldId];
			const hasValue = isValueProvided(value);
			const locked = isFieldLocked(fieldId, sectionId);
			const meta = fieldMetadata[fieldId];
			const hasSources =
				meta && Array.isArray(meta.sources) && meta.sources.length > 0;

			if (!hasValue) {
				return !!(hasSources && !locked);
			}
			return !locked;
		},
		[formData, fieldMetadata, isFieldLocked]
	);

	const isFieldGreen = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			const value = (formData as any)[fieldId];
			const hasValue = isValueProvided(value);
			const locked = isFieldLocked(fieldId, sectionId);
			const meta = fieldMetadata[fieldId];
			const hasSources =
				meta && Array.isArray(meta.sources) && meta.sources.length > 0;
			return !!((hasValue || hasSources) && locked);
		},
		[formData, fieldMetadata, isFieldLocked]
	);

	const isFieldWhite = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			const value = (formData as any)[fieldId];
			const hasValue = isValueProvided(value);
			const meta = fieldMetadata[fieldId];
			const hasSources =
				meta && Array.isArray(meta.sources) && meta.sources.length > 0;
			return !hasValue && !hasSources;
		},
		[formData, fieldMetadata]
	);

	const renderFieldLockButton = useCallback(
		(fieldId: string, sectionId: string) => {
			const locked = isFieldLocked(fieldId, sectionId);
			const value = (formData as any)[fieldId];

			let hasValue = isValueProvided(value);
			// For principals table, require each row to be complete
			if (fieldId === "principals") {
				hasValue = hasCompletePrincipals((formData as any).principals);
			}

			const isDisabled = !hasValue && !locked;

			const tooltipTitle = isDisabled
				? "Cannot lock an empty field. Please fill in a value first."
				: locked
				? "Unlock field"
				: "Lock field";

			return (
				<div className="flex items-center" title={tooltipTitle}>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							if (!isDisabled) toggleFieldLock(fieldId);
						}}
						disabled={isDisabled}
						className={cn(
							"flex items-center justify-center p-1 rounded transition-colors z-10",
							isDisabled
								? "cursor-not-allowed text-gray-300"
								: "cursor-pointer",
							locked
								? "text-emerald-600 hover:text-emerald-700"
								: "text-gray-400 hover:text-blue-600"
						)}
					>
						{locked ? (
							<Lock className="h-4 w-4" />
						) : (
							<Unlock className="h-4 w-4" />
						)}
					</button>
				</div>
			);
		},
		[isFieldLocked, formData, toggleFieldLock]
	);

	const getFieldWarning = useCallback(
		(fieldId: string) => {
			const meta = fieldMetadata[fieldId];
			if (!meta?.warnings || meta.warnings.length === 0) return null;
			return meta.warnings.join(" ");
		},
		[fieldMetadata]
	);

	const renderFieldLabel = useCallback(
		(
			fieldId: string,
			sectionId: string,
			labelText: string,
			required: boolean = false
		) => {
			const warning = getFieldWarning(fieldId);
			return (
				<div className="mb-1">
					<label className="flex text-sm font-medium text-gray-700 items-center gap-2 relative group/field w-full">
						<span>
							{labelText}{" "}
							{required && (
								<span className="text-red-500 ml-1">*</span>
							)}
						</span>
						<FieldHelpTooltip
							fieldId={fieldId}
							fieldMetadata={fieldMetadata[fieldId]}
						/>
						{warning && (
							<span className="text-xs text-amber-700 flex items-center gap-1">
								<AlertTriangle className="h-3 w-3" />
								{warning}
							</span>
						)}
						<div className="ml-auto flex items-center gap-1">
							<button
								type="button"
								onClick={() => onAskAI?.(fieldId)}
								className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-xs font-medium text-blue-600 opacity-0 group-hover/field:opacity-100 transition-opacity"
							>
								Ask AI
							</button>
							{renderFieldLockButton(fieldId, sectionId)}
						</div>
					</label>
				</div>
			);
		},
		[fieldMetadata, onAskAI, renderFieldLockButton, getFieldWarning]
	);

	const renderDynamicField = useCallback(
		(fieldId: string, sectionId: string) => {
			// Field control overrides similar to EnhancedProjectForm
			const fieldControlOverrides: Record<string, string> = {
				primaryEntityStructure: "button-select",
				yearsCREExperienceRange: "button-select",
				totalDealValueClosedRange: "button-select",
				creditScoreRange: "button-select",
				netWorthRange: "button-select",
				liquidityRange: "button-select",
				bankruptcyHistory: "button-select",
				foreclosureHistory: "button-select",
				litigationHistory: "button-select",
				principalRoleDefault: "button-select",
			};

			const fieldConfig = (formSchema as any).fields?.[fieldId] ?? {};
			const label = fieldConfig.label || fieldId;
			const required = fieldConfig.required || false;
			const meta = borrowerResumeFieldMetadata[fieldId];
			const dataType = (meta as any)?.dataType;
			const isLocked = isFieldLocked(fieldId, sectionId);
			const disabled = isLocked;
			const value = (formData as any)[fieldId] ?? "";
			const styling = getFieldStylingClasses(fieldId, sectionId);

			// Check if we have data (value or sources) for coloring button-select
			const metaFromState = fieldMetadata[fieldId];
			const hasSources =
				metaFromState &&
				Array.isArray(metaFromState.sources) &&
				metaFromState.sources.length > 0;
			const hasValue = isValueProvided(value);

			let controlType = fieldControlOverrides[fieldId] || "input";
			if (!controlType) {
				if (dataType === "Dropdown") controlType = "select";
				if (dataType === "Textarea") controlType = "textarea";
				if (dataType === "Boolean") controlType = "button-select";
				if (dataType === "Multi-select") controlType = "multi-select";
				if (dataType === "Percent") controlType = "number";
			}

			const optionsRegistry: Record<string, any[]> = {
				primaryEntityStructure: entityStructureOptions,
				yearsCREExperienceRange: experienceRangeOptions,
				totalDealValueClosedRange: dealValueRangeOptions,
				creditScoreRange: creditScoreRangeOptions,
				netWorthRange: netWorthRangeOptions,
				liquidityRange: liquidityRangeOptions,
				assetClassesExperience: assetClassOptions,
				geographicMarketsExperience: geographicMarketsOptions,
				principalRoleDefault: principalRoleOptions.map((r) => ({
					label: r,
					value: r,
				})),
				bankruptcyHistory: [
					{ label: "Yes", value: true },
					{ label: "No", value: false },
				],
				foreclosureHistory: [
					{ label: "Yes", value: true },
					{ label: "No", value: false },
				],
				litigationHistory: [
					{ label: "Yes", value: true },
					{ label: "No", value: false },
				],
			};

			const options = optionsRegistry[fieldId] || [];

			return (
				<FormGroup key={fieldId}>
					<AskAIButton id={fieldId} onAskAI={onAskAI || (() => {})}>
						<div className="relative group/field">
							{renderFieldLabel(
								fieldId,
								sectionId,
								label,
								required
							)}

							{controlType === "textarea" && (
								<textarea
									id={fieldId}
									value={value}
									onChange={(e) =>
										handleInputChange(
											fieldId,
											e.target.value
										)
									}
									disabled={disabled}
									className={cn(
										styling,
										"h-24 font-mono text-xs"
									)}
									data-field-id={fieldId}
									data-field-type="textarea"
									data-field-section={sectionId}
									data-field-label={label}
								/>
							)}

							{controlType === "select" && (
								<Select
									id={fieldId}
									value={value}
									onChange={(e) =>
										handleInputChange(
											fieldId,
											e.target.value
										)
									}
									options={options.map((o) =>
										typeof o === "string"
											? { label: o, value: o }
											: o
									)}
									disabled={disabled}
									className={styling}
									data-field-id={fieldId}
									data-field-type="select"
									data-field-section={sectionId}
									data-field-label={label}
								/>
							)}

							{controlType === "button-select" && (
								<div
									data-field-id={fieldId}
									data-field-type="button-select"
									data-field-section={sectionId}
									data-field-label={label}
								>
									<ButtonSelect
										label=""
										options={
											options.length
												? options
												: [
														{
															label: "Yes",
															value: true,
														},
														{
															label: "No",
															value: false,
														},
												  ]
										}
										selectedValue={value}
										onSelect={(v) =>
											handleInputChange(fieldId, v)
										}
										disabled={disabled}
										isLocked={isLocked}
										isTouched={hasValue || hasSources}
									/>
								</div>
							)}

							{controlType === "multi-select" && (
								<div
									data-field-id={fieldId}
									data-field-type="multi-select"
									data-field-section={sectionId}
									data-field-label={label}
								>
									<MultiSelectPills
										label=""
										options={options}
										selectedValues={value || []}
										onSelect={(v) =>
											handleInputChange(fieldId, v)
										}
										disabled={disabled}
										isLocked={isLocked}
									/>
								</div>
							)}

							{(controlType === "input" ||
								controlType === "number") && (
								<Input
									id={fieldId}
									type={
										controlType === "number"
											? "number"
											: "text"
									}
									value={value}
									onChange={(e) =>
										handleInputChange(
											fieldId,
											controlType === "number"
												? parseFloat(e.target.value)
												: e.target.value
										)
									}
									disabled={disabled}
									className={styling}
									data-field-id={fieldId}
									data-field-type={controlType}
									data-field-section={sectionId}
									data-field-label={label}
								/>
							)}
						</div>
					</AskAIButton>
				</FormGroup>
			);
		},
		[
			formData,
			getFieldStylingClasses,
			handleInputChange,
			isFieldLocked,
			onAskAI,
			renderFieldLabel,
			fieldMetadata,
		]
	);

	// Subsections logic
	const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(
		new Set()
	);
	const [manuallyToggledSubsections, setManuallyToggledSubsections] =
		useState<Set<string>>(new Set());

	const toggleSubsection = useCallback((key: string) => {
		setManuallyToggledSubsections((prev) => {
			const n = new Set(prev);
			n.add(key);
			return n;
		});
		setExpandedSubsections((prev) => {
			const n = new Set(prev);
			if (n.has(key)) n.delete(key);
			else n.add(key);
			return n;
		});
	}, []);

	// Auto-update subsection state
	useEffect(() => {
		const schemaSteps: any[] = (formSchema as any).steps || [];
		const autoOpenSubsections = new Set<string>();
		const autoCloseSubsections = new Set<string>();

		schemaSteps.forEach((step) => {
			const sectionId: string = step.id;
			const subsections: any[] = step.subsections || [];

			subsections.forEach((subsection: any) => {
				const subsectionKey = `${sectionId}::${subsection.id}`;
				const fieldIds: string[] = subsection.fields || [];

				if (fieldIds.length === 0) return;

				const fieldStates = fieldIds.map((fieldId) => ({
					isBlue: isFieldBlue(fieldId, sectionId),
					isGreen: isFieldGreen(fieldId, sectionId),
					isWhite: isFieldWhite(fieldId, sectionId),
				}));

				const allGreen = fieldStates.every((s) => s.isGreen);
				const allWhite = fieldStates.every((s) => s.isWhite);
				const hasBlue = fieldStates.some((s) => s.isBlue);

				if (hasBlue) {
					autoOpenSubsections.add(subsectionKey);
				} else if (allGreen || allWhite) {
					autoCloseSubsections.add(subsectionKey);
				}
			});
		});

		setExpandedSubsections((prev) => {
			const next = new Set(prev);
			autoOpenSubsections.forEach((key) => {
				if (!manuallyToggledSubsections.has(key)) next.add(key);
			});
			autoCloseSubsections.forEach((key) => {
				if (!manuallyToggledSubsections.has(key)) next.delete(key);
			});
			return next;
		});
	}, [
		formData,
		fieldMetadata,
		lockedFields,
		unlockedFields,
		isFieldBlue,
		isFieldGreen,
		isFieldWhite,
		manuallyToggledSubsections,
	]);

	// Scroll to field
	useEffect(() => {
		if (!initialFocusFieldId) return;
		const selector = `[data-field-id="${initialFocusFieldId}"], #${initialFocusFieldId}`;
		const el = document.querySelector<HTMLElement>(selector);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
			const focusable = el.matches("input,select,textarea")
				? el
				: el.querySelector("input,select,textarea");
			(focusable as HTMLElement | null)?.focus?.();
		}
	}, [initialFocusFieldId]);

	const wrappedHandleAutofill = useCallback(async () => {
		try {
			const lockedFieldsObj: Record<string, boolean> = {};
			lockedFields.forEach((id) => {
				lockedFieldsObj[id] = true;
			});

			const dataToSave = {
				...formData,
				_metadata: fieldMetadata,
				_lockedFields: lockedFieldsObj,
			};

			try {
				await saveProjectBorrowerResume(projectId, dataToSave, {
					createNewVersion: false,
				});
			} catch (saveErr) {
				console.error(
					"[BorrowerResumeForm] Failed to persist locks before autofill:",
					saveErr
				);
			}

			await startAutofill();
		} catch (err) {
			console.error("Autofill failed:", err);
		}
	}, [startAutofill, formData, fieldMetadata, lockedFields, projectId]);

	const steps = useMemo(() => {
		const schemaSteps: any[] = (formSchema as any).steps || [];

		const sectionIconComponents: Record<
			string,
			React.ComponentType<{ className?: string }>
		> = {
			Users,
			Briefcase,
			DollarSign,
			Globe,
			Award,
			AlertTriangle,
			FileText,
		};

		return schemaSteps.map((step) => {
			const sectionId = step.id;
			const IconComponent =
				(step.icon && sectionIconComponents[step.icon as string]) ||
				FileText;

			return {
				id: sectionId,
				title: step.title,
				component: (
					<div className="space-y-6">
						<div className="mb-2 flex items-center justify-between">
							<h2 className="text-xl font-semibold text-gray-800 flex items-center">
								<IconComponent className="h-5 w-5 mr-2 text-blue-600" />{" "}
								{step.title}
							</h2>
						</div>

						{step.subsections?.map((sub: any) => {
							const subKey = `${sectionId}::${sub.id}`;
							const isExpanded = expandedSubsections.has(subKey);

							// For principals subsection, we lock based on the principals table field
							const subsectionFields =
								sub.id === "principal-details"
									? ["principals"]
									: (sub.fields as string[]);

							const isLocked = isSubsectionFullyLocked(
								subsectionFields
							);

							const fieldStates =
								sub.id === "principal-details"
									? [
											{
												isBlue:
													Array.isArray(
														formData.principals
													) &&
													(formData.principals as any[])
														.length > 0 &&
													!isFieldLocked(
														"principals",
														sectionId
													),
												isGreen:
													Array.isArray(
														formData.principals
													) &&
													(formData.principals as any[])
														.length > 0 &&
													isFieldLocked(
														"principals",
														sectionId
													),
												hasValue:
													hasCompletePrincipals(
														formData.principals
													),
											},
									  ]
									: subsectionFields.length > 0
									? subsectionFields.map((fieldId) => ({
											isBlue: isFieldBlue(
												fieldId,
												sectionId
											),
											isGreen: isFieldGreen(
												fieldId,
												sectionId
											),
											hasValue: isValueProvided(
												(formData as any)[fieldId]
											),
									  }))
									: [];

							const hasBlue = fieldStates.some((s) => s.isBlue);
							const allGreen =
								fieldStates.length > 0 &&
								fieldStates.every((s) => s.isGreen);

							const showComplete =
								fields.length > 0 && allGreen && !hasBlue;
							const showNeedsInput = hasBlue;

							const hasEmptyField = fieldStates.some(
								(s) => !s.hasValue
							);
							const subsectionLockDisabled =
								!isLocked && hasEmptyField;

							// Custom Table Wrapper Styling
							const getTableWrapperClasses = (
								fieldId: string
							) => {
								const value = (formData as any)[fieldId];
								const hasValue = isValueProvided(value);
								const locked = isFieldLocked(
									fieldId,
									sectionId
								);

								const base =
									"w-full border rounded-md text-sm transition-colors duration-200";
								if (!hasValue)
									return cn(
										base,
										"border-gray-200 bg-white hover:border-gray-300"
									);
								if (locked)
									return cn(
										base,
										"border-emerald-500 bg-emerald-50 hover:border-emerald-600"
									);
								return cn(
									base,
									"border-blue-600 bg-blue-50 hover:border-blue-700"
								);
							};

							return (
								<div
									key={sub.id}
									className="rounded-md border border-gray-200 bg-gray-50 overflow-hidden shadow-md"
								>
									<button
										type="button"
										onClick={() => toggleSubsection(subKey)}
										className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
									>
										<div className="flex items-center gap-2">
											{isExpanded ? (
												<ChevronDown className="h-4 w-4 text-gray-500" />
											) : (
												<ChevronRight className="h-4 w-4 text-gray-500" />
											)}
											<h3 className="text-sm font-semibold text-gray-800">
												{sub.title.replace(
													/^\d+\.\d+\s*/,
													""
												)}
											</h3>
										</div>
										<div className="flex items-center gap-2">
											<div
												onClick={(e) => {
													e.stopPropagation();
 													if (subsectionLockDisabled)
														return;
 													toggleSubsectionLock(
 														subsectionFields
 													);
												}}
												className={cn(
													"flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all border",
													subsectionLockDisabled
														? "cursor-not-allowed bg-gray-50 text-gray-400 border-gray-200"
														: "cursor-pointer",
													!subsectionLockDisabled &&
														(isLocked
															? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
															: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100")
												)}
												title={
													subsectionLockDisabled
														? "Cannot lock subsection because one or more fields are empty. Please fill in all fields first."
														: isLocked
														? "Unlock subsection"
														: "Lock subsection"
												}
											>
												{isLocked ? (
													<>
														<Lock className="h-3 w-3" />
														<span>Unlock</span>
													</>
												) : (
													<>
														<Unlock className="h-3 w-3" />
														<span>Lock</span>
													</>
												)}
											</div>
											{showComplete && (
												<span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
													Complete
												</span>
											)}
											{showNeedsInput && (
												<span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
													Needs Input
												</span>
											)}
										</div>
									</button>

									{isExpanded && (
										<div className="p-3 pt-0 space-y-4">
											{sub.id === "principal-details" ? (
												<div
													className={cn(
														getTableWrapperClasses(
															"principals"
														),
														"p-4"
													)}
												>
													<div className="mb-3 flex items-center justify-between">
														<div className="flex items-center gap-2">
															<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
																Key Principals
															</h4>
															<FieldHelpTooltip
																fieldId="principals"
																fieldMetadata={
																	fieldMetadata[
																		"principals"
																	]
																}
															/>
														</div>
														<div className="flex items-center gap-1">
															{renderFieldLockButton(
																"principals",
																sectionId
															)}
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
																{(() => {
																	const principals: Principal[] =
																		Array.isArray(
																			formData.principals
																		)
																			? (formData.principals as Principal[])
																			: [];
																	const isLockedPrincipals =
																		isFieldLocked(
																			"principals",
																			sectionId
																		);

																	const handlePrincipalRowChange =
																		(
																			index: number,
																			key: keyof Principal,
																			raw: any
																		) => {
																			const next: Principal[] =
																				[
																					...principals,
																				];
																			const current =
																				next[
																					index
																				] || ({} as Principal);
																			let value: any =
																				raw;
																			if (
																				key ===
																					"ownershipPercentage" &&
																				typeof raw ===
																					"string"
																			) {
																				const num =
																					raw.trim() ===
																					""
																						? undefined
																						: Number(
																								raw
																						  );
																				value =
																					Number.isNaN(
																						num
																					)
																						? undefined
																						: num;
																			}
																			next[index] =
																				{
																					...current,
																					[key]:
																						value,
																				};
																			handleInputChange(
																				"principals",
																				next
																			);
																		};

																	const handleAddPrincipalRow =
																		() => {
																			const next: Principal[] =
																				[
																					...principals,
																				];
																			next.push({
																				id: Math.random()
																					.toString(36)
																					.slice(
																						2
																					),
																				principalLegalName:
																					"",
																				principalRoleDefault:
																					"Key Principal",
																				principalEmail:
																					"",
																				ownershipPercentage:
																					undefined as any,
																				principalBio:
																					"",
																			} as Principal);
																			handleInputChange(
																				"principals",
																				next
																			);
																		};

																	const rowsToRender =
																		principals.length >
																		0
																			? principals
																			: ([] as Principal[]);

																	return (
																		<>
																			{rowsToRender.map(
																				(
																					p,
																					idx
																				) => (
																					<tr
																						key={
																							p.id ||
																							idx
																						}
																					>
																						<td className="px-3 py-2 align-middle">
																							<input
																								type="text"
																								className="w-40 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																								value={
																									p.principalLegalName ||
																									""
																								}
																								onChange={(
																									e
																								) =>
																									handlePrincipalRowChange(
																										idx,
																										"principalLegalName",
																										e
																											.target
																											.value
																									)
																								}
																								disabled={
																									isLockedPrincipals
																								}
																							/>
																						</td>
																						<td className="px-3 py-2 align-middle">
																							<Select
																								value={
																									p.principalRoleDefault ||
																									"Key Principal"
																								}
																								onChange={(
																									e
																								) =>
																									handlePrincipalRowChange(
																										idx,
																										"principalRoleDefault",
																										e
																											.target
																											.value as PrincipalRole
																									)
																								}
																								options={principalRoleOptions.map(
																									(
																										o
																									) => ({
																										label: o,
																										value: o,
																									})
																								)}
																								disabled={
																									isLockedPrincipals
																								}
																								className="w-40"
																							/>
																						</td>
																						<td className="px-3 py-2 align-middle">
																							<input
																								type="email"
																								className="w-48 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																								value={
																									p.principalEmail ||
																									""
																								}
																								onChange={(
																									e
																								) =>
																									handlePrincipalRowChange(
																										idx,
																										"principalEmail",
																										e
																											.target
																											.value
																									)
																								}
																								disabled={
																									isLockedPrincipals
																								}
																							/>
																						</td>
																						<td className="px-3 py-2 align-middle">
																							<input
																								type="number"
																								min={
																									0
																								}
																								className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																								value={
																									p.ownershipPercentage ??
																									""
																								}
																								onChange={(
																									e
																								) =>
																									handlePrincipalRowChange(
																										idx,
																										"ownershipPercentage",
																										e
																											.target
																											.value
																									)
																								}
																								disabled={
																									isLockedPrincipals
																								}
																							/>
																						</td>
																						<td className="px-3 py-2 align-middle">
																							<textarea
																								className="w-64 rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
																								rows={
																									2
																								}
																								value={
																									p.principalBio ||
																									""
																								}
																								onChange={(
																									e
																								) =>
																									handlePrincipalRowChange(
																										idx,
																										"principalBio",
																										e
																											.target
																											.value
																									)
																								}
																								disabled={
																									isLockedPrincipals
																								}
																							/>
																						</td>
																						<td className="px-3 py-2 align-middle text-right">
																							<Button
																								size="sm"
																								variant="ghost"
																								onClick={() =>
																									handleRemovePrincipal(
																										idx
																									)
																								}
																								disabled={
																									isLockedPrincipals
																								}
																								className="text-red-500 hover:bg-red-50"
																							>
																								<Trash2
																									size={
																										16
																									}
																								/>
																							</Button>
																						</td>
																					</tr>
																				)
																			)}
																			<tr>
																				<td
																					colSpan={
																						6
																					}
																					className="px-3 py-3 text-right"
																				>
																					<Button
																						type="button"
																						variant="secondary"
																						size="sm"
																						onClick={
																							handleAddPrincipalRow
																						}
																						disabled={
																							isLockedPrincipals
																						}
																					>
																						<Plus className="h-4 w-4 mr-1" />
																						Add Principal
																					</Button>
																				</td>
																			</tr>
																		</>
																	);
																})()}
															</tbody>
														</table>
													</div>
												</div>
											) : (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													{fields.map((fieldId) =>
														renderDynamicField(
															fieldId,
															sectionId
														)
													)}
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				),
			};
		});
	}, [
		expandedSubsections,
		toggleSubsection,
		toggleSubsectionLock,
		isSubsectionFullyLocked,
		renderDynamicField,
		formData,
		handleRemovePrincipal,
		fieldMetadata,
		renderFieldLockButton,
		isFieldLocked,
		isFieldBlue,
		isFieldGreen,
		isFieldWhite,
	]);

	if (!isEditing) {
		return (
			<BorrowerResumeView
				resume={formData}
				projectId={projectId}
				onEdit={() => setIsEditing(true)}
				onVersionChange={reloadBorrowerResume}
			/>
		);
	}

	return (
		<div
			className={cn(
				"h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden",
				compact && "p-4"
			)}
		>
			<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
				<div className="flex items-center gap-3">
					<FileText className="h-5 w-5 text-blue-600" />
					<div className="flex items-center gap-2">
						<h3 className="text-xl md:text-2xl font-semibold text-gray-900">
							Borrower Resume
						</h3>
						<div className="relative group">
							<HelpCircle className="h-4 w-4 text-gray-400 hover:text-blue-600 cursor-help" />
							<div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 transform opacity-0 transition-opacity duration-150 group-hover:opacity-100">
								<div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg">
									Provide your borrower details. Fields can be
									autofilled from documents and locked.
								</div>
							</div>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{lastSavedAt && (
						<span className="text-xs text-gray-500 mr-2 hidden sm:inline-block">
							Draft saved{" "}
							{new Date(lastSavedAt).toLocaleTimeString()}
						</span>
					)}
					<Button
						variant="outline"
						size="sm"
						onClick={wrappedHandleAutofill}
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
							<Sparkles className="h-4 w-4 text-blue-600" />
						)}
						<span className="text-xs font-medium">
							{isAutofilling ? "Autofilling..." : "Autofill"}
						</span>
						{showSparkles && (
							<span className="absolute -inset-1 pointer-events-none rounded-md border border-blue-200" />
						)}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleFormSubmit()}
						isLoading={formSaved}
						disabled={formSaved}
					>
						{formSaved ? "Saving..." : "Save & Exit"}
					</Button>
					{onCopyBorrowerResume && (
						<Button
							variant="outline"
							size="sm"
							onClick={onCopyBorrowerResume}
							disabled={copyDisabled || copyLoading}
						>
							{copyLoading ? (
								"Copying..."
							) : (
								<>
									<Copy className="h-4 w-4 mr-1" /> Copy
									Profile
								</>
							)}
						</Button>
					)}
					<div className="ml-2">
						<BorrowerResumeVersionHistory
							projectId={projectId}
							onRollbackSuccess={() => {
								setRefreshKey((prev) => prev + 1);
								reloadBorrowerResume();
								onVersionChange?.();
							}}
						/>
					</div>
				</div>
			</div>

			<div className="p-4">
				{showAutofillNotification && (
					<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 flex gap-2">
						<Info className="h-4 w-4 mt-0.5" />
						<span>
							Autofill complete. Data from documents has been
							applied.
						</span>
					</div>
				)}

				<FormWizard
					steps={steps}
					onComplete={() => handleFormSubmit()}
					showProgressBar={false}
					showStepIndicators={false}
					allowSkip
					variant="tabs"
					showBottomNav
				/>
			</div>
		</div>
	);
};
