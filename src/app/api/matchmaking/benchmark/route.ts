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
      dgs10: cfg.latest_benchmark_rate ?? 4.5,
      dgs7: cfg.latest_dgs7 ?? 4.2,
      dgs5: cfg.latest_dgs5 ?? 4.1,
      sofr: cfg.latest_sofr ?? 4.3,
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
