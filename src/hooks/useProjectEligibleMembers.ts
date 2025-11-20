import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { OrgMember, OrgMemberRole } from "@/types/enhanced-types";

interface AdvisorProfile {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

export interface EligibleMember {
  user_id: string;
  userName?: string;
  userEmail?: string | null;
  role?: OrgMemberRole | "advisor";
}

interface UseProjectEligibleMembersParams {
  projectId?: string;
  members: OrgMember[];
  advisorUserId?: string | null;
  enabled?: boolean;
}

export function useProjectEligibleMembers({
  projectId,
  members,
  advisorUserId,
  enabled = true,
}: UseProjectEligibleMembersParams) {
  const [projectMemberIds, setProjectMemberIds] = useState<Set<string>>(new Set());
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (!projectId) {
      setProjectMemberIds(new Set());
      return;
    }

    const fetchProjectMembers = async () => {
      try {
        const { data: grants, error } = await supabase
          .from("project_access_grants")
          .select("user_id")
          .eq("project_id", projectId);

        if (error) {
          console.error("[useProjectEligibleMembers] Failed to fetch project members:", error);
          setProjectMemberIds(new Set());
          return;
        }

        const userIds = new Set(grants?.map((g) => g.user_id) || []);
        members
          .filter((member) => member.role === "owner")
          .forEach((owner) => userIds.add(owner.user_id));
        if (advisorUserId) {
          userIds.add(advisorUserId);
        }

        setProjectMemberIds(userIds);
      } catch (err) {
        console.error("[useProjectEligibleMembers] Error fetching project members:", err);
        setProjectMemberIds(new Set());
      }
    };

    fetchProjectMembers();
  }, [projectId, advisorUserId, enabled, members]);

  useEffect(() => {
    if (!enabled) return;

    if (!advisorUserId) {
      setAdvisorProfile(null);
      return;
    }

    let isCancelled = false;

    const fetchAdvisorProfile = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-user-data", {
          body: { userIds: [advisorUserId] },
        });

        if (!isCancelled) {
          if (!error && Array.isArray(data) && data.length > 0) {
            setAdvisorProfile(data[0]);
          } else if (error) {
            console.error("[useProjectEligibleMembers] Failed to fetch advisor profile:", error);
            setAdvisorProfile(null);
          }
        }
      } catch (advisorErr) {
        if (!isCancelled) {
          console.error("[useProjectEligibleMembers] Error fetching advisor profile:", advisorErr);
          setAdvisorProfile(null);
        }
      }
    };

    fetchAdvisorProfile();

    return () => {
      isCancelled = true;
    };
  }, [advisorUserId, enabled]);

  const eligibleMembers: EligibleMember[] = useMemo(() => {
    const baseMembers: EligibleMember[] = members
      .filter((member) => projectMemberIds.has(member.user_id))
      .map((member) => ({
        user_id: member.user_id,
        userName: member.userName,
        userEmail: member.userEmail,
        role: member.role,
      }));

    if (
      advisorProfile &&
      projectMemberIds.has(advisorProfile.id) &&
      !baseMembers.some((member) => member.user_id === advisorProfile.id)
    ) {
      baseMembers.push({
        user_id: advisorProfile.id,
        userName: advisorProfile.full_name || advisorProfile.email || "Advisor",
        userEmail: advisorProfile.email,
        role: "advisor",
      });
    }

    return baseMembers;
  }, [members, projectMemberIds, advisorProfile]);

  const defaultOwnerAndAdvisorIds = useMemo(() => {
    return new Set(
      eligibleMembers
        .filter((member) => member.role === "owner" || member.role === "advisor")
        .map((member) => member.user_id)
    );
  }, [eligibleMembers]);

  return {
    projectMemberIds,
    advisorProfile,
    eligibleMembers,
    defaultOwnerAndAdvisorIds,
  };
}
