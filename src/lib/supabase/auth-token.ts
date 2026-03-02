import type { NextRequest } from 'next/server';

/** Supabase sets cookies named sb-<project-ref>-auth-token. Derive project ref from URL. */
export function getSupabaseAuthCookieName(): string | null {
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

/**
 * Extract Supabase access token from the auth cookie for forwarding to backend.
 * Use only after validating the user with supabase.auth.getUser().
 */
export function getSupabaseAccessTokenFromRequest(req: NextRequest): string | null {
  const name = getSupabaseAuthCookieName();
  if (!name) return null;
  const value = req.cookies.get(name)?.value;
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { access_token?: string };
    return typeof parsed.access_token === 'string' ? parsed.access_token : null;
  } catch {
    return null;
  }
}
