// src/components/forms/EnhancedProjectForm.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FormWizard, Step } from "../ui/FormWizard";
// Removed Card wrappers to match Borrower styling (single container only)
import { FormGroup } from "../ui/Form";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select"; // Keep Select for States
import { Button } from "../ui/Button";
import { ButtonSelect } from "../ui/ButtonSelect"; // Import ButtonSelect
import { useProjects } from "../../hooks/useProjects";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";

import { FormProvider } from "../../contexts/FormContext";
import { AskAIButton } from "../ui/AskAIProvider";
import { FieldHelpTooltip } from "../ui/FieldHelpTooltip";

import {
  FileText,
  MapPin,
  Building,
  DollarSign,
  CheckCircle,
  FileQuestion,
  BarChart,
  Info,
  Globe,
  Calendar,
  Map,
  Users,
  Calculator,
  TrendingUp,
  Sparkles,
  Loader2,
  Lock,
  Unlock,
  AlertTriangle,
} from "lucide-react";
import {
  ProjectProfile,
  ProjectPhase,
  InterestRateType,
  RecoursePreference,
  ExitStrategy,
} from "../../types/enhanced-types";
import {
  PROJECT_REQUIRED_FIELDS,
} from "@/utils/resumeCompletion";

interface EnhancedProjectFormProps {
  existingProject: ProjectProfile;
  onComplete?: (project: ProjectProfile) => void;
  compact?: boolean; // Add compact prop
  onAskAI?: (fieldId: string) => void; // Add onAskAI prop
  onFormDataChange?: (formData: ProjectProfile) => void; // Add onFormDataChange prop
  initialFocusFieldId?: string; // NEW: scroll/focus this field on mount/update
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

// FieldWarning component for displaying warnings next to field labels
interface FieldWarningProps {
  message: string;
  className?: string;
}

const FieldWarning: React.FC<FieldWarningProps> = ({ message, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) {
          const scrollY = window.scrollY;
          const scrollX = window.scrollX;
          
          setPosition({
            top: rect.top + scrollY - 8,
            left: rect.left + scrollX + rect.width / 2,
          });
        }
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  return (
    <>
      <div
        ref={triggerRef}
        className={cn("relative inline-flex items-center", className)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <AlertTriangle
          size={16}
          className="text-amber-600 hover:text-amber-700 transition-colors cursor-help"
        />
      </div>
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                transform: 'translate(-50%, -100%)',
                zIndex: 9999,
                width: '16rem', // w-64
                marginBottom: '0.5rem',
              }}
              className="bg-white rounded-lg shadow-xl border border-amber-200 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => setIsOpen(true)}
              onMouseLeave={() => setIsOpen(false)}
            >
              <div className="p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-800 leading-relaxed">{message}</p>
                </div>
              </div>
              {/* Arrow pointer */}
              <div className="absolute top-full -mt-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-amber-200 transform rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

const stateOptions = [
  // Keep states for Select component
  { value: "", label: "Select a state..." },
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

export const EnhancedProjectForm: React.FC<EnhancedProjectFormProps> = ({
  existingProject,
  onComplete,
  onAskAI,
  onFormDataChange,
  initialFocusFieldId, // NEW
}) => {
  const router = useRouter();
  const { updateProject } = useProjects();

  // Form state initialized from existingProject prop
  const [formData, setFormData] = useState<ProjectProfile>(() => ({
    ...existingProject,
  }));
  const [formSaved, setFormSaved] = useState(false); // State for save button feedback
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Lock state management
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());
  const [lockedSections, setLockedSections] = useState<Set<string>>(new Set());
  const [unlockedFields, setUnlockedFields] = useState<Set<string>>(new Set()); // Fields explicitly unlocked even when section is locked

  // Helper function to check if a field is locked
  const isFieldLocked = useCallback((fieldId: string, sectionId?: string): boolean => {
    // If explicitly unlocked (overrides section lock), return false
    if (unlockedFields.has(fieldId)) return false;
    
    // If explicitly locked, return true
    if (lockedFields.has(fieldId)) return true;
    
    // If section is locked and field is not explicitly unlocked, return true
    if (sectionId && lockedSections.has(sectionId)) return true;
    
    return false;
  }, [lockedFields, lockedSections, unlockedFields]);

  // Helper function to check if a field has a warning
  const getFieldWarning = useCallback((fieldId: string): string | null => {
    // Mock warning for ZIP code - hardcoded for representation purposes
    if (fieldId === "propertyAddressZip") {
      return "ZIP code is invalid";
    }
    
    // Mock warning for Asset type - value mismatch with documents
    if (fieldId === "assetType") {
      // Mock: assume "Office" was extracted from documents but user changed it
      const mockExtractedValue = "Office";
      if (formData.assetType && formData.assetType !== mockExtractedValue && formData.assetType !== "") {
        return "This value has been edited and does not match the value extracted from your uploaded documents. If you wish to retain this value, lock the field.";
      }
    }
    
    return null;
  }, [formData]);

  // Toggle lock for a single field
  const toggleFieldLock = useCallback((fieldId: string, sectionId?: string) => {
    // Check current effective lock state
    const currentlyLocked = (() => {
      if (unlockedFields.has(fieldId)) return false;
      if (lockedFields.has(fieldId)) return true;
      if (sectionId && lockedSections.has(sectionId)) return true;
      return false;
    })();

    if (currentlyLocked) {
      // Unlocking the field
      // If section is locked, add to unlockedFields (override section lock)
      if (sectionId && lockedSections.has(sectionId)) {
        setUnlockedFields((prev) => {
          const next = new Set(prev);
          next.add(fieldId);
          return next;
        });
      } else {
        // Field was explicitly locked, remove from lockedFields
        setLockedFields((prev) => {
          const next = new Set(prev);
          next.delete(fieldId);
          return next;
        });
        // Also remove from unlockedFields if it was there
        setUnlockedFields((prev) => {
          const next = new Set(prev);
          next.delete(fieldId);
          return next;
        });
      }
    } else {
      // Locking the field
      // Remove from unlockedFields if it was there
      setUnlockedFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldId);
        return next;
      });
      // Add to lockedFields
      setLockedFields((prev) => {
        const next = new Set(prev);
        next.add(fieldId);
        return next;
      });
    }
  }, [lockedSections, unlockedFields, lockedFields]);

  // Get all field IDs in a section (needed for section lock visual feedback)
  const getSectionFieldIds = useCallback((sectionId: string): string[] => {
    // Map of section IDs to their field IDs based on data-field-section attributes
    const sectionFieldMap: Record<string, string[]> = {
      "basic-info": [
        "projectName",
        "propertyAddressStreet",
        "propertyAddressCity",
        "propertyAddressState",
        "propertyAddressZip",
        "propertyAddressCounty",
        "assetType",
        "projectPhase",
        "projectDescription",
      ],
      "loan-info": [
        "loanAmountRequested",
        "loanType",
        "targetLtvPercent",
        "targetLtcPercent",
        "amortizationYears",
        "interestOnlyPeriodMonths",
        "interestRateType",
        "targetCloseDate",
        "recoursePreference",
        "useOfProceeds",
      ],
      "financials": [
        "purchasePrice",
        "totalProjectCost",
        "capexBudget",
        "equityCommittedPercent",
        "propertyNoiT12",
        "stabilizedNoiProjected",
        "exitStrategy",
        "businessPlanSummary",
        "marketOverviewSummary",
      ],
      "property-specs": [
        "totalResidentialUnits",
        "totalResidentialNRSF",
        "totalCommercialGRSF",
        "grossBuildingArea",
        "numberOfStories",
        "parkingSpaces",
      ],
      "dev-budget": [
        "landAcquisition",
        "baseConstruction",
        "contingency",
        "ffe",
        "aeFees",
        "developerFee",
        "interestReserve",
        "workingCapital",
      ],
      "market-context": [
        "submarketName",
        "walkabilityScore",
        "population3Mi",
        "medianHHIncome",
        "renterOccupiedPercent",
        "popGrowth201020",
      ],
      "special-considerations": [
        "opportunityZone",
        "affordableHousing",
        "affordableUnitsNumber",
        "amiTargetPercent",
        "taxExemption",
        "taxAbatement",
      ],
      "timeline": [
        "groundbreakingDate",
        "completionDate",
        "firstOccupancy",
        "stabilization",
        "entitlements",
        "permitsIssued",
      ],
      "site-context": [
        "totalSiteAcreage",
        "currentSiteStatus",
        "siteAccess",
        "proximityShopping",
      ],
      "sponsor-info": [
        "sponsorEntityName",
        "sponsorStructure",
        "equityPartner",
        "contactInfo",
      ],
    };
    return sectionFieldMap[sectionId] || [];
  }, []);

  // Toggle lock for an entire section
  const toggleSectionLock = useCallback((sectionId: string) => {
    setLockedSections((prev) => {
      const next = new Set(prev);
      const wasLocked = next.has(sectionId);
      if (wasLocked) {
        // Unlocking section - remove it from locked sections
        next.delete(sectionId);
        // Also clear any unlocked fields for this section since they're no longer needed
        setUnlockedFields((prevUnlocked) => {
          const sectionFields = getSectionFieldIds(sectionId);
          const nextUnlocked = new Set(prevUnlocked);
          sectionFields.forEach((fieldId) => {
            nextUnlocked.delete(fieldId);
          });
          return nextUnlocked;
        });
      } else {
        // Locking section - add it to locked sections
        next.add(sectionId);
      }
      return next;
    });
  }, [getSectionFieldIds]);

  // Helper function to render field lock button - always visible, positioned next to Ask AI button
  const renderFieldLockButton = useCallback((fieldId: string, sectionId: string) => {
    const locked = isFieldLocked(fieldId, sectionId);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          toggleFieldLock(fieldId, sectionId);
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        className={cn(
          "flex items-center justify-center p-1 rounded transition-colors relative z-30 cursor-pointer",
          locked
            ? "text-amber-600 hover:text-amber-700"
            : "text-gray-500 hover:text-gray-600"
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
  }, [isFieldLocked, toggleFieldLock]);

  // Helper function to render field label with Ask AI and Lock buttons
  const renderFieldLabel = useCallback((
    fieldId: string,
    sectionId: string,
    labelText: string,
    required: boolean = false,
    showWarning: boolean = false
  ) => {
    const warning = showWarning ? getFieldWarning(fieldId) : null;
    return (
      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2 relative group/field">
        <span>
          {labelText}
          {required && <span className="text-red-500 ml-1">*</span>}
        </span>
        <FieldHelpTooltip fieldId={fieldId} />
        {warning && <FieldWarning message={warning} />}
        {/* Ask AI and Lock buttons together - Ask AI on left, Lock on right */}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => (onAskAI || (() => {}))(fieldId)}
            className="px-2 py-1 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-md text-xs font-medium text-blue-700 opacity-0 group-hover/field:opacity-100 transition-opacity cursor-pointer relative z-10"
            title="Ask AI for help with this field"
          >
            Ask AI
          </button>
          {renderFieldLockButton(fieldId, sectionId)}
        </div>
      </label>
    );
  }, [onAskAI, renderFieldLockButton, getFieldWarning]);

  // Update local form state if the existingProject prop changes externally
  useEffect(() => {
    setFormData(existingProject);
    // Defer parent notification to avoid updating during render
    setTimeout(() => {
      onFormDataChange?.(existingProject);
    }, 0);
  }, [existingProject, onFormDataChange]);

  // NEW: Focus/scroll to a specific field if requested
  useEffect(() => {
    if (!initialFocusFieldId) return;
    const selector = `[data-field-id="${initialFocusFieldId}"] , #${initialFocusFieldId}`;
    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = (element.matches("input,select,textarea,button")
        ? element
        : element.querySelector("input,select,textarea")) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
      requestAnimationFrame(() => {
        (focusable || element).focus?.();
      });
    }
  }, [initialFocusFieldId]);

  // Debounced auto-save effect
  useEffect(() => {
    // This effect handles auto-saving. It runs whenever formData changes.
    // To prevent saving on every keystroke, it uses a debounce mechanism.

    // 1. Clear any existing timer. This is crucial. If the user types again
    //    within the timeout period, the previous save is cancelled.
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // 2. Set a new timer to trigger the save after a delay (e.g., 2 seconds).
    debounceTimeout.current = setTimeout(async () => {
      // 3. Before saving, check if there are actual changes compared to the initial prop.
      //    This prevents saving if the component re-renders without data changes.
      if (JSON.stringify(formData) !== JSON.stringify(existingProject)) {
        try {
          console.log(
            `[ProjectForm] Auto-saving project: ${formData.projectName}`
          );
          // 4. Call the updateProject action from the store with the latest form data.
          await updateProject(formData.id, formData);
        } catch (error) {
          console.error("[ProjectForm] Auto-save failed:", error);
        }
      }
    }, 2000); // 2-second debounce delay

    // 5. Cleanup: When the component unmounts or dependencies change,
    //    clear the timeout to prevent memory leaks or unwanted saves.
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [formData, existingProject, updateProject]);

  // Handle form field changes
  const handleInputChange = useCallback(
    (field: keyof ProjectProfile, value: string | number | boolean | null) => {
      setFormData((prev) => {
        const nextFormData = {
          ...prev,
          [field]: value,
        };
        // Defer parent notification to avoid updating during render
        setTimeout(() => {
          onFormDataChange?.(nextFormData);
        }, 0);
        return nextFormData;
      });
    },
    [onFormDataChange]
  );

  // Handle form submission (manual save via button)
  const handleFormSubmit = useCallback(async () => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    try {
      setFormSaved(true); // Indicate loading/saving
      await updateProject(formData.id, formData);
      console.log("Project changes manually saved.");
      if (onComplete) {
        // Pass the current formData state which reflects the latest changes
        onComplete(formData);
      }
    } catch (error) {
      console.error("Error saving project:", error);
      console.error("Failed to save project.");
    } finally {
      // Reset saved indicator after a short delay
      setTimeout(() => setFormSaved(false), 2000);
    }
  }, [formData, updateProject, onComplete]);

  // Handle autofill button click
  const handleAutofill = useCallback(async () => {
    // Trigger sparkle animation
    setShowSparkles(true);
    setIsAutofilling(true);
    
    // Simulate processing time (2-3 seconds)
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    // Hide sparkles after animation
    setTimeout(() => setShowSparkles(false), 500);
    setIsAutofilling(false);
    
    // TODO: Implement actual autofill logic when backend is ready
    console.log('Autofill Resume clicked - will extract data from documents');
  }, []);

  // --- Define Steps for FormWizard ---
  const steps: Step[] = useMemo(
    () => [
      // --- Step 1: Basic Information ---
      {
        id: "basic-info",
        title: "Basic Info",
        component: (
          <>
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" /> Project Information
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("basic-info")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("basic-info")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("basic-info") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("basic-info") ? (
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
              <FormGroup>
                <AskAIButton id="projectName" onAskAI={onAskAI || (() => {})}>
                  <div className="relative group/field">
                    {renderFieldLabel("projectName", "basic-info", "Project Name", true)}
                    <Input
                      id="projectName"
                      label={null}
                      value={formData.projectName || ""}
                      onChange={(e) =>
                        handleInputChange("projectName", e.target.value)
                      }
                      placeholder="e.g., Riverfront Acquisition"
                      required
                      disabled={isFieldLocked("projectName", "basic-info")}
                      className={cn(
                        isFieldLocked("projectName", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                      )}
                      data-field-id="projectName"
                      data-field-type="input"
                      data-field-section="basic-info"
                      data-field-required="true"
                      data-field-label="Project Name"
                      data-field-placeholder="e.g., Riverfront Acquisition"
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              {/* Property Address Section */}
              <div className="pt-4">
                <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-600" /> Property
                  Address
                </h3>
                <FormGroup>
                  <AskAIButton
                    id="propertyAddressStreet"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("propertyAddressStreet", "basic-info", "Street Address", true)}
                      <Input
                        id="propertyAddressStreet"
                        label={null}
                        value={formData.propertyAddressStreet || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "propertyAddressStreet",
                            e.target.value
                          )
                        }
                        placeholder="123 Main Street"
                        required
                        disabled={isFieldLocked("propertyAddressStreet", "basic-info")}
                        className={cn(
                          isFieldLocked("propertyAddressStreet", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="propertyAddressStreet"
                        data-field-type="input"
                        data-field-section="basic-info"
                        data-field-required="true"
                        data-field-label="Street Address"
                        data-field-placeholder="123 Main Street"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <FormGroup>
                    <AskAIButton
                      id="propertyAddressCity"
                      onAskAI={onAskAI || (() => {})}
                    >
                      <div className="relative group/field">
                        {renderFieldLabel("propertyAddressCity", "basic-info", "City", true)}
                        <Input
                          id="propertyAddressCity"
                          label={null}
                          value={formData.propertyAddressCity || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "propertyAddressCity",
                              e.target.value
                            )
                          }
                          placeholder="Anytown"
                          required
                          disabled={isFieldLocked("propertyAddressCity", "basic-info")}
                          className={cn(
                            isFieldLocked("propertyAddressCity", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                          )}
                          data-field-id="propertyAddressCity"
                          data-field-type="input"
                          data-field-section="basic-info"
                          data-field-required="true"
                          data-field-label="City"
                          data-field-placeholder="Anytown"
                        />
                      </div>
                    </AskAIButton>
                  </FormGroup>
                  {/* State uses Select */}
                  <FormGroup>
                    <AskAIButton
                      id="propertyAddressState"
                      onAskAI={onAskAI || (() => {})}
                    >
                      <div className="relative group/field">
                        {renderFieldLabel("propertyAddressState", "basic-info", "State", true)}
                        <Select
                          id="propertyAddressState"
                          value={formData.propertyAddressState || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "propertyAddressState",
                              e.target.value
                            )
                          }
                          options={stateOptions}
                          required
                          disabled={isFieldLocked("propertyAddressState", "basic-info")}
                          className={cn(
                            isFieldLocked("propertyAddressState", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                          )}
                          data-field-id="propertyAddressState"
                          data-field-type="select"
                          data-field-section="basic-info"
                          data-field-required="true"
                          data-field-label="State"
                          data-field-options={JSON.stringify(stateOptions)}
                        />
                      </div>
                    </AskAIButton>
                  </FormGroup>
                  <FormGroup>
                    <AskAIButton
                      id="propertyAddressZip"
                      onAskAI={onAskAI || (() => {})}
                    >
                      <div className="relative group/field">
                        {renderFieldLabel("propertyAddressZip", "basic-info", "ZIP Code", true, true)}
                        <Input
                          id="propertyAddressZip"
                          label={null}
                          value={formData.propertyAddressZip || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "propertyAddressZip",
                              e.target.value
                            )
                          }
                          placeholder="12345"
                          required
                          disabled={isFieldLocked("propertyAddressZip", "basic-info")}
                          className={cn(
                            isFieldLocked("propertyAddressZip", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                          )}
                          data-field-id="propertyAddressZip"
                          data-field-type="input"
                          data-field-section="basic-info"
                          data-field-required="true"
                          data-field-label="ZIP Code"
                          data-field-placeholder="12345"
                        />
                      </div>
                    </AskAIButton>
                  </FormGroup>
                </div>
                <FormGroup className="mt-4">
                  <AskAIButton
                    id="propertyAddressCounty"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("propertyAddressCounty", "basic-info", "County", false)}
                      <Input
                        id="propertyAddressCounty"
                        label={null}
                        value={formData.propertyAddressCounty || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "propertyAddressCounty",
                            e.target.value
                          )
                        }
                        placeholder="e.g., Orange County"
                        disabled={isFieldLocked("propertyAddressCounty", "basic-info")}
                        className={cn(
                          isFieldLocked("propertyAddressCounty", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="propertyAddressCounty"
                        data-field-type="input"
                        data-field-section="basic-info"
                        data-field-required="false"
                        data-field-label="County"
                        data-field-placeholder="e.g., Orange County"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              {/* Property Info Section */}
              <div className="pt-4">
                <h3 className="text-md font-medium text-gray-800 mb-3 flex items-center">
                  <Building className="h-4 w-4 mr-2 text-blue-600" /> Property
                  Information
                </h3>
                {/* Asset Type uses ButtonSelect */}
                <FormGroup>
                  <AskAIButton id="assetType" onAskAI={onAskAI || (() => {})}>
                    <div
                      data-field-id="assetType"
                      data-field-type="button-select"
                      data-field-section="basic-info"
                      data-field-required="true"
                      data-field-label="Asset Type"
                      data-field-options={JSON.stringify(assetTypeOptions)}
                      className="relative group/field"
                    >
                      {renderFieldLabel("assetType", "basic-info", "Asset Type", true, true)}
                      <ButtonSelect
                        label=""
                        options={assetTypeOptions}
                        selectedValue={formData.assetType || ""}
                        onSelect={(value) =>
                          handleInputChange("assetType", value)
                        }
                        disabled={isFieldLocked("assetType", "basic-info")}
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                {/* Project Phase uses ButtonSelect */}
                <FormGroup className="mt-4">
                  <AskAIButton
                    id="projectPhase"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div
                      data-field-id="projectPhase"
                      data-field-type="button-select"
                      data-field-section="basic-info"
                      data-field-required="true"
                      data-field-label="Project Phase / Deal Type"
                      data-field-options={JSON.stringify(projectPhaseOptions)}
                      className="relative group/field"
                    >
                      {renderFieldLabel("projectPhase", "basic-info", "Project Phase / Deal Type", true)}
                      <ButtonSelect
                        label=""
                        options={projectPhaseOptions}
                        selectedValue={formData.projectPhase || ""}
                        onSelect={(value) =>
                          handleInputChange(
                            "projectPhase",
                            value as ProjectPhase
                          )
                        }
                        disabled={isFieldLocked("projectPhase", "basic-info")}
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                {/* Project Description uses Textarea */}
                <FormGroup className="mt-4">
                  <AskAIButton
                    id="projectDescription"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div
                      data-field-id="projectDescription"
                      data-field-type="textarea"
                      data-field-section="basic-info"
                      data-field-required="true"
                      data-field-label="Project Description"
                      data-field-placeholder="Brief description of the project..."
                      className="relative group/field"
                    >
                      {renderFieldLabel("projectDescription", "basic-info", "Project Description", true)}
                      <textarea
                        id="projectDescription"
                        value={formData.projectDescription || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "projectDescription",
                            e.target.value
                          )
                        }
                        placeholder="Brief description of the project..."
                        disabled={isFieldLocked("projectDescription", "basic-info")}
                        className={cn(
                          "w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
                          isFieldLocked("projectDescription", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        required
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
            </div>
          </>
        ),
      },
      // --- Step 2: Loan Information ---
      {
        id: "loan-info",
        title: "Loan Info",
        component: (
          <>
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-blue-600" /> Loan Request Details
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("loan-info")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("loan-info")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("loan-info") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("loan-info") ? (
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
                <FormGroup>
                  <AskAIButton
                    id="loanAmountRequested"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("loanAmountRequested", "loan-info", "Requested Loan Amount ($)", true)}
                      <Input
                        id="loanAmountRequested"
                        type="number"
                        label={null}
                        value={formData.loanAmountRequested?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "loanAmountRequested",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 10000000"
                        required
                        disabled={isFieldLocked("loanAmountRequested", "loan-info")}
                        className={cn(
                          isFieldLocked("loanAmountRequested", "loan-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="loanAmountRequested"
                        data-field-type="number"
                        data-field-section="loan-info"
                        data-field-required="true"
                        data-field-label="Requested Loan Amount ($)"
                        data-field-placeholder="e.g., 10000000"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                {/* Capital Type uses ButtonSelect */}
                <FormGroup>
                  <AskAIButton id="loanType" onAskAI={onAskAI || (() => {})}>
                    <div
                      data-field-id="loanType"
                      data-field-type="button-select"
                      data-field-section="loan-info"
                      data-field-required="true"
                      data-field-label="Capital Type"
                      data-field-options={JSON.stringify(capitalTypeOptions)}
                      className="relative group/field"
                    >
                      {renderFieldLabel("loanType", "loan-info", "Capital Type", true)}
                      <ButtonSelect
                        label=""
                        options={capitalTypeOptions}
                        selectedValue={formData.loanType || ""}
                        onSelect={(value) =>
                          handleInputChange("loanType", value)
                        }
                        disabled={isFieldLocked("loanType", "loan-info")}
                        gridCols="grid-cols-2 md:grid-cols-3"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton
                    id="targetLtvPercent"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("targetLtvPercent", "loan-info", "Target LTV (%)", true)}
                      <Input
                        id="targetLtvPercent"
                        type="number"
                        label={null}
                        value={formData.targetLtvPercent?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "targetLtvPercent",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 70"
                        required
                        disabled={isFieldLocked("targetLtvPercent", "loan-info")}
                        className={cn(
                          isFieldLocked("targetLtvPercent", "loan-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="targetLtvPercent"
                        data-field-type="number"
                        data-field-section="loan-info"
                        data-field-required="true"
                        data-field-label="Target LTV (%)"
                        data-field-placeholder="e.g., 70"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton
                    id="targetLtcPercent"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("targetLtcPercent", "loan-info", "Target LTC (%) (Construction/Dev)", false)}
                      <Input
                        id="targetLtcPercent"
                        type="number"
                        label={null}
                        value={formData.targetLtcPercent?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "targetLtcPercent",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 80"
                        disabled={isFieldLocked("targetLtcPercent", "loan-info")}
                        className={cn(
                          isFieldLocked("targetLtcPercent", "loan-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="targetLtcPercent"
                        data-field-type="number"
                        data-field-section="loan-info"
                        data-field-required="false"
                        data-field-label="Target LTC (%) (Construction/Dev)"
                        data-field-placeholder="e.g., 80"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton
                    id="amortizationYears"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("amortizationYears", "loan-info", "Amortization (Years)", false)}
                      <Input
                        id="amortizationYears"
                        type="number"
                        label={null}
                        value={formData.amortizationYears?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "amortizationYears",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 30"
                        disabled={isFieldLocked("amortizationYears", "loan-info")}
                        className={cn(
                          isFieldLocked("amortizationYears", "loan-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="amortizationYears"
                        data-field-type="number"
                        data-field-section="loan-info"
                        data-field-required="false"
                        data-field-label="Amortization (Years)"
                        data-field-placeholder="e.g., 30"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton
                    id="interestOnlyPeriodMonths"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("interestOnlyPeriodMonths", "loan-info", "Interest-Only Period (Months)", false)}
                      <Input
                        id="interestOnlyPeriodMonths"
                        type="number"
                        label={null}
                        value={
                          formData.interestOnlyPeriodMonths?.toString() || ""
                        }
                        onChange={(e) =>
                          handleInputChange(
                            "interestOnlyPeriodMonths",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 36"
                        disabled={isFieldLocked("interestOnlyPeriodMonths", "loan-info")}
                        className={cn(
                          isFieldLocked("interestOnlyPeriodMonths", "loan-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="interestOnlyPeriodMonths"
                        data-field-type="number"
                        data-field-section="loan-info"
                        data-field-required="false"
                        data-field-label="Interest-Only Period (Months)"
                        data-field-placeholder="e.g., 36"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Interest Rate Type uses ButtonSelect */}
                <FormGroup>
                  <AskAIButton
                    id="interestRateType"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div
                      data-field-id="interestRateType"
                      data-field-type="button-select"
                      data-field-section="loan-info"
                      data-field-required="false"
                      data-field-label="Interest Rate Type"
                      data-field-options={JSON.stringify(
                        interestRateTypeOptions
                      )}
                      className="relative group/field"
                    >
                      {renderFieldLabel("interestRateType", "loan-info", "Interest Rate Type", false)}
                      <ButtonSelect
                        label=""
                        options={interestRateTypeOptions}
                        selectedValue={
                          formData.interestRateType || "Not Specified"
                        }
                        onSelect={(value) =>
                          handleInputChange(
                            "interestRateType",
                            value as InterestRateType
                          )
                        }
                        gridCols="grid-cols-2 md:grid-cols-3"
                        disabled={isFieldLocked("interestRateType", "loan-info")}
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton
                    id="targetCloseDate"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("targetCloseDate", "loan-info", "Target Close Date", false)}
                      <Input
                        id="targetCloseDate"
                        type="date"
                        label={null}
                        value={formData.targetCloseDate || ""}
                        onChange={(e) =>
                          handleInputChange("targetCloseDate", e.target.value)
                        }
                        disabled={isFieldLocked("targetCloseDate", "loan-info")}
                        className={cn(
                          isFieldLocked("targetCloseDate", "loan-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="targetCloseDate"
                        data-field-type="date"
                        data-field-section="loan-info"
                        data-field-required="false"
                        data-field-label="Target Close Date"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              {/* Recourse Preference uses ButtonSelect */}
              <FormGroup>
                <AskAIButton
                  id="recoursePreference"
                  onAskAI={onAskAI || (() => {})}
                >
                  <div
                    data-field-id="recoursePreference"
                    data-field-type="button-select"
                    data-field-section="loan-info"
                    data-field-required="false"
                    data-field-label="Recourse Preference"
                    data-field-options={JSON.stringify(recourseOptions)}
                    className="relative group/field"
                  >
                    {renderFieldLabel("recoursePreference", "loan-info", "Recourse Preference", false)}
                    <ButtonSelect
                      label=""
                      options={recourseOptions}
                      selectedValue={formData.recoursePreference || "Flexible"}
                      onSelect={(value) =>
                        handleInputChange(
                          "recoursePreference",
                          value as RecoursePreference
                        )
                      }
                      gridCols="grid-cols-2 md:grid-cols-3"
                      disabled={isFieldLocked("recoursePreference", "loan-info")}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              {/* Use of Proceeds uses Textarea */}
              <FormGroup>
                <AskAIButton id="useOfProceeds" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="useOfProceeds"
                    data-field-type="textarea"
                    data-field-section="loan-info"
                    data-field-required="true"
                    data-field-label="Use of Proceeds"
                    data-field-placeholder="Describe how the loan proceeds will be used..."
                    className="relative group/field"
                  >
                    {renderFieldLabel("useOfProceeds", "loan-info", "Use of Proceeds", true)}
                    <textarea
                      id="useOfProceeds"
                      value={formData.useOfProceeds || ""}
                      onChange={(e) =>
                        handleInputChange("useOfProceeds", e.target.value)
                      }
                      placeholder="Describe how the loan proceeds will be used..."
                      disabled={isFieldLocked("useOfProceeds", "loan-info")}
                      className={cn(
                        "w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isFieldLocked("useOfProceeds", "loan-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                      )}
                      required
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
            </div>
          </>
        ),
      },
      // --- Step 3: Financial Information ---
      {
        id: "financials",
        title: "Financials",
        component: (
          <>
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <BarChart className="h-5 w-5 mr-2 text-blue-600" /> Financial Information
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("financials")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("financials")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("financials") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("financials") ? (
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
                <FormGroup>
                  <AskAIButton
                    id="purchasePrice"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("purchasePrice", "financials", "Purchase Price / Current Basis ($)", false)}
                      <Input
                        id="purchasePrice"
                        type="number"
                        label={null}
                        value={formData.purchasePrice?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "purchasePrice",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 15000000"
                        disabled={isFieldLocked("purchasePrice", "financials")}
                        className={cn(
                          isFieldLocked("purchasePrice", "financials") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="purchasePrice"
                        data-field-type="number"
                        data-field-section="financials"
                        data-field-required="false"
                        data-field-label="Purchase Price / Current Basis ($)"
                        data-field-placeholder="e.g., 15000000"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton
                    id="totalProjectCost"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("totalProjectCost", "financials", "Total Project Cost ($)", false)}
                      <Input
                        id="totalProjectCost"
                        type="number"
                        label={null}
                        value={formData.totalProjectCost?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "totalProjectCost",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 18000000"
                        disabled={isFieldLocked("totalProjectCost", "financials")}
                        className={cn(
                          isFieldLocked("totalProjectCost", "financials") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="totalProjectCost"
                        data-field-type="number"
                        data-field-section="financials"
                        data-field-required="false"
                        data-field-label="Total Project Cost ($)"
                        data-field-placeholder="e.g., 18000000"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="capexBudget" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("capexBudget", "financials", "CapEx Budget ($)", false)}
                      <Input
                        id="capexBudget"
                        type="number"
                        label={null}
                        value={formData.capexBudget?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "capexBudget",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 1500000"
                        disabled={isFieldLocked("capexBudget", "financials")}
                        className={cn(
                          isFieldLocked("capexBudget", "financials") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="capexBudget"
                        data-field-type="number"
                        data-field-section="financials"
                        data-field-required="false"
                        data-field-label="CapEx Budget ($)"
                        data-field-placeholder="e.g., 1500000"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton
                    id="equityCommittedPercent"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("equityCommittedPercent", "financials", "Equity Committed (%)", false)}
                      <Input
                        id="equityCommittedPercent"
                        type="number"
                        label={null}
                        value={formData.equityCommittedPercent?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "equityCommittedPercent",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 100"
                        disabled={isFieldLocked("equityCommittedPercent", "financials")}
                        className={cn(
                          isFieldLocked("equityCommittedPercent", "financials") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="equityCommittedPercent"
                        data-field-type="number"
                        data-field-section="financials"
                        data-field-required="false"
                        data-field-label="Equity Committed (%)"
                        data-field-placeholder="e.g., 100"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton
                    id="propertyNoiT12"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("propertyNoiT12", "financials", "Current/T12 NOI ($)", false)}
                      <Input
                        id="propertyNoiT12"
                        type="number"
                        label={null}
                      value={formData.propertyNoiT12?.toString() || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "propertyNoiT12",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      placeholder="e.g., 450000"
                      disabled={isFieldLocked("propertyNoiT12", "financials")}
                      className={cn(
                        isFieldLocked("propertyNoiT12", "financials") && "bg-gray-50 cursor-not-allowed opacity-75"
                      )}
                      data-field-id="propertyNoiT12"
                      data-field-type="number"
                      data-field-section="financials"
                      data-field-required="false"
                      data-field-label="Current/T12 NOI ($)"
                      data-field-placeholder="e.g., 450000"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton
                    id="stabilizedNoiProjected"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div className="relative group/field">
                      {renderFieldLabel("stabilizedNoiProjected", "financials", "Projected Stabilized NOI ($)", false)}
                      <Input
                        id="stabilizedNoiProjected"
                        type="number"
                        label={null}
                        value={formData.stabilizedNoiProjected?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "stabilizedNoiProjected",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 750000"
                        disabled={isFieldLocked("stabilizedNoiProjected", "financials")}
                        className={cn(
                          isFieldLocked("stabilizedNoiProjected", "financials") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="stabilizedNoiProjected"
                        data-field-type="number"
                        data-field-section="financials"
                        data-field-required="false"
                        data-field-label="Projected Stabilized NOI ($)"
                        data-field-placeholder="e.g., 750000"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              {/* Exit Strategy uses ButtonSelect */}
              <FormGroup>
                <AskAIButton id="exitStrategy" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="exitStrategy"
                    data-field-type="button-select"
                    data-field-section="financials"
                    data-field-required="false"
                    data-field-label="Exit Strategy"
                    data-field-options={JSON.stringify(exitStrategyOptions)}
                    className="relative group/field"
                  >
                    {renderFieldLabel("exitStrategy", "financials", "Exit Strategy", false)}
                    <ButtonSelect
                      label=""
                      options={exitStrategyOptions}
                      selectedValue={formData.exitStrategy || "Undecided"}
                      onSelect={(value) =>
                        handleInputChange("exitStrategy", value as ExitStrategy)
                      }
                      disabled={isFieldLocked("exitStrategy", "financials")}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              {/* Business Plan & Market Overview use Textarea */}
              <FormGroup>
                <AskAIButton
                  id="businessPlanSummary"
                  onAskAI={onAskAI || (() => {})}
                >
                  <div
                    data-field-id="businessPlanSummary"
                    data-field-type="textarea"
                    data-field-section="financials"
                    data-field-required="false"
                    data-field-label="Business Plan Summary"
                    data-field-placeholder="Summary of your business plan..."
                    className="relative group/field"
                  >
                    {renderFieldLabel("businessPlanSummary", "financials", "Business Plan Summary", false)}
                    <textarea
                      id="businessPlanSummary"
                      value={formData.businessPlanSummary || ""}
                      onChange={(e) =>
                        handleInputChange("businessPlanSummary", e.target.value)
                      }
                      placeholder="Summary of your business plan..."
                      disabled={isFieldLocked("businessPlanSummary", "financials")}
                      className={cn(
                        "w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isFieldLocked("businessPlanSummary", "financials") && "bg-gray-50 cursor-not-allowed opacity-75"
                      )}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton
                  id="marketOverviewSummary"
                  onAskAI={onAskAI || (() => {})}
                >
                  <div
                    data-field-id="marketOverviewSummary"
                    data-field-type="textarea"
                    data-field-section="financials"
                    data-field-required="false"
                    data-field-label="Market Overview"
                    data-field-placeholder="Brief overview of the market..."
                    className="relative group/field"
                  >
                    {renderFieldLabel("marketOverviewSummary", "financials", "Market Overview", false)}
                    <textarea
                      id="marketOverviewSummary"
                      value={formData.marketOverviewSummary || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "marketOverviewSummary",
                          e.target.value
                        )
                      }
                      placeholder="Brief overview of the market..."
                      disabled={isFieldLocked("marketOverviewSummary", "financials")}
                      className={cn(
                        "w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
                        isFieldLocked("marketOverviewSummary", "financials") && "bg-gray-50 cursor-not-allowed opacity-75"
                      )}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
            </div>
          </>
        ),
      },
      // --- Step 4: Property Specifications ---
      {
        id: "property-specs",
        title: "Property Specs",
        component: (
          <>
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Building className="h-5 w-5 mr-2 text-blue-600" /> Property Specifications
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("property-specs")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("property-specs")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("property-specs") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("property-specs") ? (
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
                <FormGroup>
                  <AskAIButton id="totalResidentialUnits" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("totalResidentialUnits", "property-specs", "Total Residential Units", false)}
                      <Input
                        id="totalResidentialUnits"
                        type="number"
                        label={null}
                        value={formData.totalResidentialUnits?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "totalResidentialUnits",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 116"
                        disabled={isFieldLocked("totalResidentialUnits", "property-specs")}
                        className={cn(
                          isFieldLocked("totalResidentialUnits", "property-specs") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="totalResidentialUnits"
                        data-field-type="number"
                        data-field-section="property-specs"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="totalResidentialNRSF" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("totalResidentialNRSF", "property-specs", "Total Residential NRSF", false)}
                      <Input
                        id="totalResidentialNRSF"
                        type="number"
                        label={null}
                        value={formData.totalResidentialNRSF?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "totalResidentialNRSF",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 59520"
                        disabled={isFieldLocked("totalResidentialNRSF", "property-specs")}
                        className={cn(
                          isFieldLocked("totalResidentialNRSF", "property-specs") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="totalResidentialNRSF"
                        data-field-type="number"
                        data-field-section="property-specs"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="totalCommercialGRSF" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("totalCommercialGRSF", "property-specs", "Total Commercial GRSF", false)}
                      <Input
                        id="totalCommercialGRSF"
                        type="number"
                        label={null}
                        value={formData.totalCommercialGRSF?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "totalCommercialGRSF",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 49569"
                        disabled={isFieldLocked("totalCommercialGRSF", "property-specs")}
                        className={cn(
                          isFieldLocked("totalCommercialGRSF", "property-specs") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="totalCommercialGRSF"
                        data-field-type="number"
                        data-field-section="property-specs"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="grossBuildingArea" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("grossBuildingArea", "property-specs", "Gross Building Area", false)}
                      <Input
                        id="grossBuildingArea"
                        type="number"
                        label={null}
                        value={formData.grossBuildingArea?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "grossBuildingArea",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 127406"
                        disabled={isFieldLocked("grossBuildingArea", "property-specs")}
                        className={cn(
                          isFieldLocked("grossBuildingArea", "property-specs") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="grossBuildingArea"
                        data-field-type="number"
                        data-field-section="property-specs"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="numberOfStories" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("numberOfStories", "property-specs", "Number of Stories", false)}
                      <Input
                        id="numberOfStories"
                        type="number"
                        label={null}
                        value={formData.numberOfStories?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "numberOfStories",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 6"
                        disabled={isFieldLocked("numberOfStories", "property-specs")}
                        className={cn(
                          isFieldLocked("numberOfStories", "property-specs") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="numberOfStories"
                        data-field-type="number"
                        data-field-section="property-specs"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="parkingSpaces" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("parkingSpaces", "property-specs", "Parking Spaces", false)}
                      <Input
                        id="parkingSpaces"
                        type="number"
                        label={null}
                        value={formData.parkingSpaces?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "parkingSpaces",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 180"
                        disabled={isFieldLocked("parkingSpaces", "property-specs")}
                        className={cn(
                          isFieldLocked("parkingSpaces", "property-specs") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="parkingSpaces"
                        data-field-type="number"
                        data-field-section="property-specs"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
            </div>
          </>
        ),
      },
      // --- Step 5: Development Budget ---
      {
        id: "dev-budget",
        title: "Dev Budget",
        component: (
          <>
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-blue-600" /> Development Budget
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("dev-budget")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("dev-budget")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("dev-budget") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("dev-budget") ? (
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
                <FormGroup>
                  <AskAIButton id="landAcquisition" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("landAcquisition", "dev-budget", "Land Acquisition", false)}
                      <Input
                        id="landAcquisition"
                        type="number"
                        label={null}
                        value={(formData as any).landAcquisition?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "landAcquisition",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 6000000"
                        disabled={isFieldLocked("landAcquisition", "dev-budget")}
                        className={cn(
                          isFieldLocked("landAcquisition", "dev-budget") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="landAcquisition"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="baseConstruction" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("baseConstruction", "dev-budget", "Base Construction (Hard Cost)", false)}
                      <Input
                        id="baseConstruction"
                        type="number"
                        label={null}
                        value={(formData as any).baseConstruction?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "baseConstruction",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 16950000"
                        disabled={isFieldLocked("baseConstruction", "dev-budget")}
                        className={cn(
                          isFieldLocked("baseConstruction", "dev-budget") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="baseConstruction"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="contingency" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("contingency", "dev-budget", "Contingency", false)}
                      <Input
                        id="contingency"
                        type="number"
                        label={null}
                        value={(formData as any).contingency?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "contingency",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 847500"
                        disabled={isFieldLocked("contingency", "dev-budget")}
                        className={cn(
                          isFieldLocked("contingency", "dev-budget") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="contingency"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="ffe" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("ffe", "dev-budget", "FF&E (Furniture, Fixtures & Equipment)", false)}
                      <Input
                        id="ffe"
                        type="number"
                        label={null}
                        value={(formData as any).ffe?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "ffe",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 580000"
                        disabled={isFieldLocked("ffe", "dev-budget")}
                        className={cn(
                          isFieldLocked("ffe", "dev-budget") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="ffe"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="aeFees" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("aeFees", "dev-budget", "A&E Fees (Architecture & Engineering)", false)}
                      <Input
                        id="aeFees"
                        type="number"
                        label={null}
                        value={(formData as any).aeFees?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "aeFees",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 859800"
                        disabled={isFieldLocked("aeFees", "dev-budget")}
                        className={cn(
                          isFieldLocked("aeFees", "dev-budget") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="aeFees"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="developerFee" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("developerFee", "dev-budget", "Developer Fee", false)}
                      <Input
                        id="developerFee"
                        type="number"
                        label={null}
                        value={(formData as any).developerFee?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "developerFee",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 678000"
                        disabled={isFieldLocked("developerFee", "dev-budget")}
                        className={cn(
                          isFieldLocked("developerFee", "dev-budget") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="developerFee"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="interestReserve" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("interestReserve", "dev-budget", "Interest Reserve", false)}
                      <Input
                        id="interestReserve"
                        type="number"
                        label={null}
                        value={(formData as any).interestReserve?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "interestReserve",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 1147500"
                        disabled={isFieldLocked("interestReserve", "dev-budget")}
                        className={cn(
                          isFieldLocked("interestReserve", "dev-budget") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="interestReserve"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="workingCapital" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("workingCapital", "dev-budget", "Working Capital", false)}
                      <Input
                        id="workingCapital"
                        type="number"
                        label={null}
                        value={(formData as any).workingCapital?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "workingCapital",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 1900000"
                        disabled={isFieldLocked("workingCapital", "dev-budget")}
                        className={cn(
                          isFieldLocked("workingCapital", "dev-budget") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="workingCapital"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
            </div>
          </>
        ),
      },
      // --- Step 6: Market Context ---
      {
        id: "market-context",
        title: "Market Context",
        component: (
          <>
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" /> Market Context
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("market-context")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("market-context")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("market-context") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("market-context") ? (
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
                <FormGroup>
                  <AskAIButton id="submarketName" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("submarketName", "market-context", "Submarket Name", false)}
                      <Input
                        id="submarketName"
                        label={null}
                        value={(formData as any).submarketName || ""}
                        onChange={(e) =>
                          handleInputChange("submarketName", e.target.value)
                        }
                        placeholder="e.g., Downtown Dallas"
                        disabled={isFieldLocked("submarketName", "market-context")}
                        className={cn(
                          isFieldLocked("submarketName", "market-context") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="submarketName"
                        data-field-type="input"
                        data-field-section="market-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="walkabilityScore" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("walkabilityScore", "market-context", "Walkability Score", false)}
                      <Input
                        id="walkabilityScore"
                        type="number"
                        label={null}
                        value={(formData as any).walkabilityScore?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "walkabilityScore",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 85"
                        min="0"
                        max="100"
                        disabled={isFieldLocked("walkabilityScore", "market-context")}
                        className={cn(
                          isFieldLocked("walkabilityScore", "market-context") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="walkabilityScore"
                        data-field-type="number"
                        data-field-section="market-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="population3Mi" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("population3Mi", "market-context", "Population (3-mile radius)", false)}
                      <Input
                        id="population3Mi"
                        type="number"
                        label={null}
                        value={(formData as any).population3Mi?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "population3Mi",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 174270"
                        disabled={isFieldLocked("population3Mi", "market-context")}
                        className={cn(
                          isFieldLocked("population3Mi", "market-context") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="population3Mi"
                        data-field-type="number"
                        data-field-section="market-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="medianHHIncome" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("medianHHIncome", "market-context", "Median Household Income (3-mile)", false)}
                      <Input
                        id="medianHHIncome"
                        type="number"
                        label={null}
                        value={(formData as any).medianHHIncome?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "medianHHIncome",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 85906"
                        disabled={isFieldLocked("medianHHIncome", "market-context")}
                        className={cn(
                          isFieldLocked("medianHHIncome", "market-context") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="medianHHIncome"
                        data-field-type="number"
                        data-field-section="market-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="renterOccupiedPercent" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("renterOccupiedPercent", "market-context", "% Renter Occupied (3-mile)", false)}
                      <Input
                        id="renterOccupiedPercent"
                        type="number"
                        label={null}
                        value={(formData as any).renterOccupiedPercent?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "renterOccupiedPercent",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 76.7"
                        min="0"
                        max="100"
                        disabled={isFieldLocked("renterOccupiedPercent", "market-context")}
                        className={cn(
                          isFieldLocked("renterOccupiedPercent", "market-context") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="renterOccupiedPercent"
                        data-field-type="number"
                        data-field-section="market-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="popGrowth201020" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("popGrowth201020", "market-context", "Population Growth (2010-2020)", false)}
                      <Input
                        id="popGrowth201020"
                        type="number"
                        label={null}
                        value={(formData as any).popGrowth201020?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "popGrowth201020",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 23.3"
                        disabled={isFieldLocked("popGrowth201020", "market-context")}
                        className={cn(
                          isFieldLocked("popGrowth201020", "market-context") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="popGrowth201020"
                        data-field-type="number"
                        data-field-section="market-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
            </div>
          </>
        ),
      },
      // --- Step 7: Special Considerations ---
      {
        id: "special-considerations",
        title: "Special Programs",
        component: (
          <>
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-blue-600" /> Special Considerations
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("special-considerations")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("special-considerations")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("special-considerations") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("special-considerations") ? (
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
                <FormGroup>
                  <AskAIButton id="opportunityZone" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("opportunityZone", "special-considerations", "Opportunity Zone?", false)}
                      <ButtonSelect
                        label=""
                        options={["Yes", "No"]}
                        selectedValue={(formData as any).opportunityZone ? "Yes" : (formData as any).opportunityZone === false ? "No" : ""}
                        onSelect={(value) =>
                          handleInputChange("opportunityZone", value === "Yes")
                        }
                        gridCols="grid-cols-2"
                        disabled={isFieldLocked("opportunityZone", "special-considerations")}
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="affordableHousing" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("affordableHousing", "special-considerations", "Affordable Housing?", false)}
                      <ButtonSelect
                        label=""
                        options={["Yes", "No"]}
                        selectedValue={(formData as any).affordableHousing ? "Yes" : (formData as any).affordableHousing === false ? "No" : ""}
                        onSelect={(value) =>
                          handleInputChange("affordableHousing", value === "Yes")
                        }
                        gridCols="grid-cols-2"
                        disabled={isFieldLocked("affordableHousing", "special-considerations")}
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              {(formData as any).affordableHousing && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormGroup>
                      <AskAIButton id="affordableUnitsNumber" onAskAI={onAskAI || (() => {})}>
                        <div className="relative group/field">
                          {renderFieldLabel("affordableUnitsNumber", "special-considerations", "Number of Affordable Units", false)}
                          <Input
                            id="affordableUnitsNumber"
                            type="number"
                            label={null}
                            value={(formData as any).affordableUnitsNumber?.toString() || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "affordableUnitsNumber",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            placeholder="e.g., 58"
                            disabled={isFieldLocked("affordableUnitsNumber", "special-considerations")}
                            className={cn(
                              isFieldLocked("affordableUnitsNumber", "special-considerations") && "bg-gray-50 cursor-not-allowed opacity-75"
                            )}
                            data-field-id="affordableUnitsNumber"
                            data-field-type="number"
                            data-field-section="special-considerations"
                          />
                        </div>
                      </AskAIButton>
                    </FormGroup>
                    <FormGroup>
                      <AskAIButton id="amiTargetPercent" onAskAI={onAskAI || (() => {})}>
                        <div className="relative group/field">
                          {renderFieldLabel("amiTargetPercent", "special-considerations", "AMI Target %", false)}
                          <Input
                            id="amiTargetPercent"
                            type="number"
                            label={null}
                            value={(formData as any).amiTargetPercent?.toString() || ""}
                            onChange={(e) =>
                              handleInputChange(
                                "amiTargetPercent",
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            placeholder="e.g., 80"
                            disabled={isFieldLocked("amiTargetPercent", "special-considerations")}
                            className={cn(
                              isFieldLocked("amiTargetPercent", "special-considerations") && "bg-gray-50 cursor-not-allowed opacity-75"
                            )}
                            data-field-id="amiTargetPercent"
                            data-field-type="number"
                            data-field-section="special-considerations"
                          />
                        </div>
                      </AskAIButton>
                    </FormGroup>
                  </div>
                </>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="taxExemption" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("taxExemption", "special-considerations", "Tax Exemption?", false)}
                      <ButtonSelect
                        label=""
                        options={["Yes", "No"]}
                        selectedValue={(formData as any).taxExemption ? "Yes" : (formData as any).taxExemption === false ? "No" : ""}
                        onSelect={(value) =>
                          handleInputChange("taxExemption", value === "Yes")
                        }
                        gridCols="grid-cols-2"
                        disabled={isFieldLocked("taxExemption", "special-considerations")}
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="taxAbatement" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("taxAbatement", "special-considerations", "Tax Abatement?", false)}
                      <ButtonSelect
                        label=""
                        options={["Yes", "No"]}
                        selectedValue={(formData as any).taxAbatement ? "Yes" : (formData as any).taxAbatement === false ? "No" : ""}
                        onSelect={(value) =>
                          handleInputChange("taxAbatement", value === "Yes")
                        }
                        gridCols="grid-cols-2"
                        disabled={isFieldLocked("taxAbatement", "special-considerations")}
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
            </div>
          </>
        ),
      },
      // --- Step 8: Timeline & Milestones ---
      {
        id: "timeline",
        title: "Timeline",
        component: (
          <>
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" /> Timeline & Milestones
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("timeline")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("timeline")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("timeline") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("timeline") ? (
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
                <FormGroup>
                  <AskAIButton id="groundbreakingDate" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("groundbreakingDate", "timeline", "Groundbreaking Date", false)}
                      <Input
                        id="groundbreakingDate"
                        type="date"
                        label={null}
                        value={(formData as any).groundbreakingDate || ""}
                        onChange={(e) =>
                          handleInputChange("groundbreakingDate", e.target.value)
                        }
                        disabled={isFieldLocked("groundbreakingDate", "timeline")}
                        className={cn(
                          isFieldLocked("groundbreakingDate", "timeline") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="groundbreakingDate"
                        data-field-type="date"
                        data-field-section="timeline"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="completionDate" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("completionDate", "timeline", "Completion Date", false)}
                      <Input
                        id="completionDate"
                        type="date"
                        label={null}
                        value={(formData as any).completionDate || ""}
                        onChange={(e) =>
                          handleInputChange("completionDate", e.target.value)
                        }
                        disabled={isFieldLocked("completionDate", "timeline")}
                        className={cn(
                          isFieldLocked("completionDate", "timeline") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="completionDate"
                        data-field-type="date"
                        data-field-section="timeline"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="firstOccupancy" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("firstOccupancy", "timeline", "First Occupancy", false)}
                      <Input
                        id="firstOccupancy"
                        type="date"
                        label={null}
                        value={(formData as any).firstOccupancy || ""}
                        onChange={(e) =>
                          handleInputChange("firstOccupancy", e.target.value)
                        }
                        disabled={isFieldLocked("firstOccupancy", "timeline")}
                        className={cn(
                          isFieldLocked("firstOccupancy", "timeline") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="firstOccupancy"
                        data-field-type="date"
                        data-field-section="timeline"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="stabilization" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("stabilization", "timeline", "Stabilization Date", false)}
                      <Input
                        id="stabilization"
                        type="date"
                        label={null}
                        value={(formData as any).stabilization || ""}
                        onChange={(e) =>
                          handleInputChange("stabilization", e.target.value)
                        }
                        disabled={isFieldLocked("stabilization", "timeline")}
                        className={cn(
                          isFieldLocked("stabilization", "timeline") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="stabilization"
                        data-field-type="date"
                        data-field-section="timeline"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="entitlements" onAskAI={onAskAI || (() => {})}>
                    <div
                      data-field-id="entitlements"
                      data-field-type="button-select"
                      data-field-section="timeline"
                      data-field-required="false"
                      data-field-label="Entitlements Status"
                      data-field-options={JSON.stringify(["Approved", "Pending"])}
                      className="relative group/field"
                    >
                      {renderFieldLabel("entitlements", "timeline", "Entitlements Status", false)}
                      <ButtonSelect
                        label=""
                        options={["Approved", "Pending"]}
                        selectedValue={(formData as any).entitlements || ""}
                        onSelect={(value) =>
                          handleInputChange("entitlements", value)
                        }
                        gridCols="grid-cols-2"
                        disabled={isFieldLocked("entitlements", "timeline")}
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="permitsIssued" onAskAI={onAskAI || (() => {})}>
                    <div
                      data-field-id="permitsIssued"
                      data-field-type="button-select"
                      data-field-section="timeline"
                      data-field-required="false"
                      data-field-label="Permits Status"
                      data-field-options={JSON.stringify(["Issued", "Pending"])}
                      className="relative group/field"
                    >
                      {renderFieldLabel("permitsIssued", "timeline", "Permits Status", false)}
                      <ButtonSelect
                        label=""
                        options={["Issued", "Pending"]}
                        selectedValue={(formData as any).permitsIssued || ""}
                        onSelect={(value) =>
                          handleInputChange("permitsIssued", value)
                        }
                        gridCols="grid-cols-2"
                        disabled={isFieldLocked("permitsIssued", "timeline")}
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
            </div>
          </>
        ),
      },
      // --- Step 9: Site & Context ---
      {
        id: "site-context",
        title: "Site & Context",
        component: (
          <>
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Map className="h-5 w-5 mr-2 text-blue-600" /> Site & Context
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("site-context")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("site-context")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("site-context") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("site-context") ? (
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
                <FormGroup>
                  <AskAIButton id="totalSiteAcreage" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("totalSiteAcreage", "site-context", "Total Site Acreage", false)}
                      <Input
                        id="totalSiteAcreage"
                        type="number"
                        label={null}
                        value={(formData as any).totalSiteAcreage?.toString() || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "totalSiteAcreage",
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="e.g., 2.5"
                        step="0.01"
                        disabled={isFieldLocked("totalSiteAcreage", "site-context")}
                        className={cn(
                          isFieldLocked("totalSiteAcreage", "site-context") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="totalSiteAcreage"
                        data-field-type="number"
                        data-field-section="site-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="currentSiteStatus" onAskAI={onAskAI || (() => {})}>
                    <div
                      data-field-id="currentSiteStatus"
                      data-field-type="button-select"
                      data-field-section="site-context"
                      data-field-required="false"
                      data-field-label="Current Site Status"
                      data-field-options={JSON.stringify(["Vacant", "Existing"])}
                      className="relative group/field"
                    >
                      {renderFieldLabel("currentSiteStatus", "site-context", "Current Site Status", false)}
                      <ButtonSelect
                        label=""
                        options={["Vacant", "Existing"]}
                        selectedValue={(formData as any).currentSiteStatus || ""}
                        onSelect={(value) =>
                          handleInputChange("currentSiteStatus", value)
                        }
                        gridCols="grid-cols-2"
                        disabled={isFieldLocked("currentSiteStatus", "site-context")}
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="siteAccess" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("siteAccess", "site-context", "Site Access", false)}
                      <Input
                        id="siteAccess"
                        label={null}
                        value={(formData as any).siteAccess || ""}
                        onChange={(e) =>
                          handleInputChange("siteAccess", e.target.value)
                        }
                        placeholder="e.g., Hickory St, Ferris St"
                        disabled={isFieldLocked("siteAccess", "site-context")}
                        className={cn(
                          isFieldLocked("siteAccess", "site-context") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="siteAccess"
                        data-field-type="input"
                        data-field-section="site-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="proximityShopping" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("proximityShopping", "site-context", "Proximity to Shopping", false)}
                      <Input
                        id="proximityShopping"
                        label={null}
                        value={(formData as any).proximityShopping || ""}
                        onChange={(e) =>
                          handleInputChange("proximityShopping", e.target.value)
                        }
                        placeholder="e.g., Farmers Market, Deep Ellum nearby"
                        disabled={isFieldLocked("proximityShopping", "site-context")}
                        className={cn(
                          isFieldLocked("proximityShopping", "site-context") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="proximityShopping"
                        data-field-type="input"
                        data-field-section="site-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
            </div>
          </>
        ),
      },
      // --- Step 10: Sponsor Information ---
      {
        id: "sponsor-info",
        title: "Sponsor Info",
        component: (
          <>
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" /> Sponsor Information
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("sponsor-info")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("sponsor-info")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("sponsor-info") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("sponsor-info") ? (
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
                <FormGroup>
                  <AskAIButton id="sponsorEntityName" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("sponsorEntityName", "sponsor-info", "Sponsor Entity Name", false)}
                      <Input
                        id="sponsorEntityName"
                        label={null}
                        value={(formData as any).sponsorEntityName || ""}
                        onChange={(e) =>
                          handleInputChange("sponsorEntityName", e.target.value)
                        }
                        placeholder="e.g., Hoque Global"
                        disabled={isFieldLocked("sponsorEntityName", "sponsor-info")}
                        className={cn(
                          isFieldLocked("sponsorEntityName", "sponsor-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="sponsorEntityName"
                        data-field-type="input"
                        data-field-section="sponsor-info"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="sponsorStructure" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("sponsorStructure", "sponsor-info", "Sponsor Structure", false)}
                      <Input
                        id="sponsorStructure"
                        label={null}
                        value={(formData as any).sponsorStructure || ""}
                        onChange={(e) =>
                          handleInputChange("sponsorStructure", e.target.value)
                        }
                        placeholder="e.g., General Partner"
                        disabled={isFieldLocked("sponsorStructure", "sponsor-info")}
                        className={cn(
                          isFieldLocked("sponsorStructure", "sponsor-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="sponsorStructure"
                        data-field-type="input"
                        data-field-section="sponsor-info"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="equityPartner" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("equityPartner", "sponsor-info", "Equity Partner", false)}
                      <Input
                        id="equityPartner"
                        label={null}
                        value={(formData as any).equityPartner || ""}
                        onChange={(e) =>
                          handleInputChange("equityPartner", e.target.value)
                        }
                        placeholder="e.g., ACARA"
                        disabled={isFieldLocked("equityPartner", "sponsor-info")}
                        className={cn(
                          isFieldLocked("equityPartner", "sponsor-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="equityPartner"
                        data-field-type="input"
                        data-field-section="sponsor-info"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="contactInfo" onAskAI={onAskAI || (() => {})}>
                    <div className="relative group/field">
                      {renderFieldLabel("contactInfo", "sponsor-info", "Contact Info", false)}
                      <textarea
                        id="contactInfo"
                        value={(formData as any).contactInfo || ""}
                        onChange={(e) =>
                          handleInputChange("contactInfo", e.target.value)
                        }
                        placeholder="e.g., Cody Field (415.202.3258), Joel Heikenfeld (972.455.1943)"
                        disabled={isFieldLocked("contactInfo", "sponsor-info")}
                        className={cn(
                          "w-full h-20 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500",
                          isFieldLocked("contactInfo", "sponsor-info") && "bg-gray-50 cursor-not-allowed opacity-75"
                        )}
                        data-field-id="contactInfo"
                        data-field-type="textarea"
                        data-field-section="sponsor-info"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
            </div>
          </>
        ),
      },
      // Documents and Review steps removed (DocumentManager exists above; autosave in place)
    ],
    [formData, handleInputChange, onAskAI, lockedSections, isFieldLocked, renderFieldLabel, toggleSectionLock]
  );
  return (
    <FormProvider initialFormData={formData as Record<string, any>}>
      {/* Sticky header matching Borrower styling */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm rounded-t-2xl flex items-center justify-between px-3 py-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2" />
            Project Resume
          </h2>
          <p className="text-sm text-gray-500">{formData.projectName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutofill}
            disabled={isAutofilling}
            className={cn(
              "group relative flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border transition-all duration-300 overflow-hidden",
              isAutofilling 
                ? "border-blue-400 bg-blue-50 text-blue-700" 
                : "border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 text-blue-700 hover:text-blue-800 shadow-sm hover:shadow-md"
            )}
          >
            {isAutofilling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">Autofilling...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium text-blue-700 whitespace-nowrap max-w-0 group-hover:max-w-[140px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">Autofill Resume</span>
              </>
            )}
            {/* Sparkle animation overlay */}
            {showSparkles && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                    initial={{
                      x: '50%',
                      y: '50%',
                      opacity: 1,
                      scale: 0,
                    }}
                    animate={{
                      x: `${Math.random() * 100}%`,
                      y: `${Math.random() * 100}%`,
                      opacity: [1, 1, 0],
                      scale: [0, 1.5, 0],
                    }}
                    transition={{
                      duration: 0.8,
                      delay: Math.random() * 0.3,
                      ease: 'easeOut',
                    }}
                    style={{
                      left: '50%',
                      top: '50%',
                    }}
                  />
                ))}
              </div>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFormSubmit}
            isLoading={formSaved}
            disabled={formSaved}
            className="px-3 py-1.5 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
          >
            {formSaved ? "Saving..." : "Save & Exit"}
          </Button>
        </div>
      </div>
      <div className="p-6">
        <FormWizard
          steps={steps}
          onComplete={handleFormSubmit}
          showProgressBar={false}
          showStepIndicators={false}
          allowSkip={true}
          variant="tabs"
          showBottomNav={true}
        />
      </div>
    </FormProvider>
  );
};
