/**
 * Calendar Invite Service
 * Handles sending meeting invites to Google Calendar
 */

import { createClient } from '@supabase/supabase-js';
import { CalendarConnection } from '@/types/calendar-types';
import { ensureValidToken } from '@/lib/calendarTokenManager';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

interface MeetingInvite {
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  attendees: Array<{
    email: string;
    name?: string;
  }>;
  location?: string;
  meetingLink?: string;
}

interface CalendarEventResult {
  userId: string;
  provider: string;
  success: boolean;
  eventId?: string;
  eventLink?: string;
  error?: string;
}

/**
 * Create a Google Calendar event
 */
async function createGoogleCalendarEvent(
  connection: CalendarConnection,
  invite: MeetingInvite
): Promise<{ eventId: string; eventLink: string }> {
  // Ensure we have a valid access token
  const accessToken = await ensureValidToken(connection, supabaseAdmin);

  // Get the primary calendar ID or the first selected calendar
  const primaryCalendar = connection.calendar_list.find((cal) => cal.primary);
  const selectedCalendar = connection.calendar_list.find((cal) => cal.selected);
  const calendarId = primaryCalendar?.id || selectedCalendar?.id || 'primary';

  // Build description with meeting link prominently included
  let description = invite.description || '';
  if (invite.meetingLink) {
    description = `📹 Join Video Meeting: ${invite.meetingLink}\n\n${description}`;
  }

  // Build the event object for Google Calendar API
  const event = {
    summary: invite.title,
    description,
    location: invite.meetingLink || invite.location || '',
    start: {
      dateTime: invite.startTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: invite.endTime,
      timeZone: 'UTC',
    },
    attendees: invite.attendees.map((attendee) => ({
      email: attendee.email,
      displayName: attendee.name,
    })),
    reminders: {
      useDefault: true,
    },
  };

  // Create the event via Google Calendar API
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events?conferenceDataVersion=1&sendUpdates=all`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google Calendar API error: ${response.status} ${errorText}`
    );
  }

  const createdEvent = await response.json();

  return {
    eventId: createdEvent.id,
    eventLink: createdEvent.htmlLink,
  };
}

/**
 * Send calendar invites by creating an event on the organizer's calendar
 */
export async function sendCalendarInvites(
  organizerId: string,
  invite: MeetingInvite
): Promise<CalendarEventResult[]> {
  const results: CalendarEventResult[] = [];

  // Fetch calendar connection for the organizer
  const { data: connections, error: fetchError } = await supabaseAdmin
    .from('calendar_connections')
    .select('*')
    .eq('user_id', organizerId)
    .eq('sync_enabled', true);

  if (fetchError) {
    console.error('Error fetching calendar connections:', fetchError);
    throw new Error('Failed to fetch calendar connections');
  }

  if (!connections || connections.length === 0) {
    console.warn('No calendar connections found for organizer');
    return results;
  }

  // Send invite to each connected calendar (usually just one, but could be multiple providers)
  for (const connection of connections) {
    try {
      let eventId: string;
      let eventLink: string;

      if (connection.provider === 'google') {
        const result = await createGoogleCalendarEvent(connection, invite);
        eventId = result.eventId;
        eventLink = result.eventLink;

        // Set up push notifications for this calendar if not already done
        await ensureCalendarWatchIsActive(connection);
      } else {
        throw new Error(`Unsupported calendar provider: ${connection.provider}`);
      }

      results.push({
        userId: connection.user_id,
        provider: connection.provider,
        success: true,
        eventId,
        eventLink,
      });

      console.log(
        `Successfully created ${connection.provider} calendar event for user ${connection.user_id}`
      );
    } catch (error) {
      console.error(
        `Error creating calendar event for user ${connection.user_id}:`,
        error
      );

      results.push({
        userId: connection.user_id,
        provider: connection.provider,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Ensure a calendar connection has an active watch channel
 */
async function ensureCalendarWatchIsActive(
  connection: CalendarConnection
): Promise<void> {
  // Check if watch exists and is not expired
  if (connection.watch_channel_id && connection.watch_expiration) {
    const expiration = new Date(connection.watch_expiration);
    const now = new Date();

    // If watch is still valid for more than 24 hours, don't renew
    if (expiration.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
      console.log('Calendar watch is still active for connection:', connection.id);
      return;
    }
  }

  // Set up a new watch or renew the existing one
  try {
    const { setupCalendarWatch } = await import('@/services/calendarSyncService');
    await setupCalendarWatch(connection, supabaseAdmin);
    console.log('Calendar watch set up for connection:', connection.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's the HTTPS requirement error (common in local dev)
    if (errorMessage.includes('webhookUrlNotHttps') || errorMessage.includes('WebHook callback must be HTTPS')) {
      console.warn('⚠️  Calendar watch setup skipped: Google Calendar requires HTTPS for webhooks');
      console.warn('   This is expected in local development (http://localhost)');
      console.warn('   To enable real-time response sync locally, use ngrok:');
      console.warn('   1. Run: ngrok http 3000');
      console.warn('   2. Set NEXT_PUBLIC_SITE_URL to the ngrok HTTPS URL');
      console.warn('   3. Restart your dev server');
      console.warn('   → Calendar invites will still be sent, but responses won\'t auto-sync');
    } else {
      console.error('Error setting up calendar watch:', error);
    }
    // Don't fail the invite send if watch setup fails
  }
}

/**
 * Disconnect a calendar and stop its watch channel
 */
export async function disconnectCalendar(
  connection: CalendarConnection
): Promise<void> {
  try {
    const { stopCalendarWatch } = await import('@/services/calendarSyncService');
    await stopCalendarWatch(connection, supabaseAdmin);
    console.log('Stopped calendar watch for disconnected calendar');
  } catch (error) {
    console.error('Error stopping calendar watch during disconnect:', error);
    // Don't fail the disconnect if watch stop fails
  }
}

/**
 * Cancel/delete a calendar event for a specific user
 */
export async function cancelCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  try {
    // Fetch the user's calendar connections
    const { data: connections, error: fetchError } = await supabaseAdmin
      .from('calendar_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_enabled', true);

    if (fetchError || !connections || connections.length === 0) {
      console.error('No calendar connections found for user:', userId);
      return false;
    }

    // Try to delete from each provider (event ID should match one)
    for (const connection of connections) {
      const accessToken = await ensureValidToken(connection, supabaseAdmin);

      if (connection.provider === 'google') {
        const calendarId = 'primary'; // Could be more specific
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          console.log(`Deleted Google Calendar event ${eventId}`);
          return true;
        }
      } else if (connection.provider === 'microsoft') {
        const response = await fetch(
          `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          console.log(`Deleted Microsoft Calendar event ${eventId}`);
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Error canceling calendar event:', error);
    return false;
  }
}
