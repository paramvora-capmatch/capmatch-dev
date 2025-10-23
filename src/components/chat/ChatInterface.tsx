// src/components/chat/ChatInterface.tsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatStore } from "../../stores/useChatStore";
import {
  useDocumentManagement,
  DocumentFile,
} from "@/hooks/useDocumentManagement";
import { useOrgStore } from "@/stores/useOrgStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useProjects } from "../../hooks/useProjects";
import { supabase } from "../../../lib/supabaseClient";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { MultiSelect } from "../ui/MultiSelect";
import { DocumentPreviewModal } from "../documents/DocumentPreviewModal";
import {
  MessageCircle,
  Send,
  Users,
  Plus,
  Loader2,
  AlertCircle,
  MoreVertical,
  FileText,
} from "lucide-react";

interface ChatInterfaceProps {
  projectId: string;
  onMentionClick?: (resourceId: string) => void;
}

import { ManageChannelMembersModal } from "./ManageChannelMembersModal";
import { ChatThread } from "@/types/enhanced-types";


export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  projectId,
  onMentionClick,
}) => {
  const {
    threads,
    activeThreadId,
    participants,
    messages,
    isLoading,
    error,
    loadThreadsForProject,
    createThread,
    setActiveThread,
    sendMessage,
    clearError,
  } = useChatStore();

  const { user } = useAuthStore();
  const { activeProject } = useProjects();

  const [previewingResourceId, setPreviewingResourceId] = useState<
    string | null
  >(null);

  const [newMessage, setNewMessage] = useState("");
  const [newThreadTopic, setNewThreadTopic] = useState("");
  const { isOwner, members, currentOrg } = useOrgStore();
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [managingThread, setManagingThread] = useState<ChatThread | null>(null);

  // Check if user has owner permissions for this specific project
  const hasOwnerPermissions = useMemo(() => {
    if (!activeProject?.entityId || !currentOrg) return false;

    // User is owner if:
    // 1. The isOwner flag is true (they're owner of the org)
    // 2. The current org matches the project's owner org
    const isProjectOwner = isOwner && currentOrg.id === activeProject.entityId;
    console.log(`[ChatInterface] Has owner permissions: ${isProjectOwner}`);
    return isProjectOwner;
  }, [isOwner, currentOrg, activeProject]);

  const memberOptions = useMemo(() => members
    .filter((m) => m.user_id !== user?.id) // Exclude self
    .map((m) => ({ value: m.user_id, label: m.userName || m.userEmail || "" })), [members, user]);

  const [showCreateThread, setShowCreateThread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // State for document mentions
  const { files: mentionableDocuments, isLoading: isLoadingDocuments } =
    useDocumentManagement(projectId, null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DocumentFile[]>([]);

  useEffect(() => {
    if (projectId) {
      loadThreadsForProject(projectId);
    }
  }, [projectId, loadThreadsForProject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (mentionQuery === null) {
      textAreaRef.current?.focus();
    }
  }, [mentionQuery]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeThreadId) return;
    try {
      await sendMessage(activeThreadId, newMessage.trim());
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNewMessage(text);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([\w\s.-]*)$/);

    if (atMatch) {
      const query = atMatch[1].toLowerCase();
      setMentionQuery(query);
      const filtered = mentionableDocuments
        .filter((doc) => doc.name.toLowerCase().includes(query))
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (doc: DocumentFile) => {
    const currentText = newMessage;
    const cursorPos = textAreaRef.current?.selectionStart || currentText.length;
    const textBeforeCursor = currentText.substring(0, cursorPos);

    const atIndex = textBeforeCursor.lastIndexOf("@");
    const textBeforeAt = currentText.substring(0, atIndex);
    const textAfterCursor = currentText.substring(cursorPos);

    const mentionText = `@[${doc.name}](doc:${doc.id}) `;
    setNewMessage(textBeforeAt + mentionText + textAfterCursor);

    setMentionQuery(null);
    setSuggestions([]);

    setTimeout(() => {
      textAreaRef.current?.focus();
      const newCursorPos = (textBeforeAt + mentionText).length;
      textAreaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleMentionClick = (resourceId: string) => {
    setPreviewingResourceId(resourceId);
  };

  // Parse message content and render with document mention buttons
  const renderMessageContent = (content?: string) => {
    if (!content) return null;

    // Regex to find @[name](doc:id) patterns
    const mentionRegex = /@\[([^\]]+)\]\(doc:([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        parts.push(
          <ReactMarkdown key={`text-${lastIndex}`} remarkPlugins={[remarkGfm]}>
            {textBefore}
          </ReactMarkdown>
        );
      }

      // Add the document mention button
      const docName = match[1];
      const resourceId = match[2];
      parts.push(
        <button
          key={`doc-${resourceId}-${match.index}`}
          type="button"
          onClick={() => handleMentionClick(resourceId)}
          className="inline-flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors font-medium cursor-pointer border-0 mx-1"
        >
          <FileText size={14} className="inline mr-1.5" />
          {docName}
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last mention
    if (lastIndex < content.length) {
      const textAfter = content.substring(lastIndex);
      parts.push(
        <ReactMarkdown key={`text-${lastIndex}`} remarkPlugins={[remarkGfm]}>
          {textAfter}
        </ReactMarkdown>
      );
    }

    // If no mentions found, just render the whole content as markdown
    if (parts.length === 0) {
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      );
    }

    return <>{parts}</>;
  };

  const handleCreateThread = async () => {
    if (!newThreadTopic.trim() || !user?.id) return;

    try {
      const participantIds: string[] = [user.id, ...selectedParticipants];
      if (activeProject?.assignedAdvisorUserId) {
        participantIds.push(activeProject.assignedAdvisorUserId);
      }

      const threadId = await createThread(
        projectId,
        newThreadTopic.trim(),
        Array.from(new Set(participantIds)) // Ensure unique IDs
      );
      setSelectedParticipants([]);
      setNewThreadTopic("");
      setShowCreateThread(false);
      setActiveThread(threadId);
    } catch (err) {
      console.error("Failed to create thread:", err);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 mb-2">{error}</p>
            <Button onClick={clearError} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col border rounded-lg overflow-hidden bg-white">
      {/* Threads Sidebar */}
      <div className="w-full border-b bg-gray-50 flex flex-col">
        <div className="p-3 border-b bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">Channels</h3>
            {hasOwnerPermissions && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCreateThread(!showCreateThread)}
                className="h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            )}
          </div>

          {showCreateThread && (
            <div className="space-y-2 mt-2">
              <Input
                placeholder="Channel name (e.g., 'Financing Discussion')..."
                value={newThreadTopic}
                onChange={(e) => setNewThreadTopic(e.target.value)}
                className="text-sm"
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleCreateThread();
                }}
              />
              <MultiSelect
                options={memberOptions.map((m) => m.label)}
                value={selectedParticipants.map(
                  (id) => memberOptions.find((m) => m.value === id)?.label || ""
                )}
                onChange={(selectedLabels) => {
                  const selectedIds = selectedLabels
                    .map(
                      (label) =>
                        memberOptions.find((m) => m.label === label)?.value
                    )
                    .filter(Boolean) as string[];
                  setSelectedParticipants(selectedIds);
                }}
                placeholder="Select members to add..."
                label="Add Members"
              />
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleCreateThread}
                  disabled={!newThreadTopic.trim() || isLoading}
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateThread(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading && threads.length === 0 ? (
            <div className="p-3 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            </div>
          ) : (
            <div className="space-y-1 p-2 ">
              {threads.map((thread) => (
                <div key={thread.id} className="flex items-center group">
                  <button
                    onClick={() => setActiveThread(thread.id)}
                    className={`flex-1 text-left p-2 rounded text-sm transition-colors ${
                      activeThreadId === thread.id
                        ? "bg-blue-100 font-semibold text-blue-800"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    # {thread.topic || "General"}
                  </button>
                  {hasOwnerPermissions && (
                      <button
                        onClick={() => setManagingThread(thread)}
                        className="p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical size={16} />
                      </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeThreadId ? (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender?.id === user?.id
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.sender?.id === user?.id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <div className="text-xs opacity-75 mb-1 font-semibold">
                      {message.sender?.full_name || "User"}
                    </div>
                    <div className="text-sm prose prose-sm max-w-none">
                      {renderMessageContent(message.content)}
                    </div>
                    <div className="text-xs opacity-75 mt-1 text-right">
                      {formatMessageTime(message.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t bg-white relative">
              <AnimatePresence>
                {mentionQuery !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-3 right-3 mb-2 border rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto z-10"
                  >
                    {suggestions.length > 0 ? (
                      suggestions.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => handleSuggestionClick(doc)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                        >
                          <FileText
                            size={16}
                            className="mr-2 text-gray-500 flex-shrink-0"
                          />
                          <span className="truncate">{doc.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        {isLoadingDocuments
                          ? "Loading documents..."
                          : "No matching documents found."}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex space-x-2">
                <textarea
                  ref={textAreaRef}
                  value={newMessage}
                  onChange={handleTextAreaChange}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 min-h-[40px] max-h-32 resize-none"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Select a channel to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {previewingResourceId && (
        <DocumentPreviewModal
          resourceId={previewingResourceId}
          onClose={() => setPreviewingResourceId(null)}
        />
      )}
      {managingThread && hasOwnerPermissions && (
        <ManageChannelMembersModal
          thread={managingThread}
          isOpen={!!managingThread}
          onClose={() => setManagingThread(null)}
        />
      )}
    </div>
  );
};
