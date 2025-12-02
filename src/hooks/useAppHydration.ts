// src/hooks/useAppHydration.ts
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * This hook is the single source of truth for the application's initial hydration state.
 * It listens to the loading states of all major stores and returns a single
 * `isHydrated` boolean. This solves race conditions on initial load and refresh.
 */
export const useAppHydration = () => {
  // Single source of truth: we only gate on auth being resolved.
  const isAuthLoading = useAuthStore((state) => state.isLoading);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // While auth is resolving, keep the global splash visible.
    if (isAuthLoading) {
      setIsHydrated(false);
    } else {
      // Once auth is resolved (user or no user), let the rest of the app render.
      // Individual pages/components can show their own skeletons/spinners as needed.
      setIsHydrated(true);
    }
  }, [isAuthLoading]);

  return isHydrated;
};
