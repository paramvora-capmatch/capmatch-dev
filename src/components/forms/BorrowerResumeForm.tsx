// src/components/forms/BorrowerResumeForm.tsx
"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../utils/cn";

import { FormWizard, Step } from "../ui/FormWizard";
import { FormGroup } from "../ui/Form";
import { Input } from "../ui/Input";
import { ButtonSelect } from "../ui/ButtonSelect";
import { Button } from "../ui/Button";
import {
  User,
  DollarSign,
  Globe,
  Award,
  Briefcase,
  AlertTriangle,
  Check,
  Edit,
  AlertCircle,
  ChevronDown,
  Copy,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  EntityStructure,
  ExperienceRange,
  DealValueRange,
  CreditScoreRange,
  NetWorthRange,
  LiquidityRange,
  Principal,
  PrincipalRole,
} from "../../types/enhanced-types";
import { BorrowerResumeContent } from "../../lib/project-queries";
import { MultiSelectPills } from "../ui/MultiSelectPills";
import { useProjectBorrowerResume } from "@/hooks/useProjectBorrowerResume";
import { AskAIButton } from "../ui/AskAIProvider";
import { BorrowerResumeView } from "./BorrowerResumeView";
import {
  BORROWER_REQUIRED_FIELDS,
  computeBorrowerCompletion,
} from "@/utils/resumeCompletion";

interface BorrowerResumeFormProps {
  projectId: string;
  onComplete?: (profile: BorrowerResumeContent | null) => void; // Allow null in callback
  onProgressChange?: (percent: number) => void;
  onFormDataChange?: (formData: Partial<BorrowerResumeContent>) => void; // Emit form data for AskAI
  onAskAI?: (fieldId: string) => void; // Trigger AskAI for a field
  progressPercent?: number;
  onCopyBorrowerResume?: () => void;
  copyDisabled?: boolean;
  copyLoading?: boolean;
  unstyled?: boolean;
}

