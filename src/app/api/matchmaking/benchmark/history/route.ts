import { NextRequest, NextResponse } from "next/server";
import { fetchBenchmarkHistory, matchmakingParquetReady } from "@/lib/matchmaking/db";
import { computeRateTrendSignal, type RatePoint } from "@/lib/matchmaking/rateTrend";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!matchmakingParquetReady()) {
    return NextResponse.json(
      { error: "Matchmaking data not available" },
      { status: 503 },
    );
  }

  const { searchParams } = req.nextUrl;
  const series = (searchParams.get("series") ?? "DGS10").toUpperCase();
  const days = Math.max(30, Math.min(Number(searchParams.get("days")) || 365, 3650));

  try {
    const rows = await fetchBenchmarkHistory(series, days);

    const points: RatePoint[] = rows.map((r) => ({
      date: r.rate_date,
      rate: r.rate_value,
    }));

    const signal = computeRateTrendSignal(series, points);

    return NextResponse.json({ points, signal });
  } catch (e) {
    console.error("benchmark/history route:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch history" },
      { status: 500 },
    );
  }
}
