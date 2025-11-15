// src/app/advisor/resume/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBasedRoute } from "../../../components/auth/RoleBasedRoute";
import { useAuth } from "../../../hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AdvisorResumeForm } from "@/components/forms/AdvisorResumeForm";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

export default function AdvisorResumePage() {
  const router = useRouter();
  const { user, activeOrg } = useAuth();
  const [progressPercent, setProgressPercent] = useState<number>(0);

  if (!user || user.role !== "advisor" || !activeOrg?.id) {
    return (
      <RoleBasedRoute roles={["advisor"]}>
        <DashboardLayout title="Advisor Resume">
          <div className="p-6">
            <p className="text-gray-500">
              {!activeOrg?.id ? "Please ensure you are part of an advisor organization." : "Loading..."}
            </p>
          </div>
        </DashboardLayout>
      </RoleBasedRoute>
    );
  }

  return (
    <RoleBasedRoute roles={["advisor"]}>
      <DashboardLayout 
        title="Advisor Resume" 
        hideTeamButton={true}
        mainClassName="flex-1 overflow-auto flex flex-col"
      >
        <LoadingOverlay isLoading={false} />

        {/* Decorative Background Layer */}
        <div className="absolute inset-0 -mx-4 sm:-mx-6 lg:-mx-8 bg-gray-200">
          {/* Subtle grid pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.5]">
            <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
              <defs>
                <pattern id="advisor-resume-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#advisor-resume-grid)" />
            </svg>
          </div>
        </div>

        {/* Main Content - full height container */}
        <div className="relative z-[1] w-full max-w-4xl mx-auto px-3 sm:px-5 lg:px-8 py-6 flex-1 flex flex-col min-h-0">
          {/* Darker background container with its own subtle grid */}
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg flex-1 flex flex-col min-h-0">
            <div className="pointer-events-none absolute inset-0 opacity-[0.25]">
              <svg className="absolute inset-0 h-full w-full text-slate-300" aria-hidden="true">
                <defs>
                  <pattern id="advisor-resume-inner-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#advisor-resume-inner-grid)" />
              </svg>
            </div>

            <div className="relative p-4 sm:p-6 flex-1 flex flex-col min-h-0">
              <AdvisorResumeForm
                orgId={activeOrg.id}
                onProgressChange={setProgressPercent}
                progressPercent={progressPercent}
              />
            </div>
          </div>
        </div>
      </DashboardLayout>
    </RoleBasedRoute>
  );
}

