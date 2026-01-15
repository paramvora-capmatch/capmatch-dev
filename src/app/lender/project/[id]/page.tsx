// src/app/lender/project/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { RoleBasedRoute } from "@/components/auth/RoleBasedRoute";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProjectProfile } from "@/types/enhanced-types";
import { LenderProjectWorkspace } from "@/components/lender/LenderProjectWorkspace";
import { getProjectWithResume } from "@/lib/project-queries";


interface Project {
  id: string;
  name: string;
  owner_org_id: string;
  created_at: string;
}



export default function LenderProjectViewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { user, activeOrg } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch project details using the shared utility that handles rich content and merging
        const projectProfile = await getProjectWithResume(projectId);

        // Update states
        setProject(projectProfile as unknown as Project);
        setProjectProfile(projectProfile);
        setBorrowerResumeContent(projectProfile.borrowerSections || {});

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
      <DashboardLayout
        breadcrumb={breadcrumb}
        mainClassName="flex-1 overflow-auto pl-6 pr-3 sm:pr-4 lg:pr-6 pt-2 pb-6"
      >
        {projectProfile && borrowerResumeContent ? (
          <LenderProjectWorkspace
            project={projectProfile}
            borrowerResume={borrowerResumeContent}
            projectId={projectId}
          />
        ) : (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
          </div>
        )}
      </DashboardLayout>
    </RoleBasedRoute>
  );
}
