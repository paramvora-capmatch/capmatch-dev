/**
 * GET /api/matchmaking/scores?projectId=...
 * Proxies to FastAPI backend to get detailed match scores for the latest run.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-validation";
import { getBackendUrl } from "@/lib/apiConfig";
import { unauthorized, errorResponse, ERROR_CODES } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return unauthorized();
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "matchmaking-scores");
    if (!rl.allowed) return rl.response;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return unauthorized();
    }

    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return errorResponse(400, ERROR_CODES.VALIDATION_ERROR, "projectId query param is required");
    }

    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/v1/matchmaking/${projectId}/scores`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return NextResponse.json(data);
    }
    const message = data?.detail ?? data?.message ?? data?.error ?? "Failed to fetch scores";
    const msg = typeof message === "string" ? message : JSON.stringify(message);
    const status = res.status >= 400 ? res.status : 500;
    return errorResponse(status, data?.error_code ?? ERROR_CODES.INTERNAL_ERROR, msg, data?.details);
  } catch (err) {
    return safeErrorResponse(err, "Internal server error");
  }
}
