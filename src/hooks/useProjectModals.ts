import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ProjectProfile } from "@/types/enhanced-types";

interface UseProjectModalsReturn {
  isProjectSelectModalOpen: boolean;
  selectedProjectId: string;
  openProjectSelectModal: (primaryProjectId?: string) => void;
  closeProjectSelectModal: () => void;
  setSelectedProjectId: (id: string) => void;
  handleProjectSelectSubmit: () => void;
}

export const useProjectModals = (
  projects: ProjectProfile[]
): UseProjectModalsReturn => {
  const router = useRouter();
  const [isProjectSelectModalOpen, setIsProjectSelectModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const openProjectSelectModal = useCallback(
    (primaryProjectId?: string) => {
      setIsProjectSelectModalOpen(true);
      if (primaryProjectId) {
        setSelectedProjectId(primaryProjectId);
      } else {
        setSelectedProjectId("");
      }
    },
    []
  );

  const closeProjectSelectModal = useCallback(() => {
    setIsProjectSelectModalOpen(false);
    setSelectedProjectId("");
  }, []);

  const handleProjectSelectSubmit = useCallback(() => {
    if (!selectedProjectId) {
      return;
    }

    setIsProjectSelectModalOpen(false);
    router.push(`/project/workspace/${selectedProjectId}?step=borrower`);
    setSelectedProjectId("");
  }, [selectedProjectId, router]);

  return {
    isProjectSelectModalOpen,
    selectedProjectId,
    openProjectSelectModal,
    closeProjectSelectModal,
    setSelectedProjectId,
    handleProjectSelectSubmit,
  };
};

