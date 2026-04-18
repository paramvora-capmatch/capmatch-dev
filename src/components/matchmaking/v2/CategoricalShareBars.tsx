"use client";

/**
 * CategoricalShareBars — top-N categories with raw vs Laplace-smoothed
 * shares and the deal's category highlighted. Used for state / property /
 * purpose / term V2 visualizations.
 */

import React from "react";
import type { DimensionBandViz } from "@/lib/matchmaking/types";

type CategoricalViz = Extract<DimensionBandViz, { kind: "categorical_laplace" }>;

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

export function CategoricalShareBars({ viz }: { viz: CategoricalViz }) {
  const rows = viz.shares.slice(0, 6);
  if (!rows.length) {
    return (
      <div className="text-[11px] text-gray-500 italic">
        No categorical distribution data.
      </div>
    );
  }

  const maxShare = Math.max(...rows.map((r) => Math.max(r.rawShare, r.smoothedShare)), 0.01);

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-500">
        <span>
          Top {rows.length} {viz.dimension} shares
        </span>
      </div>
      <div className="space-y-1">
        {rows.map((r) => {
          const highlighted = r.category === viz.dealValue;
          const rawPct = (r.rawShare / maxShare) * 100;
          const smPct = (r.smoothedShare / maxShare) * 100;
          return (
            <div key={r.category} className="flex items-center gap-2">
              <span
                className={`w-28 truncate text-[11px] ${
                  highlighted ? "font-semibold text-indigo-700" : "text-gray-700"
                }`}
                title={r.category}
              >
                {r.category}
                {highlighted ? " (your deal)" : ""}
              </span>
              <div className="relative flex-1 h-4 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-slate-300/80"
                  style={{ width: `${rawPct}%` }}
                  title={`Raw share: ${pct(r.rawShare)}`}
                />
                <div
                  className={`absolute inset-y-0 left-0 ${
                    highlighted ? "bg-indigo-500" : "bg-indigo-300"
                  }`}
                  style={{ width: `${smPct}%`, opacity: 0.85 }}
                  title={`Smoothed: ${pct(r.smoothedShare)}`}
                />
              </div>
              <span className="w-24 text-right text-[11px] text-gray-600 tabular-nums">
                <span className={highlighted ? "font-semibold text-indigo-700" : ""}>
                  {pct(r.smoothedShare)}
                </span>
                <span className="text-gray-400"> · n={r.nInCategory}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-gray-500">Darker bar = scored share. Lighter gray = raw share.</div>
    </div>
  );
}
