"use client";

/**
 * AmountDistributionPlot — draws the lender's loan-amount GMM as a smooth
 * density curve with a vertical marker at the deal amount. Log-dollar x-axis
 * so multi-modal books look right.
 */

import React, { useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
} from "recharts";
import type { DimensionBandViz } from "@/lib/matchmaking/types";

function fmtUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

type AmountViz = Extract<DimensionBandViz, { kind: "loan_amount_gmm" }>;

export function AmountDistributionPlot({ viz }: { viz: AmountViz }) {
  const points = useMemo(() => {
    const xs = viz.densityCurve.xsDollars ?? [];
    const ys = viz.densityCurve.ys ?? [];
    return xs.map((x, i) => ({ x, y: ys[i] ?? 0 }));
  }, [viz.densityCurve]);

  if (!points.length) {
    return (
      <div className="text-[11px] text-gray-500 italic">
        Not enough loan-amount history to plot a distribution.
      </div>
    );
  }

  const modes = viz.components
    .slice()
    .sort((a, b) => b.weight - a.weight);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">
          Lender loan-size distribution (K={viz.k} · {viz.routingMode})
        </span>
        <span className="text-[10px] text-gray-500">{viz.nDistinctAmounts} distinct amounts</span>
      </div>
      <div className="h-28 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="amtGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="x"
              type="number"
              scale="log"
              domain={["dataMin", "dataMax"]}
              tickFormatter={fmtUsd}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              stroke="#d1d5db"
              tickCount={4}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <Tooltip
              formatter={(v: number) => v.toFixed(4)}
              labelFormatter={(v) => fmtUsd(Number(v))}
              contentStyle={{ fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="y"
              stroke="none"
              fill="url(#amtGrad)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke="#6366f1"
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
            <ReferenceLine
              x={viz.dealAmount}
              stroke="#2563eb"
              strokeDasharray="3 3"
              label={{
                value: `You: ${fmtUsd(viz.dealAmount)}`,
                position: "top",
                fill: "#2563eb",
                fontSize: 10,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
        {modes.slice(0, 3).map((c, i) => (
          <span key={i}>
            <span className="text-gray-400">Mode {i + 1}:</span>{" "}
            <span className="font-medium text-indigo-700">{fmtUsd(c.meanDollars)}</span>
            <span className="text-gray-400"> ({(c.weight * 100).toFixed(0)}%)</span>
          </span>
        ))}
      </div>
    </div>
  );
}
