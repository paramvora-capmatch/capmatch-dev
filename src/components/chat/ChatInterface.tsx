// src/components/chat/ChatInterface.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/useChatStore';
import { useOrgStore } from '@/stores/useOrgStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProjects } from '../../hooks/useProjects';
import { supabase } from '../../../lib/supabaseClient';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { MultiSelect } from '../ui/MultiSelect';
import {
  MessageCircle, 
  Send, 
  Users, 
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface ChatInterfaceProps {
  projectId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ projectId }) => {
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
    clearError
  } = useChatStore();

  const { user } = useAuthStore();
  const { activeProject } = useProjects();

  const [newMessage, setNewMessage] = useState('');
  const [newThreadTopic, setNewThreadTopic] = useState('');
  const { isOwner, members } = useOrgStore();
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const memberOptions = members
    .filter(m => m.user_id !== user?.id) // Exclude self
    .map(m => ({ value: m.user_id, label: m.userName || m.userEmail || '' }));

  const [showCreateThread, setShowCreateThread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      loadThreadsForProject(projectId);
    }
  }, [projectId, loadThreadsForProject]);

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
      setNewThreadTopic('');
      setShowCreateThread(false);
      setActiveThread(threadId);
    } catch (err) {
      console.error('Failed to create thread:', err);
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
            {isOwner && (
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
                  if (e.key === 'Enter') handleCreateThread();
                }}
              />
              <MultiSelect
                options={memberOptions.map(m => m.label)}
                value={selectedParticipants.map(id => memberOptions.find(m => m.value === id)?.label || '')}
                onChange={(selectedLabels) => {
                  const selectedIds = selectedLabels.map(label => memberOptions.find(m => m.label === label)?.value).filter(Boolean) as string[];
                  setSelectedParticipants(selectedIds);
                }}
                placeholder="Select members to add..."
                label="Add Members"
              />
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleCreateThread} disabled={!newThreadTopic.trim() || isLoading}>Create</Button>
                <Button size="sm" variant="outline" onClick={() => setShowCreateThread(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading && threads.length === 0 ? (
            <div className="p-3 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
          ) : (
            <div className="space-y-1 p-2">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveThread(thread.id)}
                  className={`w-full text-left p-2 rounded text-sm transition-colors ${
                    activeThreadId === thread.id
                      ? 'bg-blue-100 font-semibold text-blue-800'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  # {thread.topic || 'General'}
                </button>
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
                  className={`flex ${message.sender?.id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.sender?.id === user?.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="text-xs opacity-75 mb-1 font-semibold">
                      {message.sender?.full_name || 'User'}
                    </div>
                    <div className="text-sm">{message.content}</div>
                    <div className="text-xs opacity-75 mt-1 text-right">
                      {formatMessageTime(message.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t bg-white">
              <div className="flex space-x-2">
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
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isLoading}>
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
    </div>
  );
};
