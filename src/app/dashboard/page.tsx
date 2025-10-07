"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { RoleBasedRoute } from "../../components/auth/RoleBasedRoute";
import { useProjects } from "../../hooks/useProjects";
import { useBorrowerProfile } from "../../hooks/useBorrowerProfile";
import { useAuth } from "../../hooks/useAuth"; // Import useAuth for logout

import { LoadingOverlay } from "../../components/ui/LoadingOverlay";
import { ProfileSummaryCard } from "../../components/project/ProfileSummaryCard"; // Import Profile Summary
import { ProjectCard } from "../../components/dashboard/ProjectCard"; // Import Project Card
import { Button } from "../../components/ui/Button"; // Import Button
import {
  PlusCircle,
  Loader2,
  Home,
  Link,
  FileText,
  LogOut,
  Sparkles,
} from "lucide-react"; // Added Sparkles

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, loginSource, logout } = useAuth(); // Get logout
  const {
    projects,
    isLoading: projectsLoading,
    activeProject,
    setActiveProject,
    autoCreatedFirstProjectThisSession,
  } = useProjects();
  const { borrowerProfile, isLoading: profileLoading } = useBorrowerProfile();

  // Combined loading state check
  const combinedLoading = authLoading || projectsLoading || profileLoading;
  const initialLoadComplete = useRef(false);

  // Single function to handle project redirects with session storage check (keyed per user)
  const handleProjectRedirect = (project: any, reason: string) => {
    const email = user?.email || "anonymous";
    const key = `hasAutoRedirected:${email}`;
    const hasRedirected = sessionStorage.getItem(key);
    if (!hasRedirected) {
      console.log(`Dashboard: ${reason}, redirecting to: ${project.id}`);
      sessionStorage.setItem(key, "true");
      router.replace(`/project/workspace/${project.id}`);
      return true; // Indicate redirect was performed
    } else {
      console.log(
        `Dashboard: Auto-redirect has already occurred this session for this user. Staying on dashboard.`
      );
      return false; // Indicate no redirect was performed
    }
  };

  // Control Flow Logic & Loading
  useEffect(() => {
    // Don't run redirect logic until all initial loading is potentially complete
    if (combinedLoading) {
      return;
    }

    // Mark initial load as complete once all contexts are ready for the first time
    if (!initialLoadComplete.current) {
      initialLoadComplete.current = true;
    }

    console.log(
      `Dashboard: Contexts loaded. User: ${user?.role}, Projects: ${
        projects.length
      }, Profile: ${!!borrowerProfile}`
    );

    // Check if this is a new borrower who needs to be redirected to their project
    if (user?.role === "borrower") {
      console.log(
        `Dashboard: Checking borrower status. Projects count: ${projects.length}`
      );

      // If no projects exist yet, wait for auto-creation and then redirect
      if (projects.length === 0) {
        console.log(
          "Dashboard: New borrower detected, waiting for project creation..."
        );
        waitForProjectCreation();
        return;
      } else if (projects.length === 1 && autoCreatedFirstProjectThisSession) {
        // If they have exactly one project AND it was auto-created this session, redirect to it
        const targetProject = projects[0];
        if (
          handleProjectRedirect(
            targetProject,
            "Auto-created project this session, redirecting"
          )
        ) {
          return;
        }
      } else {
        console.log(
          `Dashboard: Borrower has ${projects.length} projects or existing project from storage, staying on dashboard for selection`
        );
      }
      // If they have multiple projects, stay on dashboard to let them choose
    }

    // Handle lenderline redirects
    const needsLenderlineRedirect =
      user?.role === "borrower" && loginSource === "lenderline";
    if (needsLenderlineRedirect) {
      let targetProjectId: string | null = null;

      if (loginSource === "lenderline") {
        const sortedProjects = [...projects].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        if (sortedProjects.length > 0) targetProjectId = sortedProjects[0].id;
        console.log(
          `Dashboard: Redirecting from LenderLine to newest project: ${targetProjectId}`
        );
      }

      if (targetProjectId) {
        console.log(
          `Dashboard: Performing redirect to /project/workspace/${targetProjectId}`
        );
        router.replace(`/project/workspace/${targetProjectId}`);
      } else {
        console.warn(
          "Dashboard: Cannot determine target project ID for redirect. Staying on dashboard."
        );
      }
    } else {
      console.log("Dashboard: Rendering dashboard content.");
    }
  }, [
    user,
    combinedLoading,
    projects,
    loginSource,
    router,
    borrowerProfile,
    autoCreatedFirstProjectThisSession,
  ]);

  // Wait for project creation and redirect to project workspace
  const waitForProjectCreation = async () => {
    try {
      console.log("Dashboard: Starting to wait for project creation...");
      let attempts = 0;
      const maxAttempts = 40; // 20 seconds max wait

      while (attempts < maxAttempts) {
        // Check if we have a project
        if (projects.length > 0) {
          if (autoCreatedFirstProjectThisSession) {
            const targetProject = projects[0]; // Get the first/only project
            handleProjectRedirect(
              targetProject,
              "Project created! Redirecting to project workspace"
            );
          } else {
            // Project loaded from storage, stay on dashboard
            console.log(
              "Dashboard: Project loaded from storage, staying on dashboard"
            );
          }
          return;
        }

        console.log(
          `Dashboard: Waiting for project creation... attempt ${
            attempts + 1
          }/${maxAttempts}`
        );
        // Wait a bit and try again
        await new Promise((resolve) => setTimeout(resolve, 500));
        attempts++;
      }

      // If we still don't have a project after waiting, show a message and let user manually navigate
      console.warn(
        "Dashboard: Project creation timeout, showing manual navigation option"
      );
      console.warn(
        "Project creation is taking longer than expected. You can manually navigate to your project once it appears."
      );
    } catch (error) {
      console.error("Dashboard: Error waiting for project creation:", error);
    }
  };

  // Manual navigation to project (fallback)
  const navigateToProject = () => {
    if (projects.length > 0) {
      const targetProject = projects[0];
      router.push(`/project/workspace/${targetProject.id}`);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      sessionStorage.removeItem("hasAutoRedirected"); // Clear redirect flag
      console.log("Signed out successfully.");
      router.push("/login"); // Redirect to login after logout
    } catch (error) {
      console.error("Logout failed. Please try again.");
    }
  };

  // --- Render Logic ---
  // Show loader ONLY on the very first load. After that, the page remains visible during background refreshes.
  if (!initialLoadComplete.current) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50/40 to-blue-100/60">
        <LoadingOverlay isLoading={false} />
        <div className="flex flex-col items-center text-gray-600">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <div className="absolute inset-0 bg-blue-200 rounded-full blur-lg opacity-20 animate-pulse"></div>
          </div>
          <span className="text-lg font-medium">Loading Dashboard...</span>
          <div className="mt-2 flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div
              className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleBasedRoute roles={["borrower"]}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50/40 via-white to-blue-100/50 relative overflow-hidden">
        {/* Animated gradient pulse background */}
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-300/60 via-purple-300/60 via-pink-200/60 via-white/40 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-2000 ease-in-out"></div>
        </div>
        <LoadingOverlay isLoading={false} />

        {/* Enhanced Header with CapMatch Logo */}
        <header className="bg-white/90 backdrop-blur-lg shadow-lg border-b border-gray-200 sticky top-0 z-10">
          <div className="container mx-auto py-4 px-4 md:px-6 flex justify-between items-center">
            <div className="flex items-center space-x-4 group transition-all duration-200">
              {/* CapMatch Logo */}
              <div className="relative flex-shrink-0">
                <img
                  src="/CapMatchLogo.png"
                  alt="CapMatch Logo"
                  className="h-10 w-auto transition-transform duration-200 group-hover:scale-105 drop-shadow-sm"
                  onError={(e) => {
                    // Fallback to acara logo if CapMatch logo fails
                    const target = e.target as HTMLImageElement;
                    target.src = "/acara-logo.png";
                    target.onerror = () => {
                      // If both fail, show a text fallback
                      target.style.display = "none";
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "block";
                    };
                  }}
                />
                {/* Text fallback if images fail */}
                <div
                  className="hidden bg-gradient-to-r from-blue-600 to-blue-800 text-white px-3 py-2 rounded-lg text-sm font-bold"
                  style={{ display: "none" }}
                >
                  CM
                </div>
                <div className="absolute -inset-2 bg-blue-200 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-200 blur-lg"></div>
              </div>

              {/* Dashboard Title */}
              <span className="text-3xl font-bold text-gray-800">
                Dashboard
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all duration-200 hover:shadow-sm"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Enhanced Main Content */}
        <main className="container mx-auto p-6 md:p-8 space-y-8">
          {/* Enhanced Profile Summary */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-purple-100/20 rounded-2xl blur-3xl"></div>
            <div className="relative">
              <ProfileSummaryCard
                profile={borrowerProfile}
                isLoading={profileLoading}
              />
            </div>
          </div>

          {/* Enhanced Projects Section */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  My Projects
                </h2>
                <p className="text-gray-600">
                  Manage and track your commercial real estate deals
                </p>
              </div>

              <Button
                variant="primary"
                leftIcon={<Sparkles size={18} />}
                onClick={() => router.push("/")}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 px-6"
              >
                Find New Lenders
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
                {/* Background decoration */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-2xl"></div>

                <div className="relative text-center py-16 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100">
                  <div className="relative inline-block mb-6">
                    <FileText className="mx-auto h-16 w-16 text-gray-300" />
                    <div className="absolute -inset-2 bg-blue-100 rounded-full opacity-20 blur-lg"></div>
                  </div>

                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
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
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200 text-lg px-8 py-3"
                  >
                    Explore LenderLine™
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Enhanced Footer */}
        <footer className="text-center py-6 mt-12 text-sm text-gray-500 border-t border-gray-100 bg-white/50">
          <div className="container mx-auto px-4">
            © {new Date().getFullYear()} CapMatch Platform
          </div>
        </footer>
      </div>
    </RoleBasedRoute>
  );
}
