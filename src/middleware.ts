import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@/lib/supabase/middleware';
import { getSupabaseAuthCookieName } from '@/lib/supabase/auth-token';

/** Routes that require an authenticated user (server-side check). */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/project/',
  '/advisor',
  '/lender',
  '/team',
  '/documents/edit',
  '/meeting/',
];

/** Paths that are always allowed (public or auth pages). */
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/accept-invite',
  '/about',
  '/case-studies',
  '/resources',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return true;
  }
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return true;
  }
  return false;
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );
}

/** Allowed frame ancestors for embedding (e.g. dataroom). */
const FRAME_ANCESTORS_ALLOWED = ["'self'", "https://dataroom.capmatch.com", "http://dataroom.capmatch.com"];

/** Apply security headers to every response. */
function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // CSP enforcing (script-src includes unsafe-inline/unsafe-eval for compatibility; tighten with nonces when possible)
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss: ws:; frame-ancestors ${FRAME_ANCESTORS_ALLOWED.join(' ')}; base-uri 'self'; form-action 'self'`
  );
  return response;
}

/** Max body size for API state-changing requests (10MB). */
const MAX_API_BODY_BYTES = 10 * 1024 * 1024;

/** Document upload routes allow 50MB to align with fileUploadValidation.ts MAX_DOCUMENT_SIZE_BYTES. */
const MAX_DOCUMENT_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Origins allowed for CSRF (state-changing API requests). Includes dataroom.capmatch.com for embedding. */
const ALLOWED_ORIGINS = [
  'https://dataroom.capmatch.com',
  'http://dataroom.capmatch.com',
];

/** CSRF: for state-changing API requests, allow same-origin, configured site URL, or dataroom.capmatch.com.
 * Note: This relies on the Origin header being present and validated. For defense-in-depth,
 * cookie options use SameSite=lax (see cookie-options.ts) so cookies are not sent on cross-site POSTs.
 */
function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) {
    // Fallback: check Referer when Origin is missing (e.g. some same-site requests)
    const referer = request.headers.get('Referer');
    if (!referer) return true;
    try {
      const refUrl = new URL(referer);
      return refUrl.host === request.nextUrl.host;
    } catch {
      return false;
    }
  }
  try {
    const actual = new URL(origin);
    // Allow when Origin host matches request host (same-origin, e.g. localhost:3000 in dev)
    const requestHost = request.nextUrl.host;
    if (actual.host === requestHost) return true;
    // Allow dataroom.capmatch.com (embedded page context)
    if (ALLOWED_ORIGINS.some((o) => actual.origin === o)) return true;
    // Otherwise require Origin to match configured site URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) return false;
    const allowed = new URL(siteUrl);
    return actual.origin === allowed.origin;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // CSRF and body size: for state-changing API requests
  if (pathname.startsWith('/api') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!isAllowedOrigin(request)) {
      const res = new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
      return withSecurityHeaders(res);
    }
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const bytes = parseInt(contentLength, 10);
      const limit = pathname.startsWith('/api/documents') ? MAX_DOCUMENT_UPLOAD_BYTES : MAX_API_BODY_BYTES;
      if (Number.isFinite(bytes) && bytes > limit) {
        const res = new NextResponse(
          JSON.stringify({ error: 'Request entity too large' }),
          { status: 413, headers: { 'Content-Type': 'application/json' } }
        );
        return withSecurityHeaders(res);
      }
    }
  }

  if (isPublicPath(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  // API routes: apply headers only; auth is handled by each route
  if (pathname.startsWith('/api')) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (!isProtectedPath(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  const cookieName = getSupabaseAuthCookieName();
  if (!cookieName) {
    return withSecurityHeaders(NextResponse.next());
  }

  const token = request.cookies.get(cookieName)?.value;
  if (!token || token.length < 10) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // Validate JWT server-side (not just presence) using Supabase middleware client
  const { supabase, response: nextResponse } = createMiddlewareClient(request);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return withSecurityHeaders(nextResponse);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|small_logo|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
