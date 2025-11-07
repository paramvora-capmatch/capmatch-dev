// src/hooks/useAppHydration.ts
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProjectStore } from "@/stores/useProjectStore";

/**
 * This hook is the single source of truth for the application's initial hydration state.
 * It listens to the loading states of all major stores and returns a single
 * `isHydrated` boolean. This solves race conditions on initial load and refresh.
 */
export const useAppHydration = () => {
  // Get loading states from all relevant stores
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // 1. If auth is still loading, we are definitely not hydrated.
    if (isAuthLoading) {
      setIsHydrated(false);
      return;
    }

    // 2. Once auth is done, check the user's role.
    if (user?.role === "borrower") {
      // For borrowers, hydration completes after core project data loads.
      if (!isProjectsLoading) {
        setIsHydrated(true);
      } else {
        setIsHydrated(false);
      }
    } else {
      // For non-borrowers (advisors, admins) or logged-out guests,
      // hydration is complete as soon as auth is resolved.
      setIsHydrated(true);
    }
  }, [isAuthLoading, isProjectsLoading, user, isHydrated]);

  return isHydrated;
};
