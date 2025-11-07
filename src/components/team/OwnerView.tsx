import React from "react";
import { Users, UserPlus, Mail, Crown, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OrgMember, Invite } from "@/types/enhanced-types";
import { MemberCard } from "./MemberCard";
import { PendingInviteCard } from "./PendingInviteCard";

interface OwnerViewProps {
  orgName: string;
  members: OrgMember[];
  pendingInvites: Invite[];
  isOwner: boolean;
  currentUserId?: string;
  onInviteClick: () => void;
  onCancelInvite: (inviteId: string) => void;
  onRemoveMember: (memberId: string) => void;
  onEditPermissions: (member: OrgMember) => void;
  // Name editing props
  editingMemberId: string | null;
  editedName: string;
  isSavingName: boolean;
  onStartEditName: (member: OrgMember) => void;
  onCancelEditName: () => void;
  onSaveName: (memberId: string) => void;
  onNameChange: (name: string) => void;
}

export const OwnerView: React.FC<OwnerViewProps> = ({
  orgName,
  members,
  pendingInvites,
  isOwner,
  currentUserId,
  onInviteClick,
  onCancelInvite,
  onRemoveMember,
  onEditPermissions,
  editingMemberId,
  editedName,
  isSavingName,
  onStartEditName,
  onCancelEditName,
  onSaveName,
  onNameChange,
}) => {
  const owners = members.filter((m) => m.role === "owner");
  const regularMembers = members.filter((m) => m.role === "member");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 text-2xl mt-3">{orgName}</p>
        </div>
      </div>

      {/* Pending Invites Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="flex items-center text-2xl font-semibold">
            <Mail className="h-5 w-5 mr-2" />
            Pending Invitations{" "}
            {pendingInvites.length > 0 && `(${pendingInvites.length})`}
          </h3>
          {isOwner && (
            <Button
              variant="primary"
              leftIcon={<UserPlus size={18} />}
              onClick={onInviteClick}
            >
              Invite Member
            </Button>
          )}
        </div>
        {pendingInvites.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {pendingInvites.map((invite, index) => (
              <PendingInviteCard
                key={invite.id}
                invite={invite}
                isOwner={isOwner}
                onCancel={onCancelInvite}
                index={index}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
            <Mail className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-gray-500">No pending invitations</p>
          </div>
        )}
      </div>

      {/* Active Members Section */}
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
                    <div
                      key={member.user_id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <MemberCard
                        member={member}
                        currentUserId={currentUserId}
                        isOwner={isOwner}
                        isEditing={editingMemberId === member.user_id}
                        editedName={editedName}
                        isSavingName={isSavingName}
                        onStartEdit={onStartEditName}
                        onCancelEdit={onCancelEditName}
                        onSaveName={onSaveName}
                        onNameChange={onNameChange}
                        onRemove={onRemoveMember}
                        showActions={true}
                      />
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
                    <div
                      key={member.user_id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <MemberCard
                        member={member}
                        currentUserId={currentUserId}
                        isOwner={isOwner}
                        isEditing={editingMemberId === member.user_id}
                        editedName={editedName}
                        isSavingName={isSavingName}
                        onStartEdit={onStartEditName}
                        onCancelEdit={onCancelEditName}
                        onSaveName={onSaveName}
                        onNameChange={onNameChange}
                        onRemove={onRemoveMember}
                        onEditPermissions={onEditPermissions}
                        showActions={true}
                      />
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
    </div>
  );
};

