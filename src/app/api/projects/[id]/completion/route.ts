/**
 * GET /api/projects/[id]/completion
 * Returns server-authoritative project and borrower completion percentages from DB.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyProjectAccess } from "@/lib/verify-project-access";
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from "@/lib/rate-limit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rlId = getRateLimitId(_request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, "project-completion");
    if (!rl.allowed) return rl.response;

    const hasAccess = await verifyProjectAccess(supabase, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    return NextResponse.json({
      project: projectResume?.completeness_percent ?? 0,
      borrower: borrowerResume?.completeness_percent ?? 0,
    });
  } catch (err) {
    console.error("[API] Completion error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
