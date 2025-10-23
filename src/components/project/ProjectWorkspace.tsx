"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "../../hooks/useProjects";
import { useBorrowerProfile } from "../../hooks/useBorrowerProfile";

import { ProjectResumeView } from "./ProjectResumeView"; // New component for viewing
import { EnhancedProjectForm } from "../forms/EnhancedProjectForm";
import { Loader2, FileSpreadsheet, MessageSquare, Folder } from "lucide-react";
import { Users as AccessControlIcon } from "lucide-react";
import { useOrgStore } from "@/stores/useOrgStore";
import { ProjectProfile } from "@/types/enhanced-types";
import { Button } from "../ui/Button"; // Import Button
import { useAuth } from "@/hooks/useAuth"; // Add this import;
import { useAuthStore } from "@/stores/useAuthStore";
import { AskAIProvider } from "../ui/AskAIProvider";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { DocumentManager } from "../documents/DocumentManager";
import { ProfileSummaryCard } from "./ProfileSummaryCard";
import { AccessControlTab } from "./AccessControlTab";
import { Card, CardContent, CardHeader } from "../ui/card";
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
  const { content: borrowerProfile, isLoading: profileLoading } =
    useBorrowerProfile();
  const { loadOrg } = useOrgStore();
  const { isOwner } = useOrgStore();
  const { user, isLoading: authLoading } = useAuth();

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

  const [activeTab, setActiveTab] = useState<"chat" | "documents" | "access">(
    "chat"
  );

  // Calculate if we're still in initial loading phase
  const isInitialLoading =
    authLoading ||
    projectsLoading ||
    (user?.role === "borrower" && profileLoading);

  // Load org data when we have a project
  useEffect(() => {
    const loadOrgData = async () => {
      if (!activeProject?.entityId) return;

      const { currentOrg } = useOrgStore.getState();
      // Only load if we haven't loaded this org yet
      if (currentOrg?.id !== activeProject.entityId) {
        console.log(
          `[ProjectWorkspace] Loading org data for: ${activeProject.entityId}`
        );
        await loadOrg(activeProject.entityId);
      }
    };

    loadOrgData();
  }, [activeProject?.entityId, loadOrg]);

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
          if (projectData.entityId) {
            await loadOrg(projectData.entityId);
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
    setPreviewingResourceId(resourceId); // Open the preview modal
    setActiveTab("documents");
    setHighlightedResourceId(resourceId);
    // Clear the highlight after a short delay
    setTimeout(() => {
      setHighlightedResourceId(null);
    }, 3000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <ProfileSummaryCard
        profile={borrowerProfile}
        isLoading={profileLoading}
      />

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

      <AskAIProvider
        onFieldAskAI={(fieldId: string) => {
          setDroppedFieldId(fieldId); // This will be passed to the chat widget
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Project Resume (View or Edit) */}
          <div className="lg:col-span-3">
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

          {/* Right Column: Documents */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader className="p-0 border-b">
                <div className="flex">
                  <button
                    onClick={() => setActiveTab("chat")}
                    className={cn(
                      "flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors",
                      activeTab === "chat"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <MessageSquare size={16} />
                    <span>Chat</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("documents")}
                    className={cn(
                      "flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors",
                      activeTab === "documents"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <Folder size={16} />
                    <span>Documents</span>
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => setActiveTab("access")}
                      className={cn(
                        "flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors",
                        activeTab === "access"
                          ? "border-b-2 border-blue-600 text-blue-600"
                          : "text-gray-500 hover:bg-gray-50"
                      )}
                    >
                      <AccessControlIcon size={16} />
                      <span>Access Control</span>
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                {activeTab === "chat" ? (
                  <ChatInterface
                    projectId={projectId}
                    onMentionClick={handleMentionClick}
                  />
                ) : activeTab === "documents" ? (
                  <div className="p-2 h-full">
                    <DocumentManager
                      projectId={projectId}
                      folderId={null}
                      title=""
                      canUpload={true}
                      canDelete={true}
                      highlightedResourceId={highlightedResourceId}
                    />
                  </div>
                ) : activeTab === "access" && isOwner ? (
                  <AccessControlTab projectId={projectId} />
                ) : null}
              </CardContent>
            </Card>
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
