// src/components/project/NewProjectAccessModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PillToggle, TriPermission } from "@/components/ui/PillToggle";
import { cn } from "@/utils/cn";
import { OrgMember, ProjectGrant, Permission } from "@/types/enhanced-types";
import { ShieldCheck, Settings, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const RESOURCE_TYPES = [
  "PROJECT_RESUME",
  "PROJECT_DOCS_ROOT",
  "BORROWER_RESUME",
  "BORROWER_DOCS_ROOT",
] as const;

type ResourceType = typeof RESOURCE_TYPES[number];

const resourceLabels: Record<ResourceType, string> = {
  PROJECT_RESUME: "Project Resume",
  PROJECT_DOCS_ROOT: "Project Documents",
  BORROWER_RESUME: "Borrower Resume",
  BORROWER_DOCS_ROOT: "Borrower Documents",
};

const levelToPermission = (level: TriPermission): Permission | null => {
  if (level === "none") return null;
  return level === "edit" ? "edit" : "view";
};

const computeProjectLevel = (grant: ProjectGrant | undefined): TriPermission => {
  if (!grant) return "none";
  const permissions = RESOURCE_TYPES.map(
    (resourceType) =>
      grant.permissions.find((p) => p.resource_type === resourceType)?.permission ?? null
  );
  if (permissions.every((perm) => perm === "edit")) return "edit";
  if (permissions.some((perm) => perm === "view" || perm === "edit")) return "view";
  return "none";
};

const defaultPermissionsForLevel = (level: TriPermission): ProjectGrant["permissions"] => {
  const permission = levelToPermission(level);
  if (!permission) return [];
  return RESOURCE_TYPES.map((resource_type) => ({ resource_type, permission }));
};

interface NewProjectAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (selections: Record<string, ProjectGrant>) => void;
  members: OrgMember[];
  isLoadingMembers: boolean;
  isSubmitting: boolean;
  errorMessage?: string | null;
}

