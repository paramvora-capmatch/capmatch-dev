// src/components/project/ProjectChat.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { ChatThread, Message } from '@/types/enhanced-types';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/Button';
import { MessageSquare, Send, PlusCircle, Loader2 } from 'lucide-react';

interface ProjectChatProps {
    projectId: string;
}

export const ProjectChat: React.FC<ProjectChatProps> = ({ projectId }) => {
    const { user } = useAuth();
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchThreads = async () => {
            if (!user) return;
            setIsLoadingThreads(true);
            
            // This should be an RPC call to get threads user has access to, for now we get all for the project
            const { data, error } = await supabase
                .from('chat_threads')
                .select('*')
                .eq('project_id', projectId);
            
            if (error) {
                console.error("Error fetching chat threads:", error);
            } else {
                setThreads(data as any);
                if (data.length > 0) {
                    setActiveThread(data[0] as any);
                }
            }
            setIsLoadingThreads(false);
        };
        fetchThreads();
    }, [projectId, user]);

    useEffect(() => {
        if (!activeThread || !user) {
            setMessages([]);
            return;
        }

        const fetchMessages = async () => {
            setIsLoadingMessages(true);
            // The RLS policy handles showing messages only after the user joined the permission set.
            const { data, error } = await supabase
                .from('messages')
                .select('*, sender:profiles(full_name, email, role)')
                .eq('thread_id', activeThread.id)
                .order('created_at', { ascending: true });

            if (error) {
                console.error("Error fetching messages:", error);
            } else {
                setMessages(data as any);
            }
            setIsLoadingMessages(false);
        };

        fetchMessages();
        
        const channel = supabase.channel(`messages-${activeThread.id}`)
            .on<Message>(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${activeThread.id}` },
                async (payload) => {
                    const { data: sender, error } = await supabase.from('profiles').select('full_name, email, role').eq('id', payload.new.sender_id).single();
                    if(error) console.error(error);
                    const newMessage = { ...payload.new, sender } as Message;
                    setMessages(currentMessages => [...currentMessages, newMessage]);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [activeThread, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeThread || !user) return;

        const { error } = await supabase.from('messages').insert({
            thread_id: activeThread.id,
            sender_id: user.id,
            message: newMessage,
        });

        if (error) {
            console.error("Failed to send message:", error);
        } else {
            setNewMessage('');
        }
    };

    return (
        <Card className="h-full flex flex-col md:flex-row">
            {/* Threads Sidebar */}
            <div className="w-full border-b md:w-1/3 md:border-r md:border-b-0">
                <CardHeader className="flex flex-row items-center justify-between p-3">
                    <h3 className="font-semibold text-base">Threads</h3>
                    <Button variant="ghost" size="sm" onClick={() => alert('Creating new threads is managed via permissions.')}><PlusCircle className="h-4 w-4" /> New</Button>
                </CardHeader>
                <CardContent className="p-2">
                    {isLoadingThreads ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : (
                        <ul className="space-y-1">
                            {threads.map(thread => (
                                <li key={thread.id} onClick={() => setActiveThread(thread)}
                                    className={`p-2 rounded-md cursor-pointer text-sm ${activeThread?.id === thread.id ? 'bg-blue-100 font-semibold' : 'hover:bg-gray-100'}`}>
                                    # {thread.name}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </div>

            {/* Message Panel */}
            <div className="w-full md:w-2/3 flex flex-col flex-1">
                {activeThread ? (
                    <>
                        <CardHeader className="p-3 border-b">
                            <h3 className="font-semibold text-base">#{activeThread.name}</h3>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto space-y-4 p-3">
                            {isLoadingMessages ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div> : (
                                messages.map(msg => (
                                    <div key={msg.id} className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[80%] p-2 rounded-lg ${msg.sender_id === user?.id ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                                            <p className="font-bold text-xs">{msg.sender?.full_name || msg.sender?.email}</p>
                                            <p className="text-sm">{msg.message}</p>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                ))
                            )}
                             <div ref={messagesEndRef} />
                        </CardContent>
                        <div className="p-3 border-t">
                            <form onSubmit={handleSendMessage} className="flex space-x-2">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    className="flex-1 px-3 py-2 border rounded-md text-sm"
                                />
                                <Button type="submit"><Send className="h-4 w-4" /></Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Select a thread to start chatting.</p>
                    </div>
                )}
            </div>
        </Card>
    );
};