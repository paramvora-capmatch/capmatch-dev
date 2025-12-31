// src/app/advisor/project/[id]/page.tsx

"use client";

import React, { useCallback, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ProjectWorkspace } from "@/components/project/ProjectWorkspace";
import { RoleBasedRoute } from "@/components/auth/RoleBasedRoute";
import { useProjects } from "@/hooks/useProjects";
import { useBorrowerViewSync } from "@/hooks/useBorrowerViewSync";
import { ProjectWorkspaceBreadcrumb } from "@/components/project/ProjectWorkspaceBreadcrumb";
import { ProjectProfile } from "@/types/enhanced-types";

// Constants
const ADVISOR_DASHBOARD_PATH = "/advisor/dashboard";
const ADVISOR_ROLE = "advisor" as const;
const DEFAULT_PROJECT_NAME = "Project";
const LOADING_PROJECT_NAME = "Loading Project...";

/**
 * Extracts project ID from route parameters with type safety
 */
function extractProjectId(params: ReturnType<typeof useParams>): string | null {
  const id = params?.id;
  if (typeof id === "string" && id.length > 0) {
    return id;
  }
  return null;
}

/**
 * Resolves the display name for a project based on loading state
 */
function resolveProjectName(
  activeProject: ProjectProfile | null | undefined,
  projectId: string | null
): string {
  if (!projectId) {
    return LOADING_PROJECT_NAME;
  }

  const isProjectLoaded = activeProject?.id === projectId;
  return isProjectLoaded
    ? activeProject?.projectName || DEFAULT_PROJECT_NAME
    : LOADING_PROJECT_NAME;
}

export default function AdvisorProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = extractProjectId(params);
  const { activeProject } = useProjects();
  const { isBorrowerEditing, handleBorrowerEditingChange } = useBorrowerViewSync();

  // Redirect to dashboard if project ID is missing
  useEffect(() => {
    if (!projectId) {
      router.replace(ADVISOR_DASHBOARD_PATH);
    }
  }, [projectId, router]);

  // Handle back navigation: exit borrower editing mode or navigate to dashboard
  const handleBack = useCallback(() => {
    if (isBorrowerEditing) {
      handleBorrowerEditingChange(false);
    } else {
      router.push(ADVISOR_DASHBOARD_PATH);
    }
  }, [isBorrowerEditing, router, handleBorrowerEditingChange]);

  // Handler for Dashboard navigation
  const handleNavigateToDashboard = useCallback(() => {
    router.push(ADVISOR_DASHBOARD_PATH);
  }, [router]);

  // Handler for Project navigation (exit borrower editing)
  const handleNavigateToProject = useCallback(() => {
    handleBorrowerEditingChange(false);
  }, [handleBorrowerEditingChange]);

  // Memoize project name to avoid unnecessary recalculations
  const projectName = useMemo(
    () => resolveProjectName(activeProject, projectId),
    [activeProject, projectId]
  );

  // Memoize breadcrumb component to prevent unnecessary re-renders
  const breadcrumb = useMemo(
    () => (
      <ProjectWorkspaceBreadcrumb
        projectName={projectName}
        isBorrowerEditing={isBorrowerEditing}
        onBack={handleBack}
        onNavigateToDashboard={handleNavigateToDashboard}
        onNavigateToProject={handleNavigateToProject}
      />
    ),
    [projectName, isBorrowerEditing, handleBack, handleNavigateToDashboard, handleNavigateToProject]
  );

  // Show error state if project ID is missing (will redirect via useEffect)
  if (!projectId) {
    return (
      <RoleBasedRoute roles={[ADVISOR_ROLE]}>
        <DashboardLayout title="Error">
          <p>Project ID is missing. Redirecting to dashboard...</p>
        </DashboardLayout>
      </RoleBasedRoute>
    );
  }

  return (
    <RoleBasedRoute roles={[ADVISOR_ROLE]}>
      <DashboardLayout
        breadcrumb={breadcrumb}
        mainClassName="flex-1 overflow-auto pl-6 pr-3 sm:pr-4 lg:pr-6 pt-2 pb-6"
        hideTeamButton={true}
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
