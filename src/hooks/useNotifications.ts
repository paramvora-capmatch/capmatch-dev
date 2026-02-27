"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "./useAuth";
import { useToast } from "@/contexts/ToastContext";
import { isValidUuid } from "@/lib/isUuid";

export interface NotificationRecord {
	id: number;
	user_id: string;
	event_id: number;
	title: string;
	body: string | null;
	link_url: string | null;
	read_at: string | null;
	created_at: string;
	payload?: {
		type?: string;
		start_time?: string;
		meeting_title?: string;
		meeting_id?: string;
		[key: string]: any;
	} | null;
}

interface UseNotificationsOptions {
	limit?: number;
}

interface UseNotificationsResult {
	notifications: NotificationRecord[];
	isLoading: boolean;
	error: string | null;
	unreadCount: number;
	refresh: () => Promise<void>;
	markAsRead: (id: number) => Promise<void>;
	markAllAsRead: () => Promise<void>;
	isNewSinceLastView: (notification: NotificationRecord) => boolean;
	updateLastViewedAt: () => void;
}

export function useNotifications({
	limit = 50,
}: UseNotificationsOptions = {}): UseNotificationsResult {
	const { user, isAuthenticated } = useAuth();
	const { showToast } = useToast();
	const [notifications, setNotifications] = useState<NotificationRecord[]>(
		[]
	);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);
	const channelRef = useRef<RealtimeChannel | null>(null);
	const isInitialLoadRef = useRef<boolean>(true);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const maxReconnectAttempts = 5;

	const resetState = useCallback(() => {
		setNotifications([]);
		setIsLoading(false);
		setError(null);
	}, []);

	const fetchNotifications = useCallback(async () => {
		if (!user?.id || !isAuthenticated) {
			resetState();
			return;
		}
		if (!isValidUuid(user.id)) {
			resetState();
			return;
		}

		setIsLoading(true);
		setError(null);

		const { data, error: queryError } = await supabase
			.from("notifications")
			.select("*")
			.eq("user_id", user.id)
			.order("created_at", { ascending: false })
			.limit(limit);

		if (queryError) {
			console.error(
				"[useNotifications] Failed to fetch notifications:",
				queryError
			);
			setError(queryError.message);
			setNotifications([]);
		} else {
			setNotifications(data ?? []);
		}

		setIsLoading(false);
	}, [isAuthenticated, limit, resetState, user?.id]);

	const markAsRead = useCallback(
		async (id: number) => {
			if (!id) return;
			const existing = notifications.find((n) => n.id === id);
			if (!existing || existing.read_at) return;

			const optimisticTimestamp = new Date().toISOString();
			setNotifications((prev) =>
				prev.map((notification) =>
					notification.id === id
						? { ...notification, read_at: optimisticTimestamp }
						: notification
				)
			);

			const { error: updateError } = await supabase
				.from("notifications")
				.update({ read_at: optimisticTimestamp })
				.eq("id", id);

			if (updateError) {
				console.error(
					"[useNotifications] Failed to mark notification as read:",
					updateError
				);
				// Revert optimistic update
				setNotifications((prev) =>
					prev.map((notification) =>
						notification.id === id
							? { ...notification, read_at: existing.read_at }
							: notification
					)
				);
				setError(updateError.message);
			}
		},
		[notifications]
	);

	const markAllAsRead = useCallback(async () => {
		const unreadIds = notifications
			.filter((n) => !n.read_at)
			.map((n) => n.id);

		if (unreadIds.length === 0) return;

		const optimisticTimestamp = new Date().toISOString();

		// Optimistic update
		setNotifications((prev) =>
			prev.map((n) => ({
				...n,
				read_at: n.read_at || optimisticTimestamp,
			}))
		);

		// DB update
		const { error: updateError } = await supabase
			.from("notifications")
			.update({ read_at: optimisticTimestamp })
			.in("id", unreadIds);

		if (updateError) {
			console.error(
				"[useNotifications] Failed to mark all notifications as read:",
				updateError
			);
			// Rollback on error
			setNotifications((prev) =>
				prev.map((n) =>
					unreadIds.includes(n.id) ? { ...n, read_at: null } : n
				)
			);
			setError(updateError.message);
		}
	}, [notifications]);

	const updateLastViewedAt = useCallback(() => {
		const now = new Date().toISOString();
		setLastViewedAt(now);
		// Persist to localStorage for cross-session consistency
		if (typeof window !== "undefined") {
			localStorage.setItem("notifications_last_viewed_at", now);
		}
	}, []);

	const isNewSinceLastView = useCallback(
		(notification: NotificationRecord) => {
			if (!lastViewedAt) return false;
			return new Date(notification.created_at) > new Date(lastViewedAt);
		},
		[lastViewedAt]
	);

	useEffect(() => {
		if (!user?.id || !isAuthenticated) {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
			resetState();
			return;
		}

		// Load lastViewedAt from localStorage on initial mount
		if (typeof window !== "undefined") {
			const stored = localStorage.getItem("notifications_last_viewed_at");
			if (stored) {
				setLastViewedAt(stored);
			}
		}

		fetchNotifications();

		const setupChannel = () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}

			const channel = supabase
				.channel(`notifications-${user.id}`)
				.on(
					"postgres_changes",
					{
						event: "INSERT",
						schema: "public",
						table: "notifications",
						filter: `user_id=eq.${user.id}`,
					},
					(payload) => {
						console.log("[useNotifications] New notification received:", payload);
						const incoming = payload.new as NotificationRecord;

						// Only show toast for truly new notifications (not on initial load)
						if (!isInitialLoadRef.current) {
							showToast({
								id: String(incoming.id),
								user_id: incoming.user_id,
								event_id: incoming.event_id,
								title: incoming.title,
								body: incoming.body,
								link_url: incoming.link_url,
								read_at: incoming.read_at,
								payload: incoming.payload,
								created_at: incoming.created_at,
							});
						}

						setNotifications((prev) => {
							const alreadyExists = prev.some(
								(n) => n.id === incoming.id
							);
							if (alreadyExists) {
								return prev;
							}
							const next = [incoming, ...prev];
							return next.slice(0, limit);
						});
					}
				)
				.on(
					"postgres_changes",
					{
						event: "UPDATE",
						schema: "public",
						table: "notifications",
						filter: `user_id=eq.${user.id}`,
					},
					(payload) => {
						console.log("[useNotifications] Notification updated:", payload);
						const updated = payload.new as NotificationRecord;
						setNotifications((prev) =>
							prev.map((n) =>
								n.id === updated.id ? updated : n
							)
						);
					}
				);

			channel.subscribe((status) => {
				if (status === "SUBSCRIBED") {
					reconnectAttemptsRef.current = 0;
					console.log("[useNotifications] Realtime channel subscribed");
					setTimeout(() => {
						isInitialLoadRef.current = false;
					}, 1000);
				} else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
					console.warn("[useNotifications] Realtime channel status:", status);
					if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
						console.error("[useNotifications] Max reconnection attempts reached");
						return;
					}
					const delay = Math.min(2000 * 2 ** reconnectAttemptsRef.current, 30000);
					reconnectAttemptsRef.current += 1;
					if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
					reconnectTimeoutRef.current = setTimeout(() => {
						reconnectTimeoutRef.current = null;
						setupChannel();
					}, delay);
				} else {
					console.log("[useNotifications] Realtime channel status:", status);
				}
			});

			channelRef.current = channel;
		};

		setupChannel();

		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
		};
	}, [fetchNotifications, isAuthenticated, limit, resetState, showToast, user?.id]);

	const unreadCount = useMemo(
		() =>
			notifications.filter((notification) => !notification.read_at)
				.length,
		[notifications]
	);

	return {
		notifications,
		isLoading,
		error,
		unreadCount,
		refresh: fetchNotifications,
		markAsRead,
		markAllAsRead,
		isNewSinceLastView,
		updateLastViewedAt,
	};
}
