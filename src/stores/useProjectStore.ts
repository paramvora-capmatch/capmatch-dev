// src/stores/useProjectStore.ts
import { create } from "zustand";
import { supabase } from "../../lib/supabaseClient";
import { storageService } from "@/lib/storage";
import { useAuthStore } from "./useAuthStore";
import { useBorrowerProfileStore } from "./useBorrowerProfileStore";
import {
  ProjectProfile,
  ProjectMessage,
  ProjectPrincipal,
  ProjectDocumentRequirement,
  ProjectStatus,
} from "@/types/enhanced-types";

const projectProfileToDbProject = (
  profileData: Partial<ProjectProfile>
): any => {
  const dbData: { [key: string]: any } = {};
  const keyMap: { [key in keyof ProjectProfile]?: string } = {
    projectName: "project_name",
    assetType: "asset_type",
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
    completenessPercent: "completenessPercent",
    internalAdvisorNotes: "internal_advisor_notes",
    borrowerProgress: "borrower_progress",
    projectProgress: "project_progress",
  };
  for (const key in profileData) {
    const mappedKey = keyMap[key as keyof ProjectProfile];
    if (mappedKey) {
      dbData[mappedKey] = profileData[key as keyof ProjectProfile];
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
  projectChanges: boolean;
  autoCreatedFirstProjectThisSession: boolean;
}

interface ProjectActions {
  loadUserProjects: () => Promise<void>;
  createProject: (
    projectData: Partial<ProjectProfile>
  ) => Promise<ProjectProfile>;
  updateProject: (
    id: string,
    updates: Partial<ProjectProfile>,
    manual?: boolean
  ) => Promise<ProjectProfile | null>;
  deleteProject: (id: string) => Promise<boolean>;
  getProject: (id: string) => ProjectProfile | null;
  setActiveProject: (project: ProjectProfile | null) => void;
  addProjectMessage: (
    message: string,
    senderType?: "Borrower" | "Advisor" | "System",
    senderId?: string
  ) => Promise<ProjectMessage>;
  setProjectChanges: (hasChanges: boolean) => void;
  autoSaveProject: () => Promise<void>;
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
    projectMessages: [],
    projectPrincipals: [],
    documentRequirements: [],
    projectChanges: false,
    autoCreatedFirstProjectThisSession: false,

    resetProjectState: () => {
      console.log("[ProjectStore] Resetting state.");
      set({
        projects: [],
        activeProject: null,
        projectMessages: [],
        projectPrincipals: [],
        documentRequirements: [],
        projectChanges: false,
        autoCreatedFirstProjectThisSession: false,
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
        totalProgress,
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
        const { data: userProjects, error } = await supabase
          .from("projects")
          .select("*");
        if (error) throw error;

        const projectsWithProgress = (userProjects as ProjectProfile[]).map(
          (p) => ({
            ...p,
            borrowerProfileId: borrowerProfile?.id || "",
            ...get().calculateProgress(p),
          })
        );
        set({ projects: projectsWithProgress });

        // Auto-create first project for new users
        const { autoCreatedFirstProfileThisSession } =
          useBorrowerProfileStore.getState();
        if (
          user.role === "borrower" &&
          projectsWithProgress.length === 0 &&
          autoCreatedFirstProfileThisSession
        ) {
          console.log(
            "[ProjectStore] New borrower detected, auto-creating first project..."
          );
          await get().createProject({
            projectName: "My First Project",
            projectStatus: "Info Gathering",
          });
          set({ autoCreatedFirstProjectThisSession: true });
        }
      } catch (error) {
        console.error("[ProjectStore] Failed to load projects:", error);
        set({ projects: [] });
      } finally {
        set({ isLoading: false });
      }
    },

    getProject: (id) => get().projects.find((p) => p.id === id) || null,

    setActiveProject: (project) => {
      const { activeProject, projectChanges, autoSaveProject } = get();
      if (project?.id === activeProject?.id) return;

      if (projectChanges && activeProject) {
        console.log(
          `[ProjectStore] Saving changes for ${activeProject.projectName} before switching.`
        );
        autoSaveProject();
      }
      set({ activeProject: project, projectChanges: false });
      // Load related data for the new active project
      if (project) {
        // This logic can be expanded to fetch from DB if not using local storage for these
        storageService
          .getItem<ProjectMessage[]>("projectMessages")
          .then((all) =>
            set({
              projectMessages: (all || []).filter(
                (m) => m.projectId === project.id
              ),
            })
          );
      } else {
        set({ projectMessages: [] });
      }
    },

    setProjectChanges: (hasChanges) => set({ projectChanges: hasChanges }),

    createProject: async (projectData) => {
      const { user } = useAuthStore.getState();
      // The RLS policy on the 'projects' table ensures only an authenticated user can insert.
      // The check for borrowerProfile here is client-side and not necessary for the DB operation.
      if (!user) throw new Error("User must be logged in to create a project.");

      const dataToInsert = projectProfileToDbProject({
        projectName:
          projectData.projectName || `New Project ${get().projects.length + 1}`,
        assetType: projectData.assetType || "Multifamily",
        ...projectData,
      });

      // FIX: Explicitly set owner_id for RLS policy
      dataToInsert.owner_id = user.id;

      const { data: insertedProject, error } = await supabase
        .from("projects")
        .insert(dataToInsert)
        .select()
        .single();

      if (error) {
        console.error("[ProjectStore] Error creating project:", error);
        throw error;
      }

      const newProject = {
        ...(insertedProject as ProjectProfile),
        borrowerProfileId:
          useBorrowerProfileStore.getState().borrowerProfile?.id || "", // Safely get profile ID
      };
      const finalProject = {
        ...newProject,
        ...get().calculateProgress(newProject),
      };

      set((state) => ({ projects: [...state.projects, finalProject] }));
      return finalProject;
    },

    updateProject: async (id, updates, manual = false) => {
      const projectToUpdate = get().getProject(id);
      if (!projectToUpdate) return null;

      const now = new Date().toISOString();
      const updatedData = { ...projectToUpdate, ...updates, updatedAt: now };
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
        projectChanges: !manual,
      }));

      const updatesForDb = projectProfileToDbProject(updates);
      const { data, error } = await supabase
        .from("projects")
        .update(updatesForDb)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(`[ProjectStore] Error updating project ${id}:`, error);
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
      if (manual) {
        set({ projectChanges: false });
      }
      return data as ProjectProfile;
    },

    autoSaveProject: async () => {
      const { activeProject, projectChanges, updateProject } = get();
      if (!activeProject || !projectChanges) return;

      try {
        console.log(
          `[ProjectStore] Auto-saving project: ${activeProject.projectName}`
        );
        await updateProject(activeProject.id, activeProject); // `updateProject` handles DB and state
        set({ projectChanges: false });
      } catch (error) {
        console.error("[ProjectStore] Auto-save to DB failed:", error);
      }
    },

    deleteProject: async (id) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) {
        console.error(`[ProjectStore] Failed to delete project ${id}:`, error);
        return false;
      }
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        activeProject:
          state.activeProject?.id === id ? null : state.activeProject,
      }));
      return true;
    },

    addProjectMessage: async (message, senderType = "Borrower", senderId) => {
      const { activeProject } = get();
      const { user } = useAuthStore.getState();
      if (!activeProject) throw new Error("No active project");

      let finalSenderId = senderId;
      if (!finalSenderId) {
        if (senderType === "Borrower")
          finalSenderId = user?.email || "borrower";
        else if (senderType === "Advisor")
          finalSenderId = activeProject.assignedAdvisorUserId || "advisor";
        else finalSenderId = "system";
      }

      const newMessage: ProjectMessage = {
        id: `msg_${Date.now()}`,
        projectId: activeProject.id,
        senderId: finalSenderId,
        senderType,
        message,
        createdAt: new Date().toISOString(),
      };

      set((state) => ({
        projectMessages: [...state.projectMessages, newMessage],
      }));

      const allMessages =
        (await storageService.getItem<ProjectMessage[]>("projectMessages")) ||
        [];
      await storageService.setItem("projectMessages", [
        ...allMessages,
        newMessage,
      ]);

      if (
        activeProject.projectStatus === "Draft" &&
        senderType === "Borrower"
      ) {
        get().updateProject(activeProject.id, {
          projectStatus: "Info Gathering",
        });
      }
      return newMessage;
    },
  })
);

// Subscribe to auth store for login/logout events
useAuthStore.subscribe((authState, prevAuthState) => {
  // Reset project state on logout
  if (!authState.user && prevAuthState.user) {
    useProjectStore.getState().resetProjectState();
  }

  // Handle non-borrower login
  if (
    authState.user &&
    authState.user.role !== "borrower" &&
    !authState.isLoading
  ) {
    useProjectStore.getState().resetProjectState();
  }
});

useBorrowerProfileStore.subscribe((profileState, prevProfileState) => {
  // Trigger project loading only when a borrower's profile has just finished loading.
  const { user } = useAuthStore.getState();
  if (
    user?.role === "borrower" &&
    prevProfileState.isLoading &&
    !profileState.isLoading &&
    profileState.borrowerProfile
  ) {
    console.log(
      "[Subscription] Profile load finished. Triggering project load."
    );
    useProjectStore.getState().loadUserProjects();
  }
});

// Setup auto-saving interval
setInterval(() => {
  useProjectStore.getState().autoSaveProject();
}, 5000);
