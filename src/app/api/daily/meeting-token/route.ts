// src/app/api/daily/meeting-token/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type {
  MeetingTokenRequest,
  MeetingTokenResponse,
  DailyMeetingTokenApiRequest,
  DailyMeetingTokenApiResponse,
  DailyApiError,
} from '@/types/daily-types';

// Create Supabase client with service role for server-side operations
function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: Request) {
  const supabase = getSupabaseServiceClient();

  // Get auth token from Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json(
      { error: 'Unauthorized - No auth header' },
      { status: 401 }
    );
  }

  // Extract token from Bearer header
  const token = authHeader.replace('Bearer ', '');

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid token' },
      { status: 401 }
    );
  }

  try {
    const body: MeetingTokenRequest = await request.json();
    let { roomName, meetingId } = body;

    if (!roomName && !meetingId) {
      return NextResponse.json(
        { error: 'Either roomName or meetingId is required' },
        { status: 400 }
      );
    }

    let isOwner = false;
    let meeting: any = null;

    // If meetingId provided, fetch meeting and verify access
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

      isOwner = isOrganizer;
      meeting = meetingData;

      // Extract roomName from meeting_link to ensure it matches the meeting
      // We ignore the roomName provided in the body to prevent bypassing access checks
      if (meetingData.meeting_link) {
        const urlParts = meetingData.meeting_link.split('/');
        roomName = urlParts[urlParts.length - 1];
      } else {
        // If meeting has no link, we cannot generate a token for a specific room safely
        roomName = null;
      }
    } else if (roomName) {
      // Fallback: If only roomName provided, verify access via room name lookup
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .select('*, meeting_participants(user_id)')
        .ilike('meeting_link', `%${roomName}%`)
        .single();

      if (meetingError || !meetingData) {
        return NextResponse.json(
          { error: 'Meeting not found or you do not have access' },
          { status: 403 }
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

      isOwner = isOrganizer;
      meeting = meetingData;
    }

    if (!roomName) {
      return NextResponse.json(
        { error: 'Could not determine room name' },
        { status: 400 }
      );
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    const userName =
      profile?.full_name ||
      user.email?.split('@')[0] ||
      'Guest';

    // Prepare Daily.co meeting token request
    const dailyApiKey = process.env.DAILY_API_KEY;
    if (!dailyApiKey) {
      return NextResponse.json(
        { error: 'Daily.co API key not configured' },
        { status: 500 }
      );
    }

    const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN || 'capmatch';

    const tokenRequest: DailyMeetingTokenApiRequest = {
      properties: {
        room_name: roomName,
        user_name: userName,
        user_id: user.id,
        is_owner: isOwner,
        enable_recording: 'cloud',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
      },
    };

    // Call Daily.co API to create meeting token
    const dailyResponse = await fetch(
      'https://api.daily.co/v1/meeting-tokens',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${dailyApiKey}`,
        },
        body: JSON.stringify(tokenRequest),
      }
    );

    if (!dailyResponse.ok) {
      const errorData: DailyApiError = await dailyResponse.json();
      console.error('Daily.co API error:', errorData);
      return NextResponse.json(
        { error: errorData.error || 'Failed to create meeting token' },
        { status: dailyResponse.status }
      );
    }

    const tokenData: DailyMeetingTokenApiResponse = await dailyResponse.json();
    const roomUrl = `https://${dailyDomain}.daily.co/${roomName}`;

    // Return response
    const response: MeetingTokenResponse = {
      token: tokenData.token,
      isOwner,
      roomUrl,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error creating meeting token:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting token' },
      { status: 500 }
    );
  }
}
