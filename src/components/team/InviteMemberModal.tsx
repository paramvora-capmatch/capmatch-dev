// src/components/team/InviteMemberModal.tsx
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PillToggle, TriPermission } from '@/components/ui/PillToggle';
import { OrgMemberRole, Permission, ProjectGrant } from '@/types/enhanced-types';
import { useProjects } from '@/hooks/useProjects';
import { X, Copy, Check, Mail, Briefcase, Settings } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/utils/cn';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (
    email: string,
    role: OrgMemberRole,
    projectGrants: ProjectGrant[],
    orgGrants: null
  ) => Promise<string>;
}

const RESOURCE_TYPES = [
  'PROJECT_RESUME',
  'PROJECT_DOCS_ROOT',
  'BORROWER_RESUME',
  'BORROWER_DOCS_ROOT',
] as const;

type ResourceType = typeof RESOURCE_TYPES[number];

const resourceLabels: Record<ResourceType, string> = {
  PROJECT_RESUME: 'Project Resume',
  PROJECT_DOCS_ROOT: 'Project Documents',
  BORROWER_RESUME: 'Borrower Resume',
  BORROWER_DOCS_ROOT: 'Borrower Documents',
};

const levelToPermission = (level: TriPermission): Permission | null => {
  if (level === 'none') return null;
  return level === 'edit' ? 'edit' : 'view';
};

const computeProjectLevel = (grant: ProjectGrant | undefined): TriPermission => {
  if (!grant) return 'none';
  const permissions = RESOURCE_TYPES.map((resourceType) =>
    grant.permissions.find((p) => p.resource_type === resourceType)?.permission ?? null
  );
  if (permissions.every((perm) => perm === 'edit')) return 'edit';
  if (permissions.some((perm) => perm === 'view' || perm === 'edit')) return 'view';
  return 'none';
};

