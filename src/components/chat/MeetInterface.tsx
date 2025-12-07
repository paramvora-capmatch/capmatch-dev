// src/components/chat/MeetInterface.tsx
import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "../ui/card";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import {
  Video,
  FileText,
  Clock,
  ChevronRight,
  Calendar,
  Download,
  Play,
  Plus,
  Users as UsersIcon,
  Loader2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useOrgStore } from "@/stores/useOrgStore";
import { useProjects } from "@/hooks/useProjects";
import { useProjectMembers } from "@/hooks/useProjectMembers";
import { useAuth } from "@/hooks/useAuth";
import { useMeetings } from "@/hooks/useMeetings";
import { supabase } from "@/lib/supabaseClient";

interface MeetInterfaceProps {
  projectId: string;
  embedded?: boolean; // when true, render without outer border/radius so parents can frame it
}

interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration: number; // in minutes
  participants: string[];
  summary?: string;
  transcript?: string;
  recordingUrl?: string;
}

export const MeetInterface: React.FC<MeetInterfaceProps> = ({
  projectId,
  embedded = false,
}) => {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [viewMode, setViewMode] = useState<"summary" | "transcript">("summary");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("30");
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Array<{ start: string; end: string }>>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [createMeetingError, setCreateMeetingError] = useState<string | null>(null);

  // Get project members
  const { members } = useOrgStore();
  const { projects } = useProjects();
  const { user } = useAuth();

  // Get meetings from database with realtime subscriptions
  const { upcomingMeetings, pastMeetings, isLoading: isMeetingsLoading, refreshMeetings } = useMeetings();

  const activeProject = useMemo(
    () => projects?.find((p) => p.id === projectId),
    [projects, projectId]
  );

  // Memoize the projects array to prevent unnecessary re-fetches
  const projectsArray = useMemo(
    () => (activeProject ? [activeProject] : []),
    [activeProject]
  );

  // Use useProjectMembers to get all members with access to this project
  const { membersByProjectId, isLoading: isMembersLoading } = useProjectMembers(
    projectsArray
  );

  // Get members for the current project
  const projectMembers = useMemo(() => {
    const members = membersByProjectId[projectId] || [];
    // Filter out the current user
    return members.filter(member => member.userId !== user?.id);
  }, [membersByProjectId, projectId, user?.id]);

  // Fetch available time slots when participants change
  useEffect(() => {
    const fetchAvailability = async () => {
      // Only fetch if we have at least one participant selected
      if (selectedParticipants.length === 0) {
        setAvailableSlots([]);
        setSlotsError(null);
        return;
      }

      setIsFetchingSlots(true);
      setSlotsError(null);

      try {
        // Calculate date range for next 3 days
        const now = new Date();

        // Round to next 15-minute interval
        const startDate = new Date(now);
        const minutes = startDate.getMinutes();
        const roundedMinutes = Math.ceil(minutes / 15) * 15;
        startDate.setMinutes(roundedMinutes, 0, 0);

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 3);

        // Include organizer's user ID to check their calendar for conflicts
        const userIdsToCheck = user?.id
          ? [user.id, ...selectedParticipants]
          : selectedParticipants;

        const response = await fetch('/api/meetings/availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userIds: userIdsToCheck,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            duration: parseInt(meetingDuration) || 30,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch availability');
        }

        const data = await response.json();
        
        // Filter slots to only show those starting at :00, :15, :30, or :45
        // and between 9am and 6pm
        const filteredSlots = (data.freeSlots || []).filter((slot: { start: string }) => {
          const slotTime = new Date(slot.start);
          const minutes = slotTime.getMinutes();
          const hours = slotTime.getHours();
          const validMinutes = minutes === 0 || minutes === 15 || minutes === 30 || minutes === 45;
          const validHours = hours >= 9 && hours < 18; // 9am to 5:59pm (last slot at 5:30pm for 30min meeting)
          return validMinutes && validHours;
        });
        
        setAvailableSlots(filteredSlots);
      } catch (error) {
        console.error('Error fetching availability:', error);
        setSlotsError('Unable to fetch available time slots');
        setAvailableSlots([]);
      } finally {
        setIsFetchingSlots(false);
      }
    };

    fetchAvailability();
  }, [selectedParticipants, meetingDuration]);

  // Handle meeting creation
  const handleCreateMeeting = async () => {
    if (!meetingTitle || !selectedSlot || selectedParticipants.length === 0 || !user) {
      return;
    }

    setIsCreatingMeeting(true);
    setCreateMeetingError(null);

    try {
      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/meetings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: meetingTitle,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          participantIds: [...selectedParticipants, user.id], // Include organizer
          projectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create meeting');
      }

      const data = await response.json();
      console.log('Meeting created:', data);

      // Refresh meetings list
      await refreshMeetings();

      // Close modal and reset
      setIsScheduleModalOpen(false);
      setMeetingTitle("");
      setMeetingDuration("30");
      setSelectedParticipants([]);
      setSelectedSlot(null);
      setAvailableSlots([]);
      setSlotsError(null);
    } catch (error) {
      console.error('Error creating meeting:', error);
      setCreateMeetingError(error instanceof Error ? error.message : 'Failed to create meeting');
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getTimeUntil = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `in ${diffMins}m`;
    if (diffHours < 24) return `in ${diffHours}h`;
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `in ${diffDays} days`;
    return formatDate(date);
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-gradient-to-br from-gray-50 to-white",
      !embedded && "rounded-lg border border-gray-200 shadow-sm"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Video className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Meetings
            </h3>
            <p className="text-xs text-gray-500">
              {upcomingMeetings.length} upcoming · {pastMeetings.length} past
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsScheduleModalOpen(true)}
          className="p-2 hover:bg-purple-50 hover:text-purple-600 transition-colors"
          title="Schedule new meeting"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Meetings List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isMeetingsLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : upcomingMeetings.length === 0 && pastMeetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="p-4 bg-gray-100 rounded-full mb-4">
              <Video className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              No Meetings Yet
            </h4>
            <p className="text-sm text-gray-500 max-w-sm">
              Meeting summaries and transcripts will appear here once meetings are recorded.
            </p>
          </div>
        ) : (
          <>
            {/* Upcoming Meetings Section */}
            {upcomingMeetings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 px-1">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <h4 className="text-sm font-semibold text-gray-900">
                    Upcoming Meetings
                  </h4>
                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                    {upcomingMeetings.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting, index) => {
                    const startTime = new Date(meeting.start_time);
                    const participants = meeting.participants || [];

                    return (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-green-500 border-t border-r border-b border-gray-200 bg-gradient-to-r from-green-50/50 to-white">
                        <div className="p-4">
                          {/* Meeting Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                {meeting.title}
                              </h4>
                              <div className="flex items-center space-x-3 text-xs">
                                <span className="flex items-center text-green-700 font-medium">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {getTimeUntil(startTime)}
                                </span>
                                <span className="flex items-center text-gray-500">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {formatDate(startTime)}
                                </span>
                              </div>
                            </div>
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-md flex-shrink-0">
                              {formatDuration(meeting.duration_minutes)}
                            </span>
                          </div>

                          {/* Participants */}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Participants:</p>
                            <div className="flex flex-wrap gap-1">
                              {participants.map((participant, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                                >
                                  {participant.user?.full_name || participant.user?.email || 'Unknown'}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )})}
                </div>
              </div>
            )}

            {/* Past Meetings Section */}
            {pastMeetings.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 px-1">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <h4 className="text-sm font-semibold text-gray-900">
                    Past Meetings
                  </h4>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    {pastMeetings.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {pastMeetings.map((meeting, index) => {
                    const startTime = new Date(meeting.start_time);
                    const participants = meeting.participants || [];

                    return (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-all duration-200 border border-gray-200 bg-white">
                        <div className="p-4">
                          {/* Meeting Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 mb-1 truncate">
                                {meeting.title}
                              </h4>
                              <div className="flex items-center space-x-3 text-xs text-gray-500">
                                <span className="flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {formatDate(startTime)}
                                </span>
                                <span className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDuration(meeting.duration_minutes)}
                                </span>
                              </div>
                            </div>
                            {meeting.recording_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(meeting.recording_url, "_blank")}
                                className="p-1.5 hover:bg-purple-50 hover:text-purple-600 transition-colors flex-shrink-0"
                                title="Play recording"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                          </div>

                          {/* Participants */}
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Participants:</p>
                            <div className="flex flex-wrap gap-1">
                              {participants.map((participant, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                                >
                                  {participant.user?.full_name || participant.user?.email || 'Unknown'}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Summary */}
                          {meeting.summary && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-gray-700 mb-1 flex items-center">
                                <FileText className="w-3 h-3 mr-1" />
                                Summary
                              </p>
                              <p className="text-xs text-gray-600 leading-relaxed">
                                {meeting.summary}
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            {meeting.transcript_text && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // TODO: Open transcript modal
                                  console.log("View transcript", meeting.id);
                                }}
                                className="text-xs hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                Transcript
                              </Button>
                            )}
                            {meeting.recording_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // TODO: Implement download functionality
                                  console.log("Download meeting", meeting.id);
                                }}
                                className="text-xs hover:bg-gray-50 hover:text-gray-700 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )})}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
          <FileText className="w-4 h-4" />
          <span>All meeting summaries and transcripts</span>
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setMeetingTitle("");
          setMeetingDuration("30");
          setSelectedParticipants([]);
          setSelectedSlot(null);
          setAvailableSlots([]);
          setSlotsError(null);
        }}
        title="Schedule New Meeting"
        size="4xl"
      >
        <div className="space-y-4">
          {/* Meeting Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Title
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="e.g., Project Review Meeting"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Meeting Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Duration (minutes)
            </label>
            <input
              type="number"
              value={meetingDuration}
              onChange={(e) => setMeetingDuration(e.target.value)}
              min="15"
              max="240"
              step="15"
              placeholder="30"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Two Column Layout: Participants on left, Time Slots on right */}
          <div className="grid grid-cols-5 gap-4">
            {/* Left Column: Participants */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Participants
              </label>
              <div className="border border-gray-300 rounded-lg h-80 overflow-y-auto">
                {isMembersLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Loading members...
                  </div>
                ) : projectMembers.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No team members available
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {projectMembers.map((member) => {
                      const displayName = member.userName || member.userEmail || "Unknown User";
                      const isSelected = selectedParticipants.includes(member.userId);

                      return (
                        <label
                          key={member.userId}
                          className={cn(
                            "flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors",
                            isSelected ? "bg-purple-50 border border-purple-200" : "hover:bg-gray-50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedParticipants([...selectedParticipants, member.userId]);
                              } else {
                                setSelectedParticipants(
                                  selectedParticipants.filter((id) => id !== member.userId)
                                );
                              }
                            }}
                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0",
                              "bg-gradient-to-br from-blue-500 to-blue-600"
                            )}>
                              {displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {displayName}
                              </p>
                              {member.userEmail && (
                                <p className="text-xs text-gray-500 truncate">
                                  {member.userEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              )}
              </div>
            </div>
            
            {/* Right Column: Available Time Slots */}
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Time Slots
              </label>
              
              {selectedParticipants.length === 0 ? (
                <div className="border border-gray-200 rounded-lg p-8 bg-gray-50 h-80 flex items-center justify-center">
                  <p className="text-sm text-gray-500 text-center">
                    Select participants to see available times
                  </p>
                </div>
              ) : isFetchingSlots ? (
                <div className="flex items-center justify-center py-8 border border-gray-200 rounded-lg h-80">
                  <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
                    <span className="text-sm text-gray-600">Finding available times...</span>
                  </div>
                </div>
              ) : slotsError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg h-80 flex items-center justify-center">
                  <p className="text-sm text-red-600">{slotsError}</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg h-80 flex items-center justify-center">
                  <p className="text-sm text-gray-600 text-center">
                    No common available times found. Try selecting different participants or manually enter a time.
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg h-80 overflow-y-auto">
                  <div className="p-2 space-y-3">
                    {(() => {
                      // Group slots by day
                      const slotsByDay: Record<string, Array<{ start: string; end: string }>> = {};
                      availableSlots.forEach(slot => {
                        const date = new Date(slot.start);
                        const dayKey = date.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        });
                        if (!slotsByDay[dayKey]) {
                          slotsByDay[dayKey] = [];
                        }
                        slotsByDay[dayKey].push(slot);
                      });

                      return Object.entries(slotsByDay).map(([day, slots]) => (
                        <div key={day} className="space-y-2">
                          <h4 className="text-xs font-semibold text-gray-700 px-2 py-1 bg-gray-100 rounded">
                            {day}
                          </h4>
                          <div className="grid grid-cols-4 gap-2 px-2">
                            {slots.map((slot, idx) => {
                              const startTime = new Date(slot.start);
                              const timeStr = startTime.toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              });
                              const isSelected = selectedSlot?.start === slot.start;

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSlot(slot);
                                  }}
                                  className={cn(
                                    "px-3 py-2 text-xs font-medium rounded-md transition-colors",
                                    isSelected
                                      ? "bg-purple-600 text-white"
                                      : "bg-white border border-gray-300 text-gray-700 hover:bg-purple-50 hover:border-purple-300"
                                  )}
                                >
                                  {timeStr}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {createMeetingError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{createMeetingError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setIsScheduleModalOpen(false);
                setMeetingTitle("");
                setMeetingDuration("30");
                setSelectedParticipants([]);
                setSelectedSlot(null);
                setAvailableSlots([]);
                setSlotsError(null);
                setCreateMeetingError(null);
              }}
              disabled={isCreatingMeeting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateMeeting}
              disabled={!meetingTitle || !selectedSlot || selectedParticipants.length === 0 || isCreatingMeeting}
              className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingMeeting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Schedule Meeting'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
