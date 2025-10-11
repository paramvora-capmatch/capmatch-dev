// src/lib/migrations/rbac-migration.ts
import { supabase } from '../../../lib/supabaseClient';
import { storageService } from '../storage';

interface MigrationResult {
  success: boolean;
  message: string;
  migratedUsers?: number;
  migratedProjects?: number;
}

/**
 * Migrates existing borrower users to the new entity-based RBAC system
 * This should be run once when the RBAC system is first deployed
 */
export async function migrateToRBAC(): Promise<MigrationResult> {
  try {
    console.log('[RBAC Migration] Starting migration to entity-based RBAC system...');

    // Check if migration has already been completed
    const migrationKey = 'rbac_migration_completed';
    const migrationCompleted = localStorage.getItem(migrationKey);
    
    if (migrationCompleted === 'true') {
      console.log('[RBAC Migration] Migration already completed, skipping...');
      return {
        success: true,
        message: 'Migration already completed',
        migratedUsers: 0,
        migratedProjects: 0
      };
    }

    let migratedUsers = 0;
    let migratedProjects = 0;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if user is a borrower
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'borrower') {
      console.log('[RBAC Migration] User is not a borrower, skipping migration');
      return {
        success: true,
        message: 'User is not a borrower, no migration needed',
        migratedUsers: 0,
        migratedProjects: 0
      };
    }

    // Check if user already has an entity (migration already done for this user)
    const { data: existingMembership } = await supabase
      .from('borrower_entity_members')
      .select('entity_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingMembership) {
      console.log('[RBAC Migration] User already has entity membership, skipping migration');
      return {
        success: true,
        message: 'User already migrated',
        migratedUsers: 0,
        migratedProjects: 0
      };
    }

    // Get user's borrower profile
    const { data: borrowerProfile, error: borrowerError } = await supabase
      .from('borrowers')
      .select('*')
      .eq('id', user.id)
      .single();

    if (borrowerError || !borrowerProfile) {
      console.log('[RBAC Migration] No borrower profile found, skipping migration');
      return {
        success: true,
        message: 'No borrower profile found, no migration needed',
        migratedUsers: 0,
        migratedProjects: 0
      };
    }

    // Create borrower entity
    const entityName = borrowerProfile.primary_entity_name || 
                      borrowerProfile.full_legal_name || 
                      `${user.email?.split('@')[0]}'s Entity`;

    const { data: entity, error: entityError } = await supabase
      .from('borrower_entities')
      .insert({
        name: entityName,
        created_by: user.id
      })
      .select()
      .single();

    if (entityError) throw entityError;

    console.log(`[RBAC Migration] Created entity: ${entity.name}`);

    // Create owner membership for the user
    const { error: memberError } = await supabase
      .from('borrower_entity_members')
      .insert({
        entity_id: entity.id,
        user_id: user.id,
        role: 'owner',
        status: 'active',
        accepted_at: new Date().toISOString()
      });

    if (memberError) throw memberError;

    console.log(`[RBAC Migration] Created owner membership for user: ${user.email}`);

    // Update borrower profile to link to entity
    const { error: updateProfileError } = await supabase
      .from('borrowers')
      .update({
        entity_id: entity.id,
        master_profile_id: null, // This is the master profile
        last_synced_at: new Date().toISOString(),
        custom_fields: []
      })
      .eq('id', borrowerProfile.id);

    if (updateProfileError) throw updateProfileError;

    console.log(`[RBAC Migration] Updated borrower profile to link to entity`);

    // Update user's profile to set active entity
    const { error: updateUserProfileError } = await supabase
      .from('profiles')
      .update({
        active_entity_id: entity.id
      })
      .eq('id', user.id);

    if (updateUserProfileError) throw updateUserProfileError;

      // Get user's projects and update them to link to entity
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', borrowerProfile.id);

    if (projectsError) throw projectsError;

    if (projects && projects.length > 0) {
      const { error: updateProjectsError } = await supabase
        .from('projects')
        .update({
          entity_id: entity.id
        })
        .eq('owner_id', borrowerProfile.id);

      if (updateProjectsError) throw updateProjectsError;

      migratedProjects = projects.length;
      console.log(`[RBAC Migration] Updated ${projects.length} projects to link to entity`);
    }

    migratedUsers = 1;

    // Mark migration as completed
    localStorage.setItem(migrationKey, 'true');

    console.log('[RBAC Migration] Migration completed successfully');

    return {
      success: true,
      message: `Successfully migrated user and ${migratedProjects} projects to entity-based system`,
      migratedUsers,
      migratedProjects
    };

  } catch (error) {
    console.error('[RBAC Migration] Migration failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown migration error',
      migratedUsers: 0,
      migratedProjects: 0
    };
  }
}

