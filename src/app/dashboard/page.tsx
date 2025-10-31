"use client";

import React, { useEffect, useState } from "react";
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
  Sparkles,
  User,
} from "lucide-react"; // Added Sparkles

export default function DashboardPage() {
  const router = useRouter();
  const { user, loginSource, currentOrgRole, isLoading: authLoading } = useAuth();
  const {
    projects,
    createProject,
    isLoading: projectsLoading,
  } = useProjects();
  const { content: borrowerResume, isLoading: profileLoading } = useBorrowerResume();

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

        {/* Decorative Background Layer */}
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">

          {/* Subtle grid pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(ellipse_100%_80%_at_50%_30%,black,transparent_70%)]">
            <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
              <defs>
                <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Blue blurred blob at top center */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
            <div className="h-64 w-[84rem] -translate-y-48 rounded-full bg-blue-400/40 blur-[90px]" />
        </div>

        {/* Main Content - centered with slightly reduced horizontal padding; translated down to make room for blob */}
        <div className="relative z-[1] mx-auto px-3 sm:px-5 lg:px-32 pt-20 pb-6">
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
            {/* Borrower Resume Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-gray-800">Borrower Resume</h2>
                  <p className="text-gray-600">Complete your profile to improve lender matching and project success.</p>
                </div>
                <Button
                  variant="primary"
                  leftIcon={<User size={18} />}
                  onClick={() => router.push("/dashboard/borrower-resume")}
                  className="shadow-sm hover:shadow-md transition-all duration-200 px-6 min-w-[200px] justify-center"
                >
                  View Profile
                </Button>
              </div>

              <div className="relative">
                <ProfileSummaryCard
                  profile={borrowerResume}
                  isLoading={profileLoading}
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

                {currentOrgRole !== "member" && (
                  <Button
                    variant="primary"
                    leftIcon={<PlusCircle size={18} />}
                    onClick={handleCreateNewProject}
                    className="shadow-sm hover:shadow-md transition-all duration-200 px-6 min-w-[200px] justify-center"
                  >
                    Create New Project
                  </Button>
                )}
              </div>

              {projects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project, index) => (
                    <div
                      key={project.id}
                      className="animate-fade-up"
                      style={{ animationDelay: `${index * 80}ms` }}
                    >
                      <ProjectCard project={project} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="relative">
                  <div className="relative text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="relative inline-block mb-6">
                      <FileText className="mx-auto h-16 w-16 text-gray-300" />
                    </div>

                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Projects Yet</h3>
                    <p className="text-gray-600 mb-8 max-w-md mx-auto">
                      Ready to find the perfect lenders for your commercial real estate deal? Start by exploring our curated lender marketplace.
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
