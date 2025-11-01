"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { Button } from "../ui/Button";
import {
  History,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GitCompare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DocumentDiffViewer } from "./DocumentDiffViewer";

interface Version {
  id: string;
  version_number: number;
  created_at: string;
  created_by: string;
  status: string;
  metadata?: { size?: number };
}

interface VersionHistoryDropdownProps {
  resourceId: string;
  onRollbackSuccess?: () => void;
  defaultOpen?: boolean;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const VersionHistoryDropdown: React.FC<VersionHistoryDropdownProps> = ({
  resourceId,
  onRollbackSuccess,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [versions, setVersions] = useState<Version[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [confirmRollback, setConfirmRollback] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [compareVersions, setCompareVersions] = useState<
    [string, string] | null
  >(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: versionsData, error: versionError } = await supabase
        .from("document_versions")
        .select("id, version_number, created_at, created_by, status, metadata")
        .eq("resource_id", resourceId)
        .order("version_number", { ascending: false });

      if (versionError) throw versionError;

      setVersions(versionsData || []);
    } catch (err) {
      console.error("Error fetching versions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load version history"
      );
    } finally {
      setIsLoading(false);
    }
  }, [resourceId]);

  // Fetch versions when dropdown opens
  useEffect(() => {
    if (isOpen && versions.length === 0) {
      fetchVersions();
    }
  }, [isOpen, versions.length, fetchVersions]);

  // Calculate dropdown position when it opens and update on scroll
  useEffect(() => {
    if (!isOpen) {
      setDropdownPosition(null);
      return;
    }

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 8, // 8px gap (mt-2 = 0.5rem = 8px)
          left: rect.left + window.scrollX - 240, // -left-60 = -15rem = -240px
        });
      }
    };

    updatePosition();

    // Update position on scroll
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setConfirmRollback(null); // Close confirmation when closing dropdown
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleRollback = async (versionId: string) => {
    setIsRollingBack(true);
    setError(null); // Clear previous errors

    try {
      const { error } = await supabase.rpc("rollback_document_version", {
        p_resource_id: resourceId,
        p_version_id: versionId,
      });

      if (error) throw error;

      // Refresh versions
      setVersions([]); // Clear current versions to show loading state
      await fetchVersions();
      setConfirmRollback(null);

      if (onRollbackSuccess) {
        onRollbackSuccess();
      }
    } catch (err) {
      console.error("Error rolling back version:", err);
      setError(
        err instanceof Error ? err.message : "Failed to rollback version"
      );
    } finally {
      setIsRollingBack(false);
    }
  };

  const currentVersion = versions.find((v) => v.status === "active");

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        ref={triggerRef}
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        title="View Version History"
      >
        <History className="h-4 w-4 mr-1" />
        Versions
      </Button>

      <AnimatePresence>
        {isOpen && dropdownPosition && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                Version History
              </h3>

              {error && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {versions.length === 0 ? (
                    <p className="text-sm text-gray-500">No versions found</p>
                  ) : (
                    versions.map((version) => (
                      <motion.div
                        key={version.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`relative p-3 rounded border ${
                          version.status === "active"
                            ? "bg-blue-50 border-blue-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        {confirmRollback === version.id ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex flex-col items-center justify-center gap-3 py-2"
                          >
                            <p className="text-sm font-medium text-gray-900">
                              Rollback to v{version.version_number}?
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatDate(version.created_at)}
                            </p>
                            <div className="flex gap-2 w-full">
                              <Button
                                size="sm"
                                variant="outline"
                                fullWidth
                                onClick={() => setConfirmRollback(null)}
                                disabled={isRollingBack}
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                fullWidth
                                onClick={() => handleRollback(version.id)}
                                isLoading={isRollingBack}
                              >
                                Confirm
                              </Button>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm text-gray-900">
                                  v{version.version_number}
                                </span>
                                {version.status === "active" && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                )}
                                {version.status === "superseded" && (
                                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                {formatDate(version.created_at)}
                              </p>
                              {version.metadata?.size && (
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(version.metadata.size)}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-1">
                              {version.status !== "active" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setConfirmRollback(version.id)}
                                  disabled={isRollingBack}
                                  title="Restore this version"
                                >
                                  Restore
                                </Button>
                              )}
                              {currentVersion &&
                                version.id !== currentVersion.id && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setCompareVersions([
                                        version.id,
                                        currentVersion.id,
                                      ])
                                    }
                                    title="Compare with current version"
                                  >
                                    <GitCompare className="h-4 w-4" />
                                  </Button>
                                )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {compareVersions && (
        <DocumentDiffViewer
          resourceId={resourceId}
          versionId1={compareVersions[0]}
          versionId2={compareVersions[1]}
          onClose={() => setCompareVersions(null)}
        />
      )}
    </div>
  );
};
