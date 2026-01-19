// src/stores/usePermissionStore.ts
import { create } from 'zustand';
import { supabase } from '../../lib/supabaseClient';
import { Permission } from '@/types/enhanced-types';

type ResourcePermission = {
  resource_id: string;
  permission: Permission;
};

interface PermissionState {
  permissions: Record<string, Permission>; // Maps resource_id to permission level
  isLoading: boolean;
  error: string | null;
  currentProjectId: string | null; // Track which project's permissions are loaded
  loadingProjectId: string | null; // Track which project is currently loading
  loadPermissionsForProject: (projectId: string) => Promise<void>;
  getPermission: (resourceId: string | null | undefined) => Permission | null;
  resetPermissions: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: {},
  isLoading: false,
  error: null,
  currentProjectId: null,
  loadingProjectId: null,

  loadPermissionsForProject: async (projectId: string, force: boolean = false) => {
    const state = get();
    
    // Skip if already loading for this project
    if (state.loadingProjectId === projectId) {
      console.log(`[PermissionStore] Already loading permissions for project: ${projectId}, skipping duplicate call`);
      return;
    }
    
    // Skip if permissions are already loaded for this project and not currently loading, unless forced
    if (!force && state.currentProjectId === projectId && !state.isLoading) {
      console.log(`[PermissionStore] Permissions already loaded for project: ${projectId}, skipping duplicate call`);
      return;
    }
    
    console.log(`[PermissionStore] Loading permissions for project: ${projectId} (force=${force})`);
    set({ isLoading: true, error: null, loadingProjectId: projectId });

    try {
      const { data, error } = await supabase.rpc('get_all_user_permissions_for_project', {
        p_project_id: projectId,
      });

      if (error) {
        console.error('[PermissionStore] Error fetching permissions:', error);
        throw new Error(error.message);
      }
      
      console.log(`[PermissionStore] Received ${data.length} permission records.`);

      // Transform the array into a more efficient Record for lookups
      const newPermissions = (data as ResourcePermission[]).reduce((acc, { resource_id, permission }) => {
        acc[resource_id] = permission;
        return acc;
      }, {} as Record<string, Permission>);

      set({ 
        permissions: newPermissions, 
        isLoading: false, 
        currentProjectId: projectId,
        loadingProjectId: null 
      });
    } catch (e) {
      set({ 
        error: e instanceof Error ? e.message : 'Unknown error occurred', 
        isLoading: false, 
        permissions: {},
        loadingProjectId: null
      });
    }
  },
  
  getPermission: (resourceId: string | null | undefined): Permission | null => {
    if (!resourceId) return null;
    return get().permissions[resourceId] || null;
  },

  resetPermissions: () => {
    console.log('[PermissionStore] Resetting permissions state.');
    set({ 
      permissions: {}, 
      isLoading: false, 
      error: null,
      currentProjectId: null,
      loadingProjectId: null
    });
  },
}));
