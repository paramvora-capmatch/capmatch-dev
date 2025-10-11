// src/stores/useEntityStore.ts
import { create } from 'zustand';
import { supabase } from '../../lib/supabaseClient';
import { 
  BorrowerEntity, 
  BorrowerEntityMember, 
  EntityMemberRole, 
  InviteStatus 
} from '../types/enhanced-types';

interface EntityState {
  currentEntity: BorrowerEntity | null;
  members: BorrowerEntityMember[];
  pendingInvites: BorrowerEntityMember[];
  isOwner: boolean;
  isLoading: boolean;
  error: string | null;
}

interface EntityActions {
  // Core entity management
  loadEntity: (entityId: string) => Promise<void>;
  createEntity: (name: string) => Promise<BorrowerEntity>;
  
  // Team member management
  inviteMember: (email: string, role: EntityMemberRole, projectPermissions?: string[]) => Promise<string>;
  cancelInvite: (inviteId: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  
  // Role management
  demoteOwnerToMember: (memberId: string, documentPermissions: string[]) => Promise<void>;
  promoteMemberToOwner: (memberId: string) => Promise<void>;
  
  // Invitation handling
  acceptInvite: (inviteToken: string, password?: string) => Promise<void>;
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
        .from('borrower_entities')
        .select('*')
        .eq('id', entityId)
        .single();

      if (entityError) throw entityError;

      // Load members
      const { data: members, error: membersError } = await supabase
        .from('borrower_entity_members')
        .select('*')
        .eq('entity_id', entityId)
        .eq('status', 'active');

      if (membersError) throw membersError;

      // Load pending invites
      const { data: invites, error: invitesError } = await supabase
        .from('borrower_entity_members')
        .select('*')
        .eq('entity_id', entityId)
        .eq('status', 'pending');

      if (invitesError) throw invitesError;

      // Get user details for members
      const memberUserIds = members?.map(m => m.user_id).filter(Boolean) || [];
      const { data: memberProfiles } = memberUserIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', memberUserIds) : { data: [] };

      // Get user details for inviters
      const inviterIds = invites?.map(i => i.invited_by).filter(Boolean) || [];
      const { data: inviterProfiles } = inviterIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', inviterIds) : { data: [] };

      // Process members data to flatten profile information
      const processedMembers = members?.map((member: any) => {
        const profile = memberProfiles?.find(p => p.id === member.user_id);
        return {
          ...member,
          userEmail: profile?.email || member.invited_email, // Fallback to invited_email
          userName: profile?.full_name
        };
      }) || [];

      // Process invites data to flatten profile information
      const processedInvites = invites?.map((invite: any) => {
        const profile = memberProfiles?.find(p => p.id === invite.user_id);
        const inviterProfile = inviterProfiles?.find(p => p.id === invite.invited_by);
        return {
          ...invite,
          userEmail: profile?.email || invite.invited_email, // Fallback to invited email if no profile
          userName: profile?.full_name,
          inviterEmail: inviterProfile?.email,
          inviterName: inviterProfile?.full_name
        };
      }) || [];

      // Check if current user is owner
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      const isOwner = processedMembers.some((member: any) => 
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

  createEntity: async (name: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      if (!currentUserId) throw new Error('User not authenticated');

      const { data: entity, error } = await supabase
        .from('borrower_entities')
        .insert({
          name,
          created_by: currentUserId
        })
        .select()
        .single();

      if (error) throw error;
      
      // Create entity storage bucket
      const { ensureEntityBucket, createBorrowerDocsFolder } = await import('../lib/entityStorage');
      await ensureEntityBucket(entity.id);
      await createBorrowerDocsFolder(entity.id);

      // Create owner membership
      const { error: memberError } = await supabase
        .from('borrower_entity_members')
        .insert({
          entity_id: entity.id,
          user_id: currentUserId,
          role: 'owner',
          status: 'active',
          accepted_at: new Date().toISOString()
        });

      if (memberError) throw memberError;

      set({ isLoading: false });
      return entity;
    } catch (error) {
      console.error('Error creating entity:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create entity',
        isLoading: false 
      });
      throw error;
    }
  },

