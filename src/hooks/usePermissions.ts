// src/hooks/usePermissions.ts
import { useMemo } from 'react';
import { usePermissionStore } from '@/stores/usePermissionStore';
import { Permission } from '@/types/enhanced-types';

interface UsePermissionsReturn {
  permission: Permission | null;
  canView: boolean;
  canEdit: boolean;
  isLoading: boolean;
}

export const usePermissions = (resourceId: string | null | undefined): UsePermissionsReturn => {
  // Subscribe to the permissions object so we re-render when it changes
  const permissions = usePermissionStore((state) => state.permissions);
  const isLoading = usePermissionStore((state) => state.isLoading);

  const permission = useMemo(() => {
    if (!resourceId) return null;
    return permissions[resourceId] || null;
  }, [resourceId, permissions]); // Now depends on permissions object, not getPermission function

  const canView = permission === 'view' || permission === 'edit';
  const canEdit = permission === 'edit';

  return { permission, canView, canEdit, isLoading };
};