export const NewProjectAccessModal: React.FC<NewProjectAccessModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  members,
  isLoadingMembers,
  isSubmitting,
  errorMessage,
}) => {
  const owners = useMemo(
    () => members.filter((member) => member.role === "owner"),
    [members]
  );

  const selectableMembers = useMemo(
    () => members.filter((member) => member.role !== "owner"),
    [members]
  );

  // Store ProjectGrant per member (keyed by user_id)
  const [memberGrants, setMemberGrants] = useState<Record<string, ProjectGrant>>({});
  const [openDetailModal, setOpenDetailModal] = useState<string | null>(null);

  // Initialize default grants when modal opens or member list changes
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setMemberGrants((prev) => {
      const nextGrants: Record<string, ProjectGrant> = {};
      selectableMembers.forEach((member) => {
        const existing = prev[member.user_id];
        if (existing) {
          nextGrants[member.user_id] = existing;
        } else {
          // Default to "view" for all resources
          nextGrants[member.user_id] = {
            projectId: "", // Will be set when project is created
            permissions: defaultPermissionsForLevel("view"),
            fileOverrides: [],
          };
        }
      });
      return nextGrants;
    });
  }, [isOpen, selectableMembers]);

  const handleLevelChange = (userId: string, level: TriPermission) => {
    setMemberGrants((prev) => {
      const existing = prev[userId];
      const permissions = defaultPermissionsForLevel(level);
      return {
        ...prev,
        [userId]: {
          ...existing,
          projectId: existing?.projectId || "",
          permissions,
          fileOverrides: existing?.fileOverrides || [],
        },
      };
    });
  };

  const handleResourcePermissionChange = (
    userId: string,
    resourceType: ResourceType,
    level: TriPermission
  ) => {
    setMemberGrants((prev) => {
      const existing = prev[userId];
      const permission = levelToPermission(level);

      if (!existing) {
        if (!permission) return prev;
        return {
          ...prev,
          [userId]: {
            projectId: "",
            permissions: [{ resource_type: resourceType, permission }],
            fileOverrides: [],
          },
        };
      }

      const otherPermissions = existing.permissions.filter(
        (perm) => perm.resource_type !== resourceType
      );

      const updatedPermissions = permission
        ? [...otherPermissions, { resource_type: resourceType, permission }]
        : otherPermissions;

      return {
        ...prev,
        [userId]: {
          ...existing,
          permissions: updatedPermissions,
        },
      };
    });
  };

  const handleSubmit = () => {
    // Filter out members with "none" access
    const filteredGrants: Record<string, ProjectGrant> = {};
    Object.entries(memberGrants).forEach(([userId, grant]) => {
      const level = computeProjectLevel(grant);
      if (level !== "none") {
        filteredGrants[userId] = grant;
      }
    });
    onSubmit(filteredGrants);
  };

  const memberCount = selectableMembers.length;
  const currentDetailMember = openDetailModal
    ? selectableMembers.find((m) => m.user_id === openDetailModal)
    : null;
  const currentDetailGrant = openDetailModal ? memberGrants[openDetailModal] : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex items-center justify-center gap-4 max-w-[95vw]">
        {/* Main modal */}
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto flex-shrink-0">
          <Card className="border-0 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <h3 className="flex items-center text-xl font-semibold">
                Create New Project
              </h3>
              <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
                <X size={16} />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Choose which teammates should get access to the new project.
              </p>
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 shadow-sm transition-all",
                  owners.length > 0
                    ? "border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/60"
                    : "border-gray-200 bg-gray-50/70"
                )}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <ShieldCheck size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Owners included automatically
                      </p>
                      <p className="text-xs text-blue-700/80">
                        They already have full edit access to every new project.
                      </p>
                    </div>
                  </div>
                  {owners.length === 0 && (
                    <span className="text-xs font-medium text-blue-700/80">
                      Add teammates as owners to include them here.
                    </span>
                  )}
                </div>
                {owners.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {owners.map((owner) => (
                      <span
                        key={owner.user_id}
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 shadow-sm"
                      >
                        <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {owner.userName || owner.userEmail || "Owner"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-10">
                  <LoadingSpinner />
                </div>
              ) : memberCount === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-600">
                  <p>
                    No additional members are currently in this organization. You can share access
                    later from the project workspace.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {selectableMembers.map((member) => {
                      const grant = memberGrants[member.user_id];
                      const level = computeProjectLevel(grant);
                      const name = member.userName || member.userEmail || "Team member";
                      return (
                        <div
                          key={member.user_id}
                          className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{name}</p>
                              {member.userEmail && (
                                <p className="text-xs text-gray-500">{member.userEmail}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <PillToggle
                                value={level}
                                onChange={(val) => handleLevelChange(member.user_id, val)}
                                size="sm"
                                className="sm:max-w-[260px]"
                              />
                              {level !== "none" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setOpenDetailModal(member.user_id)}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50 flex-shrink-0"
                                  disabled={isSubmitting}
                                >
                                  <Settings size={16} />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {errorMessage && (
                <div className="border border-red-200 bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || (memberCount === 0 && !owners.length)}
                >
                  {isSubmitting ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Permissions Modal - Side by side */}
        {openDetailModal && currentDetailMember && currentDetailGrant && (
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-right duration-200 flex-shrink-0">
            <Card className="border-0 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <h3 className="flex items-center text-xl font-semibold">
                  {currentDetailMember.userName || currentDetailMember.userEmail || "Member"} -
                  Permissions
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenDetailModal(null)}
                >
                  <X size={16} />
                </Button>
              </CardHeader>

              <CardContent className="space-y-3">
                {RESOURCE_TYPES.map((resourceType) => (
                  <div key={resourceType} className="flex items-center justify-between">
                    <span className="text-base text-gray-800">
                      {resourceLabels[resourceType]}
                    </span>
                    <PillToggle
                      value={
                        (currentDetailGrant.permissions.find(
                          (perm) => perm.resource_type === resourceType
                        )?.permission as TriPermission) || "none"
                      }
                      onChange={(val) =>
                        handleResourcePermissionChange(
                          currentDetailMember.user_id,
                          resourceType,
                          val
                        )
                      }
                      size="sm"
                    />
                  </div>
                ))}

                <div className="flex justify-end pt-4 border-t">
                  <Button variant="primary" onClick={() => setOpenDetailModal(null)}>
                    Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewProjectAccessModal;
