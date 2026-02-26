/**
 * POST /api/lenders/match-scores
 * Server-side match score calculation. Accepts lenders and filters, returns lenders with match_score.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";
import { calculateMatchScores, type UserFilters } from "@/utils/lenderUtils";
import type { LenderProfile } from "@/types/lender";

const bodySchema = {
  lenders: [] as LenderProfile[],
  filters: {} as Partial<UserFilters>,
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "lenders-match-scores");
    if (!rl.allowed) return rl.response;

    const body = await request.json();
    const lenders = Array.isArray(body.lenders) ? body.lenders : bodySchema.lenders;
    const filters = body.filters && typeof body.filters === "object" ? body.filters : bodySchema.filters;

    const lendersWithScores = calculateMatchScores(lenders, filters);
    return NextResponse.json({ lenders: lendersWithScores });
  } catch (err) {
    console.error("[API] Match scores error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
