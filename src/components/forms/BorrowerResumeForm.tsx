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
  Lock,
  Unlock,
  Sparkles,
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
import { useProjectBorrowerResumeRealtime } from "@/hooks/useProjectBorrowerResumeRealtime";
import { useAutofill } from "@/hooks/useAutofill";
import { AskAIButton } from "../ui/AskAIProvider";
import { FieldHelpTooltip } from "../ui/FieldHelpTooltip";
import { BorrowerResumeVersionHistory } from "./BorrowerResumeVersionHistory";
import { BorrowerResumeView } from "./BorrowerResumeView";
import { AnimatePresence, motion } from "framer-motion";
import {
  BORROWER_REQUIRED_FIELDS,
  computeBorrowerCompletion,
} from "@/utils/resumeCompletion";
import { normalizeSource } from "@/utils/sourceNormalizer";

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
    isRemoteUpdate,
    reload: reloadBorrowerResume,
  } = useProjectBorrowerResumeRealtime(projectId);
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
  
  // Metadata state for tracking sources and warnings (similar to EnhancedProjectForm)
  const [fieldMetadata, setFieldMetadata] = useState<
    Record<
      string,
      {
        source?: string | null;
        sources?: string[];
        warnings?: string[];
        value?: any;
        original_value?: any;
        original_source?: string | null;
      }
    >
  >({});
  const [showCompletionPercent, setShowCompletionPercent] = useState(true);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevIsSavingRef = useRef<boolean>(false);
  const lastInitializedSnapshot = useRef<string | null>(null);

  // Lock state management
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set());
  const [lockedSections, setLockedSections] = useState<Set<string>>(new Set());
  const [unlockedFields, setUnlockedFields] = useState<Set<string>>(new Set()); // Fields explicitly unlocked even when section is locked

  // Autofill state
  const { isAutofilling, showSparkles, handleAutofill: startAutofill } = useAutofill(projectId, {
    context: "borrower",
  });
  const [showAutofillSuccess, setShowAutofillSuccess] = useState(false);
  const [autofillAnimationKey, setAutofillAnimationKey] = useState(0);

  const handleVersionRollbackSuccess = useCallback(async () => {
    await reloadBorrowerResume();
    setIsEditing(false);
    // Trigger refresh animation similar to project resume
    const newKey = autofillAnimationKey + 1;
    setAutofillAnimationKey(newKey);
    setShowAutofillSuccess(true);
    setTimeout(() => {
      setShowAutofillSuccess(false);
    }, 4000);
    // Ensure resume is expanded to show the animation
    if (collapsed) {
      setCollapsed(false);
    }
  }, [reloadBorrowerResume, setIsEditing, autofillAnimationKey, collapsed]);

  const handleVersionHistoryOpen = useCallback(() => {
    setCollapsed(false);
  }, []);

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
        "fullLegalName",
        "primaryEntityName",
        "primaryEntityStructure",
        "contactEmail",
        "contactPhone",
        "contactAddress",
      ],
      "experience": [
        "yearsCREExperienceRange",
        "assetClassesExperience",
        "geographicMarketsExperience",
        "totalDealValueClosedRange",
        "existingLenderRelationships",
        "bioNarrative",
      ],
      "borrower-financials": [
        "creditScoreRange",
        "netWorthRange",
        "liquidityRange",
        "bankruptcyHistory",
        "foreclosureHistory",
        "litigationHistory",
      ],
      "online-presence": [
        "linkedinUrl",
        "websiteUrl",
      ],
      "principals": [
        "principalLegalName",
        "principalRoleDefault",
        "principalEmail",
        "ownershipPercentage",
        "principalBio",
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
    required: boolean = false
  ) => {
    return (
      <div className="flex items-center gap-2 mb-1 relative group/field">
        <label className="block text-sm font-medium text-gray-700">
          {labelText}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <FieldHelpTooltip fieldId={fieldId} />
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
      </div>
    );
  }, [onAskAI, renderFieldLockButton]);

  // Handle autofill button click
  const handleAutofill = useCallback(async () => {
    const newKey = autofillAnimationKey + 1;

    const showSuccess = () => {
      setAutofillAnimationKey(newKey);
      setShowAutofillSuccess(true);
      setTimeout(() => {
        setShowAutofillSuccess(false);
      }, 4000);
    };

    if (!isEditing && !collapsed) {
      showSuccess();
    } else if (!isEditing && collapsed) {
      setCollapsed(false);
      setTimeout(() => {
        showSuccess();
      }, 350);
    }

    try {
      await startAutofill();
    } catch (error) {
      console.error("Borrower autofill failed:", error);
    }
  }, [isEditing, collapsed, autofillAnimationKey, startAutofill]);

  // Helper function to check if a field value is valid (not null, empty, or invalid)
  const isValidFieldValue = useCallback(
    (value: any): boolean => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === "object" && Object.keys(value).length === 0) return false;
      return true;
    },
    []
  );

  // Helper function to check if a field is autofilled (has source that's not user_input AND has valid value)
  const isFieldAutofilled = useCallback(
    (fieldId: string): boolean => {
      const meta = fieldMetadata[fieldId];
      if (!meta) return false;

      // Check if source exists and is not User Input (normalized)
      const source = meta.source || meta.sources?.[0];
      if (!source) return false;
      
      // Normalize source to check against "User Input"
      const normalizedSource = normalizeSource(source);
      const isUserInput = normalizedSource.toLowerCase() === "user input" || 
                         source.toLowerCase() === "user_input" ||
                         source.toLowerCase() === "user input";
      
      // If source is "User Input", it can't be autofilled by AI
      if (isUserInput) return false;

      // Check if field has a valid value
      const fieldValue = formData[fieldId as keyof typeof formData];
      const hasValidValue = isValidFieldValue(fieldValue);

      // Field is autofilled only if it has both a valid source AND a valid value
      return hasValidValue;
    },
    [fieldMetadata, formData, isValidFieldValue]
  );

  // Helper function to get field styling classes based on autofill status
  const getFieldStylingClasses = useCallback(
    (fieldId: string, baseClasses?: string): string => {
      const isAutofilled = isFieldAutofilled(fieldId);

      if (isAutofilled) {
        // Green styling for autofilled fields - matches View OM button (emerald-600/700)
        return cn(
          baseClasses,
          "border-emerald-500 bg-emerald-50 focus:ring-emerald-500 focus:border-emerald-600",
          "hover:border-emerald-600 transition-colors"
        );
      } else {
        // Blue styling for user input fields - matches send button (blue-600)
        return cn(
          baseClasses,
          "border-blue-600 bg-blue-50 focus:ring-blue-600 focus:border-blue-600",
          "hover:border-blue-700 transition-colors"
        );
      }
    },
    [isFieldAutofilled]
  );

  // Initialize form once on first load (avoid resetting on each store update)
  // Don't reset formData if user is editing (preserves their work in progress)
  useEffect(() => {
    // Skip updating formData if user is actively editing
    if (isEditing) {
      return;
    }
    
    const defaultData: Partial<BorrowerResumeContent> = {};
    const extractedData: Partial<BorrowerResumeContent> = {};
    const extractedMetadata: typeof fieldMetadata = {};

    // Extract data and metadata from borrowerResume
    if (borrowerResume) {
      for (const [key, value] of Object.entries(borrowerResume)) {
        if (key === "_metadata") continue;
        
        // Check if value is in rich format { value, source, warnings }
        if (value && typeof value === "object" && "value" in value && "source" in value) {
          extractedData[key as keyof BorrowerResumeContent] = value.value;
          extractedMetadata[key] = {
            source: value.source,
            warnings: value.warnings || [],
            value: value.value,
            original_value: value.value,
            original_source: value.source,
          };
        } else {
          // Flat format - just the value
          extractedData[key as keyof BorrowerResumeContent] = value;
        }
      }
    }

    const initialData = { ...defaultData, ...extractedData };
    const snapshotKey = JSON.stringify(initialData);
    if (snapshotKey === lastInitializedSnapshot.current) {
      return;
    }
    lastInitializedSnapshot.current = snapshotKey;
    setFormData(initialData);
    setFieldMetadata(extractedMetadata);
  }, [borrowerResume, user?.email, projectId, isEditing]);

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
      setFormData((prev) => {
        const nextFormData = { ...prev, [field]: value };

        // Update metadata to track source changes immediately
        setFieldMetadata((prevMeta) => {
          const currentMeta = prevMeta[field as string];
          if (!currentMeta) {
            // No metadata tracking for this field - create new entry
            const newMeta: Record<string, any> = {
              ...prevMeta,
              [field as string]: {
                value: value,
                source: "user_input",
                original_value: value,
                warnings: [],
              },
            };
            return newMeta;
          }

          // Check if value actually changed from the original AI extraction
          const hasOriginalValue =
            currentMeta.original_value !== undefined &&
            currentMeta.original_value !== null;
          const isChanged =
            hasOriginalValue &&
            JSON.stringify(value) !==
              JSON.stringify(currentMeta.original_value);
          const updatedMeta = { ...currentMeta };

          // Always update the value, but preserve original_value
          updatedMeta.value = value;
          updatedMeta.original_value =
            currentMeta.original_value !== undefined
              ? currentMeta.original_value
              : value;

          // IMMEDIATELY update source to user_input when user types (regardless of whether it changed)
          const wasUserInput = normalizeSource(currentMeta.source || "").toLowerCase() === "user input" ||
                                currentMeta.source === "user_input";
          
          if (!wasUserInput) {
            // Field was autofilled - mark as user input immediately
            updatedMeta.source = "user_input";
            
            // Preserve original_source if not set
            if (!updatedMeta.original_source && currentMeta.source) {
              updatedMeta.original_source = currentMeta.source;
            }

            // Add divergence warning if value changed from original
            if (isChanged && hasOriginalValue) {
              const existingWarnings = currentMeta.warnings || [];
              const divergenceWarnings: string[] = [];

              const originalValueStr =
                typeof currentMeta.original_value === "object"
                  ? JSON.stringify(currentMeta.original_value)
                  : String(currentMeta.original_value);
              const currentValueStr =
                typeof value === "object"
                  ? JSON.stringify(value)
                  : String(value);

              if (currentMeta.original_source === "knowledge_base" || 
                  (currentMeta.source && currentMeta.source.toLowerCase().includes("census"))) {
                divergenceWarnings.push(
                  `Value differs from market data (original: ${originalValueStr}, current: ${currentValueStr})`
                );
              } else if (currentMeta.original_source === "document" || 
                         (currentMeta.source && (
                           currentMeta.source.toLowerCase().includes("document") ||
                           currentMeta.source.endsWith(".pdf") ||
                           currentMeta.source.endsWith(".xlsx") ||
                           currentMeta.source.endsWith(".docx")
                         ))) {
                divergenceWarnings.push(
                  `Value differs from extracted document data (original: ${originalValueStr}, current: ${currentValueStr})`
                );
              } else if (currentMeta.source && currentMeta.source !== "user_input") {
                divergenceWarnings.push(
                  `Value changed from original (original: ${originalValueStr}, current: ${currentValueStr})`
                );
              }

              updatedMeta.warnings = [...existingWarnings];
              divergenceWarnings.forEach((warning) => {
                if (!updatedMeta.warnings?.includes(warning)) {
                  updatedMeta.warnings = [...(updatedMeta.warnings || []), warning];
                }
              });
            } else {
              // User is typing but hasn't changed from original yet - still mark as user_input
              updatedMeta.warnings = currentMeta.warnings || [];
            }
          } else if (!isChanged && hasOriginalValue) {
            // User typed back the original value - revert to original state
            updatedMeta.source =
              currentMeta.original_source || "user_input";
            const originalWarnings = currentMeta.warnings || [];
            updatedMeta.warnings = originalWarnings.filter(
              (w) =>
                !w.includes("differs from") &&
                !w.includes("Value differs") &&
                !w.includes("Value changed from original")
            );
          } else {
            // Already user input or no original value
            updatedMeta.source = "user_input";
            updatedMeta.warnings = currentMeta.warnings || [];
            if (updatedMeta.original_value === undefined) {
              updatedMeta.original_value = value;
            }
          }

          return {
            ...prevMeta,
            [field as string]: updatedMeta,
          };
        });

        return nextFormData;
      });
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <User className="mr-2" /> Basic Info
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
            <div className="space-y-6">
              {" "}
              <FormGroup>
                <AskAIButton id="fullLegalName" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="fullLegalName"
                    data-field-type="input"
                    data-field-section="basic-info"
                    data-field-required="true"
                    data-field-label="Full Legal Name"
                    className="relative group/field"
                  >
                    {renderFieldLabel("fullLegalName", "basic-info", "Full Legal Name", true)}
                    <Input
                      id="fullLegalName"
                      label={null}
                      value={formData.fullLegalName || ""}
                      onChange={(e) =>
                        handleInputChange("fullLegalName", e.target.value)
                      }
                      required
                      disabled={!isEditing || isFieldLocked("fullLegalName", "basic-info")}
                      className={cn(
                        isFieldLocked("fullLegalName", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75",
                        !isFieldLocked("fullLegalName", "basic-info") && isEditing && getFieldStylingClasses("fullLegalName")
                      )}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="primaryEntityName" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="primaryEntityName"
                    data-field-type="input"
                    data-field-section="basic-info"
                    data-field-required="true"
                    data-field-label="Primary Entity Name"
                    className="relative group/field"
                  >
                    {renderFieldLabel("primaryEntityName", "basic-info", "Primary Entity Name", true)}
                    <Input
                      id="primaryEntityName"
                      label={null}
                      value={formData.primaryEntityName || ""}
                      onChange={(e) =>
                        handleInputChange("primaryEntityName", e.target.value)
                      }
                      required
                      disabled={!isEditing || isFieldLocked("primaryEntityName", "basic-info")}
                      className={cn(
                        isFieldLocked("primaryEntityName", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75",
                        !isFieldLocked("primaryEntityName", "basic-info") && isEditing && getFieldStylingClasses("primaryEntityName")
                      )}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="primaryEntityStructure" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="primaryEntityStructure"
                    data-field-type="button-select"
                    data-field-section="basic-info"
                    data-field-required="true"
                    data-field-label="Entity Structure"
                    data-field-options='["LLC","LP","S-Corp","C-Corp","Sole Proprietorship","Trust","Other"]'
                    className="relative group/field"
                  >
                    {renderFieldLabel("primaryEntityStructure", "basic-info", "Entity Structure", true)}
                    <ButtonSelect
                      label=""
                      options={entityStructureOptions}
                      selectedValue={formData.primaryEntityStructure || "LLC"}
                      onSelect={(v) =>
                        handleInputChange(
                          "primaryEntityStructure",
                          v as EntityStructure
                        )
                      }
                      disabled={!isEditing || isFieldLocked("primaryEntityStructure", "basic-info")}
                      isAutofilled={isFieldAutofilled("primaryEntityStructure")}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="contactEmail" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="contactEmail"
                    data-field-type="input"
                    data-field-section="basic-info"
                    data-field-required="true"
                    data-field-label="Contact Email"
                    className="relative group/field"
                  >
                    {renderFieldLabel("contactEmail", "basic-info", "Contact Email", true)}
                    <Input
                      id="contactEmail"
                      type="email"
                      label={null}
                      value={formData.contactEmail || ""}
                      onChange={(e) =>
                        handleInputChange("contactEmail", e.target.value)
                      }
                      required
                      disabled={!isEditing || isFieldLocked("contactEmail", "basic-info")}
                      className={cn(
                        isFieldLocked("contactEmail", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75",
                        !isFieldLocked("contactEmail", "basic-info") && isEditing && getFieldStylingClasses("contactEmail")
                      )}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="contactPhone" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="contactPhone"
                    data-field-type="input"
                    data-field-section="basic-info"
                    data-field-required="true"
                    data-field-label="Contact Phone"
                    className="relative group/field"
                  >
                    {renderFieldLabel("contactPhone", "basic-info", "Contact Phone", true)}
                    <Input
                      id="contactPhone"
                      label={null}
                      value={formData.contactPhone || ""}
                      onChange={(e) =>
                        handleInputChange("contactPhone", e.target.value)
                      }
                      required
                      disabled={!isEditing || isFieldLocked("contactPhone", "basic-info")}
                      className={cn(
                        isFieldLocked("contactPhone", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75",
                        !isFieldLocked("contactPhone", "basic-info") && isEditing && getFieldStylingClasses("contactPhone")
                      )}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <FormGroup>
                <AskAIButton id="contactAddress" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="contactAddress"
                    data-field-type="input"
                    data-field-section="basic-info"
                    data-field-required="true"
                    data-field-label="Mailing Address"
                    className="relative group/field"
                  >
                    {renderFieldLabel("contactAddress", "basic-info", "Mailing Address", true)}
                    <Input
                      id="contactAddress"
                      label={null}
                      value={formData.contactAddress || ""}
                      onChange={(e) =>
                        handleInputChange("contactAddress", e.target.value)
                      }
                      required
                      disabled={!isEditing || isFieldLocked("contactAddress", "basic-info")}
                      className={cn(
                        isFieldLocked("contactAddress", "basic-info") && "bg-gray-50 cursor-not-allowed opacity-75",
                        !isFieldLocked("contactAddress", "basic-info") && isEditing && getFieldStylingClasses("contactAddress")
                      )}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Briefcase className="mr-2" /> Experience
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("experience")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("experience")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("experience") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("experience") ? (
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
                    className="relative group/field"
                  >
                    {renderFieldLabel("yearsCREExperienceRange", "experience", "Years of CRE Experience", true)}
                    <ButtonSelect
                      label=""
                      options={experienceRangeOptions}
                      selectedValue={formData.yearsCREExperienceRange || "0-2"}
                      onSelect={(v) =>
                        handleInputChange(
                          "yearsCREExperienceRange",
                          v as ExperienceRange
                        )
                      }
                      disabled={!isEditing || isFieldLocked("yearsCREExperienceRange", "experience")}
                      isAutofilled={isFieldAutofilled("yearsCREExperienceRange")}
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
                    className="relative group/field"
                  >
                    {renderFieldLabel("assetClassesExperience", "experience", "Asset Classes Experience", false)}
                    <MultiSelectPills
                      label=""
                      options={assetClassOptions}
                      selectedValues={formData.assetClassesExperience || []}
                      onSelect={(v) =>
                        handleInputChange("assetClassesExperience", v)
                      }
                      disabled={!isEditing}
                      isAutofilled={isFieldAutofilled("assetClassesExperience")}
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
                    className="relative group/field"
                  >
                    {renderFieldLabel("geographicMarketsExperience", "experience", "Geographic Markets Experience", false)}
                    <MultiSelectPills
                      label=""
                      options={geographicMarketsOptions}
                      selectedValues={formData.geographicMarketsExperience || []}
                      onSelect={(v) =>
                        handleInputChange("geographicMarketsExperience", v)
                      }
                      disabled={!isEditing}
                      isAutofilled={isFieldAutofilled("geographicMarketsExperience")}
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
                    className="relative group/field"
                  >
                    {renderFieldLabel("totalDealValueClosedRange", "experience", "Total Value Deals Closed", false)}
                    <ButtonSelect
                      label=""
                      options={dealValueRangeOptions}
                      selectedValue={formData.totalDealValueClosedRange || "N/A"}
                      onSelect={(v) =>
                        handleInputChange(
                          "totalDealValueClosedRange",
                          v as DealValueRange
                        )
                      }
                      disabled={!isEditing}
                      isAutofilled={isFieldAutofilled("totalDealValueClosedRange")}
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
                    className="relative group/field"
                  >
                    {renderFieldLabel("existingLenderRelationships", "experience", "Existing Lenders (Opt)", false)}
                    <Input
                      id="existingLenderRelationships"
                      label={null}
                      value={formData.existingLenderRelationships || ""}
                      onChange={(e) =>
                        handleInputChange(
                          "existingLenderRelationships",
                          e.target.value
                        )
                      }
                      disabled={!isEditing}
                      className={cn(
                        isEditing && getFieldStylingClasses("existingLenderRelationships")
                      )}
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
                    className="relative group/field"
                  >
                    {renderFieldLabel("bioNarrative", "experience", "Bio (Opt)", false)}
                    <textarea
                      id="bioNarrative"
                      value={formData.bioNarrative || ""}
                      onChange={(e) =>
                        handleInputChange("bioNarrative", e.target.value)
                      }
                      disabled={!isEditing}
                      className={cn(
                        "w-full h-24 rounded-md p-2 disabled:bg-gray-50 disabled:cursor-not-allowed",
                        isEditing ? getFieldStylingClasses("bioNarrative") : "border border-gray-300"
                      )}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <DollarSign className="mr-2" /> Financial Info
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("borrower-financials")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("borrower-financials")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("borrower-financials") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("borrower-financials") ? (
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
                    className="relative group/field"
                  >
                    {renderFieldLabel("creditScoreRange", "borrower-financials", "Credit Score Range", false)}
                    <ButtonSelect
                      label=""
                      options={creditScoreRangeOptions}
                      selectedValue={formData.creditScoreRange || "N/A"}
                      onSelect={(v) =>
                        handleInputChange("creditScoreRange", v as CreditScoreRange)
                      }
                      disabled={!isEditing || isFieldLocked("creditScoreRange", "borrower-financials")}
                      isAutofilled={isFieldAutofilled("creditScoreRange")}
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
                    className="relative group/field"
                  >
                    {renderFieldLabel("netWorthRange", "borrower-financials", "Net Worth Range", false)}
                    <ButtonSelect
                      label=""
                      options={netWorthRangeOptions}
                      selectedValue={formData.netWorthRange || "<$1M"}
                      onSelect={(v) =>
                        handleInputChange("netWorthRange", v as NetWorthRange)
                      }
                      disabled={!isEditing}
                      isAutofilled={isFieldAutofilled("netWorthRange")}
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
                    className="relative group/field"
                  >
                    {renderFieldLabel("liquidityRange", "borrower-financials", "Liquidity Range", false)}
                    <ButtonSelect
                      label=""
                      options={liquidityRangeOptions}
                      selectedValue={formData.liquidityRange || "<$100k"}
                      onSelect={(v) =>
                        handleInputChange("liquidityRange", v as LiquidityRange)
                      }
                      disabled={!isEditing}
                      isAutofilled={isFieldAutofilled("liquidityRange")}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              <div className="p-4 bg-amber-50 rounded border border-amber-200">
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4" /> Financial
                  Background
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <AskAIButton id="bankruptcyHistory" onAskAI={onAskAI || (() => {})}>
                    <div
                      data-field-id="bankruptcyHistory"
                      data-field-type="button"
                      data-field-section="borrower-financials"
                      data-field-required="false"
                      data-field-label="Bankruptcy (7yr)"
                      className="relative group/field"
                    >
                      {renderFieldLabel("bankruptcyHistory", "borrower-financials", "Bankruptcy (7yr)", false)}
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
                        Yes
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
                      className="relative group/field"
                    >
                      {renderFieldLabel("foreclosureHistory", "borrower-financials", "Foreclosure (7yr)", false)}
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
                        Yes
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
                      className="relative group/field"
                    >
                      {renderFieldLabel("litigationHistory", "borrower-financials", "Litigation", false)}
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
                        Yes
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Globe className="mr-2" /> Online Presence (Opt)
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("online-presence")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("online-presence")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("online-presence") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("online-presence") ? (
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
            <div className="space-y-6">
              <FormGroup>
                <AskAIButton id="linkedinUrl" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="linkedinUrl"
                    data-field-type="input"
                    data-field-section="online-presence"
                    data-field-required="false"
                    data-field-label="LinkedIn URL"
                    className="relative group/field"
                  >
                    {renderFieldLabel("linkedinUrl", "online-presence", "LinkedIn URL", false)}
                    <Input
                      id="linkedinUrl"
                      label={null}
                      value={formData.linkedinUrl || ""}
                      onChange={(e) =>
                        handleInputChange("linkedinUrl", e.target.value)
                      }
                      disabled={!isEditing || isFieldLocked("linkedinUrl", "online-presence")}
                      className={cn(
                        isFieldLocked("linkedinUrl", "online-presence") && "bg-gray-50 cursor-not-allowed opacity-75",
                        !isFieldLocked("linkedinUrl", "online-presence") && isEditing && getFieldStylingClasses("linkedinUrl")
                      )}
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
                    className="relative group/field"
                  >
                    {renderFieldLabel("websiteUrl", "online-presence", "Company Website", false)}
                    <Input
                      id="websiteUrl"
                      label={null}
                      value={formData.websiteUrl || ""}
                      onChange={(e) =>
                        handleInputChange("websiteUrl", e.target.value)
                      }
                      disabled={!isEditing || isFieldLocked("websiteUrl", "online-presence")}
                      className={cn(
                        isFieldLocked("websiteUrl", "online-presence") && "bg-gray-50 cursor-not-allowed opacity-75",
                        !isFieldLocked("websiteUrl", "online-presence") && isEditing && getFieldStylingClasses("websiteUrl")
                      )}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Award className="mr-2" /> Key Principals (Opt)
              </h2>
              <button
                type="button"
                onClick={() => toggleSectionLock("principals")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  lockedSections.has("principals")
                    ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                )}
                title={lockedSections.has("principals") ? "Unlock section" : "Lock section"}
              >
                {lockedSections.has("principals") ? (
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
            <div className="space-y-6">
              {/* Add Principal (unstyled container to match page theme) */}
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Add Principal</h3>
              {/* Name full width */}
              <FormGroup>
                <AskAIButton id="principalLegalName" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="principalLegalName"
                    data-field-type="input"
                    data-field-section="principals"
                    data-field-required="true"
                    data-field-label="Principal Name"
                    className="relative group/field"
                  >
                    {renderFieldLabel("principalLegalName", "principals", "Name", true)}
                    <Input
                      id="pName"
                      label={null}
                      value={principalFormData.principalLegalName || ""}
                      onChange={(e) =>
                        handlePrincipalInputChange(
                          "principalLegalName",
                          e.target.value
                        )
                      }
                      required
                      disabled={!isEditing || isFieldLocked("principalLegalName", "principals")}
                      className={cn(
                        isFieldLocked("principalLegalName", "principals") && "bg-gray-50 cursor-not-allowed opacity-75"
                      )}
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              {/* Role on next line, full width */}
              <FormGroup>
                <AskAIButton id="principalRoleDefault" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="principalRoleDefault"
                    data-field-type="button-select"
                    data-field-section="principals"
                    data-field-required="true"
                    data-field-label="Principal Role"
                    data-field-options='["Managing Member","General Partner","Developer","Sponsor","Key Principal","Guarantor","Limited Partner","Other"]'
                    className="relative group/field"
                  >
                    {renderFieldLabel("principalRoleDefault", "principals", "Role", true)}
                    <ButtonSelect
                      label=""
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
                      disabled={!isEditing}
                      buttonClassName="text-sm"
                      gridCols="grid-cols-8"
                    />
                  </div>
                </AskAIButton>
              </FormGroup>
              {/* Email & Ownership side by side */}
              <div className="grid md:grid-cols-2 gap-4">
                <FormGroup>
                  <AskAIButton id="principalEmail" onAskAI={onAskAI || (() => {})}>
                    <div
                      data-field-id="principalEmail"
                      data-field-type="input"
                      data-field-section="principals"
                      data-field-required="false"
                      data-field-label="Principal Email"
                      className="relative group/field"
                    >
                      {renderFieldLabel("principalEmail", "principals", "Email", false)}
                      <Input
                        id="pEmail"
                        type="email"
                        label={null}
                        value={principalFormData.principalEmail || ""}
                        onChange={(e) =>
                          handlePrincipalInputChange("principalEmail", e.target.value)
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  </AskAIButton>
                </FormGroup>
                <FormGroup>
                  <AskAIButton id="ownershipPercentage" onAskAI={onAskAI || (() => {})}>
                    <div
                      data-field-id="ownershipPercentage"
                      data-field-type="input"
                      data-field-section="principals"
                      data-field-required="false"
                      data-field-label="Ownership Percentage"
                      className="relative group/field"
                    >
                      {renderFieldLabel("ownershipPercentage", "principals", "Ownership (%)", false)}
                      <Input
                        id="pOwn"
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        step="0.01"
                        label={null}
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
                    </div>
                  </AskAIButton>
                </FormGroup>
              </div>
              {/* Bio full width */}
              <FormGroup>
                <AskAIButton id="principalBio" onAskAI={onAskAI || (() => {})}>
                  <div
                    data-field-id="principalBio"
                    data-field-type="textarea"
                    data-field-section="principals"
                    data-field-required="false"
                    data-field-label="Principal Bio"
                    className="relative group/field"
                  >
                    {renderFieldLabel("principalBio", "principals", "Bio (Opt)", false)}
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
                  </div>
                </AskAIButton>
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
      lockedSections,
      isFieldLocked,
      renderFieldLabel,
      toggleSectionLock,
      getFieldStylingClasses,
      isFieldAutofilled,
    ]
  );

  // Handle showing/hiding completion percentage with delay
  const handleMouseEnter = () => {
    setShowCompletionPercent(false);
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    // Wait for buttons to collapse (300ms) plus a small buffer before showing
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
    }
    completionTimeoutRef.current = setTimeout(() => {
      setShowCompletionPercent(true);
    }, 350); // 300ms button collapse + 50ms buffer
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group transition-all duration-700 ease-in-out cursor-pointer hover:shadow-lg hover:shadow-blue-100/40 hover:border-blue-200/50 hover:-translate-y-0.5 will-change-transform"
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out pointer-events-none will-change-opacity" />
      {/* Header with Edit button */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm rounded-t-2xl flex flex-col relative px-3 py-3">
        {/* First row: Title and primary actions */}
        <div className="flex items-center justify-between mb-2">
          <div className="ml-3 flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center flex-shrink-0">
              Borrower Resume
            </h2>
            {typeof progressPercent === "number" && showCompletionPercent && (
              <span className="text-sm font-semibold text-gray-500 flex-shrink-0">
                {progressPercent}% complete
              </span>
            )}
          </div>
          {/* Save/changed indicator when editing */}
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
        {/* Second row: Action buttons */}
        <div className="ml-3 flex items-center gap-3 flex-wrap">
          {/* Edit button */}
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
            className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-visible text-base flex-shrink-0"
          >
            {isEditing ? (
              <>
                <Check className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[90px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-visible">Done</span>
              </>
            ) : (
              <>
                <Edit className="h-5 w-5 text-gray-600 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[80px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-visible">Edit</span>
              </>
            )}
          </Button>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setCollapsed((v) => !v); }}
              aria-label={collapsed ? 'Expand resume' : 'Collapse resume'}
              className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-visible text-base flex-shrink-0"
            >
              <ChevronDown className={cn("h-5 w-5 text-gray-600 flex-shrink-0 transition-transform duration-200", collapsed ? '' : 'rotate-180')} />
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[160px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-visible">
                {collapsed ? 'Show Borrower Details' : 'Hide Borrower Details'}
              </span>
            </Button>
          )}
          {/* Autofill button - show in both edit and view modes */}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleAutofill();
            }}
            disabled={isAutofilling}
            className={cn(
              "group relative flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border transition-all duration-300 overflow-visible text-base flex-shrink-0",
              isAutofilling
                ? "border-blue-400 bg-blue-50 text-blue-700"
                : "border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 text-blue-700 hover:text-blue-800 shadow-sm hover:shadow-md"
            )}
          >
            {isAutofilling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-visible">Autofilling...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium text-blue-700 whitespace-nowrap max-w-0 group-hover:max-w-[140px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-visible">Autofill Resume</span>
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
          <div className="flex-shrink-0">
            <BorrowerResumeVersionHistory
              projectId={projectId}
              onRollbackSuccess={handleVersionRollbackSuccess}
              onOpen={handleVersionHistoryOpen}
            />
          </div>
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
              className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-visible text-base flex-shrink-0"
            >
              {copyLoading ? (
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Copying...
                </span>
              ) : (
                <>
                  <Copy className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[190px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-visible">
                    Copy From Another Project
                  </span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      {/* Remote update notification */}
      {isRemoteUpdate && (
        <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 px-4 py-3 mx-6 mt-4 rounded-md flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">
            This resume was updated by another user. Your view has been refreshed.
          </span>
        </div>
      )}
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
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden relative z-10"
            >
              <BorrowerResumeView 
                resume={formData} 
                autofillAnimationKey={autofillAnimationKey}
                showAutofillSuccess={showAutofillSuccess}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
};
