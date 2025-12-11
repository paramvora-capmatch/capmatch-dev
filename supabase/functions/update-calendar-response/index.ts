
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { ensureValidToken } from '../_shared/calendar-utils.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify the user using the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request body
    const { meeting_id, user_id, status } = await req.json()

    if (!meeting_id || !user_id || !status) {
      throw new Error('Missing required fields: meeting_id, user_id, status')
    }

    // 3. Enforce ownership: User can only update their own status
    if (user.id !== user_id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You can only update your own status' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Initialize Service Role Client for database operations
    // We use service role here to ensure we can update the table and read calendar connections
    // regardless of RLS policies (since we've already verified ownership above)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Map status to Google Calendar format
    let googleStatus = status
    if (status === 'pending') {
        googleStatus = 'needsAction'
    }

    // 0. Update meeting_participants table in Supabase
    // This ensures the database is always in sync, even if called from scripts/API
    const { error: updateError } = await supabaseClient
      .from('meeting_participants')
      .update({
        response_status: status,
        responded_at: new Date().toISOString(),
      })
      .eq('meeting_id', meeting_id)
      .eq('user_id', user_id)

    if (updateError) {
      console.error('Failed to update meeting_participants:', updateError)
      throw new Error(`Failed to update database: ${updateError.message}`)
    }

    // 1. Get meeting details
    const { data: meeting, error: meetingError } = await supabaseClient
      .from('meetings')
      .select('calendar_event_ids')
      .eq('id', meeting_id)
      .single()

    if (meetingError || !meeting) {
      console.error('Meeting not found:', meetingError)
      throw new Error('Meeting not found')
    }

    // 2. Get user email
    const { data: userData, error: userError } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .single()
      
    if (userError || !userData) {
       console.error('User not found:', userError)
       throw new Error('User not found')
    }
    const userEmail = userData.email

    // 3. Get user's calendar connection
    // We prioritize 'google' provider. If multiple, take the most recently updated one?
    // Or just the first one found.
    const { data: connections, error: connError } = await supabaseClient
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user_id)
      .eq('provider', 'google')
    
    const connection = connections && connections.length > 0 ? connections[0] : null

    // If no connection, we can't sync to Google Calendar as the attendee
    if (!connection) {
      console.log('No calendar connection for user, skipping Google Calendar sync')
      return new Response(
        JSON.stringify({ message: 'Updated local status only (no calendar connection)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Sync to Google Calendar
    console.log(`Syncing status ${status} for user ${userEmail} to Google Calendar...`)
    const accessToken = await ensureValidToken(connection, supabaseClient)
    
    // calendar_event_ids is JSONB, so it might be an array or null
    const eventObjects = Array.isArray(meeting.calendar_event_ids) 
      ? meeting.calendar_event_ids 
      : (meeting.calendar_event_ids ? [meeting.calendar_event_ids] : [])

    let successCount = 0

    for (const eventObj of eventObjects) {
      // Handle both string IDs (legacy) and object IDs
      const eventId = typeof eventObj === 'string' ? eventObj : eventObj?.eventId
      
      if (!eventId) {
        console.log('Skipping invalid event ID object:', eventObj)
        continue
      }

      try {
        // Fetch event to get current attendees
        // We use 'primary' calendar because we are using the user's token
        const getResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        if (!getResponse.ok) {
          console.error(`Failed to fetch event ${eventId}: ${getResponse.status} ${getResponse.statusText}`)
          // If 404, maybe the event is not on their primary calendar? 
          // Or the ID is different? (Usually ID is consistent if invited)
          continue
        }

        const event = await getResponse.json()
        
        if (!event.attendees) {
            console.log(`No attendees in event ${eventId}`)
            continue
        }

        // Update attendee status
        let foundUser = false
        const updatedAttendees = event.attendees.map((attendee: any) => {
          if (attendee.email === userEmail) {
            foundUser = true
            return { ...attendee, responseStatus: googleStatus }
          }
          return attendee
        })

        if (!foundUser) {
            console.log(`User ${userEmail} not found in attendees list for event ${eventId}`)
            continue
        }

        // Patch event
        const patchResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              attendees: updatedAttendees
            })
          }
        )

        if (!patchResponse.ok) {
           const errText = await patchResponse.text()
           console.error(`Failed to patch event ${eventId}: ${errText}`)
        } else {
            console.log(`Successfully updated event ${eventId} status to ${googleStatus}`)
            successCount++
        }

      } catch (err) {
        console.error(`Error processing event ${eventId}:`, err)
      }
    }

    return new Response(
      JSON.stringify({ message: `Sync completed. Updated ${successCount} events.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in update-calendar-response:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
