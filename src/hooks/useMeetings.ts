/**
 * Custom hook for managing meetings
 * Fetches meetings from database with realtime subscriptions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { Meeting, ParticipantResponseStatus } from '@/types/meeting-types';
import { useAuth } from './useAuth';

interface UseMeetingsReturn {
  upcomingMeetings: Meeting[];
  pastMeetings: Meeting[];
  isLoading: boolean;
  error: string | null;
  fetchUpcomingMeetings: () => Promise<void>;
  fetchPastMeetings: () => Promise<void>;
  updateParticipantResponse: (
    meetingId: string,
    status: ParticipantResponseStatus
  ) => Promise<void>;
  refreshMeetings: () => Promise<void>;
}

export function useMeetings(projectId?: string): UseMeetingsReturn {
  const { user } = useAuth();
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(
    null
  );
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch upcoming meetings (start_time >= now)
   */
  const fetchUpcomingMeetings = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      let query = supabase
        .from('meetings')
        .select(
          `
          *,
          organizer:profiles!organizer_id(id, full_name, email),
          participants:meeting_participants(
            *,
            user:profiles!user_id(id, full_name, email)
          )
        `
        )
        .gt('end_time', now)
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setUpcomingMeetings(data || []);
    } catch (err) {
      console.error('Error fetching upcoming meetings:', err);
      setError('Failed to fetch upcoming meetings');
    } finally {
      setIsLoading(false);
    }
  }, [user, projectId]);

  /**
   * Fetch past meetings (end_time < now)
   */
  const fetchPastMeetings = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();

      let query = supabase
        .from('meetings')
        .select(
          `
          *,
          organizer:profiles!organizer_id(id, full_name, email),
          participants:meeting_participants(
            *,
            user:profiles!user_id(id, full_name, email)
          )
        `
        )
        .lt('end_time', now)
        .order('start_time', { ascending: false })
        .limit(50); // Limit to most recent 50

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setPastMeetings(data || []);
    } catch (err) {
      console.error('Error fetching past meetings:', err);
      setError('Failed to fetch past meetings');
    } finally {
      setIsLoading(false);
    }
  }, [user, projectId]);

  /**
   * Refresh both upcoming and past meetings
   */
  const refreshMeetings = useCallback(async () => {
    await Promise.all([fetchUpcomingMeetings(), fetchPastMeetings()]);
  }, [fetchUpcomingMeetings, fetchPastMeetings]);

  /**
   * Update participant response status (accept/decline/tentative)
   */
  const updateParticipantResponse = useCallback(
    async (meetingId: string, status: ParticipantResponseStatus) => {
      if (!user) return;

      try {
        // Call Edge Function to update DB and sync with Google Calendar
        const { error: invokeError } = await supabase.functions.invoke('update-calendar-response', {
          body: {
            meeting_id: meetingId,
            user_id: user.id,
            status: status,
          },
        });

        if (invokeError) {
          throw invokeError;
        }

        // We don't need to manually refresh here because the Realtime subscription
        // will detect the change in 'meeting_participants' and trigger a refresh automatically.
      } catch (err) {
        console.error('Error updating participant response:', err);
        setError('Failed to update response');
      }
    },
    [user, refreshMeetings]
  );

  /**
   * Update participant status in local state without refetching
   */
  const updateParticipantStatusLocally = useCallback((
    meetingId: string,
    userId: string,
    responseStatus: ParticipantResponseStatus,
    respondedAt: string
  ) => {
    const updateMeetingInList = (meetings: Meeting[]) => 
      meetings.map(meeting => {
        if (meeting.id !== meetingId) return meeting;
        
        return {
          ...meeting,
          participants: meeting.participants?.map(participant => {
            if (participant.user_id !== userId) return participant;
            
            return {
              ...participant,
              response_status: responseStatus,
              responded_at: respondedAt,
            };
          }),
        };
      });

    setUpcomingMeetings(prev => updateMeetingInList(prev));
    setPastMeetings(prev => updateMeetingInList(prev));
  }, []);

  /**
   * Setup realtime subscription for meetings
   */
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    fetchUpcomingMeetings();
    fetchPastMeetings();

    // Setup realtime subscription
    const channel = supabase
      .channel('meetings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
        },
        (payload) => {
          console.log('Meeting change detected:', payload);
          // Refresh meetings immediately for meeting table changes
          refreshMeetings();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meeting_participants',
        },
        (payload) => {
          console.log('Meeting participant change detected:', payload);
          
          // Update locally without refetching
          if (payload.new) {
            const { meeting_id, user_id, response_status, responded_at } = payload.new as any;
            updateParticipantStatusLocally(meeting_id, user_id, response_status, responded_at);
          }
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      // Clear any pending refresh timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [user, fetchUpcomingMeetings, fetchPastMeetings, refreshMeetings, updateParticipantStatusLocally]);

  return {
    upcomingMeetings,
    pastMeetings,
    isLoading,
    error,
    fetchUpcomingMeetings,
    fetchPastMeetings,
    updateParticipantResponse,
    refreshMeetings,
  };
}
