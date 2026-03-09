"use client";

import { useState, useCallback } from "react";
import { getBackendUrl } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabaseClient";

export interface AIReportContent {
  executive_summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
}

export interface AIReport {
  id?: string;
  match_score_id: string;
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

export function useLenderAIReport(matchScoreId: string) {
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

  const fetchCachedReport = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const headers = await getAuthHeaders();
      const base = getBackendUrl();
      const res = await fetch(
        `${base}/api/v1/matchmaking/${encodeURIComponent(matchScoreId)}/ai-report`,
        { headers }
      );
      if (!res.ok) {
        setState((s) => ({ ...s, isLoading: false }));
        return;
      }
      const data: AIReport = await res.json();
      if (data.found && data.report_content) {
        setState((s) => ({ ...s, isLoading: false, report: data }));
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, [matchScoreId, getAuthHeaders]);

  const generateReport = useCallback(async () => {
    setState((s) => ({ ...s, isGenerating: true, error: null }));
    try {
      const headers = await getAuthHeaders();
      const base = getBackendUrl();
      const res = await fetch(
        `${base}/api/v1/matchmaking/${encodeURIComponent(matchScoreId)}/ai-report`,
        { method: "POST", headers }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to generate AI report");
      }
      const data: AIReport = await res.json();
      setState((s) => ({ ...s, isGenerating: false, report: data }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isGenerating: false,
        error: err instanceof Error ? err.message : "AI report generation failed",
      }));
    }
  }, [matchScoreId, getAuthHeaders]);

  return {
    ...state,
    fetchCachedReport,
    generateReport,
  };
}
