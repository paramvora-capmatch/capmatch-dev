// src/stores/useLenderStore.ts
import { create } from 'zustand';
import { getLenders } from '@/services/api/lenderService';
import { calculateMatchScores } from '@/utils/lenderUtils';
import { LenderProfile } from '@/types/lender';
import { storageService } from '@/lib/storage';

export interface LenderFilters {
  asset_types: string[];
  deal_types: string[];
  capital_types: string[];
  debt_ranges: string[];
  locations: string[];
  requested_amount?: number;
}

interface LenderState {
  lenders: LenderProfile[];
  filteredLenders: LenderProfile[];
  isLoading: boolean;
  filters: LenderFilters;
  selectedLender: LenderProfile | null;
  savedLenders: LenderProfile[];
}

interface LenderActions {
  loadLenders: () => Promise<void>;
  setFilters: (filters: Partial<LenderFilters>) => void;
  resetFilters: () => void;
  selectLender: (lender: LenderProfile | null) => void;
  saveLender: (lender: LenderProfile) => Promise<void>;
  removeSavedLender: (lenderId: number) => Promise<void>;
  loadSavedLenders: () => Promise<void>;
}

export const useLenderStore = create<LenderState & LenderActions>((set, get) => ({
  lenders: [],
  filteredLenders: [],
  isLoading: true,
  filters: {
    asset_types: ['Multifamily'],
    deal_types: ['Refinance'],
    capital_types: [],
    debt_ranges: [],
    locations: [],
  },
  selectedLender: null,
  savedLenders: [],

  loadLenders: async () => {
    set({ isLoading: true });
    try {
      const lenderData = await getLenders();
      const scoredLenders = calculateMatchScores(lenderData, get().filters);
      set({ 
        lenders: lenderData, 
        filteredLenders: scoredLenders.sort((a, b) => b.match_score - a.match_score), 
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to load lenders:', error);
      set({ isLoading: false });
    }
  },

  setFilters: (newFilters) => {
    set((state) => {
      const updatedFilters = { ...state.filters, ...newFilters };
      const scoredLenders = calculateMatchScores(state.lenders, updatedFilters);
      return { 
        filters: updatedFilters,
        filteredLenders: scoredLenders.sort((a, b) => b.match_score - a.match_score)
      };
    });
  },

  resetFilters: () => {
    get().setFilters({
      asset_types: [],
      deal_types: [],
      capital_types: [],
      debt_ranges: [],
      locations: [],
    });
  },

  selectLender: (lender) => set({ selectedLender: lender }),

  loadSavedLenders: async () => {
    const saved = await storageService.getItem<LenderProfile[]>('savedLenders');
    if (saved) {
      set({ savedLenders: saved });
    }
  },

  saveLender: async (lender) => {
    set((state) => {
      if (state.savedLenders.some(saved => saved.lender_id === lender.lender_id)) {
        return state;
      }
      const updatedSavedLenders = [...state.savedLenders, lender];
      storageService.setItem('savedLenders', updatedSavedLenders);
      return { savedLenders: updatedSavedLenders };
    });
  },

  removeSavedLender: async (lenderId) => {
    set((state) => {
      const updatedSavedLenders = state.savedLenders.filter(l => l.lender_id !== lenderId);
      storageService.setItem('savedLenders', updatedSavedLenders);
      return { savedLenders: updatedSavedLenders };
    });
  },
}));

// Initial load
useLenderStore.getState().loadLenders();
useLenderStore.getState().loadSavedLenders();