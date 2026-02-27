// src/app/api/om-qa/route.ts
// Proxy route that forwards requests to the backend AI Q&A service
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/apiConfig';
import { validateBody, omQaBodySchema } from '@/lib/api-validation';
import { unauthorized, validationError } from '@/lib/api-errors';
import { createRequestLogger } from '@/lib/logger';
import { checkRateLimit, getRateLimitId, AI_RATE_LIMIT } from '@/lib/rate-limit';
import { getSupabaseAccessTokenFromRequest } from '@/lib/supabase/auth-token';
import {
  scenarioData,
  marketComps,
  marketContextDetails,
  dealSnapshotDetails,
  assetProfileDetails,
  financialDetails,
  capitalStackData,
  employerData,
  sponsorDeals,
  certifications,
  projectOverview,
} from "@/services/mockOMData";

// Increase timeout for streaming responses (60 seconds)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Function to prepare OM data for the backend
function prepareOMData() {
  return {
    scenarioData,
    marketComps,
    marketContextDetails,
    dealSnapshotDetails,
    assetProfileDetails,
    financialDetails,
    capitalStackData,
    employerData,
    sponsorDeals,
    certifications,
    projectOverview,
  };
}

export async function POST(req: NextRequest) {
  const log = createRequestLogger(req);
  try {
    const [err, parsed] = await validateBody(req, omQaBodySchema);
    if (err) return err;
    const question = parsed?.question;
    if (!question) return validationError('Missing question');

    // Check if request was already aborted
    if (req.signal?.aborted) {
      log.info('Request aborted before streaming');
      return new NextResponse(null, { status: 499 });
    }

    // Prepare OM data to send to backend
    const omData = prepareOMData();

    // Verify user server-side (getUser validates JWT)
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return unauthorized();
    }
    const accessToken = getSupabaseAccessTokenFromRequest(req);

    const rlId = getRateLimitId(req, user.id);
    const rl = checkRateLimit(rlId, AI_RATE_LIMIT, 'om-qa');
    if (!rl.allowed) return rl.response;

    // Proxy to backend
    const backendUrl = getBackendUrl();
    const backendResponse = await fetch(`${backendUrl}/api/v1/ai/om-qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      body: JSON.stringify({
        question,
        omData,
      }),
      signal: req.signal,
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      log.error({ errorText, status: backendResponse.status }, 'Backend om-qa error');
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
  } catch (e: any) {
    // Handle abort errors gracefully
    if (e?.name === 'AbortError' || req.signal?.aborted) {
      log.info('Stream aborted by client');
      return new NextResponse(null, { status: 499 });
    }

    log.error({ err: e }, 'om-qa proxy error');
    return NextResponse.json(
      { error: 'Failed to get answer' },
      { status: 500 }
    );
  }
}
