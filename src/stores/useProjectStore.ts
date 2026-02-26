// src/stores/useProjectStore.ts
import { create } from "zustand";
import {
	getProjectsWithResumes,
	getProjectWithResume,
	ProjectResumeContent,
	BorrowerResumeContent,
} from "@/lib/project-queries";
import { supabase } from "../../lib/supabaseClient";
import { apiClient } from "@/lib/apiClient";
import { useAuthStore } from "./useAuthStore";
import { usePermissionStore } from "./usePermissionStore"; // Import the new store
import { ProjectProfile } from "@/types/enhanced-types";
import {
	computeBorrowerCompletion,
	computeProjectCompletion,
} from "@/utils/resumeCompletion";

// Maps ProjectProfile fields to core projects table columns
const projectProfileToDbProject = (
	profileData: Partial<ProjectProfile>
): Record<string, unknown> => {
	const dbData: Record<string, unknown> = {};
	const keyMap: { [key in keyof ProjectProfile]?: string } = {
		projectName: "name", // Map to name in new schema
		assignedAdvisorUserId: "assigned_advisor_id", // Map to assigned_advisor_id in new schema
	};
	for (const key in profileData) {
		const mappedKey = keyMap[key as keyof ProjectProfile];
		if (mappedKey) {
			dbData[mappedKey] = profileData[key as keyof ProjectProfile];
		}
	}
	return dbData;
};

// Maps ProjectProfile fields to project_resumes.content JSONB column
const projectProfileToResumeContent = (
	profileData: Partial<ProjectProfile>
): Partial<ProjectResumeContent> => {
	const resumeContent: Partial<ProjectResumeContent> = {};

	// Skip these internal/metadata fields that shouldn't be saved to resume content
	const skipFields = new Set([
		"id",
		"owner_org_id",
		"assignedAdvisorUserId",
		"createdAt",
		"updatedAt",
		"_metadata",
		"_lockedFields",
		"_fieldStates",
		"_lockedSections",
		"projectSections",
		"borrowerSections",
		"borrowerProgress",
		"completenessPercent", // Stored in separate column, not in content
	]);

	// Preserve ALL fields from profileData that are valid ProjectResumeContent fields
	// This ensures autofilled fields are not lost during auto-save
	for (const key in profileData) {
		// Skip internal/metadata fields
		if (skipFields.has(key)) continue;

		// Skip functions and undefined values
		const value = (profileData as any)[key];
		if (typeof value === "function" || value === undefined) continue;

		// Special handling for date field to convert empty string to null
		if (key === "targetCloseDate" && value === "") {
			(resumeContent as any)[key] = null;
		} else {
			// Preserve all fields - this ensures autofilled fields aren't lost
			(resumeContent as any)[key] = value;
		}
	}
	return resumeContent;
};

const parsePercentage = (value: unknown): number => {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = parseFloat(value);
		return Number.isFinite(parsed) ? parsed : 0;
	}
	return 0;
};

interface ProjectState {
	projects: ProjectProfile[];
	isLoading: boolean;
	activeProject: ProjectProfile | null;
}

interface ProjectActions {
	loadUserProjects: () => Promise<void>;
	refreshProject: (projectId: string) => Promise<void>;
	createProject: (
		projectData: Partial<ProjectProfile>
	) => Promise<ProjectProfile>;
	updateProject: (
		id: string,
		updates: Partial<ProjectProfile>
	) => Promise<ProjectProfile | null>;
	deleteProject: (id: string) => Promise<boolean>;
	getProject: (id: string) => ProjectProfile | null;
	setActiveProject: (project: ProjectProfile | null) => void;
	resetProjectState: () => void;
	calculateProgress: (project: ProjectProfile) => {
		borrowerProgress: number;
		completenessPercent: number;
		totalProgress: number;
	};
}

