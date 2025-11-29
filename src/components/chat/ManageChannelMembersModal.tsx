// src/components/chat/ManageChannelMembersModal.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { useOrgStore } from '@/stores/useOrgStore';
import { useProjects } from '@/hooks/useProjects';
import { useChatStore } from '@/stores/useChatStore';
import { Loader2, User, X, Plus, Trash2, UserPlus, FileText, Check } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { AttachableDocument } from '@/stores/useChatStore';
import { useProjectEligibleMembers } from '@/hooks/useProjectEligibleMembers';

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
  userRole: 'owner' | 'member' | 'advisor';
  isAdvisor: boolean;
}

type SelectableMember = {
  user_id: string;
  userName?: string;
  userEmail?: string | null;
  role?: string;
};

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
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<AttachableDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const previousParticipantIdsRef = useRef<Set<string>>(new Set());
  const { eligibleMembers } = useProjectEligibleMembers({
    projectId: activeProject?.id,
    members,
    advisorUserId: activeProject?.assignedAdvisorUserId,
    enabled: isOpen,
  });

  // Ensure participants are loaded when modal opens
  useEffect(() => {
    if (!isOpen || !thread) {
      setEnrichedParticipants([]);
      setError(null);
      setSelectedMembersToAdd([]);
      setDocuments([]);
      setDocError(null);
      setIsLoadingDocs(false);
      return;
    }

    setError(null);
    loadParticipants(thread.id);
  }, [isOpen, thread, loadParticipants]);

  // Compute participant IDs for document intersection (current + selected)
  const participantIdsForDocs = useMemo(() => {
    const ids = new Set<string>(participants.map((p) => p.user_id));
    selectedMembersToAdd.forEach((id) => ids.add(id));
    return Array.from(ids);
  }, [participants, selectedMembersToAdd]);

  // Fetch documents that everyone can reference
  useEffect(() => {
    if (!isOpen || !activeProject?.id || participantIdsForDocs.length === 0) {
      setDocuments([]);
      setDocError(null);
      setIsLoadingDocs(false);
      return;
    }

    const fetchDocs = async () => {
      setIsLoadingDocs(true);
      setDocError(null);
      try {
        const { data, error } = await supabase.rpc(
          'get_common_file_resources_for_member_set',
          {
            p_project_id: activeProject.id,
            p_user_ids: participantIdsForDocs,
          }
        );

        if (error) {
          throw new Error(error.message);
        }

        const docs: AttachableDocument[] =
          (data as any[])?.map((doc) => ({
            resourceId: doc.resource_id,
            name: doc.name,
            scope: doc.scope,
          })) ?? [];

        setDocuments(docs);
      } catch (err) {
        console.error('[ManageChannelMembersModal] Failed to load documents:', err);
        setDocError(
          err instanceof Error
            ? err.message
            : 'Failed to load shared documents'
        );
        setDocuments([]);
      } finally {
        setIsLoadingDocs(false);
      }
    };

    fetchDocs();
  }, [isOpen, participantIdsForDocs, activeProject?.id]);

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
      const userProfilesMap = new Map<
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

  const availableMembers = useMemo<SelectableMember[]>(() => {
    return eligibleMembers
      .filter(
        (member) =>
          !participants.some((p) => p.user_id === member.user_id) &&
          member.user_id !== undefined
      )
      .map((member) => ({
        user_id: member.user_id,
        userName: member.userName,
        userEmail: member.userEmail,
        role: member.role,
      }));
  }, [eligibleMembers, participants]);

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
        // Query participants directly (RLS now allows this)
        const { data: participantsData, error } = await supabase
          .from('chat_thread_participants')
          .select('thread_id, user_id, created_at')
          .eq('thread_id', thread.id);

        if (!error && participantsData) {
          // Fetch all user profiles via edge function (can't join profiles due to RLS)
          const allUserIds = participantsData.map((p: any) => p.user_id);
          const userProfilesMap = new Map<string, { id: string; full_name?: string; email?: string }>();
          
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
            const userProfile = userProfilesMap.get(userId) || null;

            if (memberInfo) {
              enriched.push({
                ...participant,
                userName: memberInfo.userName || memberInfo.userEmail || 'Unknown',
                userEmail: memberInfo.userEmail || '',
                userRole: memberInfo.role as any,
                isAdvisor: false,
              });
            } else if (isAdvisor) {
              const profile = userProfile;
              enriched.push({
                ...participant,
                userName: profile?.full_name || profile?.email || 'Advisor',
                userEmail: profile?.email || '',
                userRole: 'advisor',
                isAdvisor: true,
              });
            } else {
              const profile = userProfile;
              enriched.push({
                ...participant,
                userName: profile?.full_name || 'Unknown',
                userEmail: profile?.email || '',
                userRole: 'member',
                isAdvisor: false,
              });
            }
          }

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
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Members for #${thread.topic}`} size="4xl">
      <ModalBody>
        <div className="grid grid-cols-2 gap-4 h-[500px]">
          {/* Left Panel - Members */}
          <div className="border-r border-gray-200 pr-4 flex flex-col min-h-0">
            <div className="space-y-4 flex-shrink-0">
              {/* Current Members Section */}
              <div>
                <h4 className="font-medium text-gray-800 mb-2">Current Members</h4>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mt-2">
              <div className="space-y-4">
                {isLoading && enrichedParticipants.length === 0 ? (
                  <div className="text-center p-4"><Loader2 className="animate-spin" /></div>
                ) : enrichedParticipants.length === 0 ? (
                  <div className="text-sm text-gray-500 py-8 px-4 border border-gray-200 rounded-lg bg-gray-50 text-center">
                    No members in this channel yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {enrichedParticipants.map(p => {
                      const isCurrentUserOwner = p.userRole === 'owner';
                      const canRemove = !isCurrentUserOwner && !p.isAdvisor && isOwner;

                      return (
                        <div key={p.user_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
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
                    })}
                  </div>
                )}

                {/* Add Members Section */}
                <div className="pt-4 border-t border-gray-200">
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
                    <div className="space-y-2">
                      {availableMembers.map((member) => {
                        const isSelected = selectedMembersToAdd.includes(member.user_id);
                        const normalizedRole = member.role;
                        const isOwner = normalizedRole === "owner";
                        const isAdvisor = normalizedRole === "advisor";

                        return (
                          <div
                            key={member.user_id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedMembersToAdd(selectedMembersToAdd.filter(id => id !== member.user_id));
                              } else {
                                setSelectedMembersToAdd([...selectedMembersToAdd, member.user_id]);
                              }
                            }}
                            className={`
                              flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 hover:bg-blue-100'
                                : 'border-gray-200 hover:bg-gray-50'
                              }
                            `}
                          >
                            <div className="flex items-center space-x-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isAdvisor ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                              }`}>
                                <User size={16} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{member.userName || member.userEmail || 'Unknown'}</p>
                                  {isAdvisor && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                      Advisor
                                    </span>
                                  )}
                                  {isOwner && (
                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                                      Owner
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{member.userEmail}</p>
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {isSelected ? (
                                <Check className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Plus className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div className="space-y-2 pt-2">
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
              </div>
            </div>
          </div>

          {/* Right Panel - Documents */}
          <div className="flex flex-col pl-4 min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <div className="text-sm font-semibold text-gray-900">
                Documents everyone can mention
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {documents.length} {documents.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {isLoadingDocs ? (
                <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading...
                </div>
              ) : docError ? (
                <div className="py-4 px-3 text-sm text-red-600 border border-red-200 rounded-lg bg-red-50">
                  {docError}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-500">
                  <FileText className="h-8 w-8 text-gray-400 mb-2" />
                  <p>No documents are currently shared</p>
                  <p className="text-xs text-gray-400 mt-1">
                    across all selected members
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.resourceId}
                      className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {doc.name}
                          </div>
                          <div className="mt-1">
                            <span className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                              {doc.scope === 'org' ? 'BORROWER DOCS' : 'PROJECT DOCS'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
