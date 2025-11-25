// src/hooks/useAutofill.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AutofillState {
  projectId: string;
  startTime: string; // ISO timestamp
  isProcessing: boolean;
}

const AUTOFILL_STORAGE_KEY = 'capmatch_autofill_state';
const POLL_INTERVAL = 2000; // Poll every 2 seconds
const MAX_POLL_TIME = 300000; // Max 5 minutes

interface UseAutofillOptions {
  projectAddress?: string;
}

export const useAutofill = (projectId: string, options?: UseAutofillOptions) => {
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<string | null>(null);

  const clearAutofillState = useCallback(() => {
    localStorage.removeItem(AUTOFILL_STORAGE_KEY);
    setIsAutofilling(false);
    setShowSparkles(false);
    startTimeRef.current = null;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const checkCompletion = useCallback(async (
    projectId: string,
    startTime: string
  ): Promise<boolean> => {
    try {
      // Check if a new project_resumes row was created after the start time
      const { data, error } = await supabase
        .from('project_resumes')
        .select('id, created_at')
        .eq('project_id', projectId)
        .gte('created_at', startTime)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking autofill completion:', error);
        return false;
      }

      // If we found a new row created after start time, processing is complete
      if (data && data.length > 0) {
        const newRow = data[0];
        const rowTime = new Date(newRow.created_at);
        const start = new Date(startTime);
        
        // Ensure the row was created after we started (with a small buffer for clock skew)
        if (rowTime.getTime() > start.getTime() - 1000) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error in checkCompletion:', error);
      return false;
    }
  }, []);

  const startPolling = useCallback((
    projectId: string,
    startTime: string
  ) => {
    // Clear any existing interval
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const pollStartTime = Date.now();

    pollIntervalRef.current = setInterval(async () => {
      // Check if we've exceeded max poll time
      const elapsed = Date.now() - pollStartTime;
      if (elapsed > MAX_POLL_TIME) {
        console.warn('Autofill polling timeout');
        clearAutofillState();
        alert('Autofill is taking longer than expected. Please check back later or refresh the page.');
        return;
      }

      const isComplete = await checkCompletion(projectId, startTime);
      
      if (isComplete) {
        clearAutofillState();
        // Reload to show updated data
        window.location.reload();
      }
    }, POLL_INTERVAL);
  }, [checkCompletion, clearAutofillState]);

  // Set up realtime subscription to detect when other users trigger autofill
  useEffect(() => {
    // Subscribe to project_resumes changes for this project
    const channel = supabase
      .channel(`autofill-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_resumes',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          // When a new resume is created, check if it's from autofill
          // We can't directly know, but if it's recent (within last 30 seconds), assume autofill
          const createdTime = new Date(payload.new.created_at);
          const now = new Date();
          const elapsed = now.getTime() - createdTime.getTime();
          
          // If a new resume was created very recently, show autofilling status
          if (elapsed < 30000) { // 30 seconds
            setIsAutofilling(true);
            setShowSparkles(true);
            // Start polling to detect completion
            startPolling(projectId, createdTime.toISOString());
          }
        }
      )
      .subscribe();

    // Load persisted state on mount
    try {
      const stored = localStorage.getItem(AUTOFILL_STORAGE_KEY);
      if (stored) {
        const state: AutofillState = JSON.parse(stored);
        // Only restore if it's for this project and not too old
        if (state.projectId === projectId && state.isProcessing) {
          const startTime = new Date(state.startTime);
          const now = new Date();
          const elapsed = now.getTime() - startTime.getTime();
          
          if (elapsed < MAX_POLL_TIME) {
            setIsAutofilling(true);
            setShowSparkles(true);
            startTimeRef.current = state.startTime;
            startPolling(projectId, state.startTime);
          } else {
            // Clean up stale state
            localStorage.removeItem(AUTOFILL_STORAGE_KEY);
          }
        }
      }
    } catch (error) {
      console.error('Error loading autofill state:', error);
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleAutofill = useCallback(async () => {
    setShowSparkles(true);
    setIsAutofilling(true);

    try {
      // 1. Fetch FILE resources associated with this project
      const { data: resources, error: filesError } = await supabase
        .from("resources")
        .select("id, current_version_id")
        .eq("project_id", projectId)
        .eq("resource_type", "FILE");

      if (filesError) throw filesError;

      if (!resources || resources.length === 0) {
        alert("No documents found to autofill from. Please upload documents first.");
        setIsAutofilling(false);
        setShowSparkles(false);
        return;
      }

      // 2. Collect the version IDs
      const versionIds = resources.map(r => r.current_version_id).filter(Boolean);

      // 3. Get storage paths from document_versions
      const { data: versions, error: versionsError } = await supabase
        .from("document_versions")
        .select("storage_path")
        .in("id", versionIds);

      if (versionsError) throw versionsError;

      const documentPaths = versions?.map(v => v.storage_path) || [];

      // 4. Format project address
      const projectAddress = options?.projectAddress || "2300 Hickory St | Dallas TX, 75215";

      // 5. Call Backend
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
      const { data: { user } } = await supabase.auth.getUser();

      const requestStartTime = new Date().toISOString();
      startTimeRef.current = requestStartTime;

      // Store state in localStorage before making request
      const autofillState: AutofillState = {
        projectId,
        startTime: requestStartTime,
        isProcessing: true,
      };
      localStorage.setItem(AUTOFILL_STORAGE_KEY, JSON.stringify(autofillState));

      const response = await fetch(`${backendUrl}/api/v1/projects/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          project_address: projectAddress,
          document_paths: documentPaths,
          user_id: user?.id || "unknown",
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend analysis failed: ${response.statusText}`);
      }

      // 6. Start polling for completion
      startPolling(projectId, requestStartTime);

    } catch (error) {
      console.error("Autofill error:", error);
      alert("Failed to start autofill process.");
      clearAutofillState();
    }
  }, [projectId, options?.projectAddress, startPolling, clearAutofillState]);

  return {
    isAutofilling,
    showSparkles,
    handleAutofill,
    clearAutofillState,
  };
};

