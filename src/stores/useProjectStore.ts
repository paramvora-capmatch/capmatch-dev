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
		// orgId: "owner_org_id", // Map to owner_org_id in new schema - removed as it's not in ProjectProfile
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
			const { user, activeOrg, currentOrgRole } = useAuthStore.getState();
			console.log("[ProjectStore] 🔍 DEBUG - Starting loadUserProjects");
			console.log("[ProjectStore] 🔍 DEBUG - User:", user ? { id: user.id, email: user.email, role: user.role } : "null");
			console.log("[ProjectStore] 🔍 DEBUG - Active Org:", activeOrg ? { id: activeOrg.id, name: activeOrg.name } : "null");
			console.log("[ProjectStore] 🔍 DEBUG - Current Org Role:", currentOrgRole);
			
			if (!user) {
				console.log("[ProjectStore] ❌ No user found, resetting state");
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
				
				// First, let's check what resources the user has access to
				console.log("[ProjectStore] 🔍 DEBUG - Checking user's resources...");
				const { data: resources, error: resourcesError } = await supabase
					.from("resources")
					.select("*");
				if (resourcesError) {
					console.error("[ProjectStore] ❌ Failed to load resources:", resourcesError);
				} else {
					console.log("[ProjectStore] 🔍 DEBUG - Resources found:", resources?.length || 0);
					if (resources && resources.length > 0) {
						console.log("[ProjectStore] 🔍 DEBUG - Sample resource:", resources[0]);
					}
				}

				// Check org memberships
				console.log("[ProjectStore] 🔍 DEBUG - Checking org memberships...");
				const { data: memberships, error: membershipsError } = await supabase
					.from("org_members")
					.select("*")
					.eq("user_id", user.id);
				if (membershipsError) {
					console.error("[ProjectStore] ❌ Failed to load memberships:", membershipsError);
				} else {
					console.log("[ProjectStore] 🔍 DEBUG - Memberships found:", memberships?.length || 0);
					if (memberships && memberships.length > 0) {
						console.log("[ProjectStore] 🔍 DEBUG - Sample membership:", memberships[0]);
					}
				}

				// Test permission functions
				if (activeOrg && resources && resources.length > 0) {
					console.log("[ProjectStore] 🔍 DEBUG - Testing permission functions...");
					const testResourceId = resources[0].id;
					const { data: canView, error: canViewError } = await supabase
						.rpc('can_view', { p_user_id: user.id, p_resource_id: testResourceId });
					if (canViewError) {
						console.error("[ProjectStore] ❌ can_view test failed:", canViewError);
					} else {
						console.log("[ProjectStore] 🔍 DEBUG - can_view test result:", canView);
					}

					const { data: userRole, error: roleError } = await supabase
						.rpc('get_user_role', { p_user_id: user.id, p_org_id: activeOrg.id });
					if (roleError) {
						console.error("[ProjectStore] ❌ get_user_role test failed:", roleError);
					} else {
						console.log("[ProjectStore] 🔍 DEBUG - get_user_role test result:", userRole);
					}
				}

				// Let's first check what PROJECT_DOCS_ROOT resources exist
				console.log("[ProjectStore] 🔍 DEBUG - Checking PROJECT_DOCS_ROOT resources...");
				const { data: projectDocsRoots, error: projectDocsError } = await supabase
					.from("resources")
					.select("*")
					.eq("resource_type", "PROJECT_DOCS_ROOT");
				if (projectDocsError) {
					console.error("[ProjectStore] ❌ Failed to load PROJECT_DOCS_ROOT resources:", projectDocsError);
				} else {
					console.log("[ProjectStore] 🔍 DEBUG - PROJECT_DOCS_ROOT resources found:", projectDocsRoots?.length || 0);
					if (projectDocsRoots && projectDocsRoots.length > 0) {
						console.log("[ProjectStore] 🔍 DEBUG - Sample PROJECT_DOCS_ROOT:", projectDocsRoots[0]);
					}
				}

				// Test can_view on PROJECT_DOCS_ROOT resources
				if (projectDocsRoots && projectDocsRoots.length > 0) {
					console.log("[ProjectStore] 🔍 DEBUG - Testing can_view on PROJECT_DOCS_ROOT resources...");
					for (const resource of projectDocsRoots) {
						const { data: canViewResource, error: canViewResourceError } = await supabase
							.rpc('can_view', { p_user_id: user.id, p_resource_id: resource.id });
						if (canViewResourceError) {
							console.error(`[ProjectStore] ❌ can_view test failed for resource ${resource.id}:`, canViewResourceError);
						} else {
							console.log(`[ProjectStore] 🔍 DEBUG - can_view for resource ${resource.id} (project: ${resource.project_id}):`, canViewResource);
						}
					}
				}

				// Let's also test the RLS policy directly by checking if we can see projects with a join
				console.log("[ProjectStore] 🔍 DEBUG - Testing RLS policy with join query...");
				const { data: projectsWithResources, error: projectsWithResourcesError } = await supabase
					.from("projects")
					.select(`
						*,
						resources!inner(
							id,
							resource_type,
							project_id
						)
					`)
					.eq("resources.resource_type", "PROJECT_DOCS_ROOT");
				if (projectsWithResourcesError) {
					console.error("[ProjectStore] ❌ Projects with resources query failed:", projectsWithResourcesError);
				} else {
					console.log("[ProjectStore] 🔍 DEBUG - Projects with PROJECT_DOCS_ROOT resources:", projectsWithResources?.length || 0);
					if (projectsWithResources && projectsWithResources.length > 0) {
						console.log("[ProjectStore] 🔍 DEBUG - Sample project with resources:", projectsWithResources[0]);
					}
				}

				// RLS will only return projects the user can view
				const { data, error } = await supabase
					.from("projects")
					.select("*");
				if (error) {
					console.error("[ProjectStore] ❌ Projects query failed:", error);
					throw error;
				}
				console.log("[ProjectStore] 🔍 DEBUG - Raw projects from DB:", data?.length || 0);
				if (data && data.length > 0) {
					console.log("[ProjectStore] 🔍 DEBUG - Sample project:", data[0]);
				}
				
				const userProjects: ProjectProfile[] = (data || []).map(dbProjectToProjectProfile);
				console.log("[ProjectStore] 🔍 DEBUG - Converted projects:", userProjects.length);

				const projectsWithProgress = userProjects.map((p) => ({
					...p,
					...get().calculateProgress(p),
				}));
				console.log("[ProjectStore] 🔍 DEBUG - Final projects with progress:", projectsWithProgress.length);
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
			const { user, activeOrg } = useAuthStore.getState();
			if (!user)
				throw new Error("User must be logged in to create a project.");
			if (!activeOrg)
				throw new Error(
					"Must be part of an org to create a project."
				);

			// Use the create-project edge function
			const { data, error } = await supabase.functions.invoke('create-project', {
				body: {
					name: projectData.projectName || `New Project ${get().projects.length + 1}`,
					owner_org_id: activeOrg.id
				}
			});

			if (error) throw error;
			if (!data?.project) throw new Error('Failed to create project');

			// Convert the database project to ProjectProfile format
			const newProjectData: ProjectProfile = {
				id: data.project.id,
				entityId: data.project.owner_org_id, // Use entityId instead of orgId
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

// Subscribe to org memberships changes to reload projects
useAuthStore.subscribe((authState, prevAuthState) => {
	const { user, activeOrg, currentOrgRole } = authState;
	const prevOrgMemberships = prevAuthState.orgMemberships;
	const currentOrgMemberships = authState.orgMemberships;

	console.log("[ProjectStore Subscription] 🔍 DEBUG - Auth state changed");
	console.log("[ProjectStore Subscription] 🔍 DEBUG - User:", user ? { id: user.id, email: user.email, role: user.role } : "null");
	console.log("[ProjectStore Subscription] 🔍 DEBUG - Active Org:", activeOrg ? { id: activeOrg.id, name: activeOrg.name } : "null");
	console.log("[ProjectStore Subscription] 🔍 DEBUG - Current Org Role:", currentOrgRole);
	console.log("[ProjectStore Subscription] 🔍 DEBUG - Prev memberships:", prevOrgMemberships?.length || 0);
	console.log("[ProjectStore Subscription] 🔍 DEBUG - Current memberships:", currentOrgMemberships?.length || 0);
	console.log("[ProjectStore Subscription] 🔍 DEBUG - Memberships changed:", prevOrgMemberships !== currentOrgMemberships);

	// Trigger project loading when:
	// 1. User is a borrower
	// 2. Org memberships changed (loaded or updated)
	// 3. User is authenticated
	if (user?.role === "borrower" && user?.id && 
		prevOrgMemberships !== currentOrgMemberships && 
		currentOrgMemberships && currentOrgMemberships.length > 0) {
		console.log(
			"[ProjectStore Subscription] ✅ Org memberships loaded. Triggering project load."
		);
		useProjectStore.getState().loadUserProjects();
	} else {
		console.log("[ProjectStore Subscription] ⏭️ Not triggering project load - conditions not met");
	}
});
