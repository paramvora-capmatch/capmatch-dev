import { NextRequest, NextResponse } from 'next/server';
import { sendCalendarInvites, updateCalendarInvites } from '@/services/calendarInviteService';
import { validateBody, updateMeetingBodySchema } from '@/lib/api-validation';
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from '@/lib/rate-limit';
import { unauthorized, forbidden, validationError, notFound, internalError } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const meetingId = params.id;

    // Get authenticated user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return unauthorized('Unauthorized - No auth header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return unauthorized('Unauthorized - Invalid token');
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, 'meetings-update');
    if (!rl.allowed) return rl.response;

    // Check if user has a calendar connection
    const { data: connections } = await supabaseAdmin
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (!connections || connections.length === 0) {
      return forbidden('Calendar connection required. Please connect your calendar in settings.');
    }

    // Parse and validate request body
    const [validationErr, body] = await validateBody(request, updateMeetingBodySchema);
    if (validationErr) return validationErr;
    if (!body) return validationError('Validation failed');
    const { title, startTime, endTime, participantIds, description } = body;

    // 1. Fetch existing meeting to verify ownership and get current details
    const { data: meeting, error: fetchError } = await supabaseAdmin
      .from('meetings')
      .select('id, organizer_id, start_time, end_time, project_id, meeting_link, location, calendar_event_ids')
      .eq('id', meetingId)
      .single();

    if (fetchError || !meeting) {
      return notFound('Meeting not found');
    }

    if (meeting.organizer_id !== user.id) {
      return forbidden('Only organizer can update meeting');
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
          logger.error({ err: eventError }, 'Error creating meeting update event');
        } else {
          // Note: Domain event created. The GCP notify-fan-out service will automatically
          // poll and process this event within 0-60 seconds (avg 30s).
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
            // Note: Domain events created. The GCP notify-fan-out service will automatically
            // poll and process these events within 0-60 seconds (avg 30s).
            logger.info({ count: newInviteEvents.length }, 'Created new invitation domain events');
          }
        }
      } catch (notificationError) {
        logger.error({ err: notificationError }, 'Error triggering meeting update notifications');
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
      logger.error({ err: allPartError }, 'Error fetching participant details for calendar sync');
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
      // Update existing calendar events in place so the same event stays on the user's calendar
      (async () => {
        try {
          const calendarEventIds = meeting.calendar_event_ids as Array<{ userId: string; provider: string; eventId: string; eventLink?: string }> | null;
          if (calendarEventIds && calendarEventIds.length > 0) {
            await updateCalendarInvites(user.id, invite, calendarEventIds);
          } else {
            // No existing calendar events (e.g. meeting created before calendar was connected) — create new ones
            const inviteResults = await sendCalendarInvites(user.id, invite);
            const newCalendarEventIds = inviteResults
              .filter((r) => r.success && r.eventId)
              .map((r) => ({
                userId: r.userId,
                provider: r.provider,
                eventId: r.eventId!,
                eventLink: r.eventLink,
              }));
            if (newCalendarEventIds.length > 0) {
              await supabaseAdmin
                .from('meetings')
                .update({ calendar_event_ids: newCalendarEventIds })
                .eq('id', meetingId);
            }
          }
        } catch (err: unknown) {
          logger.error({ err }, 'Background calendar sync failed');
        }
      })();
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error({ err: error }, 'Error updating meeting');
    return internalError();
  }
}
