'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { MessageSquare, Send, ChevronDown, Table2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { OmQaSchema } from '@/types/om-types';
import { z } from 'zod';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal';

interface OMChatSidebarProps {
  setIsChatOpen?: (isOpen: boolean) => void;
  onCollapse?: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'thinking';
  question?: string;
  data?: Partial<z.infer<typeof OmQaSchema>>;
}

const CHAT_STORAGE_KEY = 'om-chat-messages';

// Table wrapper component that can use hooks
const TableWrapper: React.FC<{
  children: React.ReactNode;
  props: any;
  onViewTable: (tableHtml: string) => void;
}> = ({ children, props: tableProps, onViewTable }) => {
  const tableRef = React.useRef<HTMLTableElement>(null);
  const tableId = React.useId();
  
  const handleViewTable = () => {
    if (tableRef.current) {
      const clonedTable = tableRef.current.cloneNode(true) as HTMLTableElement;
      clonedTable.classList.remove('hidden');
      clonedTable.className = 'min-w-full border-collapse';
      onViewTable(clonedTable.outerHTML);
    }
  };

  return (
    <div className="my-4">
      {/* Hidden table for HTML extraction */}
      <table
        ref={tableRef}
        {...tableProps}
        className="hidden"
        data-table-id={tableId}
      >
        {children}
      </table>
      <button
        type="button"
        onClick={handleViewTable}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
      >
        <Table2 size={16} />
        <span>View Table</span>
      </button>
    </div>
  );
};

export const OMChatSidebar: React.FC<OMChatSidebarProps> = ({ setIsChatOpen, onCollapse }) => {
  const [question, setQuestion] = React.useState('');
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [assumptionsOpen, setAssumptionsOpen] = React.useState(false);
  const [tableModalOpen, setTableModalOpen] = React.useState(false);
  const [tableContent, setTableContent] = React.useState<string>('');
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

  // Custom components for react-markdown to handle tables
  const markdownComponents = {
    table: ({ children, ...props }: any) => (
      <TableWrapper
        props={props}
        onViewTable={(tableHtml) => {
          setTableContent(tableHtml);
          setTableModalOpen(true);
        }}
      >
        {children}
      </TableWrapper>
    ),
  };

  return (
    <div className="flex flex-col h-full rounded-2xl shadow-lg overflow-hidden border border-gray-200 bg-white/70 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200/70 bg-white/60 px-2 py-1">
        <div className="flex-1 flex items-center justify-center px-3 py-2">
          <div className="flex items-center space-x-2">
            <MessageSquare size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-gray-900">Talk to the OM</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onCollapse && (
            <button
              type="button"
              aria-label="Collapse chat"
              onClick={onCollapse}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Collapse chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" className="rotate-180">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          )}
          {setIsChatOpen && (
            <button
              type="button"
              aria-label="Close chat"
              aria-expanded={true}
              onClick={() => setIsChatOpen(false)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Close chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" className="rotate-180">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Chat Content Area */}
      <div className="flex-1 p-0 min-h-0 overflow-hidden bg-transparent">
        <div className="h-full bg-transparent overflow-y-auto px-4">
        {/* Welcome Message - Centered */}
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center py-4">
            <div className="text-center space-y-4">
              <p className="text-base text-gray-700 font-medium">
                Welcome to the OM
              </p>
              <p className="text-sm text-gray-600 max-w-xs">
                You can use the Talk to OM feature to discuss the data in the OM
              </p>
              
              {/* Sample Query Pills */}
              <div className="flex flex-col gap-2 mt-6">
                {[
                  "Create a 5-year cash flow projection for the base case scenario",
                  "Analyze the impact of a 50 basis point cap rate expansion on exit valuation across all scenarios",
                  "Compare risk-adjusted returns and recommend the optimal scenario given current market conditions"
                ].map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuestion(query)}
                    className="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full transition-colors"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.length > 0 && (
        <div className="space-y-4 py-4">
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
                  <div className="bg-white border border-gray-200 text-gray-800 rounded-lg px-4 py-3 max-w-[80%] shadow-sm">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {answer_markdown || ''}
                      </ReactMarkdown>
                    </div>

                    {/* Assumptions card at the bottom, collapsed by default */}
                    {assumptions?.length ? (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setAssumptionsOpen(o => !o)}
                          className="w-full flex items-center justify-between text-left mb-3"
                          aria-expanded={assumptionsOpen}
                          aria-controls={assumptionsId}
                        >
                          <span className="text-sm font-semibold text-gray-700">
                            Assumptions ({assumptions.length})
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 text-gray-500 transition-transform ${
                              assumptionsOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        <div
                          id={assumptionsId}
                          className={`${assumptionsOpen ? 'block' : 'hidden'} space-y-3`}
                        >
                          {assumptions?.map((a, idx) => {
                            if (!a) return null;
                            return (
                              <div key={idx} className="bg-gray-50 border border-gray-100 rounded-md p-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex-1">
                                    <p className="text-sm text-gray-800 leading-relaxed">{a.text}</p>
                                    {a.citation && (
                                      <p className="text-xs text-gray-500 mt-2">
                                        <span className="font-medium">Section:</span> {a.citation}
                                      </p>
                                    )}
                                  </div>
                                  {a.source && (
                                    <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 capitalize font-medium">
                                      {a.source}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
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
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        )}
        </div>
      </div>

      {/* Input Field at Bottom */}
      <div className="p-4 border-t border-gray-200/70 bg-white/60">
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

      {/* Table Modal */}
      <Modal
        isOpen={tableModalOpen}
        onClose={() => setTableModalOpen(false)}
        title="Table View"
        size="5xl"
      >
        <div className="overflow-x-auto -mx-6 px-6">
          <div 
            className="prose prose-sm max-w-none [&_table]:min-w-full [&_table]:border-collapse [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-gray-900 [&_td]:border [&_td]:border-gray-300 [&_td]:px-4 [&_td]:py-2 [&_td]:text-gray-700"
            dangerouslySetInnerHTML={{ __html: tableContent }}
          />
        </div>
      </Modal>
    </div>
  );
}; 