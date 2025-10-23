// src/components/chat/ManageChannelMembersModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { useOrgStore } from '@/stores/useOrgStore';
import { useProjects } from '@/hooks/useProjects';
import { useChatStore } from '@/stores/useChatStore';
import { Loader2, User, X, Plus, Trash2 } from 'lucide-react';
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
  const { members, isOwner } = useOrgStore();
  const { activeProject } = useProjects();
  const { participants, loadParticipants, addParticipant, removeParticipant, isLoading } = useChatStore();
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>([]);
  const [enrichedParticipants, setEnrichedParticipants] = useState<EnrichedParticipant[]>([]);

  useEffect(() => {
    const loadAndEnrichParticipants = async () => {
      if (!isOpen || !thread) return;

      await loadParticipants(thread.id);

      // Enrich participants with profile data
      const enriched: EnrichedParticipant[] = [];

      for (const participant of participants) {
        const memberInfo = members.find(m => m.user_id === participant.user_id);

        if (memberInfo) {
          // This is an org member
          enriched.push({
            ...participant,
            userName: memberInfo.userName || memberInfo.userEmail || 'Unknown',
            userEmail: memberInfo.userEmail || '',
            userRole: memberInfo.role as any,
            isAdvisor: false,
          });
        } else if (activeProject?.assignedAdvisorUserId === participant.user_id) {
          // This is the assigned advisor - fetch their profile
          try {
            const { data: advisorProfile, error } = await supabase
              .from('profiles')
              .select('id, full_name, email, app_role')
              .eq('id', participant.user_id)
              .single();

            if (error) {
              console.error('[ManageChannelMembersModal] Error fetching advisor profile:', error);
              enriched.push({
                ...participant,
                userName: 'Advisor',
                userEmail: '',
                userRole: 'advisor',
                isAdvisor: true,
              });
            } else {
              enriched.push({
                ...participant,
                userName: advisorProfile.full_name || advisorProfile.email,
                userEmail: advisorProfile.email,
                userRole: 'advisor',
                isAdvisor: true,
              });
            }
          } catch (err) {
            console.error('[ManageChannelMembersModal] Failed to fetch advisor:', err);
            enriched.push({
              ...participant,
              userName: 'Advisor',
              userEmail: '',
              userRole: 'advisor',
              isAdvisor: true,
            });
          }
        } else {
          // Unknown participant
          enriched.push({
            ...participant,
            userName: 'Unknown',
            userEmail: '',
            userRole: 'member',
            isAdvisor: false,
          });
        }
      }

      setEnrichedParticipants(enriched);
    };

    loadAndEnrichParticipants();
  }, [isOpen, thread, loadParticipants, participants, members, activeProject]);

  const availableMembers = members.filter(
    (m) => !participants.some((p) => p.user_id === m.user_id)
  );

  const handleAdd = async () => {
    if (selectedMembersToAdd.length === 0) return;
    await addParticipant(thread.id, selectedMembersToAdd);
    setSelectedMembersToAdd([]);
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
            <div className="flex items-center space-x-2">
              <div className="flex-grow">
                <MultiSelect
                  options={availableMembers.map(m => m.userName || m.userEmail || '')}
                  value={selectedMembersToAdd.map(id => members.find(m => m.user_id === id)?.userName || '')}
                  onChange={(selectedLabels) => {
                    const selectedIds = selectedLabels
                      .map(label => members.find(m => m.userName === label)?.user_id)
                      .filter(Boolean) as string[];
                    setSelectedMembersToAdd(selectedIds);
                  }}
                  placeholder="Select members..."
                />
              </div>
              <Button onClick={handleAdd} disabled={isLoading || selectedMembersToAdd.length === 0}>
                <Plus size={16} /> Add
              </Button>
            </div>
          </div>

          {/* Current Members Section */}
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Current Members</h4>
            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
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
