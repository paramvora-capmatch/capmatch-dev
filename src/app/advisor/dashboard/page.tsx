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

        if (user.isDemo) {
          // --- DEMO MODE ---
          console.log("[AdvisorDashboard] Loading data for DEMO advisor.");

          // Use user data directly for demo mode
          const demoAdvisorProfile: Advisor = {
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
          setAdvisor(demoAdvisorProfile);

          const allProjects = await storageService.getItem<ProjectProfile[]>(
            "projects"
          );
          if (allProjects) {
            assignedProjects = allProjects.filter(
              (p) => p.assignedAdvisorUserId === user.email
            );
          }
        } else {
          // --- REAL USER MODE ---
          console.log(
            "[AdvisorDashboard] Loading data for REAL advisor from Supabase."
          );

          const realAdvisorProfile: Advisor = {
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
          setAdvisor(realAdvisorProfile);

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

                const userIds = owners?.map((o) => o.user_id) || [];
                const orgToUserMap =
                  owners?.reduce((acc, o) => {
                    if (o.org_id) {
                      acc[o.org_id] = o.user_id;
                    }
                    return acc;
                  }, {} as Record<string, string>) || {};

                // Step 2: Fetch profiles for those user_ids
                const { data: profiles, error: profilesError } = await supabase
                  .from("profiles")
                  .select("id, full_name, email")
                  .in("id", userIds);

                if (profilesError) throw profilesError;

                // Step 3: Create a map from org_id -> profile info
                const borrowerMap = ownerOrgIds.reduce((acc, orgId) => {
                  const userId = orgToUserMap[orgId as string];
                  const profile = profiles.find((p) => p.id === userId);
                  if (profile) {
                    acc[orgId] = {
                      name: profile.full_name || profile.email,
                      email: profile.email,
                    };
                  }
                  return acc;
                }, {} as Record<string, { name: string; email: string }>);
                setBorrowerData(borrowerMap);
              }
            }
          }
        }

        setActiveProjects(assignedProjects);

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
      <DashboardLayout title="Advisor Dashboard" scrollableContent={true} hideTeamButton={true}>

        {/* Decorative Background Layer */}
        <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 bg-gray-200">

          {/* Subtle grid pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.5]">
            <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
              <defs>
                <pattern id="advisor-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#advisor-grid)" />
            </svg>
          </div>


          {/* Main Content - centered with slightly reduced horizontal padding; translated down to make room for blob */}
          <div className="relative z-[1] mx-auto px-3 sm:px-5 lg:px-32 pt-20 pb-6">
            {/* Darker background container with its own subtle grid */}
            <div className="relative overflow-hidden">
              <div className="pointer-events-none absolute inset-0 opacity-[0.25]">
                <svg className="absolute inset-0 h-full w-full text-slate-300" aria-hidden="true">
                  <defs>
                    <pattern id="advisor-inner-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#advisor-inner-grid)" />
                </svg>
              </div>

              <div className="relative p-6 sm:p-8 lg:p-10">
                <div className="space-y-6">
                  {/* Dashboard greeting */}
                  <div className="p-6">
                    <h2 className="text-2xl sm:text-3xl font-semibold mb-2">
                      Welcome back, {advisor?.name || "Advisor"}
                    </h2>
                    <p className="text-gray-600">
                      You have {activeProjects.length} active projects.
                    </p>
                  </div>

                  {/* removed status metrics grid */}

                  {/* Projects */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-gray-800">
                        Your Active Projects
                      </h2>
                    </div>

                    {activeProjects.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeProjects.map((project, index) => (
                          <div
                            key={project.id}
                            className="animate-fade-up"
                            style={{ animationDelay: `${index * 80}ms` }}
                          >
                            <ProjectCard
                              project={project}
                              primaryCtaHref={`/advisor/project/${project.id}`}
                              primaryCtaLabel="View Project"
                              showDeleteButton={false}
                              unread={!!unreadByProject[project.id]}
                              disableOrgLoading={true}
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
                  {/* removed Recent Messages section */}
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
