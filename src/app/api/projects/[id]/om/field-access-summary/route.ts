import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateSummaryReport } from '@/lib/om-field-logger';
import { validateSearchParams, fieldAccessSummaryQuerySchema, safeErrorResponse } from '@/lib/api-validation';
import { verifyProjectAccess } from '@/lib/verify-project-access';
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from '@/lib/rate-limit';
import { unauthorized, forbidden } from '@/lib/api-errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return unauthorized();
  }

  const rlId = getRateLimitId(request, user.id);
  const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, 'om-field-access-summary');
  if (!rl.allowed) return rl.response;

  try {
    const { id: projectId } = await params;
    const hasAccess = await verifyProjectAccess(supabase, projectId);
    if (!hasAccess) {
      return forbidden();
    }
    const [err, query] = validateSearchParams(request, fieldAccessSummaryQuerySchema);
    if (err) return err;
    const date = query?.date;

    const summary = await generateSummaryReport(projectId, date);

    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to generate summary report');
  }
}

