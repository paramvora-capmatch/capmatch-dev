/**
 * GET /api/projects/[id]/completion
 * Returns server-authoritative project and borrower completion percentages from DB.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyProjectAccess } from "@/lib/verify-project-access";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-validation";
import { unauthorized, forbidden } from "@/lib/api-errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return unauthorized();
    }

    const rlId = getRateLimitId(_request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "project-completion");
    if (!rl.allowed) return rl.response;

    const hasAccess = await verifyProjectAccess(supabase, projectId);
    if (!hasAccess) {
      return forbidden();
    }

    const { data: projectResume } = await supabase
      .from("project_resumes")
      .select("completeness_percent")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: borrowerResume } = await supabase
      .from("borrower_resumes")
      .select("completeness_percent")
      .eq("project_id", projectId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      {
        project: projectResume?.completeness_percent ?? 0,
        borrower: borrowerResume?.completeness_percent ?? 0,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    return safeErrorResponse(err, "Internal server error");
  }
}
