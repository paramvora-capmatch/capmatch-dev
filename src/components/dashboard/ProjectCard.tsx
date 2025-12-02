// src/components/dashboard/ProjectCard.tsx
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/Button";
import { DeleteConfirmModal } from "../ui/DeleteConfirmModal";
import {
  ChevronRight,
  CheckCircle,
  Trash2,
  Calendar,
  Building,
  FileSpreadsheet,
  Users,
  MoreVertical,
} from "lucide-react";
import { ProjectProfile } from "@/types/enhanced-types";
import { useProjectStore as useProjects } from "@/stores/useProjectStore";
import { useOrgStore } from "@/stores/useOrgStore";
import { useAuthStore } from "@/stores/useAuthStore";
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
  borrowerName?: string; // Borrower name for advisor view
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  primaryCtaHref,
  primaryCtaLabel,
  onPrimaryCtaClick,
  showDeleteButton = true,
  unread = false,
  disableOrgLoading = false,
  borrowerName,
}) => {
  const router = useRouter();
  const { deleteProject } = useProjects();
  const { isOwner, currentOrg, members: orgMembers, loadOrg, isLoading: orgLoading } = useOrgStore();
  const user = useAuthStore((state) => state.user);
  const isAdvisor = user?.role === "advisor";
  
  // Debug logging for borrower name
  useEffect(() => {
    if (disableOrgLoading && isAdvisor) {
      console.log('[ProjectCard] Borrower name prop:', borrowerName, 'for project:', project.id, 'org:', project.owner_org_id);
    }
  }, [borrowerName, project.id, project.owner_org_id, disableOrgLoading, isAdvisor]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const unwrapValue = (val: any) => {
    if (val && typeof val === "object" && "value" in val) {
      return (val as any).value;
    }
    if (
      val &&
      typeof val === "object" &&
      !("value" in val) &&
      "original_value" in val
    ) {
      return (val as any).original_value;
    }
    return val;
  };

  const rawProjectProgress = Number(unwrapValue(project.completenessPercent)) || 0;
  const rawBorrowerProgress = Number(unwrapValue(project.borrowerProgress)) || 0;
  const overallProgress = Math.round(
    (rawProjectProgress + rawBorrowerProgress) / 2
  );
  const isComplete = overallProgress === 100;
  // OM access is based on project resume completion only, not overall completion
  const isOmReady = rawProjectProgress === 100;

  // Check if current user is owner of the project's owner org
  const isProjectOwner = isOwner && currentOrg?.id === project.owner_org_id;
  // Show members for owners or advisors
  const shouldShowMembers = isProjectOwner || isAdvisor;

  // Ensure org is loaded for this project (skip when disabled)
  useEffect(() => {
    const ensureOrgLoaded = async () => {
      if (disableOrgLoading) return;
      if (!project.owner_org_id) return;

      const { currentOrg: currentOrgState } = useOrgStore.getState();
      // Only load if we haven't loaded this org yet
      if (currentOrgState?.id !== project.owner_org_id) {
        await loadOrg(project.owner_org_id);
      }
    };

    ensureOrgLoaded();
  }, [project.owner_org_id, loadOrg, disableOrgLoading]);

  // Fetch project members if user is an owner or advisor
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!project.id) {
        setProjectMembers([]);
        return;
      }

      // For advisors, fetch members directly using project_access_grants
      if (isAdvisor && disableOrgLoading) {
        setIsLoadingMembers(true);
        try {
          console.log('[ProjectCard] Fetching project members for advisor, project:', project.id);
          
          // Get all users who have been granted access to this project
          const { data: grants, error: grantsError } = await supabase
            .from('project_access_grants')
            .select('user_id, org_id, granted_by')
            .eq('project_id', project.id);

          if (grantsError) {
            console.error('[ProjectCard] Failed to fetch project grants:', grantsError);
            setProjectMembers([]);
            setIsLoadingMembers(false);
            return;
          }

          console.log('[ProjectCard] Fetched grants for project:', project.id, 'Grants:', grants);

          // Collect all user IDs from grants
          const userIdsFromGrants = new Set<string>(grants?.map(g => g.user_id) || []);
          console.log('[ProjectCard] User IDs from grants:', Array.from(userIdsFromGrants));
          
          // Add assigned advisor if exists
          if (project.assignedAdvisorUserId) {
            userIdsFromGrants.add(project.assignedAdvisorUserId);
          }

          // Fetch profile information for all members using edge function
          if (userIdsFromGrants.size > 0) {
            const userIdsArray = Array.from(userIdsFromGrants);
            
            const { data: memberBasicData, error: basicDataError } = await supabase.functions.invoke(
              'get-user-data',
              {
                body: { userIds: userIdsArray },
              }
            );

            if (!basicDataError && memberBasicData) {
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
                .filter(m => m.userId);

              setProjectMembers(membersData);
            } else {
              console.error('[ProjectCard] Failed to fetch member data via edge function:', basicDataError);
              setProjectMembers([]);
            }
          } else {
            setProjectMembers([]);
          }
        } catch (err) {
          console.error('[ProjectCard] Error fetching project members for advisor:', err);
          setProjectMembers([]);
        } finally {
          setIsLoadingMembers(false);
        }
        return;
      }

      // For borrowers/owners, use the existing logic
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
        return;
      }

      setIsLoadingMembers(true);
      try {
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

        // Collect all user IDs from grants - these are ALL members with explicit project access
        const userIdsFromGrants = new Set<string>(grants?.map(g => g.user_id) || []);
        
        // Also include all org owners (they have implicit access even if not in grants)
        // This ensures owners are shown even if they don't have explicit grants
        orgMembers
          .filter(m => m.role === 'owner')
          .forEach(m => {
            userIdsFromGrants.add(m.user_id);
          });
        
        // Add assigned advisor if exists
        if (project.assignedAdvisorUserId) {
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

            setProjectMembers(membersData);
          } else {
            console.error('[ProjectCard] Failed to fetch member data via edge function:', basicDataError);
            setProjectMembers([]);
          }
        } else {
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
  }, [isOwner, currentOrg, project.id, project.owner_org_id, project.assignedAdvisorUserId, orgMembers, orgLoading, disableOrgLoading, isAdvisor, user]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

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
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error("Failed to delete project", error);
      // Optionally show an error toast message here
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="group relative h-full">
      {/* Subtle blue hover shadow under the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-3 bottom-3 h-8 rounded-2xl bg-blue-400/40 blur-xl opacity-0 transition-opacity duration-300 group-hover:opacity-70 -z-10"
      />
      <Card 
        className="h-full flex flex-col rounded-xl overflow-hidden bg-white border border-gray-200 transition-all duration-300 group-hover:border-blue-200 group-hover:shadow-lg group-hover:-translate-y-0.5 cursor-pointer min-h-[210px] md:min-h-[250px] lg:min-h-[280px]"
        onClick={() => {
          if (primaryCtaHref) {
            router.push(primaryCtaHref);
          } else {
            router.push(`/project/workspace/${project.id}`);
          }
        }}
      >
        {/* Completion status indicator bar */}
        <div className="h-2 bg-gray-100">
          <div
            className={`h-full transition-all duration-500 ${
              isComplete
                ? "bg-gradient-to-r from-emerald-500 to-green-500"
                : "bg-blue-600"
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>

        <CardContent className="p-6 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-4 gap-2">
            <h3
              className="text-2xl font-bold text-gray-800 truncate mr-3"
              title={
                (unwrapValue(project.projectName) as string) ||
                "Unnamed Project"
              }
            >
              {unwrapValue(project.projectName) || "Unnamed Project"}
              {unread && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-semibold">
                  New Messages
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2 flex-shrink-0">
              {showDeleteButton && (
                <div className="relative" ref={menuRef}>
                  <button
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(!isMenuOpen);
                    }}
                    aria-label="More options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          setIsDeleteModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 mb-5">
            {/* Borrower Name - Show for advisors only if borrowerName is provided */}
            {isAdvisor && borrowerName && borrowerName.trim() && (
              <div className="flex items-center text-sm text-gray-600">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0 ${isComplete ? 'bg-green-100' : 'bg-blue-100'}`}>
                  <Users className={`h-4 w-4 ${isComplete ? 'text-green-600' : 'text-blue-600'}`} />
                </div>
                <span>
                  Borrower:{" "}
                  <span className="font-medium">
                    {borrowerName}
                  </span>
                </span>
              </div>
            )}

            <div className="flex items-center text-sm text-gray-600">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0 ${isComplete ? 'bg-green-100' : 'bg-blue-100'}`}>
                <Building className={`h-4 w-4 ${isComplete ? 'text-green-600' : 'text-blue-600'}`} />
              </div>
              <span className="font-medium">
                {unwrapValue(project.assetType) || "Asset Type TBD"}
              </span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0 ${isComplete ? 'bg-green-100' : 'bg-blue-100'}`}>
                <Calendar className={`h-4 w-4 ${isComplete ? 'text-green-600' : 'text-blue-600'}`} />
              </div>
              <span>
                Updated:{" "}
                <span className="font-medium">
                  {formatDate(
                    unwrapValue(project.updatedAt) as string | undefined
                  )}
                </span>
              </span>
            </div>

            {/* Project Members - Visible to owners and advisors */}
            {shouldShowMembers && (
              <div className="flex items-start text-sm text-gray-600">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5 ${isComplete ? 'bg-green-100' : 'bg-blue-100'}`}>
                  <Users className={`h-4 w-4 ${isComplete ? 'text-green-600' : 'text-blue-600'}`} />
                </div>
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

          <div className="mb-5 mt-auto space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-gray-500">Overall Progress</span>
                <span
                  className={`font-semibold ${
                    isComplete ? "text-green-600" : "text-blue-600"
                  }`}
                >
                  {overallProgress}%
                </span>
              </div>

              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 shadow-sm ${
                    isComplete
                      ? "bg-gradient-to-r from-emerald-500 to-green-500"
                      : "bg-blue-600"
                  }`}
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>

            {isOmReady ? (
              <div className="flex items-center justify-center text-xs text-green-700 bg-green-50 rounded-md py-1">
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                OM Ready
              </div>
            ) : (
              <div className="h-0.5" aria-hidden="true" />
            )}
          </div>

          <div className="space-y-3 flex-shrink-0">
            {!isOmReady ? (
              <span 
                className="block w-full" 
                title="Complete the project resume to unlock the OM"
              >
                <Button
                  variant="outline"
                  fullWidth
                  size="sm"
                  disabled={true}
                  className="border-gray-300 text-gray-700 bg-transparent cursor-not-allowed opacity-60 font-medium"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  View OM
                </Button>
              </span>
            ) : (
              <Button
                variant="outline"
                fullWidth
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/project/om/${project.id}`);
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-medium border-green-600"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                View OM
              </Button>
            )}

            <Button
              variant="outline"
              fullWidth
              size="sm"
              rightIcon={<ChevronRight size={16} />}
              onClick={(e) => {
                e.stopPropagation();
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
              className={[
                "font-medium",
                !isComplete
                  ? "border-blue-500 text-blue-600 hover:bg-blue-50 shadow-[0_0_0_2px_rgba(59,130,246,0.15)] hover:border-blue-500"
                  : "",
              ].join(" ")}
            >
              {primaryCtaLabel || (isComplete ? "Review Project" : "Continue Setup")}
            </Button>
          </div>
        </CardContent>
      </Card>
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${project.projectName}"? This action cannot be undone and will also delete all associated files and documents.`}
        confirmLabel="Delete Project"
        cancelLabel="Cancel"
        isLoading={isDeleting}
      />
    </div>
  );
};
