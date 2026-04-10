"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ChevronDown,
  Zap,
  Save,
  RotateCcw,
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
  Pencil,
  Check,
  X,
  Lock,
  BookmarkPlus,
} from "lucide-react";
import { useMatchmaking, getMatchmakingDraft, setMatchmakingDraft, type MatchScore } from "@/hooks/useMatchmaking";
import { useProjectStore } from "@/stores/useProjectStore";
import { supabase } from "@/lib/supabaseClient";
import { getBackendUrl } from "@/lib/apiConfig";
import type { ProjectProfile } from "@/types/enhanced-types";
import { LenderDetailModal } from "./LenderDetailModal";
import { FIELD_DEPENDENCIES } from "@/features/project-resume/domain/validationDependencies";
import { cn } from "@/utils/cn";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertModal } from "@/components/ui/AlertModal";
import { ASSET_CLASS_VALUES, TERM_BUCKET_VALUES, TERM_BUCKET_LABELS, TERM_BUCKET_SHORT_LABELS, TERM_BUCKET_NO_DISCRIMINATION, LENDER_TYPE_VALUES, LENDER_TYPE_LABELS, mapProjectPhaseToPurposes, STATE_CODES, benchmarkSeriesIdFromRateAndTerm } from "@/lib/matchmaking/constants";
import type { DealInput } from "@/lib/matchmaking/types";
import type { RatePoint, RateTrendSignal } from "@/lib/matchmaking/rateTrend";
import { rateTrendAdvisoryText } from "@/lib/matchmaking/explain";
import { RateEnvironmentPanel } from "./RateEnvironmentPanel";

// ─── Types ──────────────────────────────────────────────────────────────────

interface VersionRow {
  id: string;
  version_number: number | null;
  label: string | null;
  created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFieldValue(project: ProjectProfile | null | undefined, fieldId: string): unknown {
  if (!project) return undefined;
  const p = project as unknown as Record<string, unknown>;
  if (p[fieldId] !== undefined) return p[fieldId];
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

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return null; }
}

// 9 Key Deal Terms grouped by matchmaking dimension
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

/** Every field id shown in Key Deal Terms (for resume-backed merge / summaries). */
const RESUME_CONTEXT_KEYS_FROM_SECTIONS = new Set(
  KEY_DEAL_TERMS_SECTIONS.flatMap((s) => s.keys.map((k) => k.key))
);

const EDITABLE_KEYS = new Set([
  "loanAmountRequested",
  "targetLtvPercent", "dscr", "propertyNoiT12", "noiYear1",
  "affordableHousing", "affordableUnitsNumber", "requestedTerm", "interestOnlyPeriodMonths",
  "interestRate", "originationFee", "loanFees", "baseConstruction", "stabilizedValue",
  "purchasePrice", "totalResidentialUnits",
]);

const NUMERIC_KEYS = new Set([
  "loanAmountRequested", "targetLtvPercent", "dscr", "propertyNoiT12", "noiYear1",
  "affordableUnitsNumber", "requestedTerm", "interestOnlyPeriodMonths", "interestRate",
  "originationFee", "loanFees", "baseConstruction", "stabilizedValue", "purchasePrice",
  "totalResidentialUnits",
]);

function normalizeContentUpdates(overrides: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(overrides)) {
    if (!EDITABLE_KEYS.has(key)) continue;
    if (key === "affordableHousing") {
      out[key] = /^(1|true|yes)$/i.test(raw.trim());
      continue;
    }
    if (NUMERIC_KEYS.has(key)) {
      const n = parseFloat(raw.replace(/[,$%]/g, "").trim());
      out[key] = Number.isFinite(n) ? n : raw;
      continue;
    }
    out[key] = raw.trim() || raw;
  }
  return out;
}

/** Build flat context for sanity checks: base values from project + overrides. */
function getMergedContext(
  project: ProjectProfile | null,
  overrides: Record<string, string>
): Record<string, unknown> {
  const base: Record<string, unknown> = {};
  if (project) {
    for (const key of EDITABLE_KEYS) {
      const v = getFieldValue(project, key);
      if (v !== undefined && v !== null) base[key] = v;
    }
    for (const key of RESUME_CONTEXT_KEYS_FROM_SECTIONS) {
      if (EDITABLE_KEYS.has(key)) continue;
      const v = getFieldValue(project, key);
      if (v !== undefined && v !== null && v !== "") base[key] = v;
    }
  }
  const normalized = normalizeContentUpdates(overrides);
  return { ...base, ...normalized };
}

/** Keys and labels for AI report deal summary (subset of merged context). */
const DEAL_SUMMARY_KEYS: { key: string; label: string }[] = [
  { key: "propertyAddressState", label: "State" },
  { key: "propertyAddressCounty", label: "County" },
  { key: "propertyAddressCity", label: "City" },
  { key: "propertyAddressZip", label: "Zip" },
  { key: "msaName", label: "MSA" },
  { key: "loanAmountRequested", label: "Loan amount requested" },
  { key: "targetLtvPercent", label: "Target LTV %" },
  { key: "dscr", label: "DSCR" },
  { key: "stabilizedValue", label: "Stabilized value" },
  { key: "purchasePrice", label: "Purchase price" },
  { key: "totalResidentialUnits", label: "Total residential units" },
  { key: "projectPhase", label: "Project phase" },
  { key: "useOfProceeds", label: "Use of proceeds" },
  { key: "interestRate", label: "Interest rate" },
  { key: "requestedTerm", label: "Requested term" },
  { key: "affordableHousing", label: "Affordable housing" },
  { key: "affordableUnitsNumber", label: "Affordable units number" },
  { key: "propertyNoiT12", label: "Property NOI T12" },
  { key: "noiYear1", label: "NOI Year 1" },
];

function buildDealSummaryForAIReport(merged: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { key, label } of DEAL_SUMMARY_KEYS) {
    const v = merged[key];
    if (v === undefined || v === null) continue;
    out[label] = typeof v === "boolean" ? (v ? "Yes" : "No") : v;
  }
  return out;
}

// ─── Deal parameter control (editable vs read-only) ─────────────────────────

function DealParameterControl({
  label,
  displayValue,
  editable,
  modified,
  isBoolean,
  isEditing,
  inputDefaultValue,
  onStartEdit,
  onBlur,
  onKeyDown,
  warnings,
}: {
  label: string;
  displayValue: string;
  editable: boolean;
  modified: boolean;
  isBoolean?: boolean;
  isEditing: boolean;
  inputDefaultValue: string;
  onStartEdit: () => void;
  onBlur: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => void;
  warnings?: string[];
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </label>
        {editable ? (
          <span title="Editable — change and re-run matchmaking">
            <Pencil size={10} className="text-blue-500 shrink-0" />
          </span>
        ) : (
          <span title="Read-only">
            <Lock size={10} className="text-gray-400 shrink-0" />
          </span>
        )}
      </div>
      {editable && isEditing ? (
        isBoolean ? (
          <select
            className="w-full px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={inputDefaultValue}
            onBlur={(e) => onBlur(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        ) : (
          <input
            type="text"
            className="w-full px-3 py-2 text-sm font-medium text-gray-900 bg-white border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            defaultValue={inputDefaultValue}
            onBlur={(e) => onBlur(e.target.value.trim())}
            onKeyDown={onKeyDown}
            autoFocus
          />
        )
      ) : editable ? (
        <button
          type="button"
          onClick={onStartEdit}
          className={`w-full px-3 py-2 text-sm font-medium text-left rounded-lg border transition-colors cursor-text hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            modified
              ? "bg-amber-50 border-amber-300 text-amber-800"
              : "bg-white border-gray-300 text-gray-900"
          }`}
          title="Click to edit — then re-run matchmaking"
        >
          {displayValue}
        </button>
      ) : (
        <div
          className="px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg border border-gray-200"
          title="From resume — not used for matchmaking inputs"
        >
          {displayValue}
        </div>
      )}
      {warnings && warnings.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              {w}
            </p>
          ))}
        </div>
      )}
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

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, backgroundColor: color }} />
    </div>
  );
}

