"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { RoleBasedRoute } from "../../../../components/auth/RoleBasedRoute";
import { useAuth } from "../../../../hooks/useAuth";

import { LoadingOverlay } from "../../../../components/ui/LoadingOverlay";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/Button";
import { SingleSelectChips } from "../../../../components/ui/SingleSelectChips";
import {
  ChevronLeft,
  FileText,
  User,
  MessageSquare,
  Calendar,
  Building,
  MapPin,
  DollarSign,
  Send,
} from "lucide-react";
import {
  BorrowerProfile, // Used for demo mode mapping
  ProjectProfile,
  ProjectStatus,
  Project, // Base Project type, useful for some contexts
  BorrowerResume,
  ProjectResume,
} from "../../../../types/enhanced-types";
import { generateProjectFeedback } from "../../../../../lib/enhancedMockApiService";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { storageService } from "@/lib/storage";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../../../../lib/supabaseClient";
import { getProjectWithResume } from "@/lib/project-queries";
import { cn } from "@/utils/cn";
import { ProjectResumeView } from "@/components/project/ProjectResumeView";
import { EnhancedProjectForm } from "@/components/forms/EnhancedProjectForm";
import { ProjectCompletionCard } from "@/components/project/ProjectCompletionCard";
import { ProjectSummaryCard } from "@/components/project/ProjectSummaryCard";
import { BorrowerResumeForm } from "@/components/forms/BorrowerResumeForm";
import { StickyChatCard } from "@/components/chat/StickyChatCard";

// Utility functions
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getStatusColor = (status: ProjectStatus) => {
  switch (status) {
    case "Draft":
      return "text-gray-600 bg-gray-100";
    case "Info Gathering":
      return "text-blue-600 bg-blue-50";
    case "Advisor Review":
      return "text-amber-600 bg-amber-50";
    case "Matches Curated":
      return "text-purple-600 bg-purple-50";
    case "Introductions Sent":
      return "text-indigo-600 bg-indigo-50";
    case "Term Sheet Received":
      return "text-teal-600 bg-teal-50";
    case "Closed":
      return "text-green-600 bg-green-50";
    case "Withdrawn":
      return "text-red-600 bg-red-50";
    case "Stalled":
      return "text-orange-600 bg-orange-50";
    default:
      return "text-gray-600 bg-gray-100";
  }
};

interface ProjectMessage {
  id: string;
  projectId: string; // From params
  thread_id: string;
  user_id: string;
  sender: {
    id: string;
    full_name?: string;
  };
  message: string;
  createdAt: string;
}

interface ChatThread {
  id: string;
  topic: string;
}

