"use client";

import { Fragment, ReactNode, useCallback, useMemo, useState } from "react";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";
import { DropdownButton } from "@/components/ui/DropdownButton";

interface NotificationBellProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  isOpen: controlledOpen,
  onOpenChange,
}) => {
  const { isAuthenticated, user } = useAuth();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead,
    isNewSinceLastView,
    updateLastViewedAt
  } = useNotifications();
  const router = useRouter();

  // Generate preview from full content (truncates at word/mention boundaries when possible)
  const generatePreview = useCallback((content: string, maxLength: number = 200): string => {
    if (!content || content.length <= maxLength) {
      return content;
    }

    // Try to truncate after the last complete mention within the limit
    const mentionRegex = /@\[([^\]]+)\]\((doc|user):([^)]+)\)/g;
    const matches: Array<{ end: number }> = [];
    let match;
    
    while ((match = mentionRegex.exec(content)) !== null) {
      const endPos = match.index + match[0].length;
      if (endPos <= maxLength + 50) { // Give some buffer
        matches.push({ end: endPos });
      }
    }

    // If we found mentions near the limit, truncate after the last one
    if (matches.length > 0) {
      const lastMentionEnd = matches[matches.length - 1].end;
      if (lastMentionEnd <= maxLength + 50) {
        const truncated = content.substring(0, lastMentionEnd);
        return truncated.length < content.length ? truncated + "..." : truncated;
      }
    }

    // Otherwise, truncate at word boundary
    const truncated = content.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > maxLength * 0.8) { // Only use word boundary if it's not too early
      return truncated.substring(0, lastSpace) + "...";
    }
    
    return truncated + "...";
  }, []);

  const renderBoldLine = useCallback((line: string, keyPrefix: string) => {
    const segments: ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let segmentIndex = 0;

    while ((match = boldRegex.exec(line)) !== null) {
      const [fullMatch, boldText] = match;
      if (match.index > lastIndex) {
        const textPart = line.slice(lastIndex, match.index);
        if (textPart) {
          segments.push(
            <span key={`${keyPrefix}-text-${segmentIndex}`}>{textPart}</span>
          );
          segmentIndex++;
        }
      }

      segments.push(
        <strong key={`${keyPrefix}-bold-${segmentIndex}`} className="font-semibold text-gray-900">
          {boldText}
        </strong>
      );
      segmentIndex++;
      lastIndex = match.index + fullMatch.length;
    }

    const remaining = line.slice(lastIndex);
    if (remaining || segments.length === 0) {
      segments.push(
        <span key={`${keyPrefix}-text-tail`}>{remaining}</span>
      );
    }

    return segments;
  }, []);

  const renderNotificationContent = useCallback((content?: string, payload?: any) => {
    if (!content) {
      return null;
    }

    // Replace {{meeting_time}} placeholder with formatted timestamp from payload
    let processedContent = content;
    if (payload?.start_time && content.includes('{{meeting_time}}')) {
      const date = new Date(payload.start_time);
      const formattedTime = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      processedContent = content.replace(/\{\{meeting_time\}\}/g, formattedTime);
    }

    const mentionRegex = /@\[([^\]]+)\]\((doc|user):([^)]+)\)/g;
    const parts: ReactNode[] = [];
    let lastIndex = 0;

    const renderTextSegment = (text: string, key: string) => {
      const lines = text.split("\n");
      return (
        <span key={key} className="text-sm text-gray-600">
          {lines.map((line, idx) => (
            <Fragment key={`${key}-${idx}`}>
              {renderBoldLine(line, `${key}-${idx}`)}
              {idx < lines.length - 1 && <br />}
            </Fragment>
          ))}
        </span>
      );
    };

    // Use matchAll to find all mentions at once, avoiding regex state issues
    const matches = Array.from(processedContent.matchAll(mentionRegex));

    matches.forEach((match, matchIndex) => {
      const matchIndexPos = match.index ?? 0;
      
      if (matchIndexPos > lastIndex) {
        parts.push(renderTextSegment(processedContent.substring(lastIndex, matchIndexPos), `text-${lastIndex}`));
      }

      const name = match[1];
      const type = match[2];
      const id = match[3];

      if (type === "doc") {
        parts.push(
          <span
            key={`doc-${id}-${matchIndexPos}-${matchIndex}`}
            className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-xs font-medium border border-blue-200"
          >
            <span className="text-[11px] font-semibold">📄</span>
            <span className="truncate max-w-[12rem]">{name}</span>
          </span>
        );
      } else {
        parts.push(
          <span
            key={`user-${id}-${matchIndexPos}-${matchIndex}`}
            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-xs font-medium border border-indigo-200"
          >
            <span className="font-bold">@</span>
            <span className="truncate max-w-[12rem]">{name}</span>
          </span>
        );
      }

      lastIndex = matchIndexPos + match[0].length;
    });

    if (lastIndex < processedContent.length) {
      parts.push(renderTextSegment(processedContent.substring(lastIndex), `text-${lastIndex}`));
    }

    if (parts.length === 0) {
      return renderTextSegment(processedContent, "text-full");
    }

    return <span className="inline-flex flex-wrap gap-1">{parts}</span>;
  }, [renderBoldLine]);

  const handleDropdownOpenChange = useCallback((open: boolean) => {
    if (open) {
      // Mark all notifications as read when dropdown opens
      markAllAsRead();
      // Update the last viewed timestamp
      updateLastViewedAt();
    }
    onOpenChange?.(open);
  }, [markAllAsRead, onOpenChange, updateLastViewedAt]);

  const closeDropdown = useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleNotificationClick = useCallback(
    async (linkUrl: string | null) => {
      closeDropdown();
      if (linkUrl) {
        // Rewrite URL based on user role
        // If user is advisor and URL is for borrower workspace, redirect to advisor workspace
        let finalUrl = linkUrl;
        if (user?.role === "advisor" && linkUrl.startsWith("/project/workspace/")) {
          // Replace /project/workspace/ with /advisor/project/
          finalUrl = linkUrl.replace("/project/workspace/", "/advisor/project/");
        }
        router.push(finalUrl);
      }
    },
    [closeDropdown, router, user?.role]
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DropdownButton
      isOpen={controlledOpen}
      onOpenChange={handleDropdownOpenChange}
      trigger={
        <div className="inline-flex items-center justify-center h-8 w-8 bg-gray-100 text-gray-700 rounded-full border border-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      }
    >
      <div className="w-[26rem] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Notifications</p>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 flex flex-col items-center gap-2 text-center text-sm text-gray-500">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((notification) => {
                const isNew = isNewSinceLastView(notification);
                return (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleNotificationClick(notification.link_url)}
                      className="w-full text-left px-4 py-3 transition-colors bg-white hover:bg-gray-50"
                    >
                      <div className="flex gap-3">
                        <div className="pt-1 w-4 flex justify-center">
                          {isNew && (
                            <span className="relative flex h-2 w-2">
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400/50" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </p>
                            {isNew && (
                              <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                                NEW
                              </span>
                            )}
                          </div>
                          {notification.body && (
                            <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {renderNotificationContent(notification.body, notification.payload)}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DropdownButton>
  );
};

