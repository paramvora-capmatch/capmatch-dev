/**
 * Renew Calendar Watches Edge Function
 *
 * This function runs on a schedule (cron job) to renew Google Calendar
 * watch channels before they expire. Google Calendar watch channels
 * expire after a maximum of 30 days, and we renew them 24 hours before expiry.
 *
 * Schedule: Run daily at 2 AM UTC
 * Cron: 0 2 * * *
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface CalendarConnection {
  id: string;
  user_id: string;
  provider: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  calendar_list: Array<{
    id: string;
    name: string;
    primary?: boolean;
    selected?: boolean;
  }>;
  watch_channel_id?: string;
  watch_resource_id?: string;
  watch_expiration?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting calendar watch renewal job...');

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
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No watches to renew',
          renewed: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Found ${connections.length} watches to renew`);

    let renewed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const connection of connections as CalendarConnection[]) {
      try {
        console.log(`Renewing watch for connection ${connection.id}...`);

        // Stop the old watch first
        await stopCalendarWatch(connection);

        // Set up a new watch
        await setupCalendarWatch(connection, supabase);

        renewed++;
        console.log(`Successfully renewed watch for connection ${connection.id}`);
      } catch (renewError) {
        failed++;
        const errorMsg = `Failed to renew watch for connection ${connection.id}: ${renewError.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
        // Continue with next connection
      }
    }

    console.log(
      `Finished renewing watches. Renewed: ${renewed}, Failed: ${failed}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        renewed,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in renew-calendar-watches function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Ensure a valid access token (refresh if needed)
 */
async function ensureValidToken(
  connection: CalendarConnection,
  supabase: any
): Promise<string> {
  if (!connection.access_token) {
    throw new Error('No access token available');
  }

  // Check if token is expired or will expire soon (within 5 minutes)
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
      // Token is still valid
      return connection.access_token;
    }
  }

  // Token is expired or will expire soon, refresh it
  if (!connection.refresh_token) {
    throw new Error('No refresh token available');
  }

  console.log('Refreshing access token...');

  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: googleClientId!,
      client_secret: googleClientSecret!,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.status}`);
  }

  const tokens = await response.json();

  // Update the connection with new tokens
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await supabase
    .from('calendar_connections')
    .update({
      access_token: tokens.access_token,
      token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', connection.id);

  console.log('Access token refreshed successfully');

  return tokens.access_token;
}

/**
 * Set up a push notification watch on a calendar
 */
async function setupCalendarWatch(
  connection: CalendarConnection,
  supabase: any
): Promise<void> {
  const accessToken = await ensureValidToken(connection, supabase);

  // Get the calendar ID
  const primaryCalendar = connection.calendar_list.find((cal) => cal.primary);
  const selectedCalendar = connection.calendar_list.find((cal) => cal.selected);
  const calendarId = primaryCalendar?.id || selectedCalendar?.id || 'primary';

  // Generate a unique channel ID
  const channelId = `capmatch-${connection.id}-${Date.now()}`;

  // Webhook URL
  const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') || Deno.env.get('SITE_URL');
  const webhookUrl = `${siteUrl}/api/calendar/webhook`;

  console.log(`Setting up watch for calendar ${calendarId}...`);

  // Set up the watch request (7 days)
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
  const expirationDate = new Date(parseInt(watchResponse.expiration));

  console.log('Watch set up successfully:', {
    channelId,
    resourceId: watchResponse.resourceId,
    expiration: expirationDate,
  });

  // Update the connection with watch info
  await supabase
    .from('calendar_connections')
    .update({
      watch_channel_id: channelId,
      watch_resource_id: watchResponse.resourceId,
      watch_expiration: expirationDate.toISOString(),
    })
    .eq('id', connection.id);
}

/**
 * Stop watching a calendar
 */
async function stopCalendarWatch(connection: CalendarConnection): Promise<void> {
  if (!connection.watch_channel_id || !connection.watch_resource_id) {
    console.log('No active watch to stop');
    return;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessToken = await ensureValidToken(connection, supabase);

    console.log(
      `Stopping watch channel ${connection.watch_channel_id}...`
    );

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
      console.error('Failed to stop watch:', response.status);
    } else {
      console.log('Watch stopped successfully');
    }
  } catch (error) {
    console.error('Error stopping watch:', error);
    // Don't throw - we want to continue with setting up new watch
  }
}
