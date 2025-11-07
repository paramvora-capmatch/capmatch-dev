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
import { SplashScreen } from "@/components/ui/SplashScreen";
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  Crown,
  User,
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
        {isLoading && <SplashScreen />}

        {/* Decorative Background Layer (mirrors dashboard) */}
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
          {/* Subtle grid pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.5]">
            <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
              <defs>
                <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>


          {/* Main content with X padding and top gap */}
          <div className="relative z-[1] mx-auto px-3 sm:px-5 lg:px-32 pt-20 pb-6">
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
                <h2 className="text-xl font-bold text-gray-900 text-center mb-4">
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
                <h1 className="text-4xl font-bold text-gray-900">
                  Team Management
                </h1>
                <p className="text-gray-600 text-2xl mt-3">{activeOrg.name}</p>
              </div>
            </div>

          {/* Separate owners and members */}
          {(() => {
            const owners = members.filter(m => m.role === "owner");
            const regularMembers = members.filter(m => m.role === "member");
            
            return (
              <>
                {/* Pending Invites Section - Always visible, above Active Members */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="flex items-center text-2xl font-semibold">
                      <Mail className="h-5 w-5 mr-2" />
                      Pending Invitations {pendingInvites.length > 0 && `(${pendingInvites.length})`}
                    </h3>
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
                  {pendingInvites.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {pendingInvites.map((invite, index) => (
                        <div key={invite.id} className="relative animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
                          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                            {/* Avatar */}
                            <div className="flex items-center justify-center">
                              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
                                <Clock className="h-7 w-7 text-yellow-600" />
                              </div>
                            </div>
                            {/* Text */}
                            <div className="mt-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <p className="font-medium text-gray-900 break-words">
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
                                Invited by {invite.inviterName || "Unknown"}
                              </p>
                              <p className="text-xs text-gray-400">
                                Invited {formatDate(invite.created_at)}
                                {!isInviteExpired(invite.expires_at) && (
                                  <span> • Expires {formatDate(invite.expires_at)}</span>
                                )}
                              </p>
                            </div>

                            {/* Actions */}
                            {isOwner && (
                              <div className="mt-4 flex justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelInvite(invite.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
                      <Mail className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No pending invitations</p>
                    </div>
                  )}
                </div>

                {/* Active Members Section - 2-column list layout */}
                <div>
                  <div className="mb-4">
                    <h3 className="flex items-center text-2xl font-semibold">
                      <Users className="h-5 w-5 mr-2" />
                      Active Members ({members.length})
                    </h3>
                  </div>
                  {members.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Owners Column */}
                      <div>
                        <div className="mb-4">
                          <h4 className="text-xl font-semibold text-gray-900 flex items-center">
                            <Crown className="h-6 w-6 mr-2 text-blue-600" />
                            Owners ({owners.length})
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {owners.length > 0 ? (
                            owners.map((member, index) => (
                              <div key={member.user_id} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                                {/* List item */}
                                <div className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 break-words">
                                        {member.userName || "Unknown User"}
                                      </p>
                                      <p className="text-sm text-gray-600 break-words truncate">
                                        {member.userEmail}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-1">
                                        Joined {formatDate(member.created_at)}
                                      </p>
                                    </div>
                                    {isOwner && member.user_id !== user?.id && (
                                      <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleRemoveMember(member.user_id)}
                                          className="text-red-600 border-red-200 hover:bg-red-50"
                                        >
                                          <Trash2 size={16} className="mr-2" />
                                          Remove
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No owners
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Members Column */}
                      <div>
                        <div className="mb-4">
                          <h4 className="text-xl font-semibold text-gray-900 flex items-center">
                            <User className="h-6 w-6 mr-2 text-blue-600" />
                            Members ({regularMembers.length})
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {regularMembers.length > 0 ? (
                            regularMembers.map((member, index) => (
                              <div key={member.user_id} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                                {/* List item */}
                                <div className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 break-words">
                                        {member.userName || "Unknown User"}
                                      </p>
                                      <p className="text-sm text-gray-600 break-words truncate">
                                        {member.userEmail}
                                      </p>
                                      <p className="text-xs text-gray-400 mt-1">
                                        Joined {formatDate(member.created_at)}
                                      </p>
                                    </div>
                                    {isOwner && member.user_id !== user?.id && (
                                      <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditPermissions(member)}
                                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        >
                                          <Edit size={16} className="mr-2" />
                                          Edit Permissions
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleRemoveMember(member.user_id)}
                                          className="text-red-600 border-red-200 hover:bg-red-50"
                                        >
                                          <Trash2 size={16} className="mr-2" />
                                          Remove
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm">
                              No members
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-gray-500">No active members</p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
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
          </div>
        </div>

        {/* Local styles for subtle animations */}
        <style jsx>{`
          @keyframes fadeUp {
            0% { opacity: 0; transform: translateY(16px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-up {
            animation: fadeUp 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
        `}</style>
      </DashboardLayout>
    </RoleBasedRoute>
  );
}
