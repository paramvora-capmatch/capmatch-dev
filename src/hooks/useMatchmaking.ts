"use client";

import { useState, useCallback, useEffect } from "react";
import { getBackendUrl } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabaseClient";
import { useCapitalizeMatchmakingEngine } from "@/lib/matchmaking/engineMode";
import type { DimensionBandViz, MatchResponse, MatchResult } from "@/lib/matchmaking/types";

export interface VisualizationData {
  deal: { name: string; x: number; y: number; z: number };
  lenders: LenderVizData[];
  sceneScale: number;
  matchmakingContext?: {
    scores?: MatchScore[];
    totalEligible?: number | null;
  };
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
  lender_logo_url?: string | null;
  capitalize_meta?: CapitalizeMatchMeta;
  capitalize_ltv_band?: Extract<DimensionBandViz, { kind: "ltv_history" }>;
}

export interface VariableVizData {
  name: string;
  key: string;
  score: number;
  weight: number;
  weighted: number;
  explanation: string;
  /** Capitalize engine: percentile / band data for inline charts */
  viz?: DimensionBandViz;
}

export interface CapitalizeMatchMeta {
  confidenceCombined: number;
  rateTypeFactor: number;
  spreadMedian: number | null;
  ltvMedian: number | null;
  ltvCoverage: number | null;
  lenderType: string;
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
  lender_logo_url?: string | null;
  /** Set when using Capitalize local engine. */
  capitalize_meta?: CapitalizeMatchMeta;
  /** Historical LTV band from Capitalize (informational, not a scored dimension). */
  capitalize_ltv_band?: Extract<DimensionBandViz, { kind: "ltv_history" }>;
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
  content_updates?: Record<string, unknown>;
  field_overrides?: Record<string, string>;
  match_run_id?: string;
  project_resume_id?: string;
}

const DRAFT_STORAGE_KEY_PREFIX = "matchmaking_draft_";

function getDraftStorageKey(projectId: string): string {
  return `${DRAFT_STORAGE_KEY_PREFIX}${projectId}`;
}

export function capitalizeMatchResultToMatchScore(r: MatchResult): MatchScore {
  return {
    id: r.lenderId,
    lender_lei: r.lenderId,
    lender_name: r.lenderName,
    lender_logo_url: r.lenderLogoUrl,
    total_score: r.finalScore,
    rank: r.rank,
    overall_narrative: r.headline,
    pillar_scores: {},
    variable_scores: r.dimensions.map((d) => ({
      name: d.dimension,
      key: d.dimension.toLowerCase().replace(/\s+/g, "_"),
      score: d.score,
      weight: d.weight,
      weighted: d.weighted,
      explanation: d.explanation,
      viz: d.viz,
    })),
    capitalize_ltv_band: r.ltvBand,
    lender_typical: {
      total_loans: r.totalTxns,
      ltv_median: r.ltvMedian,
      loan_amount_median: null,
    },
    capitalize_meta: {
      confidenceCombined: r.confidence.combined,
      rateTypeFactor: r.confidence.rateType,
      spreadMedian: r.spreadMedian,
      ltvMedian: r.ltvMedian,
      ltvCoverage: r.ltvCoverage,
      lenderType: r.lenderType,
    },
  };
}

function stubVizFromScores(scores: MatchScore[], dealName: string): VisualizationData {
  return {
    deal: { name: dealName, x: 0, y: 0, z: 0 },
    sceneScale: 1,
    matchmakingContext: {
      scores,
      totalEligible: null,
    },
    lenders: scores.map((s) => ({
      lei: s.lender_lei,
      name: s.lender_name ?? s.lender_lei,
      x: 0,
      y: 0,
      z: 0,
      market_fit: 0,
      capital_fit: 0,
      product_fit: 0,
      total_score: s.total_score,
      rank: s.rank,
      narrative: s.overall_narrative ?? "",
      pillar_scores: s.pillar_scores,
      variables: s.variable_scores,
      lender_typical: s.lender_typical,
      lender_logo_url: s.lender_logo_url ?? null,
      capitalize_meta: s.capitalize_meta,
      capitalize_ltv_band: s.capitalize_ltv_band,
    })),
  };
}

function getDraftForResume(
  projectId: string,
  resumeId?: string | null
): MatchmakingDraftPayload | null {
  const draft = getMatchmakingDraft(projectId);
  if (!draft) return null;
  if (resumeId && draft.project_resume_id && draft.project_resume_id !== resumeId) {
    return null;
  }
  return draft;
}

function getScoresFromVisualization(
  viz: VisualizationData | null | undefined,
  matchRunId?: string | null
): MatchScore[] {
  if (!viz) return [];
  if (Array.isArray(viz.matchmakingContext?.scores) && viz.matchmakingContext.scores.length > 0) {
    return viz.matchmakingContext.scores.map((score) => ({
      ...score,
      id: score.id || (matchRunId ? `${matchRunId}_${score.lender_lei}` : `draft_${score.lender_lei}`),
    }));
  }
  return vizLendersToMatchScores(viz.lenders, matchRunId);
}

