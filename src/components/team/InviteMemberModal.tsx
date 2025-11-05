// src/components/team/InviteMemberModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PillToggle, TriPermission } from '@/components/ui/PillToggle';
import { OrgMemberRole, Permission, OrgGrant, ProjectGrant } from '@/types/enhanced-types';
import { useProjects } from '@/hooks/useProjects';
import { X, Copy, Check, Mail, Briefcase, Settings } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Use the shared ProjectGrant type from '@/types/enhanced-types'

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (
    email: string,
    role: OrgMemberRole,
    projectGrants: ProjectGrant[],
    orgGrants: OrgGrant | null
  ) => Promise<string>;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onInvite
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgMemberRole>('member');
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { projects, isLoading: isLoadingProjects } = useProjects();
  const [projectGrants, setProjectGrants] = useState<ProjectGrant[]>([]);
  const [orgGrants, setOrgGrants] = useState<OrgGrant | null>(null);
  const [orgDocs, setOrgDocs] = useState<{ id: string; name: string }[]>([]);
  const [openProjectPermissionsModal, setOpenProjectPermissionsModal] = useState<string | null>(null);

  useEffect(() => {
    // When the modal opens, reset the project grants
    if (isOpen) {
      setProjectGrants([]);
      setOrgDocs([]);
      setOpenProjectPermissionsModal(null);
      // Default org-level permissions to 'view' for members so org_grants is populated
      if (role === 'member') {
        setOrgGrants({
          permissions: [
            { resource_type: 'BORROWER_RESUME', permission: 'view' },
            { resource_type: 'BORROWER_DOCS_ROOT', permission: 'view' },
          ],
          exclusions: [],
          fileOverrides: [],
        });
      } else {
        setOrgGrants(null);
      }
    }
  }, [isOpen]);

  // If role changes while modal is open, ensure defaults are applied for members and cleared for owners
  useEffect(() => {
    if (!isOpen) return;
    if (role === 'member' && !orgGrants) {
      setOrgGrants({
        permissions: [
          { resource_type: 'BORROWER_RESUME', permission: 'view' },
          { resource_type: 'BORROWER_DOCS_ROOT', permission: 'view' },
        ],
        exclusions: [],
        fileOverrides: [],
      });
    } else if (role === 'owner' && orgGrants) {
      setOrgGrants(null);
    }
  }, [role, isOpen]);

  // Close project permissions modal if role changes to owner
  useEffect(() => {
    if (role === 'owner') {
      setOpenProjectPermissionsModal(null);
    }
  }, [role]);

  const toggleProjectAccess = (projectId: string) => {
    setProjectGrants(prevGrants => {
      const existingGrant = prevGrants.find(g => g.projectId === projectId);
      if (existingGrant) {
        // Remove the grant
        return prevGrants.filter(g => g.projectId !== projectId);
      } else {
        // Add the grant with default permissions
        return [
          ...prevGrants,
          {
            projectId: projectId,
            permissions: [
              { resource_type: 'PROJECT_RESUME', permission: 'view' },
              { resource_type: 'PROJECT_DOCS_ROOT', permission: 'view' }
            ],
            fileOverrides: []
          },
        ];
      }
    });
    // Ensure docs are loaded so granular controls show immediately when expanded
    ensureProjectDocsLoaded(projectId);
  };

  const updatePermission = (projectId: string, resourceType: string, permission: Permission) => {
    setProjectGrants(prevGrants =>
      prevGrants.map(grant => {
        if (grant.projectId === projectId) {
          return {
            ...grant,
            permissions: grant.permissions.map(p =>
              p.resource_type === resourceType ? { ...p, permission } : p
            ),
          };
        }
        return grant;
      })
    );
  };
  
  const toggleExpandProject = (projectId: string) => {
    if (openProjectPermissionsModal === projectId) {
      setOpenProjectPermissionsModal(null);
    } else {
      setOpenProjectPermissionsModal(projectId);
      // Lazy-load docs when opening modal
      ensureProjectDocsLoaded(projectId);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      // Validate org-level permissions for members: must be explicitly set
      if (role === 'member' && (!orgGrants || !orgGrants.permissions || orgGrants.permissions.length === 0)) {
        setIsLoading(false);
        setError('Please choose org-level access for Borrower Resume/Docs.');
        return;
      }

      const link = await onInvite(email, role, projectGrants, role === 'member' ? orgGrants : null);
      setInviteLink(link);
    } catch (error) {
      console.error('Failed to invite member:', error);
      setError(error instanceof Error ? error.message : 'Failed to invite member');
    } finally {
      setIsLoading(false);
    }
  };
  const toggleOrgPermission = (resourceType: 'BORROWER_RESUME' | 'BORROWER_DOCS_ROOT', permission: Permission | null) => {
    setOrgGrants(prev => {
      if (!permission) {
        if (!prev) return null;
        return {
          permissions: prev.permissions.filter(p => p.resource_type !== resourceType),
          exclusions: prev.exclusions || []
        };
      }
      const base: OrgGrant = prev || { permissions: [], exclusions: [] };
      const others = base.permissions.filter(p => p.resource_type !== resourceType);
      return {
        permissions: [...others, { resource_type: resourceType, permission }],
        exclusions: base.exclusions
      };
    });
  };

  const loadOrgDocsIfNeeded = async () => {
    if (orgDocs.length > 0) return;
    try {
      const { supabase } = await import("../../../lib/supabaseClient");
      const { data } = await supabase
        .from('resources')
        .select('id,name')
        .eq('resource_type', 'FILE')
        .is('project_id', null);
      setOrgDocs(data || []);
    } catch (e) {}
  };

  const setOrgDocPermission = (resourceId: string, permission: Permission | 'none') => {
    setOrgGrants(prev => {
      const base: OrgGrant = prev || { permissions: [], fileOverrides: [] } as OrgGrant;
      const overrides = [...(base.fileOverrides || [])];
      const idx = overrides.findIndex(o => o.resource_id === resourceId);
      // Determine baseline from root BORROWER_DOCS_ROOT permission
      const rootPerm = base.permissions.find(p => p.resource_type==='BORROWER_DOCS_ROOT')?.permission;
      // If override equals root, remove it; else set/replace
      if (permission === (rootPerm || 'view')) {
        if (idx >= 0) overrides.splice(idx,1);
      } else {
        if (idx >= 0) overrides[idx] = { resource_id: resourceId, permission } as any; else overrides.push({ resource_id: resourceId, permission } as any);
      }
      return { ...base, fileOverrides: overrides } as OrgGrant;
    });
  };

  const [projectDocsMap, setProjectDocsMap] = useState<Record<string, { id: string; name: string }[]>>({});

  const ensureProjectDocsLoaded = async (projectId: string) => {
    if (projectDocsMap[projectId]) return;
    const { supabase } = await import("../../../lib/supabaseClient");
    const { data } = await supabase
      .from('resources')
      .select('id,name')
      .eq('resource_type','FILE')
      .eq('project_id', projectId);
    setProjectDocsMap(prev => ({ ...prev, [projectId]: data || [] }));
  };

  const setProjectDocPermission = (projectId: string, resourceId: string, permission: Permission | 'none') => {
    setProjectGrants(prev => prev.map(g => {
      if (g.projectId !== projectId) return g;
      const overrides = [...(g.fileOverrides || [])];
      const idx = overrides.findIndex(o => o.resource_id === resourceId);
      const rootPerm = g.permissions.find(p => p.resource_type==='PROJECT_DOCS_ROOT')?.permission;
      if (permission === (rootPerm || 'view')) {
        if (idx >= 0) overrides.splice(idx,1);
      } else {
        if (idx >= 0) overrides[idx] = { resource_id: resourceId, permission } as any; else overrides.push({ resource_id: resourceId, permission } as any);
      }
      return { ...g, fileOverrides: overrides };
    }));
  };

  const setProjectDocsPermission = (projectId: string, permission: Permission | null) => {
    setProjectGrants(prev => prev.map(g => {
      if (g.projectId !== projectId) return g;
      const others = g.permissions.filter(p => p.resource_type !== 'PROJECT_DOCS_ROOT');
      // Reset per-file overrides to baseline when changing 'all'
      if (!permission) return { ...g, permissions: others, fileOverrides: [] };
      return { ...g, permissions: [...others, { resource_type: 'PROJECT_DOCS_ROOT', permission }], fileOverrides: [] };
    }));
  };

  const setProjectResumePermission = (projectId: string, permission: Permission | null) => {
    setProjectGrants(prev => prev.map(g => {
      if (g.projectId !== projectId) return g;
      const others = g.permissions.filter(p => p.resource_type !== 'PROJECT_RESUME');
      if (!permission) return { ...g, permissions: others };
      return { ...g, permissions: [...others, { resource_type: 'PROJECT_RESUME', permission }] };
    }));
  };

  // Derive tri-state for a project grant
  const getProjectLevel = (projectId: string): TriPermission => {
    const grant = projectGrants.find(g => g.projectId === projectId);
    if (!grant) return 'none';
    const resume = grant.permissions.find(p => p.resource_type === 'PROJECT_RESUME')?.permission;
    const docs = grant.permissions.find(p => p.resource_type === 'PROJECT_DOCS_ROOT')?.permission;
    if (resume === 'edit' && docs === 'edit') return 'edit';
    return 'view';
  };

  const setProjectLevel = (projectId: string, level: TriPermission) => {
    if (level === 'none') {
      setProjectGrants(prev => prev.filter(g => g.projectId !== projectId));
      return;
    }
    setProjectGrants(prev => {
      const existing = prev.find(g => g.projectId === projectId);
      const nextPerm: Permission = level === 'edit' ? 'edit' : 'view';
      const base: ProjectGrant = existing || { projectId, permissions: [], fileOverrides: [] } as ProjectGrant;
      const others = base.permissions.filter(p => p.resource_type !== 'PROJECT_RESUME' && p.resource_type !== 'PROJECT_DOCS_ROOT');
      const updated: ProjectGrant = {
        ...base,
        permissions: [
          ...others,
          { resource_type: 'PROJECT_RESUME', permission: nextPerm },
          { resource_type: 'PROJECT_DOCS_ROOT', permission: nextPerm },
        ],
        fileOverrides: [],
      };
      ensureProjectDocsLoaded(projectId);
      return existing ? prev.map(g => (g.projectId === projectId ? updated : g)) : [...prev, updated];
    });
  };


  const handleCopyLink = async () => {
    if (inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy link:', error);
      }
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    setInviteLink(null);
    setCopied(false);
    setError(null);
    setProjectGrants([]);
    setOpenProjectPermissionsModal(null);
    onClose();
  };

  if (!isOpen) return null;

  const currentProjectForModal = projects.find(p => p.id === openProjectPermissionsModal);
  const currentGrantForModal = projectGrants.find(g => g.projectId === openProjectPermissionsModal);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex items-center justify-center gap-4 max-w-[95vw]">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="flex items-center text-xl font-semibold">
              <Mail className="h-5 w-5 mr-2" />
              Invite Team Member
            </h3>
            <Button variant="outline" size="sm" onClick={handleClose}>
              <X size={16} />
            </Button>
          </CardHeader>
          
          <CardContent>
            {!inviteLink ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                
                {/* Email Input */}
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

                {/* Role Selection */}
                <div>
                  <label htmlFor="role" className="block text-base font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('member')}
                      className={`px-4 py-2 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                        role === 'member'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Member (Limited Access)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('owner')}
                      className={`px-4 py-2 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                        role === 'owner'
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Owner (Full Access)
                    </button>
                  </div>
                </div>

                {/* Org-level Access */}
                {role === 'member' && (
                  <div className="space-y-2">
                    <label className="block text-base font-medium text-gray-700 mb-1">
                      Organization Access (Optional)
                    </label>
                    <div className="space-y-2 border border-gray-200 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-800">Borrower Resume</span>
                        <PillToggle
                          value={(orgGrants?.permissions.find(p=>p.resource_type==='BORROWER_RESUME')?.permission as TriPermission) || 'view'}
                          onChange={(val) => toggleOrgPermission('BORROWER_RESUME', val === 'none' ? null : (val as Permission))}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-base text-gray-800">Borrower Documents</span>
                        <PillToggle
                          value={(orgGrants?.permissions.find(p=>p.resource_type==='BORROWER_DOCS_ROOT')?.permission as TriPermission) || 'view'}
                          onChange={(val) => {
                            const perm = val === 'none' ? null : (val as Permission);
                            toggleOrgPermission('BORROWER_DOCS_ROOT', perm);
                            if (perm) loadOrgDocsIfNeeded();
                          }}
                          size="sm"
                        />
                      </div>
                      {orgGrants?.permissions.find(p=>p.resource_type==='BORROWER_DOCS_ROOT') && orgDocs.length>0 && (
                        <div className="mt-2 border-t pt-2 space-y-1">
                          <div className="text-sm text-gray-500">Set per-document permissions</div>
                          {orgDocs.map(doc => {
                            const rootPerm = orgGrants?.permissions.find(p=>p.resource_type==='BORROWER_DOCS_ROOT')?.permission;
                            const current = orgGrants?.fileOverrides?.find(o=>o.resource_id===doc.id)?.permission || rootPerm || 'view';
                            const Pill = ({label, val, color}:{label:string; val:'none'|'view'|'edit'; color:string}) => (
                              <button
                                type="button"
                                onClick={() => setOrgDocPermission(doc.id, val)}
                                className={`px-2 py-1 rounded text-xs border ${current===val ? color+" text-white" : 'bg-white text-gray-700'}`}
                              >{label}</button>
                            );
                            return (
                              <div key={doc.id} className="flex items-center justify-between text-base py-1">
                                <span className="text-gray-700 truncate pr-2">{doc.name}</span>
                                <div className="flex items-center gap-2">
                                  <Pill label="None" val="none" color="bg-red-600" />
                                  <Pill label="View" val="view" color="bg-blue-600" />
                                  <Pill label="Edit" val="edit" color="bg-green-600" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Project Access Selection */}
                {role === 'member' && (
                  <div className="space-y-2">
                    <label className="block text-base font-medium text-gray-700 mb-1">
                      Project Access (Optional)
                    </label>
                    <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                      {isLoadingProjects ? (
                        <div className="p-4 text-center">
                          <LoadingSpinner />
                        </div>
                      ) : projects.length > 0 ? (
                        projects.map(project => {
                          return (
                            <div key={project.id} className="border-b last:border-b-0">
                              <div className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-base text-gray-800">{project.projectName}</span>
                                  <PillToggle
                                    value={getProjectLevel(project.id)}
                                    onChange={(val) => setProjectLevel(project.id, val)}
                                    size="sm"
                                  />
                                </div>
                                {getProjectLevel(project.id) !== 'none' && (
                                  <Button variant="outline" size="sm" onClick={() => toggleExpandProject(project.id)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
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
                
                {/* Role-based permissions info */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Role-based permissions:</strong><br />
                    • <strong>Owner:</strong> Full access to all projects and documents.<br />
                    • <strong>Member:</strong> Access is determined by the project selections above. If no projects are selected, they will not see any.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </form>
            ) : (
              /* Invite Link Generated */
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
                  <Button variant="outline" onClick={handleClose}>
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
          
          {/* Project Permissions Modal - appears next to main modal */}
          {openProjectPermissionsModal && currentProjectForModal && currentGrantForModal && (
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-right duration-200">
            <Card className="border-0 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <h3 className="flex items-center text-xl font-semibold">
                  <Briefcase className="h-5 w-5 mr-2" />
                  {currentProjectForModal.projectName} - Permissions
                </h3>
                <Button variant="outline" size="sm" onClick={() => setOpenProjectPermissionsModal(null)}>
                  <X size={16} />
                </Button>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base text-gray-800">Project Resume</span>
                    <PillToggle
                      value={(currentGrantForModal.permissions.find(p=>p.resource_type==='PROJECT_RESUME')?.permission as TriPermission) || 'view'}
                      onChange={(val) => setProjectResumePermission(openProjectPermissionsModal, val === 'none' ? null : (val as Permission))}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-base text-gray-800">Project Documents</span>
                    <PillToggle
                      value={(currentGrantForModal.permissions.find(p=>p.resource_type==='PROJECT_DOCS_ROOT')?.permission as TriPermission) || 'view'}
                      onChange={(val) => {
                        const perm = val === 'none' ? null : (val as Permission);
                        setProjectDocsPermission(openProjectPermissionsModal, perm);
                        if (perm) ensureProjectDocsLoaded(openProjectPermissionsModal);
                      }}
                      size="sm"
                    />
                  </div>
                </div>
                
                {currentGrantForModal.permissions.find(p=>p.resource_type==='PROJECT_DOCS_ROOT') && (projectDocsMap[openProjectPermissionsModal]?.length || 0) > 0 && (
                  <div className="border-t pt-4 space-y-2">
                    <div className="text-sm font-medium text-gray-700 mb-2">Set per-document permissions</div>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {(projectDocsMap[openProjectPermissionsModal] || []).map(doc => {
                        const rootPerm = currentGrantForModal.permissions.find(p=>p.resource_type==='PROJECT_DOCS_ROOT')?.permission;
                        const currentOverride = currentGrantForModal.fileOverrides?.find(o=>o.resource_id===doc.id)?.permission;
                        const current: TriPermission = currentOverride || (rootPerm as Permission) || 'view';
                        return (
                          <div key={doc.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-b-0">
                            <span className="text-gray-700 truncate pr-2">{doc.name}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <PillToggle
                                value={current}
                                onChange={(val) => setProjectDocPermission(openProjectPermissionsModal, doc.id, val)}
                                size="xs"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end pt-4 border-t">
                  <Button variant="primary" onClick={() => setOpenProjectPermissionsModal(null)}>
                    Done
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
