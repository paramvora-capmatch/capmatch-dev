import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Users, Clock, User } from "lucide-react";
import { OrgMember } from "@/types/enhanced-types";
import { formatDate } from "@/utils/dateUtils";

interface MemberViewProps {
  currentUserMember: OrgMember | undefined;
  userName?: string | null;
  userEmail?: string | null;
  currentOrgRole?: string | null;
  orgName: string;
}

export const MemberView: React.FC<MemberViewProps> = ({
  currentUserMember,
  userName,
  userEmail,
  currentOrgRole,
  orgName,
}) => {
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
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {currentUserMember?.userName || userName || "Unknown User"}
                </h3>
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

