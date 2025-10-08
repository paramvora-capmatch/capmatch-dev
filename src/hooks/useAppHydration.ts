// src/hooks/useAppHydration.ts
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBorrowerProfileStore } from '@/stores/useBorrowerProfileStore';
import { useProjectStore } from '@/stores/useProjectStore';

/**
 * This hook is the single source of truth for the application's initial hydration state.
 * It listens to the loading states of all major stores and returns a single
 * `isHydrated` boolean. This solves race conditions on initial load and refresh.
 */
export const useAppHydration = () => {
  const [isHydrated, setIsHydrated] = useState(false);

  // Get loading states from all relevant stores
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isProfileLoading = useBorrowerProfileStore((state) => state.isLoading);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);

  const user = useAuthStore((state) => state.user);

  // Determine the combined loading state
  const isLoading = isAuthLoading || (user?.role === 'borrower' && (isProfileLoading || isProjectsLoading));

  useEffect(() => {
    if (!isLoading) {
      setIsHydrated(true);
      console.log('[useAppHydration] ✅ App is hydrated. All stores loaded.');
    }
  }, [isLoading]);

  return isHydrated;
};