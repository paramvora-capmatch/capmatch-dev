// src/app/project/workspace/[id]/page.tsx

"use client";

import React from "react";
import { useParams } from "next/navigation";
import MinimalSidebarLayout from "@/components/layout/MinimalSidebarLayout"; // Use the new layout
import { ProjectWorkspace } from "@/components/project/ProjectWorkspace"; // Import the workspace component
import { RoleBasedRoute } from "@/components/auth/RoleBasedRoute"; // Protect the route
import { useProjects } from "@/hooks/useProjects"; // Import useProjects to get project name

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params?.id as string; // Get project ID from URL

  // Attempt to get project name for the title, fallback if loading/not found
  const { getProject, isLoading } = useProjects();
  const project = projectId ? getProject(projectId) : null;
  const pageTitle = isLoading
    ? "Loading Project..."
    : project
    ? project.projectName
    : "Project Workspace";

  if (!projectId) {
    // Handle case where ID is missing, maybe redirect or show error
    return (
      <MinimalSidebarLayout title="Error">
        <p>Project ID is missing.</p>
      </MinimalSidebarLayout>
    );
  }

  return (
    <RoleBasedRoute roles={["borrower"]}>
      {" "}
      {/* Ensure only borrowers access */}
      <MinimalSidebarLayout title={pageTitle}>
        <ProjectWorkspace projectId={projectId} />
      </MinimalSidebarLayout>
    </RoleBasedRoute>
  );
}
