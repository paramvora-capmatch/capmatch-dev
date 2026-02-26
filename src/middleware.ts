import { NextResponse, type NextRequest } from 'next/server';

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

/** Supabase sets cookies named sb-<project-ref>-auth-token. Derive project ref from URL. */
function getSupabaseAuthCookieName(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const ref = parsed.hostname.split('.')[0];
    return ref ? `sb-${ref}-auth-token` : null;
  } catch {
    return null;
  }
}

/** Apply security headers to every response. */
function withSecurityHeaders(response: NextResponse): NextResponse {
  // Allow embedding only from self and dataroom.capmatch.com (no X-Frame-Options so CSP frame-ancestors applies)
  response.headers.set('Content-Security-Policy', `frame-ancestors ${FRAME_ANCESTORS_ALLOWED.join(' ')}`);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // CSP report-only: collect violations without blocking; tighten later to enforce
  // connect-src: allow ws: for local Supabase Realtime (127.0.0.1 uses ws://); wss: for production
  // style-src: allow fonts.googleapis.com for Google Fonts (e.g. TASA Orbiter)
  response.headers.set(
    'Content-Security-Policy-Report-Only',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss: ws:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  return response;
}

/** Max body size for API state-changing requests (10MB). */
const MAX_API_BODY_BYTES = 10 * 1024 * 1024;

/** Origins allowed for CSRF (state-changing API requests). Includes dataroom.capmatch.com for embedding. */
const ALLOWED_ORIGINS = [
  'https://dataroom.capmatch.com',
  'http://dataroom.capmatch.com',
];

/** CSRF: for state-changing API requests, allow same-origin, configured site URL, or dataroom.capmatch.com. */
function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    const actual = new URL(origin);
    // Allow when Origin host matches request host (same-origin, e.g. localhost:3000 in dev)
    const requestHost = request.nextUrl.host;
    if (actual.host === requestHost) return true;
    // Allow dataroom.capmatch.com (embedded page context)
    if (ALLOWED_ORIGINS.some((o) => actual.origin === o)) return true;
    // Otherwise require Origin to match configured site URL
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) return true;
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
      if (Number.isFinite(bytes) && bytes > MAX_API_BODY_BYTES) {
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

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|small_logo|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
