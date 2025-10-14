// src/components/chat/ChatInterface.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/useChatStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  Users, 
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface ChatInterfaceProps {
  projectId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ projectId }) => {
  const {
    // State
    threads,
    activeThreadId,
    participants,
    messages,
    attachableDocuments,
    isLoading,
    isLoadingAttachable,
    error,
    
    // Actions
    loadThreadsForProject,
    createThread,
    setActiveThread,
    loadMessages,
    sendMessage,
    loadAttachableDocuments,
    attachDocument,
    clearError
  } = useChatStore();

  const { activeProject } = useProjectStore();
  
  const [newMessage, setNewMessage] = useState('');
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [newThreadTopic, setNewThreadTopic] = useState('');
  const [showCreateThread, setShowCreateThread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load threads when component mounts
  useEffect(() => {
    if (projectId) {
      loadThreadsForProject(projectId);
    }
  }, [projectId, loadThreadsForProject]);

  // Load attachable documents when thread changes
  useEffect(() => {
    if (activeThreadId) {
      loadAttachableDocuments(activeThreadId);
    }
  }, [activeThreadId, loadAttachableDocuments]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeThreadId) return;

    try {
      await sendMessage(activeThreadId, newMessage.trim());
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleCreateThread = async () => {
    if (!newThreadTopic.trim()) return;

    try {
      const threadId = await createThread(projectId, newThreadTopic.trim());
      setNewThreadTopic('');
      setShowCreateThread(false);
      setActiveThread(threadId);
    } catch (err) {
      console.error('Failed to create thread:', err);
    }
  };

  const handleAttachDocument = async (documentPath: string) => {
    if (!activeThreadId) return;

    try {
      // In a real implementation, you'd get the message ID from the last sent message
      // For now, we'll just show the attachment picker
      console.log('Attaching document:', documentPath);
      setShowAttachmentPicker(false);
    } catch (err) {
      console.error('Failed to attach document:', err);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (error) {
    return (
      <Card className="h-96">
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
    <div className="h-96 flex border rounded-lg overflow-hidden">
      {/* Threads Sidebar */}
      <div className="w-1/3 border-r bg-gray-50">
        <div className="p-3 border-b bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">Chat Threads</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreateThread(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {showCreateThread && (
            <div className="space-y-2">
              <Input
                placeholder="Thread topic..."
                value={newThreadTopic}
                onChange={(e) => setNewThreadTopic(e.target.value)}
                className="text-sm"
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleCreateThread}>
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
        
        <div className="overflow-y-auto h-full">
          {isLoading ? (
            <div className="p-3 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThread(thread.id)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    activeThreadId === thread.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium truncate">
                    {thread.topic || 'Untitled Thread'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(thread.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeThreadId ? (
          <>
            {/* Thread Header */}
            <div className="p-3 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {threads.find(t => t.id === activeThreadId)?.topic || 'Untitled Thread'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-500">
                    {participants.length} participant{participants.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.sender
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {message.sender && (
                      <div className="text-xs opacity-75 mb-1">
                        {message.sender.full_name || message.sender.email}
                      </div>
                    )}
                    <div className="text-sm">{message.content}</div>
                    <div className="text-xs opacity-75 mt-1">
                      {formatMessageTime(message.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 border-t bg-white">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="pr-10"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAttachmentPicker(!showAttachmentPicker)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* Attachment Picker */}
              {showAttachmentPicker && (
                <div className="mt-2 p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Attach Document</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAttachmentPicker(false)}
                    >
                      ×
                    </Button>
                  </div>
                  
                  {isLoadingAttachable ? (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading safe documents...</span>
                    </div>
                  ) : attachableDocuments.length > 0 ? (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {attachableDocuments.map((docPath) => (
                        <button
                          key={docPath}
                          onClick={() => handleAttachDocument(docPath)}
                          className="w-full text-left p-2 hover:bg-gray-200 rounded text-sm"
                        >
                          📄 {docPath}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      No documents available for all participants
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select a thread to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
