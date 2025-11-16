// src/components/chat/ManageChannelMembersModal.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { useOrgStore } from '@/stores/useOrgStore';
import { useProjects } from '@/hooks/useProjects';
import { useChatStore } from '@/stores/useChatStore';
import { Loader2, User, X, Plus, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

interface ChatThread {
  id: string;
  topic?: string;
}

interface ManageChannelMembersModalProps {
  thread: ChatThread;
  isOpen: boolean;
  onClose: () => void;
}

interface EnrichedParticipant {
  user_id: string;
  thread_id: string;
  created_at: string;
  userName: string;
  userEmail: string;
  userRole: 'owner' | 'member' | 'advisor' | 'project_manager';
  isAdvisor: boolean;
}

export const ManageChannelMembersModal: React.FC<ManageChannelMembersModalProps> = ({
  thread,
  isOpen,
  onClose,
}) => {
  const router = useRouter();
  const { members, isOwner } = useOrgStore();
  const { activeProject } = useProjects();
  const { participants, loadParticipants, addParticipant, removeParticipant, isLoading } =
    useChatStore();
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>([]);
  const [enrichedParticipants, setEnrichedParticipants] = useState<EnrichedParticipant[]>([]);
  const [projectMemberIds, setProjectMemberIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const previousParticipantIdsRef = useRef<Set<string>>(new Set());

  // Ensure participants are loaded when modal opens
  useEffect(() => {
    if (!isOpen || !thread) {
      setEnrichedParticipants([]);
      setError(null);
      return;
    }

    setError(null);
    loadParticipants(thread.id);
  }, [isOpen, thread, loadParticipants]);

  // Enrich participants from store using org members + profiles
  useEffect(() => {
    if (!isOpen || !thread) return;

    const participantUserIds = participants.map((p) => p.user_id);
    if (participantUserIds.length === 0) {
      setEnrichedParticipants([]);
      previousParticipantIdsRef.current = new Set();
      return;
    }

    const currentIds = new Set(participantUserIds);
    const previousIds = previousParticipantIdsRef.current;
    const hasChanges =
      currentIds.size !== previousIds.size ||
      Array.from(currentIds).some((id) => !previousIds.has(id));

    if (!hasChanges && enrichedParticipants.length > 0) {
      return;
    }

    previousParticipantIdsRef.current = currentIds;

    const enrich = async () => {
      // Fetch profiles for all participant users via edge function (bypasses RLS)
      let userProfilesMap = new Map<
        string,
        { id: string; full_name?: string; email?: string }
      >();

      try {
        const { data: profilesData, error: profilesError } = await supabase.functions.invoke(
          "get-user-data",
          { body: { userIds: participantUserIds } }
        );

        if (!profilesError && Array.isArray(profilesData)) {
          profilesData.forEach((user: any) => {
            userProfilesMap.set(user.id, {
              id: user.id,
              full_name: user.full_name,
              email: user.email,
            });
          });
        }
      } catch (err) {
        console.error(
          "[ManageChannelMembersModal] Error fetching participant profiles:",
          err
        );
      }

      const enriched: EnrichedParticipant[] = participants.map((participant) => {
        const userId = participant.user_id;
        const memberInfo = members.find((m) => m.user_id === userId);
        const isAdvisor = activeProject?.assignedAdvisorUserId === userId;
        const userProfile = userProfilesMap.get(userId);

        if (memberInfo) {
          return {
            ...participant,
            userName: memberInfo.userName || memberInfo.userEmail || "Unknown",
            userEmail: memberInfo.userEmail || "",
            userRole: (memberInfo.role as any) || "member",
            isAdvisor: false,
          };
        }

        if (isAdvisor) {
          return {
            ...participant,
            userName: userProfile?.full_name || userProfile?.email || "Advisor",
            userEmail: userProfile?.email || "",
            userRole: "advisor",
            isAdvisor: true,
          };
        }

        return {
          ...participant,
          userName: userProfile?.full_name || "Unknown",
          userEmail: userProfile?.email || "",
          userRole: "member",
          isAdvisor: false,
        };
      });

      setEnrichedParticipants(enriched);
    };

    enrich();
  }, [isOpen, thread, participants, members, activeProject, enrichedParticipants.length]);

  // Fetch project members when modal opens
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!activeProject?.id) {
        setProjectMemberIds(new Set());
        return;
      }

      try {
        const { data: grants, error } = await supabase
          .from('project_access_grants')
          .select('user_id')
          .eq('project_id', activeProject.id);

        if (error) {
          console.error('[ManageChannelMembersModal] Failed to fetch project members:', error);
          setProjectMemberIds(new Set());
          return;
        }

        // Add the advisor if assigned
        const userIds = new Set(grants?.map(g => g.user_id) || []);
        if (activeProject?.assignedAdvisorUserId) {
          userIds.add(activeProject.assignedAdvisorUserId);
        }

        setProjectMemberIds(userIds);
      } catch (err) {
        console.error('[ManageChannelMembersModal] Error fetching project members:', err);
        setProjectMemberIds(new Set());
      }
    };

    if (isOpen) {
      fetchProjectMembers();
    }
  }, [isOpen, activeProject]);

  const availableMembers = members.filter(
    (m) => !participants.some((p) => p.user_id === m.user_id) && projectMemberIds.has(m.user_id)
  );

  const handleAdd = async () => {
    if (selectedMembersToAdd.length === 0) return;
    
    setError(null);
    try {
      await addParticipant(thread.id, selectedMembersToAdd);
      setSelectedMembersToAdd([]);
      setError(null); // Clear error on success
      
      // Force reload by fetching directly from DB and enriching
      // This ensures we show the newly added member even if store hasn't updated
      try {
        const { data: participantsData, error } = await supabase
          .from('chat_thread_participants')
          .select(`*, user:profiles(id, full_name, email)`)
          .eq('thread_id', thread.id);

        if (!error && participantsData) {
          // Ensure advisor is included if assigned to project but not in participants
          const participantUserIds = new Set((participantsData || []).map((p: any) => p.user_id));
          const advisorId = activeProject?.assignedAdvisorUserId;
          
          if (advisorId && !participantUserIds.has(advisorId)) {
            participantsData.push({
              user_id: advisorId,
              thread_id: thread.id,
              created_at: new Date().toISOString(),
              user: null,
            });
          }

          // Fetch all user profiles
          const allUserIds = (participantsData || []).map((p: any) => p.user_id);
          let userProfilesMap = new Map<string, { id: string; full_name?: string; email?: string }>();
          
          if (allUserIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase.functions.invoke('get-user-data', {
              body: { userIds: allUserIds },
            });

            if (!profilesError && Array.isArray(profilesData)) {
              profilesData.forEach((user: any) => {
                userProfilesMap.set(user.id, {
                  id: user.id,
                  full_name: user.full_name,
                  email: user.email,
                });
              });
            }
          }

          // Enrich and update
          const enriched: EnrichedParticipant[] = [];
          for (const participant of participantsData || []) {
            const userId = participant.user_id;
            const memberInfo = members.find(m => m.user_id === userId);
            const isAdvisor = activeProject?.assignedAdvisorUserId === userId;
            const userProfile = userProfilesMap.get(userId) || participant.user;

            if (memberInfo) {
              enriched.push({
                ...participant,
                userName: memberInfo.userName || memberInfo.userEmail || 'Unknown',
                userEmail: memberInfo.userEmail || '',
                userRole: memberInfo.role as any,
                isAdvisor: false,
              });
            } else if (isAdvisor) {
              const profile = userProfile || participant.user;
              enriched.push({
                ...participant,
                userName: profile?.full_name || profile?.email || 'Advisor',
                userEmail: profile?.email || '',
                userRole: 'advisor',
                isAdvisor: true,
              });
            } else {
              const profile = userProfile || participant.user;
              enriched.push({
                ...participant,
                userName: profile?.full_name || 'Unknown',
                userEmail: profile?.email || '',
                userRole: 'member',
                isAdvisor: false,
              });
            }
          }

          console.log('[ManageChannelMembersModal] After add: Enriched participants:', enriched);
          setEnrichedParticipants(enriched);
          previousParticipantIdsRef.current = new Set((participantsData || []).map((p: any) => p.user_id));
        }
      } catch (reloadErr) {
        console.error('[ManageChannelMembersModal] Error reloading after add:', reloadErr);
      }
      
      // Also update the store for consistency
      await loadParticipants(thread.id);
    } catch (err) {
      console.error('[ManageChannelMembersModal] Failed to add participants:', err);
      setError(err instanceof Error ? err.message : 'Failed to add members to channel');
    }
  };

  const handleRemove = async (userId: string) => {
    if (window.confirm("Are you sure you want to remove this member from the channel?")) {
      await removeParticipant(thread.id, userId);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Members for #${thread.topic}`}>
      <ModalBody>
        <div className="space-y-4">
          {/* Add Members Section */}
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Add Members</h4>
            {availableMembers.length === 0 ? (
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  <UserPlus className="h-5 w-5 text-gray-400" />
                  <p className="text-sm text-gray-600">Invite members</p>
                  <p className="text-xs text-gray-500">
                    Add members to your project to invite them to channels
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      router.push("/team");
                      onClose();
                    }}
                    className="mt-2"
                  >
                    Go to Team Page
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-gray-50 rounded-md border border-gray-200">
                  {availableMembers.length === 0 ? (
                    <p className="text-sm text-gray-500 flex items-center">No members available to add</p>
                  ) : (
                    availableMembers.map((member) => {
                      const isSelected = selectedMembersToAdd.includes(member.user_id);
                      return (
                        <button
                          key={member.user_id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedMembersToAdd(selectedMembersToAdd.filter(id => id !== member.user_id));
                            } else {
                              setSelectedMembersToAdd([...selectedMembersToAdd, member.user_id]);
                            }
                          }}
                          className={`
                            px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                            flex items-center gap-2
                            ${isSelected 
                              ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                              : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                            }
                          `}
                        >
                          <User size={14} />
                          <span>{member.userName || member.userEmail || 'Unknown'}</span>
                          {isSelected && (
                            <span className="ml-1">✓</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="space-y-2">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                      {error}
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button 
                      onClick={handleAdd} 
                      disabled={isLoading || selectedMembersToAdd.length === 0}
                      className="min-w-[100px]"
                    >
                      <Plus size={16} className="mr-1" /> Add {selectedMembersToAdd.length > 0 && `(${selectedMembersToAdd.length})`}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Members Section */}
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Current Members</h4>
            <div className="max-h-60 overflow-y-auto space-y-2 p-2">
              {isLoading && enrichedParticipants.length === 0 ? (
                <div className="text-center p-4"><Loader2 className="animate-spin" /></div>
              ) : (
                enrichedParticipants.map(p => {
                  const isCurrentUserOwner = p.userRole === 'owner';
                  const canRemove = !isCurrentUserOwner && !p.isAdvisor && isOwner;

                  return (
                    <div key={p.user_id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                      <div className="flex items-center space-x-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          p.isAdvisor ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                        }`}>
                          <User size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{p.userName}</p>
                            {p.isAdvisor && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                Advisor
                              </span>
                            )}
                            {isCurrentUserOwner && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                Owner
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{p.userEmail}</p>
                        </div>
                      </div>
                      {canRemove ? (
                         <Button variant="ghost" size="icon" onClick={() => handleRemove(p.user_id)} disabled={isLoading}>
                           <Trash2 size={16} className="text-red-500" />
                         </Button>
                      ) : (
                        <span className="text-xs font-semibold text-gray-400">
                          {p.isAdvisor ? 'Cannot Remove' : 'Owner'}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Done</Button>
      </ModalFooter>
    </Modal>
  );
};
