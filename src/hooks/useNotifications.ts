"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "./useAuth";

export interface NotificationRecord {
  id: number;
  user_id: string;
  event_id: number;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
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
}

export function useNotifications(
  { limit = 50 }: UseNotificationsOptions = {}
): UseNotificationsResult {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

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

    setIsLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (queryError) {
      console.error("[useNotifications] Failed to fetch notifications:", queryError);
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
        console.error("[useNotifications] Failed to mark notification as read:", updateError);
        // Revert optimistic update
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === id ? { ...notification, read_at: existing.read_at } : notification
          )
        );
        setError(updateError.message);
      }
    },
    [notifications]
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

    fetchNotifications();

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
          const incoming = payload.new as NotificationRecord;
          setNotifications((prev) => {
            const alreadyExists = prev.some((n) => n.id === incoming.id);
            if (alreadyExists) {
              return prev;
            }
            const next = [incoming, ...prev];
            return next.slice(0, limit);
          });
        }
      );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("[useNotifications] Realtime channel subscribed");
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [fetchNotifications, isAuthenticated, limit, resetState, user?.id]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    refresh: fetchNotifications,
    markAsRead,
  };
}

