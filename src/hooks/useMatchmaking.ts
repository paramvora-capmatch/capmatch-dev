"use client";

import { useState, useCallback, useEffect } from "react";
import { getBackendUrl } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabaseClient";

export interface VisualizationData {
  deal: { name: string; x: number; y: number; z: number };
  lenders: LenderVizData[];
  sceneScale: number;
}

/** Lender medians from HMDA (for AI report "lender typical"). */
export interface LenderTypical {
  ltv_median?: number | null;
  loan_amount_median?: number | null;
  property_value_median?: number | null;
  total_units_median?: number | null;
  interest_rate_median?: number | null;
  loan_term_median?: number | null;
  origination_charges_median?: number | null;
  affordable_ratio?: number;
  total_loans?: number;
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
  lender_typical?: LenderTypical | null;
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
  lender_typical?: LenderTypical | null;
}

/** Draft run payload for sessionStorage and save-run. */
export interface MatchmakingDraftPayload {
  run_id: string;
  config: Record<string, unknown>;
  hmda_source: string;
  total_lenders: number;
  visualization_data: VisualizationData;
  lastRunAt: string;
  scores?: MatchScore[];
  /** Override parameters used for this run; rehydrated when returning to the tab. */
  field_overrides?: Record<string, string>;
  /** Set after save-run; required to add lenders to wishlist. */
  match_run_id?: string;
  project_resume_id?: string;
}

const DRAFT_STORAGE_KEY_PREFIX = "matchmaking_draft_";

function getDraftStorageKey(projectId: string): string {
  return `${DRAFT_STORAGE_KEY_PREFIX}${projectId}`;
}

export function getMatchmakingDraft(projectId: string): MatchmakingDraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(getDraftStorageKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as MatchmakingDraftPayload;
  } catch {
    return null;
  }
}

