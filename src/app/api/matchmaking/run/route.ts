/**
 * POST /api/matchmaking/run
 * Proxies to FastAPI backend to trigger the matchmaking engine.
 * Body: { projectId: string }
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
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "matchmaking-run");
    if (!rl.allowed) return rl.response;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return unauthorized();
    }

    const body = await request.json();
    const projectId = body?.projectId;
    if (!projectId) {
      return errorResponse(400, ERROR_CODES.VALIDATION_ERROR, "projectId is required");
    }

    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/v1/matchmaking/run/${projectId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return NextResponse.json(data);
    }
    const message = data?.detail ?? data?.message ?? data?.error ?? "Matchmaking failed";
    const msg = typeof message === "string" ? message : JSON.stringify(message);
    const status = res.status >= 400 ? res.status : 500;
    return errorResponse(status, data?.error_code ?? ERROR_CODES.INTERNAL_ERROR, msg, data?.details);
  } catch (err) {
    return safeErrorResponse(err, "Internal server error");
  }
}
