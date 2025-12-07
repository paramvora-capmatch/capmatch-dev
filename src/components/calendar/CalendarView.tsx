"use client";

import { useCallback, useEffect, useState } from "react";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { Calendar, Clock, MapPin, Users, ExternalLink, RefreshCw, Settings, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/utils/cn";
import Link from "next/link";

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: { email: string; name?: string }[];
  calendarName: string;
  calendarColor?: string;
  provider: string;
  htmlLink?: string;
}

export const CalendarView = () => {
  const { connections, isLoading, error, refresh } = useCalendarConnections();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'upcoming' | 'all'>('upcoming');

  const fetchEvents = useCallback(async () => {
    if (connections.length === 0) return;

    setLoadingEvents(true);
    setEventsError(null);

    try {
      // Fetch events for all connected calendars
      const allEvents: CalendarEvent[] = [];

      for (const connection of connections) {
        if (!connection.sync_enabled) continue;

        const selectedCalendars = connection.calendar_list.filter(cal => cal.selected);

        for (const calendar of selectedCalendars) {
          try {
            console.log(`[CalendarView] Fetching events for ${calendar.name} (${calendar.id})`);
            const response = await fetch('/api/calendar/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                connectionId: connection.id,
                calendarId: calendar.id,
                timeMin: new Date().toISOString(),
                maxResults: 20,
              }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              console.error(`[CalendarView] Failed to fetch events for ${calendar.name}:`, {
                status: response.status,
                error: errorData,
              });
              continue;
            }

            const data = await response.json();
            const calendarEvents = data.events.map((event: any) => ({
              ...event,
              calendarName: calendar.name,
              calendarColor: calendar.color,
              provider: connection.provider,
            }));

            allEvents.push(...calendarEvents);
          } catch (err) {
            console.error(`Error fetching events for ${calendar.name}:`, err);
          }
        }
      }

      // Sort events by start time
      allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      setEvents(allEvents);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      setEventsError(errorMessage);
    } finally {
      setLoadingEvents(false);
    }
  }, [connections]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const formatEventDate = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const now = new Date();

    const isToday = startDate.toDateString() === now.toDateString();
    const isTomorrow = startDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    let dateStr = '';
    if (isToday) {
      dateStr = 'Today';
    } else if (isTomorrow) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = startDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }

    const timeStr = `${startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })} - ${endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`;

    return { dateStr, timeStr };
  };

  const groupEventsByDate = (events: CalendarEvent[]) => {
    const groups: Record<string, CalendarEvent[]> = {};

    events.forEach(event => {
      const date = new Date(event.start).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });

    return groups;
  };

  const upcomingEvents = events.filter(event => new Date(event.start) > new Date());
  const displayEvents = selectedView === 'upcoming' ? upcomingEvents : events;
  const groupedEvents = groupEventsByDate(displayEvents);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-800">Error loading calendars</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-900">No calendars connected</h3>
        <p className="mt-2 text-sm text-gray-500">
          Connect your calendar to see your upcoming events and meetings.
        </p>
        <Link
          href="/settings?tab=calendar"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Settings className="h-4 w-4" />
          Connect Calendar
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Calendar</h2>
          <p className="mt-1 text-sm text-gray-500">
            {connections.length} calendar{connections.length !== 1 ? 's' : ''} connected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchEvents()}
            disabled={loadingEvents}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className={cn("h-4 w-4", loadingEvents && "animate-spin")} />
            Refresh
          </button>
          <Link
            href="/settings?tab=calendar"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* Connected Calendars Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {connections.map(connection => {
          const selectedCount = connection.calendar_list.filter(cal => cal.selected).length;
          return (
            <div
              key={connection.id}
              className={cn(
                "rounded-lg border p-4",
                connection.sync_enabled
                  ? "border-green-200 bg-green-50"
                  : "border-gray-200 bg-gray-50"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {connection.provider === 'google' ? 'Google Calendar' :
                       connection.provider === 'microsoft' ? 'Microsoft Outlook' :
                       'Calendar'}
                    </p>
                    <p className="text-xs text-gray-500">{connection.provider_email}</p>
                  </div>
                </div>
                {connection.sync_enabled && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {selectedCount} calendar{selectedCount !== 1 ? 's' : ''} syncing
              </p>
            </div>
          );
        })}
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setSelectedView('upcoming')}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            selectedView === 'upcoming'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          Upcoming ({upcomingEvents.length})
        </button>
        <button
          onClick={() => setSelectedView('all')}
          className={cn(
            "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            selectedView === 'all'
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          All Events ({events.length})
        </button>
      </div>

      {/* Events List */}
      {loadingEvents ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : eventsError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{eventsError}</p>
        </div>
      ) : displayEvents.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-12 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 font-semibold text-gray-900">No events found</h3>
          <p className="mt-2 text-sm text-gray-500">
            {selectedView === 'upcoming'
              ? "You don't have any upcoming events."
              : "No events found in your calendars."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([date, dateEvents]) => {
            const dateObj = new Date(date);
            const isToday = dateObj.toDateString() === new Date().toDateString();
            const isTomorrow = dateObj.toDateString() === new Date(Date.now() + 86400000).toDateString();

            return (
              <div key={date}>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dateObj.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                  })}
                </h3>
                <div className="space-y-3">
                  {dateEvents.map(event => {
                    const { timeStr } = formatEventDate(event.start, event.end);
                    return (
                      <div
                        key={event.id}
                        className="group rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="h-12 w-1 flex-shrink-0 rounded"
                            style={{ backgroundColor: event.calendarColor || '#3b82f6' }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{event.summary}</h4>
                                <div className="mt-2 space-y-1">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Clock className="h-4 w-4 flex-shrink-0" />
                                    <span>{timeStr}</span>
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <MapPin className="h-4 w-4 flex-shrink-0" />
                                      <span className="truncate">{event.location}</span>
                                    </div>
                                  )}
                                  {event.attendees && event.attendees.length > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                      <Users className="h-4 w-4 flex-shrink-0" />
                                      <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    <span>{event.calendarName}</span>
                                  </div>
                                </div>
                                {event.description && (
                                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                              {event.htmlLink && (
                                <a
                                  href={event.htmlLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 rounded p-2 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                                  title="View in calendar"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
