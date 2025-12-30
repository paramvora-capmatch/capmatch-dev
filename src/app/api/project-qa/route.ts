// src/app/api/project-qa/route.ts
// Proxy route that forwards requests to the backend AI Q&A service
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/apiConfig';

// Increase timeout for streaming responses (60 seconds)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.fieldContext || !body.projectContext) {
      return NextResponse.json({ error: 'Missing required context' }, { status: 400 });
    }

    // Check if request was already aborted
    if (req.signal?.aborted) {
      console.log('Request aborted before streaming');
      return new NextResponse(null, { status: 499 });
    }

    // Extract auth token from request headers
    const authHeader = req.headers.get('authorization');

    // Proxy to backend
    const backendUrl = getBackendUrl();
    const backendResponse = await fetch(`${backendUrl}/api/v1/ai/project-qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(body),
      signal: req.signal,
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend project-qa error:', errorText);
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
        console.error('Stream pipe error:', e);
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
      console.log('Stream aborted by client');
      return new NextResponse(null, { status: 499 });
    }

    console.error('project-qa proxy error:', {
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
