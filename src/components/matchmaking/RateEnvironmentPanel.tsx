"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/utils/cn";
import type { RatePoint, RateTrendSignal } from "@/lib/matchmaking/rateTrend";
import { RateTrendChart } from "./RateTrendChart";

export interface RateEnvironmentPanelProps {
  points: RatePoint[];
  signal: RateTrendSignal;
  /** When set, draws implied all-in line (benchmark + median spread). */
  lenderSpreadMedian?: number | null;
  variant: "embedded" | "modal";
  /** Subtitle under main title (e.g. window description). */
  chartSubtitle?: string;
}

const CHART_HEIGHT = { embedded: 280, modal: 300 } as const;

export const RateEnvironmentPanel: React.FC<RateEnvironmentPanelProps> = ({
  points,
  signal,
  lenderSpreadMedian,
  variant,
  chartSubtitle = "Last ~180 trading sessions (~6 months of history)",
}) => {
  const height = CHART_HEIGHT[variant];
  const isModal = variant === "modal";

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-b from-slate-50/90 to-white shadow-sm overflow-hidden",
        isModal ? "border-slate-200" : "border-indigo-100/80 ring-1 ring-indigo-50",
      )}
    >
      <div className={cn("px-4 pt-3 pb-2 border-b border-slate-100/80", isModal ? "" : "bg-indigo-50/40")}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <span
              className={cn(
                "mt-0.5 p-1.5 rounded-lg shrink-0",
                isModal ? "bg-slate-100 text-slate-600" : "bg-indigo-100 text-indigo-700",
              )}
            >
              <TrendingUp size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Benchmark: {signal.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{chartSubtitle}</p>
            </div>
          </div>
          <p
            className={cn(
              "text-xs leading-snug max-w-full sm:max-w-[240px] text-right",
              isModal ? "text-gray-500" : "text-gray-600",
            )}
            title={signal.environmentLabel}
          >
            {signal.environmentLabel}
          </p>
        </div>

        {signal.vasicek && (
          <div className="mt-3 flex flex-wrap gap-2">
            <MetricPill label="Current" value={`${signal.current.toFixed(2)}%`} emphasis />
            <MetricPill label="Long-run eq." value={`${signal.vasicek.longRunMean.toFixed(2)}%`} />
            <MetricPill label="30d (model)" value={`${signal.vasicek.projected30d.toFixed(2)}%`} />
            <MetricPill label="90d (model)" value={`${signal.vasicek.projected90d.toFixed(2)}%`} />
          </div>
        )}

        {signal.vasicek && (
          <p className="text-[10px] text-slate-500 mt-2 leading-snug">
            30d/90d levels are a mean-reversion (Vasicek-style) estimate from recent history, not a
            forecast or trading signal.
          </p>
        )}
      </div>

      <div className="px-2 sm:px-3 pb-1 pt-2">
        <RateTrendChart
          points={points}
          signal={signal}
          lenderSpreadMedian={lenderSpreadMedian}
          fullWidth
          height={height}
          showVasicekProjections={Boolean(signal.vasicek)}
        />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pb-3 pt-1 text-[10px] text-gray-500 border-t border-slate-100/80">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-0.5 bg-indigo-500 rounded shrink-0" />
          {signal.label}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-px bg-amber-500 shrink-0" style={{ borderTop: "1px dashed #f59e0b", height: 0, background: "transparent" }} />
          EMA-20
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-0.5 bg-red-500 rounded shrink-0" />
          EMA-60
        </span>
        {lenderSpreadMedian != null && (
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-px bg-emerald-500 shrink-0" style={{ borderTop: "1px dashed #10b981", height: 0, background: "transparent" }} />
            Implied all-in
          </span>
        )}
        {signal.vasicek && (
          <>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-px shrink-0" style={{ borderTop: "1px dashed #94a3b8", height: 0 }} />
              Equilibrium
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-px shrink-0" style={{ borderTop: "1px dotted #8b5cf6", height: 0 }} />
              30d / 90d projection
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-1.5 min-w-[5.5rem]",
        emphasis ? "bg-white border-indigo-200 shadow-sm" : "bg-white/80 border-slate-200",
      )}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={cn("text-sm font-bold tabular-nums", emphasis ? "text-indigo-800" : "text-gray-800")}>
        {value}
      </p>
    </div>
  );
}
