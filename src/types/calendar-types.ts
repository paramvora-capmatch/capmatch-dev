// src/types/calendar-types.ts

/**
 * Calendar integration types
 */

export type CalendarProvider = 'google';

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: CalendarProvider;
  provider_account_id: string;
  provider_email?: string;
  access_token?: string; // Should be encrypted in DB
  refresh_token?: string; // Should be encrypted in DB
  token_expires_at?: string;
  calendar_list: CalendarInfo[];
  sync_enabled: boolean;
  last_synced_at?: string;
  watch_channel_id?: string | null;
  watch_resource_id?: string | null;
  watch_expiration?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarInfo {
  id: string;
  name: string;
  description?: string;
  primary?: boolean;
  selected?: boolean; // Whether this calendar is selected for sync
  color?: string;
  timezone?: string;
}

export interface CalendarEvent {
  id: string;
  connection_id: string;
  provider_event_id: string;
  calendar_id: string;
  summary?: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  attendees: CalendarAttendee[];
  event_data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  response_status?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  optional?: boolean;
}

export interface CalendarSyncStatus {
  is_syncing: boolean;
  last_sync?: string;
  next_sync?: string;
  error?: string;
}

/**
 * OAuth configuration for calendar providers
 */
export interface CalendarOAuthConfig {
  provider: CalendarProvider;
  client_id: string;
  redirect_uri: string;
  scopes: string[];
}

/**
 * Calendar connection request/response types
 */
export interface ConnectCalendarRequest {
  provider: CalendarProvider;
  code: string; // OAuth authorization code
}

export interface ConnectCalendarResponse {
  connection: CalendarConnection;
  success: boolean;
  error?: string;
}

export interface DisconnectCalendarRequest {
  connection_id: string;
}

export interface UpdateCalendarSyncRequest {
  connection_id: string;
  sync_enabled: boolean;
  selected_calendars?: string[]; // Calendar IDs to sync
}
