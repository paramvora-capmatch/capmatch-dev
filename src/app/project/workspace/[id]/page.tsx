// src/app/project/workspace/[id]/page.tsx

"use client";

import React, { useCallback, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { ProjectWorkspace } from "@/components/project/ProjectWorkspace";
import { RoleBasedRoute } from "@/components/auth/RoleBasedRoute";
import { useProjects } from "@/hooks/useProjects";
import { useRouter } from "next/navigation";
import { useBorrowerViewSync } from "@/hooks/useBorrowerViewSync";
import { ProjectWorkspaceBreadcrumb } from "@/components/project/ProjectWorkspaceBreadcrumb";
import { UnsavedChangesModal } from "@/components/ui/UnsavedChangesModal";

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

  // State for unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveFormFnRef = useRef<(() => Promise<void>) | null>(null);
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  // Handle dirty state changes from BorrowerResumeForm
  const handleBorrowerDirtyChange = useCallback((isDirty: boolean) => {
    console.log('[ProjectWorkspacePage] Dirty state changed:', isDirty);
    setHasUnsavedChanges(isDirty);
  }, []);

  // Register save function from BorrowerResumeForm
  const handleBorrowerRegisterSave = useCallback((saveFn: () => Promise<void>) => {
    console.log('[ProjectWorkspacePage] Save function registered');
    saveFormFnRef.current = saveFn;
  }, []);

  // Handle save and exit from modal
  const handleSaveAndExit = useCallback(async () => {
    if (!saveFormFnRef.current) {
      console.error('[ProjectWorkspacePage] No save function registered!');
      return;
    }

    console.log('[ProjectWorkspacePage] Starting save and exit...');
    setIsSaving(true);
    try {
      await saveFormFnRef.current();
      console.log('[ProjectWorkspacePage] Save completed successfully');
      setHasUnsavedChanges(false);
      setShowUnsavedModal(false);

      // Exit borrower editing mode after successful save
      if (isBorrowerEditing) {
        console.log('[ProjectWorkspacePage] Exiting borrower editing mode');
        handleBorrowerEditingChange(false);
      }

      // Execute pending navigation
      if (pendingNavigationRef.current) {
        console.log('[ProjectWorkspacePage] Executing pending navigation');
        pendingNavigationRef.current();
        pendingNavigationRef.current = null;
      }
    } catch (error) {
      console.error('[ProjectWorkspacePage] Failed to save form:', error);
    } finally {
      setIsSaving(false);
    }
  }, [isBorrowerEditing, handleBorrowerEditingChange]);

  // Handle exit without saving from modal
  const handleExitWithoutSaving = useCallback(() => {
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    // Execute pending navigation
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    }
  }, []);

  // Generic navigation handler with unsaved changes check
  const handleNavigate = useCallback((navigateAction: () => void) => {
    // Check if we're in borrower editing mode and have unsaved changes
    if (isBorrowerEditing && hasUnsavedChanges) {
      // Store the navigation action and show modal
      pendingNavigationRef.current = navigateAction;
      setShowUnsavedModal(true);
    } else {
      // No unsaved changes, navigate immediately
      navigateAction();
    }
  }, [isBorrowerEditing, hasUnsavedChanges]);

  // Handler for back button
  const handleBack = useCallback(() => {
    handleNavigate(() => {
      if (isBorrowerEditing) {
        handleBorrowerEditingChange(false);
      } else {
        router.push("/dashboard");
      }
    });
  }, [handleNavigate, isBorrowerEditing, handleBorrowerEditingChange, router]);

  // Handler for Dashboard navigation
  const handleNavigateToDashboard = useCallback(() => {
    handleNavigate(() => {
      router.push("/dashboard");
    });
  }, [handleNavigate, router]);

  // Handler for Project navigation (exit borrower editing)
  const handleNavigateToProject = useCallback(() => {
    handleNavigate(() => {
      handleBorrowerEditingChange(false);
    });
  }, [handleNavigate, handleBorrowerEditingChange]);

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
        onNavigateToDashboard={handleNavigateToDashboard}
        onNavigateToProject={handleNavigateToProject}
      />
    );
  }, [activeProject?.id, activeProject?.projectName, projectId, isBorrowerEditing, handleBack, handleNavigateToDashboard, handleNavigateToProject]);

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
          onBorrowerDirtyChange={handleBorrowerDirtyChange}
          onBorrowerRegisterSave={handleBorrowerRegisterSave}
        />
        <UnsavedChangesModal
          isOpen={showUnsavedModal}
          onClose={() => setShowUnsavedModal(false)}
          onSaveAndExit={handleSaveAndExit}
          onExitWithoutSaving={handleExitWithoutSaving}
          isSaving={isSaving}
        />
      </DashboardLayout>
    </RoleBasedRoute>
  );
}
