"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Building2 } from "lucide-react";
import type { MatchScore } from "@/hooks/useMatchmaking";
import { LenderReportCard } from "./LenderReportCard";

interface MatchmakingResultsLayoutProps {
  matchScores: MatchScore[];
  selectedLenderId: string | null;
  onSelectLender: (id: string | null) => void;
}

const TOP_N = 10;

export const MatchmakingResultsLayout: React.FC<MatchmakingResultsLayoutProps> = ({
  matchScores,
  selectedLenderId,
  onSelectLender,
}) => {
  const topScores = useMemo(
    () => [...matchScores].sort((a, b) => b.total_score - a.total_score).slice(0, TOP_N),
    [matchScores]
  );

  useEffect(() => {
    if (topScores.length > 0 && !selectedLenderId) {
      onSelectLender(topScores[0].id);
    }
  }, [topScores.length, selectedLenderId, onSelectLender]);

  const selectedScore = useMemo(
    () => (selectedLenderId ? topScores.find((s) => s.id === selectedLenderId) : null),
    [selectedLenderId, topScores]
  );

  const effectiveSelected = selectedScore ?? topScores[0] ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      {/* Left: top 10 lender list */}
      <div className="lg:col-span-1 space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Top {Math.min(TOP_N, topScores.length)} matched lenders
        </p>
        <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden divide-y divide-gray-200">
          {topScores.map((score) => {
            const pct = score.total_score;
            const colorClass =
              pct >= 70
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : pct >= 45
                  ? "text-amber-700 bg-amber-50 border-amber-200"
                  : "text-red-700 bg-red-50 border-red-200";
            const isSelected = effectiveSelected?.id === score.id;
            return (
              <button
                key={score.id}
                type="button"
                onClick={() => onSelectLender(score.id)}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                  isSelected ? "bg-blue-50 border-l-4 border-l-blue-600" : "hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-gray-400 w-5 text-right flex-shrink-0">
                    #{score.rank}
                  </span>
                  <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900 truncate">
                    {score.lender_name || score.lender_lei}
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex-shrink-0 ${colorClass}`}
                >
                  {pct.toFixed(1)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: lender report */}
      <div className="lg:col-span-2 min-h-[320px] rounded-lg border border-gray-200 bg-white overflow-hidden">
        {effectiveSelected ? (
          <LenderReportCard score={effectiveSelected} totalCount={matchScores.length} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500 text-sm">
            Select a lender from the list to view their match report and improvement tips.
          </div>
        )}
      </div>
    </div>
  );
};
