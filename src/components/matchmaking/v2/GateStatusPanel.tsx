"use client";

/**
 * GateStatusPanel — small checklist of V2 eligibility-gate outcomes.
 * Each row shows the gate name, its pass-reason string, and a colored pill
 * so advisors can see *why* a lender passed (e.g. national-bypass vs direct
 * evidence) at a glance.
 */

import React from "react";
import type { VCeilingInfo } from "@/lib/matchmaking/types";

interface Props {
  gates?: Record<string, string>;
  vCeilingInfo?: VCeilingInfo;
}

// Human-readable labels for the gate machine keys.
const GATE_LABELS: Record<string, string> = {
  amount: "Loan Amount Range",
  state: "Geography Evidence",
  property: "Property Evidence",
  purpose: "Purpose Evidence",
  lenderType: "Lender Type Filter",
};

// Color convention for pass-reason suffixes.
function reasonBadge(reason: string): { label: string; className: string } {
  const [, suffix = ""] = reason.split(":", 2);
  const s = suffix || reason;
  if (s.startsWith("must-have-unmet") || s.startsWith("no-evidence") || s.startsWith("excluded") || s.startsWith("out-of-band")) {
    return { label: s, className: "bg-rose-100 text-rose-700 border-rose-200" };
  }
  if (s.startsWith("pass-national")) {
    return { label: "national bypass", className: "bg-sky-100 text-sky-700 border-sky-200" };
  }
  if (s.startsWith("pass-regional")) {
    return { label: "regional bypass", className: "bg-sky-100 text-sky-700 border-sky-200" };
  }
  if (s.startsWith("pass-coverage-escape")) {
    return { label: "coverage escape", className: "bg-amber-100 text-amber-700 border-amber-200" };
  }
  if (s.startsWith("pass-evidence") || s.startsWith("pass-") || s.startsWith("in-band") || s.startsWith("must-have-met")) {
    return { label: s, className: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }
  return { label: s, className: "bg-slate-100 text-slate-700 border-slate-200" };
}

export function GateStatusPanel({ gates, vCeilingInfo }: Props) {
  const entries = Object.entries(gates ?? {});
  if (!entries.length && !vCeilingInfo) return null;

  return (
    <div className="space-y-2">
      {entries.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50/40 p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-500">
            <span>Eligibility gates</span>
            <span>V2</span>
          </div>
          {entries.map(([key, reason]) => {
            const label = GATE_LABELS[key] ?? key;
            const badge = reasonBadge(reason);
            return (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-gray-700">{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
      {vCeilingInfo && (
        <div className="rounded-md border border-indigo-100 bg-indigo-50/50 p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-indigo-700">
            <span>V-ceiling</span>
            <span>λ = 0.70</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-700">
            <span>
              <span className="text-gray-400">Weighted sum:</span>{" "}
              <span className="font-medium">
                {(vCeilingInfo.weightedSum * 100).toFixed(1)}
              </span>
            </span>
            <span>
              <span className="text-gray-400">Weakest signal:</span>{" "}
              <span className="font-medium">{vCeilingInfo.minFitDimension}</span>
              <span className="text-gray-400"> · fit {(vCeilingInfo.minFit * 100).toFixed(0)}</span>
            </span>
            <span>
              <span className="text-gray-400">Ceiling:</span>{" "}
              <span className="font-medium">
                {(vCeilingInfo.vCeiling * 100).toFixed(1)}
              </span>
            </span>
            <span>
              <span className="text-gray-400">Affinity used:</span>{" "}
              <span className="font-medium">
                {(vCeilingInfo.affinity * 100).toFixed(1)}
              </span>
            </span>
          </div>
          {vCeilingInfo.ceilingBinding && (
            <div className="text-[11px] text-indigo-700 font-medium">
              ⚠ The {vCeilingInfo.minFitDimension.toLowerCase()} signal capped this score.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
