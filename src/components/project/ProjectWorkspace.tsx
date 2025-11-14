"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";

import { ProjectResumeView } from "./ProjectResumeView"; // New component for viewing
import { ProjectSummaryCard } from "./ProjectSummaryCard"; // Borrower progress
import { ProjectCompletionCard } from "./ProjectCompletionCard"; // Project progress moved below docs
import { EnhancedProjectForm } from "../forms/EnhancedProjectForm";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { useOrgStore } from "@/stores/useOrgStore";
import { ProjectProfile } from "@/types/enhanced-types";
import { Button } from "../ui/Button"; // Import Button
import { useAuthStore } from "@/stores/useAuthStore";
import { AskAIProvider } from "../ui/AskAIProvider";
import { StickyChatCard } from "@/components/chat/StickyChatCard";
import { DocumentManager } from "../documents/DocumentManager";
import { BorrowerResumeForm } from "../forms/BorrowerResumeForm";
import { BorrowerResumeView } from "../forms/BorrowerResumeView";
import { useAskAI } from "@/hooks/useAskAI";
import { useProjectBorrowerResume } from "@/hooks/useProjectBorrowerResume";
import { Modal } from "../ui/Modal";
import { Select } from "../ui/Select";
import { supabase } from "../../../lib/supabaseClient";
import { BorrowerResumeContent } from "@/lib/project-queries";
import { computeBorrowerCompletion } from "@/utils/resumeCompletion";

import { DocumentPreviewModal } from "../documents/DocumentPreviewModal";

