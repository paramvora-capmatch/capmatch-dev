"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBasedRoute } from "../../components/auth/RoleBasedRoute";
import { useProjects } from "../../hooks/useProjects";
import { useAuth } from "../../hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { SplashScreen } from "../../components/ui/SplashScreen";
import { AnimatePresence } from "framer-motion";
import { ProjectCard } from "../../components/dashboard/ProjectCard"; // Import Project Card
import { ProjectCardSkeleton } from "../../components/dashboard/ProjectCardSkeleton";
import { OnboardingProgressCardSkeleton } from "../../components/dashboard/OnboardingProgressCardSkeleton";
import { useProjectMembers } from "../../hooks/useProjectMembers";
import {
  PlusCircle,
  Edit,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ProjectProfile } from "@/types/enhanced-types";
import { useOrgStore } from "@/stores/useOrgStore";
import NewProjectAccessModal from "@/components/project/NewProjectAccessModal";
import { Modal } from "../../components/ui/Modal";
import { cn } from "../../utils/cn";
import { GRID_LAYOUT_THRESHOLD, PROGRESS_THRESHOLDS } from "@/constants/dashboard";
import { useProjectCreation } from "../../hooks/useProjectCreation";
import { useProjectModals } from "../../hooks/useProjectModals";
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
  const isBorrowerComplete = progress >= PROGRESS_THRESHOLDS.COMPLETE;
  const progressColor = isBorrowerComplete ? 'bg-green-600' : 'bg-blue-600';

  // Determine bullet color based on progress
  const getBorrowerBulletColor = () => {
    if (progress >= PROGRESS_THRESHOLDS.HIGH) return "bg-green-500";
    if (progress >= PROGRESS_THRESHOLDS.MEDIUM) return "bg-yellow-500";
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
    isLoading: projectsLoading,
    loadUserProjects,
  } = useProjects();
  const {
    members: orgMembers,
    isLoading: orgLoading,
  } = useOrgStore();

  // Batch fetch project members to optimize performance
  const { membersByProjectId, isLoading: membersLoading } = useProjectMembers(projects);

  // Store unread counts per project
  const [unreadCountsByProject, setUnreadCountsByProject] = useState<Record<string, number>>({});

  // State to track if the initial loading cycle has completed.
  // We use this to prevent the redirect logic from firing on subsequent background re-fetches.
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Track if we've attempted to load projects to prevent duplicate calls
  const hasAttemptedLoad = useRef(false);

  // Project creation logic extracted to custom hook
  const {
    isCreatingProject,
    isAccessModalOpen,
    accessModalError,
    handleCreateNewProject,
    handleAccessModalClose,
    handleAccessModalSubmit,
  } = useProjectCreation();

  // Modal management extracted to custom hook
  const {
    isProjectSelectModalOpen,
    selectedProjectId,
    openProjectSelectModal,
    closeProjectSelectModal,
    setSelectedProjectId,
    handleProjectSelectSubmit,
  } = useProjectModals(projects);

  const combinedLoading = authLoading || projectsLoading || isCreatingProject;

  // Only show splash screen during the *initial* auth loading on first dashboard load.
  // After initialLoadComplete, we avoid showing "Loading dashboard..." again (e.g. during logout).
  const showSplashScreen = authLoading && !initialLoadComplete && !!user;
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

  // Create options for project selection modal with completion percentages
  const projectSelectOptions = useMemo(() => {
    return projects.map((project) => ({
      value: project.id,
      label: project.projectName || "Untitled Project",
      progress: Math.round(project.borrowerProgress ?? 0),
    }));
  }, [projects]);

  // Count total projects (all projects have borrower resumes, even if at 0%)
  const totalProjects = projects.length;

  // Use grid layout when threshold is reached for better space utilization
  const useGridLayout = totalProjects >= GRID_LAYOUT_THRESHOLD;

  // Handle opening borrower resume - check if single or multiple projects
  const handleOpenBorrowerResume = useCallback(() => {
    if (projects.length === 0) {
      return;
    }

    // If only one project, navigate directly
    if (projects.length === 1) {
      router.push(`/project/workspace/${projects[0].id}?step=borrower`);
      return;
    }

    // If multiple projects, open selection modal
    // Pre-select the most complete project if available
    openProjectSelectModal(primaryProject?.id);
  }, [projects, primaryProject, router, openProjectSelectModal]);

  // Stabilize loadUserProjects reference to prevent unnecessary effect runs
  const stableLoadUserProjects = useCallback(() => {
    return loadUserProjects();
  }, [loadUserProjects]);

  // Explicitly load projects when user is authenticated and ready
  // This fixes the issue where projects don't load when navigating from login/landing page
  // because the subscription only fires on org membership changes, not on initial load
  useEffect(() => {
    // Only load if:
    // 1. User is authenticated and is a borrower
    // 2. Auth is not loading
    // 3. User has an active org (org memberships are loaded)
    // 4. We haven't attempted to load yet
    if (
      user &&
      user.role === "borrower" &&
      !authLoading &&
      activeOrg &&
      !hasAttemptedLoad.current
    ) {
      hasAttemptedLoad.current = true;
      stableLoadUserProjects().catch((error) => {
        console.error("[Dashboard] Failed to load projects:", error);
        // Reset flag on error so we can retry
        hasAttemptedLoad.current = false;
      });
    }

    // Reset flag when user logs out or org changes
    if (!user || !activeOrg) {
      hasAttemptedLoad.current = false;
    }
  }, [user, authLoading, activeOrg, stableLoadUserProjects]);

  // Mark initial load as complete once loading finishes
  useEffect(() => {
    if (!combinedLoading && !initialLoadComplete) {
      setInitialLoadComplete(true);
    }
  }, [combinedLoading, initialLoadComplete]);

  // Fetch unread counts for all projects
  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!user?.id || projects.length === 0) {
        setUnreadCountsByProject({});
        return;
      }

      const unreadCounts: Record<string, number> = {};

      // Fetch unread counts for each project
      await Promise.all(
        projects.map(async (project) => {
          try {
            const { data, error } = await supabase.rpc('get_unread_counts_for_project', {
              p_project_id: project.id,
              p_user_id: user.id,
            });

            if (error) {
              console.error(`Failed to load unread counts for project ${project.id}:`, {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
              });
              return;
            }

            // Sum up all unread counts for this project
            const totalUnread = (data || []).reduce(
              (sum: number, row: { unread_count: number }) => sum + (Number(row.unread_count) || 0),
              0
            );

            if (totalUnread > 0) {
              unreadCounts[project.id] = totalUnread;
            }
          } catch (err) {
            console.error(`Error fetching unread counts for project ${project.id}:`, err);
          }
        })
      );

      setUnreadCountsByProject(unreadCounts);
    };

    fetchUnreadCounts();
  }, [user?.id, projects]);


  // --- Render Logic ---

  return (
    <RoleBasedRoute roles={["borrower"]}>
      <DashboardLayout
        title="Dashboard"
        mainClassName="flex-1 overflow-auto pl-6 pr-3 sm:pr-4 lg:pr-6 pt-2 pb-6"
      >
        <AnimatePresence>
          {showSplashScreen && <SplashScreen text="Loading dashboard..." />}
        </AnimatePresence>

        {/* Decorative Background Layer */}
        <div className="relative -mx-6 sm:-mx-6 lg:-mx-6 bg-gray-200 min-h-screen">

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
                      {projectsLoading ? (
                        <OnboardingProgressCardSkeleton />
                      ) : (
                        <OnboardingProgressCard
                          project={primaryProject}
                          progress={borrowerResumeProgress}
                          onOpenBorrowerResume={handleOpenBorrowerResume}
                          onCreateProject={handleCreateNewProject}
                        />
                      )}
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
                          {/* Borrower/owner view: show project members, but use the
                             batched list-level hook to avoid per-card fetching. */}
                          <ProjectCard
                            project={project}
                            showMembers={true}
                            members={membersByProjectId[project.id]}
                            isMembersLoading={membersLoading}
                            unreadCount={unreadCountsByProject[project.id] || 0}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
      <Modal
        isOpen={isProjectSelectModalOpen}
        onClose={closeProjectSelectModal}
        title="Select Project"
        size={useGridLayout ? "lg" : "md"}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">
              You have {totalProjects} {totalProjects === 1 ? 'project' : 'projects'} with borrower resumes.
            </p>
            <p className="text-sm text-gray-600">
              Choose which project&apos;s borrower resume you want to edit.
            </p>
          </div>

          <div className={cn(
            useGridLayout
              ? "grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1"
              : "space-y-2"
          )}>
            {projectSelectOptions.map((project) => {
              const isSelected = selectedProjectId === project.value;

              // Determine colors based on progress thresholds
              const getProgressBarColor = () => {
                if (project.progress === PROGRESS_THRESHOLDS.COMPLETE) return "bg-green-500";
                if (project.progress >= PROGRESS_THRESHOLDS.MEDIUM) return "bg-blue-500";
                return "bg-red-500";
              };

              const getBadgeColor = () => {
                if (project.progress === PROGRESS_THRESHOLDS.COMPLETE) return "bg-green-100 text-green-800 border-green-300";
                if (project.progress >= PROGRESS_THRESHOLDS.MEDIUM) return "bg-blue-100 text-blue-800 border-blue-300";
                return "bg-red-100 text-red-800 border-red-300";
              };

              return (
                <button
                  key={project.value}
                  type="button"
                  onClick={() => setSelectedProjectId(project.value)}
                  className={cn(
                    "rounded-lg border-2 transition-all duration-200 text-left",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                    isSelected
                      ? "bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-200"
                      : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm",
                    useGridLayout ? "p-3" : "w-full p-4"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-between gap-2",
                    useGridLayout ? "flex-col items-stretch" : "flex-row"
                  )}>
                    <div className="flex-1 min-w-0 w-full">
                      <h4 className={cn(
                        "font-semibold mb-1.5 truncate",
                        useGridLayout ? "text-sm" : "text-base",
                        isSelected ? "text-blue-900" : "text-gray-900"
                      )}>
                        {project.label}
                      </h4>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-300",
                              getProgressBarColor()
                            )}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className={cn(
                          "font-medium whitespace-nowrap",
                          useGridLayout ? "text-xs" : "text-sm",
                          isSelected ? "text-blue-700" : "text-gray-600"
                        )}>
                          {project.progress}%
                        </span>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-semibold border flex-shrink-0",
                      getBadgeColor(),
                      useGridLayout && "self-start"
                    )}>
                      {project.progress}% Complete
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={closeProjectSelectModal}
            >
              Cancel
            </Button>
            <Button
              onClick={handleProjectSelectSubmit}
              disabled={!selectedProjectId}
            >
              Edit Resume
            </Button>
          </div>
        </div>
      </Modal>
    </RoleBasedRoute>
  );
}
