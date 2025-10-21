// src/stores/useBorrowerProfileStore.ts
import { create } from "zustand";
import { supabase } from "../../lib/supabaseClient";
import { useProjectStore } from "./useProjectStore";

interface BorrowerProfileState {
  content: Record<string, unknown> | null;
  isLoading: boolean;
  error: string | null;
}

interface BorrowerProfileActions {
  loadForProject: (projectId?: string | null) => Promise<void>;
  saveForProject: (content: Record<string, unknown>, projectId?: string | null) => Promise<void>;
  reset: () => void;
}

export const useBorrowerProfileStore = create<BorrowerProfileState & BorrowerProfileActions>((set) => ({
  content: null,
  isLoading: false,
  error: null,

  reset: () => set({ content: null, isLoading: false, error: null }),

  loadForProject: async (projectId?: string | null): Promise<void> => {
    const id = projectId || useProjectStore.getState().activeProject?.id;
    if (!id) {
      set({ content: null });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('project_resumes')
        .select('content')
        .eq('project_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        set({ error: error.message, isLoading: false });
        return;
      }
      set({ content: data?.content || null, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load', isLoading: false });
    }
  },

  saveForProject: async (content: Record<string, unknown>, projectId?: string | null) => {
    const id = projectId || useProjectStore.getState().activeProject?.id;
    if (!id) throw new Error('No active project');
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('project_resumes')
        .upsert({ project_id: id, content }, { onConflict: 'project_id' });

      if (error) {
        set({ error: error.message, isLoading: false });
        throw error;
      }
      set({ content, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to save', isLoading: false });
      throw err;
    }
  },
}));

// Auto-load content when active project changes
useProjectStore.subscribe((state, prev) => {
  const currId = state.activeProject?.id;
  const prevId = prev.activeProject?.id;
  if (currId && currId !== prevId) {
    useBorrowerProfileStore.getState().loadForProject(currId);
  }
});