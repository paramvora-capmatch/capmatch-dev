'use client';

import { Fragment, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Notification } from '@/contexts/ToastContext';
import { useAuth } from '@/hooks/useAuth';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  onNavigate: () => void;
  duration?: number; // in milliseconds
}

const TOAST_DURATION = 10000; // 10 seconds

export function NotificationToast({
  notification,
  onDismiss,
  onNavigate,
  duration = TOAST_DURATION,
}: NotificationToastProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const remainingTimeRef = useRef<number>(duration);

  // Cleanup timer on unmount
  useEffect(() => {
    let animationFrame: number;
    let lastTimestamp = Date.now();

    const updateProgress = () => {
      if (!isPaused) {
        const now = Date.now();
        const elapsed = now - lastTimestamp;

        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
        const newProgress = (remainingTimeRef.current / duration) * 100;
        setProgress(newProgress);

        if (remainingTimeRef.current <= 0) {
          onDismiss();
          return;
        }
      }

      lastTimestamp = Date.now();
      animationFrame = requestAnimationFrame(updateProgress);
    };

    animationFrame = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPaused, duration, onDismiss]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    pausedAtRef.current = Date.now();
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    pausedAtRef.current = null;
  };

  const handleClick = () => {
    if (notification.link_url) {
      // Role-based URL rewriting (same as NotificationBell)
      let finalUrl = notification.link_url;
      if (user?.role === 'advisor' && notification.link_url.startsWith('/project/workspace/')) {
        finalUrl = notification.link_url.replace('/project/workspace/', '/advisor/project/');
      }
      router.push(finalUrl);
      onNavigate();
    }
    onDismiss();
  };

  // Reuse content rendering logic from NotificationBell
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

  // Determine if notification is "new" (unread or created recently)
  // Toast notifications are always new since they only appear for newly received notifications via realtime
  const isNew = useMemo(() => {
    // Check if explicitly unread (null, undefined, or empty string)
    const readAt = notification.read_at;
    if (readAt === null || readAt === undefined || readAt === '') {
      return true;
    }
    // Fallback: check if created in the last 60 seconds (toasts only appear for new notifications)
    try {
      const created = new Date(notification.created_at).getTime();
      const now = Date.now();
      return now - created < 60000; // 60 seconds
    } catch {
      // If date parsing fails or notification is very recent, assume it's new
      return true;
    }
  }, [notification.read_at, notification.created_at]);

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
      const lines = text.split('\n');
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

    // Use matchAll to find all mentions at once
    const matches = Array.from(processedContent.matchAll(mentionRegex));

    matches.forEach((match, matchIndex) => {
      const matchIndexPos = match.index ?? 0;

      if (matchIndexPos > lastIndex) {
        parts.push(renderTextSegment(processedContent.substring(lastIndex, matchIndexPos), `text-${lastIndex}`));
      }

      const name = match[1];
      const type = match[2];
      const id = match[3];

      if (type === 'doc') {
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
      return renderTextSegment(processedContent, 'text-full');
    }

    return <span className="inline-flex flex-wrap gap-1">{parts}</span>;
  }, [renderBoldLine]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative w-96 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
      role="status"
      aria-live="polite"
    >
      {/* Content area */}
      <button
        onClick={handleClick}
        className="w-full text-left p-4 pr-10 hover:bg-gray-50 transition-colors"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">
              {notification.title}
            </p>
            {isNew && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider shrink-0 shadow-sm">
                NEW
              </span>
            )}
          </div>
          {notification.body && (
            <div className="text-sm text-gray-600 line-clamp-2">
              {renderNotificationContent(notification.body, notification.payload)}
            </div>
          )}
          <p className="text-xs text-gray-400">
            {new Date(notification.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </p>
        </div>
      </button>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
        <motion.div
          className="h-full bg-blue-500"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}
