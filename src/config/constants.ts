/**
 * Shared app and feature constants to avoid magic numbers across the codebase.
 */

/** Autofill polling: interval between polls and max total wait time */
export const AUTOFILL_POLL_INTERVAL_MS = 2000;
export const AUTOFILL_MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minutes

/** Chat: delivered status visible duration and fade-out lead time */
export const CHAT_DELIVERED_STATUS_DURATION_MS = 5000;
export const CHAT_DELIVERED_STATUS_FADE_LEAD_MS = 400;

/** Chat: deduplication windows for realtime messages (same content + user) */
export const CHAT_DEDUP_BY_CONTENT_WINDOW_MS = 2000;
export const CHAT_OPTIMISTIC_MATCH_WINDOW_MS = 5000;

/** Chat: reconnection backoff (base delay and max delay) */
export const CHAT_RECONNECT_BASE_DELAY_MS = 2000;
export const CHAT_RECONNECT_MAX_DELAY_MS = 30000;

/** Activity tracking interval in project workspace (e.g. presence) */
export const PROJECT_ACTIVITY_TRACKING_INTERVAL_MS = 60000;
