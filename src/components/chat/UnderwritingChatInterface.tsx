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
    Bot,
    Menu,
    Trash2,
    Code2,
    Drill,
    ChevronDown,
    ChevronRight
} from "lucide-react";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { RichTextInput, RichTextInputRef } from "./RichTextInput";

interface UnderwritingChatInterfaceProps {
    projectId: string;
    embedded?: boolean;
    hideSidebar?: boolean;
    defaultTopic?: string; // e.g. "AI Underwriter" or specific doc name
    clientContext?: any;
}

const ToolMessage: React.FC<{ content: string }> = ({ content }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-gray-100/50 border border-gray-200 rounded-xl px-4 py-2 shadow-sm text-gray-600 font-mono text-xs w-full max-w-none">
            <div
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="text-[10px] opacity-75 font-semibold flex items-center gap-1">
                    <Code2 size={10} />
                    <span>Tool Output</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] opacity-50 group-hover:opacity-100 transition-opacity">
                    <span>{isExpanded ? "Collapse" : "Expand"}</span>
                    {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2 pt-2 border-t border-gray-200/50 break-all whitespace-pre-wrap prose prose-xs max-w-none prose-slate">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {content}
                            </ReactMarkdown>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

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
        isLoaded,
        isSending,
        error,
        loadThreads,
        createThread,
        setActiveThread,
        sendMessage,
        deleteThread,
        reset
    } = useUnderwritingStore();

    const { user } = useAuthStore();
    const [newMessage, setNewMessage] = useState("");
    const messageListRef = useRef<HTMLDivElement>(null);
    const richTextInputRef = useRef<RichTextInputRef>(null);
    const [isCreatingThread, setIsCreatingThread] = useState(false);

    const [isSideBarOpen, setIsSideBarOpen] = useState(false);

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
        // Only act once we've definitively loaded (or failed to load) threads from the backend
        if (!isLoaded || isLoading || isCreatingThread) return;

        // If an active thread is already set, don't override it
        if (activeThreadId) return;

        let target = null;

        // 1. Try to find existing thread by topic
        if (defaultTopic) {
            target = threads.find(t => t.topic === defaultTopic);
        }

        // 2. If no target found but we have threads, pick the first available one
        if (!target && threads.length > 0) {
            target = threads[0];
        }

        if (target) {
            // Found a match or picked first available, set it active
            setActiveThread(target.id);
        }
        // If threads.length === 0, we do nothing and wait for user to click "+" 
    }, [isLoaded, isLoading, isCreatingThread, threads, activeThreadId, defaultTopic, projectId, setActiveThread]);

    // Scroll to bottom
    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeThreadId) return;
        try {
            const content = newMessage.trim();
            // Clear input immediately or after success
            richTextInputRef.current?.clear();
            setNewMessage("");
            await sendMessage(content, clientContext);
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
        <div className={cn(
            "relative flex overflow-hidden",
            embedded ? "h-full" : "h-full rounded-2xl bg-white/70 backdrop-blur-xl border border-gray-200 shadow-lg"
        )}>

            {/* Floating Sidebar Drawer */}
            <AnimatePresence>
                {isSideBarOpen && !hideSidebar && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSideBarOpen(false)}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                        />
                        {/* Drawer */}
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-2xl z-50 flex flex-col border-r border-gray-100"
                        >
                            <div className="p-4 border-b border-gray-100 font-semibold text-sm text-gray-700 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <MessageCircle size={18} className="text-blue-600" />
                                    <span>Threads</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => {
                                            setIsCreatingThread(true);
                                            createThread(projectId, "New Thread").then(id => {
                                                if (id) setActiveThread(id);
                                                setIsCreatingThread(false);
                                            });
                                        }}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => setIsSideBarOpen(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {threads.map(t => (
                                    <div
                                        key={t.id}
                                        className={cn(
                                            "p-3 rounded-xl text-sm cursor-pointer flex items-center justify-between group transition-all",
                                            activeThreadId === t.id
                                                ? "bg-blue-50 text-blue-700 font-semibold shadow-sm border border-blue-100"
                                                : "hover:bg-gray-50 text-gray-600 border border-transparent"
                                        )}
                                    >
                                        <div
                                            className="flex items-center gap-3 overflow-hidden flex-1"
                                            onClick={() => {
                                                setActiveThread(t.id);
                                                setIsSideBarOpen(false);
                                            }}
                                        >
                                            <Hash size={16} className={cn("flex-shrink-0", activeThreadId === t.id ? "text-blue-500" : "text-gray-400")} />
                                            <span className="truncate">{t.topic || "Untitled"}</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all rounded-lg"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm("Are you sure you want to delete this thread?")) {
                                                    deleteThread(t.id).then(() => {
                                                        toast.success("Thread deleted");
                                                    });
                                                }
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                ))}
                                {threads.length === 0 && !isLoading && !isCreatingThread && (
                                    <div className="p-4 text-center text-xs text-gray-400 italic">
                                        No threads found
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {activeThreadId ? (
                    <>
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                {!hideSidebar && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 flex"
                                        onClick={() => setIsSideBarOpen(true)}
                                    >
                                        <Menu className="h-5 w-5 text-gray-500" />
                                    </Button>
                                )}
                                <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Bot size={18} className="text-blue-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 text-sm">{activeThread?.topic || "Loading..."}</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className={cn("h-1.5 w-1.5 rounded-full", isSending ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                {isSending ? "AI is processing..." : "Online"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                                            {msg.sender_type === 'tool' ? (
                                                <ToolMessage content={msg.content} />
                                            ) : (
                                                <div className={cn(
                                                    "max-w-[85%] rounded-xl px-4 py-2 shadow-sm",
                                                    msg.sender_type === 'user'
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-white border border-gray-200 text-gray-800"
                                                )}>
                                                    <div className="text-[10px] opacity-75 mb-1 font-semibold flex items-center gap-1">
                                                        {msg.sender_type === 'user' ? (
                                                            "You"
                                                        ) : (
                                                            <>
                                                                <Bot size={10} />
                                                                <span>AI Underwriter</span>
                                                            </>
                                                        )}
                                                    </div>

                                                    {/* Render Tool Call Request (in AI message) */}
                                                    {(msg.metadata as any)?.function_call && (
                                                        <div className="mb-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                                                            <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold mb-1">
                                                                <Drill size={12} />
                                                                <span>Calling Tool: {(msg.metadata as any).function_call.name}</span>
                                                            </div>
                                                            <div className="font-mono text-[10px] text-blue-600 break-all">
                                                                {(msg.metadata as any).function_call.arguments}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="prose prose-sm max-w-none">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                            {isSending && (
                                <div className="flex justify-start mb-3">
                                    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 min-w-[140px]">
                                        <div className="flex gap-1">
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                                                className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                                            />
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                                                className="w-1.5 h-1.5 bg-blue-500 rounded-full"
                                            />
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                                                className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                                            />
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium italic">AI is thinking...</span>
                                    </div>
                                </div>
                            )}
                            {isLoading && messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin opacity-20" />
                                    <div className="text-center text-sm text-gray-400">Loading messages...</div>
                                </div>
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
                    <div className="flex-1 flex flex-col min-w-0">
                        {/* Header for Empty State */}
                        <div className="px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-30 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                {!hideSidebar && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 flex"
                                        onClick={() => setIsSideBarOpen(true)}
                                    >
                                        <Menu className="h-5 w-5 text-gray-500" />
                                    </Button>
                                )}
                                <span className="font-bold text-gray-900 text-sm">AI Underwriter</span>
                            </div>
                        </div>

                        {/* Empty State Content */}
                        <div className="flex-1 flex items-center justify-center p-8 bg-gray-50/30">
                            <div className="text-center max-w-xs">
                                <div className="mb-6 bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-blue-100">
                                    <Bot className="h-8 w-8 text-blue-500 opacity-60" />
                                </div>
                                <h3 className="text-gray-900 font-semibold mb-2">Ready to assist</h3>
                                <p className="text-gray-500 text-xs mb-8 leading-relaxed">
                                    Select an existing thread from the sidebar or start a new analysis to begin chatting with the AI Underwriter.
                                </p>
                                <Button
                                    onClick={() => {
                                        setIsCreatingThread(true);
                                        createThread(projectId, "New Thread").then(id => {
                                            if (id) setActiveThread(id);
                                            setIsCreatingThread(false);
                                        });
                                    }}
                                    disabled={isCreatingThread}
                                    className="w-full shadow-md"
                                    leftIcon={isCreatingThread ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                                >
                                    {isCreatingThread ? "Creating..." : "Start New Thread"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
