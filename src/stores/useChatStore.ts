import { create } from "zustand";
import { supabase } from "../../lib/supabaseClient";
import { apiClient } from "@/lib/apiClient";
import { fetchProfilesMap } from "@/lib/profile-utils";
import { formatStoreError } from "@/utils/errorUtils";
import { isValidUuid } from "@/lib/isUuid";
import {
  CHAT_DELIVERED_STATUS_DURATION_MS,
  CHAT_DELIVERED_STATUS_FADE_LEAD_MS,
  CHAT_DEDUP_BY_CONTENT_WINDOW_MS,
  CHAT_OPTIMISTIC_MATCH_WINDOW_MS,
  CHAT_RECONNECT_BASE_DELAY_MS,
  CHAT_RECONNECT_MAX_DELAY_MS,
} from "@/config/constants";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useChatUnreadStore } from "./useChatUnreadStore";
import { useChatRealtimeStore } from "./useChatRealtimeStore";

/** Cleared on unsubscribe so reconnection does not run after unmount */
let messageReconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

interface ChatThread {
  id: string;
  project_id: string;
  topic?: string;
  resource_id?: string;
  status?: 'active' | 'resolved';
  stage?: string;
  created_at: string;
}

interface ChatParticipant {
  thread_id: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    full_name?: string | null;
    email?: string | null;
  };
}

interface ProjectMessage {
  id: number | string; // Allow string for optimistic messages (temp IDs)
  thread_id: string;
  user_id: string;
  content?: string;
  created_at: string;
  reply_to?: number | null; // ID of the message this is replying to
  image_urls?: string[] | null; // Storage paths in org bucket (chat-images folder)
  client_request_id?: string | null; // Idempotency key for dedup and matching optimistic messages
  status?: 'sending' | 'delivered' | 'failed'; // iMessage-style status (no "sent" state)
  isOptimistic?: boolean; // Flag for optimistic messages
  isFadingOut?: boolean; // Flag for smooth fade-out animation
  sender?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  repliedMessage?: ProjectMessage | null; // The message being replied to (populated on load)
}

interface MessageAttachment {
  id: number;
  message_id: number;
  document_path: string;
  created_at: string;
}

export interface AttachableDocument {
  resourceId: string;
  name: string;
  scope: "project" | "org";
}