const clampPercentage = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(100, Math.round(parsed)));
    }
  }
  return 0;
};
interface ProjectWorkspaceProps {
  projectId: string;
  isBorrowerEditing?: boolean;
  onBorrowerEditingChange?: (value: boolean) => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  projectId,
  isBorrowerEditing,
  onBorrowerEditingChange,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    projects,
    activeProject,
    setActiveProject,
    isLoading: projectsLoading,
    getProject,
    loadUserProjects,
  } = useProjects();
  const templateOptions = useMemo(
    () =>
      projects
        .filter(
          (proj) =>
            proj.id !== projectId &&
            proj.owner_org_id === activeProject?.owner_org_id
        )
        .map((proj) => ({
          value: proj.id,
          label: proj.projectName || "Untitled Project",
        })),
    [projects, projectId, activeProject?.owner_org_id]
  );
  const searchParams = useSearchParams();
  const { loadOrg, isOwner } = useOrgStore();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);

  const [isEditing, setIsEditing] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [chatTab, setChatTab] = useState<"team" | "ai">("team");
  const [shouldExpandChat, setShouldExpandChat] = useState(false);
  const [internalBorrowerEditing, setInternalBorrowerEditing] = useState(false);
  const borrowerEditing = isBorrowerEditing ?? internalBorrowerEditing;
  const setBorrowerEditing = useCallback(
    (value: boolean) => {
      onBorrowerEditingChange?.(value);
      if (isBorrowerEditing === undefined) {
        setInternalBorrowerEditing(value);
      }
    },
    [isBorrowerEditing, onBorrowerEditingChange]
  );
  const [borrowerProgress, setBorrowerProgress] = useState(0);
  const [borrowerResumeSnapshot, setBorrowerResumeSnapshot] = useState<
    Partial<BorrowerResumeContent> | null
  >(null);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copySourceProjectId, setCopySourceProjectId] = useState<string>("");
  const [isCopyingBorrower, setIsCopyingBorrower] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [borrowerDocsRefreshKey, setBorrowerDocsRefreshKey] = useState(0);

  const [previewingResourceId, setPreviewingResourceId] = useState<
    string | null
  >(null);
  const [highlightedResourceId, setHighlightedResourceId] = useState<
    string | null
  >(null);

  const [currentFormData, setCurrentFormData] = useState<ProjectProfile | null>(
    null
  );

  // Right column chat is handled by StickyChatCard
  // Centralize AskAI logic here; StickyChatCard is presentation-only
  // Separate hooks for project and borrower contexts to ensure correct API endpoints and isolated chat history
  const projectAskAi = useAskAI({
    formData: (currentFormData as unknown as Record<string, unknown>) || {},
    apiPath: '/api/project-qa',
    contextType: 'project',
  });

  const borrowerAskAi = useAskAI({
    formData: (borrowerResumeSnapshot as unknown as Record<string, unknown>) || {},
    apiPath: '/api/borrower-qa',
    contextType: 'borrower',
  });

  // Use the appropriate hook based on which form is being edited
  const activeAskAi = borrowerEditing ? borrowerAskAi : projectAskAi;

  const {
    content: borrowerResumeData,
    isLoading: borrowerResumeLoading,
    reload: reloadBorrowerResume,
    setLocalContent: setBorrowerResumeLocalContent,
  } = useProjectBorrowerResume(projectId);

  // Calculate if we're still in initial loading phase
  const isInitialLoading =
    authLoading ||
    projectsLoading;

  useEffect(() => {
    if (borrowerResumeData) {
      const percent = computeBorrowerCompletion(borrowerResumeData);
      setBorrowerProgress(percent);
      setBorrowerResumeSnapshot(borrowerResumeData || null);
    } else {
      setBorrowerProgress(
        clampPercentage(activeProject?.borrowerProgress ?? 0)
      );
      setBorrowerResumeSnapshot(null);
    }
  }, [borrowerResumeData, activeProject?.borrowerProgress]);

  useEffect(() => {
    const step = searchParams?.get("step");
    if (!step) return;

    if (step === "borrower") {
      setBorrowerEditing(true);
      setIsEditing(false);
    } else if (step === "project") {
      setIsEditing(true);
      setBorrowerEditing(false);
    } else if (step === "documents") {
      setIsEditing(false);
      setBorrowerEditing(false);
      const documentsSection = document.getElementById("project-documents-section");
      if (documentsSection) {
        documentsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("step");
    const nextPath = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(nextPath);
  }, [pathname, router, searchParams, setBorrowerEditing]);

  // Load org data when we have a project
  useEffect(() => {
    const loadOrgData = async () => {
      if (!activeProject?.owner_org_id) return;

      const { currentOrg } = useOrgStore.getState();
      // Only load if we haven't loaded this org yet
      if (currentOrg?.id !== activeProject.owner_org_id) {
        console.log(
          `[ProjectWorkspace] Loading org data for: ${activeProject.owner_org_id}`
        );
        await loadOrg(activeProject.owner_org_id);
      }
    };
    loadOrgData();
  }, [activeProject?.owner_org_id, loadOrg]);

  // useEffect for loading and setting active project
  useEffect(() => {
    const loadProjectData = async () => {
      if (!projectId) return;

      // Don't proceed if still in initial loading phase
      if (isInitialLoading) {
        return;
      }

      // Only check for project existence after initial loading is complete
      if (!activeProject || activeProject.id !== projectId) {
        const projectData = getProject(projectId);
        if (projectData) {
          setActiveProject(projectData);

          // Load org data for permission checks
          if (projectData.owner_org_id) {
            await loadOrg(projectData.owner_org_id);
          }
        } else {
          // Only show error if we're confident the project doesn't exist
          console.error(`Project ${projectId} not found.`);
          router.push("/dashboard");
        }
      }
    };

    loadProjectData();
  }, [
    projectId,
    activeProject,
    setActiveProject,
    getProject,
    isInitialLoading,
    router,
    loadOrg,
  ]);

  // Loading state render - show loading during initial loading or if project doesn't match
  if (isInitialLoading || !activeProject || activeProject.id !== projectId) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  const projectResumeProgress = clampPercentage(
    activeProject?.completenessPercent ?? 0
  );
  const borrowerResumeProgress = borrowerResumeData
    ? borrowerProgress
    : clampPercentage(
        activeProject?.borrowerProgress ?? borrowerProgress ?? 0
      );
  const isProjectComplete = projectResumeProgress === 100;

  const projectForProgress = activeProject
    ? {
        ...activeProject,
        completenessPercent: projectResumeProgress,
        borrowerProgress: borrowerResumeProgress,
      }
    : null;

  const handleMentionClick = (resourceId: string) => {
    setPreviewingResourceId(resourceId); // Open the preview modal
    setPreviewingResourceId(resourceId);
    setHighlightedResourceId(resourceId);
    // Clear the highlight after a short delay
    setTimeout(() => {
      setHighlightedResourceId(null);
    }, 3000);
  };

  const handleCopyBorrowerProfile = async () => {
    if (!copySourceProjectId) {
      setCopyError("Select a project to copy from");
      return;
    }

    setIsCopyingBorrower(true);
    setCopyError(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "copy-borrower-profile",
        {
          body: {
            source_project_id: copySourceProjectId,
            target_project_id: projectId,
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Failed to copy borrower profile");
      }

      const copiedResume = (data?.borrowerResumeContent ??
        {}) as BorrowerResumeContent;
      const nextProgress = computeBorrowerCompletion(copiedResume);

      setBorrowerProgress(nextProgress);
      setBorrowerResumeSnapshot(copiedResume || null);
      setBorrowerResumeLocalContent(copiedResume || null);

      if (activeProject) {
        const updatedProject = {
          ...activeProject,
          borrowerProgress: nextProgress,
          borrowerSections: copiedResume,
        };
        void setActiveProject(updatedProject);
      }

      await reloadBorrowerResume();
      void loadUserProjects();
      setBorrowerDocsRefreshKey((prev) => prev + 1);
      setCopyModalOpen(false);
      setCopySourceProjectId("");
      setBorrowerEditing(false);
    } catch (err) {
      setCopyError(
        err instanceof Error
          ? err.message
          : "Failed to copy borrower resume"
      );
    } finally {
      setIsCopyingBorrower(false);
    }
  };

  const renderBorrowerDocumentsSection = () => (
    <div className="overflow-visible">
      <DocumentManager
        key={`borrower-docs-${borrowerDocsRefreshKey}`}
        projectId={projectId}
        resourceId="BORROWER_ROOT"
        title="Borrower Documents"
        orgId={activeProject?.owner_org_id ?? null}
        canUpload={true}
        canDelete={true}
        context="borrower"
      />
    </div>
  );

  const renderBorrowerResumeSection = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-full">
        <BorrowerResumeForm
          projectId={projectId}
          progressPercent={borrowerProgress}
          onProgressChange={(percent) => setBorrowerProgress(percent)}
          onFormDataChange={(data) => setBorrowerResumeSnapshot(data)}
          onComplete={(profile) => {
            setBorrowerResumeSnapshot(profile || null);
            void reloadBorrowerResume();
            setBorrowerEditing(false);
            // Refresh project store to update progress in dashboard and project cards
            void loadUserProjects();
          }}
          onAskAI={(fieldId) => {
            setActiveFieldId(fieldId);
            void borrowerAskAi.activateField(fieldId, { autoSend: true });
            setChatTab("ai");
            setShouldExpandChat(true);
            setTimeout(() => setShouldExpandChat(false), 100);
          }}
          onCopyBorrowerResume={() => {
            setCopyError(null);
            setCopyModalOpen(true);
          }}
          copyDisabled={templateOptions.length === 0 || isCopyingBorrower}
          copyLoading={isCopyingBorrower}
        />
    </div>
  );

  return (
    <div className="relative min-h-screen w-full flex flex-row animate-fadeIn">
      <AskAIProvider
        onFieldAskAI={(fieldId: string) => {
          setActiveFieldId(fieldId); // This will be passed to the chat widget
        }}
      >
        {/* Global page background (grid + blue tint) behind both columns */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 opacity-[0.5]">
            <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
              <defs>
                <pattern id="borrower-grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#borrower-grid-pattern)" />
            </svg>
          </div>
        </div>
        {/* Left Column: Scrollable content */}
        <div className="flex-1 relative z-[1] min-w-0">
          {/* Content with padding */}
          <div className="relative p-6 min-w-0">
            {borrowerEditing ? (
              <div className="space-y-6">
                {renderBorrowerDocumentsSection()}
                {renderBorrowerResumeSection()}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Project Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-5">
                  {activeProject?.projectName || "Project"}
                </h1>

                {/* Project Progress Card */}
                <div className="relative">
                  <ProjectSummaryCard
                    project={projectForProgress}
                    isLoading={projectsLoading}
                    onEdit={() => setIsEditing(true)}
                    onBorrowerClick={() => {
                      setIsEditing(false);
                      setActiveFieldId(null);
                      setChatTab("team");
                      setShouldExpandChat(false);
                      setBorrowerEditing(true);
                    }}
                    borrowerProgress={borrowerResumeProgress}
                  />
                </div>

                {/* Section for OM Link - Only show if project is complete */}
                {isProjectComplete && (
                  <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group animate-fadeInUp">
                    {/* Animated background pattern */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/20 via-transparent to-green-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Success pulse effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-200 to-green-200 rounded-lg blur-sm opacity-30 group-hover:opacity-50 transition-opacity duration-300 animate-pulse" />

                    <div className="relative z-10">
                      <h3 className="text-base font-semibold text-emerald-800 flex items-center">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                        Project Ready!
                      </h3>
                      <p className="text-sm text-emerald-700">
                        This project profile is complete. You can view the generated
                        Offering Memorandum.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/project/om/${projectId}`)}
                      className="border-emerald-300 text-emerald-700 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-green-100 hover:border-emerald-400 px-6 py-3 text-base font-medium shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 relative z-10 whitespace-nowrap flex-shrink-0"
                    >
                      <FileSpreadsheet className="mr-2 h-5 w-5" />
                      View OM
                    </Button>
                  </div>
                )}

                {/* Project Documents */}
                <div id="project-documents-section" className="overflow-visible">
                  <DocumentManager
                    projectId={projectId}
                    resourceId="PROJECT_ROOT"
                    title="Project Documents"
                    orgId={activeProject?.owner_org_id ?? null}
                    canUpload={true}
                    canDelete={true}
                    highlightedResourceId={highlightedResourceId}
                    context="project"
                  />
                </div>

                {/* Project completion progress */}
                <ProjectCompletionCard
                  project={projectForProgress}
                  isLoading={projectsLoading}
                  onEdit={() => setIsEditing(true)}
                />

                {/* Project Resume (View or Edit) */}
                {isEditing ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4">
                      <EnhancedProjectForm
                        existingProject={activeProject}
                        onComplete={() => setIsEditing(false)}
                        onAskAI={(fieldId) => {
                          setActiveFieldId(fieldId);
                          void projectAskAi.activateField(fieldId, { autoSend: true });
                          setChatTab("ai");
                          setShouldExpandChat(true);
                          setTimeout(() => setShouldExpandChat(false), 100);
                        }}
                        onFormDataChange={setCurrentFormData}
                      />
                    </div>
                  </div>
                ) : (
                  <ProjectResumeView
                    project={activeProject}
                    onEdit={() => setIsEditing(true)}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky collapsible chat card */}
        <StickyChatCard
          projectId={projectId}
          onMentionClick={handleMentionClick}
          topOffsetClassName="top-4 sm:top-6"
          widthClassName="w-[45%] md:w-[50%] xl:w-[55%] max-w-[700px]"
          messages={activeAskAi.messages}
          fieldContext={activeAskAi.fieldContext}
          isLoading={activeAskAi.isLoading}
          isBuildingContext={activeAskAi.isBuildingContext}
          contextError={activeAskAi.contextError}
          hasActiveContext={activeAskAi.hasActiveContext}
          externalActiveTab={chatTab}
          externalShouldExpand={shouldExpandChat}
        />
      </AskAIProvider>
      {previewingResourceId && (
        <DocumentPreviewModal
          resourceId={previewingResourceId}
          onClose={() => setPreviewingResourceId(null)}
          onDeleteSuccess={() => {
            // Optionally refresh something, but DocumentManager will refetch
          }}
        />
      )}
      <Modal
        isOpen={copyModalOpen}
        onClose={() => {
          if (!isCopyingBorrower) {
            setCopyModalOpen(false);
            setCopyError(null);
          }
        }}
        title="Copy Borrower Profile"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Copy borrower resume details and documents from an existing project. This will replace the current borrower resume and documents.
          </p>
          <Select
            options={templateOptions}
            value={copySourceProjectId}
            onChange={(event) => setCopySourceProjectId(event.target.value)}
            placeholder={templateOptions.length ? "Select a project" : "No other projects available"}
            disabled={templateOptions.length === 0 || isCopyingBorrower}
          />
          {copyError && (
            <p className="text-sm text-red-600">{copyError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!isCopyingBorrower) {
                  setCopyModalOpen(false);
                  setCopyError(null);
                }
              }}
              disabled={isCopyingBorrower}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCopyBorrowerProfile}
              disabled={!copySourceProjectId || isCopyingBorrower}
            >
              {isCopyingBorrower ? "Copying..." : "Copy Profile"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
