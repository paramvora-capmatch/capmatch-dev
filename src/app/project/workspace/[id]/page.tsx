// src/app/project/workspace/[id]/page.tsx

"use client";

import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, usePathname } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout"; // Use the consolidated layout
import { ProjectWorkspace } from "@/components/project/ProjectWorkspace"; // Import the workspace component
import { RoleBasedRoute } from "@/components/auth/RoleBasedRoute"; // Protect the route
import { useProjects } from "@/hooks/useProjects"; // Import useProjects to get project name
import { useRouter } from "next/navigation"; // Import useRouter for breadcrumb navigation
import { ArrowLeft } from "lucide-react";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params?.id as string; // Get project ID from URL
  const router = useRouter(); // Initialize useRouter
  const searchParams = useSearchParams();
  const pathname = usePathname();
  // Initialize state from URL on mount
  const [isBorrowerEditing, setIsBorrowerEditing] = useState(() => {
    return searchParams?.get("view") === "borrower";
  });
  const isUpdatingFromStateRef = useRef(false);
  const lastUrlViewRef = useRef<string | null>(searchParams?.get("view"));
  const isUserInitiatedChangeRef = useRef(false);
  const isInitialMountRef = useRef(true);

  // Get the activeProject from the store. The workspace component handles loading it.
  const { activeProject, isLoading } = useProjects();

  // Determine the page title. Show loading state until the active project is loaded and matches the ID.
  const pageTitle =
    isLoading || !activeProject || activeProject.id !== projectId
      ? "Loading Project..."
      : activeProject.projectName;

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

  const handleBack = useCallback(() => {
    if (isBorrowerEditing) {
      isUserInitiatedChangeRef.current = true;
      setIsBorrowerEditing(false);
    } else {
      router.push("/dashboard");
    }
  }, [isBorrowerEditing, router]);

  // Wrapper for setIsBorrowerEditing that marks it as user-initiated
  const handleBorrowerEditingChange = useCallback((value: boolean) => {
    isUserInitiatedChangeRef.current = true;
    setIsBorrowerEditing(value);
  }, []);

  const breadcrumb = useMemo(() => {
    const projectName = activeProject?.projectName || "Project";

    return (
      <nav className="flex items-center space-x-2 text-base mb-2">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-300 rounded-md mr-2 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-gray-500 hover:text-gray-700 font-medium"
        >
          Dashboard
        </button>
        <span className="text-gray-400">/</span>
        {isBorrowerEditing ? (
          <>
            <button
              onClick={() => handleBorrowerEditingChange(false)}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              {projectName}
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-800 font-semibold">Borrower Details</span>
          </>
        ) : (
          <span className="text-gray-800 font-semibold">{projectName}</span>
        )}
      </nav>
    );
  }, [activeProject?.projectName, handleBack, isBorrowerEditing, router, handleBorrowerEditingChange]);

  if (!projectId) {
    // Handle case where ID is missing, maybe redirect or show error
    return (
      <DashboardLayout title="Error">
        <p>Project ID is missing.</p>
      </DashboardLayout>
    );
  }

  return (
    <RoleBasedRoute roles={["borrower"]}>
      {/* Ensure only borrowers access */}
      <DashboardLayout
        breadcrumb={breadcrumb}
        mainClassName="flex-1 overflow-auto pl-6 pr-3 sm:pr-4 lg:pr-6 pt-2 pb-6"
      >
        <ProjectWorkspace
          projectId={projectId}
          isBorrowerEditing={isBorrowerEditing}
          onBorrowerEditingChange={handleBorrowerEditingChange}
        />
      </DashboardLayout>
    </RoleBasedRoute>
  );
}
