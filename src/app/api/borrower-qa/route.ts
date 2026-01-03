// src/app/api/borrower-qa/route.ts
// Proxy route that forwards requests to the backend AI Q&A service
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/apiConfig';

// Increase timeout for streaming responses (60 seconds)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.fieldContext || !body.borrowerContext) {
      return NextResponse.json({ error: 'Missing required context' }, { status: 400 });
    }

    // Check if request was already aborted
    if (req.signal?.aborted) {
      console.log('Request aborted before streaming');
      return new NextResponse(null, { status: 499 });
    }

    // Get authenticated Supabase client and session
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Proxy to backend
    const backendUrl = getBackendUrl();
    const backendResponse = await fetch(`${backendUrl}/api/v1/ai/borrower-qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
      },
      body: JSON.stringify(body),
      signal: req.signal,
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend borrower-qa error:', errorText);
      return NextResponse.json(
        { error: `Backend AI service failed: ${backendResponse.statusText}` },
        { status: backendResponse.status }
      );
    }

    // Create a TransformStream to pipe chunks through immediately
    const { readable, writable } = new TransformStream();
    const requestStartTime = Date.now();
    let chunkCount = 0;
    let firstChunkTime: number | null = null;
    let totalBytes = 0;

    console.log('[PROXY] Starting to pipe backend response to frontend');

    // Pipe the backend response through, chunk by chunk
    (async () => {
      const reader = backendResponse.body?.getReader();
      const writer = writable.getWriter();

      if (!reader) {
        console.warn('[PROXY] No response body reader available');
        await writer.close();
        return;
      }

      try {
        while (true) {
          const readStart = Date.now();
          const { done, value } = await reader.read();
          const readTime = Date.now() - readStart;

          if (done) {
            const elapsed = Date.now() - requestStartTime;
            console.log(`[PROXY] Stream complete: ${chunkCount} chunks, ${totalBytes} bytes, ${elapsed}ms elapsed`);
            break;
          }

          chunkCount++;
          totalBytes += value.length;
          const currentTime = Date.now();

          if (firstChunkTime === null) {
            firstChunkTime = currentTime;
            const timeToFirstChunk = currentTime - requestStartTime;
            console.log(`[PROXY] First chunk received from backend (took ${timeToFirstChunk}ms, size=${value.length} bytes)`);
          } else {
            const timeSinceFirst = currentTime - firstChunkTime;
            const preview = new TextDecoder().decode(value.slice(0, Math.min(50, value.length)));
            console.log(`[PROXY] Chunk #${chunkCount} from backend (time=${timeSinceFirst}ms, size=${value.length} bytes, read_time=${readTime}ms, preview=${JSON.stringify(preview)})`);
          }

          const writeStart = Date.now();
          await writer.write(value);
          const writeTime = Date.now() - writeStart;
          if (writeTime > 10) {
            console.log(`[PROXY] Chunk #${chunkCount} write took ${writeTime}ms`);
          }
        }
      } catch (e) {
        console.error('[PROXY] Stream pipe error:', e);
      } finally {
        await writer.close();
        console.log('[PROXY] Writer closed');
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
      console.log('Stream aborted by client');
      return new NextResponse(null, { status: 499 });
    }

    console.error('borrower-qa proxy error:', {
      message: e?.message,
      name: e?.name,
      stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined,
    });

    const errorMessage = e?.message || 'Failed to get answer';
    const statusCode = e?.status || e?.statusCode || 500;

    return NextResponse.json(
      {
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { details: e?.stack })
      },
      { status: statusCode }
    );
  }
}
