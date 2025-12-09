// src/app/meeting/[roomName]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { DailyVideoCall } from '@/components/video/DailyVideoCall';
import { Loader2 } from 'lucide-react';

interface MeetingPageProps {
  params: Promise<{
    roomName: string;
  }>;
}

export default function MeetingPage({ params }: MeetingPageProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [meeting, setMeeting] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);
  const [roomName, setRoomName] = useState<string>('');

  // Extract params
  useEffect(() => {
    params.then(p => setRoomName(p.roomName));
  }, [params]);

  useEffect(() => {
    async function checkAccess() {
      // Wait for room name and auth to load
      if (!roomName || isAuthLoading) return;

      // Redirect to login if not authenticated
      if (!isAuthenticated || !user) {
        router.push(`/login?redirect=/meeting/${roomName}`);
        return;
      }

      try {
        // Fetch meeting details (optional, for title/context)
        const { data: meetingData } = await supabase
          .from('meetings')
          .select(`
            id,
            title,
            organizer_id,
            meeting_participants (
              user_id
            )
          `)
          .ilike('meeting_link', `%${roomName}%`)
          .single();

        // Verify user has access (organizer or participant)
        let userHasAccess = true; // Default to true for instant meetings without meeting record

        if (meetingData) {
          const isOrganizer = meetingData.organizer_id === user.id;
          const isParticipant = meetingData.meeting_participants?.some(
            (p: any) => p.user_id === user.id
          );

          userHasAccess = isOrganizer || isParticipant;
          setMeeting(meetingData);
        }

        setHasAccess(userHasAccess);
      } catch (error) {
        console.error('Error checking meeting access:', error);
        setHasAccess(true); // Allow access if error (might be instant meeting)
      } finally {
        setIsLoadingAccess(false);
      }
    }

    checkAccess();
  }, [isAuthLoading, isAuthenticated, user, roomName, router]);

  // Loading state
  if (isAuthLoading || isLoadingAccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
          <p className="text-white text-lg">Loading meeting...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You do not have permission to join this meeting.
          </p>
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Render video call
  return (
    <div className="h-screen w-screen">
      <DailyVideoCall
        roomName={roomName}
        meetingId={meeting?.id}
        meetingTitle={meeting?.title}
      />
    </div>
  );
}
