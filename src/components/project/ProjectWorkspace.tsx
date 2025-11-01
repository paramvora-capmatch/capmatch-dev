"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/hooks/useProjects";

import { ProjectResumeView } from "./ProjectResumeView"; // New component for viewing
import { ProjectSummaryCard } from "./ProjectSummaryCard"; // New component for project progress
import { EnhancedProjectForm } from "../forms/EnhancedProjectForm";
import { Loader2, FileSpreadsheet, MessageSquare, Brain } from "lucide-react";
import { useOrgStore } from "@/stores/useOrgStore";
import { ProjectProfile } from "@/types/enhanced-types";
import { Button } from "../ui/Button"; // Import Button
import { useAuthStore } from "@/stores/useAuthStore";
import { AskAIProvider } from "../ui/AskAIProvider";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { DocumentManager } from "../documents/DocumentManager";
import { cn } from "@/utils/cn";

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
  const [droppedFieldId, setDroppedFieldId] = useState<string | null>(null);

  const [previewingResourceId, setPreviewingResourceId] = useState<
    string | null
  >(null);
  const [highlightedResourceId, setHighlightedResourceId] = useState<
    string | null
  >(null);

  const [currentFormData, setCurrentFormData] = useState<ProjectProfile | null>(
    null
  );

  // Documents are now displayed above the workspace; right column has its own tabs
  const [rightTab, setRightTab] = useState<"team" | "ai">("team");

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
    <div className="h-full w-full flex flex-row animate-fadeIn">
      <AskAIProvider
        onFieldAskAI={(fieldId: string) => {
          setDroppedFieldId(fieldId); // This will be passed to the chat widget
        }}
      >
        {/* Left Column: Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
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

            {/* Document Manager */}
            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
              <DocumentManager
                projectId={projectId}
                resourceId="PROJECT_ROOT"
                title="Project Documents"
                canUpload={true}
                canDelete={true}
                highlightedResourceId={highlightedResourceId}
              />
            </div>

            {/* Project Resume (View or Edit) */}
            {isEditing ? (
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <EnhancedProjectForm
                  existingProject={activeProject}
                  onComplete={() => setIsEditing(false)} // Close form on complete
                  onAskAI={(fieldId) => setDroppedFieldId(fieldId)}
                  onFormDataChange={setCurrentFormData}
                />
              </div>
            ) : (
              <ProjectResumeView
                project={activeProject}
                onEdit={() => setIsEditing(true)}
              />
            )}
          </div>
        </div>

        {/* Right Column: Fixed Chat with tabs */}
        <div className="w-1/3 border-l bg-white flex flex-col h-full">
          <div className="flex-shrink-0 border-b">
            <div className="flex">
              <button
                onClick={() => setRightTab("team")}
                className={cn(
                  "flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors",
                  rightTab === "team" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <MessageSquare size={16} />
                <span>Team Chat</span>
              </button>
              <button
                onClick={() => setRightTab("ai")}
                className={cn(
                  "flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors",
                  rightTab === "ai" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <Brain size={16} />
                <span>AI Chat</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-0 overflow-hidden min-h-0">
            {rightTab === "team" ? (
              <ChatInterface
                embedded
                projectId={projectId}
                onMentionClick={handleMentionClick}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-white">
                <div className="text-center text-gray-500 text-sm">
                  AI Chat will appear here.
                </div>
              </div>
            )}
          </div>
        </div>
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
