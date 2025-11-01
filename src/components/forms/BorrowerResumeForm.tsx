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
import { Card, CardContent, CardHeader } from "../ui/card";
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
import { MultiSelect } from "../ui/MultiSelect";
import { MultiSelectPills } from "../ui/MultiSelectPills";
import { useBorrowerResumeStore } from "../../stores/useBorrowerResumeStore";

interface BorrowerResumeFormProps {
  onComplete?: (profile: BorrowerResumeContent | null) => void; // Allow null in callback
  onProgressChange?: (percent: number) => void;
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
  onComplete,
  onProgressChange,
}) => {
  const { user } = useAuth();
  const { content: borrowerResume, saveForOrg, isSaving } = useBorrowerResumeStore();
  // Principals removed from new schema - kept as empty array for form compatibility
  const principals: Principal[] = [];

  // State variables
  const [formSaved, setFormSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [formData, setFormData] = useState<Partial<BorrowerResumeContent>>({});
  const [principalFormData, setPrincipalFormData] = useState<
    Partial<Principal>
  >({ principalRoleDefault: "Key Principal" });
  const [isAddingPrincipal, setIsAddingPrincipal] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevIsSavingRef = useRef<boolean>(false);
  const initializedRef = useRef(false);

  const computeCompletionPercent = useCallback((data: Partial<BorrowerResumeContent>): number => {
    // Fields to consider for completion
    const fields: (keyof BorrowerResumeContent)[] = [
      'fullLegalName',
      'primaryEntityName',
      'primaryEntityStructure', // default counts as completed
      'contactEmail', // default from user email counts as completed
      'contactPhone',
      'contactAddress',
      'bioNarrative',
      'linkedinUrl',
      'websiteUrl',
      'yearsCREExperienceRange', // default counts as completed
      'assetClassesExperience',
      'geographicMarketsExperience',
      'totalDealValueClosedRange', // default counts as completed
      'existingLenderRelationships',
      'creditScoreRange', // default counts as completed
      'netWorthRange', // default counts as completed
      'liquidityRange', // default counts as completed
      // booleans considered answered only when true (explicit signal)
      'bankruptcyHistory',
      'foreclosureHistory',
      'litigationHistory',
    ];

    let answered = 0;
    const total = fields.length;

    fields.forEach((key) => {
      const value = (data as any)[key];
      if (Array.isArray(value)) {
        if (value.length > 0) answered += 1;
      } else if (typeof value === 'string') {
        if (value && value.trim().length > 0) answered += 1;
      } else if (typeof value === 'boolean') {
        if (value === true) answered += 1;
      } else if (value != null) {
        answered += 1;
      }
    });

    return Math.min(100, Math.round((answered / Math.max(1, total)) * 100));
  }, []);

  // Initialize form once on first load (avoid resetting on each store update)
  useEffect(() => {
    if (initializedRef.current) return;
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
    setFormData(borrowerResume ? { ...borrowerResume } : { ...defaultData });
    // Mark initialized after first set (when either default or resume is applied)
    initializedRef.current = true;
  }, [borrowerResume, user?.email]);

  // Debounced auto-save effect for profile form
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      if (
        borrowerResume &&
        JSON.stringify(formData) !== JSON.stringify(borrowerResume)
      ) {
        try {
          const completenessPercent = computeCompletionPercent(formData);
          onProgressChange?.(completenessPercent);
          await saveForOrg({ ...formData, completenessPercent });
        } catch (error) {
          console.error("[ProfileForm] Auto-save failed:", error);
        }
      }
    }, 2000); // 2-second debounce

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [formData, borrowerResume, saveForOrg, computeCompletionPercent, onProgressChange]);

  // Report progress on any local change immediately (for live banner updates)
  useEffect(() => {
    const completenessPercent = computeCompletionPercent(formData);
    onProgressChange?.(completenessPercent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

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
  const resetPrincipalForm = () => {
    setPrincipalFormData({ principalRoleDefault: "Key Principal" });
  }; // Reset with default role

  // --- Submit Profile - Safest Context Access ---
  const handleProfileSubmit = useCallback(async () => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    try {
      setFormSaved(true);
      const completenessPercent = computeCompletionPercent(formData);
      onProgressChange?.(completenessPercent);
      await saveForOrg({ ...formData, completenessPercent });

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
  }, [formData, onComplete, saveForOrg, computeCompletionPercent, onProgressChange]);

  // Principals removed from new schema - these functions are no-ops
  const handleAddPrincipal = useCallback(async () => {
    console.warn("Principals are no longer supported in the new schema");
  }, []);

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
          <Card>
            {" "}
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center">
                  <User className="mr-2" /> Basic Info
                </h2>
                {(isSaving || justSaved) && (
                  <div className="flex items-center text-xs text-gray-500">
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
            </CardHeader>{" "}
            <CardContent className="p-4 space-y-6">
              {" "}
              <FormGroup>
                {" "}
                <Input
                  id="fullLegalName"
                  label="Full Legal Name"
                  value={formData.fullLegalName || ""}
                  onChange={(e) =>
                    handleInputChange("fullLegalName", e.target.value)
                  }
                  required
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
                <Input
                  id="primaryEntityName"
                  label="Primary Entity Name"
                  value={formData.primaryEntityName || ""}
                  onChange={(e) =>
                    handleInputChange("primaryEntityName", e.target.value)
                  }
                  required
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
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
                />{" "}
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
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
                <Input
                  id="contactPhone"
                  label="Contact Phone"
                  value={formData.contactPhone || ""}
                  onChange={(e) =>
                    handleInputChange("contactPhone", e.target.value)
                  }
                  required
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
                <Input
                  id="contactAddress"
                  label="Mailing Address"
                  value={formData.contactAddress || ""}
                  onChange={(e) =>
                    handleInputChange("contactAddress", e.target.value)
                  }
                  required
                />{" "}
              </FormGroup>
            </CardContent>{" "}
          </Card>
        ),
      },
      // Step 2: Experience (JSX using ButtonSelect & MultiSelect)
      {
        id: "experience",
        title: "Experience",
        component: (
          <Card>
            {" "}
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center">
                  <Briefcase className="mr-2" /> Experience
                </h2>
                {(isSaving || justSaved) && (
                  <div className="flex items-center text-xs text-gray-500">
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
            </CardHeader>{" "}
            <CardContent className="p-4 space-y-6">
              <FormGroup>
                {" "}
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
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
                <MultiSelectPills
                  label="Asset Classes Experience"
                  options={assetClassOptions}
                  selectedValues={formData.assetClassesExperience || []}
                  onSelect={(v) =>
                    handleInputChange("assetClassesExperience", v)
                  }
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
                <MultiSelectPills
                  label="Geographic Markets Experience"
                  options={geographicMarketsOptions}
                  selectedValues={formData.geographicMarketsExperience || []}
                  onSelect={(v) =>
                    handleInputChange("geographicMarketsExperience", v)
                  }
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
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
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
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
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
                <label className="block text-sm font-medium mb-1">
                  Bio (Opt)
                </label>{" "}
                <textarea
                  id="bioNarrative"
                  value={formData.bioNarrative || ""}
                  onChange={(e) =>
                    handleInputChange("bioNarrative", e.target.value)
                  }
                  className="w-full h-24 border rounded p-2"
                />{" "}
              </FormGroup>
            </CardContent>{" "}
          </Card>
        ),
      },
      // Step 3: Financial Info (JSX using ButtonSelect & Checkboxes)
      {
        id: "financial",
        title: "Financial Info",
        component: (
          <Card>
            {" "}
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center">
                  <DollarSign className="mr-2" /> Financial Info
                </h2>
                {(isSaving || justSaved) && (
                  <div className="flex items-center text-xs text-gray-500">
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
            </CardHeader>{" "}
            <CardContent className="p-4 space-y-6">
              <FormGroup>
                {" "}
                <ButtonSelect
                  label="Credit Score Range"
                  options={creditScoreRangeOptions}
                  selectedValue={formData.creditScoreRange || "N/A"}
                  onSelect={(v) =>
                    handleInputChange("creditScoreRange", v as CreditScoreRange)
                  }
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
                <ButtonSelect
                  label="Net Worth Range"
                  options={netWorthRangeOptions}
                  selectedValue={formData.netWorthRange || "<$1M"}
                  onSelect={(v) =>
                    handleInputChange("netWorthRange", v as NetWorthRange)
                  }
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
                <ButtonSelect
                  label="Liquidity Range"
                  options={liquidityRangeOptions}
                  selectedValue={formData.liquidityRange || "<$100k"}
                  onSelect={(v) =>
                    handleInputChange("liquidityRange", v as LiquidityRange)
                  }
                />{" "}
              </FormGroup>
              <div className="p-4 bg-amber-50 rounded border border-amber-200">
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4" /> Financial
                  Background
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={(formData.bankruptcyHistory || false) ? 'primary' : 'outline'}
                    onClick={() =>
                      handleInputChange("bankruptcyHistory", !(formData.bankruptcyHistory || false))
                    }
                    className={cn(
                      "justify-center w-full px-2 py-1.5 md:px-3 md:py-2 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 text-xs md:text-sm",
                      (formData.bankruptcyHistory || false)
                        ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    Bankruptcy (7yr)
                  </Button>
                  <Button
                    type="button"
                    variant={(formData.foreclosureHistory || false) ? 'primary' : 'outline'}
                    onClick={() =>
                      handleInputChange("foreclosureHistory", !(formData.foreclosureHistory || false))
                    }
                    className={cn(
                      "justify-center w-full px-2 py-1.5 md:px-3 md:py-2 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 text-xs md:text-sm",
                      (formData.foreclosureHistory || false)
                        ? 'ring-2 ring-blue-500 ring-offset-1 shadow-md'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    Foreclosure (7yr)
                  </Button>
                  <Button
                    type="button"
                    variant={(formData.litigationHistory || false) ? 'primary' : 'outline'}
                    onClick={() =>
                      handleInputChange("litigationHistory", !(formData.litigationHistory || false))
                    }
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
              </div>
            </CardContent>{" "}
          </Card>
        ),
      },
      // Step 4: Online Presence (JSX - Optional)
      {
        id: "online-presence",
        title: "Online Presence",
        isOptional: true,
        component: (
          <Card>
            {" "}
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center">
                  <Globe className="mr-2" /> Online Presence (Opt)
                </h2>
                {(isSaving || justSaved) && (
                  <div className="flex items-center text-xs text-gray-500">
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
            </CardHeader>{" "}
            <CardContent className="p-4 space-y-6">
              <FormGroup>
                {" "}
                <Input
                  id="linkedinUrl"
                  label="LinkedIn URL"
                  value={formData.linkedinUrl || ""}
                  onChange={(e) =>
                    handleInputChange("linkedinUrl", e.target.value)
                  }
                />{" "}
              </FormGroup>
              <FormGroup>
                {" "}
                <Input
                  id="websiteUrl"
                  label="Company Website"
                  value={formData.websiteUrl || ""}
                  onChange={(e) =>
                    handleInputChange("websiteUrl", e.target.value)
                  }
                />{" "}
              </FormGroup>
            </CardContent>{" "}
          </Card>
        ),
      },
      // Step 5: Key Principals (JSX - Optional, uses ButtonSelect for Role)
      {
        id: "principals",
        title: "Key Principals",
        isOptional: true,
        component: (
          <Card>
            {" "}
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center">
                  <Award className="mr-2" /> Key Principals (Opt)
                </h2>
                {(isSaving || justSaved) && (
                  <div className="flex items-center text-xs text-gray-500">
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
            </CardHeader>{" "}
            <CardContent className="p-4 space-y-6">
              <div className="border rounded p-4 bg-gray-50">
                <h3 className="text-lg font-semibold mb-4">Add Principal</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <FormGroup>
                    {" "}
                    <Input
                      id="pName"
                      label="Name"
                      value={principalFormData.principalLegalName || ""}
                      onChange={(e) =>
                        handlePrincipalInputChange(
                          "principalLegalName",
                          e.target.value
                        )
                      }
                      required
                    />{" "}
                  </FormGroup>
                  <FormGroup>
                    {" "}
                    <ButtonSelect
                      label="Role"
                      options={principalRoleOptions}
                      selectedValue={
                        principalFormData.principalRoleDefault ||
                        "Key Principal"
                      }
                      onSelect={(v) =>
                        handlePrincipalInputChange(
                          "principalRoleDefault",
                          v as PrincipalRole
                        )
                      }
                      required
                    />{" "}
                  </FormGroup>
                  <FormGroup>
                    {" "}
                    <Input
                      id="pEmail"
                      type="email"
                      label="Email"
                      value={principalFormData.principalEmail || ""}
                      onChange={(e) =>
                        handlePrincipalInputChange(
                          "principalEmail",
                          e.target.value
                        )
                      }
                    />{" "}
                  </FormGroup>
                  <FormGroup>
                    {" "}
                    <Input
                      id="pOwn"
                      type="number"
                      label="Ownership (%)"
                      value={
                        principalFormData.ownershipPercentage?.toString() || ""
                      }
                      onChange={(e) =>
                        handlePrincipalInputChange(
                          "ownershipPercentage",
                          Number(e.target.value || 0)
                        )
                      }
                      min="0"
                      max="100"
                    />{" "}
                  </FormGroup>
                  <div className="md:col-span-2">
                    <FormGroup>
                      <label className="block text-sm mb-1">Bio (Opt)</label>
                      <textarea
                        id="pBio"
                        value={principalFormData.principalBio || ""}
                        onChange={(e) =>
                          handlePrincipalInputChange(
                            "principalBio",
                            e.target.value
                          )
                        }
                        rows={2}
                        className="w-full border rounded p-2"
                      />{" "}
                    </FormGroup>
                  </div>
                </div>
                <Button
                  onClick={handleAddPrincipal}
                  variant="secondary"
                  isLoading={isAddingPrincipal}
                  disabled={isAddingPrincipal || !borrowerResume?.fullLegalName}
                  className="mt-3"
                >
                  Add
                </Button>
              </div>{" "}
            </CardContent>{" "}
          </Card>
        ),
      },
      // Review & Save step removed; autosave covers all updates
    ],
    [
      formData,
      principalFormData,
      isAddingPrincipal,
      isSaving,
      justSaved,
      handleInputChange,
      handleAddPrincipal,
      handlePrincipalInputChange,
      borrowerResume?.fullLegalName,
    ]
  );

  return (
    <FormWizard
      steps={steps}
      onComplete={handleProfileSubmit}
      showProgressBar={false}
      showStepIndicators={false}
      allowSkip={true}
      variant="tabs"
    />
  );
};
