// src/services/availabilityService.ts

import type { CalendarConnection } from '@/types/calendar-types';
import type { TimeSlot, BusyPeriod, CalendarEventSimple, UserAvailability } from '@/types/availability';
import { ensureValidToken } from '@/lib/calendarTokenManager';

/**
 * Fetch events from Google Calendar for a specific time range
 */
async function fetchGoogleCalendarEvents(
  accessToken: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string
): Promise<CalendarEventSimple[]> {
  const allEvents: CalendarEventSimple[] = [];

  for (const calendarId of calendarIds) {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500', // Maximum allowed by Google
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Google Calendar] Fetch events failed:', {
        status: response.status,
        calendarId,
        error,
      });
      // Continue with other calendars instead of throwing
      continue;
    }

    const data = await response.json();
    const events = (data.items || []).map((event: any) => ({
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      allDay: !event.start.dateTime, // If no dateTime, it's an all-day event
    }));

    allEvents.push(...events);
  }

  return allEvents;
}

/**
 * Fetch events from Microsoft Calendar for a specific time range
 */
async function fetchMicrosoftCalendarEvents(
  accessToken: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string
): Promise<CalendarEventSimple[]> {
  const allEvents: CalendarEventSimple[] = [];

  for (const calendarId of calendarIds) {
    const params = new URLSearchParams({
      $top: '1000',
      $orderby: 'start/dateTime',
      $filter: `start/dateTime ge '${timeMin}' and start/dateTime lt '${timeMax}'`,
    });

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendars/${calendarId}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[Microsoft Calendar] Fetch events failed:', {
        status: response.status,
        calendarId,
        error,
      });
      // Continue with other calendars instead of throwing
      continue;
    }

    const data = await response.json();
    const events = (data.value || []).map((event: any) => ({
      start: event.start.dateTime,
      end: event.end.dateTime,
      allDay: event.isAllDay || false,
    }));

    allEvents.push(...events);
  }

  return allEvents;
}

/**
 * Fetch all busy periods for a user's calendar connections
 */
export async function fetchUserBusyPeriods(
  userId: string,
  connections: CalendarConnection[],
  startDate: string,
  endDate: string,
  supabase: any
): Promise<TimeSlot[]> {
  const busySlots: TimeSlot[] = [];

  for (const connection of connections) {
    // Skip if sync is disabled
    if (!connection.sync_enabled) {
      console.log(`[Availability] Skipping disabled connection ${connection.id} for user ${userId}`);
      continue;
    }

    // Get selected calendars or use all calendars
    const selectedCalendars = connection.calendar_list
      .filter(cal => cal.selected !== false)
      .map(cal => cal.id);

    if (selectedCalendars.length === 0) {
      console.log(`[Availability] No selected calendars for connection ${connection.id}`);
      continue;
    }

    try {
      // Ensure valid access token
      const accessToken = await ensureValidToken(connection, supabase);

      // Fetch events based on provider
      let events: CalendarEventSimple[] = [];

      switch (connection.provider) {
        case 'google':
          events = await fetchGoogleCalendarEvents(
            accessToken,
            selectedCalendars,
            startDate,
            endDate
          );
          break;

        case 'microsoft':
          events = await fetchMicrosoftCalendarEvents(
            accessToken,
            selectedCalendars,
            startDate,
            endDate
          );
          break;

        default:
          console.warn(`[Availability] Unsupported provider: ${connection.provider}`);
          continue;
      }

      // Convert events to busy slots (skip all-day events)
      const slots = events
        .filter(event => !event.allDay)
        .map(event => ({
          start: event.start,
          end: event.end,
        }));

      busySlots.push(...slots);
    } catch (error) {
      console.error(`[Availability] Error fetching events for connection ${connection.id}:`, error);
      // Continue with other connections
    }
  }

  return busySlots;
}

/**
 * Merge overlapping time slots
 */
function mergeTimeSlots(slots: TimeSlot[]): TimeSlot[] {
  if (slots.length === 0) return [];

  // Sort by start time
  const sorted = [...slots].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const merged: TimeSlot[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];

    const lastMergedEnd = new Date(lastMerged.end).getTime();
    const currentStart = new Date(current.start).getTime();

    // If current slot overlaps or touches the last merged slot
    if (currentStart <= lastMergedEnd) {
      // Extend the last merged slot if current ends later
      const currentEnd = new Date(current.end).getTime();
      if (currentEnd > lastMergedEnd) {
        lastMerged.end = current.end;
      }
    } else {
      // No overlap, add as new slot
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Calculate free time slots between busy periods
 */
export function calculateFreeSlots(
  busySlots: TimeSlot[],
  startDate: string,
  endDate: string,
  durationMinutes: number
): TimeSlot[] {
  // Merge overlapping busy slots
  const mergedBusy = mergeTimeSlots(busySlots);

  const freeSlots: TimeSlot[] = [];
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const duration = durationMinutes * 60 * 1000; // Convert to milliseconds

  let currentTime = start;

  for (const busySlot of mergedBusy) {
    const busyStart = new Date(busySlot.start).getTime();
    const busyEnd = new Date(busySlot.end).getTime();

    // If there's a gap between current time and this busy slot
    if (currentTime < busyStart) {
      const gapStart = currentTime;
      const gapEnd = busyStart;

      // Split the gap into slots of the requested duration
      let slotStart = gapStart;
      while (slotStart + duration <= gapEnd) {
        freeSlots.push({
          start: new Date(slotStart).toISOString(),
          end: new Date(slotStart + duration).toISOString(),
        });
        slotStart += duration;
      }
    }

    // Move current time to the end of this busy slot
    currentTime = Math.max(currentTime, busyEnd);
  }

  // Handle any remaining time after the last busy slot
  if (currentTime < end) {
    let slotStart = currentTime;
    while (slotStart + duration <= end) {
      freeSlots.push({
        start: new Date(slotStart).toISOString(),
        end: new Date(slotStart + duration).toISOString(),
      });
      slotStart += duration;
    }
  }

  return freeSlots;
}

/**
 * Find common free slots across multiple users
 */
export function findCommonFreeSlots(
  userAvailabilities: UserAvailability[],
  startDate: string,
  endDate: string,
  durationMinutes: number
): TimeSlot[] {
  // Collect all busy slots from all users
  const allBusySlots: TimeSlot[] = [];

  for (const userAvail of userAvailabilities) {
    // Only consider users who have calendars connected
    if (userAvail.hasCalendarConnected) {
      allBusySlots.push(...userAvail.busySlots);
    }
  }

  // Calculate free slots based on combined busy periods
  return calculateFreeSlots(allBusySlots, startDate, endDate, durationMinutes);
}
