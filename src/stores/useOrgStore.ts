// src/stores/useOrgStore.ts
import { create } from "zustand";
import { supabase } from "../../lib/supabaseClient";
import {
  Org,
  OrgMember,
  Invite,
  OrgMemberRole,
  ProjectGrant,
} from "../types/enhanced-types";

interface OrgState {
  currentOrg: Org | null;
  members: OrgMember[];
  pendingInvites: Invite[];
  isOwner: boolean;
  isLoading: boolean;
  error: string | null;
}

interface OrgActions {
  // Core org management
  loadOrg: (orgId: string) => Promise<void>;

  // Team member management
  inviteMember: (
    email: string,
    role: OrgMemberRole,
    projectGrants: ProjectGrant[]
  ) => Promise<string>;
  cancelInvite: (inviteId: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;

  // Role management (Note: Roles are immutable in new schema - must remove and re-invite)

  // Invitation handling
  acceptInvite: (params: {
    token: string;
    password: string;
    full_name: string;
  }) => Promise<void>;
  validateInviteToken: (
    inviteToken: string
  ) => Promise<{ valid: boolean; orgName?: string; inviterName?: string }>;

  // Utility methods
  refreshMembers: () => Promise<void>;
  clearError: () => void;
}

export const useOrgStore = create<OrgState & OrgActions>((set, get) => ({
  // State
  currentOrg: null,
  members: [],
  pendingInvites: [],
  isOwner: false,
  isLoading: false,
  error: null,

  // Actions
  loadOrg: async (orgId: string) => {
    set({ isLoading: true, error: null });

    console.log(`[OrgStore] Loading org: ${orgId}`);

    try {
      // Load org details
      const { data: org, error: orgError } = await supabase
        .from("orgs")
        .select("*")
        .eq("id", orgId)
        .single();

      if (orgError) throw orgError;

      // Load members
      const { data: members, error: membersError } = await supabase
        .from("org_members")
        .select("*")
        .eq("org_id", orgId);

      if (membersError) throw membersError;

      // Load pending invites
      const { data: invites, error: invitesError } = await supabase
        .from("invites")
        .select("*")
        .eq("org_id", orgId)
        .eq("status", "pending");

      if (invitesError) throw invitesError;

      // Get user details for members - join with profiles to get full_name
      const memberUserIds =
        members?.map((m) => m.user_id).filter(Boolean) || [];
      const { data: memberProfiles } =
        memberUserIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, full_name, app_role")
              .in("id", memberUserIds)
          : { data: [] };

      const { data: memberEmails, error: emailsError } =
        await supabase.functions.invoke("get-user-data", {
          body: { userIds: memberUserIds as string[] },
        });

      if (emailsError) {
        console.error("Error fetching user emails:", emailsError);
      }

      // Get user details for inviters
      const inviterIds =
        invites?.map((i) => i.invited_by).filter(Boolean) || [];
      const { data: inviterProfiles } =
        inviterIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", inviterIds)
          : { data: [] };

      // Process members data to include profile information
      const processedMembers =
        members?.map((member) => {
          const profile = memberProfiles?.find((p) => p.id === member.user_id);
          const emailData = (memberEmails as {id: string; email: string}[])?.find(
            (e: {id: string}) => e.id === member.user_id
          );
          return {
            ...member,
            userName: profile?.full_name || "Unknown User",
            userEmail: emailData?.email || "user@example.com",
            userRole: profile?.app_role,
          };
        }) || [];

      // Process invites data to include profile information
      const processedInvites =
        invites?.map((invite) => {
          const inviterProfile = inviterProfiles?.find(
            (p) => p.id === invite.invited_by
          );
          return {
            ...invite,
            inviterName: inviterProfile?.full_name || "Unknown User",
          };
        }) || [];

      // Check if current user is owner
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserId = user?.id;
      const isOwner =
        processedMembers.some(
          (member) =>
            member.user_id === currentUserId && member.role === "owner"
        ) || false;

      console.log(`[OrgStore] Org loaded successfully`);
      console.log(`[OrgStore] Current user ID: ${currentUserId}`);
      console.log(`[OrgStore] Is owner: ${isOwner}`);
      console.log(`[OrgStore] Members count: ${processedMembers.length}`);

      set({
        currentOrg: org,
        members: processedMembers,
        pendingInvites: processedInvites,
        isOwner,
        isLoading: false,
      });
    } catch (error) {
      console.error("Error loading org:", error);
      set({
        error: error instanceof Error ? error.message : "Failed to load org",
        isLoading: false,
      });
    }
  },

  // Org creation is handled by edge functions. No client-side create.

  inviteMember: async (
    email: string,
    role: OrgMemberRole,
    projectGrants: ProjectGrant[]
  ) => {
    set({ isLoading: true, error: null });

    try {
      const { currentOrg } = get();
      if (!currentOrg) throw new Error("No active org");

      // Use the new invite-user edge function
      const { data, error: invokeError } = await supabase.functions.invoke(
        "invite-user",
        {
          body: {
            org_id: currentOrg.id,
            invited_email: email,
            role,
            project_grants: projectGrants,
          },
        }
      );

      if (invokeError) throw invokeError;
      if (!data || !data.invite) throw new Error("Failed to create invite");

      // Generate invite link using the token from the response
      const inviteLink = `${window.location.origin}/accept-invite?token=${data.invite.token}`;

      set({ isLoading: false });
      return inviteLink;
    } catch (error) {
      console.error("Error inviting member:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to invite member",
        isLoading: false,
      });
      throw error;
    }
  },

  cancelInvite: async (inviteId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase
        .from("invites")
        .update({ status: "cancelled" })
        .eq("id", inviteId);

      if (error) throw error;

      // Refresh members list
      await get().refreshMembers();
      set({ isLoading: false });
    } catch (error) {
      console.error("Error cancelling invite:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to cancel invite",
        isLoading: false,
      });
    }
  },

