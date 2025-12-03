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
 * Fetches the *current* project resume content.
 *
 * Priority:
 *  1. Use the resource pointer (resources.current_version_id for PROJECT_RESUME)
 *  2. Fallback to the row marked as status = 'active'
 *  3. Fallback to the latest row by created_at
 */
const getProjectResumeContent = async (
  projectId: string
): Promise<ProjectResumeContent | null> => {
  // First, try to resolve the resource pointer
  const { data: resource, error: resourceError } = await supabase
    .from("resources")
    .select("current_version_id")
    .eq("project_id", projectId)
    .eq("resource_type", "PROJECT_RESUME")
    .maybeSingle();

  if (resourceError && resourceError.code !== "PGRST116") {
    throw new Error(
      `[useProjectResumeRealtime] Failed to load project resume resource pointer: ${resourceError.message}`
    );
  }

  let query;
  
  if (resource?.current_version_id) {
    // Use the explicit pointer when available
    query = supabase
      .from("project_resumes")
      .select("content")
      .eq("id", resource.current_version_id)
      .limit(1)
      .maybeSingle();
  } else {
    // Prefer the row marked active; otherwise fall back to latest by created_at
    query = supabase
      .from("project_resumes")
      .select("content")
      .eq("project_id", projectId)
      .order("status", { ascending: false }) // 'active' > 'superseded' lexicographically
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
  }

  const { data, error } = await query;

  if (error && error.code !== "PGRST116") {
    throw new Error(
      `[useProjectResumeRealtime] Failed to load project resume: ${error.message}`
    );
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
  const localSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isAutofillRunningRef = useRef(false);

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

  // Listen for autofill state changes and local save events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleAutofillStart = (e: any) => {
      // Only track autofill for this project
      if (e.detail?.projectId === projectId && e.detail?.context === "project") {
        isAutofillRunningRef.current = true;
      }
    };

    const handleAutofillComplete = (e: any) => {
      // Only track autofill for this project
      if (e.detail?.projectId === projectId && e.detail?.context === "project") {
        // Keep flag true for a bit longer to catch any delayed database updates
        setTimeout(() => {
          isAutofillRunningRef.current = false;
        }, 5000);
      }
    };

    const handleLocalSaveStart = (e: any) => {
      // Only track local saves for this project
      if (e.detail?.projectId === projectId && e.detail?.context === "project") {
        isLocalSaveRef.current = true;
        // Clear any pending timeout
        if (localSaveTimeoutRef.current) {
          clearTimeout(localSaveTimeoutRef.current);
        }
        // Reset flag after a delay to catch any delayed events
        localSaveTimeoutRef.current = setTimeout(() => {
          isLocalSaveRef.current = false;
        }, 3000);
      }
    };

    window.addEventListener("autofill-started", handleAutofillStart);
    window.addEventListener("autofill-completed", handleAutofillComplete);
    window.addEventListener("local-save-started", handleLocalSaveStart);

    return () => {
      window.removeEventListener("autofill-started", handleAutofillStart);
      window.removeEventListener("autofill-completed", handleAutofillComplete);
      window.removeEventListener("local-save-started", handleLocalSaveStart);
    };
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
            // Clear any pending timeout
            if (localSaveTimeoutRef.current) {
              clearTimeout(localSaveTimeoutRef.current);
            }
            // Reset flag after a delay to catch any delayed events
            localSaveTimeoutRef.current = setTimeout(() => {
              isLocalSaveRef.current = false;
            }, 3000);
            return;
          }

          // Ignore updates during autofill (triggered by current user)
          if (isAutofillRunningRef.current) {
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
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
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
        // Reset flag after a delay to allow realtime event to process
        // Clear any pending timeout first
        if (localSaveTimeoutRef.current) {
          clearTimeout(localSaveTimeoutRef.current);
        }
        localSaveTimeoutRef.current = setTimeout(() => {
          isLocalSaveRef.current = false;
        }, 3000);
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

