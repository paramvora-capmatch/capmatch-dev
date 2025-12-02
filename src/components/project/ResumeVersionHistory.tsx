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
} from "lucide-react";
import { formatDate, flattenResumeContent, getFieldLabel, stringifyValue } from "../shared/resumeVersionUtils";
import { projectResumeFieldMetadata } from "@/lib/project-resume-field-metadata";

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
  status: string | null;
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

    // Priority 2: Version marked as 'active'
    const active = versions.find((v) => v.status === "active");
    if (active) return active.id;

    // Priority 3: Latest version (first in the list as it's sorted desc)
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
        .select("id, version_number, created_at, created_by, status")
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
                    const isActive =
                      isCurrentVersion || version.status === "active";
                    const status =
                      version.status || (isActive ? "active" : "superseded");
                    
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

const ResumeVersionDiffModal: React.FC<ResumeVersionDiffModalProps> = ({
  versionIdA,
  versionIdB,
  isOpen,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffRows, setDiffRows] = useState<
    { fieldId: string; label: string; before: string; after: string }[]
  >([]);
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

        const leftFlat = flattenResumeContent(left.content);
        const rightFlat = flattenResumeContent(right.content);

        // Only compare fields that are part of the structured project resume
        // schema. This avoids showing internal/project-level fields like
        // borrowerProgress or assignedAdvisorUserId in the diff view.
        const allKeys = Array.from(
          new Set([...Object.keys(leftFlat), ...Object.keys(rightFlat)])
        );
        const resumeFieldIds = new Set(
          Object.keys(projectResumeFieldMetadata)
        );
        const keys = allKeys.filter((key) => resumeFieldIds.has(key));

        const rows = keys
          .map((key) => {
            const before = stringifyValue(leftFlat[key]);
            const after = stringifyValue(rightFlat[key]);
            if (before === after) return null;
            return {
              fieldId: key,
              label: getFieldLabel(key),
              before,
              after,
            };
          })
          .filter(Boolean) as {
          fieldId: string;
          label: string;
          before: string;
          after: string;
        }[];

        if (!cancelled) {
          setDiffRows(
            rows.sort((a, b) => a.label.localeCompare(b.label))
          );
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
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {diffRows.length === 0 ? (
            <p className="text-sm text-gray-600">
              No differences detected between these versions.
            </p>
          ) : (
            diffRows.map((row) => (
              <div key={row.fieldId} className="border-b last:border-b-0 pb-3">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {row.label}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 text-gray-700">
                    <p className="text-[10px] text-gray-400 mb-1">Before</p>
                    <p>{row.before}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 text-gray-700">
                    <p className="text-[10px] text-gray-400 mb-1">After</p>
                    <p>{row.after}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

