"use client";

import React, { useState, useEffect } from "react";
import { Zap, Building2, BookmarkPlus, Check, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { LenderAIReport } from "./LenderAIReport";
import { DimensionDistributionViz } from "./DimensionDistributionViz";
import { RateEnvironmentPanel } from "./RateEnvironmentPanel";
import type { MatchScore, VariableVizData } from "@/hooks/useMatchmaking";
import type { DealInput } from "@/lib/matchmaking/types";
import type { RatePoint, RateTrendSignal } from "@/lib/matchmaking/rateTrend";
import { getBackendUrl } from "@/lib/apiConfig";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/utils/cn";

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 70
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : score >= 45
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-red-700 bg-red-50 border-red-200";
  return <span className={`text-base font-bold px-3 py-1 rounded-full border ${cls}`}>{score.toFixed(1)}</span>;
}

interface LenderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  matchRunId: string | null;
  score: MatchScore;
  dealSummary: Record<string, unknown> | null;
  capitalizeDeal: DealInput | null;
  advisorRateType: "fixed" | "floating" | "any";
  /** Benchmark series for rate history (DGS5/DGS7/DGS10/SOFR) — aligned with lender matching tab. */
  benchmarkSeriesId: string;
  canAddToWishlist: boolean;
  onAddToWishlist: (score: MatchScore) => void;
  wishlistAdded: Set<string>;
  wishlistLoading: string | null;
}

export const LenderDetailModal: React.FC<LenderDetailModalProps> = ({
  isOpen,
  onClose,
  projectId,
  matchRunId,
  score,
  dealSummary,
  capitalizeDeal,
  advisorRateType,
  benchmarkSeriesId,
  canAddToWishlist,
  onAddToWishlist,
  wishlistAdded,
  wishlistLoading,
}) => {
  const displayName = score.lender_name || score.lender_lei || "Unknown";

  const [historyPoints, setHistoryPoints] = useState<RatePoint[] | null>(null);
  const [historySignal, setHistorySignal] = useState<RateTrendSignal | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = getBackendUrl();
      const series = encodeURIComponent(benchmarkSeriesId);
      const res = await fetch(`${base}/api/v1/matchmaking/capitalize/benchmark/history?series=${series}&days=365`, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });
      if (!res.ok || cancelled) return;
      const data = await res.json();
      if (!cancelled && data?.points && data?.signal) {
        setHistoryPoints(data.points as RatePoint[]);
        setHistorySignal(data.signal as RateTrendSignal);
      }
    })().catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, benchmarkSeriesId]);

  const lenderSpread = score.capitalize_meta?.spreadMedian ?? null;

  const headerRight = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => { if (canAddToWishlist) onAddToWishlist(score); }}
        disabled={!canAddToWishlist || wishlistAdded.has(score.lender_lei) || wishlistLoading === score.lender_lei}
        title={!canAddToWishlist ? "Save the matchmaking run first" : wishlistAdded.has(score.lender_lei) ? "Already in wishlist" : "Add to wishlist"}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
          wishlistAdded.has(score.lender_lei)
            ? "border-green-200 bg-green-50 text-green-700 cursor-default"
            : canAddToWishlist
              ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
              : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
        )}
      >
        {wishlistLoading === score.lender_lei ? (
          <Loader2 size={12} className="animate-spin" />
        ) : wishlistAdded.has(score.lender_lei) ? (
          <Check size={12} className="text-green-600" />
        ) : (
          <BookmarkPlus size={12} />
        )}
        {wishlistAdded.has(score.lender_lei) ? "Saved" : "Wishlist"}
      </button>
      <ScoreBadge score={score.total_score} />
    </div>
  );

  const title = (
    <span className="flex items-center gap-2">
      {score.lender_logo_url ? (
        <img
          src={score.lender_logo_url}
          alt=""
          className="h-6 w-6 rounded object-contain border border-gray-100 bg-white shrink-0"
        />
      ) : (
        <Building2 size={16} className="text-gray-400 shrink-0" />
      )}
      <span className="truncate">#{score.rank} {displayName}</span>
    </span>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} headerRight={headerRight} size="3xl">
      <div className="overflow-y-auto space-y-5 -mx-6 px-6 pb-2" style={{ maxHeight: "calc(80vh - 80px)" }}>
        {/* Overview strip */}
        {(score.overall_narrative || (advisorRateType !== "any" && score.capitalize_meta)) && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 space-y-1">
            {score.overall_narrative && (
              <p className="text-sm text-gray-600 italic leading-relaxed">
                {score.overall_narrative}
              </p>
            )}
            {advisorRateType !== "any" && score.capitalize_meta && (
              <p className="text-xs text-slate-500">
                Rate-type confidence: {(score.capitalize_meta.rateTypeFactor * 100).toFixed(0)}% of blend
                {score.capitalize_meta.lenderType ? ` · ${score.capitalize_meta.lenderType}` : ""}
              </p>
            )}
          </div>
        )}

        {/* Score Breakdown */}
        {score.variable_scores && score.variable_scores.length > 0 && (
          <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-1.5 mb-3">
              <Zap size={16} className="text-blue-600" />
              <span className="text-base font-semibold text-gray-800">Score breakdown</span>
            </div>
            <ul className="space-y-2">
              {score.variable_scores.map((v: VariableVizData, i: number) => (
                <li key={i} className="text-sm border-b border-gray-100 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-gray-700">{v.name}</span>
                    <span className="text-xs font-semibold text-gray-500">{(v.score * 100).toFixed(0)}</span>
                  </div>
                  <ScoreBar score={v.score * 100} color={v.score >= 0.7 ? "#059669" : v.score >= 0.4 ? "#d97706" : "#dc2626"} />
                  {v.explanation && (
                    <p className="text-xs text-gray-500 mt-0.5">{v.explanation}</p>
                  )}
                  {v.viz && (
                    <div className="mt-2 rounded-lg bg-slate-50/80 border border-slate-100 px-2 py-2">
                      <DimensionDistributionViz viz={v.viz} />
                    </div>
                  )}
                </li>
              ))}
              {score.capitalize_ltv_band && (
                <li className="text-sm pt-2 border-t border-dashed border-gray-200">
                  <span className="font-medium text-gray-700">Historical LTV</span>
                  <div className="mt-1 rounded-lg bg-amber-50/50 border border-amber-100/80 px-2 py-2">
                    <DimensionDistributionViz viz={score.capitalize_ltv_band} />
                  </div>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Rate environment — same benchmark series as matching tab */}
        {historyPoints && historySignal && historyPoints.length > 30 && (
          <RateEnvironmentPanel
            points={historyPoints}
            signal={historySignal}
            lenderSpreadMedian={lenderSpread}
            variant="modal"
          />
        )}

        {/* AI Report */}
        <LenderAIReport
          projectId={projectId}
          matchRunId={matchRunId}
          score={score}
          dealSummary={dealSummary}
          lenderName={displayName}
          capitalizeDeal={capitalizeDeal}
        />
      </div>
    </Modal>
  );
};
