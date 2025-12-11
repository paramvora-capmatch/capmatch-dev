// src/app/advisor/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { RoleBasedRoute } from "../../../components/auth/RoleBasedRoute";
import { useAuth } from "../../../hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Advisor,
  ProjectProfile,
} from "../../../types/enhanced-types";
import { supabase } from "../../../../lib/supabaseClient";
import { getProjectsWithResumes, BorrowerResumeContent } from "@/lib/project-queries";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { useProjectMembers } from "../../../hooks/useProjectMembers";

// =============================================================================
// Type Definitions
// =============================================================================

type BorrowerData = Record<string, { name: string; email: string }>;
type UnreadMap = Record<string, boolean>;

interface BorrowerResumeRow {
  project_id: string;
  content: BorrowerResumeContent;
  created_at: string;
}

interface RichFieldValue {
  value: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extracts a string value from a field that can be either a string or rich data format
 */
function extractFieldValue(field: string | RichFieldValue | undefined): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  if (typeof field === "object" && "value" in field) {
    return field.value || "";
  }
  return "";
}

/**
 * Creates an advisor profile from user data
 */
function createAdvisorProfile(user: { id?: string; email: string; name?: string }): Advisor {
  return {
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
}

/**
 * Fetches and processes borrower resumes to extract borrower information
 * Returns a map from org_id to borrower name and email
 */
async function fetchBorrowerData(
  projectIds: string[],
  projects: ProjectProfile[]
): Promise<BorrowerData> {
  if (projectIds.length === 0) return {};

  console.log("[AdvisorDashboard] Fetching borrower resumes for projects:", projectIds);

  const { data: borrowerResumes, error: borrowerResumesError } = await supabase
    .from("borrower_resumes")
    .select("project_id, content, created_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  if (borrowerResumesError) {
    console.error("[AdvisorDashboard] Failed to fetch borrower resumes:", borrowerResumesError);
    return {};
  }

  console.log("[AdvisorDashboard] Fetched borrower resumes:", borrowerResumes?.length || 0);

  // Create a map from project_id -> latest borrower resume content
  const projectToResume = new Map<string, BorrowerResumeContent>();
  (borrowerResumes as BorrowerResumeRow[] || []).forEach((br) => {
    if (!projectToResume.has(br.project_id)) {
      projectToResume.set(br.project_id, br.content);
    }
  });

  // Create a map from org_id -> borrower info
  const borrowerMap: BorrowerData = {};

  projects.forEach((project) => {
    if (!project.owner_org_id || !project.id) return;

    const resumeContent = projectToResume.get(project.id);
    if (!resumeContent) {
      console.log(`[AdvisorDashboard] No borrower resume found for project ${project.id}`);
      return;
    }

    const fullLegalName = extractFieldValue(
      resumeContent.fullLegalName as string | RichFieldValue | undefined
    ).trim();

    if (!fullLegalName) {
      console.log(`[AdvisorDashboard] No fullLegalName found for project ${project.id}`);
      return;
    }

    // Only add if not already in map (first project for this org wins)
    if (!borrowerMap[project.owner_org_id]) {
      const contactEmail = extractFieldValue(
        resumeContent.contactEmail as string | RichFieldValue | undefined
      );

      borrowerMap[project.owner_org_id] = {
        name: fullLegalName,
        email: contactEmail,
      };
    }
  });

  console.log("[AdvisorDashboard] Borrower data map (from resumes):", borrowerMap);
  return borrowerMap;
}

/**
 * Computes unread indicators for each project based on latest message author
 */
async function computeUnreadIndicators(
  projectIds: string[],
  advisorUserId: string
): Promise<UnreadMap> {
  if (projectIds.length === 0 || !advisorUserId) return {};

  const { data: threads, error: threadsError } = await supabase
    .from("chat_threads")
    .select("id, project_id")
    .in("project_id", projectIds);

  if (threadsError) {
    console.error("[AdvisorDashboard] Failed to fetch chat threads:", threadsError);
    return {};
  }

  if (!threads || threads.length === 0) return {};

  const threadIds = threads.map((t) => t.id);
  const { data: messages, error: messagesError } = await supabase
    .from("project_messages")
    .select("thread_id, user_id, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (messagesError) {
    console.error("[AdvisorDashboard] Failed to fetch messages:", messagesError);
    return {};
  }

  // Map thread_id to project_id
  const threadToProject: Record<string, string> = {};
  threads.forEach((t) => {
    threadToProject[t.id as string] = t.project_id as string;
  });

  // Get latest message per project
  const latestByProject = new Map<string, { user_id: string }>();
  (messages || []).forEach((m: { thread_id: string; user_id: string }) => {
    const projectId = threadToProject[m.thread_id];
    if (projectId && !latestByProject.has(projectId)) {
      latestByProject.set(projectId, { user_id: m.user_id });
    }
  });

  // Build unread map: true if latest message is not from advisor
  const unreadMap: UnreadMap = {};
  projectIds.forEach((projectId) => {
    const latest = latestByProject.get(projectId);
    unreadMap[projectId] = latest ? latest.user_id !== advisorUserId : false;
  });

  return unreadMap;
}

// =============================================================================
// Main Component
// =============================================================================

export default function AdvisorDashboardPage() {
  const { user } = useAuth();

  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [activeProjects, setActiveProjects] = useState<ProjectProfile[]>([]);
  const [borrowerData, setBorrowerData] = useState<BorrowerData>({});
  const [unreadByProject, setUnreadByProject] = useState<UnreadMap>({});

  // Batch fetch project members for advisor view at the list level
  const { membersByProjectId, isLoading: membersLoading } = useProjectMembers(activeProjects, true);

  useEffect(() => {
    const loadAdvisorData = async () => {
      if (!user || user.role !== "advisor") return;

      try {
        console.log("[AdvisorDashboard] Loading data for advisor from Supabase.");

        // Set advisor profile
        const advisorProfile = createAdvisorProfile(user);
        setAdvisor(advisorProfile);

        // Fetch assigned projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("*")
          .eq("assigned_advisor_id", user.id);

        if (projectsError) {
          throw new Error(`Failed to fetch projects: ${projectsError.message}`);
        }

        if (!projectsData || projectsData.length === 0) {
          setActiveProjects([]);
          setBorrowerData({});
          setUnreadByProject({});
          return;
        }

        // Get projects with resumes
        const projectIds = projectsData.map((p) => p.id);
        const assignedProjects = await getProjectsWithResumes(projectIds);
        setActiveProjects(assignedProjects);
        console.log("[AdvisorDashboard] Active projects set:", assignedProjects.length);

        // Fetch borrower data and unread indicators in parallel
        const [borrowerDataResult, unreadMap] = await Promise.all([
          fetchBorrowerData(projectIds, assignedProjects),
          computeUnreadIndicators(projectIds, user.id!),
        ]);

        setBorrowerData(borrowerDataResult);
        setUnreadByProject(unreadMap);
      } catch (error) {
        console.error("[AdvisorDashboard] Error loading advisor data:", error);
        // Set empty states on error to prevent stale data
        setActiveProjects([]);
        setBorrowerData({});
        setUnreadByProject({});
      }
    };

    loadAdvisorData();
  }, [user]);

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
                              borrowerName={borrowerData[project.owner_org_id]?.name}
                              showMembers={true}
                              members={membersByProjectId[project.id]}
                              isMembersLoading={membersLoading}
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
