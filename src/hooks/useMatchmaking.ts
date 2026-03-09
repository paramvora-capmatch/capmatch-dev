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

export function useMatchmaking(projectId: string, resumeId: string | null = null) {
  const resumeIdReady = resumeId !== null;

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

  const _fetchScoresImpl = useCallback(async (label: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const base = getBackendUrl();
    const qs = resumeId ? `?resume_id=${encodeURIComponent(resumeId)}` : "";
    const url = `${base}/api/v1/matchmaking/${encodeURIComponent(projectId)}/scores${qs}`;

    console.log(`[useMatchmaking:${label}] fetchScores → GET ${url}`);

    const res = await fetch(url, {
      headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    });

    console.log(`[useMatchmaking:${label}] fetchScores response status=${res.status}`);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[useMatchmaking:${label}] fetchScores HTTP error: ${res.status}`, errText);
      return;
    }
    const data = await res.json();
    console.log(`[useMatchmaking:${label}] fetchScores response:`, {
      found: data.found,
      scoresCount: data.scores?.length ?? 0,
    });

    if (data.found && data.scores && data.scores.length > 0) {
      setState((s) => ({ ...s, matchScores: data.scores }));
    } else {
      console.warn(`[useMatchmaking:${label}] fetchScores: no scores found (found=${data.found}, scores=${data.scores?.length})`);
      setState((s) => ({ ...s, matchScores: [] }));
    }
  }, [projectId, resumeId]);

  const fetchScores = useCallback(async () => {
    try {
      await _fetchScoresImpl("fetchScores");
    } catch (err) {
      console.error("[useMatchmaking] fetchScores threw:", err);
    }
  }, [_fetchScoresImpl]);

  const fetchLatestResults = useCallback(async () => {
    console.log(`[useMatchmaking] fetchLatestResults called (projectId=${projectId}, resumeId=${resumeId})`);
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = getBackendUrl();
      const qs = resumeId ? `?resume_id=${encodeURIComponent(resumeId)}` : "";
      const url = `${base}/api/v1/matchmaking/${encodeURIComponent(projectId)}/latest${qs}`;

      console.log(`[useMatchmaking] fetchLatestResults → GET ${url}`);
      const res = await fetch(url, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error(`[useMatchmaking] fetchLatestResults HTTP error: ${res.status}`, data);
        throw new Error(data?.message || "Failed to fetch results");
      }
      const data = await res.json();
      console.log(`[useMatchmaking] fetchLatestResults response:`, {
        found: data.found,
        hasViz: !!data.visualization_data,
        totalLenders: data.total_lenders,
      });

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
        console.warn("[useMatchmaking] fetchLatestResults: not found or no viz data");
        setState((s) => ({ ...s, isLoading: false }));
      }
    } catch (err) {
      console.error("[useMatchmaking] fetchLatestResults error:", err);
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch results",
      }));
    }
  }, [projectId, resumeId]);

  const refreshAll = useCallback(async () => {
    console.log(`[useMatchmaking] refreshAll called (projectId=${projectId}, resumeId=${resumeId}, resumeIdReady=${resumeIdReady})`);
    await fetchLatestResults();
    await fetchScores();
  }, [fetchLatestResults, fetchScores, projectId, resumeId, resumeIdReady]);

  const runMatchmaking = useCallback(async () => {
    console.log(`[useMatchmaking] runMatchmaking called (projectId=${projectId}, resumeId=${resumeId})`);
    setState((s) => ({ ...s, isRunning: true, error: null }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = getBackendUrl();
      const body = resumeId ? { resume_id: resumeId } : {};

      console.log("[useMatchmaking] runMatchmaking POST body:", body);
      const res = await fetch(`${base}/api/v1/matchmaking/run/${encodeURIComponent(projectId)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[useMatchmaking] runMatchmaking HTTP error:", res.status, data);
        throw new Error(data?.message || "Matchmaking failed");
      }
      const runData = await res.json();
      console.log("[useMatchmaking] runMatchmaking success:", {
        run_id: runData.run_id,
        match_run_id: runData.match_run_id,
        total_lenders: runData.total_lenders,
        top_match_name: runData.top_match_name,
      });

      const viz = runData.visualization_data as VisualizationData;
      setState((s) => ({
        ...s,
        isRunning: false,
        visualizationData: viz,
        totalLenders: runData.total_lenders || 0,
        topMatchName: runData.top_match_name || null,
        topMatchScore: runData.top_match_score || null,
        lastRunAt: new Date().toISOString(),
      }));

      // Fetch scores inline to avoid stale-closure issues
      console.log("[useMatchmaking] runMatchmaking: now fetching scores inline...");
      try {
        await _fetchScoresImpl("postRun");
      } catch (scoreErr) {
        console.error("[useMatchmaking] runMatchmaking: inline scores fetch error:", scoreErr);
      }
    } catch (err) {
      console.error("[useMatchmaking] runMatchmaking error:", err);
      setState((s) => ({
        ...s,
        isRunning: false,
        error: err instanceof Error ? err.message : "Matchmaking failed",
      }));
    }
  }, [projectId, resumeId, _fetchScoresImpl]);

  useEffect(() => {
    console.log(`[useMatchmaking] useEffect fired (resumeIdReady=${resumeIdReady}, projectId=${projectId}, resumeId=${resumeId})`);
    if (!resumeIdReady) {
      console.log("[useMatchmaking] useEffect: resumeId not ready, skipping fetch");
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    refreshAll();
  }, [refreshAll, resumeIdReady]);

  return {
    ...state,
    runMatchmaking,
    refreshAll,
    fetchLatestResults,
  };
}
