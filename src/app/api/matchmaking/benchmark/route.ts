import { NextResponse } from "next/server";
import { fetchEngineConfig, matchmakingParquetReady } from "@/lib/matchmaking/db";

export const runtime = "nodejs";

export async function GET() {
  if (!matchmakingParquetReady()) {
    return NextResponse.json(
      { error: "Matchmaking data not available" },
      { status: 503 }
    );
  }
  try {
    const cfg = await fetchEngineConfig();
    return NextResponse.json({
      benchmarkRate: cfg.latest_benchmark_rate ?? 4.5,
      marketFloor: cfg.market_floor ?? 1.0,
    });
  } catch (e) {
    console.error("benchmark route:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch benchmark" },
      { status: 500 }
    );
  }
}