/**
 * Migrates demo users from localStorage to the new RBAC system
 * This is used for demo mode to maintain functionality
 */
export async function migrateDemoUsersToRBAC(): Promise<MigrationResult> {
  try {
    console.log('[RBAC Migration] Starting demo user migration...');

    // Get demo borrower profiles from localStorage
    const demoProfiles = await storageService.getItem<any[]>('borrowerProfiles') || [];
    const demoProjects = await storageService.getItem<any[]>('projects') || [];

    let migratedUsers = 0;
    let migratedProjects = 0;

    for (const profile of demoProfiles) {
      // Create demo entity
      const entityName = profile.primaryEntityName || 
                        profile.fullLegalName || 
                        `${profile.userId.split('@')[0]}'s Entity`;

      // Store demo entity in localStorage
      const demoEntities = await storageService.getItem<any[]>('borrowerEntities') || [];
      const entityId = `demo-entity-${profile.userId}`;
      
      const entity = {
        id: entityId,
        name: entityName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: profile.userId,
        isDemo: true
      };

      demoEntities.push(entity);
      await storageService.setItem('borrowerEntities', demoEntities);

      // Create demo owner membership
      const demoMemberships = await storageService.getItem<any[]>('borrowerEntityMembers') || [];
      const membership = {
        id: `demo-membership-${profile.userId}`,
        entityId: entityId,
        userId: profile.userId,
        role: 'owner',
        invitedBy: profile.userId,
        invitedAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
        status: 'active',
        isDemo: true
      };

      demoMemberships.push(membership);
      await storageService.setItem('borrowerEntityMembers', demoMemberships);

      // Update profile to link to entity
      const updatedProfile = {
        ...profile,
        entityId: entityId,
        masterProfileId: null,
        lastSyncedAt: new Date().toISOString(),
        customFields: []
      };

      const updatedProfiles = demoProfiles.map(p => 
        p.userId === profile.userId ? updatedProfile : p
      );
      await storageService.setItem('borrowerProfiles', updatedProfiles);

      // Update projects to link to entity
      const userProjects = demoProjects.filter(p => p.borrowerProfileId === profile.id);
      const updatedProjects = demoProjects.map(p => 
        userProjects.includes(p) ? { ...p, entityId: entityId } : p
      );
      await storageService.setItem('projects', updatedProjects);

      migratedUsers++;
      migratedProjects += userProjects.length;

      console.log(`[RBAC Migration] Migrated demo user: ${profile.userId}`);
    }

    console.log('[RBAC Migration] Demo user migration completed successfully');

    return {
      success: true,
      message: `Successfully migrated ${migratedUsers} demo users and ${migratedProjects} projects`,
      migratedUsers,
      migratedProjects
    };

  } catch (error) {
    console.error('[RBAC Migration] Demo migration failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown demo migration error',
      migratedUsers: 0,
      migratedProjects: 0
    };
  }
}

/**
 * Checks if migration is needed and runs it automatically
 * This should be called on app initialization
 */
export async function checkAndRunMigration(): Promise<void> {
  try {
    // Check if we're in demo mode
    const isDemo = localStorage.getItem('isDemo') === 'true';
    
    if (isDemo) {
      // Run demo migration
      const result = await migrateDemoUsersToRBAC();
      if (result.success) {
        console.log('[RBAC Migration] Demo migration completed:', result.message);
      } else {
        console.error('[RBAC Migration] Demo migration failed:', result.message);
      }
    } else {
      // Only run production migration for existing users who need it
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('[RBAC Migration] No user found, skipping migration');
        return;
      }
      
      // Check if user already has an entity (migration already done)
      const { data: profile } = await supabase
        .from('profiles')
        .select('active_entity_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.active_entity_id) {
        console.log('[RBAC Migration] User already has entity, skipping migration');
        return;
      }
      
      // Check if user has a borrower profile (existing user)
      const { data: borrowerProfile } = await supabase
        .from('borrowers')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (!borrowerProfile) {
        console.log('[RBAC Migration] No borrower profile found, user is new - skipping migration');
        return;
      }
      
      // Run migration for existing borrower
      const result = await migrateToRBAC();
      if (result.success) {
        console.log('[RBAC Migration] Production migration completed:', result.message);
      } else {
        console.error('[RBAC Migration] Production migration failed:', result.message);
      }
    }
  } catch (error) {
    console.error('[RBAC Migration] Migration check failed:', error);
  }
}
