"use client";

import React from "react";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { MatchExplorer3D } from "@/components/matchmaking/MatchExplorer3D";
import { Loader2, Zap, BarChart3, Trophy, Clock, AlertCircle, RefreshCw } from "lucide-react";

interface MatchmakingPanelProps {
  projectId: string;
}

export const MatchmakingPanel: React.FC<MatchmakingPanelProps> = ({ projectId }) => {
  const {
    isRunning,
    isLoading,
    visualizationData,
    totalLenders,
    topMatchName,
    topMatchScore,
    lastRunAt,
    error,
    runMatchmaking,
  } = useMatchmaking(projectId);

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            AI Matchmaking Engine
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Score lenders against this deal using HMDA lending data
          </p>
        </div>
        <button
          onClick={runMatchmaking}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running Engine...
            </>
          ) : visualizationData ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Re-run Matchmaking
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Run Matchmaking
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Matchmaking failed</p>
            <p className="text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading initial state */}
      {isLoading && !visualizationData && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400 mr-2" />
          <span className="text-sm text-gray-500">Checking for previous results...</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !visualizationData && !isRunning && !error && (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
          <BarChart3 className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 text-center max-w-sm">
            No matchmaking results yet. Click &quot;Run Matchmaking&quot; to score lenders against this deal
            using HMDA multifamily lending data.
          </p>
        </div>
      )}

      {/* Summary bar */}
      {visualizationData && !isRunning && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-600">
            <BarChart3 className="h-3.5 w-3.5" />
            {totalLenders} lenders scored
          </div>
          {topMatchName && topMatchScore !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg text-xs font-medium text-emerald-700">
              <Trophy className="h-3.5 w-3.5" />
              Top: {topMatchName} ({topMatchScore.toFixed(1)}/100)
            </div>
          )}
          {lastRunAt && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              {formatDate(lastRunAt)}
            </div>
          )}
        </div>
      )}

      {/* Running indicator overlay */}
      {isRunning && (
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-900 rounded-xl border border-slate-700">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-700 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm text-slate-300 mt-4 font-medium">Running matchmaking engine...</p>
          <p className="text-xs text-slate-500 mt-1">Profiling lenders from HMDA data and scoring against your deal</p>
        </div>
      )}

      {/* 3D Visualization */}
      {visualizationData && !isRunning && (
        <MatchExplorer3D data={visualizationData} />
      )}
    </div>
  );
};
