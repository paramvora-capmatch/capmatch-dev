// src/app/api/daily/create-room/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  DailyCreateRoomApiRequest,
  DailyRoomConfig,
  DailyApiError,
} from '@/types/daily-types';

export async function POST(request: Request) {
  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: CreateRoomRequest = await request.json();
    const { meetingId, projectId, roomConfig } = body;

    // If meetingId provided, fetch meeting and verify access
    let meeting: any = null;
    if (meetingId) {
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*, meeting_participants(user_id)')
        .eq('id', meetingId)
        .single();

      if (meetingError || !meetingData) {
        return NextResponse.json(
          { error: 'Meeting not found' },
          { status: 404 }
        );
      }

      // Verify user is organizer or participant
      const isOrganizer = meetingData.organizer_id === user.id;
      const isParticipant = meetingData.meeting_participants?.some(
        (p: any) => p.user_id === user.id
      );

      if (!isOrganizer && !isParticipant) {
        return NextResponse.json(
          { error: 'You do not have access to this meeting' },
          { status: 403 }
        );
      }

      // Check if meeting_link already exists
      if (meetingData.meeting_link) {
        return NextResponse.json(
          {
            error: 'A video room already exists for this meeting',
            existingRoomUrl: meetingData.meeting_link,
          },
          { status: 409 }
        );
      }

      meeting = meetingData;
    }

    // Generate room name
    const timestamp = Date.now();
    const identifier = meetingId || projectId || `instant-${user.id}`;
    const roomName = `capmatch-${identifier}-${timestamp}`;

    // Prepare Daily.co API request
    const dailyApiKey = process.env.DAILY_API_KEY;
    if (!dailyApiKey) {
      return NextResponse.json(
        { error: 'Daily.co API key not configured' },
        { status: 500 }
      );
    }

    const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN || 'capmatch';

    const dailyRoomRequest: DailyCreateRoomApiRequest = {
      name: roomName,
      privacy: 'private', // Requires token to join
      properties: {
          enable_chat: true,
          enable_screenshare: true,
          enable_recording: 'cloud',
          enable_transcription: true, // Enable transcription capability
          enable_transcription_storage: true, // Store transcript for webhook retrieval
          enable_advanced_chat: true,
          enable_emoji_reactions: true,
          enable_hand_raising: true,
          enable_breakout_rooms: true,
          enable_pip_ui: true,
          enable_people_ui: true,
          enable_prejoin_ui: true,
          enable_network_ui: true,
          enable_noise_cancellation_ui: true,
          enable_live_captions_ui: true,
          start_video_off: false,
          start_audio_off: false,
          max_participants: 10,
        },
    };

    // Call Daily.co API to create room
    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dailyApiKey}`,
      },
      body: JSON.stringify(dailyRoomRequest),
    });

    if (!dailyResponse.ok) {
      const errorData: DailyApiError = await dailyResponse.json();
      console.error('Daily.co API error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to create Daily.co room' },
        { status: dailyResponse.status }
      );
    }

    const dailyRoom: DailyRoomConfig = await dailyResponse.json();
    const roomUrl = `https://${dailyDomain}.daily.co/${roomName}`;

    // If meetingId provided, update meeting record
    if (meetingId && meeting) {
      console.log('[create-room] Updating meeting:', {
        meetingId,
        roomName,
        roomUrl,
      });

      const { data: updateData, error: updateError } = await supabase
        .from('meetings')
        .update({
          meeting_link: roomUrl,
          room_name: roomName, // Store room name for webhook matching
        })
        .eq('id', meetingId)
        .select();

      if (updateError) {
        console.error('[create-room] Failed to update meeting record:', updateError);
        // Don't fail the request - room was created successfully
      } else {
        console.log('[create-room] Successfully updated meeting with room_name:', updateData);
      }
    } else {
      console.log('[create-room] No meetingId or meeting found, skipping database update');
    }

    // Return response
    const response: CreateRoomResponse = {
      roomName,
      roomUrl,
      meetingId,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating Daily.co room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}
