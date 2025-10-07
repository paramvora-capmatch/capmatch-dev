"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
  useContext,
} from "react";
import { StorageService } from "../services/storage/StorageService";
import { useAuth } from "../hooks/useAuth";
import { BorrowerProfileContext } from "./BorrowerProfileContext";
import {
  ProjectProfile,
  ProjectStatus,
  ProjectPrincipal,
  ProjectDocumentRequirement,
  ProjectMessage,
  BorrowerProfile,
  ProjectPhase,
} from "../types/enhanced-types";
import { getAdvisorById } from "../../lib/enhancedMockApiService";
import { supabase } from "../../lib/supabaseClient";

// Define context interface
interface ProjectContextProps {
  projects: ProjectProfile[];
  isLoading: boolean;
  activeProject: ProjectProfile | null;
  projectMessages: ProjectMessage[];
  projectPrincipals: ProjectPrincipal[];
  documentRequirements: ProjectDocumentRequirement[];
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
  addDocumentRequirement: (
    requirement: Partial<ProjectDocumentRequirement>
  ) => Promise<ProjectDocumentRequirement>;
  updateDocumentRequirement: (
    id: string,
    updates: Partial<ProjectDocumentRequirement>
  ) => Promise<ProjectDocumentRequirement | null>;
  assignPrincipalToProject: (
    principalId: string,
    projectRole: Partial<ProjectPrincipal>
  ) => Promise<ProjectPrincipal>;
  updateProjectPrincipal: (
    id: string,
    updates: Partial<ProjectPrincipal>
  ) => Promise<ProjectPrincipal | null>;
  removeProjectPrincipal: (id: string) => Promise<boolean>;
  updateProjectStatus: (
    id: string,
    status: ProjectStatus
  ) => Promise<ProjectProfile | null>;
  calculateProgress: (project: ProjectProfile) => {
    borrowerProgress: number;
    projectProgress: number;
    totalProgress: number;
  };
  getCompletionStats: () => {
    totalProjects: number;
    inProgressProjects: number;
    completedProjects: number;
    averageBorrowerProgress: number;
    averageProjectProgress: number;
  };
  projectChanges: boolean;
  setProjectChanges: (hasChanges: boolean) => void;
  autoSaveProject: () => Promise<void>;
  // Add a function to reset state, useful for borrower3 clearing
  resetProjectState: () => void;
  autoCreatedFirstProjectThisSession: boolean;
}

// Default Project object
const defaultProject: ProjectProfile = {
  id: "",
  borrowerProfileId: "",
  assignedAdvisorUserId: null,
  projectName: "",
  name: "",
  propertyAddressStreet: "",
  propertyAddressCity: "",
  propertyAddressState: "",
  propertyAddressCounty: "",
  propertyAddressZip: "",
  assetType: "",
  projectDescription: "",
  projectPhase: "Acquisition",
  loanAmountRequested: 0,
  loanType: "",
  targetLtvPercent: 0,
  targetLtcPercent: 0,
  amortizationYears: 0,
  interestOnlyPeriodMonths: 0,
  interestRateType: "Not Specified",
  targetCloseDate: "",
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
  equityCommittedPercent: 0,
  projectStatus: "Draft",
  completenessPercent: 0,
  internalAdvisorNotes: "",
  borrowerProgress: 0,
  projectProgress: 0,
  createdAt: "",
  updatedAt: "",
  projectSections: {},
  borrowerSections: {},
};

// Default Context value
export const ProjectContext = createContext<ProjectContextProps>({
  projects: [],
  isLoading: true,
  activeProject: null,
  projectMessages: [],
  projectPrincipals: [],
  documentRequirements: [],
  createProject: async () => defaultProject,
  updateProject: async () => null,
  deleteProject: async () => false,
  getProject: () => null,
  setActiveProject: () => {},
  addProjectMessage: async () => ({
    id: "",
    projectId: "",
    senderId: "",
    senderType: "Borrower",
    message: "",
    createdAt: "",
  }),
  addDocumentRequirement: async () => ({
    id: "",
    projectId: "",
    requiredDocType: "Other",
    status: "Required",
    documentId: null,
    notes: "",
    dueDate: null,
    lastUpdated: "",
  }),
  updateDocumentRequirement: async () => null,
  assignPrincipalToProject: async () => ({
    id: "",
    projectId: "",
    principalId: "",
    roleInProject: "Guarantor",
    guarantyDetails: null,
    isKeyPrincipal: false,
    isPrimaryContact: false,
    createdAt: "",
  }),
  updateProjectPrincipal: async () => null,
  removeProjectPrincipal: async () => false,
  updateProjectStatus: async () => null,
  calculateProgress: () => ({
    borrowerProgress: 0,
    projectProgress: 0,
    totalProgress: 0,
  }),
  getCompletionStats: () => ({
    totalProjects: 0,
    inProgressProjects: 0,
    completedProjects: 0,
    averageBorrowerProgress: 0,
    averageProjectProgress: 0,
  }),
  projectChanges: false,
  setProjectChanges: () => {},
  autoSaveProject: async () => {},
  resetProjectState: () => {}, // Add reset function default
  autoCreatedFirstProjectThisSession: false,
});

