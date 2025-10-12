// src/stores/useProjectStore.ts
import { create } from "zustand";
import {
  dbMessageToProjectMessage,
  dbProjectToProjectProfile,
} from "@/lib/dto-mapper";
import { supabase } from "../../lib/supabaseClient";
import { storageService } from "@/lib/storage";
import { useAuthStore } from "./useAuthStore";
import { useBorrowerProfileStore } from "./useBorrowerProfileStore";
import {
  ProjectProfile,
  ProjectMessage,
  ProjectPrincipal,
  ProjectMember,
  ProjectDocumentRequirement,
} from "@/types/enhanced-types";

const projectProfileToDbProject = (
  profileData: Partial<ProjectProfile>
): any => {
  const dbData: { [key: string]: any } = {};
  const keyMap: { [key in keyof ProjectProfile]?: string } = {
    projectName: "project_name",
    assetType: "asset_type",
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
      if (key === "targetCloseDate" && profileData.targetCloseDate === "") {
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
  autoCreatedFirstProjectThisSession: boolean;
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
    autoCreatedFirstProjectThisSession: false,

    resetProjectState: () => {
      console.log("[ProjectStore] Resetting state.");
      set({
        projects: [],
        activeProject: null,
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
          if (typeof value === "number" && value === 0) return;
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
      const { borrowerProfile } = useBorrowerProfileStore.getState();
      if (!user || (user.role === "borrower" && !borrowerProfile)) {
        get().resetProjectState();
        return;
      }
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
            (await storageService.getItem<ProjectProfile[]>("projects")) || [];
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
            .eq("owner_id", user.id);
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

    setActiveProject: async (project) => {
      const { activeProject } = get();
      if (project?.id === activeProject?.id) return;

      set({ activeProject: project });
    },

    createProject: async (projectData: Partial<ProjectProfile>) => {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error("User must be logged in to create a project.");
      const borrowerProfile =
        useBorrowerProfileStore.getState().borrowerProfile;
      if (!borrowerProfile)
        throw new Error("Borrower profile must exist to create a project.");

      // Force session refresh and verify
      const { data: sessionData, error: sessionError } =
        await supabase.auth.refreshSession();
      if (sessionError || !sessionData.session) {
        console.error(
          "[ProjectStore] Failed to refresh session:",
          sessionError
        );
        throw new Error("No active session");
      }
      console.log(
        "[ProjectStore] Session user ID:",
        sessionData.session.user.id
      );
      console.log("[ProjectStore] AuthStore user ID:", user.id);
      console.log(
        "[ProjectStore] Session access_token:",
        sessionData.session.access_token
      );
      if (sessionData.session.user.id !== user.id) {
        console.error(
          "[ProjectStore] User ID mismatch! Session:",
          sessionData.session.user.id,
          "AuthStore:",
          user.id
        );
        throw new Error("User ID mismatch");
      }

      // Test auth.uid() via RPC
      const { data: uidData, error: uidError } = await supabase.rpc(
        "get_auth_uid"
      );
      if (uidError) {
        console.error("[ProjectStore] Failed to fetch auth.uid():", uidError);
      } else {
        console.log("[ProjectStore] Database auth.uid():", uidData);
      }

      if (get().projects.length === 0) {
        set({ autoCreatedFirstProjectThisSession: true });
      }

      const now = new Date().toISOString();
      const newProjectData: ProjectProfile = {
        id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        borrowerProfileId: borrowerProfile.id,
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
        ...projectData,
      };

      // Instead of a direct insert which is failing RLS, we call a SECURITY DEFINER function.
      // This function runs with elevated privileges, bypassing the RLS policy for the insert,
      // and it correctly sets the owner_id to auth.uid() inside the function.
      const { data: newProjectId, error } = await supabase.rpc(
        "create_new_project",
        { project_data: newProjectData }
      );

      if (error) {
        console.error("[ProjectStore] RPC error:", error);
        throw error;
      }

      // The RPC returns the ID of the new project. We now fetch the full project record.
      const { data: insertedProject, error: fetchError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", newProjectId)
        .single();

      if (fetchError) {
        console.error(
          "[ProjectStore] Error fetching newly created project:",
          fetchError
        );
        throw fetchError;
      }
      console.log("[ProjectStore] Inserting with user ID:", user.id);

      // Debug headers
      console.log("[ProjectStore] Sending INSERT with Authorization header:", {
        Authorization: `Bearer ${sessionData.session.access_token}`,
      });

      // The 'add_owner_to_project_members' trigger on the 'projects' table will automatically
      // handle adding the owner to the 'project_members' table. The client-side insert is redundant and removed.

      // The RPC function 'create_new_project' now handles creating the storage folder,
      // so the client-side code for this is no longer needed.

      const finalProject = {
        ...newProjectData,
        id: insertedProject.id,
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
          (await storageService.getItem<ProjectProfile[]>("projects")) || [];
        const updatedProjects = allProjects.map((p) =>
          p.id === id ? finalUpdatedProject : p
        );
        await storageService.setItem("projects", updatedProjects);
        console.log(`[ProjectStore] Updated demo project ${id} in storage.`);
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
          console.error(`[ProjectStore] Error updating project ${id}:`, error);
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
          (await storageService.getItem<ProjectProfile[]>("projects")) || [];
        await storageService.setItem(
          "projects",
          allProjects.filter((p) => p.id !== id)
        );
      } else {
        const { error } = await supabase.from("projects").delete().eq("id", id);
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
  })
);

useAuthStore.subscribe((authState, prevAuthState) => {
  const currentUser = authState.user;
  const prevUser = prevAuthState.user;

  if (!currentUser && prevUser) {
    console.log(
      "[ProjectStore Subscription] User logged out. Resetting state."
    );
    useProjectStore.getState().resetProjectState();
    return;
  }

  if (currentUser && currentUser.role !== "borrower" && !authState.isLoading) {
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

  if (user?.role === "borrower" && wasLoading && !isLoading && profile) {
    console.log(
      "[ProjectStore Subscription] Profile load finished. Triggering project load."
    );
    useProjectStore.getState().loadUserProjects();
  }
});
