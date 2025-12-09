// Shared Daily.co types for Supabase Edge Functions

/**
 * Daily.co Webhook Event Types
 */
export type DailyWebhookEventType =
  | 'recording.ready'
  | 'recording.upload-complete'
  | 'recording.error'
  | 'transcription.ready'
  | 'transcription.error'
  | 'transcript.ready-to-download'
  | 'room.created'
  | 'room.deleted'
  | 'meeting.started'
  | 'meeting.ended'
  | 'participant.joined'
  | 'participant.left'

/**
 * Daily.co Webhook Payload
 */
export interface DailyWebhookPayload {
  type: DailyWebhookEventType
  event: string
  payload: {
    room?: string
    room_name?: string
    id?: string // transcript ID
    mtg_session_id?: string
    start_ts?: number
    duration?: number
    duration_sec?: number
    max_participants?: number
    recording?: {
      id: string
      room_name: string
      start_ts: number
      duration_sec: number
      share_token?: string
      download_link?: string
      s3_key?: string
    }
    transcription?: {
      id: string
      room_name: string
      mtg_session_id: string
      duration_sec: number
      transcript?: string
      transcript_url?: string
    }
    participant?: {
      user_id?: string
      user_name?: string
      joined_at?: number
      duration?: number
    }
  }
}

/**
 * Structured summary data extracted from meeting transcripts
 * Stored in meetings table summary field as JSONB
 */
export interface MeetingSummary {
  title: string
  description?: string
  executive_summary: string
  key_points: string[]
  important_numbers: string[]
  action_items: string[]
  speaker_insights?: string[]
  questions_raised: string[]
  open_questions: string[]
}