const defaultPermissionsForLevel = (level: TriPermission) => {
  const permission = levelToPermission(level);
  if (!permission) return [] as ProjectGrant['permissions'];
  return RESOURCE_TYPES.map((resource_type) => ({ resource_type, permission }));
};

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInvite,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgMemberRole>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { projects, isLoading: isLoadingProjects } = useProjects();
  const [projectGrants, setProjectGrants] = useState<ProjectGrant[]>([]);
  const [openProjectPermissionsModal, setOpenProjectPermissionsModal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEmail('');
    setRole('member');
    setInviteLink(null);
    setCopied(false);
    setError(null);
    setProjectGrants([]);
    setOpenProjectPermissionsModal(null);
  }, [isOpen]);

  useEffect(() => {
    if (role !== 'member') {
      setOpenProjectPermissionsModal(null);
    }
  }, [role]);

  const projectMap = useMemo(() => {
    return new Map(projectGrants.map((grant) => [grant.projectId, grant]));
  }, [projectGrants]);

  const handleProjectLevelChange = (projectId: string, level: TriPermission) => {
    setProjectGrants((prev) => {
      if (level === 'none') {
        return prev.filter((grant) => grant.projectId !== projectId);
      }

      const permissions = defaultPermissionsForLevel(level);
      const existing = prev.find((grant) => grant.projectId === projectId);

      if (existing) {
        return prev.map((grant) =>
          grant.projectId === projectId
            ? { ...grant, permissions }
            : grant
        );
      }

      return [
        ...prev,
        {
          projectId,
          permissions,
          fileOverrides: [],
        },
      ];
    });
  };

  const handleResourcePermissionChange = (
    projectId: string,
    resourceType: ResourceType,
    level: TriPermission
  ) => {
    setProjectGrants((prev) => {
      const permission = levelToPermission(level);
      const existing = prev.find((grant) => grant.projectId === projectId);

      if (!existing) {
        if (!permission) return prev;
        return [
          ...prev,
          {
            projectId,
            permissions: [{ resource_type: resourceType, permission }],
            fileOverrides: [],
          },
        ];
      }

      const otherPermissions = existing.permissions.filter(
        (perm) => perm.resource_type !== resourceType
      );

      const updatedPermissions = permission
        ? [...otherPermissions, { resource_type: resourceType, permission }]
        : otherPermissions;

      return prev.map((grant) =>
        grant.projectId === projectId
          ? { ...grant, permissions: updatedPermissions }
          : grant
      );
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const link = await onInvite(email, role, projectGrants, null);
      setInviteLink(link);
    } catch (err) {
      console.error('Failed to invite member:', err);
      setError(err instanceof Error ? err.message : 'Failed to invite member');
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
      console.error('Failed to copy link:', err);
    }
  };

  if (!isOpen) return null;

  const currentProjectForModal = projects.find(
    (project) => project.id === openProjectPermissionsModal
  );
  const currentGrantForModal = openProjectPermissionsModal
    ? projectMap.get(openProjectPermissionsModal)
    : undefined;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex items-center justify-center gap-4 max-w-[95vw]">
        {/* Wider modal for Invite Team Member */}
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto flex-shrink-0">
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
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-1">
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
                        onClick={() => setRole('member')}
                        className={cn(
                          "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 border-2 border-transparent",
                          role === 'member'
                            ? "bg-gradient-to-r from-white to-gray-50 text-blue-600 shadow-md border-blue-400"
                            : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02] hover:border-blue-200/70 focus-visible:border-blue-300"
                        )}
                        aria-pressed={role === 'member'}
                      >
                        <span>Member (Limited Access)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('owner')}
                        className={cn(
                          "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 border-2 border-transparent",
                          role === 'owner'
                            ? "bg-gradient-to-r from-white to-gray-50 text-green-600 shadow-md border-green-400"
                            : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02] hover:border-green-200/70 focus-visible:border-green-300"
                        )}
                        aria-pressed={role === 'owner'}
                      >
                        <span>Owner (Full Access)</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Role-based permissions:</strong><br />
                      • <strong>Owner:</strong> Full access to all projects and documents.<br />
                      • <strong>Member:</strong> Access is determined by the project selections below.
                    </p>
                  </div>

                  {role === 'member' && (
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
                          projects.map((project) => {
                            const grant = projectMap.get(project.id);
                            const level = computeProjectLevel(grant);
                            return (
                              <div key={project.id} className="border-b last:border-b-0">
                                <div className="flex items-center justify-between p-3">
                                  <div className="flex items-center gap-3">
                                    <span className="text-base text-gray-800">{project.projectName}</span>
                                    <PillToggle
                                      value={level}
                                      onChange={(val) => handleProjectLevelChange(project.id, val)}
                                      size="sm"
                                    />
                                  </div>
                                  {level !== 'none' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setOpenProjectPermissionsModal(project.id)}
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                      <Settings size={16} className="mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-500">
                            <Briefcase className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                            No projects found in this organization.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={isLoading}>
                      {isLoading ? 'Sending...' : 'Send Invitation'}
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
                      Share this link with {email} to complete their invitation.
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
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> This invitation link will expire in 24 hours.
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="outline" onClick={onClose}>
                      Close
                    </Button>
                    <Button variant="primary" onClick={handleCopyLink}>
                      {copied ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {openProjectPermissionsModal && currentProjectForModal && currentGrantForModal && (
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-right duration-200 flex-shrink-0">
            <Card className="border-0 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <h3 className="flex items-center text-xl font-semibold">
                  <Briefcase className="h-5 w-5 mr-2" />
                  {currentProjectForModal.projectName} - Permissions
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpenProjectPermissionsModal(null)}
                >
                  <X size={16} />
                </Button>
              </CardHeader>

              <CardContent className="space-y-3">
                {RESOURCE_TYPES.map((resourceType) => (
                  <div key={resourceType} className="flex items-center justify-between">
                    <span className="text-base text-gray-800">{resourceLabels[resourceType]}</span>
                    <PillToggle
                      value={
                        (currentGrantForModal.permissions.find(
                          (perm) => perm.resource_type === resourceType
                        )?.permission as TriPermission) || 'none'
                      }
                      onChange={(val) =>
                        handleResourcePermissionChange(
                          currentProjectForModal.id,
                          resourceType,
                          val
                        )
                      }
                      size="sm"
                    />
                  </div>
                ))}

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    variant="primary"
                    onClick={() => setOpenProjectPermissionsModal(null)}
                  >
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


