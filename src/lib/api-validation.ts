/**
 * Shared Zod schemas and validation helpers for API routes.
 * Use validateRequest(req, schema) to parse and validate request bodies/query params.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';

/** Return 400 with validation error details */
export function validationErrorResponse(
  message: string,
  issues?: z.ZodIssue[]
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(issues?.length ? { details: issues.map((i) => ({ path: i.path, message: i.message })) } : {}),
    },
    { status: 400 }
  );
}

/**
 * Return a JSON error response without leaking internal details.
 * Logs the full error server-side; returns only userMessage to the client.
 */
export function safeErrorResponse(
  error: unknown,
  userMessage: string,
  status: number = 500
): NextResponse {
  console.error('[API]', userMessage, error);
  return NextResponse.json({ error: userMessage }, { status });
}

/**
 * Parse and validate JSON body with a Zod schema.
 * Returns [null, parsed] on success, or [NextResponse, undefined] on validation/parse error.
 */
export async function validateBody<T>(
  req: NextRequest | Request,
  schema: ZodSchema<T>
): Promise<[NextResponse | null, T | undefined]> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return [validationErrorResponse('Invalid JSON body'), undefined];
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return [
      validationErrorResponse('Validation failed', result.error.issues),
      undefined,
    ];
  }
  return [null, result.data];
}

/**
 * Validate query/search params with a Zod schema.
 */
export function validateSearchParams<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): [NextResponse | null, T | undefined] {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    return [
      validationErrorResponse('Invalid query parameters', result.error.issues),
      undefined,
    ];
  }
  return [null, result.data];
}

// ----- Schemas for API routes -----

const nonEmptyString = z.string().min(1, 'Required');

/** project-qa: fieldContext and projectContext are opaque objects from frontend */
const contextObject = z.record(z.string(), z.unknown()).refine((o) => o != null && typeof o === 'object', 'Context object is required');

export const projectQaBodySchema = z.object({
  fieldContext: contextObject,
  projectContext: contextObject,
}).strict();

/** borrower-qa */
export const borrowerQaBodySchema = z.object({
  fieldContext: contextObject,
  borrowerContext: contextObject,
}).strict();

/** om-qa */
export const omQaBodySchema = z.object({
  question: z.string().min(1, 'question is required'),
}).strict();

/** project-resume/autofill & borrower-resume/autofill (user_id comes from session, not body) */
export const autofillBodySchema = z.object({
  project_id: nonEmptyString,
  project_address: z.string().optional(),
  document_paths: z.array(z.string()).default([]),
}).strict();

/** save-version (project and borrower resume); body may be empty, projectId required when present */
export const saveVersionBodySchema = z
  .object({
    projectId: z.string().optional(),
    userId: z.string().nullable().optional(),
  })
  .strict()
  .refine((d) => d.projectId && d.projectId.length > 0, { message: 'projectId is required', path: ['projectId'] });

/** OM log-field-access */
export const omLogFieldAccessBodySchema = z.object({
  fields: z.array(z.object({
    fieldId: z.string(),
    status: z.enum(['available', 'missing', 'fallback']),
    page: z.string(),
    subpage: z.string().optional(),
    isInsight: z.boolean(),
    fallbackValue: z.string().optional(),
    timestamp: z.string(),
  })),
}).strict();

/** OnlyOffice config */
export const onlyOfficeConfigBodySchema = z.object({
  bucketId: nonEmptyString,
  filePath: nonEmptyString,
  mode: z.enum(['edit', 'view']).optional().default('edit'),
}).strict();

/** OM field-access-summary GET query (optional date) */
export const fieldAccessSummaryQuerySchema = z.object({
  date: z.string().optional(),
});

/** Daily meeting token */
export const dailyMeetingTokenBodySchema = z
  .object({
    roomName: z.string().optional(),
    meetingId: z.string().optional(),
  })
  .refine((d) => (d.roomName ?? '') !== '' || (d.meetingId ?? '') !== '', 'Either roomName or meetingId is required');

/** Meetings create - align with CreateMeetingRequest */
export const createMeetingBodySchema = z.object({
  title: nonEmptyString,
  startTime: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid startTime'),
  endTime: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid endTime'),
  participantIds: z.array(z.string().uuid()).min(1, 'At least one participant is required'),
  projectId: z.string().uuid().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
}).strict();

/** Meetings update */
export const updateMeetingBodySchema = z.object({
  title: nonEmptyString,
  startTime: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid startTime'),
  endTime: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid endTime'),
  participantIds: z.array(z.string().uuid()).min(1, 'At least one participant is required'),
  description: z.string().optional(),
  location: z.string().optional(),
}).strict();
