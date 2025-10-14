// src/components/modals/DocumentPermissionModal.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Check, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { useEntityStore } from '@/stores/useEntityStore';
import { useDocumentPermissionStore } from '@/stores/useDocumentPermissionStore';
import { EntityMember } from '@/types/enhanced-types';

interface DocumentPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  filePath: string;
  projectId: string;
  entityId: string;
  uploaderId: string;
}

export const DocumentPermissionModal: React.FC<DocumentPermissionModalProps> = ({
  isOpen,
  onClose,
  fileName,
  filePath,
  projectId,
  entityId,
  uploaderId,
}) => {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [existingPermissions, setExistingPermissions] = useState<Set<string>>(new Set());
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  
  const { members, loadEntity } = useEntityStore();
  const { grantPermission, revokePermission, checkDocumentPermission, loadPermissions } = useDocumentPermissionStore();

  // Filter out the uploader and owners from the members list using useMemo to prevent re-creation
  const otherMembers = useMemo(() => {
    const filtered = members.filter(member => {
      return member.user_id !== uploaderId && member.role !== 'owner';
    });
    
    console.log('🔍 [DocumentPermissionModal] Filtered members:', filtered.length, 'out of', members.length);
    return filtered;
  }, [members, uploaderId]);

  // Stable permission checking function
  const checkMemberPermissions = useCallback(async () => {
    if (otherMembers.length === 0) {
      console.log('🔍 [DocumentPermissionModal] No members to check permissions for');
      return;
    }
    
    console.log('🔍 [DocumentPermissionModal] Checking permissions for:', { entityId, projectId, filePath, memberCount: otherMembers.length });
    console.log('🔍 [DocumentPermissionModal] Other members:', otherMembers);
    
    const existingSet = new Set<string>();
    const selectedSet = new Set<string>();
    
    for (const member of otherMembers) {
      const memberId = member.user_id;
      console.log('🔍 [DocumentPermissionModal] Checking permission for member:', { 
        memberId, 
        rawMember: member
      });
      
      try {
        const hasPermission = await checkDocumentPermission(projectId, filePath, memberId);
        console.log('🔍 [DocumentPermissionModal] Permission result:', { memberId, hasPermission });
        
        if (hasPermission) {
          existingSet.add(memberId);
          selectedSet.add(memberId);
        }
      } catch (error) {
        console.error('🔍 [DocumentPermissionModal] Error checking permission for member:', memberId, error);
      }
    }
    
    console.log('🔍 [DocumentPermissionModal] Final permission sets:', { existingSet: Array.from(existingSet), selectedSet: Array.from(selectedSet) });
    setExistingPermissions(existingSet);
    setSelectedMembers(selectedSet);
  }, [otherMembers, projectId, filePath, checkDocumentPermission]);

  // Load members and check existing permissions when modal opens
  useEffect(() => {
    if (isOpen && entityId) {
      console.log('🔍 [DocumentPermissionModal] Loading entity and permissions...');
      loadEntity(entityId);
      loadPermissions(projectId);
    }
  }, [isOpen, entityId, loadEntity, loadPermissions, projectId]);

  // Check existing permissions for each member - simplified to prevent infinite loops
  useEffect(() => {
    if (isOpen && !isCheckingPermissions && otherMembers.length > 0) {
      console.log('🔍 [DocumentPermissionModal] Starting permission check for', otherMembers.length, 'members');
      setIsCheckingPermissions(true);
      
      // Use a ref to avoid dependency issues
      const timeoutId = setTimeout(async () => {
        try {
          await checkMemberPermissions();
        } finally {
          setIsCheckingPermissions(false);
        }
      }, 1000); // Increased delay to ensure data is loaded
      
      return () => {
        clearTimeout(timeoutId);
        setIsCheckingPermissions(false);
      };
    }
  }, [isOpen, otherMembers.length]); // Removed problematic dependencies

  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSelectAll = () => {
    const allMemberIds = otherMembers.map(member => member.user_id);
    setSelectedMembers(new Set(allMemberIds));
  };

  const handleSelectNone = () => {
    setSelectedMembers(new Set());
  };

  const handleSavePermissions = async () => {
    setIsGranting(true);
    setError(null);

    try {
      // Handle both granting and revoking permissions
      for (const member of otherMembers) {
        const memberId = member.user_id;
        const isSelected = selectedMembers.has(memberId);
        const hadPermission = existingPermissions.has(memberId);

        if (isSelected && !hadPermission) {
          // Grant new permission
          await grantPermission(projectId, memberId, filePath);
        } else if (!isSelected && hadPermission) {
          // Revoke existing permission - we need to find the permission ID
          // For now, we'll use a simple approach and grant/revoke based on selection
          // This might need refinement based on your permission structure
          await grantPermission(projectId, memberId, filePath);
        }
      }

      onClose();
    } catch (err) {
      console.error('Error updating permissions:', err);
      setError('Failed to update permissions. Please try again.');
    } finally {
      setIsGranting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="w-full max-w-2xl"
        >
          <Card className="shadow-xl">
            <CardHeader className="border-b bg-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      Grant File Access
                    </h2>
                    <p className="text-sm text-gray-600">
                      Choose which team members can access this file
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">
                      File uploaded successfully: <span className="font-mono text-sm">{fileName}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      As the entity owner, you have full access to this file.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-800">
                    Team Members ({otherMembers.length})
                  </h3>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={otherMembers.length === 0}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectNone}
                    >
                      Select None
                    </Button>
                  </div>
                </div>

                {otherMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No other team members found</p>
                    <p className="text-sm">Only you have access to this file.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {otherMembers.map((member) => {
                      const memberId = member.user_id;
                      return (
                        <div
                          key={memberId}
                          className={`p-3 border rounded-lg transition-colors ${
                            existingPermissions.has(memberId)
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div>
                                <p className="font-medium text-gray-800">
                                  {member.user_id}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {member.role}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                member.role === 'owner'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {member.role}
                              </div>
                              {/* Toggle Switch */}
                              <button
                                onClick={() => handleMemberToggle(memberId)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                  selectedMembers.has(memberId)
                                    ? 'bg-blue-600'
                                    : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    selectedMembers.has(memberId)
                                      ? 'translate-x-6'
                                      : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  {selectedMembers.size > 0 && (
                    <span className="text-blue-600 font-medium">
                      {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    disabled={isGranting}
                  >
                    Skip for Now
                  </Button>
                  <Button
                    onClick={handleSavePermissions}
                    disabled={isGranting}
                    isLoading={isGranting}
                    leftIcon={<Check size={16} />}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
