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
 * Generate busy slots for non-working hours (Mon-Fri, 9am-5pm)
 */
export function getNonWorkingPeriods(start: Date, end: Date, timeZone: string): TimeSlot[] {
  const busySlots: TimeSlot[] = [];
  let current = new Date(start);
  let busyStart: Date | null = null;
  
  // Helper to check if time is working hour
  const isWorkingTime = (date: Date) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
        weekday: 'short',
        timeZone
      }).formatToParts(date);
      
      const hourPart = parts.find(p => p.type === 'hour');
      const weekdayPart = parts.find(p => p.type === 'weekday');
      
      if (!hourPart || !weekdayPart) return true; // Fallback to available
      
      const hour = parseInt(hourPart.value);
      const weekday = weekdayPart.value;
      
      // Assume Mon-Fri, 9am-5pm
      if (weekday === 'Sat' || weekday === 'Sun') return false;
      return hour >= 9 && hour < 17;
    } catch (e) {
      console.warn(`[Availability] Invalid timezone ${timeZone}, falling back to UTC`);
      // Fallback to UTC
      const hour = date.getUTCHours();
      const day = date.getUTCDay();
      if (day === 0 || day === 6) return false;
      return hour >= 9 && hour < 17;
    }
  };

  // Iterate in 15 minute chunks
  const step = 15 * 60 * 1000;
  
  // Align start to nearest 15 min to avoid tiny slots? 
  // For now, just start iterating.
  
  while (current < end) {
    if (!isWorkingTime(current)) {
      if (!busyStart) busyStart = new Date(current);
    } else {
      if (busyStart) {
        busySlots.push({
          start: busyStart.toISOString(),
          end: current.toISOString()
        });
        busyStart = null;
      }
    }
    current = new Date(current.getTime() + step);
  }
  
  if (busyStart) {
    busySlots.push({
      start: busyStart.toISOString(),
      end: current.toISOString() // Cap at end date
    });
  }
  
  return busySlots;
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
  let userTimeZone = 'UTC';

  // Try to find user's timezone from connections
  for (const connection of connections) {
    const primary = connection.calendar_list.find(cal => cal.primary);
    if (primary?.timezone) {
      userTimeZone = primary.timezone;
      break;
    }
    // Fallback to any timezone
    const anyTz = connection.calendar_list.find(cal => cal.timezone)?.timezone;
    if (anyTz && userTimeZone === 'UTC') {
      userTimeZone = anyTz;
    }
  }

  console.log(`[Availability] Using timezone ${userTimeZone} for user ${userId}`);

  // Add non-working hours as busy slots
  const nonWorkingSlots = getNonWorkingPeriods(
    new Date(startDate), 
    new Date(endDate), 
    userTimeZone
  );
  busySlots.push(...nonWorkingSlots);

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
