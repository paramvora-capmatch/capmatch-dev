/**
 * Custom hook for managing meetings
 * Fetches meetings from database with realtime subscriptions
 */

import { useState, useEffect, useCallback } from 'react';
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
        const { error: updateError } = await supabase
          .from('meeting_participants')
          .update({
            response_status: status,
            responded_at: new Date().toISOString(),
          })
          .eq('meeting_id', meetingId)
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }

        // Refresh meetings to get updated data
        await refreshMeetings();
      } catch (err) {
        console.error('Error updating participant response:', err);
        setError('Failed to update response');
      }
    },
    [user, refreshMeetings]
  );

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
          // Refresh meetings when changes occur
          refreshMeetings();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_participants',
        },
        (payload) => {
          console.log('Meeting participant change detected:', payload);
          // Refresh meetings when participant changes occur
          refreshMeetings();
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, fetchUpcomingMeetings, fetchPastMeetings, refreshMeetings]);

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
