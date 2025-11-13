// src/components/forms/AdvisorResumeForm.tsx
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
import { Button } from "../ui/Button";
import {
  User,
  Globe,
  Briefcase,
  Check,
  Edit,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { AdvisorResumeContent } from "../../lib/project-queries";
import { MultiSelectPills } from "../ui/MultiSelectPills";
import { useAdvisorResume } from "@/hooks/useAdvisorResume";
import { AdvisorResumeView } from "./AdvisorResumeView";
import {
  ADVISOR_REQUIRED_FIELDS,
  computeAdvisorCompletion,
} from "@/utils/resumeCompletion";

interface AdvisorResumeFormProps {
  orgId: string;
  onComplete?: (profile: AdvisorResumeContent | null) => void;
  onProgressChange?: (percent: number) => void;
  progressPercent?: number;
}

const specialtyOptions = [
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
  "Debt Placement",
  "Equity Placement",
  "Refinancing",
  "Construction Loans",
  "Bridge Loans",
  "Permanent Loans",
];

export const AdvisorResumeForm: React.FC<AdvisorResumeFormProps> = ({
  orgId,
  onComplete,
  onProgressChange,
  progressPercent,
}) => {
  const { user } = useAuth();
  const {
    content: advisorResume,
    isLoading: resumeLoading,
    isSaving,
    save,
  } = useAdvisorResume(orgId);

  // State variables
  const [formSaved, setFormSaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(
        typeof window !== "undefined"
          ? localStorage.getItem("advisorResumeCollapsed") || "true"
          : "true"
      );
    } catch {
      return true;
    }
  });
  const [formData, setFormData] = useState<Partial<AdvisorResumeContent>>({});
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevIsSavingRef = useRef<boolean>(false);
  const lastInitializedSnapshot = useRef<string | null>(null);


  // Initialize form once on first load
  useEffect(() => {
    const defaultData: Partial<AdvisorResumeContent> = {
      email: user?.email || "",
      specialties: [],
      yearsExperience: 0,
    };
    const initialData = advisorResume
      ? { ...defaultData, ...advisorResume }
      : { ...defaultData };
    const snapshotKey = JSON.stringify(initialData);
    if (snapshotKey === lastInitializedSnapshot.current) {
      return;
    }
    lastInitializedSnapshot.current = snapshotKey;
    setFormData(initialData);
  }, [advisorResume, user?.email, orgId]);

  const showLoadingState = resumeLoading && !advisorResume;

  // Debounced auto-save effect
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(async () => {
      if (!advisorResume) return;
      const hasChanged = JSON.stringify(formData) !== JSON.stringify(advisorResume);
      if (!hasChanged) return;
      try {
        const completenessPercent = computeAdvisorCompletion(formData);
        onProgressChange?.(completenessPercent);
        await save({
          ...formData,
          completenessPercent,
        });
      } catch (error) {
        console.error("[AdvisorResumeForm] Auto-save failed:", error);
      }
    }, 2000);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [
    formData,
    advisorResume,
    save,
    onProgressChange,
    orgId,
  ]);

  // Report progress on any local change immediately
  useEffect(() => {
    const completenessPercent = computeAdvisorCompletion(formData);
    onProgressChange?.(completenessPercent);
  }, [formData, onProgressChange]);

  // Persist collapsed state
  useEffect(() => {
    try {
      localStorage.setItem("advisorResumeCollapsed", JSON.stringify(collapsed));
    } catch {}
  }, [collapsed]);

  // Track when saving completes
  useEffect(() => {
    if (prevIsSavingRef.current && !isSaving) {
      setJustSaved(true);
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
      savedTimeoutRef.current = setTimeout(() => {
        setJustSaved(false);
      }, 2000);
    }
    prevIsSavingRef.current = isSaving ?? false;

    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, [isSaving]);

  // Input change handlers
  const handleInputChange = useCallback(
    (field: keyof AdvisorResumeContent, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Submit handler
  const handleProfileSubmit = useCallback(async () => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    try {
      setFormSaved(true);
      const completenessPercent = computeAdvisorCompletion(formData);
      onProgressChange?.(completenessPercent);
      await save({
        ...formData,
        completenessPercent,
      });

      if (onComplete) {
        onComplete(formData as AdvisorResumeContent);
      }
    } catch (error) {
      console.error("Error saving advisor profile:", error);
      if (onComplete) onComplete(null);
    } finally {
      setTimeout(() => setFormSaved(false), 2000);
    }
  }, [
    formData,
    onComplete,
    save,
    onProgressChange,
  ]);

  // FormWizard Steps definition
  const steps: Step[] = useMemo(
    () => [
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
              <FormGroup>
                <Input
                  id="name"
                  label="Name"
                  value={formData.name || ""}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                  disabled={!isEditing}
                />
              </FormGroup>
              <FormGroup>
                <Input
                  id="title"
                  label="Title"
                  value={formData.title || ""}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                  disabled={!isEditing}
                />
              </FormGroup>
              <FormGroup>
                <Input
                  id="email"
                  type="email"
                  label="Email"
                  value={formData.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  disabled
                />
              </FormGroup>
              <FormGroup>
                <Input
                  id="phone"
                  label="Phone"
                  value={formData.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  required
                  disabled={!isEditing}
                />
              </FormGroup>
              <FormGroup>
                <Input
                  id="company"
                  label="Company"
                  value={formData.company || ""}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  disabled={!isEditing}
                />
              </FormGroup>
              <FormGroup>
                <Input
                  id="location"
                  label="Location"
                  value={formData.location || ""}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  disabled={!isEditing}
                />
              </FormGroup>
              <FormGroup>
                <label className="block text-sm font-medium mb-1">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={formData.bio || ""}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  disabled={!isEditing}
                  className="w-full h-24 border border-gray-300 rounded-md p-2 disabled:bg-gray-50 disabled:cursor-not-allowed focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </FormGroup>
            </div>
          </div>
        ),
      },
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
                <Input
                  id="yearsExperience"
                  type="number"
                  label="Years of Experience"
                  value={formData.yearsExperience?.toString() || "0"}
                  onChange={(e) =>
                    handleInputChange("yearsExperience", parseInt(e.target.value) || 0)
                  }
                  required
                  disabled={!isEditing}
                  min="0"
                />
              </FormGroup>
              <FormGroup>
                <MultiSelectPills
                  label="Specialties"
                  options={specialtyOptions}
                  selectedValues={formData.specialties || []}
                  onSelect={(v) => handleInputChange("specialties", v)}
                  required
                  disabled={!isEditing}
                />
              </FormGroup>
              <FormGroup>
                <label className="block text-sm font-medium mb-1">
                  Education
                </label>
                <textarea
                  id="education"
                  value={formData.education || ""}
                  onChange={(e) => handleInputChange("education", e.target.value)}
                  disabled={!isEditing}
                  className="w-full h-24 border border-gray-300 rounded-md p-2 disabled:bg-gray-50 disabled:cursor-not-allowed focus:ring-blue-500 focus:border-blue-500"
                />
              </FormGroup>
              <FormGroup>
                <label className="block text-sm font-medium mb-1">
                  Certifications
                </label>
                <Input
                  id="certifications"
                  label="Certifications (comma-separated)"
                  value={formData.certifications?.join(", ") || ""}
                  onChange={(e) => {
                    const certs = e.target.value
                      .split(",")
                      .map((c) => c.trim())
                      .filter((c) => c.length > 0);
                    handleInputChange("certifications", certs);
                  }}
                  disabled={!isEditing}
                  placeholder="CFA, CPA, etc."
                />
              </FormGroup>
            </div>
          </div>
        ),
      },
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
                <Input
                  id="linkedinUrl"
                  label="LinkedIn URL"
                  value={formData.linkedinUrl || ""}
                  onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
                  disabled={!isEditing}
                />
              </FormGroup>
              <FormGroup>
                <Input
                  id="websiteUrl"
                  label="Website"
                  value={formData.websiteUrl || ""}
                  onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                  disabled={!isEditing}
                />
              </FormGroup>
            </div>
          </div>
        ),
      },
    ],
    [formData, handleInputChange, isEditing]
  );

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
            Advisor Resume
          </h2>
          {typeof progressPercent === "number" && (
            <span className="text-sm font-semibold text-gray-500">
              {progressPercent}% complete
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (isEditing) {
                if (advisorResume) {
                  const nextData = { ...advisorResume };
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
                {collapsed ? 'Show Advisor Details' : 'Hide Advisor Details'}
              </span>
            </Button>
          )}
        </div>
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
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading advisor resume...
        </div>
      ) : isEditing ? (
        <div className="flex-1 flex flex-col min-h-0 relative z-10 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
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
        </div>
      ) : (
        !collapsed && <AdvisorResumeView resume={formData} />
      )}
    </div>
  );
};

