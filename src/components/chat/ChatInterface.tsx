// src/components/chat/ChatInterface.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatStore, AttachableDocument } from "../../stores/useChatStore";
import { useOrgStore } from "@/stores/useOrgStore";
import { useAuthStore } from "../../stores/useAuthStore";
import { useProjects } from "../../hooks/useProjects";
import { useProjectEligibleMembers } from "../../hooks/useProjectEligibleMembers";
import { usePermissionStore } from "@/stores/usePermissionStore";
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
  Reply,
  ArrowUp,
  User,
} from "lucide-react";

interface ChatInterfaceProps {
  projectId: string;
  onMentionClick?: (resourceId: string) => void;
  embedded?: boolean; // when true, render without outer border/radius so parents can frame it
  isHovered?: boolean; // when true, show channel selector
}

import { ManageChannelMembersModal } from "./ManageChannelMembersModal";
import { ChatThread } from "@/types/enhanced-types";
import { RichTextInput, RichTextInputRef } from "./RichTextInput";
import { cn } from "@/utils/cn";

// ProjectMessage type matching what useChatStore provides (includes sender, reply_to, etc.)
interface ProjectMessage {
  id: number | string;
  thread_id: string;
  user_id: string;
  content?: string;
  created_at: string;
  reply_to?: number | null;
  status?: 'sending' | 'delivered' | 'failed';
  isOptimistic?: boolean;
  isFadingOut?: boolean;
  sender?: {
    id: string;
    full_name?: string;
    email?: string;
  };
  repliedMessage?: ProjectMessage | null;
}


interface BlockedDocInfo {
  resourceId: string;
  missingUserIds: string[];
}

interface BlockedState {
  threadId: string;
  message: string;
  docs: BlockedDocInfo[];
}

type MentionSuggestion = 
  | { type: 'document'; data: AttachableDocument }
  | { type: 'user'; data: { id: string; name: string; email?: string } };

const mentionLookupRegex = /@\[([^\]]+)\]\((doc|user):([^)]+)\)/g;

function extractMentionNames(content: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!content) return map;

  const regex = new RegExp(mentionLookupRegex.source, 'g');
  let match;
  while ((match = regex.exec(content)) !== null) {
    // match[1] is name, match[2] is type (doc/user), match[3] is id
    map.set(match[3], match[1]);
  }
  return map;
}