function getTotalEligible(
  viz: VisualizationData | null | undefined,
  config?: Record<string, unknown> | null
): number | null {
  if (typeof viz?.matchmakingContext?.totalEligible === "number") {
    return viz.matchmakingContext.totalEligible;
  }
  if (typeof config?.capitalize_total_eligible === "number") {
    return config.capitalize_total_eligible as number;
  }
  return null;
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
    lender_logo_url: l.lender_logo_url ?? null,
    capitalize_meta: l.capitalize_meta,
    capitalize_ltv_band: l.capitalize_ltv_band,
  }));
}

interface MatchmakingState {
  isRunning: boolean;
  isLoading: boolean;
  visualizationData: VisualizationData | null;
  matchScores: MatchScore[];
  totalLenders: number;
  totalEligible: number | null;
  topMatchName: string | null;
  topMatchScore: number | null;
  lastRunAt: string | null;
  error: string | null;
  draftPayload: MatchmakingDraftPayload | null;
  lastMatchRunId: string | null;
}

export function useMatchmaking(
  projectId: string,
  resumeId: string | null = null,
  contentOverrides?: Record<string, unknown>
) {
  const localCap = useCapitalizeMatchmakingEngine();
  const resumeIdReady = resumeId !== null;
  const [state, setState] = useState<MatchmakingState>(() => {
    const draft = projectId ? getDraftForResume(projectId, resumeId) : null;
    if (draft) {
      const scores =
        draft.scores ?? getScoresFromVisualization(draft.visualization_data, null);
      const top = draft.visualization_data?.lenders?.[0];
      return {
        isRunning: false,
        isLoading: false,
        visualizationData: draft.visualization_data,
        matchScores: scores,
        totalLenders: draft.total_lenders,
        totalEligible: getTotalEligible(draft.visualization_data, draft.config),
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
      totalEligible: null,
      topMatchName: null,
      topMatchScore: null,
      lastRunAt: null,
      error: null,
      draftPayload: null,
      lastMatchRunId: null,
    };
  });

  const fetchRunByResume = useCallback(async () => {
    if (!resumeId) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
        const scores = getScoresFromVisualization(viz, data.match_run_id);
        const top = viz.lenders?.[0];
        setState((s) => ({
          ...s,
          isLoading: false,
          visualizationData: viz,
          matchScores: scores,
          totalLenders: data.total_lenders || 0,
          totalEligible: getTotalEligible(viz, null),
          topMatchName: top?.name ?? null,
          topMatchScore: top?.total_score ?? null,
          lastRunAt: data.created_at || null,
          draftPayload: null,
          lastMatchRunId: data.match_run_id || null,
        }));
      } else {
        const draft = getDraftForResume(projectId, resumeId);
        if (draft) {
          const scores =
            draft.scores ?? getScoresFromVisualization(draft.visualization_data, null);
          const top = draft.visualization_data?.lenders?.[0];
          setState((s) => ({
            ...s,
            isLoading: false,
            visualizationData: draft.visualization_data,
            matchScores: scores,
            totalLenders: draft.total_lenders,
            totalEligible: getTotalEligible(draft.visualization_data, draft.config),
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
            totalEligible: null,
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

  const runMatchmaking = useCallback(
    async (
      contentUpdatesToPersist?: Record<string, unknown>,
      capitalizeBody?: Record<string, unknown>
    ) => {
      setState((s) => ({ ...s, isRunning: true, error: null }));
      try {
        if (localCap && capitalizeBody) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;
          const base = getBackendUrl();
          const res = await fetch(`${base}/api/v1/matchmaking/capitalize/run`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify(capitalizeBody),
          });
          const data = (await res.json().catch(() => ({}))) as MatchResponse & {
            error?: string;
            detail?: unknown;
            scores?: MatchScore[];
            visualization_data?: VisualizationData;
            run_id?: string;
            config?: Record<string, unknown>;
            hmda_source?: string;
            totalEligible?: number;
            totalLenders?: number;
          };
          if (!res.ok) {
            const detail = data?.detail;
            const message =
              typeof detail === "string"
                ? detail
                : Array.isArray(detail)
                  ? detail
                      .map((e: { msg?: string }) => e?.msg)
                      .filter(Boolean)
                      .join(", ") || "Matchmaking failed"
                  : data?.error || "Matchmaking failed";
            setState((s) => ({
              ...s,
              isRunning: false,
              error: message,
            }));
            return;
          }
          const scores =
            Array.isArray(data.scores) && data.scores.length > 0
              ? data.scores
              : data.results.map(capitalizeMatchResultToMatchScore);
          const vizSafe: VisualizationData =
            data.visualization_data ?? stubVizFromScores(scores, "Capitalize");
          vizSafe.matchmakingContext = {
            ...(vizSafe.matchmakingContext ?? {}),
            scores,
            totalEligible: getTotalEligible(
              vizSafe,
              (data.config as Record<string, unknown>) ?? {
                capitalize_total_eligible: data.totalEligible,
              }
            ),
          };
          const top = scores[0];
          const draftPayload: MatchmakingDraftPayload = {
            run_id: data.run_id ?? `capitalize_${Date.now()}`,
            config: (data.config as Record<string, unknown>) ?? {
              engine: "capitalize-v1",
              capitalize_total_eligible: data.totalEligible,
              capitalize_total_scanned: data.totalLenders,
            },
            hmda_source: data.hmda_source ?? "capitalize-backend",
            total_lenders: data.totalLenders ?? scores.length,
            visualization_data: vizSafe,
            lastRunAt: new Date().toISOString(),
            scores,
            content_updates:
              contentUpdatesToPersist &&
              Object.keys(contentUpdatesToPersist).length > 0
                ? contentUpdatesToPersist
                : undefined,
            project_resume_id: resumeId ?? undefined,
          };
          setMatchmakingDraft(projectId, draftPayload);
          setState((s) => ({
            ...s,
            isRunning: false,
            visualizationData: vizSafe,
            matchScores: scores,
            totalLenders: data.totalLenders ?? scores.length,
            totalEligible: getTotalEligible(vizSafe, draftPayload.config),
            topMatchName: top?.lender_name ?? null,
            topMatchScore: top?.total_score ?? null,
            lastRunAt: draftPayload.lastRunAt,
            draftPayload,
            lastMatchRunId: null,
            error: null,
          }));
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        const base = getBackendUrl();
        const body: { resume_id?: string; content_overrides?: Record<string, unknown> } = {};
        if (resumeId) body.resume_id = resumeId;
        const effectiveContentUpdates =
          contentUpdatesToPersist && Object.keys(contentUpdatesToPersist).length > 0
            ? contentUpdatesToPersist
            : contentOverrides && Object.keys(contentOverrides).length > 0
              ? contentOverrides
              : undefined;
        if (effectiveContentUpdates) {
          body.content_overrides = effectiveContentUpdates;
        }

        const res = await fetch(
          `${base}/api/v1/matchmaking/run/${encodeURIComponent(projectId)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify(body),
          }
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          const message =
            typeof data?.detail === "string"
              ? data.detail
              : Array.isArray(data?.detail)
                ? data.detail.map((e: { msg?: string }) => e?.msg).filter(Boolean).join(", ") || "Matchmaking failed"
                : data?.message || "Matchmaking failed";
          setState((s) => ({ ...s, isRunning: false, error: message }));
          return;
        }

        const viz = data.visualization_data as VisualizationData | null | undefined;
        const scores =
          Array.isArray(data.scores) && data.scores.length > 0
            ? (data.scores as MatchScore[])
            : getScoresFromVisualization(viz, null);
        const top = viz?.lenders?.[0];
        const vizSafe: VisualizationData =
          viz ??
          stubVizFromScores(scores, "Matchmaking");
        vizSafe.matchmakingContext = {
          ...(vizSafe.matchmakingContext ?? {}),
          scores,
          totalEligible: getTotalEligible(vizSafe, (data.config as Record<string, unknown>) ?? null),
        };
        const draftPayload: MatchmakingDraftPayload = {
          run_id: data.run_id ?? "",
          config: (data.config as Record<string, unknown>) ?? {},
          hmda_source: data.hmda_source ?? "",
          total_lenders: data.total_lenders ?? 0,
          visualization_data: vizSafe,
          lastRunAt: new Date().toISOString(),
          scores,
          content_updates:
            effectiveContentUpdates && Object.keys(effectiveContentUpdates).length > 0
              ? effectiveContentUpdates
              : undefined,
          project_resume_id: resumeId ?? undefined,
        };
        setMatchmakingDraft(projectId, draftPayload);
        setState((s) => ({
          ...s,
          isRunning: false,
          visualizationData: vizSafe,
          matchScores: scores,
          totalLenders: data.total_lenders ?? 0,
          totalEligible: null,
          topMatchName: top?.name ?? data.top_match_name ?? null,
          topMatchScore: top?.total_score ?? data.top_match_score ?? null,
          lastRunAt: draftPayload.lastRunAt,
          draftPayload,
          lastMatchRunId: null,
          error: null,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          isRunning: false,
          error: err instanceof Error ? err.message : "Matchmaking failed",
        }));
      }
    },
    [projectId, resumeId, contentOverrides, localCap]
  );

  useEffect(() => {
    if (!resumeIdReady || !projectId) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }
    if (getDraftForResume(projectId, resumeId)) {
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
    useLocalCapitalize: localCap,
    useCapitalizeEngine: localCap,
  };
}
