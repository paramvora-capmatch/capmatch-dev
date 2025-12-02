"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import {
  History,
  CheckCircle2,
  AlertCircle,
  GitCompare,
  Loader2,
  Lock,
} from "lucide-react";
import { formatDate, getFieldLabel, stringifyValue, normalizeValueForComparison, valuesAreEqual } from "../shared/resumeVersionUtils";
import { projectResumeFieldMetadata } from "@/lib/project-resume-field-metadata";
import formSchema from "@/lib/enhanced-project-form.schema.json";
import { getFormFieldOrder, getFieldOrderMap, getSubsectionsForSection } from "../shared/getFormFieldOrder";

interface ResumeVersionHistoryProps {
  projectId: string;
  resourceId?: string | null;
  onRollbackSuccess?: () => void;
  onOpen?: () => void;
}

interface ResumeVersionRow {
  id: string;
  version_number: number | null;
  created_at: string;
  created_by: string | null;
  creatorDisplayName: string;
}

interface CreatorProfile {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

export const ResumeVersionHistory: React.FC<ResumeVersionHistoryProps> = ({
  projectId,
  resourceId,
  onRollbackSuccess,
  onOpen,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [versions, setVersions] = useState<ResumeVersionRow[]>([]);
  const [resource, setResource] = useState<{
    id: string;
    current_version_id: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRollback, setConfirmRollback] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [comparePair, setComparePair] = useState<[string, string] | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevIsOpenRef = useRef(false);

  const currentVersionId = useMemo(() => {
    // Priority 1: Explicit current version pointer from resource
    if (resource?.current_version_id) return resource.current_version_id;

    // Priority 2: Latest version (first in the list as it's sorted desc)
    return versions.length > 0 ? versions[0].id : null;
  }, [resource, versions]);

  const currentVersion = versions.find((v) => v.id === currentVersionId);

  const fetchVersions = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);

    try {
      let resolvedResourceId = resourceId;
      let currentVersionPointer: string | null = null;

      if (resolvedResourceId) {
        const { data, error: fetchError } = await supabase
          .from("resources")
          .select("id, current_version_id")
          .eq("id", resolvedResourceId)
          .single();
        if (fetchError && fetchError.code !== "PGRST116") throw fetchError;
        if (data) {
          currentVersionPointer = data.current_version_id;
          resolvedResourceId = data.id;
        }
      } else {
        const { data, error: fetchError } = await supabase
          .from("resources")
          .select("id, current_version_id")
          .eq("project_id", projectId)
          .eq("resource_type", "PROJECT_RESUME")
          .maybeSingle();
        if (fetchError) throw fetchError;
        if (data) {
          resolvedResourceId = data.id;
          currentVersionPointer = data.current_version_id;
        }
      }

      if (!resolvedResourceId) {
        throw new Error("Project resume resource not found.");
      }

      const { data: versionRows, error: versionsError } = await supabase
        .from("project_resumes")
        .select("id, version_number, created_at, created_by")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false });

      if (versionsError) throw versionsError;

      const creatorIds = Array.from(
        new Set((versionRows ?? []).map((v) => v.created_by).filter(Boolean))
      );

      let creatorProfiles: CreatorProfile[] = [];
      if (creatorIds.length > 0) {
        // Use edge function to fetch user data (bypasses RLS, works for advisors)
        try {
          const { data: profiles, error: profileError } = await supabase.functions.invoke(
            'get-user-data',
            {
              body: { userIds: creatorIds },
            }
          );

          if (profileError) {
            console.error('[ResumeVersionHistory] Failed to fetch creator profiles via edge function:', profileError);
            // Fall back to direct query as a backup (may not work for advisors)
            const { data: directProfiles, error: directError } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", creatorIds);
            if (!directError && directProfiles) {
              creatorProfiles = directProfiles;
            }
          } else if (profiles && Array.isArray(profiles)) {
            creatorProfiles = profiles.map((p: { id: string; full_name?: string | null; email?: string | null }) => ({
              id: p.id,
              full_name: p.full_name,
              email: p.email,
            }));
          }
        } catch (err) {
          console.error('[ResumeVersionHistory] Error fetching creator profiles:', err);
          // Fall back to direct query
          try {
            const { data: directProfiles, error: directError } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .in("id", creatorIds);
            if (!directError && directProfiles) {
              creatorProfiles = directProfiles;
            }
          } catch (fallbackErr) {
            console.error('[ResumeVersionHistory] Fallback profile fetch also failed:', fallbackErr);
          }
        }
      }

