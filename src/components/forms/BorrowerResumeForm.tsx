"use client";

import React, {
	useState,
	useEffect,
	useMemo,
	useRef,
	useCallback,
} from "react";
import { FormGroup } from "../ui/Form";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { ButtonSelect } from "../ui/ButtonSelect";
import { AskAIButton } from "../ui/AskAIProvider";
import { FieldHelpTooltip } from "../ui/FieldHelpTooltip";
import { FieldWarningsTooltip } from "../ui/FieldWarningsTooltip";
import { HelpCircle } from "lucide-react";
import { useAutofill } from "@/hooks/useAutofill";
import { AlertModal } from "@/components/ui/AlertModal";
import { cn } from "@/utils/cn";
import { supabase } from "@/lib/supabaseClient";
import {
	FileText,
	DollarSign,
	Building,
	Globe,
	Calendar,
	Users,
	Calculator,
	AlertTriangle,
	Info,
	Sparkles,
	Loader2,
	BarChart,
	Copy,
	Briefcase,
	Award,
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
import { TrackRecordItem, ReferenceItem } from "@/lib/project-queries";
import { useProjectBorrowerResumeRealtime } from "@/hooks/useProjectBorrowerResumeRealtime";
import { BorrowerResumeView } from "./BorrowerResumeView";
import { MultiSelectPills } from "../ui/MultiSelectPills";
import { useAuth } from "@/hooks/useAuth";
import { isFieldVisibleForDealType, type DealType } from "@/lib/deal-type-field-config";
import { buildWorkspaceStepId } from "./enhanced-project-form-constants";
import {
	entityStructureOptions,
	experienceRangeOptions,
	dealValueRangeOptions,
	creditScoreRangeOptions,
	netWorthRangeOptions,
	liquidityRangeOptions,
	principalRoleOptions,
	assetClassOptions,
	geographicMarketsOptions,
} from "@/features/borrower-resume/constants";
import { isBorrowerValueProvided } from "@/features/borrower-resume/domain/isBorrowerValueProvided";
import { hasCompletePrincipals } from "@/features/borrower-resume/domain/hasCompletePrincipals";
import { sanitizeBorrowerProfile } from "@/features/borrower-resume/domain/sanitizeBorrowerProfile";
import {
	isFieldLocked as isFieldLockedSelector,
	isSubsectionFullyLocked as isSubsectionFullyLockedSelector,
} from "@/features/borrower-resume/domain/lockSelectors";
import {
	isFieldBlue as isFieldBlueSelector,
	isFieldGreen as isFieldGreenSelector,
	isFieldWhite as isFieldWhiteSelector,
	isFieldRed as isFieldRedSelector,
} from "@/features/borrower-resume/domain/fieldStateSelectors";
import { getSubsectionBadgeState } from "@/features/borrower-resume/domain/subsectionBadgeState";
import {
	buildFieldLabelMap,
	mapWarningsToLabels as mapWarningsToLabelsSelector,
} from "@/features/borrower-resume/domain/schemaSelectors";
import { useBorrowerResumePersistence } from "@/features/borrower-resume/hooks/useBorrowerResumePersistence";
import { useBorrowerResumeDraft } from "@/features/borrower-resume/hooks/useBorrowerResumeDraft";
import { useBorrowerResumeValidation } from "@/features/borrower-resume/hooks/useBorrowerResumeValidation";
import { BorrowerFieldLockButton } from "@/features/borrower-resume/components/BorrowerFieldLockButton";
import { BorrowerFieldLabelRow } from "@/features/borrower-resume/components/BorrowerFieldLabelRow";
import { BorrowerResumeSubsection } from "@/features/borrower-resume/components/BorrowerResumeSubsection";
import { BorrowerResumeWizard } from "@/features/borrower-resume/components/BorrowerResumeWizard";
import { PrincipalsEditor } from "@/features/borrower-resume/editors/PrincipalsEditor";
import { TrackRecordEditor } from "@/features/borrower-resume/editors/TrackRecordEditor";
import { ReferencesEditor } from "@/features/borrower-resume/editors/ReferencesEditor";

interface BorrowerResumeFormProps {
	projectId: string;
	onComplete?: (profile: BorrowerResumeContent) => void;
	compact?: boolean;
	onAskAI?: (fieldId: string) => void;
	onFormDataChange?: (formData: Partial<BorrowerResumeContent>) => void;
	initialFocusFieldId?: string;
	onVersionChange?: () => void;
	initialStepId?: string | null;
	// Borrower specific props
	onCopyBorrowerResume?: () => void;
	copyDisabled?: boolean;
	copyLoading?: boolean;
	progressPercent?: number;
	onProgressChange?: (percent: number) => void;
	canEdit?: boolean; // Whether the user has edit permission
	onDirtyChange?: (isDirty: boolean) => void;
	onRegisterSave?: (saveFn: () => Promise<void>) => void;
	dealType?: 'ground_up' | 'refinance'; // Deal type for field filtering
}

export const BorrowerResumeForm: React.FC<BorrowerResumeFormProps> = ({
	projectId,
	onComplete,
	compact,
	onAskAI,
	onFormDataChange,
	initialFocusFieldId,
	onVersionChange,
	initialStepId,
	onCopyBorrowerResume,
	copyDisabled,
	copyLoading,
	onProgressChange,
	canEdit = true, // Default to true for backward compatibility
	onDirtyChange,
	onRegisterSave,
	dealType = 'ground_up', // Default to ground_up for legacy projects
}) => {
	const {
		content: borrowerResume,
		isLoading: resumeLoading,
		save,
		reload: reloadBorrowerResume,
		isRemoteUpdate,
	} = useProjectBorrowerResumeRealtime(projectId);
	const { user } = useAuth();

	// State
	const [isEditing, setIsEditing] = useState(false);
	const sanitizedBorrower = useMemo(
		() => (borrowerResume ? sanitizeBorrowerProfile(borrowerResume) : {}),
		[borrowerResume]
	);
	const [formData, setFormData] =
		useState<Partial<BorrowerResumeContent>>(sanitizedBorrower);

	const fieldLabelMap = useMemo(
		() => buildFieldLabelMap(formSchema as { fields?: Record<string, { label?: string }> }),
		[]
	);

	const mapWarningsToLabels = useCallback(
		(warnings?: string[] | null): string[] | undefined =>
			mapWarningsToLabelsSelector(warnings ?? null, fieldLabelMap),
		[fieldLabelMap]
	);
	const [fieldMetadata, setFieldMetadata] = useState<Record<string, any>>(
		(sanitizedBorrower as any)._metadata || {}
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
	const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);

	const touchWorkspace = useCallback(
		async (stepId?: string) => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user?.id || !projectId) return;
			const nowIso = new Date().toISOString();


			const insertPayload: Record<string, any> = {
				project_id: projectId,
				user_id: user.id,
				last_visited_at: nowIso,
			};
			if (stepId) insertPayload.last_step_id = buildWorkspaceStepId(stepId);

			const updatePayload: Record<string, any> = {
				last_visited_at: nowIso,
			};
			if (stepId) updatePayload.last_step_id = buildWorkspaceStepId(stepId);

			// Check if record exists first to avoid ON CONFLICT 400 error
			const { data: existing } = await supabase
				.from("project_workspace_activity")
				.select("id")
				.eq("project_id", projectId)
				.eq("user_id", user.id)
				.maybeSingle();

			if (existing) {
				await supabase
					.from("project_workspace_activity")
					.update(updatePayload)
					.eq("id", existing.id);
			} else {
				await supabase
					.from("project_workspace_activity")
					.insert(insertPayload);
			}
		},
		[projectId]
	);

	// Map to store refs for field wrappers (for tooltip triggers)
	const fieldWrapperRefs = useRef<
		Map<string, React.RefObject<HTMLDivElement>>
	>(new Map());

	// Debounced field activity tracking
	const fieldActivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const trackFieldActivity = useCallback(
		(fieldId: string) => {
			if (fieldActivityTimeoutRef.current) {
				clearTimeout(fieldActivityTimeoutRef.current);
			}
			fieldActivityTimeoutRef.current = setTimeout(async () => {
				if (!projectId || !user) return;
				const now = new Date().toISOString();

				// Standard table update as fallback for RPC which seems to be failing
				try {
					const { data: existing } = await supabase
						.from("project_workspace_activity")
						.select("id")
						.eq("project_id", projectId)
						.eq("user_id", user.id)
						.maybeSingle();

					if (existing) {
						await supabase
							.from("project_workspace_activity")
							.update({
								last_step_id: `borrower:${fieldId}`,
								last_borrower_resume_edit_at: now,
								last_visited_at: now
							})
							.eq("id", existing.id);
					}
				} catch (err) {
					console.warn("[BorrowerResumeForm] Failed to track field activity:", err);
				}
			}, 500);
		},
		[projectId, user]
	);

	const {
		isAutofilling,
		showSparkles,
		handleAutofill: startAutofill,
		errorModal,
		clearErrorModal,
	} = useAutofill(projectId, { context: "borrower" });

	// Ref to store the last borrowerResume content hash to prevent unnecessary updates
	const lastBorrowerResumeHashRef = useRef<string | null>(null);

	// Autosave Key (needed before draft and persistence hooks)
	const storageKey = useMemo(
		() => `capmatch_borrower_resume_draft_${projectId}`,
		[projectId]
	);

	const clearDraft = useCallback(() => {
		if (typeof window !== "undefined") localStorage.removeItem(storageKey);
		setLastSavedAt(null);
	}, [storageKey]);

	const { isRestoring } = useBorrowerResumeDraft({
		projectId,
		storageKey,
		formData,
		fieldMetadata: fieldMetadata as Record<string, unknown>,
		lockedFields,
		setFormData,
		setFieldMetadata: setFieldMetadata as React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
		setLockedFields,
		setLastSavedAt,
	});

	const persistence = useBorrowerResumePersistence({
		projectId,
		formData,
		fieldMetadata,
		lockedFields,
		storageKey,
		clearDraft,
		saveBorrowerResume: save,
		setFormSaved,
		reloadBorrowerResume,
	});

	// Effect to handle updates from parent/hook (e.g. after Autofill or Initial Load)
	useEffect(() => {
		if (isRestoring) return;
		if (!borrowerResume) return;

		// Create a hash of the borrowerResume content to detect actual changes
		// This prevents infinite loops when borrowerResume gets a new object reference
		// but the content hasn't actually changed
		const currentHash = JSON.stringify(borrowerResume);
		if (lastBorrowerResumeHashRef.current === currentHash) {
			// Content hasn't changed, skip update
			return;
		}
		lastBorrowerResumeHashRef.current = currentHash;

		const sanitized = sanitizeBorrowerProfile(borrowerResume);
		setFormData(sanitized);
		const metadata = (sanitized as any)._metadata || {};
		setFieldMetadata(metadata);

		// Initialize locks strictly from backend (_lockedFields); do NOT auto-lock
		// AI-sourced fields. Warning-bearing fields should remain editable/red.
		const newLockedFields = new Set(
			Object.keys((borrowerResume as any)._lockedFields || {}).filter(
				(k) => (borrowerResume as any)._lockedFields?.[k]
			)
		);

		setLockedFields(newLockedFields);

		// Clear unlockedFields when reloading from backend to ensure state consistency
		setUnlockedFields(new Set());

		const snapshot = {
			formData: sanitized,
			fieldMetadata: metadata,
			lockedFields: newLockedFields,
		};
		persistence.setBaselineSnapshot(snapshot);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- only run when data/restore state changes
	}, [borrowerResume, isRestoring]);

	// Notify parent and report progress
	useEffect(() => {
		onFormDataChange?.(formData);

		// Convert Set to Record for the utility function
		const lockedFieldsObj: Record<string, boolean> = {};
		lockedFields.forEach((id) => { lockedFieldsObj[id] = true; });

		// Report progress
		const completeness = computeBorrowerCompletion(formData, lockedFieldsObj);
		onProgressChange?.(completeness);
	}, [
		formData,
		fieldMetadata,
		lockedFields,
		onFormDataChange,
		onProgressChange,
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

	// Helper function to update metadata when user inputs data
	const handleInputChange = useCallback(
		(fieldId: string, value: any) => {
			// Track field activity
			trackFieldActivity(fieldId);

			setFormData((prev) => {
				const next = { ...prev, [fieldId]: value };
				return next;
			});

			// Get existing field metadata
			const currentMeta = fieldMetadata[fieldId] || {
				value: value,
				source: null,
				warnings: [],
				other_values: [],
			};

			// Preserve original source in other_values if it exists and is not user_input
			const originalSource = currentMeta.source;
			const otherValues = Array.isArray(currentMeta.other_values)
				? [...currentMeta.other_values]
				: [];

			// If there's an original source that's not user_input, add it to other_values
			if (originalSource && originalSource.type !== "user_input") {
				const originalValue = currentMeta.value;
				// Check if this source/value combination already exists in other_values
				const alreadyExists = otherValues.some(
					(ov: any) =>
						ov.value === originalValue &&
						ov.source?.type === originalSource.type
				);
				if (!alreadyExists && originalValue !== value) {
					otherValues.push({
						value: originalValue,
						source: originalSource,
					});
				}
			}

			// Update metadata to mark source as User Input
			const updatedMeta = {
				...currentMeta,
				value: value,
				// Force source to user_input when edited manually
				source: { type: "user_input" } as any,
				other_values: otherValues,
			};

			setFieldMetadata((prev) => ({
				...prev,
				[fieldId]: updatedMeta,
			}));
		},
		[fieldMetadata, trackFieldActivity]
	);

	const isDirty = useMemo(
		() => persistence.hasUnsavedChanges(),
		[
			formData,
			fieldMetadata,
			lockedFields,
			persistence.hasUnsavedChanges,
		]
	);

	// Notify parent of dirty state changes
	useEffect(() => {
		onDirtyChange?.(isDirty);
	}, [isDirty, onDirtyChange]);

	// Register save function with parent on mount
	useEffect(() => {
		if (onRegisterSave) {
			onRegisterSave(async () => {
				await handleFormSubmit();
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [onRegisterSave]);

	const { handleBlur } = useBorrowerResumeValidation({
		formData,
		fieldMetadata: fieldMetadata as Record<string, unknown>,
		isEditing,
		setFieldMetadata: setFieldMetadata as React.Dispatch<React.SetStateAction<Record<string, unknown>>>,
	});

	// Cleanup field activity timeout on unmount
	useEffect(() => {
		return () => {
			if (fieldActivityTimeoutRef.current) {
				clearTimeout(fieldActivityTimeoutRef.current);
			}
		};
	}, []);

	const handleFormSubmit = useCallback(
		async (finalData?: Partial<BorrowerResumeContent>) => {
			const dataToSave =
				finalData ?? persistence.stateRef.current.formData;
			await persistence.saveToDatabase(dataToSave, true);
			setIsEditing(false);
			onComplete?.(dataToSave as BorrowerResumeContent);
			reloadBorrowerResume();
		},
		[persistence, onComplete, reloadBorrowerResume]
	);

	// Lock/field-state context for domain selectors
	const lockContext = useMemo(
		() => ({
			lockedFields,
			unlockedFields,
			fieldMetadata,
		}),
		[lockedFields, unlockedFields, fieldMetadata]
	);
	const fieldStateContext = useMemo(
		() => ({ ...lockContext, formData: formData as Record<string, unknown> }),
		[lockContext, formData]
	);

	const isFieldLocked = useCallback(
		(fieldId: string, _sectionId?: string): boolean =>
			isFieldLockedSelector(lockContext, fieldId),
		[lockContext]
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
		(fieldIds: string[]) =>
			isSubsectionFullyLockedSelector(lockContext, fieldIds),
		[lockContext]
	);

	const toggleSubsectionLock = useCallback(
		(fieldIds: string[]) => {
			const isLocked = isSubsectionFullyLocked(fieldIds);
			setLockedFields((prev) => {
				const next = new Set(prev);
				fieldIds.forEach((id) => {
					const value = (formData as any)[id];
					let hasValue = isBorrowerValueProvided(value);

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
			const hasValue = isBorrowerValueProvided(value);
			const locked = isFieldLocked(fieldId, sectionId);
			const meta = fieldMetadata[fieldId];
			const hasWarnings = meta?.warnings && meta.warnings.length > 0;
			// Check single source (new format) or sources array (backward compatibility)
			const hasSource =
				meta?.source ||
				(meta?.sources &&
					Array.isArray(meta.sources) &&
					meta.sources.length > 0);

			const baseClasses =
				"w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm transition-colors duration-200";

			// Red: warnings exist and not locked
			if (hasWarnings && !locked) {
				return cn(
					baseClasses,
					"border-red-500 bg-red-50 focus:ring-red-200 hover:border-red-600 text-gray-800"
				);
			}

			// Green: locked (regardless of warnings)
			if (locked) {
				return cn(
					baseClasses,
					"border-emerald-500 bg-emerald-50 focus:ring-emerald-200 hover:border-emerald-600 text-gray-800"
				);
			}

			if (!hasValue) {
				if (hasSource) {
					return cn(
						baseClasses,
						"border-blue-600 bg-blue-50 focus:ring-blue-200 hover:border-blue-700 text-gray-800"
					);
				}
				return cn(
					baseClasses,
					"border-gray-200 bg-white focus:ring-blue-200 hover:border-gray-300"
				);
			}

			// Blue: has value, not locked, no warnings
			return cn(
				baseClasses,
				"border-blue-600 bg-blue-50 focus:ring-blue-200 hover:border-blue-700 text-gray-800"
			);
		},
		[formData, fieldMetadata, isFieldLocked]
	);

	const isFieldRed = useCallback(
		(fieldId: string, _sectionId?: string): boolean =>
			isFieldRedSelector(fieldStateContext, fieldId),
		[fieldStateContext]
	);

	const isFieldBlue = useCallback(
		(fieldId: string, _sectionId?: string): boolean =>
			isFieldBlueSelector(fieldStateContext, fieldId),
		[fieldStateContext]
	);

	const isFieldGreen = useCallback(
		(fieldId: string, _sectionId?: string): boolean =>
			isFieldGreenSelector(fieldStateContext, fieldId),
		[fieldStateContext]
	);

	const isFieldWhite = useCallback(
		(fieldId: string, _sectionId?: string): boolean =>
			isFieldWhiteSelector(fieldStateContext, fieldId),
		[fieldStateContext]
	);

	const renderFieldLockButton = useCallback(
		(fieldId: string, sectionId: string) => {
			const locked = isFieldLocked(fieldId, sectionId);
			const value = (formData as any)[fieldId];
			const meta = fieldMetadata[fieldId];
			const hasWarnings = !!(meta?.warnings && meta.warnings.length > 0);

			let hasValue = isBorrowerValueProvided(value);
			if (fieldId === "principals") {
				hasValue = hasCompletePrincipals((formData as any).principals);
			}

			return (
				<BorrowerFieldLockButton
					fieldId={fieldId}
					sectionId={sectionId}
					locked={locked}
					hasValue={hasValue}
					hasWarnings={hasWarnings}
					onClick={toggleFieldLock}
				/>
			);
		},
		[isFieldLocked, formData, toggleFieldLock, fieldMetadata]
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
			required: boolean = false,
			fieldWrapperRef?: React.RefObject<HTMLDivElement>
		) => {
			const meta = fieldMetadata[fieldId];
			const hasWarnings = !!(meta?.warnings && meta.warnings.length > 0);

			return (
				<BorrowerFieldLabelRow
					fieldId={fieldId}
					labelText={labelText}
					required={required}
					hasWarnings={hasWarnings}
					warningMessages={mapWarningsToLabels(meta?.warnings)}
					fieldWrapperRef={fieldWrapperRef}
					fieldMetadataItem={meta ?? null}
					onAskAI={onAskAI}
					lockButton={renderFieldLockButton(fieldId, sectionId)}
				/>
			);
		},
		[fieldMetadata, onAskAI, renderFieldLockButton, mapWarningsToLabels]
	);

	const renderDynamicField = useCallback(
		(fieldId: string, sectionId: string) => {
			// Filter fields based on project's deal type
			if (!isFieldVisibleForDealType(fieldId, dealType as DealType, false)) {
				return null;
			}

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
			let value = (formData as any)[fieldId];
			// For multi-select fields, ensure value is an array
			if (dataType === "Multi-select") {
				if (!value) {
					value = [];
				} else if (typeof value === "string") {
					// Convert comma-separated string to array
					value = value.split(",").map((s: string) => s.trim()).filter((s: string) => s.length > 0);
				} else if (!Array.isArray(value)) {
					value = [];
				}
			} else {
				value = value ?? "";
			}
			const styling = getFieldStylingClasses(fieldId, sectionId);

			// Check if we have data (value or sources) for coloring button-select
			const metaFromState = fieldMetadata[fieldId];
			const hasSources =
				metaFromState &&
				Array.isArray(metaFromState.sources) &&
				metaFromState.sources.length > 0;
			const hasValue = isBorrowerValueProvided(value);

			let controlType = fieldControlOverrides[fieldId];
			// If no override, determine control type from dataType
			if (!controlType) {
				if (dataType === "Dropdown") controlType = "select";
				else if (dataType === "Textarea") controlType = "textarea";
				else if (dataType === "Boolean") controlType = "button-select";
				else if (dataType === "Multi-select") controlType = "multi-select";
				else if (dataType === "Percent") controlType = "number";
				else controlType = "input"; // Default to input if no match
			}

			const optionsRegistry: Record<string, any[]> = {
				primaryEntityStructure: [...entityStructureOptions],
				yearsCREExperienceRange: [...experienceRangeOptions],
				totalDealValueClosedRange: [...dealValueRangeOptions],
				creditScoreRange: [...creditScoreRangeOptions],
				netWorthRange: [...netWorthRangeOptions],
				liquidityRange: [...liquidityRangeOptions],
				assetClassesExperience: [...assetClassOptions],
				geographicMarketsExperience: [...geographicMarketsOptions],
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

			// Get or create a ref for the field wrapper to trigger tooltip on hover
			let fieldWrapperRef = fieldWrapperRefs.current.get(fieldId);
			if (!fieldWrapperRef) {
				fieldWrapperRef =
					React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>;
				fieldWrapperRefs.current.set(fieldId, fieldWrapperRef);
			}

			const hasWarnings =
				fieldMetadata[fieldId]?.warnings &&
				fieldMetadata[fieldId].warnings.length > 0;

			return (
				<FormGroup key={fieldId}>
					<AskAIButton id={fieldId} onAskAI={onAskAI || (() => { })}>
						<div className="relative group/field">
							{renderFieldLabel(
								fieldId,
								sectionId,
								label,
								required,
								fieldWrapperRef
							)}

							<div ref={fieldWrapperRef} className="relative">
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
										onBlur={() => handleBlur(fieldId)}
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
										onBlur={() => handleBlur(fieldId)}
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
											onSelect={async (selected) => {
												handleInputChange(
													fieldId,
													selected
												);
												// Call sanity check immediately after selection (ButtonSelect doesn't have blur)
												await handleBlur(
													fieldId,
													selected
												);
											}}
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
											options={Array.isArray(options) ? options : []}
											selectedValues={Array.isArray(value) ? value : []}
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
											onBlur={() => handleBlur(fieldId)}
											disabled={disabled}
											className={styling}
											data-field-id={fieldId}
											data-field-type={controlType}
											data-field-section={sectionId}
											data-field-label={label}
										/>
									)}
							</div>
						</div>
					</AskAIButton>
				</FormGroup>
			);
		},
		[
			formData,
			getFieldStylingClasses,
			handleInputChange,
			handleBlur,
			isFieldLocked,
			onAskAI,
			renderFieldLabel,
			fieldMetadata,
			dealType,
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

				const fieldStates = fieldIds.map((fieldId) => {
					const meta = fieldMetadata[fieldId];
					const hasWarnings =
						meta?.warnings && meta.warnings.length > 0;
					return {
						isBlue: isFieldBlue(fieldId, sectionId),
						isGreen: isFieldGreen(fieldId, sectionId),
						isWhite: isFieldWhite(fieldId, sectionId),
						hasValue: isBorrowerValueProvided((formData as any)[fieldId]),
						isLocked: isFieldLocked(fieldId, sectionId),
						hasWarnings: hasWarnings,
					};
				});

				const allGreen =
					fieldStates.length > 0 &&
					fieldStates.every(
						(s) =>
							s.isGreen && !s.isBlue && !s.isWhite && s.isLocked
					);
				const allWhite =
					fieldStates.length > 0 &&
					fieldStates.every(
						(s) => s.isWhite && !s.isBlue && !s.isGreen
					);
				const hasBlue = fieldStates.some((s) => s.isBlue);
				const hasWarnings = fieldStates.some((s) => s.hasWarnings);

				// Auto-open if: has blue fields OR has warnings (errors)
				// Auto-close if: all green (complete) OR all white (empty)
				if (hasBlue || hasWarnings) {
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
		isFieldLocked,
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

	// Helper function to check if all fields are locked
	const areAllFieldsLocked = useCallback((): boolean => {
		// Get all field IDs from schema (both required and optional)
		const allFieldIds = new Set<string>();

		// Get fields from steps/subsections
		if (formSchema && (formSchema as any).steps) {
			(formSchema as any).steps.forEach((step: any) => {
				if (step.fields) {
					step.fields.forEach((fieldId: string) =>
						allFieldIds.add(fieldId)
					);
				}
				if (step.subsections) {
					step.subsections.forEach((subsection: any) => {
						if (subsection.fields) {
							subsection.fields.forEach((fieldId: string) =>
								allFieldIds.add(fieldId)
							);
						}
					});
				}
			});
		}

		// Also get fields from root-level fields object if it exists
		if (formSchema && (formSchema as any).fields) {
			Object.keys((formSchema as any).fields).forEach((fieldId) =>
				allFieldIds.add(fieldId)
			);
		}

		// If no fields found in schema, return false (can't determine, so allow autofill)
		if (allFieldIds.size === 0) {
			return false;
		}

		// Check if all fields are locked
		return Array.from(allFieldIds).every((fieldId) =>
			lockedFields.has(fieldId)
		);
	}, [lockedFields]);

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

			// Signal to realtime hooks that this is a local save (before autofill)
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("local-save-started", {
						detail: { projectId, context: "borrower" },
					})
				);
			}

			try {
				await saveProjectBorrowerResume(projectId, dataToSave, {
					// Create a new version before autofill to preserve current state
					// The autofill will create another version with the extracted data
					createNewVersion: true,
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

							// For principals, track-record, and lender-references subsections, we lock based on the table field
							const subsectionFields =
								sub.id === "principal-details"
									? ["principals"]
									: sub.id === "track-record"
										? ["trackRecord"]
										: sub.id === "lender-references"
											? ["references"]
											: (sub.fields as string[]);

							const badgeState = getSubsectionBadgeState(
								fieldStateContext,
								subsectionFields
							);

							// Custom Table Wrapper Styling
							const getTableWrapperClasses = (
								fieldId: string
							) => {
								const value = (formData as any)[fieldId];
								const hasValue = isBorrowerValueProvided(value);
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
								<BorrowerResumeSubsection
									key={subKey}
									subsection={sub}
									sectionId={sectionId}
									isExpanded={isExpanded}
									onToggle={() => toggleSubsection(subKey)}
									badgeState={badgeState}
									onLockClick={() => toggleSubsectionLock(subsectionFields)}
								>
									{sub.id === "principal-details" ? (
												<PrincipalsEditor
													value={
														Array.isArray(formData.principals)
															? (formData.principals as Principal[])
															: []
													}
													onChange={(val) =>
														handleInputChange("principals", val)
													}
													disabled={isFieldLocked("principals", sectionId)}
													fieldId="principals"
													sectionId={sectionId}
													title="Key Principals"
													fieldMetadata={fieldMetadata["principals"]}
													lockButton={renderFieldLockButton(
														"principals",
														sectionId
													)}
													className={getTableWrapperClasses("principals")}
												/>
											) : sub.id === "track-record" ? (
												<TrackRecordEditor
													value={
														Array.isArray(formData.trackRecord)
															? (formData.trackRecord as TrackRecordItem[])
															: []
													}
													onChange={(val) =>
														handleInputChange("trackRecord", val)
													}
													disabled={isFieldLocked("trackRecord", sectionId)}
													fieldId="trackRecord"
													sectionId={sectionId}
													title="Track Record"
													fieldMetadata={fieldMetadata["trackRecord"]}
													lockButton={renderFieldLockButton(
														"trackRecord",
														sectionId
													)}
													className={getTableWrapperClasses("trackRecord")}
												/>
											) : sub.id === "lender-references" ? (
												<ReferencesEditor
													value={
														Array.isArray(formData.references)
															? (formData.references as ReferenceItem[])
															: []
													}
													onChange={(val) =>
														handleInputChange("references", val)
													}
													disabled={isFieldLocked("references", sectionId)}
													fieldId="references"
													sectionId={sectionId}
													title="Lender References"
													fieldMetadata={fieldMetadata["references"]}
													lockButton={renderFieldLockButton(
														"references",
														sectionId
													)}
													className={getTableWrapperClasses("references")}
												/>
											) : (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													{subsectionFields.map(
														(fieldId) =>
															renderDynamicField(
																fieldId,
																sectionId
															)
													)}
												</div>
											)}
								</BorrowerResumeSubsection>
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
		handleInputChange,
		fieldMetadata,
		renderFieldLockButton,
		isFieldLocked,
		isFieldBlue,
		isFieldGreen,
		isFieldWhite,
	]);

	const initialStepIndex = useMemo(() => {
		if (!initialStepId) return 0;
		const idx = steps.findIndex((s: any) => s.id === initialStepId);
		return idx >= 0 ? idx : 0;
	}, [initialStepId, steps]);

	if (!isEditing) {
		return (
			<BorrowerResumeView
				resume={formData}
				projectId={projectId}
				onEdit={() => setIsEditing(true)}
				onVersionChange={reloadBorrowerResume}
				canEdit={canEdit}
			/>
		);
	}

	return (
		<>
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
						disabled={isAutofilling || areAllFieldsLocked()}
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
						disabled={formSaved || isAutofilling}
					>
						{formSaved ? "Saving..." : "Save & Exit"}
					</Button>
					{canEdit && onCopyBorrowerResume && (
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

				<BorrowerResumeWizard
					steps={steps}
					initialStep={initialStepIndex}
					onComplete={() => handleFormSubmit()}
					onStepChange={(stepId) => {
						void touchWorkspace(stepId);
					}}
				/>
			</div>
		</div>
		<AlertModal
			isOpen={errorModal.isOpen}
			onClose={clearErrorModal}
			title={errorModal.title}
			message={errorModal.message}
			variant="error"
		/>
		</>
	);
};
