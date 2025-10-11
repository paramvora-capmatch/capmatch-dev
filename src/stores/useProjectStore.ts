// src/stores/useProjectStore.ts
import { create } from "zustand";
import {
	dbMessageToProjectMessage,
	dbProjectToProjectProfile,
} from "@/lib/dto-mapper";
import { RealtimeChannel, supabase } from "../../lib/supabaseClient";
import { storageService } from "@/lib/storage";
import { useAuthStore } from "./useAuthStore";
import { useBorrowerProfileStore } from "./useBorrowerProfileStore";
import {
	ProjectProfile,
	ProjectMessage,
	ProjectPrincipal,
	ProjectDocumentRequirement,
} from "@/types/enhanced-types";

const projectProfileToDbProject = (
	profileData: Partial<ProjectProfile>
): any => {
	const dbData: { [key: string]: any } = {};
	const keyMap: { [key in keyof ProjectProfile]?: string } = {
		projectName: "project_name",
		assetType: "asset_type",
		borrowerProfileId: "owner_id",
		assignedAdvisorUserId: "assigned_advisor_user_id",
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
	projectMessages: ProjectMessage[];
	projectPrincipals: ProjectPrincipal[];
	documentRequirements: ProjectDocumentRequirement[];
	autoCreatedFirstProjectThisSession: boolean;
	messageSubscription: RealtimeChannel | null;
}

interface ProjectActions {
	loadUserProjects: () => Promise<void>;
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
	addProjectMessage: (message: string) => Promise<void>;
	resetProjectState: () => void;
	subscribeToMessages: (projectId: string) => void;
	unsubscribeFromMessages: () => void;
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
		projectMessages: [],
		projectPrincipals: [],
		documentRequirements: [],
		autoCreatedFirstProjectThisSession: false,
		messageSubscription: null,

		resetProjectState: () => {
			console.log("[ProjectStore] Resetting state.");
			set({
				projects: [],
				activeProject: null,
				projectMessages: [],
				projectPrincipals: [],
				documentRequirements: [],
				autoCreatedFirstProjectThisSession: false,
				messageSubscription: null,
				isLoading: false,
			});
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
				completenessPercent: totalProgress,
			};
		},

		loadUserProjects: async () => {
			const { user } = useAuthStore.getState();
			const { borrowerProfile } = useBorrowerProfileStore.getState(); // Get profile state
			if (!user || (user.role === "borrower" && !borrowerProfile)) {
				get().resetProjectState();
				return;
			}
			// Only set loading if projects are not already loaded for this user.
			if (get().projects.length === 0) {
				set({ isLoading: true });
			}
			try {
				let userProjects: ProjectProfile[] = [];

				if (user.isDemo) {
					console.log(
						"[ProjectStore] Loading projects from local storage for demo user."
					);
					const allProjects =
						(await storageService.getItem<ProjectProfile[]>(
							"projects"
						)) || [];
					userProjects = allProjects.filter(
						(p) => p.borrowerProfileId === borrowerProfile?.id
					);
				} else {
					console.log(
						"[ProjectStore] Loading projects from Supabase for real user."
					);
					const { data, error } = await supabase
						.from("projects")
						.select("*")
						.eq("owner_id", user.id); // Filter by owner
					if (error) throw error;
					userProjects = data.map(dbProjectToProjectProfile);
				}

				const projectsWithProgress = userProjects.map((p) => ({
					...p,
					borrowerProfileId: borrowerProfile?.id || "",
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

		unsubscribeFromMessages: () => {
			const { messageSubscription } = get();
			if (messageSubscription) {
				supabase.removeChannel(messageSubscription);
				set({ messageSubscription: null });
			}
		},

		subscribeToMessages: (projectId: string) => {
			get().unsubscribeFromMessages(); // Unsubscribe from any previous channel

			const channel = supabase
				.channel(`project-messages-${projectId}`)
				.on<any>(
					"postgres_changes",
					{
						event: "INSERT",
						schema: "public",
						table: "project_messages",
						filter: `project_id=eq.${projectId}`,
					},
					async (payload) => {
						const newMessagePayload = payload.new;

						// Fetch sender info to determine role
						const { data: senderProfile, error } = await supabase
							.from("profiles")
							.select("role")
							.eq("id", newMessagePayload.sender_id)
							.single();

						if (error) {
							console.error(
								"Error fetching sender for new message:",
								error
							);
							return;
						}

						const newMessage = dbMessageToProjectMessage({
							...newMessagePayload,
							sender: senderProfile,
						});

						set((state) => ({
							projectMessages: [
								...state.projectMessages,
								newMessage,
							],
						}));
					}
				)
				.subscribe();

			set({ messageSubscription: channel });
		},

		setActiveProject: async (project) => {
			const {
				activeProject,
				unsubscribeFromMessages,
				subscribeToMessages,
			} = get();
			if (project?.id === activeProject?.id) return;

			unsubscribeFromMessages();

			set({ activeProject: project, projectMessages: [] });

			if (project) {
				// Fetch initial messages for the new active project from DB
				const { data, error } = await supabase
					.from("project_messages")
					.select("*, sender:profiles(role)")
					.eq("project_id", project.id)
					.order("created_at", { ascending: true });

				if (error) {
					console.error("Error fetching initial messages:", error);
				} else {
					const messages = data.map(dbMessageToProjectMessage);
					set({ projectMessages: messages });
				}

				subscribeToMessages(project.id);
			}
		},

		createProject: async (projectData: Partial<ProjectProfile>) => {
			const { user } = useAuthStore.getState();
			if (!user)
				throw new Error("User must be logged in to create a project.");
			const borrowerProfile =
				useBorrowerProfileStore.getState().borrowerProfile;
			if (!borrowerProfile)
				throw new Error(
					"Borrower profile must exist to create a project."
				);

			if (get().projects.length === 0) {
				set({ autoCreatedFirstProjectThisSession: true });
			}

			let advisorId: string | null = null;
			if (user.isDemo) {
				advisorId = "advisor1@capmatch.com";
			} else {
				// For real users, query for an advisor to assign
				const { data: advisors, error: advisorError } = await supabase
					.from("profiles")
					.select("id")
					.eq("email", "real.advisor@capmatch.com")
					.single();

				if (advisorError) {
					console.error(
						"Error fetching advisor to assign:",
						advisorError
					);
				} else if (advisors) {
					advisorId = advisors.id; // this is a UUID
					console.log(
						`[ProjectStore] Assigning advisor with ID: ${advisorId}`
					);
				} else if (advisors && advisors.length > 0) {
					advisorId = advisors[0].id; // this is a UUID
					console.log(
						`[ProjectStore] Assigning advisor with ID: ${advisorId}`
					);
				} else {
					console.warn(
						"[ProjectStore] Specific advisor 'real.advisor@capmatch.com' not found. Assigning first available advisor."
					);
					const { data: fallbackAdvisors, error: fallbackError } =
						await supabase
							.from("profiles")
							.select("id")
							.eq("role", "advisor")
							.limit(1);
					if (fallbackError)
						console.error(
							"Fallback advisor fetch failed:",
							fallbackError
						);
					else if (fallbackAdvisors && fallbackAdvisors.length > 0) {
						advisorId = fallbackAdvisors[0].id;
					} else
						console.warn(
							"[ProjectStore] No advisors found at all."
						);
				}
			}

			const now = new Date().toISOString();
			// Define defaults first, then spread projectData to override them
			const newProjectData: ProjectProfile = {
				id: `proj_${Date.now()}_${Math.random()
					.toString(36)
					.substring(2, 9)}`,
				borrowerProfileId: borrowerProfile.id,
				assignedAdvisorUserId: advisorId,
				projectName: `New Project ${get().projects.length + 1}`,
				assetType: "Multifamily",
				projectStatus: "Info Gathering",
				createdAt: now,
				updatedAt: now,
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

			if (user.isDemo) {
				const allProjects =
					(await storageService.getItem<ProjectProfile[]>(
						"projects"
					)) || [];
				await storageService.setItem("projects", [
					...allProjects,
					newProjectData,
				]);
			} else {
				const dataToInsert = projectProfileToDbProject(newProjectData);
				delete dataToInsert.id; // DB generates UUID

				const { data: insertedProject, error } = await supabase
					.from("projects")
					.insert(dataToInsert)
					.select()
					.single();

				if (error) throw error;
				Object.assign(newProjectData, insertedProject); // Update with DB generated ID
			}

			// After project creation, create its dedicated folder in storage
			if (!user.isDemo) {
				const borrowerBucketId = borrowerProfile.id;
				const projectFolderId = newProjectData.id;
				const keepFilePath = `${projectFolderId}/.keep`;

				const { error: storageError } = await supabase.storage
					.from(borrowerBucketId)
					.upload(keepFilePath, new Blob([""]), {
						contentType: "text/plain",
						upsert: true, // Use upsert to prevent errors if folder/file already exists
					});

				if (storageError) {
					// This is a non-critical error. The project is created, but the folder is not.
					// Log the error for debugging but don't throw, allowing the app to continue.
					console.error(
						`[ProjectStore] Failed to create storage folder for project ${projectFolderId}:`,
						storageError
					);
				} else {
					console.log(
						`[ProjectStore] Created storage folder for project ${projectFolderId}.`
					);
				}
			}

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

			if (user?.isDemo) {
				const allProjects =
					(await storageService.getItem<ProjectProfile[]>(
						"projects"
					)) || [];
				const updatedProjects = allProjects.map((p) =>
					p.id === id ? finalUpdatedProject : p
				);
				await storageService.setItem("projects", updatedProjects);
				console.log(
					`[ProjectStore] Updated demo project ${id} in storage.`
				);
				return finalUpdatedProject;
			} else {
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
			}
		},

		deleteProject: async (id) => {
			const { user } = useAuthStore.getState();
			if (user?.isDemo) {
				const allProjects =
					(await storageService.getItem<ProjectProfile[]>(
						"projects"
					)) || [];
				await storageService.setItem(
					"projects",
					allProjects.filter((p) => p.id !== id)
				);
			} else {
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
			}
			set((state) => ({
				projects: state.projects.filter((p) => p.id !== id),
				activeProject:
					state.activeProject?.id === id ? null : state.activeProject,
			}));
			return true;
		},

		addProjectMessage: async (message) => {
			const { activeProject } = get();
			const { user } = useAuthStore.getState();
			if (!activeProject || !user || !user.id)
				throw new Error("No active project or user ID");

			const { error } = await supabase.from("project_messages").insert({
				project_id: activeProject.id,
				sender_id: user.id,
				message: message,
			});

			if (error) {
				console.error("Error sending message:", error);
				throw error;
			}
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

useBorrowerProfileStore.subscribe((profileState, prevProfileState) => {
	const { user } = useAuthStore.getState();
	const wasLoading = prevProfileState.isLoading;
	const isLoading = profileState.isLoading;
	const profile = profileState.borrowerProfile;

	// Trigger project loading only when:
	// 1. User is a borrower
	// 2. Profile was loading and now isn't (loading just completed)
	// 3. Profile exists
	if (user?.role === "borrower" && wasLoading && !isLoading && profile) {
		console.log(
			"[ProjectStore Subscription] Profile load finished. Triggering project load."
		);
		useProjectStore.getState().loadUserProjects();
	}
});
