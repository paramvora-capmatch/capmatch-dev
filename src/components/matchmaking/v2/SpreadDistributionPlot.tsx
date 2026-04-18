"use client";

/**
 * SpreadDistributionPlot — lender's historical spread GMM as a density curve
 * in % points over benchmark. Markers:
 *   - dashed vertical = competitive market P25 (context line)
 *   - solid vertical = deal spread (in target mode) OR emphasized P25 (in competitive mode)
 */

import React, { useMemo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { DimensionBandViz } from "@/lib/matchmaking/types";

type SpreadViz = Extract<DimensionBandViz, { kind: "spread_gmm" }>;

const COLORS: Record<"competitive" | "target", string> = {
  competitive: "#10b981",
  target: "#e11d48",
};

export function SpreadDistributionPlot({ viz }: { viz: SpreadViz }) {
  const points = useMemo(() => {
    const xs = viz.densityCurve.xs ?? [];
    const ys = viz.densityCurve.ys ?? [];
    return xs.map((x, i) => ({ x, y: ys[i] ?? 0 }));
  }, [viz.densityCurve]);

  if (!points.length) {
    return (
      <div className="text-[11px] text-gray-500 italic">
        Not enough spread history to plot a distribution.
      </div>
    );
  }

  const color = COLORS[viz.mode] ?? "#6366f1";
  const modes = viz.components
    .slice()
    .sort((a, b) => b.weight - a.weight);

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">
          Spread distribution ({viz.mode} mode · {viz.routingMode})
        </span>
        <span className="text-[10px] text-gray-500">n={viz.spreadN}</span>
      </div>
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={`spreadGrad-${viz.mode}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.55} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(n) => `${n.toFixed(1)}%`}
              tick={{ fontSize: 10, fill: "#6b7280" }}
              stroke="#d1d5db"
              tickCount={5}
            />
            <YAxis
              hide
              domain={[
                0,
                (dataMax: number) => (Number.isFinite(dataMax) && dataMax > 0 ? dataMax * 1.2 : dataMax),
              ]}
            />
            <Tooltip
              formatter={(v: number) => v.toFixed(4)}
              labelFormatter={(v) => `${Number(v).toFixed(2)}% spread`}
              contentStyle={{ fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="y"
              stroke="none"
              fill={`url(#spreadGrad-${viz.mode})`}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="y"
              stroke={color}
              strokeWidth={1.75}
              dot={false}
              isAnimationActive={false}
            />
            {viz.competitivePoint != null && (
              <ReferenceLine
                x={viz.competitivePoint}
                stroke="#6b7280"
                strokeDasharray="3 3"
                label={{
                  value: "Market P25",
                  position: "insideTop",
                  fill: "#6b7280",
                  fontSize: 9,
                }}
              />
            )}
            {viz.mode === "target" && (
              <ReferenceLine
                x={viz.dealSpread}
                stroke={color}
                strokeWidth={1.5}
                label={{
                  value: `Target: ${viz.dealSpread.toFixed(2)}%`,
                  position: "top",
                  fill: color,
                  fontSize: 10,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-600">
        {modes.slice(0, 3).map((c, i) => (
          <span key={i}>
            <span className="text-gray-400">Mode {i + 1}:</span>{" "}
            <span className="font-medium" style={{ color }}>
              {c.mean.toFixed(2)}%
            </span>
            <span className="text-gray-400"> ({(c.weight * 100).toFixed(0)}%)</span>
          </span>
        ))}
        {viz.spreadMedian != null && (
          <span>
            <span className="text-gray-400">Median:</span> {viz.spreadMedian.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
