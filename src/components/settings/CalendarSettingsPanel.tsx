"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, CheckCircle2, Clock, Loader2, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useCalendarConnections } from "@/hooks/useCalendarConnections";
import { cn } from "@/utils/cn";
import type { CalendarProvider, CalendarConnection } from "@/types/calendar-types";

const PROVIDER_INFO = {
  google: {
    name: "Google Calendar",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="32px" height="32px">
        <path fill="#4285F4" d="M35,42H13c-3.866,0-7-3.134-7-7V13c0-3.866,3.134-7,7-7h22c3.866,0,7,3.134,7,7v22C42,38.866,38.866,42,35,42z"/>
        <path fill="#FFF" d="M31,12h-3v4h-8v-4h-3v4h-8v20h28V16h-6V12z M14,32h-3v-3h3V32z M14,27h-3v-3h3V27z M14,22h-3v-3h3V22z M19,32h-3v-3h3V32z M19,27h-3v-3h3V27z M19,22h-3v-3h3V22z M24,32h-3v-3h3V32z M24,27h-3v-3h3V27z M24,22h-3v-3h3V22z M29,32h-3v-3h3V32z M29,27h-3v-3h3V27z M29,22h-3v-3h3V22z M34,32h-3v-3h3V32z M34,27h-3v-3h3V27z M34,22h-3v-3h3V22z"/>
      </svg>
    ),
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Connect your Google Calendar to sync meetings and events",
  },
};

export const CalendarSettingsPanel = () => {
  const {
    connections,
    isLoading,
    error,
    syncStatus,
    refresh,
    disconnectCalendar,
    updateSyncSettings,
    initiateConnection,
    isDisconnecting,
  } = useCalendarConnections();

  const [expandedConnection, setExpandedConnection] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for success/error messages in URL params (from OAuth redirect)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const calendarConnected = params.get('calendar_connected');
      const calendarError = params.get('calendar_error');

      if (calendarConnected === 'true') {
        setSuccessMessage('Calendar connected successfully!');
        // Refresh connections to show the new one
        refresh();
        // Clear the URL param
        window.history.replaceState({}, '', window.location.pathname);
        // Auto-hide success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else if (calendarError) {
        // Error is already handled by the error state from the hook
        // Just clear the URL param
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [refresh]);

  const handleConnect = useCallback((provider: CalendarProvider) => {
    initiateConnection(provider);
  }, [initiateConnection]);

  const handleDisconnect = useCallback(async (connectionId: string) => {
    if (!confirm("Are you sure you want to disconnect this calendar? Your synced events will be removed.")) {
      return;
    }
    try {
      await disconnectCalendar(connectionId);
    } catch (err) {
      console.error("Failed to disconnect calendar:", err);
    }
  }, [disconnectCalendar]);

  const handleToggleSync = useCallback(async (connection: CalendarConnection) => {
    try {
      await updateSyncSettings(connection.id, !connection.sync_enabled);
    } catch (err) {
      console.error("Failed to toggle sync:", err);
    }
  }, [updateSyncSettings]);

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return "Never synced";
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const connectedProviders = new Set(connections.map((conn) => conn.provider));
  const availableProviders = (Object.keys(PROVIDER_INFO) as CalendarProvider[])
    .filter((provider) => !connectedProviders.has(provider))
    .filter((provider) => provider === 'google'); // Only show Google Calendar option

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Calendar Connections</h3>
        <p className="mt-1 text-sm text-gray-500">
          Connect your calendars to sync meetings and schedule events directly from CapMatch.
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">Success</p>
              <p className="mt-1 text-sm text-green-700">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connected Calendars */}
      {connections.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Connected Calendars</h4>
          {connections.map((connection) => {
            const providerInfo = PROVIDER_INFO[connection.provider];
            const status = syncStatus[connection.id];
            const isExpanded = expandedConnection === connection.id;
            const disconnecting = isDisconnecting(connection.id);

            return (
              <div
                key={connection.id}
                className={cn(
                  "rounded-xl border border-gray-200 bg-white transition-all",
                  isExpanded && "ring-2 ring-blue-500 ring-offset-2"
                )}
              >
                {/* Connection Header */}
                <div className="flex items-start gap-4 p-4">
                  {/* Provider Icon */}
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg text-2xl", providerInfo.bgColor)}>
                    {providerInfo.icon}
                  </div>

                  {/* Connection Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-gray-900">{providerInfo.name}</h5>
                      {connection.sync_enabled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          <XCircle className="h-3 w-3" />
                          Paused
                        </span>
                      )}
                    </div>
                    {connection.provider_email && (
                      <p className="mt-1 text-sm text-gray-500">{connection.provider_email}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatLastSync(status?.last_sync)}
                      </span>
                      {connection.calendar_list.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {connection.calendar_list.filter((cal) => cal.selected).length} / {connection.calendar_list.length} calendars
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleSync(connection)}
                      disabled={disconnecting || status?.is_syncing}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        connection.sync_enabled
                          ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      )}
                    >
                      {status?.is_syncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : connection.sync_enabled ? (
                        "Pause"
                      ) : (
                        "Resume"
                      )}
                    </button>
                    <button
                      onClick={() => handleDisconnect(connection.id)}
                      disabled={disconnecting}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                      title="Disconnect calendar"
                    >
                      {disconnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Calendar List (if expanded) */}
                {isExpanded && connection.calendar_list.length > 0 && (
                  <div className="border-t border-gray-200 p-4">
                    <h6 className="mb-3 text-sm font-medium text-gray-700">Calendars</h6>
                    <div className="space-y-2">
                      {connection.calendar_list.map((calendar) => (
                        <div
                          key={calendar.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: calendar.color || "#3b82f6" }}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{calendar.name}</p>
                              {calendar.description && (
                                <p className="text-xs text-gray-500">{calendar.description}</p>
                              )}
                            </div>
                          </div>
                          {calendar.selected && (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expand Toggle */}
                {connection.calendar_list.length > 0 && (
                  <button
                    onClick={() => setExpandedConnection(isExpanded ? null : connection.id)}
                    className="w-full border-t border-gray-200 py-2 text-center text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50"
                  >
                    {isExpanded ? "Hide calendars" : "View calendars"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Calendar */}
      {availableProviders.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Add Calendar</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {availableProviders.map((provider) => {
              const providerInfo = PROVIDER_INFO[provider];
              return (
                <button
                  key={provider}
                  onClick={() => handleConnect(provider)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-blue-300 hover:shadow-sm"
                  )}
                >
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg text-2xl", providerInfo.bgColor)}>
                    {providerInfo.icon}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900">{providerInfo.name}</h5>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Click to connect
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {connections.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h4 className="mt-4 text-sm font-semibold text-gray-900">No calendars connected</h4>
          <p className="mt-2 text-sm text-gray-500">
            Connect your calendar to automatically sync meetings and events with CapMatch.
          </p>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>
    </div>
  );
};
