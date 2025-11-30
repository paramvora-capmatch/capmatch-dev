// src/app/advisor/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RoleBasedRoute } from "../../../components/auth/RoleBasedRoute";
import { useAuth } from "../../../hooks/useAuth";

import { SplashScreen } from "../../../components/ui/SplashScreen";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/Button";
import DashboardLayout from "@/components/layout/DashboardLayout";

import { Users } from "lucide-react";
import {
  Advisor,
  ProjectProfile,
  ProjectMessage,
  ProjectStatus,
} from "../../../types/enhanced-types";
import { storageService } from "@/lib/storage";
import { supabase } from "../../../../lib/supabaseClient";
import { getProjectsWithResumes } from "@/lib/project-queries";
import { ProjectCard } from "@/components/dashboard/ProjectCard";

const dbMessageToProjectMessage = (
  dbMessage: Record<string, any>
): ProjectMessage => {
  return {
    id: dbMessage.id,
    thread_id: dbMessage.thread_id,
    project_id: dbMessage.chat_threads?.project_id,
    user_id: dbMessage.user_id,
    content: dbMessage.content,
    created_at: dbMessage.created_at,
  };
};

export default function AdvisorDashboardPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [activeProjects, setActiveProjects] = useState<ProjectProfile[]>([]);
  const [recentMessages, setRecentMessages] = useState<ProjectMessage[]>([]);
  const [borrowerData, setBorrowerData] = useState<
    Record<string, { name: string; email: string }>
  >({});

  const [unreadByProject, setUnreadByProject] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadAdvisorData = async () => {
      if (!user || user.role !== "advisor") return;

      try {
        let assignedProjects: ProjectProfile[] = [];

        // Load advisor data from Supabase
        console.log(
          "[AdvisorDashboard] Loading data for advisor from Supabase."
        );

        const advisorProfile: Advisor = {
          id: user.id || user.email,
          userId: user.email,
          name: user.name || user.email,
          email: user.email,
          title: "Capital Advisor",
          phone: "",
          bio: "An experienced Capital Advisor at CapMatch.",
          avatar: "",
          specialties: [],
          yearsExperience: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setAdvisor(advisorProfile);

        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("*")
          .eq("assigned_advisor_id", user.id);

        if (projectsError) throw projectsError;

        if (projectsData) {
          const projectIds = projectsData.map((p) => p.id);
          assignedProjects = await getProjectsWithResumes(projectIds);

          if (assignedProjects.length > 0) {
            const ownerOrgIds = Array.from(
              new Set(
                assignedProjects.map((p) => p.owner_org_id).filter(Boolean)
              )
            ) as string[];

            if (ownerOrgIds.length > 0) {
              // Step 1: Find the owner's user_id for each org
              const { data: owners, error: ownersError } = await supabase
                .from("org_members")
                .select("org_id, user_id")
                .in("org_id", ownerOrgIds)
                .eq("role", "owner");

              if (ownersError) throw ownersError;
            }

            if (assignedProjects.length > 0) {
              // Fetch borrower resumes to get fullLegalName for each project
              const projectIds = assignedProjects.map((p) => p.id);
              console.log('[AdvisorDashboard] Fetching borrower resumes for projects:', projectIds);
              
              // Fetch borrower resumes - get the latest active one for each project
              const { data: borrowerResumes, error: borrowerResumesError } = await supabase
                .from("borrower_resumes")
                .select("project_id, content, status, created_at")
                .in("project_id", projectIds)
                .eq("status", "active")
                .order("created_at", { ascending: false });

              if (borrowerResumesError) {
                console.error('[AdvisorDashboard] Failed to fetch borrower resumes:', borrowerResumesError);
                // Continue without borrower data - non-fatal
              } else {
                console.log('[AdvisorDashboard] Fetched borrower resumes:', borrowerResumes?.length || 0);

                // Create a map from project_id -> borrower resume (only keep the latest for each project)
                const projectToBorrowerResume = new Map<string, any>();
                (borrowerResumes || []).forEach((br: any) => {
                  // Only keep the first (latest) resume for each project since we ordered by created_at DESC
                  if (!projectToBorrowerResume.has(br.project_id)) {
                    projectToBorrowerResume.set(br.project_id, br.content);
                  }
                });

                // Create a map from org_id -> borrower fullLegalName
                // Map by org_id so we can look it up in ProjectCard using project.owner_org_id
                const borrowerMap: Record<string, { name: string; email: string }> = {};
                
                assignedProjects.forEach((project) => {
                  if (!project.owner_org_id || !project.id) return;
                  
                  const borrowerResumeContent = projectToBorrowerResume.get(project.id);
                  if (!borrowerResumeContent) {
                    console.log(`[AdvisorDashboard] No borrower resume found for project ${project.id}`);
                    return;
                  }
                  
                  // Extract fullLegalName - handle both flat and rich data formats
                  let fullLegalName: string | undefined;
                  if (borrowerResumeContent.fullLegalName) {
                    if (typeof borrowerResumeContent.fullLegalName === 'object' && 'value' in borrowerResumeContent.fullLegalName) {
                      // Rich data format
                      fullLegalName = borrowerResumeContent.fullLegalName.value;
                    } else if (typeof borrowerResumeContent.fullLegalName === 'string') {
                      // Flat format
                      fullLegalName = borrowerResumeContent.fullLegalName;
                    }
                  }
                  
                  // Only add to map if fullLegalName exists and is not empty
                  if (fullLegalName && typeof fullLegalName === 'string' && fullLegalName.trim()) {
                    // Use org_id as key - if multiple projects share the same org, use the first one found
                    if (!borrowerMap[project.owner_org_id]) {
                      // Extract contactEmail similarly
                      let contactEmail = '';
                      if (borrowerResumeContent.contactEmail) {
                        if (typeof borrowerResumeContent.contactEmail === 'object' && 'value' in borrowerResumeContent.contactEmail) {
                          contactEmail = borrowerResumeContent.contactEmail.value || '';
                        } else if (typeof borrowerResumeContent.contactEmail === 'string') {
                          contactEmail = borrowerResumeContent.contactEmail;
                        }
                      }
                      
                      borrowerMap[project.owner_org_id] = {
                        name: fullLegalName.trim(),
                        email: contactEmail,
                      };
                    }
                  } else {
                    console.log(`[AdvisorDashboard] No fullLegalName found for project ${project.id} (or it's empty)`);
                  }
                });
                
                console.log('[AdvisorDashboard] Borrower data map (from resumes):', borrowerMap);
                setBorrowerData(borrowerMap);
              }
            }

            if (assignedProjects.length > 0) {
              // Fetch borrower resumes to get fullLegalName for each project
              const projectIds = assignedProjects.map((p) => p.id);
              console.log('[AdvisorDashboard] Fetching borrower resumes for projects:', projectIds);
              
              // Fetch borrower resumes - get the latest active one for each project
              const { data: borrowerResumes, error: borrowerResumesError } = await supabase
                .from("borrower_resumes")
                .select("project_id, content, status, created_at")
                .in("project_id", projectIds)
                .eq("status", "active")
                .order("created_at", { ascending: false });

              if (borrowerResumesError) {
                console.error('[AdvisorDashboard] Failed to fetch borrower resumes:', borrowerResumesError);
                // Continue without borrower data - non-fatal
              } else {
                console.log('[AdvisorDashboard] Fetched borrower resumes:', borrowerResumes?.length || 0);

                // Create a map from project_id -> borrower resume (only keep the latest for each project)
                const projectToBorrowerResume = new Map<string, any>();
                (borrowerResumes || []).forEach((br: any) => {
                  // Only keep the first (latest) resume for each project since we ordered by created_at DESC
                  if (!projectToBorrowerResume.has(br.project_id)) {
                    projectToBorrowerResume.set(br.project_id, br.content);
                  }
                });

                // Create a map from org_id -> borrower fullLegalName
                // Map by org_id so we can look it up in ProjectCard using project.owner_org_id
                const borrowerMap: Record<string, { name: string; email: string }> = {};
                
                assignedProjects.forEach((project) => {
                  if (!project.owner_org_id || !project.id) return;
                  
                  const borrowerResumeContent = projectToBorrowerResume.get(project.id);
                  if (!borrowerResumeContent) {
                    console.log(`[AdvisorDashboard] No borrower resume found for project ${project.id}`);
                    return;
                  }
                  
                  // Extract fullLegalName - handle both flat and rich data formats
                  let fullLegalName: string | undefined;
                  if (borrowerResumeContent.fullLegalName) {
                    if (typeof borrowerResumeContent.fullLegalName === 'object' && 'value' in borrowerResumeContent.fullLegalName) {
                      // Rich data format
                      fullLegalName = borrowerResumeContent.fullLegalName.value;
                    } else if (typeof borrowerResumeContent.fullLegalName === 'string') {
                      // Flat format
                      fullLegalName = borrowerResumeContent.fullLegalName;
                    }
                  }
                  
                  // Only add to map if fullLegalName exists and is not empty
                  if (fullLegalName && typeof fullLegalName === 'string' && fullLegalName.trim()) {
                    // Use org_id as key - if multiple projects share the same org, use the first one found
                    if (!borrowerMap[project.owner_org_id]) {
                      // Extract contactEmail similarly
                      let contactEmail = '';
                      if (borrowerResumeContent.contactEmail) {
                        if (typeof borrowerResumeContent.contactEmail === 'object' && 'value' in borrowerResumeContent.contactEmail) {
                          contactEmail = borrowerResumeContent.contactEmail.value || '';
                        } else if (typeof borrowerResumeContent.contactEmail === 'string') {
                          contactEmail = borrowerResumeContent.contactEmail;
                        }
                      }
                      
                      borrowerMap[project.owner_org_id] = {
                        name: fullLegalName.trim(),
                        email: contactEmail,
                      };
                    }
                  } else {
                    console.log(`[AdvisorDashboard] No fullLegalName found for project ${project.id} (or it's empty)`);
                  }
                });
                
                console.log('[AdvisorDashboard] Borrower data map (from resumes):', borrowerMap);
                setBorrowerData(borrowerMap);
              }
            }
          }
        }

        setActiveProjects(assignedProjects);
        console.log('[AdvisorDashboard] Active projects set:', assignedProjects.length);

        // Compute unread indicators per project (latest message authored by non-advisor)
        if (assignedProjects.length > 0 && user?.id) {
          const projectIds = assignedProjects.map((p) => p.id);
          const { data: threads, error: threadsError } = await supabase
            .from("chat_threads")
            .select("id, project_id")
            .in("project_id", projectIds);

          if (threadsError) throw threadsError;

          if (threads && threads.length > 0) {
            const threadIds = threads.map((t) => t.id);
            const { data: msgs, error: msgsError } = await supabase
              .from("project_messages")
              .select("thread_id, user_id, created_at")
              .in("thread_id", threadIds)
              .order("created_at", { ascending: false })
              .limit(200);

            if (msgsError) throw msgsError;

            const threadToProject: Record<string, string> = {};
            threads.forEach((t) => {
              threadToProject[t.id as string] = t.project_id as string;
            });

            const latestByProject = new Map<string, { user_id: string }>();
            (msgs || []).forEach((m: any) => {
              const pid = threadToProject[m.thread_id as string];
              if (pid && !latestByProject.has(pid)) {
                latestByProject.set(pid, { user_id: m.user_id as string });
              }
            });

            const unreadMap: Record<string, boolean> = {};
            assignedProjects.forEach((p) => {
              const latest = latestByProject.get(p.id);
              unreadMap[p.id] = latest ? latest.user_id !== user.id : false;
            });
            setUnreadByProject(unreadMap);
          } else {
            setUnreadByProject({});
          }
        } else {
          setUnreadByProject({});
        }
      } catch (error) {
        console.error("Error loading advisor data:", error);
      }
    };

    loadAdvisorData();
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // removed status color/icon helpers

  return (
    <RoleBasedRoute roles={["advisor"]}>
      <DashboardLayout 
        title="Dashboard"
        mainClassName="flex-1 overflow-auto pl-6 pr-3 sm:pr-4 lg:pr-6 pt-2 pb-6"
        hideTeamButton={true}
      >
        {/* Decorative Background Layer */}
        <div className="relative -mx-6 sm:-mx-6 lg:-mx-6 bg-gray-200 min-h-[calc(100vh-5rem)]">

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
            {/* Projects Section */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-gray-800">My Projects</h2>
                  <p className="text-gray-600">Manage and track your assigned projects across all organizations</p>
                </div>
              </div>

              {activeProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeProjects.map((project, index) => (
                    <div
                      key={project.id}
                      className="animate-fade-up h-full"
                      style={{ animationDelay: `${(index + 1) * 80}ms` }}
                    >
                      <ProjectCard
                        project={project}
                        primaryCtaHref={`/advisor/project/${project.id}`}
                        primaryCtaLabel="View Project"
                        showDeleteButton={false}
                        unread={!!unreadByProject[project.id]}
                        disableOrgLoading={true}
                        borrowerName={borrowerData[project.owner_org_id]?.name}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-sm text-center">
                  <p className="text-gray-500">No active projects found</p>
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
