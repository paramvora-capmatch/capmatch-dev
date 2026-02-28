/**
 * DELETE /api/projects/[id]
 * Proxies to FastAPI backend for transactional project deletion (DB-first, storage-second).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyProjectAccess } from "@/lib/verify-project-access";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-validation";
import { getBackendUrl } from "@/lib/apiConfig";
import { unauthorized, forbidden, errorResponse, ERROR_CODES } from "@/lib/api-errors";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return unauthorized();
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "project-delete");
    if (!rl.allowed) return rl.response;

    const hasAccess = await verifyProjectAccess(supabase, projectId);
    if (!hasAccess) {
      return forbidden();
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return unauthorized();
    }

    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/v1/projects/${projectId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const body = await res.json().catch(() => ({}));
    const message = body?.detail ?? body?.message ?? body?.error ?? "Failed to delete project";
    const msg = typeof message === "string" ? message : JSON.stringify(message);
    const status = res.status >= 400 ? res.status : 500;
    return errorResponse(status, body?.error_code ?? ERROR_CODES.INTERNAL_ERROR, msg, body?.details);
  } catch (error) {
    return safeErrorResponse(error, "Internal server error");
  }
}
