// src/components/team/EditMemberPermissionsModal.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PillToggle, TriPermission } from '@/components/ui/PillToggle';
import { Permission, OrgGrant, ProjectGrant, OrgMember } from '@/types/enhanced-types';
import { useProjects } from '@/hooks/useProjects';
import { X, Briefcase, Save, Settings } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabaseClient';

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

interface EditMemberPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: OrgMember;
  orgId: string;
  onUpdate: (
    userId: string,
    projectGrants: ProjectGrant[],
    orgGrants: OrgGrant | null
  ) => Promise<void>;
}

export const EditMemberPermissionsModal: React.FC<EditMemberPermissionsModalProps> = ({
  isOpen,
  onClose,
  member,
  orgId,
  onUpdate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

  const { projects, isLoading: isLoadingProjects } = useProjects();
  const [projectGrants, setProjectGrants] = useState<ProjectGrant[]>([]);
  const [orgGrants, setOrgGrants] = useState<OrgGrant | null>(null);
  const [projectDocsMap, setProjectDocsMap] = useState<Record<string, { id: string; name: string; parent_id: string | null }[]>>({});
  const [projectResourcesMap, setProjectResourcesMap] = useState<Record<string, Map<string, { id: string; parent_id: string | null; resource_type: string }>>>({});
  const [projectRootsMap, setProjectRootsMap] = useState<Record<string, { projectDocsRootId: string | null; borrowerDocsRootId: string | null }>>({});
  const [openProjectPermissionsModal, setOpenProjectPermissionsModal] = useState<string | null>(null);

  const ensureProjectDocsLoaded = useCallback(
    async (projectId: string) => {
      if (projectDocsMap[projectId] && projectRootsMap[projectId] && projectResourcesMap[projectId]) return;
      
      // Load root resources first
      const { data: roots } = await supabase
        .from('resources')
        .select('id,resource_type')
        .eq('project_id', projectId)
        .in('resource_type', ['PROJECT_DOCS_ROOT', 'BORROWER_DOCS_ROOT']);
      
      const projectDocsRootId = roots?.find(r => r.resource_type === 'PROJECT_DOCS_ROOT')?.id || null;
      const borrowerDocsRootId = roots?.find(r => r.resource_type === 'BORROWER_DOCS_ROOT')?.id || null;
      
      setProjectRootsMap((prev) => ({ 
        ...prev, 
        [projectId]: { projectDocsRootId, borrowerDocsRootId } 
      }));
      
      // Load all resources (files and folders) to trace parent chains
      const { data: allResources } = await supabase
        .from('resources')
        .select('id,parent_id,resource_type')
        .eq('project_id', projectId)
        .in('resource_type', ['FILE', 'FOLDER', 'PROJECT_DOCS_ROOT', 'BORROWER_DOCS_ROOT']);
      
      const resourcesMap = new Map<string, { id: string; parent_id: string | null; resource_type: string }>();
      allResources?.forEach(r => {
        resourcesMap.set(r.id, { id: r.id, parent_id: r.parent_id, resource_type: r.resource_type });
      });
      
      setProjectResourcesMap((prev) => ({ ...prev, [projectId]: resourcesMap }));
      
      // Load documents with parent_id for display
      const { data: files } = await supabase
        .from('resources')
        .select('id,name,parent_id')
        .eq('resource_type', 'FILE')
        .eq('project_id', projectId);
      setProjectDocsMap((prev) => ({ ...prev, [projectId]: files || [] }));
    },
    [projectDocsMap, projectRootsMap, projectResourcesMap]
  );

  // Load current permissions when modal opens
  useEffect(() => {
    if (!(isOpen && member)) return;
    let isCancelled = false;
    const load = async () => {
      setIsLoadingPermissions(true);
      try {
        const { data: permissions, error: permError } = await supabase
          .from('permissions')
          .select('resource_id, permission, resources(id, name, resource_type, project_id, org_id)')
          .eq('user_id', member.user_id);

        if (permError) {
          console.error('Error loading permissions:', permError);
          if (!isCancelled) setIsLoadingPermissions(false);
          return;
        }

        const orgPermissions: OrgGrant = { permissions: [], fileOverrides: [] };
        const projectPermsMap = new Map<string, ProjectGrant>();

        permissions?.forEach((perm: any) => {
          const resource = perm.resources;
          if (!resource) return;

          // Organization-level resources (only FILE resources without project_id)
          if (resource.org_id === orgId && !resource.project_id) {
            if (resource.resource_type === 'FILE') {
              orgPermissions.fileOverrides = orgPermissions.fileOverrides || [];
              orgPermissions.fileOverrides.push({ resource_id: resource.id, permission: perm.permission });
            }
          }

          // Project-level resources (including borrower resume/docs which are now project-scoped)
          if (resource.project_id) {
            if (!projectPermsMap.has(resource.project_id)) {
              projectPermsMap.set(resource.project_id, { projectId: resource.project_id, permissions: [], fileOverrides: [] });
            }
            const projectGrant = projectPermsMap.get(resource.project_id)!;
            if (RESOURCE_TYPES.includes(resource.resource_type as ResourceType)) {
              projectGrant.permissions.push({ resource_type: resource.resource_type, permission: perm.permission });
            } else if (resource.resource_type === 'FILE') {
              projectGrant.fileOverrides = projectGrant.fileOverrides || [];
              projectGrant.fileOverrides.push({ resource_id: resource.id, permission: perm.permission });
            }
          }
        });

        if (!isCancelled) {
          // Set orgGrants if there are any file overrides (org-level permissions are now project-scoped)
          setOrgGrants(orgPermissions.fileOverrides && orgPermissions.fileOverrides.length > 0 ? orgPermissions : null);
          setProjectGrants(Array.from(projectPermsMap.values()));
        }
      } catch (err) {
        console.error('Error loading current permissions:', err);
      } finally {
        if (!isCancelled) setIsLoadingPermissions(false);
      }
    };
    load();
    return () => { isCancelled = true; };
  }, [isOpen, member, orgId]);


  useEffect(() => {
    if (!isOpen) return;
    const projectIdsNeedingDocs = projectGrants
      .filter((grant) =>
        grant.permissions.some((p) => p.resource_type === 'PROJECT_DOCS_ROOT' || p.resource_type === 'BORROWER_DOCS_ROOT')
      )
      .map((grant) => grant.projectId)
      .filter((projectId) => !projectDocsMap[projectId]);

    if (projectIdsNeedingDocs.length === 0) return;

    let isCancelled = false;

    const loadProjectDocs = async () => {
      try {
        const results = await Promise.all(
          projectIdsNeedingDocs.map(async (projectId) => {
            // Load root resources first
            const { data: roots } = await supabase
              .from('resources')
              .select('id,resource_type')
              .eq('project_id', projectId)
              .in('resource_type', ['PROJECT_DOCS_ROOT', 'BORROWER_DOCS_ROOT']);
            
            const projectDocsRootId = roots?.find(r => r.resource_type === 'PROJECT_DOCS_ROOT')?.id || null;
            const borrowerDocsRootId = roots?.find(r => r.resource_type === 'BORROWER_DOCS_ROOT')?.id || null;
            
            // Load all resources (files and folders) to trace parent chains
            const { data: allResources } = await supabase
              .from('resources')
              .select('id,parent_id,resource_type')
              .eq('project_id', projectId)
              .in('resource_type', ['FILE', 'FOLDER', 'PROJECT_DOCS_ROOT', 'BORROWER_DOCS_ROOT']);
            
            const resourcesMap = new Map<string, { id: string; parent_id: string | null; resource_type: string }>();
            allResources?.forEach(r => {
              resourcesMap.set(r.id, { id: r.id, parent_id: r.parent_id, resource_type: r.resource_type });
            });
            
            // Load documents with parent_id for display
            const { data: docs } = await supabase
              .from('resources')
              .select('id,name,parent_id')
              .eq('resource_type', 'FILE')
              .eq('project_id', projectId);
            
            return { 
              projectId, 
              docs: docs || [],
              roots: { projectDocsRootId, borrowerDocsRootId },
              resourcesMap
            };
          })
        );

        if (isCancelled) return;

        setProjectDocsMap((prev) => {
          const next = { ...prev };
          results.forEach(({ projectId, docs }) => {
            next[projectId] = docs;
          });
          return next;
        });
        
        setProjectRootsMap((prev) => {
          const next = { ...prev };
          results.forEach(({ projectId, roots }) => {
            next[projectId] = roots;
          });
          return next;
        });
        
        setProjectResourcesMap((prev) => {
          const next = { ...prev };
          results.forEach(({ projectId, resourcesMap }) => {
            next[projectId] = resourcesMap;
          });
          return next;
        });
      } catch (err) {
        console.error('Error loading project documents:', err);
      }
    };

    loadProjectDocs();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, projectGrants, projectDocsMap]);

  useEffect(() => {
    if (openProjectPermissionsModal) {
      ensureProjectDocsLoaded(openProjectPermissionsModal);
    }
  }, [openProjectPermissionsModal, ensureProjectDocsLoaded]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);
    try {
      await onUpdate(member.user_id, projectGrants, orgGrants);
      handleClose();
    } catch (error) {
      console.error('Failed to update permissions:', error);
      setError(error instanceof Error ? error.message : 'Failed to update permissions');
    } finally {
      setIsLoading(false);
    }
  };


  

  // Helper function to determine which root a document belongs to by tracing up the parent chain
  const getDocumentRootType = (projectId: string, docParentId: string | null): 'PROJECT_DOCS_ROOT' | 'BORROWER_DOCS_ROOT' | null => {
    const roots = projectRootsMap[projectId];
    const resourcesMap = projectResourcesMap[projectId];
    if (!roots || !resourcesMap) return null;
    
    // Trace up the parent chain to find the root
    let currentParentId = docParentId;
    const visited = new Set<string>(); // Prevent infinite loops
    
    while (currentParentId) {
      if (visited.has(currentParentId)) break; // Safety check
      visited.add(currentParentId);
      
      // Check if current parent is one of the roots
      if (currentParentId === roots.projectDocsRootId) return 'PROJECT_DOCS_ROOT';
      if (currentParentId === roots.borrowerDocsRootId) return 'BORROWER_DOCS_ROOT';
      
      // Move up to the next parent
      const parent = resourcesMap.get(currentParentId);
      if (!parent) break;
      currentParentId = parent.parent_id;
    }
    
    return null;
  };

  const setProjectDocPermission = (projectId: string, resourceId: string, permission: Permission | 'none') => {
    setProjectGrants(prev => prev.map(g => {
      if (g.projectId !== projectId) return g;
      const overrides = [...(g.fileOverrides || [])];
      const idx = overrides.findIndex(o => o.resource_id === resourceId);
      
      // Find the document to determine its root type
      const doc = projectDocsMap[projectId]?.find(d => d.id === resourceId);
      const rootType = doc ? getDocumentRootType(projectId, doc.parent_id) : null;
      
      // Get the appropriate root permission
      const rootPerm = rootType 
        ? g.permissions.find(p => p.resource_type === rootType)?.permission 
        : g.permissions.find(p => p.resource_type === 'PROJECT_DOCS_ROOT' || p.resource_type === 'BORROWER_DOCS_ROOT')?.permission;
      
      if (permission === (rootPerm || 'view')) {
        if (idx >= 0) overrides.splice(idx, 1);
      } else {
        if (idx >= 0) overrides[idx] = { resource_id: resourceId, permission } as any;
        else overrides.push({ resource_id: resourceId, permission } as any);
      }
      return { ...g, fileOverrides: overrides };
    }));
  };

  const setProjectDocsPermission = (projectId: string, permission: Permission | null) => {
    setProjectGrants(prev => prev.map(g => {
      if (g.projectId !== projectId) return g;
      const others = g.permissions.filter(p => p.resource_type !== 'PROJECT_DOCS_ROOT');
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

  const setResourcePermission = (projectId: string, resourceType: ResourceType, permission: Permission | null) => {
    setProjectGrants(prev => {
      const existing = prev.find(g => g.projectId === projectId);
      if (!existing) {
        if (!permission) return prev;
        return [
          ...prev,
          {
            projectId,
            permissions: [{ resource_type: resourceType, permission }],
            fileOverrides: []
          }
        ];
      }
      const others = existing.permissions.filter(p => p.resource_type !== resourceType);
      if (!permission) {
        return prev.map(g => 
          g.projectId === projectId 
            ? { ...g, permissions: others }
            : g
        );
      }
      return prev.map(g =>
        g.projectId === projectId
          ? { ...g, permissions: [...others, { resource_type: resourceType, permission }] }
          : g
      );
    });
    // Load docs if needed when setting BORROWER_DOCS_ROOT permission
    if (resourceType === 'BORROWER_DOCS_ROOT' && permission) {
      ensureProjectDocsLoaded(projectId);
    }
  };

  const getProjectLevel = (projectId: string): TriPermission => {
    const grant = projectGrants.find(g => g.projectId === projectId);
    if (!grant) return 'none';
    // Check all 4 resource types - must have all 4 permissions set
    const permissions = RESOURCE_TYPES.map((resourceType) =>
      grant.permissions.find((p) => p.resource_type === resourceType)?.permission ?? null
    );
    // If all 4 are set to 'edit', return 'edit'
    if (permissions.every((perm) => perm === 'edit')) return 'edit';
    // If all 4 are set to 'view', return 'view'
    if (permissions.every((perm) => perm === 'view')) return 'view';
    // If any are set (but not all the same), return 'view' as a mixed state
    if (permissions.some((perm) => perm === 'view' || perm === 'edit')) return 'view';
    return 'none';
  };

  const setProjectLevel = (projectId: string, level: TriPermission) => {
    if (level === 'none') {
      setProjectGrants(prev => prev.filter(g => g.projectId !== projectId));
      if (openProjectPermissionsModal === projectId) {
        setOpenProjectPermissionsModal(null);
      }
      return;
    }
    setProjectGrants(prev => {
      const existing = prev.find(g => g.projectId === projectId);
      const nextPerm: Permission = level === 'edit' ? 'edit' : 'view';
      // Set all 4 resource types to the same level (like InviteMemberModal)
      const updated: ProjectGrant = {
        projectId,
        permissions: RESOURCE_TYPES.map((resource_type) => ({ resource_type, permission: nextPerm })),
        fileOverrides: [],
      };
      ensureProjectDocsLoaded(projectId);
      return existing ? prev.map(g => (g.projectId === projectId ? updated : g)) : [...prev, updated];
    });
  };

  const handleClose = () => {
    setError(null);
    setProjectGrants([]);
    setOrgGrants(null);
    setProjectDocsMap({});
    setProjectResourcesMap({});
    setProjectRootsMap({});
    setOpenProjectPermissionsModal(null);
    onClose();
  };

  const currentProjectForModal = openProjectPermissionsModal
    ? projects.find((p) => p.id === openProjectPermissionsModal)
    : undefined;
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
                <span className="ml-2 text-gray-600">Loading current permissions...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Member Info */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-base text-gray-700">
                    <strong>Member:</strong> {member.userName || 'Unknown'}
                  </p>
                  <p className="text-base text-gray-500">{member.userEmail}</p>
                  <p className="text-sm text-gray-500 mt-1 capitalize">
                    <strong>Role:</strong> {member.role}
                  </p>
                </div>

                {/* Project Access Selection */}
                {member.role === 'member' && (
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
                          const level = getProjectLevel(project.id);
                          return (
                            <div key={project.id} className="border-b last:border-b-0">
                              <div className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-base text-gray-800">{project.projectName}</span>
                                  <PillToggle
                                    value={level}
                                    onChange={(val) => setProjectLevel(project.id, val)}
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

                {member.role === 'owner' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800">
                      Owners have full access to all projects and documents. To change permissions, you must first change their role to Member.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isLoading || member.role === 'owner'}
                  >
                    {isLoading ? 'Updating...' : 'Update Permissions'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
            </motion.div>

            <AnimatePresence>
              {openProjectPermissionsModal && currentProjectForModal && currentGrantForModal && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto flex-shrink-0"
                >
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
                      setResourcePermission(
                        currentProjectForModal.id,
                        resourceType,
                        val === 'none' ? null : (val as Permission)
                      )
                    }
                    size="sm"
                  />
                </div>
              ))}

              {(currentGrantForModal.permissions.find((p) => p.resource_type === 'PROJECT_DOCS_ROOT') ||
                currentGrantForModal.permissions.find((p) => p.resource_type === 'BORROWER_DOCS_ROOT')) &&
                (projectDocsMap[currentProjectForModal.id]?.length || 0) > 0 && (
                  <div className="border-t pt-2 space-y-1">
                    <div className="text-sm text-gray-500">Set per-document permissions</div>
                    {(projectDocsMap[currentProjectForModal.id] || []).map((doc) => {
                      // Determine which root this document belongs to
                      const rootType = getDocumentRootType(currentProjectForModal.id, doc.parent_id);
                      
                      // Get the appropriate root permission based on document type
                      const rootPerm = rootType
                        ? currentGrantForModal.permissions.find((p) => p.resource_type === rootType)?.permission
                        : currentGrantForModal.permissions.find(
                            (p) => p.resource_type === 'PROJECT_DOCS_ROOT' || p.resource_type === 'BORROWER_DOCS_ROOT'
                          )?.permission;
                      
                      const current =
                        currentGrantForModal.fileOverrides?.find((o) => o.resource_id === doc.id)?.permission ||
                        rootPerm ||
                        'view';
                      
                      // Determine document category label
                      const docCategory = rootType === 'BORROWER_DOCS_ROOT' ? ' (Borrower)' : rootType === 'PROJECT_DOCS_ROOT' ? ' (Project)' : '';
                      
                      return (
                        <div key={doc.id} className="flex items-center justify-between text-base py-1">
                          <span className="text-gray-700 truncate pr-2">
                            {doc.name}
                            {docCategory && <span className="text-xs text-gray-500">{docCategory}</span>}
                          </span>
                          <PillToggle
                            value={current as TriPermission}
                            onChange={(val) =>
                              setProjectDocPermission(currentProjectForModal.id, doc.id, val as Permission | 'none')
                            }
                            size="xs"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

              <div className="flex justify-end pt-4 border-t">
                <Button variant="primary" onClick={() => setOpenProjectPermissionsModal(null)}>
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
