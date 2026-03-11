"use client";

/**
 * EnhancedProjectForm: compatibility shell for project resume edit flow.
 * Composes project-resume domain hooks, persistence, validation, derived fields,
 * and feature components (lock button, label row) and editors (e.g. ProjectMediaUpload).
 * Public API unchanged; used by ProjectWorkspace.
 */
import React, {
	useState,
	useEffect,
	useMemo,
	useRef,
	useCallback,
} from "react";
import Image from "next/image";
import { Step } from "../ui/FormWizard";
import { ProjectResumeWizard } from "@/features/project-resume/components/ProjectResumeWizard";
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
import {
	FileText,
	DollarSign,
	Building,
	Globe,
	Calendar,
	Map as MapIcon,
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
	Upload,
	X,
	Plus,
	FileText as FileTextIcon,
} from "lucide-react";
import { ProjectProfile } from "@/types/enhanced-types";
import { useAuthStore } from "@/stores/useAuthStore";
import { PROJECT_REQUIRED_FIELDS } from "@/utils/resumeCompletion";
import formSchema from "@/lib/enhanced-project-form.schema.json";
import { projectResumeFieldMetadata } from "@/lib/project-resume-field-metadata";
import { saveProjectResume } from "@/lib/project-queries";
import { isFieldVisibleForDealType, type DealType } from "@/lib/deal-type-field-config";
import {
	assetTypeOptions,
	projectPhaseOptions,
	capitalTypeOptions,
	interestRateTypeOptions,
	recourseOptions,
	exitStrategyOptions,
	buildWorkspaceStepId,
	STATE_MAP,
	STATE_REVERSE_MAP,
	stateOptionsFullNames,
	dealStatusOptions,
	expectedZoningChangesOptions,
	syndicationStatusOptions,
	sponsorExperienceOptions,
	loanTypeOptions,
	constructionTypeOptions,
	buildingTypeOptions,
	hvacSystemOptions,
	leedGreenRatingOptions,
	crimeRiskLevelOptions,
	exemptionStructureOptions,
	relocationPlanOptions,
	entitlementsOptions,
	finalPlansOptions,
	permitsIssuedOptions,
	currentSiteStatusOptions,
	topographyOptions,
	environmentalOptions,
	utilitiesOptions,
	seismicRiskOptions,
	phaseIESAFindingOptions,
	riskLevelOptions,
	marketStatusOptions,
	demandTrendOptions,
	supplyPressureOptions,
	luxuryTierOptions,
	competitivePositionOptions,
	zoningCompliantOptions,
	ownershipTypeOptions,
} from "./enhanced-project-form-constants";
import { T12FinancialTable } from "@/components/project/T12FinancialTable";
import { T12FinancialData } from "@/types/t12-financial";
import { supabase } from "@/lib/supabaseClient";
import {
	validateFile,
	sanitizeFilename,
	MAX_IMAGE_OR_PDF_SIZE_BYTES,
	ALLOWED_IMAGE_OR_PDF_TYPES,
} from "@/utils/fileUploadValidation";
import { isProjectValueProvided } from "@/features/project-resume/domain/isProjectValueProvided";
import { sanitizeProjectProfile } from "@/features/project-resume/domain/sanitizeProjectProfile";
import {
	isFieldLocked as isFieldLockedSelector,
	isSubsectionFullyLocked as isSubsectionFullyLockedSelector,
	type LockSelectorContext,
} from "@/features/project-resume/domain/lockSelectors";
import {
	isFieldRed as isFieldRedSelector,
	isFieldBlue as isFieldBlueSelector,
	isFieldWhite as isFieldWhiteSelector,
	isFieldGreen as isFieldGreenSelector,
	type FieldStateContext,
} from "@/features/project-resume/domain/fieldStateSelectors";
import { getSubsectionBadgeState } from "@/features/project-resume/domain/subsectionBadgeState";
import {
	buildFieldLabelMap,
	mapWarningsToLabels as mapWarningsToLabelsUtil,
} from "@/features/project-resume/domain/schemaSelectors";
import { useProjectResumeDraft } from "@/features/project-resume/hooks/useProjectResumeDraft";
import { useProjectResumePersistence } from "@/features/project-resume/hooks/useProjectResumePersistence";
import { useProjectResumeDerivedFields } from "@/features/project-resume/hooks/useProjectResumeDerivedFields";
import { useProjectResumeValidation } from "@/features/project-resume/hooks/useProjectResumeValidation";
import { ProjectFieldLockButton } from "@/features/project-resume/components/ProjectFieldLockButton";
import { ProjectFieldLabelRow } from "@/features/project-resume/components/ProjectFieldLabelRow";
import { ProjectMediaUpload } from "@/features/project-resume/editors/ProjectMediaUpload";
import { ResidentialUnitMixEditor } from "@/features/project-resume/editors/ResidentialUnitMixEditor";
import { CommercialSpaceMixEditor } from "@/features/project-resume/editors/CommercialSpaceMixEditor";
import { DrawScheduleEditor } from "@/features/project-resume/editors/DrawScheduleEditor";
import { RentCompsEditor } from "@/features/project-resume/editors/RentCompsEditor";
import { MajorEmployersEditor } from "@/features/project-resume/editors/MajorEmployersEditor";
import { DeliveryByQuarterEditor } from "@/features/project-resume/editors/DeliveryByQuarterEditor";
import { T12FinancialEditor } from "@/features/project-resume/editors/T12FinancialEditor";
import { FiveYearCashFlowEditor } from "@/features/project-resume/editors/FiveYearCashFlowEditor";
import { ReturnsBreakdownEditor } from "@/features/project-resume/editors/ReturnsBreakdownEditor";
import { SensitivityAnalysisEditor } from "@/features/project-resume/editors/SensitivityAnalysisEditor";
import { CapitalUseTimingEditor } from "@/features/project-resume/editors/CapitalUseTimingEditor";
import { RiskListEditor } from "@/features/project-resume/editors/RiskListEditor";
import { RentRollEditor } from "@/features/project-resume/editors/RentRollEditor";
import { T12MonthlyDataEditor } from "@/features/project-resume/editors/T12MonthlyDataEditor";
import { ProjectResumeSubsection } from "@/features/project-resume/components/ProjectResumeSubsection";

interface EnhancedProjectFormProps {
	existingProject: ProjectProfile;
	onComplete?: (project: ProjectProfile) => void;
	compact?: boolean;
	onAskAI?: (fieldId: string) => void;
	onFormDataChange?: (formData: ProjectProfile) => void;
	initialFocusFieldId?: string;
	onVersionChange?: () => void;
	initialStepId?: string | null;
}