export const useProjectStore = create<ProjectState & ProjectActions>(
	(set, get) => ({
		projects: [],
		isLoading: true,
		activeProject: null,

		resetProjectState: () => {
			set({ projects: [], activeProject: null, isLoading: false });
		},

		calculateProgress: (project) => {
			const projectResumeContent =
				(project.projectSections as ProjectResumeContent | undefined) ||
				null;
			const borrowerContent =
				(project.borrowerSections as
					| BorrowerResumeContent
					| undefined) || null;

			// Prefer stored values from project profile (fetched from DB columns)
			// Only calculate if stored values are missing/invalid
			const storedCompletenessPercent = project.completenessPercent;
			const storedBorrowerProgress = project.borrowerProgress;

			const completenessPercent =
				storedCompletenessPercent !== undefined &&
				storedCompletenessPercent !== null &&
				typeof storedCompletenessPercent === "number" &&
				storedCompletenessPercent >= 0
					? storedCompletenessPercent
					: computeProjectCompletion(project);

			const borrowerProgress =
				storedBorrowerProgress !== undefined &&
				storedBorrowerProgress !== null &&
				typeof storedBorrowerProgress === "number" &&
				storedBorrowerProgress >= 0
					? storedBorrowerProgress
					: computeBorrowerCompletion(borrowerContent);

			const totalProgress = Math.round(
				(completenessPercent + borrowerProgress) / 2
			);

			return {
				borrowerProgress,
				completenessPercent,
				totalProgress,
			};
		},

		loadUserProjects: async () => {
			const { user } = useAuthStore.getState();
			if (!user) {
				get().resetProjectState();
				return;
			}

			set({ isLoading: true });

			try {
				// RLS will only return projects the user has been granted access to.
				// First, fetch projects without the resources join to avoid RLS issues
				const { data: projectsData, error: projectsError } =
					await supabase.from("projects").select("id, name, owner_org_id, assigned_advisor_id, created_at, updated_at");

				if (projectsError) {
					const errorMessage =
						projectsError instanceof Error
							? projectsError.message
							: typeof projectsError === "object" &&
							  projectsError !== null
							? JSON.stringify(projectsError)
							: String(projectsError) || "Unknown error";

					console.error("[ProjectStore] ❌ Projects query failed:", {
						message: errorMessage,
						error: projectsError,
						code: (projectsError as any)?.code,
						details: (projectsError as any)?.details,
						hint: (projectsError as any)?.hint,
					});
					throw new Error(`Failed to load projects: ${errorMessage}`);
				}

				// Then fetch resources separately for each project to avoid RLS join issues
				const projectIds = projectsData?.map((p: any) => p.id) || [];
				let resourcesMap: Record<string, any[]> = {};

				if (projectIds.length > 0) {
					const { data: resourcesData, error: resourcesError } =
						await supabase
							.from("resources")
							.select("id, project_id, resource_type")
							.in("project_id", projectIds)
							.in("resource_type", [
								"PROJECT_DOCS_ROOT",
								"PROJECT_RESUME",
							]);

					if (resourcesError) {
						console.warn(
							"[ProjectStore] ⚠️ Failed to fetch resources (non-fatal):",
							resourcesError
						);
						// Continue without resources - this is non-fatal
					} else {
						// Group resources by project_id
						resourcesMap = (resourcesData || []).reduce(
							(acc: Record<string, any[]>, resource: any) => {
								if (!acc[resource.project_id]) {
									acc[resource.project_id] = [];
								}
								acc[resource.project_id].push(resource);
								return acc;
							},
							{}
						);
					}
				}

				// Combine projects with their resources
				const data =
					projectsData?.map((project: any) => ({
						...project,
						resources: resourcesMap[project.id] || [],
					})) || [];

				// Get project IDs for the new query function (reuse the same variable)
				const projectIdsForResumes =
					data?.map((project: any) => project.id) || [];

				// Use the new query function to get projects with resume content
				const userProjects = await getProjectsWithResumes(
					projectIdsForResumes
				);

				// Add resource IDs to each project
				const projectsWithResources = userProjects.map(
					(project: any) => {
						const projectData = data?.find(
							(p: any) => p.id === project.id
						);
						const projectDocsResource =
							projectData?.resources?.find(
								(r: any) =>
									r.resource_type === "PROJECT_DOCS_ROOT"
							);
						const projectResumeResource =
							projectData?.resources?.find(
								(r: any) => r.resource_type === "PROJECT_RESUME"
							);

						return {
							...project,
							projectDocsResourceId:
								projectDocsResource?.id || null,
							projectResumeResourceId:
								projectResumeResource?.id || null,
						};
					}
				);

				// Use stored completenessPercent from DB, with calculateProgress as fallback/validation
				// borrowerProgress from getProjectsWithResumes is the source of truth since it's calculated
				// directly from the borrower_resumes table content
				const projectsWithProgress = projectsWithResources.map((p) => {
					const calculated = get().calculateProgress(p);
					const completenessPercentValue =
						p.completenessPercent ?? calculated.completenessPercent;
					// Prefer borrowerProgress from getProjectsWithResumes (already calculated from DB)
					// Only use calculated if borrowerProgress is null/undefined (not if it's 0, as 0 is valid)
					const borrowerProgressValue =
						p.borrowerProgress !== null && p.borrowerProgress !== undefined
							? p.borrowerProgress
							: calculated.borrowerProgress;
					return {
						...p,
						completenessPercent: completenessPercentValue,
						borrowerProgress: borrowerProgressValue,
						totalProgress: Math.round(
							(completenessPercentValue + borrowerProgressValue) /
								2
						),
					};
				});

				// Update activeProject if it exists in the new list to keep UI in sync
				const currentActive = get().activeProject;
				let nextActiveProject = currentActive;

				if (currentActive) {
					const updatedActive = projectsWithProgress.find(
						(p) => p.id === currentActive.id
					);
					if (updatedActive) {
						// Preserve borrower resource IDs from current active project
						// since loadUserProjects doesn't fetch borrower resources
						nextActiveProject = {
							...updatedActive,
							borrowerResumeResourceId: currentActive?.borrowerResumeResourceId ?? updatedActive.borrowerResumeResourceId ?? null,
							borrowerDocsResourceId: currentActive?.borrowerDocsResourceId ?? updatedActive.borrowerDocsResourceId ?? null,
						};
					}
				}

				set({
					projects: projectsWithProgress,
					isLoading: false,
					activeProject: nextActiveProject,
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: typeof error === "object" && error !== null
						? JSON.stringify(error)
						: String(error) || "Unknown error";

				console.error("[ProjectStore] Failed to load projects:", {
					message: errorMessage,
					error: error,
					user: user?.id,
					userRole: user?.role,
				});
				set({ projects: [], isLoading: false });
			}
		},

		refreshProject: async (projectId: string) => {
			try {
				console.log(`[ProjectStore] 🔄 refreshProject called for project ${projectId}`);
				
				// Always prefer activeProject if it matches, as it has the most complete resource IDs
				// The projects array may not have borrower resource IDs (loadUserProjects doesn't fetch them)
				const currentActive = get().activeProject;
				const existingProject = currentActive?.id === projectId 
					? currentActive 
					: get().projects.find(p => p.id === projectId) || currentActive;
				
				console.log(`[ProjectStore] 📦 Existing project resource IDs:`, {
					projectDocsResourceId: existingProject?.projectDocsResourceId,
					projectResumeResourceId: existingProject?.projectResumeResourceId,
					borrowerResumeResourceId: existingProject?.borrowerResumeResourceId,
					borrowerDocsResourceId: existingProject?.borrowerDocsResourceId,
					hasExistingProject: !!existingProject,
					existingProjectId: existingProject?.id,
					source: currentActive?.id === projectId ? 'activeProject' : 'projectsArray',
				});

				// 1. Fetch latest project data
				const updatedProject = await getProjectWithResume(projectId);
				
				console.log(`[ProjectStore] 📥 Updated project from getProjectWithResume:`, {
					projectResumeResourceId: updatedProject.projectResumeResourceId,
					hasProjectResumeResourceId: !!updatedProject.projectResumeResourceId,
				});
				
				// 2. Calculate progress
				const progressResult = get().calculateProgress(updatedProject);
				const finalProject = {
					...updatedProject,
					...progressResult,
					completenessPercent: progressResult.completenessPercent,
					// Preserve resource IDs from existing project state as they are not returned by getProjectWithResume
					projectDocsResourceId: existingProject?.projectDocsResourceId ?? null,
					borrowerResumeResourceId: existingProject?.borrowerResumeResourceId ?? null,
					borrowerDocsResourceId: existingProject?.borrowerDocsResourceId ?? null,
					// projectResumeResourceId IS returned by getProjectWithResume, so prefer new one, fallback to existing
					projectResumeResourceId: updatedProject.projectResumeResourceId || existingProject?.projectResumeResourceId || null,
				};

				console.log(`[ProjectStore] ✅ Final project with preserved resource IDs:`, {
					projectDocsResourceId: finalProject.projectDocsResourceId,
					projectResumeResourceId: finalProject.projectResumeResourceId,
					borrowerResumeResourceId: finalProject.borrowerResumeResourceId,
					borrowerDocsResourceId: finalProject.borrowerDocsResourceId,
					completenessPercent: finalProject.completenessPercent,
					borrowerProgress: finalProject.borrowerProgress,
				});

				// 3. Update state
				set((state) => {
					const isActiveProject = state.activeProject?.id === projectId;
					console.log(`[ProjectStore] 🔄 Updating state - isActiveProject: ${isActiveProject}`);
					
					return {
						// Update in projects list
						projects: state.projects.map((p) =>
							p.id === projectId ? finalProject : p
						),
						// Update activeProject if it matches
						activeProject:
							isActiveProject
								? finalProject
								: state.activeProject,
					};
				});
				
				console.log(`[ProjectStore] ✅ refreshProject completed for project ${projectId}`);
			} catch (error) {
				console.error(`[ProjectStore] ❌ Failed to refresh project ${projectId}:`, error);
				// Don't throw, just log - this is a background refresh
			}
		},

		getProject: (id) => get().projects.find((p) => p.id === id) || null,

		setActiveProject: async (project) => {
			console.log(`[ProjectStore] 🔄 setActiveProject called:`, {
				projectId: project?.id,
				projectDocsResourceId: project?.projectDocsResourceId,
				projectResumeResourceId: project?.projectResumeResourceId,
				borrowerResumeResourceId: project?.borrowerResumeResourceId,
				borrowerDocsResourceId: project?.borrowerDocsResourceId,
				hasProject: !!project,
			});
			
			set({ activeProject: project });

			// When a project becomes active, load its permissions
			// But only if we don't already have permissions for this project
			if (project) {
				const permissionStore = usePermissionStore.getState();
				// Only load if we don't already have permissions for this project
				if (permissionStore.currentProjectId !== project.id && !permissionStore.isLoading) {
					console.log(`[ProjectStore] 🔐 Loading permissions for project ${project.id}`);
					permissionStore.loadPermissionsForProject(project.id);
				} else {
					console.log(`[ProjectStore] ⏭️ Skipping permission load - already loaded or loading`);
				}
			} else {
				console.log(`[ProjectStore] 🔄 Resetting permissions (project is null)`);
				usePermissionStore.getState().resetPermissions();
			}
		},

		createProject: async (projectData: Partial<ProjectProfile>) => {
			const { user, activeOrg } = useAuthStore.getState();
			if (!user)
				throw new Error("User must be logged in to create a project.");
			if (!activeOrg)
				throw new Error("Must be part of an org to create a project.");

		// Use the create-project FastAPI endpoint (advisor auto-assignment happens server-side)
		const projectSections = projectData.projectSections as any;
		const address = projectSections?.propertyAddress;
		const dealType = (projectData as any).dealType || 'ground_up';
		const initial_grants = (projectData as any).initial_grants as
			| Array<{ user_id: string; permissions: Array<{ resource_type: string; permission: string }> }>
			| undefined;

		const { data, error } = await apiClient.createProject({
			name:
				projectData.projectName ||
				`New Project ${get().projects.length + 1}`,
			owner_org_id: activeOrg.id,
			address: address || undefined,
			deal_type: dealType,
			initial_grants,
		});

			if (error) throw error;
			if (!data?.project) throw new Error("Failed to create project");

			const borrowerResumeContent = (data.borrowerResumeContent ??
				{}) as BorrowerResumeContent;
			const normalizedBorrowerProgress = Math.max(
				0,
				Math.min(
					100,
					Math.round(
						parsePercentage(
							(borrowerResumeContent as BorrowerResumeContent)
								?.completenessPercent
						)
					)
				)
			);

			const newProjectData: ProjectProfile = {
				id: data.project.id,
				owner_org_id: data.project.owner_org_id,
				assignedAdvisorUserId: data.project.assigned_advisor_id,
				projectName: data.project.name,
				assetType: data.project.asset_type || projectData.assetType || '',
				projectStatus: projectData.dealStatus || 'draft', // Maps to dealStatus for backward compatibility
				dealStatus: projectData.dealStatus || '',
				createdAt: data.project.created_at,
				updatedAt: data.project.updated_at,
				// All other resume fields should start undefined/empty and only be created
				// in project_resumes.content once the user explicitly interacts with them.
				completenessPercent: 0,
				borrowerProgress: normalizedBorrowerProgress,
				borrowerSections: borrowerResumeContent,
				projectSections:
					(projectData.projectSections as
						| ProjectResumeContent
						| undefined) || {},
				// Spread the provided data to override defaults
				...projectData,
			};

			const progressResult = get().calculateProgress(newProjectData);
			const finalProject = {
				...newProjectData,
				...progressResult,
				completenessPercent: progressResult.completenessPercent,
				borrowerProgress: normalizedBorrowerProgress, // keep borrower progress from resume
				borrowerSections: borrowerResumeContent,
			};

			// Note: Project name and address are now saved during project creation in the edge function.
			// We only need to update completeness percent if needed.
			try {
				// Only update completeness if we need to - name and address are already saved
				if (progressResult.completenessPercent > 0) {
					await apiClient.updateProject({
						project_id: data.project.id,
						core_updates: {},
						resume_updates: {
							completenessPercent: progressResult.completenessPercent,
						},
					});
				}
			} catch (error) {
				// Non-fatal - project is created, just progress not saved
			}

			set((state) => ({ projects: [...state.projects, finalProject] }));

			// Refresh projects in background to pick up server-calculated fields/resources
			void get().loadUserProjects();

			return finalProject;
		},

		updateProject: async (id, updates) => {
			const projectToUpdate = get().getProject(id);
			if (!projectToUpdate) return null;

			const now = new Date().toISOString();
			const updatedData = {
				...projectToUpdate,
				...updates,
				updatedAt: now,
			};

			// Calculate progress (similar to borrower resume form)
			const progressResult = get().calculateProgress(updatedData);

			const finalUpdatedProject = {
				...updatedData,
				...progressResult,
				completenessPercent: progressResult.completenessPercent,
			};

			// Optimistic UI update
			set((state) => ({
				projects: state.projects.map((p) =>
					p.id === id ? finalUpdatedProject : p
				),
				activeProject:
					state.activeProject?.id === id
						? finalUpdatedProject
						: state.activeProject,
			}));

			try {
				// Delegate update to FastAPI so RLS and permissions are enforced server-side
				const coreUpdates = projectProfileToDbProject(updates);
				// Note: completenessPercent is now stored in a separate column, not in content
				// saveProjectResume will calculate and save it automatically
				const resumeContent = {
					...projectProfileToResumeContent(updates),
				};

				// Include metadata if present in updates
				if ((updates as any)._metadata) {
					(resumeContent as any)._metadata = (
						updates as any
					)._metadata;
				}

				// Extract lock state if present on the updated ProjectProfile and embed into resume content JSON
				const lockedFields = (updates as any)._lockedFields;

				if (lockedFields !== undefined) {
					(resumeContent as any)._lockedFields = lockedFields;
				}
				// _lockedSections removed - section locks are derived from field locks
				// Remove any existing _lockedSections if present
				if ((resumeContent as any)._lockedSections !== undefined) {
					delete (resumeContent as any)._lockedSections;
				}

				const { error } = await apiClient.updateProject({
					project_id: id,
					core_updates: Object.keys(coreUpdates).length > 0 ? coreUpdates as any : undefined,
					resume_updates: resumeContent,
				});
				if (error) throw error;

				return finalUpdatedProject;
			} catch (error) {
				console.error(
					`[ProjectStore] Error updating project ${id}:`,
					error
				);
				// Revert optimistic update
				set((state) => ({
					projects: state.projects.map((p) =>
						p.id === id ? projectToUpdate : p
					),
					activeProject:
						state.activeProject?.id === id
							? projectToUpdate
							: state.activeProject,
				}));
				throw error;
			}
		},

		deleteProject: async (id) => {
			const project = get().getProject(id);
			if (!project) {
				console.error(`[ProjectStore] Project ${id} not found`);
				return false;
			}

			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.access_token) {
				console.error("[ProjectStore] Not authenticated");
				return false;
			}

			const base = typeof window !== "undefined" ? window.location.origin : "";
			const res = await fetch(`${base}/api/projects/${id}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${session.access_token}` },
			});

			if (!res.ok) {
				console.error(`[ProjectStore] Delete project failed: ${res.status}`);
				return false;
			}

			set((state) => ({
				projects: state.projects.filter((p) => p.id !== id),
				activeProject:
					state.activeProject?.id === id ? null : state.activeProject,
			}));
			return true;
		},
	})
);

