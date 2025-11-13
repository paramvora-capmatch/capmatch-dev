"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBasedRoute } from "../../components/auth/RoleBasedRoute";
import { useProjects } from "../../hooks/useProjects";
import { useAuth } from "../../hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { SplashScreen } from "../../components/ui/SplashScreen";
import { ProjectCard } from "../../components/dashboard/ProjectCard"; // Import Project Card
import { ProjectCardSkeleton } from "../../components/dashboard/ProjectCardSkeleton";
import {
  PlusCircle,
  Edit,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ProjectProfile } from "@/types/enhanced-types";
import { useOrgStore } from "@/stores/useOrgStore";
import NewProjectAccessModal from "@/components/project/NewProjectAccessModal";
import { ProjectGrant } from "@/types/enhanced-types";
import { supabase } from "../../../lib/supabaseClient";

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
  const isBorrowerComplete = progress >= 100;
  const progressColor = isBorrowerComplete ? 'bg-green-600' : 'bg-blue-600';
  
  // Determine bullet color based on progress
  const getBorrowerBulletColor = () => {
    if (progress >= 90) return "bg-green-500";
    if (progress >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group">
      <div className="px-6 pt-6 pb-4 space-y-4">
        {hasProject ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-gray-900">
                  Overall Completion
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBorrowerResume();
                  }}
                  className="flex items-center gap-0 group-hover:gap-2 px-2 group-hover:px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-all duration-300 overflow-hidden text-base"
                >
                  <Edit className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap max-w-0 group-hover:max-w-[120px] opacity-0 group-hover:opacity-100 transition-all duration-300 overflow-hidden">
                    Edit Profile
                  </span>
                </Button>
              </div>
              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-lg font-semibold text-gray-800">
                  {progress}%
                </span>
              </div>
            </div>
            <div className="h-3 w-full bg-gray-200 rounded-md overflow-hidden relative">
              <div
                className={`h-full ${progressColor} transition-all duration-700 ease-out relative`}
                style={{ width: `${progress}%` }}
              >
                {isBorrowerComplete && (
                  <div className="absolute inset-0 bg-green-50 rounded-md animate-slow-pulse opacity-20" />
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 flex items-center">
              <span className={`w-1.5 h-1.5 ${getBorrowerBulletColor()} rounded-full mr-2 animate-pulse`}></span>
              Complete your borrower resume to unlock lender matching.
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
  const {
    user,
    loginSource,
    currentOrgRole,
    isLoading: authLoading,
    activeOrg,
  } = useAuth();
  const {
    projects,
    createProject,
    deleteProject,
    isLoading: projectsLoading,
  } = useProjects();
  const {
    members: orgMembers,
    isLoading: orgLoading,
    loadOrg,
    currentOrg,
  } = useOrgStore();

  // State to track if the initial loading cycle has completed.
  // We use this to prevent the redirect logic from firing on subsequent background re-fetches.
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // State to track when a project is being created
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessModalError, setAccessModalError] = useState<string | null>(null);
  const [createdProject, setCreatedProject] = useState<ProjectProfile | null>(null);

  const combinedLoading = authLoading || projectsLoading || isCreatingProject;
  
  // Only show splash screen during auth loading, not during project loading
  const showSplashScreen = authLoading;
  const showProjectSkeletons = !authLoading && projectsLoading;

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
  const applyMemberPermissions = useCallback(
    async (projectId: string, selections: Record<string, ProjectGrant>) => {
      if (!user?.id) {
        throw new Error("User context missing while granting permissions.");
      }

      for (const [memberId, grant] of Object.entries(selections)) {
        // Skip if no permissions are set
        if (!grant.permissions || grant.permissions.length === 0) {
          continue;
        }

        // Convert ProjectGrant permissions to the format expected by grant_project_access RPC
        const permissionPayload = grant.permissions.map((perm) => ({
          resource_type: perm.resource_type,
          permission: perm.permission,
        }));

        const { error: grantError } = await supabase.rpc("grant_project_access", {
          p_project_id: projectId,
          p_user_id: memberId,
          p_granted_by_id: user.id,
          p_permissions: permissionPayload,
        });

        if (grantError) {
          throw new Error(
            grantError.message || `Failed to grant access to selected member.`
          );
        }
      }
    },
    [user?.id]
  );

  const resetModalState = () => {
    setIsAccessModalOpen(false);
    setAccessModalError(null);
    setCreatedProject(null);
  };

  const handleAccessModalClose = () => {
    if (isCreatingProject) return;
    resetModalState();
  };

  const handleCreateNewProject = useCallback(async () => {
    if (isCreatingProject) return;

    if (!activeOrg?.id) {
      console.error("Cannot load organization members: no active organization.");
      return;
    }

    try {
      if (!currentOrg || currentOrg.id !== activeOrg.id) {
        await loadOrg(activeOrg.id);
      }

      setAccessModalError(null);
      setCreatedProject(null);
      setIsAccessModalOpen(true);
    } catch (error) {
      console.error("Failed to prepare organization data:", error);
    }
  }, [activeOrg?.id, currentOrg, isCreatingProject, loadOrg]);

  const handleAccessModalSubmit = useCallback(
    async (selections: Record<string, ProjectGrant>) => {
      if (!activeOrg?.id) {
        setAccessModalError(
          "No active organization is set. Please reload and try again."
        );
        return;
      }

      setIsCreatingProject(true);
      setAccessModalError(null);

      let project: ProjectProfile | null = createdProject;
      try {
        if (!project) {
          project = await createProject({
            projectName: `My Project #${projects.length + 1}`,
          });
          setCreatedProject(project);
        }

        if (!project) {
          throw new Error("Project was not created successfully.");
        }

        // At this point, project is guaranteed to be non-null
        const finalProject = project;

        // Set projectId in each grant before applying permissions
        const grantsWithProjectId: Record<string, ProjectGrant> = {};
        Object.entries(selections).forEach(([memberId, grant]) => {
          grantsWithProjectId[memberId] = {
            ...grant,
            projectId: finalProject.id,
          };
        });

        await applyMemberPermissions(finalProject.id, grantsWithProjectId);

        resetModalState();
        router.push(`/project/workspace/${finalProject.id}`);
      } catch (error) {
        console.error("Failed to create new project or grant access:", error);

        if (project) {
          try {
            await deleteProject(project.id);
          } catch (deleteError) {
            console.error(
              "Failed to roll back project after permission error:",
              deleteError
            );
          } finally {
            setCreatedProject(null);
          }
        }

        const message =
          error instanceof Error
            ? error.message
            : "Failed to create project. Please try again.";
        setAccessModalError(message);
      } finally {
        setIsCreatingProject(false);
      }
    },
    [
      activeOrg?.id,
      applyMemberPermissions,
      createProject,
      deleteProject,
      projects.length,
      router,
      createdProject,
    ]
  );

  // --- Render Logic ---

  return (
    <RoleBasedRoute roles={["borrower"]}>
      <DashboardLayout 
        title="Dashboard"
        mainClassName="flex-1 overflow-auto pl-6 pr-3 sm:pr-4 lg:pr-6 pt-2 pb-6"
      >
        {showSplashScreen && <SplashScreen />}

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
                  <h2 className="text-2xl font-bold text-gray-800">Borrower Resume</h2>
                  <p className="text-gray-600">Your professional profile and financial background for lenders.</p>
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

                 {/* Project Skeletons (shown while loading) */}
                 {showProjectSkeletons && (
                   <>
                     {[1, 2].map((i) => (
                       <div key={`skeleton-${i}`} className="h-full">
                         <ProjectCardSkeleton />
                       </div>
                     ))}
                   </>
                 )}

                 {/* Existing Projects */}
                 {!showProjectSkeletons && projects.map((project, index) => (
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
          @keyframes slowPulse {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.4; }
          }
          .animate-slow-pulse {
            animation: slowPulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>
      </DashboardLayout>
      <NewProjectAccessModal
        isOpen={isAccessModalOpen}
        onClose={handleAccessModalClose}
        onSubmit={handleAccessModalSubmit}
        members={orgMembers}
        isLoadingMembers={orgLoading}
        isSubmitting={isCreatingProject}
        errorMessage={accessModalError}
      />
    </RoleBasedRoute>
  );
}
