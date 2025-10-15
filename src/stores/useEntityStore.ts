// src/stores/useEntityStore.ts
import { create } from 'zustand';
import { supabase } from '../../lib/supabaseClient';
import { 
  Entity, 
  EntityMember, 
  Invite,
  EntityMemberRole
} from '../types/enhanced-types';

interface EntityState {
  currentEntity: Entity | null;
  members: EntityMember[];
  pendingInvites: Invite[];
  isOwner: boolean;
  isLoading: boolean;
  error: string | null;
}

interface EntityActions {
  // Core entity management
  loadEntity: (entityId: string) => Promise<void>;
  
  // Team member management
  inviteMember: (email: string, role: EntityMemberRole, initialPermissions?: any) => Promise<string>;
  cancelInvite: (inviteId: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  
  // Role management (Note: Roles are immutable in new schema - must remove and re-invite)
  removeAndReinviteMember: (userId: string, newRole: EntityMemberRole, initialPermissions?: any) => Promise<string>;
  
  // Invitation handling
  acceptInvite: (inviteToken: string) => Promise<void>;
  validateInviteToken: (inviteToken: string) => Promise<{valid: boolean, entityName?: string, inviterName?: string}>;
  
  // Utility methods
  refreshMembers: () => Promise<void>;
  clearError: () => void;
}

export const useEntityStore = create<EntityState & EntityActions>((set, get) => ({
  // State
  currentEntity: null,
  members: [],
  pendingInvites: [],
  isOwner: false,
  isLoading: false,
  error: null,

  // Actions
  loadEntity: async (entityId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Load entity details
      const { data: entity, error: entityError } = await supabase
        .from('entities')
        .select('*')
        .eq('id', entityId)
        .single();

      if (entityError) throw entityError;

      // Load members
      const { data: members, error: membersError } = await supabase
        .from('entity_members')
        .select('*')
        .eq('entity_id', entityId);

      if (membersError) throw membersError;

      // Load pending invites
      const { data: invites, error: invitesError } = await supabase
        .from('invites')
        .select('*')
        .eq('entity_id', entityId)
        .eq('status', 'pending');

      if (invitesError) throw invitesError;

      // Get user details for members - join with profiles to get full_name
      const memberUserIds = members?.map(m => m.user_id).filter(Boolean) || [];
      const { data: memberProfiles } = memberUserIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, full_name, app_role')
        .in('id', memberUserIds) : { data: [] };

      // Get user details for inviters
      const inviterIds = invites?.map(i => i.invited_by).filter(Boolean) || [];
      const { data: inviterProfiles } = inviterIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', inviterIds) : { data: [] };

      // Process members data to include profile information
      const processedMembers = members?.map((member: any) => {
        const profile = memberProfiles?.find(p => p.id === member.user_id);
        return {
          ...member,
          userName: profile?.full_name || 'Unknown User',
          userEmail: 'user@example.com', // Placeholder - would need auth.users access
          userRole: profile?.app_role
        };
      }) || [];

      // Process invites data to include profile information
      const processedInvites = invites?.map((invite: any) => {
        const inviterProfile = inviterProfiles?.find(p => p.id === invite.invited_by);
        return {
          ...invite,
          inviterName: inviterProfile?.full_name || 'Unknown User'
        };
      }) || [];

      // Check if current user is owner
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      const isOwner = processedMembers.some((member: EntityMember) => 
        member.user_id === currentUserId && member.role === 'owner'
      ) || false;

      set({
        currentEntity: entity,
        members: processedMembers,
        pendingInvites: processedInvites,
        isOwner,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading entity:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load entity',
        isLoading: false 
      });
    }
  },

  // Entity creation is handled by edge functions. No client-side create.

  inviteMember: async (email: string, role: EntityMemberRole, initialPermissions?: any) => {
    set({ isLoading: true, error: null });
    
    try {
      const { currentEntity } = get();
      if (!currentEntity) throw new Error('No active entity');

      // Use the create-invite edge function
      const { data, error } = await supabase.functions.invoke('create-invite', {
        body: {
          entity_id: currentEntity.id,
          invited_email: email,
          role,
          initial_permissions: initialPermissions || null
        }
      });

      if (error) throw error;
      if (!data?.invite) throw new Error('Failed to create invite');

      // Generate invite link using the token from the response
      const inviteLink = `${window.location.origin}/accept-invite?token=${data.invite.token}`;

      set({ isLoading: false });
      return inviteLink;
    } catch (error) {
      console.error('Error inviting member:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to invite member',
        isLoading: false 
      });
      throw error;
    }
  },

  cancelInvite: async (inviteId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      if (error) throw error;

      // Refresh members list
      await get().refreshMembers();
      set({ isLoading: false });
    } catch (error) {
      console.error('Error cancelling invite:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to cancel invite',
        isLoading: false 
      });
    }
  },

  removeMember: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { members, currentEntity } = get();
      const member = members.find(m => m.user_id === userId);
      
      if (!member || !currentEntity) throw new Error('Member or entity not found');

      // Check if this is the last owner
      const ownerCount = members.filter(m => m.role === 'owner').length;
      if (member.role === 'owner' && ownerCount <= 1) {
        throw new Error('Cannot remove the last owner');
      }

      // Remove member
      const { error: memberError } = await supabase
        .from('entity_members')
        .delete()
        .eq('entity_id', currentEntity.id)
        .eq('user_id', userId);

      if (memberError) throw memberError;

      // Remove all document permissions for this member across all projects
      const { error: permError } = await supabase
        .from('document_permissions')
        .delete()
        .eq('user_id', userId);

      if (permError) throw permError;

      // Refresh members list
      await get().refreshMembers();
      set({ isLoading: false });
    } catch (error) {
      console.error('Error removing member:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove member',
        isLoading: false 
      });
    }
  },

  removeAndReinviteMember: async (userId: string, newRole: EntityMemberRole, initialPermissions?: any) => {
    set({ isLoading: true, error: null });
    
    try {
      const { members, currentEntity } = get();
      const member = members.find(m => m.user_id === userId);
      
      if (!member || !currentEntity) throw new Error('Member or entity not found');

      // Check if this is the last owner
      const ownerCount = members.filter(m => m.role === 'owner').length;
      if (member.role === 'owner' && ownerCount <= 1) {
        throw new Error('Cannot remove the last owner');
      }

      // Get user email for re-invitation
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!userProfile) throw new Error('User profile not found');

      // Get user email from auth.users
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      if (!authUser.user?.email) throw new Error('User email not found');

      // Remove member
      const { error: memberError } = await supabase
        .from('entity_members')
        .delete()
        .eq('entity_id', currentEntity.id)
        .eq('user_id', userId);

      if (memberError) throw memberError;

      // Re-invite with new role
      const inviteLink = await get().inviteMember(authUser.user.email, newRole, initialPermissions);

      set({ isLoading: false });
      return inviteLink;
    } catch (error) {
      console.error('Error removing and re-inviting member:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove and re-invite member',
        isLoading: false 
      });
      throw error;
    }
  },

  acceptInvite: async (inviteToken: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Delegate to edge function (handles validation, membership, permissions)
      const { error } = await supabase.functions.invoke('accept-invite', {
        body: { token: inviteToken, accept: true },
      });
      if (error) throw error;

      set({ isLoading: false });
      
      // Reload entity memberships in auth store
      const { useAuthStore } = await import('./useAuthStore');
      const authStore = useAuthStore.getState();
      await authStore.loadEntityMemberships();
    } catch (error) {
      console.error('Error accepting invite:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to accept invite',
        isLoading: false 
      });
      throw error;
    }
  },

  validateInviteToken: async (inviteToken: string) => {
    try {
      const { data: invite, error } = await supabase
        .from('invites')
        .select(`
          *,
          entities(name)
        `)
        .eq('token', inviteToken)
        .eq('status', 'pending')
        .single();

      if (error || !invite) {
        return { valid: false };
      }

      // Check if invite is expired
      if (new Date(invite.expires_at) < new Date()) {
        return { valid: false };
      }

      return {
        valid: true,
        entityName: invite.entities?.name,
        inviterName: 'Team Owner' // Simplified for now
      };
    } catch (error) {
      console.error('Error validating invite token:', error);
      return { valid: false };
    }
  },

  refreshMembers: async () => {
    const { currentEntity } = get();
    if (currentEntity) {
      await get().loadEntity(currentEntity.id);
    }
  },

  clearError: () => set({ error: null }),
}));
