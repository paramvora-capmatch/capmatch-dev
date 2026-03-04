// src/app/lender/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { RoleBasedRoute } from "../../../components/auth/RoleBasedRoute";
import { useAuth } from "../../../hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/lib/supabaseClient";
import { Building2 } from "lucide-react";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { ProjectProfile } from "@/types/enhanced-types";

// Resume fields can be simple values or enhanced objects with {value, source, warnings, other_values}
type ResumeFieldValue<T> = T | { value: T; source?: string; warnings?: string[]; other_values?: T[] };

interface LenderProject {
  id: string;
  name: string;
  owner_org_id: string;
  created_at: string;
  project_resume?: {
    content: Record<string, unknown>;
    completeness_percent?: number | null;
  };
  borrower_resume?: {
    content: Record<string, unknown>;
    completeness_percent?: number | null;
  };
}

// Build ProjectProfile from lender project data for use with ProjectCard
function lenderProjectToProfile(project: LenderProject): ProjectProfile {
  const content = project.project_resume?.content || {};
  const extractValue = (field: unknown): string | number | undefined => {
    if (field === null || field === undefined) return undefined;
    if (typeof field === "object" && "value" in (field as Record<string, unknown>)) {
      return (field as { value: string | number }).value;
    }
    if (typeof field === "string" || typeof field === "number") return field;
    return undefined;
  };
  const projectComplete = project.project_resume?.completeness_percent === 100;
  const borrowerComplete = project.borrower_resume?.completeness_percent === 100;
  const overallProgress = projectComplete && borrowerComplete ? 100 : 0;
  return {
    id: project.id,
    owner_org_id: project.owner_org_id,
    projectName: project.name,
    assetType: (extractValue(content.assetType) as string) || "Asset Type TBD",
    projectStatus: "active",
    createdAt: project.created_at,
    updatedAt: project.created_at,
    completenessPercent: project.project_resume?.completeness_percent ?? 100,
    borrowerProgress: project.borrower_resume?.completeness_percent ?? 100,
  } as ProjectProfile;
}

export default function LenderDashboardPage() {
  const { user, activeOrg } = useAuth();
  const [projects, setProjects] = useState<LenderProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLenderProjects = async () => {
      if (!user || !activeOrg) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: accessGrants, error: accessError } = await supabase
          .from("lender_project_access")
          .select("project_id")
          .eq("lender_org_id", activeOrg.id);

        if (accessError) {
          throw accessError;
        }

        if (!accessGrants || accessGrants.length === 0) {
          setProjects([]);
          setIsLoading(false);
          return;
        }

        const projectIds = accessGrants.map((g) => g.project_id);

        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, name, owner_org_id, created_at")
          .in("id", projectIds);

        if (projectsError) {
          throw projectsError;
        }

        const { data: projectResumesRows, error: resumesError } = await supabase
          .from("project_resumes")
          .select("project_id, content, completeness_percent, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false });

        if (resumesError) {
          console.error("Error fetching project resumes:", resumesError);
        }

        const { data: borrowerResumesRows, error: borrowerError } = await supabase
          .from("borrower_resumes")
          .select("project_id, content, completeness_percent, created_at")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false });

        if (borrowerError) {
          console.error("Error fetching borrower resumes:", borrowerError);
        }

        const latestProjectResumeByProject = new Map<string, NonNullable<typeof projectResumesRows>[number]>();
        (projectResumesRows || []).forEach((r) => {
          if (!latestProjectResumeByProject.has(r.project_id)) {
            latestProjectResumeByProject.set(r.project_id, r);
          }
        });
        const latestBorrowerResumeByProject = new Map<string, NonNullable<typeof borrowerResumesRows>[number]>();
        (borrowerResumesRows || []).forEach((r) => {
          if (!latestBorrowerResumeByProject.has(r.project_id)) {
            latestBorrowerResumeByProject.set(r.project_id, r);
          }
        });

        const enrichedProjects = (projectsData || [])
          .map((project) => {
            const projectResume = latestProjectResumeByProject.get(project.id);
            const borrowerResume = latestBorrowerResumeByProject.get(project.id);
            return {
              ...project,
              project_resume: projectResume
                ? { content: projectResume.content, completeness_percent: projectResume.completeness_percent }
                : undefined,
              borrower_resume: borrowerResume
                ? { content: borrowerResume.content, completeness_percent: borrowerResume.completeness_percent }
                : undefined,
            };
          })
          .filter((p) => {
            const projectComplete = p.project_resume?.completeness_percent === 100;
            const borrowerComplete = p.borrower_resume?.completeness_percent === 100;
            return projectComplete && borrowerComplete;
          });

        setProjects(enrichedProjects);
      } catch (err) {
        console.error("Error fetching lender projects:", err);
        setError(err instanceof Error ? err.message : "Failed to load projects");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLenderProjects();
  }, [user, activeOrg]);

  return (
    <RoleBasedRoute roles={["lender"]}>
      <DashboardLayout title="Lender Dashboard">
        <div className="relative -mx-6 sm:-mx-6 lg:-mx-6 bg-gray-200 min-h-[calc(100vh-5rem)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.5]">
            <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
              <defs>
                <pattern id="lender-dash-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#lender-dash-grid)" />
            </svg>
          </div>

          <div className="relative z-[1] pt-6 pb-6">
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 opacity-[0.25]">
                <svg className="absolute inset-0 h-full w-full text-slate-300" aria-hidden="true">
                  <defs>
                    <pattern id="lender-dash-inner" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#lender-dash-inner)" />
                </svg>
              </div>

              <div className="relative p-6 sm:p-8 lg:p-10">
                <div className="space-y-10">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div className="space-y-1">
                        <h2 className="text-2xl font-bold text-gray-800">Active Deals</h2>
                        <p className="text-gray-600">Deals you have access to</p>
                      </div>
                    </div>

                    {isLoading && (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800">{error}</p>
                      </div>
                    )}

                    {!isLoading && !error && projects.length === 0 && (
                      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                        <Building2 className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Ready Deals Yet</h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                          Deals appear here once an advisor adds you to a project and both the project and borrower
                          resumes are 100% complete.
                        </p>
                      </div>
                    )}

                    {!isLoading && !error && projects.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project, index) => (
                          <div
                            key={project.id}
                            className="animate-fade-up h-full"
                            style={{ animationDelay: `${(index + 1) * 80}ms` }}
                          >
                            <ProjectCard
                              project={lenderProjectToProfile(project)}
                              primaryCtaHref={`/lender/project/${project.id}`}
                              primaryCtaLabel="View Deal"
                              showDeleteButton={false}
                              showMembers={false}
                              unreadCount={0}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeUp {
            0% {
              opacity: 0;
              transform: translateY(16px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-up {
            animation: fadeUp 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
        `}</style>
      </DashboardLayout>
    </RoleBasedRoute>
  );
}
