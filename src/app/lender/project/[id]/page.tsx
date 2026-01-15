// src/app/lender/project/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { RoleBasedRoute } from "@/components/auth/RoleBasedRoute";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, FileText, Building2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { BorrowerResumeView } from "@/components/forms/BorrowerResumeView";
import { ProjectResumeView } from "@/components/project/ProjectResumeView";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { ProjectProfile } from "@/types/enhanced-types";

interface Project {
  id: string;
  name: string;
  owner_org_id: string;
  created_at: string;
}

type Tab = "borrower" | "project" | "chat";

export default function LenderProjectViewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { user, activeOrg } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("project");
  const [borrowerResumeContent, setBorrowerResumeContent] = useState<any>(null);
  const [projectProfile, setProjectProfile] = useState<ProjectProfile | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!user || !activeOrg || !projectId) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if lender has access to this project
        const { data: accessData, error: accessError } = await supabase
          .from("lender_project_access")
          .select("id")
          .eq("lender_org_id", activeOrg.id)
          .eq("project_id", projectId)
          .maybeSingle();

        if (accessError) {
          throw accessError;
        }

        if (!accessData) {
          setHasAccess(false);
          setError("You don't have access to this project.");
          setIsLoading(false);
          return;
        }

        setHasAccess(true);

        // Fetch project details
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select("id, name, owner_org_id, created_at")
          .eq("id", projectId)
          .single();

        if (projectError) {
          throw projectError;
        }

        setProject(projectData);

        // Fetch project resume
        const { data: projectResume, error: projectResumeError } = await supabase
          .from("project_resumes")
          .select("content")
          .eq("project_id", projectId)
          .single();

        if (projectResumeError && projectResumeError.code !== "PGRST116") {
          console.error("Error fetching project resume:", projectResumeError);
        }

        // Build ProjectProfile from project data and resume content
        const projectProfileData: ProjectProfile = {
          id: projectData.id,
          owner_org_id: projectData.owner_org_id,
          projectName: projectData.name,
          assetType: "",
          projectStatus: "",
          createdAt: projectData.created_at,
          updatedAt: projectData.created_at,
          ...(projectResume?.content || {}),
        };
        setProjectProfile(projectProfileData);

        // Fetch borrower resume
        // Note: borrower_resumes are project-scoped, not org-scoped
        const { data: borrowerResume, error: borrowerResumeError } =
          await supabase
            .from("borrower_resumes")
            .select("content")
            .eq("project_id", projectId)
            .single();

        if (borrowerResumeError && borrowerResumeError.code !== "PGRST116") {
          console.error("Error fetching borrower resume:", borrowerResumeError);
        }

        setBorrowerResumeContent(borrowerResume?.content || {});
      } catch (err) {
        console.error("Error fetching project:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load project"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [user, activeOrg, projectId]);

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm">
      <button
        onClick={() => router.push("/lender/dashboard")}
        className="text-gray-600 hover:text-gray-900 transition-colors"
      >
        Projects
      </button>
      <ChevronLeft className="h-4 w-4 text-gray-400 rotate-180" />
      <span className="text-gray-900 font-medium">{project?.name || "Project"}</span>
    </div>
  );

  if (isLoading) {
    return (
      <RoleBasedRoute roles={["lender"]}>
        <DashboardLayout breadcrumb={breadcrumb}>
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </DashboardLayout>
      </RoleBasedRoute>
    );
  }

  if (error || !hasAccess) {
    return (
      <RoleBasedRoute roles={["lender"]}>
        <DashboardLayout breadcrumb={breadcrumb}>
          <div className="max-w-2xl mx-auto py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Access Denied
              </h3>
              <p className="text-red-700 mb-4">
                {error || "You don't have permission to view this project."}
              </p>
              <Button
                variant="outline"
                onClick={() => router.push("/lender/dashboard")}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </DashboardLayout>
      </RoleBasedRoute>
    );
  }

  return (
    <RoleBasedRoute roles={["lender"]}>
      <DashboardLayout breadcrumb={breadcrumb}>
        <div className="max-w-7xl mx-auto py-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {project?.name}
              </h1>
              <Button
                variant="outline"
                onClick={() => router.push("/lender/dashboard")}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
              >
                Back
              </Button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <p className="text-sm text-blue-800">
                <strong>Read-only view:</strong> You're viewing this project as a lender. You can review resumes and participate in chat, but cannot edit project details or access documents.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab("project")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "project"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>Project Resume</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("borrower")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "borrower"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Borrower Resume</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "chat"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {activeTab === "project" && projectProfile && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Project Resume
                </h2>
                <ProjectResumeView
                  project={projectProfile}
                  onEdit={() => {}}
                  canEdit={false}
                />
              </div>
            )}

            {activeTab === "borrower" && borrowerResumeContent && projectId && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Borrower Resume
                </h2>
                <BorrowerResumeView
                  resume={borrowerResumeContent}
                  projectId={projectId}
                  onEdit={() => {}}
                  canEdit={false}
                />
              </div>
            )}

            {activeTab === "chat" && project && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Project Chat
                </h2>
                <ChatInterface projectId={project.id} embedded />
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </RoleBasedRoute>
  );
}
