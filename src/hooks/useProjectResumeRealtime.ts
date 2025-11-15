import { useCallback, useEffect, useState, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ProjectResumeContent, saveProjectResume } from "@/lib/project-queries";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

interface UseProjectResumeRealtimeResult {
  content: ProjectResumeContent | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  setLocalContent: (content: ProjectResumeContent | null) => void;
  reload: () => Promise<void>;
  save: (updates: Partial<ProjectResumeContent>) => Promise<void>;
  isRemoteUpdate: boolean;
}

/**
 * Hook to fetch project resume content directly from project_resumes table
 */
const getProjectResumeContent = async (projectId: string): Promise<ProjectResumeContent | null> => {
  const { data, error } = await supabase
    .from('project_resumes')
    .select('content')
    .eq('project_id', projectId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load project resume: ${error.message}`);
  }

  return (data?.content as ProjectResumeContent) || null;
};

export const useProjectResumeRealtime = (
  projectId: string | null
): UseProjectResumeRealtimeResult => {
  const { user } = useAuth();
  const [content, setContent] = useState<ProjectResumeContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const result = await getProjectResumeContent(projectId);
      setContent(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project resume");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!projectId || !user?.id) return;

    const channel = supabase
      .channel(`project-resume-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'project_resumes',
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
            const latest = await getProjectResumeContent(projectId);
            if (latest) {
              setContent(latest);
              
              // Reset remote update flag after 3 seconds
              remoteUpdateTimeoutRef.current = setTimeout(() => {
                setIsRemoteUpdate(false);
              }, 3000);
            }
          } catch (err) {
            console.error('[useProjectResumeRealtime] Failed to reload after remote update:', err);
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
    async (updates: Partial<ProjectResumeContent>) => {
      if (!projectId) {
        throw new Error("Project ID is required to save project resume");
      }

      setIsSaving(true);
      setError(null);
      isLocalSaveRef.current = true;
      
      try {
        // Fetch latest before merging to avoid conflicts
        const latest = await getProjectResumeContent(projectId);
        const mergedContent = { ...(latest || {}), ...updates } as any;
        
        await saveProjectResume(projectId, mergedContent);
        setContent(mergedContent);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save project resume";
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
    isRemoteUpdate,
  };
};

