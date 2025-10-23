"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { RoleBasedRoute } from "../../../../components/auth/RoleBasedRoute";
import { useAuth } from "../../../../hooks/useAuth";

import { LoadingOverlay } from "../../../../components/ui/LoadingOverlay";
import { Card, CardContent, CardHeader } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/Button";
import { Select } from "../../../../components/ui/Select";
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
  ProjectDocumentRequirement,
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
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [documentRequirements, setDocumentRequirements] = useState<
    ProjectDocumentRequirement[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState("details");
  const [newMessage, setNewMessage] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<ProjectStatus>("Info Gathering");
  const messageSubscriptionRef = useRef<RealtimeChannel | null>(null);

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

        // 2. Load borrower resume for the owning org
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

        // 3. Fetch chat threads
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

        // 4. Fetch document requirements
        const allRequirements = await storageService.getItem<
          ProjectDocumentRequirement[]
        >("documentRequirements");
        if (allRequirements) {
          const projectRequirements = allRequirements.filter(
            (r) => r.projectId === projectId
          );
          setDocumentRequirements(projectRequirements);
        }
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
      <div className="grid md:grid-cols-2 gap-4 p-4">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Project Name
            </h3>
            <p className="text-sm text-gray-800">{project.projectName}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Project ID
            </h3>
            <p className="text-sm text-gray-800 font-mono">{project.id}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Owner Org ID
            </h3>
            <p className="text-sm text-gray-800 font-mono">
              {project.owner_org_id}
            </p>
          </div>

          {project && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Project Details
              </h3>
              <div className="space-y-2">
                {project.propertyAddressStreet && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800">
                        {`${project.propertyAddressStreet}, ${project.propertyAddressCity}, ${project.propertyAddressState} ${project.propertyAddressZip}`}
                      </p>
                    </div>
                  </div>
                )}
                {project.assetType && (
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Asset Type:</span>{" "}
                    {project.assetType}
                  </p>
                )}
                {project.projectDescription && (
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Description:</span>{" "}
                    {project.projectDescription}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {project && (
            <>
              {project.loanAmountRequested && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Loan Information
                  </h3>
                  <div className="flex items-start">
                    <DollarSign className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">Amount Requested:</span>{" "}
                        {formatCurrency(project.loanAmountRequested)}
                      </p>
                      {project.loanType && (
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Type:</span>{" "}
                          {project.loanType}
                        </p>
                      )}
                      {project.targetLtvPercent && (
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Target LTV:</span>{" "}
                          {project.targetLtvPercent}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {project.purchasePrice && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Capital Stack
                  </h3>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">Purchase Price:</span>{" "}
                      {formatCurrency(project.purchasePrice)}
                    </p>
                    {project.totalProjectCost && (
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">Total Project Cost:</span>{" "}
                        {formatCurrency(project.totalProjectCost)}
                      </p>
                    )}
                    {project.exitStrategy && (
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">Exit Strategy:</span>{" "}
                        {project.exitStrategy}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Project Dates
            </h3>
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Created:</span>{" "}
                  {formatDate(project.createdAt)}
                </p>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Last Updated:</span>{" "}
                  {formatDate(project.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [project]);

  const renderDocumentRequirements = useCallback(() => {
    return (
      <CardContent className="p-0">
        {documentRequirements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentRequirements.map((req) => (
                  <tr key={req.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {req.requiredDocType}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          req.status === "Approved"
                            ? "bg-green-100 text-green-800"
                            : req.status === "Rejected"
                            ? "bg-red-100 text-red-800"
                            : req.status === "Uploaded"
                            ? "bg-blue-100 text-blue-800"
                            : req.status === "In Review"
                            ? "bg-amber-100 text-amber-800"
                            : req.status === "Not Applicable"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No document requirements</p>
          </div>
        )}
      </CardContent>
    );
  }, [documentRequirements]);

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
      <div className="h-full flex flex-col">
        {/* Thread List */}
        <div className="p-2 border-b">
          <h4 className="text-sm font-semibold mb-2 px-2">Channels</h4>
          <div className="space-y-1">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className={`w-full text-left p-2 rounded text-sm ${
                  activeThreadId === thread.id
                    ? "bg-blue-100 font-semibold text-blue-800"
                    : "hover:bg-gray-100"
                }`}
              >
                # {thread.topic}
              </button>
            ))}
          </div>
        </div>

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
        <div className="p-4 border-t flex space-x-2">
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
      <div className="flex h-screen bg-gray-50">
        <LoadingOverlay isLoading={isLoadingData} />

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <header className="bg-white shadow-sm py-4 px-6 flex items-center">
            <Button
              variant="outline"
              leftIcon={<ChevronLeft size={16} />}
              onClick={() => router.push("/advisor/dashboard")}
              className="mr-4"
            >
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">
                {project?.projectName || "Project Details"}
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

          <main className="p-6 flex flex-col h-full">
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                <button
                  onClick={() => setCurrentTab("details")}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                    currentTab === "details"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Details & Documents
                </button>
                <button
                  onClick={() => setCurrentTab("chat")}
                  className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                    currentTab === "chat"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Chat
                </button>
              </nav>
            </div>

            {currentTab === "details" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  <Card className="shadow-sm">
                    <CardHeader className="border-b bg-gray-50 flex flex-row justify-between items-center">
                      <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-blue-600" />
                        Project Details
                      </h2>
                      <Select
                        options={[
                          { value: "Info Gathering", label: "Info Gathering" },
                          { value: "Advisor Review", label: "Advisor Review" },
                          {
                            value: "Matches Curated",
                            label: "Matches Curated",
                          },
                          {
                            value: "Introductions Sent",
                            label: "Introductions Sent",
                          },
                          {
                            value: "Term Sheet Received",
                            label: "Term Sheet Received",
                          },
                          { value: "Closed", label: "Closed" },
                          { value: "Withdrawn", label: "Withdrawn" },
                          { value: "Stalled", label: "Stalled" },
                        ]}
                        value={selectedStatus}
                        onChange={(e) =>
                          handleStatusChange(e.target.value as ProjectStatus)
                        }
                        size="sm"
                        className="w-48"
                      />
                    </CardHeader>
                    <CardContent className="p-0">
                      {renderProjectDetails()}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader className="border-b bg-gray-50">
                      <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-blue-600" />
                        Document Requirements
                      </h2>
                    </CardHeader>
                    {renderDocumentRequirements()}
                  </Card>

                  <Card className="shadow-sm">
                    <CardContent className="p-0">
                      {project && (
                        <DocumentManager
                          resourceId="PROJECT_ROOT"
                          title="Project-Specific Documents"
                          projectId={project.id}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <Card className="shadow-sm">
                    <CardHeader className="border-b bg-gray-50">
                      <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <User className="h-5 w-5 mr-2 text-blue-600" />
                        Borrower Details
                      </h2>
                    </CardHeader>
                    <CardContent className="p-4">
                      {renderBorrowerDetails()}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardContent className="p-0">
                      {project && (
                        <DocumentManager
                          resourceId="BORROWER_ROOT"
                          title="General Borrower Documents"
                          projectId={null}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {currentTab === "chat" && (
              <div className="flex-1 h-full min-h-[600px]">
                <Card className="shadow-sm h-full flex flex-col">
                  <CardHeader className="border-b bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                      Project Message Board
                    </h2>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 flex flex-col">
                    {renderMessageBoard()}
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </RoleBasedRoute>
  );
}
