/**
 * POST /api/borrower-resume/ensure-resource
 * Ensures a resources row exists for the project's BORROWER_RESUME.
 * Used when the first borrower resume is created (no resource row yet).
 * Mutations are performed server-side; caller must be authenticated and have project access.
 */

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyProjectAccess } from "@/lib/verify-project-access";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";
import { unauthorized, forbidden, validationError } from "@/lib/api-errors";
import { safeErrorResponse } from "@/lib/api-validation";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return unauthorized();
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "borrower-resume-ensure-resource");
    if (!rl.allowed) return rl.response;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError("Invalid JSON body");
    }
    const projectId =
      typeof body === "object" && body !== null && "projectId" in body
        ? String((body as { projectId: unknown }).projectId)
        : "";
    const resumeId =
      typeof body === "object" && body !== null && "resumeId" in body
        ? String((body as { resumeId: unknown }).resumeId)
        : "";
    if (!projectId?.trim() || !resumeId?.trim()) {
      return validationError("projectId and resumeId are required");
    }

    const hasAccess = await verifyProjectAccess(supabase, projectId);
    if (!hasAccess) {
      return forbidden();
    }

    const admin = getSupabaseAdmin();
    const { data: existing } = await admin
      .from("resources")
      .select("id")
      .eq("project_id", projectId)
      .eq("resource_type", "BORROWER_RESUME")
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({ ok: true, alreadyExists: true });
    }

    const { data: project } = await admin
      .from("projects")
      .select("owner_org_id")
      .eq("id", projectId)
      .maybeSingle();

    if (!project?.owner_org_id) {
      return forbidden();
    }

    const { error: insertError } = await admin.from("resources").insert({
      project_id: projectId,
      resource_type: "BORROWER_RESUME",
      current_version_id: resumeId,
      org_id: project.owner_org_id,
    });

    if (insertError) {
      logger.error({ err: insertError, projectId, resumeId }, "ensure-resource insert failed");
      return safeErrorResponse(insertError, "Failed to create resource", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return safeErrorResponse(err, "Internal server error");
  }
}
