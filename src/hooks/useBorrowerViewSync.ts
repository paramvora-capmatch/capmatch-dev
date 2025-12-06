// src/hooks/useBorrowerViewSync.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";

/**
 * Custom hook to synchronize borrower editing state with URL query parameters.
 * Handles browser back/forward navigation and programmatic state changes.
 */
export function useBorrowerViewSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize state from URL on mount
  const [isBorrowerEditing, setIsBorrowerEditing] = useState(() => {
    return searchParams?.get("view") === "borrower";
  });
  
  const isUpdatingFromStateRef = useRef(false);
  const lastUrlViewRef = useRef<string | null>(searchParams?.get("view"));
  const isUserInitiatedChangeRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Sync URL query parameter with isBorrowerEditing state (for browser back/forward)
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    const currentView = searchParams?.get("view");
    
    // Only update state if URL actually changed (not from our own update)
    if (currentView !== lastUrlViewRef.current && !isUpdatingFromStateRef.current) {
      const shouldBeEditing = currentView === "borrower";
      setIsBorrowerEditing(shouldBeEditing);
      lastUrlViewRef.current = currentView;
      isUserInitiatedChangeRef.current = false; // This is a URL-initiated change
    }
  }, [searchParams]);

  // Update URL when isBorrowerEditing changes programmatically (user-initiated)
  useEffect(() => {
    // Skip on initial mount - don't manipulate URL on first load
    if (isInitialMountRef.current) {
      return;
    }

    const currentView = searchParams?.get("view");
    const shouldHaveView = isBorrowerEditing;
    const hasView = currentView === "borrower";
    
    // Only update URL if state and URL are out of sync AND it's a user-initiated change
    if (shouldHaveView !== hasView && isUserInitiatedChangeRef.current) {
      isUpdatingFromStateRef.current = true;
      const params = new URLSearchParams(searchParams?.toString() || "");
      
      if (shouldHaveView) {
        params.set("view", "borrower");
      } else {
        params.delete("view");
      }
      
      const newPath = params.toString() 
        ? `${pathname}?${params.toString()}` 
        : pathname;
      
      // Use push when entering borrower mode (to add history entry), replace when exiting
      if (shouldHaveView) {
        router.push(newPath);
      } else {
        router.replace(newPath);
      }
      lastUrlViewRef.current = shouldHaveView ? "borrower" : null;
      
      // Reset flags after URL update completes
      setTimeout(() => {
        isUpdatingFromStateRef.current = false;
        isUserInitiatedChangeRef.current = false;
      }, 100);
    }
  }, [isBorrowerEditing, pathname, router, searchParams]);

  // Wrapper for setIsBorrowerEditing that marks it as user-initiated
  const handleBorrowerEditingChange = useCallback((value: boolean) => {
    isUserInitiatedChangeRef.current = true;
    setIsBorrowerEditing(value);
  }, []);

  return {
    isBorrowerEditing,
    setIsBorrowerEditing,
    handleBorrowerEditingChange,
  };
}