export function setMatchmakingDraft(projectId: string, draft: MatchmakingDraftPayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(getDraftStorageKey(projectId), JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function clearMatchmakingDraft(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(getDraftStorageKey(projectId));
  } catch {
    // ignore
  }
}

/** Clear all matchmaking drafts (e.g. on logout). */
export function clearAllMatchmakingDrafts(): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(DRAFT_STORAGE_KEY_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/** Derive MatchScore[] from visualization_data.lenders (saved run or draft). */
export function vizLendersToMatchScores(
  lenders: LenderVizData[] | null | undefined,
  matchRunId?: string | null
): MatchScore[] {
  if (!lenders?.length) return [];
  return lenders.map((l) => ({
    id: matchRunId ? `${matchRunId}_${l.lei}` : `draft_${l.lei}`,
    lender_lei: l.lei,
    lender_name: l.name ?? null,
    total_score: l.total_score,
    rank: l.rank,
    overall_narrative: l.narrative ?? null,
    pillar_scores: l.pillar_scores || {},
    variable_scores: l.variables || [],
    lender_typical: l.lender_typical ?? null,
  }));
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
  /** Current draft payload for save-run (run_id, config, hmda_source, viz, etc.). */
  draftPayload: MatchmakingDraftPayload | null;
  /** When viewing a saved run, the match_run id (for AI report cache key). */
  lastMatchRunId: string | null;
}

export function useMatchmaking(
  projectId: string,
  resumeId: string | null = null,
  contentOverrides?: Record<string, unknown>
) {
  const resumeIdReady = resumeId !== null;

  const [state, setState] = useState<MatchmakingState>(() => {
    const draft = projectId ? getMatchmakingDraft(projectId) : null;
    if (draft) {
      const scores = draft.scores ?? vizLendersToMatchScores(draft.visualization_data?.lenders, null);
      const top = draft.visualization_data?.lenders?.[0];
    return {
      isRunning: false,
      isLoading: false,
      visualizationData: draft.visualization_data,
      matchScores: scores,
      totalLenders: draft.total_lenders,
      topMatchName: top?.name ?? null,
      topMatchScore: top?.total_score ?? null,
      lastRunAt: draft.lastRunAt,
      error: null,
      draftPayload: draft,
      lastMatchRunId: null,
    };
  }
  return {
    isRunning: false,
    isLoading: true,
    visualizationData: null,
    matchScores: [],
    totalLenders: 0,
    topMatchName: null,
    topMatchScore: null,
    lastRunAt: null,
    error: null,
    draftPayload: null,
    lastMatchRunId: null,
  };
});

  const fetchRunByResume = useCallback(async () => {
    if (!resumeId) return;
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = getBackendUrl();
      const url = `${base}/api/v1/matchmaking/${encodeURIComponent(projectId)}/run/by-resume/${encodeURIComponent(resumeId)}`;
      const res = await fetch(url, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to fetch results");
      }
      const data = await res.json();
      if (data.found && data.visualization_data) {
        const viz = data.visualization_data as VisualizationData;
        const scores = vizLendersToMatchScores(viz.lenders, data.match_run_id);
        const top = viz.lenders?.[0];
        setState((s) => ({
          ...s,
          isLoading: false,
          visualizationData: viz,
          matchScores: scores,
          totalLenders: data.total_lenders || 0,
          topMatchName: top?.name ?? null,
          topMatchScore: top?.total_score ?? null,
          lastRunAt: data.created_at || null,
          draftPayload: null,
          lastMatchRunId: data.match_run_id || null,
        }));
      } else {
        const draft = getMatchmakingDraft(projectId);
        if (draft) {
          const scores = draft.scores ?? vizLendersToMatchScores(draft.visualization_data?.lenders, null);
          const top = draft.visualization_data?.lenders?.[0];
          setState((s) => ({
            ...s,
            isLoading: false,
            visualizationData: draft.visualization_data,
            matchScores: scores,
            totalLenders: draft.total_lenders,
            topMatchName: top?.name ?? null,
            topMatchScore: top?.total_score ?? null,
            lastRunAt: draft.lastRunAt,
            draftPayload: draft,
            lastMatchRunId: null,
          }));
        } else {
          setState((s) => ({
            ...s,
            isLoading: false,
            visualizationData: null,
            matchScores: [],
            totalLenders: 0,
            topMatchName: null,
            topMatchScore: null,
            lastRunAt: null,
            draftPayload: null,
            lastMatchRunId: null,
          }));
        }
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch results",
      }));
    }
  }, [projectId, resumeId]);

  const refreshAll = useCallback(async () => {
    await fetchRunByResume();
  }, [fetchRunByResume]);

  const runMatchmaking = useCallback(async (overridesToPersist?: Record<string, string>) => {
    setState((s) => ({ ...s, isRunning: true, error: null }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = getBackendUrl();
      const body: { resume_id?: string; content_overrides?: Record<string, unknown> } = {};
      if (resumeId) body.resume_id = resumeId;
      if (contentOverrides && Object.keys(contentOverrides).length > 0) body.content_overrides = contentOverrides;

      console.log("[useMatchmaking] runMatchmaking request body", {
        projectId,
        resume_id: body.resume_id,
        content_overrides: body.content_overrides,
        content_overrides_keys: body.content_overrides ? Object.keys(body.content_overrides) : [],
      });

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
        throw new Error(data?.message || "Matchmaking failed");
      }
      const runData = await res.json();
      const viz = runData.visualization_data as VisualizationData;
      const scores = Array.isArray(runData.scores) && runData.scores.length > 0
        ? (runData.scores as MatchScore[])
        : vizLendersToMatchScores(viz?.lenders, null);
      const top = viz?.lenders?.[0];
      const draftPayload: MatchmakingDraftPayload = {
        run_id: runData.run_id,
        config: runData.config ?? {},
        hmda_source: runData.hmda_source ?? "",
        total_lenders: runData.total_lenders ?? 0,
        visualization_data: viz,
        lastRunAt: new Date().toISOString(),
        scores,
        field_overrides: overridesToPersist && Object.keys(overridesToPersist).length > 0 ? overridesToPersist : undefined,
      };
      setMatchmakingDraft(projectId, draftPayload);
      setState((s) => ({
        ...s,
        isRunning: false,
        visualizationData: viz,
        matchScores: scores,
        totalLenders: runData.total_lenders ?? 0,
        topMatchName: top?.name ?? runData.top_match_name ?? null,
        topMatchScore: top?.total_score ?? runData.top_match_score ?? null,
        lastRunAt: draftPayload.lastRunAt,
        draftPayload,
        lastMatchRunId: null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isRunning: false,
        error: err instanceof Error ? err.message : "Matchmaking failed",
      }));
    }
  }, [projectId, resumeId, contentOverrides]);

  useEffect(() => {
    if (!resumeIdReady || !projectId) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    // Prefer draft (latest run, possibly with overrides) over saved run when returning to the tab.
    if (getMatchmakingDraft(projectId)) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    fetchRunByResume();
  }, [fetchRunByResume, resumeIdReady, projectId, resumeId]);

  return {
    ...state,
    runMatchmaking,
    refreshAll,
    fetchRunByResume,
  };
}
