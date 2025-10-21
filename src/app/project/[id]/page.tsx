// src/app/project/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "../../../components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { Button } from "../../../components/ui/Button";
import { RoleBasedRoute } from "../../../components/auth/RoleBasedRoute";
import { useProjects } from "../../../hooks/useProjects";
import { useBorrowerProfile } from "../../../hooks/useBorrowerProfile";

import { LoadingOverlay } from "../../../components/ui/LoadingOverlay";
import { BorrowerProfileForm } from "../../../components/forms/BorrowerProfileForm";
import { MessagePanel } from "../../../components/dashboard/MessagePanel";
import { EnhancedProjectForm } from "../../../components/forms/EnhancedProjectForm";
import { ChevronLeft, Home } from "lucide-react";

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { getProject, activeProject, setActiveProject } = useProjects();
  const { borrowerProfile } = useBorrowerProfile();

  const [showProfileForm, setShowProfileForm] = useState(false);

  // Load project
  useEffect(() => {
    const loadProject = async () => {
      const projectId = params?.id as string;

      if (!projectId) {
        router.push("/dashboard");
        return;
      }

      const project = getProject(projectId);
      if (project) {
        setActiveProject(project);
      } else {
        console.error("Project not found");
        router.push("/dashboard");
      }
    };

    loadProject();
  }, [params, router, getProject, setActiveProject]);

  // Render placeholder if no project is loaded
  if (!activeProject) {
    return (
      <RoleBasedRoute roles={["borrower"]}>
        <DashboardLayout title="Deal Room™">
          <LoadingOverlay isLoading={false} />
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Project not found
            </h2>
            <p className="text-gray-600 mb-6">
              The project you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Button
              variant="outline"
              leftIcon={<ChevronLeft size={16} />}
              onClick={() => router.push("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </DashboardLayout>
      </RoleBasedRoute>
    );
  }

  return (
    <RoleBasedRoute roles={["borrower"]}>
      <DashboardLayout
        title={activeProject.projectName}
        sidebarMinimal={true}
        sidebarLinks={[
          { label: "Dashboard", icon: <Home size={16} />, href: "/dashboard" },
        ]}
      >
        <LoadingOverlay isLoading={false} />

        <div className="mb-6">
          <Button
            variant="outline"
            leftIcon={<ChevronLeft size={16} />}
            onClick={() => router.push("/dashboard")}
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Borrower Profile Area */}
        <div className="mb-8">
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-gray-50 flex justify-between items-center pb-3">
              <h2 className="text-xl font-semibold text-gray-800">
                Borrower Profile
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfileForm(!showProfileForm)}
              >
                {showProfileForm ? "Hide" : "Edit"} Profile
              </Button>
            </CardHeader>
            <CardContent className="p-4">
              {showProfileForm ? (
                <BorrowerProfileForm />
              ) : (
                <div>
                  <div className="flex justify-between mb-4">
                    <div className="text-gray-700">
                      <p className="font-medium">
                        {borrowerProfile?.fullLegalName ||
                          "Complete your profile"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {borrowerProfile?.primaryEntityName}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center">
                        <div className="h-2 bg-gray-200 rounded-full mr-2 w-24">
                          <div
                            className={`h-full rounded-full ${
                              (borrowerProfile?.completenessPercent || 0) ===
                              100
                                ? "bg-green-600"
                                : "bg-blue-600"
                            }`}
                            style={{
                              width: `${
                                borrowerProfile?.completenessPercent || 0
                              }%`,
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {borrowerProfile?.completenessPercent || 0}% Complete
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Split View Layout - 50/50 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Form - Left Side */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm h-full">
              <CardHeader className="border-b bg-gray-50 pb-3">
                <h2 className="text-xl font-semibold text-gray-800">
                  Project Details
                </h2>
              </CardHeader>
              <CardContent className="p-4">
                <EnhancedProjectForm
                  existingProject={activeProject}
                  compact={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Message Panel - Right Side */}
          <div className="lg:col-span-1">
            <MessagePanel projectId={activeProject.id} fullHeight={true} />
          </div>
        </div>
      </DashboardLayout>
    </RoleBasedRoute>
  );
}
