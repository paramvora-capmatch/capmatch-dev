"use client";

import React from "react";
import type { DimensionBandViz } from "@/lib/matchmaking/types";

function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPctPt(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(2)} pp`;
}

function clampPct(p: number): number {
  return Math.min(100, Math.max(0, p));
}

function linearPos(value: number, lo: number, hi: number): number {
  if (!(hi > lo) || !Number.isFinite(value)) return 50;
  return clampPct(((value - lo) / (hi - lo)) * 100);
}

/** Loan amount: p05–p95 band, quartiles, deal marker, empirical percentile label */
function LoanAmountChart({ v }: { v: Extract<DimensionBandViz, { kind: "loan_amount" }> }) {
  const { p05, p50, p95, dealAmount, percentile } = v;
  if (!(p95 > p05)) {
    return <p className="text-xs text-gray-500">Amount distribution unavailable.</p>;
  }
  const pos = (x: number) => linearPos(x, p05, p95);
  const dealPos = pos(dealAmount);
  const tick = (x: number | null, label: string) =>
    x != null && Number.isFinite(x) && x >= p05 && x <= p95 ? (
      <div
        className="absolute top-0 bottom-0 w-px bg-slate-300/90"
        style={{ left: `${pos(x)}%` }}
        title={label}
      />
    ) : null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-gray-500">
        <span>Smaller deals</span>
        <span>Larger deals</span>
      </div>
      <div className="relative h-9 rounded-md bg-gradient-to-r from-slate-100 via-indigo-50 to-slate-100 border border-slate-200">
        <div
          className="absolute inset-y-1 rounded bg-white/50 border border-indigo-100/80"
          style={{ left: `${pos(p05)}%`, width: `${Math.max(0, pos(p95) - pos(p05))}%` }}
        />
        {tick(v.p25, "p25")}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-indigo-500/70"
          style={{ left: `${pos(p50)}%` }}
          title="Median"
        />
        {tick(v.p75, "p75")}
        <div
          className="absolute -top-1 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[7px] border-l-transparent border-r-transparent border-b-blue-600 drop-shadow-sm"
          style={{ left: `calc(${dealPos}% - 5px)` }}
          title={`Your request: ${fmtUsd(dealAmount)}`}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
        <span>
          <span className="text-gray-400">p05–p95:</span> {fmtUsd(p05)} – {fmtUsd(p95)}
        </span>
        <span>
          <span className="text-gray-400">Median:</span> {fmtUsd(p50)}
        </span>
        <span className="font-medium text-indigo-700">
          You: {fmtUsd(dealAmount)} · ~{percentile}th pct
        </span>
      </div>
    </div>
  );
}

function ShareBar({ v }: { v: Extract<DimensionBandViz, { kind: "share" }> }) {
  const pct = clampPct(v.share * 100);
  return (
    <div className="mt-2 space-y-1">
      <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden border border-slate-200/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[11px] text-gray-600">
        <span className="text-gray-400">{v.subtitle}:</span>{" "}
        <span className="font-medium text-gray-800">{(v.share * 100).toFixed(1)}%</span> of lender book
      </p>
    </div>
  );
}

function SpreadBandChart({ v }: { v: Extract<DimensionBandViz, { kind: "spread" }> }) {
  if (v.mode === "insufficient") {
    return (
      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-2 py-1.5 mt-2">
        Spread percentiles need more observations; pricing scored neutrally.
      </p>
    );
  }

  const candidates = [
    v.p25,
    v.p75,
    v.median,
    v.marketFloor,
    v.targetSpread,
  ].filter((x): x is number => x != null && Number.isFinite(x));
  if (candidates.length === 0) {
    return null;
  }
  let lo = Math.min(...candidates) - 0.35;
  let hi = Math.max(...candidates) + 0.35;
  if (!(hi > lo)) {
    lo -= 0.5;
    hi += 0.5;
  }
  const at = (x: number) => linearPos(x, lo, hi);

  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-gray-500">
        <span>Lower spread</span>
        <span>Higher spread</span>
      </div>
      <div className="relative h-10 rounded-md bg-slate-50 border border-slate-200">
        {v.p25 != null && v.p75 != null && v.p75 > v.p25 && (
          <div
            className="absolute inset-y-2 rounded bg-violet-100/90 border border-violet-200"
            style={{ left: `${at(v.p25)}%`, width: `${Math.max(0, at(v.p75) - at(v.p25))}%` }}
            title="25th–75th percentile spread (over benchmark)"
          />
        )}
        <div
          className="absolute top-2 bottom-2 w-0.5 bg-violet-600 rounded"
          style={{ left: `${at(v.median)}%` }}
          title="Typical spread (median)"
        />
        <div
          className="absolute top-1 bottom-1 border-l border-dashed border-slate-400"
          style={{ left: `${at(v.marketFloor)}%` }}
          title="Market floor (dataset)"
        />
        {v.mode === "target" && v.targetSpread != null && Number.isFinite(v.targetSpread) && (
          <div
            className="absolute -top-0.5 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-rose-600"
            style={{ left: `calc(${at(v.targetSpread)}% - 4px)` }}
            title="Your target spread"
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
        <span>
          <span className="text-gray-400">Median spread:</span> {fmtPctPt(v.median)}
        </span>
        {v.p25 != null && v.p75 != null && (
          <span>
            <span className="text-gray-400">IQR:</span> {fmtPctPt(v.p25)} – {fmtPctPt(v.p75)}
          </span>
        )}
        <span>
          <span className="text-gray-400">Floor:</span> {fmtPctPt(v.marketFloor)}
        </span>
        <span className="text-gray-400">
          Benchmark {v.benchmarkRate.toFixed(2)}% (DGS10-based)
        </span>
        {v.mode === "target" && v.targetSpread != null && (
          <span className="font-medium text-rose-700">Target spread: {fmtPctPt(v.targetSpread)}</span>
        )}
      </div>
    </div>
  );
}

function LtvHistoryChart({ v }: { v: Extract<DimensionBandViz, { kind: "ltv_history" }> }) {
  if (v.median == null) return null;
  const p25 = v.p25 ?? v.median * 0.9;
  const p75 = v.p75 ?? v.median * 1.1;
  const lo = Math.min(p25, v.median) - 5;
  const hi = Math.max(p75, v.median) + 5;
  const at = (x: number) => linearPos(x, lo, hi);

  return (
    <div className="mt-2 space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Historical LTV (not scored) · n = {v.txnCount}
      </p>
      <div className="relative h-8 rounded-md bg-amber-50/80 border border-amber-100">
        {p75 > p25 && (
          <div
            className="absolute inset-y-1.5 rounded bg-amber-200/70 border border-amber-300/60"
            style={{ left: `${at(p25)}%`, width: `${Math.max(0, at(p75) - at(p25))}%` }}
            title="25th–75th percentile LTV"
          />
        )}
        <div
          className="absolute top-1 bottom-1 w-0.5 bg-amber-700 rounded"
          style={{ left: `${at(v.median)}%` }}
          title="Median LTV"
        />
      </div>
      <div className="flex flex-wrap gap-x-3 text-[11px] text-gray-600">
        <span>
          <span className="text-gray-400">IQR:</span>{" "}
          {v.p25 != null && v.p75 != null ? `${v.p25.toFixed(0)}–${v.p75.toFixed(0)}%` : "—"}
        </span>
        <span>
          <span className="text-gray-400">Median:</span> {v.median.toFixed(1)}%
        </span>
        {v.coverage != null && (
          <span>
            <span className="text-gray-400">Coverage:</span> {(v.coverage * 100).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

export function DimensionDistributionViz({ viz }: { viz: DimensionBandViz }) {
  switch (viz.kind) {
    case "loan_amount":
      return <LoanAmountChart v={viz} />;
    case "share":
      return <ShareBar v={viz} />;
    case "spread":
      return <SpreadBandChart v={viz} />;
    case "ltv_history":
      return <LtvHistoryChart v={viz} />;
  }
}
