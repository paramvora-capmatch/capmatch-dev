// src/components/project/AccessControlTab.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useOrgStore } from "@/stores/useOrgStore";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "../../../lib/supabaseClient";
import { Advisor, Permission } from "@/types/enhanced-types";
import { Select } from "../ui/Select";
import { Loader2, User, Shield, Briefcase } from "lucide-react";

interface AccessControlTabProps {
  projectId: string;
}

interface MemberPermissionInfo {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  resumePermission: Permission | "none";
}

export const AccessControlTab: React.FC<AccessControlTabProps> = ({
  projectId,
}) => {
  const { members, isLoading: isOrgLoading, currentOrg } = useOrgStore();
  const { activeProject } = useProjects();
  const [permissions, setPermissions] = useState<MemberPermissionInfo[]>([]);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (!activeProject || isOrgLoading) return;

    // Ensure we have the right org loaded
    if (!currentOrg || currentOrg.id !== activeProject.entityId) {
      console.log(`[AccessControlTab] Waiting for correct org to load...`);
      return;
    }

    setIsLoading(true);
    console.log(`[AccessControlTab] Loading permissions for project: ${projectId}`);

    // Fetch advisor details from the database
    if (activeProject.assignedAdvisorUserId) {
      try {
        console.log(`[AccessControlTab] Fetching advisor with ID: ${activeProject.assignedAdvisorUserId}`);

        const { data: advisorProfile, error: advisorError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', activeProject.assignedAdvisorUserId)
          .single();

        if (advisorError) {
          console.error(`[AccessControlTab] Error fetching advisor: ${advisorError.message}`);
        } else if (advisorProfile) {
          // Transform the profile data to match the Advisor type
          setAdvisor({
            id: advisorProfile.id,
            userId: advisorProfile.id,
            name: advisorProfile.full_name || advisorProfile.email,
            email: advisorProfile.email,
            title: "Capital Advisor",
            phone: "",
            bio: "Capital Advisor at CapMatch",
            avatar: "",
            specialties: [],
            yearsExperience: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          console.log(`[AccessControlTab] Advisor loaded: ${advisorProfile.full_name}`);
        }
      } catch (e) {
        console.error("[AccessControlTab] Failed to fetch advisor", e);
      }
    } else {
      console.log(`[AccessControlTab] No advisor assigned to project`);
    }

    // Fetch member permissions
    try {
      const { data: resource, error: resourceError } = await supabase
        .from("resources")
        .select("id")
        .eq("project_id", projectId)
        .eq("resource_type", "PROJECT_RESUME")
        .single();

      if (resourceError) throw resourceError;
      const projectResumeResourceId = resource.id;

      const { data: perms, error: permsError } = await supabase
        .from("permissions")
        .select("user_id, permission")
        .eq("resource_id", projectResumeResourceId);

      if (permsError) throw permsError;

      const permsMap = new Map(perms.map((p) => [p.user_id, p.permission]));

      const memberPerms = members
        .filter((m) => m.role !== "owner") // Owners always have edit access
        .map((member) => ({
          userId: member.user_id,
          userName: member.userName || member.userEmail || "Unknown",
          userEmail: member.userEmail || "",
          role: member.role,
          resumePermission:
            (permsMap.get(member.user_id) as Permission | "none") || "none",
        }));

      setPermissions(memberPerms);
    } catch (e) {
      console.error("Failed to fetch permissions", e);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, activeProject, members, isOrgLoading, currentOrg]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handlePermissionChange = async (
    userId: string,
    permission: Permission | "none"
  ) => {
    if (!activeProject?.projectResumeResourceId) return;

    try {
      // Optimistic update
      setPermissions((prev) =>
        prev.map((p) =>
          p.userId === userId ? { ...p, resumePermission: permission } : p
        )
      );

      const { error } = await supabase.rpc("set_permission_for_resource", {
        p_resource_id: activeProject.projectResumeResourceId,
        p_user_id: userId,
        p_permission: permission,
      });

      if (error) {
        throw error;
      }
    } catch (e) {
      console.error("Failed to update permission", e);
      // Revert optimistic update on error by re-fetching
      fetchAllData();
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center items-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Advisor Section */}
      <div className="border-b pb-4">
        <h3 className="text-md font-semibold text-gray-800 flex items-center mb-3">
          <Briefcase size={16} className="mr-2" />
          Assigned Advisor
        </h3>
        {advisor ? (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600">
              {advisor.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-gray-900">{advisor.name}</p>
              <p className="text-sm text-gray-500">{advisor.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No advisor assigned to this project.
          </p>
        )}
      </div>

      {/* Member Permissions Section */}
      <div>
        <h3 className="text-md font-semibold text-gray-800 flex items-center mb-3">
          <Shield size={16} className="mr-2" />
          Member Permissions
        </h3>
        <div className="space-y-3">
          {permissions.map((p) => (
            <div
              key={p.userId}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User size={16} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{p.userName}</p>
                  <p className="text-sm text-gray-500">{p.userEmail}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Resume Access:</span>
                <Select
                  value={p.resumePermission}
                  onChange={(e) =>
                    handlePermissionChange(
                      p.userId,
                      e.target.value as Permission | "none"
                    )
                  }
                  options={[
                    { value: "edit", label: "Can Edit" },
                    { value: "view", label: "Can View" },
                    { value: "none", label: "No Access" },
                  ]}
                  className="w-32"
                />
              </div>
            </div>
          ))}
          {permissions.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No members to manage.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
