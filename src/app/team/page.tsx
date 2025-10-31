// src/app/team/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useOrgStore } from "@/stores/useOrgStore";
import { RoleBasedRoute } from "@/components/auth/RoleBasedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { InviteMemberModal } from "@/components/team/InviteMemberModal";
import { EditMemberPermissionsModal } from "@/components/team/EditMemberPermissionsModal";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  Crown,
  User,
  MoreVertical,
  Trash2,
  Edit,
  ArrowLeft,
} from "lucide-react";
import { OrgMemberRole } from "@/types/enhanced-types";
import { ProjectGrant, OrgGrant, OrgMember } from "@/types/enhanced-types";

export default function TeamPage() {
  const router = useRouter();
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
    updateMemberPermissions,
    clearError,
  } = useOrgStore();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMemberMenu, setShowMemberMenu] = useState<string | null>(null);
  const [showEditPermissionsModal, setShowEditPermissionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);

  // Get current user's member information
  const currentUserMember = members.find((m) => m.user_id === user?.id);
  const isMember = currentOrgRole === "member";

  useEffect(() => {
    if (activeOrg) {
      loadOrg(activeOrg.id);
    }
  }, [activeOrg, loadOrg]);

  const handleInviteMember = async (
    email: string,
    role: OrgMemberRole,
    projectGrants: ProjectGrant[],
    orgGrants: OrgGrant | null
  ) => {
    try {
      const inviteLink = await inviteMember(email, role, projectGrants, orgGrants);
      // Reload org data to show the new pending invite
      if (activeOrg) {
        loadOrg(activeOrg.id);
      }
      return inviteLink as string;
    } catch (error) {
      console.error("Failed to invite member:", error);
      throw error;
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (
      confirm(
        "Are you sure you want to remove this member? This action cannot be undone."
      )
    ) {
      try {
        await removeMember(memberId);
        setShowMemberMenu(null);
      } catch (error) {
        console.error("Failed to remove member:", error);
      }
    }
  };

  const handleCancelInvite = async (inviteId: string): Promise<void> => {
    if (window.confirm("Are you sure you want to cancel this invitation?")) {
      try {
        await cancelInvite(inviteId);
      } catch (error) {
        console.error("Failed to cancel invite:", error);
      }
    }
  };

  const handleEditPermissions = (member: OrgMember) => {
    setSelectedMember(member);
    setShowMemberMenu(null);
    setShowEditPermissionsModal(true);
  };

  const handleUpdatePermissions = async (
    userId: string,
    projectGrants: ProjectGrant[],
    orgGrants: OrgGrant | null
  ): Promise<void> => {
    try {
      await updateMemberPermissions(userId, projectGrants, orgGrants);
      // Reload org data to show the updated permissions
      if (activeOrg) {
        loadOrg(activeOrg.id);
      }
    } catch (error) {
      console.error("Failed to update member permissions:", error);
      throw error;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isInviteExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (!activeOrg) {
    const breadcrumb = (
      <nav className="flex items-center space-x-2 text-2xl mb-2">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md mr-2 transition-colors"
          aria-label="Go back to Dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-gray-500 hover:text-gray-700 font-medium"
        >
          Dashboard
        </button>
        <span className="text-gray-400">/</span>
        <span className="text-gray-800 font-semibold">Team Management</span>
      </nav>
    );
    return (
      <RoleBasedRoute roles={["borrower"]}>
        <DashboardLayout breadcrumb={breadcrumb}>
          <div className="text-center py-8">
            <p className="text-gray-500">
              No active org found. Please contact support.
            </p>
          </div>
        </DashboardLayout>
      </RoleBasedRoute>
    );
  }

  // Breadcrumb for main Team page
  const breadcrumb = (
    <nav className="flex items-center space-x-2 text-2xl mb-2">
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md mr-2 transition-colors"
        aria-label="Go back to Dashboard"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => router.push("/dashboard")}
        className="text-gray-500 hover:text-gray-700 font-medium"
      >
        Dashboard
      </button>
      <span className="text-gray-400">/</span>
      <span className="text-gray-800 font-semibold">Team Management</span>
    </nav>
  );

  return (
    <RoleBasedRoute roles={["borrower"]}>
      <DashboardLayout breadcrumb={breadcrumb}>
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

        {isMember ? (
          // Member View - Show their own profile information
          <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <h2 className="text-xl font-bold text-gray-900 text-center">
                  Your Team Information
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* User Profile Section */}
                  <div className="flex items-start space-x-4 p-6 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full flex-shrink-0">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {currentUserMember?.userName || user?.name || "Unknown User"}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {currentUserMember?.userEmail || user?.email}
                      </p>
                      <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
                        {currentUserMember?.role || currentOrgRole}
                      </span>
                    </div>
                  </div>

                  {/* Organization Section */}
                  <div className="p-6 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3 mb-4">
                      <Users className="h-5 w-5 text-gray-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Organization
                      </h3>
                    </div>
                    <p className="text-base text-gray-900 font-medium mb-2">
                      {activeOrg.name}
                    </p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>
                        Joined on {currentUserMember ? formatDate(currentUserMember.created_at) : "Unknown"}
                      </span>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      You are a member of this organization. If you need to manage team settings or invite new members, please contact an organization owner.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Owner View - Show team management interface
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Team Management
                </h1>
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
                          {member.role === "owner" ? (
                            <Crown className="h-5 w-5 text-blue-600" />
                          ) : (
                            <User className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">
                              {member.userName || "Unknown User"}
                            </p>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                member.role === "owner"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {member.role}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {member.userEmail}
                          </p>
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
                            onClick={() =>
                              setShowMemberMenu(
                                showMemberMenu === member.user_id
                                  ? null
                                  : member.user_id
                              )
                            }
                          >
                            <MoreVertical size={16} />
                          </Button>

                          {showMemberMenu === member.user_id && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                              <div className="py-1">
                                {member.role === 'member' && (
                                  <button
                                    className="flex items-center w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50"
                                    onClick={() => handleEditPermissions(member)}
                                  >
                                    <Edit size={16} className="mr-2" />
                                    Edit Permissions
                                  </button>
                                )}
                                <button
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                  onClick={() =>
                                    handleRemoveMember(member.user_id)
                                  }
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
                            <p className="font-medium text-gray-900">
                              {invite.invited_email}
                            </p>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${
                                invite.role === "owner"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {invite.role}
                            </span>
                            {isInviteExpired(invite.expires_at) && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                Expired
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Invited by{" "}
                            {invite.inviterName || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-400">
                            Invited {formatDate(invite.created_at)}
                            {!isInviteExpired(invite.expires_at) && (
                              <span>
                                {" "}
                                • Expires {formatDate(invite.expires_at)}
                              </span>
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
        )}

        {/* Modals */}
        {showInviteModal && (
          <InviteMemberModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            onInvite={handleInviteMember}
          />
        )}

        {showEditPermissionsModal && selectedMember && activeOrg && (
          <EditMemberPermissionsModal
            isOpen={showEditPermissionsModal}
            onClose={() => {
              setShowEditPermissionsModal(false);
              setSelectedMember(null);
            }}
            member={selectedMember}
            orgId={activeOrg.id}
            onUpdate={handleUpdatePermissions}
          />
        )}
      </DashboardLayout>
    </RoleBasedRoute>
  );
}
