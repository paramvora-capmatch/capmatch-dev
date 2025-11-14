// src/stores/useChatStore.ts
import { create } from "zustand";
import { supabase } from "../../lib/supabaseClient";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ChatThread {
  id: string;
  project_id: string;
  topic?: string;
  created_at: string;
}

interface ChatParticipant {
  thread_id: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    full_name?: string;
    email?: string;
  };
}

interface ProjectMessage {
  id: number;
  thread_id: string;
  user_id: string;
  content?: string;
  created_at: string;
  sender?: {
    id: string;
    full_name?: string;
    email?: string;
  };
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
  
  // Safe attachment UX
  attachableDocuments: AttachableDocument[];
  isLoadingAttachable: boolean;
}

interface ChatActions {
  // Thread management
  loadThreadsForProject: (projectId: string) => Promise<void>;
  createThread: (projectId: string, topic?: string, participantIds?: string[]) => Promise<string>;
  setActiveThread: (threadId: string | null) => void;
  
  // Participants
  addParticipant: (threadId: string, userIds: string[]) => Promise<void>;
  removeParticipant: (threadId: string, userIds: string) => Promise<void>;
  loadParticipants: (threadId: string) => Promise<void>;
  
  // Messages
  loadMessages: (threadId: string) => Promise<void>;
  sendMessage: (threadId: string, content: string) => Promise<void>;
  subscribeToMessages: (threadId: string) => void;
  unsubscribeFromMessages: () => void;
  
  // Attachments
  loadAttachments: (messageId: number) => Promise<void>;
  attachDocument: (messageId: number, documentPath: string) => Promise<void>;
  loadAttachableDocuments: (threadId: string) => Promise<void>;
  
  // Utility
  reset: () => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  // State
  activeThreadId: null,
  threads: [],
  participants: [],
  messages: [],
  attachments: [],
  isLoading: false,
  error: null,
  messageChannel: null,
  attachableDocuments: [],
  isLoadingAttachable: false,

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
      const { data, error } = await supabase.functions.invoke('manage-chat-thread', {
        body: {
          action: 'create',
          project_id: projectId,
          topic,
          participant_ids: participantIds
        }
      });

      if (error) throw error;
      if (!data?.thread_id) throw new Error('Failed to create thread');

      await get().loadThreadsForProject(projectId); // Refresh thread list
      set({ isLoading: false });
      return data.thread_id;
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to create thread',
        isLoading: false 
      });
      throw err;
    }
  },

  setActiveThread: (threadId: string | null) => {
    if (get().activeThreadId === threadId) return;
    
    get().unsubscribeFromMessages();
    set({ activeThreadId: threadId, messages: [], participants: [], attachableDocuments: [] });

    if (threadId) {
      get().loadMessages(threadId);
      get().loadParticipants(threadId);
      get().subscribeToMessages(threadId);
      get().loadAttachableDocuments(threadId);
    }
  },

  addParticipant: async (threadId: string, userIds: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.functions.invoke('manage-chat-thread', {
        body: { action: 'add_participant', thread_id: threadId, participant_ids: userIds }
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
      const { error } = await supabase.functions.invoke('manage-chat-thread', {
        body: { action: 'remove_participant', thread_id: threadId, participant_ids: [userId] }
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
      const { data, error } = await supabase
        .from('chat_thread_participants')
        .select(`*, user:profiles(id, full_name)`)
        .eq('thread_id', threadId);

      if (error) throw error;
      set({ participants: data || [] });
    } catch (err) {
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

      // Fetch sender profiles using edge function (bypasses RLS)
      const userIds = [...new Set((messages || []).map((msg: any) => msg.user_id).filter(Boolean))];
      
      const profilesMap = new Map<string, { id: string; full_name?: string; email?: string }>();
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase.functions.invoke('get-user-data', {
          body: { userIds: userIds as string[] },
        });

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

      // Map messages with sender information
      const messagesWithSenders = (messages || []).map((msg: any) => ({
        ...msg,
        sender: profilesMap.get(msg.user_id) || { id: msg.user_id },
      }));

      set({ messages: messagesWithSenders, isLoading: false });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to load messages',
        isLoading: false 
      });
    }
  },

  sendMessage: async (threadId: string, content: string) => {
    try {
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

      // Call RPC directly - much faster than edge function!
      const { data: messageId, error: insertError } = await supabase.rpc(
        'insert_thread_message',
        {
          p_thread_id: threadId,
          p_user_id: user.id,
          p_content: content.trim(),
          p_resource_ids: resourceIdArray,
        }
      );

      if (insertError) {
        // Handle DOC_ACCESS_DENIED error
        if (insertError.message?.includes('DOC_ACCESS_DENIED')) {
          // Fetch full validation details for UI
          const { data: validation } = await supabase.rpc(
            'validate_docs_for_thread',
            {
              p_thread_id: threadId,
              p_resource_ids: resourceIdArray,
            }
          );

          const blocked = (validation || []).filter(
            (row: any) => row.missing_user_ids && row.missing_user_ids.length > 0
          );

          throw {
            code: 'DOC_ACCESS_DENIED',
            message: 'Some participants do not have access to the referenced documents',
            blocked,
          };
        }

        throw new Error(insertError.message || 'Failed to send message');
      }

      if (!messageId) {
        throw new Error('Failed to send message');
      }

      // Message will arrive via postgres_changes subscription automatically
    } catch (err) {
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

          // Fetch sender profile using edge function (bypasses RLS)
          const { data: profilesData, error: profilesError } = await supabase.functions.invoke('get-user-data', {
            body: { userIds: [newMessage.user_id] },
          });

          if (profilesError || !Array.isArray(profilesData) || profilesData.length === 0) {
            console.error("Error fetching profile for new message:", profilesError);
            // Fallback to refetching all messages if profile fetch fails
            await get().loadMessages(threadId);
            return;
          }

          // Append the new message with sender info to the existing messages array
          const senderProfile = profilesData[0];
          newMessage.sender = {
            id: senderProfile.id,
            full_name: senderProfile.full_name,
            email: senderProfile.email,
          };
          set((state) => ({
            messages: [...state.messages, newMessage],
          }));
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
      const { data, error } = await supabase.functions.invoke('get-common-documents-for-thread', {
        body: { thread_id: threadId },
      });

      if (error) throw error;

      const documents = (data?.documents as any[]) || [];
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

  reset: () => {
    get().unsubscribeFromMessages();
    set({
      activeThreadId: null,
      threads: [],
      participants: [],
      messages: [],
      attachments: [],
      isLoading: false,
      error: null,
      attachableDocuments: [],
      isLoadingAttachable: false
    });
  },

  clearError: () => set({ error: null })
}));