"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Zap,
  Save,
  RotateCcw,
  Clock,
  Trophy,
  BarChart3,
  Building2,
  Landmark,
  Tag,
  History,
  Star,
  Loader2,
  Target,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useMatchmaking, type MatchScore, type VariableVizData } from "@/hooks/useMatchmaking";
import { useProjectStore } from "@/stores/useProjectStore";
import type { ProjectProfile } from "@/types/enhanced-types";

// ─── Mock version (same UI as DealScenarioBuilder; can wire to backend later) ───

const MOCK_VERSION = {
  number: 5,
  status: "draft" as const,
  label: "Non-Recourse Agency Play",
  lastSaved: "Auto-saved 12s ago",
  history: [
    { version: 5, label: "Non-Recourse Agency Play", date: "Mar 6, 2:42pm", status: "draft", topScore: null as number | null },
    { version: 4, label: "Conservative 65% LTV", date: "Mar 5, 2:30pm", status: "saved", topScore: 87 },
    { version: 3, label: "Non-Recourse Attempt", date: "Mar 4, 11:00am", status: "saved", topScore: 72 },
    { version: 2, label: "Initial Structure", date: "Mar 3, 4:15pm", status: "saved", topScore: 68 },
    { version: 1, label: "From Resume Import", date: "Mar 2, 9:00am", status: "saved", topScore: null },
  ],
};

// Helper to get field value from project (same pattern as ProjectResumeView)
function getFieldValue(project: ProjectProfile | null | undefined, fieldId: string): unknown {
  if (!project) return undefined;
  const p = project as unknown as Record<string, unknown>;
  if (p[fieldId] !== undefined) {
    return p[fieldId];
  }
  const content = p.content as Record<string, unknown> | undefined;
  if (content && content[fieldId] !== undefined) {
    const item = content[fieldId];
    if (item && typeof item === "object" && item !== null && "value" in item) {
      return (item as { value: unknown }).value;
    }
    return item;
  }
  if (project._metadata && project._metadata[fieldId]) {
    return project._metadata[fieldId].value;
  }
  return undefined;
}

// Format a deal-term value for display
function formatDealValue(value: unknown, key: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    const currencyKeys = ["loanAmountRequested", "stabilizedValue", "purchasePrice", "baseConstruction", "loanFees", "propertyNoiT12", "noiYear1"];
    const percentKeys = ["targetLtvPercent", "ltv", "dscr", "interestRate", "originationFee"];
    if (currencyKeys.includes(key)) return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
    if (percentKeys.includes(key)) return `${value}%`;
    return value.toLocaleString();
  }
  return String(value);
}

// 9 Key Deal Terms sections (backend matchmaking dimensions); keys are project resume camelCase
const KEY_DEAL_TERMS_SECTIONS: { label: string; keys: { key: string; label: string }[] }[] = [
  { label: "Geography", keys: [
    { key: "propertyAddressState", label: "State" },
    { key: "propertyAddressCounty", label: "County" },
    { key: "propertyAddressCity", label: "City" },
    { key: "propertyAddressZip", label: "Zip" },
    { key: "msaName", label: "MSA" },
  ]},
  { label: "Loan amount", keys: [{ key: "loanAmountRequested", label: "Loan amount requested" }] },
  { label: "Value / scale", keys: [
    { key: "stabilizedValue", label: "Stabilized value" },
    { key: "purchasePrice", label: "Purchase price" },
    { key: "totalResidentialUnits", label: "Total units" },
  ]},
  { label: "Leverage", keys: [{ key: "targetLtvPercent", label: "Target LTV %" }] },
  { label: "Coverage", keys: [
    { key: "dscr", label: "DSCR" },
    { key: "propertyNoiT12", label: "NOI T12" },
  ]},
  { label: "Affordability", keys: [
    { key: "affordableHousing", label: "Affordable housing" },
    { key: "affordableUnitsNumber", label: "Affordable units" },
  ]},
  { label: "Loan purpose", keys: [
    { key: "projectPhase", label: "Project phase" },
    { key: "useOfProceeds", label: "Use of proceeds" },
    { key: "baseConstruction", label: "Base construction" },
  ]},
  { label: "Term structure", keys: [
    { key: "requestedTerm", label: "Requested term" },
    { key: "interestOnlyPeriodMonths", label: "Interest-only (months)" },
  ]},
  { label: "Pricing", keys: [
    { key: "interestRate", label: "Interest rate" },
    { key: "originationFee", label: "Origination fee" },
    { key: "loanFees", label: "Loan fees" },
  ]},
];

function formatDate(iso: string | null): string | null {
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
}

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : score >= 45
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-red-700 bg-red-50 border-red-200";
  return (
    <span className={`text-base font-bold px-3 py-1 rounded-full border ${cls}`}>
      {score.toFixed(1)}
    </span>
  );
}

// ─── Match card: collapsed shows rank, name, score; expanded shows narrative + variable_scores ───

