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
	const [lockedFields, setLockedFields] = useState<Set<string>>(
		new Set(
			Object.keys(existingProject._lockedFields || {}).filter(
				(k) => existingProject._lockedFields?.[k]
			)
		)
	);
	const [lockedSections, setLockedSections] = useState<Set<string>>(
		new Set(
			Object.keys(existingProject._lockedSections || {}).filter(
				(k) => existingProject._lockedSections?.[k]
			)
		)
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

	const handleInputChange = useCallback(
		(fieldId: string, value: any) => {
			setFormData((prev) => {
				const next = { ...prev, [fieldId]: value };
				onFormDataChange?.(next);
				return next;
			});
		},
		[onFormDataChange]
	);

	const isFieldDisabled = useCallback(
		(fieldId: string, sectionId?: string) => {
			if (lockedFields.has(fieldId)) return true;
			if (sectionId && lockedSections.has(sectionId)) return true;
			return false;
		},
		[lockedFields, lockedSections]
	);

	const toggleFieldLock = useCallback((fieldId: string) => {
		setLockedFields((prev) => {
			const next = new Set(prev);
			if (next.has(fieldId)) next.delete(fieldId);
			else next.add(fieldId);
			return next;
		});
	}, []);

	const toggleSectionLock = useCallback((sectionId: string) => {
		setLockedSections((prev) => {
			const next = new Set(prev);
			if (next.has(sectionId)) next.delete(sectionId);
			else next.add(sectionId);
			return next;
		});
	}, []);

	const getFieldStylingClasses = useCallback(
		(fieldId: string) => {
			const value = (formData as any)[fieldId];
			const provided = isProjectValueProvided(value);
			return cn(
				"w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 text-sm",
				provided
					? "border-emerald-300 bg-emerald-50 focus:ring-emerald-200"
					: "border-gray-200 bg-white focus:ring-blue-200"
			);
		},
		[formData]
	);

	const isFieldAutofilled = useCallback(
		(fieldId: string) => {
			const meta = fieldMetadata[fieldId];
			return !!meta?.sources && meta.sources.length > 0;
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
			const locked = isFieldDisabled(fieldId, sectionId);
			return (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						toggleFieldLock(fieldId);
					}}
					className={cn(
						"flex items-center justify-center p-1 rounded transition-colors",
						locked
							? "text-amber-600 hover:text-amber-700"
							: "text-gray-500 hover:text-gray-600"
					)}
					title={locked ? "Unlock field" : "Lock field"}
				>
					{locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
				</button>
			);
		},
		[isFieldDisabled, toggleFieldLock]
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
					<label className="flex text-sm font-medium text-gray-700 items-center gap-2 relative group/field">
						<span>
							{labelText}
							{required && <span className="text-red-500 ml-1">*</span>}
						</span>
						<FieldHelpTooltip fieldId={fieldId} />
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
								className="px-2 py-1 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-md text-xs font-medium text-blue-700 opacity-0 group-hover/field:opacity-100 transition-opacity"
							>
								Ask AI
							</button>
							{renderFieldLockButton(fieldId, sectionId)}
						</div>
					</label>
				</div>
			);
		},
		[onAskAI, getFieldWarning, renderFieldLockButton]
	);

	useEffect(() => {
		setFormData(existingProject);
		setFieldMetadata(existingProject._metadata || {});
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

	useEffect(() => {
		if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
		debounceTimeout.current = setTimeout(async () => {
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
	}, [formData, fieldMetadata, lockedFields, lockedSections, updateProject]);

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
			const disabled = isFieldDisabled(fieldId, sectionId);
			const value = (formData as any)[fieldId] ?? "";

			const controlKind: ControlKind =
				fieldControlOverrides[fieldId] ??
				getDefaultControlForDataType(dataType);

			const commonClassName = cn(
				getFieldStylingClasses(fieldId),
				disabled && "bg-emerald-50 border-emerald-200 cursor-not-allowed"
			);

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
							className={cn(
								commonClassName,
								"w-full h-24 px-4 py-2 rounded-md focus:outline-none focus:ring-2"
							)}
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
								isAutofilled={isFieldAutofilled(fieldId)}
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
					["Currency", "Integer", "Numeric"].includes(
						dataType ?? ""
					)
						? "number"
						: dataType?.toLowerCase() === "date"
						? "date"
						: "text";

				const handleChange = (
					e: React.ChangeEvent<HTMLInputElement>
				) => {
					if (inputType === "number") {
						const raw = e.target.value;
						handleInputChange(
							fieldId,
							raw ? Number(raw) : null
						);
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
			isFieldDisabled,
			getFieldStylingClasses,
			isFieldAutofilled,
			handleInputChange,
			onAskAI,
			renderFieldLabel,
		]
	);

	const steps: Step[] = useMemo(
		() =>
			(formSchema as any).steps.map(
				(
					step: {
						id: string;
						title: string;
						icon?: string;
						fields: string[];
					}
				) => {
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
												? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
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
												<span>Unlock</span>
											</>
										) : (
											<>
												<Unlock className="h-4 w-4" />
												<span>Lock</span>
											</>
										)}
									</button>
								</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									{step.fields.map((fieldId: string) =>
										renderDynamicField(
											fieldId,
											sectionId
										)
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
			};
			await updateProject(formData.id, dataToSave);
			onComplete?.(dataToSave);
			onVersionChange?.();
		},
		[
			formData,
			fieldMetadata,
			lockedFields,
			lockedSections,
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
							Autofill complete. Lock fields you’ve manually
							edited to prevent future overwrites.
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