// Options definitions (no changes)
const entityStructureOptions: EntityStructure[] = [
  "LLC",
  "LP",
  "S-Corp",
  "C-Corp",
  "Sole Proprietorship",
  "Trust",
  "Other",
];
const experienceRangeOptions: ExperienceRange[] = [
  "0-2",
  "3-5",
  "6-10",
  "11-15",
  "16+",
];
const dealValueRangeOptions: DealValueRange[] = [
  "N/A",
  "<$10M",
  "$10M-$50M",
  "$50M-$100M",
  "$100M-$250M",
  "$250M-$500M",
  "$500M+",
];
const creditScoreRangeOptions: CreditScoreRange[] = [
  "N/A",
  "<600",
  "600-649",
  "650-699",
  "700-749",
  "750-799",
  "800+",
];
const netWorthRangeOptions: NetWorthRange[] = [
  "<$1M",
  "$1M-$5M",
  "$5M-$10M",
  "$10M-$25M",
  "$25M-$50M",
  "$50M-$100M",
  "$100M+",
];
const liquidityRangeOptions: LiquidityRange[] = [
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

export const BorrowerResumeForm: React.FC<BorrowerResumeFormProps> = ({
  projectId,
  onComplete,
  onProgressChange,
  onFormDataChange,
  onAskAI,
  progressPercent,
  onCopyBorrowerResume,
  copyDisabled,
  copyLoading,
  unstyled = false,
}) => {
  const { user } = useAuth();
  const {
    content: borrowerResume,
    isLoading: resumeLoading,
    isSaving,
    save,
  } = useProjectBorrowerResume(projectId);
  // Principals removed from new schema - kept as empty array for form compatibility
  const principals: Principal[] = [];

  // State variables
  const [formSaved, setFormSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Default to view mode
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(
        typeof window !== "undefined"
          ? localStorage.getItem("borrowerResumeCollapsed") || "true"
          : "true"
      );
    } catch {
      return true;
    }
  });
  const [formData, setFormData] = useState<Partial<BorrowerResumeContent>>({});
  const [principalFormData, setPrincipalFormData] = useState<
    Partial<Principal>
  >({ principalRoleDefault: "Key Principal" });
  // Persist principals inside JSONB content via formData.principals
  const [isAddingPrincipal, setIsAddingPrincipal] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevIsSavingRef = useRef<boolean>(false);
  const lastInitializedSnapshot = useRef<string | null>(null);


  // Initialize form once on first load (avoid resetting on each store update)
  useEffect(() => {
    const defaultData: Partial<BorrowerResumeContent> = {
      primaryEntityStructure: "LLC",
      contactEmail: user?.email || "",
      yearsCREExperienceRange: "0-2",
      totalDealValueClosedRange: "N/A",
      creditScoreRange: "N/A",
      netWorthRange: "<$1M",
      liquidityRange: "<$100k",
      bankruptcyHistory: false,
      foreclosureHistory: false,
      litigationHistory: false,
      assetClassesExperience: [],
      geographicMarketsExperience: [],
    };
    const initialData = borrowerResume
      ? { ...defaultData, ...borrowerResume }
      : { ...defaultData };
    const snapshotKey = JSON.stringify(initialData);
    if (snapshotKey === lastInitializedSnapshot.current) {
      return;
    }
    lastInitializedSnapshot.current = snapshotKey;
    setFormData(initialData);
  }, [borrowerResume, user?.email, projectId]);

  const lastEmittedSnapshot = useRef<string | null>(null);

  // Emit form data for AskAI consumers when it changes
  useEffect(() => {
    const snapshotKey = JSON.stringify(formData);
    if (snapshotKey === lastEmittedSnapshot.current) {
      return;
    }
    lastEmittedSnapshot.current = snapshotKey;
    onFormDataChange?.(formData);
  }, [formData, onFormDataChange]);

  const showLoadingState = resumeLoading && !borrowerResume;

  // Debounced auto-save effect for profile form
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      // Only auto-save if we have existing resume content loaded
      // and the current form data is actually different
      if (!borrowerResume) return;
      const hasChanged = JSON.stringify(formData) !== JSON.stringify(borrowerResume);
      if (!hasChanged) return;
      try {
        const completenessPercent = computeBorrowerCompletion(formData);
        onProgressChange?.(completenessPercent);
        await save({
          ...formData,
          completenessPercent,
        });
      } catch (error) {
        console.error("[ProfileForm] Auto-save failed:", error);
      }
    }, 2000); // 2-second debounce

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [
    formData,
    borrowerResume,
    save,
    onProgressChange,
    projectId,
  ]);

  // Report progress on any local change immediately (for live banner updates)
  useEffect(() => {
    const completenessPercent = computeBorrowerCompletion(formData);
    onProgressChange?.(completenessPercent);
  }, [formData, onProgressChange]);

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem("borrowerResumeCollapsed", JSON.stringify(collapsed));
    } catch {}
  }, [collapsed]);

  // Track when saving completes to show "All Changes Saved"
  useEffect(() => {
    // If we transition from saving (true) to not saving (false), show the saved message
    if (prevIsSavingRef.current && !isSaving) {
      setJustSaved(true);
      // Clear any existing timeout
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      // Hide the message after 2 seconds
      savedTimeoutRef.current = setTimeout(() => {
        setJustSaved(false);
      }, 2000);
    }
    // Update the ref to track the previous state (default to false if undefined)
    prevIsSavingRef.current = isSaving ?? false;

    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, [isSaving]);

  // Input change handlers
  const handleInputChange = useCallback(
    (field: keyof BorrowerResumeContent, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );
  const handlePrincipalInputChange = useCallback(
    (field: keyof Principal, value: any) => {
      setPrincipalFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );
  const resetPrincipalForm = useCallback(() => {
    setPrincipalFormData({ principalRoleDefault: "Key Principal" });
  }, []); // Reset with default role

  // --- Submit Profile - Safest Context Access ---
  const handleProfileSubmit = useCallback(async () => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    try {
      setFormSaved(true);
      const completenessPercent = computeBorrowerCompletion(formData);
      onProgressChange?.(completenessPercent);
      await save({
        ...formData,
        completenessPercent,
      });

      if (onComplete) {
        // Pass the updated formData as the profile
        onComplete(formData as BorrowerResumeContent);
      }
    } catch (error) {
      console.error("Error saving borrower profile:", error);
      if (onComplete) onComplete(null); // Indicate failure in callback
    } finally {
      setTimeout(() => setFormSaved(false), 2000);
    }
  }, [
    formData,
    onComplete,
    save,
    onProgressChange,
  ]);

  // Principals removed from new schema - these functions are no-ops
  const handleAddPrincipal = useCallback(async () => {
    if (!isEditing) return;
    const name = (principalFormData.principalLegalName || "").trim();
    const role = (principalFormData.principalRoleDefault || "").trim();
    if (!name || !role) return; // require name and role

    setIsAddingPrincipal(true);
    try {
      const newPrincipal: Principal = {
        id: Math.random().toString(36).slice(2),
        principalLegalName: name,
        principalRoleDefault: (role as PrincipalRole),
        principalEmail: principalFormData.principalEmail || "",
        ownershipPercentage: principalFormData.ownershipPercentage || 0,
        principalBio: principalFormData.principalBio || "",
      } as Principal;

      setFormData((prev) => ({
        ...prev,
        principals: [ ...(prev.principals as Principal[] | undefined) || [], newPrincipal ],
      }));
      resetPrincipalForm();
    } finally {
      setIsAddingPrincipal(false);
    }
  }, [isEditing, principalFormData, resetPrincipalForm]);

  // handleRemovePrincipal removed as it's not used
  const handleRemovePrincipal = useCallback(async (id: string) => {
    console.warn("Principals are no longer supported in the new schema");
  }, []);

  // FormWizard Steps definition (useMemo)
  const steps: Step[] = useMemo(
    () => [
      // Step 1: Basic Info (JSX using ButtonSelect for Entity Structure)
      {
        id: "basic-info",
        title: "Basic Info",
        component: (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <User className="mr-2" /> Basic Info
              </h2>
            </div>
            <div className="space-y-6">
              {" "}
              <FormGroup>
                <AskAIButton id="fullLegalName" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="fullLegalName"
                    data-field-type="input"
                    data-field-section="entity-info"
                    data-field-required="true"
                    data-field-label="Full Legal Name"
                  >
                    <Input
                      id="fullLegalName"
                      label="Full Legal Name"
                      value={formData.fullLegalName || ""}
                      onChange={(e) =>
                        handleInputChange("fullLegalName", e.target.value)
                      }
                      required
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="primaryEntityName" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="primaryEntityName"
                    data-field-type="input"
                    data-field-section="entity-info"
                    data-field-required="true"
                    data-field-label="Primary Entity Name"
                  >
                    <Input
                      id="primaryEntityName"
                      label="Primary Entity Name"
                      value={formData.primaryEntityName || ""}
                      onChange={(e) =>
                        handleInputChange("primaryEntityName", e.target.value)
                      }
                      required
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="primaryEntityStructure" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="primaryEntityStructure"
                    data-field-type="button-select"
                    data-field-section="entity-info"
                    data-field-required="true"
                    data-field-label="Entity Structure"
                    data-field-options='["LLC","LP","S-Corp","C-Corp","Sole Proprietorship","Trust","Other"]'
                  >
                    <ButtonSelect
                      label="Entity Structure"
                      options={entityStructureOptions}
                      selectedValue={formData.primaryEntityStructure || "LLC"}
                      onSelect={(v) =>
                        handleInputChange(
                          "primaryEntityStructure",
                          v as EntityStructure
                        )
                      }
                      required
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                {" "}
                <Input
                  id="contactEmail"
                  type="email"
                  label="Contact Email"
                  value={formData.contactEmail || ""}
                  onChange={(e) =>
                    handleInputChange("contactEmail", e.target.value)
                  }
                  required
                  disabled
                />
              </FormGroup>
              <FormGroup>
                <AskAIButton id="contactPhone" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="contactPhone"
                    data-field-type="input"
                    data-field-section="entity-info"
                    data-field-required="true"
                    data-field-label="Contact Phone"
                  >
                    <Input
                      id="contactPhone"
                      label="Contact Phone"
                      value={formData.contactPhone || ""}
                      onChange={(e) =>
                        handleInputChange("contactPhone", e.target.value)
                      }
                      required
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="contactAddress" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="contactAddress"
                    data-field-type="input"
                    data-field-section="entity-info"
                    data-field-required="true"
                    data-field-label="Mailing Address"
                  >
                    <Input
                      id="contactAddress"
                      label="Mailing Address"
                      value={formData.contactAddress || ""}
                      onChange={(e) =>
                        handleInputChange("contactAddress", e.target.value)
                      }
                      required
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
            </div>
          </div>
        ),
      },
      // Step 2: Experience (JSX using ButtonSelect & MultiSelect)
      {
        id: "experience",
        title: "Experience",
        component: (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Briefcase className="mr-2" /> Experience
              </h2>
            </div>
            <div className="space-y-6">
              <FormGroup>
                <AskAIButton id="yearsCREExperienceRange" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="yearsCREExperienceRange"
                    data-field-type="button-select"
                    data-field-section="experience"
                    data-field-required="true"
                    data-field-label="Years of CRE Experience"
                    data-field-options='["0-2","3-5","6-10","11-15","16+"]'
                  >
                    <ButtonSelect
                      label="Years of CRE Experience"
                      options={experienceRangeOptions}
                      selectedValue={formData.yearsCREExperienceRange || "0-2"}
                      onSelect={(v) =>
                        handleInputChange(
                          "yearsCREExperienceRange",
                          v as ExperienceRange
                        )
                      }
                      required
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="assetClassesExperience" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="assetClassesExperience"
                    data-field-type="select"
                    data-field-section="experience"
                    data-field-required="false"
                    data-field-label="Asset Classes Experience"
                    data-field-options='["Multifamily","Office","Retail","Industrial","Hospitality","Land","Mixed-Use","Self-Storage","Data Center","Medical Office","Senior Housing","Student Housing","Other"]'
                  >
                    <MultiSelectPills
                      label="Asset Classes Experience"
                      options={assetClassOptions}
                      selectedValues={formData.assetClassesExperience || []}
                      onSelect={(v) =>
                        handleInputChange("assetClassesExperience", v)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="geographicMarketsExperience" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="geographicMarketsExperience"
                    data-field-type="select"
                    data-field-section="experience"
                    data-field-required="false"
                    data-field-label="Geographic Markets Experience"
                  >
                    <MultiSelectPills
                      label="Geographic Markets Experience"
                      options={geographicMarketsOptions}
                      selectedValues={formData.geographicMarketsExperience || []}
                      onSelect={(v) =>
                        handleInputChange("geographicMarketsExperience", v)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="totalDealValueClosedRange" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="totalDealValueClosedRange"
                    data-field-type="button-select"
                    data-field-section="experience"
                    data-field-required="false"
                    data-field-label="Total Value Deals Closed"
                  >
                    <ButtonSelect
                      label="Total Value Deals Closed"
                      options={dealValueRangeOptions}
                      selectedValue={formData.totalDealValueClosedRange || "N/A"}
                      onSelect={(v) =>
                        handleInputChange(
                          "totalDealValueClosedRange",
                          v as DealValueRange
                        )
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="existingLenderRelationships" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="existingLenderRelationships"
                    data-field-type="input"
                    data-field-section="experience"
                    data-field-required="false"
                    data-field-label="Existing Lenders (Opt)"
                  >
                    <Input
                      id="existingLenderRelationships"
                      label="Existing Lenders (Opt)"
                      value={formData.existingLenderRelationships || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "existingLenderRelationships",
                          e.target.value
                        )
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="bioNarrative" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="bioNarrative"
                    data-field-type="textarea"
                    data-field-section="experience"
                    data-field-required="false"
                    data-field-label="Bio (Opt)"
                  >
                    <label className="block text-sm font-medium mb-1">
                      Bio (Opt)
                    </label>
                    <textarea
                      id="bioNarrative"
                      value={formData.bioNarrative || ""}
                      onChange={(e) =>
                        handleInputChange("bioNarrative", e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-full h-24 border border-gray-300 rounded-md p-2 disabled:bg-gray-50 disabled:cursor-not-allowed focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
            </div>
          </div>
        ),
      },
      // Step 3: Financial Info (JSX using ButtonSelect & Checkboxes)
      {
        id: "financial",
        title: "Financial Info",
        component: (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <DollarSign className="mr-2" /> Financial Info
              </h2>
            </div>
            <div className="space-y-6">
              <FormGroup>
                <AskAIButton id="creditScoreRange" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="creditScoreRange"
                    data-field-type="button-select"
                    data-field-section="borrower-financials"
                    data-field-required="false"
                    data-field-label="Credit Score Range"
                    data-field-options='["N/A","<600","600-649","650-699","700-749","750-799","800+"]'
                  >
                    <ButtonSelect
                      label="Credit Score Range"
                      options={creditScoreRangeOptions}
                      selectedValue={formData.creditScoreRange || "N/A"}
                      onSelect={(v) =>
                        handleInputChange("creditScoreRange", v as CreditScoreRange)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="netWorthRange" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="netWorthRange"
                    data-field-type="button-select"
                    data-field-section="borrower-financials"
                    data-field-required="false"
                    data-field-label="Net Worth Range"
                  >
                    <ButtonSelect
                      label="Net Worth Range"
                      options={netWorthRangeOptions}
                      selectedValue={formData.netWorthRange || "<$1M"}
                      onSelect={(v) =>
                        handleInputChange("netWorthRange", v as NetWorthRange)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="liquidityRange" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="liquidityRange"
                    data-field-type="button-select"
                    data-field-section="borrower-financials"
                    data-field-required="false"
                    data-field-label="Liquidity Range"
                  >
                    <ButtonSelect
                      label="Liquidity Range"
                      options={liquidityRangeOptions}
                      selectedValue={formData.liquidityRange || "<$100k"}
                      onSelect={(v) =>
                        handleInputChange("liquidityRange", v as LiquidityRange)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <div className="p-4 bg-amber-50 rounded border border-amber-200">
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4" /> Financial
                  Background
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <AskAIButton id="bankruptcyHistory" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="bankruptcyHistory"
                    data-field-type="button"
                    data-field-section="borrower-financials"
                    data-field-required="false"
                    data-field-label="Bankruptcy (7yr)"
                  >
                  <Button
                    type="button"
                    variant={(formData.bankruptcyHistory || false) ? 'primary' : 'outline'}
                    onClick={() =>
                      handleInputChange("bankruptcyHistory", !(formData.bankruptcyHistory || false))
                    }
                    disabled={!isEditing}
                    className={cn(
                      "justify-center w-full px-2 py-1.5 md:px-3 md:py-2 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 text-xs md:text-sm",
                      (formData.bankruptcyHistory || false)
                        ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    Bankruptcy (7yr)
                  </Button>
                  </div>
                  </AskAIButton>
                  <AskAIButton id="foreclosureHistory" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="foreclosureHistory"
                    data-field-type="button"
                    data-field-section="borrower-financials"
                    data-field-required="false"
                    data-field-label="Foreclosure (7yr)"
                  >
                  <Button
                    type="button"
                    variant={(formData.foreclosureHistory || false) ? 'primary' : 'outline'}
                    onClick={() =>
                      handleInputChange("foreclosureHistory", !(formData.foreclosureHistory || false))
                    }
                    disabled={!isEditing}
                    className={cn(
                      "justify-center w-full px-2 py-1.5 md:px-3 md:py-2 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 text-xs md:text-sm",
                      (formData.foreclosureHistory || false)
                        ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    Foreclosure (7yr)
                  </Button>
                  </div>
                  </AskAIButton>
                  <AskAIButton id="litigationHistory" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="litigationHistory"
                    data-field-type="button"
                    data-field-section="borrower-financials"
                    data-field-required="false"
                    data-field-label="Litigation"
                  >
                  <Button
                    type="button"
                    variant={(formData.litigationHistory || false) ? 'primary' : 'outline'}
                    onClick={() =>
                      handleInputChange("litigationHistory", !(formData.litigationHistory || false))
                    }
                    disabled={!isEditing}
                    className={cn(
                      "justify-center w-full px-2 py-1.5 md:px-3 md:py-2 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 text-xs md:text-sm",
                      (formData.litigationHistory || false)
                        ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    Litigation
                  </Button>
                  </div>
                  </AskAIButton>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      // Step 4: Online Presence (JSX - Optional)
      {
        id: "online-presence",
        title: "Online Presence",
        isOptional: true,
        component: (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Globe className="mr-2" /> Online Presence (Opt)
              </h2>
            </div>
            <div className="space-y-6">
              <FormGroup>
                <AskAIButton id="linkedinUrl" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="linkedinUrl"
                    data-field-type="input"
                    data-field-section="online-presence"
                    data-field-required="false"
                    data-field-label="LinkedIn URL"
                  >
                    <Input
                      id="linkedinUrl"
                      label="LinkedIn URL"
                      value={formData.linkedinUrl || ""}
                      onChange={(e) =>
                        handleInputChange("linkedinUrl", e.target.value)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="websiteUrl" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="websiteUrl"
                    data-field-type="input"
                    data-field-section="online-presence"
                    data-field-required="false"
                    data-field-label="Company Website"
                  >
                    <Input
                      id="websiteUrl"
                      label="Company Website"
                      value={formData.websiteUrl || ""}
                      onChange={(e) =>
                        handleInputChange("websiteUrl", e.target.value)
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
            </div>
          </div>
        ),
      },
      // Step 5: Key Principals (JSX - Optional, uses ButtonSelect for Role)
      {
        id: "principals",
        title: "Key Principals",
        isOptional: true,
        component: (
          <div className="space-y-6">
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Award className="mr-2" /> Key Principals (Opt)
              </h2>
            </div>
            <div className="space-y-6">
              {/* Add Principal (unstyled container to match page theme) */}
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Add Principal</h3>
              {/* Name full width */}
              <FormGroup>
                <Input
                  id="pName"
                  label={<span>Name <span className="text-red-500">*</span></span>}
                  value={principalFormData.principalLegalName || ""}
                  onChange={(e) =>
                    handlePrincipalInputChange(
                      "principalLegalName",
                      e.target.value
                    )
                  }
                  required
                  disabled={!isEditing}
                />
              </FormGroup>
              {/* Role on next line, full width */}
              <FormGroup>
                <ButtonSelect
                  label="Role"
                  options={principalRoleOptions}
                  selectedValue={
                    principalFormData.principalRoleDefault || "Key Principal"
                  }
                  onSelect={(v) =>
                    handlePrincipalInputChange(
                      "principalRoleDefault",
                      v as PrincipalRole
                    )
                  }
                  required
                  disabled={!isEditing}
                  buttonClassName="text-sm"
                  gridCols="grid-cols-8"
                />
              </FormGroup>
              {/* Email & Ownership side by side */}
              <div className="grid md:grid-cols-2 gap-4">
                <FormGroup>
                  <Input
                    id="pEmail"
                    type="email"
                    label="Email"
                    value={principalFormData.principalEmail || ""}
                    onChange={(e) =>
                      handlePrincipalInputChange("principalEmail", e.target.value)
                    }
                    disabled={!isEditing}
                  />
                </FormGroup>
                <FormGroup>
                  <Input
                    id="pOwn"
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    step="0.01"
                    label="Ownership (%)"
                    value={
                      principalFormData.ownershipPercentage?.toString() || ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value || "";
                      const cleaned = raw.replace(/[^\d.]/g, "");
                      const bounded = Math.max(0, Math.min(100, Number(cleaned || 0)));
                      handlePrincipalInputChange("ownershipPercentage", bounded);
                    }}
                    min="0"
                    max="100"
                    disabled={!isEditing}
                  />
                </FormGroup>
              </div>
              {/* Bio full width */}
              <FormGroup>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio (Opt)</label>
                <textarea
                  id="pBio"
                  value={principalFormData.principalBio || ""}
                  onChange={(e) =>
                    handlePrincipalInputChange("principalBio", e.target.value)
                  }
                  rows={2}
                  disabled={!isEditing}
                  className="w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-50 disabled:cursor-not-allowed focus:ring-blue-500 focus:border-blue-500"
                />
              </FormGroup>
              <Button
                onClick={handleAddPrincipal}
                variant="secondary"
                isLoading={isAddingPrincipal}
                disabled={
                  !isEditing ||
                  isAddingPrincipal ||
                  !(principalFormData.principalLegalName || '').trim() ||
                  !(principalFormData.principalRoleDefault || '').trim()
                }
                className="mt-1"
              >
                Add
              </Button>

              {Array.isArray((formData as any).principals) && (formData as any).principals.length > 0 && (
                <div className="mt-4">
                   <h4 className="text-sm font-semibold text-gray-700 mb-2">Principals</h4>
                  <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200">
                    {(formData as any).principals.map((p: Principal) => (
                      <li key={p.id} className="p-3 text-sm text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="font-medium">{p.principalLegalName}</span>
                        <span className="text-gray-500">• {p.principalRoleDefault}</span>
                        {p.principalEmail && <span className="text-gray-500">• {p.principalEmail}</span>}
                        {typeof p.ownershipPercentage === 'number' && (
                          <span className="text-gray-500">• {p.ownershipPercentage}%</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ),
      },
      // Review & Save step removed; autosave covers all updates
    ],
    [
      formData,
      principalFormData,
      isAddingPrincipal,
      handleInputChange,
      handleAddPrincipal,
      handlePrincipalInputChange,
      onAskAI,
      isEditing,
    ]
  );

  // Collapsed: no custom sizing; simple overflow control
  const containerCollapsedClasses = 'overflow-hidden';
  const containerExpandedClasses = 'overflow-visible';

  return (
    <div
      className={cn(
        'h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:shadow-blue-100/30 cursor-pointer',
        collapsed ? containerCollapsedClasses : containerExpandedClasses
      )}
      aria-expanded={!collapsed}
      role="button"
      tabIndex={0}
      onClick={() => { if (!isEditing) setCollapsed((v) => !v); }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isEditing) {
          e.preventDefault();
          setCollapsed((v) => !v);
        }
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {/* Header with Edit button */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm rounded-t-2xl flex flex-row items-center justify-between relative px-3 py-4">
        <div className="ml-3 flex items-center gap-3">
          <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
            <AlertCircle className="h-5 w-5 text-blue-600 mr-2 animate-pulse" />
            Borrower Resume
          </h2>
          {typeof progressPercent === "number" && (
            <span className="text-sm font-semibold text-gray-500">
              {progressPercent}% complete
            </span>
          )}
          {/* Edit button first */}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) {
                // Cancel: revert to saved resume data
                if (borrowerResume) {
                  const nextData = { ...borrowerResume };
                  setFormData(nextData);
                }
              }
              setIsEditing(!isEditing);
            }}
            className={cn(
              "flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base",
              isEditing ? "" : ""
            )}
          >
            {isEditing ? (
              <>
                <Check className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[90px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">Done</span>
              </>
            ) : (
              <>
                <Edit className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[80px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">Edit</span>
              </>
            )}
          </Button>
          {onCopyBorrowerResume && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCopyBorrowerResume();
              }}
              disabled={copyDisabled}
              isLoading={copyLoading}
              className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base"
            >
              {copyLoading ? (
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Copying...
                </span>
              ) : (
                <>
                  <Copy className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[190px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                    Copy From Another Project
                  </span>
                </>
              )}
            </Button>
          )}
          {/* Collapse/expand button (only when not editing) */}
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
              aria-label={collapsed ? 'Expand resume' : 'Collapse resume'}
              className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base"
            >
              <ChevronDown className={cn("h-5 w-5 text-gray-600 flex-shrink-0 transition-transform duration-200", collapsed ? '' : 'rotate-180')} />
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[170px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                {collapsed ? 'Show Borrower Details' : 'Hide Borrower Details'}
              </span>
            </Button>
          )}
        </div>
        {/* Save/changed indicator on the right when editing */}
        {isEditing && (isSaving || justSaved) && (
          <div className="flex items-center text-xs text-gray-500 mr-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="ml-2">Saving…</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="ml-2 text-green-600">All Changes Saved</span>
              </>
            )}
          </div>
        )}
      </div>
      {showLoadingState ? (
        <div className="flex justify-center items-center h-32 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading borrower resume...
        </div>
      ) : isEditing ? (
        <div className="p-6 relative z-10">
          <FormWizard
            steps={steps}
            onComplete={handleProfileSubmit}
            showProgressBar={false}
            showStepIndicators={false}
            allowSkip={true}
            variant="tabs"
            showBottomNav={true}
          />
        </div>
      ) : (
        !collapsed && <BorrowerResumeView resume={formData} />
      )}
    </div>
  );
};
