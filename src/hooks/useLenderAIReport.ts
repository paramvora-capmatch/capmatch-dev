"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { fetchJob } from "@/lib/apiClient";
import { getBackendUrl } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabaseClient";
import type { MatchScore } from "@/hooks/useMatchmaking";

const MAX_AI_REPORT_JOB_WAIT_MS = 120000; // 2 min
const POLL_JOBS_INTERVAL_MS = 2000;

interface JobRow {
  id: string;
  status: string;
  error_message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AIReportContent {
  numerical_recommendations?: string[];
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

/** Optional deal summary (resume + overrides) for AI report context. */
export type DealSummaryForAI = Record<string, unknown> | null;

export function useLenderAIReport(
  projectId: string,
  matchRunId: string | null,
  score: MatchScore | null,
  dealSummary: DealSummaryForAI = null
) {
  const [state, setState] = useState<UseLenderAIReportState>({
    report: null,
    isLoading: false,
    isGenerating: false,
    error: null,
  });

  const jobChannelRef = useRef<RealtimeChannel | null>(null);
  const jobTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jobPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getAuthHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }, []);

  const subscribeToAIReportJob = useCallback(
    (jobId: string, lenderLei: string) => {
      if (jobChannelRef.current) {
        supabase.removeChannel(jobChannelRef.current);
        jobChannelRef.current = null;
      }
      if (jobTimeoutRef.current) {
        clearTimeout(jobTimeoutRef.current);
        jobTimeoutRef.current = null;
      }
      if (jobPollRef.current) {
        clearInterval(jobPollRef.current);
        jobPollRef.current = null;
      }

      let terminalHandled = false;
      const handleTerminal = (
        status: "completed" | "failed",
        reportContent?: AIReportContent | null,
        modelUsed?: string | null,
        errorMessage?: string | null
      ) => {
        if (terminalHandled) return;
        terminalHandled = true;
        if (jobChannelRef.current) {
          supabase.removeChannel(jobChannelRef.current);
          jobChannelRef.current = null;
        }
        if (jobTimeoutRef.current) {
          clearTimeout(jobTimeoutRef.current);
          jobTimeoutRef.current = null;
        }
        if (jobPollRef.current) {
          clearInterval(jobPollRef.current);
          jobPollRef.current = null;
        }
        setState((s) => ({ ...s, isGenerating: false }));
        if (status === "completed" && reportContent !== undefined) {
          setState((s) => ({
            ...s,
            report: {
              lender_lei: lenderLei,
              report_content: reportContent,
              model_used: modelUsed ?? null,
              created_at: null,
              found: true,
              match_run_id: matchRunId,
            },
            error: null,
          }));
        } else if (status === "failed") {
          setState((s) => ({
            ...s,
            error: errorMessage || "AI report generation failed",
          }));
        }
      };

      const applyMetadata = (meta: Record<string, unknown> | null) => {
        if (!meta) return;
        handleTerminal(
          "completed",
          meta.report_content as AIReportContent,
          meta.model_used as string | null
        );
      };

      jobPollRef.current = setInterval(async () => {
        const { data: job, error } = await fetchJob(jobId);
        if (error || !job) return;
        if (job.status === "completed" && job.metadata) {
          applyMetadata(job.metadata as Record<string, unknown>);
          return;
        }
        if (job.status === "failed") {
          handleTerminal("failed", undefined, undefined, job.error_message ?? undefined);
        }
      }, POLL_JOBS_INTERVAL_MS);

      const channel = supabase
        .channel(`ai-report-job-${jobId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "jobs",
            filter: `id=eq.${jobId}`,
          },
          (payload) => {
            const row = payload.new as JobRow;
            if (row?.status === "completed") {
              const meta = (row.metadata ?? {}) as Record<string, unknown>;
              if (Object.keys(meta).length > 0) applyMetadata(meta);
              else
                void fetchJob(jobId).then(({ data: job }) => {
                  if (job?.status === "completed" && job.metadata) applyMetadata(job.metadata as Record<string, unknown>);
                });
              return;
            }
            if (row?.status === "failed") {
              handleTerminal("failed", undefined, undefined, row.error_message ?? undefined);
            }
          }
        )
        .subscribe();

      jobChannelRef.current = channel;
      jobTimeoutRef.current = setTimeout(() => {
        jobTimeoutRef.current = null;
        if (jobPollRef.current) {
          clearInterval(jobPollRef.current);
          jobPollRef.current = null;
        }
        if (jobChannelRef.current) {
          supabase.removeChannel(jobChannelRef.current);
          jobChannelRef.current = null;
        }
        setState((s) => ({
          ...s,
          isGenerating: false,
          error: "AI report is taking longer than expected. Please try again.",
        }));
      }, MAX_AI_REPORT_JOB_WAIT_MS);
    },
    [matchRunId]
  );

  const generateReport = useCallback(async () => {
    if (!score) return;
    setState((s) => ({ ...s, isGenerating: true, error: null }));
    try {
      const headers = await getAuthHeaders();
      const base = getBackendUrl();
      const body: Record<string, unknown> = {
        project_id: projectId,
        match_run_id: matchRunId || null,
        lender: scoreToLenderPayload(score),
      };
      if (dealSummary && Object.keys(dealSummary).length > 0) {
        body.deal_summary = dealSummary;
      }
      if (score.lender_typical && Object.keys(score.lender_typical).length > 0) {
        body.lender_typical = score.lender_typical;
      }
      const res = await fetch(`${base}/api/v1/matchmaking/ai-report/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || "Failed to generate AI report");
      }
      const data = await res.json();
      const jobId = data?.job_id;
      if (jobId) {
        subscribeToAIReportJob(jobId, score.lender_lei);
      } else {
        setState((s) => ({
          ...s,
          isGenerating: false,
          error: "Report started but status tracking is unavailable. Refresh to see updates.",
        }));
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        isGenerating: false,
        error: err instanceof Error ? err.message : "AI report generation failed",
      }));
    }
  }, [projectId, matchRunId, score, dealSummary, getAuthHeaders, subscribeToAIReportJob]);

  useEffect(() => {
    return () => {
      if (jobChannelRef.current) {
        supabase.removeChannel(jobChannelRef.current);
        jobChannelRef.current = null;
      }
      if (jobTimeoutRef.current) {
        clearTimeout(jobTimeoutRef.current);
        jobTimeoutRef.current = null;
      }
      if (jobPollRef.current) {
        clearInterval(jobPollRef.current);
        jobPollRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    generateReport,
  };
}
