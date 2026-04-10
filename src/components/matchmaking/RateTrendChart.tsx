"use client";

import React, { useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import type { RatePoint, RateTrendSignal } from "@/lib/matchmaking/rateTrend";

interface RateTrendChartProps {
  points: RatePoint[];
  signal: RateTrendSignal;
  lenderSpreadMedian?: number | null;
  /** When false, caps width at this many CSS pixels. Ignored when fullWidth is true. */
  width?: number;
  height?: number;
  /** Stretch to parent width (no maxWidth cap). */
  fullWidth?: boolean;
  /** Draw horizontal markers for Vasicek 30d/90d projections (requires signal.vasicek). */
  showVasicekProjections?: boolean;
}

function computeEmaForChart(values: number[], span: number): number[] {
  const k = 2 / (span + 1);
  const out: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

export const RateTrendChart: React.FC<RateTrendChartProps> = ({
  points,
  signal,
  lenderSpreadMedian,
  width = 400,
  height = 200,
  fullWidth = false,
  showVasicekProjections = false,
}) => {
  const chartData = useMemo(() => {
    const tail = points.slice(-180);
    const rates = tail.map((p) => p.rate);
    const ema20 = computeEmaForChart(rates, 20);
    const ema60 = computeEmaForChart(rates, 60);

    return tail.map((p, i) => ({
      date: p.date,
      rate: p.rate,
      ema20: ema20[i],
      ema60: ema60[i],
      implied: lenderSpreadMedian != null ? p.rate + lenderSpreadMedian : undefined,
    }));
  }, [points, lenderSpreadMedian]);

  const rates = chartData.map((d) => d.rate);
  const impliedVals = chartData.map((d) => d.implied).filter((v): v is number => v != null);

  const refYs: number[] = [...rates, ...impliedVals];
  const v = signal.vasicek;
  if (v) {
    refYs.push(v.longRunMean);
    if (showVasicekProjections) {
      refYs.push(v.projected30d, v.projected90d);
    }
  }

  const yLo = refYs.length > 0 ? Math.min(...refYs) : signal.current;
  const yHi = refYs.length > 0 ? Math.max(...refYs) : signal.current;
  const yMin = Math.floor((yLo - 0.2) * 10) / 10;
  const yMax = Math.ceil((yHi + 0.3) * 10) / 10;

  /** Calendar trading dates — avoid M/D ticks like "1/5" that read as fractions. */
  const formatChartDate = (value: string | number) => {
    const raw = String(value);
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return raw;
    return dt.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "2-digit",
    });
  };

  const outerStyle: React.CSSProperties = fullWidth
    ? { width: "100%", height }
    : { width: "100%", maxWidth: width, height };

  return (
    <div style={outerStyle}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 28, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            type="category"
            tickFormatter={formatChartDate}
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={36}
            label={{
              value: "Trading date",
              position: "insideBottom",
              offset: -18,
              fontSize: 10,
              fill: "#6b7280",
            }}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10 }}
            width={44}
            tickFormatter={(v: number) => `${v.toFixed(1)}%`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value.toFixed(3)}%`,
              name === "rate"
                ? signal.label
                : name === "ema20"
                  ? "EMA-20"
                  : name === "ema60"
                    ? "EMA-60"
                    : name === "implied"
                      ? "Implied All-In"
                      : name,
            ]}
            labelFormatter={formatChartDate}
            contentStyle={{ fontSize: 11 }}
          />

          <Area
            type="monotone"
            dataKey="rate"
            stroke="#6366f1"
            fill="#eef2ff"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            name="rate"
          />
          <Line
            type="monotone"
            dataKey="ema20"
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="4 2"
            dot={false}
            isAnimationActive={false}
            name="ema20"
          />
          <Line
            type="monotone"
            dataKey="ema60"
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="6 3"
            dot={false}
            isAnimationActive={false}
            name="ema60"
          />

          {lenderSpreadMedian != null && (
            <Line
              type="monotone"
              dataKey="implied"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              dot={false}
              isAnimationActive={false}
              name="implied"
            />
          )}

          {v && (
            <ReferenceLine
              y={v.longRunMean}
              stroke="#94a3b8"
              strokeDasharray="8 4"
              label={{
                value: `Eq: ${v.longRunMean.toFixed(2)}%`,
                position: "right",
                fontSize: 9,
                fill: "#94a3b8",
              }}
            />
          )}

          {v && showVasicekProjections && (
            <>
              <ReferenceLine
                y={v.projected30d}
                stroke="#8b5cf6"
                strokeDasharray="3 3"
                label={{
                  value: `30d: ${v.projected30d.toFixed(2)}%`,
                  position: "insideTopRight",
                  fontSize: 9,
                  fill: "#7c3aed",
                }}
              />
              <ReferenceLine
                y={v.projected90d}
                stroke="#7c3aed"
                strokeDasharray="2 6"
                label={{
                  value: `90d: ${v.projected90d.toFixed(2)}%`,
                  position: "insideBottomRight",
                  fontSize: 9,
                  fill: "#6d28d9",
                }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
