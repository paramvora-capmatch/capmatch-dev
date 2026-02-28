/**
 * DELETE /api/documents/[resourceId]
 * Proxies to FastAPI backend for transactional delete (DB-first, then storage).
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
  { params }: { params: Promise<{ resourceId: string }> }
) {
  try {
    const { resourceId } = await params;

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return unauthorized();
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "documents-delete");
    if (!rl.allowed) return rl.response;

    const { data: resource } = await supabase
      .from("resources")
      .select("project_id")
      .eq("id", resourceId)
      .maybeSingle();

    if (resource?.project_id) {
      const hasAccess = await verifyProjectAccess(supabase, resource.project_id);
      if (!hasAccess) {
        return forbidden();
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return unauthorized();
    }

    const backendUrl = getBackendUrl();
    const res = await fetch(`${backendUrl}/api/v1/documents/${resourceId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.json().catch(() => ({}));
    const message = data?.detail ?? data?.message ?? data?.error ?? "Failed to delete document";
    const msg = typeof message === "string" ? message : JSON.stringify(message);
    const status = res.status >= 400 ? res.status : 500;
    return errorResponse(status, data?.error_code ?? ERROR_CODES.INTERNAL_ERROR, msg, data?.details);
  } catch (err) {
    return safeErrorResponse(err, "Internal server error");
  }
}
