// src/types/daily-types.ts

/**
 * Daily.co API Request/Response Types
 */

// Create Room Request
export interface CreateRoomRequest {
  meetingId?: string; // If associating with existing meeting
  projectId?: string; // For room naming convention
  roomConfig?: {
    maxParticipants?: number;
    enableRecording?: boolean;
    enableScreenshare?: boolean;
    enableChat?: boolean;
  };
}

// Create Room Response
export interface CreateRoomResponse {
  roomName: string;
  roomUrl: string; // https://capmatch.daily.co/[roomName]
  meetingId?: string;
}

// Meeting Token Request
export interface MeetingTokenRequest {
  roomName: string;
  meetingId?: string; // Optional: for permission checking
}

// Meeting Token Response
export interface MeetingTokenResponse {
  token: string;
  isOwner: boolean;
  roomUrl: string;
}

// Delete Room Request
export interface DeleteRoomRequest {
  roomName?: string;
  meetingId?: string;
}

// Daily.co Room Configuration (from API)
export interface DailyRoomConfig {
  name: string;
  url: string;
  api_created: boolean;
  privacy: 'public' | 'private';
  properties: {
    enable_screenshare?: boolean;
    enable_chat?: boolean;
    enable_recording?: 'cloud' | 'local' | 'disabled';
    max_participants?: number;
    start_video_off?: boolean;
    start_audio_off?: boolean;
    enable_prejoin_ui?: boolean;
  };
  config?: {
    exp?: number; // Room expiration timestamp
  };
}

// Room Details Response
export interface RoomDetailsResponse {
  roomName: string;
  config: DailyRoomConfig;
  activeParticipants: number;
  meetingId?: string;
  isActive: boolean;
}

// Daily.co Webhook Event Types
export type DailyWebhookEventType =
  | 'recording.ready'
  | 'recording.upload-complete'
  | 'recording.error'
  | 'transcription.ready'
  | 'transcription.error'
  | 'room.created'
  | 'room.deleted'
  | 'meeting.started'
  | 'meeting.ended'
  | 'participant.joined'
  | 'participant.left';

// Daily.co Webhook Payload
export interface DailyWebhookPayload {
  type: DailyWebhookEventType;
  event: string;
  payload: {
    room?: string;
    room_name?: string;
    mtg_session_id?: string;
    start_ts?: number;
    duration_sec?: number;
    max_participants?: number;
    recording?: {
      id: string;
      room_name: string;
      start_ts: number;
      duration_sec: number;
      share_token?: string;
      download_link?: string;
      s3_key?: string;
    };
    transcription?: {
      id: string;
      room_name: string;
      mtg_session_id: string;
      duration_sec: number;
      transcript?: string;
      transcript_url?: string;
    };
    participant?: {
      user_id?: string;
      user_name?: string;
      joined_at?: number;
      duration?: number;
    };
  };
}

// Daily.co API Error Response
export interface DailyApiError {
  error: string;
  info?: string;
}

// Daily.co Room Presence (live participant info)
export interface DailyRoomPresence {
  total_count: number;
  domain: string;
  room_name: string;
  participants?: Array<{
    id: string;
    user_name?: string;
    joined_at: number;
  }>;
}

// Daily.co Create Room API Request Body
export interface DailyCreateRoomApiRequest {
  name?: string; // Room name (optional, auto-generated if not provided)
  privacy?: 'public' | 'private';
  properties?: {
    enable_chat?: boolean;
    enable_screenshare?: boolean;
    enable_recording?: 'cloud' | 'local' | 'disabled';
    enable_transcription?: boolean; // Enable transcription capability
    enable_transcription_storage?: boolean; // Store transcript for webhook retrieval
    enable_advanced_chat?: boolean;
    enable_emoji_reactions?: boolean;
    enable_hand_raising?: boolean;
    enable_breakout_rooms?: boolean;
    enable_pip_ui?: boolean;
    enable_people_ui?: boolean;
    enable_prejoin_ui?: boolean;
    enable_network_ui?: boolean;
    enable_noise_cancellation_ui?: boolean;
    enable_live_captions_ui?: boolean;
    start_video_off?: boolean;
    start_audio_off?: boolean;
    max_participants?: number;
    exp?: number; // Unix timestamp for room expiration
    eject_at_room_exp?: boolean;
  };
}

// Daily.co Meeting Token API Request Body
export interface DailyMeetingTokenApiRequest {
  properties: {
    room_name: string;
    user_name?: string;
    user_id?: string;
    is_owner?: boolean;
    enable_recording?: 'cloud' | 'local';
    start_video_off?: boolean;
    start_audio_off?: boolean;
    exp?: number; // Unix timestamp for token expiration
  };
}

// Daily.co Meeting Token API Response
export interface DailyMeetingTokenApiResponse {
  token: string;
}
