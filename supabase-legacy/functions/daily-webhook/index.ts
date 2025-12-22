// Supabase Edge Function: daily-webhook
// Daily.co Webhook Handler - Processes meeting events, transcripts, and recordings
// Migrated from Vercel API route to Supabase Edge Function

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import type {
  DailyWebhookPayload,
  MeetingSummary,
} from '../_shared/daily-types.ts'
import {
  generateMeetingSummary,
  parseWebVTTToText,
} from '../_shared/gemini-summarize.ts'

// Track processed transcript IDs to prevent duplicates
const processedTranscripts = new Set<string>()

// Serve the function
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse webhook payload
    const body = await req.json()
    console.log('Received Daily.co webhook - Full payload:', JSON.stringify(body, null, 2))

    const { type, payload } = body as DailyWebhookPayload

    // Create Supabase client with service role (bypasses RLS for webhooks)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Handle meeting.started event - auto-start transcription
    if (type === 'meeting.started') {
      const { room } = payload || {}

      if (!room) {
        console.error('Missing room name in meeting.started webhook')
        return new Response(
          JSON.stringify({ error: 'Invalid payload' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      console.log('Meeting started for room:', room)

      // Start transcription via Daily.co REST API
      try {
        const dailyApiKey = Deno.env.get('DAILY_API_KEY')
        if (!dailyApiKey) {
          console.error('DAILY_API_KEY not configured')
          return new Response(
            JSON.stringify({ received: true, warning: 'Transcription not started - API key missing' }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        const transcriptionResponse = await fetch(
          `https://api.daily.co/v1/rooms/${room}/transcription/start`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${dailyApiKey}`,
            },
          }
        )

        if (transcriptionResponse.ok) {
          console.log('Successfully started transcription for room:', room)
        } else {
          const errorData = await transcriptionResponse.json()
          console.error('Failed to start transcription:', errorData)
        }
      } catch (error) {
        console.error('Error starting transcription:', error)
      }

      return new Response(
        JSON.stringify({ received: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Handle transcript.ready-to-download event
    if (type === 'transcript.ready-to-download') {
      const { room_name, id, mtg_session_id, duration } = payload || {}

      if (!room_name || !id) {
        console.error('Missing required fields in webhook payload')
        return new Response(
          JSON.stringify({ error: 'Invalid payload' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Check if already processed (deduplication)
      if (processedTranscripts.has(id)) {
        console.log(`Transcript ${id} already being processed, skipping duplicate`)
        return new Response(
          JSON.stringify({ received: true, duplicate: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Mark as processing
      processedTranscripts.add(id)

      console.log('Transcript ready:', { room_name, transcript_id: id, mtg_session_id, duration })

      // Process async and return immediately to prevent Daily.co retries
      processTranscript(supabase, room_name, id).catch((error) => {
        console.error('Error in async transcript processing:', error)
        // Remove from set on error so it can be retried
        processedTranscripts.delete(id)
      })

      // Return success immediately (< 1 second response time)
      return new Response(
        JSON.stringify({ received: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Handle recording.ready and recording.upload-complete events
    if (type === 'recording.ready' || type === 'recording.upload-complete') {
      const roomName = payload.room || payload.room_name

      if (!roomName) {
        console.error('No room name in webhook payload')
        return new Response(
          JSON.stringify({ error: 'Invalid webhook payload' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Find meeting with this room name
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('id')
        .ilike('meeting_link', `%${roomName}%`)
        .single()

      if (meetingError || !meeting) {
        console.warn(`No meeting found for room: ${roomName}`)
        // Return 200 to acknowledge webhook even if meeting not found
        return new Response(
          JSON.stringify({ received: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      await handleRecordingReady(supabase, meeting.id, body)

      return new Response(
        JSON.stringify({ received: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Handle meeting.ended event
    if (type === 'meeting.ended') {
      const roomName = payload.room || payload.room_name

      if (!roomName) {
        console.error('No room name in webhook payload')
        return new Response(
          JSON.stringify({ error: 'Invalid webhook payload' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Find meeting with this room name
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('id')
        .ilike('meeting_link', `%${roomName}%`)
        .single()

      if (meetingError || !meeting) {
        console.warn(`No meeting found for room: ${roomName}`)
        return new Response(
          JSON.stringify({ received: true }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      await handleMeetingEnded(supabase, meeting.id, body)

      return new Response(
        JSON.stringify({ received: true }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Acknowledge other event types
    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error processing Daily.co webhook:', error)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

// Async processing function - runs in background
async function processTranscript(
  supabase: any,
  room_name: string,
  transcript_id: string
) {
  try {
    const dailyApiKey = Deno.env.get('DAILY_API_KEY')
    if (!dailyApiKey) {
      console.error('DAILY_API_KEY not configured')
      return
    }

    // Fetch transcript details from Daily.co to get full metadata
    const transcriptResponse = await fetch(
      `https://api.daily.co/v1/transcript/${transcript_id}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dailyApiKey}`,
        },
      }
    )

    if (!transcriptResponse.ok) {
      console.error('Failed to fetch transcript details from Daily.co')
      return
    }

    const transcriptData = await transcriptResponse.json()

    console.log('Transcript details:', {
      transcriptId: transcriptData.transcriptId,
      status: transcriptData.status,
      roomName: transcriptData.roomName,
    })

    // Fetch the transcript download link
    const linkResponse = await fetch(
      `https://api.daily.co/v1/transcript/${transcript_id}/access-link`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dailyApiKey}`,
        },
      }
    )

    let transcriptContent = null
    if (linkResponse.ok) {
      const linkData = await linkResponse.json()

      // Download the actual WebVTT content
      if (linkData.link) {
        try {
          const vttResponse = await fetch(linkData.link)
          if (vttResponse.ok) {
            transcriptContent = await vttResponse.text()
            console.log('Successfully downloaded transcript content')
          } else {
            console.error('Failed to download VTT content:', vttResponse.status)
          }
        } catch (error) {
          console.error('Error downloading VTT content:', error)
        }
      }
    } else {
      console.error('Failed to fetch transcript access link:', linkResponse.status)
    }

    // Generate AI summary if we have transcript content
    let summary = null
    if (transcriptContent) {
      console.log('Generating AI summary for transcript...')
      try {
        const transcriptText = parseWebVTTToText(transcriptContent)
        summary = await generateMeetingSummary(transcriptText)
        if (summary) {
          console.log('Successfully generated AI summary')
        } else {
          console.log('Failed to generate AI summary')
        }
      } catch (error) {
        console.error('Error generating summary:', error)
      }
    }

    // Save transcript and summary to meetings table
    // (bypasses RLS since webhooks don't have user authentication)
    // Find the meeting by room_name (exact match)
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        transcript_text: transcriptContent,
        summary: summary ? JSON.stringify(summary) : null,
        status: 'completed',
      })
      .eq('room_name', room_name)

    if (updateError) {
      console.error('Error updating meeting with transcript:', updateError)
      throw updateError
    } else {
      console.log('Successfully saved transcript and summary for room:', room_name)
      // Remove from processing set on success
      processedTranscripts.delete(transcript_id)
    }
  } catch (error) {
    console.error('Error in processTranscript:', error)
    throw error
  }
}

// Handler for recording ready events
async function handleRecordingReady(
  supabase: any,
  meetingId: string,
  payload: DailyWebhookPayload
) {
  const recording = payload.payload.recording

  if (!recording) {
    console.error('No recording data in payload')
    return
  }

  const recordingUrl = recording.download_link || recording.share_token

  if (!recordingUrl) {
    console.error('No recording URL in payload')
    return
  }

  console.log(`Updating meeting ${meetingId} with recording URL`)

  const { error } = await supabase
    .from('meetings')
    .update({
      recording_url: recordingUrl,
      status: 'completed',
    })
    .eq('id', meetingId)

  if (error) {
    console.error('Failed to update meeting with recording:', error)
  } else {
    console.log('Successfully updated meeting with recording URL')
  }
}

// Handler for meeting ended events
async function handleMeetingEnded(
  supabase: any,
  meetingId: string,
  payload: DailyWebhookPayload
) {
  console.log(`Meeting ${meetingId} has ended`)

  const { error } = await supabase
    .from('meetings')
    .update({
      status: 'completed',
    })
    .eq('id', meetingId)

  if (error) {
    console.error('Failed to update meeting status:', error)
  } else {
    console.log('Successfully marked meeting as completed')
  }
}
