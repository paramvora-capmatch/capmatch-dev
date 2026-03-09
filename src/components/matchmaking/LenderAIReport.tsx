"use client";

import React, { useEffect } from "react";
import {
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileText,
} from "lucide-react";
import { useLenderAIReport } from "@/hooks/useLenderAIReport";

interface LenderAIReportProps {
  matchScoreId: string;
  lenderName: string;
}

export const LenderAIReport: React.FC<LenderAIReportProps> = ({
  matchScoreId,
  lenderName,
}) => {
  const {
    report,
    isLoading,
    isGenerating,
    error,
    fetchCachedReport,
    generateReport,
  } = useLenderAIReport(matchScoreId);

  useEffect(() => {
    fetchCachedReport();
  }, [fetchCachedReport]);

  const content = report?.report_content;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking for cached report...
      </div>
    );
  }

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
        {/* Executive Summary */}
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

        {/* Strengths */}
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

        {/* Gaps / Risks */}
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

        {/* Recommendations */}
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
