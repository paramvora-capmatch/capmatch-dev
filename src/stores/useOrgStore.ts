// src/stores/useOrgStore.ts
import { create } from "zustand";
import { supabase } from "../../lib/supabaseClient";
import {
  Org,
  OrgMember,
  Invite,
  OrgMemberRole,
  ProjectGrant,
  OrgGrant,
} from "../types/enhanced-types";

interface OrgState {
  currentOrg: Org | null;
  members: OrgMember[];
  pendingInvites: Invite[];
  isOwner: boolean;
  isLoading: boolean;
  isInviting: boolean;
  error: string | null;
  loadingOrgId: string | null;
}

interface OrgActions {
  // Core org management
  loadOrg: (orgId: string) => Promise<void>;

  // Team member management
  inviteMember: (
    email: string,
    role: OrgMemberRole,
    projectGrants: ProjectGrant[],
    orgGrants: OrgGrant | null
  ) => Promise<string>;
  cancelInvite: (inviteId: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  updateMemberPermissions: (
    userId: string,
    projectGrants: ProjectGrant[],
    orgGrants: OrgGrant | null
  ) => Promise<void>;

  // Role management (Note: Roles are immutable in new schema - must remove and re-invite)

  // Invitation handling
  acceptInvite: (params: {
    token: string;
    password: string;
    full_name: string;
  }) => Promise<void>;
  validateInviteToken: (
    inviteToken: string
  ) => Promise<{
    valid: boolean;
    orgName?: string;
    inviterName?: string;
    email?: string;
  }>;

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
  isInviting: false,
  error: null,
  loadingOrgId: null,

  // Actions
  loadOrg: async (orgId: string) => {
    const { loadingOrgId, currentOrg } = get();

    // Prevent duplicate loads for the same org
    if (loadingOrgId === orgId) {
      console.log(`[OrgStore] Already loading org: ${orgId}`);
      return;
    }

    // If already loaded, we can skip unless we want to force refresh.
    // For now, let's allow reload if it's not currently loading, 
    // but maybe we should check if currentOrg.id === orgId too?
    // The ProjectCard logic checks if (currentOrgState?.id !== project.owner_org_id).
    // So if it's already loaded, ProjectCard won't call it.
    // But if multiple cards call it simultaneously, loadingOrgId will catch it.

    set({ isLoading: true, loadingOrgId: orgId, error: null });

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

      // Get user details for members
      const memberUserIds =
        members?.map((m) => m.user_id).filter(Boolean) || [];

      // Fetch email + full_name + app_role directly from profiles (RLS now allows related profile access)
      const { data: memberProfiles, error: memberProfilesError } =
        memberUserIds.length > 0
          ? await supabase
              .from("profiles")
              .select("id, full_name, email, app_role")
              .in("id", memberUserIds)
          : { data: [], error: null };

      if (memberProfilesError) {
        console.error("Error fetching member profiles:", memberProfilesError);
      }

      const basicById = new Map(
        ((memberProfiles as { id: string; email: string | null; full_name: string | null; app_role?: string | null }[]) || []).map(
          (u) => [u.id, u]
        )
      );

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
          const basic = basicById.get(member.user_id) as
            | { id: string; email: string | null; full_name: string | null; app_role?: string | null }
            | undefined;
          return {
            ...member,
            userName: (basic?.full_name && basic.full_name.trim()) || "Unknown User",
            userEmail: basic?.email || "user@example.com",
            userRole: basic?.app_role,
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
        loadingOrgId: null,
      });
    } catch (error) {
      // Provide better error message
      const errorMessage = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : String(error) || "Failed to load org";

      console.error("Error loading org:", errorMessage, error);
      set({
        error: errorMessage,
        isLoading: false,
        loadingOrgId: null,
      });
      // Don't throw - let the caller handle it gracefully
    }
  },

  // Org creation is handled by edge functions. No client-side create.

  inviteMember: async (
    email: string,
    role: OrgMemberRole,
    projectGrants: ProjectGrant[],
    orgGrants: OrgGrant | null
  ) => {
    set({ isInviting: true, error: null });

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
            org_grants: orgGrants,
          },
        }
      );

      // Check if data contains error information (Supabase may return error in data even when error is set)
      if (data && typeof data === 'object' && 'error' in data && !('invite' in data)) {
        const errorMessage = (data as any).error || 'Failed to invite member';
        throw new Error(errorMessage);
      }

      if (invokeError) {
        // Try to extract error message from response body
        let errorMessage = invokeError.message;
        
        // Check if data was returned despite the error (some Supabase versions do this)
        if (data && typeof data === 'object' && 'error' in data) {
          errorMessage = (data as any).error || errorMessage;
        }
        
        // For FunctionsHttpError, try to extract the actual error from the response
        // The error object might have the response in different places depending on Supabase version
        const errorAny = invokeError as any;
        
        // Debug: Log error structure to help diagnose (can be removed later)
        if (process.env.NODE_ENV === 'development') {
          console.log('Error details:', {
            message: errorMessage,
            hasContext: !!errorAny.context,
            contextType: typeof errorAny.context,
            isResponse: errorAny.context instanceof Response,
            errorKeys: Object.keys(errorAny),
            status: errorAny.status,
            statusCode: errorAny.statusCode,
          });
        }
        
        // Try to get response body from various possible locations
        let responseBody: any = null;
        
        // Method 1: Check if context is a Response object
        if (errorAny.context instanceof Response) {
          try {
            // Clone the response before reading (Response can only be read once)
            const clonedResponse = errorAny.context.clone();
            responseBody = await clonedResponse.json();
          } catch (e) {
            // Failed to parse, try reading as text
            try {
              const clonedResponse = errorAny.context.clone();
              const text = await clonedResponse.text();
              try {
                responseBody = JSON.parse(text);
              } catch {
                // Not JSON
              }
            } catch {
              // Failed to read
            }
          }
        }
        // Method 2: Check if context has a json method
        else if (errorAny.context && typeof errorAny.context.json === 'function') {
          try {
            responseBody = await errorAny.context.json();
          } catch (e) {
            // Failed to parse
          }
        }
        // Method 3: Check if context is already the parsed response object
        else if (errorAny.context && typeof errorAny.context === 'object' && !(errorAny.context instanceof Response)) {
          // Check if it's already the error response
          if (errorAny.context.error || errorAny.context.message) {
            responseBody = errorAny.context;
          }
        }
        // Method 4: Check if error has a response property
        else if (errorAny.response) {
          if (errorAny.response instanceof Response) {
            try {
              const clonedResponse = errorAny.response.clone();
              responseBody = await clonedResponse.json();
            } catch (e) {
              // Failed to parse
            }
          } else if (typeof errorAny.response === 'object') {
            responseBody = errorAny.response;
          }
        }
        // Method 5: Check if error has a body property
        else if (errorAny.body) {
          if (typeof errorAny.body === 'string') {
            try {
              responseBody = JSON.parse(errorAny.body);
            } catch (e) {
              // Not JSON
            }
          } else if (typeof errorAny.body === 'object') {
            responseBody = errorAny.body;
          }
        }
        
        // Extract error message from response body
        if (responseBody) {
          if (responseBody.error) {
            errorMessage = responseBody.error;
          } else if (responseBody.message) {
            errorMessage = responseBody.message;
          }
        }
        
        // If we still have the generic message and it's a 409 status, provide a helpful message
        if (errorMessage === 'Edge Function returned a non-2xx status code' || 
            errorMessage.includes('non-2xx')) {
          if (errorAny.status === 409 || errorAny.statusCode === 409) {
            errorMessage = 'This email address is already registered. Please invite them directly or ask them to join your organization.';
          }
        }
        
        // Create a new error with the extracted message
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).originalError = invokeError;
        throw enhancedError;
      }
      if (!data || !data.invite) throw new Error("Failed to create invite");

      // Generate invite link using the token from the response
      const inviteLink = `${window.location.origin}/accept-invite?token=${data.invite.token}`;

      set({ isInviting: false });
      return inviteLink;
    } catch (error) {
      console.error("Error inviting member:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to invite member",
        isInviting: false,
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

  updateMemberPermissions: async (
    userId: string,
    projectGrants: ProjectGrant[],
    orgGrants: OrgGrant | null
  ) => {
    set({ isLoading: true, error: null });

    try {
      const { currentOrg } = get();
      if (!currentOrg) throw new Error("No active org");

      // Use the update-member-permissions edge function
      const { error: invokeError } = await supabase.functions.invoke(
        "update-member-permissions",
        {
          body: {
            org_id: currentOrg.id,
            user_id: userId,
            project_grants: projectGrants,
            org_grants: orgGrants,
          },
        }
      );

      if (invokeError) throw invokeError;

      // Refresh members list after successful update
      await get().refreshMembers();
      set({ isLoading: false });
    } catch (error) {
      console.error("Error updating member permissions:", error);
      set({
        error:
          error instanceof Error ? error.message : "Failed to update permissions",
        isLoading: false,
      });
      throw error;
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
      const { data, error } = await supabase.functions.invoke("validate-invite", {
        body: { token: inviteToken },
      });
      if (error || !data) return { valid: false };
      return {
        valid: !!data.valid,
        orgName: data.orgName,
        inviterName: data.inviterName,
        email: (data as { email?: string }).email,
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
