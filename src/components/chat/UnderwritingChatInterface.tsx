import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useUnderwritingStore } from "@/stores/useUnderwritingStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProjects } from "@/hooks/useProjects";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/Button";
import {
    MessageCircle,
    Send,
    Plus,
    Loader2,
    AlertCircle,
    Hash,
    Reply,
    X,
    User,
    Bot
} from "lucide-react";
import { cn } from "@/utils/cn";
import { RichTextInput, RichTextInputRef } from "./RichTextInput";

interface UnderwritingChatInterfaceProps {
    projectId: string;
    embedded?: boolean;
    hideSidebar?: boolean;
    defaultTopic?: string; // e.g. "AI Underwriter" or specific doc name
    clientContext?: any;
}

export const UnderwritingChatInterface: React.FC<UnderwritingChatInterfaceProps> = ({
    projectId,
    embedded = false,
    hideSidebar = false,
    defaultTopic,
    clientContext
}) => {
    const {
        threads,
        activeThreadId,
        messages,
        isLoading,
        error,
        loadThreads,
        createThread,
        setActiveThread,
        sendMessage,
        reset
    } = useUnderwritingStore();

    const { user } = useAuthStore();
    const [newMessage, setNewMessage] = useState("");
    const messageListRef = useRef<HTMLDivElement>(null);
    const richTextInputRef = useRef<RichTextInputRef>(null);
    const [isCreatingThread, setIsCreatingThread] = useState(false);

    // Initial load
    useEffect(() => {
        if (projectId) {
            loadThreads(projectId);
        }
        return () => {
            reset();
        };
    }, [projectId, loadThreads, reset]);

    // Select default or active thread
    useEffect(() => {
        if (threads.length === 0) return;
        if (activeThreadId) return;

        let target = null;
        if (defaultTopic) {
            target = threads.find(t => t.topic === defaultTopic);
        }

        if (!target && !defaultTopic) {
            // Default to first available
            target = threads[0];
        }

        if (target) {
            setActiveThread(target.id);
        } else if (defaultTopic && !isCreatingThread && !isLoading) {
            // Auto-create default topic if it doesn't exist
            setIsCreatingThread(true);
            createThread(projectId, defaultTopic).then((id) => {
                if (id) setActiveThread(id);
                setIsCreatingThread(false);
            });
        }
    }, [threads, activeThreadId, defaultTopic, projectId, createThread, setActiveThread, isCreatingThread, isLoading]);

    // Scroll to bottom
    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeThreadId) return;
        try {
            await sendMessage(newMessage.trim(), clientContext);
            setNewMessage("");
        } catch (e) {
            console.error("Failed to send", e);
        }
    };

    // Group messages
    const groupedMessages = useMemo(() => {
        const groups: { key: string; label: string; items: typeof messages }[] = [];
        if (!messages || messages.length === 0) return groups;

        const formatter = new Intl.DateTimeFormat(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
        const today = new Date();
        const yday = new Date();
        yday.setDate(today.getDate() - 1);
        const toKey = (d: Date) => d.toISOString().slice(0, 10);

        const labelFor = (d: Date) => {
            const dk = toKey(d);
            const tk = toKey(today);
            const yk = toKey(yday);
            if (dk === tk) return "Today";
            if (dk === yk) return "Yesterday";
            return formatter.format(d);
        };

        const map = new Map<string, { label: string; items: typeof messages }>();
        messages.forEach((m) => {
            const d = new Date(m.created_at);
            const key = toKey(d);
            if (!map.has(key)) {
                map.set(key, { label: labelFor(d), items: [] as any });
            }
            map.get(key)!.items.push(m);
        });
        Array.from(map.entries())
            .sort(([a], [b]) => (a < b ? -1 : 1))
            .forEach(([key, value]) => groups.push({ key, label: value.label, items: value.items }));

        return groups;
    }, [messages]);

    const activeThread = threads.find(t => t.id === activeThreadId);

    return (
        <div className={embedded ? "h-full flex" : "h-full flex rounded-2xl overflow-hidden bg-white/70 backdrop-blur-xl border border-gray-200 shadow-lg"}>

            {/* Sidebar */}
            {!hideSidebar && (
                <div className="w-48 bg-white/60 backdrop-blur border-r border-gray-100 flex flex-col">
                    <div className="p-3 border-b border-gray-100 font-semibold text-sm text-gray-700 flex justify-between items-center">
                        <span>Underwriting</span>
                        <Button size="sm" variant="ghost" onClick={() => createThread(projectId, "New Thread").then(id => id && setActiveThread(id))}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {threads.map(t => (
                            <div
                                key={t.id}
                                onClick={() => setActiveThread(t.id)}
                                className={cn(
                                    "p-2 rounded-md text-sm cursor-pointer flex items-center gap-2 truncate",
                                    activeThreadId === t.id ? "bg-blue-100 text-blue-700 font-medium" : "hover:bg-gray-100 text-gray-700"
                                )}
                            >
                                <Hash size={14} className="flex-shrink-0" />
                                <span className="truncate">{t.topic || "Untitled"}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {activeThreadId ? (
                    <>
                        {/* Header */}
                        <div className="px-3 py-2 border-b border-gray-100 bg-white/60 backdrop-blur flex items-center">
                            <Bot size={16} className="text-blue-600 mr-2" />
                            <span className="font-semibold text-gray-800 text-sm">{activeThread?.topic || "Loading..."}</span>
                        </div>

                        {/* Messages */}
                        <div ref={messageListRef} className="flex-1 overflow-y-auto p-3 space-y-4">
                            {groupedMessages.map(g => (
                                <div key={g.key}>
                                    <div className="flex items-center justify-center my-2 text-[10px] text-gray-400">
                                        <span>{g.label}</span>
                                    </div>
                                    {g.items.map(msg => (
                                        <div key={msg.id} className={cn(
                                            "flex mb-3",
                                            msg.sender_type === 'user' ? "justify-end" : "justify-start"
                                        )}>
                                            <div className={cn(
                                                "max-w-[85%] rounded-xl px-4 py-2 shadow-sm",
                                                msg.sender_type === 'user'
                                                    ? "bg-blue-600 text-white"
                                                    : "bg-white border border-gray-200 text-gray-800"
                                            )}>
                                                <div className="text-[10px] opacity-75 mb-1 font-semibold">
                                                    {msg.sender_type === 'user' ? "You" : "AI Underwriter"}
                                                </div>
                                                <div className="prose prose-sm max-w-none">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {isLoading && messages.length === 0 && (
                                <div className="text-center text-sm text-gray-400 mt-4">Loading messages...</div>
                            )}
                        </div>

                        {/* Input */}
                        <div className="p-3 bg-white/60 backdrop-blur border-t border-gray-100">
                            <div className="flex gap-2">
                                <div className="flex-1 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                    <RichTextInput
                                        ref={richTextInputRef}
                                        value={newMessage}
                                        onChange={setNewMessage}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        placeholder="Message AI Underwriter..."
                                        minHeight={40}
                                        maxHeight={120}
                                    />
                                </div>
                                <Button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                    className="h-auto aspect-square rounded-xl"
                                >
                                    <Send size={18} />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                        <div className="text-center">
                            <Bot className="mx-auto h-8 w-8 mb-2 opacity-50" />
                            Select or create a thread to start
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