  inviteMember: async (email: string, role: EntityMemberRole, projectPermissions: string[] = []) => {
    set({ isLoading: true, error: null });
    
    try {
      const { currentEntity } = get();
      if (!currentEntity) throw new Error('No active entity');

      const currentUserId = (await supabase.auth.getUser()).data.user?.id;
      if (!currentUserId) throw new Error('User not authenticated');

      // Generate invite token
      const inviteToken = crypto.randomUUID();
      const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      // For now, we'll set user_id to null and handle user creation when they accept the invite
      // This avoids RLS issues with checking existing users
      let userId = null;

      // Create member record
      const memberData = {
        entity_id: currentEntity.id,
        user_id: userId || null, // Will be set when user accepts
        role,
        invited_by: currentUserId,
        invite_token: inviteToken,
        invite_expires_at: inviteExpiresAt,
        status: 'pending',
        project_permissions: role === 'member' ? projectPermissions : [],
        invited_email: email // Store the email that was invited
      };
      
      const { data: member, error: memberError } = await supabase
        .from('borrower_entity_members')
        .insert(memberData)
        .select()
        .single();

      if (memberError) throw memberError;

      // Generate invite link
      const inviteLink = `${window.location.origin}/accept-invite?token=${inviteToken}`;

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
        .from('borrower_entity_members')
        .update({ status: 'removed' })
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

  removeMember: async (memberId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { members, currentEntity } = get();
      const member = members.find(m => m.id === memberId);
      
      if (!member || !currentEntity) throw new Error('Member or entity not found');

      // Check if this is the last owner
      const ownerCount = members.filter(m => m.role === 'owner' && m.status === 'active').length;
      if (member.role === 'owner' && ownerCount <= 1) {
        throw new Error('Cannot remove the last owner');
      }

      // Remove member
      const { error: memberError } = await supabase
        .from('borrower_entity_members')
        .update({ status: 'removed' })
        .eq('id', memberId);

      if (memberError) throw memberError;

      // Remove all document permissions for this member
      const { error: permError } = await supabase
        .from('document_permissions')
        .delete()
        .eq('entity_id', currentEntity.id)
        .eq('user_id', member.userId);

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

  demoteOwnerToMember: async (memberId: string, documentPermissions: string[]) => {
    set({ isLoading: true, error: null });
    
    try {
      const { members, currentEntity } = get();
      const member = members.find(m => m.id === memberId);
      
      if (!member || !currentEntity) throw new Error('Member or entity not found');

      // Check if this is the last owner
      const ownerCount = members.filter(m => m.role === 'owner' && m.status === 'active').length;
      if (ownerCount <= 1) {
        throw new Error('Cannot demote the last owner');
      }

      // Demote to member
      const { error: memberError } = await supabase
        .from('borrower_entity_members')
        .update({ role: 'member' })
        .eq('id', memberId);

      if (memberError) throw memberError;

      // Remove all existing permissions
      const { error: removePermError } = await supabase
        .from('document_permissions')
        .delete()
        .eq('entity_id', currentEntity.id)
        .eq('user_id', member.userId);

      if (removePermError) throw removePermError;

      // Grant new permissions
      if (documentPermissions.length > 0) {
        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
        if (!currentUserId) throw new Error('User not authenticated');

        const permissions = documentPermissions.map(projectId => ({
          entity_id: currentEntity.id,
          project_id: projectId,
          document_path: '*',
          user_id: member.userId,
          granted_by: currentUserId,
          permission_type: 'folder' as const
        }));

        const { error: permError } = await supabase
          .from('document_permissions')
          .insert(permissions);

        if (permError) throw permError;
      }

      // Refresh members list
      await get().refreshMembers();
      set({ isLoading: false });
    } catch (error) {
      console.error('Error demoting owner:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to demote owner',
        isLoading: false 
      });
    }
  },

  promoteMemberToOwner: async (memberId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Promote to owner
      const { error: memberError } = await supabase
        .from('borrower_entity_members')
        .update({ role: 'owner' })
        .eq('id', memberId);

      if (memberError) throw memberError;

      // Remove all document permissions (owners have implicit access)
      const { currentEntity } = get();
      if (currentEntity) {
        const { error: permError } = await supabase
          .from('document_permissions')
          .delete()
          .eq('entity_id', currentEntity.id)
          .eq('user_id', memberId);

        if (permError) throw permError;
      }

      // Refresh members list
      await get().refreshMembers();
      set({ isLoading: false });
    } catch (error) {
      console.error('Error promoting member:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to promote member',
        isLoading: false 
      });
    }
  },

  acceptInvite: async (inviteToken: string, password?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Validate invite token
      const { data: invite, error: inviteError } = await supabase
        .from('borrower_entity_members')
        .select('*, borrower_entities(name)')
        .eq('invite_token', inviteToken)
        .eq('status', 'pending')
        .single();

      if (inviteError || !invite) {
        throw new Error('Invalid or expired invite');
      }

      // Check if invite is expired
      if (new Date(invite.invite_expires_at) < new Date()) {
        throw new Error('Invite has expired');
      }

      let currentUserId = (await supabase.auth.getUser()).data.user?.id;
      
      // If no current user, create account
      if (!currentUserId && password) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: invite.invited_email,
          password: password,
          options: {
            data: { 
              role: 'borrower',
              loginSource: 'direct'
            }
          }
        });

        if (signUpError) throw signUpError;
        
        // Update currentUserId after successful signup
        currentUserId = signUpData.user?.id;
        if (!currentUserId) {
          throw new Error('User ID not found after signup');
        }

        // Wait a moment for the user to be fully created
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      // Update member record
      const { error: updateError } = await supabase
        .from('borrower_entity_members')
        .update({
          user_id: currentUserId,
          status: 'active',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invite.id);

      if (updateError) throw updateError;

      // Create document permissions for member role based on stored project permissions
      if (invite.role === 'member' && invite.project_permissions && invite.project_permissions.length > 0) {
        const permissions = invite.project_permissions.map((projectId: string) => ({
          entity_id: invite.entity_id,
          project_id: projectId,
          document_path: '*', // Grant access to all documents in project
          user_id: currentUserId,
          granted_by: invite.invited_by,
          permission_type: 'folder' as const
        }));

        const { error: permError } = await supabase
          .from('document_permissions')
          .insert(permissions);

        if (permError) throw permError;
      }

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
        .from('borrower_entity_members')
        .select(`
          *,
          borrower_entities(name)
        `)
        .eq('invite_token', inviteToken)
        .eq('status', 'pending')
        .single();

      if (error || !invite) {
        return { valid: false };
      }

      // Check if invite is expired
      if (new Date(invite.invite_expires_at) < new Date()) {
        return { valid: false };
      }

      return {
        valid: true,
        entityName: invite.borrower_entities?.name,
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
