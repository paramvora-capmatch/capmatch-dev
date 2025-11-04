"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useAskAI } from "@/hooks/useAskAI";

import { DocumentPreviewModal } from "../documents/DocumentPreviewModal";
interface ProjectWorkspaceProps {
  projectId: string;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  projectId,
}) => {
  const router = useRouter();
  const {
    activeProject,
    setActiveProject,
    isLoading: projectsLoading,
    getProject,
  } = useProjects();
  const { loadOrg, isOwner } = useOrgStore();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.isLoading);

  const [isEditing, setIsEditing] = useState(false);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [chatTab, setChatTab] = useState<"team" | "ai">("team");

  const [previewingResourceId, setPreviewingResourceId] = useState<
    string | null
  >(null);
  const [highlightedResourceId, setHighlightedResourceId] = useState<
    string | null
  >(null);

  const [currentFormData, setCurrentFormData] = useState<ProjectProfile | null>(
    null
  );
  const [focusFieldId, setFocusFieldId] = useState<string | null>(null);

  // Right column chat is handled by StickyChatCard
  // Centralize AskAI logic here; StickyChatCard is presentation-only
  const askAi = useAskAI({
    formData: (currentFormData as unknown as Record<string, unknown>) || {},
    apiPath: '/api/project-qa',
    contextType: 'project',
  });

  // Calculate if we're still in initial loading phase
  const isInitialLoading =
    authLoading ||
    projectsLoading;

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

  const projectCompleteness = activeProject?.completenessPercent || 0;
  const isProjectComplete = projectCompleteness === 100; // Check if project is complete

  const handleMentionClick = (resourceId: string) => {
    setPreviewingResourceId(resourceId); // Open the preview modal
    setPreviewingResourceId(resourceId);
    setHighlightedResourceId(resourceId);
    // Clear the highlight after a short delay
    setTimeout(() => {
      setHighlightedResourceId(null);
    }, 3000);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-row animate-fadeIn">
      <AskAIProvider
        onFieldAskAI={(fieldId: string) => {
          setActiveFieldId(fieldId); // This will be passed to the chat widget
        }}
      >
        {/* Global page background (grid + blue tint) behind both columns */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(ellipse_100%_80%_at_50%_30%,black,transparent_70%)]">
            <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
              <defs>
                <pattern id="borrower-grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#borrower-grid-pattern)" />
            </svg>
          </div>
          <div className="absolute inset-x-0 top-0 flex justify-center">
            <div className="h-64 w-[84rem] -translate-y-48 rounded-full bg-blue-400/40 blur-[90px]" />
          </div>
        </div>
        {/* Left Column: Scrollable content */}
        <div className="flex-1 relative z-[1]">
          {/* Content with padding */}
          <div className="relative p-6">
            <div className="space-y-6">
            {/* Project Progress Card */}
            <div className="relative">
              <ProjectSummaryCard
                project={activeProject}
                isLoading={projectsLoading}
                onEdit={() => setIsEditing(true)}
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
                  className="border-emerald-300 text-emerald-700 hover:bg-gradient-to-r hover:from-emerald-100 hover:to-green-100 hover:border-emerald-400 px-6 py-3 text-base font-medium shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 relative z-10"
                >
                  <FileSpreadsheet className="mr-2 h-5 w-5" />
                  View OM
                </Button>
              </div>
            )}

            {/* Document Manager (single card; remove outer wrapper) */}
            <DocumentManager
              projectId={projectId}
              resourceId="PROJECT_ROOT"
              title="Project Documents"
              canUpload={true}
              canDelete={true}
              highlightedResourceId={highlightedResourceId}
            />

            {/* Project completion progress (same width as documents/resume card) */}
            <ProjectCompletionCard
              project={activeProject}
              isLoading={projectsLoading}
              onEdit={() => setIsEditing(true)}
            />

            {/* Project Resume (View or Edit) */}
            {isEditing ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4">
                  <EnhancedProjectForm
                    existingProject={activeProject}
                    onComplete={() => setIsEditing(false)} // Close form on complete
                    onAskAI={(fieldId) => {
                      setActiveFieldId(fieldId);
                      // eslint-disable-next-line @typescript-eslint/no-floating-promises
                      askAi.activateField(fieldId, { autoSend: true });
                      setChatTab("ai");
                    }}
                    onFormDataChange={setCurrentFormData}
                    initialFocusFieldId={focusFieldId || undefined}
                  />
                </div>
              </div>
            ) : (
              <ProjectResumeView
                project={activeProject}
                onEdit={() => setIsEditing(true)}
                onJumpToField={(fieldId) => {
                  setIsEditing(true);
                  setFocusFieldId(fieldId);
                }}
              />
            )}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky collapsible chat card */}
        <StickyChatCard
          projectId={projectId}
          onMentionClick={handleMentionClick}
          topOffsetClassName="top-4 sm:top-6"
          widthClassName="w-[340px] md:w-[360px] xl:w-[420px]"
          messages={askAi.messages}
          fieldContext={askAi.fieldContext}
          isLoading={askAi.isLoading}
          isBuildingContext={askAi.isBuildingContext}
          contextError={askAi.contextError}
          hasActiveContext={askAi.hasActiveContext}
          externalActiveTab={chatTab}
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
    </div>
  );
};
