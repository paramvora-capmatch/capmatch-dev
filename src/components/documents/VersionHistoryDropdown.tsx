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
  created_by: string | null;
  status: string;
  metadata?: { size?: number };
}

interface UserInfo {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface VersionHistoryDropdownProps {
  resourceId: string;
  onRollbackSuccess?: () => void;
  defaultOpen?: boolean;
  hideTrigger?: boolean; // when true, do not render the trigger button; render dropdown in-place
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
  hideTrigger = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || hideTrigger);
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
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [userInfoMap, setUserInfoMap] = useState<Map<string, UserInfo>>(new Map());
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);

  // Sync isOpen state when defaultOpen prop changes
  useEffect(() => {
    if (defaultOpen && !isOpen) {
      setIsOpen(true);
    }
  }, [defaultOpen, isOpen]);

  const fetchVersions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First, get the resource's current_version_id to determine which version is actually active
      const { data: resource, error: resourceError } = await supabase
        .from("resources")
        .select("current_version_id")
        .eq("id", resourceId)
        .single();

      if (resourceError) throw resourceError;
      setCurrentVersionId(resource?.current_version_id || null);

      const { data: versionsData, error: versionError } = await supabase
        .from("document_versions")
        .select("id, version_number, created_at, created_by, status, metadata")
        .eq("resource_id", resourceId)
        .order("version_number", { ascending: false });

      if (versionError) throw versionError;

      setVersions(versionsData || []);

      // Fetch user information for all creators
      const userIds = [...new Set((versionsData || [])
        .map(v => v.created_by)
        .filter((id): id is string => Boolean(id)))];

      if (userIds.length > 0) {
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds);

        if (!userError && Array.isArray(userData)) {
          const userMap = new Map<string, UserInfo>();
          (userData as any[]).forEach((user) => {
            userMap.set(user.id, {
              id: user.id,
              email: user.email ?? null,
              full_name: user.full_name ?? null,
            });
          });
          setUserInfoMap(userMap);
        } else if (userError) {
          console.error("Error fetching user data:", userError);
        }
      }
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
    if (hideTrigger) {
      // Inline mode: do not compute fixed positioning
      return;
    }
    if (!isOpen) {
      setDropdownPosition(null);
      return;
    }

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = document.documentElement.clientHeight;
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const dropdownWidth =
          dropdownContentRef.current?.offsetWidth ?? 384; // w-96 ≈ 384px
        const dropdownHeight =
          dropdownContentRef.current?.offsetHeight ?? 0;
        const margin = 8;

        let left = rect.right + scrollX - dropdownWidth;
        const minLeft = scrollX + margin;
        const maxLeft = scrollX + viewportWidth - dropdownWidth - margin;

        if (maxLeft < minLeft) {
          left = minLeft;
        } else {
          left = Math.min(Math.max(left, minLeft), maxLeft);
        }

        let top = rect.bottom + scrollY + margin;
        const bottomEdge = top + dropdownHeight;
        const maxBottom = scrollY + viewportHeight - margin;
        const alternateTop = rect.top + scrollY - dropdownHeight - margin;

        if (
          dropdownHeight &&
          bottomEdge > maxBottom &&
          alternateTop >= scrollY + margin
        ) {
          top = alternateTop;
        } else if (top < scrollY + margin) {
          top = scrollY + margin;
        }

        setDropdownPosition({
          top,
          left,
        });
      }
    };

    updatePosition();

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, hideTrigger, versions.length, confirmRollback, isLoading]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickTarget = event.target as Node;
      const clickedOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(clickTarget);
      const clickedOutsideTrigger = triggerRef.current ? !triggerRef.current.contains(clickTarget) : true;
      if (clickedOutsideDropdown && clickedOutsideTrigger) {
        // Always close when clicking outside, regardless of hideTrigger
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

  const handleRollback = async (versionId: string) => {
    setIsRollingBack(true);
    setError(null); // Clear previous errors

    try {
      const { error } = await supabase.rpc("rollback_document_version", {
        p_resource_id: resourceId,
        p_version_id: versionId,
      });

      if (error) throw error;

      // Refresh versions and current version ID
      setVersions([]); // Clear current versions to show loading state
      setCurrentVersionId(null); // Clear current version ID
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

  // Use current_version_id from resource as source of truth, not status field
  const currentVersion = currentVersionId 
    ? versions.find((v) => v.id === currentVersionId)
    : null;

  return (
    <div ref={dropdownRef} className="relative">
      {!hideTrigger && (
        <Button
          ref={triggerRef}
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          title="Versions"
          aria-label="Versions"
        >
          <History className="h-4 w-4 mr-2" />
          Versions
        </Button>
      )}

      <AnimatePresence>
        {isOpen && (hideTrigger || dropdownPosition) && (
          <motion.div
            ref={dropdownContentRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`${hideTrigger ? "w-96" : "fixed w-96"} bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]`}
            style={hideTrigger ? undefined : {
              top: `${dropdownPosition!.top}px`,
              left: `${dropdownPosition!.left}px`,
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
                          version.id === currentVersionId
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
                                {version.id === currentVersionId && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                )}
                                {version.id !== currentVersionId && (
                                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                {formatDate(version.created_at)}
                              </p>
                              {version.created_by && userInfoMap.has(version.created_by) && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Created by {userInfoMap.get(version.created_by)?.full_name || userInfoMap.get(version.created_by)?.email || 'Unknown User'}
                                </p>
                              )}
                              {version.metadata?.size && (
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(version.metadata.size)}
                                </p>
                              )}
                            </div>

                            <div className="flex gap-1">
                              {version.id !== currentVersionId && (
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
                                    title={`Compare with current version (v${currentVersion.version_number})`}
                                    aria-label={`Compare version ${version.version_number} with current version v${currentVersion.version_number}`}
                                  >
                                    <GitCompare className="h-4 w-4 mr-1" />
                                    Compare to v{currentVersion.version_number}
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
