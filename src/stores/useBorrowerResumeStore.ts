// src/stores/useBorrowerResumeStore.ts
import { create } from "zustand";
import { supabase } from "../../lib/supabaseClient";
import { BorrowerResumeContent, getBorrowerResume, saveBorrowerResume } from "../lib/project-queries";
import { useAuthStore } from "./useAuthStore";

interface BorrowerResumeState {
  content: BorrowerResumeContent | null;
  isLoading: boolean;
  error: string | null;
  isSaving?: boolean;
}

interface BorrowerResumeActions {
  loadForOrg: (orgId?: string) => Promise<void>;
  saveForOrg: (content: Partial<BorrowerResumeContent>, orgId?: string) => Promise<void>;
  reset: () => void;
}

export const useBorrowerResumeStore = create<BorrowerResumeState & BorrowerResumeActions>((set, get) => ({
  content: null,
  isLoading: false,
  error: null,
  isSaving: false,

  reset: () => set({ content: null, isLoading: false, error: null }),

  loadForOrg: async (orgId?: string) => {
    const id = orgId || useAuthStore.getState().activeOrg?.id;
    if (!id) {
      set({ content: null });
      return;
    }
    
    set({ isLoading: true, error: null });
    try {
      const content = await getBorrowerResume(id);
      set({ content, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load', isLoading: false });
    }
  },

  saveForOrg: async (content: Partial<BorrowerResumeContent>, orgId?: string) => {
    const id = orgId || useAuthStore.getState().activeOrg?.id;
    if (!id) throw new Error('No active org');
    
    set({ isSaving: true, error: null });
    try {
      await saveBorrowerResume(id, content);
      set({ content: { ...get().content, ...content }, isSaving: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to save', isSaving: false });
      throw err;
    }
  },
}));

// Auto-load content when active org changes
useAuthStore.subscribe((state, prev) => {
  const currOrgId = state.activeOrg?.id;
  const prevOrgId = prev.activeOrg?.id;
  if (currOrgId && currOrgId !== prevOrgId) {
    useBorrowerResumeStore.getState().loadForOrg(currOrgId);
  }
});
