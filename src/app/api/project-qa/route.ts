// src/app/api/project-qa/route.ts
// Proxy route that forwards requests to the backend AI Q&A service
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/apiConfig';
import { validateBody, projectQaBodySchema } from '@/lib/api-validation';
import { unauthorized, validationError } from '@/lib/api-errors';
import { checkRateLimit, getRateLimitId, AI_RATE_LIMIT } from '@/lib/rate-limit';
import { getSupabaseAccessTokenFromRequest } from '@/lib/supabase/auth-token';
import { createRequestLogger } from '@/lib/logger';

// Increase timeout for streaming responses (60 seconds)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const log = createRequestLogger(req);
  try {
    const [err, body] = await validateBody(req, projectQaBodySchema);
    if (err) return err;
    if (!body) return validationError('Validation failed');

    // Check if request was already aborted
    if (req.signal?.aborted) {
      log.info('Request aborted before streaming');
      return new NextResponse(null, { status: 499 });
    }

    // Verify user server-side (getUser validates JWT)
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return unauthorized();
    }
    const accessToken = getSupabaseAccessTokenFromRequest(req);

    const rlId = getRateLimitId(req, user.id);
    const rl = checkRateLimit(rlId, AI_RATE_LIMIT, 'project-qa');
    if (!rl.allowed) return rl.response;

    // Proxy to backend
    const backendUrl = getBackendUrl();
    const backendResponse = await fetch(`${backendUrl}/api/v1/ai/project-qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify(body),
      signal: req.signal,
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      log.error({ errorText, status: backendResponse.status }, 'Backend project-qa error');
      return NextResponse.json(
        { error: `Backend AI service failed: ${backendResponse.statusText}` },
        { status: backendResponse.status }
      );
    }

    // Create a TransformStream to pipe chunks through immediately
    const { readable, writable } = new TransformStream();

    // Pipe the backend response through, chunk by chunk
    (async () => {
      const reader = backendResponse.body?.getReader();
      const writer = writable.getWriter();

      if (!reader) {
        await writer.close();
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (e) {
        log.error({ err: e }, 'Stream pipe error');
      } finally {
        await writer.close();
      }
    })();

    // Return the readable side immediately
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'name' in e && (e as Error).name === 'AbortError') {
      return new NextResponse(null, { status: 499 });
    }
    if (req.signal?.aborted) {
      return new NextResponse(null, { status: 499 });
    }
    log.error({ err: e }, 'project-qa proxy error');
    const statusCode = e && typeof e === 'object' && 'status' in e ? Number((e as { status: number }).status) : 500;
    return NextResponse.json(
      { error: 'Failed to get answer' },
      { status: Number.isFinite(statusCode) ? statusCode : 500 }
    );
  }
}
