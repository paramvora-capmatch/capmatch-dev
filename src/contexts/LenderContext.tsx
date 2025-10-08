// src/contexts/LenderContext.tsx

"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { getLenders } from "../services/api/lenderService";
import { calculateMatchScores } from "../utils/lenderUtils";
import { LenderProfile } from "../types/lender";
import { StorageService } from "../services/storage/StorageService";

// Define filters interface
export interface LenderFilters {
  asset_types: string[];
  deal_types: string[];
  capital_types: string[];
  debt_ranges: string[];
  locations: string[];
  requested_amount?: number;
}

// Define context interface
interface LenderContextProps {
  lenders: LenderProfile[];
  filteredLenders: LenderProfile[];
  isLoading: boolean;
  filters: LenderFilters;
  selectedLender: LenderProfile | null;
  setFilters: (filters: Partial<LenderFilters>) => void;
  resetFilters: () => void;
  selectLender: (lender: LenderProfile | null) => void;
  saveLender: (lender: LenderProfile) => Promise<void>;
  removeSavedLender: (lenderId: number) => Promise<void>;
  savedLenders: LenderProfile[];
  refreshLenders: () => Promise<void>;
}

// Create context with default values
export const LenderContext = createContext<LenderContextProps>({
  lenders: [],
  filteredLenders: [],
  isLoading: true,
  filters: {
    asset_types: ["Multifamily"],
    deal_types: ["Refinance"],
    capital_types: [],
    debt_ranges: [],
    locations: [],
  },
  selectedLender: null,
  setFilters: () => {},
  resetFilters: () => {},
  selectLender: () => {},
  saveLender: async () => {},
  removeSavedLender: async () => {},
  savedLenders: [],
  refreshLenders: async () => {},
});

interface LenderProviderProps {
  children: ReactNode;
  storageService: StorageService;
}

export const LenderProvider: React.FC<LenderProviderProps> = ({
  children,
  storageService,
}) => {
  const [lenders, setLenders] = useState<LenderProfile[]>([]);
  const [filteredLenders, setFilteredLenders] = useState<LenderProfile[]>([]);
  const [savedLenders, setSavedLenders] = useState<LenderProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLender, setSelectedLender] = useState<LenderProfile | null>(
    null
  );
  const [filters, setFiltersState] = useState<LenderFilters>({
    asset_types: ["Multifamily"],
    deal_types: ["Refinance"],
    capital_types: [],
    debt_ranges: [],
    locations: [],
  });

  // Load lenders on mount
  useEffect(() => {
    const loadLenders = async () => {
      try {
        setIsLoading(true);
        const lenderData = await getLenders();
        setLenders(lenderData);
        setFilteredLenders(lenderData);
      } catch (error) {
        console.error("Failed to load lenders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLenders();
  }, []);

  // Load saved lenders from storage
  useEffect(() => {
    const loadSavedLenders = async () => {
      try {
        const savedLenderData = await storageService.getItem<LenderProfile[]>(
          "savedLenders"
        );
        if (savedLenderData) {
          setSavedLenders(savedLenderData);
        }
      } catch (error) {
        console.error("Failed to load saved lenders:", error);
      }
    };

    loadSavedLenders();
  }, [storageService]);

  // Update filtered lenders when filters change
  useEffect(() => {
    const applyFilters = () => {
      const hasFilters =
        filters.asset_types.length > 0 ||
        filters.deal_types.length > 0 ||
        filters.capital_types.length > 0 ||
        filters.debt_ranges.length > 0 ||
        filters.locations.length > 0;

      if (!hasFilters) {
        setFilteredLenders(lenders);
        return;
      }

      const scoredLenders = calculateMatchScores(lenders, filters);
      setFilteredLenders(
        scoredLenders.sort((a, b) => b.match_score - a.match_score)
      );
    };

    applyFilters();
  }, [lenders, filters]);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<LenderFilters>) => {
    setFiltersState((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFiltersState({
      asset_types: [],
      deal_types: [],
      capital_types: [],
      debt_ranges: [],
      locations: [],
    });
  }, []);

  // Select a lender
  const selectLender = useCallback((lender: LenderProfile | null) => {
    setSelectedLender(lender);
  }, []);

  // Save a lender to favorites
  const saveLender = useCallback(
    async (lender: LenderProfile) => {
      try {
        // Check if lender is already saved
        if (
          !savedLenders.some((saved) => saved.lender_id === lender.lender_id)
        ) {
          const updatedSavedLenders = [...savedLenders, lender];
          setSavedLenders(updatedSavedLenders);
          await storageService.setItem("savedLenders", updatedSavedLenders);
        }
      } catch (error) {
        console.error("Failed to save lender:", error);
      }
    },
    [savedLenders, storageService]
  );

  // Remove a lender from favorites
  const removeSavedLender = useCallback(
    async (lenderId: number) => {
      try {
        const updatedSavedLenders = savedLenders.filter(
          (lender) => lender.lender_id !== lenderId
        );
        setSavedLenders(updatedSavedLenders);
        await storageService.setItem("savedLenders", updatedSavedLenders);
      } catch (error) {
        console.error("Failed to remove saved lender:", error);
      }
    },
    [savedLenders, storageService]
  );

  // Refresh lenders data
  const refreshLenders = useCallback(async () => {
    try {
      setIsLoading(true);
      const lenderData = await getLenders();
      setLenders(lenderData);
      // Apply current filters to new data
      const scoredLenders = calculateMatchScores(lenderData, filters);
      setFilteredLenders(
        scoredLenders.sort((a, b) => b.match_score - a.match_score)
      );
    } catch (error) {
      console.error("Failed to refresh lenders:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  return (
    <LenderContext.Provider
      value={{
        lenders,
        filteredLenders,
        isLoading,
        filters,
        selectedLender,
        setFilters,
        resetFilters,
        selectLender,
        saveLender,
        removeSavedLender,
        savedLenders,
        refreshLenders,
      }}
    >
      {children}
    </LenderContext.Provider>
  );
};
