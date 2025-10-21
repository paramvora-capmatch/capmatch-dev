// src/components/team/InviteMemberModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select } from '@/components/ui/Select';
import { OrgMemberRole, Permission } from '@/types/enhanced-types';
import { useProjects } from '@/hooks/useProjects';
import { X, Copy, Check, Mail, ChevronDown, ChevronUp, Briefcase } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type ProjectGrant = {
  projectId: string;
  permissions: {
    resource_type: string;
    permission: Permission;
  }[];
};

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: OrgMemberRole, projectGrants: ProjectGrant[]) => Promise<string>;
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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    // When the modal opens, reset the project grants
    if (isOpen) {
      setProjectGrants([]);
      setExpandedProjects(new Set());
    }
  }, [isOpen]);

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
              { resource_type: 'PROJECT_DOCS_ROOT', permission: 'view' },
            ],
          },
        ];
      }
    });
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
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const link = await onInvite(email, role, projectGrants);
      setInviteLink(link);
    } catch (error) {
      console.error('Failed to invite member:', error);
      setError(error instanceof Error ? error.message : 'Failed to invite member');
    } finally {
      setIsLoading(false);
    }
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
    setExpandedProjects(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="flex items-center text-lg font-semibold">
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
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <Select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as OrgMemberRole)}
                    options={[
                      { value: 'member', label: 'Member (Limited Access)' },
                      { value: 'owner', label: 'Owner (Full Access)' }
                    ]}
                  />
                </div>

                {/* Project Access Selection */}
                {role === 'member' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Access (Optional)
                    </label>
                    <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                      {isLoadingProjects ? (
                        <div className="p-4 text-center">
                          <LoadingSpinner />
                        </div>
                      ) : projects.length > 0 ? (
                        projects.map(project => {
                          const hasAccess = projectGrants.some(g => g.projectId === project.id);
                          const grant = projectGrants.find(g => g.projectId === project.id);
                          const isExpanded = expandedProjects.has(project.id);
                          
                          return (
                            <div key={project.id} className="border-b last:border-b-0">
                              <div className="flex items-center justify-between p-3">
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`project-${project.id}`}
                                    checked={hasAccess}
                                    onChange={() => toggleProjectAccess(project.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <label htmlFor={`project-${project.id}`} className="ml-3 text-sm text-gray-800">
                                    {project.projectName}
                                  </label>
                                </div>
                                {hasAccess && (
                                  <Button variant="outline" size="sm" onClick={() => toggleExpandProject(project.id)}>
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </Button>
                                )}
                              </div>
                              {hasAccess && isExpanded && grant && (
                                <div className="bg-gray-50 p-3 pl-10 space-y-2">
                                  {grant.permissions.map(p => (
                                    <div key={p.resource_type} className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">
                                        {p.resource_type.replace(/_/g, ' ').replace('ROOT', '').trim()}
                                      </span>
                                      <Select
                                        value={p.permission}
                                        onChange={e => updatePermission(project.id, p.resource_type, e.target.value as Permission)}
                                        options={[
                                          { value: 'view', label: 'View' },
                                          { value: 'edit', label: 'Edit' },
                                        ]}
                                        className="w-24"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
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
    </div>
  );
};
