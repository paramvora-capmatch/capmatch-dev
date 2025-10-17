// src/app/team/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOrgStore } from '@/stores/useOrgStore';
import { RoleBasedRoute } from '@/components/auth/RoleBasedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { InviteMemberModal } from '@/components/team/InviteMemberModal';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Clock, 
  Crown, 
  User, 
  MoreVertical,
  Trash2,
  Settings,
  AlertTriangle,
  Info
} from 'lucide-react';
import { OrgMember, OrgMemberRole } from '@/types/enhanced-types';

export default function TeamPage() {
  const { user, activeOrg, currentOrgRole } = useAuth();
  const {
    members,
    pendingInvites,
    isOwner,
    isLoading,
    error,
    loadOrg,
    inviteMember,
    cancelInvite,
    removeMember,
    clearError
  } = useOrgStore();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState<string | null>(null);

  useEffect(() => {
    if (activeOrg) {
      loadOrg(activeOrg.id);
    }
  }, [activeOrg, loadOrg]);

  const handleInviteMember = async (email: string, role: OrgMemberRole) => {
    try {
      const inviteLink = await inviteMember(email, role);
      // Reload org data to show the new pending invite
      if (activeOrg) {
        loadOrg(activeOrg.id);
      }
      return inviteLink;
    } catch (error) {
      console.error('Failed to invite member:', error);
      throw error;
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (window.confirm('Are you sure you want to remove this member? This action cannot be undone.')) {
      try {
        await removeMember(memberId);
        setShowMemberMenu(null);
      } catch (error) {
        console.error('Failed to remove member:', error);
      }
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (window.confirm('Are you sure you want to cancel this invitation?')) {
      try {
        await cancelInvite(inviteId);
      } catch (error) {
        console.error('Failed to cancel invite:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isInviteExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getMemberDisplayName = (member: any) => {
    // Use the userName from the processed member data
    return member.userName || 'Unknown User';
  };

  const getMemberEmail = (member: any) => {
    // Use the userEmail from the processed member data
    return member.userEmail || 'user@example.com';
  };

  if (!activeOrg) {
    return (
      <RoleBasedRoute roles={['borrower']}>
        <DashboardLayout title="Team Management">
          <div className="text-center py-8">
            <p className="text-gray-500">No active org found. Please contact support.</p>
          </div>
        </DashboardLayout>
      </RoleBasedRoute>
    );
  }

  return (
    <RoleBasedRoute roles={['borrower']}>
      <DashboardLayout title="Team Management">
        <LoadingOverlay isLoading={isLoading} />
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex justify-between items-center">
              <p className="text-red-800">{error}</p>
              <Button variant="outline" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
              <p className="text-gray-600">{activeOrg.name}</p>
            </div>
            {isOwner && (
              <Button
                variant="primary"
                leftIcon={<UserPlus size={18} />}
                onClick={() => setShowInviteModal(true)}
              >
                Invite Member
              </Button>
            )}
          </div>

          {/* Active Members */}
          <Card>
            <CardHeader>
              <h3 className="flex items-center text-lg font-semibold">
                <Users className="h-5 w-5 mr-2" />
                Active Members ({members.length})
              </h3>
            </CardHeader>
            <CardContent>
              {members.length > 0 ? (
                <div className="space-y-4">
                  {members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                          {member.role === 'owner' ? (
                            <Crown className="h-5 w-5 text-blue-600" />
                          ) : (
                            <User className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">
                              {getMemberDisplayName(member)}
                            </p>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              member.role === 'owner' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {member.role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{getMemberEmail(member)}</p>
                          <p className="text-xs text-gray-400">
                            Joined {formatDate(member.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      {isOwner && member.user_id !== user?.id && (
                        <div className="relative">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMemberMenu(
                              showMemberMenu === member.user_id ? null : member.user_id
                            )}
                          >
                            <MoreVertical size={16} />
                          </Button>
                          
                          {showMemberMenu === member.user_id && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                              <div className="py-1">
                                
                                <button
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  onClick={() => handleRemoveMember(member.user_id)}
                                >
                                  <Trash2 size={16} className="mr-2" />
                                  Remove Member
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">No active members</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invites */}
          {pendingInvites.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="flex items-center text-lg font-semibold">
                  <Mail className="h-5 w-5 mr-2" />
                  Pending Invitations ({pendingInvites.length})
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full">
                          <Clock className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{invite.invited_email}</p>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              invite.role === 'owner' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {invite.role}
                            </span>
                            {isInviteExpired(invite.expires_at) && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                Expired
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Invited by {(invite as any).inviterName || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-400">
                            Invited {formatDate(invite.created_at)}
                            {!isInviteExpired(invite.expires_at) && (
                              <span> • Expires {formatDate(invite.expires_at)}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      {isOwner && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvite(invite.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modals */}
        {showInviteModal && (
          <InviteMemberModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            onInvite={handleInviteMember}
          />
        )}


      </DashboardLayout>
    </RoleBasedRoute>
  );
}
