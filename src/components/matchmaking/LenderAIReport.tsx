"use client";

import React from "react";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileText,
  Target,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { useLenderAIReport, type DealSummaryForAI } from "@/hooks/useLenderAIReport";
import type { MatchScore } from "@/hooks/useMatchmaking";
import type { DealInput } from "@/lib/matchmaking/types";

interface LenderAIReportProps {
  projectId: string;
  matchRunId: string | null;
  score: MatchScore;
  dealSummary: DealSummaryForAI;
  lenderName: string;
  /** When set with local Capitalize mode, calls `/api/matchmaking/ai-report`. */
  capitalizeDeal?: DealInput | null;
}

function scoreColor(score: number): string {
  if (score >= 0.7) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 0.4) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

export const LenderAIReport: React.FC<LenderAIReportProps> = ({
  projectId,
  matchRunId,
  score,
  dealSummary,
  lenderName,
  capitalizeDeal = null,
}) => {
  const {
    report,
    isGenerating,
    error,
    generateReport,
  } = useLenderAIReport(projectId, matchRunId, score, dealSummary, capitalizeDeal);

  const content = report?.report_content;

  if (!content) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={generateReport}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm disabled:opacity-60"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating AI Report...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Detailed AI Report
            </>
          )}
        </button>
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5">
            {error}
          </p>
        )}
      </div>
    );
  }

  const insights = content.dimension_insights;
  const pricingAnalysis = content.pricing_analysis;
  const ltvContext = content.ltv_context;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <FileText size={16} className="text-blue-600" />
        <span className="text-sm font-semibold text-gray-800">
          AI Detailed Report — {lenderName}
        </span>
        {report?.model_used && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-mono">
            {report.model_used}
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {content.parameter_recommendations && content.parameter_recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-indigo-800 flex items-center gap-1.5 mb-2">
              <Target size={14} />
              Parameter suggestions
            </h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    <th className="px-3 py-2">Parameter</th>
                    <th className="px-3 py-2">Current</th>
                    <th className="px-3 py-2">Suggested</th>
                    <th className="px-3 py-2">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {content.parameter_recommendations.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-800">{row.parameter}</td>
                      <td className="px-3 py-2 text-gray-600">{row.currentValue}</td>
                      <td className="px-3 py-2 text-gray-900">{row.suggestedValue}</td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            row.impact === "high"
                              ? "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-800"
                              : row.impact === "medium"
                                ? "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"
                                : "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-700"
                          }
                        >
                          {row.impact}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {content.parameter_recommendations.some((r) => r.explanation) && (
              <ul className="mt-2 space-y-1 text-xs text-gray-500">
                {content.parameter_recommendations.map(
                  (r, i) =>
                    r.explanation && (
                      <li key={i}>
                        <span className="font-medium text-gray-600">{r.parameter}:</span> {r.explanation}
                      </li>
                    )
                )}
              </ul>
            )}
          </div>
        )}

        {content.numerical_recommendations && content.numerical_recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5 mb-1.5">
              <Target size={14} />
              Numerical recommendations to improve fit
            </h4>
            <ul className="space-y-1.5">
              {content.numerical_recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-700 flex items-start gap-2 font-medium"
                >
                  <span className="text-indigo-500 mt-0.5 shrink-0">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.executive_summary && (
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-1.5">
              Executive Summary
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {content.executive_summary}
            </p>
          </div>
        )}

        {insights && insights.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
              <BarChart3 size={14} />
              Dimension Insights
            </h4>
            <div className="grid gap-1.5">
              {insights.map((di, i) => (
                <div
                  key={i}
                  className={`text-xs px-2.5 py-1.5 rounded-md border flex items-start gap-2 ${scoreColor(di.score)}`}
                >
                  <span className="font-bold shrink-0 w-6 text-right">{(di.score * 100).toFixed(0)}</span>
                  <span>{di.insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {pricingAnalysis && (
          <div>
            <h4 className="text-sm font-semibold text-violet-700 flex items-center gap-1.5 mb-1.5">
              <TrendingUp size={14} />
              Pricing Deep Dive
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed bg-violet-50/50 border border-violet-100 rounded-md px-3 py-2">
              {pricingAnalysis}
            </p>
            {ltvContext && (
              <p className="text-sm text-gray-600 leading-relaxed bg-amber-50/50 border border-amber-100 rounded-md px-3 py-2 mt-1.5">
                {ltvContext}
              </p>
            )}
          </div>
        )}

        {content.strengths && content.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 size={14} />
              Strengths
            </h4>
            <ul className="space-y-1">
              {content.strengths.map((s, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-600 flex items-start gap-2"
                >
                  <span className="text-emerald-500 mt-1 shrink-0">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.gaps && content.gaps.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={14} />
              Gaps / Risks
            </h4>
            <ul className="space-y-1">
              {content.gaps.map((g, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-600 flex items-start gap-2"
                >
                  <span className="text-amber-500 mt-1 shrink-0">•</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {content.recommendations && content.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-1.5 mb-1.5">
              <Lightbulb size={14} />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {content.recommendations.map((r, i) => (
                <li
                  key={i}
                  className="text-sm text-gray-600 flex items-start gap-2"
                >
                  <span className="text-blue-500 mt-1 shrink-0">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
