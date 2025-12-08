"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, Brain, Users } from "lucide-react";
import { cn } from "@/utils/cn";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { MeetInterface } from "@/components/chat/MeetInterface";
import { useChatStore } from "@/stores/useChatStore";
import { AIChatInterface } from "@/components/chat/AIChatInterface";
import { Message, FieldContext } from "@/types/ask-ai-types";

interface StickyChatCardProps {
  projectId?: string;
  onMentionClick?: (resourceId: string) => void;
  topOffsetClassName?: string; // e.g., "top-24"
  widthClassName?: string; // e.g., "w-[420px]"
  // AskAI presentation-only inputs (logic centralized in parent)
  messages?: Message[];
  fieldContext?: FieldContext | null;
  isLoading?: boolean;
  isBuildingContext?: boolean;
  contextError?: string | null;
  hasActiveContext?: boolean;
  externalActiveTab?: 'team' | 'ai' | 'meet';
  externalShouldExpand?: boolean; // When true, expands the chat if collapsed
  hideTeamTab?: boolean; // When true, hides team tab and shows only AI chat
  onAIReplyClick?: (message: Message) => void; // Callback for AI chat reply clicks
}

export const StickyChatCard: React.FC<StickyChatCardProps> = ({
  projectId,
  onMentionClick,
  topOffsetClassName = "top-24",
  widthClassName = "w-[420px]",
  messages = [],
  fieldContext = null,
  isLoading = false,
  isBuildingContext = false,
  contextError = null,
  hasActiveContext = false,
  externalActiveTab,
  externalShouldExpand,
  hideTeamTab = false,
  onAIReplyClick,
}) => {
  const [rightTab, setRightTab] = useState<"team" | "ai" | "meet">(hideTeamTab ? "ai" : "team");
  const [isChatCollapsed, setIsChatCollapsed] = useState<boolean>(() => {
    try {
      return JSON.parse(
        typeof window !== "undefined"
          ? localStorage.getItem(`chatCollapsed:${projectId}`) || "false"
          : "false"
      );
    } catch {
      return false;
    }
  });
  const [isChatHovered, setIsChatHovered] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        `chatCollapsed:${projectId}`,
        JSON.stringify(isChatCollapsed)
      );
    } catch {}
  }, [isChatCollapsed, projectId]);

  // Allow parent to control visible tab (e.g., switch to AI on Ask AI click)
  useEffect(() => {
    if (externalActiveTab) {
      setRightTab(externalActiveTab);
    }
  }, [externalActiveTab]); // Sync to external control whenever it changes

  // Allow parent to expand chat (e.g., when Ask AI is clicked)
  useEffect(() => {
    if (externalShouldExpand && isChatCollapsed) {
      setIsChatCollapsed(false);
    }
  }, [externalShouldExpand, isChatCollapsed]);

  // Placeholder counts
  const threadCount = useChatStore((s) => s.threads.length);
  const unreadCount = 3; // TODO: replace with real unread count when available

  const askAiEnabled = true; // presentation only; parent governs availability

  // Determine width based on state
  const getChatWidth = () => {
    if (isChatCollapsed) {
      return "w-14";
    }
    // For team tab: smaller when not hovered, larger when hovered
    if (!hideTeamTab && rightTab === "team") {
      if (isChatHovered) {
        // Expanded: width + channel selector, but capped at 50% max
        return "!w-[min(calc(35%+12rem),50%)] md:!w-[min(calc(40%+12rem),50%)] xl:!w-[min(calc(45%+12rem),50%)]";
      } else {
        // Collapsed: 35% width consistently
        return "w-[35%]";
      }
    }
    // For meet tab: also use hover-based width
    if (rightTab === "meet") {
      if (isChatHovered) {
        // Expanded: wider when hovered, capped at 50% max
        return "!w-[min(45%,50%)] md:!w-[min(50%,50%)] xl:!w-[min(55%,50%)] max-w-[700px]";
      } else {
        // Collapsed: 35% width consistently
        return "w-[35%]";
      }
    }
    // For AI tab: also use hover-based width
    if (rightTab === "ai" || hideTeamTab) {
      // Use the provided widthClassName or fallback to a consistent width
      return widthClassName || "w-[45%] md:w-[50%] xl:w-[55%] max-w-[700px]";
    }
    // Fallback: use provided width
    return widthClassName;
  };

  return (
    <aside
      className={cn(
        "pl-3 sm:pl-4 mr-3 sm:mr-4 lg:mr-6 transition-[width] duration-300 ease-in-out pt-4",
        getChatWidth()
      )}
      onMouseEnter={() => setIsChatHovered(true)}
      onMouseLeave={() => setIsChatHovered(false)}
    >
      <div className={cn("sticky", topOffsetClassName)}>
        {isChatCollapsed ? (
          <button
            aria-label={`Open chat${unreadCount ? ` — ${Math.min(unreadCount, 99)} unread` : ""}${threadCount ? `, ${threadCount} channels` : ""}`}
            onClick={() => setIsChatCollapsed(false)}
            className="h-[calc(100vh-8rem)] w-14 rounded-2xl shadow-lg border border-gray-200 bg-white/70 hover:bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center gap-2 relative transition-colors"
            title={`Open chat${unreadCount ? ` — ${Math.min(unreadCount, 99)} unread` : ""}${threadCount ? `, ${threadCount} channels` : ""}`}
          >
            <div className="relative">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-gray-600">
              <span className="font-mono">#</span>
              <span>{threadCount}</span>
            </span>
          </button>
        ) : (
          <div className="flex flex-col h-[calc(100vh-8rem)] rounded-2xl shadow-lg overflow-hidden border border-gray-200 bg-white/70 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-gray-200/70 bg-white/60 px-2 py-1">
              {!hideTeamTab ? (
                <div className="flex flex-1 bg-gradient-to-r from-gray-100 to-gray-50 p-1 rounded-lg shadow-inner">
                  <button
                    onClick={() => setRightTab("team")}
                    className={cn(
                      "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300",
                      rightTab === "team"
                        ? "bg-gradient-to-r from-white to-gray-50 text-blue-600 shadow-sm border border-blue-200/50"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02]"
                    )}
                    aria-pressed={rightTab === "team"}
                  >
                    <MessageSquare size={16} className={cn("transition-transform duration-300", rightTab === "team" ? "scale-110" : "")} />
                    <span>Team Chat</span>
                  </button>
                  <button
                    onClick={() => setRightTab("meet")}
                    className={cn(
                      "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300",
                      rightTab === "meet"
                        ? "bg-gradient-to-r from-white to-gray-50 text-blue-600 shadow-sm border border-blue-200/50"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02]"
                    )}
                    aria-pressed={rightTab === "meet"}
                  >
                    <Users size={16} className={cn("transition-transform duration-300", rightTab === "meet" ? "scale-110" : "")} />
                    <span>Meet</span>
                  </button>
                  <button
                    onClick={() => setRightTab("ai")}
                    className={cn(
                      "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300",
                      rightTab === "ai"
                        ? "bg-gradient-to-r from-white to-gray-50 text-blue-600 shadow-sm border border-blue-200/50"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.02]"
                    )}
                    aria-pressed={rightTab === "ai"}
                  >
                    <Brain size={16} className={cn("transition-transform duration-300", rightTab === "ai" ? "scale-110" : "")} />
                    <span>AI Chat</span>
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <Brain size={16} className="text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">AI Chat</span>
                  </div>
                </div>
              )}
              <button
                type="button"
                aria-label="Collapse chat"
                aria-expanded={!isChatCollapsed}
                onClick={() => setIsChatCollapsed(true)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                title="Collapse chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" className="rotate-180">
                  <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
            </div>

            <div className="flex-1 p-0 min-h-0 overflow-hidden bg-transparent">
              {!hideTeamTab && rightTab === "team" ? (
                <ChatInterface
                  embedded
                  projectId={projectId || ""}
                  onMentionClick={onMentionClick}
                  isHovered={isChatHovered}
                />
              ) : rightTab === "meet" ? (
                <MeetInterface
                  embedded
                  projectId={projectId || ""}
                />
              ) : (
                <div className="h-full bg-transparent py-4">
                  {askAiEnabled ? (
                    <AIChatInterface
                      messages={messages}
                      fieldContext={fieldContext}
                      isLoading={isLoading}
                      isBuildingContext={isBuildingContext}
                      contextError={contextError}
                      hasActiveContext={hasActiveContext}
                      onReplyClick={onAIReplyClick}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-500 text-sm">
                        Connect this chat to a form to enable Ask AI.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};


