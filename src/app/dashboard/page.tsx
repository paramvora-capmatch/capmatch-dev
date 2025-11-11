"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBasedRoute } from "../../components/auth/RoleBasedRoute";
import { useProjects } from "../../hooks/useProjects";
import { useAuth } from "../../hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { LoadingOverlay } from "../../components/ui/LoadingOverlay";
import { ProjectCard } from "../../components/dashboard/ProjectCard"; // Import Project Card
import {
  PlusCircle,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ProjectProfile } from "@/types/enhanced-types";

interface OnboardingProgressCardProps {
  project: ProjectProfile | null;
  progress: number;
  onOpenBorrowerResume: () => void;
  onCreateProject: () => Promise<void> | void;
}

const OnboardingProgressCard: React.FC<OnboardingProgressCardProps> = ({
  project,
  progress,
  onOpenBorrowerResume,
  onCreateProject,
}) => {
  const hasProject = Boolean(project);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 pt-6 pb-4 space-y-4">
        {hasProject ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-600">Overall completion</p>
                <h3 className="text-lg font-semibold text-gray-900">
                  Borrower Resume
                </h3>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-lg font-semibold text-gray-800">
                  {progress}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenBorrowerResume}
                  className="!w-auto px-4 py-2 !h-auto text-blue-700 hover:bg-blue-50 transition-colors text-sm font-semibold"
                >
                  Complete borrower resume
                </Button>
              </div>
            </div>
            <div className="h-3 w-full bg-gray-200 rounded-md overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              Finish the borrower resume to reach 100%.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-gray-900">
              Create your first project
            </h3>
            <p className="text-sm text-gray-600">
              Start a new project to begin sharing borrower and deal details with your advisor.
            </p>
            <div className="flex justify-end">
              <Button onClick={onCreateProject}>Create Project</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loginSource, currentOrgRole, isLoading: authLoading } = useAuth();
  const {
    projects,
    createProject,
    isLoading: projectsLoading,
  } = useProjects();

  // State to track if the initial loading cycle has completed.
  // We use this to prevent the redirect logic from firing on subsequent background re-fetches.
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const combinedLoading = authLoading || projectsLoading;

  const mostCompleteBorrowerProject = useMemo(() => {
    if (projects.length === 0) return null;

    return projects.reduce((bestProject, currentProject) => {
      const bestProgress = bestProject.borrowerProgress ?? 0;
      const currentProgress = currentProject.borrowerProgress ?? 0;

      if (currentProgress > bestProgress) {
        return currentProject;
      }

      if (currentProgress === bestProgress) {
        const bestUpdatedAt = bestProject.updatedAt
          ? new Date(bestProject.updatedAt).getTime()
          : 0;
        const currentUpdatedAt = currentProject.updatedAt
          ? new Date(currentProject.updatedAt).getTime()
          : 0;

        if (currentUpdatedAt > bestUpdatedAt) {
          return currentProject;
        }
      }

      return bestProject;
    }, projects[0]);
  }, [projects]);

  const primaryProject = mostCompleteBorrowerProject;
  const borrowerResumeProgress = primaryProject
    ? Math.round(primaryProject.borrowerProgress ?? 0)
    : 0;

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
      <DashboardLayout 
        title="Dashboard"
        mainClassName="flex-1 overflow-auto pl-6 pr-3 sm:pr-4 lg:pr-6 pt-2 pb-6"
      >
        <LoadingOverlay isLoading={combinedLoading} />

        {/* Decorative Background Layer */}
        <div className="relative -mx-6 sm:-mx-6 lg:-mx-6">

          {/* Subtle grid pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.5]">
            <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
              <defs>
                <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>


        {/* Main Content - aligned with header spacing */}
        <div className="relative z-[1] pt-6 pb-6">
          {/* Darker background container with its own subtle grid */}
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-[0.25]">
              <svg className="absolute inset-0 h-full w-full text-slate-300" aria-hidden="true">
                <defs>
                  <pattern id="inner-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#inner-grid)" />
              </svg>
            </div>

            <div className="relative p-6 sm:p-8 lg:p-10">
              <div className="space-y-10">
            {/* Onboarding Guidance */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-gray-800">Getting Started</h2>
                  <p className="text-gray-600">Complete your first project to unlock lender-ready materials.</p>
                </div>
              </div>

              <div className="relative">
                <OnboardingProgressCard
                  project={primaryProject}
                  progress={borrowerResumeProgress}
                  onOpenBorrowerResume={() => {
                    if (primaryProject) {
                      router.push(
                        `/project/workspace/${primaryProject.id}?step=borrower`
                      );
                    }
                  }}
                  onCreateProject={handleCreateNewProject}
                />
              </div>
            </div>

            {/* Enhanced Projects Section */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-gray-800">My Projects</h2>
                  <p className="text-gray-600">Manage and track your commercial real estate deals</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Wireframe Create New Project Card - Always First */}
                {currentOrgRole !== "member" && (
                  <div className="animate-fade-up h-full">
                    <div
                      onClick={handleCreateNewProject}
                      className="h-full bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center text-center p-8 min-h-[210px] md:min-h-[250px] lg:min-h-[280px]"
                    >
                      <div className="mb-6">
                        <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-400 group-hover:border-blue-500 flex items-center justify-center transition-colors duration-300 mx-auto">
                          <PlusCircle className="h-8 w-8 text-gray-600 group-hover:text-blue-600 transition-colors duration-300" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-800 transition-colors duration-300">
                        Create New Project
                      </h3>
                      <p className="text-gray-600 text-sm max-w-xs mx-auto leading-relaxed">
                        Start a new commercial real estate project and get matched with qualified lenders.
                      </p>
                    </div>
                  </div>
                )}

                {/* Existing Projects */}
                {projects.map((project, index) => (
                  <div
                    key={project.id}
                    className="animate-fade-up h-full"
                    style={{ animationDelay: `${(index + 1) * 80}ms` }}
                  >
                    <ProjectCard project={project} />
                  </div>
                ))}
              </div>
            </div>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Local styles for subtle animations */}
        <style jsx>{`
          @keyframes fadeUp {
            0% { opacity: 0; transform: translateY(16px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-up {
            animation: fadeUp 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
        `}</style>
      </DashboardLayout>
    </RoleBasedRoute>
  );
}
