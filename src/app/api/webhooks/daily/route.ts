// src/app/api/webhooks/daily/route.ts
// Webhook handler for Daily.co transcript events
// Processes transcripts, generates AI summaries, and stores in meetings table

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateMeetingSummary, parseWebVTTToText } from '@/lib/gemini-summarize'

// Create service role client for webhook (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE configuration. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
  )
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Track processed transcript IDs to prevent duplicates
const processedTranscripts = new Set<string>()

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log('Received Daily.co webhook - Full payload:', JSON.stringify(body, null, 2))

    const { type, payload } = body

    // Handle meeting.started event - auto-start transcription
    if (type === 'meeting.started') {
      const { room } = payload || {}

      if (!room) {
        console.error('Missing room name in meeting.started webhook')
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
      }

      console.log('Meeting started for room:', room)

      // Start transcription via Daily.co REST API
      try {
        const transcriptionResponse = await fetch(
          `https://api.daily.co/v1/rooms/${room}/transcription/start`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
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

      return NextResponse.json({ received: true })
    }

    // Handle transcript.ready-to-download event
    if (type === 'transcript.ready-to-download') {
      const { room_name, id, mtg_session_id, duration } = payload || {}

      if (!room_name || !id) {
        console.error('Missing required fields in webhook payload')
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
      }

      // Check if already processed (deduplication)
      if (processedTranscripts.has(id)) {
        console.log(`Transcript ${id} already being processed, skipping duplicate`)
        return NextResponse.json({ received: true, duplicate: true })
      }

      // Mark as processing
      processedTranscripts.add(id)

      console.log('Transcript ready:', { room_name, transcript_id: id, mtg_session_id, duration })

      // Process async and return immediately to prevent Daily.co retries
      processTranscript(room_name, id).catch((error) => {
        console.error('Error in async transcript processing:', error)
        // Remove from set on error so it can be retried
        processedTranscripts.delete(id)
      })

      // Return success immediately (< 1 second response time)
      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Async processing function - runs in background
async function processTranscript(room_name: string, transcript_id: string) {
  try {
    // Fetch transcript details from Daily.co to get full metadata
    const transcriptResponse = await fetch(
      `https://api.daily.co/v1/transcript/${transcript_id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
          },
        }
      )

      if (!transcriptResponse.ok) {
        console.error('Failed to fetch transcript details from Daily.co')
        return NextResponse.json({ received: true })
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
            Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
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
    const { error: updateError } = await supabaseAdmin
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
