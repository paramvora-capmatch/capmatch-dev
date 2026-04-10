"use client";

import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { RatePoint, RateTrendSignal } from "@/lib/matchmaking/rateTrend";

interface RateTrendSparklineProps {
  points: RatePoint[];
  signal: RateTrendSignal;
  width?: number;
  height?: number;
}

export const RateTrendSparkline: React.FC<RateTrendSparklineProps> = ({
  points,
  signal,
  width = 120,
  height = 30,
}) => {
  const color =
    signal.direction === "rising"
      ? "#dc2626"
      : signal.direction === "falling"
        ? "#16a34a"
        : "#6b7280";

  const tail = points.slice(-90);

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={tail}>
          <Line
            type="monotone"
            dataKey="rate"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
