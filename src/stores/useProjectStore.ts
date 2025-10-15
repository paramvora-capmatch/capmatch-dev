// src/stores/useProjectStore.ts
import { create } from "zustand";
import { dbProjectToProjectProfile } from "@/lib/dto-mapper";
import { supabase } from "../../lib/supabaseClient";
import { useAuthStore } from "./useAuthStore";
import {
	ProjectProfile,
  // New schema types
	Project,
} from "@/types/enhanced-types";

const projectProfileToDbProject = (
	profileData: Partial<ProjectProfile>
): any => {
	const dbData: { [key: string]: any } = {};
	const keyMap: { [key in keyof ProjectProfile]?: string } = {
		projectName: "name", // Map to name in new schema
		assetType: "asset_type",
		// borrowerProfileId: "owner_id", // Removed - projects owned by entities, not users
		entityId: "owner_entity_id", // Map to owner_entity_id in new schema
		assignedAdvisorUserId: "assigned_advisor_id", // Map to assigned_advisor_id in new schema
		propertyAddressStreet: "property_address_street",
		propertyAddressCity: "property_address_city",
		propertyAddressState: "property_address_state",
		propertyAddressCounty: "property_address_county",
		propertyAddressZip: "property_address_zip",
		projectDescription: "project_description",
		projectPhase: "project_phase",
		loanAmountRequested: "loan_amount_requested",
		loanType: "loan_type",
		targetLtvPercent: "target_ltv_percent",
		targetLtcPercent: "target_ltc_percent",
		amortizationYears: "amortization_years",
		interestOnlyPeriodMonths: "interest_only_period_months",
		interestRateType: "interest_rate_type",
		targetCloseDate: "target_close_date",
		useOfProceeds: "use_of_proceeds",
		recoursePreference: "recourse_preference",
		purchasePrice: "purchase_price",
		totalProjectCost: "total_project_cost",
		capexBudget: "capex_budget",
		propertyNoiT12: "property_noi_t12",
		stabilizedNoiProjected: "stabilized_noi_projected",
		exitStrategy: "exit_strategy",
		businessPlanSummary: "business_plan_summary",
		marketOverviewSummary: "market_overview_summary",
		equityCommittedPercent: "equity_committed_percent",
		projectStatus: "project_status",
		completenessPercent: "completeness_percent",
		internalAdvisorNotes: "internal_advisor_notes",
		borrowerProgress: "borrower_progress",
		projectProgress: "project_progress",
	};
	for (const key in profileData) {
		const mappedKey = keyMap[key as keyof ProjectProfile];
		if (mappedKey) {
			// Special handling for date field to convert empty string to null
			if (
				key === "targetCloseDate" &&
				profileData.targetCloseDate === ""
			) {
				dbData[mappedKey] = null;
			} else {
				dbData[mappedKey] = profileData[key as keyof ProjectProfile];
			}
		}
	}
	return dbData;
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
			console.log("[ProjectStore] Resetting state.");
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
			// Only set loading if projects are not already loaded for this user.
			if (get().projects.length === 0) {
				set({ isLoading: true });
			}
			try {
				console.log(
					"[ProjectStore] Loading projects from Supabase for current user (RLS enforced)."
				);
				// RLS will only return projects the user can view
				const { data, error } = await supabase
					.from("projects")
					.select("*");
				if (error) throw error;
				const userProjects: ProjectProfile[] = (data || []).map(dbProjectToProjectProfile);

				const projectsWithProgress = userProjects.map((p) => ({
					...p,
					...get().calculateProgress(p),
				}));
				set({ projects: projectsWithProgress });
			} catch (error) {
				console.error("[ProjectStore] Failed to load projects:", error);
				set({ projects: [] });
			} finally {
				set({ isLoading: false });
			}
		},

		getProject: (id) => get().projects.find((p) => p.id === id) || null,

		setActiveProject: async (project) => {
			const { activeProject } = get();
			if (project?.id === activeProject?.id) return;

			set({ activeProject: project });
		},

		createProject: async (projectData: Partial<ProjectProfile>) => {
			const { user, activeEntity } = useAuthStore.getState();
			if (!user)
				throw new Error("User must be logged in to create a project.");
			if (!activeEntity)
				throw new Error(
					"Must be part of an entity to create a project."
				);

			// Use the create-project edge function
			const { data, error } = await supabase.functions.invoke('create-project', {
				body: {
					name: projectData.projectName || `New Project ${get().projects.length + 1}`,
					owner_entity_id: activeEntity.id
				}
			});

			if (error) throw error;
			if (!data?.project) throw new Error('Failed to create project');

			// Convert the database project to ProjectProfile format
			const newProjectData: ProjectProfile = {
				id: data.project.id,
				entityId: data.project.owner_entity_id,
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
			const { user } = useAuthStore.getState();
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

			const updatesForDb = projectProfileToDbProject(updates);
			const { data, error } = await supabase
				.from("projects")
				.update(updatesForDb)
				.eq("id", id)
				.select()
				.single();

			if (error) {
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
			console.log(`[ProjectStore] Updated project ${id} in DB.`);
			return data as ProjectProfile;
		},

		deleteProject: async (id) => {
			const { user } = useAuthStore.getState();
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

// Subscribe to entity memberships changes to reload projects
useAuthStore.subscribe((authState, prevAuthState) => {
	const { user } = authState;
	const prevEntityMemberships = prevAuthState.entityMemberships;
	const currentEntityMemberships = authState.entityMemberships;

	// Trigger project loading when:
	// 1. User is a borrower
	// 2. Entity memberships changed (loaded or updated)
	// 3. User is authenticated
	if (user?.role === "borrower" && user?.id && 
		prevEntityMemberships !== currentEntityMemberships && 
		currentEntityMemberships && currentEntityMemberships.length > 0) {
		console.log(
			"[ProjectStore Subscription] Entity memberships loaded. Triggering project load."
		);
		useProjectStore.getState().loadUserProjects();
	}
});
