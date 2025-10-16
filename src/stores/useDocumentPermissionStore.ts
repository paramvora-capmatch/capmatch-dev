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
      // Use the manage-document-access edge function
      const { data, error } = await supabase.functions.invoke('manage-document-access', {
        body: {
          action: 'grant',
          project_id: projectId,
          document_paths: [documentPath],
          target_user_id: userId
        }
      });

      if (error) throw error;

      // Update local state - create a mock permission object for local state
      const { permissions: currentPermissions } = get();
      const projectPermissions = currentPermissions.get(projectId) || [];
      const mockPermission = {
        id: `temp_${Date.now()}`,
        project_id: projectId,
        user_id: userId,
        document_path: documentPath,
        created_at: new Date().toISOString()
      };
      const newPermissions = new Map(currentPermissions);
      newPermissions.set(projectId, [...projectPermissions, mockPermission]);

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
      
      // First check if user is owner of the project's entity (grants automatic access)
      const { data: canAccess, error: ownerCheckError } = await supabase.rpc('can_user_access_document', {
        p_user_id: userId,
        p_project_id: projectId,
        p_document_path: documentPath
      });
      
      if (ownerCheckError) {
        console.error('Error checking owner access:', ownerCheckError);
        return false;
      }
      
      if (canAccess) {
        console.log('🔍 [checkDocumentPermission] Owner access granted');
        return true;
      }
      
      // If not owner, check explicit document permissions
      console.log('🔍 [checkDocumentPermission] Checking explicit permissions...');
      
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
      const query = `document_path.eq.${documentPath},document_path.like.${documentPath}%,document_path.eq.*`;
      
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
      // Use the manage-document-access edge function
      const { data, error } = await supabase.functions.invoke('manage-document-access', {
        body: {
          action: 'grant',
          project_id: projectId,
          document_paths: documentPaths,
          target_user_id: userId
        }
      });

      if (error) throw error;

      // Update local state - create mock permission objects for local state
      const { permissions: currentPermissions } = get();
      const projectPermissions = currentPermissions.get(projectId) || [];
      const mockPermissions = documentPaths.map((documentPath, index) => ({
        id: `temp_${Date.now()}_${index}`,
        project_id: projectId,
        user_id: userId,
        document_path: documentPath,
        created_at: new Date().toISOString()
      }));
      const newPermissionsMap = new Map(currentPermissions);
      newPermissionsMap.set(projectId, [...projectPermissions, ...mockPermissions]);

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
      // Get all document paths for this user in this project
      const { permissions: currentPermissions } = get();
      const projectPermissions = currentPermissions.get(projectId) || [];
      const userPermissions = projectPermissions.filter(p => p.user_id === userId);
      const documentPaths = userPermissions.map(p => p.document_path);

      if (documentPaths.length === 0) {
        set({ isLoading: false });
        return;
      }

      // Use the manage-document-access edge function
      const { data, error } = await supabase.functions.invoke('manage-document-access', {
        body: {
          action: 'revoke',
          project_id: projectId,
          document_paths: documentPaths,
          target_user_id: userId
        }
      });

      if (error) throw error;

      // Update local state
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