// Subscribe to auth store for login/logout events
useAuthStore.subscribe((authState, prevAuthState) => {
	const currentUser = authState.user;
	const prevUser = prevAuthState.user;

	// Reset project state on logout
	if (!currentUser && prevUser) {
		useProjectStore.getState().resetProjectState();
		return;
	}

	// Handle non-borrower login
	if (
		currentUser &&
		currentUser.role !== "borrower" &&
		!authState.isLoading
	) {
		useProjectStore.getState().resetProjectState();
	}
});

// Profile-based triggers removed in new schema

// Subscribe to org memberships changes to reload projects
useAuthStore.subscribe((authState, prevAuthState) => {
	const { user, activeOrg, currentOrgRole } = authState;
	const prevOrgMemberships = prevAuthState.orgMemberships;
	const currentOrgMemberships = authState.orgMemberships;
	const projectStore = useProjectStore.getState();

	// Trigger project loading when:
	// 1. User is a borrower
	// 2. Org memberships changed (loaded or updated) OR org memberships are loaded for the first time
	// 3. User is authenticated
	// 4. Projects haven't been loaded yet (still in initial loading state)
	const orgMembershipsChanged = prevOrgMemberships !== currentOrgMemberships;
	const orgMembershipsJustLoaded = 
		!prevOrgMemberships?.length && 
		currentOrgMemberships && 
		currentOrgMemberships.length > 0;
	const projectsNotLoaded = projectStore.isLoading && projectStore.projects.length === 0;

	if (
		user?.role === "borrower" &&
		user?.id &&
		currentOrgMemberships &&
		currentOrgMemberships.length > 0 &&
		(orgMembershipsChanged || (orgMembershipsJustLoaded && projectsNotLoaded))
	) {
		projectStore.loadUserProjects();
	}
});
