// Add email sending to the invite function
// This would go in src/stores/useEntityStore.ts

inviteMember: async (email: string, role: EntityMemberRole, projectPermissions: string[] = []) => {
  set({ isLoading: true, error: null });
  
  try {
    const { currentEntity } = get();
    if (!currentEntity) throw new Error('No active entity');

    const currentUserId = (await supabase.auth.getUser()).data.user?.id;
    if (!currentUserId) throw new Error('User not authenticated');

    // Generate invite token
    const inviteToken = crypto.randomUUID();
    const inviteExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    let userId = existingUser?.id;

    // Create member record
    const { data: member, error: memberError } = await supabase
      .from('borrower_entity_members')
      .insert({
        entity_id: currentEntity.id,
        user_id: userId || null,
        role,
        invited_by: currentUserId,
        invite_token: inviteToken,
        invite_expires_at: inviteExpiresAt,
        status: 'pending'
      })
      .select()
      .single();

    if (memberError) throw memberError;

    // Create document permissions if member
    if (role === 'member' && projectPermissions.length > 0) {
      const permissions = projectPermissions.map(projectId => ({
        entity_id: currentEntity.id,
        project_id: projectId,
        document_path: '*',
        user_id: userId || 'pending',
        granted_by: currentUserId,
        permission_type: 'folder' as const
      }));

      const { error: permError } = await supabase
        .from('document_permissions')
        .insert(permissions);

      if (permError) throw permError;
    }

    // Generate invite link
    const inviteLink = `${window.location.origin}/accept-invite?token=${inviteToken}`;

    // NEW: Send email notification
    try {
      await sendInviteEmail({
        to: email,
        entityName: currentEntity.name,
        inviterName: user?.name || 'Team Owner',
        inviteLink,
        role,
        expiresAt: inviteExpiresAt
      });
    } catch (emailError) {
      console.warn('Failed to send invite email:', emailError);
      // Don't fail the entire invite if email fails
    }

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
