// src/app/team/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useOrgStore } from "@/stores/useOrgStore";
import { RoleBasedRoute } from "@/components/auth/RoleBasedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { InviteMemberModal } from "@/components/team/InviteMemberModal";
import { EditMemberPermissionsModal } from "@/components/team/EditMemberPermissionsModal";
import { AnimatePresence } from "framer-motion";
import { MemberView } from "@/components/team/MemberView";
import { OwnerView } from "@/components/team/OwnerView";
import { MemberViewSkeleton } from "@/components/team/MemberViewSkeleton";
import { OwnerViewSkeleton } from "@/components/team/OwnerViewSkeleton";
import { OrgMemberRole, ProjectGrant, OrgGrant, OrgMember } from "@/types/enhanced-types";
import { ArrowLeft } from "lucide-react";

type ModalState =
  | { type: "invite" }
  | { type: "edit"; member: OrgMember }
  | { type: null };

// Memoized Breadcrumb Component
const TeamBreadcrumb = React.memo<{ onNavigate: () => void }>(({ onNavigate }) => (
  <nav className="flex items-center space-x-2 text-base mb-2">
    <button
      onClick={onNavigate}
      className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md mr-2 transition-colors"
      aria-label="Go back to Dashboard"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
    <button
      onClick={onNavigate}
      className="text-gray-500 hover:text-gray-700 font-medium"
    >
      Dashboard
    </button>
    <span className="text-gray-400">/</span>
    <span className="text-gray-800 font-semibold">Team Management</span>
  </nav>
));
TeamBreadcrumb.displayName = "TeamBreadcrumb";

