import { NextResponse, type NextRequest } from 'next/server';

/** Allowed frame ancestors for embedding (e.g. dataroom). */
const FRAME_ANCESTORS_ALLOWED = ["'self'", "https://dataroom.capmatch.com", "http://dataroom.capmatch.com"];

/** Build connect-src for CSP: allow Supabase and backend API URLs. */
function getConnectSrc(): string {
  const parts = ["'self'", 'https:', 'wss:', 'ws:'];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const u = supabaseUrl.replace(/\/$/, '');
    if (u && !parts.includes(u)) parts.push(u);
  }
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendUrl) {
    const u = backendUrl.replace(/\/+$/, '');
    if (u && !parts.includes(u)) parts.push(u);
  }
  return parts.join(' ');
}

/** Extract OnlyOffice Document Server origin for CSP whitelisting. */
function getOnlyOfficeOrigin(): string {
  const url = process.env.NEXT_PUBLIC_ONLYOFFICE_URL || 'http://localhost:8080';
  try {
    const { origin } = new URL(url);
    return origin;
  } catch {
    return url;
  }
}

/** Apply security headers to every response. */
function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  const ooOrigin = getOnlyOfficeOrigin();
  response.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.daily.co ${ooOrigin}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src ${getConnectSrc()} https://*.daily.co wss://*.daily.co; frame-src 'self' https://*.daily.co ${ooOrigin} https://*.onlyoffice.com; media-src 'self' blob: mediastream:; frame-ancestors ${FRAME_ANCESTORS_ALLOWED.join(' ')}; base-uri 'self'; form-action 'self'`
  );
  return response;
}

export async function middleware(request: NextRequest) {
  // All API calls now go directly to the FastAPI backend (NEXT_PUBLIC_BACKEND_URL).
  // src/app/api/ is empty — no Next.js API routes exist.
  // Auth protection is handled client-side by AuthRedirector.tsx.
  // The middleware only applies security headers.
  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|small_logo|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
