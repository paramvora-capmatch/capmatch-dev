import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyProjectAccess } from '@/lib/verify-project-access';
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/api-validation';
import { unauthorized, forbidden } from '@/lib/api-errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return unauthorized();
  }

  const { id: projectId } = await params;
  const hasAccess = await verifyProjectAccess(supabase, projectId);
  if (!hasAccess) {
    return forbidden();
  }

  const rlId = getRateLimitId(request, user.id);
  const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, 'om-generate-insights');
  if (!rl.allowed) return rl.response;

  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    const authHeader = request.headers.get('Authorization');

    const response = await fetch(
      `${backendUrl}/api/v1/projects/${projectId}/om/generate-insights`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader && { 'Authorization': authHeader }),
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to generate insights');
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to generate insights');
  }
}

