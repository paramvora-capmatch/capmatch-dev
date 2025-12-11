/**
 * Calendar Sync Service
 *
 * Handles syncing calendar event data, particularly attendee responses,
 * from Google Calendar back to the meeting_participants table.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { CalendarConnection } from '@/types/calendar-types';
import { ensureValidToken } from '@/lib/calendarTokenManager';
import { ParticipantResponseStatus } from '@/types/meeting-types';

interface GoogleCalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus: 'needsAction' | 'accepted' | 'declined' | 'tentative';
  self?: boolean;
  organizer?: boolean;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: GoogleCalendarAttendee[];
  status: string;
}

/**
 * Map Google Calendar response status to our ParticipantResponseStatus
 */
function mapGoogleResponseStatus(
  googleStatus: string
): ParticipantResponseStatus {
  switch (googleStatus) {
    case 'accepted':
      return 'accepted';
    case 'declined':
      return 'declined';
    case 'tentative':
      return 'tentative';
    case 'needsAction':
    default:
      return 'pending';
  }
}

/**
 * Sync attendee responses for all events in a calendar connection
 */
export async function syncEventAttendeeResponses(
  connection: CalendarConnection,
  supabaseAdmin?: SupabaseClient
): Promise<void> {
  // Use provided client or create a new one
  const supabase =
    supabaseAdmin ||
    (await import('@supabase/supabase-js')).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

  try {
    // Get all meetings for this user where they are the organizer
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('id, calendar_event_ids')
      .eq('organizer_id', connection.user_id)
      .eq('status', 'scheduled') // Only sync scheduled meetings
      .not('calendar_event_ids', 'eq', '[]'); // Has calendar events

    if (meetingsError) {
      console.error('Error fetching meetings:', meetingsError);
      throw meetingsError;
    }

    if (!meetings || meetings.length === 0) {
      console.log('No meetings to sync for user:', connection.user_id);
      return;
    }

    console.log(`Syncing ${meetings.length} meetings for user ${connection.user_id}`);

    // Ensure we have a valid access token
    const accessToken = await ensureValidToken(connection, supabase);

    // Get the calendar ID
    const primaryCalendar = connection.calendar_list.find((cal) => cal.primary);
    const selectedCalendar = connection.calendar_list.find((cal) => cal.selected);
    const calendarId = primaryCalendar?.id || selectedCalendar?.id || 'primary';

    // Process each meeting
    for (const meeting of meetings) {
      const calendarEventIds = meeting.calendar_event_ids as Array<{
        userId: string;
        provider: string;
        eventId: string;
      }>;

      // Find the event ID for this provider
      const eventInfo = calendarEventIds.find(
        (event) =>
          event.provider === connection.provider &&
          event.userId === connection.user_id
      );

      if (!eventInfo) {
        console.log('No calendar event ID found for meeting:', meeting.id);
        continue;
      }

      try {
        // Fetch the event from Google Calendar
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
            calendarId
          )}/events/${eventInfo.eventId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          console.error(
            `Failed to fetch event ${eventInfo.eventId}:`,
            response.status
          );
          continue;
        }

        const event: GoogleCalendarEvent = await response.json();

        // Update attendee responses
        if (event.attendees && event.attendees.length > 0) {
          await syncAttendeesForMeeting(
            supabase,
            meeting.id,
            event.attendees
          );
        }
      } catch (eventError) {
        console.error(
          `Error syncing event ${eventInfo.eventId}:`,
          eventError
        );
        // Continue with next meeting
      }
    }

    console.log('Successfully synced attendee responses');
  } catch (error) {
    console.error('Error in syncEventAttendeeResponses:', error);
    throw error;
  }
}

/**
 * Update meeting_participants table with attendee responses from a single event
 * Uses batch processing to minimize realtime subscription triggers
 */
async function syncAttendeesForMeeting(
  supabase: SupabaseClient,
  meetingId: string,
  attendees: GoogleCalendarAttendee[]
): Promise<void> {
  console.log(`Syncing ${attendees.length} attendees for meeting ${meetingId}`);

  // First, fetch all profiles in a single query
  const attendeeEmails = attendees.map(a => a.email);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', attendeeEmails);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('No profiles found for attendees');
    return;
  }

  // Create a map of email to profile ID
  const emailToProfileId = new Map(
    profiles.map(p => [p.email, p.id])
  );

  // Prepare batch updates
  const updates = attendees
    .map(attendee => {
      const profileId = emailToProfileId.get(attendee.email);
      if (!profileId) {
        console.log(`No profile found for email ${attendee.email}`);
        return null;
      }

      return {
        meeting_id: meetingId,
        user_id: profileId,
        response_status: mapGoogleResponseStatus(attendee.responseStatus),
        responded_at: new Date().toISOString(),
      };
    })
    .filter((update): update is NonNullable<typeof update> => update !== null);

  if (updates.length === 0) {
    console.log('No updates to process');
    return;
  }

  // Perform updates individually but in quick succession
  // Note: Supabase doesn't support batch upserts with conditions, so we still need individual updates
  // However, the debouncing in useMeetings will batch the realtime events
  const updatePromises = updates.map(update =>
    supabase
      .from('meeting_participants')
      .update({
        response_status: update.response_status,
        responded_at: update.responded_at,
      })
      .eq('meeting_id', update.meeting_id)
      .eq('user_id', update.user_id)
  );

  const results = await Promise.allSettled(updatePromises);
  
  // Log results
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && !result.value.error) {
      console.log(
        `Updated participant ${updates[index].user_id} status to ${updates[index].response_status}`
      );
    } else {
      console.error(
        `Error updating participant ${updates[index].user_id}:`,
        result.status === 'fulfilled' ? result.value.error : result.reason
      );
    }
  });
}

