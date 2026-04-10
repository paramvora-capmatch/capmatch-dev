import { NextResponse } from "next/server";
import { fetchEngineConfig, matchmakingDataDir, matchmakingParquetReady } from "@/lib/matchmaking/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ready = matchmakingParquetReady();
    if (!ready) {
      return NextResponse.json(
        {
          ok: false,
          parquetReady: false,
          dataDir: matchmakingDataDir(),
          message: "Parquet files missing — run: npm run build:matchmaking",
        },
        { status: 503 }
      );
    }
    const cfg = await fetchEngineConfig();
    return NextResponse.json({
      ok: true,
      parquetReady: true,
      dataDir: matchmakingDataDir(),
      engineConfig: {
        market_floor: cfg.market_floor,
        latest_benchmark_rate: cfg.latest_benchmark_rate,
      },
    });
  } catch (e) {
    console.error("matchmaking health:", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "health check failed" },
      { status: 500 }
    );
  }
}
