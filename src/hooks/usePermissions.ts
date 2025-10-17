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
  const getPermission = usePermissionStore((state) => state.getPermission);
  const isLoading = usePermissionStore((state) => state.isLoading);

  const permission = useMemo(() => {
    return getPermission(resourceId);
  }, [resourceId, getPermission]);

  const canView = permission === 'view' || permission === 'edit';
  const canEdit = permission === 'edit';

  return { permission, canView, canEdit, isLoading };
};
