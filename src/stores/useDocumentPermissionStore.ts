// src/stores/useDocumentPermissionStore.ts
import { create } from 'zustand';
import { supabase } from '../../lib/supabaseClient';
import { DocumentPermission } from '../types/enhanced-types';

interface DocumentPermissionState {
  permissions: Map<string, DocumentPermission[]>; // keyed by projectId
  isLoading: boolean;
  error: string | null;
}

interface DocumentPermissionActions {
  // Permission management
  loadPermissions: (projectId: string) => Promise<void>;
  grantPermission: (projectId: string, userId: string, documentPath: string) => Promise<void>;
  revokePermission: (permissionId: string) => Promise<void>;
  
  // Access control
  checkAccess: (projectId: string, documentPath: string, userId: string) => boolean;
  checkDocumentPermission: (projectId: string, documentPath: string, userId: string) => Promise<boolean>;
  getMemberPermissions: (projectId: string, userId: string) => DocumentPermission[];
  bulkGrantPermissions: (projectId: string, userId: string, documentPaths: string[]) => Promise<void>;
  bulkRevokePermissions: (projectId: string, userId: string) => Promise<void>;
  
  // Utility methods
  clearError: () => void;
  clearPermissions: () => void;
}

export const useDocumentPermissionStore = create<DocumentPermissionState & DocumentPermissionActions>((set, get) => ({
  // State
  permissions: new Map(),
  isLoading: false,
  error: null,

  // Actions
  loadPermissions: async (projectId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data: permissions, error } = await supabase
        .from('document_permissions')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;

      const { permissions: currentPermissions } = get();
      const newPermissions = new Map(currentPermissions);
      newPermissions.set(projectId, permissions || []);

      set({ 
        permissions: newPermissions,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error loading permissions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load permissions',
        isLoading: false 
      });
    }
  },

  grantPermission: async (projectId: string, userId: string, documentPath: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data: permission, error } = await supabase
        .from('document_permissions')
        .insert({
          project_id: projectId,
          document_path: documentPath,
          user_id: userId
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const { permissions: currentPermissions } = get();
      const projectPermissions = currentPermissions.get(projectId) || [];
      const newPermissions = new Map(currentPermissions);
      newPermissions.set(projectId, [...projectPermissions, permission]);

      set({ 
        permissions: newPermissions,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error granting permission:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to grant permission',
        isLoading: false 
      });
    }
  },

  revokePermission: async (permissionId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('document_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;

      // Update local state
      const { permissions: currentPermissions } = get();
      const newPermissions = new Map();
      
      for (const [projectId, projectPermissions] of currentPermissions) {
        const filteredPermissions = projectPermissions.filter(p => p.id !== permissionId);
        if (filteredPermissions.length > 0) {
          newPermissions.set(projectId, filteredPermissions);
        }
      }

      set({ 
        permissions: newPermissions,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error revoking permission:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to revoke permission',
        isLoading: false 
      });
    }
  },

  checkAccess: (projectId: string, documentPath: string, userId: string) => {
    const { permissions } = get();
    const projectPermissions = permissions.get(projectId) || [];
    
    // Check for exact path match
    const exactMatch = projectPermissions.find(p => 
      p.user_id === userId && p.document_path === documentPath
    );
    
    if (exactMatch) return true;

    // Check for folder access (if documentPath starts with a folder path)
    const folderMatch = projectPermissions.find(p => 
      p.user_id === userId && 
      documentPath.startsWith(p.document_path)
    );
    
    if (folderMatch) return true;

    // Check for wildcard access
    const wildcardMatch = projectPermissions.find(p => 
      p.user_id === userId && p.document_path === '*'
    );
    
    return !!wildcardMatch;
  },

  checkDocumentPermission: async (projectId: string, documentPath: string, userId: string) => {
    try {
      console.log('🔍 [checkDocumentPermission] Input:', { projectId, documentPath, userId });
      
      // First check if we have the permissions loaded locally
      const { permissions } = get();
      const projectPermissions = permissions.get(projectId) || [];
      
      console.log('🔍 [checkDocumentPermission] Local permissions:', { projectPermissionsLength: projectPermissions.length });
      
      // If we have permissions loaded, use the local check
      if (projectPermissions.length > 0) {
        const hasAccess = get().checkAccess(projectId, documentPath, userId);
        console.log('🔍 [checkDocumentPermission] Local check result:', hasAccess);
        return hasAccess;
      }
      
      // Otherwise, query the database directly
      const query = `document_path.eq.${documentPath},document_path.like.${documentPath}%`;
      
      console.log('🔍 [checkDocumentPermission] Database query:', { 
        projectId, 
        userId, 
        documentPath, 
        query 
      });
      
      const { data: permission, error } = await supabase
        .from('document_permissions')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .or(query)
        .limit(1);

      console.log('🔍 [checkDocumentPermission] Database result:', { permission, error });

      if (error) {
        console.error('Error checking document permission:', error);
        return false;
      }

      const hasPermission = permission && permission.length > 0;
      console.log('🔍 [checkDocumentPermission] Final result:', hasPermission);
      return hasPermission;
    } catch (error) {
      console.error('Error checking document permission:', error);
      return false;
    }
  },

  getMemberPermissions: (projectId: string, userId: string) => {
    const { permissions } = get();
    const projectPermissions = permissions.get(projectId) || [];
    return projectPermissions.filter(p => p.user_id === userId);
  },

  bulkGrantPermissions: async (projectId: string, userId: string, documentPaths: string[]) => {
    set({ isLoading: true, error: null });
    
    try {
      // Prepare permissions for new schema
      const permissions = documentPaths.map(documentPath => ({
        project_id: projectId,
        document_path: documentPath,
        user_id: userId
      }));

      const { data: newPermissions, error } = await supabase
        .from('document_permissions')
        .insert(permissions)
        .select();

      if (error) throw error;

      // Update local state
      const { permissions: currentPermissions } = get();
      const projectPermissions = currentPermissions.get(projectId) || [];
      const newPermissionsMap = new Map(currentPermissions);
      newPermissionsMap.set(projectId, [...projectPermissions, ...(newPermissions || [])]);

      set({ 
        permissions: newPermissionsMap,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error bulk granting permissions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to grant permissions',
        isLoading: false 
      });
    }
  },

  bulkRevokePermissions: async (projectId: string, userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('document_permissions')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      const { permissions: currentPermissions } = get();
      const projectPermissions = currentPermissions.get(projectId) || [];
      const filteredPermissions = projectPermissions.filter(p => p.user_id !== userId);
      
      const newPermissions = new Map(currentPermissions);
      newPermissions.set(projectId, filteredPermissions);

      set({ 
        permissions: newPermissions,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error bulk revoking permissions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to revoke permissions',
        isLoading: false 
      });
    }
  },

  clearError: () => set({ error: null }),
  
  clearPermissions: () => set({ permissions: new Map() }),
}));
