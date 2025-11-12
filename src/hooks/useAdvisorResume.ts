import { useCallback, useEffect, useState } from "react";
import {
  AdvisorResumeContent,
  getAdvisorResume,
  saveAdvisorResume,
} from "@/lib/project-queries";

interface UseAdvisorResumeResult {
  content: AdvisorResumeContent | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  setLocalContent: (content: AdvisorResumeContent | null) => void;
  reload: () => Promise<void>;
  save: (updates: Partial<AdvisorResumeContent>) => Promise<void>;
}

export const useAdvisorResume = (
  orgId: string | null
): UseAdvisorResumeResult => {
  const [content, setContent] = useState<AdvisorResumeContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orgId) {
      setContent(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await getAdvisorResume(orgId);
      setContent(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load advisor resume");
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (updates: Partial<AdvisorResumeContent>) => {
      if (!orgId) {
        throw new Error("Org ID is required to save advisor resume");
      }

      setIsSaving(true);
      setError(null);
      try {
        await saveAdvisorResume(orgId, updates);
        setContent((prev) => ({ ...(prev || {}), ...updates } as AdvisorResumeContent));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save advisor resume";
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [orgId]
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

