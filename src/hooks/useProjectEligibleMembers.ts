import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { apiClient } from "@/lib/apiClient";
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
  role?: OrgMemberRole | "advisor" | "lender";
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
  const [lenderMembers, setLenderMembers] = useState<EligibleMember[]>([]);

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
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("id", advisorUserId)
          .maybeSingle();

        if (!isCancelled) {
          if (!error && data) {
            setAdvisorProfile(data as AdvisorProfile);
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

  useEffect(() => {
    if (!enabled || !projectId) {
      setLenderMembers([]);
      return;
    }
    let isCancelled = false;
    const fetchLenderMembers = async () => {
      try {
        const { data, error } = await apiClient.getChannelEligibleMembers(projectId);
        if (isCancelled) return;
        if (error || !data?.members) {
          setLenderMembers([]);
          return;
        }
        const list: EligibleMember[] = (data.members || []).map((m) => ({
          user_id: m.user_id,
          userName: m.full_name ?? undefined,
          userEmail: m.email ?? null,
          role: "lender" as const,
        }));
        setLenderMembers(list);
      } catch (err) {
        if (!isCancelled) {
          setLenderMembers([]);
          // Lenders get 403 from this endpoint; avoid noisy error log when it's a permission response
          const msg = err instanceof Error ? err.message : String(err);
          if (!/permission|eligible members|403/i.test(msg) && process.env.NODE_ENV === "development") {
            console.warn("[useProjectEligibleMembers] Eligible members not available:", err);
          }
        }
      }
    };
    fetchLenderMembers();
    return () => {
      isCancelled = true;
    };
  }, [projectId, enabled]);

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

    const seen = new Set(baseMembers.map((m) => m.user_id));
    for (const lender of lenderMembers) {
      if (!seen.has(lender.user_id)) {
        seen.add(lender.user_id);
        baseMembers.push(lender);
      }
    }
    return baseMembers;
  }, [members, projectMemberIds, advisorProfile, lenderMembers]);

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