  removeMember: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { members, currentOrg } = get();
      const member = members.find((m) => m.user_id === userId);

      if (!member || !currentOrg) throw new Error("Member or org not found");

      // Check if this is the last owner
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (member.role === "owner" && ownerCount <= 1) {
        throw new Error("Cannot remove the last owner");
      }

      // Invoke the 'remove-user' Supabase function
      const { error } = await supabase.functions.invoke("remove-user", {
        body: {
          org_id: currentOrg.id,
          user_id: userId,
        },
      });

      if (error) throw error;

      // Refresh members list
      await get().refreshMembers();
      set({ isLoading: false });
    } catch (error) {
      console.error("Error removing member:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to remove member",
        isLoading: false,
      });
    }
  },

  acceptInvite: async (params: {
    token: string;
    password: string;
    full_name: string;
  }) => {
    set({ isLoading: true, error: null });

    try {
      // Delegate to edge function (handles validation, membership, permissions)
      const { error } = await supabase.functions.invoke("accept-invite", {
        body: {
          token: params.token,
          accept: true,
          password: params.password,
          full_name: params.full_name,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      set({ isLoading: false });

      // Reload entity memberships in auth store
      const { useAuthStore } = await import("./useAuthStore");
      const authStore = useAuthStore.getState();
      await authStore.loadOrgMemberships();
    } catch (error) {
      console.error("Error accepting invite:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to accept invite",
        isLoading: false,
      });
      throw error;
    }
  },

  validateInviteToken: async (inviteToken: string) => {
    try {
      const { data: invite } = await supabase
        .from("invites")
        .select(
          `
          *,
          orgs(name)
        `
        )
        .eq("token", inviteToken)
        .eq("status", "pending")
        .single();

      if (!invite) {
        return { valid: false };
      }

      // Check if invite is expired
      if (new Date(invite.expires_at) < new Date()) {
        return { valid: false };
      }

      return {
        valid: true,
        orgName: (invite.orgs as Org | undefined)?.name,
        inviterName: "Team Owner", // Simplified for now
      };
    } catch (error) {
      console.error("Error validating invite token:", error);
      return { valid: false };
    }
  },

  refreshMembers: async () => {
    const { currentOrg } = get();
    if (currentOrg) {
      await get().loadOrg(currentOrg.id);
    }
  },

  clearError: () => set({ error: null }),
}));
