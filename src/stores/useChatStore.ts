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
  attachableDocuments: string[];
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
    set({ activeThreadId: threadId, messages: [], participants: [] });

    if (threadId) {
      get().loadMessages(threadId);
      get().loadParticipants(threadId);
      get().subscribeToMessages(threadId);
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
      const { data, error } = await supabase
        .from('project_messages')
        .select(`*, sender:profiles(id, full_name, email)`)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set({ messages: data || [], isLoading: false });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : 'Failed to load messages',
        isLoading: false 
      });
    }
  },

  sendMessage: async (threadId: string, content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('project_messages')
        .insert({
          thread_id: threadId,
          user_id: user.id,
          content
        });

      if (error) throw error;
    } catch (err) {
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

          // We need to fetch the sender's profile for the new message
          const { data: senderProfile, error } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', newMessage.user_id)
            .single();

          if (error) {
            console.error("Error fetching profile for new message:", error);
            // Fallback to refetching all messages if profile fetch fails
            await get().loadMessages(threadId);
            return;
          }

          // Append the new message with sender info to the existing messages array
          newMessage.sender = senderProfile;
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
  loadAttachableDocuments: async (threadId: string) => { /* Implementation... */ },

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