      const creatorMap = new Map(
        creatorProfiles.map((profile) => [profile.id, profile])
      );

      const decorated = (versionRows ?? []).map((version) => ({
        ...version,
        creatorDisplayName:
          creatorMap.get(version.created_by ?? "")?.full_name ||
          creatorMap.get(version.created_by ?? "")?.email ||
          (version.created_by ? version.created_by : "System"),
      }));

      setResource({
        id: resolvedResourceId,
        current_version_id: currentVersionPointer,
      });
      setVersions(decorated);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load resume versions";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, resourceId]);

  useEffect(() => {
    if (isOpen) {
      void fetchVersions();
    }
  }, [isOpen, fetchVersions]);

  // Call onOpen callback when modal opens (after state update completes)
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    const isOpening = isOpen && !wasOpen;
    
    if (isOpening && onOpen) {
      // Use setTimeout to defer to next tick, ensuring state updates have completed
      setTimeout(() => {
        onOpen();
      }, 0);
    }
    
    prevIsOpenRef.current = isOpen;
  }, [isOpen, onOpen]);

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setConfirmRollback(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleRollback = useCallback(
    async (versionId: string) => {
      if (!resource?.id) {
        setError("Cannot rollback without a resume resource.");
        return;
      }

      setIsRollingBack(true);
      setError(null);
      try {
        const { error: rollbackError } = await supabase.rpc(
          "rollback_project_resume_version",
          {
            p_resource_id: resource.id,
            p_resume_id: versionId,
          }
        );
        if (rollbackError) throw rollbackError;

        setConfirmRollback(null);
        await fetchVersions();
        onRollbackSuccess?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to rollback version";
        setError(message);
      } finally {
        setIsRollingBack(false);
      }
    },
    [resource?.id, fetchVersions, onRollbackSuccess]
  );

  const currentVersionLabel = useMemo(
    () =>
      currentVersion?.version_number
        ? `v${currentVersion.version_number}`
        : "Current version",
    [currentVersion]
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        className="group flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        title="Resume versions"
      >
        <History className="h-5 w-5 text-gray-600 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[100px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">Versions</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg z-40">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Version History
              </h3>
              <span className="text-xs text-gray-500">
                {currentVersionLabel}
              </span>
            </div>

            {error && (
              <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded p-2">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {versions.length === 0 ? (
                  <div className="text-xs text-gray-500">
                    No versions found yet
                  </div>
                ) : (
                  versions.map((version) => {
                    // Determine if this is the current version
                    // First check if it matches the current_version_id, otherwise check if it's the first/latest version
                    const isCurrentVersion = version.id === currentVersionId;
                    const isActive = isCurrentVersion;
                    const status = isActive ? "active" : "superseded";
                    
                    // Show buttons on all versions except the current one
                    // If currentVersionId is null, we'll show buttons on all versions (safer than hiding them all)
                    const shouldShowButtons = !isCurrentVersion;
                    
                    return (
                      <div
                        key={version.id}
                        className={`p-3 rounded border ${
                          isCurrentVersion
                            ? "border-blue-200 bg-blue-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        {confirmRollback === version.id ? (
                          <div className="space-y-2 text-center">
                            <p className="text-sm font-medium text-gray-900">
                              Rollback to v
                              {version.version_number ?? version.id.slice(0, 4)}
                              ?
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatDate(version.created_at)}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                fullWidth
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setConfirmRollback(null);
                                }}
                                disabled={isRollingBack}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                fullWidth
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRollback(version.id);
                                }}
                                isLoading={isRollingBack}
                              >
                                Confirm
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  v{version.version_number ?? "—"}
                                </span>
                                {status === "active" && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                                {status === "superseded" && (
                                  <AlertCircle className="h-4 w-4 text-amber-600" />
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                {formatDate(version.created_at)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {version.creatorDisplayName}
                              </p>
                            </div>

                            <div className="flex gap-1">
                              {/* Restore button: show on all versions except current */}
                              {shouldShowButtons && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setConfirmRollback(version.id);
                                  }}
                                  disabled={isRollingBack}
                                  title="Restore this version"
                                >
                                  Restore
                                </Button>
                              )}
                              {/* Compare button: show on all versions except current (only if we have a current version to compare against) */}
                              {shouldShowButtons && currentVersionId && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setComparePair([
                                      version.id,
                                      currentVersionId,
                                    ]);
                                    onOpen?.();
                                  }}
                                  title={`Compare to ${currentVersionLabel}`}
                                >
                                  <GitCompare className="h-4 w-4 mr-1" />
                                  Compare
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {comparePair && (
        <ResumeVersionDiffModal
          isOpen={!!comparePair}
          versionIdA={comparePair[0]}
          versionIdB={comparePair[1]}
          onClose={() => setComparePair(null)}
        />
      )}
    </div>
  );
};

interface ResumeVersionDiffModalProps {
  versionIdA: string;
  versionIdB: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DiffField {
  fieldId: string;
  label: string;
  section: string;
  before: unknown;
  after: unknown;
  beforeLocked?: boolean;
  afterLocked?: boolean;
  isTable: boolean;
}

interface DiffSection {
  sectionId: string;
  sectionName: string;
  fields: DiffField[];
}

// Section order and display names
const SECTION_ORDER = [
  "basic-info",
  "property-specs",
  "loan-info",
  "dev-budget",
  "financials",
  "market-context",
  "special-considerations",
  "timeline",
  "site-context",
  "sponsor-info",
];

const SECTION_NAMES: Record<string, string> = {
  "basic-info": "Project Identification & Basic Info",
  "property-specs": "Property Specifications",
  "loan-info": "Loan Information",
  "dev-budget": "Development Budget",
  "financials": "Financial Details",
  "market-context": "Market Context",
  "special-considerations": "Special Considerations",
  "timeline": "Timeline & Milestones",
  "site-context": "Site & Context",
  "sponsor-info": "Sponsor Information",
};

// Table field IDs that should be handled specially
const TABLE_FIELDS = new Set([
  "residentialUnitMix",
  "commercialSpaceMix",
  "rentComps",
  "drawSchedule",
]);

const ResumeVersionDiffModal: React.FC<ResumeVersionDiffModalProps> = ({
  versionIdA,
  versionIdB,
  isOpen,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffSections, setDiffSections] = useState<DiffSection[]>([]);
  const [title, setTitle] = useState("Comparing versions");

  useEffect(() => {
    if (!isOpen) return;
    if (!versionIdA || !versionIdB) {
      setError("Both versions must be specified for comparison.");
      return;
    }

    let cancelled = false;

    const loadComparison = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: versionError } = await supabase
          .from("project_resumes")
          .select("id, version_number, content")
          .in("id", [versionIdA, versionIdB]);

        if (versionError) throw versionError;

        if (!data || data.length < 2) {
          throw new Error("Could not load both versions for comparison.");
        }

        const versionMap = new Map<string, typeof data[number]>();
        data.forEach((row) => versionMap.set(row.id, row));

        const left = versionMap.get(versionIdA);
        const right = versionMap.get(versionIdB);
        if (!left || !right) {
          throw new Error("Versions not found.");
        }

        setTitle(
          `Compare v${left.version_number ?? "—"} vs v${
            right.version_number ?? "—"
          }`
        );

        // Work with EXACT JSONB structure from DB - NO FLATTENING
        const leftContent = left.content || {};
        const rightContent = right.content || {};

        // Extract lock states from root level
        const leftLocked = (leftContent as any)?._lockedFields || {};
        const rightLocked = (rightContent as any)?._lockedFields || {};

        // Get exact field order from form schema
        const fieldOrderMap = getFieldOrderMap();
        const formFieldOrder = getFormFieldOrder();
        
        // Get all possible fields from metadata
        const resumeFieldIds = new Set(Object.keys(projectResumeFieldMetadata));
        
        // Helper to extract field value from JSONB structure (handles section grouping)
        const getFieldValue = (content: any, fieldId: string): any => {
          // Check if content is in section-grouped format
          const isGrouped = Object.keys(content || {}).some(key => key.startsWith('section_'));
          
          if (isGrouped) {
            // Find which section this field belongs to
            const metadata = projectResumeFieldMetadata[fieldId];
            if (!metadata) return undefined;
            
            const sectionId = metadata.section;
            const SECTION_ID_TO_NUMBER: Record<string, string> = {
              "basic-info": "section_1",
              "property-specs": "section_2",
              "dev-budget": "section_3_1",
              "loan-info": "section_3_2",
              "financials": "section_3_3",
              "market-context": "section_4",
              "special-considerations": "section_5",
              "timeline": "section_6",
              "site-context": "section_7",
              "sponsor-info": "section_8",
            };
            
            const sectionKey = SECTION_ID_TO_NUMBER[sectionId];
            if (!sectionKey || !content[sectionKey]) return undefined;
            
            const fieldData = content[sectionKey][fieldId];
            if (fieldData === undefined) return undefined;
            
            // Extract value from rich object format if needed
            if (fieldData && typeof fieldData === "object" && "value" in fieldData) {
              return fieldData.value;
            }
            
            return fieldData;
          } else {
            // Flat format - get directly
            const fieldData = content[fieldId];
            if (fieldData === undefined) return undefined;
            
            // Extract value from rich object format if needed
            if (fieldData && typeof fieldData === "object" && "value" in fieldData) {
              return fieldData.value;
            }
            
            return fieldData;
          }
        };
        
        // Build diff fields map by comparing JSONB structures directly
        const diffFieldsMap = new Map<string, DiffField>();
        
        // Get all fields from schema order
        for (const fieldOrder of formFieldOrder) {
          const fieldId = fieldOrder.fieldId;
          
          // Only process valid resume fields
          if (!resumeFieldIds.has(fieldId)) {
            continue;
          }
          
          // Get values directly from JSONB structure
          const beforeValue = getFieldValue(leftContent, fieldId);
          const afterValue = getFieldValue(rightContent, fieldId);
          
          // Check if values are different - compare raw JSONB values directly
          // CRITICAL: Use strict equality first, then normalize for edge cases
          let areEqual = false;
          
          // Direct comparison
          if (beforeValue === afterValue) {
            areEqual = true;
          } else {
            // Normalize and compare (handles boolean/string conversions)
            areEqual = valuesAreEqual(beforeValue, afterValue);
          }
          
          if (areEqual) {
            continue;
          }
          
          // Normalize for display
          const normalizedBefore = normalizeValueForComparison(beforeValue);
          const normalizedAfter = normalizeValueForComparison(afterValue);

          const metadata = projectResumeFieldMetadata[fieldId];
          const isTable = TABLE_FIELDS.has(fieldId);

          diffFieldsMap.set(fieldId, {
            fieldId,
            label: getFieldLabel(fieldId),
            section: metadata?.section || "unknown",
            before: normalizedBefore,
            after: normalizedAfter,
            beforeLocked: leftLocked[fieldId] === true,
            afterLocked: rightLocked[fieldId] === true,
            isTable,
          });
        }

        // Group by section and subsection using exact form schema order
        const sectionsMap = new Map<string, Map<string, DiffField[]>>();
        
        // Initialize structure from form schema
        for (const fieldOrder of formFieldOrder) {
          if (!diffFieldsMap.has(fieldOrder.fieldId)) {
            continue; // Skip fields with no differences
          }
          
          const field = diffFieldsMap.get(fieldOrder.fieldId)!;
          const sectionId = fieldOrder.sectionId;
          
          if (!sectionsMap.has(sectionId)) {
            sectionsMap.set(sectionId, new Map());
          }
          
          const subsectionMap = sectionsMap.get(sectionId)!;
          const subsectionKey = fieldOrder.subsectionId || "__no_subsection__";
          
          if (!subsectionMap.has(subsectionKey)) {
            subsectionMap.set(subsectionKey, []);
          }
          
          subsectionMap.get(subsectionKey)!.push(field);
        }
        
        // Create sections in exact form order
        const sections: DiffSection[] = [];
        const schemaSteps = (formSchema as any).steps || [];
        
        for (const step of schemaSteps) {
          const sectionId = step.id;
          const subsectionMap = sectionsMap.get(sectionId);
          
          if (!subsectionMap || subsectionMap.size === 0) {
            continue;
          }
          
          // Sort fields within subsections by their exact order in the schema
          const sortedFields: DiffField[] = [];
          
          if (step.subsections && Array.isArray(step.subsections)) {
            // Has subsections - process in subsection order
            for (const subsection of step.subsections) {
              const subsectionKey = subsection.id;
              const fields = subsectionMap.get(subsectionKey) || [];
              
              // Sort fields by their order in the subsection
              const sortedSubsectionFields = fields.sort((a, b) => {
                const orderA = fieldOrderMap.get(a.fieldId);
                const orderB = fieldOrderMap.get(b.fieldId);
                if (orderA && orderB) {
                  return orderA.fieldIndex - orderB.fieldIndex;
                }
                return a.label.localeCompare(b.label);
              });
              
              sortedFields.push(...sortedSubsectionFields);
            }
          } else {
            // No subsections - just sort all fields in the section
            const allFields = Array.from(subsectionMap.values()).flat();
            sortedFields.push(...allFields.sort((a, b) => {
              const orderA = fieldOrderMap.get(a.fieldId);
              const orderB = fieldOrderMap.get(b.fieldId);
              if (orderA && orderB) {
                return orderA.fieldIndex - orderB.fieldIndex;
              }
              return a.label.localeCompare(b.label);
            }));
          }
          
          if (sortedFields.length > 0) {
            sections.push({
              sectionId,
              sectionName: step.title || SECTION_NAMES[sectionId] || sectionId,
              fields: sortedFields,
            });
          }
        }
        
        // Handle any remaining fields not in schema (safety check - shouldn't normally happen)
        const processedFieldIds = new Set<string>();
        for (const section of sections) {
          for (const field of section.fields) {
            processedFieldIds.add(field.fieldId);
          }
        }
        
        for (const [fieldId, field] of diffFieldsMap.entries()) {
          if (processedFieldIds.has(fieldId)) {
            continue; // Already processed
          }
          
          // Field exists in diff but not in form schema - add to appropriate section
          const sectionId = field.section;
          let section = sections.find((s) => s.sectionId === sectionId);
          if (!section) {
            section = {
              sectionId,
              sectionName: SECTION_NAMES[sectionId] || sectionId,
              fields: [],
            };
            sections.push(section);
          }
          section.fields.push(field);
        }

        if (!cancelled) {
          setDiffSections(sections);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to compare versions."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadComparison();

    return () => {
      cancelled = true;
    };
  }, [isOpen, versionIdA, versionIdB]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="xl"
    >
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded p-3 mb-3">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {diffSections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600">
                No differences detected between these versions.
              </p>
            </div>
          ) : (
            diffSections.map((section) => (
              <div key={section.sectionId} className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  {section.sectionName}
                </h3>
                {section.fields.map((field) => (
                  <DiffFieldRow key={field.fieldId} field={field} />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

// Component to render a single diff field row
const DiffFieldRow: React.FC<{ field: DiffField }> = ({ field }) => {
  const beforeStr = stringifyValue(field.before);
  const afterStr = stringifyValue(field.after);

  const isRemoved = beforeStr !== "—" && afterStr === "—";
  const isAdded = beforeStr === "—" && afterStr !== "—";
  const isModified = !isRemoved && !isAdded;

  // Format table data if needed
  const formatTableValue = (value: unknown): string => {
    if (!Array.isArray(value) || value.length === 0) return "—";
    return `${value.length} row${value.length !== 1 ? "s" : ""}`;
  };

  const beforeDisplay = field.isTable ? formatTableValue(field.before) : beforeStr;
  const afterDisplay = field.isTable ? formatTableValue(field.after) : afterStr;

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-medium text-gray-900">{field.label}</p>
        {(field.beforeLocked || field.afterLocked) && (
          <div className="flex gap-1 items-center">
            {field.beforeLocked && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Version A
              </span>
            )}
            {field.afterLocked && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Version B
              </span>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div
          className={`rounded-md p-3 border ${
            isRemoved || isModified
              ? "bg-red-50 border-red-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <p className="text-xs font-medium text-gray-500 mb-1">Version A</p>
          <p
            className={`text-sm whitespace-pre-wrap break-words ${
              isRemoved ? "line-through text-red-700" : "text-gray-900"
            }`}
          >
            {beforeDisplay}
          </p>
        </div>
        <div
          className={`rounded-md p-3 border ${
            isAdded || isModified
              ? "bg-green-50 border-green-200"
              : "bg-gray-50 border-gray-200"
          }`}
        >
          <p className="text-xs font-medium text-gray-500 mb-1">Version B</p>
          <p
            className={`text-sm whitespace-pre-wrap break-words ${
              isAdded ? "text-green-700 font-medium" : "text-gray-900"
            }`}
          >
            {afterDisplay}
          </p>
        </div>
      </div>
      {field.isTable && (field.before !== null || field.after !== null) && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <TableDiffView before={field.before} after={field.after} fieldId={field.fieldId} />
        </div>
      )}
    </div>
  );
};

// Component to show table diffs in detail
const TableDiffView: React.FC<{
  before: unknown;
  after: unknown;
  fieldId: string;
}> = ({ before, after }) => {
  const beforeArray = Array.isArray(before) ? before : [];
  const afterArray = Array.isArray(after) ? after : [];

  if (beforeArray.length === 0 && afterArray.length === 0) {
    return null;
  }

  const rowCountChanged = beforeArray.length !== afterArray.length;

  // Try to detect changes in table structure
  const beforeKeys = beforeArray.length > 0 && typeof beforeArray[0] === "object" 
    ? Object.keys(beforeArray[0] as Record<string, unknown>)
    : [];
  const afterKeys = afterArray.length > 0 && typeof afterArray[0] === "object"
    ? Object.keys(afterArray[0] as Record<string, unknown>)
    : [];

  const keysChanged = JSON.stringify(beforeKeys.sort()) !== JSON.stringify(afterKeys.sort());

  // Simple deep equality check for arrays
  const arraysEqual = (a: unknown[], b: unknown[]): boolean => {
    if (a.length !== b.length) return false;
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  };

  const hasDataChanges = !arraysEqual(beforeArray, afterArray);

  return (
    <div className="text-xs space-y-2">
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
        <div className="flex gap-4">
          <div>
            <span className="font-medium text-gray-700">Version A:</span>{" "}
            <span className="text-gray-600">{beforeArray.length} row{beforeArray.length !== 1 ? "s" : ""}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Version B:</span>{" "}
            <span className="text-gray-600">{afterArray.length} row{afterArray.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>
      
      {hasDataChanges && (
        <div className="space-y-1 text-gray-600">
          {rowCountChanged && (
            <p className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Row count changed ({beforeArray.length} → {afterArray.length})
            </p>
          )}
          {keysChanged && !rowCountChanged && (
            <p className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Table structure changed
            </p>
          )}
          {!rowCountChanged && !keysChanged && (
            <p className="flex items-center gap-1 text-blue-600">
              <GitCompare className="h-3 w-3" />
              Data values changed in table
            </p>
          )}
        </div>
      )}
      
      {/* Show preview of first few rows if small */}
      {beforeArray.length <= 3 && afterArray.length <= 3 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-gray-600 hover:text-gray-900 text-xs font-medium">
            View table data
          </summary>
          <div className="mt-2 space-y-2">
            {beforeArray.length > 0 && (
              <div className="p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-xs font-medium text-red-700 mb-1">Version A:</p>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(beforeArray, null, 2)}
                </pre>
              </div>
            )}
            {afterArray.length > 0 && (
              <div className="p-2 bg-green-50 border border-green-200 rounded">
                <p className="text-xs font-medium text-green-700 mb-1">Version B:</p>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(afterArray, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
};

