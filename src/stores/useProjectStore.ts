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
    completenessPercent: "completeness_percent",
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
  addProjectMessage: (
    message: string,
    senderType?: "Borrower" | "Advisor" | "System",
    senderId?: string
  ) => Promise<ProjectMessage>;
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
    autoCreatedFirstProjectThisSession: false,

    resetProjectState: () => {
      console.log("[ProjectStore] Resetting state.");
      set({
        projects: [],
        activeProject: null,
        projectMessages: [],
        projectPrincipals: [],
        documentRequirements: [],
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
            .eq("owner_id", user.id); // Filter by owner
          if (error) throw error;
          userProjects = data as ProjectProfile[];
        }

        const projectsWithProgress = userProjects.map((p) => ({
          ...p,
          borrowerProfileId: borrowerProfile?.id || "",
          ...get().calculateProgress(p),
        }));

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
      const { activeProject } = get();
      if (project?.id === activeProject?.id) return;

      set({ activeProject: project });
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

    createProject: async (projectData: Partial<ProjectProfile>) => {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error("User must be logged in to create a project.");
      const borrowerProfile =
        useBorrowerProfileStore.getState().borrowerProfile;
      if (!borrowerProfile)
        throw new Error("Borrower profile must exist to create a project.");

      // For real users, we can't query other user's UUIDs due to RLS.
      // Set to null and let an admin/backend process assign it later.
      // For demo users, we can keep using the email string as it's just local storage.
      let advisorId: string | null = user.isDemo
        ? "advisor1@capmatch.com"
        : null;
      if (!user.isDemo) {
        console.log(
          "[ProjectStore] Real user detected. Setting assigned advisor to null initially due to RLS policies."
        );
      }

      const now = new Date().toISOString();
      const newProjectData: ProjectProfile = {
        id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        borrowerProfileId: borrowerProfile.id,
        assignedAdvisorUserId: advisorId,
        projectName:
          projectData.projectName || `New Project ${get().projects.length + 1}`,
        assetType: projectData.assetType || "Multifamily",
        projectStatus: "Info Gathering",
        createdAt: now,
        updatedAt: now,
        ...projectData,
        // Ensure required fields have defaults if not provided
        propertyAddressStreet: projectData.propertyAddressStreet || "",
        propertyAddressCity: projectData.propertyAddressCity || "",
        propertyAddressState: projectData.propertyAddressState || "",
        propertyAddressCounty: projectData.propertyAddressCounty || "",
        propertyAddressZip: projectData.propertyAddressZip || "",
        projectDescription: projectData.projectDescription || "",
        loanType: projectData.loanType || "",
        targetLtvPercent: projectData.targetLtvPercent || 0,
        targetLtcPercent: projectData.targetLtcPercent || 0,
        amortizationYears: projectData.amortizationYears || 0,
        interestOnlyPeriodMonths: projectData.interestOnlyPeriodMonths || 0,
        interestRateType: projectData.interestRateType || "Not Specified",
        targetCloseDate: projectData.targetCloseDate || "",
        useOfProceeds: projectData.useOfProceeds || "",
        recoursePreference: projectData.recoursePreference || "Flexible",
        purchasePrice: projectData.purchasePrice || null,
        totalProjectCost: projectData.totalProjectCost || null,
        capexBudget: projectData.capexBudget || null,
        businessPlanSummary: projectData.businessPlanSummary || "",
        marketOverviewSummary: projectData.marketOverviewSummary || "",
        completenessPercent: 0,
        internalAdvisorNotes: "",
        borrowerProgress: 0,
        projectProgress: 0,
      };

      if (user.isDemo) {
        const allProjects =
          (await storageService.getItem<ProjectProfile[]>("projects")) || [];
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
