// src/components/video/DailyVideoCall.tsx
'use client';

import { useEffect, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import type { DailyCall } from '@daily-co/daily-js';
import { Loader2 } from 'lucide-react';

interface DailyVideoCallProps {
  roomName: string;
  meetingId?: string;
  meetingTitle?: string;
}

/**
 * Daily.co Video Call Component
 *
 * This component uses Daily.co's Prebuilt UI for a complete video conferencing experience.
 * It handles:
 * - Token-based authentication
 * - Video/audio controls
 * - Screen sharing
 * - Participant management
 * - Chat
 * - Recording
 *
 * For more customization, you can use @daily-co/daily-react hooks instead of the prebuilt iframe.
 */
export function DailyVideoCall({
  roomName,
  meetingId,
  meetingTitle,
}: DailyVideoCallProps) {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch meeting token on mount
  useEffect(() => {
    async function fetchToken() {
      try {
        // Import supabase dynamically to avoid SSR issues
        const { supabase } = await import('@/lib/supabaseClient');

        // Get current session token
        const { data: sessionData } = await supabase.auth.getSession();
        const authToken = sessionData?.session?.access_token;

        if (!authToken) {
          throw new Error('Not authenticated');
        }

        const res = await fetch('/api/daily/meeting-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ roomName, meetingId }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to get meeting token');
        }

        const data = await res.json();
        setToken(data.token);
      } catch (err) {
        console.error('Error fetching meeting token:', err);
        setError(err instanceof Error ? err.message : 'Failed to join meeting');
      } finally {
        setIsLoading(false);
      }
    }

    fetchToken();
  }, [roomName, meetingId]);

  // Create Daily call object when token is ready
  useEffect(() => {
    if (!token) return;

    // Prevent duplicate instances
    let daily: DailyCall | null = null;
    let mounted = true;

    const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN || 'capmatch';

    // Create Daily iframe with prebuilt UI
    daily = DailyIframe.createFrame({
      showLeaveButton: true,
      showFullscreenButton: true,
      iframeStyle: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        border: '0',
        top: '0',
        left: '0',
      },
    });

    if (mounted) {
      setCallObject(daily);
    }

    // Join the call
    daily
      .join({
        url: `https://${dailyDomain}.daily.co/${roomName}`,
        token,
      })
      .then(() => {
        console.log('Successfully joined Daily.co call');
      })
      .catch((err) => {
        console.error('Error joining call:', err);
        setError('Failed to join video call');
      });

    // Set up event listeners
    daily.on('joined-meeting', () => {
      console.log('User joined meeting');
      // Transcription will be started automatically by the webhook when the meeting starts
    });

    daily.on('left-meeting', () => {
      console.log('User left the meeting');
      // Optionally redirect to dashboard
      window.location.href = '/dashboard';
    });

    daily.on('error', (err) => {
      console.error('Daily.co error:', err);
      setError('An error occurred during the call');
    });

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (daily) {
        daily.destroy();
      }
    };
  }, [token, roomName]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg">Loading meeting...</p>
          {meetingTitle && (
            <p className="text-gray-400 text-sm mt-2">{meetingTitle}</p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Unable to Join Meeting
          </h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <a
            href="/dashboard"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Video call iframe (Daily.co will render inside this div)
  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* Daily.co iframe will be inserted here */}
    </div>
  );
}
