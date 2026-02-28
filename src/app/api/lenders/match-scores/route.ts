/**
 * POST /api/lenders/match-scores
 * Proxies to FastAPI backend for server-side match score calculation.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-validation";
import { getBackendUrl } from "@/lib/apiConfig";
import { unauthorized, errorResponse, ERROR_CODES } from "@/lib/api-errors";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return unauthorized();
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "lenders-match-scores");
    if (!rl.allowed) return rl.response;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return unauthorized();
    }

    const body = await request.text();
    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/v1/lenders/match-scores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body || "{}",
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return NextResponse.json(data);
    }
    const message = data?.detail ?? data?.message ?? data?.error ?? "Match scores failed";
    const msg = typeof message === "string" ? message : JSON.stringify(message);
    const status = res.status >= 400 ? res.status : 500;
    return errorResponse(status, data?.error_code ?? ERROR_CODES.INTERNAL_ERROR, msg, data?.details);
  } catch (err) {
    return safeErrorResponse(err, "Internal server error");
  }
}
