// src/components/chat/AIChatInterface.tsx
"use client";

import React, { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "../ui/card";
import { cn } from "@/utils/cn";
import { Loader2, AlertCircle, MessageSquare, Reply } from "lucide-react";
import { Message, FieldContext } from "@/types/ask-ai-types";

interface AIChatInterfaceProps {
  messages: Message[];
  fieldContext: FieldContext | null;
  isLoading: boolean;
  isBuildingContext: boolean;
  contextError: string | null;
  hasActiveContext: boolean;
  onReplyClick?: (message: Message) => void; // Callback when user clicks reply
  onResolve?: () => void; // Callback to resolve the thread
  mode?: "ask-ai" | "underwriter";
}

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  messages,
  fieldContext,
  isLoading,
  isBuildingContext,
  contextError,
  hasActiveContext,
  onReplyClick,
  onResolve,
  mode = "ask-ai",
}) => {
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const scrollToMessage = (messageId: string) => {
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
  if (!hasActiveContext) {
    return (
      <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-all duration-300 mx-3 mb-10 border-gray-300 bg-gradient-to-br from-gray-50 to-blue-50/30 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-purple-50/30">
        <MessageSquare className="h-12 w-12 text-gray-400 mb-3 animate-pulse" />
        <p className="text-sm text-gray-600 text-center px-4">
          {mode === "underwriter" ? (
            <>
              <b>AI Underwriter</b> is ready.
              <br />
              Select a document in the vault to start underwriting.
            </>
          ) : (
            <>
              Click &quot;Ask AI&quot; buttons on form fields
              <br />
              to get AI assistance
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header for Resolution if applicable */}
      {onResolve && (
         <div className="flex items-center justify-between p-2 mx-3 mb-2 bg-blue-50 border border-blue-200 rounded-md shadow-sm">
            <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-700">Action Required</span>
            </div>
            <button
                onClick={onResolve}
                className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shadow-sm"
            >
                Resolve & Regenerate
            </button>
         </div>
      )}

      {contextError && (
        <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-md mb-3 mx-3 shadow-sm">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700 font-medium">Error: {contextError}</span>
        </div>
      )}

      <div className="flex-1 mx-3 mb-3 min-h-0">
        <Card className="h-full transition-all duration-300 hover:shadow-md hover:shadow-blue-100/30">
          <CardContent className="p-3 h-full">
            <div className="h-full overflow-y-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  ref={(el) => {
                    if (el) messageRefs.current.set(message.id, el);
                  }}
                  id={`ai-message-${message.id}`}
                  className={cn(
                    "flex space-x-2 animate-fadeInUp group",
                    message.type === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div className="flex flex-col relative">
                    {/* Reply preview in message bubble */}
                    {message.repliedMessage && (
                      <div
                        onClick={() => scrollToMessage(message.repliedMessage!.id)}
                        className={cn(
                          "mb-2 px-2 py-1.5 rounded-md border-l-2 cursor-pointer transition-colors",
                          message.type === "user"
                            ? "bg-blue-500/30 border-blue-400 hover:bg-blue-500/40"
                            : "bg-gray-100 border-gray-300 hover:bg-gray-200"
                        )}
                      >
                        <div className="text-[10px] font-semibold opacity-75 mb-0.5">
                          {message.repliedMessage.type === "user" ? "You" : "AI"}
                        </div>
                        <div className="text-[11px] line-clamp-2 opacity-80">
                          {message.repliedMessage.content?.substring(0, 100)}
                          {message.repliedMessage.content && message.repliedMessage.content.length > 100 ? "..." : ""}
                        </div>
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm transition-all duration-200 hover:shadow-md relative",
                        message.type === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 hover:from-gray-150 hover:to-gray-100 border border-gray-200"
                      )}
                    >
                      {/* Reply button - appears on hover for AI messages */}
                      {message.type === "ai" && onReplyClick && !message.isStreaming && (
                        <button
                          type="button"
                          onClick={() => onReplyClick(message)}
                          className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 shadow-sm z-10"
                          aria-label="Reply to message"
                          title="Reply to this message"
                        >
                          <Reply size={14} />
                        </button>
                      )}
                      {message.type === "ai" ? (
                        message.content && message.content.trim() ? (
                          <div className="prose prose-sm max-w-none prose-p:mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                            {message.isStreaming && (
                              <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-pulse" />
                            )}
                          </div>
                        ) : message.isStreaming ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        ) : null
                      ) : (
                        <div className="whitespace-pre-wrap text-white">{message.content}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && messages.length === 0 && (
                <div className="text-sm text-gray-500">Preparing guidance...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center mx-3 pb-4">
        {!onResolve && mode !== "underwriter" && (
          <p className="text-sm text-gray-500 animate-pulse">Click another field&apos;s Ask AI to switch topics</p>
        )}
      </div>
    </div>
  );
};


