// src/components/chat/AIChatInterface.tsx
"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "../ui/card";
import { cn } from "@/utils/cn";
import { Loader2, Bot, AlertCircle, MessageSquare } from "lucide-react";
import { Message, FieldContext } from "@/types/ask-ai-types";

interface AIChatInterfaceProps {
  messages: Message[];
  fieldContext: FieldContext | null;
  isLoading: boolean;
  isBuildingContext: boolean;
  contextError: string | null;
  hasActiveContext: boolean;
}

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({
  messages,
  fieldContext,
  isLoading,
  isBuildingContext,
  contextError,
  hasActiveContext,
}) => {
  if (!hasActiveContext) {
    return (
      <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg transition-all duration-300 mx-3 border-gray-300 bg-gradient-to-br from-gray-50 to-blue-50/30 hover:border-blue-300 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-purple-50/30">
        <MessageSquare className="h-12 w-12 text-gray-400 mb-3 animate-pulse" />
        <p className="text-sm text-gray-600 text-center">
          Click "Ask AI" buttons on form fields
          <br />
          to get AI assistance
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {fieldContext && (
        <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-md mb-3 mx-3 shadow-sm">
          <Bot className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700 font-medium">
            Assisting with: <strong>{fieldContext.label}</strong>
          </span>
        </div>
      )}

      {contextError && (
        <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-md mb-3 mx-3 shadow-sm">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700 font-medium">Error: {contextError}</span>
        </div>
      )}

      {isBuildingContext && (
        <div className="flex items-center space-x-2 p-2 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-md mb-3 mx-3 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-sm text-blue-700 font-medium">Building context for field...</span>
        </div>
      )}

      <div className="flex-1 mx-3 mb-3 min-h-0">
        <Card className="h-full transition-all duration-300 hover:shadow-md hover:shadow-blue-100/30">
          <CardContent className="p-3 h-full">
            <div className="h-full overflow-y-auto space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex space-x-2 animate-fadeInUp",
                    message.type === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm transition-all duration-200 hover:shadow-md",
                      message.type === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 hover:from-gray-150 hover:to-gray-100 border border-gray-200"
                    )}
                  >
                    {message.type === "ai" && message.isStreaming ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                    ) : message.type === "ai" ? (
                      <div className="prose prose-sm max-w-none prose-p:mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-white">{message.content}</div>
                    )}
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

      <div className="text-center mx-3">
        <p className="text-sm text-gray-500 animate-pulse">Click another field's Ask AI to switch topics</p>
      </div>
    </div>
  );
};


