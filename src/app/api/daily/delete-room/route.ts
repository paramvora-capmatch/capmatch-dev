// src/app/api/daily/delete-room/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { DeleteRoomRequest, DailyApiError } from '@/types/daily-types';

// Create Supabase client with service role for server-side operations
function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function DELETE(request: Request) {
  const supabase = getSupabaseServiceClient();

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: DeleteRoomRequest = await request.json();
    const { roomName: roomNameParam, meetingId } = body;
    let roomName = roomNameParam;

    if (!roomName && !meetingId) {
      return NextResponse.json(
        { error: 'Either roomName or meetingId is required' },
        { status: 400 }
      );
    }

    let meeting: any = null;

    // If meetingId provided, fetch meeting and verify user is organizer
    if (meetingId) {
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (meetingError || !meetingData) {
        return NextResponse.json(
          { error: 'Meeting not found' },
          { status: 404 }
        );
      }

      // Verify user is organizer
      if (meetingData.organizer_id !== user.id) {
        return NextResponse.json(
          { error: 'Only the meeting organizer can delete the room' },
          { status: 403 }
        );
      }

      meeting = meetingData;

      // Extract roomName from meeting_link if not provided
      if (!roomName && meetingData.meeting_link) {
        const urlParts = meetingData.meeting_link.split('/');
        roomName = urlParts[urlParts.length - 1];
      }
    }

    if (!roomName) {
      return NextResponse.json(
        { error: 'Could not determine room name' },
        { status: 400 }
      );
    }

    // Get Daily.co API key
    const dailyApiKey = process.env.DAILY_API_KEY;
    if (!dailyApiKey) {
      return NextResponse.json(
        { error: 'Daily.co API key not configured' },
        { status: 500 }
      );
    }

    // Delete room from Daily.co
    const dailyResponse = await fetch(
      `https://api.daily.co/v1/rooms/${roomName}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${dailyApiKey}`,
        },
      }
    );

    if (!dailyResponse.ok) {
      const errorData: DailyApiError = await dailyResponse.json();
      console.error('Daily.co API error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to delete room' },
        { status: dailyResponse.status }
      );
    }

    // Update meeting status to completed if meetingId provided
    if (meetingId && meeting) {
      const { error: updateError } = await supabase
        .from('meetings')
        .update({ status: 'completed' })
        .eq('id', meetingId);

      if (updateError) {
        console.error('Failed to update meeting status:', updateError);
        // Don't fail the request - room was deleted successfully
      }
    }

    return NextResponse.json(
      { success: true, message: 'Room deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json(
      { error: 'Failed to delete room' },
      { status: 500 }
    );
  }
}
