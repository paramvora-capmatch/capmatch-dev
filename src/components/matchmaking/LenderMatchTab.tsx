"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ChevronDown,
  ChevronUp,
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
} from "lucide-react";
import { useMatchmaking, type MatchScore, type VariableVizData } from "@/hooks/useMatchmaking";
import { useProjectStore } from "@/stores/useProjectStore";
import { supabase } from "@/lib/supabaseClient";
import { getBackendUrl } from "@/lib/apiConfig";
import type { ProjectProfile } from "@/types/enhanced-types";
import { LenderAIReport } from "./LenderAIReport";
import { FIELD_DEPENDENCIES } from "@/features/project-resume/domain/validationDependencies";

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

const EDITABLE_KEYS = new Set([
  "loanAmountRequested", "targetLtvPercent", "dscr", "propertyNoiT12", "noiYear1",
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
  }
  const normalized = normalizeContentUpdates(overrides);
  return { ...base, ...normalized };
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
          <Pencil size={10} className="text-blue-500 shrink-0" title="Editable — change and re-run matchmaking" />
        ) : (
          <Lock size={10} className="text-gray-400 shrink-0" title="Read-only" />
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

// ─── Match card with Tier 1 (pillar bars + narrative) and Tier 2 (quick view + AI) ──

function MatchCard({
  projectId,
  matchRunId,
  score,
  expanded,
  onToggle,
}: {
  projectId: string;
  matchRunId: string | null;
  score: MatchScore;
  expanded: boolean;
  onToggle: () => void;
}) {
  const displayName = score.lender_name || score.lender_lei || "Unknown";
  const pillar = score.pillar_scores || {};
  // Backend sends pillar scores in 0-1; PillarRow/ScoreBar expect 0-100
  const marketFit = (pillar.market_fit ?? pillar.Market ?? 0) * 100;
  const capitalFit = (pillar.capital_fit ?? pillar.Capital ?? 0) * 100;
  const productFit = (pillar.product_fit ?? pillar.Product ?? 0) * 100;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      {/* Tier 1: Always visible — rank, name, pillar bars, narrative */}
      <div
        onClick={onToggle}
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-400 w-5 text-right shrink-0">
            #{score.rank}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-gray-400 shrink-0" />
              <span className="text-base font-semibold text-gray-900 truncate">{displayName}</span>
            </div>
            <div className="mt-1.5 space-y-1">
              <PillarRow label="Market" score={marketFit} />
              <PillarRow label="Capital" score={capitalFit} />
              <PillarRow label="Product" score={productFit} />
            </div>
          </div>
          <div className="shrink-0 flex flex-col items-center gap-1">
            <ScoreBadge score={score.total_score} />
            {expanded ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
          </div>
        </div>
        {score.overall_narrative && (
          <p className="text-sm text-gray-500 italic leading-relaxed mt-2 ml-8">
            {score.overall_narrative}
          </p>
        )}
      </div>

      {/* Tier 2: Expanded — variable breakdown + AI report trigger */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {score.variable_scores && score.variable_scores.length > 0 && (
            <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap size={16} className="text-blue-600" />
                <span className="text-base font-semibold text-gray-800">Score breakdown</span>
              </div>
              <ul className="space-y-2">
                {score.variable_scores.map((v: VariableVizData, i: number) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-medium text-gray-700">{v.name}</span>
                      <span className="text-xs font-semibold text-gray-500">{(v.score * 100).toFixed(0)}</span>
                    </div>
                    <ScoreBar score={v.score * 100} color={v.score >= 0.7 ? "#059669" : v.score >= 0.4 ? "#d97706" : "#dc2626"} />
                    {v.explanation && (
                      <p className="text-xs text-gray-500 mt-0.5">{v.explanation}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tier 3: AI Report */}
          <LenderAIReport
            projectId={projectId}
            matchRunId={matchRunId}
            score={score}
            lenderName={displayName}
          />
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
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [fieldWarnings, setFieldWarnings] = useState<Record<string, string[]>>({});
  const sanityCheckerRef = useRef<InstanceType<typeof import("@/lib/debouncedSanityCheck").DebouncedSanityChecker> | null>(null);

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
    topMatchName,
    topMatchScore,
    lastRunAt,
    error: matchError,
    runMatchmaking,
    visualizationData,
    draftPayload,
    lastMatchRunId,
  } = useMatchmaking(projectId, selectedVersionId ?? null, contentOverridesForRun);

  const hasResults = matchScores.length > 0 || !!visualizationData;
  const hasOverrides = Object.keys(fieldOverrides).length > 0;
  const hasSanityWarnings = Object.values(fieldWarnings).some((w) => w.length > 0);

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
    [project, fieldOverrides]
  );

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
  const handleSaveVersion = useCallback(async () => {
    if (hasSanityWarnings) {
      window.alert("Please fix the validation warnings on the deal parameters before saving a new version.");
      return;
    }
    const labelInput = window.prompt("Name this version (e.g. 'Conservative 65% LTV', 'Bridge Aggressive'):");
    if (labelInput === null) return; // user pressed Cancel

    setIsSavingVersion(true);
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
      const trimmedLabel = labelInput.trim();
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
          await fetch(`${base}/api/v1/matchmaking/save-run`, {
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
  }, [projectId, fetchVersions, fieldOverrides, hasOverrides, draftPayload, hasSanityWarnings]);

  return (
    <div className="flex gap-6 items-start max-w-[1600px] mx-auto">
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
                onClick={handleSaveVersion}
                disabled={isSavingVersion}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSavingVersion ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Version
              </button>
            </div>
          </div>
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
          <p className="text-sm text-gray-500 mb-4">
            Adjust these deal parameters to explore scenarios. Re-run matchmaking to see how lender matches change.
          </p>
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
                      const overrideValue = fieldOverrides[key];
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
              onClick={() => runMatchmaking()}
              disabled={matchRunning || hasSanityWarnings}
              title={hasSanityWarnings ? "Fix validation warnings on deal parameters before running." : undefined}
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
          {hasSanityWarnings && (
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
              <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
              <h4 className="text-base font-semibold text-gray-800">Analyzing Lenders...</h4>
              <p className="text-sm text-gray-500 text-center mt-2">
                Matching your project parameters against the backend matchmaking engine.
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
                projectId={projectId}
                matchRunId={lastMatchRunId}
                score={score}
                expanded={expandedScoreId === score.id}
                onToggle={() => setExpandedScoreId((id) => (id === score.id ? null : score.id))}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
