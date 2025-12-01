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
import { useProjects } from "@/hooks/useProjects";
import { useAutofill } from "@/hooks/useAutofill";
import { getProjectWithResume } from "@/lib/project-queries";
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
} from "lucide-react";
import {
	ProjectProfile,
	ProjectPhase,
	InterestRateType,
	RecoursePreference,
	ExitStrategy,
	FieldMetadata,
} from "@/types/enhanced-types";
import { PROJECT_REQUIRED_FIELDS } from "@/utils/resumeCompletion";
import formSchema from "@/lib/enhanced-project-form.schema.json";
import { projectResumeFieldMetadata } from "@/lib/project-resume-field-metadata";
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

const isProjectValueProvided = (value: unknown): boolean => {
	if (value === null || value === undefined) return false;
	if (typeof value === "string") return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "number") return !Number.isNaN(value);
	if (typeof value === "boolean") return true;
	return false;
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
	const [formData, setFormData] = useState<ProjectProfile>(existingProject);
	const [fieldMetadata, setFieldMetadata] = useState<
		Record<string, FieldMetadata>
	>(existingProject._metadata || {});

	// Initialize locked state from props
	const [lockedFields, setLockedFields] = useState<Set<string>>(() => {
		const saved = existingProject._lockedFields || {};
		return new Set(Object.keys(saved).filter((key) => saved[key] === true));
	});
	const [lockedSections, setLockedSections] = useState<Set<string>>(() => {
		const saved = existingProject._lockedSections || {};
		return new Set(Object.keys(saved).filter((key) => saved[key] === true));
	});

	const [unlockedFields, setUnlockedFields] = useState<Set<string>>(
		new Set()
	);
	
	// Field states management - tracks WHITE, BLUE, GREEN states for each field
	const [fieldStates, setFieldStates] = useState<Record<string, FieldStateData>>(() => {
		// Initialize from existing project's _fieldStates or calculate from current state
		const savedStates = existingProject._fieldStates || {};
		const existingMetadata = existingProject._metadata || {};
		const existingLockedFields = new Set(
			Object.keys(existingProject._lockedFields || {}).filter(
				(k) => existingProject._lockedFields?.[k]
			)
		);
		const initialized: Record<string, FieldStateData> = {};
		
		// If we have saved states, use them
		if (Object.keys(savedStates).length > 0) {
			return savedStates;
		}
		
		// Otherwise, calculate initial states from existing data
		// For new projects, all fields should be WHITE and unlocked
		// But if there's existing data, we need to determine states
		Object.keys(existingProject).forEach((key) => {
			if (key.startsWith("_")) return; // Skip metadata keys
			
			const value = (existingProject as any)[key];
			const hasValue = isValueProvided(value);
			const isLocked = existingLockedFields.has(key);
			
			// Get source from metadata
			const meta = existingMetadata[key];
			const sourceType = meta?.sources ? getSourceType(meta.sources) : null;
			
			initialized[key] = {
				state: calculateFieldState(value, isLocked, sourceType, hasValue),
				locked: isLocked,
				source: sourceType,
			};
		});
		
		return initialized;
	});
	
	const [showAutofillNotification, setShowAutofillNotification] =
		useState(false);
	const [formSaved, setFormSaved] = useState(false);
	const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
	const lastSavedSnapshotRef = useRef<string | null>(null);
	const [isDirty, setIsDirty] = useState(false);
	const { updateProject } = useProjects();

	const {
		isAutofilling,
		showSparkles,
		handleAutofill: startAutofill,
	} = useAutofill(existingProject.id, { context: "project" });

	useEffect(() => {
		const handleAutofillCompleted = async (event: Event) => {
			const customEvent = event as CustomEvent<{
				projectId: string;
				context: string;
			}>;
			// Only handle project context autofill for this project
			if (
				customEvent.detail?.context !== "project" ||
				customEvent.detail?.projectId !== existingProject.id
			) {
				return;
			}

			setShowAutofillNotification(true);
			setTimeout(() => setShowAutofillNotification(false), 5000);

			// Wait a bit for autofill data to be saved
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Fetch the latest project data with updated metadata
			try {
				const updatedProject = await getProjectWithResume(existingProject.id);
				
				// Process AI-filled fields and lock them
				const fieldsToLock: string[] = [];
				const updatedFieldStates: Record<string, FieldStateData> = {};
				const currentMetadata = updatedProject._metadata || {};
				const currentLockedFields = new Set(
					Object.keys(updatedProject._lockedFields || {}).filter(
						(k) => updatedProject._lockedFields?.[k]
					)
				);

				Object.keys(updatedProject).forEach((fieldId) => {
					if (fieldId.startsWith("_")) return;

					const value = (updatedProject as any)[fieldId];
					const hasValue = isValueProvided(value);
					const meta = currentMetadata[fieldId];
					const isLocked = currentLockedFields.has(fieldId);

					if (meta?.sources && meta.sources.length > 0) {
						const sourceType = getSourceType(meta.sources);
						const isAIFilled = sourceType === "ai" || isAISource(meta.sources);

						if (isAIFilled && hasValue && !isLocked) {
							// AI filled this field -> GREEN + locked
							updatedFieldStates[fieldId] = {
								state: "GREEN",
								locked: true,
								source: "ai",
							};
							fieldsToLock.push(fieldId);
						} else if (isAIFilled && hasValue) {
							// Already locked AI-filled field
							updatedFieldStates[fieldId] = {
								state: "GREEN",
								locked: true,
								source: "ai",
							};
						} else if (hasValue) {
							// Field has value but not from AI
							updatedFieldStates[fieldId] = {
								state: isLocked ? "GREEN" : "BLUE",
								locked: isLocked,
								source: sourceType || "user_input",
							};
						} else {
							// Empty field
							updatedFieldStates[fieldId] = {
								state: "WHITE",
								locked: false,
								source: null,
							};
						}
					} else if (hasValue) {
						// Field has value but no source info
						updatedFieldStates[fieldId] = {
							state: isLocked ? "GREEN" : "BLUE",
							locked: isLocked,
							source: "user_input",
						};
					}
				});

				// Update field states
				if (Object.keys(updatedFieldStates).length > 0) {
					setFieldStates((prev) => ({ ...prev, ...updatedFieldStates }));
				}

				// Update locked fields set and save
				if (fieldsToLock.length > 0) {
					const newLockedFields = new Set([...currentLockedFields, ...fieldsToLock]);
					setLockedFields(newLockedFields);

					// Save locked fields to database
					const lockedFieldsObj: Record<string, boolean> = {};
					newLockedFields.forEach((id) => {
						lockedFieldsObj[id] = true;
					});

					const dataToSave: ProjectProfile = {
						...updatedProject,
						_lockedFields: lockedFieldsObj,
						_fieldStates: { ...updatedProject._fieldStates, ...updatedFieldStates },
					};

					await updateProject(existingProject.id, dataToSave);
				}
			} catch (err) {
				console.error("[EnhancedProjectForm] Failed to process autofill completion:", err);
			}
		};

		if (typeof window !== "undefined") {
			window.addEventListener(
				"autofill-completed",
				handleAutofillCompleted as EventListener
			);
		}
		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener(
					"autofill-completed",
					handleAutofillCompleted as EventListener
				);
			}
		};
	}, [existingProject.id]);

	// Helper function to update metadata when user inputs data
	const handleInputChange = useCallback(
		(fieldId: string, value: any) => {
			const hasValue = isValueProvided(value);
			const currentState = getFieldStateData(fieldId, fieldStates);
			
			// Update form data
			setFormData((prev) => {
				const next = { ...prev, [fieldId]: value };
				onFormDataChange?.(next);
				setIsDirty(true);
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
		[onFormDataChange, fieldStates]
	);

	const isFieldLocked = useCallback(
		(fieldId: string, sectionId?: string) => {
			// Explicitly unlocked fields override section locks
			if (unlockedFields.has(fieldId)) return false;
			// Explicitly locked fields
			if (lockedFields.has(fieldId)) return true;
			// Section-level locks
			if (sectionId && lockedSections.has(sectionId)) return true;
			return false;
		},
		[lockedFields, lockedSections, unlockedFields]
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

	const toggleSectionLock = useCallback((sectionId: string) => {
		setLockedSections((prev) => {
			const next = new Set(prev);
			if (next.has(sectionId)) next.delete(sectionId);
			else next.add(sectionId);
			return next;
		});
		// Clear field-level overrides for this section when toggling section lock
		// This is a simplification; robust impl would iterate fields in section
	}, []);

	// Styling Logic:
	// White: Empty
	// Blue: Filled + Unlocked (User Input)
	// Green: Filled + Locked (AI or User Locked)
	const getFieldStylingClasses = useCallback(
		(fieldId: string, sectionId?: string) => {
			const value = (formData as any)[fieldId];
			const hasValue = isProjectValueProvided(value);
			const locked = isFieldLocked(fieldId, sectionId);

			const baseClasses =
				"w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm transition-colors duration-200";

			if (!hasValue) {
				// White - Empty
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
		[formData, isFieldLocked]
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
		setFormData(existingProject);
		const metadata = existingProject._metadata || {};
		setFieldMetadata(metadata);

		// Update locks based on source
		// If a field has a value AND source is not user_input -> Lock it (Green)
		const newLockedFields = new Set(
			Object.keys(existingProject._lockedFields || {}).filter(
				(k) => existingProject._lockedFields?.[k]
			)
		);

		Object.entries(metadata).forEach(([fieldId, meta]) => {
			// Check if source is AI/Document
			const isAiSourced =
				meta.sources &&
				meta.sources.some((src: any) => {
					if (typeof src === "string")
						return (
							src.toLowerCase() !== "user_input" &&
							src.toLowerCase() !== "user input"
						);
					return src.type !== "user_input";
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
		// Only auto-save when the user has edited a field
		if (!isDirty) {
			if (debounceTimeout.current) {
				clearTimeout(debounceTimeout.current);
			}
			return;
		}

		if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
		debounceTimeout.current = setTimeout(async () => {
			// Only auto-save if the current snapshot of formData differs from the last saved one
			const snapshotKey = JSON.stringify(formData);
			if (snapshotKey === lastSavedSnapshotRef.current) {
				setIsDirty(false);
				return;
			}
			try {
				const lockedFieldsObj: Record<string, boolean> = {};
				lockedFields.forEach((id) => {
					lockedFieldsObj[id] = true;
				});
				const lockedSectionsObj: Record<string, boolean> = {};
				lockedSections.forEach((id) => {
					lockedSectionsObj[id] = true;
				});
				const dataToSave: ProjectProfile = {
					...formData,
					_metadata: fieldMetadata,
					_lockedFields: lockedFieldsObj,
					_lockedSections: lockedSectionsObj,
					_fieldStates: fieldStates,
				};
				await updateProject(formData.id, dataToSave);
				lastSavedSnapshotRef.current = snapshotKey;
				setFormSaved(true);
				setIsDirty(false);
			} catch (err) {
				console.error("[EnhancedProjectForm] Auto-save failed:", err);
			} finally {
				setTimeout(() => setFormSaved(false), 1500);
			}
		}, 2000);
		return () => {
			if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
		};
	}, [formData, fieldMetadata, lockedFields, lockedSections, fieldStates, updateProject, isDirty]);

	type ControlKind =
		| "input"
		| "number"
		| "textarea"
		| "select"
		| "button-select";

	const sectionIconComponents: Record<
		string,
		React.ComponentType<{ className?: string }>
	> = {
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
	};

	const fieldControlOverrides: Record<string, ControlKind> = {
		assetType: "button-select",
		projectPhase: "button-select",
		loanType: "button-select",
		interestRateType: "button-select",
		recoursePreference: "button-select",
		exitStrategy: "button-select",
	};

	const fieldOptionsRegistry: Record<string, any[]> = {
		assetType: assetTypeOptions,
		projectPhase: projectPhaseOptions,
		loanType: capitalTypeOptions,
		interestRateType: interestRateTypeOptions,
		recoursePreference: recourseOptions,
		exitStrategy: exitStrategyOptions,
	};

	const getDefaultControlForDataType = (dataType?: string): ControlKind => {
		if (!dataType) return "input";
		switch (dataType.toLowerCase()) {
			case "textarea":
				return "textarea";
			case "dropdown":
				return "select";
			case "currency":
			case "integer":
			case "numeric":
				return "number";
			case "date":
				return "input";
			default:
				return "input";
		}
	};

	const renderDynamicField = useCallback(
		(fieldId: string, sectionId: string) => {
			const fieldConfig =
				(formSchema as any).fields?.[fieldId] ?? ({} as any);
			const label: string = fieldConfig.label ?? fieldId;
			const metadata = projectResumeFieldMetadata[fieldId];
			const dataType = metadata?.dataType;
			const required = PROJECT_REQUIRED_FIELDS.includes(fieldId);
			// Field is disabled only if UI logic requires it, but here we want users to be able to unlock and edit.
			// So we generally don't disable the input unless specific logic applies.
			// However, locked fields (Green) should probably be editable ONLY after unlocking.
			const isLocked = isFieldLocked(fieldId, sectionId);
			// We allow editing if unlocked. If locked, user must click unlock icon first.
			// So 'disabled' = isLocked.
			const disabled = isLocked;

			const value = (formData as any)[fieldId] ?? "";

			const controlKind: ControlKind =
				fieldControlOverrides[fieldId] ??
				getDefaultControlForDataType(dataType);

			const commonClassName = getFieldStylingClasses(fieldId, sectionId);

			const renderControl = () => {
				if (controlKind === "textarea") {
					return (
						<textarea
							id={fieldId}
							value={value ?? ""}
							onChange={(e) =>
								handleInputChange(fieldId, e.target.value)
							}
							disabled={disabled}
							className={cn(commonClassName, "h-24")}
							data-field-id={fieldId}
							data-field-type="textarea"
							data-field-section={sectionId}
						/>
					);
				}

				if (controlKind === "button-select") {
					const options = fieldOptionsRegistry[fieldId] ?? [];
					return (
						<div
							data-field-id={fieldId}
							data-field-type="button-select"
							data-field-section={sectionId}
							className="relative group/field"
						>
							<ButtonSelect
								label=""
								options={options}
								selectedValue={value || ""}
								onSelect={(selected) =>
									handleInputChange(fieldId, selected)
								}
								disabled={disabled}
								// Use lock status to color the selection container
								isLocked={isLocked}
							/>
						</div>
					);
				}

				if (controlKind === "select") {
					const stateOptions =
						fieldId === "propertyAddressState"
							? [
									"AL",
									"AK",
									"AZ",
									"AR",
									"CA",
									"CO",
									"CT",
									"DE",
									"FL",
									"GA",
									"HI",
									"ID",
									"IL",
									"IN",
									"IA",
									"KS",
									"KY",
									"LA",
									"ME",
									"MD",
									"MA",
									"MI",
									"MN",
									"MS",
									"MO",
									"MT",
									"NE",
									"NV",
									"NH",
									"NJ",
									"NM",
									"NY",
									"NC",
									"ND",
									"OH",
									"OK",
									"OR",
									"PA",
									"RI",
									"SC",
									"SD",
									"TN",
									"TX",
									"UT",
									"VT",
									"VA",
									"WA",
									"WV",
									"WI",
									"WY",
							  ]
							: fieldOptionsRegistry[fieldId] ?? [];
					const options = stateOptions.map((s) => ({
						label: s,
						value: s,
					}));
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
		]
	);

	const steps: Step[] = useMemo(
		() =>
			(formSchema as any).steps.map(
				(step: {
					id: string;
					title: string;
					icon?: string;
					fields: string[];
				}) => {
					const sectionId = step.id;
					const IconComponent =
						(step.icon &&
							sectionIconComponents[step.icon as string]) ||
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
									<button
										type="button"
										onClick={() =>
											toggleSectionLock(sectionId)
										}
										className={cn(
											"flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
											lockedSections.has(sectionId)
												? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
												: "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
										)}
										title={
											lockedSections.has(sectionId)
												? "Unlock section"
												: "Lock section"
										}
									>
										{lockedSections.has(sectionId) ? (
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
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									{step.fields.map((fieldId: string) =>
										renderDynamicField(fieldId, sectionId)
									)}
								</div>
							</div>
						),
					};
				}
			),
		[lockedSections, renderDynamicField, toggleSectionLock]
	);

	const handleFormSubmit = useCallback(
		async (finalData?: ProjectProfile) => {
			const lockedFieldsObj: Record<string, boolean> = {};
			lockedFields.forEach((id) => {
				lockedFieldsObj[id] = true;
			});
			const lockedSectionsObj: Record<string, boolean> = {};
			lockedSections.forEach((id) => {
				lockedSectionsObj[id] = true;
			});

			const dataToSave: ProjectProfile = {
				...(finalData || formData),
				_metadata: fieldMetadata,
				_lockedFields: lockedFieldsObj,
				_lockedSections: lockedSectionsObj,
				_fieldStates: fieldStates,
			};
			await updateProject(formData.id, dataToSave);
			// Update last saved snapshot to prevent immediate auto-save loop
			lastSavedSnapshotRef.current = JSON.stringify({
				formData: dataToSave,
				fieldMetadata,
				lockedFields: Array.from(lockedFields),
				lockedSections: Array.from(lockedSections),
			});
			onComplete?.(dataToSave);
			onVersionChange?.();
		},
		[
			formData,
			fieldMetadata,
			lockedFields,
			lockedSections,
			fieldStates,
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
		<div className={cn("border rounded-lg bg-white", compact && "p-4")}>
			<div className="flex items-center justify-between px-4 py-3 border-b">
				<div className="flex items-center gap-2">
					<FileText className="h-5 w-5 text-blue-600" />
					<div>
						<p className="text-sm font-medium text-gray-900">
							Project Resume
						</p>
						<p className="text-xs text-gray-500">
							Fill out the key details for your project. Fields
							can be autofilled from documents and locked to
							prevent overwrites.
						</p>
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
