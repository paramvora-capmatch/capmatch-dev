import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useOrgStore } from '../stores/useOrgStore';
import { useAuthStore } from '../stores/useAuthStore';
import { ProjectProfile } from '@/types/enhanced-types';

export interface ProjectMember {
    userId: string;
    userName: string;
    userEmail: string;
}

export const useProjectMembers = (
    projects: ProjectProfile[],
    disableOrgLoading: boolean = false
) => {
    const [membersByProjectId, setMembersByProjectId] = useState<Record<string, ProjectMember[]>>({});
    const [isLoading, setIsLoading] = useState(false);

    const { currentOrg, members: orgMembers } = useOrgStore();
    const user = useAuthStore((state) => state.user);
    const isAdvisor = user?.role === "advisor";

    // Create a stable key for projects to prevent unnecessary re-fetches
    const projectsKey = projects
        .map(p => `${p.id}:${p.assignedAdvisorUserId}:${p.owner_org_id}`)
        .sort()
        .join('|');

    useEffect(() => {
        const fetchAllMembers = async () => {
            if (!projects || projects.length === 0) {
                setMembersByProjectId({});
                return;
            }

            // 1. Identify projects that need member fetching
            // We fetch for all projects passed in; RLS will ensure we only see
            // grants for projects the current user is allowed to see.
            const projectsToFetch: ProjectProfile[] = [...projects];

            setIsLoading(true);
            try {
                const projectIds = projectsToFetch.map(p => p.id);

                // 2. Fetch grants for these projects
                let query = supabase
                    .from('project_access_grants')
                    .select('project_id, user_id, org_id, granted_by')
                    .in('project_id', projectIds);

                // If owner/borrower, restrict to current org to be safe
                if (!isAdvisor && currentOrg) {
                    query = query.eq('org_id', currentOrg.id);
                }

                const { data: grants, error: grantsError } = await query;

                if (grantsError) {
                    console.error('[useProjectMembers] Failed to fetch project grants:', grantsError);
                    setMembersByProjectId({});
                    return;
                }

                // 3. Process grants and collect user IDs
                const projectUserMap = new Map<string, Set<string>>(); // projectId -> Set<userId>
                const allUserIds = new Set<string>();

                // Initialize map for all projects
                projectIds.forEach(id => projectUserMap.set(id, new Set()));

                // Add grantees
                grants?.forEach(grant => {
                    const set = projectUserMap.get(grant.project_id);
                    if (set) {
                        set.add(grant.user_id);
                        allUserIds.add(grant.user_id);
                    }
                });

                // Add org owners (when we have org member data for the owning org)
                if (!isAdvisor && orgMembers && currentOrg) {
                    const ownerIds = orgMembers
                        .filter(m => m.role === 'owner')
                        .map(m => m.user_id);

                    projectIds.forEach(pid => {
                        const set = projectUserMap.get(pid);
                        if (set) {
                            ownerIds.forEach(uid => {
                                set.add(uid);
                                allUserIds.add(uid);
                            });
                        }
                    });
                }

                // Add assigned advisors
                projectsToFetch.forEach(p => {
                    if (p.assignedAdvisorUserId) {
                        const set = projectUserMap.get(p.id);
                        if (set) {
                            set.add(p.assignedAdvisorUserId);
                            allUserIds.add(p.assignedAdvisorUserId);
                        }
                    }
                });

                interface UserBasicData {
                    id: string;
                    email: string | null;
                    full_name: string | null;
                }

                // 4. Batch fetch user profiles
                if (allUserIds.size > 0) {
                    const userIdsArray = Array.from(allUserIds);
                    console.log(`[useProjectMembers] Fetching profiles for ${userIdsArray.length} users:`, userIdsArray);

                    // Use direct RLS query instead of edge function
                    const { data: memberBasicData, error: basicDataError } = await supabase
                        .from('profiles')
                        .select('id, email, full_name')
                        .in('id', userIdsArray);

                    if (basicDataError) {
                        console.error('[useProjectMembers] Error fetching user data:', basicDataError);
                    } else {
                        console.log(`[useProjectMembers] Fetched ${memberBasicData?.length || 0} profiles`);
                    }

                    if (!basicDataError && memberBasicData) {
                        const basicById = new Map<string, UserBasicData>(
                            (memberBasicData || []).map((u: any) => [u.id, u])
                        );

                        // 5. Map back to projects
                        const result: Record<string, ProjectMember[]> = {};

                        projectUserMap.forEach((userIds, projectId) => {
                            const members: ProjectMember[] = [];
                            userIds.forEach(userId => {
                                const basic = basicById.get(userId);
                                if (basic) {
                                    members.push({
                                        userId,
                                        userName: (basic.full_name && basic.full_name.trim()) || basic.email || 'Unknown',
                                        userEmail: basic.email || '',
                                    });
                                }
                            });
                            result[projectId] = members;
                        });

                        setMembersByProjectId(result);
                    } else {
                        console.error('[useProjectMembers] Failed to fetch member data via edge function:', basicDataError);
                        setMembersByProjectId({});
                    }
                } else {
                    setMembersByProjectId({});
                }

            } catch (err) {
                console.error('[useProjectMembers] Error:', err);
                setMembersByProjectId({});
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllMembers();
    }, [
        projects,
        projectsKey,
        isAdvisor,
        currentOrg,
        currentOrg?.id,
        orgMembers
    ]);

    return { membersByProjectId, isLoading };
};
