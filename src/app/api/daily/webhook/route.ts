// src/app/api/daily/webhook/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { DailyWebhookPayload } from '@/types/daily-types';

/**
 * Daily.co Webhook Handler
 *
 * This endpoint receives webhooks from Daily.co for events like:
 * - recording.ready - Recording is available for download
 * - transcription.ready - Transcript is ready
 * - meeting.ended - Meeting has ended
 *
 * Webhook URL to configure in Daily.co dashboard:
 * https://your-domain.com/api/daily/webhook
 */

// Create Supabase client with service role for server-side operations
function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: Request) {
  try {
    // Parse webhook payload
    const payload: DailyWebhookPayload = await request.json();

    console.log('Received Daily.co webhook:', {
      type: payload.type,
      event: payload.event,
    });

    // Get room name from payload
    const roomName = payload.payload.room || payload.payload.room_name;

    if (!roomName) {
      console.error('No room name in webhook payload');
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = getSupabaseServiceClient();

    // Find meeting with this room name
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id')
      .ilike('meeting_link', `%${roomName}%`)
      .single();

    if (meetingError || !meeting) {
      console.warn(`No meeting found for room: ${roomName}`);
      // Return 200 to acknowledge webhook even if meeting not found
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Handle different webhook event types
    switch (payload.type) {
      case 'recording.ready':
      case 'recording.upload-complete':
        await handleRecordingReady(supabase, meeting.id, payload);
        break;

      case 'transcription.ready':
        await handleTranscriptionReady(supabase, meeting.id, payload);
        break;

      case 'meeting.ended':
        await handleMeetingEnded(supabase, meeting.id, payload);
        break;

      default:
        console.log(`Unhandled webhook type: ${payload.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing Daily.co webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Handler for recording ready events
async function handleRecordingReady(
  supabase: any,
  meetingId: string,
  payload: DailyWebhookPayload
) {
  const recording = payload.payload.recording;

  if (!recording) {
    console.error('No recording data in payload');
    return;
  }

  const recordingUrl = recording.download_link || recording.share_token;

  if (!recordingUrl) {
    console.error('No recording URL in payload');
    return;
  }

  console.log(`Updating meeting ${meetingId} with recording URL`);

  const { error } = await supabase
    .from('meetings')
    .update({
      recording_url: recordingUrl,
      status: 'completed',
    })
    .eq('id', meetingId);

  if (error) {
    console.error('Failed to update meeting with recording:', error);
  } else {
    console.log('Successfully updated meeting with recording URL');
  }
}

// Handler for transcription ready events
async function handleTranscriptionReady(
  supabase: any,
  meetingId: string,
  payload: DailyWebhookPayload
) {
  const transcription = payload.payload.transcription;

  if (!transcription) {
    console.error('No transcription data in payload');
    return;
  }

  const transcriptText = transcription.transcript;

  if (!transcriptText) {
    console.error('No transcript text in payload');
    return;
  }

  console.log(`Updating meeting ${meetingId} with transcript`);

  const { error } = await supabase
    .from('meetings')
    .update({
      transcript_text: transcriptText,
    })
    .eq('id', meetingId);

  if (error) {
    console.error('Failed to update meeting with transcript:', error);
  } else {
    console.log('Successfully updated meeting with transcript');
  }
}

// Handler for meeting ended events
async function handleMeetingEnded(
  supabase: any,
  meetingId: string,
  payload: DailyWebhookPayload
) {
  console.log(`Meeting ${meetingId} has ended`);

  const { error } = await supabase
    .from('meetings')
    .update({
      status: 'completed',
    })
    .eq('id', meetingId);

  if (error) {
    console.error('Failed to update meeting status:', error);
  } else {
    console.log('Successfully marked meeting as completed');
  }
}
