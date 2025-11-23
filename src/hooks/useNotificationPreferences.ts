"use client";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { useCallback, useEffect, useMemo, useState } from "react";

export type NotificationScopeType = "global" | "project" | "thread";
export type NotificationChannel = "in_app" | "email" | "sms" | "*";
export type NotificationStatus = "muted" | "digest" | "immediate";

export interface NotificationPreferenceRow {
  id: string;
  user_id: string;
  scope_type: NotificationScopeType;
  scope_id: string | null;
  event_type: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  created_at: string;
  updated_at: string;
}

export interface PreferenceTarget {
  scopeType: NotificationScopeType;
  scopeId?: string | null;
  eventType: string;
  channel?: NotificationChannel;
}

interface SetPreferenceStatusArgs extends PreferenceTarget {
  status: NotificationStatus;
}

const buildTargetKey = (target: PreferenceTarget) => {
  const scopeId = target.scopeId ?? "global";
  const channel = target.channel ?? "in_app";
  return `${target.scopeType}:${scopeId}:${target.eventType}:${channel}`;
};

const matchesTarget = (
  preference: NotificationPreferenceRow,
  target: PreferenceTarget
) => {
  const scopeId = target.scopeId ?? null;
  const channel = target.channel ?? "in_app";
  return (
    preference.scope_type === target.scopeType &&
    preference.event_type === target.eventType &&
    preference.channel === channel &&
    (scopeId === null ? preference.scope_id === null : preference.scope_id === scopeId)
  );
};

export const useNotificationPreferences = () => {
  const { user, isAuthenticated } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferenceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Record<string, boolean>>({});

  const loadPreferences = useCallback(async () => {
    if (!user?.id || !isAuthenticated) {
      setPreferences([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      console.error("[useNotificationPreferences] Failed to load preferences:", queryError);
      setError(queryError.message);
      setPreferences([]);
    } else {
      setPreferences(data ?? []);
    }

    setIsLoading(false);
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const getPreferenceStatus = useCallback(
    (target: PreferenceTarget): NotificationStatus => {
      const channel = target.channel ?? "in_app";
      const scopeId = target.scopeId ?? null;
      const match = preferences.find(
        (pref) =>
          pref.scope_type === target.scopeType &&
          pref.event_type === target.eventType &&
          pref.channel === channel &&
          (scopeId === null ? pref.scope_id === null : pref.scope_id === scopeId)
      );

      return match?.status ?? "immediate";
    },
    [preferences]
  );

  const isPreferencePending = useCallback(
    (target: PreferenceTarget) => pendingKeys[buildTargetKey(target)] ?? false,
    [pendingKeys]
  );

  const updatePending = useCallback((target: PreferenceTarget, value: boolean) => {
    setPendingKeys((prev) => {
      const key = buildTargetKey(target);
      if (value) {
        return { ...prev, [key]: true };
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setPreferenceStatus = useCallback(
    async ({ scopeType, scopeId, eventType, channel = "in_app", status }: SetPreferenceStatusArgs) => {
      if (!user?.id || !isAuthenticated) {
        console.warn("[useNotificationPreferences] Cannot update preference without auth");
        return;
      }

      const target: PreferenceTarget = { scopeType, scopeId: scopeId ?? null, eventType, channel };
      updatePending(target, true);

      try {
        if (status === "immediate") {
          let deleteQuery = supabase
            .from("user_notification_preferences")
            .delete()
            .eq("user_id", user.id)
            .eq("scope_type", scopeType)
            .eq("event_type", eventType)
            .eq("channel", channel);

          deleteQuery =
            scopeId === null || scopeId === undefined
              ? deleteQuery.is("scope_id", null)
              : deleteQuery.eq("scope_id", scopeId);

          const { error: deleteError } = await deleteQuery;
          if (deleteError) {
            console.error("[useNotificationPreferences] Failed to delete preference:", deleteError);
            setError(deleteError.message);
          } else {
            setPreferences((prev) =>
              prev.filter((pref) => !matchesTarget(pref, target))
            );
          }
          return;
        }

        const payload = {
          user_id: user.id,
          scope_type: scopeType,
          scope_id: scopeId ?? null,
          event_type: eventType,
          channel,
          status,
        };

        const { data, error: upsertError } = await supabase
          .from("user_notification_preferences")
          .upsert(payload, {
            onConflict: "user_id,scope_type,scope_id,event_type,channel",
          })
          .select("*")
          .single();

        if (upsertError) {
          console.error("[useNotificationPreferences] Failed to upsert preference:", upsertError);
          setError(upsertError.message);
          return;
        }

        if (data) {
          setPreferences((prev) => {
            const remaining = prev.filter((pref) => pref.id !== data.id && !matchesTarget(pref, target));
            return [data, ...remaining];
          });
        }
      } finally {
        updatePending(target, false);
      }
    },
    [isAuthenticated, updatePending, user?.id]
  );

  const setMuted = useCallback(
    async (target: PreferenceTarget, mute: boolean) => {
      await setPreferenceStatus({
        ...target,
        status: mute ? "muted" : "immediate",
      });
    },
    [setPreferenceStatus]
  );

  const contextValue = useMemo(
    () => ({
      preferences,
      isLoading,
      error,
      refresh: loadPreferences,
      getPreferenceStatus,
      setPreferenceStatus,
      setMuted,
      isPreferencePending,
    }),
    [
      error,
      getPreferenceStatus,
      isLoading,
      isPreferencePending,
      loadPreferences,
      preferences,
      setPreferenceStatus,
      setMuted,
    ]
  );

  return contextValue;
};

export type UseNotificationPreferencesReturn = ReturnType<typeof useNotificationPreferences>;

