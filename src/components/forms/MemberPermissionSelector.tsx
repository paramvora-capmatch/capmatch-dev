// src/components/forms/MemberPermissionSelector.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
// import { Checkbox } from '../ui/Checkbox'; // Commented out as it may not exist
import { Button } from '../ui/Button';
import { useEntityStore } from '../../stores/useEntityStore';
import { EntityMember } from '../../types/enhanced-types';
import { Users, UserCheck, UserX } from 'lucide-react';

interface MemberPermissionSelectorProps {
  entityId: string;
  selectedMembers: Array<{user_id: string}>;
  onSelectionChange: (members: Array<{user_id: string}>) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export const MemberPermissionSelector: React.FC<MemberPermissionSelectorProps> = ({
  entityId,
  selectedMembers,
  onSelectionChange,
  onComplete,
  onCancel
}) => {
  const { loadEntity, members, isLoading } = useEntityStore();
  const [localSelection, setLocalSelection] = useState<Array<{user_id: string}>>(selectedMembers);

  useEffect(() => {
    if (entityId) {
      loadEntity(entityId);
    }
  }, [entityId, loadEntity]);

  // Get only members (not owners) since owners get automatic access
  const entityMembers = members.filter(member => member.role === 'member');

  const handleMemberToggle = (memberId: string, isSelected: boolean) => {
    if (isSelected) {
      // Add member to project access
      setLocalSelection(prev => [...prev, { user_id: memberId }]);
    } else {
      // Remove member from project access
      setLocalSelection(prev => prev.filter(m => m.user_id !== memberId));
    }
  };

  const handleComplete = () => {
    onSelectionChange(localSelection);
    onComplete();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading team members...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-600" /> Project Access
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Select which team members should have access to this project. Owners automatically get full access to all projects and documents.
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {entityMembers.length === 0 ? (
          <div className="text-center py-8">
            <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No team members found.</p>
            <p className="text-sm text-gray-500 mt-1">
              Only owners will have access to this project.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {entityMembers.map((member) => {
              const isSelected = localSelection.some(m => m.user_id === member.user_id);
              const selectedMember = localSelection.find(m => m.user_id === member.user_id);
              
              return (
                <div key={member.user_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMemberToggle(member.user_id, e.target.checked)}
                        id={`member-${member.user_id}`}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label 
                        htmlFor={`member-${member.user_id}`}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <UserCheck className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{member.userName}</span>
                        <span className="text-sm text-gray-500">({member.userEmail})</span>
                      </label>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="mt-3 ml-7">
                      <p className="text-xs text-gray-500">
                        Editors can upload/delete in this project. Document access is granted per-file after upload.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Create Project
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
