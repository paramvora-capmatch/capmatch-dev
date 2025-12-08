import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendCalendarInvites } from '@/services/calendarInviteService';
import { CreateMeetingRequest, CreateMeetingResponse } from '@/types/meeting-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side Supabase client with service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
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

    // Parse request body
    const body: CreateMeetingRequest = await request.json();

    // Validate required fields
    if (!body.title || !body.startTime || !body.endTime || !body.participantIds) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startTime, endTime, participantIds' },
        { status: 400 }
      );
    }

    if (body.participantIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one participant is required' },
        { status: 400 }
      );
    }

    // Validate dates
    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (endTime <= startTime) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Calculate duration in minutes
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60)
    );

    // Create Daily.co room for video conferencing
    let dailyRoomUrl: string | null = null;
    let roomName: string | null = null;
    try {
      const dailyApiKey = process.env.DAILY_API_KEY;

      if (dailyApiKey) {
        const timestamp = Date.now();
        roomName = `capmatch-${body.projectId || 'meeting'}-${timestamp}`;

        const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${dailyApiKey}`,
          },
          body: JSON.stringify({
            name: roomName,
            privacy: 'private',
            properties: {
              enable_screenshare: true,
              enable_chat: true,
              enable_recording: 'cloud',
              enable_transcription: true, // Enable transcription capability
              enable_transcription_storage: true, // Store transcript for webhook retrieval
              max_participants: 20,
              start_video_off: false,
              start_audio_off: false,
              enable_prejoin_ui: true,
            },
          }),
        });

        if (dailyResponse.ok) {
          // Use your domain instead of Daily.co's domain
          const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          dailyRoomUrl = `${siteUrl}/meeting/${roomName}`;
          console.log('Daily.co room created, meeting URL:', dailyRoomUrl);
        } else {
          const errorData = await dailyResponse.json();
          console.error('Failed to create Daily.co room:', errorData);
        }
      }
    } catch (dailyError) {
      console.error('Error creating Daily.co room:', dailyError);
      // Don't fail the whole operation if Daily.co room creation fails
    }

    // Fetch participant emails from profiles
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', body.participantIds);

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
      return NextResponse.json(
        { error: 'Failed to fetch participant information' },
        { status: 500 }
      );
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json(
        { error: 'No valid participants found' },
        { status: 400 }
      );
    }

    // Insert meeting record
    const { data: meeting, error: meetingError } = await supabaseAdmin
      .from('meetings')
      .insert({
        title: body.title,
        description: body.description || null,
        start_time: body.startTime,
        end_time: body.endTime,
        duration_minutes: durationMinutes,
        location: body.location || null,
        meeting_link: dailyRoomUrl || body.meetingLink || null,
        room_name: roomName, // Store Daily.co room name for webhook matching
        organizer_id: user.id,
        project_id: body.projectId || null,
        status: 'scheduled',
        calendar_event_ids: [],
      })
      .select()
      .single();

    if (meetingError || !meeting) {
      console.error('Error creating meeting:', meetingError);
      return NextResponse.json(
        { error: 'Failed to create meeting' },
        { status: 500 }
      );
    }

    // Insert meeting participants (including organizer)
    const participantRecords = body.participantIds.map((participantId) => ({
      meeting_id: meeting.id,
      user_id: participantId,
      is_organizer: participantId === user.id,
      response_status: participantId === user.id ? 'accepted' : 'pending',
    }));

    const { error: participantInsertError } = await supabaseAdmin
      .from('meeting_participants')
      .insert(participantRecords);

    if (participantInsertError) {
      console.error('Error adding participants:', participantInsertError);
      // Don't fail the whole operation, just log the error
    }

    // Send calendar invites
    let inviteResults: CreateMeetingResponse['inviteResults'] = [];

    try {
      const attendees = participants
        .filter((p) => p.id !== user.id)
        .map((p) => ({
          email: p.email,
          name: p.full_name,
        }));

      // Only create the event on the organizer's calendar.
      // The provider (Google/Outlook) will handle sending invites to attendees.
      inviteResults = await sendCalendarInvites(user.id, {
        title: body.title,
        description: body.description,
        startTime: body.startTime,
        endTime: body.endTime,
        attendees,
        location: body.location,
        meetingLink: dailyRoomUrl || body.meetingLink,
      });

      // Update calendar_event_ids in meeting record
      const calendarEventIds = inviteResults
        .filter((result) => result.success && result.eventId)
        .map((result) => ({
          userId: result.userId,
          provider: result.provider,
          eventId: result.eventId!,
          eventLink: result.eventLink,
        }));

      if (calendarEventIds.length > 0) {
        await supabaseAdmin
          .from('meetings')
          .update({ calendar_event_ids: calendarEventIds })
          .eq('id', meeting.id);
      }

      // Update participant calendar_event_id for each successful invite
      for (const result of inviteResults) {
        if (result.success && result.eventId) {
          await supabaseAdmin
            .from('meeting_participants')
            .update({ calendar_event_id: result.eventId })
            .eq('meeting_id', meeting.id)
            .eq('user_id', result.userId);
        }
      }

      console.log(
        `Successfully sent ${inviteResults.filter((r) => r.success).length}/${
          inviteResults.length
        } calendar invites`
      );
    } catch (inviteError) {
      console.error('Error sending calendar invites:', inviteError);
      // Don't fail the whole operation if calendar invites fail
      inviteResults = body.participantIds.map((userId) => ({
        userId,
        provider: 'unknown',
        success: false,
        error: 'Failed to send calendar invite',
      }));
    }

    // Fetch complete meeting with participants
    const { data: completeMeeting } = await supabaseAdmin
      .from('meetings')
      .select(
        `
        *,
        organizer:profiles!organizer_id(id, full_name, email),
        participants:meeting_participants(
          *,
          user:profiles!user_id(id, full_name, email, avatar_url)
        )
      `
      )
      .eq('id', meeting.id)
      .single();

    const response: CreateMeetingResponse = {
      meeting: completeMeeting || meeting,
      inviteResults,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error in create meeting endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
