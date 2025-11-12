// src/stores/useProjectStore.ts
import { create } from "zustand";
import {
	getProjectsWithResumes,
	ProjectResumeContent,
	BorrowerResumeContent,
} from "@/lib/project-queries";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "./useAuthStore";
import { usePermissionStore } from "./usePermissionStore"; // Import the new store
import {
	ProjectProfile,
} from "@/types/enhanced-types";
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
	const keyMap: { [key in keyof ProjectProfile]?: keyof ProjectResumeContent } = {
		projectName: "projectName",
		assetType: "assetType",
		projectStatus: "projectStatus",
		propertyAddressStreet: "propertyAddressStreet",
		propertyAddressCity: "propertyAddressCity",
		propertyAddressState: "propertyAddressState",
		propertyAddressCounty: "propertyAddressCounty",
		propertyAddressZip: "propertyAddressZip",
		projectDescription: "projectDescription",
		projectPhase: "projectPhase",
		loanAmountRequested: "loanAmountRequested",
		loanType: "loanType",
		targetLtvPercent: "targetLtvPercent",
		targetLtcPercent: "targetLtcPercent",
		amortizationYears: "amortizationYears",
		interestOnlyPeriodMonths: "interestOnlyPeriodMonths",
		interestRateType: "interestRateType",
		targetCloseDate: "targetCloseDate",
		useOfProceeds: "useOfProceeds",
		recoursePreference: "recoursePreference",
		purchasePrice: "purchasePrice",
		totalProjectCost: "totalProjectCost",
		capexBudget: "capexBudget",
		propertyNoiT12: "propertyNoiT12",
		stabilizedNoiProjected: "stabilizedNoiProjected",
		exitStrategy: "exitStrategy",
		businessPlanSummary: "businessPlanSummary",
		marketOverviewSummary: "marketOverviewSummary",
		equityCommittedPercent: "equityCommittedPercent",
		// Store completenessPercent in JSONB (similar to borrower resume)
		completenessPercent: "completenessPercent",
		internalAdvisorNotes: "internalAdvisorNotes",
		projectFieldConfirmations: "fieldConfirmations",
	};
	for (const key in profileData) {
		const mappedKey = keyMap[key as keyof ProjectProfile];
		if (mappedKey) {
			// Special handling for date field to convert empty string to null
			if (
				key === "targetCloseDate" &&
				profileData.targetCloseDate === ""
			) {
				resumeContent[mappedKey] = null;
			} else {
				resumeContent[mappedKey] = profileData[key as keyof ProjectProfile] as any;
			}
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
	createProject: (projectData: Partial<ProjectProfile>) => Promise<ProjectProfile>;
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
				(project.projectSections as ProjectResumeContent | undefined) || null;
			const borrowerContent =
				(project.borrowerSections as BorrowerResumeContent | undefined) || null;

			const projectConfirmations =
				project.projectFieldConfirmations ??
				projectResumeContent?.fieldConfirmations ??
				null;
			const borrowerConfirmations =
				project.borrowerFieldConfirmations ??
				borrowerContent?.fieldConfirmations ??
				null;

			const normalizedProjectConfirmations =
				projectConfirmations && typeof projectConfirmations === "object"
					? projectConfirmations
					: {};
			const normalizedBorrowerConfirmations =
				borrowerConfirmations && typeof borrowerConfirmations === "object"
					? borrowerConfirmations
					: {};

			const completenessPercent = computeProjectCompletion(
				project,
				normalizedProjectConfirmations
			);
			const borrowerProgress = computeBorrowerCompletion(
				borrowerContent,
				normalizedBorrowerConfirmations
			);
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
				// We perform a join to fetch the resource IDs for key project resources.
				const { data, error } = await supabase
					.from("projects")
					.select(`
            *,
            resources (
              id,
              resource_type
            )
          `);

				if (error) {
					console.error("[ProjectStore] ❌ Projects query failed:", error);
					throw error;
				}
				

				// Get project IDs for the new query function
				const projectIds = data?.map((project: any) => project.id) || [];
				
				// Use the new query function to get projects with resume content
				const userProjects = await getProjectsWithResumes(projectIds);

				// Add resource IDs to each project
				const projectsWithResources = userProjects.map((project: any) => {
					const projectData = data?.find((p: any) => p.id === project.id);
					const projectDocsResource = projectData?.resources?.find((r: any) => r.resource_type === 'PROJECT_DOCS_ROOT');
					const projectResumeResource = projectData?.resources?.find((r: any) => r.resource_type === 'PROJECT_RESUME');

					return {
						...project,
						projectDocsResourceId: projectDocsResource?.id || null,
						projectResumeResourceId: projectResumeResource?.id || null,
					};
				});

				// Use stored completenessPercent from DB, with calculateProgress as fallback/validation
				const projectsWithProgress = projectsWithResources.map((p) => {
					const calculated = get().calculateProgress(p);
					const completenessPercentValue =
						p.completenessPercent ??
						calculated.completenessPercent;
					const borrowerProgressValue =
						p.borrowerProgress ?? calculated.borrowerProgress;
					return {
						...p,
						completenessPercent: completenessPercentValue,
						borrowerProgress: borrowerProgressValue,
						totalProgress: Math.round(
							(completenessPercentValue + borrowerProgressValue) / 2
						),
					};
				});

				set({ projects: projectsWithProgress, isLoading: false });
			} catch (error) {
				console.error("[ProjectStore] Failed to load projects:", error);
				set({ projects: [], isLoading: false });
			}
		},

		getProject: (id) => get().projects.find((p) => p.id === id) || null,

		setActiveProject: async (project) => {
			const { activeProject } = get();
			if (project?.id === activeProject?.id) return;

			set({ activeProject: project });
      
      // When a project becomes active, load its permissions
      if (project) {
        usePermissionStore.getState().loadPermissionsForProject(project.id);
      } else {
        usePermissionStore.getState().resetPermissions();
      }
		},

		createProject: async (projectData: Partial<ProjectProfile>) => {
			const { user, activeOrg } = useAuthStore.getState();
			if (!user)
				throw new Error("User must be logged in to create a project.");
			if (!activeOrg)
				throw new Error(
					"Must be part of an org to create a project."
				);

			// Use the create-project edge function (advisor auto-assignment happens server-side)
			const { data, error } = await supabase.functions.invoke('create-project', {
				body: {
					name: projectData.projectName || `New Project ${get().projects.length + 1}`,
					owner_org_id: activeOrg.id,
					// assigned_advisor_id is optional - edge function will auto-assign if not provided
				}
			});

			if (error) throw error;
			if (!data?.project) throw new Error('Failed to create project');

			const borrowerResumeContent =
				(data.borrowerResumeContent ?? {}) as BorrowerResumeContent;
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

			// Convert the database project to ProjectProfile format
			const newProjectData: ProjectProfile = {
				id: data.project.id,
				owner_org_id: data.project.owner_org_id,
				assignedAdvisorUserId: data.project.assigned_advisor_id,
				projectName: data.project.name,
				assetType: "Multifamily",
				projectStatus: "Info Gathering",
				createdAt: data.project.created_at,
				updatedAt: data.project.updated_at,
				propertyAddressStreet: "",
				propertyAddressCity: "",
				propertyAddressState: "",
				propertyAddressCounty: "",
				propertyAddressZip: "",
				projectDescription: "",
				loanAmountRequested: null,
				loanType: "",
				targetLtvPercent: null,
				targetLtcPercent: null,
				amortizationYears: null,
				interestOnlyPeriodMonths: null,
				interestRateType: "Not Specified",
				targetCloseDate: null,
				useOfProceeds: "",
				recoursePreference: "Flexible",
				purchasePrice: null,
				totalProjectCost: null,
				capexBudget: null,
				propertyNoiT12: null,
				stabilizedNoiProjected: null,
				exitStrategy: "Undecided",
				businessPlanSummary: "",
				marketOverviewSummary: "",
				equityCommittedPercent: null,
				completenessPercent: 0,
				internalAdvisorNotes: "",
				borrowerProgress: normalizedBorrowerProgress,
				borrowerSections: borrowerResumeContent,
				projectSections:
					(projectData.projectSections as ProjectResumeContent | undefined) ||
					{},
				projectFieldConfirmations: {},
				borrowerFieldConfirmations:
					borrowerResumeContent.fieldConfirmations || {},
				// Spread the provided data to override defaults
				...projectData,
			};

			const progressResult = get().calculateProgress(newProjectData);
			const finalProject = {
				...newProjectData,
				...progressResult,
				completenessPercent: progressResult.completenessPercent,
				borrowerProgress: normalizedBorrowerProgress,
				borrowerSections: borrowerResumeContent,
				projectFieldConfirmations:
					newProjectData.projectFieldConfirmations || {},
				borrowerFieldConfirmations:
					newProjectData.borrowerFieldConfirmations || {},
			};

			// Save initial completenessPercent (0) to project_resumes.content JSONB
			try {
				const resumeContent = {
					...projectProfileToResumeContent(newProjectData),
					completenessPercent: progressResult.completenessPercent,
				};
				await supabase.functions.invoke('update-project', {
					body: {
						project_id: data.project.id,
						core_updates: {},
						resume_updates: resumeContent,
					},
				});
			} catch (error) {
				console.warn('[ProjectStore] Failed to save initial completenessPercent:', error);
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

				const { error } = await supabase.functions.invoke('update-project', {
					body: {
						project_id: id,
						core_updates: coreUpdates,
						resume_updates: resumeContent,
					},
				});
				if (error) throw error;

				console.log(`[ProjectStore] Updated project ${id} via edge function.`);
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
				console.error(`[ProjectStore] Project ${id} has no owner_org_id`);
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
							console.warn(
								`[ProjectStore] Error listing files in ${currentPrefix}:`,
								error
							);
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
							if (item.id && typeof item.id === 'string') {
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
				console.log(
					`[ProjectStore] Starting storage cleanup for project ${id} in bucket ${bucketId} with prefix ${projectPrefix}`
				);
				
				const filesToDelete = await listAllFilesRecursively(
					bucketId,
					projectPrefix
				);

				console.log(
					`[ProjectStore] Found ${filesToDelete.length} storage files to delete for project ${id}`,
					filesToDelete.length > 0 ? `(sample: ${filesToDelete.slice(0, 3).join(', ')})` : ''
				);

				if (filesToDelete.length > 0) {
					// Delete files in chunks of 1000 (Supabase limit)
					const chunkSize = 1000;
					let deletedCount = 0;
					
					for (let i = 0; i < filesToDelete.length; i += chunkSize) {
						const chunk = filesToDelete.slice(i, i + chunkSize);
						const chunkNum = Math.floor(i / chunkSize) + 1;
						
						console.log(
							`[ProjectStore] Deleting chunk ${chunkNum} (${chunk.length} files)...`
						);
						
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
							console.log(
								`[ProjectStore] Successfully deleted chunk ${chunkNum} (${chunk.length} files)`
							);
						}
					}
					
					console.log(
						`[ProjectStore] Completed deletion: ${deletedCount} of ${filesToDelete.length} files deleted for project ${id}`
					);
					
					// Verify deletion by listing the folder again
					const { data: remainingFiles, error: verifyError } = await supabase.storage
						.from(bucketId)
						.list(projectPrefix, { limit: 10 });
					
					if (verifyError) {
						console.log(
							`[ProjectStore] Verification: Could not list folder (likely deleted): ${verifyError.message}`
						);
					} else if (remainingFiles && remainingFiles.length > 0) {
						console.warn(
							`[ProjectStore] WARNING: ${remainingFiles.length} items still remain in folder after deletion`,
							remainingFiles.map(f => f.name)
						);
					} else {
						console.log(
							`[ProjectStore] Verification: Folder is now empty (all files deleted successfully)`
						);
					}
				} else {
					console.log(
						`[ProjectStore] No storage files found for project ${id} - folder may already be empty or not exist`
					);
				}
			} catch (storageErr) {
				console.error(
					`[ProjectStore] Error during storage cleanup:`,
					storageErr
				);
				// Continue with project deletion even if storage cleanup fails
			}

			// Now delete the project from the database
			const { error } = await supabase
				.from("projects")
				.delete()
				.eq("id", id);
			if (error) {
				console.error(
					`[ProjectStore] Failed to delete project ${id}:`,
					error
				);
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
		console.log(
			"[ProjectStore Subscription] User logged out. Resetting state."
		);
		useProjectStore.getState().resetProjectState();
		return;
	}

	// Handle non-borrower login
	if (
		currentUser &&
		currentUser.role !== "borrower" &&
		!authState.isLoading
	) {
		console.log(
			"[ProjectStore Subscription] Non-borrower logged in. Resetting state."
		);
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
	if (user?.role === "borrower" && user?.id && 
		prevOrgMemberships !== currentOrgMemberships && 
		currentOrgMemberships && currentOrgMemberships.length > 0) {
		useProjectStore.getState().loadUserProjects();
	}
});
