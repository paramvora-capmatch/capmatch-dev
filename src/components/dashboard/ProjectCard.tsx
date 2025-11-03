// src/components/dashboard/ProjectCard.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/Button";
import {
  ChevronRight,
  CheckCircle,
  Trash2,
  Calendar,
  Building,
  TrendingUp,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { ProjectProfile } from "@/types/enhanced-types";
import { useProjectStore as useProjects } from "@/stores/useProjectStore";
import { useOrgStore } from "@/stores/useOrgStore";
import { supabase } from "../../../lib/supabaseClient";

interface ProjectMember {
  userId: string;
  userName: string;
  userEmail: string;
}

interface ProjectCardProps {
  project: ProjectProfile;
  primaryCtaHref?: string;
  primaryCtaLabel?: string;
  onPrimaryCtaClick?: (e: React.MouseEvent) => void;
  showDeleteButton?: boolean;
  unread?: boolean;
  disableOrgLoading?: boolean;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  primaryCtaHref,
  primaryCtaLabel,
  onPrimaryCtaClick,
  showDeleteButton = true,
  unread = false,
  disableOrgLoading = false,
}) => {
  const router = useRouter();
  const { deleteProject } = useProjects();
  const { isOwner, currentOrg, members: orgMembers, loadOrg, isLoading: orgLoading } = useOrgStore();
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const completeness = project.completenessPercent || 0;
  const isComplete = completeness === 100;

  // Check if current user is owner of the project's owner org
  const isProjectOwner = isOwner && currentOrg?.id === project.owner_org_id;

  // Ensure org is loaded for this project (skip when disabled)
  useEffect(() => {
    const ensureOrgLoaded = async () => {
      if (disableOrgLoading) return;
      if (!project.owner_org_id) return;

      const { currentOrg: currentOrgState } = useOrgStore.getState();
      // Only load if we haven't loaded this org yet
      if (currentOrgState?.id !== project.owner_org_id) {
        console.log(`[ProjectCard] Loading org data for: ${project.owner_org_id}`);
        await loadOrg(project.owner_org_id);
      }
    };

    ensureOrgLoaded();
  }, [project.owner_org_id, loadOrg, disableOrgLoading]);

  // Fetch project members if user is an owner (skip when disabled)
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (disableOrgLoading) {
        setProjectMembers([]);
        return;
      }
      // Wait for org to be loaded and check ownership
      if (!currentOrg || !isOwner || currentOrg.id !== project.owner_org_id || !project.id) {
        console.log('[ProjectCard] Skipping member fetch:', {
          hasCurrentOrg: !!currentOrg,
          isOwner,
          orgId: currentOrg?.id,
          projectOrgId: project.owner_org_id,
          projectId: project.id
        });
        setProjectMembers([]);
        return;
      }

      // Don't fetch if org is still loading or orgMembers not yet populated
      if (orgLoading) {
        console.log('[ProjectCard] Waiting for org to load...');
        return;
      }

      setIsLoadingMembers(true);
      try {
        console.log('[ProjectCard] Fetching project members for project:', project.id, 'owned by org:', project.owner_org_id);
        
        // Get all users who have been granted access to this project
        // As an owner, we should be able to see all grants for projects in our org
        const { data: grants, error: grantsError } = await supabase
          .from('project_access_grants')
          .select('user_id, org_id, granted_by')
          .eq('project_id', project.id)
          .eq('org_id', project.owner_org_id); // Explicitly filter by org_id to ensure we get all grants

        if (grantsError) {
          console.error('[ProjectCard] Failed to fetch project grants:', grantsError);
          setProjectMembers([]);
          setIsLoadingMembers(false);
          return;
        }

        console.log('[ProjectCard] Found grants:', grants?.length || 0, grants);
        console.log('[ProjectCard] Org members available:', orgMembers?.length || 0, orgMembers);

        // Collect all user IDs from grants - these are ALL members with explicit project access
        const userIdsFromGrants = new Set<string>(grants?.map(g => g.user_id) || []);
        console.log('[ProjectCard] User IDs from grants:', Array.from(userIdsFromGrants));
        
        // Also include all org owners (they have implicit access even if not in grants)
        // This ensures owners are shown even if they don't have explicit grants
        orgMembers
          .filter(m => m.role === 'owner')
          .forEach(m => {
            console.log('[ProjectCard] Adding org owner:', m.user_id);
            userIdsFromGrants.add(m.user_id);
          });
        
        console.log('[ProjectCard] Total unique user IDs after adding owners:', userIdsFromGrants.size, Array.from(userIdsFromGrants));
        
        // Add assigned advisor if exists
        if (project.assignedAdvisorUserId) {
          console.log('[ProjectCard] Adding assigned advisor:', project.assignedAdvisorUserId);
          userIdsFromGrants.add(project.assignedAdvisorUserId);
        }

        // Fetch profile information for all members using edge function to bypass RLS
        // The profiles table has RLS that only allows users to see their own profile,
        // so we need to use the get-user-data edge function like the org store does
        if (userIdsFromGrants.size > 0) {
          const userIdsArray = Array.from(userIdsFromGrants);
          
          const { data: memberBasicData, error: basicDataError } = await supabase.functions.invoke(
            'get-user-data',
            {
              body: { userIds: userIdsArray },
            }
          );

          if (!basicDataError && memberBasicData) {
            console.log('[ProjectCard] Fetched user data:', memberBasicData?.length || 0, memberBasicData);
            
            // Create a map for easy lookup
            const basicById = new Map(
              (memberBasicData || []).map((u: { id: string; email: string | null; full_name: string | null }) => [u.id, u])
            );

            const membersData: ProjectMember[] = userIdsArray
              .map(userId => {
                const basic = basicById.get(userId) as { id: string; email: string | null; full_name: string | null } | undefined;
                return {
                  userId,
                  userName: (basic?.full_name && basic.full_name.trim()) || basic?.email || 'Unknown',
                  userEmail: basic?.email || '',
                };
              })
              .filter(m => m.userId); // Filter out any invalid entries

            console.log('[ProjectCard] Setting project members:', membersData);
            setProjectMembers(membersData);
          } else {
            console.error('[ProjectCard] Failed to fetch member data via edge function:', basicDataError);
            setProjectMembers([]);
          }
        } else {
          console.log('[ProjectCard] No members found');
          setProjectMembers([]);
        }
      } catch (err) {
        console.error('[ProjectCard] Error fetching project members:', err);
        setProjectMembers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };

    fetchProjectMembers();
  }, [isOwner, currentOrg, project.id, project.owner_org_id, project.assignedAdvisorUserId, orgMembers, orgLoading, disableOrgLoading]);

  // Format date helper (could be moved to utils)
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid Date";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${project.projectName}"? This action cannot be undone.`
      )
    ) {
      try {
        await deleteProject(project.id);
        console.log("Project deleted successfully");
      } catch {
        console.error("Failed to delete project");
        // Optionally show an error toast message here
      }
    }
  };

  // Enhanced status color helper with gradients
  const getStatusColorClasses = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200";
      case "Info Gathering":
        return "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-200";
      case "Advisor Review":
        return "bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border border-amber-200";
      case "Matches Curated":
        return "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border border-purple-200";
      case "Introductions Sent":
        return "bg-gradient-to-r from-indigo-100 to-indigo-200 text-indigo-800 border border-indigo-200";
      case "Term Sheet Received":
        return "bg-gradient-to-r from-teal-100 to-teal-200 text-teal-800 border border-teal-200";
      case "Closed":
        return "bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-200";
      default:
        return "bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-200"; // For Stalled/Withdrawn
    }
  };

  return (
    <div className="group relative">
      <Card className="h-full flex flex-col rounded-xl overflow-hidden">
        {/* Completion status indicator bar */}
        <div className="h-1 bg-gray-100">
          <div
            className={`h-full transition-all duration-500 ${
              isComplete
                ? "bg-gradient-to-r from-emerald-500 to-green-500"
                : "bg-gradient-to-r from-blue-500 to-cyan-500"
            }`}
            style={{ width: `${completeness}%` }}
          />
        </div>

        <CardContent className="p-6 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-4 gap-2">
            <h3
              className="text-lg font-bold text-gray-800 truncate mr-3 group-hover:text-blue-800 transition-colors duration-200"
              title={project.projectName || "Unnamed Project"}
            >
              {project.projectName || "Unnamed Project"}
              {unread && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-semibold">
                  New Messages
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-sm ${getStatusColorClasses(
                  project.projectStatus
                )}`}
              >
                {project.projectStatus === "Closed" ? (
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                )}
                {project.projectStatus}
              </span>
              {showDeleteButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="h-6 w-6 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-full"
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-center text-sm text-gray-600">
              <Building className="h-4 w-4 mr-2 text-blue-600 flex-shrink-0" />
              <span className="font-medium">
                {project.assetType || "Asset Type TBD"}
              </span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2 text-green-600 flex-shrink-0" />
              <span>
                Updated:{" "}
                <span className="font-medium">
                  {formatDate(project.updatedAt)}
                </span>
              </span>
            </div>

            {/* Project Members - Only visible to owners */}
            {isProjectOwner && (
              <div className="flex items-start text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {isLoadingMembers ? (
                    <span className="text-gray-400">Loading members...</span>
                  ) : projectMembers.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-700">Members:</span>
                      {projectMembers.map((member, index) => (
                        <span
                          key={member.userId}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-xs font-medium text-gray-700 truncate max-w-[120px]"
                          title={member.userEmail || member.userName}
                        >
                          {member.userName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">No members assigned</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mb-5 mt-auto">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-gray-500">Progress</span>
              <span
                className={`font-semibold ${
                  isComplete ? "text-green-600" : "text-blue-600"
                }`}
              >
                {completeness}%
              </span>
            </div>

            <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 shadow-sm ${
                  isComplete
                    ? "bg-gradient-to-r from-emerald-500 to-green-500"
                    : "bg-gradient-to-r from-blue-500 to-cyan-500"
                }`}
                style={{ width: `${completeness}%` }}
              />
            </div>

            {isComplete && (
              <div className="flex items-center justify-center mt-2 text-xs text-green-700 bg-green-50 rounded-md py-1">
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                OM Ready
              </div>
            )}
          </div>

          <div className="space-y-3 flex-shrink-0">
            {isComplete && (
              <Button
                variant="outline"
                fullWidth
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/project/om/${project.id}`);
                }}
                className="border-gray-200 hover:border-green-300 hover:bg-green-50/70 hover:text-green-700 font-medium"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                View OM
              </Button>
            )}

            <Button
              variant="primary"
              fullWidth
              size="sm"
              rightIcon={<ChevronRight size={16} />}
              onClick={(e) => {
                if (onPrimaryCtaClick) {
                  onPrimaryCtaClick(e);
                  return;
                }
                if (primaryCtaHref) {
                  router.push(primaryCtaHref);
                  return;
                }
                router.push(`/project/workspace/${project.id}`);
              }}
              className="font-medium"
            >
              {primaryCtaLabel || (isComplete ? "Open Workspace" : "Continue Setup")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