export default function AdvisorProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectProfile | null>(null);
  const [borrowerResume, setBorrowerResume] = useState<BorrowerResume | null>(
    null
  );
  const [ownerOrgName, setOwnerOrgName] = useState<string | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [newMessage, setNewMessage] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<ProjectStatus>("Info Gathering");
  const [activeTab, setActiveTab] = useState<"project" | "borrower">("project");
  const messageSubscriptionRef = useRef<RealtimeChannel | null>(null);
  const [isEditingProject, setIsEditingProject] = useState<boolean>(false);
  const borrowerResumeRef = useRef<HTMLDivElement | null>(null);

  const projectId = params?.id as string;

  // Effect for initial data loading
  useEffect(() => {
    const loadProjectData = async () => {
      if (!user || user.role !== "advisor" || !projectId) {
        router.push("/advisor/dashboard");
        return;
      }

      try {
        setIsLoadingData(true);

        // 1. Load project with resume content using the new query function
        const foundProject = await getProjectWithResume(projectId);
        if (!foundProject) {
          console.error("Project not found");
          router.push("/advisor/dashboard");
          return;
        }
        setProject(foundProject);
        setSelectedStatus(
          (foundProject.projectStatus as ProjectStatus) || "Info Gathering"
        );

        // 2. Load owner org name
        if (foundProject.owner_org_id) {
          const { data: orgData, error: orgError } = await supabase
            .from("orgs")
            .select("name")
            .eq("id", foundProject.owner_org_id)
            .single();

          if (!orgError && orgData) {
            setOwnerOrgName(orgData.name);
          } else {
            console.warn("Error loading owner org name:", orgError);
          }
        }

        // 3. Load borrower resume for the owning org
        if (user.isDemo) {
          const allProfiles = await storageService.getItem<BorrowerProfile[]>(
            "borrowerProfiles"
          );
          const profile = allProfiles?.find(
            (p) => p.entityId === foundProject.owner_org_id
          );
          if (profile) {
            setBorrowerResume({
              id: `resume-${profile.id}`,
              org_id: foundProject.owner_org_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              content: {
                fullLegalName: profile.fullLegalName,
                primaryEntityName: profile.primaryEntityName,
                contactEmail: profile.contactEmail,
                contactPhone: profile.contactPhone,
                yearsCREExperienceRange: profile.yearsCREExperienceRange,
                assetClassesExperience: profile.assetClassesExperience,
                geographicMarketsExperience:
                  profile.geographicMarketsExperience,
                creditScoreRange: profile.creditScoreRange,
                netWorthRange: profile.netWorthRange,
                liquidityRange: profile.liquidityRange,
                bankruptcyHistory: profile.bankruptcyHistory,
                foreclosureHistory: profile.foreclosureHistory,
                litigationHistory: profile.litigationHistory,
              },
            });
          }
        } else {
          const { data: borrowerResumeData, error: borrowerResumeError } =
            await supabase
              .from("borrower_resumes")
              .select("*")
              .eq("org_id", foundProject.owner_org_id)
              .single();

          if (borrowerResumeError && borrowerResumeError.code !== "PGRST116") {
            console.warn("Error loading borrower resume:", borrowerResumeError);
          } else if (borrowerResumeData) {
            setBorrowerResume(borrowerResumeData);
          }
        }

        // 4. Fetch chat threads
        try {
          const { data: threadData, error: threadError } = await supabase
            .from("chat_threads")
            .select("id, topic")
            .eq("project_id", projectId);
          if (threadError) {
            throw threadError;
          }
          if (threadData) {
            setThreads(threadData);
            // Optionally set the first thread as active by default
            if (threadData.length > 0) {
              setActiveThreadId(threadData[0].id);
            }
          }
        } catch (error) {
          console.error("Error fetching threads:", error);
        }

        // Removed document requirements section
      } catch (error) {
        console.error("Error loading project data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadProjectData();
  }, [user, projectId, router]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      setIsLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from("project_messages")
          .select("*, sender:profiles(id, full_name)")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true });
        if (error) throw error;

        const mapped = (data || []).map(
          (msg: any) =>
            ({
              id: msg.id.toString(),
              projectId,
              thread_id: msg.thread_id,
              user_id: msg.user_id,
              sender: msg.sender || { id: msg.user_id, full_name: "Unknown" },
              message: msg.content || "",
              createdAt: msg.created_at,
            } as ProjectMessage)
        );
        setMessages(mapped);
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [projectId]
  );

  // Effect for loading messages and setting up subscriptions
  useEffect(() => {
    if (!activeThreadId) return;

    loadMessages(activeThreadId);

    if (messageSubscriptionRef.current) {
      supabase.removeChannel(messageSubscriptionRef.current);
    }

    const channel = supabase
      .channel(`project-messages-advisor-${activeThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_messages",
          filter: `thread_id=eq.${activeThreadId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;
          // Fetch sender profile to append to the message
          const { data: senderProfile, error } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", newMessage.user_id)
            .single();

          if (error) {
            console.error("Error fetching profile for new message:", error);
            loadMessages(activeThreadId); // Fallback to full reload
            return;
          }

          const mappedMessage: ProjectMessage = {
            id: newMessage.id.toString(),
            projectId,
            ...newMessage,
            sender: senderProfile || {
              id: newMessage.user_id,
              full_name: "Unknown",
            },
            message: newMessage.content || "",
            createdAt: newMessage.created_at,
          };
          setMessages((prev) => [...prev, mappedMessage]);
        }
      )
      .subscribe();

    messageSubscriptionRef.current = channel;

    return () => {
      if (messageSubscriptionRef.current) {
        supabase.removeChannel(messageSubscriptionRef.current);
      }
    };
  }, [activeThreadId, projectId, loadMessages]);

  const handleStatusChange = useCallback(
    async (newStatus: ProjectStatus) => {
      if (!project) return;
      try {
        setSelectedStatus(newStatus);

        if (project) {
          const updatedContent = { ...project, projectStatus: newStatus };

          if (user?.isDemo) {
            console.log(
              "Demo mode: Project status would be updated to",
              newStatus
            );
          } else {
            const { error } = await supabase
              .from("project_resumes")
              .update({
                content: updatedContent,
                updated_at: new Date().toISOString(),
              })
              .eq("project_id", project.id);
            if (error) throw error;
          }
        }

        console.log("Project status updated successfully");
      } catch (error) {
        console.error("Error updating project status:", error);
      }
    },
    [project, user]
  );

  const handleSendMessage = useCallback(
    async (messageText?: string, isSystemMessage = false) => {
      if (!activeThreadId || !user || !user.id) return;

      const messageContent = messageText || newMessage;
      if (!messageContent.trim()) return;

      setIsSending(true);
      try {
        const { error } = await supabase.from("project_messages").insert({
          thread_id: activeThreadId,
          user_id: user.id,
          content: messageContent,
        });
        if (error) {
          console.error("Failed to send message", error);
        } else {
          if (!isSystemMessage) {
            setNewMessage("");
          }
        }
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsSending(false);
      }
    },
    [activeThreadId, user, newMessage]
  );

  const generateFeedback = useCallback(async () => {
    if (!project || !user || !user.id) return;

    try {
      const feedback = await generateProjectFeedback(project.id, project);
      await handleSendMessage(`[AI Feedback Suggestion]: ${feedback}`, true);
      console.log("Feedback generated and sent");
    } catch (error) {
      console.error("Error generating feedback:", error);
    }
  }, [project, user, handleSendMessage]);

  // Render functions for sections
  const renderProjectDetails = useCallback(() => {
    if (!project) return null;
    return (
      <>
        {isEditingProject ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4">
              <EnhancedProjectForm
                existingProject={project}
                onComplete={() => setIsEditingProject(false)}
                onFormDataChange={() => {}}
              />
            </div>
          </div>
        ) : (
          <ProjectResumeView
            project={project}
            onEdit={() => setIsEditingProject(true)}
          />
        )}
      </>
    );
  }, [project, isEditingProject]);

  // Document requirements removed

  const renderBorrowerDetails = useCallback(() => {
    if (!borrowerResume?.content) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-500">Borrower resume not found</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Borrower</h3>
          <div className="flex items-start">
            <User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
            <div>
              <p className="text-sm text-gray-800">
                {String(borrowerResume.content.fullLegalName) || "Not provided"}
              </p>
              <p className="text-sm text-gray-600">
                {String(borrowerResume.content.contactEmail) || "Not provided"}
              </p>
              <p className="text-sm text-gray-600">
                {String(borrowerResume.content.contactPhone) || "Not provided"}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Entity</h3>
          <div className="flex items-start">
            <Building className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
            <div>
              <p className="text-sm text-gray-800">
                {String(borrowerResume.content.primaryEntityName) || "Not provided"}
              </p>
              <p className="text-sm text-gray-600">
                {String(borrowerResume.content.primaryEntityStructure) ||
                  "Not provided"}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Experience</h3>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Years of Experience:</span>{" "}
            {String(borrowerResume.content.yearsCREExperienceRange) || "Not provided"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Asset Classes:</span>{" "}
            {(borrowerResume.content.assetClassesExperience as string[])?.join(", ") ||
              "Not provided"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Markets:</span>{" "}
            {(borrowerResume.content.geographicMarketsExperience as string[])?.join(", ") ||
              "Not provided"}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Financial</h3>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Credit Score:</span>{" "}
            {String(borrowerResume.content.creditScoreRange) || "Not provided"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Net Worth:</span>{" "}
            {String(borrowerResume.content.netWorthRange) || "Not provided"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Liquidity:</span>{" "}
            {String(borrowerResume.content.liquidityRange) || "Not provided"}
          </p>
        </div>

        {(Boolean(borrowerResume.content.bankruptcyHistory) ||
          Boolean(borrowerResume.content.foreclosureHistory) ||
          Boolean(borrowerResume.content.litigationHistory)) && (
          <div className="bg-amber-50 p-3 rounded border border-amber-200">
            <h3 className="text-sm font-medium text-amber-800 mb-1">
              Special Considerations
            </h3>
            <ul className="text-sm text-amber-700 list-disc list-inside">
              {Boolean(borrowerResume.content.bankruptcyHistory) && (
                <li>Bankruptcy history in the past 7 years</li>
              )}
              {Boolean(borrowerResume.content.foreclosureHistory) && (
                <li>Foreclosure history in the past 7 years</li>
              )}
              {Boolean(borrowerResume.content.litigationHistory) && (
                <li>Significant litigation history</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }, [borrowerResume]);

  const renderMessageBoard = useCallback(() => {
    return (
      <div className="h-full flex">
        {/* Threads Sidebar - Left Side */}
        <div className="flex-shrink-0 bg-gray-50 border-r border-gray-100 w-48 flex flex-col">
          <div className="p-3 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-800 text-sm">Channels</h3>
            </div>
            <div className="text-[11px] text-gray-500">
              Switch between discussion channels
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {threads.length === 0 ? (
              <div className="p-3 text-center text-sm text-gray-500">
                No channels yet
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setActiveThreadId(thread.id)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      activeThreadId === thread.id
                        ? "bg-blue-100 font-semibold text-blue-800"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    # {thread.topic}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area - Right Side */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeThreadId ? (
            <>
              {/* Message Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                {isLoadingMessages ? (
                  <div className="flex justify-center items-center h-full">
                    <p>Loading messages...</p>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((message) => {
                    const isAdvisor = message.user_id === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isAdvisor ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm ${
                            isAdvisor
                              ? "bg-blue-100 text-blue-900"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <div className="flex items-center mb-1">
                            <span className="text-xs font-semibold">
                              {isAdvisor
                                ? "You"
                                : message.sender.full_name || "Borrower"}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              {new Date(message.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-line">
                            {message.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No messages yet</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-white flex space-x-2">
                <textarea
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Type your message here..."
                  rows={2}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={!activeThreadId || isSending}
                />
                <div className="flex flex-col space-y-2">
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={!newMessage.trim() || !activeThreadId || isSending}
                    leftIcon={<Send size={16} />}
                  >
                    Send
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={generateFeedback}
                    disabled={!activeThreadId || isSending}
                  >
                    Generate Feedback
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p>Select a channel to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }, [
    messages,
    newMessage,
    user, // Changed from borrowerResume as sender is from profiles
    handleSendMessage,
    generateFeedback,
    threads,
    activeThreadId,
    isLoadingMessages,
    isSending,
  ]);

  return (
    <RoleBasedRoute roles={["advisor"]}>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <LoadingOverlay isLoading={isLoadingData} />

        {/* Header */}
        <header className="bg-white shadow-sm py-4 px-6 flex items-center flex-shrink-0 relative z-10">
          <Button
            variant="outline"
            leftIcon={<ChevronLeft size={16} />}
            onClick={() => {
              if (activeTab === "borrower") {
                setActiveTab("project");
              } else {
                router.push("/advisor/dashboard");
              }
            }}
            className="mr-4"
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              {project?.projectName || "Project Details"}
              {activeTab === "borrower" && (
                <span className="ml-3 text-lg font-semibold text-gray-600">/ Borrower Details</span>
              )}
            </h1>
            <div
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getStatusColor(
                selectedStatus
              )}`}
            >
              {selectedStatus}
            </div>
          </div>
        </header>

        {/* Main content with flex layout (mirrors borrower workspace visuals) */}
        <div className="flex flex-1">
          {/* Left Column: Scrollable content */}
          <div className="flex-1 relative z-[1] flex flex-col min-h-0">
            {/* Background visuals */}
            <div className="pointer-events-none absolute inset-0 z-0">
              <div className="absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(ellipse_100%_80%_at_50%_30%,black,transparent_70%)]">
                <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
                  <defs>
                    <pattern id="advisor-grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#advisor-grid-pattern)" />
                </svg>
              </div>
            </div>

            {/* Content with padding */}
            <div className="relative p-6 flex-1">
              <div className="space-y-6">
                {/* Top summaries */}
                <div className="relative">
                  <ProjectSummaryCard
                    project={project}
                    isLoading={isLoadingData}
                    onEdit={() => setIsEditingProject(true)}
                    onBorrowerClick={() => {
                      setActiveTab("borrower");
                    }}
                  />
                </div>

                {activeTab === "project" ? (
                  <>
                    {/* Project Documents */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      {project && (
                        <DocumentManager
                          resourceId="PROJECT_ROOT"
                          title="Project-Specific Documents"
                          projectId={project.id}
                        />
                      )}
                    </div>

                    {/* Project completion banner BETWEEN documents and resume */}
                    <ProjectCompletionCard
                      project={project}
                      isLoading={isLoadingData}
                      onEdit={() => setIsEditingProject(true)}
                    />

                    {/* Project Resume View/Edit */}
                    {renderProjectDetails()}
                  </>
                ) : (
                  <>
                    {/* Borrower Documents */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      {project && (
                        <DocumentManager
                          resourceId="BORROWER_ROOT"
                          title="General Borrower Documents"
                          projectId={null}
                          orgId={project.owner_org_id as string | null}
                        />
                      )}
                    </div>

                    {/* Borrower Resume (Advisor editable) */}
                    <div ref={borrowerResumeRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-6 sm:p-8">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center mb-6">
                          <User className="h-5 w-5 mr-2 text-blue-600" />
                          Borrower Resume
                        </h2>
                        {project && (
                          <BorrowerResumeForm orgId={project.owner_org_id as string} />
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky collapsible chat card (match borrower workspace) */}
          <StickyChatCard
            projectId={projectId}
            topOffsetClassName="top-6"
            widthClassName="w-[35%] md:w-[40%] xl:w-[45%] max-w-[700px]"
          />
        </div>
      </div>
    </RoleBasedRoute>
  );
}
