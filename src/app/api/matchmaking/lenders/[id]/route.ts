import { NextResponse } from "next/server";
import { fetchLenderProfileBundle } from "@/lib/matchmaking/db";
import { mapParquetToLenderProfile } from "@/lib/matchmaking/mapLenderProfile";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const bundle = await fetchLenderProfileBundle(decodeURIComponent(id));
    const profile = mapParquetToLenderProfile(
      bundle.profile,
      bundle.states,
      bundle.assets,
      bundle.purposes
    );
    if (!profile) {
      return NextResponse.json({ error: "Lender not found" }, { status: 404 });
    }
    return NextResponse.json({
      profile,
      states: bundle.states,
      assets: bundle.assets,
      purposes: bundle.purposes,
    });
  } catch (e) {
    console.error("lender profile:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load lender" },
      { status: 500 }
    );
  }
}
