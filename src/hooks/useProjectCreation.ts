import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
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

  const applyMemberPermissions = useCallback(
    async (projectId: string, selections: Record<string, ProjectGrant>) => {
      if (!user?.id) {
        throw new Error("User context missing while granting permissions.");
      }

      for (const [memberId, grant] of Object.entries(selections)) {
        // Skip if this is the current user (creator), as backend grants access automatically
        if (memberId === user.id) continue;

        // Skip if no permissions are set
        if (!grant.permissions || grant.permissions.length === 0) {
          continue;
        }

        // Convert ProjectGrant permissions to the format expected by grant_project_access RPC
        const permissionPayload = grant.permissions.map((perm) => ({
          resource_type: perm.resource_type,
          permission: perm.permission,
        }));

        const { error: grantError } = await supabase.rpc("grant_project_access", {
          p_project_id: projectId,
          p_user_id: memberId,
          p_granted_by_id: user.id,
          p_permissions: permissionPayload,
        });

        if (grantError) {
          throw new Error(
            grantError.message || `Failed to grant access to selected member.`
          );
        }
      }
    },
    [user?.id]
  );

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
          // Address will be parsed/derived on the backend
          const projectSections: Partial<ProjectResumeContent> & {
            propertyAddress?: string; // Temporary field for backend parsing
          } = {
            projectName: projectData.projectName,
          };
          
          // Pass the full address string - backend will parse it
          if (projectData.propertyAddress) {
            projectSections.propertyAddress = projectData.propertyAddress;
          }

          project = await createProject({
            projectName: projectData.projectName,
            projectSections,
            dealType: projectData.dealType,
          } as any);
          setCreatedProject(project);
        }

        if (!project) {
          throw new Error("Project was not created successfully.");
        }

        // At this point, project is guaranteed to be non-null
        const finalProject = project;

        // Set projectId in each grant before applying permissions
        const grantsWithProjectId: Record<string, ProjectGrant> = {};
        Object.entries(selections).forEach(([memberId, grant]) => {
          grantsWithProjectId[memberId] = {
            ...grant,
            projectId: finalProject.id,
          };
        });

        await applyMemberPermissions(finalProject.id, grantsWithProjectId);

        resetModalState();
        router.push(`/project/workspace/${finalProject.id}`);
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
      applyMemberPermissions,
      createProject,
      deleteProject,
      router,
      createdProject,
      resetModalState,
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

