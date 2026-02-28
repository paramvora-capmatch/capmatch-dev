/**
 * Secure cookie options for auth and session cookies.
 * Use when setting cookies to ensure httpOnly, secure (in production), and sameSite.
 */

export type CookieOptions = {
  path?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'lax' | 'strict' | 'none';
  [key: string]: unknown;
};

export function getSecureCookieOptions(overrides?: CookieOptions): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    ...overrides,
  };
}
