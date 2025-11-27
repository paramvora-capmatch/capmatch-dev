// src/stores/useLenderStore.ts
import { create } from 'zustand';
import { getLenders } from '@/services/api/lenderService';
import { calculateMatchScores } from '@/utils/lenderUtils';
import { LenderProfile } from '@/types/lender';
import { storageService } from '@/lib/storage';

/**
 * Ensures at least 1-2 lenders always appear as green dots (high match score)
 * by boosting the top lenders' scores if they're below the green threshold.
 * Only applies when filters are active.
 */
function ensureMinimumGreenDots(
  lenders: LenderProfile[], 
  filters: LenderFilters
): LenderProfile[] {
  // Only apply if filters are actually selected
  const hasActiveFilters = 
    filters.asset_types.length > 0 ||
    filters.deal_types.length > 0 ||
    filters.capital_types.length > 0 ||
    filters.debt_ranges.length > 0 ||
    filters.locations.length > 0;

  if (!hasActiveFilters) {
    return lenders; // Don't boost when no filters are applied
  }

  // Check how many lenders already have green scores (>0.6)
  const greenLenders = lenders.filter(l => (l.match_score || 0) > 0.6);
  
  // If we already have 2+ green lenders, no need to boost
  if (greenLenders.length >= 2) {
    return lenders;
  }

  // Sort lenders by current score (highest first)
  const sorted = [...lenders].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  
  // Boost the top 1-2 lenders to ensure they appear green
  const targetCount = greenLenders.length === 0 ? 2 : 1; // Boost 2 if none green, 1 if one green
  const minGreenScore = 0.7; // Score threshold for green appearance
  
  return lenders.map(lender => {
    const lenderIndex = sorted.findIndex(s => s.lender_id === lender.lender_id);
    
    // If this lender is in the top positions and needs boosting
    if (lenderIndex < targetCount && (lender.match_score || 0) < minGreenScore) {
      return {
        ...lender,
        match_score: minGreenScore + (targetCount - lenderIndex) * 0.05 // Slight variation: 0.7, 0.75
      };
    }
    
    return lender;
  });
}

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
      const boostedLenders = ensureMinimumGreenDots(scoredLenders, get().filters);
      set({ 
        lenders: lenderData, 
        filteredLenders: boostedLenders.sort((a, b) => b.match_score - a.match_score), 
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
      const boostedLenders = ensureMinimumGreenDots(scoredLenders, updatedFilters);
      return { 
        filters: updatedFilters,
        filteredLenders: boostedLenders.sort((a, b) => b.match_score - a.match_score)
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