/**
 * Set up a push notification watch on a user's calendar
 * Returns the channel ID and resource ID for tracking
 */
export async function setupCalendarWatch(
  connection: CalendarConnection,
  supabase: SupabaseClient
): Promise<{
  channelId: string;
  resourceId: string;
  expiration: string;
}> {
  try {
    // Ensure we have a valid access token
    const accessToken = await ensureValidToken(connection, supabase);

    // Get the calendar ID
    const primaryCalendar = connection.calendar_list.find((cal) => cal.primary);
    const selectedCalendar = connection.calendar_list.find((cal) => cal.selected);
    const calendarId = primaryCalendar?.id || selectedCalendar?.id || 'primary';

    // Generate a unique channel ID
    const channelId = `capmatch-${connection.id}-${Date.now()}`;

    // Webhook URL - must be HTTPS in production
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/calendar/webhook`;

    // Set up the watch request
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events/watch`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          // Watch for 7 days (max allowed is 30 days)
          expiration: Date.now() + 7 * 24 * 60 * 60 * 1000,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to set up calendar watch: ${response.status} ${errorText}`
      );
    }

    const watchResponse = await response.json();

    console.log('Calendar watch set up:', {
      channelId,
      resourceId: watchResponse.resourceId,
      expiration: new Date(parseInt(watchResponse.expiration)),
    });

    // Store the watch channel info in the database
    const expirationDate = new Date(parseInt(watchResponse.expiration));

    await supabase
      .from('calendar_connections')
      .update({
        watch_channel_id: channelId,
        watch_resource_id: watchResponse.resourceId,
        watch_expiration: expirationDate.toISOString(),
      })
      .eq('id', connection.id);

    return {
      channelId,
      resourceId: watchResponse.resourceId,
      expiration: expirationDate.toISOString(),
    };
  } catch (error) {
    console.error('Error setting up calendar watch:', error);
    throw error;
  }
}

/**
 * Stop watching a calendar (cleanup when disconnecting)
 */
export async function stopCalendarWatch(
  connection: CalendarConnection,
  supabase: SupabaseClient
): Promise<void> {
  if (!connection.watch_channel_id || !connection.watch_resource_id) {
    console.log('No active watch to stop for connection:', connection.id);
    return;
  }

  try {
    // Ensure we have a valid access token
    const accessToken = await ensureValidToken(connection, supabase);

    // Stop the watch
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/channels/stop',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: connection.watch_channel_id,
          resourceId: connection.watch_resource_id,
        }),
      }
    );

    if (!response.ok) {
      console.error('Failed to stop calendar watch:', response.status);
    } else {
      console.log('Calendar watch stopped successfully');
    }

    // Clear the watch fields from the database
    await supabase
      .from('calendar_connections')
      .update({
        watch_channel_id: null,
        watch_resource_id: null,
        watch_expiration: null,
      })
      .eq('id', connection.id);
  } catch (error) {
    console.error('Error stopping calendar watch:', error);
    throw error;
  }
}

/**
 * Renew expired watch channels (should be called by a cron job)
 */
export async function renewExpiredWatches(
  supabase: SupabaseClient
): Promise<void> {
  try {
    // Find connections with expired or soon-to-expire watches (within 24 hours)
    const expirationThreshold = new Date();
    expirationThreshold.setHours(expirationThreshold.getHours() + 24);

    const { data: connections, error: fetchError } = await supabase
      .from('calendar_connections')
      .select('*')
      .not('watch_channel_id', 'is', null)
      .lte('watch_expiration', expirationThreshold.toISOString());

    if (fetchError) {
      console.error('Error fetching connections to renew:', fetchError);
      throw fetchError;
    }

    if (!connections || connections.length === 0) {
      console.log('No watches to renew');
      return;
    }

    console.log(`Renewing ${connections.length} watch channels`);

    for (const connection of connections) {
      try {
        // Stop the old watch
        await stopCalendarWatch(connection, supabase);

        // Set up a new watch
        await setupCalendarWatch(connection, supabase);

        console.log(`Renewed watch for connection ${connection.id}`);
      } catch (renewError) {
        console.error(
          `Error renewing watch for connection ${connection.id}:`,
          renewError
        );
        // Continue with next connection
      }
    }

    console.log('Finished renewing watches');
  } catch (error) {
    console.error('Error in renewExpiredWatches:', error);
    throw error;
  }
}
