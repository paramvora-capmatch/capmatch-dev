/**
 * Runtime validation of required environment variables.
 * Call once at app startup (e.g. from root layout or a server component) to fail fast
 * if critical env vars are missing.
 */

const REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

export function validateEnv(): void {
  const missing: string[] = [];
  for (const key of REQUIRED_ENV_KEYS) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Set them in .env.local or your deployment environment.'
    );
  }
}
