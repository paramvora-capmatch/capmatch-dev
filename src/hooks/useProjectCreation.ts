import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "./useProjects";
import { useAuth } from "./useAuth";
import { useOrgStore } from "../stores/useOrgStore";
import type { ProjectProfile, ProjectGrant } from "@/types/enhanced-types";
import type { ProjectFormData } from "@/components/project/NewProjectAccessModal";
import type { ProjectResumeContent } from "@/lib/project-queries";

interface UseProjectCreationReturn {
  isCreatingProject: boolean;
  isAccessModalOpen: boolean;
  accessModalError: string | null;
  createdProject: ProjectProfile | null;
  handleCreateNewProject: () => Promise<void>;
  handleAccessModalClose: () => void;
  handleAccessModalSubmit: (
    selections: Record<string, ProjectGrant>,
    projectData: ProjectFormData
  ) => Promise<void>;
}

export const useProjectCreation = (): UseProjectCreationReturn => {
  const router = useRouter();
  const { user, activeOrg } = useAuth();
  const { createProject, deleteProject } = useProjects();
  const { currentOrg, loadOrg } = useOrgStore();

  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessModalError, setAccessModalError] = useState<string | null>(null);
  const [createdProject, setCreatedProject] = useState<ProjectProfile | null>(null);

  const resetModalState = useCallback(() => {
    setIsAccessModalOpen(false);
    setAccessModalError(null);
    setCreatedProject(null);
  }, []);

  const handleAccessModalClose = useCallback(() => {
    if (isCreatingProject) return;
    resetModalState();
  }, [isCreatingProject, resetModalState]);

  const handleCreateNewProject = useCallback(async () => {
    if (isCreatingProject) return;

    if (!activeOrg?.id) {
      console.error("Cannot load organization members: no active organization.");
      return;
    }

    try {
      if (!currentOrg || currentOrg.id !== activeOrg.id) {
        await loadOrg(activeOrg.id);
      }

      setAccessModalError(null);
      setCreatedProject(null);
      setIsAccessModalOpen(true);
    } catch (error) {
      console.error("Failed to prepare organization data:", error);
    }
  }, [activeOrg?.id, currentOrg, isCreatingProject, loadOrg]);

  const handleAccessModalSubmit = useCallback(
    async (selections: Record<string, ProjectGrant>, projectData: ProjectFormData) => {
      if (!activeOrg?.id) {
        setAccessModalError(
          "No active organization is set. Please reload and try again."
        );
        return;
      }

      setIsCreatingProject(true);
      setAccessModalError(null);

      let project: ProjectProfile | null = createdProject;
      try {
        if (!project) {
          // Build project sections with name and address
          const projectSections: Partial<ProjectResumeContent> & {
            propertyAddress?: string;
          } = {
            projectName: projectData.projectName,
          };
          if (projectData.propertyAddress) {
            projectSections.propertyAddress = projectData.propertyAddress;
          }

          // Build initial_grants for backend (exclude creator; backend grants creator automatically)
          const initial_grants = Object.entries(selections)
            .filter(([memberId, grant]) => memberId !== user?.id && grant.permissions?.length)
            .map(([memberId, grant]) => ({
              user_id: memberId,
              permissions: grant.permissions!.map((p) => ({
                resource_type: p.resource_type,
                permission: p.permission,
              })),
            }));

          project = await createProject({
            projectName: projectData.projectName,
            projectSections,
            dealType: projectData.dealType,
            initial_grants,
          } as any);
          setCreatedProject(project);
        }

        if (!project) {
          throw new Error("Project was not created successfully.");
        }

        resetModalState();
        router.push(`/project/workspace/${project.id}`);
      } catch (error) {
        console.error("Failed to create new project or grant access:", error);

        if (project) {
          try {
            await deleteProject(project.id);
          } catch (deleteError) {
            console.error(
              "Failed to roll back project after permission error:",
              deleteError
            );
          } finally {
            setCreatedProject(null);
          }
        }

        const message =
          error instanceof Error
            ? error.message
            : "Failed to create project. Please try again.";
        setAccessModalError(message);
      } finally {
        setIsCreatingProject(false);
      }
    },
    [
      activeOrg?.id,
      createProject,
      deleteProject,
      router,
      createdProject,
      resetModalState,
      user?.id,
    ]
  );

  return {
    isCreatingProject,
    isAccessModalOpen,
    accessModalError,
    createdProject,
    handleCreateNewProject,
    handleAccessModalClose,
    handleAccessModalSubmit,
  };
};

