import { create } from "zustand";
import { apiClient } from "@/lib/apiClient";
import { supabase } from "@/lib/supabaseClient";

interface User {
    id: string;
    full_name?: string;
    email?: string;
}

interface UnderwritingMessage {
    id: string | number;
    thread_id: string;
    user_id?: string;
    sender_type: 'user' | 'ai' | 'tool';
    content: string;
    created_at: string;
    metadata?: any;
    user?: User; // Hydrated user info
}

interface UnderwritingThread {
    id: string;
    project_id: string;
    topic?: string;
    created_by: string;
    status: string; // 'active' | 'resolved'
    created_at: string;
}

interface UnderwritingState {
    threads: UnderwritingThread[];
    activeThreadId: string | null;
    messages: UnderwritingMessage[];
    isLoading: boolean;
    isLoaded: boolean;
    isSending: boolean;
    error: string | null;

    // Actions
    loadThreads: (projectId: string) => Promise<void>;
    createThread: (projectId: string, topic?: string) => Promise<string | null>;
    setActiveThread: (threadId: string | null) => void;
    loadMessages: (threadId: string) => Promise<void>;
    sendMessage: (content: string, context?: any) => Promise<void>;
    deleteThread: (threadId: string) => Promise<void>;
    reset: () => void;
}

export const useUnderwritingStore = create<UnderwritingState>((set, get) => ({
    threads: [],
    activeThreadId: null,
    messages: [],
    isLoading: false,
    isLoaded: false,
    isSending: false,
    error: null,

    loadThreads: async (projectId: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await apiClient.getUnderwritingThreads(projectId);
            if (error) throw error;
            set({ threads: data || [], isLoaded: true });
        } catch (err) {
            console.error("Failed to load underwriting threads:", err);
            set({ error: err instanceof Error ? err.message : "Failed to load threads" });
        } finally {
            set({ isLoading: false });
        }
    },

    createThread: async (projectId: string, topic?: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await apiClient.createUnderwritingThread({ project_id: projectId, topic });
            if (error) throw error;
            if (!data) throw new Error("No data returned");

            // Add to list locally
            const newThread = data as UnderwritingThread;
            set((state) => ({ threads: [newThread, ...state.threads] }));
            return newThread.id;
        } catch (err) {
            console.error("Failed to create thread:", err);
            set({ error: err instanceof Error ? err.message : "Failed to create thread" });
            return null;
        } finally {
            set({ isLoading: false });
        }
    },

    setActiveThread: (threadId: string | null) => {
        set({ activeThreadId: threadId, messages: [], error: null });
        if (threadId) {
            get().loadMessages(threadId);
        }
    },

    loadMessages: async (threadId: string) => {
        set({ isLoading: true, error: null });
        try {
            const { data, error } = await apiClient.getUnderwritingMessages(threadId);
            if (error) throw error;

            // Hydrate messages with user info if needed
            // Ideally backend returns it or we fetch profiles.
            // For now, assume sender_type 'user' implies current user or we fetch.
            // Let's simplified assuming we can show 'User' or 'AI'.
            // Usually we need `users` table cache.
            // For speed, let's just leave user undefined and UI will handle or fetch.

            set({ messages: (data as UnderwritingMessage[]) || [] });
        } catch (err) {
            console.error("Failed to load messages:", err);
            set({ error: err instanceof Error ? err.message : "Failed to load messages" });
        } finally {
            set({ isLoading: false });
        }
    },

    sendMessage: async (content: string, context?: any) => {
        const threadId = get().activeThreadId;
        if (!threadId) return;

        set({ isSending: true, error: null });

        // Optimistic update?
        const tempId = Date.now();
        const optimisticMsg: UnderwritingMessage = {
            id: tempId,
            thread_id: threadId,
            sender_type: 'user',
            content: content,
            created_at: new Date().toISOString()
        };

        set(state => ({ messages: [...state.messages, optimisticMsg] }));

        try {
            const { data, error } = await apiClient.sendUnderwritingMessage({
                thread_id: threadId,
                content,
                context
            });

            if (error) throw error;
            if (!data) throw new Error("No data returned");

            // Replace optimistic message and append all new AI/Tool messages
            set(state => {
                const filtered = state.messages.filter(m => m.id !== tempId);
                const turnMessages = data.new_messages || [data.ai_message];
                return {
                    messages: [...filtered, data.user_message, ...turnMessages]
                };
            });

        } catch (err) {
            console.error("Failed to send message:", err);
            set({ error: err instanceof Error ? err.message : "Failed to send message" });
            // Remove optimistic
            set(state => ({ messages: state.messages.filter(m => m.id !== tempId) }));
        } finally {
            set({ isSending: false });
        }
    },

    deleteThread: async (threadId: string) => {
        set({ isLoading: true, error: null });
        try {
            const { error } = await apiClient.deleteUnderwritingThread(threadId);
            if (error) throw error;

            set(state => ({
                threads: state.threads.filter(t => t.id !== threadId),
                activeThreadId: state.activeThreadId === threadId ? null : state.activeThreadId,
                messages: state.activeThreadId === threadId ? [] : state.messages
            }));
        } catch (err) {
            console.error("Failed to delete thread:", err);
            set({ error: err instanceof Error ? err.message : "Failed to delete thread" });
        } finally {
            set({ isLoading: false });
        }
    },

    reset: () => {
        set({
            threads: [],
            activeThreadId: null,
            messages: [],
            isLoading: false,
            isLoaded: false,
            error: null
        });
    }
}));
