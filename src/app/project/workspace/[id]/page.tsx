// src/app/project/workspace/[id]/page.tsx

"use client";

import React, { useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ProjectWorkspace } from "@/components/project/ProjectWorkspace";
import { RoleBasedRoute } from "@/components/auth/RoleBasedRoute";
import { useProjects } from "@/hooks/useProjects";
import { useRouter } from "next/navigation";
import { useBorrowerViewSync } from "@/hooks/useBorrowerViewSync";
import { ProjectWorkspaceBreadcrumb } from "@/components/project/ProjectWorkspaceBreadcrumb";

export default function ProjectWorkspacePage() {
  const params = useParams();
  // Extract id immediately to avoid read-only property issues in Next.js 15
  const projectId = typeof params?.id === 'string' ? params.id : '';
  const router = useRouter();

  // Get the activeProject from the store. The workspace component handles loading it.
  const { activeProject } = useProjects();

  // Use custom hook for URL/state synchronization
  const {
    isBorrowerEditing,
    handleBorrowerEditingChange,
  } = useBorrowerViewSync();

  // Optimize handleBack callback - only depends on isBorrowerEditing and router
  const handleBack = useCallback(() => {
    if (isBorrowerEditing) {
      handleBorrowerEditingChange(false);
    } else {
      router.push("/dashboard");
    }
  }, [isBorrowerEditing, router, handleBorrowerEditingChange]);

  // Memoize breadcrumb component props
  // Show loading state only if activeProject doesn't match projectId
  // Don't rely on global isLoading which can be stuck if loadUserProjects() wasn't called
  const breadcrumb = useMemo(() => {
    const isProjectLoaded = activeProject?.id === projectId;
    const projectName = isProjectLoaded 
      ? (activeProject?.projectName || "Project")
      : "Loading Project...";
    
    return (
      <ProjectWorkspaceBreadcrumb
        projectName={projectName}
        isBorrowerEditing={isBorrowerEditing}
        onBack={handleBack}
        onBorrowerEditingChange={handleBorrowerEditingChange}
        dashboardPath="/dashboard"
      />
    );
  }, [activeProject?.id, activeProject?.projectName, projectId, isBorrowerEditing, handleBack, handleBorrowerEditingChange]);

  if (!projectId) {
    return (
      <DashboardLayout title="Error">
        <p>Project ID is missing.</p>
      </DashboardLayout>
    );
  }

  return (
    <RoleBasedRoute roles={["borrower"]}>
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
