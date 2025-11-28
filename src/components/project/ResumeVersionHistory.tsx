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

  const currentVersionId = resource?.current_version_id ?? null;
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
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", creatorIds);
        if (profileError) throw profileError;
        creatorProfiles = profiles || [];
      }

      const creatorMap = new Map(
        creatorProfiles.map((profile) => [profile.id, profile])
      );

      const decorated = (versionRows ?? []).map((version) => ({
        ...version,
        creatorDisplayName:
          creatorMap.get(version.created_by ?? "")?.full_name ||
          creatorMap.get(version.created_by ?? "")?.email ||
          (version.created_by ? version.created_by : "Autofill Bot"),
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
        className="flex items-center gap-1"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((prev) => {
            const next = !prev;
            if (!prev) {
              onOpen?.();
            }
            return next;
          });
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        title="Resume versions"
      >
        <History className="h-4 w-4" />
        Versions
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
                    const isActive =
                      version.id === (resource?.current_version_id ?? null);
                    const status =
                      version.status || (isActive ? "active" : "superseded");
                    return (
                      <div
                        key={version.id}
                        className={`p-3 rounded border ${
                          isActive
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
                              {!isActive && (
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
                              {currentVersionId &&
                                version.id !== currentVersionId && (
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

        const keys = Array.from(
          new Set([...Object.keys(leftFlat), ...Object.keys(rightFlat)])
        );

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