function MatchCard({
  score,
  expanded,
  onToggle,
}: {
  score: MatchScore;
  expanded: boolean;
  onToggle: () => void;
}) {
  const displayName = score.lender_name || score.lender_lei || "Unknown";
  const pct = score.total_score;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <div
        onClick={onToggle}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-bold text-gray-400 w-5 text-right shrink-0">
          #{score.rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-gray-400 shrink-0" />
            <span className="text-base font-semibold text-gray-900 truncate">
              {displayName}
            </span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <ScoreBadge score={pct} />
          {expanded ? (
            <ChevronUp size={14} className="text-gray-300" />
          ) : (
            <ChevronDown size={14} className="text-gray-300" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {score.overall_narrative && (
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap size={16} className="text-blue-600" />
                <span className="text-base font-semibold text-gray-800">
                  Match overview
                </span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {score.overall_narrative}
              </p>
            </div>
          )}
          {score.variable_scores && score.variable_scores.length > 0 && (
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
              <span className="text-base font-semibold text-gray-800 block mb-2">
                Score breakdown
              </span>
              <ul className="space-y-2">
                {score.variable_scores.map((v: VariableVizData, i: number) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-gray-700">{v.name}:</span>{" "}
                    <span className="text-gray-600">{v.explanation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface LenderMatchTabProps {
  projectId: string;
}

export const LenderMatchTab: React.FC<LenderMatchTabProps> = ({ projectId }) => {
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const [expandedScoreId, setExpandedScoreId] = useState<string | null>(null);

  const activeProject = useProjectStore((s) => s.activeProject);
  const project = activeProject?.id === projectId ? activeProject : null;

  const {
    isRunning: matchRunning,
    isLoading: matchLoading,
    matchScores,
    totalLenders: matchedLenderCount,
    topMatchName,
    topMatchScore,
    lastRunAt,
    error: matchError,
    runMatchmaking,
    visualizationData,
  } = useMatchmaking(projectId);

  const hasResults = matchScores.length > 0 || !!visualizationData;

  return (
    <div className="flex gap-6 items-start max-w-[1600px] mx-auto">
      {/* ──────── LEFT PANEL: Version + Key Deal Terms ──────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Version card (same as DealScenarioBuilder) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <History size={16} className="text-gray-500" />
                  <span className="text-base font-medium text-gray-700">
                    v{MOCK_VERSION.number}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                    {MOCK_VERSION.status.toUpperCase()}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {versionDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        Version History
                      </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {MOCK_VERSION.history.map((v) => (
                        <button
                          key={v.version}
                          type="button"
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between"
                          onClick={() => setVersionDropdownOpen(false)}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-medium text-gray-800">
                                v{v.version}
                              </span>
                              {v.status === "draft" && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                                  DRAFT
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {v.label}
                            </p>
                            <p className="text-xs text-gray-400">{v.date}</p>
                          </div>
                          {v.topScore != null && (
                            <span className="text-sm font-semibold text-emerald-600">
                              {v.topScore}/100
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Tag size={14} className="text-gray-400" />
                <span className="text-base text-gray-600 italic">
                  &ldquo;{MOCK_VERSION.label}&rdquo;
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {MOCK_VERSION.lastSaved}
              </span>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <RotateCcw size={14} />
                Discard
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Save size={14} />
                Save Version
              </button>
            </div>
          </div>
        </div>

        {/* Key Deal Terms (9 backend matchmaking dimensions from project resume) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={16} className="text-blue-600" />
            <h3 className="text-base font-semibold text-gray-800">
              Key Deal Terms
            </h3>
          </div>
          {!project ? (
            <p className="text-sm text-gray-500">No project data. Open a project to see deal terms.</p>
          ) : (
            <div className="space-y-4">
              {KEY_DEAL_TERMS_SECTIONS.map((section) => (
                <div key={section.label}>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    {section.label}
                  </div>
                  <div className="space-y-1">
                    {section.keys.map(({ key, label }) => {
                      const value = getFieldValue(project, key);
                      return (
                        <div key={key} className="flex justify-between items-baseline gap-2 text-sm">
                          <span className="text-gray-600">{label}</span>
                          <span className="text-gray-900 font-medium truncate max-w-[60%] text-right">
                            {formatDealValue(value, key)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ──────── RIGHT PANEL: Lender Matches (backend) ──────── */}
      <div className="w-[420px] shrink-0 space-y-4 sticky top-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Landmark size={16} className="text-blue-600" />
                Lender Matches
              </h3>
              {hasResults && lastRunAt && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Last run: {formatDate(lastRunAt)}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => runMatchmaking()}
              disabled={matchRunning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {matchRunning ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Running...
                </>
              ) : hasResults ? (
                <>
                  <RefreshCw size={16} />
                  Re-run Matchmaking
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Run Matchmaking
                </>
              )}
            </button>
          </div>

          {matchError && (
            <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Matchmaking failed</p>
                <p className="text-red-600 mt-0.5">{matchError}</p>
              </div>
            </div>
          )}

          {hasResults && !matchRunning && (
            <div className="flex flex-wrap gap-2 mt-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-sm font-medium text-gray-600">
                <BarChart3 size={14} />
                {matchedLenderCount} lenders scored
              </div>
              {topMatchName != null && topMatchScore != null && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg text-sm font-medium text-emerald-700">
                  <Trophy size={14} />
                  Top: {topMatchName} ({topMatchScore.toFixed(1)}/100)
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 max-h-[calc(100vh-240px)] overflow-y-auto pr-1">
          {matchRunning || matchLoading ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200 shadow-sm">
              <Loader2
                size={32}
                className="text-blue-500 animate-spin mb-4"
              />
              <h4 className="text-base font-semibold text-gray-800">
                Analyzing Lenders...
              </h4>
              <p className="text-sm text-gray-500 text-center mt-2">
                Matching your project parameters against the backend matchmaking
                engine.
              </p>
            </div>
          ) : !hasResults ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200 shadow-sm opacity-80">
              <Target size={48} className="text-gray-300 mb-4" />
              <h4 className="text-base font-semibold text-gray-800">
                Ready to Match
              </h4>
              <p className="text-sm text-gray-500 text-center mt-2">
                Run matchmaking to see compatible lenders scored against your
                key deal terms.
              </p>
            </div>
          ) : (
            matchScores.map((score) => (
              <MatchCard
                key={score.id}
                score={score}
                expanded={expandedScoreId === score.id}
                onToggle={() =>
                  setExpandedScoreId((id) =>
                    id === score.id ? null : score.id
                  )
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
