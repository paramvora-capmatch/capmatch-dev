import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCalendarInvites, cancelCalendarEvent } from '@/services/calendarInviteService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, startTime, endTime, participantIds, description } = body;

    // Validate required fields
    if (!title || !startTime || !endTime || !participantIds) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Fetch existing meeting to verify ownership and get current details
    const { data: meeting, error: fetchError } = await supabaseAdmin
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (fetchError || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    if (meeting.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - Only organizer can update meeting' },
        { status: 403 }
      );
    }

    // 2. Update meeting details
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

    const { error: updateError } = await supabaseAdmin
      .from('meetings')
      .update({
        title,
        description,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMinutes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId);

    if (updateError) {
      throw updateError;
    }

    // 3. Update participants
    // Fetch current participants
    const { data: currentParticipants, error: partError } = await supabaseAdmin
      .from('meeting_participants')
      .select('user_id')
      .eq('meeting_id', meetingId);

    if (partError) {
      throw partError;
    }

    const currentParticipantIds = currentParticipants.map((p: any) => p.user_id);
    
    // Determine who to add and who to remove
    const toAdd = participantIds.filter((id: string) => !currentParticipantIds.includes(id));
    const toRemove = currentParticipantIds.filter((id: string) => !participantIds.includes(id));

    // Remove participants
    if (toRemove.length > 0) {
      await supabaseAdmin
        .from('meeting_participants')
        .delete()
        .eq('meeting_id', meetingId)
        .in('user_id', toRemove);
    }

    // Add new participants
    if (toAdd.length > 0) {
      const newParticipants = toAdd.map((userId: string) => ({
        meeting_id: meetingId,
        user_id: userId,
        response_status: 'pending',
      }));

      await supabaseAdmin
        .from('meeting_participants')
        .insert(newParticipants);
    }

    // If time changed, reset response status for all participants (except organizer)
    const timeChanged = new Date(meeting.start_time).getTime() !== new Date(startTime).getTime() || 
                        new Date(meeting.end_time).getTime() !== new Date(endTime).getTime();

    if (timeChanged) {
      await supabaseAdmin
        .from('meeting_participants')
        .update({ response_status: 'pending' })
        .eq('meeting_id', meetingId)
        .neq('user_id', user.id);
    }

    // Trigger notifications for meeting updates
    if (timeChanged || toAdd.length > 0 || toRemove.length > 0) {
      try {
        // Create domain event for meeting update
        const { data: eventData, error: eventError } = await supabaseAdmin
          .rpc('insert_meeting_updated_event', {
            p_actor_id: user.id,
            p_project_id: meeting.project_id,
            p_meeting_id: meetingId,
            p_changes: {
              timeChanged,
              participantsChanged: toAdd.length > 0 || toRemove.length > 0,
              participantsAdded: toAdd.length,
              participantsRemoved: toRemove.length,
            },
          });

        if (eventError) {
          console.error('Error creating meeting update event:', eventError);
        } else {
          // Invoke notify-fan-out to process notifications
          const { error: invokeError } = await supabaseAdmin.functions.invoke('notify-fan-out', {
            body: { eventId: eventData },
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
          });

          if (invokeError) {
            console.error('Error invoking notify-fan-out for meeting update:', invokeError);
          } else {
            console.log('Successfully triggered meeting update notifications');
          }
        }

        // For newly added participants, also send invitation notifications
        if (toAdd.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const { data: newInviteEvents, error: inviteEventsError } = await supabaseAdmin
            .from('domain_events')
            .select('id')
            .eq('event_type', 'meeting_invited')
            .eq('meeting_id', meetingId)
            .in('payload->>invited_user_id', toAdd);

          if (!inviteEventsError && newInviteEvents && newInviteEvents.length > 0) {
            for (const domainEvent of newInviteEvents) {
              await supabaseAdmin.functions.invoke('notify-fan-out', {
                body: { eventId: domainEvent.id },
                headers: {
                  Authorization: `Bearer ${supabaseServiceKey}`,
                },
              });
            }
            console.log(`Triggered ${newInviteEvents.length} new invitation notifications`);
          }
        }
      } catch (notificationError) {
        console.error('Error triggering meeting update notifications:', notificationError);
        // Don't fail the whole operation
      }
    }

    // 4. Sync with Google Calendar
    // We need to fetch the full list of participants (including new ones) to send to Google
    // We also need their emails.
    const { data: allParticipants, error: allPartError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', participantIds);

    if (allPartError) {
      console.error('Error fetching participant details for calendar sync:', allPartError);
    } else {
      const attendees = allParticipants.map((p: any) => ({
        email: p.email,
        name: p.full_name,
      }));

      const invite = {
        title,
        description,
        startTime,
        endTime,
        attendees,
        meetingLink: meeting.meeting_link,
        location: meeting.location,
      };

      // Run in background to not block response
      // Cancel old calendar events and create new ones
      (async () => {
        try {
          // Cancel old events
          if (meeting.calendar_event_ids && meeting.calendar_event_ids.length > 0) {
            for (const eventId of meeting.calendar_event_ids) {
              await cancelCalendarEvent(user.id, eventId);
            }
          }
          // Create new calendar events with updated details
          await sendCalendarInvites(user.id, invite);
        } catch (err: unknown) {
          console.error('Background calendar sync failed:', err);
        }
      })();
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating meeting:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
