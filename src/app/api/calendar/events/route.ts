// src/app/api/calendar/events/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * Fetch calendar events from a connected calendar
 */
export async function POST(request: NextRequest) {
  try {
    // Create server-side Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {}
          },
          remove: (name: string, options: CookieOptions) => {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch {}
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { connectionId, calendarId, timeMin, timeMax, maxResults = 20 } = body;

    if (!connectionId || !calendarId) {
      return NextResponse.json(
        { error: 'connectionId and calendarId are required' },
        { status: 400 }
      );
    }

    // Get the calendar connection
    const { data: connection, error: connectionError } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Calendar connection not found' },
        { status: 404 }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = connection.access_token;
    const tokenExpired = connection.token_expires_at
      ? new Date(connection.token_expires_at) < new Date()
      : false;

    if (tokenExpired) {
      console.log('[Calendar Events API] Access token expired, refreshing...');

      if (!connection.refresh_token) {
        return NextResponse.json(
          { error: 'Access token expired and no refresh token available. Please reconnect your calendar.' },
          { status: 401 }
        );
      }

      try {
        // Refresh the token
        const refreshedToken = await refreshAccessToken(
          connection.provider,
          connection.refresh_token
        );

        // Update the connection with new token
        const { error: updateError } = await supabase
          .from('calendar_connections')
          .update({
            access_token: refreshedToken.access_token,
            token_expires_at: refreshedToken.expires_at,
            // Some providers may return a new refresh token
            ...(refreshedToken.refresh_token && { refresh_token: refreshedToken.refresh_token }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', connectionId);

        if (updateError) {
          console.error('[Calendar Events API] Failed to update refreshed token:', updateError);
          throw new Error('Failed to save refreshed token');
        }

        console.log('[Calendar Events API] Token refreshed successfully');
        accessToken = refreshedToken.access_token;
      } catch (err) {
        console.error('[Calendar Events API] Token refresh failed:', err);
        return NextResponse.json(
          { error: 'Failed to refresh access token. Please reconnect your calendar.' },
          { status: 401 }
        );
      }
    }

    // Fetch events from provider
    let events: any[] = [];

    switch (connection.provider) {
      case 'google':
        events = await fetchGoogleCalendarEvents(
          accessToken,
          calendarId,
          timeMin,
          timeMax,
          maxResults
        );
        break;

      case 'microsoft':
        events = await fetchMicrosoftCalendarEvents(
          accessToken,
          calendarId,
          timeMin,
          timeMax,
          maxResults
        );
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported provider: ${connection.provider}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ events });
  } catch (err) {
    console.error('[Calendar Events API] Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * Fetch events from Google Calendar
 */
async function fetchGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin?: string,
  timeMax?: string,
  maxResults = 20
) {
  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  if (timeMin) params.append('timeMin', timeMin);
  if (timeMax) params.append('timeMax', timeMax);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Google Calendar] Fetch events failed:', {
      status: response.status,
      statusText: response.statusText,
      calendarId,
      error,
    });
    throw new Error(`Failed to fetch Google Calendar events (${response.status}): ${error}`);
  }

  const data = await response.json();

  // Transform Google events to our format
  return (data.items || []).map((event: any) => ({
    id: event.id,
    summary: event.summary || 'Untitled Event',
    description: event.description,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    location: event.location,
    attendees: event.attendees?.map((attendee: any) => ({
      email: attendee.email,
      name: attendee.displayName,
      responseStatus: attendee.responseStatus,
    })),
    htmlLink: event.htmlLink,
  }));
}

/**
 * Fetch events from Microsoft Calendar
 */
async function fetchMicrosoftCalendarEvents(
  accessToken: string,
  calendarId: string,
  timeMin?: string,
  timeMax?: string,
  maxResults = 20
) {
  const params = new URLSearchParams({
    $top: maxResults.toString(),
    $orderby: 'start/dateTime',
  });

  if (timeMin) {
    params.append('$filter', `start/dateTime ge '${timeMin}'`);
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events?${params}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[Microsoft Calendar] Fetch events failed:', error);
    throw new Error(`Failed to fetch Microsoft Calendar events: ${error}`);
  }

  const data = await response.json();

  // Transform Microsoft events to our format
  return (data.value || []).map((event: any) => ({
    id: event.id,
    summary: event.subject || 'Untitled Event',
    description: event.bodyPreview,
    start: event.start.dateTime,
    end: event.end.dateTime,
    location: event.location?.displayName,
    attendees: event.attendees?.map((attendee: any) => ({
      email: attendee.emailAddress.address,
      name: attendee.emailAddress.name,
      responseStatus: attendee.status?.response,
    })),
    htmlLink: event.webLink,
  }));
}

/**
 * Refresh an expired access token using the refresh token
 */
async function refreshAccessToken(provider: string, refreshToken: string) {
  switch (provider) {
    case 'google': {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Google OAuth] Token refresh failed:', error);
        throw new Error(`Google token refresh failed: ${error}`);
      }

      const data = await response.json();

      return {
        access_token: data.access_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        // Google may return a new refresh token
        refresh_token: data.refresh_token,
      };
    }

    case 'microsoft': {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Microsoft OAuth] Token refresh failed:', error);
        throw new Error(`Microsoft token refresh failed: ${error}`);
      }

      const data = await response.json();

      return {
        access_token: data.access_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        refresh_token: data.refresh_token,
      };
    }

    default:
      throw new Error(`Unsupported provider for token refresh: ${provider}`);
  }
}
