// src/types/availability.ts

/**
 * Types for meeting availability functionality
 */

export interface AvailabilityRequest {
  userIds: string[];
  startDate: string; // ISO 8601 format
  endDate: string; // ISO 8601 format
  duration?: number; // Duration in minutes (default: 30)
  timeZone?: string; // IANA timezone (default: UTC)
}

export interface AvailabilityResponse {
  freeSlots: TimeSlot[];
  busyPeriods: BusyPeriod[];
  users: UserAvailability[];
}

export interface TimeSlot {
  start: string; // ISO 8601 format
  end: string; // ISO 8601 format
}

export interface BusyPeriod {
  start: string; // ISO 8601 format
  end: string; // ISO 8601 format
  userId?: string;
}

export interface UserAvailability {
  userId: string;
  hasCalendarConnected: boolean;
  calendarConnections: number;
  busySlots: TimeSlot[];
}

export interface CalendarEventSimple {
  start: string;
  end: string;
  allDay?: boolean;
}
