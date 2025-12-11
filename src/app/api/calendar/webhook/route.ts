/**
 * Google Calendar Webhook Handler
 *
 * This endpoint receives push notifications from Google Calendar API
 * when calendar events are updated, including attendee response changes.
 *
 * Documentation: https://developers.google.com/calendar/api/guides/push
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncEventAttendeeResponses } from '@/services/calendarSyncService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Get notification headers from Google
    const channelId = request.headers.get('x-goog-channel-id');
    const resourceId = request.headers.get('x-goog-resource-id');
    const resourceState = request.headers.get('x-goog-resource-state');
    const resourceUri = request.headers.get('x-goog-resource-uri');

    console.log('Calendar webhook received:', {
      channelId,
      resourceId,
      resourceState,
      resourceUri,
    });

    // Ignore sync messages (initial setup confirmation)
    if (resourceState === 'sync') {
      return NextResponse.json({ message: 'Sync acknowledged' }, { status: 200 });
    }

    // Verify we have the required headers
    if (!channelId || !resourceId) {
      console.error('Missing required headers in webhook');
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Find the calendar connection for this watch channel
    const { data: connection, error: connectionError } = await supabaseAdmin
      .from('calendar_connections')
      .select('*')
      .eq('watch_channel_id', channelId)
      .eq('watch_resource_id', resourceId)
      .single();

    if (connectionError || !connection) {
      console.error('Calendar connection not found for channel:', channelId);
      return NextResponse.json(
        { error: 'Calendar connection not found' },
        { status: 404 }
      );
    }

    console.log('Found calendar connection for user:', connection.user_id);

    // Process the notification based on resource state
    if (resourceState === 'exists') {
      // Calendar event was updated - sync attendee responses
      console.log('Processing event update for user:', connection.user_id);

      try {
        await syncEventAttendeeResponses(connection);
      } catch (syncError) {
        console.error('Error syncing attendee responses:', syncError);
        // Don't fail the webhook - just log the error
      }
    }

    return NextResponse.json({ message: 'Webhook processed' }, { status: 200 });
  } catch (error) {
    console.error('Error processing calendar webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Handle webhook verification (GET request)
 * Google may send verification requests
 */
export async function GET(request: NextRequest) {
  // Echo back any verification token
  const token = request.nextUrl.searchParams.get('token');

  if (token) {
    return NextResponse.json({ token }, { status: 200 });
  }

  return NextResponse.json(
    { message: 'Calendar webhook endpoint' },
    { status: 200 }
  );
}
