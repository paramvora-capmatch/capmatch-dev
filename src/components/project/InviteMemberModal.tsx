// src/components/project/InviteMemberModal.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Mail, Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { PermissionSet } from '@/types/enhanced-types';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onInviteSuccess: (member: any) => void;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, projectId, onInviteSuccess }) => {
    const [email, setEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteeProfile, setInviteeProfile] = useState<{ role: string } | null>(null);
    const [permissionSets, setPermissionSets] = useState<PermissionSet[]>([]);
    const [selectedSets, setSelectedSets] = useState<string[]>([]);

    // Debounce for email lookup
    useEffect(() => {
        const handler = setTimeout(async () => {
            if (email.includes('@')) {
                const { data, error } = await supabase.from('profiles').select('role').eq('email', email).single();
                if (data) {
                    setInviteeProfile(data);
                    setError(null);
                } else {
                    setInviteeProfile(null);
                    setError("User not found on CapMatch.");
                }
            } else {
                setInviteeProfile(null);
                setError(null);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [email]);

    // Fetch permission sets for the project
    useEffect(() => {
        if (isOpen && inviteeProfile?.role === 'advisor') {
            const fetchPermissionSets = async () => {
                const { data, error } = await supabase.from('permission_sets').select('*').eq('project_id', projectId);
                if (data) setPermissionSets(data as any);
            };
            fetchPermissionSets();
        }
    }, [isOpen, inviteeProfile, projectId]);

    const handleInvite = async () => {
        if (!email || !inviteeProfile) return;
        setIsInviting(true);
        setError(null);

        try {
            const { data, error } = await supabase.functions.invoke('invite-user', {
                body: {
                    project_id: projectId,
                    invitee_email: email,
                    permission_set_ids: inviteeProfile.role === 'advisor' ? selectedSets : [],
                },
            });

            if (error) throw new Error(error.message);
            
            onInviteSuccess(data); // Assuming function returns the new member object
            handleClose();
        } catch (e: any) {
            setError(e.message || "Failed to send invite.");
        } finally {
            setIsInviting(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setInviteeProfile(null);
        setSelectedSets([]);
        setError(null);
        onClose();
    };

    const handleSetToggle = (setId: string) => {
        setSelectedSets(prev => 
            prev.includes(setId) ? prev.filter(id => id !== setId) : [...prev, setId]
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Invite a Team Member">
            <ModalHeader>
                <div className="flex items-center">
                    <UserPlus className="mr-2" />
                    Invite to Project
                </div>
            </ModalHeader>
            <ModalBody>
                <p className="text-sm text-gray-600 mb-4">Enter the email of a registered CapMatch user to add them to this project.</p>
                <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="email"
                        placeholder="teammate@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                {error && <p className="text-red-500 text-sm mt-2 flex items-center"><AlertCircle className="h-4 w-4 mr-1"/>{error}</p>}

                {inviteeProfile?.role === 'advisor' && (
                    <div className="mt-4">
                        <h4 className="font-medium mb-2">Advisor Permissions</h4>
                        <p className="text-sm text-gray-500 mb-3">Select which document sets this advisor can access.</p>
                        <div className="space-y-2">
                            {permissionSets.map(set => (
                                <label key={set.id} className="flex items-center p-2 border rounded-md hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedSets.includes(set.id)}
                                        onChange={() => handleSetToggle(set.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="ml-3 text-sm">{set.name}</span>
                                </label>
                            ))}
                        </div>
                        <Button variant="ghost" size="sm" className="mt-2 text-blue-600">Create new permission set</Button>
                    </div>
                )}
            </ModalBody>
            <ModalFooter>
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button onClick={handleInvite} isLoading={isInviting} disabled={!inviteeProfile}>
                    {isInviting ? 'Sending...' : 'Send Invite'}
                </Button>
            </ModalFooter>
        </Modal>
    );
};