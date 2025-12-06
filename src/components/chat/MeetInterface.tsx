// src/components/chat/MeetInterface.tsx
import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useOrgStore } from "@/stores/useOrgStore";
import { useProjects } from "@/hooks/useProjects";
import { useProjectEligibleMembers } from "@/hooks/useProjectEligibleMembers";

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
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");

  // Get project members
  const { members } = useOrgStore();
  const { projects } = useProjects();

  const activeProject = useMemo(
    () => projects?.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const {
    eligibleMembers,
  } = useProjectEligibleMembers({
    projectId,
    members,
    advisorUserId: activeProject?.assignedAdvisorUserId,
  });

  // TODO: Replace with actual data from backend/database
  // This is mock data for demonstration
  const allMeetings: Meeting[] = [
    // Upcoming meetings
    {
      id: "upcoming-1",
      title: "Weekly Project Sync",
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      duration: 30,
      participants: ["John Doe", "Jane Smith", "Advisor Mike"],
    },
    {
      id: "upcoming-2",
      title: "Investor Pitch Preparation",
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      duration: 60,
      participants: ["Jane Smith", "Advisor Mike"],
    },
    {
      id: "upcoming-3",
      title: "Site Visit Debrief",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      duration: 45,
      participants: ["John Doe", "Jane Smith"],
    },
    // Past meetings
    {
      id: "1",
      title: "Project Kickoff Meeting",
      date: new Date("2024-12-01T10:00:00"),
      duration: 45,
      participants: ["John Doe", "Jane Smith", "Advisor Mike"],
      summary: "Discussed project timeline, key milestones, and initial documentation requirements. Team agreed on weekly check-ins every Monday at 10 AM.",
      transcript: "John: Welcome everyone to our project kickoff...\nJane: Thanks for organizing this meeting...\n[Full transcript would be loaded from backend]",
      recordingUrl: "#",
    },
    {
      id: "2",
      title: "Q4 Financial Review",
      date: new Date("2024-11-28T14:30:00"),
      duration: 60,
      participants: ["Jane Smith", "Advisor Mike"],
      summary: "Reviewed Q4 financial projections and updated cash flow analysis. Discussed potential funding sources and timeline for capital raise.",
      transcript: "Jane: Let's start with the Q4 numbers...\nAdvisor Mike: Looking at the projections...\n[Full transcript would be loaded from backend]",
    },
    {
      id: "3",
      title: "Document Review Session",
      date: new Date("2024-11-25T16:00:00"),
      duration: 30,
      participants: ["John Doe", "Jane Smith"],
      summary: "Reviewed project documents and identified missing information. Assigned action items for completing property analysis section.",
    },
  ];

  // Separate upcoming and past meetings
  const now = new Date();
  const upcomingMeetings = allMeetings
    .filter((m) => m.date > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime()); // Ascending order (soonest first)

  const pastMeetings = allMeetings
    .filter((m) => m.date <= now)
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // Descending order (most recent first)

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
        {allMeetings.length === 0 ? (
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
                  {upcomingMeetings.map((meeting, index) => (
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
                                  {getTimeUntil(meeting.date)}
                                </span>
                                <span className="flex items-center text-gray-500">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {formatDate(meeting.date)}
                                </span>
                              </div>
                            </div>
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-md flex-shrink-0">
                              {formatDuration(meeting.duration)}
                            </span>
                          </div>

                          {/* Participants */}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Participants:</p>
                            <div className="flex flex-wrap gap-1">
                              {meeting.participants.map((participant, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                                >
                                  {participant}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
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
                  {pastMeetings.map((meeting, index) => (
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
                                  {formatDate(meeting.date)}
                                </span>
                                <span className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {formatDuration(meeting.duration)}
                                </span>
                              </div>
                            </div>
                            {meeting.recordingUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(meeting.recordingUrl, "_blank")}
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
                              {meeting.participants.map((participant, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700"
                                >
                                  {participant}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMeeting(meeting);
                                setViewMode("summary");
                              }}
                              className="text-xs hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              View Summary
                            </Button>
                            {meeting.transcript && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMeeting(meeting);
                                  setViewMode("transcript");
                                }}
                                className="text-xs hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <ChevronRight className="w-3 h-3" />
                                Transcript
                              </Button>
                            )}
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
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
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
          setMeetingDate("");
          setMeetingTime("");
          setSelectedParticipants([]);
        }}
        title="Schedule New Meeting"
        size="md"
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

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Participants
            </label>
            <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
              {eligibleMembers.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No team members available
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {eligibleMembers.map((member) => {
                    const displayName = member.userName || member.userEmail || "Unknown User";
                    const isSelected = selectedParticipants.includes(member.user_id);
                    const isAdvisor = member.role === "advisor";

                    return (
                      <label
                        key={member.user_id}
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
                              setSelectedParticipants([...selectedParticipants, member.user_id]);
                            } else {
                              setSelectedParticipants(
                                selectedParticipants.filter((id) => id !== member.user_id)
                              );
                            }
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0",
                            isAdvisor ? "bg-gradient-to-br from-purple-500 to-purple-600" : "bg-gradient-to-br from-blue-500 to-blue-600"
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
                          {isAdvisor && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 flex-shrink-0">
                              Advisor
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Selected Count */}
          {selectedParticipants.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <UsersIcon className="w-4 h-4" />
              <span>
                {selectedParticipants.length} participant{selectedParticipants.length !== 1 ? "s" : ""} selected
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => {
                setIsScheduleModalOpen(false);
                setMeetingTitle("");
                setMeetingDate("");
                setMeetingTime("");
                setSelectedParticipants([]);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // TODO: Implement actual meeting scheduling with backend
                console.log("Scheduling meeting:", {
                  title: meetingTitle,
                  date: meetingDate,
                  time: meetingTime,
                  participants: selectedParticipants,
                  projectId,
                });

                // Close modal and reset
                setIsScheduleModalOpen(false);
                setMeetingTitle("");
                setMeetingDate("");
                setMeetingTime("");
                setSelectedParticipants([]);
              }}
              disabled={!meetingTitle || !meetingDate || !meetingTime || selectedParticipants.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Schedule Meeting
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
