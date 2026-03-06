"use client";

import React, { useState } from "react";
import type { MatchScore, VariableVizData } from "@/hooks/useMatchmaking";
import { getImprovementSuggestion } from "./matchmakingImprovementMock";

const PILLAR_META: Record<string, { label: string; icon: string; vars: string[] }> = {
  market_fit: { label: "Market Fit", icon: "\uD83C\uDF0D", vars: ["geography", "value_scale"] },
  capital_fit: { label: "Capital Fit", icon: "\uD83C\uDFE6", vars: ["loan_amount", "leverage", "coverage"] },
  product_fit: { label: "Product Fit", icon: "\uD83D\uDCCB", vars: ["affordability", "loan_purpose", "term_structure", "pricing"] },
};

function scoreColor(t: number): string {
  if (t >= 70) return "#2563eb";
  if (t >= 45) return "#3b82f6";
  return "#93c5fd";
}

function barColor(s: number): string {
  if (s >= 0.7) return "#2563eb";
  if (s >= 0.4) return "#3b82f6";
  return "#93c5fd";
}

interface LenderReportCardProps {
  score: MatchScore;
  totalCount: number;
}

export const LenderReportCard: React.FC<LenderReportCardProps> = ({ score, totalCount }) => {
  const [expanded, setExpanded] = useState<string | null>(null);
  const circ = 2 * Math.PI * 46;
  const offset = circ * (1 - score.total_score / 100);
  const rc = scoreColor(score.total_score);
  const narrative = score.overall_narrative ?? "No narrative available for this lender.";

  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full bg-white rounded-lg border border-gray-200">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[17px] font-bold text-gray-900 leading-tight max-w-[280px] break-words">
            {score.lender_name || score.lender_lei}
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
            Rank #{score.rank} of {totalCount} lenders
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative w-[110px] h-[110px]">
          <svg viewBox="0 0 110 110" className="w-[110px] h-[110px]" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(203,213,225,0.8)" strokeWidth="7" />
            <circle
              cx="55" cy="55" r="46"
              fill="none"
              stroke={rc}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.22,1,.36,1)" }}
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="text-[26px] font-bold leading-none" style={{ color: rc }}>
              {score.total_score.toFixed(1)}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">/ 100</div>
          </div>
        </div>
      </div>

      <div className="text-[12.5px] leading-relaxed text-gray-600 p-3 bg-gray-100 rounded-lg italic border border-gray-200">
        {narrative}
      </div>

      {Object.entries(PILLAR_META).map(([key, meta]) => {
        const pval = score.pillar_scores[key] ?? 0;
        const ppct = (typeof pval === "number" && pval <= 1 ? pval * 100 : pval).toFixed(0);
        const pc = barColor(typeof pval === "number" && pval <= 1 ? pval : pval / 100);
        const vars: VariableVizData[] = (score.variable_scores || []).filter((v) =>
          meta.vars.includes(v.key)
        );
        const isExpanded = expanded === key;

        return (
          <div key={key} className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50/80">
            <button
              type="button"
              onClick={() => setExpanded(isExpanded ? null : key)}
              className="w-full flex justify-between items-center px-3.5 py-2.5 hover:bg-gray-100 transition-colors"
            >
              <span className="text-[12px] font-semibold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <span className="text-sm opacity-60">{meta.icon}</span> {meta.label}
              </span>
              <span className="flex items-center">
                <span className="text-[13px] font-bold" style={{ color: pc }}>
                  {ppct}%
                </span>
                <span
                  className={`text-[10px] text-gray-500 ml-2 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                >
                  &#9660;
                </span>
              </span>
            </button>
            {isExpanded && (
              <div className="px-3.5 pb-3.5 space-y-3 bg-white">
                {vars.map((v) => {
                  const vScoreNorm = v.score <= 1 ? v.score : v.score / 100;
                  const vp = (vScoreNorm * 100).toFixed(0);
                  const vc = barColor(vScoreNorm);
                  const improvement = getImprovementSuggestion(v.key, vScoreNorm);
                  return (
                    <div key={v.key}>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[11.5px] font-medium text-gray-700">{v.name}</span>
                        <span className="text-[11.5px] font-semibold" style={{ color: vc }}>
                          {vp}%
                        </span>
                      </div>
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${vp}%`, background: vc }}
                        />
                      </div>
                      <p className="text-[10.5px] text-gray-500 leading-snug mt-1">{v.explanation}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        Weight: {v.weight} &middot; Contribution: {v.weighted.toFixed(1)} pts
                      </p>
                      {improvement && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10.5px] text-amber-800">
                          <span className="font-medium">To improve match:</span> {improvement.suggestion}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
