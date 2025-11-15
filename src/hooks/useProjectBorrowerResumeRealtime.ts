import { useCallback, useEffect, useState, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  BorrowerResumeContent,
  getProjectBorrowerResume,
  saveProjectBorrowerResume,
} from "@/lib/project-queries";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface UseProjectBorrowerResumeRealtimeResult {
  content: BorrowerResumeContent | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  setLocalContent: (content: BorrowerResumeContent | null) => void;
  reload: () => Promise<void>;
  save: (updates: Partial<BorrowerResumeContent>) => Promise<void>;
  lastUpdatedBy: string | null;
  isRemoteUpdate: boolean;
}

export const useProjectBorrowerResumeRealtime = (
  projectId: string | null
): UseProjectBorrowerResumeRealtimeResult => {
  const { user } = useAuth();
  const [content, setContent] = useState<BorrowerResumeContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isLocalSaveRef = useRef(false);
  const remoteUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Subscribe to realtime changes
  useEffect(() => {
    if (!projectId || !user?.id) return;

    const channel = supabase
      .channel(`borrower-resume-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'borrower_resumes',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          // Ignore our own updates
          if (isLocalSaveRef.current) {
            isLocalSaveRef.current = false;
            return;
          }

          setIsRemoteUpdate(true);
          
          // Clear any existing timeout
          if (remoteUpdateTimeoutRef.current) {
            clearTimeout(remoteUpdateTimeoutRef.current);
          }
          
          // Fetch the latest content from server
          try {
            const latest = await getProjectBorrowerResume(projectId);
            if (latest) {
              setContent(latest);
              
              // Reset remote update flag after 3 seconds
              remoteUpdateTimeoutRef.current = setTimeout(() => {
                setIsRemoteUpdate(false);
              }, 3000);
            }
          } catch (err) {
            console.error('[useProjectBorrowerResumeRealtime] Failed to reload after remote update:', err);
            setIsRemoteUpdate(false);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (remoteUpdateTimeoutRef.current) {
        clearTimeout(remoteUpdateTimeoutRef.current);
      }
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, [projectId, user?.id]);

  // Initial load
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
      isLocalSaveRef.current = true;
      
      try {
        // Fetch latest before merging to avoid conflicts
        const latest = await getProjectBorrowerResume(projectId);
        const mergedContent = { ...(latest || {}), ...updates } as any;
        
        await saveProjectBorrowerResume(projectId, mergedContent);
        setContent(mergedContent);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save borrower resume";
        setError(message);
        throw err;
      } finally {
        setIsSaving(false);
        // Reset flag after a short delay to allow realtime event to process
        setTimeout(() => {
          isLocalSaveRef.current = false;
        }, 1000);
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
    lastUpdatedBy,
    isRemoteUpdate,
  };
};

