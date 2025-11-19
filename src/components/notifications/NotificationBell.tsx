"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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

  const closeDropdown = useCallback(() => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
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
                      ? "You haven&apos;t read any notifications yet."
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
                      className={cn(
                        "w-full text-left px-4 py-3 transition-colors",
                        notification.read_at
                          ? "bg-white hover:bg-gray-50"
                          : "bg-blue-50/70 hover:bg-blue-100"
                      )}
                    >
                      <p className={cn("text-sm font-semibold", notification.read_at ? "text-gray-800" : "text-blue-900")}>
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.body}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
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

