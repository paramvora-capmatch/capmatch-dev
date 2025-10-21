'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { MessageSquare, Send, ChevronDown, PanelRightClose } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { OmQaSchema } from '@/types/om-types';
import { z } from 'zod';

interface OMChatSidebarProps {
  setIsChatOpen: (isOpen: boolean) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'thinking';
  question?: string;
  data?: Partial<z.infer<typeof OmQaSchema>>;
}

const CHAT_STORAGE_KEY = 'om-chat-messages';

export const OMChatSidebar: React.FC<OMChatSidebarProps> = ({ setIsChatOpen }) => {
  const [question, setQuestion] = React.useState('');
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [assumptionsOpen, setAssumptionsOpen] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const { object, submit, isLoading, error } = useObject({
    api: '/api/om-qa',
    schema: OmQaSchema,
  });

  // Load messages from session storage on component mount
  React.useEffect(() => {
    try {
      const storedMessages = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      }
    } catch (error) {
      console.warn('Failed to load chat messages from session storage:', error);
    }
  }, []);

  // Save messages to session storage whenever messages change
  React.useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to save chat messages to session storage:', error);
    }
  }, [messages]);

  // Auto-resize textarea when question changes
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [question]);

  const askQuestion = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || isLoading) return;
    
    const userMessage: Message = { id: Date.now().toString(), role: 'user', question };
    const thinkingMessage: Message = { id: (Date.now() + 1).toString(), role: 'thinking' };
    setMessages(prev => [...prev, userMessage, thinkingMessage]);

    submit({ question });
    setQuestion('');
  };

  React.useEffect(() => {
    if (object) {
      setMessages(prev => {
        const newMessages = prev.filter(m => m.role !== 'thinking');
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage?.role === 'assistant') {
          // Update last assistant message
          lastMessage.data = object as Partial<z.infer<typeof OmQaSchema>>;
          return [...newMessages];
        } else {
          // Add new assistant message
          return [...newMessages, { id: Date.now().toString(), role: 'assistant', data: object as Partial<z.infer<typeof OmQaSchema>> }];
        }
      });
    }
  }, [object]);

  const assumptionsId = React.useId();

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
            <div className='flex items-center'>
                <div className="p-2 bg-blue-50 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                    <h3 className="font-semibold text-gray-800">Talk to the OM</h3>
                </div>
            </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsChatOpen(false)}
            className="text-gray-500 hover:text-gray-800"
          >
            <PanelRightClose className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Chat Content Area */}
      <div className="flex-grow overflow-y-auto p-4">
        {/* Welcome Message */}
        {messages.length === 0 && !isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <div className="p-1.5 bg-blue-100 rounded-full">
                <MessageSquare className="h-3 w-3 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-blue-800 font-medium">Welcome to the OM Assistant!</p>
                <p className="text-xs text-blue-600 mt-1">
                  Ask me anything about the Offering Memorandum. I can help you find specific information,
                  explain terms, or analyze the deal structure.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="space-y-4">
          {messages.map((message) => {
            if (message.role === 'user') {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="bg-blue-600 text-white rounded-lg px-3 py-2 max-w-[80%]">
                    <p className="text-sm">{message.question}</p>
                  </div>
                </div>
              );
            }

            if (message.role === 'assistant' && message.data) {
              const { answer_markdown, assumptions } = message.data;
              return (
                <div key={message.id} className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 rounded-lg px-3 py-2 max-w-[80%]">
                    <div className="prose prose-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {answer_markdown || ''}
                      </ReactMarkdown>
                    </div>

                    {/* Assumptions card at the bottom, collapsed by default */}
                    {assumptions?.length ? (
                      <Card className="mt-4 border-gray-200">
                        <CardHeader className="p-3 pb-0">
                          <button
                            type="button"
                            onClick={() => setAssumptionsOpen(o => !o)}
                            className="w-full flex items-center justify-between text-left"
                            aria-expanded={assumptionsOpen}
                            aria-controls={assumptionsId}
                          >
                            <span className="font-medium text-gray-900">
                              Assumptions ({assumptions.length})
                            </span>
                            <ChevronDown
                              className={`h-4 w-4 text-gray-500 transition-transform ${
                                assumptionsOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </CardHeader>
                        <CardContent
                          id={assumptionsId}
                          className={`px-3 pb-3 ${assumptionsOpen ? 'block' : 'hidden'}`}
                        >
                          <div className="space-y-3">
                            {assumptions?.map((a, idx) => {
                              if (!a) return null;
                              return (
                                <Card key={idx} className="border-gray-100 bg-gray-50/50">
                                  <CardContent className="p-3">
                                    <div className="flex items-start gap-3">
                                      <div className="flex-1">
                                        <p className="text-sm text-gray-800 leading-relaxed">{a.text}</p>
                                        {a.citation && (
                                          <p className="text-xs text-gray-500 mt-2">
                                            <span className="font-medium">Section:</span> {a.citation}
                                          </p>
                                        )}
                                      </div>
                                      {a.source && (<span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-gray-200 text-gray-700 capitalize font-medium">
                                        {a.source}
                                      </span>)}
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                </div>
              );
            }
            
            if (message.role === 'thinking') {
                return (
                    <div key={message.id} className="flex justify-start">
                        <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-3 max-w-[80%]">
                            <div className="flex items-center space-x-2">
                                <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse delay-0"></span>
                                <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse delay-150"></span>
                                <span className="h-2 w-2 bg-gray-400 rounded-full animate-pulse delay-300"></span>
                            </div>
                        </div>
                    </div>
                )
            }

            return null;
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        )}
      </div>

      {/* Input Field at Bottom */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={askQuestion} className="space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              placeholder="Ask a question about the OM..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full min-h-[44px] p-3 pr-12 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 resize-none text-sm leading-relaxed"
              rows={1}
              style={{ fontFamily: 'inherit' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                  if (question.trim() && !isLoading) {
                    askQuestion();
                  }
                } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  const target = e.target as HTMLTextAreaElement;
                  const start = target.selectionStart;
                  const end = target.selectionEnd;
                  const newValue = question.substring(0, start) + '\n' + question.substring(end);
                  setQuestion(newValue);
                  setTimeout(() => {
                    target.selectionStart = target.selectionEnd = start + 1;
                  }, 0);
                }
              }}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!question.trim() || isLoading}
              className="absolute right-2 top-2 h-8 w-8 p-0"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}; 