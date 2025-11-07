import { useCallback, useEffect, useState } from "react";
import {
  BorrowerResumeContent,
  getProjectBorrowerResume,
  saveProjectBorrowerResume,
} from "@/lib/project-queries";

interface UseProjectBorrowerResumeResult {
  content: BorrowerResumeContent | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  setLocalContent: (content: BorrowerResumeContent | null) => void;
  reload: () => Promise<void>;
  save: (updates: Partial<BorrowerResumeContent>) => Promise<void>;
}

export const useProjectBorrowerResume = (
  projectId: string | null
): UseProjectBorrowerResumeResult => {
  const [content, setContent] = useState<BorrowerResumeContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setContent(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await getProjectBorrowerResume(projectId);
      setContent(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load borrower resume");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (updates: Partial<BorrowerResumeContent>) => {
      if (!projectId) {
        throw new Error("Project ID is required to save borrower resume");
      }

      setIsSaving(true);
      setError(null);
      try {
        await saveProjectBorrowerResume(projectId, updates);
        setContent((prev) => ({ ...(prev || {}), ...updates } as BorrowerResumeContent));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save borrower resume";
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId]
  );

  return {
    content,
    isLoading,
    isSaving,
    error,
    setLocalContent: setContent,
    reload: load,
    save,
  };
};
