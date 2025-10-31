// src/components/chat/ChatInterface.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatStore, AttachableDocument } from "../../stores/useChatStore";
import { useOrgStore } from "@/stores/useOrgStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useProjects } from "../../hooks/useProjects";
import { supabase } from "../../../lib/supabaseClient";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/Button";
import { DocumentPreviewModal } from "../documents/DocumentPreviewModal";
import { Modal } from "../ui/Modal";
import { CreateChannelModal } from "./CreateChannelModal";
import {
  MessageCircle,
  Send,
  Plus,
  Loader2,
  AlertCircle,
  MoreVertical,
  FileText,
  X,
  Hash,
  PanelRightOpen,
} from "lucide-react";

interface ChatInterfaceProps {
  projectId: string;
  onMentionClick?: (resourceId: string) => void;
  embedded?: boolean; // when true, render without outer border/radius so parents can frame it
}

import { ManageChannelMembersModal } from "./ManageChannelMembersModal";
import { ChatThread } from "@/types/enhanced-types";


interface BlockedDocInfo {
  resourceId: string;
  missingUserIds: string[];
}

interface BlockedState {
  threadId: string;
  message: string;
  docs: BlockedDocInfo[];
}

const mentionLookupRegex = /@\[([^\]]+)\]\(doc:([^)]+)\)/g;

function extractMentionNames(content: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!content) return map;

  const regex = new RegExp(mentionLookupRegex.source, 'g');
  let match;
  while ((match = regex.exec(content)) !== null) {
    map.set(match[2], match[1]);
  }
  return map;
}


