"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RoleBasedRoute } from "../../components/auth/RoleBasedRoute";
import { useProjects } from "../../hooks/useProjects";
import { useBorrowerResume } from "../../hooks/useBorrowerResume";
import { useAuth } from "../../hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LoadingOverlay } from "../../components/ui/LoadingOverlay";
import { ProfileSummaryCard } from "../../components/project/ProfileSummaryCard"; // Import Profile Summary
import { ProjectCard } from "../../components/dashboard/ProjectCard"; // Import Project Card
import { Button } from "../../components/ui/Button"; // Import Button
import {
  PlusCircle,
  FileText,
  LogOut,
  Sparkles,
  LayoutGrid,
  User,
  Folder,
} from "lucide-react"; // Added Sparkles

export default function DashboardPage() {
  const router = useRouter();
  const { user, loginSource, isLoading: authLoading } = useAuth();
  const {
    projects,
    createProject,
    isLoading: projectsLoading,
  } = useProjects();
  const { content: borrowerResume, isLoading: profileLoading } = useBorrowerResume();
  const searchParams = useSearchParams();


  // State to track if the initial loading cycle has completed.
  // We use this to prevent the redirect logic from firing on subsequent background re-fetches.
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const combinedLoading = authLoading || projectsLoading || profileLoading;

  // Control Flow Logic & Loading
  useEffect(() => {
    // If still loading, do nothing.
    if (combinedLoading && !initialLoadComplete) {
      return;
    }

    // Once loading is finished for the first time, mark it.
    if (!combinedLoading && !initialLoadComplete) {
      setInitialLoadComplete(true);
    }

    // This logic is simplified. New user onboarding is complex.
    // The main redirect for new users is after profile completion.
    // Let's keep the dashboard stable for now.
    // A `from=signup` param could trigger an onboarding modal in the future.

  }, [
    user,
    projects,
    loginSource,
    router,
    borrowerResume,
    initialLoadComplete,
    combinedLoading,
  ]);

  // Handle creating a new project
  const handleCreateNewProject = async () => {
    try {
      const newProject = await createProject({
        projectName: `My Project #${projects.length + 1}`,
      });
      router.push(`/project/workspace/${newProject.id}`);
    } catch (error) {
      console.error("Failed to create new project:", error);
    }
  };

  // --- Render Logic ---

  return (
    <RoleBasedRoute roles={["borrower"]}>
      <DashboardLayout title="Dashboard">
        <LoadingOverlay isLoading={combinedLoading} />

        {/* Enhanced Main Content */}
        <div className="space-y-8">
          {/* Enhanced Profile Summary */}
          <div className="relative">
            <ProfileSummaryCard
              profile={borrowerResume}
              isLoading={profileLoading}
            />
          </div>

          {/* Enhanced Projects Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-gray-800">
                  My Projects
                </h2>
                <p className="text-gray-600">
                  Manage and track your commercial real estate deals
                </p>
              </div>

              <Button
                variant="primary"
                leftIcon={<PlusCircle size={18} />}
                onClick={handleCreateNewProject}
                className="shadow-sm hover:shadow-md transition-all duration-200 px-6"
              >
                Create New Project
              </Button>
            </div>

            {projects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            ) : (
              <div className="relative">
                <div className="relative text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <div className="relative inline-block mb-6">
                    <FileText className="mx-auto h-16 w-16 text-gray-300" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-800 mb-2">
                    No Projects Yet
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    Ready to find the perfect lenders for your commercial real
                    estate deal? Start by exploring our curated lender
                    marketplace.
                  </p>

                  <Button
                    variant="primary"
                    leftIcon={<Sparkles size={18} />}
                    onClick={() => router.push("/")}
                    className="shadow-lg hover:shadow-xl transition-all duration-200 px-8 py-3"
                  >
                    Explore LenderLine™
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </RoleBasedRoute>
  );
}
