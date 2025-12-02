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
import { useProjects } from "@/hooks/useProjects";
import { useAutofill } from "@/hooks/useAutofill";
import { cn } from "@/utils/cn";
import { FIELD_TO_SECTION } from "@/lib/section-grouping";
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
} from "lucide-react";
import {
	ProjectProfile,
	ProjectPhase,
	InterestRateType,
	RecoursePreference,
	ExitStrategy,
} from "@/types/enhanced-types";
import { PROJECT_REQUIRED_FIELDS } from "@/utils/resumeCompletion";
import formSchema from "@/lib/enhanced-project-form.schema.json";
import {
	projectResumeFieldMetadata,
	FieldMetadata as ProjectFieldMeta,
} from "@/lib/project-resume-field-metadata";
import { normalizeSource } from "@/utils/sourceNormalizer";

interface EnhancedProjectFormProps {
	existingProject: ProjectProfile;
	onComplete?: (project: ProjectProfile) => void;
	compact?: boolean;
	onAskAI?: (fieldId: string) => void;
	onFormDataChange?: (formData: ProjectProfile) => void;
	initialFocusFieldId?: string;
	onVersionChange?: () => void;
}

const assetTypeOptions = [
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

const projectPhaseOptions: ProjectPhase[] = [
	"Acquisition",
	"Refinance",
	"Construction",
	"Bridge",
	"Development",
	"Value-Add",
	"Other",
];

const capitalTypeOptions = [
	{ label: "Senior Debt", value: "Senior Debt" },
	{ label: "Mezz", value: "Mezzanine" },
	{ label: "Preferred Equity", value: "Preferred Equity" },
	{ label: "Common Equity", value: "Common Equity" },
	{ label: "JV Equity", value: "JV Equity" },
	{ label: "Other", value: "Other" },
];

const interestRateTypeOptions: InterestRateType[] = [
	"Not Specified",
	"Fixed",
	"Floating",
];

const recourseOptions: RecoursePreference[] = [
	"Flexible",
	"Full Recourse",
	"Partial Recourse",
	"Non-Recourse",
];

const exitStrategyOptions: ExitStrategy[] = [
	"Undecided",
	"Sale",
	"Refinance",
	"Long-Term Hold",
];

// State mapping: abbreviation -> full name
const STATE_MAP: Record<string, string> = {
	AL: "Alabama",
	AK: "Alaska",
	AZ: "Arizona",
	AR: "Arkansas",
	CA: "California",
	CO: "Colorado",
	CT: "Connecticut",
	DE: "Delaware",
	FL: "Florida",
	GA: "Georgia",
	HI: "Hawaii",
	ID: "Idaho",
	IL: "Illinois",
	IN: "Indiana",
	IA: "Iowa",
	KS: "Kansas",
	KY: "Kentucky",
	LA: "Louisiana",
	ME: "Maine",
	MD: "Maryland",
	MA: "Massachusetts",
	MI: "Michigan",
	MN: "Minnesota",
	MS: "Mississippi",
	MO: "Missouri",
	MT: "Montana",
	NE: "Nebraska",
	NV: "Nevada",
	NH: "New Hampshire",
	NJ: "New Jersey",
	NM: "New Mexico",
	NY: "New York",
	NC: "North Carolina",
	ND: "North Dakota",
	OH: "Ohio",
	OK: "Oklahoma",
	OR: "Oregon",
	PA: "Pennsylvania",
	RI: "Rhode Island",
	SC: "South Carolina",
	SD: "South Dakota",
	TN: "Tennessee",
	TX: "Texas",
	UT: "Utah",
	VT: "Vermont",
	VA: "Virginia",
	WA: "Washington",
	WV: "West Virginia",
	WI: "Wisconsin",
	WY: "Wyoming",
};

// Reverse mapping: full name -> abbreviation
const STATE_REVERSE_MAP: Record<string, string> = Object.fromEntries(
	Object.entries(STATE_MAP).map(([abbr, full]) => [full, abbr])
);

const stateOptionsFullNames = Object.values(STATE_MAP).sort();

// Dropdown field options
const dealStatusOptions = [
	"Inquiry",
	"Underwriting",
	"Pre-Submission",
	"Submitted",
	"Closed",
];
const expectedZoningChangesOptions = ["None", "Variance", "PUD", "Re-Zoning"];
const syndicationStatusOptions = ["Committed", "In Process", "TBD"];
const sponsorExperienceOptions = [
	"First-Time",
	"Emerging (1-3)",
	"Seasoned (3+)",
];
const loanTypeOptions = [
	"Construction",
	"Permanent",
	"Bridge",
	"Mezzanine",
	"Preferred Equity",
	"Other",
];
const constructionTypeOptions = ["Ground-Up", "Renovation", "Adaptive Reuse"];
const primaryAssetClassOptions = [
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
const buildingTypeOptions = ["High-rise", "Mid-rise", "Garden", "Podium"];
const hvacSystemOptions = ["Central", "Split System", "PTAC", "VRF"];
const leedGreenRatingOptions = [
	"Certified",
	"Silver",
	"Gold",
	"Platinum",
	"NGBS",
];
const crimeRiskLevelOptions = ["Low", "Moderate", "High"];
const exemptionStructureOptions = ["PFC", "MMD", "PILOT"];
const relocationPlanOptions = ["Complete", "In Process", "N/A"];
const entitlementsOptions = ["Approved", "Pending"];
const finalPlansOptions = ["Approved", "Pending"];
const permitsIssuedOptions = ["Issued", "Pending"];
const currentSiteStatusOptions = ["Vacant", "Existing"];
const topographyOptions = ["Flat", "Sloped"];
const environmentalOptions = ["Clean", "Remediation"];
const utilitiesOptions = ["Available", "None"];
const seismicRiskOptions = ["Low", "Moderate", "High"];
const phaseIESAFindingOptions = ["Clean", "REC", "HREC"];

const isProjectValueProvided = (value: unknown): boolean => {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "number") return !Number.isNaN(value);
	if (typeof value === "boolean") return true;
	return false;
};

// Sanitize incoming ProjectProfile / metadata so obviously wrong legacy values
// (e.g. boolean `true` where dataType is Integer/Percent/Text) are nulled out
// before they ever hit the form state or get written back to the DB again.
const sanitizeProjectProfile = (profile: ProjectProfile): ProjectProfile => {
	const next: any = { ...profile };

	// Fix flat field values
	for (const [fieldId, meta] of Object.entries(projectResumeFieldMetadata)) {
		const dataType = (meta as ProjectFieldMeta).dataType;
		if (!dataType || dataType === "Boolean") continue;

		const current = (next as any)[fieldId];
		if (typeof current === "boolean") {
			(next as any)[fieldId] = null;
		}
	}

	// Fix rich metadata container on the profile itself
	if (next._metadata && typeof next._metadata === "object") {
		const fixedMeta: Record<string, any> = { ...next._metadata };
		for (const [fieldId, meta] of Object.entries(fixedMeta)) {
			const fieldConfig = projectResumeFieldMetadata[fieldId];
			const dataType = fieldConfig?.dataType;
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

	return next as ProjectProfile;
};

const EnhancedProjectForm: React.FC<EnhancedProjectFormProps> = ({
	existingProject,
	onComplete,
	compact,
	onAskAI,
	onFormDataChange,
	initialFocusFieldId,
	onVersionChange,
}) => {
	const [formData, setFormData] = useState<ProjectProfile>(
		sanitizeProjectProfile(existingProject)
	);
	const [fieldMetadata, setFieldMetadata] = useState<Record<string, any>>(
		existingProject._metadata || {}
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
	const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
	const { updateProject } = useProjects();

	const {
		isAutofilling,
		showSparkles,
		handleAutofill: startAutofill,
	} = useAutofill(existingProject.id, { context: "project" });

	useEffect(() => {
		const handler = () => {
			setShowAutofillNotification(true);
			setTimeout(() => setShowAutofillNotification(false), 5000);
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
	}, []);

	// Helper function to update metadata when user inputs data
	const handleInputChange = useCallback(
		(fieldId: string, value: any) => {
			setFormData((prev) => {
				const next = { ...prev, [fieldId]: value };
				onFormDataChange?.(next);
				return next;
			});

			// Update metadata to mark source as User Input
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
						// Force source to user_input when edited manually
						sources: [{ type: "user_input" } as any], // Cast to any to match SourceMetadata if needed
						original_source: null,
					},
				};
			});
		},
		[onFormDataChange]
	);

	// Helper to derive section lock status from field locks
	const isSectionFullyLocked = useCallback(
		(sectionId: string) => {
			// Get all fields in this section
			const sectionFieldIds = Object.keys(FIELD_TO_SECTION).filter(
				(fieldId) => FIELD_TO_SECTION[fieldId] === sectionId
			);

			if (sectionFieldIds.length === 0) return false;

			// Check if all fields in section are locked (and not explicitly unlocked)
			return sectionFieldIds.every(
				(fieldId) =>
					!unlockedFields.has(fieldId) && lockedFields.has(fieldId)
			);
		},
		[lockedFields, unlockedFields]
	);

	const isFieldLocked = useCallback(
		(fieldId: string, sectionId?: string) => {
			// Explicitly unlocked fields override everything
			if (unlockedFields.has(fieldId)) return false;
			// Explicitly locked fields
			if (lockedFields.has(fieldId)) return true;
			// Check if section is fully locked (all fields locked)
			if (sectionId && isSectionFullyLocked(sectionId)) return true;
			return false;
		},
		[lockedFields, unlockedFields, isSectionFullyLocked]
	);

	const toggleFieldLock = useCallback(
		(fieldId: string) => {
			// If currently locked (either explicitly or via section)
			const currentlyLocked = (() => {
				if (unlockedFields.has(fieldId)) return false;
				if (lockedFields.has(fieldId)) return true;
				// Need section ID to check section lock, but simple toggle relies on explicit field lock
				// For this component we will manage explicit field locks primarily
				return false;
			})();

			if (currentlyLocked) {
				// Unlock
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
				// Lock
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

	const toggleSectionLock = useCallback(
		(sectionId: string) => {
			// Get all fields in this section
			const sectionFieldIds = Object.keys(FIELD_TO_SECTION).filter(
				(fieldId) => FIELD_TO_SECTION[fieldId] === sectionId
			);

			const isCurrentlyFullyLocked = isSectionFullyLocked(sectionId);

			// Lock or unlock all fields in the section
			setLockedFields((prev) => {
				const next = new Set(prev);
				sectionFieldIds.forEach((fieldId) => {
					if (isCurrentlyFullyLocked) {
						next.delete(fieldId);
					} else {
						next.add(fieldId);
					}
				});
				return next;
			});

			// Clear unlocked fields for this section when toggling
			setUnlockedFields((prev) => {
				const next = new Set(prev);
				sectionFieldIds.forEach((fieldId) => next.delete(fieldId));
				return next;
			});
		},
		[isSectionFullyLocked]
	);

	// Styling Logic:
	// White: Empty
	// Blue: Filled + Unlocked (User Input)
	// Green: Filled + Locked (AI or User Locked)
	const getFieldStylingClasses = useCallback(
		(fieldId: string, sectionId?: string) => {
			const value = (formData as any)[fieldId];
			const hasValue = isProjectValueProvided(value);
			const locked = isFieldLocked(fieldId, sectionId);
			const meta = fieldMetadata[fieldId];
			const hasSources =
				meta && Array.isArray(meta.sources) && meta.sources.length > 0;

			const baseClasses =
				"w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm transition-colors duration-200";

			if (!hasValue) {
				// If there's metadata/sources (e.g. after autofill), treat the field
				// as "touched" even if the value is currently empty.
				if (hasSources) {
					if (locked) {
						// Green - Locked but currently empty (user locked an empty field)
						return cn(
							baseClasses,
							"border-emerald-500 bg-emerald-50 focus:ring-emerald-200 hover:border-emerald-600 text-gray-800"
						);
					}

					// Blue - Touched/unlocked but empty (e.g. user_input placeholder)
					return cn(
						baseClasses,
						"border-blue-600 bg-blue-50 focus:ring-blue-200 hover:border-blue-700 text-gray-800"
					);
				}

				// White - Truly untouched/empty
				return cn(
					baseClasses,
					"border-gray-200 bg-white focus:ring-blue-200 hover:border-gray-300"
				);
			}

			if (locked) {
				// Green - Filled & Locked
				return cn(
					baseClasses,
					"border-emerald-500 bg-emerald-50 focus:ring-emerald-200 hover:border-emerald-600 text-gray-800"
				);
			}

			// Blue - Filled & Unlocked
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
			if (!meta?.sources || meta.sources.length === 0) return false;

			// Check if source is NOT user input
			const isUserInput = meta.sources.some((src: any) => {
				if (typeof src === "string")
					return (
						src.toLowerCase() === "user_input" ||
						src.toLowerCase() === "user input"
					);
				return src.type === "user_input";
			});

			return !isUserInput;
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

	// Helper to determine if a field is "blue" (filled/unlocked or touched)
	// Blue fields should keep subsections open
	const isFieldBlue = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			const value = (formData as any)[fieldId];
			const hasValue = isProjectValueProvided(value);
			const locked = isFieldLocked(fieldId, sectionId);
			const meta = fieldMetadata[fieldId];
			const hasSources =
				meta && Array.isArray(meta.sources) && meta.sources.length > 0;

			// Blue: has value and unlocked, OR has sources but no value (touched but empty)
			if (!hasValue) {
				// Empty field is blue only if it has sources and is unlocked
				return hasSources && !locked;
			}

			// Field has value - is blue only if unlocked
			return !locked;
		},
		[formData, fieldMetadata, isFieldLocked]
	);

	// Helper to determine if a field is "white" (truly empty/untouched)
	const isFieldWhite = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			const value = (formData as any)[fieldId];
			const hasValue = isProjectValueProvided(value);
			const meta = fieldMetadata[fieldId];
			const hasSources =
				meta && Array.isArray(meta.sources) && meta.sources.length > 0;

			// White: no value and no sources
			return !hasValue && !hasSources;
		},
		[formData, fieldMetadata]
	);

	// Helper to determine if a field is "green" (filled and locked)
	const isFieldGreen = useCallback(
		(fieldId: string, sectionId?: string): boolean => {
			const value = (formData as any)[fieldId];
			const hasValue = isProjectValueProvided(value);
			const locked = isFieldLocked(fieldId, sectionId);
			const meta = fieldMetadata[fieldId];
			const hasSources =
				meta && Array.isArray(meta.sources) && meta.sources.length > 0;

			// Green: (has value or has sources) and is locked
			return (hasValue || hasSources) && locked;
		},
		[formData, fieldMetadata, isFieldLocked]
	);

	const renderFieldLockButton = useCallback(
		(fieldId: string, sectionId: string) => {
			const locked = isFieldLocked(fieldId, sectionId);
			return (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						toggleFieldLock(fieldId);
					}}
					className={cn(
						"flex items-center justify-center p-1 rounded transition-colors cursor-pointer z-10",
						locked
							? "text-emerald-600 hover:text-emerald-700"
							: "text-gray-400 hover:text-blue-600"
					)}
					title={locked ? "Unlock field" : "Lock field"}
				>
					{locked ? (
						<Lock className="h-4 w-4" />
					) : (
						<Unlock className="h-4 w-4" />
					)}
				</button>
			);
		},
		[isFieldLocked, toggleFieldLock]
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
							{labelText}
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
								onClick={() => (onAskAI || (() => {}))(fieldId)}
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
		[onAskAI, getFieldWarning, renderFieldLockButton, fieldMetadata]
	);

	// Effect to handle updates from parent (e.g. after Autofill)
	useEffect(() => {
		const sanitized = sanitizeProjectProfile(existingProject);
		setFormData(sanitized);
		const metadata = sanitized._metadata || {};
		setFieldMetadata(metadata);

		// Update locks based on source
		// If a field has a value AND source is not user_input -> Lock it (Green)
		const newLockedFields = new Set(
			Object.keys(existingProject._lockedFields || {}).filter(
				(k) => existingProject._lockedFields?.[k]
			)
		);

		Object.entries(metadata).forEach(([fieldId, meta]) => {
			// Check if source is AI/Document.
			// Be defensive: sources array can contain null/undefined or non-standard entries.
			const isAiSourced =
				Array.isArray((meta as any)?.sources) &&
				(meta as any).sources.some((src: any) => {
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
						return (src as any).type !== "user_input";
					}

					// Unknown shape – treat as non-user-input but do not crash
					return false;
				});

			const hasValue = isProjectValueProvided(
				(existingProject as any)[fieldId]
			);

			// Auto-lock if AI sourced and has value, unless explicitly unlocked previously?
			// We'll trust the incoming _lockedFields from DB mostly, but ensure AI fields are locked
			if (isAiSourced && hasValue) {
				newLockedFields.add(fieldId);
			}
		});

		setLockedFields(newLockedFields);
	}, [existingProject]);

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

	// Autosave
	useEffect(() => {
		if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
		debounceTimeout.current = setTimeout(async () => {
			try {
				const lockedFieldsObj: Record<string, boolean> = {};
				lockedFields.forEach((id) => {
					lockedFieldsObj[id] = true;
				});
				const dataToSave: ProjectProfile = {
					...formData,
					_metadata: fieldMetadata,
					_lockedFields: lockedFieldsObj,
					// No _lockedSections - derive from field locks
				};
				await updateProject(formData.id, dataToSave);
				setFormSaved(true);
			} catch (err) {
				console.error("[EnhancedProjectForm] Auto-save failed:", err);
			} finally {
				setTimeout(() => setFormSaved(false), 1500);
			}
		}, 1500);
		return () => {
			if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
		};
	}, [formData, fieldMetadata, lockedFields, updateProject]);

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
			Map,
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
			primaryAssetClass: "button-select",
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
			primaryAssetClass: primaryAssetClassOptions,
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
			const hasSources =
				metaFromState &&
				Array.isArray(metaFromState.sources) &&
				metaFromState.sources.length > 0;
			const hasValue = isProjectValueProvided(value);

			const controlKind: ControlKind =
				fieldControlOverrides[fieldId] ??
				getDefaultControlForDataType(dataType);

			const commonClassName = getFieldStylingClasses(fieldId, sectionId);

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
								onSelect={(selected) => {
									handleInputChange(fieldId, selected);
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
						// Convert current value (abbreviation) to full name for display
						const displayValue =
							value &&
							typeof value === "string" &&
							value.length === 2
								? STATE_MAP[value.toUpperCase()] || value
								: value || "";
						return (
							<Select
								id={fieldId}
								value={displayValue}
								onChange={(e) => {
									// Convert selected full name back to abbreviation
									const abbr =
										STATE_REVERSE_MAP[e.target.value] ||
										e.target.value;
									handleInputChange(fieldId, abbr);
								}}
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
							{renderControl()}
						</div>
					</AskAIButton>
				</FormGroup>
			);
		},
		[
			formData,
			getFieldStylingClasses,
			handleInputChange,
			onAskAI,
			renderFieldLabel,
			isFieldLocked,
			isFieldRequiredFromSchema,
			fieldControlOverrides,
			fieldOptionsRegistry,
			getDefaultControlForDataType,
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
				const fieldStates = fieldIds.map((fieldId) => ({
					isBlue: isFieldBlue(fieldId, sectionId),
					isGreen: isFieldGreen(fieldId, sectionId),
					isWhite: isFieldWhite(fieldId, sectionId),
					hasValue: isProjectValueProvided(
						(formData as any)[fieldId]
					),
					isLocked: isFieldLocked(fieldId, sectionId),
				}));

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

				// Determine auto-state
				if (hasBlue) {
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
		manuallyToggledSubsections,
	]);

	// Helper to get blue/green/white styling for complex table wrappers (arrays like unit mix, rent comps, etc.)
	const getTableWrapperClasses = useCallback(
		(fieldId: string, sectionId: string) => {
			const value = (formData as any)[fieldId];
			const hasValue = isProjectValueProvided(
				Array.isArray(value) ? value : value ?? null
			);
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

			return cn(
				base,
				"border-blue-600 bg-blue-50 hover:border-blue-700"
			);
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

				// Determine subsection state for visual indication
				const fieldStates =
					allFieldIds.length > 0
						? allFieldIds.map((fieldId) => ({
								isBlue: isFieldBlue(fieldId, sectionId),
								isGreen: isFieldGreen(fieldId, sectionId),
								isWhite: isFieldWhite(fieldId, sectionId),
								hasValue: isProjectValueProvided(
									(formData as any)[fieldId]
								),
								isLocked: isFieldLocked(fieldId, sectionId),
						  }))
						: [];

				const allGreen =
					fieldStates.length > 0 &&
					fieldStates.every(
						(state) =>
							state.isGreen &&
							!state.isBlue &&
							!state.isWhite &&
							state.isLocked
					);
				const allWhite =
					fieldStates.length > 0 &&
					fieldStates.every(
						(state) =>
							state.isWhite && !state.isBlue && !state.isGreen
					);
				const hasBlue = fieldStates.some((state) => state.isBlue);

				// Determine badge state
				// Show "Complete" only if: all fields have values AND are locked (all green)
				// Show "Needs Input" only if: at least one field is blue
				// Show no badge in all other cases (all white, empty, mixed, etc.)
				const showComplete =
					allFieldIds.length > 0 && allGreen && !hasBlue;
				const showNeedsInput = hasBlue;

				return (
					<div
						key={subsectionId}
						className="rounded-md border border-gray-100 bg-gray-50/60 overflow-hidden"
					>
						<button
							type="button"
							onClick={() => toggleSubsection(subsectionKey)}
							className="w-full flex items-center justify-between p-3 hover:bg-gray-100/60 transition-colors"
						>
							<div className="flex items-center gap-2">
								{isExpanded ? (
									<ChevronDown className="h-4 w-4 text-gray-500" />
								) : (
									<ChevronRight className="h-4 w-4 text-gray-500" />
								)}
								<h3 className="text-sm font-semibold text-gray-800">
									{subsection.title}
								</h3>
							</div>
							<div className="flex items-center gap-2">
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
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									{allFieldIds
										// drawSchedule is rendered as a structured table below
										.filter(
											(fieldId) =>
												!(
													sectionId === "timeline" &&
													fieldId === "drawSchedule"
												)
										)
										.map((fieldId) =>
											renderDynamicField(fieldId, sectionId)
										)}
								</div>

								{/* Section-specific tables in edit mode */}
								{sectionId === "property-specs" &&
									subsectionId === "physical-structure" && (
										<>
											{/* Residential Unit Mix */}
											<div
												className={cn(
													getTableWrapperClasses(
														"residentialUnitMix",
														sectionId
													),
													"p-4"
												)}
											>
												<div className="mb-3 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
															Residential Unit Mix
														</h4>
														<FieldHelpTooltip
															fieldId="residentialUnitMix"
															fieldMetadata={
																fieldMetadata[
																	"residentialUnitMix"
																]
															}
														/>
													</div>
													<div className="flex items-center gap-1">
														{renderFieldLockButton(
															"residentialUnitMix",
															sectionId
														)}
													</div>
												</div>
												<div className="overflow-x-auto">
													<table className="min-w-full divide-y divide-gray-200 text-sm">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Unit Type
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Count
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Avg SF
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Monthly Rent
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Total SF
																</th>
															</tr>
														</thead>
														<tbody className="bg-white divide-y divide-gray-100">
															{(() => {
																const value =
																	(formData as any)
																		.residentialUnitMix;
																const rows: any[] =
																	Array.isArray(
																		value
																	)
																		? value
																		: [];
																const isLocked =
																	isFieldLocked(
																		"residentialUnitMix",
																		sectionId
																	);

																const handleRowChange =
																	(
																		index: number,
																		key:
																			| "unitType"
																			| "unitCount"
																			| "avgSF"
																			| "monthlyRent"
																			| "totalSF",
																		raw: string
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		const current =
																			next[
																				index
																			] ||
																			{};
																		let v: any =
																			raw;
																		if (
																			[
																				"unitCount",
																				"avgSF",
																				"monthlyRent",
																				"totalSF",
																			].includes(
																				key
																			)
																		) {
																			v =
																				raw.trim() ===
																				""
																					? undefined
																					: Number(
																							raw
																					  );
																			if (
																				Number.isNaN(
																					v
																				)
																			) {
																				v =
																					undefined;
																			}
																		}
																		next[
																			index
																		] = {
																			...current,
																			[
																				key
																			]:
																				v,
																		};
																		handleInputChange(
																			"residentialUnitMix",
																			next
																		);
																	};

																const handleAddRow =
																	() => {
																		const next =
																			[
																				...rows,
																			];
																		next.push(
																			{
																				unitType:
																					"",
																				unitCount:
																					undefined,
																				avgSF: undefined,
																				monthlyRent:
																					undefined,
																				totalSF:
																					undefined,
																			}
																		);
																		handleInputChange(
																			"residentialUnitMix",
																			next
																		);
																	};

																const handleRemoveRow =
																	(
																		index: number
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		next.splice(
																			index,
																			1
																		);
																		handleInputChange(
																			"residentialUnitMix",
																			next
																		);
																	};

																const displayRows =
																	rows.length >
																	0
																		? rows
																		: [{}];

																return (
																	<>
																		{displayRows.map(
																			(
																				row,
																				idx
																			) => (
																				<tr key={idx}>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="text"
																							className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.unitType ??
																								""
																							}
																							onChange={(e) =>
																								handleRowChange(
																									idx,
																									"unitType",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={0}
																							className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.unitCount ??
																								""
																							}
																							onChange={(e) =>
																								handleRowChange(
																									idx,
																									"unitCount",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={0}
																							className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.avgSF ??
																								""
																							}
																							onChange={(e) =>
																								handleRowChange(
																									idx,
																									"avgSF",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={0}
																							className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.monthlyRent ??
																								""
																							}
																							onChange={(e) =>
																								handleRowChange(
																									idx,
																									"monthlyRent",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={0}
																							className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.totalSF ??
																								""
																							}
																							onChange={(e) =>
																								handleRowChange(
																									idx,
																									"totalSF",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 text-right align-middle">
																						<Button
																							type="button"
																							variant="ghost"
																							size="xs"
																							onClick={() =>
																								handleRemoveRow(
																									idx
																								)
																							}
																							disabled={
																								isLocked ||
																								rows.length <=
																									1
																							}
																							className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																						>
																							Remove
																						</Button>
																					</td>
																				</tr>
																			)
																		)}
																		<tr>
																			<td colSpan={6} className="px-3 pt-3">
																				<Button
																					type="button"
																					variant="outline"
																					size="xs"
																					onClick={
																						handleAddRow
																					}
																					disabled={
																						isLocked
																					}
																					className="text-xs px-3 py-1"
																				>
																					Add Row
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

											{/* Commercial Space Mix */}
											<div
												className={cn(
													getTableWrapperClasses(
														"commercialSpaceMix",
														sectionId
													),
													"p-4"
												)}
											>
												<div className="mb-3 flex items-center justify-between">
													<div className="flex items-center gap-2">
														<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
															Commercial Space Mix
														</h4>
														<FieldHelpTooltip
															fieldId="commercialSpaceMix"
															fieldMetadata={
																fieldMetadata[
																	"commercialSpaceMix"
																]
															}
														/>
													</div>
													<div className="flex items-center gap-1">
														{renderFieldLockButton(
															"commercialSpaceMix",
															sectionId
														)}
													</div>
												</div>
												<div className="overflow-x-auto">
													<table className="min-w-full divide-y divide-gray-200 text-sm">
														<thead className="bg-gray-50">
															<tr>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Space Type
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Square Footage
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Tenant
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Lease Term
																</th>
																<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																	Annual Rent
																</th>
															</tr>
														</thead>
														<tbody className="bg-white divide-y divide-gray-100">
															{(() => {
																const value =
																	(formData as any)
																		.commercialSpaceMix;
																const rows: any[] =
																	Array.isArray(
																		value
																	)
																		? value
																		: [];
																const isLocked =
																	isFieldLocked(
																		"commercialSpaceMix",
																		sectionId
																	);

																const handleRowChange =
																	(
																		index: number,
																		key:
																			| "spaceType"
																			| "squareFootage"
																			| "tenant"
																			| "leaseTerm"
																			| "annualRent",
																		raw: string
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		const current =
																			next[
																				index
																			] ||
																			{};
																		let v: any =
																			raw;
																		if (
																			[
																				"squareFootage",
																				"annualRent",
																			].includes(
																				key
																			)
																		) {
																			v =
																				raw.trim() ===
																				""
																					? undefined
																					: Number(
																							raw
																					  );
																			if (
																				Number.isNaN(
																					v
																				)
																			) {
																				v =
																					undefined;
																			}
																		}
																		next[
																			index
																		] = {
																			...current,
																			[
																				key
																			]:
																				v,
																		};
																		handleInputChange(
																			"commercialSpaceMix",
																			next
																		);
																	};

																const handleAddRow =
																	() => {
																		const next =
																			[
																				...rows,
																			];
																		next.push(
																			{
																				spaceType:
																					"",
																				squareFootage:
																					undefined,
																				tenant:
																					"",
																				leaseTerm:
																					"",
																				annualRent:
																					undefined,
																			}
																		);
																		handleInputChange(
																			"commercialSpaceMix",
																			next
																		);
																	};

																const handleRemoveRow =
																	(
																		index: number
																	) => {
																		const next =
																			[
																				...rows,
																			];
																		next.splice(
																			index,
																			1
																		);
																		handleInputChange(
																			"commercialSpaceMix",
																			next
																		);
																	};

																const displayRows =
																	rows.length >
																	0
																		? rows
																		: [{}];

																return (
																	<>
																		{displayRows.map(
																			(
																				row,
																				idx
																			) => (
																				<tr key={idx}>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="text"
																							className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.spaceType ??
																								""
																							}
																							onChange={(e) =>
																								handleRowChange(
																									idx,
																									"spaceType",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={0}
																							className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.squareFootage ??
																								""
																							}
																							onChange={(e) =>
																								handleRowChange(
																									idx,
																									"squareFootage",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="text"
																							className="w-36 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.tenant ??
																								""
																							}
																							onChange={(e) =>
																								handleRowChange(
																									idx,
																									"tenant",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="text"
																							className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.leaseTerm ??
																								""
																							}
																							onChange={(e) =>
																								handleRowChange(
																									idx,
																									"leaseTerm",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 whitespace-nowrap align-middle">
																						<input
																							type="number"
																							min={0}
																							className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.annualRent ??
																								""
																							}
																							onChange={(e) =>
																								handleRowChange(
																									idx,
																									"annualRent",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</td>
																					<td className="px-3 py-2 text-right align-middle">
																						<Button
																							type="button"
																							variant="ghost"
																							size="xs"
																							onClick={() =>
																								handleRemoveRow(
																									idx
																								)
																							}
																							disabled={
																								isLocked ||
																								rows.length <=
																									1
																							}
																							className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																						>
																							Remove
																						</Button>
																					</td>
																				</tr>
																			)
																		)}
																		<tr>
																			<td colSpan={6} className="px-3 pt-3">
																				<Button
																					type="button"
																					variant="outline"
																					size="xs"
																					onClick={
																						handleAddRow
																					}
																					disabled={
																						isLocked
																					}
																					className="text-xs px-3 py-1"
																				>
																					Add Row
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
										</>
									)}

								{sectionId === "timeline" &&
									subsectionId ===
										"construction-lease-up-status" && (
										<div
											className={cn(
												getTableWrapperClasses(
													"drawSchedule",
													sectionId
												),
												"p-4"
											)}
										>
											<div className="mb-3 flex items-center justify-between">
												<div className="flex items-center gap-2">
													<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
														Draw Schedule
													</h4>
													<FieldHelpTooltip
														fieldId="drawSchedule"
														fieldMetadata={
															fieldMetadata[
																"drawSchedule"
															]
														}
													/>
												</div>
												<div className="flex items-center gap-1">
													{renderFieldLockButton(
														"drawSchedule",
														sectionId
													)}
												</div>
											</div>
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200 text-sm">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Draw #
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																% Complete
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Amount
															</th>
														</tr>
													</thead>
														<tbody className="bg-white divide-y divide-gray-100">
														{(() => {
															const value =
																(formData as any)
																	.drawSchedule;
															const rows: any[] =
																Array.isArray(
																	value
																)
																	? value
																	: [];
															const isLocked =
																isFieldLocked(
																	"drawSchedule",
																	sectionId
																);

															const handleRowChange =
																(
																	index: number,
																	key:
																		| "drawNumber"
																		| "percentComplete"
																		| "amount",
																	raw: string
																) => {
																	const next =
																		[
																			...rows,
																		];
																	const current =
																		next[
																			index
																		] || {};
																	let v: any =
																		raw.trim() ===
																		""
																			? undefined
																			: Number(
																					raw
																			  );
																	if (
																		Number.isNaN(
																			v
																		)
																	) {
																		v =
																			undefined;
																	}
																	next[
																		index
																	] = {
																		...current,
																		[key]: v,
																	};
																	handleInputChange(
																		"drawSchedule",
																		next
																	);
																};

															const handleAddRow =
																() => {
																	const next =
																		[
																			...rows,
																		];
																	next.push({
																		drawNumber:
																			(next.length ||
																				0) +
																			1,
																		percentComplete:
																			undefined,
																		amount: undefined,
																	});
																	handleInputChange(
																		"drawSchedule",
																		next
																	);
																};

															const handleRemoveRow =
																(
																	index: number
																) => {
																	const next =
																		[
																			...rows,
																		];
																	next.splice(
																		index,
																		1
																	);
																	handleInputChange(
																		"drawSchedule",
																		next
																	);
																};

															const displayRows =
																rows.length > 0
																	? rows
																	: [{}];

															return (
																<>
																	{displayRows.map(
																		(
																			row,
																			idx
																		) => (
																			<tr key={idx}>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={1}
																						className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.drawNumber ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"drawNumber",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<div className="flex items-center gap-1">
																						<input
																							type="number"
																							min={0}
																							max={100}
																							className="w-20 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.percentComplete ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"percentComplete",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																						<span className="text-gray-500">
																							%
																						</span>
																					</div>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<div className="flex items-center gap-1">
																						<span className="text-gray-500">
																							$
																						</span>
																						<input
																							type="number"
																							min={0}
																							className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																							value={
																								row.amount ??
																								""
																							}
																							onChange={(
																								e
																							) =>
																								handleRowChange(
																									idx,
																									"amount",
																									e
																										.target
																										.value
																								)
																							}
																							disabled={
																								isLocked
																							}
																						/>
																					</div>
																				</td>
																				<td className="px-3 py-2 text-right align-middle">
																					<Button
																						type="button"
																						variant="ghost"
																						size="xs"
																						onClick={() =>
																							handleRemoveRow(
																								idx
																							)
																						}
																						disabled={
																							isLocked ||
																							rows.length <=
																								1
																						}
																						className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																					>
																						Remove
																					</Button>
																				</td>
																			</tr>
																		)
																	)}
																	<tr>
																		<td colSpan={4} className="px-3 pt-3">
																			<Button
																				type="button"
																				variant="outline"
																				size="xs"
																				onClick={
																					handleAddRow
																				}
																				disabled={
																					isLocked
																				}
																				className="text-xs px-3 py-1"
																			>
																				Add Row
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
									)}

								{sectionId === "market-context" &&
									subsectionId === "supply-demand" && (
										<div
											className={cn(
												getTableWrapperClasses(
													"rentComps",
													sectionId
												),
												"p-4"
											)}
										>
											<div className="mb-3 flex items-center justify-between">
												<div className="flex items-center gap-2">
													<h4 className="text-sm font-semibold text-gray-800 tracking-wide">
														Rent Comparables
													</h4>
													<FieldHelpTooltip
														fieldId="rentComps"
														fieldMetadata={
															fieldMetadata[
																"rentComps"
															]
														}
													/>
												</div>
												<div className="flex items-center gap-1">
													{renderFieldLockButton(
														"rentComps",
														sectionId
													)}
												</div>
											</div>
											<div className="overflow-x-auto">
												<table className="min-w-full divide-y divide-gray-200 text-sm">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Property Name
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Address
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Distance (mi)
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Year Built
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Units
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Occupancy %
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Avg Rent/Month
															</th>
															<th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
																Rent/PSF
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-100">
														{(() => {
															const value =
																(formData as any)
																	.rentComps;
															const rows: any[] =
																Array.isArray(
																	value
																)
																	? value
																	: [];
															const isLocked =
																isFieldLocked(
																	"rentComps",
																	sectionId
																);

															const handleRowChange =
																(
																	index: number,
																	key:
																		| "propertyName"
																		| "address"
																		| "distance"
																		| "yearBuilt"
																		| "totalUnits"
																		| "occupancyPercent"
																		| "avgRentMonth"
																		| "rentPSF",
																	raw: string
																) => {
																	const next =
																		[
																			...rows,
																		];
																	const current =
																		next[
																			index
																		] || {};
																	let v: any =
																		raw;
																	if (
																		[
																			"distance",
																			"yearBuilt",
																			"totalUnits",
																			"occupancyPercent",
																			"avgRentMonth",
																			"rentPSF",
																		].includes(
																			key
																		)
																	) {
																		v =
																			raw.trim() ===
																			""
																				? undefined
																				: Number(
																						raw
																				  );
																		if (
																			Number.isNaN(
																				v
																			)
																		) {
																			v =
																				undefined;
																		}
																	}
																	next[
																		index
																	] = {
																		...current,
																		[key]: v,
																	};
																	handleInputChange(
																		"rentComps",
																		next
																	);
																};

															const handleAddRow =
																() => {
																	const next =
																		[
																			...rows,
																		];
																	next.push({
																		propertyName:
																			"",
																		address:
																			"",
																		distance:
																			undefined,
																		yearBuilt:
																			undefined,
																		totalUnits:
																			undefined,
																		occupancyPercent:
																			undefined,
																		avgRentMonth:
																			undefined,
																		rentPSF:
																			undefined,
																	});
																	handleInputChange(
																		"rentComps",
																		next
																	);
																};

															const handleRemoveRow =
																(
																	index: number
																) => {
																	const next =
																		[
																			...rows,
																		];
																	next.splice(
																		index,
																		1
																	);
																	handleInputChange(
																		"rentComps",
																		next
																	);
																};

															const displayRows =
																rows.length > 0
																	? rows
																	: [{}];

															return (
																<>
																	{displayRows.map(
																		(
																			row,
																			idx
																		) => (
																			<tr key={idx}>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="text"
																						className="w-40 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.propertyName ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"propertyName",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="text"
																						className="w-56 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.address ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"address",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={0}
																						step="0.01"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.distance ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"distance",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.yearBuilt ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"yearBuilt",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={0}
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.totalUnits ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"totalUnits",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={0}
																						step="0.1"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.occupancyPercent ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"occupancyPercent",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={0}
																						className="w-28 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.avgRentMonth ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"avgRentMonth",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 whitespace-nowrap align-middle">
																					<input
																						type="number"
																						min={0}
																						step="0.01"
																						className="w-24 rounded-md border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
																						value={
																							row.rentPSF ??
																							""
																						}
																						onChange={(
																							e
																						) =>
																							handleRowChange(
																								idx,
																								"rentPSF",
																								e
																									.target
																									.value
																							)
																						}
																						disabled={
																							isLocked
																						}
																					/>
																				</td>
																				<td className="px-3 py-2 text-right align-middle">
																					<Button
																						type="button"
																						variant="ghost"
																						size="xs"
																						onClick={() =>
																							handleRemoveRow(
																								idx
																							)
																						}
																						disabled={
																							isLocked ||
																							rows.length <=
																								1
																						}
																						className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
																					>
																						Remove
																					</Button>
																				</td>
																			</tr>
																		)
																	)}
																	<tr>
																		<td colSpan={9} className="px-3 pt-3">
																			<Button
																				type="button"
																				variant="outline"
																				size="xs"
																				onClick={
																					handleAddRow
																				}
																				disabled={
																					isLocked
																				}
																				className="text-xs px-3 py-1"
																			>
																				Add Row
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
									)}
							</div>
						)}
					</div>
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
							<button
								type="button"
								onClick={() => toggleSectionLock(sectionId)}
								className={cn(
									"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
									isSectionFullyLocked(sectionId)
										? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
										: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
								)}
								title={
									isSectionFullyLocked(sectionId)
										? "Unlock section"
										: "Lock section"
								}
							>
								{isSectionFullyLocked(sectionId) ? (
									<>
										<Lock className="h-4 w-4" />
										<span>Unlock Section</span>
									</>
								) : (
									<>
										<Unlock className="h-4 w-4" />
										<span>Lock Section</span>
									</>
								)}
							</button>
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
		isFieldRequiredFromSchema,
		isSectionFullyLocked,
		renderDynamicField,
		toggleSectionLock,
		sectionIconComponents,
		getTableWrapperClasses,
		isFieldLocked,
		handleInputChange,
		renderFieldLockButton,
		toggleSubsection,
		isFieldBlue,
		isFieldGreen,
		isFieldWhite,
		lockedFields,
		unlockedFields,
		formData,
		fieldMetadata,
	]);

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
				// No _lockedSections - derive from field locks
			};
			await updateProject(formData.id, dataToSave);
			onComplete?.(dataToSave);
			onVersionChange?.();
		},
		[
			formData,
			fieldMetadata,
			lockedFields,
			updateProject,
			onComplete,
			onVersionChange,
		]
	);

	const wrappedHandleAutofill = useCallback(async () => {
		try {
			await startAutofill();
		} catch (err) {
			console.error("Autofill failed:", err);
		}
	}, [startAutofill]);

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
					onComplete={handleFormSubmit}
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

export default EnhancedProjectForm;
