// src/app/api/daily/room/[roomName]/route.ts
import { NextResponse } from 'next/server';
import type {
  RoomDetailsResponse,
  DailyRoomConfig,
  DailyRoomPresence,
  DailyApiError,
} from '@/types/daily-types';
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/api-validation';
import { unauthorized, validationError } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  context: { params: Promise<{ roomName: string }> }
) {
  const supabase = getSupabaseAdmin();
  const params = await context.params;

  // Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized();
  }

  const rlId = getRateLimitId(request, user.id);
  const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, 'daily-room');
  if (!rl.allowed) return rl.response;

  try {
    const { roomName } = params;

    if (!roomName) {
      return validationError('Room name is required');
    }

    // Query database for meeting with this room name
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, organizer_id, meeting_participants(user_id)')
      .ilike('meeting_link', `%${roomName}%`)
      .single();

    // Verify user has access if meeting exists
    if (meeting) {
      const isOrganizer = meeting.organizer_id === user.id;
      const isParticipant = meeting.meeting_participants?.some(
        (p: any) => p.user_id === user.id
      );

      if (!isOrganizer && !isParticipant) {
        return NextResponse.json(
          { error: 'You do not have access to this room' },
          { status: 403 }
        );
      }
    }

    // Get Daily.co API key
    const dailyApiKey = process.env.DAILY_API_KEY;
    if (!dailyApiKey) {
      return NextResponse.json(
        { error: 'Daily.co API key not configured' },
        { status: 500 }
      );
    }

    // Fetch room details from Daily.co
    const roomResponse = await fetch(
      `https://api.daily.co/v1/rooms/${roomName}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${dailyApiKey}`,
        },
      }
    );

    if (!roomResponse.ok) {
      const errorData: DailyApiError = await roomResponse.json();
      logger.error({ errorData }, 'Daily.co API error');
      return NextResponse.json(
        { error: errorData.error || 'Room not found' },
        { status: roomResponse.status }
      );
    }

    const roomConfig: DailyRoomConfig = await roomResponse.json();

    // Optionally fetch live presence info
    let activeParticipants = 0;
    try {
      const presenceResponse = await fetch(
        `https://api.daily.co/v1/rooms/${roomName}/presence`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${dailyApiKey}`,
          },
        }
      );

      if (presenceResponse.ok) {
        const presenceData: DailyRoomPresence = await presenceResponse.json();
        activeParticipants = presenceData.total_count || 0;
      }
    } catch (presenceError) {
      // Presence endpoint is optional - don't fail if it errors
      logger.warn({ err: presenceError }, 'Failed to fetch room presence');
    }

    // Build response
    const response: RoomDetailsResponse = {
      roomName,
      config: roomConfig,
      activeParticipants,
      meetingId: meeting?.id,
      isActive: true,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch room details');
  }
}
