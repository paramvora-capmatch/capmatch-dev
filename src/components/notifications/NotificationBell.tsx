"use client";

import { Fragment, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/utils/cn";

export const NotificationBell = () => {
  const { isAuthenticated } = useAuth();
  const { notifications, unreadCount, isLoading, markAsRead } = useNotifications();
  const router = useRouter();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [activeTab, setActiveTab] = useState<"unread" | "read">("unread");

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read_at),
    [notifications]
  );
  const readNotifications = useMemo(
    () => notifications.filter((notification) => notification.read_at),
    [notifications]
  );

  const activeNotifications = activeTab === "unread" ? unreadNotifications : readNotifications;

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

  const renderNotificationContent = useCallback((content?: string) => {
    if (!content) {
      return null;
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
    const matches = Array.from(content.matchAll(mentionRegex));

    matches.forEach((match, matchIndex) => {
      const matchIndexPos = match.index ?? 0;
      
      if (matchIndexPos > lastIndex) {
        parts.push(renderTextSegment(content.substring(lastIndex, matchIndexPos), `text-${lastIndex}`));
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

    if (lastIndex < content.length) {
      parts.push(renderTextSegment(content.substring(lastIndex), `text-${lastIndex}`));
    }

    if (parts.length === 0) {
      return renderTextSegment(content, "text-full");
    }

    return <span className="inline-flex flex-wrap gap-1">{parts}</span>;
  }, [renderBoldLine]);

  const closeDropdown = useCallback(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const detailsEl = detailsRef.current;
      if (!detailsEl || !detailsEl.open) {
        return;
      }
      if (event.target instanceof Node && !detailsEl.contains(event.target)) {
        detailsEl.open = false;
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleNotificationClick = useCallback(
    async (notificationId: number, linkUrl: string | null) => {
      await markAsRead(notificationId);
      closeDropdown();
      if (linkUrl) {
        router.push(linkUrl);
      }
    },
    [closeDropdown, markAsRead, router]
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative">
      <details ref={detailsRef} className="group">
        <summary className="list-none cursor-pointer inline-flex items-center justify-center h-8 w-8 bg-gray-100 text-gray-700 rounded-full border border-gray-300 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </summary>
        <div className="absolute right-0 mt-2 w-[26rem] bg-white border border-gray-200 rounded-md shadow-lg z-20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Notifications</p>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          <div className="px-4 py-3 border-b border-gray-100 bg-white/60">
            <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 p-1 rounded-lg shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab("unread")}
                className={cn(
                  "flex-1 rounded-md text-sm font-medium px-3 py-2 transition-all duration-300",
                  activeTab === "unread"
                    ? "bg-gradient-to-r from-white to-gray-50 text-blue-600 shadow-sm border border-blue-200/50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.01]"
                )}
                aria-pressed={activeTab === "unread"}
              >
                Unread ({unreadNotifications.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("read")}
                className={cn(
                  "flex-1 rounded-md text-sm font-medium px-3 py-2 transition-all duration-300",
                  activeTab === "read"
                    ? "bg-gradient-to-r from-white to-gray-50 text-blue-600 shadow-sm border border-blue-200/50"
                    : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-[1.01]"
                )}
                aria-pressed={activeTab === "read"}
              >
                Read ({readNotifications.length})
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {activeNotifications.length === 0 ? (
              <div className="px-4 py-6 flex flex-col items-center gap-2 text-center text-sm text-gray-500">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                <p>
                  {activeTab === "unread"
                    ? "No unread notifications."
                    : readNotifications.length === 0
                      ? "You haven't read any notifications yet."
                      : "No read notifications to show."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {activeNotifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() =>
                        handleNotificationClick(notification.id, notification.link_url)
                      }
                      className="w-full text-left px-4 py-3 transition-colors bg-white hover:bg-gray-50"
                    >
                      <div className="flex gap-3">
                        <div className="pt-1 w-4 flex justify-center">
                          {!notification.read_at && (
                            <span className="relative flex h-2.5 w-2.5">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75 animate-ping" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={cn("text-sm font-semibold", notification.read_at ? "text-gray-800" : "text-gray-900")}>
                            {notification.title}
                          </p>
                          {notification.body && (
                            <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {renderNotificationContent(notification.body)}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </details>
    </div>
  );
};

