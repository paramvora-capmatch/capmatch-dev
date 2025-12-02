// src/stores/useProjectStore.ts
import { create } from "zustand";
import {
	getProjectsWithResumes,
	getProjectWithResume,
	ProjectResumeContent,
	BorrowerResumeContent,
} from "@/lib/project-queries";
import { supabase } from "../../lib/supabaseClient";
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

			const completenessPercent = computeProjectCompletion(project);
			const borrowerProgress = computeBorrowerCompletion(borrowerContent);
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
					await supabase.from("projects").select("*");

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
				const projectsWithProgress = projectsWithResources.map((p) => {
					const calculated = get().calculateProgress(p);
					const completenessPercentValue =
						p.completenessPercent ?? calculated.completenessPercent;
					const borrowerProgressValue =
						p.borrowerProgress ?? calculated.borrowerProgress;
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
						nextActiveProject = updatedActive;
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
				// 1. Fetch latest project data
				const updatedProject = await getProjectWithResume(projectId);
				
				// 2. Calculate progress
				const progressResult = get().calculateProgress(updatedProject);
				const finalProject = {
					...updatedProject,
					...progressResult,
					completenessPercent: progressResult.completenessPercent,
				};

				// 3. Update state
				set((state) => ({
					// Update in projects list
					projects: state.projects.map((p) =>
						p.id === projectId ? finalProject : p
					),
					// Update activeProject if it matches
					activeProject:
						state.activeProject?.id === projectId
							? finalProject
							: state.activeProject,
				}));
			} catch (error) {
				console.error(`[ProjectStore] Failed to refresh project ${projectId}:`, error);
				// Don't throw, just log - this is a background refresh
			}
		},

		getProject: (id) => get().projects.find((p) => p.id === id) || null,

		setActiveProject: async (project) => {
			set({ activeProject: project });

			// When a project becomes active, load its permissions
			if (project) {
				usePermissionStore
					.getState()
					.loadPermissionsForProject(project.id);
			} else {
				usePermissionStore.getState().resetPermissions();
			}
		},

		createProject: async (projectData: Partial<ProjectProfile>) => {
			const { user, activeOrg } = useAuthStore.getState();
			if (!user)
				throw new Error("User must be logged in to create a project.");
			if (!activeOrg)
				throw new Error("Must be part of an org to create a project.");

			// Use the create-project edge function (advisor auto-assignment happens server-side)
			const { data, error } = await supabase.functions.invoke(
				"create-project",
				{
					body: {
						name:
							projectData.projectName ||
							`New Project ${get().projects.length + 1}`,
						owner_org_id: activeOrg.id,
						// assigned_advisor_id is optional - edge function will auto-assign if not provided
					},
				}
			);

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

			// Save ONLY the initial project name (and completeness) into project_resumes.content.
			// This prevents untouched fields from being created with `user_input` source,
			// which would incorrectly show them as "blue" in the UI.
			try {
				const resumeContent = {
					projectName: newProjectData.projectName,
					completenessPercent: progressResult.completenessPercent,
				} as Partial<ProjectResumeContent>;

				await supabase.functions.invoke("update-project", {
					body: {
						project_id: data.project.id,
						core_updates: {},
						resume_updates: resumeContent,
					},
				});
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
				// Delegate update to edge function so RLS and permissions are enforced server-side
				const coreUpdates = projectProfileToDbProject(updates);
				// Include completenessPercent in resume content to save to DB
				const resumeContent = {
					...projectProfileToResumeContent(updates),
					completenessPercent: progressResult.completenessPercent,
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

				const { error } = await supabase.functions.invoke(
					"update-project",
					{
						body: {
							project_id: id,
							core_updates: coreUpdates,
							resume_updates: resumeContent,
						},
					}
				);
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
			// First, get the project to find owner_org_id (bucket ID)
			const project = get().getProject(id);
			if (!project) {
				console.error(`[ProjectStore] Project ${id} not found`);
				return false;
			}

			const bucketId = project.owner_org_id;
			if (!bucketId) {
				console.error(
					`[ProjectStore] Project ${id} has no owner_org_id`
				);
				return false;
			}

			// Helper function to recursively list all files under a prefix
			const listAllFilesRecursively = async (
				bucket: string,
				prefix: string
			): Promise<string[]> => {
				const allFiles: string[] = [];
				const stack: string[] = [prefix];

				while (stack.length > 0) {
					const currentPrefix = stack.pop()!;

					// Handle pagination - list all items in the current prefix
					let offset = 0;
					const limit = 1000;
					let hasMore = true;

					while (hasMore) {
						const { data, error } = await supabase.storage
							.from(bucket)
							.list(currentPrefix, {
								limit,
								offset,
								sortBy: { column: "name", order: "asc" },
							});

						if (error) {
							// If error is "not found", the prefix doesn't exist - skip it
							if (error.message?.includes("not found")) {
								hasMore = false;
								continue;
							}
							hasMore = false;
							continue;
						}

						if (!data || data.length === 0) {
							hasMore = false;
							continue;
						}

						for (const item of data) {
							const fullPath = currentPrefix
								? `${currentPrefix}/${item.name}`
								: item.name;

							// In Supabase storage:
							// - Files have an `id` property (string)
							// - Folders/prefixes don't have an `id` (it's null/undefined)
							// We check for id first as it's the most reliable indicator
							if (item.id && typeof item.id === "string") {
								// It's a file, add to list (include all files including .keep placeholders)
								allFiles.push(fullPath);
							} else {
								// It's a folder/prefix, add to stack for recursive listing
								stack.push(fullPath);
							}
						}

						// Check if there are more items to fetch
						if (data.length < limit) {
							hasMore = false;
						} else {
							offset += limit;
						}
					}
				}

				return allFiles;
			};

			// Delete all storage files for this project
			try {
				const projectPrefix = `${id}/`;

				const filesToDelete = await listAllFilesRecursively(
					bucketId,
					projectPrefix
				);

				if (filesToDelete.length > 0) {
					// Delete files in chunks of 1000 (Supabase limit)
					const chunkSize = 1000;
					let deletedCount = 0;

					for (let i = 0; i < filesToDelete.length; i += chunkSize) {
						const chunk = filesToDelete.slice(i, i + chunkSize);
						const chunkNum = Math.floor(i / chunkSize) + 1;

						const { error: storageError } = await supabase.storage
							.from(bucketId)
							.remove(chunk);

						if (storageError) {
							console.error(
								`[ProjectStore] Error deleting storage files chunk ${chunkNum}:`,
								storageError
							);
							// Continue with next chunk even if one fails
						} else {
							deletedCount += chunk.length;
						}
					}

					// Verify deletion by listing the folder again
					const { data: remainingFiles, error: verifyError } =
						await supabase.storage
							.from(bucketId)
							.list(projectPrefix, { limit: 10 });

					if (verifyError) {
						// Could not list folder (likely deleted)
					} else if (remainingFiles && remainingFiles.length > 0) {
						// Some items still remain after deletion
					}
				}
			} catch (storageErr) {
				console.error(
					`[ProjectStore] Error during storage cleanup:`,
					storageErr
				);
				// Continue with project deletion even if storage cleanup fails
			}

			// Delete related data before deleting the project
			// With the new schema, we need to delete child resources first, then let cascade delete handle root resources
			try {
				// 1. Delete chat data
				const { data: threads } = await supabase
					.from("chat_threads")
					.select("id")
					.eq("project_id", id);

				if (threads && threads.length > 0) {
					const threadIds = threads.map((t) => t.id);
					await supabase
						.from("chat_thread_participants")
						.delete()
						.in("thread_id", threadIds);
					await supabase
						.from("chat_threads")
						.delete()
						.eq("project_id", id);
				}

				// 2. Delete child resources and permissions
				// Note: Root resources (PROJECT_RESUME, PROJECT_DOCS_ROOT, BORROWER_RESUME, BORROWER_DOCS_ROOT, OM)
				// cannot be deleted directly due to database trigger. They will be cascade deleted when the project is deleted.
				const { data: resources } = await supabase
					.from("resources")
					.select("id, resource_type, parent_id")
					.eq("project_id", id);

				if (resources && resources.length > 0) {
					// Separate root resources from child resources
					const rootResourceTypes = [
						"PROJECT_RESUME",
						"PROJECT_DOCS_ROOT",
						"BORROWER_RESUME",
						"BORROWER_DOCS_ROOT",
						"OM",
					];

					// Child resources are those that have a parent_id (nested under root resources)
					// Root resources (with parent_id = null) will be cascade deleted when project is deleted
					const childResources = resources.filter(
						(r) =>
							r.parent_id !== null &&
							!rootResourceTypes.includes(r.resource_type)
					);
					const rootResources = resources.filter(
						(r) =>
							r.parent_id === null ||
							rootResourceTypes.includes(r.resource_type)
					);

					const allResourceIds = resources.map((r) => r.id);
					const childResourceIds = childResources.map((r) => r.id);
					const rootResourceIds = rootResources.map((r) => r.id);

					console.log(
						`[ProjectStore] Deleting resources for project ${id}: ${childResourceIds.length} child resources, ${rootResourceIds.length} root resources (will cascade)`
					);

					// Delete permissions for all resources (including root)
					// Permissions will be cascade deleted, but we delete them explicitly to be safe
					if (allResourceIds.length > 0) {
						await supabase
							.from("permissions")
							.delete()
							.in("resource_id", allResourceIds);
					}

					// Only delete child resources (non-root resources with parent_id)
					// Root resources will be cascade deleted when project is deleted
					// DO NOT attempt to delete root resources - they are protected by database trigger
					if (childResourceIds.length > 0) {
						const { error: childDeleteError } = await supabase
							.from("resources")
							.delete()
							.in("id", childResourceIds);

						if (childDeleteError) {
							console.error(
								`[ProjectStore] Error deleting child resources:`,
								childDeleteError
							);
							// Continue anyway - try to delete project which will cascade delete everything
						}
					}

					// Explicitly skip root resources - they will be cascade deleted
					if (rootResourceIds.length > 0) {
						console.log(
							`[ProjectStore] Skipping ${rootResourceIds.length} root resources - will be cascade deleted with project`
						);
					}
				}

				// 3. Delete resumes (these have ON DELETE CASCADE, but we delete explicitly)
				await supabase
					.from("project_resumes")
					.delete()
					.eq("project_id", id);
				await supabase
					.from("borrower_resumes")
					.delete()
					.eq("project_id", id);

				// 4. Delete OM data (if exists, has ON DELETE CASCADE)
				await supabase.from("om").delete().eq("project_id", id);

				// 5. Delete project access grants (has ON DELETE CASCADE)
				await supabase
					.from("project_access_grants")
					.delete()
					.eq("project_id", id);
			} catch (relatedDataError) {
				console.error(
					`[ProjectStore] Error deleting related data for project ${id}:`,
					relatedDataError
				);
				// Continue with project deletion attempt even if some related data deletion fails
			}

			// Now delete the project from the database
			// This will cascade delete ALL resources (including root resources) via foreign key constraints
			// The cascade delete trigger should allow root resource deletion when the project is deleted
			// Note: If this fails with "Cannot delete root resource types", the trigger may need to be updated
			// to properly detect cascade deletes in the same transaction
			const { error } = await supabase
				.from("projects")
				.delete()
				.eq("id", id);
			if (error) {
				console.error(
					`[ProjectStore] Failed to delete project ${id}:`,
					error
				);
				// If the error is about root resources, it means the cascade delete trigger
				// is not properly detecting the cascade. This might require a database fix.
				if (
					error.message?.includes("Cannot delete root resource types")
				) {
					console.error(
						`[ProjectStore] Cascade delete trigger issue: Root resources should be automatically deleted when project is deleted. This may require a database migration fix.`
					);
				}
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

	// Trigger project loading when:
	// 1. User is a borrower
	// 2. Org memberships changed (loaded or updated)
	// 3. User is authenticated
	if (
		user?.role === "borrower" &&
		user?.id &&
		prevOrgMemberships !== currentOrgMemberships &&
		currentOrgMemberships &&
		currentOrgMemberships.length > 0
	) {
		useProjectStore.getState().loadUserProjects();
	}
});
