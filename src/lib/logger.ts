/**
 * Structured logging for API routes. Uses pino for JSON output.
 * Use createRequestLogger(request) to get a logger with request ID for correlation.
 */
import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  formatters: {
    level: (label) => ({ level: label }),
  },
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino/file",
          options: { destination: 1 },
        },
      }),
});

export type RequestLogger = ReturnType<typeof logger.child>;

/**
 * Create a child logger with request ID for correlation across logs.
 * Pass the Request to extract X-Request-Id or generate one.
 */
export function createRequestLogger(request?: Request | null): RequestLogger {
  const requestId =
    (request && request.headers.get("x-request-id")) ??
    (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : undefined);
  return logger.child({ requestId: requestId ?? "no-request" });
}

/**
 * Get or generate request ID for a request. Use when forwarding to backend (X-Request-Id header).
 */
export function getOrCreateRequestId(request?: Request | null): string {
  if (request?.headers.get("x-request-id")) {
    return request.headers.get("x-request-id")!;
  }
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}`;
}
