/**
 * Standard API error responses matching FastAPI shape.
 * Use these across Next.js API routes for consistent { error, error_code, status_code, details }.
 */
import { NextResponse } from "next/server";

export const ERROR_CODES = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ErrorResponseBody {
  error: string;
  error_code: string;
  status_code: number;
  details?: unknown;
}

/**
 * Build a JSON error response with the standard shape.
 * Never leaks backend error details to the client; use message for user-facing text.
 */
export function errorResponse(
  statusCode: number,
  errorCode: ErrorCode | string,
  message: string,
  details?: unknown
): NextResponse {
  const body: ErrorResponseBody = {
    error: message,
    error_code: errorCode,
    status_code: statusCode,
  };
  if (details !== undefined && details !== null) {
    body.details = details;
  }
  return NextResponse.json(body, { status: statusCode });
}

export function unauthorized(message = "Unauthorized"): NextResponse {
  return errorResponse(401, ERROR_CODES.UNAUTHORIZED, message);
}

export function forbidden(message = "Forbidden"): NextResponse {
  return errorResponse(403, ERROR_CODES.FORBIDDEN, message);
}

export function validationError(
  message: string,
  details?: unknown
): NextResponse {
  return errorResponse(400, ERROR_CODES.VALIDATION_ERROR, message, details);
}

export function notFound(message = "Not found"): NextResponse {
  return errorResponse(404, ERROR_CODES.NOT_FOUND, message);
}

export function rateLimited(message = "Too many requests"): NextResponse {
  return errorResponse(429, ERROR_CODES.RATE_LIMITED, message);
}

export function internalError(message = "Internal server error"): NextResponse {
  return errorResponse(500, ERROR_CODES.INTERNAL_ERROR, message);
}
