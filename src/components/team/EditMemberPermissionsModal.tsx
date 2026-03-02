// src/components/team/EditMemberPermissionsModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PillToggle } from "@/components/ui/PillToggle";
import { OrgGrant, ProjectGrant, OrgMember } from "@/types/enhanced-types";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPermissionEditor } from "@/hooks/useProjectPermissionEditor";
import { ProjectPermissionDetailPanel } from "@/components/team/ProjectPermissionDetailPanel";
import { RESOURCE_TYPES } from "@/hooks/useProjectPermissionEditor";
import { X, Briefcase, Save } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";

interface EditMemberPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: OrgMember;
  orgId: string;
  onUpdate: (
    userId: string,
    projectGrants: ProjectGrant[]
  ) => Promise<void>;
}

export const EditMemberPermissionsModal: React.FC<
  EditMemberPermissionsModalProps
> = ({ isOpen, onClose, member, orgId, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [orgGrants, setOrgGrants] = useState<OrgGrant | null>(null);
  const [openProjectPermissionsModal, setOpenProjectPermissionsModal] =
    useState<string | null>(null);

  const { projects, isLoading: isLoadingProjects } = useProjects();
  const {
    projectGrants,
    setProjectGrants,
    projectDocsMap,
    setProjectLevel,
    setResourcePermission,
    setProjectDocPermission,
    getProjectLevel,
    ensureProjectDocsLoaded,
    getDocumentRootType,
  } = useProjectPermissionEditor(setOpenProjectPermissionsModal);

  // Load current permissions when modal opens
  useEffect(() => {
    if (!(isOpen && member)) return;
    let isCancelled = false;
    const load = async () => {
      setIsLoadingPermissions(true);
      try {
        const { data: permissions, error: permError } = await supabase
          .from("permissions")
          .select(
            "resource_id, permission, resources(id, name, resource_type, project_id, org_id)"
          )
          .eq("user_id", member.user_id);

        if (permError) {
          console.error("Error loading permissions:", permError);
          if (!isCancelled) setIsLoadingPermissions(false);
          return;
        }

        const orgPermissions: OrgGrant = {
          permissions: [],
          fileOverrides: [],
        };
        const projectPermsMap = new Map<string, ProjectGrant>();

        type PermRow = {
          resource_id: string;
          permission: string;
          resources: { id: string; name: string; resource_type: string; project_id: string | null; org_id: string } | null;
        };
        ((permissions as unknown) as PermRow[] | null)?.forEach((perm) => {
          const resource = perm.resources;
          if (!resource) return;

          if (resource.org_id === orgId && !resource.project_id) {
            if (resource.resource_type === "FILE") {
              orgPermissions.fileOverrides = orgPermissions.fileOverrides || [];
              orgPermissions.fileOverrides.push({
                resource_id: resource.id,
                permission: perm.permission as "view" | "edit",
              });
            }
          }

          if (resource.project_id) {
            if (!projectPermsMap.has(resource.project_id)) {
              projectPermsMap.set(resource.project_id, {
                projectId: resource.project_id,
                permissions: [],
                fileOverrides: [],
              });
            }
            const projectGrant = projectPermsMap.get(resource.project_id)!;
            if (RESOURCE_TYPES.includes(resource.resource_type as (typeof RESOURCE_TYPES)[number])) {
              projectGrant.permissions.push({
                resource_type: resource.resource_type,
                permission: perm.permission as "view" | "edit",
              });
            } else if (resource.resource_type === "FILE") {
              projectGrant.fileOverrides = projectGrant.fileOverrides || [];
              projectGrant.fileOverrides.push({
                resource_id: resource.id,
                permission: perm.permission as "view" | "edit",
              });
            }
          }
        });

        if (!isCancelled) {
          setOrgGrants(
            orgPermissions.fileOverrides && orgPermissions.fileOverrides.length > 0
              ? orgPermissions
              : null
          );
          const grants = Array.from(projectPermsMap.values());
          setProjectGrants(grants);
          // Trigger doc loading for projects with docs root access
          for (const g of grants) {
            const hasDocsRoot = g.permissions.some(
              (p) =>
                p.resource_type === "PROJECT_DOCS_ROOT" ||
                p.resource_type === "BORROWER_DOCS_ROOT"
            );
            if (hasDocsRoot) ensureProjectDocsLoaded(g.projectId);
          }
        }
      } catch (err) {
        console.error("Error loading current permissions:", err);
      } finally {
        if (!isCancelled) setIsLoadingPermissions(false);
      }
    };
    load();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, member, orgId, setProjectGrants, ensureProjectDocsLoaded]);

  useEffect(() => {
    if (openProjectPermissionsModal) {
      ensureProjectDocsLoaded(openProjectPermissionsModal);
    }
  }, [openProjectPermissionsModal, ensureProjectDocsLoaded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await onUpdate(member.user_id, projectGrants);
      handleClose();
    } catch (err) {
      console.error("Failed to update permissions:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update permissions"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setProjectGrants([]);
    setOrgGrants(null);
    setOpenProjectPermissionsModal(null);
    onClose();
  };

  const currentProjectForModal = projects.find(
    (p) => p.id === openProjectPermissionsModal
  );
  const currentGrantForModal = openProjectPermissionsModal
    ? projectGrants.find((g) => g.projectId === openProjectPermissionsModal)
    : undefined;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
        >
          <div className="flex items-center justify-center gap-4 max-w-[95vw]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto flex-shrink-0"
            >
              <Card className="border-0 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between">
                  <h3 className="flex items-center text-xl font-semibold">
                    <Save className="h-5 w-5 mr-2" />
                    Edit Permissions for {member.userName || member.userEmail}
                  </h3>
                  <Button variant="outline" size="sm" onClick={handleClose}>
                    <X size={16} />
                  </Button>
                </CardHeader>

                <CardContent>
                  {isLoadingPermissions ? (
                    <div className="flex justify-center items-center py-8">
                      <LoadingSpinner />
                      <span className="ml-2 text-gray-600">
                        Loading current permissions...
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <p className="text-sm text-red-600">{error}</p>
                        </div>
                      )}

                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-base text-gray-700">
                          <strong>Member:</strong>{" "}
                          {member.userName || "Unknown"}
                        </p>
                        <p className="text-base text-gray-500">
                          {member.userEmail}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 capitalize">
                          <strong>Role:</strong> {member.role}
                        </p>
                      </div>

                      {member.role === "member" && (
                        <div className="space-y-2">
                          <label className="block text-base font-medium text-gray-700 mb-1">
                            Project Access
                          </label>
                          <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                            {isLoadingProjects ? (
                              <div className="p-4 text-center">
                                <LoadingSpinner />
                              </div>
                            ) : projects.length > 0 ? (
                              projects.map((project) => (
                                <div
                                  key={project.id}
                                  className="border-b last:border-b-0"
                                >
                                  <div className="flex items-center justify-between p-3">
                                    <span className="text-base text-gray-800">
                                      {project.projectName}
                                    </span>
                                    <PillToggle
                                      value={getProjectLevel(project.id)}
                                      onChange={(val) =>
                                        setProjectLevel(project.id, val)
                                      }
                                      size="sm"
                                      showCustom={true}
                                    />
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-4 text-center text-sm text-gray-500">
                                <Briefcase className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                No projects found in this organization.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {member.role === "owner" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <p className="text-sm text-blue-800">
                            Owners have full access to all projects and
                            documents. To change permissions, you must first
                            change their role to Member.
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end space-x-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleClose}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={isLoading || member.role === "owner"}
                        >
                          {isLoading
                            ? "Updating..."
                            : "Update Permissions"}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <AnimatePresence>
              {openProjectPermissionsModal &&
                currentProjectForModal &&
                currentGrantForModal && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto flex-shrink-0"
                  >
                    <ProjectPermissionDetailPanel
                      projectId={currentProjectForModal.id}
                      projectName={currentProjectForModal.projectName}
                      grant={currentGrantForModal}
                      projectDocsMap={projectDocsMap}
                      setResourcePermission={setResourcePermission}
                      setProjectDocPermission={setProjectDocPermission}
                      getDocumentRootType={getDocumentRootType}
                      onClose={() => setOpenProjectPermissionsModal(null)}
                    />
                  </motion.div>
                )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
