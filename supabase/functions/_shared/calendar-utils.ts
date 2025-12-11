
import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  calendar_list: any[];
}

/**
 * Refresh an expired access token using the refresh token
 */
export async function refreshAccessToken(provider: string, refreshToken: string) {
  switch (provider) {
    case 'google': {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || Deno.env.get('NEXT_PUBLIC_GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        throw new Error('Google OAuth credentials not configured');
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
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

    default:
      throw new Error(`Unsupported provider for token refresh: ${provider}`);
  }
}

/**
 * Ensure calendar connection has a valid access token, refreshing if needed
 */
export async function ensureValidToken(connection: CalendarConnection, supabase: SupabaseClient) {
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
      console.error('Failed to update refreshed token in database:', updateError);
    }

    accessToken = refreshedToken.access_token;
  }

  return accessToken;
}
