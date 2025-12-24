// src/hooks/useCalendarConnections.ts

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import type {
	CalendarConnection,
	CalendarProvider,
	CalendarSyncStatus,
} from "@/types/calendar-types";

interface UseCalendarConnectionsReturn {
	connections: CalendarConnection[];
	isLoading: boolean;
	error: string | null;
	syncStatus: Record<string, CalendarSyncStatus>;
	refresh: () => Promise<void>;
	disconnectCalendar: (connectionId: string) => Promise<void>;
	updateSyncSettings: (
		connectionId: string,
		syncEnabled: boolean,
		selectedCalendars?: string[]
	) => Promise<void>;
	initiateConnection: (provider: CalendarProvider) => void;
	isDisconnecting: (connectionId: string) => boolean;
}

/**
 * Hook for managing user calendar connections
 * Provides CRUD operations and sync status for calendar integrations
 */
export function useCalendarConnections(): UseCalendarConnectionsReturn {
	const [connections, setConnections] = useState<CalendarConnection[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [syncStatus, setSyncStatus] = useState<
		Record<string, CalendarSyncStatus>
	>({});
	const [pendingDisconnects, setPendingDisconnects] = useState<Set<string>>(
		new Set()
	);

	/**
	 * Fetch all calendar connections for the current user
	 */
	const fetchConnections = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				throw new Error("User not authenticated");
			}

			const { data, error: fetchError } = await supabase
				.from("calendar_connections")
				.select("*")
				.eq("user_id", user.id)
				.order("created_at", { ascending: false });

			if (fetchError) {
				throw fetchError;
			}

			setConnections(data || []);

			// Initialize sync status for each connection
			const statusMap: Record<string, CalendarSyncStatus> = {};
			(data || []).forEach((conn) => {
				statusMap[conn.id] = {
					is_syncing: false,
					last_sync: conn.last_synced_at,
				};
			});
			setSyncStatus(statusMap);
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Failed to fetch calendar connections";
			setError(errorMessage);
			console.error("Error fetching calendar connections:", err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	/**
	 * Disconnect a calendar connection
	 */
	const disconnectCalendar = useCallback(
		async (connectionId: string) => {
			try {
				setPendingDisconnects((prev) =>
					new Set(prev).add(connectionId)
				);
				setError(null);

				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) {
					throw new Error("User not authenticated");
				}

				// Find the connection to stop its watch channel
				const connection = connections.find(
					(conn) => conn.id === connectionId
				);
				if (connection) {
					// Stop the calendar watch via API
					try {
						const response = await fetch(
							"/api/calendar/disconnect",
							{
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
								body: JSON.stringify({ connectionId }),
							}
						);

						if (!response.ok) {
							let errorMessage = `Failed to stop calendar watch (${response.status})`;
							try {
								const errorData = await response.json();
								if (errorData.error) {
									errorMessage += `: ${errorData.error}`;
								}
							} catch {
								// If response isn't JSON, use status text
								errorMessage += `: ${response.statusText}`;
							}
							console.error(errorMessage);
						}
					} catch (watchError) {
						console.error(
							"Error stopping calendar watch:",
							watchError instanceof Error
								? watchError.message
								: String(watchError)
						);
						// Don't fail the disconnect if watch stop fails
					}
				}

				const { error: deleteError } = await supabase
					.from("calendar_connections")
					.delete()
					.eq("id", connectionId)
					.eq("user_id", user.id);

				if (deleteError) {
					throw deleteError;
				}

				// Remove from local state
				setConnections((prev) =>
					prev.filter((conn) => conn.id !== connectionId)
				);
				setSyncStatus((prev) => {
					const newStatus = { ...prev };
					delete newStatus[connectionId];
					return newStatus;
				});
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: "Failed to disconnect calendar";
				setError(errorMessage);
				console.error("Error disconnecting calendar:", err);
				throw err;
			} finally {
				setPendingDisconnects((prev) => {
					const newSet = new Set(prev);
					newSet.delete(connectionId);
					return newSet;
				});
			}
		},
		[connections]
	);

	/**
	 * Update sync settings for a connection
	 */
	const updateSyncSettings = useCallback(
		async (
			connectionId: string,
			syncEnabled: boolean,
			selectedCalendars?: string[]
		) => {
			try {
				setError(null);

				const {
					data: { user },
				} = await supabase.auth.getUser();
				if (!user) {
					throw new Error("User not authenticated");
				}

				const updateData: Partial<CalendarConnection> = {
					sync_enabled: syncEnabled,
				};

				// Update selected calendars in calendar_list if provided
				if (selectedCalendars !== undefined) {
					const connection = connections.find(
						(c) => c.id === connectionId
					);
					if (connection) {
						updateData.calendar_list = connection.calendar_list.map(
							(cal) => ({
								...cal,
								selected: selectedCalendars.includes(cal.id),
							})
						);
					}
				}

				const { error: updateError } = await supabase
					.from("calendar_connections")
					.update(updateData)
					.eq("id", connectionId)
					.eq("user_id", user.id);

				if (updateError) {
					throw updateError;
				}

				// Update local state
				setConnections((prev) =>
					prev.map((conn) =>
						conn.id === connectionId
							? { ...conn, ...updateData }
							: conn
					)
				);
			} catch (err) {
				const errorMessage =
					err instanceof Error
						? err.message
						: "Failed to update sync settings";
				setError(errorMessage);
				console.error("Error updating sync settings:", err);
				throw err;
			}
		},
		[connections]
	);

	/**
	 * Initiate OAuth flow for connecting a calendar
	 */
	const initiateConnection = useCallback((provider: CalendarProvider) => {
		// Construct OAuth URL based on provider
		const baseUrl = window.location.origin;
		const redirectUri = `${baseUrl}/api/calendar/callback`;

		// Encode return URL in state parameter (format: provider|returnUrl)
		const returnUrl = window.location.pathname + window.location.search;
		const state = `${provider}|${encodeURIComponent(returnUrl)}`;

		let authUrl = "";

		switch (provider) {
			case "google":
				authUrl =
					`https://accounts.google.com/o/oauth2/v2/auth?` +
					`client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}` +
					`&redirect_uri=${encodeURIComponent(redirectUri)}` +
					`&response_type=code` +
					`&scope=${encodeURIComponent(
						"openid email https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"
					)}` +
					`&access_type=offline` +
					`&prompt=consent` +
					`&state=${encodeURIComponent(state)}`;
				break;

			default:
				setError(`Unknown calendar provider: ${provider}`);
				return;
		}

		// Open OAuth flow in popup or redirect
		window.location.href = authUrl;
	}, []);

	/**
	 * Check if a connection is being disconnected
	 */
	const isDisconnecting = useCallback(
		(connectionId: string) => {
			return pendingDisconnects.has(connectionId);
		},
		[pendingDisconnects]
	);

	/**
	 * Initial load
	 */
	useEffect(() => {
		fetchConnections();
	}, [fetchConnections]);

	return {
		connections,
		isLoading,
		error,
		syncStatus,
		refresh: fetchConnections,
		disconnectCalendar,
		updateSyncSettings,
		initiateConnection,
		isDisconnecting,
	};
}
