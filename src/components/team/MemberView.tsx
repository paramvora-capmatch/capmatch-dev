import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Users, Clock, User, Edit, Check, X } from "lucide-react";
import { OrgMember } from "@/types/enhanced-types";
import { formatDate } from "@/utils/dateUtils";

interface MemberViewProps {
  currentUserMember: OrgMember | undefined;
  userName?: string | null;
  userEmail?: string | null;
  currentOrgRole?: string | null;
  orgName: string;
  editingMemberId: string | null;
  editedName: string;
  isSavingName: boolean;
  onStartEditName: (member: OrgMember) => void;
  onCancelEditName: () => void;
  onSaveName: (memberId: string) => void;
  onNameChange: (name: string) => void;
}

export const MemberView: React.FC<MemberViewProps> = ({
  currentUserMember,
  userName,
  userEmail,
  currentOrgRole,
  orgName,
  editingMemberId,
  editedName,
  isSavingName,
  onStartEditName,
  onCancelEditName,
  onSaveName,
  onNameChange,
}) => {
  const displayName = currentUserMember?.userName || userName || "Unknown User";
  const isEditingName = Boolean(
    currentUserMember && editingMemberId === currentUserMember.user_id
  );

  return (
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => onNameChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && currentUserMember) {
                            onSaveName(currentUserMember.user_id);
                          } else if (e.key === "Escape") {
                            onCancelEditName();
                          }
                        }}
                        className="flex-1 sm:flex-none min-w-[180px] px-3 py-2 text-sm font-medium text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        autoFocus
                        disabled={isSavingName}
                      />
                      <button
                        onClick={() => currentUserMember && onSaveName(currentUserMember.user_id)}
                        disabled={isSavingName}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                        aria-label="Save name"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={onCancelEditName}
                        disabled={isSavingName}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        aria-label="Cancel editing"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {displayName}
                      </h3>
                      {currentUserMember && (
                        <button
                          onClick={() => onStartEditName(currentUserMember)}
                          className="group flex items-center gap-0 px-2 group-hover:px-3 py-1 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden"
                          aria-label="Edit name"
                        >
                          <Edit className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[80px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                            Edit Name
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {currentUserMember?.userEmail || userEmail}
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
                {orgName}
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-2" />
                <span>
                  Joined on{" "}
                  {currentUserMember
                    ? formatDate(currentUserMember.created_at)
                    : "Unknown"}
                </span>
              </div>
            </div>

            {/* Info Note */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                You are a member of this organization. If you need to manage team
                settings or invite new members, please contact an organization
                owner.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

