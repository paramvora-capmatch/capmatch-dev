// src/components/forms/EnhancedProjectForm.tsx
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FormWizard, Step } from "../ui/FormWizard";
// Removed Card wrappers to match Borrower styling (single container only)
import { FormGroup } from "../ui/Form";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select"; // Keep Select for States
import { Button } from "../ui/Button";
import { ButtonSelect } from "../ui/ButtonSelect"; // Import ButtonSelect
import { useProjects } from "../../hooks/useProjects";

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
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

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
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" /> Project Information
              </h2>
            </div>
              <FormGroup>
                <AskAIButton id="projectName" onAskAI={onAskAI || (() => {})}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <span>
                        Project Name
                        <span className="text-red-500 ml-1">*</span>
                      </span>
                      <FieldHelpTooltip fieldId="projectName" />
                    </label>
                    <Input
                      id="projectName"
                      label={null}
                      value={formData.projectName || ""}
                      onChange={(e) =>
                        handleInputChange("projectName", e.target.value)
                      }
                      placeholder="e.g., Riverfront Acquisition"
                      required
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>
                          Street Address
                          <span className="text-red-500 ml-1">*</span>
                        </span>
                        <FieldHelpTooltip fieldId="propertyAddressStreet" />
                      </label>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <span>
                            City
                            <span className="text-red-500 ml-1">*</span>
                          </span>
                          <FieldHelpTooltip fieldId="propertyAddressCity" />
                        </label>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <span>
                            State
                            <span className="text-red-500 ml-1">*</span>
                          </span>
                          <FieldHelpTooltip fieldId="propertyAddressState" />
                        </label>
                        <Select
                          id="propertyAddressState"
                          label={null}
                          value={formData.propertyAddressState || ""}
                          onChange={(e) =>
                            handleInputChange(
                              "propertyAddressState",
                              e.target.value
                            )
                          }
                          options={stateOptions}
                          required
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                          <span>
                            ZIP Code
                            <span className="text-red-500 ml-1">*</span>
                          </span>
                          <FieldHelpTooltip fieldId="propertyAddressZip" />
                        </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>County</span>
                        <FieldHelpTooltip fieldId="propertyAddressCounty" />
                      </label>
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
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <span>
                          Asset Type
                          <span className="text-red-500 ml-1">*</span>
                        </span>
                        <FieldHelpTooltip fieldId="assetType" />
                      </label>
                      <ButtonSelect
                        label=""
                        options={assetTypeOptions}
                        selectedValue={formData.assetType || ""}
                        onSelect={(value) =>
                          handleInputChange("assetType", value)
                        }
                        required
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
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <span>
                          Project Phase / Deal Type
                          <span className="text-red-500 ml-1">*</span>
                        </span>
                        <FieldHelpTooltip fieldId="projectPhase" />
                      </label>
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
                        required
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
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>
                          Project Description
                          <span className="text-red-500 ml-1">*</span>
                        </span>
                        <FieldHelpTooltip fieldId="projectDescription" />
                      </label>
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
                        className="w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-blue-600" /> Loan Request Details
              </h2>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton
                    id="loanAmountRequested"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>
                          Requested Loan Amount ($)
                          <span className="text-red-500 ml-1">*</span>
                        </span>
                        <FieldHelpTooltip fieldId="loanAmountRequested" />
                      </label>
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
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <span>
                          Capital Type
                          <span className="text-red-500 ml-1">*</span>
                        </span>
                        <FieldHelpTooltip fieldId="loanType" />
                      </label>
                      <ButtonSelect
                        label=""
                        options={capitalTypeOptions}
                        selectedValue={formData.loanType || ""}
                        onSelect={(value) =>
                          handleInputChange("loanType", value)
                        }
                        required
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>
                          Target LTV (%)
                          <span className="text-red-500 ml-1">*</span>
                        </span>
                        <FieldHelpTooltip fieldId="targetLtvPercent" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Target LTC (%) (Construction/Dev)</span>
                        <FieldHelpTooltip fieldId="targetLtcPercent" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Amortization (Years)</span>
                        <FieldHelpTooltip fieldId="amortizationYears" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Interest-Only Period (Months)</span>
                        <FieldHelpTooltip fieldId="interestOnlyPeriodMonths" />
                      </label>
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
                    >
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <span>Interest Rate Type</span>
                        <FieldHelpTooltip fieldId="interestRateType" />
                      </label>
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
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton
                    id="targetCloseDate"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Target Close Date</span>
                        <FieldHelpTooltip fieldId="targetCloseDate" />
                      </label>
                      <Input
                        id="targetCloseDate"
                        type="date"
                        label={null}
                        value={formData.targetCloseDate || ""}
                        onChange={(e) =>
                          handleInputChange("targetCloseDate", e.target.value)
                        }
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
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <span>Recourse Preference</span>
                      <FieldHelpTooltip fieldId="recoursePreference" />
                    </label>
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
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <span>
                        Use of Proceeds
                        <span className="text-red-500 ml-1">*</span>
                      </span>
                      <FieldHelpTooltip fieldId="useOfProceeds" />
                    </label>
                    <textarea
                      id="useOfProceeds"
                      value={formData.useOfProceeds || ""}
                      onChange={(e) =>
                        handleInputChange("useOfProceeds", e.target.value)
                      }
                      placeholder="Describe how the loan proceeds will be used..."
                      className="w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <BarChart className="h-5 w-5 mr-2 text-blue-600" /> Financial Information
              </h2>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton
                    id="purchasePrice"
                    onAskAI={onAskAI || (() => {})}
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Purchase Price / Current Basis ($)</span>
                        <FieldHelpTooltip fieldId="purchasePrice" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Total Project Cost ($)</span>
                        <FieldHelpTooltip fieldId="totalProjectCost" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>CapEx Budget ($)</span>
                        <FieldHelpTooltip fieldId="capexBudget" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Equity Committed (%)</span>
                        <FieldHelpTooltip fieldId="equityCommittedPercent" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Current/T12 NOI ($)</span>
                        <FieldHelpTooltip fieldId="propertyNoiT12" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Projected Stabilized NOI ($)</span>
                        <FieldHelpTooltip fieldId="stabilizedNoiProjected" />
                      </label>
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
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <span>Exit Strategy</span>
                      <FieldHelpTooltip fieldId="exitStrategy" />
                    </label>
                    <ButtonSelect
                      label=""
                      options={exitStrategyOptions}
                      selectedValue={formData.exitStrategy || "Undecided"}
                      onSelect={(value) =>
                        handleInputChange("exitStrategy", value as ExitStrategy)
                      }
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
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <span>Business Plan Summary</span>
                      <FieldHelpTooltip fieldId="businessPlanSummary" />
                    </label>
                    <textarea
                      id="businessPlanSummary"
                      value={formData.businessPlanSummary || ""}
                      onChange={(e) =>
                        handleInputChange("businessPlanSummary", e.target.value)
                      }
                      placeholder="Summary of your business plan..."
                      className="w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <span>Market Overview</span>
                      <FieldHelpTooltip fieldId="marketOverviewSummary" />
                    </label>
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
                      className="w-full h-24 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Building className="h-5 w-5 mr-2 text-blue-600" /> Property Specifications
              </h2>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="totalResidentialUnits" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Total Residential Units</span>
                        <FieldHelpTooltip fieldId="totalResidentialUnits" />
                      </label>
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
                        data-field-id="totalResidentialUnits"
                        data-field-type="number"
                        data-field-section="property-specs"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="totalResidentialNRSF" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Total Residential NRSF</span>
                        <FieldHelpTooltip fieldId="totalResidentialNRSF" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Total Commercial GRSF</span>
                        <FieldHelpTooltip fieldId="totalCommercialGRSF" />
                      </label>
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
                        data-field-id="totalCommercialGRSF"
                        data-field-type="number"
                        data-field-section="property-specs"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="grossBuildingArea" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Gross Building Area</span>
                        <FieldHelpTooltip fieldId="grossBuildingArea" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Number of Stories</span>
                        <FieldHelpTooltip fieldId="numberOfStories" />
                      </label>
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
                        data-field-id="numberOfStories"
                        data-field-type="number"
                        data-field-section="property-specs"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="parkingSpaces" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Parking Spaces</span>
                        <FieldHelpTooltip fieldId="parkingSpaces" />
                      </label>
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
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-blue-600" /> Development Budget
              </h2>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="landAcquisition" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Land Acquisition</span>
                        <FieldHelpTooltip fieldId="landAcquisition" />
                      </label>
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
                        data-field-id="landAcquisition"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="baseConstruction" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Base Construction (Hard Cost)</span>
                        <FieldHelpTooltip fieldId="baseConstruction" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Contingency</span>
                        <FieldHelpTooltip fieldId="contingency" />
                      </label>
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
                        data-field-id="contingency"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="ffe" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>FF&E (Furniture, Fixtures & Equipment)</span>
                        <FieldHelpTooltip fieldId="ffe" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>A&E Fees (Architecture & Engineering)</span>
                        <FieldHelpTooltip fieldId="aeFees" />
                      </label>
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
                        data-field-id="aeFees"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="developerFee" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Developer Fee</span>
                        <FieldHelpTooltip fieldId="developerFee" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Interest Reserve</span>
                        <FieldHelpTooltip fieldId="interestReserve" />
                      </label>
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
                        data-field-id="interestReserve"
                        data-field-type="number"
                        data-field-section="dev-budget"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="workingCapital" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Working Capital</span>
                        <FieldHelpTooltip fieldId="workingCapital" />
                      </label>
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
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" /> Market Context
              </h2>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="submarketName" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Submarket Name</span>
                        <FieldHelpTooltip fieldId="submarketName" />
                      </label>
                      <Input
                        id="submarketName"
                        label={null}
                        value={(formData as any).submarketName || ""}
                        onChange={(e) =>
                          handleInputChange("submarketName", e.target.value)
                        }
                        placeholder="e.g., Downtown Dallas"
                        data-field-id="submarketName"
                        data-field-type="input"
                        data-field-section="market-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="walkabilityScore" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Walkability Score</span>
                        <FieldHelpTooltip fieldId="walkabilityScore" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Population (3-mile radius)</span>
                        <FieldHelpTooltip fieldId="population3Mi" />
                      </label>
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
                        data-field-id="population3Mi"
                        data-field-type="number"
                        data-field-section="market-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="medianHHIncome" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Median Household Income (3-mile)</span>
                        <FieldHelpTooltip fieldId="medianHHIncome" />
                      </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>% Renter Occupied (3-mile)</span>
                        <FieldHelpTooltip fieldId="renterOccupiedPercent" />
                      </label>
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
                        data-field-id="renterOccupiedPercent"
                        data-field-type="number"
                        data-field-section="market-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="popGrowth201020" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Population Growth (2010-2020)</span>
                        <FieldHelpTooltip fieldId="popGrowth201020" />
                      </label>
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
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-blue-600" /> Special Considerations
              </h2>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="opportunityZone" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Opportunity Zone?</span>
                        <FieldHelpTooltip fieldId="opportunityZone" />
                      </label>
                      <ButtonSelect
                        label=""
                        options={["Yes", "No"]}
                        selectedValue={(formData as any).opportunityZone ? "Yes" : (formData as any).opportunityZone === false ? "No" : ""}
                        onSelect={(value) =>
                          handleInputChange("opportunityZone", value === "Yes")
                        }
                        gridCols="grid-cols-2"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="affordableHousing" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Affordable Housing?</span>
                        <FieldHelpTooltip fieldId="affordableHousing" />
                      </label>
                      <ButtonSelect
                        label=""
                        options={["Yes", "No"]}
                        selectedValue={(formData as any).affordableHousing ? "Yes" : (formData as any).affordableHousing === false ? "No" : ""}
                        onSelect={(value) =>
                          handleInputChange("affordableHousing", value === "Yes")
                        }
                        gridCols="grid-cols-2"
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <span>Number of Affordable Units</span>
                            <FieldHelpTooltip fieldId="affordableUnitsNumber" />
                          </label>
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
                            data-field-id="affordableUnitsNumber"
                            data-field-type="number"
                            data-field-section="special-considerations"
                          />
                        </div>
                      </AskAIButton>
                    </FormGroup>
                    <FormGroup>
                      <AskAIButton id="amiTargetPercent" onAskAI={onAskAI || (() => {})}>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <span>AMI Target %</span>
                            <FieldHelpTooltip fieldId="amiTargetPercent" />
                          </label>
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Tax Exemption?</span>
                        <FieldHelpTooltip fieldId="taxExemption" />
                      </label>
                      <ButtonSelect
                        label=""
                        options={["Yes", "No"]}
                        selectedValue={(formData as any).taxExemption ? "Yes" : (formData as any).taxExemption === false ? "No" : ""}
                        onSelect={(value) =>
                          handleInputChange("taxExemption", value === "Yes")
                        }
                        gridCols="grid-cols-2"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="taxAbatement" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Tax Abatement?</span>
                        <FieldHelpTooltip fieldId="taxAbatement" />
                      </label>
                      <ButtonSelect
                        label=""
                        options={["Yes", "No"]}
                        selectedValue={(formData as any).taxAbatement ? "Yes" : (formData as any).taxAbatement === false ? "No" : ""}
                        onSelect={(value) =>
                          handleInputChange("taxAbatement", value === "Yes")
                        }
                        gridCols="grid-cols-2"
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
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" /> Timeline & Milestones
              </h2>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="groundbreakingDate" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Groundbreaking Date</span>
                        <FieldHelpTooltip fieldId="groundbreakingDate" />
                      </label>
                      <Input
                        id="groundbreakingDate"
                        type="date"
                        label={null}
                        value={(formData as any).groundbreakingDate || ""}
                        onChange={(e) =>
                          handleInputChange("groundbreakingDate", e.target.value)
                        }
                        data-field-id="groundbreakingDate"
                        data-field-type="date"
                        data-field-section="timeline"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="completionDate" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Completion Date</span>
                        <FieldHelpTooltip fieldId="completionDate" />
                      </label>
                      <Input
                        id="completionDate"
                        type="date"
                        label={null}
                        value={(formData as any).completionDate || ""}
                        onChange={(e) =>
                          handleInputChange("completionDate", e.target.value)
                        }
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>First Occupancy</span>
                        <FieldHelpTooltip fieldId="firstOccupancy" />
                      </label>
                      <Input
                        id="firstOccupancy"
                        type="date"
                        label={null}
                        value={(formData as any).firstOccupancy || ""}
                        onChange={(e) =>
                          handleInputChange("firstOccupancy", e.target.value)
                        }
                        data-field-id="firstOccupancy"
                        data-field-type="date"
                        data-field-section="timeline"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="stabilization" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Stabilization Date</span>
                        <FieldHelpTooltip fieldId="stabilization" />
                      </label>
                      <Input
                        id="stabilization"
                        type="date"
                        label={null}
                        value={(formData as any).stabilization || ""}
                        onChange={(e) =>
                          handleInputChange("stabilization", e.target.value)
                        }
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Entitlements Status</span>
                        <FieldHelpTooltip fieldId="entitlements" />
                      </label>
                      <ButtonSelect
                        label=""
                        options={["Approved", "Pending"]}
                        selectedValue={(formData as any).entitlements || ""}
                        onSelect={(value) =>
                          handleInputChange("entitlements", value)
                        }
                        gridCols="grid-cols-2"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="permitsIssued" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Permits Status</span>
                        <FieldHelpTooltip fieldId="permitsIssued" />
                      </label>
                      <ButtonSelect
                        label=""
                        options={["Issued", "Pending"]}
                        selectedValue={(formData as any).permitsIssued || ""}
                        onSelect={(value) =>
                          handleInputChange("permitsIssued", value)
                        }
                        gridCols="grid-cols-2"
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
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Map className="h-5 w-5 mr-2 text-blue-600" /> Site & Context
              </h2>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="totalSiteAcreage" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Total Site Acreage</span>
                        <FieldHelpTooltip fieldId="totalSiteAcreage" />
                      </label>
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
                        data-field-id="totalSiteAcreage"
                        data-field-type="number"
                        data-field-section="site-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="currentSiteStatus" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Current Site Status</span>
                        <FieldHelpTooltip fieldId="currentSiteStatus" />
                      </label>
                      <ButtonSelect
                        label=""
                        options={["Vacant", "Existing"]}
                        selectedValue={(formData as any).currentSiteStatus || ""}
                        onSelect={(value) =>
                          handleInputChange("currentSiteStatus", value)
                        }
                        gridCols="grid-cols-2"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="siteAccess" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Site Access</span>
                        <FieldHelpTooltip fieldId="siteAccess" />
                      </label>
                      <Input
                        id="siteAccess"
                        label={null}
                        value={(formData as any).siteAccess || ""}
                        onChange={(e) =>
                          handleInputChange("siteAccess", e.target.value)
                        }
                        placeholder="e.g., Hickory St, Ferris St"
                        data-field-id="siteAccess"
                        data-field-type="input"
                        data-field-section="site-context"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="proximityShopping" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Proximity to Shopping</span>
                        <FieldHelpTooltip fieldId="proximityShopping" />
                      </label>
                      <Input
                        id="proximityShopping"
                        label={null}
                        value={(formData as any).proximityShopping || ""}
                        onChange={(e) =>
                          handleInputChange("proximityShopping", e.target.value)
                        }
                        placeholder="e.g., Farmers Market, Deep Ellum nearby"
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
            <div className="mb-2">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" /> Sponsor Information
              </h2>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormGroup>
                  <AskAIButton id="sponsorEntityName" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Sponsor Entity Name</span>
                        <FieldHelpTooltip fieldId="sponsorEntityName" />
                      </label>
                      <Input
                        id="sponsorEntityName"
                        label={null}
                        value={(formData as any).sponsorEntityName || ""}
                        onChange={(e) =>
                          handleInputChange("sponsorEntityName", e.target.value)
                        }
                        placeholder="e.g., Hoque Global"
                        data-field-id="sponsorEntityName"
                        data-field-type="input"
                        data-field-section="sponsor-info"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="sponsorStructure" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Sponsor Structure</span>
                        <FieldHelpTooltip fieldId="sponsorStructure" />
                      </label>
                      <Input
                        id="sponsorStructure"
                        label={null}
                        value={(formData as any).sponsorStructure || ""}
                        onChange={(e) =>
                          handleInputChange("sponsorStructure", e.target.value)
                        }
                        placeholder="e.g., General Partner"
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Equity Partner</span>
                        <FieldHelpTooltip fieldId="equityPartner" />
                      </label>
                      <Input
                        id="equityPartner"
                        label={null}
                        value={(formData as any).equityPartner || ""}
                        onChange={(e) =>
                          handleInputChange("equityPartner", e.target.value)
                        }
                        placeholder="e.g., ACARA"
                        data-field-id="equityPartner"
                        data-field-type="input"
                        data-field-section="sponsor-info"
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="contactInfo" onAskAI={onAskAI || (() => {})}>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <span>Contact Info</span>
                        <FieldHelpTooltip fieldId="contactInfo" />
                      </label>
                      <textarea
                        id="contactInfo"
                        value={(formData as any).contactInfo || ""}
                        onChange={(e) =>
                          handleInputChange("contactInfo", e.target.value)
                        }
                        placeholder="e.g., Cody Field (415.202.3258), Joel Heikenfeld (972.455.1943)"
                        className="w-full h-20 px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    [formData, handleInputChange, onAskAI]
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
