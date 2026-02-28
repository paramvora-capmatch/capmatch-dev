// src/app/api/calendar/callback/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { CalendarProvider } from '@/types/calendar-types';
import { checkRateLimit, getRateLimitId, GENERAL_RATE_LIMIT } from '@/lib/rate-limit';
import { getSecureCookieOptions } from '@/lib/cookie-options';
import { logger } from '@/lib/logger';

/**
 * OAuth callback handler for calendar integrations
 * Handles the redirect from Google/Microsoft OAuth flows
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // Provider type (google|microsoft)
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    logger.error({ error }, '[Calendar OAuth] Error from provider');
    return NextResponse.redirect(
      new URL(`/dashboard?calendar_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard?calendar_error=missing_parameters', request.url)
    );
  }

  // Parse state parameter (format: provider|returnUrl)
  const decodedState = decodeURIComponent(state);
  const [provider, returnUrl] = decodedState.includes('|')
    ? decodedState.split('|', 2).map(part => decodeURIComponent(part))
    : [decodedState, null];

  // Default return URL to dashboard if not provided or invalid (reject protocol-relative URLs like //evil.com)
  const finalReturnUrl = returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
    ? returnUrl
    : '/dashboard';

  try {
    // Create server-side Supabase client with cookie access
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => {
            return cookieStore.get(name)?.value;
          },
          set: (name: string, value: string, options: any) => {
            try {
              cookieStore.set({ name, value, ...getSecureCookieOptions(options) });
            } catch {
              // The `set` method was called from a Server Component.
            }
          },
          remove: (name: string, options: any) => {
            try {
              cookieStore.set({ name, value: '', ...getSecureCookieOptions(options) });
            } catch {
              // The `delete` method was called from a Server Component.
            }
          },
        },
      }
    );

    // Get the current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error({ err: authError }, '[Calendar OAuth] Auth error');
      throw new Error('User not authenticated');
    }

    const rlId = getRateLimitId(request, user.id);
    const rl = checkRateLimit(rlId, GENERAL_RATE_LIMIT, 'calendar-callback');
    if (!rl.allowed) return rl.response;

    // Exchange authorization code for access token
    logger.info({ provider }, '[Calendar OAuth] Exchanging code');
    let tokenData;
    switch (provider) {
      case 'google':
        tokenData = await exchangeGoogleCode(code, request.url);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    logger.info(
      {
        account_id: tokenData.account_id,
        email: tokenData.email,
        has_access_token: !!tokenData.access_token,
        has_refresh_token: !!tokenData.refresh_token,
      },
      '[Calendar OAuth] Token data received'
    );

    // Fetch calendar list from provider
    logger.info('[Calendar OAuth] Fetching calendar list');
    const calendars = await fetchCalendarList(provider, tokenData.access_token);
    logger.info({ count: calendars.length }, '[Calendar OAuth] Found calendars');

    // Save connection to database
    const connectionData = {
      user_id: user.id,
      provider,
      provider_account_id: tokenData.account_id,
      provider_email: tokenData.email,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenData.expires_at,
      calendar_list: calendars.map((cal: any) => ({
        ...cal,
        selected: cal.primary || false, // Auto-select primary calendar
      })),
      sync_enabled: true,
      last_synced_at: new Date().toISOString(),
    };

    logger.info(
      {
        user_id: connectionData.user_id,
        provider: connectionData.provider,
        provider_account_id: connectionData.provider_account_id,
        provider_email: connectionData.provider_email,
      },
      '[Calendar OAuth] Saving connection to database'
    );

    const { error: insertError } = await supabase
      .from('calendar_connections')
      .upsert(connectionData, {
        onConflict: 'user_id,provider,provider_account_id'
      });

    if (insertError) {
      throw insertError;
    }

    // Redirect back to original page (or dashboard) with success message and open settings modal with calendar tab
    const returnUrlWithParams = new URL(finalReturnUrl, request.url);
    returnUrlWithParams.searchParams.set('calendar_connected', 'true');
    returnUrlWithParams.searchParams.set('open_settings', 'calendar');
    return NextResponse.redirect(returnUrlWithParams);
  } catch (err) {
    logger.error({ err }, '[Calendar OAuth] Connection failed');
    const errorUrl = new URL(finalReturnUrl, request.url);
    errorUrl.searchParams.set('calendar_error', 'connection_failed');
    return NextResponse.redirect(errorUrl);
  }
}

/**
 * Exchange Google OAuth code for access token
 */
async function exchangeGoogleCode(code: string, baseUrl: string) {
  const redirectUri = new URL('/api/calendar/callback', baseUrl).toString();

  logger.info('[Google OAuth] Exchanging code for token');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ err: error }, '[Google OAuth] Token exchange failed');
    throw new Error(`Google token exchange failed: ${error}`);
  }

  const data = await response.json();
  logger.info(
    {
      has_access_token: !!data.access_token,
      has_refresh_token: !!data.refresh_token,
      has_id_token: !!data.id_token,
      token_type: data.token_type,
      expires_in: data.expires_in,
    },
    '[Google OAuth] Token response'
  );

  if (!data.access_token) {
    logger.error({ data }, '[Google OAuth] No access token in response');
    throw new Error('Google token exchange did not return an access token');
  }

  // Decode the ID token to get user info (no additional API call needed!)
  // NOTE: This is for logging/display only. We do NOT verify the JWT signature here;
  // the token was already validated by the OAuth provider during the code exchange.
  // For security-sensitive decisions, use the verified access_token or userinfo endpoint.
  let userInfo;
  if (data.id_token) {
    try {
      const payload = data.id_token.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      logger.info({ sub: decoded.sub, email: decoded.email }, '[Google OAuth] ID token decoded');
      userInfo = {
        id: decoded.sub, // 'sub' is the user ID in Google's ID token
        email: decoded.email,
      };
    } catch (err) {
      logger.error({ err }, '[Google OAuth] Failed to decode ID token');
      // Fallback to userinfo endpoint
      userInfo = null;
    }
  }

  // Fallback: if no ID token or decode failed, use userinfo endpoint
  if (!userInfo) {
    logger.info('[Google OAuth] Falling back to userinfo endpoint');
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      const error = await userInfoResponse.text();
      logger.error({ err: error }, '[Google OAuth] User info fetch failed');
      throw new Error(`Failed to fetch Google user info: ${error}`);
    }

    userInfo = await userInfoResponse.json();
    logger.info({ id: userInfo.id, email: userInfo.email }, '[Google OAuth] User info from endpoint');
  }

  if (!userInfo.id) {
    logger.error({ userInfo }, '[Google OAuth] Missing user ID');
    throw new Error('Google user info missing ID field');
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    account_id: userInfo.id,
    email: userInfo.email,
  };
}

/**
 * Fetch calendar list from provider
 */
async function fetchCalendarList(provider: CalendarProvider, accessToken: string) {
  switch (provider) {
    case 'google': {
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Google calendars');
      }

      const data = await response.json();
      return data.items.map((item: any) => ({
        id: item.id,
        name: item.summary,
        description: item.description,
        primary: item.primary || false,
        color: item.backgroundColor,
        timezone: item.timeZone,
      }));
    }

    default:
      return [];
  }
}
