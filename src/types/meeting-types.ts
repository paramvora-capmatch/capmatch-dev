/**
 * Meeting and Meeting Participant Types
 * Matches the database schema for meetings and meeting_participants tables
 */

export type MeetingStatus = 'scheduled' | 'cancelled' | 'completed';
export type ParticipantResponseStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  start_time: string; // ISO 8601 timestamp
  end_time: string; // ISO 8601 timestamp
  duration_minutes: number;
  location?: string;
  meeting_link?: string;

  // Organizer
  organizer_id: string;
  organizer?: {
    id: string;
    full_name: string;
    email: string;
  };

  // Project association
  project_id?: string;

  // Status
  status: MeetingStatus;

  // Calendar provider event IDs
  calendar_event_ids: Array<{
    userId: string;
    provider: string;
    eventId: string;
    eventLink?: string;
  }>;

  // Recording, transcript, and summary
  recording_url?: string;
  transcript_url?: string;
  transcript_text?: string;
  summary?: string;

  // Metadata
  created_at: string;
  updated_at: string;
  cancelled_at?: string;

  // Participants (from join)
  participants?: MeetingParticipant[];
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  response_status: ParticipantResponseStatus;
  is_organizer: boolean;
  calendar_event_id?: string;
  invited_at: string;
  responded_at?: string;

  // User info (from join with profiles)
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

// API Request/Response types

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  participantIds: string[];
  projectId?: string;
  location?: string;
  meetingLink?: string;
}

export interface CreateMeetingResponse {
  meeting: Meeting;
  inviteResults: Array<{
    userId: string;
    provider: string;
    success: boolean;
    eventId?: string;
    eventLink?: string;
    error?: string;
  }>;
}

export interface UpdateMeetingParticipantRequest {
  responseStatus: ParticipantResponseStatus;
}

export interface CancelMeetingResponse {
  success: boolean;
  cancelledEvents: number;
  errors?: string[];
}
