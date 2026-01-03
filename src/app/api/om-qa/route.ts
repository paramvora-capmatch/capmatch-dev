// src/app/api/om-qa/route.ts
// Proxy route that forwards requests to the backend AI Q&A service
import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/apiConfig';
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
  try {
    const { question } = await req.json();
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 });
    }

    // Check if request was already aborted
    if (req.signal?.aborted) {
      console.log('Request aborted before streaming');
      return new NextResponse(null, { status: 499 });
    }

    // Prepare OM data to send to backend
    const omData = prepareOMData();

    // Get authenticated Supabase client and session
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Proxy to backend
    const backendUrl = getBackendUrl();
    const backendResponse = await fetch(`${backendUrl}/api/v1/ai/om-qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
      },
      body: JSON.stringify({
        question,
        omData,
      }),
      signal: req.signal,
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('Backend om-qa error:', errorText);
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

    console.error('om-qa proxy error:', e);
    return NextResponse.json(
      { error: 'Failed to get answer' },
      { status: 500 }
    );
  }
}