const EnhancedProjectForm: React.FC<EnhancedProjectFormProps> = ({
	existingProject,
	onComplete,
	compact,
	onAskAI,
	onFormDataChange,
	initialFocusFieldId,
	onVersionChange,
	initialStepId,
}) => {
	const { activeOrg, user } = useAuthStore();
	// 1. Initialize state with sanitized data
	const sanitizedExistingProject = useMemo(
		() => sanitizeProjectProfile(existingProject),
		[existingProject]
	);
	const [formData, setFormData] = useState<ProjectProfile>(
		sanitizedExistingProject
	);
	const [fieldMetadata, setFieldMetadata] = useState<Record<string, any>>(
		sanitizedExistingProject._metadata || {}
	);

	const fieldLabelMap = useMemo(
		() => buildFieldLabelMap(formSchema as any),
		[]
	);

	// Replace raw field IDs in warning messages with user-friendly labels
	const mapWarningsToLabels = useCallback(
		(warnings?: string[] | null): string[] | undefined =>
			mapWarningsToLabelsUtil(warnings ?? undefined, fieldLabelMap),
		[fieldLabelMap]
	);

	// Initialize locked state from props
	const [lockedFields, setLockedFields] = useState<Set<string>>(() => {
		const saved = existingProject._lockedFields || {};
		return new Set(Object.keys(saved).filter((key) => saved[key] === true));
	});

	const [unlockedFields, setUnlockedFields] = useState<Set<string>>(
		new Set()
	);
	const [showAutofillNotification, setShowAutofillNotification] =
		useState(false);
	const [formSaved, setFormSaved] = useState(false);

	const touchWorkspace = useCallback(
		async (stepId?: string) => {
			if (!user?.id || !existingProject?.id) return;
			const nowIso = new Date().toISOString();
			const payload: Record<string, any> = {
				project_id: existingProject.id,
				user_id: user.id,
				last_visited_at: nowIso,
			};
			if (stepId) payload.last_step_id = buildWorkspaceStepId(stepId);
			await supabase
				.from("project_workspace_activity")
				.upsert(payload, { onConflict: "project_id,user_id" });
		},
		[user?.id, existingProject?.id]
	);
	const [isRestoring, setIsRestoring] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

	// Map to store refs for field wrappers (for tooltip triggers)
	const fieldWrapperRefs = useRef<
		Map<string, React.RefObject<HTMLDivElement>>
	>(new Map());

	const {
		isAutofilling,
		showSparkles,
		handleAutofill: startAutofill,
		errorModal,
		clearErrorModal,
	} = useAutofill(existingProject.id, { context: "project" });

	const { storageKey, clearDraft } = useProjectResumeDraft({
		projectId: existingProject.id,
		formData,
		fieldMetadata,
		lockedFields,
		setFormData,
		setFieldMetadata,
		setLockedFields,
		setLastSavedAt,
		setIsRestoring,
		isRestoring,
	});

	const { setBaselineSnapshot, hasUnsavedChanges, saveToDatabase } =
		useProjectResumePersistence({
			projectId: existingProject.id,
			formData,
			fieldMetadata,
			lockedFields,
			storageKey,
			clearDraft,
			saveProjectResume,
			setFormSaved,
		});

	useProjectResumeDerivedFields({
		formData,
		lockedFields,
		setFormData,
	});

	const { handleBlur } = useProjectResumeValidation({
		formData,
		fieldMetadata,
		setFieldMetadata,
	});

	// Effect to handle updates from parent (e.g. after Autofill)
	useEffect(() => {
		// If we are restoring from local storage, don't overwrite with props
		if (isRestoring) return;

		const sanitized = sanitizeProjectProfile(existingProject);
		setFormData(sanitized);
		const metadata = sanitized._metadata || {};
		setFieldMetadata(metadata);

		// Update prevFormDataRef when props change
		prevFormDataRef.current = sanitized;

		// Initialize locks strictly from backend (_lockedFields); do NOT auto-lock
		// AI-sourced fields here. Warning-bearing fields should remain editable/red.
		const newLockedFields = new Set(
			Object.keys(existingProject._lockedFields || {}).filter(
				(k) => existingProject._lockedFields?.[k]
			)
		);

		setLockedFields(newLockedFields);

		// Clear unlockedFields when reloading from backend to ensure state consistency
		setUnlockedFields(new Set());

		// Establish / refresh the baseline snapshot from the DB-backed project.
		const snapshotLocked = new Set(newLockedFields);
		const snapshot = {
			formData: sanitized,
			fieldMetadata: metadata,
			lockedFields: snapshotLocked,
		};
		setBaselineSnapshot(snapshot);
	}, [existingProject, isRestoring, setBaselineSnapshot]);

	// Autosave notification handler (from autofill)
	useEffect(() => {
		const handler = () => {
			setShowAutofillNotification(true);
			setTimeout(() => setShowAutofillNotification(false), 5000);

			// After autofill, force-open subsections with errors or needs input
			// This ensures users see issues immediately after autofill completes
			setTimeout(() => {
				const schemaSteps: any[] = (formSchema as any).steps || [];
				const subsectionsToOpen = new Set<string>();

				schemaSteps.forEach((step) => {
					const sectionId: string = step.id;
					const subsections: any[] = step.subsections || [];

					subsections.forEach((subsection: any) => {
						const subsectionKey = `${sectionId}::${subsection.id}`;
						const fieldIds: string[] = subsection.fields || [];

						if (fieldIds.length === 0) return;

						// Check if subsection has errors or needs input
						const hasErrors = fieldIds.some((fieldId) => {
							const meta = fieldMetadata[fieldId];
							return meta?.warnings && meta.warnings.length > 0;
						});

						// Inline check for blue fields (needs input) - replicate isFieldBlue logic
						const hasNeedsInput = fieldIds.some((fieldId) => {
							const value = (formData as any)[fieldId];
							const hasValue = isProjectValueProvided(value);
							const meta = fieldMetadata[fieldId];
							const hasSource =
								meta?.source ||
								(meta?.sources &&
									Array.isArray(meta.sources) &&
									meta.sources.length > 0);
							const sourceType =
								meta?.source?.type || meta?.sources?.[0]?.type;
							const hasWarnings =
								meta?.warnings && meta.warnings.length > 0;
							const isLocked =
								lockedFields.has(fieldId) &&
								!unlockedFields.has(fieldId);

							// Don't show as blue if there are warnings (should be red instead)
							if (hasWarnings && !isLocked) {
								return false;
							}

							if (!hasValue) {
								return hasSource && !isLocked && !hasWarnings;
							}
							// Blue: user_input source, no warnings, not locked
							return (
								sourceType === "user_input" &&
								!hasWarnings &&
								!isLocked
							);
						});

						if (hasErrors || hasNeedsInput) {
							subsectionsToOpen.add(subsectionKey);
						}
					});
				});

				// Force-open subsections with errors or needs input
				setExpandedSubsections((prev) => {
					const next = new Set(prev);
					subsectionsToOpen.forEach((key) => next.add(key));
					return next;
				});
			}, 100); // Small delay to ensure formData/fieldMetadata have updated
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
	}, [formData, fieldMetadata, lockedFields, unlockedFields]);

	// Helper function to update metadata when user inputs data
	const handleInputChange = useCallback(
		(fieldId: string, value: any) => {
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
		[fieldMetadata]
	);

	// Track previous formData values to detect actual changes (used by sync-from-parent effect)
	const prevFormDataRef = useRef<ProjectProfile>(formData);

	// Propagate form data changes to parent
	useEffect(() => {
		onFormDataChange?.(formData);
	}, [formData, onFormDataChange]);

	// Helper to derive subsection lock status from its field locks
	const lockContext = useMemo(
		(): LockSelectorContext => ({
			lockedFields,
			unlockedFields,
			fieldMetadata,
		}),
		[lockedFields, unlockedFields, fieldMetadata]
	);
	const fieldStateContext = useMemo(
		(): FieldStateContext => ({
			...lockContext,
			formData: formData as unknown as Record<string, unknown>,
		}),
		[lockContext, formData]
	);

	const isSubsectionFullyLocked = useCallback(
		(fieldIds: string[]) =>
			isSubsectionFullyLockedSelector(lockContext, fieldIds),
		[lockContext]
	);

	const isFieldLocked = useCallback(
		(fieldId: string, _sectionId?: string) =>
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
					const next = new Set(prev);
					next.delete(fieldId);
					return next;
				});
				setUnlockedFields((prev) => {
					const next = new Set(prev);
					next.add(fieldId);
					return next;
				});
			} else {
				setLockedFields((prev) => {
					const next = new Set(prev);
					next.add(fieldId);
					return next;
				});
				setUnlockedFields((prev) => {
					const next = new Set(prev);
					next.delete(fieldId);
					return next;
				});
			}
		},
		[unlockedFields, lockedFields]
	);

	const toggleSubsectionLock = useCallback(
		(fieldIds: string[]) => {
			if (fieldIds.length === 0) return;

			const isCurrentlyFullyLocked = isSubsectionFullyLocked(fieldIds);

			// Lock or unlock fields in the subsection.
			// When locking, only lock fields that currently have values; leave empty
			// fields unlocked so they follow the same rules as individual field locks.
			setLockedFields((prev) => {
				const next = new Set(prev);
				fieldIds.forEach((fieldId) => {
					if (isCurrentlyFullyLocked) {
						// Unlock all fields when the subsection is already fully locked.
						next.delete(fieldId);
					} else {
						const value = (formData as any)[fieldId];
						const hasValue = isProjectValueProvided(value);
						if (hasValue) {
							next.add(fieldId);
						} else {
							// Ensure empty fields are not marked as locked.
							next.delete(fieldId);
						}
					}
				});
				return next;
			});

			// Clear unlocked flags for this subsection when toggling
			setUnlockedFields((prev) => {
				const next = new Set(prev);
				fieldIds.forEach((fieldId) => next.delete(fieldId));
				return next;
			});
		},
		[formData, isSubsectionFullyLocked]
	);

	// Styling Logic: Red, White, Blue, Green
	const getFieldStylingClasses = useCallback(
		(fieldId: string, sectionId?: string) => {
			const value = (formData as any)[fieldId];
			const hasValue = isProjectValueProvided(value);
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

	const isFieldAutofilled = useCallback(
		(fieldId: string) => {
			const meta = fieldMetadata[fieldId];
			if (!meta?.source) return false;
			// Backward compatibility: check sources array if source doesn't exist
			if (
				!meta.source &&
				meta.sources &&
				Array.isArray(meta.sources) &&
				meta.sources.length > 0
			) {
				const isUserInput = meta.sources.some((src: any) => {
					if (typeof src === "string")
						return (
							src.toLowerCase() === "user_input" ||
							src.toLowerCase() === "user input"
						);
					return src.type === "user_input";
				});
				return !isUserInput;
			}
			return meta.source.type !== "user_input";
		},
		[fieldMetadata]
	);

	const getFieldWarning = useCallback(
		(fieldId: string) => {
			const meta = fieldMetadata[fieldId];
			if (!meta?.warnings || meta.warnings.length === 0) return null;
			return meta.warnings.join(" ");
		},
		[fieldMetadata]
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

	const isFieldWhite = useCallback(
		(fieldId: string, _sectionId?: string): boolean =>
			isFieldWhiteSelector(fieldStateContext, fieldId),
		[fieldStateContext]
	);

	const isFieldGreen = useCallback(
		(fieldId: string, _sectionId?: string): boolean =>
			isFieldGreenSelector(fieldStateContext, fieldId),
		[fieldStateContext]
	);

	const renderFieldLockButton = useCallback(
		(fieldId: string, _sectionId: string) => {
			const locked = isFieldLocked(fieldId);
			const value = (formData as any)[fieldId];
			const meta = fieldMetadata[fieldId];
			const hasWarnings = !!(meta?.warnings && meta.warnings.length > 0);
			const hasValue = (() => {
				if (Array.isArray(value)) return isProjectValueProvided(value);
				if (value && typeof value === "object")
					return Object.keys(value).length > 0;
				return isProjectValueProvided(value);
			})();
			return (
				<ProjectFieldLockButton
					fieldId={fieldId}
					locked={locked}
					hasValue={hasValue}
					hasWarnings={hasWarnings}
					onToggleLock={toggleFieldLock}
				/>
			);
		},
		[formData, isFieldLocked, toggleFieldLock, fieldMetadata]
	);

	const renderFieldLabel = useCallback(
		(
			fieldId: string,
			sectionId: string,
			labelText: string,
			required: boolean = false,
			fieldWrapperRef?: React.RefObject<HTMLDivElement>
		) => (
			<ProjectFieldLabelRow
				fieldId={fieldId}
				labelText={labelText}
				required={required}
				hasWarnings={
					!!(
						fieldMetadata[fieldId]?.warnings &&
						fieldMetadata[fieldId].warnings.length > 0
					)
				}
				warningMessages={mapWarningsToLabels(
					fieldMetadata[fieldId]?.warnings
				)}
				fieldWrapperRef={fieldWrapperRef}
				fieldMetadataItem={fieldMetadata[fieldId]}
				onAskAI={onAskAI}
				lockButton={renderFieldLockButton(fieldId, sectionId)}
			/>
		),
		[onAskAI, renderFieldLockButton, fieldMetadata, mapWarningsToLabels]
	);

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

	const handleFormSubmit = useCallback(
		async (finalData?: ProjectProfile) => {
			const lockedFieldsObj: Record<string, boolean> = {};
			lockedFields.forEach((id) => {
				lockedFieldsObj[id] = true;
			});

			const dataToSave: ProjectProfile = {
				...(finalData || formData),
				_metadata: fieldMetadata,
				_lockedFields: lockedFieldsObj,
			};

			// Explicit Save & Exit should create a new version only when there
			// are unsaved changes. The helper will no-op if nothing changed.
			await saveToDatabase(dataToSave, true);
			onComplete?.(dataToSave);
			onVersionChange?.();
		},
		[
			formData,
			fieldMetadata,
			lockedFields,
			saveToDatabase,
			onComplete,
			onVersionChange,
		]
	);

	type ControlKind =
		| "input"
		| "number"
		| "textarea"
		| "select"
		| "button-select";

	const sectionIconComponents = useMemo<
		Record<string, React.ComponentType<{ className?: string }>>
	>(
		() => ({
			FileText,
			DollarSign,
			Building,
			Globe,
			Calendar,
			Map: MapIcon,
			Users,
			Calculator,
			AlertTriangle,
			Info,
			BarChart,
		}),
		[]
	);

	const fieldControlOverrides = useMemo<Record<string, ControlKind>>(
		() => ({
			assetType: "button-select",
			projectPhase: "button-select",
			loanType: "button-select",
			interestRateType: "button-select",
			recoursePreference: "button-select",
			exitStrategy: "button-select",
			// Convert all dropdown fields to button-select (except state which stays as dropdown)
			dealStatus: "button-select",
			expectedZoningChanges: "button-select",
			syndicationStatus: "button-select",
			sponsorExperience: "button-select",
			buildingType: "button-select",
			hvacSystem: "button-select",
			leedGreenRating: "button-select",
			crimeRiskLevel: "button-select",
			exemptionStructure: "button-select",
			relocationPlan: "button-select",
			entitlements: "button-select",
			finalPlans: "button-select",
			permitsIssued: "button-select",
			currentSiteStatus: "button-select",
			topography: "button-select",
			environmental: "button-select",
			utilities: "button-select",
			seismicRisk: "button-select",
			phaseIESAFinding: "button-select",
			// Derived dropdown fields - use button-select like assetType
			riskLevelBase: "button-select",
			riskLevelUpside: "button-select",
			riskLevelDownside: "button-select",
			marketStatus: "button-select",
			demandTrend: "button-select",
			supplyPressure: "button-select",
			luxuryTier: "button-select",
			competitivePosition: "button-select",
			zoningCompliant: "button-select",
			ownershipType: "button-select",
		}),
		[]
	);

	const fieldOptionsRegistry = useMemo<Record<string, any[]>>(
		() => ({
			assetType: assetTypeOptions,
			projectPhase: projectPhaseOptions,
			loanType: capitalTypeOptions,
			interestRateType: interestRateTypeOptions,
			recoursePreference: recourseOptions,
			exitStrategy: exitStrategyOptions,
			// Dropdown field options
			dealStatus: dealStatusOptions,
			expectedZoningChanges: expectedZoningChangesOptions,
			syndicationStatus: syndicationStatusOptions,
			sponsorExperience: sponsorExperienceOptions,
			buildingType: buildingTypeOptions,
			hvacSystem: hvacSystemOptions,
			leedGreenRating: leedGreenRatingOptions,
			crimeRiskLevel: crimeRiskLevelOptions,
			exemptionStructure: exemptionStructureOptions,
			relocationPlan: relocationPlanOptions,
			entitlements: entitlementsOptions,
			finalPlans: finalPlansOptions,
			permitsIssued: permitsIssuedOptions,
			currentSiteStatus: currentSiteStatusOptions,
			topography: topographyOptions,
			environmental: environmentalOptions,
			utilities: utilitiesOptions,
			seismicRisk: seismicRiskOptions,
			phaseIESAFinding: phaseIESAFindingOptions,
			// Derived dropdown fields
			riskLevelBase: riskLevelOptions,
			riskLevelUpside: riskLevelOptions,
			riskLevelDownside: riskLevelOptions,
			marketStatus: marketStatusOptions,
			demandTrend: demandTrendOptions,
			supplyPressure: supplyPressureOptions,
			luxuryTier: luxuryTierOptions,
			competitivePosition: competitivePositionOptions,
			zoningCompliant: zoningCompliantOptions,
			ownershipType: ownershipTypeOptions,
		}),
		[]
	);

	const getDefaultControlForDataType = useCallback(
		(dataType?: string): ControlKind => {
			if (!dataType) return "input";
			switch (dataType.toLowerCase()) {
				case "textarea":
					return "textarea";
				case "dropdown":
					return "select";
				case "boolean":
					return "button-select";
				case "currency":
				case "integer":
				case "numeric":
					return "number";
				case "date":
					return "input";
				case "table":
					return "textarea";
				default:
					return "input";
			}
		},
		[]
	);

	const getFieldConfig = useCallback((fieldId: string) => {
		const fieldsConfig = (formSchema as any).fields || {};
		return fieldsConfig[fieldId] || {};
	}, []);

	const isFieldRequiredFromSchema = useCallback(
		(fieldId: string): boolean => {
			const config = getFieldConfig(fieldId);
			if (typeof config.required === "boolean") {
				return config.required;
			}
			// Fallback to PROJECT_REQUIRED_FIELDS for backwards compatibility
			return (PROJECT_REQUIRED_FIELDS as readonly string[]).includes(
				fieldId
			);
		},
		[getFieldConfig]
	);

	const renderDynamicField = useCallback(
		(fieldId: string, sectionId: string) => {
			// Filter fields based on project's deal type
			const dealType: DealType = (existingProject.deal_type as DealType) ?? 'ground_up';
			// Debug deal type
			if (fieldId === 'projectName') {
				console.log('[EnhancedProjectForm] project:', existingProject.id, 'deal_type:', existingProject.deal_type, 'resolved:', dealType);
			}
			if (!isFieldVisibleForDealType(fieldId, dealType, true)) {
				return null;
			}

			// Remove duplicate fields from frontend to avoid confusion
			// Also filter out table fields that are rendered separately
			// Also filter out image fields that are rendered by ProjectMediaUpload component
			if (
				fieldId === "totalProjectCost" ||
				fieldId === "requestedTerm" ||
				fieldId === "residentialUnitMix" ||
				fieldId === "commercialSpaceMix" ||
				fieldId === "drawSchedule" ||
				fieldId === "rentComps" ||
				fieldId === "majorEmployers" ||
				fieldId === "deliveryByQuarter" ||
				fieldId === "siteImages" ||
				fieldId === "architecturalDiagrams" ||
				// Financial table fields rendered as special tables below
				fieldId === "fiveYearCashFlow" ||
				fieldId === "returnsBreakdown" ||
				fieldId === "quarterlyDeliverySchedule" ||
				fieldId === "sensitivityAnalysis" ||
				fieldId === "capitalUseTiming" ||
				// Risk fields rendered as editable lists below
				fieldId === "riskHigh" ||
				fieldId === "riskMedium" ||
				fieldId === "riskLow"
			) {
				return null;
			}

			const fieldConfig =
				(formSchema as any).fields?.[fieldId] ?? ({} as any);
			const label: string = fieldConfig.label ?? fieldId;
			const fieldMetaConfig = projectResumeFieldMetadata[fieldId];
			const dataType = fieldMetaConfig?.dataType;
			const required = isFieldRequiredFromSchema(fieldId);
			// Field is disabled only if UI logic requires it, but here we want users to be able to unlock and edit.
			// So we generally don't disable the input unless specific logic applies.
			// However, locked fields (Green) should probably be editable ONLY after unlocking.
			const isLocked = isFieldLocked(fieldId, sectionId);
			// We allow editing if unlocked. If locked, user must click unlock icon first.
			const disabled = isLocked;

			const value = (formData as any)[fieldId] ?? "";

			// Determine if this field has any source metadata (e.g. touched by AI/user)
			const metaFromState = fieldMetadata[fieldId];
			// Check single source (new format) or sources array (backward compatibility)
			const hasSources =
				metaFromState &&
				(metaFromState.source ||
					(Array.isArray(metaFromState.sources) &&
						metaFromState.sources.length > 0));
			const hasValue = isProjectValueProvided(value);

			const controlKind: ControlKind =
				fieldControlOverrides[fieldId] ??
				getDefaultControlForDataType(dataType);

			const commonClassName = getFieldStylingClasses(fieldId, sectionId);

			// Get or create a ref for the field wrapper to trigger tooltip on hover
			let fieldWrapperRef = fieldWrapperRefs.current.get(fieldId);
			if (!fieldWrapperRef) {
				fieldWrapperRef =
					React.createRef<HTMLDivElement>() as React.RefObject<HTMLDivElement>;
				fieldWrapperRefs.current.set(fieldId, fieldWrapperRef);
			}

			const renderControl = () => {
				if (controlKind === "textarea") {
					const displayValue =
						typeof value === "object" && value !== null
							? JSON.stringify(value, null, 2)
							: value;

					const handleTextareaChange = (
						e: React.ChangeEvent<HTMLTextAreaElement>
					) => {
						const val = e.target.value;
						if (dataType === "Table") {
							try {
								const parsed = JSON.parse(val);
								handleInputChange(fieldId, parsed);
							} catch {
								handleInputChange(fieldId, val);
							}
						} else {
							handleInputChange(fieldId, val);
						}
					};

					return (
						<textarea
							id={fieldId}
							value={displayValue ?? ""}
							onChange={handleTextareaChange}
							onBlur={() => handleBlur(fieldId)}
							disabled={disabled}
							className={cn(
								commonClassName,
								"h-24 font-mono text-xs"
							)}
							data-field-id={fieldId}
							data-field-type="textarea"
							data-field-section={sectionId}
							data-field-label={label}
						/>
					);
				}

				if (controlKind === "button-select") {
					let options = fieldOptionsRegistry[fieldId] ?? [];

					// Default options for Boolean fields if not in registry
					if (options.length === 0 && dataType === "Boolean") {
						options = [
							{ label: "Yes", value: true },
							{ label: "No", value: false },
						];
					}

					return (
						<div
							data-field-id={fieldId}
							data-field-type="button-select"
							data-field-section={sectionId}
							data-field-label={label}
							className="relative group/field"
						>
							<ButtonSelect
								label=""
								options={options}
								selectedValue={value} // Pass value directly (supports boolean)
								onSelect={async (selected) => {
									handleInputChange(fieldId, selected);
									// Call sanity check immediately after selection (ButtonSelect doesn't have blur)
									await handleBlur(fieldId, selected);
								}}
								disabled={disabled}
								// Use lock status to color the selection container
								isLocked={isLocked}
								// Mark as "touched" when we have either a value or any sources.
								// This makes fields like assetType turn blue after AI sets sources
								// to user_input even when the user hasn't picked a value yet.
								isTouched={hasValue || hasSources}
							/>
						</div>
					);
				}

				if (controlKind === "select") {
					// Special handling for state field: show full names but store abbreviations
					if (fieldId === "propertyAddressState") {
						const options = stateOptionsFullNames.map(
							(fullName) => ({
								label: fullName,
								value: STATE_REVERSE_MAP[fullName] || fullName, // Store abbreviation
							})
						);
						// Ensure the select's value matches the option values (abbreviations).
						// Handle legacy data that may have stored full state names by mapping
						// them back to abbreviations when possible.
						const effectiveValue =
							value &&
								typeof value === "string" &&
								value.length > 2
								? STATE_REVERSE_MAP[value] || value
								: value || "";
						return (
							<Select
								id={fieldId}
								value={effectiveValue}
								onChange={(e) => {
									// Store the abbreviation (option value) directly
									handleInputChange(fieldId, e.target.value);
								}}
								onBlur={() => handleBlur(fieldId)}
								options={options}
								required={required}
								disabled={disabled}
								className={commonClassName}
								data-field-id={fieldId}
								data-field-type="select"
								data-field-section={sectionId}
								data-field-label={label}
							/>
						);
					}
					// For other select fields
					const options = (fieldOptionsRegistry[fieldId] ?? []).map(
						(s) => ({
							label: s,
							value: s,
						})
					);
					return (
						<Select
							id={fieldId}
							value={value || ""}
							onChange={(e) =>
								handleInputChange(fieldId, e.target.value)
							}
							onBlur={() => handleBlur(fieldId)}
							options={options}
							required={required}
							disabled={disabled}
							className={commonClassName}
							data-field-id={fieldId}
							data-field-type="select"
							data-field-section={sectionId}
							data-field-label={label}
						/>
					);
				}

				const inputType =
					controlKind === "number" ||
						["Currency", "Integer", "Numeric"].includes(dataType ?? "")
						? "number"
						: dataType?.toLowerCase() === "date"
							? "date"
							: "text";

				const handleChange = (
					e: React.ChangeEvent<HTMLInputElement>
				) => {
					if (inputType === "number") {
						const raw = e.target.value;
						handleInputChange(fieldId, raw ? Number(raw) : null);
					} else {
						handleInputChange(fieldId, e.target.value);
					}
				};

				return (
					<Input
						id={fieldId}
						type={inputType}
						label={null}
						value={
							value !== null && value !== undefined
								? value.toString()
								: ""
						}
						onChange={handleChange}
						onBlur={() => handleBlur(fieldId)}
						required={required}
						disabled={disabled}
						className={commonClassName}
						data-field-id={fieldId}
						data-field-type={inputType}
						data-field-section={sectionId}
						data-field-label={label}
					/>
				);
			};

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
								{renderControl()}
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
			onAskAI,
			renderFieldLabel,
			isFieldLocked,
			isFieldRequiredFromSchema,
			fieldControlOverrides,
			fieldOptionsRegistry,
			getDefaultControlForDataType,
			fieldMetadata,
			existingProject?.id,
			existingProject?.deal_type,
		]
	);

	// Track which subsections are open (collapsed/expanded)
	const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(
		new Set()
	);

	const [manuallyToggledSubsections, setManuallyToggledSubsections] =
		useState<Set<string>>(new Set());

	const toggleSubsection = useCallback((subsectionKey: string) => {
		setManuallyToggledSubsections((prev) => {
			const next = new Set(prev);
			next.add(subsectionKey);
			return next;
		});
		setExpandedSubsections((prev) => {
			const next = new Set(prev);
			if (next.has(subsectionKey)) {
				next.delete(subsectionKey);
			} else {
				next.add(subsectionKey);
			}
			return next;
		});
	}, []);

	// Auto-update subsection state when fields change
	// Rules:
	// - Open if any field is blue (filled/unlocked or touched)
	// - Close if all fields are green and locked
	// - Close if all fields are white (empty/untouched)
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

				// Check field states
				const fieldStates = fieldIds.map((fieldId) => {
					const meta = fieldMetadata[fieldId];
					const hasWarnings =
						meta?.warnings && meta.warnings.length > 0;
					return {
						isBlue: isFieldBlue(fieldId, sectionId),
						isGreen: isFieldGreen(fieldId, sectionId),
						isWhite: isFieldWhite(fieldId, sectionId),
						hasValue: isProjectValueProvided(
							(formData as any)[fieldId]
						),
						isLocked: isFieldLocked(fieldId, sectionId),
						hasWarnings: hasWarnings,
					};
				});

				// All green: all fields have values AND are locked
				const allGreen =
					fieldIds.length > 0 &&
					fieldStates.every(
						(s) =>
							s.isGreen && !s.isBlue && !s.isWhite && s.isLocked
					);
				const allWhite =
					fieldIds.length > 0 &&
					fieldStates.every(
						(s) => s.isWhite && !s.isBlue && !s.isGreen
					);
				const hasBlue = fieldStates.some((s) => s.isBlue);
				const hasWarnings = fieldStates.some((s) => s.hasWarnings);

				// Determine auto-state
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
			// Auto-open subsections with blue fields
			autoOpenSubsections.forEach((key) => {
				if (!manuallyToggledSubsections.has(key)) next.add(key);
			});
			// Auto-close subsections that are all green or all white
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

	// Helper to get blue/green/white styling for complex table wrappers (arrays like unit mix, rent comps, etc.)
	const getTableWrapperClasses = useCallback(
		(fieldId: string, sectionId: string) => {
			const value = (formData as any)[fieldId];
			// Check if value is provided - handle objects with keys
			const hasValue = (() => {
				if (Array.isArray(value)) {
					return isProjectValueProvided(value);
				}
				if (value && typeof value === "object") {
					// For objects, check if they have any keys
					return Object.keys(value).length > 0;
				}
				return isProjectValueProvided(value ?? null);
			})();
			const locked = isFieldLocked(fieldId, sectionId);

			const base =
				"w-full border rounded-md text-sm transition-colors duration-200";

			if (!hasValue) {
				return cn(
					base,
					"border-gray-200 bg-white hover:border-gray-300"
				);
			}

			if (locked) {
				return cn(
					base,
					"border-emerald-500 bg-emerald-50 hover:border-emerald-600"
				);
			}

			return cn(base, "border-blue-600 bg-blue-50 hover:border-blue-700");
		},
		[formData, isFieldLocked]
	);

	const steps: Step[] = useMemo(() => {
		const schemaSteps: any[] = (formSchema as any).steps || [];

		return schemaSteps.map((step) => {
			const sectionId: string = step.id;
			const IconComponent =
				(step.icon && sectionIconComponents[step.icon as string]) ||
				FileText;
			const subsections: any[] = step.subsections || [];

			const renderSubsection = (subsection: any) => {
				const subsectionId: string = subsection.id;
				const subsectionKey = `${sectionId}::${subsectionId}`;
				const isExpanded = expandedSubsections.has(subsectionKey);

				const allFieldIds: string[] = subsection.fields || [];

				const {
					showError,
					showNeedsInput,
					showComplete,
					subsectionLocked,
					subsectionLockDisabled,
					subsectionLockTitle,
				} = getSubsectionBadgeState(fieldStateContext, allFieldIds);

				return (
					<ProjectResumeSubsection
						key={subsectionKey}
						subsection={subsection}
						sectionId={sectionId}
						isExpanded={isExpanded}
						onToggle={() => toggleSubsection(subsectionKey)}
						badgeState={{
							showError,
							showNeedsInput,
							showComplete,
							subsectionLocked,
							subsectionLockDisabled,
							subsectionLockTitle,
						}}
						onLockClick={() => toggleSubsectionLock(allFieldIds)}
					>
						<>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{allFieldIds
										// drawSchedule is rendered as a structured table below
										.filter(
											(fieldId) =>
												!(
													sectionId === "timeline" &&
													fieldId === "drawSchedule"
												) &&
												// Filter out financial table fields that are rendered as special tables
												!(
													sectionId ===
													"financial-details" &&
													(fieldId ===
														"fiveYearCashFlow" ||
														fieldId ===
														"returnsBreakdown" ||
														fieldId ===
														"quarterlyDeliverySchedule" ||
														fieldId ===
														"sensitivityAnalysis" ||
														fieldId ===
														"capitalUseTiming")
												) &&
												// Filter out risk fields that are rendered as editable lists
												!(
													sectionId ===
													"financial-details" &&
													subsectionId ===
													"risk-analysis" &&
													(fieldId === "riskHigh" ||
														fieldId ===
														"riskMedium" ||
														fieldId === "riskLow")
												) &&
												// Filter out market context table fields that are rendered as special tables
												!(
													sectionId ===
													"market-context" &&
													(fieldId ===
														"majorEmployers" ||
														fieldId ===
														"deliveryByQuarter" ||
														fieldId === "rentComps")
												)
										)
										.map((fieldId, idx) => {
											const fieldElement =
												renderDynamicField(
													fieldId,
													sectionId
												);
											// Wrap in Fragment with unique key to handle fields that appear in multiple subsections
											return (
												<React.Fragment
													key={`${subsectionId}-${fieldId}-${idx}`}
												>
													{fieldElement}
												</React.Fragment>
											);
										})}
								</div>

								{/* Section-specific tables in edit mode */}
								{sectionId === "property-specs" &&
									subsectionId === "physical-structure" && (
										<>
											{/* Residential Unit Mix */}
											<ResidentialUnitMixEditor
												value={
													(formData as any)
														.residentialUnitMix ?? []
												}
												onChange={(next) =>
													handleInputChange(
														"residentialUnitMix",
														next
													)
												}
												disabled={isFieldLocked(
													"residentialUnitMix",
													sectionId
												)}
												fieldId="residentialUnitMix"
												sectionId={sectionId}
												title="Residential Unit Mix"
												required={isFieldRequiredFromSchema(
													"residentialUnitMix"
												)}
												fieldMetadata={
													fieldMetadata[
														"residentialUnitMix"
													]
												}
												lockButton={renderFieldLockButton(
													"residentialUnitMix",
													sectionId
												)}
												className={getTableWrapperClasses(
													"residentialUnitMix",
													sectionId
												)}
											/>

											{/* Commercial Space Mix */}
											<CommercialSpaceMixEditor
												value={
													(formData as any)
														.commercialSpaceMix ?? []
												}
												onChange={(next) =>
													handleInputChange(
														"commercialSpaceMix",
														next
													)
												}
												disabled={isFieldLocked(
													"commercialSpaceMix",
													sectionId
												)}
												fieldId="commercialSpaceMix"
												sectionId={sectionId}
												title="Commercial Space Mix"
												required={isFieldRequiredFromSchema(
													"commercialSpaceMix"
												)}
												fieldMetadata={
													fieldMetadata[
														"commercialSpaceMix"
													]
												}
												lockButton={renderFieldLockButton(
													"commercialSpaceMix",
													sectionId
												)}
												className={getTableWrapperClasses(
													"commercialSpaceMix",
													sectionId
												)}
											/>
										</>
									)}

								{sectionId === "timeline" &&
									subsectionId ===
									"construction-lease-up-status" && (
										<DrawScheduleEditor
											value={
												(formData as any)
													.drawSchedule ?? []
											}
											onChange={(next) =>
												handleInputChange(
													"drawSchedule",
													next
												)
											}
											disabled={isFieldLocked(
												"drawSchedule",
												sectionId
											)}
											fieldId="drawSchedule"
											sectionId={sectionId}
											title="Draw Schedule"
											required={isFieldRequiredFromSchema(
												"drawSchedule"
											)}
											fieldMetadata={
												fieldMetadata["drawSchedule"]
											}
											lockButton={renderFieldLockButton(
												"drawSchedule",
												sectionId
											)}
											className={getTableWrapperClasses(
												"drawSchedule",
												sectionId
											)}
										/>
									)}

								{sectionId === "market-context" &&
									subsectionId === "supply-demand" && (
										<RentCompsEditor
											value={
												(formData as any)
													.rentComps ?? []
											}
											onChange={(next) =>
												handleInputChange(
													"rentComps",
													next
												)
											}
											disabled={isFieldLocked(
												"rentComps",
												sectionId
											)}
											fieldId="rentComps"
											sectionId={sectionId}
											title="Rent Comparables"
											required={isFieldRequiredFromSchema(
												"rentComps"
											)}
											fieldMetadata={
												fieldMetadata["rentComps"]
											}
											lockButton={renderFieldLockButton(
												"rentComps",
												sectionId
											)}
											className={getTableWrapperClasses(
												"rentComps",
												sectionId
											)}
										/>
									)}

								{/* Major Employers Table */}
								{sectionId === "market-context" &&
									subsectionId === "demographics-economy" && (
										<MajorEmployersEditor
											value={
												(formData as any)
													.majorEmployers ?? []
											}
											onChange={(next) =>
												handleInputChange(
													"majorEmployers",
													next
												)
											}
											disabled={isFieldLocked(
												"majorEmployers",
												sectionId
											)}
											fieldId="majorEmployers"
											sectionId={sectionId}
											title="Major Employers"
											required={isFieldRequiredFromSchema(
												"majorEmployers"
											)}
											fieldMetadata={
												fieldMetadata["majorEmployers"]
											}
											lockButton={renderFieldLockButton(
												"majorEmployers",
												sectionId
											)}
											className={getTableWrapperClasses(
												"majorEmployers",
												sectionId
											)}
										/>
									)}



								{/* Delivery by Quarter Table */}
								{sectionId === "market-context" &&
									subsectionId === "supply-demand" && (
										<DeliveryByQuarterEditor
											value={
												(formData as any)
													.deliveryByQuarter ?? []
											}
											onChange={(next) =>
												handleInputChange(
													"deliveryByQuarter",
													next
												)
											}
											disabled={isFieldLocked(
												"deliveryByQuarter",
												sectionId
											)}
											fieldId="deliveryByQuarter"
											sectionId={sectionId}
											title="Delivery by Quarter"
											required={isFieldRequiredFromSchema(
												"deliveryByQuarter"
											)}
											fieldMetadata={
												fieldMetadata["deliveryByQuarter"]
											}
											lockButton={renderFieldLockButton(
												"deliveryByQuarter",
												sectionId
											)}
											className={getTableWrapperClasses(
												"deliveryByQuarter",
												sectionId
											)}
										/>
									)}



								{/* T12 Financials */}
								{sectionId === "financial-details" &&
									subsectionId === "t12-financials" && (
										<T12FinancialEditor
											value={(formData as any).t12FinancialData ?? null}
											onChange={(updated) =>
												handleInputChange(
													"t12FinancialData",
													updated
												)
											}
											disabled={isFieldLocked(
												"t12FinancialData",
												sectionId
											)}
											fieldId="t12FinancialData"
											sectionId={sectionId}
											title="T12 Financial Statement"
											required={isFieldRequiredFromSchema(
												"t12FinancialData"
											)}
											fieldMetadata={
												fieldMetadata["t12FinancialData"]
											}
											lockButton={renderFieldLockButton(
												"t12FinancialData",
												sectionId
											)}
											className={getTableWrapperClasses(
												"t12FinancialData",
												sectionId
											)}
										/>
									)}

								{/* Financial Table Fields - Investment Metrics & Exit */}
								{sectionId === "financial-details" &&
									subsectionId ===
									"investment-metrics-exit" && (
										<>
											{/* Five Year Cash Flow */}
											<FiveYearCashFlowEditor
												value={
													(formData as any)
														.fiveYearCashFlow ?? []
												}
												onChange={(next) =>
													handleInputChange(
														"fiveYearCashFlow",
														next
													)
												}
												disabled={isFieldLocked(
													"fiveYearCashFlow",
													sectionId
												)}
												fieldId="fiveYearCashFlow"
												sectionId={sectionId}
												title="Five Year Cash Flow"
												required={isFieldRequiredFromSchema(
													"fiveYearCashFlow"
												)}
												fieldMetadata={
													fieldMetadata["fiveYearCashFlow"]
												}
												lockButton={renderFieldLockButton(
													"fiveYearCashFlow",
													sectionId
												)}
												className={getTableWrapperClasses(
													"fiveYearCashFlow",
													sectionId
												)}
											/>

											{/* Returns Breakdown */}
											<ReturnsBreakdownEditor
												value={
													(formData as any)
														.returnsBreakdown ?? null
												}
												onChange={(next) =>
													handleInputChange(
														"returnsBreakdown",
														next
													)
												}
												disabled={isFieldLocked(
													"returnsBreakdown",
													sectionId
												)}
												fieldId="returnsBreakdown"
												sectionId={sectionId}
												title="Returns Breakdown"
												required={isFieldRequiredFromSchema(
													"returnsBreakdown"
												)}
												fieldMetadata={
													fieldMetadata["returnsBreakdown"]
												}
												lockButton={renderFieldLockButton(
													"returnsBreakdown",
													sectionId
												)}
												className={getTableWrapperClasses(
													"returnsBreakdown",
													sectionId
												)}
											/>

											{/* Quarterly Delivery Schedule */}
											<DeliveryByQuarterEditor
												value={
													(formData as any)
														.quarterlyDeliverySchedule ?? []
												}
												onChange={(next) =>
													handleInputChange(
														"quarterlyDeliverySchedule",
														next
													)
												}
												disabled={isFieldLocked(
													"quarterlyDeliverySchedule",
													sectionId
												)}
												fieldId="quarterlyDeliverySchedule"
												sectionId={sectionId}
												title="Quarterly Delivery Schedule"
												required={isFieldRequiredFromSchema(
													"quarterlyDeliverySchedule"
												)}
												fieldMetadata={
													fieldMetadata["quarterlyDeliverySchedule"]
												}
												lockButton={renderFieldLockButton(
													"quarterlyDeliverySchedule",
													sectionId
												)}
												className={getTableWrapperClasses(
													"quarterlyDeliverySchedule",
													sectionId
												)}
												quarterPlaceholder="Q1 2025"
											/>

											{/* Sensitivity Analysis */}
											<SensitivityAnalysisEditor
												value={
													(formData as any)
														.sensitivityAnalysis ?? null
												}
												onChange={(next) =>
													handleInputChange(
														"sensitivityAnalysis",
														next
													)
												}
												disabled={isFieldLocked(
													"sensitivityAnalysis",
													sectionId
												)}
												fieldId="sensitivityAnalysis"
												sectionId={sectionId}
												title="Sensitivity Analysis"
												required={isFieldRequiredFromSchema(
													"sensitivityAnalysis"
												)}
												fieldMetadata={
													fieldMetadata["sensitivityAnalysis"]
												}
												lockButton={renderFieldLockButton(
													"sensitivityAnalysis",
													sectionId
												)}
												className={getTableWrapperClasses(
													"sensitivityAnalysis",
													sectionId
												)}
											/>
										</>
									)}

								{/* Capital Use Timing - Uses of Funds */}
								{sectionId === "financial-details" &&
									subsectionId === "uses-of-funds" && (
										<CapitalUseTimingEditor
											value={
												(formData as any)
													.capitalUseTiming ?? null
											}
											onChange={(next) =>
												handleInputChange(
													"capitalUseTiming",
													next
												)
											}
											disabled={isFieldLocked(
												"capitalUseTiming",
												sectionId
											)}
											fieldId="capitalUseTiming"
											sectionId={sectionId}
											title="Capital Use Timing"
											required={isFieldRequiredFromSchema(
												"capitalUseTiming"
											)}
											fieldMetadata={
												fieldMetadata["capitalUseTiming"]
											}
											lockButton={renderFieldLockButton(
												"capitalUseTiming",
												sectionId
											)}
											className={getTableWrapperClasses(
												"capitalUseTiming",
												sectionId
											)}
										/>
									)}

								{/* Risk Analysis Fields */}
								{sectionId === "financial-details" &&
									subsectionId === "risk-analysis" && (
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<RiskListEditor
												value={(formData as any).riskHigh}
												onChange={(next) =>
													handleInputChange("riskHigh", next)
												}
												disabled={isFieldLocked("riskHigh", sectionId)}
												fieldId="riskHigh"
												sectionId={sectionId}
												title="High Risk Items"
												required={isFieldRequiredFromSchema("riskHigh")}
												fieldMetadata={fieldMetadata["riskHigh"]}
												lockButton={renderFieldLockButton("riskHigh", sectionId)}
												className={getTableWrapperClasses("riskHigh", sectionId)}
											/>
											<RiskListEditor
												value={(formData as any).riskMedium}
												onChange={(next) =>
													handleInputChange("riskMedium", next)
												}
												disabled={isFieldLocked("riskMedium", sectionId)}
												fieldId="riskMedium"
												sectionId={sectionId}
												title="Medium Risk Items"
												required={isFieldRequiredFromSchema("riskMedium")}
												fieldMetadata={fieldMetadata["riskMedium"]}
												lockButton={renderFieldLockButton("riskMedium", sectionId)}
												className={getTableWrapperClasses("riskMedium", sectionId)}
											/>
											<RiskListEditor
												value={(formData as any).riskLow}
												onChange={(next) =>
													handleInputChange("riskLow", next)
												}
												disabled={isFieldLocked("riskLow", sectionId)}
												fieldId="riskLow"
												sectionId={sectionId}
												title="Low Risk Items"
												required={isFieldRequiredFromSchema("riskLow")}
												fieldMetadata={fieldMetadata["riskLow"]}
												lockButton={renderFieldLockButton("riskLow", sectionId)}
												className={getTableWrapperClasses("riskLow", sectionId)}
											/>
										</div>
									)}

								{/* Rent Roll Table */}
								{sectionId === "financial-details" &&
									subsectionId === "rent-roll" && (
										<RentRollEditor
											value={
												(formData as any).rentRollUnits ?? []
											}
											onChange={(next) =>
												handleInputChange("rentRollUnits", next)
											}
											disabled={isFieldLocked("rentRollUnits", sectionId)}
											fieldId="rentRollUnits"
											sectionId={sectionId}
											title="Rent Roll (Unit Level)"
											required={isFieldRequiredFromSchema("rentRollUnits")}
											fieldMetadata={fieldMetadata["rentRollUnits"]}
											lockButton={renderFieldLockButton("rentRollUnits", sectionId)}
											className={getTableWrapperClasses("rentRollUnits", sectionId)}
										/>
									)}

								{/* T-12 Monthly Data Table */}
								{sectionId === "financial-details" && subsectionId === "operating-expenses" && (
									<T12MonthlyDataEditor
										value={(formData as any).t12MonthlyData ?? []}
										onChange={(next) => handleInputChange("t12MonthlyData", next)}
										disabled={isFieldLocked("t12MonthlyData", sectionId)}
										fieldId="t12MonthlyData"
										sectionId={sectionId}
										title="T-12 Monthly Data"
										required={isFieldRequiredFromSchema("t12MonthlyData")}
										fieldMetadata={fieldMetadata["t12MonthlyData"]}
										lockButton={renderFieldLockButton("t12MonthlyData", sectionId)}
										className={getTableWrapperClasses("t12MonthlyData", sectionId)}
									/>
								)}


								{sectionId === "site-context" &&
									subsectionId === "project-media" && (
										<div className="mt-2">
											<h4 className="text-sm font-semibold text-gray-800 mb-3">
												Project Media
											</h4>
											<ProjectMediaUpload
												projectId={formData.id}
												orgId={activeOrg?.id || null}
												disabled={false}
												formData={formData}
												setFormData={setFormData}
												isFieldLocked={isFieldLocked}
												toggleFieldLock={
													toggleFieldLock
												}
											/>
										</div>
									)}
						</>
					</ProjectResumeSubsection>
				);
			};

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
						{Array.isArray(subsections) &&
							subsections.length > 0 ? (
							<div className="space-y-4">
								{subsections.map((subsection: any) =>
									renderSubsection(subsection)
								)}
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								{(step.fields || []).map((fieldId: string) =>
									renderDynamicField(fieldId, sectionId)
								)}
							</div>
						)}
					</div>
				),
			};
		});
	}, [
		expandedSubsections,
		renderDynamicField,
		sectionIconComponents,
		getTableWrapperClasses,
		isFieldLocked,
		handleInputChange,
		renderFieldLockButton,
		toggleSubsection,
		isFieldBlue,
		isFieldGreen,
		isFieldWhite,
		isSubsectionFullyLocked,
		toggleSubsectionLock,
		formData,
		activeOrg?.id,
		isFieldRequiredFromSchema,
		fieldMetadata,
		toggleFieldLock,
	]);

	const initialStepIndex = useMemo(() => {
		if (!initialStepId) return 0;
		const idx = steps.findIndex((s) => s.id === initialStepId);
		return idx >= 0 ? idx : 0;
	}, [initialStepId, steps]);

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
			// Before triggering autofill, persist the latest lock state (and any
			// current form values) so the backend can respect locked fields.
			// We update the existing resume in place (no new version); the
			// autofill pipeline will create a new version only if it detects
			// actual changes.
			const lockedFieldsObj: Record<string, boolean> = {};
			lockedFields.forEach((id) => {
				lockedFieldsObj[id] = true;
			});

			const dataToSave: ProjectProfile = {
				...formData,
				_metadata: fieldMetadata,
				_lockedFields: lockedFieldsObj,
			};

			// Signal to realtime hooks that this is a local save (before autofill)
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("local-save-started", {
						detail: {
							projectId: dataToSave.id,
							context: "project",
						},
					})
				);
			}

			try {
				await saveProjectResume(dataToSave.id, dataToSave, {
					createNewVersion: false,
				});
			} catch (saveErr) {
				// Log but don't block autofill â€“ better to proceed than silently fail.
				console.error(
					"[EnhancedProjectForm] Failed to persist locks before autofill:",
					saveErr
				);
			}

			await startAutofill();
		} catch (err) {
			console.error("Autofill failed:", err);
		}
	}, [startAutofill, formData, fieldMetadata, lockedFields]);

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
							Project Resume
						</h3>
						<div className="relative group">
							<HelpCircle className="h-4 w-4 text-gray-400 hover:text-blue-600 cursor-help" />
							<div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 transform opacity-0 transition-opacity duration-150 group-hover:opacity-100">
								<div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg">
									Fill out the key details for your project.
									Fields can be autofilled from documents and
									locked to prevent overwrites.
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
				<ProjectResumeWizard
					steps={steps}
					initialStep={initialStepIndex}
					onComplete={handleFormSubmit}
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

export default EnhancedProjectForm;