interface ChatState {
  // Current thread context
  activeThreadId: string | null;
  threads: ChatThread[];
  participants: ChatParticipant[];
  messages: ProjectMessage[];
  attachments: MessageAttachment[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Realtime
  messageChannel: RealtimeChannel | null;
  membershipChannel: RealtimeChannel | null;
  projectUnreadChannel: RealtimeChannel | null; // For monitoring unread counts across all threads

  // Safe attachment UX
  attachableDocuments: AttachableDocument[];
  isLoadingAttachable: boolean;

  // Message cache per thread (prevents reloads when switching tabs)
  messageCache: Map<string, ProjectMessage[]>;

  // Unread counts (WhatsApp-style)
  threadUnreadCounts: Map<string, number>; // threadId -> unread count
  totalUnreadCount: number; // aggregate across all threads in current project
  isLoadingUnreadCounts: boolean;
}

interface ChatActions {
  // Thread management
  loadThreadsForProject: (projectId: string) => Promise<void>;
  createThread: (projectId: string, topic?: string, participantIds?: string[], stage?: string) => Promise<string>;
  setActiveThread: (threadId: string | null) => void;
  resolveThread: (threadId: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;

  // Participants
  addParticipant: (threadId: string, userIds: string[]) => Promise<void>;
  removeParticipant: (threadId: string, userIds: string) => Promise<void>;
  loadParticipants: (threadId: string) => Promise<void>;

  // Messages
  loadMessages: (threadId: string) => Promise<void>;
  sendMessage: (threadId: string, content: string, replyTo?: number | null, clientContext?: any, imageUrls?: string[], clientRequestId?: string) => Promise<void>;
  subscribeToMessages: (threadId: string) => void;
  unsubscribeFromMessages: () => void;
  subscribeToMembershipChanges: (projectId: string) => Promise<void>;
  unsubscribeFromMembershipChanges: () => void;
  subscribeToProjectUnreadCounts: (projectId: string) => Promise<void>;
  unsubscribeFromProjectUnreadCounts: () => void;

  // Attachments
  loadAttachments: (messageId: number) => Promise<void>;
  attachDocument: (messageId: number, documentPath: string) => Promise<void>;
  loadAttachableDocuments: (threadId: string) => Promise<void>;

  // Unread counts (WhatsApp-style)
  loadUnreadCounts: (projectId: string, userId: string) => Promise<void>;
  updateThreadUnreadCount: (threadId: string, count: number) => void;
  incrementUnreadCount: (threadId: string) => void;
  resetThreadUnreadCount: (threadId: string) => void;

  // Utility
  markThreadRead: (threadId: string) => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

// Track timeouts for clearing "Delivered" status (iMessage-style ephemeral status)
const statusTimeouts = new Map<string | number, NodeJS.Timeout>();
const fadeOutTimeouts = new Map<string | number, NodeJS.Timeout>();

export const useChatStore = create<ChatState & ChatActions>((set, get) => {
  // Helper function to clear "Delivered" status after timeout with smooth fade-out (iMessage-style)
  const clearDeliveredStatusAfterTimeout = (messageId: string | number, delayMs: number = CHAT_DELIVERED_STATUS_DURATION_MS) => {
    // Clear any existing timeouts for this message
    const existingTimeout = statusTimeouts.get(messageId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      statusTimeouts.delete(messageId);
    }
    const existingFadeTimeout = fadeOutTimeouts.get(messageId);
    if (existingFadeTimeout) {
      clearTimeout(existingFadeTimeout);
      fadeOutTimeouts.delete(messageId);
    }

    // Start fade-out animation before clearing (smooth transition)
    const fadeOutTimeout = setTimeout(() => {
      const currentState = get();
      set({
        messages: currentState.messages.map((msg) =>
          msg.id === messageId && msg.status === 'delivered'
            ? { ...msg, isFadingOut: true }
            : msg
        ),
      });
      fadeOutTimeouts.delete(messageId);
    }, delayMs - CHAT_DELIVERED_STATUS_FADE_LEAD_MS); // Start fade before clearing

    fadeOutTimeouts.set(messageId, fadeOutTimeout);

    // Clear status after full delay
    const statusClearTimeout = setTimeout(() => {
      const currentState = get();
      set({
        messages: currentState.messages.map((msg) =>
          msg.id === messageId && msg.status === 'delivered'
            ? { ...msg, status: undefined, isFadingOut: false }
            : msg
        ),
      });
      statusTimeouts.delete(messageId);
    }, delayMs);

    statusTimeouts.set(messageId, statusClearTimeout);
  };

  return {
    // State
    activeThreadId: null,
    threads: [],
    participants: [],
    messages: [],
    attachments: [],
    isLoading: false,
    error: null,
    messageChannel: null,
    membershipChannel: null,
    projectUnreadChannel: null,
    attachableDocuments: [],
    isLoadingAttachable: false,
    messageCache: new Map<string, ProjectMessage[]>(),
    threadUnreadCounts: useChatUnreadStore.getState().threadUnreadCounts,
    totalUnreadCount: useChatUnreadStore.getState().totalUnreadCount,
    isLoadingUnreadCounts: useChatUnreadStore.getState().isLoadingUnreadCounts,

    // Actions
    loadThreadsForProject: async (projectId: string) => {
      if (!isValidUuid(projectId)) {
        set({ threads: [], isLoading: false });
        return;
      }
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await supabase
          .from('chat_threads')
          .select('id, project_id, topic, status, stage, resource_id, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        set({ threads: data || [], isLoading: false });

        // Load unread counts for this project
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await get().loadUnreadCounts(projectId, user.id);
        }
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to load threads',
          isLoading: false
        });
      }
    },

    createThread: async (projectId: string, topic?: string, participantIds?: string[], stage?: string) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await apiClient.manageChatThread({
          action: 'create',
          project_id: projectId,
          topic,
          participant_ids: participantIds,
          ...(stage != null && { stage }),
        });

        if (error) throw error;
        if (!data?.thread_id) throw new Error('Failed to create thread');

        await get().loadThreadsForProject(projectId); // Refresh thread list
        set({ isLoading: false });
        // Use the returned threadId to immediately select it if needed
        return data.thread_id;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to create thread',
          isLoading: false
        });
        throw err;
      }
    },

    resolveThread: async (threadId: string) => {
      set({ isLoading: true, error: null });
      try {
        const { error } = await apiClient.manageChatThread({
          action: 'resolve_thread',
          thread_id: threadId
        });
        if (error) throw error;

        // Optimistically update local state
        set(state => ({
          threads: state.threads.map(t =>
            t.id === threadId ? { ...t, status: 'resolved' } : t
          )
        }));

        // Also refresh to be sure
        const state = get();
        const activeThread = state.threads.find(t => t.id === threadId);
        if (activeThread?.project_id) {
          await get().loadThreadsForProject(activeThread.project_id);
        }

      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to resolve thread' });
        throw err;
      } finally {
        set({ isLoading: false });
      }
    },

    deleteThread: async (threadId: string) => {
      const state = get();
      const thread = state.threads.find(t => t.id === threadId);
      const projectId = thread?.project_id;
      set({ isLoading: true, error: null });
      try {
        const { error } = await apiClient.manageChatThread({
          action: 'delete_thread',
          thread_id: threadId,
        });
        if (error) throw error;
        set(s => ({
          threads: s.threads.filter(t => t.id !== threadId),
          activeThreadId: s.activeThreadId === threadId
            ? (s.threads.filter(t => t.id !== threadId)[0]?.id ?? null)
            : s.activeThreadId,
        }));
        if (projectId) {
          await get().loadThreadsForProject(projectId);
        }
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Failed to delete thread',
          isLoading: false,
        });
        throw err;
      } finally {
        set({ isLoading: false });
      }
    },

    setActiveThread: (threadId: string | null) => {
      if (get().activeThreadId === threadId) return;

      const state = get();

      // Save current thread's messages to cache before switching
      if (state.activeThreadId && state.messages.length > 0) {
        const cache = new Map(state.messageCache);
        cache.set(state.activeThreadId, state.messages);
        set({ messageCache: cache });
      }

      get().unsubscribeFromMessages();

      // Check if we have cached messages for this thread
      const cachedMessages = threadId ? state.messageCache.get(threadId) : undefined;

      if (threadId) {
        // Set cached messages immediately if available (for instant UI update)
        if (cachedMessages && cachedMessages.length > 0) {
          set({
            activeThreadId: threadId,
            messages: cachedMessages,
            participants: [],
            attachableDocuments: [],
            isLoading: false, // Don't show loading if we have cache
          });
        } else {
          // Clear messages only if no cache
          set({ activeThreadId: threadId, messages: [], participants: [], attachableDocuments: [] });
        }

        // Always load fresh data in background (realtime will update cache)
        get().loadMessages(threadId);
        get().loadParticipants(threadId);
        get().subscribeToMessages(threadId);
        get().loadAttachableDocuments(threadId);
        void get().markThreadRead(threadId);

        // Reset unread count for this thread (WhatsApp-style)
        get().resetThreadUnreadCount(threadId);
      } else {
        set({ activeThreadId: null, messages: [], participants: [], attachableDocuments: [] });
      }
    },

    markThreadRead: async (threadId: string) => {
      try {
        await supabase.rpc('mark_thread_read', { p_thread_id: threadId });
      } catch (err) {
        console.error('Failed to mark thread read:', err);
      }
    },

    addParticipant: async (threadId: string, userIds: string[]) => {
      set({ isLoading: true, error: null });
      try {
        const { error } = await apiClient.manageChatThread({
          action: 'add_participant',
          thread_id: threadId,
          participant_ids: userIds
        });
        if (error) throw error;
        await get().loadParticipants(threadId);
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to add participant(s)' });
      } finally {
        set({ isLoading: false });
      }
    },

    removeParticipant: async (threadId: string, userId: string) => {
      set({ isLoading: true, error: null });
      try {
        const { error } = await apiClient.manageChatThread({
          action: 'remove_participant',
          thread_id: threadId,
          participant_ids: [userId]
        });
        if (error) throw error;
        await get().loadParticipants(threadId);
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Failed to remove participant' });
      } finally {
        set({ isLoading: false });
      }
    },

    loadParticipants: async (threadId: string) => {
      if (!isValidUuid(threadId)) return;
      try {
        // Query participants directly (RLS now allows this for threads user is part of)
        const { data: participants, error } = await supabase
          .from('chat_thread_participants')
          .select('thread_id, user_id, created_at')
          .eq('thread_id', threadId);

        if (error) {
          throw error;
        }

        // Fetch user profiles directly from profiles (RLS now allows related profile access)
        const userIds = [...new Set((participants || []).map((p: any) => p.user_id).filter(Boolean))];
        const profilesMap = await fetchProfilesMap(supabase, userIds as string[]);

        set({
          participants: (participants || []).map((p: any) => ({
            thread_id: p.thread_id,
            user_id: p.user_id,
            created_at: p.created_at,
            user: profilesMap.get(p.user_id) || undefined,
          })),
        });
      } catch (err) {
        console.error('[ChatStore] Failed to load participants:', err);
        set({ error: formatStoreError(err, 'Failed to load participants') });
      }
    },

    loadMessages: async (threadId: string) => {
      if (!isValidUuid(threadId)) {
        set({ messages: [], isLoading: false });
        return;
      }
      set({ isLoading: true, error: null });
      try {
        const { data: messages, error } = await supabase
          .from('project_messages')
          .select('id, thread_id, user_id, content, created_at, reply_to, image_urls, client_request_id')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Fetch sender profiles directly from profiles (RLS now allows related profile access)
        const userIds = [...new Set((messages || []).map((msg: any) => msg.user_id).filter(Boolean))];
        const profilesMap = await fetchProfilesMap(supabase, userIds as string[]);

        // Create a map of messages by ID for quick lookup of replied messages
        const messagesById = new Map<number, ProjectMessage>();

        // Map messages with sender information and populate repliedMessage
        const messagesWithSenders = (messages || []).map((msg: any) => {
          const message: ProjectMessage = {
            ...msg,
            sender: profilesMap.get(msg.user_id) || { id: msg.user_id },
            isOptimistic: false,
            // No status - historical messages don't show status in iMessage
          };
          messagesById.set(Number(msg.id), message);
          return message;
        });

        // Now populate repliedMessage for messages that have reply_to
        const messagesWithReplies = messagesWithSenders.map((msg) => {
          if (msg.reply_to) {
            const repliedMsg = messagesById.get(msg.reply_to);
            return {
              ...msg,
              repliedMessage: repliedMsg || null,
            };
          }
          return msg;
        });

        set({ messages: messagesWithReplies, isLoading: false });

        // Update cache with fresh messages
        const state = get();
        const cache = new Map(state.messageCache);
        cache.set(threadId, messagesWithReplies);
        set({ messageCache: cache });
      } catch (err) {
        set({
          error: formatStoreError(err, 'Failed to load messages'),
          isLoading: false
        });
      }
    },

    sendMessage: async (threadId: string, content: string, replyTo?: number | null, clientContext?: any, imageUrls?: string[], clientRequestId?: string) => {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Idempotency key: one UUID per send attempt for dedup and realtime optimistic match
      const requestId = clientRequestId ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `opt-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);

      // Find the replied message if replyTo is provided
      const state = get();
      const repliedMessage = replyTo ? state.messages.find((m) => Number(m.id) === replyTo) : null;

      // Create optimistic message immediately (WhatsApp-style instant feedback)
      const tempId = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const optimisticMessage: ProjectMessage = {
        id: tempId,
        thread_id: threadId,
        user_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString(),
        reply_to: replyTo || null,
        image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : null,
        client_request_id: requestId,
        status: 'sending',
        isOptimistic: true,
        sender: {
          id: user.id,
          full_name: user.user_metadata?.full_name || undefined,
          email: user.email || undefined,
        },
        repliedMessage: repliedMessage || null,
      };

      // Add optimistic message immediately (instant UI feedback)
      set((state) => {
        const updatedMessages = [...state.messages, optimisticMessage];
        // Update cache with optimistic message
        const cache = new Map(state.messageCache);
        cache.set(threadId, updatedMessages);
        return {
          messages: updatedMessages,
          messageCache: cache,
        };
      });

      try {
        // Use API Client -> Backend Endpoint (for AI Context Injection)
        const { data: result, error: insertError } = await apiClient.sendMessage({
          thread_id: threadId,
          content: content.trim(),
          client_context: clientContext,
          image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
          client_request_id: requestId,
          reply_to: replyTo ?? undefined,
        });

        if (insertError) {
          // Remove optimistic message on error
          set((state) => {
            const updatedMessages = state.messages.filter((msg) => msg.id !== tempId);
            // Update cache when removing optimistic message
            const cache = new Map(state.messageCache);
            if (state.activeThreadId === threadId) {
              cache.set(threadId, updatedMessages);
            }
            return {
              messages: updatedMessages,
              messageCache: cache,
            };
          });

          throw new Error(insertError.message || 'Failed to send message');
        }

        // result is { message_id, response }. message_id is number (DB bigint).
        const messageId = typeof result === 'object' && result !== null && 'message_id' in result
          ? result.message_id
          : (result as unknown as number);

        if (messageId == null || messageId === undefined) {
          // Remove optimistic message if no ID returned
          set((state) => {
            const updatedMessages = state.messages.filter((msg) => msg.id !== tempId);
            const cache = new Map(state.messageCache);
            if (state.activeThreadId === threadId) {
              cache.set(threadId, updatedMessages);
            }
            return {
              messages: updatedMessages,
              messageCache: cache,
            };
          });
          throw new Error('Failed to send message');
        }

        // Update optimistic message to confirmed state immediately
        set((state) => {
          const updatedMessages = state.messages.map((msg) => {
            if (msg.id === tempId) {
              return {
                ...msg,
                id: messageId,
                status: 'delivered' as const,
                isOptimistic: false, // It's now real
              } as ProjectMessage;
            }
            return msg;
          });

          // Update cache
          const cache = new Map(state.messageCache);
          if (state.activeThreadId === threadId) {
            cache.set(threadId, updatedMessages);
          }

          return {
            messages: updatedMessages,
            messageCache: cache,
          };
        });

        // Clear "Delivered" status after 5 seconds (iMessage-style)
        // Note: we cast messageId to specific type if needed, usually number or string
        clearDeliveredStatusAfterTimeout(messageId, CHAT_DELIVERED_STATUS_DURATION_MS);

        // Note: Domain event created. Realtime will still fire, but we handle dedup below.
      } catch (err) {
        // Remove optimistic message on any error
        set((state) => {
          const updatedMessages = state.messages.filter((msg) => msg.id !== tempId);
          // Update cache when removing optimistic message
          const cache = new Map(state.messageCache);
          if (state.activeThreadId === threadId) {
            cache.set(threadId, updatedMessages);
          }
          return {
            messages: updatedMessages,
            messageCache: cache,
          };
        });

        if (typeof err === 'object' && err && 'code' in err) {
          throw err;
        }
        set({ error: err instanceof Error ? err.message : 'Failed to send message' });
        throw err;
      }
    },

    subscribeToMessages: (threadId: string) => {
      const maxReconnectAttempts = 5;
      let reconnectAttempts = 0;

      const setupChannel = () => {
        const prevChannel = useChatRealtimeStore.getState().messageChannel;
        if (prevChannel) {
          useChatRealtimeStore.getState().setMessageChannelClosingIntentionally(true);
          supabase.removeChannel(prevChannel);
          useChatRealtimeStore.getState().setMessageChannel(null);
        }

        const channel = supabase
          .channel(`project-messages-${threadId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'project_messages',
              filter: `thread_id=eq.${threadId}`
            },
            async (payload) => {
              const newMessage = payload.new as ProjectMessage;
              const state = get();

              // Check for duplicate (already have this message ID?)
              if (state.messages.some((msg) => String(msg.id) === String(newMessage.id))) {
                return;
              }

              // Deduplication: match optimistic message by client_request_id (idempotency key)
              const incomingRequestId = (newMessage as { client_request_id?: string | null }).client_request_id;
              let optimisticMatch = incomingRequestId
                ? state.messages.find((msg) => msg.isOptimistic && msg.client_request_id === incomingRequestId)
                : undefined;

              // Fallback: match by content + user_id + timestamp (legacy messages without client_request_id)
              if (!optimisticMatch) {
                const messageTime = new Date(newMessage.created_at).getTime();
                const isDuplicateByContent = state.messages.some((msg) => {
                  if (msg.isOptimistic) return false;
                  if (msg.user_id !== newMessage.user_id) return false;
                  if (msg.content !== newMessage.content) return false;
                  const t = new Date(msg.created_at).getTime();
                  return Math.abs(messageTime - t) < CHAT_DEDUP_BY_CONTENT_WINDOW_MS;
                });
                if (isDuplicateByContent) return;

                optimisticMatch = state.messages.find((msg) => {
                  if (!msg.isOptimistic) return false;
                  if (msg.user_id !== newMessage.user_id) return false;
                  if (msg.content !== newMessage.content) return false;
                  const optimisticTime = new Date(msg.created_at).getTime();
                  return Math.abs(messageTime - optimisticTime) < CHAT_OPTIMISTIC_MATCH_WINDOW_MS;
                });
              }

              // Fetch sender profile directly from profiles (RLS now allows related profile access)
              const profilesMap = await fetchProfilesMap(supabase, [newMessage.user_id]);
              const senderProfile = profilesMap.get(newMessage.user_id);

              if (!senderProfile) {
                console.error("Error fetching profile for new message");
                // Fallback to refetching all messages if profile fetch fails
                await get().loadMessages(threadId);
                return;
              }

              // Append sender info to the real message (coerce null to undefined for sender type)
              newMessage.sender = {
                id: senderProfile.id,
                full_name: senderProfile.full_name ?? undefined,
                email: senderProfile.email ?? undefined,
              };

              // If this message is a reply, find and attach the replied message
              if (newMessage.reply_to) {
                const repliedMsg = state.messages.find((m) => Number(m.id) === newMessage.reply_to);
                newMessage.repliedMessage = repliedMsg || null;
              }

              // Only show "Delivered" status for messages sent by current user (iMessage-style)
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              const isOwnMessage = currentUser && newMessage.user_id === currentUser.id;

              if (isOwnMessage) {
                newMessage.status = 'delivered'; // Real message is delivered

                // Clear "Delivered" status after 5 seconds (iMessage-style ephemeral status)
                clearDeliveredStatusAfterTimeout(newMessage.id, CHAT_DELIVERED_STATUS_DURATION_MS);
              }

              // Replace optimistic message with real one, or append if no match
              // Preserve image_urls from optimistic message if realtime payload omitted them (e.g. publication filter)
              const mergedMessage = { ...newMessage } as ProjectMessage;
              if (optimisticMatch?.image_urls?.length && (!mergedMessage.image_urls || mergedMessage.image_urls.length === 0)) {
                mergedMessage.image_urls = optimisticMatch.image_urls;
              }

              set((state) => {
                let updatedMessages: ProjectMessage[];

                if (optimisticMatch) {
                  // Replace optimistic message with real one
                  const optimisticIndex = state.messages.findIndex((msg) => msg.id === optimisticMatch.id);
                  updatedMessages = [...state.messages];
                  updatedMessages[optimisticIndex] = mergedMessage;
                } else {
                  // Append new message (from another user or no optimistic match)
                  updatedMessages = [...state.messages, mergedMessage];
                }

                // Update cache with new messages
                const cache = new Map(state.messageCache);
                cache.set(threadId, updatedMessages);

                return {
                  messages: updatedMessages,
                  messageCache: cache,
                };
              });

              // Increment unread count if message is from another user and thread is not active (WhatsApp-style)
              if (!isOwnMessage && get().activeThreadId !== threadId) {
                get().incrementUnreadCount(threadId);
              }
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              reconnectAttempts = 0;
              return;
            }
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              if (useChatRealtimeStore.getState().messageChannelClosingIntentionally) {
                useChatRealtimeStore.getState().setMessageChannelClosingIntentionally(false);
                return;
              }
              console.warn('[ChatStore] Realtime message channel status:', status, err);
              if (reconnectAttempts >= maxReconnectAttempts) {
                console.error('[ChatStore] Max reconnection attempts reached for messages');
                set({ error: 'Connection lost. Please refresh the page.' });
                return;
              }
              const delay = Math.min(CHAT_RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempts, CHAT_RECONNECT_MAX_DELAY_MS);
              reconnectAttempts += 1;
              messageReconnectTimeoutId = setTimeout(() => {
                messageReconnectTimeoutId = null;
                if (get().activeThreadId === threadId) {
                  setupChannel();
                }
              }, delay);
            }
          });

        useChatRealtimeStore.getState().setMessageChannel(channel);
      };

      setupChannel();
    },

    unsubscribeFromMessages: () => {
      if (messageReconnectTimeoutId) {
        clearTimeout(messageReconnectTimeoutId);
        messageReconnectTimeoutId = null;
      }
      const messageChannel = useChatRealtimeStore.getState().messageChannel;
      if (messageChannel) {
        useChatRealtimeStore.getState().setMessageChannelClosingIntentionally(true);
        supabase.removeChannel(messageChannel);
        useChatRealtimeStore.getState().setMessageChannel(null);
        useChatRealtimeStore.getState().setMessageChannelClosingIntentionally(false);
      }

      // Clear all status timeouts when unsubscribing (cleanup)
      statusTimeouts.forEach((timeout) => clearTimeout(timeout));
      statusTimeouts.clear();
      fadeOutTimeouts.forEach((timeout) => clearTimeout(timeout));
      fadeOutTimeouts.clear();
    },

    subscribeToMembershipChanges: async (projectId: string) => {
      const membershipChannel = useChatRealtimeStore.getState().membershipChannel;

      if (membershipChannel) {
        supabase.removeChannel(membershipChannel);
        useChatRealtimeStore.getState().setMembershipChannel(null);
      }

      if (!projectId) {
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn("[ChatStore] Cannot subscribe to membership changes without auth user");
        return;
      }

      const channel = supabase
        .channel(`chat-thread-memberships-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_thread_participants',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            const newMembership = payload.new as { thread_id: string; user_id: string };
            if (!newMembership?.thread_id) {
              return;
            }

            try {
              const { data: thread, error } = await supabase
                .from('chat_threads')
                .select('id, project_id, topic, created_at')
                .eq('id', newMembership.thread_id)
                .maybeSingle();

              if (error) {
                console.error('[ChatStore] Failed to fetch thread for membership change:', error);
                return;
              }

              if (!thread || thread.project_id !== projectId) {
                return;
              }

              await get().loadThreadsForProject(projectId);
            } catch (err) {
              console.error('[ChatStore] Error handling membership change:', err);
            }
          }
        )
        .subscribe();

      useChatRealtimeStore.getState().setMembershipChannel(channel);
    },

    unsubscribeFromMembershipChanges: () => {
      const membershipChannel = useChatRealtimeStore.getState().membershipChannel;
      if (membershipChannel) {
        supabase.removeChannel(membershipChannel);
        useChatRealtimeStore.getState().setMembershipChannel(null);
      }
    },

    subscribeToProjectUnreadCounts: async (projectId: string) => {
      const projectUnreadChannel = useChatRealtimeStore.getState().projectUnreadChannel;

      // Clean up existing subscription
      if (projectUnreadChannel) {
        supabase.removeChannel(projectUnreadChannel);
        useChatRealtimeStore.getState().setProjectUnreadChannel(null);
      }

      if (!projectId || !isValidUuid(projectId)) {
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn("[ChatStore] Cannot subscribe to project unread counts without auth user");
        return;
      }

      // Get all thread IDs for this project that the user is a participant of
      const { data: threads } = await supabase
        .from('chat_threads')
        .select('id')
        .eq('project_id', projectId);

      if (!threads || threads.length === 0) {
        return;
      }

      const threadIds = threads.map(t => t.id);

      // Subscribe to new messages in ANY thread in this project
      const channel = supabase
        .channel(`project-unread-counts-${projectId}-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'project_messages',
          },
          async (payload) => {
            const newMessage = payload.new as { id: number; thread_id: string; user_id: string; created_at: string };

            // Check if this message is for a thread in the current project
            if (!threadIds.includes(newMessage.thread_id)) {
              return;
            }

            // Check if message is from another user
            const isOwnMessage = newMessage.user_id === user.id;

            // Check if this is not the active thread
            const state = get();
            const isActiveThread = state.activeThreadId === newMessage.thread_id;

            // Only increment if: not own message AND not active thread
            if (!isOwnMessage && !isActiveThread) {
              console.log('[ChatStore] Incrementing unread count for thread:', newMessage.thread_id);
              get().incrementUnreadCount(newMessage.thread_id);
            }
          }
        )
        .subscribe();

      useChatRealtimeStore.getState().setProjectUnreadChannel(channel);
      console.log('[ChatStore] Subscribed to project-wide unread counts for project:', projectId);
    },

    unsubscribeFromProjectUnreadCounts: () => {
      const projectUnreadChannel = useChatRealtimeStore.getState().projectUnreadChannel;
      if (projectUnreadChannel) {
        supabase.removeChannel(projectUnreadChannel);
        useChatRealtimeStore.getState().setProjectUnreadChannel(null);
        console.log('[ChatStore] Unsubscribed from project-wide unread counts');
      }
    },

    loadAttachments: async (messageId: number) => { /* Implementation... */ },
    attachDocument: async (messageId: number, documentPath: string) => { /* Implementation... */ },
    loadAttachableDocuments: async (threadId: string) => {
      if (!threadId) {
        set({ attachableDocuments: [], isLoadingAttachable: false });
        return;
      }

      set({ isLoadingAttachable: true });
      try {
        const { data, error } = await supabase.rpc('get_common_file_resources_for_thread', {
          p_thread_id: threadId,
        });

        if (error) throw error;

        const documents = (data as any[]) || [];
        const parsed: AttachableDocument[] = documents.map((doc) => ({
          resourceId: doc.resource_id,
          name: doc.name,
          scope: doc.scope,
        }));

        set({ attachableDocuments: parsed, isLoadingAttachable: false });
      } catch (err) {
        console.error('Failed to load attachable documents:', err);
        set({ attachableDocuments: [], isLoadingAttachable: false });
      }
    },

    // Unread count management (WhatsApp-style)
    loadUnreadCounts: async (projectId: string, userId: string) => {
      const u0 = useChatUnreadStore.getState();
      useChatUnreadStore.getState().setUnreadState(u0.threadUnreadCounts, u0.totalUnreadCount, true);
      set({ isLoadingUnreadCounts: true });
      try {
        const { data, error } = await supabase.rpc('get_unread_counts_for_project', {
          p_project_id: projectId,
          p_user_id: userId,
        });

        if (error) throw error;

        // Convert array of {thread_id, unread_count} to Map
        const unreadMap = new Map<string, number>();
        let total = 0;

        (data || []).forEach((row: { thread_id: string; unread_count: number }) => {
          const count = Number(row.unread_count) || 0;
          unreadMap.set(row.thread_id, count);
          total += count;
        });

        useChatUnreadStore.getState().setUnreadState(unreadMap, total, false);
        set({
          threadUnreadCounts: unreadMap,
          totalUnreadCount: total,
          isLoadingUnreadCounts: false,
        });
      } catch (err) {
        console.error('Failed to load unread counts:', err);
        const u = useChatUnreadStore.getState();
        useChatUnreadStore.getState().setUnreadState(u.threadUnreadCounts, u.totalUnreadCount, false);
        set({ isLoadingUnreadCounts: false });
      }
    },

    updateThreadUnreadCount: (threadId: string, count: number) => {
      useChatUnreadStore.getState().updateThreadUnreadCount(threadId, count);
      const u = useChatUnreadStore.getState();
      set({ threadUnreadCounts: u.threadUnreadCounts, totalUnreadCount: u.totalUnreadCount });
    },

    incrementUnreadCount: (threadId: string) => {
      useChatUnreadStore.getState().incrementUnreadCount(threadId);
      const u = useChatUnreadStore.getState();
      set({ threadUnreadCounts: u.threadUnreadCounts, totalUnreadCount: u.totalUnreadCount });
    },

    resetThreadUnreadCount: (threadId: string) => {
      useChatUnreadStore.getState().resetThreadUnreadCount(threadId);
      const u = useChatUnreadStore.getState();
      set({ threadUnreadCounts: u.threadUnreadCounts, totalUnreadCount: u.totalUnreadCount });
    },

    reset: () => {
      get().unsubscribeFromMessages();
      get().unsubscribeFromMembershipChanges();
      get().unsubscribeFromProjectUnreadCounts();

      // Clear all status timeouts when resetting (iMessage-style ephemeral status cleanup)
      statusTimeouts.forEach((timeout) => clearTimeout(timeout));
      statusTimeouts.clear();
      fadeOutTimeouts.forEach((timeout) => clearTimeout(timeout));
      fadeOutTimeouts.clear();

      useChatUnreadStore.getState().setUnreadState(new Map(), 0, false);
      set({
        activeThreadId: null,
        threads: [],
        participants: [],
        messages: [],
        attachments: [],
        isLoading: false,
        error: null,
        attachableDocuments: [],
        isLoadingAttachable: false,
        messageCache: new Map<string, ProjectMessage[]>(),
        threadUnreadCounts: new Map<string, number>(),
        totalUnreadCount: 0,
        isLoadingUnreadCounts: false,
      });
    },

    clearError: () => set({ error: null })
  };
});

// Sync realtime channel refs from useChatRealtimeStore so components reading useChatStore().messageChannel stay in sync
useChatRealtimeStore.subscribe((state) => {
  useChatStore.setState({
    messageChannel: state.messageChannel,
    membershipChannel: state.membershipChannel,
    projectUnreadChannel: state.projectUnreadChannel,
  });
});
// Sync unread state from useChatUnreadStore
useChatUnreadStore.subscribe((state) => {
  useChatStore.setState({
    threadUnreadCounts: state.threadUnreadCounts,
    totalUnreadCount: state.totalUnreadCount,
    isLoadingUnreadCounts: state.isLoadingUnreadCounts,
  });
});