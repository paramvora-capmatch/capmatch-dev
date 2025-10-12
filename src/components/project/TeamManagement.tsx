// src/components/project/TeamManagement.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { ProjectMember } from '@/types/enhanced-types';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/Button';
import { Users, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { InviteMemberModal } from './InviteMemberModal';

interface TeamManagementProps {
  projectId: string;
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ projectId }) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const fetchMembers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('project_members')
      .select('*, profile:profiles(full_name, email)')
      .eq('project_id', projectId);
    
    if (error) {
      console.error('Error fetching project members:', error);
    } else {
      const typedData = data as any[];
      setMembers(typedData);
      // Check if current user is the owner
      const currentUserMember = typedData.find(m => m.user_id === user?.id);
      if (currentUserMember && currentUserMember.role === 'owner') {
        setIsOwner(true);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (projectId && user) {
        fetchMembers();
    }
  }, [projectId, user]);


  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === user?.id) {
        alert("You cannot remove yourself. An owner must transfer ownership first.");
        return;
    }
    if (window.confirm("Are you sure you want to remove this member from the project? This will revoke their access immediately.")) {
        const { error } = await supabase.from('project_members').delete().eq('id', memberId);
        if (error) {
            console.error("Error removing member:", error);
            alert("Failed to remove member.");
        } else {
            setMembers(prev => prev.filter(m => m.id !== memberId));
        }
    }
  };

  const handleInviteSuccess = (newMemberData: any) => {
    // Refetch members to get the latest list with profile info
    fetchMembers();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <h3 className="text-lg font-semibold flex items-center"><Users className="mr-2 h-5 w-5" /> Project Team</h3>
          {isOwner && (
            <Button size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<PlusCircle size={16} />}>
              Invite
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600"/>
            </div>
          ) : (
            <ul className="space-y-3">
              {members.map(member => (
                <li key={member.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div>
                    <p className="font-medium text-sm">{(member as any).profile?.full_name || (member as any).profile?.email}</p>
                    <p className="text-xs text-gray-500 capitalize px-2 py-0.5 bg-gray-200 rounded-full inline-block mt-1">{member.role}</p>
                  </div>
                  {isOwner && member.role !== 'owner' && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleRemoveMember(member.id, member.user_id)}
                        title="Remove member"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <InviteMemberModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            projectId={projectId}
            onInviteSuccess={handleInviteSuccess}
        />
      )}
    </>
  );
};