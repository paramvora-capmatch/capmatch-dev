// src/components/team/InviteMemberModal.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PillToggle } from "@/components/ui/PillToggle";
import { OrgMemberRole, ProjectGrant } from "@/types/enhanced-types";
import { useProjects } from "@/hooks/useProjects";
import { useProjectPermissionEditor } from "@/hooks/useProjectPermissionEditor";
import { ProjectPermissionDetailPanel } from "@/components/team/ProjectPermissionDetailPanel";
import { X, Copy, Check, Mail, Briefcase } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (
    email: string,
    role: OrgMemberRole,
    projectGrants: ProjectGrant[],
    orgGrants: null
  ) => Promise<string>;
  allowProjectInvites?: boolean;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInvite,
  allowProjectInvites = true,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgMemberRole>("member");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    getDocumentRootType,
  } = useProjectPermissionEditor(setOpenProjectPermissionsModal);

  useEffect(() => {
    if (!isOpen) return;
    setEmail("");
    setRole("member");
    setInviteLink(null);
    setCopied(false);
    setError(null);
    setProjectGrants([]);
    setOpenProjectPermissionsModal(null);
  }, [isOpen, setProjectGrants]);

  useEffect(() => {
    if (role !== "member") {
      setOpenProjectPermissionsModal(null);
    }
  }, [role]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const link = await onInvite(email, role, projectGrants, null);
      setInviteLink(link);
    } catch (err) {
      console.error("Failed to invite member:", err);
      let errorMessage = "Failed to invite member";
      if (err instanceof Error) {
        errorMessage = err.message;
        if (
          errorMessage.toLowerCase().includes("already registered") ||
          errorMessage.toLowerCase().includes("email already")
        ) {
          errorMessage = `This email address is already registered. Please invite them directly or ask them to join your organization.`;
        } else if (errorMessage.toLowerCase().includes("active invite")) {
          errorMessage = `An active invitation already exists for this email address.`;
        } else if (errorMessage.toLowerCase().includes("authentication failed")) {
          errorMessage = `Authentication failed. Please try logging in again.`;
        } else if (errorMessage.toLowerCase().includes("must be an owner")) {
          errorMessage = `You must be an organization owner to invite members.`;
        }
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
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
              className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto flex-shrink-0 min-w-0"
            >
              <Card className="border-0 shadow-none">
                <CardHeader className="flex flex-row items-center justify-between">
                  <h3 className="flex items-center text-xl font-semibold">
                    <Mail className="h-5 w-5 mr-2" />
                    Invite Team Member
                  </h3>
                  <Button variant="outline" size="sm" onClick={onClose}>
                    <X size={16} />
                  </Button>
                </CardHeader>

                <CardContent>
                  {!inviteLink ? (
                    <form onSubmit={handleSubmit} className="space-y-4 min-w-0">
                      {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 min-w-0">
                          <p className="text-sm text-red-600 break-words overflow-wrap-anywhere">
                            {error}
                          </p>
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="email"
                          className="block text-base font-medium text-gray-700 mb-1"
                        >
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter email address"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">
                          Role
                        </label>
                        <div className="flex flex-1 bg-gradient-to-r from-gray-100 to-gray-50 p-1 rounded-lg shadow-inner">
                          <button
                            type="button"
                            onClick={() => setRole("member")}
                            className={cn(
                              "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 border-2 border-transparent",
                              role === "member"
                                ? "bg-gradient-to-r from-white to-gray-50 text-blue-600 shadow-md border-blue-400"
                                : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02] hover:border-blue-200/70 focus-visible:border-blue-300"
                            )}
                            aria-pressed={role === "member"}
                          >
                            <span>Member (Limited Access)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRole("owner")}
                            className={cn(
                              "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 border-2 border-transparent",
                              role === "owner"
                                ? "bg-gradient-to-r from-white to-gray-50 text-green-600 shadow-md border-green-400"
                                : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02] hover:border-green-200/70 focus-visible:border-green-300"
                            )}
                            aria-pressed={role === "owner"}
                          >
                            <span>Owner (Full Access)</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Role-based permissions:</strong>
                          <br />
                          • <strong>Owner:</strong> Full access to all{" "}
                          {allowProjectInvites
                            ? "projects and documents"
                            : "organization resources"}
                          .<br />
                          {allowProjectInvites ? (
                            <>
                              • <strong>Member:</strong> Access is determined by
                              the project selections below.
                            </>
                          ) : (
                            <>
                              • <strong>Member:</strong> Can access organization
                              resources only. Project-level invites are not
                              available.
                            </>
                          )}
                        </p>
                      </div>

                      {role === "member" && allowProjectInvites && (
                        <div className="space-y-3">
                          <label className="block text-base font-medium text-gray-700">
                            Project Access
                          </label>
                          <div className="max-h-60 overflow-y-auto pr-1">
                            <div className="flex flex-col gap-3">
                              {isLoadingProjects ? (
                                <div className="p-4 text-center">
                                  <LoadingSpinner />
                                </div>
                              ) : projects.length > 0 ? (
                                projects.map((project) => (
                                  <div
                                    key={project.id}
                                    className="rounded-xl border border-gray-200 bg-white/90 px-4 py-3 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md"
                                  >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 flex-1">
                                        <span className="text-base font-medium text-gray-800">
                                          {project.projectName}
                                        </span>
                                        <PillToggle
                                          value={getProjectLevel(project.id)}
                                          onChange={(val) =>
                                            setProjectLevel(project.id, val)
                                          }
                                          size="sm"
                                          className="sm:max-w-[260px]"
                                          showCustom={true}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-4 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-xl">
                                  <Briefcase className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                  No projects found in this organization.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end space-x-3 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={isLoading}
                        >
                          {isLoading ? "Sending..." : "Send Invitation"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                          <Check className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Invitation Sent!
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                          Share this link with {email} to complete their
                          invitation.
                        </p>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={inviteLink}
                            readOnly
                            className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyLink}
                            className="flex items-center"
                          >
                            {copied ? (
                              <Check size={16} />
                            ) : (
                              <Copy size={16} />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> This invitation link will expire
                          in 24 hours.
                        </p>
                      </div>

                      <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="outline" onClick={onClose}>
                          Close
                        </Button>
                        <Button variant="primary" onClick={handleCopyLink}>
                          {copied ? "Copied!" : "Copy Link"}
                        </Button>
                      </div>
                    </div>
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
