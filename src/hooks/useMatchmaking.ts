"use client";

import { useState, useCallback, useEffect } from "react";
import { getBackendUrl } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabaseClient";

export interface VisualizationData {
  deal: { name: string; x: number; y: number; z: number };
  lenders: LenderVizData[];
  sceneScale: number;
}

export interface LenderVizData {
  lei: string;
  name: string;
  x: number;
  y: number;
  z: number;
  market_fit: number;
  capital_fit: number;
  product_fit: number;
  total_score: number;
  rank: number;
  narrative: string;
  pillar_scores: Record<string, number>;
  variables: VariableVizData[];
}

export interface VariableVizData {
  name: string;
  key: string;
  score: number;
  weight: number;
  weighted: number;
  explanation: string;
}

export interface MatchScore {
  id: string;
  lender_lei: string;
  lender_name: string | null;
  total_score: number;
  rank: number;
  overall_narrative: string | null;
  pillar_scores: Record<string, number>;
  variable_scores: VariableVizData[];
}

interface MatchmakingState {
  isRunning: boolean;
  isLoading: boolean;
  visualizationData: VisualizationData | null;
  matchScores: MatchScore[];
  totalLenders: number;
  topMatchName: string | null;
  topMatchScore: number | null;
  lastRunAt: string | null;
  error: string | null;
}

export function useMatchmaking(projectId: string) {
  const [state, setState] = useState<MatchmakingState>({
    isRunning: false,
    isLoading: true,
    visualizationData: null,
    matchScores: [],
    totalLenders: 0,
    topMatchName: null,
    topMatchScore: null,
    lastRunAt: null,
    error: null,
  });

  const fetchScores = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = getBackendUrl();

      const res = await fetch(
        `${base}/api/v1/matchmaking/${encodeURIComponent(projectId)}/scores`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.found && data.scores) {
        setState((s) => ({ ...s, matchScores: data.scores }));
      }
    } catch {
      // scores are supplementary; don't block on failure
    }
  }, [projectId]);

  const fetchLatestResults = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = getBackendUrl();

      const res = await fetch(
        `${base}/api/v1/matchmaking/${encodeURIComponent(projectId)}/latest`,
        {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to fetch results");
      }
      const data = await res.json();
      if (data.found && data.visualization_data) {
        const viz = data.visualization_data as VisualizationData;
        const topLender = viz.lenders?.[0];
        setState((s) => ({
          ...s,
          isLoading: false,
          visualizationData: viz,
          totalLenders: data.total_lenders || 0,
          topMatchName: topLender?.name || null,
          topMatchScore: topLender?.total_score || null,
          lastRunAt: data.created_at || null,
        }));
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch results",
      }));
    }
  }, [projectId]);

  const runMatchmaking = useCallback(async () => {
    setState((s) => ({ ...s, isRunning: true, error: null }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = getBackendUrl();

      const res = await fetch(`${base}/api/v1/matchmaking/run/${encodeURIComponent(projectId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Matchmaking failed");
      }
      const data = await res.json();
      const viz = data.visualization_data as VisualizationData;
      setState((s) => ({
        ...s,
        isRunning: false,
        visualizationData: viz,
        totalLenders: data.total_lenders || 0,
        topMatchName: data.top_match_name || null,
        topMatchScore: data.top_match_score || null,
        lastRunAt: new Date().toISOString(),
      }));
      fetchScores();
    } catch (err) {
      setState((s) => ({
        ...s,
        isRunning: false,
        error: err instanceof Error ? err.message : "Matchmaking failed",
      }));
    }
  }, [projectId, fetchScores]);

  useEffect(() => {
    fetchLatestResults().then(() => fetchScores());
  }, [fetchLatestResults, fetchScores]);

  return {
    ...state,
    runMatchmaking,
    fetchLatestResults,
  };
}
