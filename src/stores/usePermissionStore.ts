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
  loadPermissionsForProject: (projectId: string) => Promise<void>;
  getPermission: (resourceId: string | null | undefined) => Permission | null;
  resetPermissions: () => void;
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  permissions: {},
  isLoading: false,
  error: null,

  loadPermissionsForProject: async (projectId: string) => {
    console.log(`[PermissionStore] Loading permissions for project: ${projectId}`);
    set({ isLoading: true, error: null });

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

      set({ permissions: newPermissions, isLoading: false });
    } catch (e) {
      set({ error: e.message, isLoading: false, permissions: {} });
    }
  },
  
  getPermission: (resourceId: string | null | undefined): Permission | null => {
    if (!resourceId) return null;
    return get().permissions[resourceId] || null;
  },

  resetPermissions: () => {
    console.log('[PermissionStore] Resetting permissions state.');
    set({ permissions: {}, isLoading: false, error: null });
  },
}));
