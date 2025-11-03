"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Brain } from "lucide-react";
import { cn } from "@/utils/cn";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { useChatStore } from "@/stores/useChatStore";

interface StickyChatCardProps {
  projectId: string;
  onMentionClick?: (resourceId: string) => void;
  topOffsetClassName?: string; // e.g., "top-24"
  widthClassName?: string; // e.g., "w-[420px]"
}

export const StickyChatCard: React.FC<StickyChatCardProps> = ({
  projectId,
  onMentionClick,
  topOffsetClassName = "top-24",
  widthClassName = "w-[420px]",
}) => {
  const [rightTab, setRightTab] = useState<"team" | "ai">("team");
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

  useEffect(() => {
    try {
      localStorage.setItem(
        `chatCollapsed:${projectId}`,
        JSON.stringify(isChatCollapsed)
      );
    } catch {}
  }, [isChatCollapsed, projectId]);

  // Placeholder counts
  const threadCount = useChatStore((s) => s.threads.length);
  const unreadCount = 3; // TODO: replace with real unread count when available

  return (
    <aside
      className={cn(
        "pl-3 sm:pl-4 mr-3 sm:mr-4 lg:mr-6 transition-[width] duration-200 ease-out",
        isChatCollapsed ? "w-14" : widthClassName
      )}
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
            <div className="flex items-center justify-between border-b border-gray-200/70 bg-white/60 px-2">
              <div className="flex flex-1">
                <button
                  onClick={() => setRightTab("team")}
                  className={cn(
                    "flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors",
                    rightTab === "team" ? "text-blue-600" : "text-gray-600 hover:text-blue-600"
                  )}
                  aria-pressed={rightTab === "team"}
                >
                  <MessageSquare size={16} />
                  <span>Team Chat</span>
                </button>
                <button
                  onClick={() => setRightTab("ai")}
                  className={cn(
                    "flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors",
                    rightTab === "ai" ? "text-blue-600" : "text-gray-600 hover:text-blue-600"
                  )}
                  aria-pressed={rightTab === "ai"}
                >
                  <Brain size={16} />
                  <span>AI Chat</span>
                </button>
              </div>
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
              {rightTab === "team" ? (
                <ChatInterface
                  embedded
                  projectId={projectId}
                  onMentionClick={onMentionClick}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-transparent">
                  <div className="text-center text-gray-500 text-sm">
                    AI Chat will appear here.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};


