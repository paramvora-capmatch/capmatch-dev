// src/hooks/useAppHydration.ts
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useBorrowerProfileStore } from "@/stores/useBorrowerProfileStore";
import { useProjectStore } from "@/stores/useProjectStore";

/**
 * This hook is the single source of truth for the application's initial hydration state.
 * It listens to the loading states of all major stores and returns a single
 * `isHydrated` boolean. This solves race conditions on initial load and refresh.
 */
export const useAppHydration = () => {
  // Get loading states from all relevant stores
  const isAuthLoading = useAuthStore((state) => state.isLoading);
  const isProfileLoading = useBorrowerProfileStore((state) => state.isLoading);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const user = useAuthStore((state) => state.user);

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    console.log("[useAppHydration] 🔍 State check:", {
      isAuthLoading,
      isProfileLoading,
      isProjectsLoading,
      userRole: user?.role,
      userEmail: user?.email,
      isHydrated,
    });

    // 1. If auth is still loading, we are definitely not hydrated.
    if (isAuthLoading) {
      console.log("[useAppHydration] ⏳ Waiting for auth to complete...");
      setIsHydrated(false);
      return;
    }

    // 2. Once auth is done, check the user's role.
    if (user?.role === "borrower") {
      // For borrowers, we are hydrated only when their specific data is also loaded.
      if (!isProfileLoading && !isProjectsLoading) {
        console.log("[useAppHydration] ✅ App is hydrated for BORROWER.");
        setIsHydrated(true);
      } else {
        console.log("[useAppHydration] ⏳ Borrower data still loading...", {
          profileLoading: isProfileLoading,
          projectsLoading: isProjectsLoading,
        });
        setIsHydrated(false);
      }
    } else {
      // For non-borrowers (advisors, admins) or logged-out guests,
      // hydration is complete as soon as auth is resolved.
      console.log(
        "[useAppHydration] ✅ App is hydrated for NON-BORROWER or GUEST."
      );
      setIsHydrated(true);
    }
  }, [isAuthLoading, isProfileLoading, isProjectsLoading, user, isHydrated]);

  return isHydrated;
};
