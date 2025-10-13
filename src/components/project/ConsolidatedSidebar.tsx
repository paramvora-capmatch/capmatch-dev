// src/components/project/ConsolidatedSidebar.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAskAI } from '../../hooks/useAskAI';
import { useProjects } from '../../hooks/useProjects';
import { useAuth } from '../../hooks/useAuth';
import { ProjectMessage } from '../../types/enhanced-types';;
import { getAdvisorById } from '../../../lib/enhancedMockApiService';
import { cn } from '@/utils/cn';
import { AIContextBuilder } from '../../services/aiContextBuilder';
import { PresetQuestion } from '../../types/ask-ai-types';

import { 
  MessageSquare, 
  Bot, 
  Loader2,
  AlertCircle,
  Brain,
  MessageCircle,
  Send
} from 'lucide-react';

interface ConsolidatedSidebarProps {
  projectId: string;
  formData: any;
  droppedFieldId?: string | null;
  onFieldProcessed?: () => void;
}

type TabType = 'ai-assistant' | 'advisor';

export const ConsolidatedSidebar: React.FC<ConsolidatedSidebarProps> = ({ 
  projectId, 
  formData, 
  droppedFieldId, 
  onFieldProcessed,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('advisor');

  // AI Assistant state and hooks
  const {
    messages: aiMessages,
    fieldContext,
    isLoading: aiLoading,
    isBuildingContext,
    contextError,
    handleFieldDrop,
    sendMessage,
    hasActiveContext,
    hasMessages
  } = useAskAI({ projectId, formData });

  // Message Panel state and hooks
  const { getProject, projectMessages, addProjectMessage, activeProject } = useProjects();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [advisorName, setAdvisorName] = useState('Your Capital Advisor');
  const [isLoadingAdvisor, setIsLoadingAdvisor] = useState(false);
  const [localMessages, setLocalMessages] = useState<ProjectMessage[]>([]);

  // Handle field drop from AskAIProvider
  useEffect(() => {
    if (droppedFieldId) {
      handleFieldDrop(droppedFieldId);
      onFieldProcessed?.();
      // Switch to AI assistant tab when field is dropped
      setActiveTab('ai-assistant');
    }
  }, [droppedFieldId, onFieldProcessed, handleFieldDrop]);

  // Automatically send a comprehensive question when field context is built
  useEffect(() => {
    if (fieldContext && aiMessages.length === 0 && !aiLoading && !isBuildingContext) {
      // Get the preset questions for this field
      const presetQuestions = AIContextBuilder.generatePresetQuestions(fieldContext);

      // Determine if field has a value and create context-aware question
      const hasValue = fieldContext.currentValue && fieldContext.currentValue !== '';

      let primaryQuestion;
      if (!hasValue) {
        // Field is empty - user wants to know what it is and what to choose
        primaryQuestion = `I haven't filled out the "${fieldContext.label}" field yet. I need to understand:
1. What is this field asking for?
2. What are my options and which one should I choose?
3. How does my choice affect my loan application?`;
      } else {
        // Field has a value - user wants to verify their choice
        primaryQuestion = `I've filled in "${fieldContext.currentValue}" for the "${fieldContext.label}" field. I need to know:
1. Is this the right choice for my project?
2. Should I consider changing it to something else?
3. How does this choice impact my loan terms?`;
      }

      // Create a comprehensive question that prioritizes user intent
      const questionSuggestions = presetQuestions.map((q: PresetQuestion) => q.text).join('\n- ');
      const comprehensiveQuestion = `${primaryQuestion}

Please also address these additional considerations:
- ${questionSuggestions}

Provide actionable advice that helps me make the best decision for my project.`;

      // Create the user-friendly display message
      const displayMessage = `Please provide comprehensive guidance and answers for the "${fieldContext.label}" field, including best practices, validation rules, and common considerations.`;

      // Send the comprehensive question to API but display the generic message
      sendMessage(comprehensiveQuestion, displayMessage);
    }
  }, [fieldContext, aiMessages.length, aiLoading, isBuildingContext, sendMessage]);

  // Message panel effects
  useEffect(() => {
    if (activeProject?.id === projectId) {
      setLocalMessages(projectMessages);
    }
  }, [projectMessages, activeProject, projectId]);

  // Get advisor information
  useEffect(() => {
    const loadData = async () => {
      const project = getProject(projectId);
      if (project?.assignedAdvisorUserId) {
        setIsLoadingAdvisor(true);
        try {
          const advisor = await getAdvisorById(project.assignedAdvisorUserId);
          if (advisor) {
            setAdvisorName(advisor.name);
          }
        } catch (error) {
          console.error('Failed to load advisor:', error);
        } finally {
          setIsLoadingAdvisor(false);
        }
      }
    };
    loadData();
  }, [projectId, getProject]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
        await addProjectMessage(newMessage);
        setNewMessage('');
    } catch (error) {
        console.error('Failed to send message:', error);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [localMessages, aiMessages]);

  return (
    <Card className="h-full flex flex-col transition-all duration-300 hover:shadow-md hover:shadow-blue-100/20 relative overflow-hidden group">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/10 via-transparent to-purple-50/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Header with Tab Navigation */}
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
            Project Assistant
          </h3>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 p-1 rounded-lg shadow-inner">
          <button
            onClick={() => setActiveTab('advisor')}
            className={cn(
              "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300",
              activeTab === 'advisor'
                ? "bg-gradient-to-r from-white to-gray-50 text-emerald-600 shadow-sm transform scale-105 border border-emerald-200/50"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-102"
            )}
          >
            <MessageCircle className={cn("h-4 w-4 transition-transform duration-300", activeTab === 'advisor' ? "scale-110" : "")} />
            <span>Advisor</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-assistant')}
            className={cn(
              "flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-300",
              activeTab === 'ai-assistant'
                ? "bg-gradient-to-r from-white to-gray-50 text-blue-600 shadow-sm transform scale-105 border border-blue-200/50"
                : "text-gray-600 hover:text-gray-800 hover:bg-white/50 hover:scale-102"
            )}
          >
            <Brain className={cn("h-4 w-4 transition-transform duration-300", activeTab === 'ai-assistant' ? "scale-110" : "")} />
            <span>AI Assistant</span>
          </button>
        </div>
      </CardHeader>

      {/* Tab Content */}
      <CardContent className="flex-1 pt-0 overflow-hidden px-0 relative z-10 flex flex-col">
        {activeTab === 'advisor' ? (
          // Advisor Tab
          <div className="h-full flex flex-col animate-fadeIn px-3 pt-3">
            <div className="flex-1 min-h-0">
              <div className="h-full overflow-y-auto space-y-3 pr-1" ref={messageContainerRef}>
                {localMessages.length > 0 ? (
                  localMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex space-x-2 animate-fadeInUp",
                        message.senderType === 'Borrower' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                          message.senderType === 'Borrower'
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-800 border border-gray-200"
                        )}
                      >
						<div className="font-medium text-xs mb-1 flex items-center space-x-2">
						  <span>{message.senderDisplayName || (message.senderType === 'Advisor' ? advisorName : 'Team Member')}</span>
						</div>
                        <div>{message.message}</div>
                        <div className="text-xs opacity-70 mt-1 text-right">
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 animate-fadeIn">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No messages yet.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="pt-3">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          // AI Assistant Tab
          <div className="h-full flex flex-col animate-fadeIn px-3 pt-3">
            {!hasActiveContext ? (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg border-gray-300 bg-gray-50/50">
                <MessageSquare className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 text-center">
                  Click "Ask AI" on a form field to start.
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {contextError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-md mb-3">
                    <span className="text-sm text-red-700">{contextError}</span>
                  </div>
                )}
                <div className="flex-1 min-h-0">
                    <div className="h-full overflow-y-auto space-y-3 pr-1">
                        {aiMessages.map((message) => (
                          <div
                            key={message.id}
                            className={cn("flex space-x-2", message.type === 'user' ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[90%] rounded-lg px-3 py-2 text-sm shadow-sm",
                                message.type === 'user'
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-100 text-gray-800 border border-gray-200"
                              )}
                            >
                              {message.isStreaming ? (
                                <div className="flex items-center space-x-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Thinking...</span></div>
                              ) : (
                                <div className="prose prose-sm max-w-none prose-p:mb-4" style={{ whiteSpace: 'pre-wrap' }}>
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};