export default function TeamPage() {
  const router = useRouter();
  const { user, activeOrg, currentOrgRole } = useAuth();
  const {
    members,
    pendingInvites,
    isOwner,
    isLoading,
    isInviting,
    error,
    loadOrg,
    inviteMember,
    cancelInvite,
    removeMember,
    updateMemberPermissions,
    updateMemberName,
    clearError,
  } = useOrgStore();

  const [modalState, setModalState] = useState<ModalState>({ type: null });
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [cancelingInviteId, setCancelingInviteId] = useState<string | null>(null);

  // Memoized computed values
  const currentUserMember = useMemo(
    () => members.find((m) => m.user_id === user?.id),
    [members, user?.id]
  );
  const isMember = useMemo(
    () => currentOrgRole === "member",
    [currentOrgRole]
  );

  // Memoized navigation handler
  const handleNavigateToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  // Memoized breadcrumb
  const breadcrumb = useMemo(
    () => <TeamBreadcrumb onNavigate={handleNavigateToDashboard} />,
    [handleNavigateToDashboard]
  );

  useEffect(() => {
    if (activeOrg) {
      loadOrg(activeOrg.id);
    }
  }, [activeOrg, loadOrg]);

  // Memoized event handlers
  const handleInviteMember = useCallback(
    async (
      email: string,
      role: OrgMemberRole,
      projectGrants: ProjectGrant[],
      orgGrants: OrgGrant | null
    ) => {
      try {
        const inviteLink = await inviteMember(email, role, projectGrants, orgGrants);
        // Reload org data to show the new pending invite
        if (activeOrg) {
          loadOrg(activeOrg.id).catch((error) => {
            console.error("Failed to reload org after inviting member:", error);
          });
        }
        return inviteLink as string;
      } catch (error) {
        console.error("Failed to invite member:", error);
        throw error;
      }
    },
    [inviteMember, activeOrg, loadOrg]
  );

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      if (
        confirm(
          "Are you sure you want to remove this member? This action cannot be undone."
        )
      ) {
        setRemovingMemberId(memberId);
        try {
          await removeMember(memberId);
        } catch (error) {
          console.error("Failed to remove member:", error);
        } finally {
          setRemovingMemberId(null);
        }
      }
    },
    [removeMember]
  );

  const handleCancelInvite = useCallback(
    async (inviteId: string): Promise<void> => {
      if (window.confirm("Are you sure you want to cancel this invitation?")) {
        setCancelingInviteId(inviteId);
        try {
          await cancelInvite(inviteId);
        } catch (error) {
          console.error("Failed to cancel invite:", error);
        } finally {
          setCancelingInviteId(null);
        }
      }
    },
    [cancelInvite]
  );

  const handleEditPermissions = useCallback((member: OrgMember) => {
    setModalState({ type: "edit", member });
  }, []);

  const handleUpdatePermissions = useCallback(
    async (
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
    },
    [updateMemberPermissions, activeOrg, loadOrg]
  );

  const handleStartEditName = useCallback((member: OrgMember) => {
    setEditingMemberId(member.user_id);
    setEditedName(member.userName || "");
  }, []);

  const handleCancelEditName = useCallback(() => {
    setEditingMemberId(null);
    setEditedName("");
  }, []);

  const handleSaveName = useCallback(
    async (memberId: string) => {
      if (!editedName.trim()) {
        handleCancelEditName();
        return;
      }

      setIsSavingName(true);
      try {
        await updateMemberName(memberId, editedName.trim());
        setEditingMemberId(null);
        setEditedName("");
      } catch (error) {
        console.error("Failed to update member name:", error);
        alert("Failed to update member name. Please try again.");
      } finally {
        setIsSavingName(false);
      }
    },
    [editedName, updateMemberName, handleCancelEditName]
  );

  const handleOpenInviteModal = useCallback(() => {
    setModalState({ type: "invite" });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ type: null });
  }, []);

  // Memoized name change handler (setState is stable, but wrapping for consistency)
  const handleNameChange = useCallback((name: string) => {
    setEditedName(name);
  }, []);

  return (
    <RoleBasedRoute roles={["borrower"]}>
      <DashboardLayout breadcrumb={breadcrumb} mainClassName="flex-1 overflow-auto">
        {!activeOrg ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              No active org found. Please contact support.
            </p>
          </div>
        ) : (
          <>
            {/* Decorative Background Layer (mirrors dashboard) */}
            <div className="relative min-h-full bg-gray-200">
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
              <div className="relative z-[1] px-4 sm:px-6 lg:px-14 pt-20 pb-6">
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

                {isLoading ? (
                  // Show skeleton components while loading
                  isMember ? (
                    <MemberViewSkeleton />
                  ) : (
                    <OwnerViewSkeleton />
                  )
                ) : isMember ? (
                  <MemberView
                    currentUserMember={currentUserMember}
                    userName={user?.name}
                    userEmail={user?.email}
                    currentOrgRole={currentOrgRole}
                    orgName={activeOrg.name}
                    editingMemberId={editingMemberId}
                    editedName={editedName}
                    isSavingName={isSavingName}
                    onStartEditName={handleStartEditName}
                    onCancelEditName={handleCancelEditName}
                    onSaveName={handleSaveName}
                    onNameChange={handleNameChange}
                  />
                ) : (
                  <OwnerView
                    orgName={activeOrg.name}
                    members={members}
                    pendingInvites={pendingInvites}
                    isOwner={isOwner}
                    currentUserId={user?.id}
                    onInviteClick={handleOpenInviteModal}
                    onCancelInvite={handleCancelInvite}
                    onRemoveMember={handleRemoveMember}
                    onEditPermissions={handleEditPermissions}
                    editingMemberId={editingMemberId}
                    editedName={editedName}
                    isSavingName={isSavingName}
                    removingMemberId={removingMemberId}
                    cancelingInviteId={cancelingInviteId}
                    onStartEditName={handleStartEditName}
                    onCancelEditName={handleCancelEditName}
                    onSaveName={handleSaveName}
                    onNameChange={handleNameChange}
                  />
                )}

                {/* Modals */}
                {modalState.type === "invite" && (
                  <InviteMemberModal
                    isOpen={true}
                    onClose={handleCloseModal}
                    onInvite={handleInviteMember}
                  />
                )}

                {modalState.type === "edit" && (
                  <EditMemberPermissionsModal
                    isOpen={true}
                    onClose={handleCloseModal}
                    member={modalState.member}
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
          </>
        )}

      </DashboardLayout>
    </RoleBasedRoute>
  );
}
