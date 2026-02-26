/**
 * In-memory rate limiter for API routes.
 * Use with a consistent identifier (e.g. user id when authenticated, else IP).
 * For multi-instance deployments consider Redis (e.g. Upstash).
 */

export interface RateLimitConfig {
  /** Max requests per window */
  limit: number;
  /** Window duration in seconds */
  windowSec: number;
}

/** Default: 30 requests per minute for AI endpoints */
export const AI_RATE_LIMIT: RateLimitConfig = { limit: 30, windowSec: 60 };

/** Default: 60 requests per minute for general API */
export const GENERAL_RATE_LIMIT: RateLimitConfig = { limit: 60, windowSec: 60 };

/** Default: 10 requests per minute for autofill (expensive) */
export const AUTOFILL_RATE_LIMIT: RateLimitConfig = { limit: 10, windowSec: 60 };

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

function getKey(identifier: string, prefix: string): string {
  return `${prefix}:${identifier}`;
}

/**
 * Check rate limit. Returns null if allowed, or a NextResponse with 429 if exceeded.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  prefix: string = 'api'
): { allowed: true } | { allowed: false; response: Response } {
  const key = getKey(identifier, prefix);
  const now = Date.now();
  const windowMs = config.windowSec * 1000;

  let entry = store.get(key);

  if (!entry) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true };
  }

  if (now >= entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    return { allowed: true };
  }

  entry.count += 1;
  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        }
      )
    };
  }

  return { allowed: true };
}

/** Prune expired entries periodically to avoid unbounded memory growth (call from a route or cron). */
export function pruneRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

/**
 * Get a stable identifier for rate limiting: prefer user id when available, else IP from headers.
 */
export function getRateLimitId(request: Request, userId?: string | null): string {
  if (userId) return `user:${userId}`;
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? 'anonymous';
  return `ip:${ip}`;
}
