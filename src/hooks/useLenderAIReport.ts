"use client";

import { useState, useCallback } from "react";
import { getBackendUrl } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabaseClient";
import type { MatchScore } from "@/hooks/useMatchmaking";

export interface AIReportContent {
  executive_summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
}

export interface AIReport {
  id?: string;
  match_run_id?: string | null;
  lender_lei: string;
  report_content: AIReportContent | null;
  model_used: string | null;
  created_at: string | null;
  found: boolean;
}

interface UseLenderAIReportState {
  report: AIReport | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
}

/** Build lender payload for POST /ai-report/generate from MatchScore. */
function scoreToLenderPayload(score: MatchScore): {
  lei: string;
  name: string | null;
  total_score: number;
  rank: number;
  narrative: string | null;
  pillar_scores: Record<string, number>;
  variables: Array<{ name: string; key: string; score: number; weight?: number; weighted?: number; explanation?: string }>;
} {
  return {
    lei: score.lender_lei,
    name: score.lender_name,
    total_score: score.total_score,
    rank: score.rank,
    narrative: score.overall_narrative,
    pillar_scores: score.pillar_scores || {},
    variables: score.variable_scores || [],
  };
}

export function useLenderAIReport(
  projectId: string,
  matchRunId: string | null,
  score: MatchScore | null
) {
  const [state, setState] = useState<UseLenderAIReportState>({
    report: null,
    isLoading: false,
    isGenerating: false,
    error: null,
  });

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }, []);

  const generateReport = useCallback(async () => {
    if (!score) return;
    setState((s) => ({ ...s, isGenerating: true, error: null }));
    try {
      const headers = await getAuthHeaders();
      const base = getBackendUrl();
      const res = await fetch(`${base}/api/v1/matchmaking/ai-report/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          project_id: projectId,
          match_run_id: matchRunId || null,
          lender: scoreToLenderPayload(score),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || "Failed to generate AI report");
      }
      const data = await res.json();
      setState((s) => ({
        ...s,
        isGenerating: false,
        report: {
          lender_lei: score.lender_lei,
          report_content: data.report_content,
          model_used: data.model_used ?? null,
          created_at: null,
          found: true,
          match_run_id: matchRunId,
        },
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isGenerating: false,
        error: err instanceof Error ? err.message : "AI report generation failed",
      }));
    }
  }, [projectId, matchRunId, score, getAuthHeaders]);

  return {
    ...state,
    generateReport,
  };
}
