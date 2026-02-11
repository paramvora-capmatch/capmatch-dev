import React from "react";
import { Edit, Check, X, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { OrgMember } from "@/types/enhanced-types";
import { formatDate } from "@/utils/dateUtils";

interface MemberCardProps {
  member: OrgMember;
  currentUserId?: string;
  isOwner: boolean;
  isEditing: boolean;
  editedName: string;
  isSavingName: boolean;
  isRemoving?: boolean;
  onStartEdit: (member: OrgMember) => void;
  onCancelEdit: () => void;
  onSaveName: (memberId: string) => void;
  onNameChange: (name: string) => void;
  onRemove?: (memberId: string) => void;
  onEditPermissions?: (member: OrgMember) => void;
  showActions?: boolean;
}

export const MemberCard: React.FC<MemberCardProps> = React.memo(({
  member,
  currentUserId,
  isOwner,
  isEditing,
  editedName,
  isSavingName,
  isRemoving = false,
  onStartEdit,
  onCancelEdit,
  onSaveName,
  onNameChange,
  onRemove,
  onEditPermissions,
  showActions = true,
}) => {
  const isCurrentUser = member.user_id === currentUserId;
  const canEditName = isCurrentUser;
  const showActionButtons = showActions && isOwner && !isCurrentUser && !isEditing;

  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => onNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onSaveName(member.user_id);
                    } else if (e.key === "Escape") {
                      onCancelEdit();
                    }
                  }}
                  className="flex-1 px-2 py-1 text-sm font-medium text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  disabled={isSavingName}
                />
                <button
                  onClick={() => onSaveName(member.user_id)}
                  disabled={isSavingName}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 flex items-center justify-center"
                  aria-label="Save name"
                >
                  {isSavingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={onCancelEdit}
                  disabled={isSavingName}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  aria-label="Cancel editing"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <p className="font-medium text-gray-900 break-words">
                  {member.userName || "Unknown User"}
                </p>
                {canEditName && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartEdit(member);
                      }}
                      className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden"
                      aria-label="Edit name"
                    >
                      <Edit className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                      <span className="text-xs font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[80px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                        Edit Name
                      </span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <p className="text-sm text-gray-600 break-words truncate">
            {member.userEmail}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Joined {formatDate(member.created_at)}
          </p>
        </div>
        {showActionButtons && (
          <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
            {onEditPermissions && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditPermissions(member)}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Edit size={16} className="mr-2" />
                Edit Permissions
              </Button>
            )}
            {onRemove && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRemove(member.user_id)}
                disabled={isRemoving}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {isRemoving ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Remove
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
MemberCard.displayName = "MemberCard";

