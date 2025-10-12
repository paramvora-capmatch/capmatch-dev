// src/components/modals/DocumentPermissionModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Check, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { useEntityStore } from '@/stores/useEntityStore';
import { useDocumentPermissionStore } from '@/stores/useDocumentPermissionStore';
import { BorrowerEntityMember } from '@/types/enhanced-types';

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
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { members, loadEntity } = useEntityStore();
  const { grantPermission, bulkGrantPermissions } = useDocumentPermissionStore();

  // Load members when modal opens
  useEffect(() => {
    if (isOpen && entityId) {
      loadEntity(entityId);
    }
  }, [isOpen, entityId, loadEntity]);

  // Filter out the uploader from the members list
  const otherMembers = members.filter(member => {
    const memberData = member as any;
    const memberUserId = memberData.userId || memberData.user_id || memberData.id;
    return memberUserId !== uploaderId && member.status === 'active';
  });

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
    const allMemberIds = otherMembers.map(member => {
      const memberData = member as any;
      return memberData.userId || memberData.user_id || memberData.id;
    });
    setSelectedMembers(new Set(allMemberIds));
  };

  const handleSelectNone = () => {
    setSelectedMembers(new Set());
  };

  const handleGrantPermissions = async () => {
    if (selectedMembers.size === 0) {
      setError('Please select at least one member to grant access to.');
      return;
    }

    setIsGranting(true);
    setError(null);

    try {
      const memberIds = Array.from(selectedMembers);
      
      // Grant permissions for each selected member individually
      for (const memberId of memberIds) {
        await grantPermission(projectId, memberId, filePath, 'file');
      }

      onClose();
    } catch (err) {
      console.error('Error granting permissions:', err);
      setError('Failed to grant permissions. Please try again.');
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
                      const memberData = member as any;
                      const memberId = memberData.userId || memberData.user_id || memberData.id;
                      return (
                      <div
                        key={memberId}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedMembers.has(memberId)
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => handleMemberToggle(memberId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              selectedMembers.has(memberId)
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedMembers.has(memberId) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">
                                {member.userName || member.userEmail || 'Unknown User'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {member.role} • {member.userEmail}
                              </p>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                            member.role === 'owner'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {member.role}
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
                    onClick={handleGrantPermissions}
                    disabled={isGranting || selectedMembers.size === 0}
                    isLoading={isGranting}
                    leftIcon={<Check size={16} />}
                  >
                    Grant Access
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
