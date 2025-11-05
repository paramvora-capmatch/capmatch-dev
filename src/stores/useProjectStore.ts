// src/stores/useProjectStore.ts
import { create } from "zustand";
import { getProjectsWithResumes, ProjectResumeContent } from "@/lib/project-queries";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "./useAuthStore";
import { usePermissionStore } from "./usePermissionStore"; // Import the new store
import {
	ProjectProfile,
} from "@/types/enhanced-types";

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
		// Note: completenessPercent, borrowerProgress, and projectProgress are calculated on-the-fly, not stored
		internalAdvisorNotes: "internalAdvisorNotes",
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
		projectProgress: number;
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
			const requiredFields: (keyof ProjectProfile)[] = [
				"projectName",
				"propertyAddressStreet",
				"propertyAddressCity",
				"propertyAddressState",
				"propertyAddressZip",
				"assetType",
				"projectDescription",
				"projectPhase",
				"loanAmountRequested",
				"loanType",
				"targetLtvPercent",
				"targetCloseDate",
				"useOfProceeds",
				"recoursePreference",
				"exitStrategy",
				"businessPlanSummary",
			];
			let filledCount = 0;
			requiredFields.forEach((field) => {
				const value = project[field];
				if (
					value !== null &&
					value !== undefined &&
					String(value).trim() !== ""
				) {
					if (typeof value === "number" && value === 0) return; // Don't count default 0
					filledCount++;
				}
			});
			const totalProgress =
				requiredFields.length > 0
					? Math.round((filledCount / requiredFields.length) * 100)
					: 0;
			return {
				borrowerProgress: totalProgress,
				projectProgress: totalProgress,
				totalProgress: totalProgress,
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

				const projectsWithProgress = projectsWithResources.map((p) => ({
					...p,
					...get().calculateProgress(p),
				}));

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

			// Find an advisor to auto-assign
			console.log("[ProjectStore] Looking for advisor to auto-assign...");
			let advisorId: string | null = null;

			try {
				// Get the first advisor org member
				const { data: advisorOrg } = await supabase
					.from('orgs')
					.select('id')
					.eq('entity_type', 'advisor')
					.limit(1)
					.single();

				if (advisorOrg) {
					const { data: advisorMember } = await supabase
						.from('org_members')
						.select('user_id')
						.eq('org_id', advisorOrg.id)
						.limit(1)
						.single();

					if (advisorMember) {
						advisorId = advisorMember.user_id;
						console.log(`[ProjectStore] Found advisor: ${advisorId}`);
					}
				}
			} catch (error) {
				console.warn("[ProjectStore] Could not find advisor for auto-assignment:", error);
			}

			// Use the create-project edge function
			const { data, error } = await supabase.functions.invoke('create-project', {
				body: {
					name: projectData.projectName || `New Project ${get().projects.length + 1}`,
					owner_org_id: activeOrg.id,
					assigned_advisor_id: advisorId
				}
			});

			if (error) throw error;
			if (!data?.project) throw new Error('Failed to create project');

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
				borrowerProgress: 0,
				projectProgress: 0,
				// Spread the provided data to override defaults
				...projectData,
			};

			const finalProject = {
				...newProjectData,
				...get().calculateProgress(newProjectData),
			};

			set((state) => ({ projects: [...state.projects, finalProject] }));
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
			const finalUpdatedProject = {
				...updatedData,
				...get().calculateProgress(updatedData),
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
				const resumeContent = projectProfileToResumeContent(updates);

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