export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  projectId,
  onMentionClick,
  embedded = false,
  isHovered = false,
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
  const { isOwner, members, currentOrg } = useOrgStore();
  const {
    projectMemberIds,
    advisorProfile,
    eligibleMembers,
  } = useProjectEligibleMembers({
    projectId,
    members,
    advisorUserId: activeProject?.assignedAdvisorUserId,
  });

  const [newMessage, setNewMessage] = useState("");
  const permissions = usePermissionStore((state) => state.permissions);
  const [managingThread, setManagingThread] = useState<ChatThread | null>(null);
  const [showCreateThreadModal, setShowCreateThreadModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ProjectMessage | null>(null);
  const messageRefs = useRef<Map<number | string, HTMLDivElement>>(new Map());

  // Check if user is an owner of the org that owns this project
  const hasOwnerPermissions = useMemo(() => {
    if (!activeProject?.owner_org_id || !currentOrg) return false;
    const canManage = isOwner && currentOrg.id === activeProject.owner_org_id;
    console.log(`[ChatInterface] Has owner permissions: ${canManage}, isOwner: ${isOwner}, currentOrg: ${currentOrg?.id}, projectOwner: ${activeProject.owner_org_id}`);
    return canManage;
  }, [isOwner, currentOrg, activeProject]);

  const getDisplayLabel = useCallback((
    userId: string,
    name?: string | null,
    email?: string | null
  ) => {
    return (name && name.trim()) || (email && email.trim()) || "Member";
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

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [blockedState, setBlockedState] = useState<BlockedState | null>(null);
  const [isProcessingBlocked, setIsProcessingBlocked] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const richTextInputRef = useRef<RichTextInputRef>(null);

  const canCreateThreads = useMemo(() => {
    if (!user) return false;
    if (hasOwnerPermissions) return true;
    return activeProject?.assignedAdvisorUserId === user.id;
  }, [hasOwnerPermissions, activeProject?.assignedAdvisorUserId, user]);

  const memberOptions = useMemo(() => {
    return eligibleMembers
      .filter((member) => member.user_id !== user?.id)
      .map((member) => ({
        value: member.user_id,
        label: getDisplayLabel(member.user_id, member.userName, member.userEmail),
        role: member.role,
      }));
  }, [eligibleMembers, getDisplayLabel, user]);

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

  // Check if user can grant access (has Edit permissions on all blocked docs OR is Owner/Advisor)
  const canGrantAccess = useMemo(() => {
    if (!blockedState || blockedState.docs.length === 0) return false;
    
    // Owners and Advisors can always grant access
    if (hasOwnerPermissions) return true;
    const isAssignedAdvisor = activeProject?.assignedAdvisorUserId === user?.id;
    if (isAssignedAdvisor) return true;
    
    // For members, check if they have Edit permissions on ALL blocked docs
    return blockedState.docs.every((doc) => {
      const permission = permissions[doc.resourceId];
      return permission === 'edit';
    });
  }, [blockedState, hasOwnerPermissions, activeProject?.assignedAdvisorUserId, user?.id, permissions]);

  // Check if user is an Owner (not advisor) - only Owners can create threads
  const isOwnerUser = useMemo(() => {
    return isOwner && hasOwnerPermissions;
  }, [isOwner, hasOwnerPermissions]);

  useEffect(() => {
    if (projectId) {
      loadThreadsForProject(projectId);
    }
  }, [projectId, loadThreadsForProject]);


  useEffect(() => {
    if (threads.length === 0) return;

    const hasActiveThread =
      !!activeThreadId && threads.some((thread) => thread.id === activeThreadId);
    if (hasActiveThread) return;

    const generalThread = threads.find(
      (thread) => thread.topic?.trim().toLowerCase() === "general"
    );

    setActiveThread(generalThread ? generalThread.id : threads[0].id);
  }, [threads, activeThreadId, setActiveThread]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);


  useEffect(() => {
    setShowDocPicker(false);
    setBlockedState(null);
    setReplyingTo(null); // Clear reply when switching threads
  }, [activeThreadId]);


  const processSend = async (threadId: string, message: string, replyTo?: number | null) => {
    try {
      await sendMessage(threadId, message.trim(), replyTo);
      setNewMessage("");
      setBlockedState(null);
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
        setNewMessage(message);
      } else {
        console.error("Failed to send message:", err);
      }
      return false;
    }
  };

  const canSendMessage = useMemo(() => {
    // Check if message has content (either text or document mentions)
    if (!newMessage) return false;
    const trimmed = newMessage.trim();
    return trimmed.length > 0;
  }, [newMessage]);

  const handleSendMessage = async () => {
    if (!canSendMessage || !activeThreadId) return;
    const replyToId = replyingTo ? Number(replyingTo.id) : null;
    await processSend(activeThreadId, newMessage, replyToId);
    setReplyingTo(null); // Clear reply after sending
  };

  const handleReplyClick = (message: ProjectMessage) => {
    setReplyingTo(message);
    // Focus the input
    if (richTextInputRef.current) {
      richTextInputRef.current.focus();
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const scrollToMessage = (messageId: number | string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      messageElement.classList.add('ring-2', 'ring-blue-400', 'ring-opacity-75');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-blue-400', 'ring-opacity-75');
      }, 2000);
    }
  };

  const handleTextChange = (text: string) => {
    setNewMessage(text);

    // Check if user is typing an @ mention
    const lines = text.split('\n');
    const lastLine = lines[lines.length - 1];
    const atMatch = lastLine.match(/@([\w\s.-]*)$/);

    if (atMatch) {
      const query = atMatch[1].toLowerCase();
      setMentionQuery(query);

      const docSuggestions: MentionSuggestion[] = attachableDocuments
        .filter((doc) => doc.name.toLowerCase().includes(query))
        .map(doc => ({ type: 'document', data: doc }));

      const userSuggestions: MentionSuggestion[] = participants
        .filter(p => p.user_id !== user?.id) // Don't suggest self
        .map(p => {
            const name = participantLabelLookup.get(p.user_id) || "Unknown";
            return {
                type: 'user' as const,
                data: {
                    id: p.user_id,
                    name: name,
                    email: p.user?.email
                }
            };
        })
        .filter(u => u.data.name.toLowerCase().includes(query) || u.data.email?.toLowerCase().includes(query));

      // Combine and limit
      setSuggestions([...userSuggestions, ...docSuggestions].slice(0, 5));
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: MentionSuggestion) => {
    // Use the RichTextInput's insertAtCursor method to insert at current position
    if (richTextInputRef.current) {
      let mentionText = '';
      if (suggestion.type === 'document') {
          const doc = suggestion.data as AttachableDocument;
          mentionText = `@[${doc.name}](doc:${doc.resourceId}) `;
      } else {
          const u = suggestion.data as { id: string, name: string };
          mentionText = `@[${u.name}](user:${u.id}) `;
      }
      
      // If we're completing an @ mention, tell insertAtCursor to replace the query
      if (mentionQuery !== null) {
        const queryToReplace = `@${mentionQuery}`;
        richTextInputRef.current.insertAtCursor(mentionText, queryToReplace);
      } else {
        // Just insert at current cursor position (+ button case)
        richTextInputRef.current.insertAtCursor(mentionText);
      }
    }

    setMentionQuery(null);
    setSuggestions([]);
    setShowDocPicker(false);
  };

  const handleMentionClick = (resourceId: string) => {
    setPreviewingResourceId(resourceId);
  };

  const handleGrantAccess = async () => {
    if (!blockedState || !canGrantAccess) return;
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

  const handleCreateRestrictedThread = async () => {
    if (!blockedState || !isOwnerUser) return;
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

  // Helper function to truncate content while preserving complete mentions
  const truncateContentPreservingMentions = (content: string, maxLength: number = 100): string => {
    if (!content || content.length <= maxLength) return content;
    
    // Find all mentions first using matchAll to avoid regex state issues
    const mentionRegex = /@\[([^\]]+)\]\((doc|user):([^)]+)\)/g;
    const matches = Array.from(content.matchAll(mentionRegex));
    const mentions: Array<{ start: number; end: number }> = [];
    
    matches.forEach((match) => {
      const matchIndex = match.index ?? 0;
      mentions.push({
        start: matchIndex,
        end: matchIndex + match[0].length
      });
    });
    
    // Find the truncation point that doesn't cut a mention
    let truncateAt = maxLength;
    
    // Check if we're cutting through a mention
    for (const mention of mentions) {
      if (mention.start < maxLength && mention.end > maxLength) {
        // We're cutting through this mention, truncate after it instead
        truncateAt = mention.end;
        break;
      }
    }
    
    // If truncating after a mention would be too long, just truncate at maxLength
    // (This prevents extremely long previews if a mention is very long)
    if (truncateAt > maxLength * 1.5) {
      truncateAt = maxLength;
    }
    
    return content.substring(0, truncateAt) + 
           (truncateAt < content.length ? '...' : '');
  };

  // Parse message content and render with document mention buttons
  const renderMessageContent = (content?: string) => {
    if (!content) return null;

    // Regex to find @[name](doc:id) patterns
    const mentionRegex = /@\[([^\]]+)\]\((doc|user):([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Use matchAll to find all mentions at once, avoiding regex state issues
    const matches = Array.from(content.matchAll(mentionRegex));

    matches.forEach((match) => {
      const matchIndex = match.index ?? 0;
      
      // Add text before the mention
      if (matchIndex > lastIndex) {
        const textBefore = content.substring(lastIndex, matchIndex);
        parts.push(
          <ReactMarkdown key={`text-${lastIndex}`} remarkPlugins={[remarkGfm]}>
            {textBefore}
          </ReactMarkdown>
        );
      }

      // Add the mention button/pill
      const name = match[1];
      const type = match[2]; // 'doc' or 'user'
      const id = match[3];
      
      if (type === 'doc') {
          parts.push(
            <button
              key={`doc-${id}-${matchIndex}`}
              type="button"
              onClick={() => handleMentionClick(id)}
              className="inline-flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors font-medium cursor-pointer border-0 mx-1 align-middle"
            >
              <FileText size={14} className="inline mr-1.5" />
              {name}
            </button>
          );
      } else {
          // User mention
          parts.push(
            <span
              key={`user-${id}-${matchIndex}`}
              className="inline-flex items-center text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md font-medium border-0 mx-1 align-middle"
            >
              <span className="mr-1 font-bold">@</span>
              {name}
            </span>
          );
      }

      lastIndex = matchIndex + match[0].length;
    });

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
      // Note: createThread automatically adds the current user as a participant
      const threadId = await createThread(
        projectId,
        topic.trim(),
        selectedMemberIds
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

  // Group messages by day for rendering date dividers. Must be declared at top level
  // to keep hook order stable regardless of conditional UI branches.
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

  const activeThread = threads.find(t => t.id === activeThreadId);
  const channelName = activeThread?.topic || "General";

  return (
    <div 
      className={embedded ? "h-full flex" : "h-full flex rounded-2xl overflow-hidden bg-white/70 backdrop-blur-xl border border-gray-200 shadow-lg"}
    >
      {/* Threads Sidebar - Collapsible on hover */}
      <div className={cn(
        "flex-shrink-0 bg-white/60 backdrop-blur border-r border-gray-100 flex flex-col transition-all duration-300 ease-in-out overflow-hidden",
        isHovered ? "w-48" : "w-0"
      )}>
        {isHovered && (
          <>
            <div className="p-3 border-b border-gray-100 bg-white/60">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-gray-800 text-sm">Channels</h3>
                {hasOwnerPermissions && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCreateThreadModal(true)}
                    className="h-7 px-2 text-xs rounded-md border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
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
                <div key={thread.id} className="flex items-center">
                  <div
                    onClick={() => setActiveThread(thread.id)}
                    className={`relative flex-1 text-left p-2 pr-8 rounded-md text-sm transition-all border cursor-pointer ${
                      activeThreadId === thread.id
                        ? "bg-blue-100/80 text-blue-800 font-semibold border-blue-200 shadow-sm"
                        : "border-transparent hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    <Hash size={14} className="inline mr-1" />
                    {thread.topic || "General"}
                    {hasOwnerPermissions && (
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
                        <button
                          type="button"
                          aria-label="Manage channel"
                          onClick={(e) => {
                            e.stopPropagation();
                            setManagingThread(thread);
                          }}
                          className="p-1 rounded-full hover:bg-gray-100"
                        >
                          <MoreVertical size={14} className="text-gray-500" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area - Fixed width for messages */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Channel name header when sidebar is collapsed */}
        {!isHovered && activeThreadId && (
          <div className="px-3 py-2 border-b border-gray-100 bg-white/60 backdrop-blur flex items-center">
            <Hash size={14} className="text-gray-600 mr-2" />
            <span className="font-semibold text-gray-800 text-sm">{channelName}</span>
          </div>
        )}
        {activeThreadId ? (
          <>
            <div
              ref={messageListRef}
              className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3 max-w-full"
            >
              {/* Loading shimmer when switching channels */}
              {isLoading && messages.length === 0 && (
                <div className="space-y-3">
                  <div className="w-2/3 h-12 rounded-lg bg-gray-100 animate-pulse" />
                  <div className="w-1/2 h-12 rounded-lg bg-gray-100 animate-pulse ml-auto" />
                  <div className="w-3/4 h-12 rounded-lg bg-gray-100 animate-pulse" />
                </div>
              )}

              {/* Group messages by day with date dividers */}
              {groupedMessages.map((g) => (
                <div key={g.key} className="space-y-3">
                  <div className="flex items-center justify-center my-2">
                    <div className="h-px bg-gray-200 flex-1" />
                    <span className="mx-3 text-[11px] font-medium text-gray-500 px-2 py-1 rounded-full bg-white/80 border border-gray-200 shadow-sm">
                      {g.label}
                    </span>
                    <div className="h-px bg-gray-200 flex-1" />
                  </div>
                  {g.items.map((message) => (
                    <motion.div
                      key={message.id}
                      ref={(el) => {
                        if (el) messageRefs.current.set(message.id, el);
                      }}
                      id={`message-${message.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`flex group ${
                        message.sender?.id === user?.id ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div className="flex flex-col relative">
                        {/* Reply preview in message bubble */}
                        {message.repliedMessage && (
                          <div
                            onClick={() => scrollToMessage(message.repliedMessage!.id)}
                            className={`mb-2 px-2 py-1.5 rounded-md border-l-2 cursor-pointer transition-colors ${
                              message.sender?.id === user?.id
                                ? "bg-blue-500/30 border-blue-400 hover:bg-blue-500/40"
                                : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                            }`}
                          >
                            <div className="text-[10px] font-semibold opacity-75 mb-0.5">
                              {message.repliedMessage.sender?.full_name || "User"}
                            </div>
                            <div className="text-[11px] line-clamp-2 opacity-80">
                              {renderMessageContent(
                                truncateContentPreservingMentions(message.repliedMessage.content || '', 100)
                              )}
                            </div>
                          </div>
                        )}
                        <div
                          className={`max-w-xs lg:max-w-md px-3 py-2 rounded-xl shadow-sm relative ${
                            message.sender?.id === user?.id
                              ? "bg-blue-600 text-white"
                              : "bg-white border border-gray-200 text-gray-800"
                          } ${
                            message.isOptimistic ? "opacity-75" : ""
                          }`}
                        >
                          {/* Reply button - appears on hover */}
                          {/* Position on right for other users' messages, left for own messages */}
                          <button
                            type="button"
                            onClick={() => handleReplyClick(message)}
                            className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full z-10 ${
                              message.sender?.id === user?.id
                                ? "-left-10 bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                                : "-right-10 bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-sm"
                            }`}
                            aria-label="Reply to message"
                            title="Reply to this message"
                          >
                            <Reply size={14} />
                          </button>
                          <div className="text-[11px] opacity-75 mb-1 font-semibold">
                            {message.sender?.full_name || "User"}
                          </div>
                          <div className="text-sm prose prose-sm max-w-none">
                            {renderMessageContent(message.content)}
                          </div>
                          <div className="text-[11px] opacity-75 mt-1 text-right">
                            {formatMessageTime(message.created_at)}
                          </div>
                        </div>
                        {/* iMessage-style status text below message with smooth fade-out */}
                        {message.sender?.id === user?.id && message.status && (
                          <motion.div
                            initial={{ opacity: 1 }}
                            animate={{ 
                              opacity: message.isFadingOut ? 0 : 1 
                            }}
                            transition={{ 
                              duration: 0.4, 
                              ease: "easeOut" 
                            }}
                            className="text-[10px] text-gray-500 mt-0.5 text-right pr-1"
                          >
                            {message.status === 'sending' && (
                              <span className="opacity-70">Sending...</span>
                            )}
                            {message.status === 'delivered' && (
                              <span className="opacity-60">Delivered</span>
                            )}
                            {message.status === 'failed' && (
                              <span className="text-red-500">Failed to send</span>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))}
            </div>

            <div className="p-3 bg-white/60 backdrop-blur relative border-t border-gray-100">
              {/* Reply preview above input */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-2 px-3 py-2 bg-blue-50 border-l-4 border-blue-500 rounded-md flex items-start justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-blue-700 mb-1">
                        Replying to {replyingTo.sender?.full_name || "User"}
                      </div>
                      <div className="text-sm text-gray-700 line-clamp-2">
                        {renderMessageContent(
                          truncateContentPreservingMentions(replyingTo.content || '', 100)
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelReply}
                      className="ml-2 p-1 rounded hover:bg-blue-100 text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label="Cancel reply"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {mentionQuery !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-3 right-3 mb-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto z-10"
                  >
                    {suggestions.length > 0 ? (
                      suggestions.map((suggestion) => {
                        const key = suggestion.type === 'document' 
                            ? `doc-${suggestion.data.resourceId}`
                            : `user-${suggestion.data.id}`;
                        const name = suggestion.data.name;
                        
                        return (
                        <button
                          key={key}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center"
                        >
                          {suggestion.type === 'document' ? (
                              <FileText
                                size={16}
                                className="mr-2 text-gray-500 flex-shrink-0"
                              />
                          ) : (
                              <User
                                size={16}
                                className="mr-2 text-blue-500 flex-shrink-0"
                              />
                          )}
                          <span className="truncate">{name}</span>
                        </button>
                      )})
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
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  {showDocPicker && (
                    <div className="absolute bottom-[calc(100%+0.5rem)] left-0 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
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
                              onClick={() => handleSuggestionClick({ type: 'document', data: doc })}
                              className="w-full flex items-start px-3 py-2 text-left hover:bg-gray-50"
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
                  <div className="flex items-stretch border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowDocPicker((prev) => !prev)}
                      disabled={!activeThreadId}
                      className="h-11 w-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 rounded-l-xl flex-shrink-0"
                      title="Attach document"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <RichTextInput
                    ref={richTextInputRef}
                    value={newMessage}
                    onChange={handleTextChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    disabled={!activeThreadId}
                    minHeight={BASE_INPUT_HEIGHT}
                    maxHeight={160}
                  />
                  </div>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!canSendMessage || isLoading}
                  
                  className="h-11 px-4 shadow-sm hover:shadow-md transition-shadow"
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
        projectId={projectId}
      />
      {blockedState && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!isProcessingBlocked) {
              setBlockedState(null);
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
              <Button
                onClick={handleGrantAccess}
                disabled={isProcessingBlocked || !canGrantAccess}
              >
                Grant access and send
              </Button>
              <Button
                variant="outline"
                onClick={handleCreateRestrictedThread}
                disabled={isProcessingBlocked || !isOwnerUser}
              >
                Create new thread with permitted members
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!isProcessingBlocked) {
                    setBlockedState(null);
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
