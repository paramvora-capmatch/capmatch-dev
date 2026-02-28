/**
 * POST /api/documents/upload
 * Proxies to FastAPI backend for transactional upload (storage first, then DB transaction).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyProjectAccess } from "@/lib/verify-project-access";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-validation";
import { getBackendUrl } from "@/lib/apiConfig";
import { unauthorized, forbidden, validationError, errorResponse, ERROR_CODES } from "@/lib/api-errors";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return unauthorized();
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "documents-upload");
    if (!rl.allowed) return rl.response;

    const formData = await request.formData();
    const projectId = formData.get("projectId") as string | null;
    if (!projectId?.trim()) {
      return validationError("projectId is required");
    }

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
    const proxyForm = new FormData();
    proxyForm.set("projectId", projectId);
    proxyForm.set("context", (formData.get("context") as string) || "project");
    const folderId = formData.get("folderId");
    if (folderId && String(folderId).trim()) proxyForm.set("folderId", String(folderId));
    const file = formData.get("file");
    if (file && file instanceof File) proxyForm.set("file", file);

    const res = await fetch(`${backendUrl}/api/v1/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: proxyForm,
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return NextResponse.json(data);
    }
    const message = data?.detail ?? data?.message ?? data?.error ?? "Upload failed";
    const msg = typeof message === "string" ? message : JSON.stringify(message);
    const status = res.status >= 400 ? res.status : 500;
    return errorResponse(status, data?.error_code ?? ERROR_CODES.INTERNAL_ERROR, msg, data?.details);
  } catch (err) {
    return safeErrorResponse(err, "Internal server error");
  }
}
