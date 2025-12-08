import React from "react";
import { Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Invite } from "@/types/enhanced-types";
import { formatDate, isInviteExpired } from "@/utils/dateUtils";

interface PendingInviteCardProps {
  invite: Invite;
  isOwner: boolean;
  onCancel: (inviteId: string) => void;
  index: number;
  isCanceling?: boolean;
}

export const PendingInviteCard: React.FC<PendingInviteCardProps> = ({
  invite,
  isOwner,
  onCancel,
  index,
  isCanceling = false,
}) => {
  const expired = isInviteExpired(invite.expires_at);

  return (
    <div
      className="relative animate-fade-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
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
            {expired && (
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
            {!expired && (
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
              onClick={() => onCancel(invite.id)}
              disabled={isCanceling}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {isCanceling ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Canceling...
                </>
              ) : (
                "Cancel"
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

