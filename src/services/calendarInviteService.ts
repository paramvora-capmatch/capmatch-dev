/**
 * Calendar Invite Service
 * Handles sending meeting invites to Google Calendar and Microsoft Calendar
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
 * Create a Microsoft Calendar event
 */
async function createMicrosoftCalendarEvent(
  connection: CalendarConnection,
  invite: MeetingInvite
): Promise<{ eventId: string; eventLink: string }> {
  // Ensure we have a valid access token
  const accessToken = await ensureValidToken(connection, supabaseAdmin);

  // Get the primary calendar or first selected calendar
  const primaryCalendar = connection.calendar_list.find((cal) => cal.primary);
  const selectedCalendar = connection.calendar_list.find((cal) => cal.selected);
  const calendarId = primaryCalendar?.id || selectedCalendar?.id;

  if (!calendarId) {
    throw new Error('No calendar selected for Microsoft connection');
  }

  // Build description with meeting link prominently included (HTML format for Outlook)
  let bodyContent = invite.description || '';
  if (invite.meetingLink) {
    bodyContent = `<p><strong>📹 Join Video Meeting:</strong> <a href="${invite.meetingLink}">${invite.meetingLink}</a></p><br/>${bodyContent}`;
  }

  // Build the event object for Microsoft Graph API
  const event = {
    subject: invite.title,
    body: {
      contentType: 'HTML',
      content: bodyContent,
    },
    start: {
      dateTime: invite.startTime,
      timeZone: 'UTC',
    },
    end: {
      dateTime: invite.endTime,
      timeZone: 'UTC',
    },
    location: invite.meetingLink
      ? {
          displayName: invite.meetingLink,
        }
      : invite.location
      ? {
          displayName: invite.location,
        }
      : undefined,
    attendees: invite.attendees.map((attendee) => ({
      emailAddress: {
        address: attendee.email,
        name: attendee.name || attendee.email,
      },
      type: 'required',
    })),
  };

  // Create the event via Microsoft Graph API
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events`,
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
      `Microsoft Graph API error: ${response.status} ${errorText}`
    );
  }

  const createdEvent = await response.json();

  return {
    eventId: createdEvent.id,
    eventLink: createdEvent.webLink,
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
      } else if (connection.provider === 'microsoft') {
        const result = await createMicrosoftCalendarEvent(connection, invite);
        eventId = result.eventId;
        eventLink = result.eventLink;
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
