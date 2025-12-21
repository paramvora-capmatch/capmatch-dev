// src/hooks/useUnreadCounts.ts
import { useChatStore } from '@/stores/useChatStore';

/**
 * Hook to access unread message counts (WhatsApp-style)
 *
 * Features:
 * - Get unread count for specific thread
 * - Get total unread count across all threads
 * - Check if thread has unread messages
 * - Access to loading state
 */
export function useUnreadCounts() {
  const threadUnreadCounts = useChatStore((state) => state.threadUnreadCounts);
  const totalUnreadCount = useChatStore((state) => state.totalUnreadCount);
  const isLoadingUnreadCounts = useChatStore((state) => state.isLoadingUnreadCounts);

  /**
   * Get unread count for a specific thread
   * @param threadId - The thread ID
   * @returns Number of unread messages (0 if none)
   */
  const getThreadUnreadCount = (threadId: string): number => {
    return threadUnreadCounts.get(threadId) || 0;
  };

  /**
   * Check if thread has any unread messages
   * @param threadId - The thread ID
   * @returns true if thread has unread messages
   */
  const hasUnreadMessages = (threadId: string): boolean => {
    return getThreadUnreadCount(threadId) > 0;
  };

  /**
   * Get total unread count across all threads in current project
   * @returns Total number of unread messages
   */
  const getTotalUnreadCount = (): number => {
    return totalUnreadCount;
  };

  /**
   * Format unread count for display (WhatsApp-style)
   * Shows "9+" for counts > 9
   * @param count - The unread count
   * @returns Formatted string (e.g., "3", "9+")
   */
  const formatUnreadCount = (count: number): string => {
    if (count === 0) return '0';
    if (count > 9) return '9+';
    return count.toString();
  };

  return {
    // State
    threadUnreadCounts,
    totalUnreadCount,
    isLoadingUnreadCounts,

    // Helper functions
    getThreadUnreadCount,
    hasUnreadMessages,
    getTotalUnreadCount,
    formatUnreadCount,
  };
}
