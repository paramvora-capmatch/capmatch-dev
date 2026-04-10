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
  width?: number;
  height?: number;
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
  const yMin = Math.floor((Math.min(...rates) - 0.2) * 10) / 10;
  const yMax = Math.ceil((Math.max(...rates) + 0.3) * 10) / 10;

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  return (
    <div style={{ width: "100%", maxWidth: width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10 }}
            width={40}
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
            labelFormatter={formatDate}
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

          {signal.vasicek && (
            <ReferenceLine
              y={signal.vasicek.longRunMean}
              stroke="#94a3b8"
              strokeDasharray="8 4"
              label={{
                value: `Eq: ${signal.vasicek.longRunMean.toFixed(2)}%`,
                position: "right",
                fontSize: 9,
                fill: "#94a3b8",
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