// Provider Implementation
interface ProjectProviderProps {
  children: ReactNode;
  storageService: StorageService;
}
const AUTO_SAVE_INTERVAL = 3000;
const generateUniqueId = (): string =>
  `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const ProjectProvider: React.FC<ProjectProviderProps> = ({
  children,
  storageService,
}) => {
  const [projects, setProjects] = useState<ProjectProfile[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectProfile | null>(
    null
  );
  const [projectMessages, setProjectMessages] = useState<ProjectMessage[]>([]);
  const [projectPrincipals, setProjectPrincipals] = useState<
    ProjectPrincipal[]
  >([]);
  const [documentRequirements, setDocumentRequirements] = useState<
    ProjectDocumentRequirement[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectChanges, setProjectChanges] = useState(false);
  const [
    autoCreatedFirstProjectThisSession,
    setAutoCreatedFirstProjectThisSession,
  ] = useState(false);

  const { user, isLoading: authIsLoading } = useAuth();
  const borrowerProfileContext = useContext(BorrowerProfileContext);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  // Reset State Function
  const resetProjectState = useCallback(() => {
    console.log("[ProjectContext] Resetting state.");
    setProjects([]);
    setActiveProject(null);
    setProjectMessages([]);
    setProjectPrincipals([]);
    setDocumentRequirements([]);
    setProjectChanges(false);
    setAutoCreatedFirstProjectThisSession(false);
    lastSavedRef.current = null;
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    // No need to set isLoading here, loading effects will handle it
  }, []); // No dependencies needed

  // Calculate Progress
  const calculateProgress = useCallback(
    (
      project: ProjectProfile
    ): {
      borrowerProgress: number;
      projectProgress: number;
      totalProgress: number;
    } => {
      // For new users (not borrower1/borrower2), start with 0% if they haven't filled meaningful info
      const isTestUser =
        project.borrowerProfileId &&
        (project.borrowerProfileId.includes("borrower1@example.com") ||
          project.borrowerProfileId.includes("borrower2@example.com"));

      if (!isTestUser) {
        // For new users, only count fields that have meaningful content (not just defaults)
        const meaningfulBorrowerFields: (keyof ProjectProfile)[] = [
          "projectName",
          "propertyAddressStreet",
          "propertyAddressCity",
          "propertyAddressState",
          "propertyAddressZip",
          "assetType",
        ];
        const meaningfulProjectFields: (keyof ProjectProfile)[] = [
          "projectDescription",
          "loanAmountRequested",
          "loanType",
          "targetCloseDate",
          "useOfProceeds",
          "businessPlanSummary",
        ];

        let meaningfulBorrowerCount = 0;
        meaningfulBorrowerFields.forEach((field) => {
          const value = project[field];
          if (value && String(value).trim() !== "") meaningfulBorrowerCount++;
        });

        let meaningfulProjectCount = 0;
        meaningfulProjectFields.forEach((field) => {
          const value = project[field];
          if (typeof value === "number" && value > 0) meaningfulProjectCount++;
          else if (value && String(value).trim() !== "")
            meaningfulProjectCount++;
        });

        // Only count other fields if they have meaningful values (not undefined or defaults)
        if (project.projectPhase && project.projectPhase !== "Acquisition")
          meaningfulProjectCount++;
        if (project.targetLtvPercent && project.targetLtvPercent > 0)
          meaningfulProjectCount++;
        if (
          project.recoursePreference &&
          project.recoursePreference !== "Flexible"
        )
          meaningfulProjectCount++;
        if (project.exitStrategy && project.exitStrategy !== "Undecided")
          meaningfulProjectCount++;

        // For new users, be very strict - only count truly filled fields
        const borrowerProgress =
          meaningfulBorrowerFields.length > 0
            ? Math.round(
                (meaningfulBorrowerCount / meaningfulBorrowerFields.length) *
                  100
              )
            : 0;
        const projectProgress =
          meaningfulProjectFields.length > 0
            ? Math.round(
                (meaningfulProjectCount / meaningfulProjectFields.length) * 100
              )
            : 0;
        const totalProgress = Math.round(
          (borrowerProgress + projectProgress) / 2
        );
        return { borrowerProgress, projectProgress, totalProgress };
      } else {
        // For test users, use the original calculation logic
        const borrowerRequiredFields: (keyof ProjectProfile)[] = [
          "projectName",
          "propertyAddressStreet",
          "propertyAddressCity",
          "propertyAddressState",
          "propertyAddressZip",
          "assetType",
        ];
        const projectRequiredFields: (keyof ProjectProfile)[] = [
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
        const filledBorrowerFields = borrowerRequiredFields.filter((field) => {
          const value = project[field];
          return (
            value !== null && value !== undefined && String(value).trim() !== ""
          );
        }).length;
        const filledProjectFields = projectRequiredFields.filter((field) => {
          const value = project[field];
          if (typeof value === "number") return true;
          return (
            value !== null && value !== undefined && String(value).trim() !== ""
          );
        }).length;
        const borrowerProgress =
          borrowerRequiredFields.length > 0
            ? Math.round(
                (filledBorrowerFields / borrowerRequiredFields.length) * 100
              )
            : 0;
        const projectProgress =
          projectRequiredFields.length > 0
            ? Math.round(
                (filledProjectFields / projectRequiredFields.length) * 100
              )
            : 0;
        const totalProgress = Math.round(
          (borrowerProgress + projectProgress) / 2
        );
        return { borrowerProgress, projectProgress, totalProgress };
      }
    },
    []
  );

  // Auto Save Project
  const autoSaveProject = useCallback(async () => {
    if (!activeProject || !projectChanges) return;
    try {
      const projectStateStr = JSON.stringify(activeProject);
      if (projectStateStr !== lastSavedRef.current) {
        const now = new Date().toISOString();
        const progress = calculateProgress(activeProject);
        const updatedProject = {
          ...activeProject,
          borrowerProgress: progress.borrowerProgress,
          projectProgress: progress.projectProgress,
          completenessPercent: progress.totalProgress,
          updatedAt: now,
        };
        setActiveProject(updatedProject); // Update active project state
        setProjects((prevProjects) =>
          prevProjects.map((p) =>
            p.id === updatedProject.id ? updatedProject : p
          )
        ); // Update in main list
        lastSavedRef.current = JSON.stringify(updatedProject);
        setProjectChanges(false);
        console.log(
          `[ProjectContext] Auto-saved project: ${updatedProject.projectName}`
        );
      }
    } catch (error) {
      console.error("[ProjectContext] Failed to auto-save project:", error);
    }
  }, [activeProject, projectChanges, calculateProgress]);

  // useEffect for Auto Save Timer
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
    if (activeProject && projectChanges) {
      autoSaveTimerRef.current = setInterval(
        autoSaveProject,
        AUTO_SAVE_INTERVAL
      );
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [activeProject, projectChanges, autoSaveProject]);

  // Load Active Project Data (Messages, Principals, Docs)
  const loadActiveProjectData = useCallback(
    async (projectId: string) => {
      if (!projectId) {
        setProjectMessages([]);
        setProjectPrincipals([]);
        setDocumentRequirements([]);
        return;
      }
      // No setIsLoading here, main loading handles initial, this is background loading for specific data
      try {
        const [allMessages, allPrincipals, allDocs] = await Promise.all([
          storageService.getItem<ProjectMessage[]>("projectMessages"),
          storageService.getItem<ProjectPrincipal[]>("projectPrincipals"),
          storageService.getItem<ProjectDocumentRequirement[]>(
            "documentRequirements"
          ),
        ]);
        setProjectMessages(
          (allMessages || []).filter((msg) => msg.projectId === projectId)
        );
        setProjectPrincipals(
          (allPrincipals || []).filter((pp) => pp.projectId === projectId)
        );
        setDocumentRequirements(
          (allDocs || []).filter((req) => req.projectId === projectId)
        );
      } catch (error) {
        console.error(
          `[ProjectContext] Failed to load data for project ${projectId}:`,
          error
        );
        setProjectMessages([]);
        setProjectPrincipals([]);
        setDocumentRequirements([]);
      }
    },
    [storageService]
  );

  // useEffect to Load User's Projects
  useEffect(() => {
    const loadUserProjects = async () => {
      // Explicitly wait for both auth and profile contexts to finish their initial loading.
      if (
        authIsLoading ||
        (user?.role === "borrower" && borrowerProfileContext.isLoading)
      ) {
        setIsLoading(true);
        return;
      }

      const currentProfile = borrowerProfileContext.borrowerProfile;
      // Now that upstream contexts are stable, we can make a decision.
      if (!user || (user.role === "borrower" && !currentProfile)) {
        resetProjectState();
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // RLS automatically filters to only this user's projects!
        const { data: userProjects, error } = await supabase
          .from("projects")
          .select("*");

        if (error) throw error;

        if (user.role === "borrower" && currentProfile) {
          // For borrowers, the RLS policy on the 'projects' table automatically handles filtering.
          // The data fetched above is already correct.
        } else if (user.role === "advisor" || user.role === "admin") {
          // We will implement advisor project fetching logic in a later step.
          // For now, they will see an empty list, which is correct.
        }
        const projectsWithProgress = userProjects.map((p) => ({
          ...p,
          ...calculateProgress(p),
        }));
        setProjects(projectsWithProgress);
        if (
          activeProject &&
          !projectsWithProgress.some((p) => p.id === activeProject.id)
        ) {
          setActiveProject(null);
        }
      } catch (error) {
        console.error("[ProjectContext] Failed to load projects:", error);
        setProjects([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserProjects();
  }, [
    user,
    borrowerProfileContext.borrowerProfile,
    authIsLoading,
    borrowerProfileContext.isLoading,
    calculateProgress,
    resetProjectState,
  ]);

  // useEffect to load data when activeProject changes
  useEffect(() => {
    if (activeProject) {
      loadActiveProjectData(activeProject.id);
    } else {
      setProjectMessages([]);
      setProjectPrincipals([]);
      setDocumentRequirements([]);
    }
  }, [activeProject, loadActiveProjectData]);

  // Get Completion Stats
  const getCompletionStats = useCallback((): {
    totalProjects: number;
    inProgressProjects: number;
    completedProjects: number;
    averageBorrowerProgress: number;
    averageProjectProgress: number;
  } => {
    const totalProjects = projects.length;
    if (totalProjects === 0)
      return {
        totalProjects: 0,
        inProgressProjects: 0,
        completedProjects: 0,
        averageBorrowerProgress: 0,
        averageProjectProgress: 0,
      };
    const completedProjects = projects.filter(
      (p) => p.completenessPercent === 100
    ).length;
    const inProgressProjects = totalProjects - completedProjects;
    const totalBorrowerProgress = projects.reduce(
      (sum, p) => sum + (p.borrowerProgress || 0),
      0
    );
    const totalProjectProgress = projects.reduce(
      (sum, p) => sum + (p.projectProgress || 0),
      0
    );
    const averageBorrowerProgress =
      totalProjects > 0 ? Math.round(totalBorrowerProgress / totalProjects) : 0;
    const averageProjectProgress =
      totalProjects > 0 ? Math.round(totalProjectProgress / totalProjects) : 0;
    return {
      totalProjects,
      inProgressProjects,
      completedProjects,
      averageBorrowerProgress,
      averageProjectProgress,
    };
  }, [projects]);

  // Add Status Message Helper
  const addStatusMessage = useCallback(
    async (projectId: string, status: ProjectStatus) => {
      const statusMessages: Partial<Record<ProjectStatus, string>> = {
        "Info Gathering":
          "Project status updated: We're now gathering information.",
        "Advisor Review": "Project submitted for Advisor Review.",
        "Matches Curated": "Lender matches have been curated for your project.",
        "Introductions Sent": "Introductions sent to selected lenders.",
        "Term Sheet Received": "Congratulations! You've received a term sheet.",
        Closed: "Congratulations! Your project funding has closed.",
        Withdrawn: "This project has been withdrawn.",
        Stalled: "Project status marked as Stalled.",
      };
      const messageText = statusMessages[status];
      if (!messageText) return;
      try {
        const now = new Date().toISOString();
        const messageId = `msg_status_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 9)}`;
        const statusMessage: ProjectMessage = {
          id: messageId,
          projectId: projectId,
          senderId: "system",
          senderType: "System",
          message: messageText,
          createdAt: now,
        };
        if (activeProject?.id === projectId) {
          setProjectMessages((prev) => [...prev, statusMessage]);
        }
        const allMessages =
          (await storageService.getItem<ProjectMessage[]>("projectMessages")) ||
          [];
        await storageService.setItem("projectMessages", [
          ...allMessages,
          statusMessage,
        ]);
      } catch (error) {
        console.error(
          `[ProjectContext] Failed status message add for ${projectId}:`,
          error
        );
      }
    },
    [storageService, activeProject]
  );

  // Update Project Status
  const updateProjectStatus = useCallback(
    async (
      id: string,
      status: ProjectStatus
    ): Promise<ProjectProfile | null> => {
      let updatedProject: ProjectProfile | null = null;
      let originalStatus: ProjectStatus | undefined;
      setProjects((prevProjects) => {
        const i = prevProjects.findIndex((p) => p.id === id);
        if (i === -1) return prevProjects;
        const now = new Date().toISOString();
        originalStatus = prevProjects[i].projectStatus;
        updatedProject = {
          ...prevProjects[i],
          projectStatus: status,
          updatedAt: now,
        };
        const list = [...prevProjects];
        list[i] = updatedProject;
        return list;
      });
      if (activeProject?.id === id && updatedProject) {
        setActiveProject(updatedProject);
      }
      if (updatedProject) {
        await addStatusMessage(id, status);
      }
      return updatedProject;
    },
    [activeProject, addStatusMessage]
  ); // projects removed from dependencies

  // Add Project Message
  const addProjectMessage = useCallback(
    async (
      message: string,
      senderType: "Borrower" | "Advisor" | "System" = "Borrower",
      senderId?: string
    ): Promise<ProjectMessage> => {
      if (!activeProject) throw new Error("No active project");
      const now = new Date().toISOString();
      const mid = `msg_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      let finalSenderId = senderId;
      if (!finalSenderId) {
        if (senderType === "Borrower")
          finalSenderId = user?.email || "borrower";
        else if (senderType === "Advisor")
          finalSenderId = activeProject.assignedAdvisorUserId || "advisor";
        else finalSenderId = "system";
      }
      const newMessage: ProjectMessage = {
        id: mid,
        projectId: activeProject.id,
        senderId: finalSenderId,
        senderType: senderType,
        message,
        createdAt: now,
      };
      setProjectMessages((prev) => [...prev, newMessage]); // Update local state immediately
      try {
        const all =
          (await storageService.getItem<ProjectMessage[]>("projectMessages")) ||
          [];
        await storageService.setItem("projectMessages", [...all, newMessage]);
      } catch (e) {
        console.error(`Failed save msg for ${activeProject.id}:`, e);
        setProjectMessages((prev) => prev.filter((m) => m.id !== mid));
        throw e;
      }
      if (
        activeProject.projectStatus === "Draft" &&
        senderType === "Borrower"
      ) {
        await updateProjectStatus(activeProject.id, "Info Gathering");
      }
      return newMessage;
    },
    [activeProject, user, storageService, updateProjectStatus]
  );

  // Create Project
  const createProject = useCallback(
    async (projectData: Partial<ProjectProfile>): Promise<ProjectProfile> => {
      const currentProfile = borrowerProfileContext.borrowerProfile;
      if (user?.role === "borrower" && !currentProfile)
        throw new Error("[ProjectContext] Borrower profile must be loaded.");

      if (!user?.id) {
        throw new Error("Cannot create project: User is not authenticated.");
      }

      const now = new Date().toISOString();
      const uniqueId = generateUniqueId();
      const advisors = [
        { id: "advisor1@capmatch.com" },
        { id: "advisor2@capmatch.com" },
        { id: "advisor3@capmatch.com" },
      ];
      const randomAdvisor =
        advisors[Math.floor(Math.random() * advisors.length)];

      // Calculate next project number based on current state projects for this user
      const currentUserProjects = projects.filter(
        (p) => p.borrowerProfileId === currentProfile?.id
      );
      const nextProjectNumber = currentUserProjects.length + 1;
      const defaultProjectName = `Unnamed Project ${nextProjectNumber}`;

      const newProjectDataForDb = {
        project_name: projectData.projectName || defaultProjectName,
        asset_type: projectData.assetType || "Multifamily", // Ensure NOT NULL constraint is met
        owner_id: user.id, // This satisfies the RLS policy
      };

      if (!newProjectDataForDb.owner_id) {
        throw new Error("Cannot create project: User is not authenticated.");
      }

      // For new users (not borrower1/borrower2), start with 0% progress
      const isTestUser =
        user?.email === "borrower1@example.com" ||
        user?.email === "borrower2@example.com";

      const { data: insertedProject, error } = await supabase
        .from("projects")
        .insert(newProjectDataForDb)
        .select()
        .single();

      if (error) throw error;

      const newProject = insertedProject as ProjectProfile;

      // Now calculate progress after the project is created
      if (isTestUser) {
        const progress = calculateProgress(newProject);
        newProject.borrowerProgress = progress.borrowerProgress;
        newProject.projectProgress = progress.projectProgress;
        newProject.completenessPercent = progress.totalProgress;
      } else {
        newProject.borrowerProgress = 0;
        newProject.projectProgress = 0;
        newProject.completenessPercent = 0;
      }

      setProjects((prevProjects) => [...prevProjects, newProject]);
      setActiveProject(newProject); // Set new project active
      console.log(
        `[ProjectContext] Created: "${newProject.project_name}" (ID: ${newProject.id})`
      );
      return newProject;
    },
    [user, borrowerProfileContext.borrowerProfile, projects, calculateProgress]
  ); // dependencies reviewed

  // --------------------------------------------------------
  // Auto-create first project for new borrower accounts
  // --------------------------------------------------------
  useEffect(() => {
    if (isLoading) return; // Wait for initial load
    if (!user || user.role !== "borrower") return;
    if (!borrowerProfileContext.borrowerProfile) return; // Need profile
    // This check is now handled by the main useEffect loading projects from Supabase.
    // If Supabase returns 0 projects, this flow can continue.
    if (autoCreatedFirstProjectThisSession) return; // Prevent multiple auto-creations in same session

    console.log(
      "[ProjectContext] Auto-create effect triggered for user:",
      user.email
    );

    (async () => {
      try {
        // 1️⃣ Double-check storage to avoid duplicates
        const profile = borrowerProfileContext.borrowerProfile;
        if (!profile) return; // Safety check

        // This logic is now handled by the main useEffect loading projects from Supabase.
        // If Supabase returns 0 projects, this flow can continue.
        const { data: projectsFromDb } = await supabase
          .from("projects")
          .select("id");
        if (projectsFromDb && projectsFromDb.length > 0) {
          console.log(
            `[ProjectContext] Found ${projectsFromDb.length} existing projects in DB, skipping auto-create.`
          );
          setProjects(projectsFromDb as ProjectProfile[]);
          // setActiveProject(projectsFromDb[0] as ProjectProfile); // Set first project as active
          setAutoCreatedFirstProjectThisSession(false);
          return; // nothing to create
        }

        // 2️⃣ Still none → create first project
        console.log(
          "[ProjectContext] No existing projects found, creating first project"
        );
        // For new users (not borrower1/borrower2), create completely empty project
        const isTestUser =
          user.email === "borrower1@example.com" ||
          user.email === "borrower2@example.com";

        if (isTestUser) {
          // For test users, create project with default name
          await createProject({ projectName: "Unnamed Project 1" });
        } else {
          // For new users, create project with truly minimal data - no defaults
          await createProject({
            projectName: "New Project",
            projectDescription: "",
            assetType: "",
            projectPhase: undefined,
            loanAmountRequested: undefined,
            loanType: "",
            targetLtvPercent: undefined,
            targetLtcPercent: undefined,
            amortizationYears: undefined,
            interestOnlyPeriodMonths: undefined,
            interestRateType: undefined,
            targetCloseDate: "",
            useOfProceeds: "",
            recoursePreference: undefined,
            purchasePrice: null,
            totalProjectCost: null,
            capexBudget: null,
            propertyNoiT12: null,
            stabilizedNoiProjected: null,
            exitStrategy: undefined,
            businessPlanSummary: "",
            marketOverviewSummary: "",
            equityCommittedPercent: undefined,
          });
        }
        setAutoCreatedFirstProjectThisSession(true); // Set flag to true after successful auto-creation
        console.log("[ProjectContext] Auto-created first project successfully");
      } catch (err) {
        console.error("[ProjectContext] Auto-create project failed:", err);
      }
    })();
  }, [
    isLoading,
    user,
    borrowerProfileContext.borrowerProfile,
    createProject,
    calculateProgress,
  ]);

  // Update Project
  const updateProject = useCallback(
    async (
      id: string,
      updates: Partial<ProjectProfile>,
      manual = false
    ): Promise<ProjectProfile | null> => {
      let updatedProject: ProjectProfile | null = null;
      let originalStatus: ProjectStatus | undefined;
      setProjects((prevProjects) => {
        const i = prevProjects.findIndex((p) => p.id === id);
        if (i === -1) return prevProjects;
        const now = new Date().toISOString();
        originalStatus = prevProjects[i].projectStatus;
        updatedProject = { ...prevProjects[i], ...updates, updatedAt: now };
        const progress = calculateProgress(updatedProject);
        updatedProject.borrowerProgress = progress.borrowerProgress;
        updatedProject.projectProgress = progress.projectProgress;
        updatedProject.completenessPercent = progress.totalProgress;
        const list = [...prevProjects];
        list[i] = updatedProject;
        return list;
      });
      if (updatedProject) {
        if (activeProject?.id === id) {
          setActiveProject(updatedProject);
        } // Update active state too
        if (manual) {
          lastSavedRef.current = JSON.stringify(updatedProject);
          setProjectChanges(false);
        } else if (activeProject?.id === id) {
          setProjectChanges(false);
        } // Reset changes on non-manual update of active project
        if (updates.projectStatus && updates.projectStatus !== originalStatus) {
          await addStatusMessage(id, updates.projectStatus);
        }
      }
      return updatedProject;
    },
    [activeProject, calculateProgress, addStatusMessage]
  ); // projects removed dependency

  // Delete Project
  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const { error } = await supabase.from("projects").delete().eq("id", id);
        if (error) throw error;

        setProjects((prevProjects) => prevProjects.filter((p) => p.id !== id)); // Update local state
        if (activeProject?.id === id) {
          setActiveProject(null);
        } // Clear active if deleted

        console.log(`[ProjectContext] Deleted project ${id}`);
        return true;
      } catch (error) {
        console.error(`[ProjectContext] Failed delete project ${id}:`, error);
        return false;
      }
    },
    [activeProject]
  );

  // Add Document Requirement
  const addDocumentRequirement = useCallback(
    async (
      requirement: Partial<ProjectDocumentRequirement>
    ): Promise<ProjectDocumentRequirement> => {
      const projectId = requirement.projectId || activeProject?.id;
      if (!projectId) throw new Error("No project ID");
      const now = new Date().toISOString();
      const reqId = `req_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const newReq: ProjectDocumentRequirement = {
        id: reqId,
        projectId: projectId,
        requiredDocType: requirement.requiredDocType || "Other",
        status: requirement.status || "Required",
        documentId: requirement.documentId || null,
        notes: requirement.notes || "",
        dueDate: requirement.dueDate || null,
        lastUpdated: now,
      };
      if (activeProject?.id === projectId)
        setDocumentRequirements((prev) => [...prev, newReq]);
      try {
        const all =
          (await storageService.getItem<ProjectDocumentRequirement[]>(
            "documentRequirements"
          )) || [];
        await storageService.setItem("documentRequirements", [...all, newReq]);
      } catch (e) {
        console.error(`Failed save doc req for ${projectId}:`, e);
        if (activeProject?.id === projectId)
          setDocumentRequirements((prev) => prev.filter((r) => r.id !== reqId));
        throw e;
      }
      return newReq;
    },
    [activeProject, storageService]
  );

  // Update Document Requirement
  const updateDocumentRequirement = useCallback(
    async (
      id: string,
      updates: Partial<ProjectDocumentRequirement>
    ): Promise<ProjectDocumentRequirement | null> => {
      let updatedReq: ProjectDocumentRequirement | null = null;
      let pid: string | null = null;
      setDocumentRequirements((prev) => {
        const i = prev.findIndex((r) => r.id === id);
        if (i === -1) return prev;
        pid = prev[i].projectId;
        const now = new Date().toISOString();
        updatedReq = { ...prev[i], ...updates, lastUpdated: now };
        const list = [...prev];
        list[i] = updatedReq;
        return list;
      });
      if (updatedReq && pid) {
        try {
          const all =
            (await storageService.getItem<ProjectDocumentRequirement[]>(
              "documentRequirements"
            )) || [];
          const others = all.filter((r) => r.id !== id);
          await storageService.setItem("documentRequirements", [
            ...others,
            updatedReq,
          ]);
        } catch (e) {
          console.error(`Failed update doc req ${id}:`, e);
          updatedReq = null;
          throw e;
        }
      } else if (!pid) {
        try {
          const all =
            (await storageService.getItem<ProjectDocumentRequirement[]>(
              "documentRequirements"
            )) || [];
          const i = all.findIndex((r) => r.id === id);
          if (i !== -1) {
            const now = new Date().toISOString();
            updatedReq = { ...all[i], ...updates, lastUpdated: now };
            all[i] = updatedReq;
            await storageService.setItem("documentRequirements", all);
          } else {
            updatedReq = null;
          }
        } catch (e) {
          console.error(`Failed update doc req ${id}:`, e);
          updatedReq = null;
          throw e;
        }
      }
      return updatedReq;
    },
    [storageService]
  ); // Removed documentRequirements dependency

  // Assign Principal To Project
  const assignPrincipalToProject = useCallback(
    async (
      principalId: string,
      projectRole: Partial<ProjectPrincipal>
    ): Promise<ProjectPrincipal> => {
      if (!activeProject) throw new Error("No active project");
      const pid = activeProject.id;
      const now = new Date().toISOString();
      const rid = `projp_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;
      const newPP: ProjectPrincipal = {
        id: rid,
        projectId: pid,
        principalId: principalId,
        roleInProject: projectRole.roleInProject || "Key Principal",
        guarantyDetails: projectRole.guarantyDetails || null,
        isKeyPrincipal: projectRole.isKeyPrincipal || false,
        isPrimaryContact: projectRole.isPrimaryContact || false,
        createdAt: now,
      };
      setProjectPrincipals((prev) => [...prev, newPP]);
      try {
        const all =
          (await storageService.getItem<ProjectPrincipal[]>(
            "projectPrincipals"
          )) || [];
        await storageService.setItem("projectPrincipals", [...all, newPP]);
      } catch (e) {
        console.error(`Failed assign principal ${principalId} to ${pid}:`, e);
        setProjectPrincipals((prev) => prev.filter((p) => p.id !== rid));
        throw e;
      }
      return newPP;
    },
    [activeProject, storageService]
  );

  // Update Project Principal
  const updateProjectPrincipal = useCallback(
    async (
      id: string,
      updates: Partial<ProjectPrincipal>
    ): Promise<ProjectPrincipal | null> => {
      let updatedPP: ProjectPrincipal | null = null;
      let pid: string | null = null;
      setProjectPrincipals((prev) => {
        const i = prev.findIndex((p) => p.id === id);
        if (i === -1) return prev;
        pid = prev[i].projectId;
        updatedPP = { ...prev[i], ...updates };
        const list = [...prev];
        list[i] = updatedPP;
        return list;
      });
      if (updatedPP && pid) {
        try {
          const all =
            (await storageService.getItem<ProjectPrincipal[]>(
              "projectPrincipals"
            )) || [];
          const others = all.filter((p) => p.id !== id);
          await storageService.setItem("projectPrincipals", [
            ...others,
            updatedPP,
          ]);
        } catch (e) {
          console.error(`Failed update project principal ${id}:`, e);
          updatedPP = null;
          throw e;
        }
      } else if (!pid) {
        try {
          const all =
            (await storageService.getItem<ProjectPrincipal[]>(
              "projectPrincipals"
            )) || [];
          const i = all.findIndex((p) => p.id === id);
          if (i !== -1) {
            updatedPP = { ...all[i], ...updates };
            all[i] = updatedPP;
            await storageService.setItem("projectPrincipals", all);
          } else {
            updatedPP = null;
          }
        } catch (e) {
          console.error(`Failed update project principal ${id}:`, e);
          updatedPP = null;
          throw e;
        }
      }
      return updatedPP;
    },
    [storageService]
  ); // Removed projectPrincipals dependency

  // Remove Project Principal
  const removeProjectPrincipal = useCallback(
    async (id: string): Promise<boolean> => {
      let pid: string | null = null;
      let removedLocally = false;
      setProjectPrincipals((prev) => {
        const len = prev.length;
        const filtered = prev.filter((p) => {
          if (p.id === id) {
            pid = p.projectId;
            return false;
          }
          return true;
        });
        removedLocally = filtered.length < len;
        return filtered;
      });
      try {
        const all =
          (await storageService.getItem<ProjectPrincipal[]>(
            "projectPrincipals"
          )) || [];
        const updated = all.filter((p) => p.id !== id);
        if (updated.length < all.length) {
          await storageService.setItem("projectPrincipals", updated);
          return true;
        }
        return removedLocally;
      } catch (error) {
        console.error(`Failed remove project principal ${id}:`, error);
        return false;
      }
    },
    [storageService]
  );

  // Set Active Project and Load Data
  const setActiveProjectAndLoadData = useCallback(
    (project: ProjectProfile | null) => {
      if (project?.id === activeProject?.id) return; // Avoid reload if same project
      setActiveProject(project);
      setProjectChanges(false);
      lastSavedRef.current = project ? JSON.stringify(project) : null;
      // Loading data now handled by useEffect watching activeProject
    },
    [activeProject?.id]
  ); // Dependency changed

  return (
    <ProjectContext.Provider
      value={{
        projects,
        isLoading,
        activeProject,
        projectMessages,
        projectPrincipals,
        documentRequirements,
        createProject,
        updateProject,
        deleteProject,
        getProject: (id: string) => projects.find((p) => p.id === id) || null,
        setActiveProject: setActiveProjectAndLoadData,
        addProjectMessage,
        addDocumentRequirement,
        updateDocumentRequirement,
        assignPrincipalToProject,
        updateProjectPrincipal,
        removeProjectPrincipal,
        updateProjectStatus,
        calculateProgress,
        getCompletionStats,
        projectChanges,
        setProjectChanges,
        autoSaveProject,
        resetProjectState,
        autoCreatedFirstProjectThisSession,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
