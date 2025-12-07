import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cancelCalendarEvent } from '@/services/calendarInviteService';
import { CancelMeetingResponse } from '@/types/meeting-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const meetingId = params.id;

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized - No auth header' },
        { status: 401 }
      );
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');

    // Verify the token and get user
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Fetch the meeting
    const { data: meeting, error: fetchError } = await supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (fetchError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Verify user is the organizer
    if (meeting.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the organizer can cancel the meeting' },
        { status: 403 }
      );
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
      console.error('Error cancelling meeting:', updateError);
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
      console.error('Error fetching participants:', participantsError);
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
            console.error(
              `Error cancelling calendar event for user ${participant.user_id}:`,
              error
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
    console.error('Error in cancel meeting endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
