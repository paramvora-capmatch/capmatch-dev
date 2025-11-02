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
import { cn } from "@/utils/cn";

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
  const [documentRequirements, setDocumentRequirements] = useState<
    ProjectDocumentRequirement[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [newMessage, setNewMessage] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<ProjectStatus>("Info Gathering");
  const [activeTab, setActiveTab] = useState<"project" | "borrower">("project");
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

        // 5. Fetch document requirements
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

    const formatValue = (value: any, formatter?: (val: any) => string): string => {
      if (value === null || value === undefined || value === "") {
        return "Not provided";
      }
      return formatter ? formatter(value) : String(value);
    };

    const formatDateValue = (dateString: string | null | undefined): string => {
      if (!dateString) return "Not provided";
      return formatDate(dateString);
    };

    const formatPercent = (value: number | null | undefined): string => {
      if (value === null || value === undefined) return "Not provided";
      return `${value}%`;
    };

    return (
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Project Name
            </h3>
            <p className="text-sm text-gray-800 font-medium">{project.projectName}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Owner Organization
            </h3>
            <p className={`text-sm ${ownerOrgName ? "text-gray-800 font-medium" : "text-gray-400 italic"}`}>
              {ownerOrgName || "Not provided"}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Property Address
            </h3>
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                {project.propertyAddressStreet ? (
                  <p className="text-sm text-gray-800">
                    {[
                      project.propertyAddressStreet,
                      project.propertyAddressCity,
                      project.propertyAddressState,
                      project.propertyAddressZip,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Not provided</p>
                )}
                {project.propertyAddressCounty && (
                  <p className="text-xs text-gray-600 mt-1">
                    County: {project.propertyAddressCounty}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Asset Type
            </h3>
            <p className={`text-sm ${project.assetType ? "text-gray-800" : "text-gray-400 italic"}`}>
              {formatValue(project.assetType)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Project Phase
            </h3>
            <p className={`text-sm ${project.projectPhase ? "text-gray-800" : "text-gray-400 italic"}`}>
              {formatValue(project.projectPhase)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Project Description
            </h3>
            <p className={`text-sm ${project.projectDescription ? "text-gray-800" : "text-gray-400 italic"}`}>
              {formatValue(project.projectDescription)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Target Close Date
            </h3>
            <p className={`text-sm ${project.targetCloseDate ? "text-gray-800" : "text-gray-400 italic"}`}>
              {formatDateValue(project.targetCloseDate)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Use of Proceeds
            </h3>
            <p className={`text-sm ${project.useOfProceeds ? "text-gray-800" : "text-gray-400 italic"}`}>
              {formatValue(project.useOfProceeds)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Recourse Preference
            </h3>
            <p className={`text-sm ${project.recoursePreference ? "text-gray-800" : "text-gray-400 italic"}`}>
              {formatValue(project.recoursePreference)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Exit Strategy
            </h3>
            <p className={`text-sm ${project.exitStrategy ? "text-gray-800" : "text-gray-400 italic"}`}>
              {formatValue(project.exitStrategy)}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Loan Information
            </h3>
            <div className="flex items-start">
              <DollarSign className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Amount Requested:</span>{" "}
                  <span className={project.loanAmountRequested ? "" : "text-gray-400 italic"}>
                    {project.loanAmountRequested
                      ? formatCurrency(project.loanAmountRequested)
                      : "Not provided"}
                  </span>
                </p>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Loan Type:</span>{" "}
                  <span className={project.loanType ? "" : "text-gray-400 italic"}>
                    {formatValue(project.loanType)}
                  </span>
                </p>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Target LTV:</span>{" "}
                  <span className={project.targetLtvPercent ? "" : "text-gray-400 italic"}>
                    {formatPercent(project.targetLtvPercent)}
                  </span>
                </p>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Target LTC:</span>{" "}
                  <span className={project.targetLtcPercent ? "" : "text-gray-400 italic"}>
                    {formatPercent(project.targetLtcPercent)}
                  </span>
                </p>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Amortization Years:</span>{" "}
                  <span className={project.amortizationYears ? "" : "text-gray-400 italic"}>
                    {formatValue(project.amortizationYears)}
                  </span>
                </p>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Interest Only Period:</span>{" "}
                  <span className={project.interestOnlyPeriodMonths ? "" : "text-gray-400 italic"}>
                    {project.interestOnlyPeriodMonths
                      ? `${project.interestOnlyPeriodMonths} months`
                      : "Not provided"}
                  </span>
                </p>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">Interest Rate Type:</span>{" "}
                  <span className={project.interestRateType ? "" : "text-gray-400 italic"}>
                    {formatValue(project.interestRateType)}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Capital Stack
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-800">
                <span className="font-medium">Purchase Price:</span>{" "}
                <span className={project.purchasePrice ? "" : "text-gray-400 italic"}>
                  {project.purchasePrice
                    ? formatCurrency(project.purchasePrice)
                    : "Not provided"}
                </span>
              </p>
              <p className="text-sm text-gray-800">
                <span className="font-medium">Total Project Cost:</span>{" "}
                <span className={project.totalProjectCost ? "" : "text-gray-400 italic"}>
                  {project.totalProjectCost
                    ? formatCurrency(project.totalProjectCost)
                    : "Not provided"}
                </span>
              </p>
              <p className="text-sm text-gray-800">
                <span className="font-medium">CAPEX Budget:</span>{" "}
                <span className={project.capexBudget ? "" : "text-gray-400 italic"}>
                  {project.capexBudget ? formatCurrency(project.capexBudget) : "Not provided"}
                </span>
              </p>
              <p className="text-sm text-gray-800">
                <span className="font-medium">Equity Committed:</span>{" "}
                <span className={project.equityCommittedPercent ? "" : "text-gray-400 italic"}>
                  {formatPercent(project.equityCommittedPercent)}
                </span>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              NOI Information
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-800">
                <span className="font-medium">Property NOI (T12):</span>{" "}
                <span className={project.propertyNoiT12 ? "" : "text-gray-400 italic"}>
                  {project.propertyNoiT12
                    ? formatCurrency(project.propertyNoiT12)
                    : "Not provided"}
                </span>
              </p>
              <p className="text-sm text-gray-800">
                <span className="font-medium">Stabilized NOI (Projected):</span>{" "}
                <span className={project.stabilizedNoiProjected ? "" : "text-gray-400 italic"}>
                  {project.stabilizedNoiProjected
                    ? formatCurrency(project.stabilizedNoiProjected)
                    : "Not provided"}
                </span>
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Business Plan Summary
            </h3>
            <p className={`text-sm ${project.businessPlanSummary ? "text-gray-800" : "text-gray-400 italic"}`}>
              {formatValue(project.businessPlanSummary)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Market Overview Summary
            </h3>
            <p className={`text-sm ${project.marketOverviewSummary ? "text-gray-800" : "text-gray-400 italic"}`}>
              {formatValue(project.marketOverviewSummary)}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">
              Project Dates
            </h3>
            <div className="flex items-start">
              <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
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
  }, [project, ownerOrgName]);

  const renderDocumentRequirements = useCallback(() => {
    return (
      <div>
        {documentRequirements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Document Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {documentRequirements.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
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
          <div className="text-center py-12">
            <p className="text-gray-500">No document requirements</p>
          </div>
        )}
      </div>
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
      <div className="flex flex-col h-screen bg-gray-50">
        <LoadingOverlay isLoading={isLoadingData} />

        {/* Header */}
        <header className="bg-white shadow-sm py-4 px-6 flex items-center flex-shrink-0">
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

        {/* Main content with flex layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Scrollable content with tabs */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex-shrink-0 border-b bg-white">
              <div className="flex">
                <button
                  onClick={() => setActiveTab("project")}
                  className={cn(
                    "flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors",
                    activeTab === "project"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <FileText size={16} />
                  <span>Project Info</span>
                </button>
                <button
                  onClick={() => setActiveTab("borrower")}
                  className={cn(
                    "flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium transition-colors",
                    activeTab === "borrower"
                      ? "border-b-2 border-blue-600 text-blue-600"
                      : "text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <User size={16} />
                  <span>Borrower Info</span>
                </button>
              </div>
            </div>

            {/* Tab Content with Grid Background */}
            <div className="flex-1 overflow-y-auto relative">
              {/* Grid Background */}
              <div className="pointer-events-none absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(ellipse_100%_80%_at_50%_30%,black,transparent_70%)]">
                <svg className="absolute inset-0 h-full w-full text-blue-500" aria-hidden="true">
                  <defs>
                    <pattern id="advisor-grid-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
                      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#advisor-grid-pattern)" />
                </svg>
              </div>

              {/* Blue Blob */}
              <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
                <div className="h-64 w-[84rem] -translate-y-48 rounded-full bg-blue-400/40 blur-[90px]" />
              </div>

              {/* Content with padding */}
              <div className="relative z-[1] p-6">
                {activeTab === "project" && (
                  <div className="space-y-6">
                    {/* Project Details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-6 sm:p-8">
                        <div className="flex flex-row justify-between items-start mb-6">
                          <h2 className="text-xl font-bold text-gray-800 flex items-center">
                            <FileText className="h-5 w-5 mr-2 text-blue-600" />
                            Project Details
                          </h2>
                        </div>
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Project Status
                          </label>
                          <SingleSelectChips
                            options={[
                              "Info Gathering",
                              "Advisor Review",
                              "Matches Curated",
                              "Introductions Sent",
                              "Term Sheet Received",
                              "Closed",
                              "Withdrawn",
                              "Stalled",
                            ]}
                            value={selectedStatus}
                            onChange={(value) =>
                              handleStatusChange(value as ProjectStatus)
                            }
                            size="sm"
                            layout="row"
                            className="w-full"
                          />
                        </div>
                        <div className="border-t border-gray-100 pt-6">
                          {renderProjectDetails()}
                        </div>
                      </div>
                    </div>

                    {/* Document Requirements */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-6 sm:p-8">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center mb-6">
                          <FileText className="h-5 w-5 mr-2 text-blue-600" />
                          Document Requirements
                        </h2>
                        {renderDocumentRequirements()}
                      </div>
                    </div>

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
                  </div>
                )}

                {activeTab === "borrower" && (
                  <div className="space-y-6">
                    {/* Borrower Details */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-6 sm:p-8">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center mb-6">
                          <User className="h-5 w-5 mr-2 text-blue-600" />
                          Borrower Details
                        </h2>
                        {renderBorrowerDetails()}
                      </div>
                    </div>

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
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Fixed Chat */}
          <div className="w-1/3 bg-white flex flex-col h-full rounded-l-2xl shadow-xl overflow-hidden relative z-10 -ml-4">
            <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50 px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                Project Message Board
              </h2>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {renderMessageBoard()}
            </div>
          </div>
        </div>
      </div>
    </RoleBasedRoute>
  );
}