function PillarRow({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-14 shrink-0">{label}</span>
      <div className="flex-1"><ScoreBar score={score} color={color} /></div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">{score.toFixed(0)}</span>
    </div>
  );
}

type CategoryBState = {
  assetClass: string;
  rateType: "fixed" | "floating" | "any";
  ratePreference: "none" | "competitive" | "target";
  targetRate?: number;
  termBucket: string;
  lenderTypes: string[];
};

function CategoryBPanel({
  categoryB,
  setCategoryB,
  benchmarkSeriesId,
}: {
  categoryB: CategoryBState;
  setCategoryB: React.Dispatch<React.SetStateAction<CategoryBState>>;
  benchmarkSeriesId: string;
}) {
  const [allBenchmarks, setAllBenchmarks] = useState<{
    dgs10: number; dgs7: number; dgs5: number; sofr: number;
  } | null>(null);
  const [spreadBps, setSpreadBps] = useState<number>(200);

  const [rateHistoryPoints, setRateHistoryPoints] = useState<RatePoint[] | null>(null);
  const [rateSignal, setRateSignal] = useState<RateTrendSignal | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/matchmaking/benchmark")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.dgs10 != null) {
          setAllBenchmarks({
            dgs10: data.dgs10,
            dgs7: data.dgs7 ?? data.dgs10,
            dgs5: data.dgs5 ?? data.dgs10,
            sofr: data.sofr ?? data.dgs10,
          });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const { benchmarkRate, benchmarkLabel } = useMemo(() => {
    if (!allBenchmarks) return { benchmarkRate: null, benchmarkLabel: "" };
    if (categoryB.rateType === "floating") {
      return { benchmarkRate: allBenchmarks.sofr, benchmarkLabel: "SOFR" };
    }
    if (categoryB.rateType === "fixed") {
      const tb = categoryB.termBucket ?? "";
      const shortTerms = ["bridge_lte1yr", "short_1_3yr", "medium_3_5yr"];
      const midTerms = ["medium_5_7yr"];
      if (shortTerms.includes(tb)) return { benchmarkRate: allBenchmarks.dgs5, benchmarkLabel: "5Y Treasury" };
      if (midTerms.includes(tb)) return { benchmarkRate: allBenchmarks.dgs7, benchmarkLabel: "7Y Treasury" };
      return { benchmarkRate: allBenchmarks.dgs10, benchmarkLabel: "10Y Treasury" };
    }
    return { benchmarkRate: allBenchmarks.dgs10, benchmarkLabel: "10Y Treasury" };
  }, [allBenchmarks, categoryB.rateType, categoryB.termBucket]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/matchmaking/benchmark/history?series=${benchmarkSeriesId}&days=365`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.points && data?.signal) {
          setRateHistoryPoints(data.points as RatePoint[]);
          setRateSignal(data.signal as RateTrendSignal);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [benchmarkSeriesId]);

  const advisoryTips = useMemo(() => {
    if (!rateSignal) return [];
    const pseudoDeal: DealInput = {
      loanAmount: 0,
      state: "",
      purpose: "Refinance",
      assetClass: categoryB.assetClass,
      rateType: categoryB.rateType,
    };
    return rateTrendAdvisoryText(rateSignal, pseudoDeal);
  }, [rateSignal, categoryB.assetClass, categoryB.rateType]);

  const handleSpreadChange = useCallback(
    (bps: number) => {
      setSpreadBps(bps);
      if (benchmarkRate != null) {
        const computed = benchmarkRate + bps / 100;
        setCategoryB((b) => ({ ...b, targetRate: parseFloat(computed.toFixed(2)) }));
      }
    },
    [benchmarkRate, setCategoryB]
  );

  useEffect(() => {
    if (categoryB.ratePreference === "target" && benchmarkRate != null) {
      const computed = benchmarkRate + spreadBps / 100;
      setCategoryB((b) => ({ ...b, targetRate: parseFloat(computed.toFixed(2)) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryB.ratePreference, benchmarkRate, spreadBps, setCategoryB]);

  return (
    <div className="mt-5 pt-4 border-t border-gray-200 space-y-4">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Matchmaking-only (not saved to resume)
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Asset class</label>
          <select
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            value={categoryB.assetClass}
            onChange={(e) => setCategoryB((b) => ({ ...b, assetClass: e.target.value }))}
          >
            {ASSET_CLASS_VALUES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Loan term</label>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryB((b) => ({ ...b, termBucket: "" }))}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                categoryB.termBucket === ""
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              )}
            >
              No preference
            </button>
            {TERM_BUCKET_VALUES.filter((b) => b !== TERM_BUCKET_NO_DISCRIMINATION).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setCategoryB((prev) => ({ ...prev, termBucket: b }))}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-full border transition-colors",
                  categoryB.termBucket === b
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                )}
                title={TERM_BUCKET_LABELS[b]}
              >
                {TERM_BUCKET_SHORT_LABELS[b]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Lender type</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-wrap">
            <button
              type="button"
              onClick={() => setCategoryB((b) => ({ ...b, lenderTypes: [] }))}
              className={cn(
                "px-3 py-2 text-xs font-medium",
                categoryB.lenderTypes.length === 0
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              All
            </button>
            {LENDER_TYPE_VALUES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() =>
                  setCategoryB((b) => {
                    const cur = b.lenderTypes;
                    const next = cur.includes(t)
                      ? cur.filter((x) => x !== t)
                      : [...cur, t];
                    return { ...b, lenderTypes: next.length === LENDER_TYPE_VALUES.length ? [] : next };
                  })
                }
                className={cn(
                  "px-3 py-2 text-xs font-medium",
                  categoryB.lenderTypes.includes(t)
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                {LENDER_TYPE_LABELS[t as keyof typeof LENDER_TYPE_LABELS]}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Rate type (confidence)</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["any", "fixed", "floating"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCategoryB((b) => ({ ...b, rateType: t }))}
                className={cn(
                  "flex-1 px-2 py-2 text-xs font-medium capitalize",
                  categoryB.rateType === t ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing preference</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden flex-wrap">
            {(
              [
                { v: "none" as const, label: "No Pricing Filter", subtitle: null },
                { v: "competitive" as const, label: "Best Pricing", subtitle: "Lowest spreads rank highest" },
                { v: "target" as const, label: "Target Rate", subtitle: "Match to a specific rate" },
              ] as const
            ).map(({ v, label, subtitle }) => (
              <button
                key={v}
                type="button"
                onClick={() => setCategoryB((b) => ({ ...b, ratePreference: v }))}
                className={cn(
                  "flex-1 min-w-[120px] px-2 py-2 text-center",
                  categoryB.ratePreference === v ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                <span className="text-xs font-medium block">{label}</span>
                {subtitle && (
                  <span className={cn(
                    "text-[10px] block mt-0.5",
                    categoryB.ratePreference === v ? "text-indigo-200" : "text-gray-400"
                  )}>
                    {subtitle}
                  </span>
                )}
              </button>
            ))}
          </div>
          {categoryB.ratePreference === "competitive" && (
            <p className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md px-2.5 py-1.5">
              Lenders are scored by how aggressively they price relative to the market floor. Lower typical spreads over benchmark = higher scores.
            </p>
          )}
        </div>
        {categoryB.ratePreference === "target" && (
          <div className="space-y-3 sm:col-span-2">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Benchmark ({benchmarkLabel || "10Y Treasury"})</span>
                <span className="text-sm font-semibold text-gray-800">
                  {benchmarkRate != null ? `${benchmarkRate.toFixed(2)}%` : "Loading..."}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Spread over benchmark</span>
                  <span className="text-sm font-semibold text-indigo-700">{spreadBps} bps</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={25}
                  value={spreadBps}
                  onChange={(e) => handleSpreadChange(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>0 bps</span>
                  <span>125</span>
                  <span>250</span>
                  <span>375</span>
                  <span>500 bps</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Total rate</span>
                <span className="text-lg font-bold text-indigo-700">
                  {benchmarkRate != null ? `${(benchmarkRate + spreadBps / 100).toFixed(2)}%` : "—"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">or enter directly:</span>
              <input
                type="number"
                step="0.01"
                className="w-28 px-2 py-1 text-xs border border-gray-300 rounded-md"
                placeholder="e.g. 6.5"
                value={categoryB.targetRate ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  const rate = v === "" ? undefined : parseFloat(v);
                  setCategoryB((b) => ({ ...b, targetRate: rate }));
                  if (rate != null && benchmarkRate != null) {
                    setSpreadBps(Math.max(0, Math.min(500, Math.round((rate - benchmarkRate) * 100 / 25) * 25)));
                  }
                }}
              />
              <span className="text-[11px] text-gray-400">%</span>
            </div>
          </div>
        )}
      </div>

      {/* Rate Intelligence: chart + advisory */}
      {rateSignal && rateHistoryPoints && rateHistoryPoints.length > 30 && (
        <div className="mt-5 pt-4 border-t border-gray-200 space-y-3">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Market rate environment
          </div>
          <RateEnvironmentPanel points={rateHistoryPoints} signal={rateSignal} variant="embedded" />
          {advisoryTips.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 space-y-1">
              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                Market Advisory
              </p>
              {advisoryTips.map((tip, i) => (
                <p key={i} className="text-xs text-blue-800 leading-snug flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                  <span>{tip}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildCapitalizeRunBody(
  merged: Record<string, unknown>,
  categoryB: CategoryBState,
  contentOverrides?: Record<string, unknown>
): Record<string, unknown> {
  const loan = Number(merged.loanAmountRequested);
  const state = String(merged.propertyAddressState ?? "").trim().toUpperCase();
  const projectPhase =
    merged.projectPhase != null && merged.projectPhase !== "" ? String(merged.projectPhase) : "";
  const body: Record<string, unknown> = {
    loanAmount: loan,
    state,
    project_phase: projectPhase,
    asset_class: categoryB.assetClass,
    rate_type: categoryB.rateType,
    rate_preference: categoryB.ratePreference,
  };
  if (categoryB.termBucket) {
    body.term_bucket = categoryB.termBucket;
  }
  if (categoryB.lenderTypes.length > 0) {
    body.lender_types = categoryB.lenderTypes;
  }
  if (
    categoryB.ratePreference === "target" &&
    categoryB.targetRate != null &&
    Number.isFinite(categoryB.targetRate)
  ) {
    body.target_rate = categoryB.targetRate;
  }
  if (contentOverrides && Object.keys(contentOverrides).length > 0) {
    body.content_overrides = contentOverrides;
  }
  return body;
}

function buildCapitalizeDealInput(
  merged: Record<string, unknown>,
  categoryB: CategoryBState
): DealInput | null {
  const loan = Number(merged.loanAmountRequested);
  const state = String(merged.propertyAddressState ?? "").trim().toUpperCase();
  if (!Number.isFinite(loan) || loan <= 0) return null;
  if (!STATE_CODES.includes(state as (typeof STATE_CODES)[number])) return null;
  const { purpose, eligiblePurposes } = mapProjectPhaseToPurposes(
    merged.projectPhase != null ? String(merged.projectPhase) : undefined
  );
  if (!ASSET_CLASS_VALUES.includes(categoryB.assetClass as (typeof ASSET_CLASS_VALUES)[number])) return null;
  return {
    loanAmount: loan,
    state,
    purpose,
    eligiblePurposes: [...eligiblePurposes],
    assetClass: categoryB.assetClass,
    rateType: categoryB.rateType,
    ratePreference:
      categoryB.ratePreference === "competitive"
        ? "competitive"
        : categoryB.ratePreference === "target"
          ? "target"
          : "none",
    targetRate:
      categoryB.ratePreference === "target" &&
      categoryB.targetRate != null &&
      Number.isFinite(categoryB.targetRate)
        ? categoryB.targetRate
        : undefined,
    termBucket: categoryB.termBucket || undefined,
    lenderTypes: categoryB.lenderTypes.length > 0 ? categoryB.lenderTypes : undefined,
  };
}

// ─── Match card — summary row that opens LenderDetailModal on click ──

function MatchCard({
  score,
  advisorRateType,
  onSelect,
  canAddToWishlist,
  onAddToWishlist,
  wishlistAdded,
  wishlistLoading,
}: {
  score: MatchScore;
  advisorRateType: "fixed" | "floating" | "any";
  onSelect: () => void;
  canAddToWishlist: boolean;
  onAddToWishlist: (score: MatchScore) => void;
  wishlistAdded: Set<string>;
  wishlistLoading: string | null;
}) {
  const displayName = score.lender_name || score.lender_lei || "Unknown";
  const pillar = score.pillar_scores || {};
  const marketFit = (pillar.market_fit ?? pillar.Market ?? 0) * 100;
  const capitalFit = (pillar.capital_fit ?? pillar.Capital ?? 0) * 100;
  const productFit = (pillar.product_fit ?? pillar.Product ?? 0) * 100;
  const hmdaPillarSum = marketFit + capitalFit + productFit;
  const dimPreview = (score.variable_scores || [])
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <div
        onClick={onSelect}
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-400 w-5 text-right shrink-0">
            #{score.rank}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {score.lender_logo_url ? (
                <img
                  src={score.lender_logo_url}
                  alt=""
                  className="h-8 w-8 rounded object-contain border border-gray-100 bg-white shrink-0"
                  loading="lazy"
                />
              ) : (
                <Building2 size={16} className="text-gray-400 shrink-0" />
              )}
              <span className="text-base font-semibold text-gray-900 truncate">{displayName}</span>
            </div>
            <div className="mt-1.5 space-y-1">
              {hmdaPillarSum > 0 ? (
                <>
                  <PillarRow label="Market" score={marketFit} />
                  <PillarRow label="Capital" score={capitalFit} />
                  <PillarRow label="Product" score={productFit} />
                </>
              ) : (
                dimPreview.map((v) => (
                  <PillarRow key={v.key} label={v.name} score={v.score * 100} />
                ))
              )}
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2 self-start">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); if (canAddToWishlist) onAddToWishlist(score); }}
              disabled={!canAddToWishlist || wishlistAdded.has(score.lender_lei) || wishlistLoading === score.lender_lei}
              title={!canAddToWishlist ? "Save the matchmaking run first to add lenders to your wishlist" : wishlistAdded.has(score.lender_lei) ? "Already in wishlist" : "Add to wishlist"}
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
        </div>
        {advisorRateType !== "any" && score.capitalize_meta && (
          <p className="text-xs text-slate-500 mt-1.5 ml-8">
            Rate-type confidence: {(score.capitalize_meta.rateTypeFactor * 100).toFixed(0)}% of blend
            {score.capitalize_meta.lenderType ? ` · ${score.capitalize_meta.lenderType}` : ""}
          </p>
        )}
        {score.overall_narrative && (
          <p className="text-sm text-gray-500 italic leading-relaxed mt-2 ml-8">
            {score.overall_narrative}
          </p>
        )}
      </div>
    </div>
  );
}

// Breakpoint below which we show Parameters | Results toggle instead of two columns (e.g. when chat is expanded on MacBooks).
const NARROW_LAYOUT_BREAKPOINT = 900;

// ─── Main component ─────────────────────────────────────────────────────────

interface LenderMatchTabProps {
  projectId: string;
}

export const LenderMatchTab: React.FC<LenderMatchTabProps> = ({ projectId }) => {
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState<MatchScore | null>(null);

  // Narrow layout: when container width < NARROW_LAYOUT_BREAKPOINT, show Parameters | Results toggle and one panel at a time.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [narrowView, setNarrowView] = useState<"parameters" | "results">("parameters");

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const isNarrow = containerWidth !== null && containerWidth < NARROW_LAYOUT_BREAKPOINT;

  // Real version data from Supabase
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(true);

  // Inline label editing
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [isSavingLabel, setIsSavingLabel] = useState(false);

  // Editable field overrides
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, string>>({});
  const [categoryB, setCategoryB] = useState<CategoryBState>({
    assetClass: ASSET_CLASS_VALUES[0],
    rateType: "any",
    ratePreference: "none",
    termBucket: "",
    lenderTypes: [],
  });
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [fieldWarnings, setFieldWarnings] = useState<Record<string, string[]>>({});
  const sanityCheckerRef = useRef<InstanceType<typeof import("@/lib/debouncedSanityCheck").DebouncedSanityChecker> | null>(null);

  // Wishlist: lenders already in wishlist (LEI set), and loading state per LEI
  const [wishlistLeis, setWishlistLeis] = useState<Set<string>>(new Set());
  const [wishlistLoading, setWishlistLoading] = useState<string | null>(null);

  // Save run modal: name input instead of window.prompt
  const [saveRunModalOpen, setSaveRunModalOpen] = useState(false);
  const [saveRunNameDraft, setSaveRunNameDraft] = useState("");
  // Alerts (replacing window.alert)
  const [validationAlertOpen, setValidationAlertOpen] = useState(false);
  const [wishlistAlertOpen, setWishlistAlertOpen] = useState(false);
  const [wishlistAlertMessage, setWishlistAlertMessage] = useState("");
  const [isRecheckingSanity, setIsRecheckingSanity] = useState(false);

  useEffect(() => {
    import("@/lib/debouncedSanityCheck").then(({ DebouncedSanityChecker }) => {
      sanityCheckerRef.current = new DebouncedSanityChecker({
        resumeType: "project",
        debounceMs: 800,
        batchDebounceMs: 1500,
      });
    });
    return () => {
      sanityCheckerRef.current?.cancelAll();
    };
  }, []);

  // Rehydrate field overrides from draft when returning to the tab (e.g. after switching to Underwriting).
  useEffect(() => {
    if (!projectId) return;
    const draft = getMatchmakingDraft(projectId);
    if (draft?.field_overrides && Object.keys(draft.field_overrides).length > 0) {
      const filtered = Object.fromEntries(
        Object.entries(draft.field_overrides).filter(([k]) => EDITABLE_KEYS.has(k))
      );
      setFieldOverrides(filtered);
    }
  }, [projectId]);

  const activeProject = useProjectStore((s) => s.activeProject);
  const project = activeProject?.id === projectId ? activeProject : null;

  console.log(`[LenderMatchTab] render: projectId=${projectId}, selectedVersionId=${selectedVersionId}`);

  const contentOverridesForRun = useMemo(
    () => (Object.keys(fieldOverrides).length > 0 ? normalizeContentUpdates(fieldOverrides) : undefined),
    [fieldOverrides]
  );
  const {
    isRunning: matchRunning,
    isLoading: matchLoading,
    matchScores,
    totalLenders: matchedLenderCount,
    totalEligible,
    topMatchName,
    topMatchScore,
    lastRunAt,
    error: matchError,
    runMatchmaking,
    visualizationData,
    draftPayload,
    lastMatchRunId,
    useLocalCapitalize,
  } = useMatchmaking(projectId, selectedVersionId ?? null, contentOverridesForRun);

  const benchmarkSeriesId = useMemo(
    () => benchmarkSeriesIdFromRateAndTerm(categoryB.rateType, categoryB.termBucket || undefined),
    [categoryB.rateType, categoryB.termBucket],
  );

  const mergedForCapitalize = useMemo(
    () => getMergedContext(project, fieldOverrides),
    [project, fieldOverrides]
  );
  const capitalizeDealForAI = useMemo(
    () => (useLocalCapitalize ? buildCapitalizeDealInput(mergedForCapitalize, categoryB) : null),
    [useLocalCapitalize, mergedForCapitalize, categoryB]
  );

  const runLocalCapitalizeMatch = useCallback(() => {
    runMatchmaking(
      fieldOverrides,
      buildCapitalizeRunBody(mergedForCapitalize, categoryB, contentOverridesForRun)
    );
  }, [runMatchmaking, fieldOverrides, mergedForCapitalize, categoryB, contentOverridesForRun]);

  const capitalizeRunBlocked =
    useLocalCapitalize &&
    categoryB.ratePreference === "target" &&
    (categoryB.targetRate == null || !Number.isFinite(categoryB.targetRate));

  const hasResults = matchScores.length > 0 || !!visualizationData;
  const hasOverrides = Object.keys(fieldOverrides).length > 0;
  const hasSanityWarnings = Object.values(fieldWarnings).some((w) => w.length > 0);

  // Resolve saved run ids for wishlist (run must be saved to add to wishlist)
  const draft = getMatchmakingDraft(projectId);
  const savedMatchRunId = lastMatchRunId ?? draft?.match_run_id ?? null;
  const savedProjectResumeId = selectedVersionId ?? draft?.project_resume_id ?? null;
  const canAddToWishlist = Boolean(savedMatchRunId && savedProjectResumeId && hasResults);

  // Load existing wishlist to show "In wishlist" for already-added lenders
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = getBackendUrl();
      const res = await fetch(`${base}/api/v1/projects/${encodeURIComponent(projectId)}/wishlist`, {
        headers: { ...(token && { Authorization: `Bearer ${token}` }) },
      });
      const list = res.ok ? await res.json() : [];
      if (!cancelled && Array.isArray(list)) {
        setWishlistLeis(new Set(list.map((e: { lender_lei?: string }) => e.lender_lei).filter(Boolean) as string[]));
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const handleAddToWishlist = useCallback(
    async (score: MatchScore) => {
      if (!savedMatchRunId || !savedProjectResumeId) return;
      setWishlistLoading(score.lender_lei);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const base = getBackendUrl();
        const res = await fetch(`${base}/api/v1/projects/${encodeURIComponent(projectId)}/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
          body: JSON.stringify({
            lender_lei: score.lender_lei,
            lender_name: score.lender_name ?? null,
            match_run_id: savedMatchRunId,
            project_resume_id: savedProjectResumeId,
          }),
        });
        if (!res.ok) throw new Error("Failed to add to wishlist");
        setWishlistLeis((prev) => new Set(prev).add(score.lender_lei));
      } catch (e) {
        console.error("[LenderMatchTab] add to wishlist failed:", e);
        setWishlistAlertMessage("Failed to add lender to wishlist. Save the matchmaking run first.");
        setWishlistAlertOpen(true);
      } finally {
        setWishlistLoading(null);
      }
    },
    [projectId, savedMatchRunId, savedProjectResumeId]
  );

  const handleBlurWithSanity = useCallback(
    (key: string, val: string) => {
      const rawBase = getFieldValue(project, key);
      if (val === String(rawBase ?? "")) {
        setEditingFieldKey(null);
        return;
      }
      const nextOverrides = { ...fieldOverrides, [key]: val };
      setFieldOverrides(nextOverrides);
      setEditingFieldKey(null);
      if (useLocalCapitalize) {
        return;
      }
      const merged = getMergedContext(project, nextOverrides);
      const parsedValue =
        key === "affordableHousing"
          ? /^(1|true|yes)$/i.test(val.trim())
          : NUMERIC_KEYS.has(key)
            ? parseFloat(val.replace(/[,$%]/g, "").trim())
            : val.trim();
      sanityCheckerRef.current?.scheduleCheck(
        key,
        parsedValue,
        merged,
        {},
        (fieldId, warnings) => setFieldWarnings((w) => ({ ...w, [fieldId]: warnings })),
        (fieldId, err) => console.error(`[LenderMatchTab] sanity check failed for ${fieldId}:`, err)
      );
      const deps = FIELD_DEPENDENCIES[key];
      if (deps?.length && sanityCheckerRef.current) {
        const toCheck = deps
          .filter((dep) => EDITABLE_KEYS.has(dep))
          .map((depId) => ({
            fieldId: depId,
            value: merged[depId],
            context: merged,
            existingFieldData: {},
          }))
          .filter((f) => f.value !== undefined && f.value !== null && f.value !== "");
        if (toCheck.length > 0) {
          sanityCheckerRef.current.batchCheck(
            toCheck,
            (fid, warnings) => setFieldWarnings((w) => ({ ...w, [fid]: warnings })),
            (fid, err) => console.error(`[LenderMatchTab] batch sanity failed for ${fid}:`, err)
          );
        }
      }
    },
    [project, fieldOverrides, useLocalCapitalize]
  );

  const handleRerunSanityCheckAll = useCallback(async () => {
    if (useLocalCapitalize) {
      setFieldWarnings({});
      return;
    }
    if (!project || !sanityCheckerRef.current) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const merged = getMergedContext(project, fieldOverrides);
    const fieldsToCheck: Array<{
      fieldId: string;
      value: unknown;
      context: Record<string, unknown>;
      existingFieldData: Record<string, unknown>;
      authToken?: string;
    }> = [];
    for (const fieldId of EDITABLE_KEYS) {
      const raw = merged[fieldId];
      if (raw === undefined || raw === null || raw === "") continue;
      const value =
        fieldId === "affordableHousing"
          ? /^(1|true|yes)$/i.test(String(raw).trim())
          : NUMERIC_KEYS.has(fieldId)
            ? parseFloat(String(raw).replace(/[,$%]/g, "").trim())
            : String(raw).trim();
      if (fieldId === "affordableHousing" || (typeof value !== "number" && value !== "") || Number.isFinite(value)) {
        fieldsToCheck.push({
          fieldId,
          value,
          context: merged,
          existingFieldData: {},
          authToken: token ?? undefined,
        });
      }
    }
    if (fieldsToCheck.length === 0) {
      setFieldWarnings({});
      return;
    }
    setIsRecheckingSanity(true);
    try {
      const nextWarnings: Record<string, string[]> = {};
      await sanityCheckerRef.current.batchCheck(
        fieldsToCheck,
        (fieldId, warnings) => {
          nextWarnings[fieldId] = warnings;
        },
        (fieldId, err) => console.error(`[LenderMatchTab] re-run sanity failed for ${fieldId}:`, err)
      );
      setFieldWarnings((prev) => {
        const out = { ...prev };
        for (const key of EDITABLE_KEYS) {
          out[key] = nextWarnings[key] ?? [];
        }
        return out;
      });
    } finally {
      setIsRecheckingSanity(false);
    }
  }, [project, fieldOverrides, useLocalCapitalize]);

  const dealSummaryForAI = useMemo(() => {
    const merged = getMergedContext(project, fieldOverrides);
    return buildDealSummaryForAIReport(merged);
  }, [project, fieldOverrides]);

  console.log(`[LenderMatchTab] matchScores.length=${matchScores.length}, hasResults=${hasResults}, matchLoading=${matchLoading}, visualizationData=${!!visualizationData}`);

  // Fetch real version data. If selectLatest is true, auto-select the newest version.
  const fetchVersions = useCallback(async (selectLatest = false) => {
    if (!projectId) {
      setVersions([]);
      setVersionsLoading(false);
      return;
    }
    setVersionsLoading(true);
    try {
      const { data, error } = await supabase
        .from("project_resumes")
        .select("id, version_number, label, created_at")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      console.log(`[LenderMatchTab] fetchVersions: got ${data?.length ?? 0} versions, selectLatest=${selectLatest}, current selectedVersionId=${selectedVersionId}`);
      setVersions(data || []);
      if (data && data.length > 0 && (!selectedVersionId || selectLatest)) {
        console.log(`[LenderMatchTab] fetchVersions: setting selectedVersionId to latest: ${data[0].id}`);
        setSelectedVersionId(data[0].id);
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof (err as { message?: string })?.message === "string"
            ? (err as { message: string }).message
            : String(err);
      const code = (err as { code?: string })?.code;
      console.error("[LenderMatchTab] Failed to fetch versions:", message, code ? `(${code})` : "");
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, [projectId, selectedVersionId]);

  useEffect(() => { fetchVersions(); }, [fetchVersions]);

  const currentVersion = useMemo(
    () => versions.find((v) => v.id === selectedVersionId) ?? versions[0] ?? null,
    [versions, selectedVersionId]
  );

  const versionDisplayLabel = useMemo(() => {
    if (!currentVersion) return "No versions";
    const base = `v${currentVersion.version_number ?? "—"}`;
    return currentVersion.label ? `${base} — ${currentVersion.label}` : base;
  }, [currentVersion]);

  // Save label
  const handleSaveLabel = useCallback(async () => {
    if (!currentVersion) return;
    const trimmed = labelDraft.trim();
    setIsSavingLabel(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = getBackendUrl();
      const res = await fetch(
        `${base}/api/v1/project-resume/${encodeURIComponent(currentVersion.id)}/label`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
          body: JSON.stringify({ label: trimmed }),
        }
      );
      if (!res.ok) throw new Error("Failed to update label");
      setVersions((prev) =>
        prev.map((v) => (v.id === currentVersion.id ? { ...v, label: trimmed || null } : v))
      );
    } catch (err) {
      console.error("[LenderMatchTab] label save failed:", err);
    } finally {
      setIsSavingLabel(false);
      setEditingLabel(false);
    }
  }, [currentVersion, labelDraft]);

  // Save version snapshot via backend (with optional content_updates from Lender Matching edits).
  // Then, if there is a draft match run, persist it for this version via save-run.
  // Call with the name from the Save Run modal (no prompt).
  const handleSaveVersion = useCallback(async (name: string) => {
    const trimmedLabel = name.trim();
    if (!trimmedLabel) return;

    setIsSavingVersion(true);
    setSaveRunModalOpen(false);
    setSaveRunNameDraft("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const base = getBackendUrl();
      const content_updates = hasOverrides ? normalizeContentUpdates(fieldOverrides) : undefined;
      const res = await fetch(`${base}/api/v1/project-resume/save-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify({ projectId, ...(content_updates && Object.keys(content_updates).length > 0 && { content_updates }) }),
      });
      if (!res.ok) throw new Error("Failed to save version");
      const result = await res.json();
      setFieldOverrides({});

      const newVersionId: string | undefined = result.versionId;
      if (newVersionId && trimmedLabel) {
        try {
          await fetch(
            `${base}/api/v1/project-resume/${encodeURIComponent(newVersionId)}/label`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
              body: JSON.stringify({ label: trimmedLabel }),
            }
          );
        } catch {
          // label save is best-effort; version was already created
        }
      }

      // Persist current draft match run for this new version (one run per resume version)
      if (draftPayload && newVersionId) {
        try {
          const saveRunRes = await fetch(`${base}/api/v1/matchmaking/save-run`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
            body: JSON.stringify({
              project_id: projectId,
              project_resume_id: newVersionId,
              run_id: draftPayload.run_id,
              config: draftPayload.config,
              hmda_source: draftPayload.hmda_source,
              total_lenders: draftPayload.total_lenders,
              visualization_data: draftPayload.visualization_data,
            }),
          });
          if (saveRunRes.ok) {
            const saveRunData = await saveRunRes.json();
            const matchRunId = saveRunData?.id;
            if (matchRunId && draftPayload) {
              setMatchmakingDraft(projectId, {
                ...draftPayload,
                match_run_id: matchRunId,
                project_resume_id: newVersionId,
              });
            }
          }
        } catch (saveRunErr) {
          console.error("[LenderMatchTab] save-run failed:", saveRunErr);
        }
      }

      await fetchVersions(true);
    } catch (err) {
      console.error("[LenderMatchTab] save version failed:", err);
    } finally {
      setIsSavingVersion(false);
    }
  }, [projectId, fetchVersions, fieldOverrides, hasOverrides, draftPayload]);

  const runAndShowResults = () => {
    if (useLocalCapitalize) {
      runLocalCapitalizeMatch();
    } else {
      runMatchmaking(fieldOverrides);
    }
    setNarrowView("results");
  };

  const openSaveRunModal = useCallback(() => {
    if (!useLocalCapitalize && hasSanityWarnings) {
      setValidationAlertOpen(true);
      return;
    }
    setSaveRunNameDraft("");
    setSaveRunModalOpen(true);
  }, [hasSanityWarnings, useLocalCapitalize]);

  const submitSaveRunModal = useCallback(() => {
    const trimmed = saveRunNameDraft.trim();
    if (!trimmed) return;
    handleSaveVersion(trimmed);
  }, [saveRunNameDraft, handleSaveVersion]);

  return (
    <div ref={containerRef} className="w-full max-w-[1600px] mx-auto">
      {isNarrow ? (
        <>
          <div className="flex bg-gray-100 p-1 rounded-lg shadow-inner border border-gray-200 mb-4 w-full max-w-md">
            <button
              type="button"
              onClick={() => setNarrowView("parameters")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all",
                narrowView === "parameters"
                  ? "bg-white text-blue-600 shadow-sm border border-gray-200"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/60"
              )}
            >
              <Star size={16} />
              Parameters
            </button>
            <button
              type="button"
              onClick={() => setNarrowView("results")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all",
                narrowView === "results"
                  ? "bg-white text-blue-600 shadow-sm border border-gray-200"
                  : "text-gray-600 hover:text-gray-800 hover:bg-white/60"
              )}
            >
              <Landmark size={16} />
              Results
            </button>
          </div>

          {narrowView === "parameters" ? (
            <div className="space-y-4">
              {/* Version card */}
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
                          {currentVersion ? `v${currentVersion.version_number ?? "—"}` : "—"}
                        </span>
                        <ChevronDown size={14} className="text-gray-400" />
                      </button>
                      {versionDropdownOpen && (
                        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                          <div className="p-3 border-b border-gray-100">
                            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Version History</p>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {versionsLoading ? (
                              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>
                            ) : versions.length === 0 ? (
                              <p className="p-3 text-sm text-gray-500">No versions found</p>
                            ) : (
                              versions.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between ${v.id === selectedVersionId ? "bg-blue-50" : ""}`}
                                  onClick={() => {
                                    setSelectedVersionId(v.id);
                                    setVersionDropdownOpen(false);
                                    setFieldOverrides({});
                                  }}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-base font-medium text-gray-800">v{v.version_number ?? "—"}</span>
                                      {v.id === versions[0]?.id && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">LATEST</span>
                                      )}
                                    </div>
                                    {v.label && <p className="text-sm text-blue-600 mt-0.5">{v.label}</p>}
                                    <p className="text-xs text-gray-400">{formatDate(v.created_at)}</p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Tag size={14} className="text-gray-400" />
                      {editingLabel ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            className="text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                            value={labelDraft}
                            onChange={(e) => setLabelDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveLabel();
                              else if (e.key === "Escape") setEditingLabel(false);
                            }}
                            autoFocus
                            placeholder="e.g. Conservative 65% LTV"
                            disabled={isSavingLabel}
                          />
                          <button onClick={() => handleSaveLabel()} disabled={isSavingLabel} className="p-1 text-green-600 hover:text-green-700">
                            {isSavingLabel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </button>
                          <button onClick={() => setEditingLabel(false)} className="p-1 text-gray-400 hover:text-gray-600">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingLabel(true); setLabelDraft(currentVersion?.label || ""); }}
                          className="flex items-center gap-1 group"
                        >
                          <span className="text-base text-gray-600 italic">
                            {currentVersion?.label ? `\u201C${currentVersion.label}\u201D` : "Add label\u2026"}
                          </span>
                          <Pencil size={12} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasOverrides && (
                      <button
                        type="button"
                        onClick={() => setFieldOverrides({})}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <RotateCcw size={14} />
                        Discard
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={openSaveRunModal}
                      disabled={isSavingVersion}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {isSavingVersion ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save run
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Saves this resume version (including any parameter overrides) and the current matchmaking run under a name you choose. Switch versions later from the dropdown.
                </p>
              </div>
              {/* Matchmaking parameters */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={16} className="text-blue-600" />
                  <h3 className="text-base font-semibold text-gray-800">Matchmaking parameters</h3>
                  {hasOverrides && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      {Object.keys(fieldOverrides).length} changed
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Adjust these deal parameters to explore scenarios. Re-run matchmaking to see how lender matches change.
                </p>
                {useLocalCapitalize && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-3">
                    Capitalize uses loan amount, state, and project phase from the project resume (locked on this tab).
                    Other fields are context; asset class and rate options are set in Matchmaking-only below.
                  </p>
                )}
                {!useLocalCapitalize && (
                  <div className="flex justify-end mb-4">
                    <button
                      type="button"
                      onClick={handleRerunSanityCheckAll}
                      disabled={!project || isRecheckingSanity}
                      title="Re-run validation on all deal parameters (e.g. if a warning did not clear after editing another value)"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRecheckingSanity ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      Re-check all values
                    </button>
                  </div>
                )}
                {!project ? (
                  <p className="text-sm text-gray-500">No project data. Open a project to see deal terms.</p>
                ) : (
                  <div className="space-y-5">
                    {KEY_DEAL_TERMS_SECTIONS.map((section) => (
                      <div key={section.label}>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          {section.label}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {section.keys.map(({ key, label }) => {
                            const rawValue = getFieldValue(project, key);
                            const overrideValue = EDITABLE_KEYS.has(key) ? fieldOverrides[key] : undefined;
                            const displayValue =
                              overrideValue !== undefined
                                ? key === "affordableHousing"
                                  ? /^(1|true|yes)$/i.test(overrideValue) ? "Yes" : "No"
                                  : overrideValue
                                : formatDealValue(rawValue, key);
                            const isEditable = EDITABLE_KEYS.has(key);
                            const isModified = overrideValue !== undefined;
                            const isCurrentlyEditing = editingFieldKey === key;
                            const isBoolean = key === "affordableHousing";
                            const inputDefault = overrideValue !== undefined
                              ? overrideValue
                              : isBoolean
                                ? (rawValue === true || rawValue === "true" || rawValue === "1" ? "yes" : "no")
                                : String(rawValue ?? "");
                            return (
                              <DealParameterControl
                                key={key}
                                label={label}
                                displayValue={displayValue}
                                editable={isEditable}
                                modified={isModified}
                                isBoolean={isBoolean}
                                isEditing={isCurrentlyEditing}
                                inputDefaultValue={inputDefault}
                                onStartEdit={() => setEditingFieldKey(key)}
                                onBlur={(val) => handleBlurWithSanity(key, val)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement | HTMLSelectElement).blur();
                                  if (e.key === "Escape") setEditingFieldKey(null);
                                }}
                                warnings={fieldWarnings[key]}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {useLocalCapitalize && (
                      <CategoryBPanel
                        categoryB={categoryB}
                        setCategoryB={setCategoryB}
                        benchmarkSeriesId={benchmarkSeriesId}
                      />
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={runAndShowResults}
                  disabled={
                    matchRunning || capitalizeRunBlocked || (!useLocalCapitalize && hasSanityWarnings)
                  }
                  title={
                    capitalizeRunBlocked
                      ? "Enter a target rate (%) when using Target rate preference."
                      : !useLocalCapitalize && hasSanityWarnings
                        ? "Fix validation warnings on deal parameters before running."
                        : undefined
                  }
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {matchRunning ? (
                    <><Loader2 size={16} className="animate-spin" />Running...</>
                  ) : hasResults ? (
                    <><RefreshCw size={16} />Re-run Matchmaking</>
                  ) : (
                    <><Zap size={16} />Run Matchmaking</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <Landmark size={16} className="text-blue-600" />
                      Lender Matches
                    </h3>
                    {hasResults && lastRunAt && (
                      <p className="text-xs text-gray-400 mt-0.5">Last run: {formatDate(lastRunAt)}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      useLocalCapitalize ? runLocalCapitalizeMatch() : runMatchmaking(fieldOverrides)
                    }
                    disabled={
                      matchRunning || capitalizeRunBlocked || (!useLocalCapitalize && hasSanityWarnings)
                    }
                    title={
                      capitalizeRunBlocked
                        ? "Enter a target rate (%) when using Target rate preference."
                        : !useLocalCapitalize && hasSanityWarnings
                          ? "Fix validation warnings on deal parameters before running."
                          : undefined
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {matchRunning ? (
                      <><Loader2 size={16} className="animate-spin" />Running...</>
                    ) : hasResults ? (
                      <><RefreshCw size={16} />Re-run Matchmaking</>
                    ) : (
                      <><Zap size={16} />Run Matchmaking</>
                    )}
                  </button>
                </div>
                {!useLocalCapitalize && hasSanityWarnings && (
                  <p className="text-xs text-amber-600 mt-1">Fix validation warnings on deal parameters before running or saving.</p>
                )}
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
                      {useLocalCapitalize && totalEligible != null
                        ? `${totalEligible} eligible · ${matchedLenderCount} in results`
                        : `${matchedLenderCount} lenders scored`}
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
                    <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
                    <h4 className="text-base font-semibold text-gray-800">Analyzing Lenders...</h4>
                    <p className="text-sm text-gray-500 text-center mt-2">
                      {useLocalCapitalize
                        ? "Running the Capitalize parquet matchmaking engine."
                        : "Matching your project parameters against the backend matchmaking engine."}
                    </p>
                  </div>
                ) : !hasResults ? (
                  <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200 shadow-sm opacity-80">
                    <Target size={48} className="text-gray-300 mb-4" />
                    <h4 className="text-base font-semibold text-gray-800">Ready to Match</h4>
                    <p className="text-sm text-gray-500 text-center mt-2">
                      Run matchmaking to see compatible lenders scored against your key deal terms.
                    </p>
                  </div>
                ) : (
                  matchScores.map((score) => (
                    <MatchCard
                      key={score.id}
                      score={score}
                      advisorRateType={categoryB.rateType}
                      onSelect={() => setSelectedScore(score)}
                      canAddToWishlist={canAddToWishlist}
                      onAddToWishlist={handleAddToWishlist}
                      wishlistAdded={wishlistLeis}
                      wishlistLoading={wishlistLoading}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex gap-6 items-start">
      {/* ──────── LEFT PANEL: Version + Key Deal Terms ──────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Version card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Version selector dropdown */}
              <div className="relative">
                <button
                  onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <History size={16} className="text-gray-500" />
                  <span className="text-base font-medium text-gray-700">
                    {currentVersion ? `v${currentVersion.version_number ?? "—"}` : "—"}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {versionDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Version History</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {versionsLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>
                      ) : versions.length === 0 ? (
                        <p className="p-3 text-sm text-gray-500">No versions found</p>
                      ) : (
                        versions.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                              v.id === selectedVersionId ? "bg-blue-50" : ""
                            }`}
                            onClick={() => {
                              setSelectedVersionId(v.id);
                              setVersionDropdownOpen(false);
                              setFieldOverrides({});
                            }}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-medium text-gray-800">v{v.version_number ?? "—"}</span>
                                {v.id === versions[0]?.id && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">LATEST</span>
                                )}
                              </div>
                              {v.label && <p className="text-sm text-blue-600 mt-0.5">{v.label}</p>}
                              <p className="text-xs text-gray-400">{formatDate(v.created_at)}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Label display / inline edit */}
              <div className="flex items-center gap-1.5">
                <Tag size={14} className="text-gray-400" />
                {editingLabel ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      className="text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveLabel();
                        else if (e.key === "Escape") setEditingLabel(false);
                      }}
                      autoFocus
                      placeholder="e.g. Conservative 65% LTV"
                      disabled={isSavingLabel}
                    />
                    <button onClick={handleSaveLabel} disabled={isSavingLabel} className="p-1 text-green-600 hover:text-green-700">
                      {isSavingLabel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => setEditingLabel(false)} className="p-1 text-gray-400 hover:text-gray-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingLabel(true);
                      setLabelDraft(currentVersion?.label || "");
                    }}
                    className="flex items-center gap-1 group"
                  >
                    <span className="text-base text-gray-600 italic">
                      {currentVersion?.label ? `\u201C${currentVersion.label}\u201D` : "Add label\u2026"}
                    </span>
                    <Pencil size={12} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasOverrides && (
                <button
                  type="button"
                  onClick={() => setFieldOverrides({})}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw size={14} />
                  Discard
                </button>
              )}
              <button
                type="button"
                onClick={openSaveRunModal}
                disabled={isSavingVersion}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSavingVersion ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save run
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Saves this resume version (including any parameter overrides) and the current matchmaking run under a name you choose. Switch versions later from the dropdown.
          </p>
        </div>

        {/* Matchmaking parameters — controls-style UI (editable vs read-only) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star size={16} className="text-blue-600" />
            <h3 className="text-base font-semibold text-gray-800">Matchmaking parameters</h3>
            {hasOverrides && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                {Object.keys(fieldOverrides).length} changed
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-2">
            Adjust these deal parameters to explore scenarios. Re-run matchmaking to see how lender matches change.
          </p>
          {useLocalCapitalize && (
            <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-3">
              Capitalize uses loan amount, state, and project phase from the project resume (locked on this tab).
              Other fields are context; asset class and rate options are set in Matchmaking-only below.
            </p>
          )}
          {!useLocalCapitalize && (
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={handleRerunSanityCheckAll}
                disabled={!project || isRecheckingSanity}
                title="Re-run validation on all deal parameters (e.g. if a warning did not clear after editing another value)"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRecheckingSanity ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Re-check all values
              </button>
            </div>
          )}
          {!project ? (
            <p className="text-sm text-gray-500">No project data. Open a project to see deal terms.</p>
          ) : (
            <div className="space-y-5">
              {KEY_DEAL_TERMS_SECTIONS.map((section) => (
                <div key={section.label}>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {section.label}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {section.keys.map(({ key, label }) => {
                      const rawValue = getFieldValue(project, key);
                      const overrideValue = EDITABLE_KEYS.has(key) ? fieldOverrides[key] : undefined;
                      const displayValue =
                        overrideValue !== undefined
                          ? key === "affordableHousing"
                            ? /^(1|true|yes)$/i.test(overrideValue) ? "Yes" : "No"
                            : overrideValue
                          : formatDealValue(rawValue, key);
                      const isEditable = EDITABLE_KEYS.has(key);
                      const isModified = overrideValue !== undefined;
                      const isCurrentlyEditing = editingFieldKey === key;
                      const isBoolean = key === "affordableHousing";
                      const inputDefault = overrideValue !== undefined
                        ? overrideValue
                        : isBoolean
                          ? (rawValue === true || rawValue === "true" || rawValue === "1" ? "yes" : "no")
                          : String(rawValue ?? "");

                      return (
                        <DealParameterControl
                          key={key}
                          label={label}
                          displayValue={displayValue}
                          editable={isEditable}
                          modified={isModified}
                          isBoolean={isBoolean}
                          isEditing={isCurrentlyEditing}
                          inputDefaultValue={inputDefault}
                          onStartEdit={() => setEditingFieldKey(key)}
                          onBlur={(val) => handleBlurWithSanity(key, val)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement | HTMLSelectElement).blur();
                            if (e.key === "Escape") setEditingFieldKey(null);
                          }}
                          warnings={fieldWarnings[key]}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              {useLocalCapitalize && (
                <CategoryBPanel
                  categoryB={categoryB}
                  setCategoryB={setCategoryB}
                  benchmarkSeriesId={benchmarkSeriesId}
                />
              )}
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
                <p className="text-xs text-gray-400 mt-0.5">Last run: {formatDate(lastRunAt)}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                useLocalCapitalize ? runLocalCapitalizeMatch() : runMatchmaking(fieldOverrides)
              }
              disabled={
                matchRunning || capitalizeRunBlocked || (!useLocalCapitalize && hasSanityWarnings)
              }
              title={
                capitalizeRunBlocked
                  ? "Enter a target rate (%) when using Target rate preference."
                  : !useLocalCapitalize && hasSanityWarnings
                    ? "Fix validation warnings on deal parameters before running."
                    : undefined
              }
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {matchRunning ? (
                <><Loader2 size={16} className="animate-spin" />Running...</>
              ) : hasResults ? (
                <><RefreshCw size={16} />Re-run Matchmaking</>
              ) : (
                <><Zap size={16} />Run Matchmaking</>
              )}
            </button>
          </div>
          {!useLocalCapitalize && hasSanityWarnings && (
            <p className="text-xs text-amber-600 mt-1">Fix validation warnings on deal parameters above before running or saving.</p>
          )}

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
                {useLocalCapitalize && totalEligible != null
                  ? `${totalEligible} eligible · ${matchedLenderCount} in results`
                  : `${matchedLenderCount} lenders scored`}
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
              <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
              <h4 className="text-base font-semibold text-gray-800">Analyzing Lenders...</h4>
              <p className="text-sm text-gray-500 text-center mt-2">
                {useLocalCapitalize
                  ? "Running the Capitalize parquet matchmaking engine."
                  : "Matching your project parameters against the backend matchmaking engine."}
              </p>
            </div>
          ) : !hasResults ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200 shadow-sm opacity-80">
              <Target size={48} className="text-gray-300 mb-4" />
              <h4 className="text-base font-semibold text-gray-800">Ready to Match</h4>
              <p className="text-sm text-gray-500 text-center mt-2">
                Run matchmaking to see compatible lenders scored against your key deal terms.
              </p>
            </div>
          ) : (
            matchScores.map((score) => (
              <MatchCard
                key={score.id}
                score={score}
                advisorRateType={categoryB.rateType}
                onSelect={() => setSelectedScore(score)}
                canAddToWishlist={canAddToWishlist}
                onAddToWishlist={handleAddToWishlist}
                wishlistAdded={wishlistLeis}
                wishlistLoading={wishlistLoading}
              />
            ))
          )}
        </div>
      </div>
    </div>
      )}

      {/* Lender detail modal */}
      {selectedScore && (
        <LenderDetailModal
          isOpen={!!selectedScore}
          onClose={() => setSelectedScore(null)}
          projectId={projectId}
          matchRunId={savedMatchRunId ?? lastMatchRunId}
          score={selectedScore}
          dealSummary={dealSummaryForAI}
          capitalizeDeal={capitalizeDealForAI}
          advisorRateType={categoryB.rateType}
          benchmarkSeriesId={benchmarkSeriesId}
          canAddToWishlist={canAddToWishlist}
          onAddToWishlist={handleAddToWishlist}
          wishlistAdded={wishlistLeis}
          wishlistLoading={wishlistLoading}
        />
      )}

      {/* Save run modal: name input for resume version + match run */}
      <Modal
        isOpen={saveRunModalOpen}
        onClose={() => { setSaveRunModalOpen(false); setSaveRunNameDraft(""); }}
        title="Save matchmaking run"
        size="md"
      >
        <ModalBody>
          <p className="text-sm text-gray-600 mb-4">
            Save the current matchmaking results and this resume version under one name. You can return to this run later from the version dropdown.
          </p>
          <Input
            label="Name this run"
            placeholder="e.g. Conservative 65% LTV, Bridge Aggressive"
            value={saveRunNameDraft}
            onChange={(e) => setSaveRunNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitSaveRunModal();
              }
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => { setSaveRunModalOpen(false); setSaveRunNameDraft(""); }}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={submitSaveRunModal}
            disabled={!saveRunNameDraft.trim() || isSavingVersion}
            leftIcon={isSavingVersion ? <Loader2 size={14} className="animate-spin" /> : undefined}
          >
            {isSavingVersion ? "Saving…" : "Save run"}
          </Button>
        </ModalFooter>
      </Modal>

      <AlertModal
        isOpen={validationAlertOpen}
        onClose={() => setValidationAlertOpen(false)}
        title="Can't save yet"
        message="Please fix the validation warnings on the deal parameters before saving a new version."
        variant="warning"
      />
      <AlertModal
        isOpen={wishlistAlertOpen}
        onClose={() => setWishlistAlertOpen(false)}
        title="Wishlist"
        message={wishlistAlertMessage}
        variant="warning"
      />
    </div>
  );
};
