"use server";

import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { saveVersionBodySchema, validationErrorResponse, safeErrorResponse } from "@/lib/api-validation";
import { verifyProjectAccess } from "@/lib/verify-project-access";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";
import { unauthorized, validationError, forbidden, notFound } from "@/lib/api-errors";
import { logger } from "@/lib/logger";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return unauthorized();
  }

  const rlId = getRateLimitId(request, user.id);
  const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "project-resume-save-version");
  if (!rl.allowed) return rl.response;

  logger.info("[API] Project resume save-version called");
  const rawBody = await request.text();
  let payload: unknown = {};
  if (rawBody) {
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      logger.error({ err: error }, "[API] Failed to parse save-version request body");
      return validationError("Invalid request body. Expected JSON.");
    }
  }

  const parsed = saveVersionBodySchema.safeParse(payload);
  if (!parsed.success) {
    return validationErrorResponse("Validation failed", parsed.error.issues);
  }
  const { projectId, userId } = parsed.data;
  if (!projectId) {
    return validationError("projectId is required");
  }
  logger.info({ projectId, userId }, "[API] Saving version for project");

  const hasAccess = await verifyProjectAccess(supabase, projectId);
  if (!hasAccess) {
    return forbidden();
  }

  const { data: resource, error: resourceError } = await supabaseAdmin
    .from("resources")
    .select("id, current_version_id")
    .eq("project_id", projectId)
    .eq("resource_type", "PROJECT_RESUME")
    .maybeSingle();

  if (resourceError) {
    return safeErrorResponse(resourceError, "Failed to save version", 500);
  }

  if (!resource?.id) {
    return notFound("Project resume resource not found");
  }

  let resumeRow: {
    content: Record<string, unknown> | null;
  } | null = null;

  let completenessPercent: number | undefined;
  if (resource.current_version_id) {
    const { data, error: resumeError } = await supabaseAdmin
      .from("project_resumes")
      .select("content, completeness_percent")
      .eq("id", resource.current_version_id)
      .maybeSingle();
    if (resumeError) {
      return safeErrorResponse(resumeError, "Failed to load resume", 500);
    }
    resumeRow = data;
    completenessPercent = data?.completeness_percent;
  }

  if (!resumeRow) {
    const { data, error: latestError } = await supabaseAdmin
      .from("project_resumes")
      .select("content, completeness_percent")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) {
      return safeErrorResponse(latestError, "Failed to load resume", 500);
    }
    resumeRow = data;
    completenessPercent = data?.completeness_percent;
  }

  if (!resumeRow) {
    return notFound("No resume data found for project");
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("project_resumes")
    .insert({
      project_id: projectId,
      content: resumeRow.content || {},
      completeness_percent: completenessPercent ?? 0,
      created_by: user.id,
    })
    .select("id, version_number")
    .single();

  if (insertError || !inserted) {
    return safeErrorResponse(insertError, "Failed to snapshot resume", 500);
  }

  const { error: updateResourceError } = await supabaseAdmin
    .from("resources")
    .update({ current_version_id: inserted.id })
    .eq("id", resource.id);

  if (updateResourceError) {
    return safeErrorResponse(updateResourceError, "Failed to update version", 500);
  }

  logger.info(
    { versionId: inserted.id, versionNumber: inserted.version_number, projectId },
    "[API] Successfully saved project resume version"
  );

  return NextResponse.json({
    ok: true,
    versionId: inserted.id,
    versionNumber: inserted.version_number,
  });
}

