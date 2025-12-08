// src/lib/calendarTokenManager.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(provider: string, refreshToken: string) {
  switch (provider) {
    case 'google': {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Google OAuth] Token refresh failed:', error);
        throw new Error(`Google token refresh failed: ${error}`);
      }

      const data = await response.json();

      return {
        access_token: data.access_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        // Google may return a new refresh token
        refresh_token: data.refresh_token,
      };
    }

    case 'microsoft': {
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!,
          client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Microsoft OAuth] Token refresh failed:', error);
        throw new Error(`Microsoft token refresh failed: ${error}`);
      }

      const data = await response.json();

      return {
        access_token: data.access_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        refresh_token: data.refresh_token,
      };
    }

    default:
      throw new Error(`Unsupported provider for token refresh: ${provider}`);
  }
}

/**
 * Create a server-side Supabase client for API routes
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {}
        },
        remove: (name: string, options: CookieOptions) => {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {}
        },
      },
    }
  );
}

/**
 * Ensure calendar connection has a valid access token, refreshing if needed
 */
export async function ensureValidToken(connection: any, supabase: any) {
  let accessToken = connection.access_token;
  const tokenExpired = connection.token_expires_at
    ? new Date(connection.token_expires_at) < new Date()
    : false;

  if (tokenExpired) {
    console.log(`[Token Manager] Access token expired for connection ${connection.id}, refreshing...`);

    if (!connection.refresh_token) {
      throw new Error('Access token expired and no refresh token available');
    }

    const refreshedToken = await refreshAccessToken(
      connection.provider,
      connection.refresh_token
    );

    // Update the connection with new token
    const { error: updateError } = await supabase
      .from('calendar_connections')
      .update({
        access_token: refreshedToken.access_token,
        token_expires_at: refreshedToken.expires_at,
        ...(refreshedToken.refresh_token && { refresh_token: refreshedToken.refresh_token }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    if (updateError) {
      console.error('[Token Manager] Failed to update refreshed token:', updateError);
      throw new Error('Failed to save refreshed token');
    }

    console.log(`[Token Manager] Token refreshed successfully for connection ${connection.id}`);
    accessToken = refreshedToken.access_token;
  }

  return accessToken;
}
