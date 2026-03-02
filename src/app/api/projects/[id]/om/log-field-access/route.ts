import { NextRequest, NextResponse } from 'next/server';
import { logFieldAccess, FieldAccessLog } from '@/lib/om-field-logger';
import { validateBody, omLogFieldAccessBodySchema } from '@/lib/api-validation';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from '@/lib/rate-limit';
import { unauthorized, validationError, forbidden } from '@/lib/api-errors';
import { createRequestLogger } from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = createRequestLogger(request);
  try {
    const { id: projectId } = await params;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return unauthorized();
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, 'om-log-field-access');
    if (!rl.allowed) return rl.response;

    const [err, body] = await validateBody(request, omLogFieldAccessBodySchema);
    if (err) return err;
    if (!body) return validationError('Validation failed');

    const { verifyProjectAccess } = await import('@/lib/verify-project-access');
    const hasAccess = await verifyProjectAccess(supabase, projectId);
    if (!hasAccess) {
      return forbidden();
    }

    // Add projectId to each log entry
    const fieldLogs: FieldAccessLog[] = body.fields.map((field) => ({
      ...field,
      projectId,
    }));

    // Log to file
    await logFieldAccess(fieldLogs);

    return NextResponse.json({ 
      success: true, 
      logged: fieldLogs.length 
    });
  } catch (error) {
    log.error({ err: error }, 'Error logging field access');
    return NextResponse.json(
      { error: 'Failed to log field access' },
      { status: 500 }
    );
  }
}

