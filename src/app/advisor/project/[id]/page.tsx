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
  BorrowerProfile,
  ProjectProfile,
  ProjectStatus,
  ProjectDocumentRequirement,
  Project,
  BorrowerResume,
  ProjectResume,
} from "../../../../types/enhanced-types";
import { generateProjectFeedback } from "../../../../../lib/enhancedMockApiService";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { storageService } from "@/lib/storage";
import { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../../../../../lib/supabaseClient";

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
  projectId: string;
  senderId: string;
  senderType: "Advisor" | "Borrower";
  message: string;
  createdAt: string;
  // Added for chat functionality
  user_id?: string | null;
  thread_id?: string;
}

interface ChatThread {
  id: string;
  topic: string;
}

export default function AdvisorProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const [project, setProject] = useState<
    (Project & { owner_entity_id: string }) | null
  >(null);
  const [borrowerResume, setBorrowerResume] = useState<BorrowerResume | null>(
    null
  );
  const [projectResume, setProjectResume] = useState<ProjectResume | null>(
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

        let foundProject:
          | (Project & { owner_entity_id: string })
          | undefined
          | null = null;
        if (user.isDemo) {
          const allProjects = await storageService.getItem<ProjectProfile[]>(
            "projects"
          );
          const legacyProject = allProjects?.find((p) => p.id === projectId);
          if (legacyProject) {
            foundProject = {
              id: legacyProject.id,
              created_at: legacyProject.createdAt,
              updated_at: legacyProject.updatedAt,
              name: legacyProject.projectName,
              owner_org_id: legacyProject.orgId,
              assigned_advisor_id: legacyProject.assignedAdvisorUserId,
              owner_entity_id: legacyProject.orgId, // Assuming orgId maps to owner_entity_id for demo
            };
          }
        } else {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .single();
          if (error) throw error;
          if (data)
            foundProject = data as Project & { owner_entity_id: string };
        }

        if (foundProject) {
          setProject(foundProject);
          // For now, we'll use a default status or try to get from project_resume
          setSelectedStatus("Info Gathering"); // Default

          // Load borrower resume
          if (user.isDemo) {
            const allProfiles = await storageService.getItem<BorrowerProfile[]>(
              "borrowerProfiles"
            );
            const profile = allProfiles?.find(
              (p) => p.entityId === foundProject!.owner_entity_id
            );
            if (profile) {
              setBorrowerResume({
                id: `resume-${profile.id}`,
                entity_id: foundProject!.owner_entity_id,
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
                created_at: profile.createdAt,
                updated_at: profile.updatedAt,
              });
            }
          } else {
            const { data: borrowerResumeData, error: borrowerResumeError } =
              await supabase
                .from("borrower_resumes")
                .select("*")
                .eq("entity_id", foundProject.owner_entity_id)
                .single();

            if (
              borrowerResumeError &&
              borrowerResumeError.code !== "PGRST116"
            ) {
              console.warn(
                "Error loading borrower resume:",
                borrowerResumeError
              );
            } else if (borrowerResumeData) {
              setBorrowerResume(borrowerResumeData);
            }

            const { data: projectResumeData, error: projectResumeError } =
              await supabase
                .from("project_resumes")
                .select("*")
                .eq("project_id", foundProject.id)
                .single();

            if (projectResumeError && projectResumeError.code !== "PGRST116") {
              console.warn("Error loading project resume:", projectResumeError);
            } else if (projectResumeData) {
              setProjectResume(projectResumeData);
              if (projectResumeData.content?.status) {
                setSelectedStatus(projectResumeData.content.status);
              }
            }
          }

          // Fetch chat threads
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
            }
          } catch (error) {
            console.error("Error fetching threads:", error);
          }

          const allRequirements = await storageService.getItem<
            ProjectDocumentRequirement[]
          >("documentRequirements");
          if (allRequirements) {
            const projectRequirements = allRequirements.filter(
              (r) => r.projectId === projectId
            );
            setDocumentRequirements(projectRequirements);
          }
        } else {
          console.error("Project not found");
          router.push("/advisor/dashboard");
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
          .select("*")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true });
        if (error) throw error;

        const mapped = (data || []).map(
          (msg) =>
            ({
              id: msg.id.toString(),
              projectId,
              senderId: msg.user_id || "",
              senderType: msg.user_id === user?.id ? "Advisor" : "Borrower",
              message: msg.content || "",
              createdAt: msg.created_at,
              user_id: msg.user_id,
            } as ProjectMessage)
        );
        setMessages(mapped);
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [projectId, user?.id]
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
        () => loadMessages(activeThreadId)
      )
      .subscribe();

    messageSubscriptionRef.current = channel;

    return () => {
      if (messageSubscriptionRef.current) {
        supabase.removeChannel(messageSubscriptionRef.current);
      }
    };
  }, [activeThreadId, user, loadMessages]);

  const handleStatusChange = useCallback(
    async (newStatus: ProjectStatus) => {
      if (!project) return;

      try {
        setSelectedStatus(newStatus);

        if (projectResume) {
          const updatedContent = {
            ...projectResume.content,
            status: newStatus,
            lastUpdated: new Date().toISOString(),
          };

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
    [project, projectResume, user]
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
            <p className="text-sm text-gray-800">{project.name}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Project ID
            </h3>
            <p className="text-sm text-gray-800 font-mono">{project.id}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Owner Entity ID
            </h3>
            <p className="text-sm text-gray-800 font-mono">
              {project.owner_entity_id}
            </p>
          </div>

          {projectResume?.content && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Project Details
              </h3>
              <div className="space-y-2">
                {projectResume.content.propertyAddress && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800">
                        {projectResume.content.propertyAddress}
                      </p>
                    </div>
                  </div>
                )}
                {projectResume.content.assetType && (
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Asset Type:</span>{" "}
                    {projectResume.content.assetType}
                  </p>
                )}
                {projectResume.content.description && (
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Description:</span>{" "}
                    {projectResume.content.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {projectResume?.content && (
            <>
              {projectResume.content.loanAmount && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Loan Information
                  </h3>
                  <div className="flex items-start">
                    <DollarSign className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">Amount Requested:</span>{" "}
                        {formatCurrency(projectResume.content.loanAmount)}
                      </p>
                      {projectResume.content.loanType && (
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Type:</span>{" "}
                          {projectResume.content.loanType}
                        </p>
                      )}
                      {projectResume.content.targetLTV && (
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">Target LTV:</span>{" "}
                          {projectResume.content.targetLTV}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {projectResume.content.purchasePrice && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Capital Stack
                  </h3>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">Purchase Price:</span>{" "}
                      {formatCurrency(projectResume.content.purchasePrice)}
                    </p>
                    {projectResume.content.totalProjectCost && (
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">Total Project Cost:</span>{" "}
                        {formatCurrency(projectResume.content.totalProjectCost)}
                      </p>
                    )}
                    {projectResume.content.exitStrategy && (
                      <p className="text-sm text-gray-800">
                        <span className="font-medium">Exit Strategy:</span>{" "}
                        {projectResume.content.exitStrategy}
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
                  {formatDate(project.created_at)}
                </p>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Last Updated:</span>{" "}
                  {formatDate(project.updated_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [project, projectResume]);

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
                {borrowerResume.content.fullLegalName || "Not provided"}
              </p>
              <p className="text-sm text-gray-600">
                {borrowerResume.content.contactEmail || "Not provided"}
              </p>
              <p className="text-sm text-gray-600">
                {borrowerResume.content.contactPhone || "Not provided"}
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
                {borrowerResume.content.primaryEntityName || "Not provided"}
              </p>
              <p className="text-sm text-gray-600">
                {borrowerResume.content.primaryEntityStructure ||
                  "Not provided"}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Experience</h3>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Years of Experience:</span>{" "}
            {borrowerResume.content.yearsCREExperienceRange || "Not provided"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Asset Classes:</span>{" "}
            {borrowerResume.content.assetClassesExperience?.join(", ") ||
              "Not provided"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Markets:</span>{" "}
            {borrowerResume.content.geographicMarketsExperience?.join(", ") ||
              "Not provided"}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Financial</h3>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Credit Score:</span>{" "}
            {borrowerResume.content.creditScoreRange || "Not provided"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Net Worth:</span>{" "}
            {borrowerResume.content.netWorthRange || "Not provided"}
          </p>
          <p className="text-sm text-gray-800">
            <span className="font-medium">Liquidity:</span>{" "}
            {borrowerResume.content.liquidityRange || "Not provided"}
          </p>
        </div>

        {(borrowerResume.content.bankruptcyHistory ||
          borrowerResume.content.foreclosureHistory ||
          borrowerResume.content.litigationHistory) && (
          <div className="bg-amber-50 p-3 rounded border border-amber-200">
            <h3 className="text-sm font-medium text-amber-800 mb-1">
              Special Considerations
            </h3>
            <ul className="text-sm text-amber-700 list-disc list-inside">
              {borrowerResume.content.bankruptcyHistory && (
                <li>Bankruptcy history in the past 7 years</li>
              )}
              {borrowerResume.content.foreclosureHistory && (
                <li>Foreclosure history in the past 7 years</li>
              )}
              {borrowerResume.content.litigationHistory && (
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
                          : borrowerResume?.content?.fullLegalName ||
                            "Borrower"}
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
    borrowerResume,
    handleSendMessage,
    generateFeedback,
    threads,
    activeThreadId,
    isLoadingMessages,
    isSending,
  ]);

  return (
    <RoleBasedRoute roles={["advisor", "admin"]}>
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
                {project?.name || "Project Details"}
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
                          bucketId={project.owner_entity_id}
                          folderPath={project.id}
                          title="Project-Specific Documents"
                          canUpload={true}
                          canDelete={true}
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
                          bucketId={project.owner_entity_id}
                          folderPath="borrower_docs"
                          title="General Borrower Documents"
                          canUpload={true}
                          canDelete={true}
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