export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  projectId,
  onMentionClick,
  embedded = false,
}) => {
  const BASE_INPUT_HEIGHT = 44; // px, matches Button h-11
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
    attachableDocuments,
    loadAttachableDocuments,
    isLoadingAttachable,
  } = useChatStore();

  const { user } = useAuthStore();
  const { activeProject } = useProjects();

  const [previewingResourceId, setPreviewingResourceId] = useState<
    string | null
  >(null);
  
  // State to track which members have access to this project
  const [projectMemberIds, setProjectMemberIds] = useState<Set<string>>(new Set());

  const [newMessage, setNewMessage] = useState("");
  const { isOwner, members, currentOrg } = useOrgStore();
  const [managingThread, setManagingThread] = useState<ChatThread | null>(null);
  const [showCreateThreadModal, setShowCreateThreadModal] = useState(false);

  const baseParticipantIds = useMemo(() => {
    const ids = new Set<string>();
    if (user?.id) ids.add(user.id);
    if (activeProject?.assignedAdvisorUserId) ids.add(activeProject.assignedAdvisorUserId);
    return Array.from(ids);
  }, [user?.id, activeProject?.assignedAdvisorUserId]);

  // Check if user is an owner of the org that owns this project
  const hasOwnerPermissions = useMemo(() => {
    if (!activeProject?.owner_org_id || !currentOrg) return false;
    const canManage = isOwner && currentOrg.id === activeProject.owner_org_id;
    console.log(`[ChatInterface] Has owner permissions: ${canManage}, isOwner: ${isOwner}, currentOrg: ${currentOrg?.id}, projectOwner: ${activeProject.owner_org_id}`);
    return canManage;
  }, [isOwner, currentOrg, activeProject]);

  // Filter members to only show those with access to this project
  // This state is now handled below with useState

  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!projectId) {
        setProjectMemberIds(new Set());
        return;
      }

      try {
        // Get all users who have been granted access to this project
        const { data: grants, error } = await supabase
          .from('project_access_grants')
          .select('user_id')
          .eq('project_id', projectId);

        if (error) {
          console.error('[ChatInterface] Failed to fetch project members:', error);
          setProjectMemberIds(new Set());
          return;
        }

        // Add the advisor if assigned
        const userIds = new Set(grants?.map(g => g.user_id) || []);
        if (activeProject?.assignedAdvisorUserId) {
          userIds.add(activeProject.assignedAdvisorUserId);
        }

        setProjectMemberIds(userIds);
      } catch (err) {
        console.error('[ChatInterface] Error fetching project members:', err);
        setProjectMemberIds(new Set());
      }
    };

    fetchProjectMembers();
  }, [projectId, activeProject?.assignedAdvisorUserId]);

  const getDisplayLabel = useCallback((
    userId: string,
    name?: string | null,
    email?: string | null
  ) => {
    const base = (name && name.trim()) || (email && email.trim()) || "Member";
    const suffix = userId.slice(0, 6);
    return `${base} (${suffix})`;
  }, []);

  const participantLabelLookup = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => {
      map.set(
        member.user_id,
        getDisplayLabel(member.user_id, member.userName, member.userEmail)
      );
    });
    participants.forEach((participant) => {
      if (participant.user) {
        map.set(
          participant.user_id,
          getDisplayLabel(
            participant.user_id,
            participant.user.full_name,
            participant.user.email
          )
        );
      }
    });
    return map;
  }, [getDisplayLabel, members, participants]);

  const baseParticipantLabels = useMemo(() => {
    return baseParticipantIds.map((id) => {
      if (id === user?.id) return "You";
      return (
        participantLabelLookup.get(id) ||
        getDisplayLabel(id, undefined, undefined)
      );
    });
  }, [baseParticipantIds, participantLabelLookup, user?.id, getDisplayLabel]);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AttachableDocument[]>([]);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [blockedState, setBlockedState] = useState<BlockedState | null>(null);
  const [isProcessingBlocked, setIsProcessingBlocked] = useState(false);
  const [accessRequested, setAccessRequested] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const canCreateThreads = useMemo(() => {
    if (!user) return false;
    if (hasOwnerPermissions) return true;
    return activeProject?.assignedAdvisorUserId === user.id;
  }, [hasOwnerPermissions, activeProject?.assignedAdvisorUserId, user]);

  const memberOptions = useMemo(() => {
    const baseSet = new Set(baseParticipantIds);
    return members
      .filter((m) => {
        if (baseSet.has(m.user_id)) return false;
        if (m.user_id === user?.id) return false;
        return projectMemberIds.has(m.user_id);
      })
      .map((m) => ({
        value: m.user_id,
        label: getDisplayLabel(m.user_id, m.userName, m.userEmail),
      }));
  }, [baseParticipantIds, getDisplayLabel, members, projectMemberIds, user]);

  const blockedDocDetails = useMemo(() => {
    if (!blockedState) return [] as Array<{
      resourceId: string;
      name: string;
      missing: { id: string; name: string }[];
    }>;

    const lookup = extractMentionNames(blockedState.message);
    return blockedState.docs.map((doc) => ({
      resourceId: doc.resourceId,
      name: lookup.get(doc.resourceId) || "Document",
      missing: doc.missingUserIds.map((id) => ({
        id,
        name:
          participantLabelLookup.get(id) || getDisplayLabel(id, undefined, undefined),
      })),
    }));
  }, [blockedState, participantLabelLookup, getDisplayLabel]);

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

  useEffect(() => {
    setShowDocPicker(false);
    setBlockedState(null);
    setAccessRequested(false);
  }, [activeThreadId]);

  // Initialize textarea height on mount and when message changes from programmatic updates
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      const raw = textAreaRef.current.scrollHeight;
      const next = Math.min(Math.max(raw, BASE_INPUT_HEIGHT), 160);
      textAreaRef.current.style.height = `${next}px`;
    }
  }, [newMessage]);

  const processSend = async (threadId: string, message: string) => {
    try {
      await sendMessage(threadId, message.trim());
      setNewMessage("");
      setBlockedState(null);
      setAccessRequested(false);
      return true;
    } catch (err) {
      if (typeof err === "object" && err && (err as any).code === "DOC_ACCESS_DENIED") {
        const blockedDocs: BlockedDocInfo[] = ((err as any).blocked || []).map((doc: any) => ({
          resourceId: doc.resource_id ?? doc.resourceId,
          missingUserIds: doc.missing_user_ids ?? doc.missingUserIds ?? [],
        }));

        setBlockedState({
          threadId,
          message,
          docs: blockedDocs,
        });
        setAccessRequested(false);
        setNewMessage(message);
      } else {
        console.error("Failed to send message:", err);
      }
      return false;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeThreadId) return;
    await processSend(activeThreadId, newMessage);
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
      const filtered = attachableDocuments
        .filter((doc) => doc.name.toLowerCase().includes(query))
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }

    // Auto-size the textarea height on input with baseline equal to send button height
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      const raw = textAreaRef.current.scrollHeight;
      const next = Math.min(Math.max(raw, BASE_INPUT_HEIGHT), 160);
      textAreaRef.current.style.height = `${next}px`;
    }
  };

  const handleSuggestionClick = (doc: AttachableDocument) => {
    const currentText = newMessage;
    const cursorPos = textAreaRef.current?.selectionStart || currentText.length;
    const textBeforeCursor = currentText.substring(0, cursorPos);

    const atIndex = textBeforeCursor.lastIndexOf("@");
    const textBeforeAt = currentText.substring(0, atIndex);
    const textAfterCursor = currentText.substring(cursorPos);

    const mentionText = `@[${doc.name}](doc:${doc.resourceId}) `;
    setNewMessage(textBeforeAt + mentionText + textAfterCursor);

    setMentionQuery(null);
    setSuggestions([]);
    setShowDocPicker(false);

    setTimeout(() => {
      textAreaRef.current?.focus();
      const newCursorPos = (textBeforeAt + mentionText).length;
      textAreaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleMentionClick = (resourceId: string) => {
    setPreviewingResourceId(resourceId);
  };

  const handleGrantAccess = async () => {
    if (!blockedState || !hasOwnerPermissions) return;
    setIsProcessingBlocked(true);
    try {
      for (const doc of blockedState.docs) {
        await Promise.all(
          doc.missingUserIds.map((userId) =>
            supabase.rpc('set_permission_for_resource', {
              p_resource_id: doc.resourceId,
              p_user_id: userId,
              p_permission: 'view',
            }).then(({ error }) => {
              if (error) {
                throw new Error(error.message || 'Failed to grant access');
              }
            })
          )
        );
      }

      await loadAttachableDocuments(blockedState.threadId);
      await processSend(blockedState.threadId, blockedState.message);
    } catch (error) {
      console.error('Failed to grant access:', error);
    } finally {
      setIsProcessingBlocked(false);
    }
  };

  const handleRequestAccess = async () => {
    if (!blockedState) return;
    setIsProcessingBlocked(true);
    try {
      for (const doc of blockedState.docs) {
        const { error } = await supabase.functions.invoke('request-document-access', {
          body: {
            resource_id: doc.resourceId,
            thread_id: blockedState.threadId,
            missing_user_ids: doc.missingUserIds,
          },
        });
        if (error) {
          throw new Error(error.message || 'Failed to request access');
        }
      }
      setAccessRequested(true);
    } catch (error) {
      console.error('Failed to request access:', error);
    } finally {
      setIsProcessingBlocked(false);
    }
  };

  const handleSendWithoutDocs = async () => {
    if (!blockedState) return;
    let sanitized = blockedState.message;
    const lookup = extractMentionNames(blockedState.message);
    blockedState.docs.forEach((doc) => {
      const label = lookup.get(doc.resourceId) || 'document';
      const regex = new RegExp(`@\\[[^\\]]+\\]\\(doc:${doc.resourceId}\\)`, 'g');
      sanitized = sanitized.replace(regex, label);
    });

    setNewMessage(sanitized);
    setIsProcessingBlocked(true);
    try {
      await processSend(blockedState.threadId, sanitized);
    } finally {
      setIsProcessingBlocked(false);
    }
  };

  const handleCreateRestrictedThread = async () => {
    if (!blockedState || !canCreateThreads) return;
    const blockedUserSet = new Set<string>();
    blockedState.docs.forEach((doc) => {
      doc.missingUserIds.forEach((id) => blockedUserSet.add(id));
    });

    const allowedParticipants = participants
      .map((p) => p.user_id)
      .filter((id) => !blockedUserSet.has(id));

    if (user?.id && !allowedParticipants.includes(user.id)) {
      allowedParticipants.push(user.id);
    }

    const uniqueParticipants = Array.from(new Set(allowedParticipants));
    if (uniqueParticipants.length === 0) {
      console.warn('No eligible participants for the new thread');
      return;
    }

    setIsProcessingBlocked(true);
    try {
      const docNames = blockedDocDetails.map((doc) => doc.name).filter(Boolean);
      const topicBase = docNames.length > 0 ? `Docs: ${docNames.join(', ')}` : 'Restricted discussion';
      const topic = topicBase.slice(0, 60);

      const newThreadId = await createThread(
        projectId,
        topic,
        uniqueParticipants
      );

      setActiveThread(newThreadId);
      await processSend(newThreadId, blockedState.message);
    } catch (error) {
      console.error('Failed to create restricted thread:', error);
    } finally {
      setIsProcessingBlocked(false);
    }
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

  const handleCreateChannel = async (
    topic: string,
    selectedMemberIds: string[]
  ) => {
    if (!user?.id) return;

    try {
      const participantsSet = new Set<string>(baseParticipantIds);
      selectedMemberIds.forEach((id) => participantsSet.add(id));

      const threadId = await createThread(
        projectId,
        topic.trim(),
        Array.from(participantsSet)
      );
      setShowCreateThreadModal(false);
      setActiveThread(threadId);
    } catch (err) {
      console.error("Failed to create thread:", err);
      throw err;
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
    <div className={embedded ? "h-full flex" : "h-full flex border rounded-lg overflow-hidden bg-white"}>
      {/* Threads Drawer */}
      <div className="group relative flex-shrink-0 bg-gray-50 border-r">
        {/* Collapsed State - minimal, subtle indicator */}
        <div className="w-10 h-full flex flex-col items-center justify-center py-3 transition-opacity duration-300 group-hover:opacity-0">
          <div className="flex flex-col items-center text-gray-400">
            <PanelRightOpen size={18} className="opacity-60" />
          </div>
        </div>

        {/* Expanded State - Shows when hovered */}
        <div className="absolute top-0 left-0 w-48 h-full bg-gray-50 border-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto z-50 shadow-xl">
          <div className="p-3 border-b bg-white">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-800 text-sm">Channels</h3>
              {hasOwnerPermissions && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCreateThreadModal(true)}
                  className="h-7 px-2 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New
                </Button>
              )}
            </div>
            <div className="text-[11px] text-gray-500">Switch between discussion channels</div>
          </div>

          <div className="overflow-y-auto flex-1">
            {isLoading && threads.length === 0 ? (
              <div className="p-3 text-center">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            ) : (
              <div className="space-y-1 p-2">
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
                      <Hash size={14} className="inline mr-1" />
                      {thread.topic || "General"}
                    </button>
                    {hasOwnerPermissions && (
                      <button
                        onClick={() => setManagingThread(thread)}
                        className="p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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

            <div className="p-3 bg-white relative">
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
                          key={doc.resourceId}
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
                        {isLoadingAttachable
                          ? "Loading documents..."
                          : "No matching documents found."}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-end gap-2">
                <div className="relative flex-1 flex items-center border border-gray-300 rounded-md bg-white">
                  <button
                    type="button"
                    onClick={() => setShowDocPicker((prev) => !prev)}
                    disabled={!activeThreadId}
                    className="h-11 w-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    title="Attach document"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  {showDocPicker && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border rounded-lg shadow-lg z-20">
                      <div className="flex items-center justify-between px-3 py-2 border-b">
                        <span className="text-sm font-semibold text-gray-700">Shared documents</span>
                        <button
                          type="button"
                          onClick={() => setShowDocPicker(false)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {isLoadingAttachable ? (
                          <div className="px-3 py-4 text-sm text-gray-500 flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading...</span>
                          </div>
                        ) : attachableDocuments.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-gray-500">No documents are shared with all participants.</div>
                        ) : (
                          attachableDocuments.map((doc) => (
                            <button
                              key={doc.resourceId}
                              type="button"
                              onClick={() => handleSuggestionClick(doc)}
                              className="w-full flex items-start px-3 py-2 text-left hover:bg-gray-100"
                            >
                              <FileText className="h-4 w-4 text-gray-500 mt-0.5 mr-2" />
                              <div>
                                <div className="text-sm text-gray-800 truncate">{doc.name}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide">{doc.scope === "org" ? "Org" : "Project"}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
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
                    className="flex-1 h-[44px] max-h-40 px-3 py-2 border-0 focus:outline-none focus:ring-0 disabled:bg-gray-100 resize-none overflow-y-auto"
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isLoading}
                  className="h-11 px-4"
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
      <CreateChannelModal
        isOpen={showCreateThreadModal}
        onClose={() => setShowCreateThreadModal(false)}
        onCreate={handleCreateChannel}
        memberOptions={memberOptions}
        baseParticipantIds={baseParticipantIds}
        baseParticipantLabels={baseParticipantLabels}
        projectId={projectId}
      />
      {blockedState && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!isProcessingBlocked) {
              setBlockedState(null);
              setAccessRequested(false);
            }
          }}
          title="Document access required"
        >
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Some participants in this channel do not have permission to view the referenced documents. Choose how you want to proceed.
            </div>
            <div className="space-y-3">
              {blockedDocDetails.map((doc) => (
                <div key={doc.resourceId} className="border rounded-md p-3 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-800">{doc.name}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Missing access:
                  </div>
                  <ul className="text-sm text-gray-700 list-disc list-inside">
                    {doc.missing.map((user) => (
                      <li key={user.id}>{user.name}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="flex flex-col space-y-2">
              {hasOwnerPermissions && (
                <Button
                  onClick={handleGrantAccess}
                  disabled={isProcessingBlocked}
                >
                  Grant access and send
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleSendWithoutDocs}
                disabled={isProcessingBlocked}
              >
                Remove references and send
              </Button>
              <Button
                variant="outline"
                onClick={handleRequestAccess}
                disabled={isProcessingBlocked || accessRequested}
              >
                {accessRequested ? "Request sent" : "Request access from owners"}
              </Button>
              {canCreateThreads && (
                <Button
                  variant="outline"
                  onClick={handleCreateRestrictedThread}
                  disabled={isProcessingBlocked}
                >
                  Create new thread with permitted members
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  if (!isProcessingBlocked) {
                    setBlockedState(null);
                    setAccessRequested(false);
                  }
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
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
