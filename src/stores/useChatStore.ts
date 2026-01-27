// src/stores/useChatStore.ts
import { create } from "zustand";
import { supabase } from "../../lib/supabaseClient";
import { apiClient } from "@/lib/apiClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

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
  createThread: (projectId: string, topic?: string, participantIds?: string[]) => Promise<string>;
  setActiveThread: (threadId: string | null) => void;
  resolveThread: (threadId: string) => Promise<void>;

  // Participants
  addParticipant: (threadId: string, userIds: string[]) => Promise<void>;
  removeParticipant: (threadId: string, userIds: string) => Promise<void>;
  loadParticipants: (threadId: string) => Promise<void>;

  // Messages
  loadMessages: (threadId: string) => Promise<void>;
  sendMessage: (threadId: string, content: string, replyTo?: number | null, clientContext?: any) => Promise<void>;
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
  const clearDeliveredStatusAfterTimeout = (messageId: string | number, delayMs: number = 5000) => {
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

    // Start fade-out animation 400ms before clearing (smooth transition)
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
    }, delayMs - 400); // Start fade 400ms before clearing

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
    threadUnreadCounts: new Map<string, number>(),
    totalUnreadCount: 0,
    isLoadingUnreadCounts: false,

    // Actions
    loadThreadsForProject: async (projectId: string) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await supabase
          .from('chat_threads')
          .select('*')
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

    createThread: async (projectId: string, topic?: string, participantIds?: string[]) => {
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await apiClient.manageChatThread({
          action: 'create',
          project_id: projectId,
          topic,
          participant_ids: participantIds
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
        const profilesMap = new Map<string, { id: string; full_name?: string | null; email?: string | null }>();

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds as string[]);

          if (!profilesError && Array.isArray(profilesData)) {
            profilesData.forEach((user: any) => {
              profilesMap.set(user.id, {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
              });
            });
          } else if (profilesError) {
            console.error('[ChatStore] Error fetching participant profiles:', profilesError);
          }
        }

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
        set({ error: err instanceof Error ? err.message : 'Failed to load participants' });
      }
    },

    loadMessages: async (threadId: string) => {
      set({ isLoading: true, error: null });
      try {
        const { data: messages, error } = await supabase
          .from('project_messages')
          .select('*')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Fetch sender profiles directly from profiles (RLS now allows related profile access)
        const userIds = [...new Set((messages || []).map((msg: any) => msg.user_id).filter(Boolean))];

        const profilesMap = new Map<string, { id: string; full_name?: string | null; email?: string | null }>();

        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds as string[]);

          if (!profilesError && Array.isArray(profilesData)) {
            profilesData.forEach((user: any) => {
              profilesMap.set(user.id, {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
              });
            });
          } else if (profilesError) {
            console.error('[ChatStore] Error fetching user profiles:', profilesError);
          }
        }

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
          error: err instanceof Error ? err.message : 'Failed to load messages',
          isLoading: false
        });
      }
    },

    sendMessage: async (threadId: string, content: string, replyTo?: number | null, clientContext?: any) => {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Extract resource IDs from mentions (same logic as edge function)
      const mentionRegex = /@\[[^\]]+\]\(doc:([^)]+)\)/g;
      const resourceIds = new Set<string>();
      let match;
      while ((match = mentionRegex.exec(content)) !== null) {
        const resourceId = match[1];
        if (resourceId) {
          resourceIds.add(resourceId);
        }
      }
      const resourceIdArray = Array.from(resourceIds);

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
          client_context: clientContext
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

        // result is now a JSON object { message_id: 123, event_id: 456 }
        // Need to handle old version (bigint) or new version (json) during migration transition
        let messageId = null;
        let eventId = null;

        if (typeof result === 'object' && result !== null && 'message_id' in result) {
          messageId = result.message_id;
          // API doesn't return event_id currently, but that's fine for now
          eventId = null; 
        } else {
          messageId = result; // Legacy support
        }

        if (!messageId) {
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
        clearDeliveredStatusAfterTimeout(messageId, 5000);

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

            // Deduplication: Check if this is replacing an optimistic message
            // Match by content + user_id + approximate timestamp (within 5 seconds)
            const messageTime = new Date(newMessage.created_at).getTime();
            const optimisticMatch = state.messages.find((msg) => {
              if (!msg.isOptimistic) return false;
              if (msg.user_id !== newMessage.user_id) return false;
              if (msg.content !== newMessage.content) return false;

              const optimisticTime = new Date(msg.created_at).getTime();
              return Math.abs(messageTime - optimisticTime) < 5000; // 5 second window
            });

            // Fetch sender profile directly from profiles (RLS now allows related profile access)
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .eq('id', newMessage.user_id)
              .maybeSingle();

            if (profilesError || !profilesData) {
              console.error("Error fetching profile for new message:", profilesError);
              // Fallback to refetching all messages if profile fetch fails
              await get().loadMessages(threadId);
              return;
            }

            // Append sender info to the real message
            const senderProfile = profilesData;
            newMessage.sender = {
              id: senderProfile.id,
              full_name: senderProfile.full_name,
              email: senderProfile.email,
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
              clearDeliveredStatusAfterTimeout(newMessage.id, 5000);
            }

            // Replace optimistic message with real one, or append if no match
            set((state) => {
              let updatedMessages: ProjectMessage[];

              if (optimisticMatch) {
                // Replace optimistic message with real one
                const optimisticIndex = state.messages.findIndex((msg) => msg.id === optimisticMatch.id);
                updatedMessages = [...state.messages];
                updatedMessages[optimisticIndex] = newMessage;
              } else {
                // Append new message (from another user or no optimistic match)
                updatedMessages = [...state.messages, newMessage];
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
        .subscribe();

      set({ messageChannel: channel });
    },

    unsubscribeFromMessages: () => {
      const { messageChannel } = get();
      if (messageChannel) {
        supabase.removeChannel(messageChannel);
        set({ messageChannel: null });
      }

      // Clear all status timeouts when unsubscribing (cleanup)
      statusTimeouts.forEach((timeout) => clearTimeout(timeout));
      statusTimeouts.clear();
      fadeOutTimeouts.forEach((timeout) => clearTimeout(timeout));
      fadeOutTimeouts.clear();
    },

    subscribeToMembershipChanges: async (projectId: string) => {
      const { membershipChannel } = get();

      if (membershipChannel) {
        supabase.removeChannel(membershipChannel);
        set({ membershipChannel: null });
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

      set({ membershipChannel: channel });
    },

    unsubscribeFromMembershipChanges: () => {
      const { membershipChannel } = get();
      if (membershipChannel) {
        supabase.removeChannel(membershipChannel);
        set({ membershipChannel: null });
      }
    },

    subscribeToProjectUnreadCounts: async (projectId: string) => {
      const { projectUnreadChannel } = get();

      // Clean up existing subscription
      if (projectUnreadChannel) {
        supabase.removeChannel(projectUnreadChannel);
        set({ projectUnreadChannel: null });
      }

      if (!projectId) {
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

      set({ projectUnreadChannel: channel });
      console.log('[ChatStore] Subscribed to project-wide unread counts for project:', projectId);
    },

    unsubscribeFromProjectUnreadCounts: () => {
      const { projectUnreadChannel } = get();
      if (projectUnreadChannel) {
        supabase.removeChannel(projectUnreadChannel);
        set({ projectUnreadChannel: null });
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

        set({
          threadUnreadCounts: unreadMap,
          totalUnreadCount: total,
          isLoadingUnreadCounts: false,
        });
      } catch (err) {
        console.error('Failed to load unread counts:', err);
        set({ isLoadingUnreadCounts: false });
      }
    },

    updateThreadUnreadCount: (threadId: string, count: number) => {
      const state = get();
      const oldCount = state.threadUnreadCounts.get(threadId) || 0;
      const newCounts = new Map(state.threadUnreadCounts);
      newCounts.set(threadId, count);

      const totalDiff = count - oldCount;

      set({
        threadUnreadCounts: newCounts,
        totalUnreadCount: Math.max(0, state.totalUnreadCount + totalDiff),
      });
    },

    incrementUnreadCount: (threadId: string) => {
      const state = get();
      const currentCount = state.threadUnreadCounts.get(threadId) || 0;
      get().updateThreadUnreadCount(threadId, currentCount + 1);
    },

    resetThreadUnreadCount: (threadId: string) => {
      get().updateThreadUnreadCount(threadId, 0);
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