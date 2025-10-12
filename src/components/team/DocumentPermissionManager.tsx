// src/components/team/DocumentPermissionManager.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BorrowerEntityMember } from '@/types/enhanced-types';
import { useProjects } from '@/hooks/useProjects';
import { useDocumentPermissionStore } from '@/stores/useDocumentPermissionStore';
import { X, Save, FileText, Folder } from 'lucide-react';

interface DocumentPermissionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  member: BorrowerEntityMember;
}

export const DocumentPermissionManager: React.FC<DocumentPermissionManagerProps> = ({
  isOpen,
  onClose,
  member
}) => {
  const { projects } = useProjects();
  const { 
    permissions, 
    isLoading, 
    loadPermissions, 
    bulkGrantPermissions, 
    bulkRevokePermissions 
  } = useDocumentPermissionStore();

  const [projectPermissions, setProjectPermissions] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && projects.length > 0) {
      // Load permissions for each project
      projects.forEach(project => {
        loadPermissions(project.id);
      });

      // Initialize project permissions state
      const initialPermissions: Record<string, boolean> = {};
      projects.forEach(project => {
        const projectPerms = permissions.get(project.id) || [];
        const hasAccess = projectPerms.some(perm => 
          perm.userId === member.userId && perm.documentPath === '*'
        );
        initialPermissions[project.id] = hasAccess;
      });
      setProjectPermissions(initialPermissions);
    }
  }, [isOpen, projects, member.userId, loadPermissions, permissions]);

  const handleProjectToggle = (projectId: string) => {
    setProjectPermissions(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const project of projects) {
        const hasAccess = projectPermissions[project.id];
        const currentPerms = permissions.get(project.id) || [];
        const hasCurrentAccess = currentPerms.some(perm => 
          perm.userId === member.userId && perm.documentPath === '*'
        );

        if (hasAccess && !hasCurrentAccess) {
          // Grant access
          await bulkGrantPermissions(project.id, member.userId, ['*']);
        } else if (!hasAccess && hasCurrentAccess) {
          // Revoke access
          await bulkRevokePermissions(project.id, member.userId);
        }
      }
      onClose();
    } catch (error) {
      console.error('Failed to save permissions:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setProjectPermissions({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="flex items-center text-lg font-semibold">
              <Folder className="h-5 w-5 mr-2" />
              Manage Permissions for {member.userName || member.userEmail}
            </h3>
            <Button variant="outline" size="sm" onClick={handleClose}>
              <X size={16} />
            </Button>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {/* Member Info */}
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.userName || member.userEmail}
                    </p>
                    <p className="text-sm text-gray-500">
                      {member.role === 'owner' ? 'Owner' : 'Member'} • {member.userEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Permission Matrix */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Project Access
                </h3>
                
                {projects.length > 0 ? (
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={projectPermissions[project.id] || false}
                            onChange={() => handleProjectToggle(project.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {project.projectName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {project.propertyAddressCity}, {project.propertyAddressState}
                            </p>
                            <p className="text-xs text-gray-400">
                              Status: {project.projectStatus}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            projectPermissions[project.id] 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {projectPermissions[project.id] ? 'Access Granted' : 'No Access'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">No projects found</p>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Permission Details
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• <strong>Access Granted:</strong> Member can view and download all documents in the project</li>
                  <li>• <strong>No Access:</strong> Member cannot see the project or its documents</li>
                  <li>• <strong>Owners:</strong> Automatically have access to all projects and documents</li>
                  <li>• <strong>Changes:</strong> Take effect immediately after saving</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  leftIcon={<Save size={16} />}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
