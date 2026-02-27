import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cancelCalendarEvent } from '@/services/calendarInviteService';
import { CancelMeetingResponse } from '@/types/meeting-types';
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from '@/lib/rate-limit';
import { safeErrorResponse } from '@/lib/api-validation';
import { unauthorized, forbidden, notFound } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const params = await context.params;
    const meetingId = params.id;

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return unauthorized('Unauthorized - No auth header');
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');

    // Verify the token and get user
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return unauthorized('Unauthorized - Invalid token');
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, 'meetings-cancel');
    if (!rl.allowed) return rl.response;

    // Fetch the meeting
    const { data: meeting, error: fetchError } = await supabaseAdmin
      .from('meetings')
      .select('id, organizer_id')
      .eq('id', meetingId)
      .single();

    if (fetchError || !meeting) {
      return notFound('Meeting not found');
    }

    // Verify user is the organizer
    if (meeting.organizer_id !== user.id) {
      return forbidden('Only the organizer can cancel the meeting');
    }

    // Update meeting status to cancelled
    const { error: updateError } = await supabaseAdmin
      .from('meetings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', meetingId);

    if (updateError) {
      logger.error({ err: updateError }, 'Error cancelling meeting');
      return NextResponse.json(
        { error: 'Failed to cancel meeting' },
        { status: 500 }
      );
    }

    // Get all participants
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('meeting_participants')
      .select('user_id, calendar_event_id')
      .eq('meeting_id', meetingId);

    if (participantsError) {
      logger.error({ err: participantsError }, 'Error fetching participants');
    }

    // Cancel calendar events for all participants
    let cancelledEvents = 0;
    const errors: string[] = [];

    if (participants) {
      for (const participant of participants) {
        if (participant.calendar_event_id) {
          try {
            const success = await cancelCalendarEvent(
              participant.user_id,
              participant.calendar_event_id
            );
            if (success) {
              cancelledEvents++;
            }
          } catch (error) {
            logger.error(
              { userId: participant.user_id, err: error },
              'Error cancelling calendar event for user'
            );
            errors.push(
              `Failed to cancel calendar event for user ${participant.user_id}`
            );
          }
        }
      }
    }

    const response: CancelMeetingResponse = {
      success: true,
      cancelledEvents,
      errors: errors.length > 0 ? errors : undefined,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return safeErrorResponse(error, 'Internal server error');
  }
}
