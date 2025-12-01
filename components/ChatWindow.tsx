
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Loader2, MessageCircle, User } from 'lucide-react';
import * as cloud from '../services/cloud';
import { ChatMessageData } from '../types';
import { Button } from './Button';

interface ChatWindowProps {
    orderId?: string; // If null, it's a general support chat
    type: 'ORDER' | 'SUPPORT';
    onClose: () => void;
    title: string;
    adminTargetUserId?: string; // NEW: For Admin viewing a specific user thread
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ orderId, type, onClose, title, adminTargetUserId }) => {
    const [messages, setMessages] = useState<ChatMessageData[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const user = await cloud.getClient()?.auth.getUser();
            setUserId(user?.data.user?.id || null);
            await loadMessages();
            setLoading(false);
        };
        init();

        const subscription = cloud.subscribeToChat(orderId, type, (newMsg) => {
            setMessages((prev) => {
                // Avoid duplicates
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
            scrollToBottom();
        }, adminTargetUserId); // Pass target user for admin sub

        return () => {
            subscription?.unsubscribe();
        };
    }, [orderId, type, adminTargetUserId]);

    const loadMessages = async () => {
        try {
            const data = await cloud.getChatMessages(orderId, type, adminTargetUserId);
            setMessages(data);
            scrollToBottom();
        } catch (e) {
            console.error(e);
        }
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        
        // Optimistic update
        const tempId = 'temp-' + Date.now();
        const optimisticMsg: ChatMessageData = {
            id: tempId,
            sender_id: userId || 'me',
            receiver_id: adminTargetUserId || null,
            message: newMessage,
            type,
            is_read: false,
            created_at: new Date().toISOString(),
            pending: true
        };
        
        setMessages(prev => [...prev, optimisticMsg]);
        setNewMessage('');
        scrollToBottom();
        setSending(true);

        try {
            // Pass adminTargetUserId as receiverIdOverride if present (Admin replying to User)
            const savedMsg = await cloud.sendChatMessage(optimisticMsg.message, orderId, type, adminTargetUserId);
            if (savedMsg) {
                setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m));
            }
        } catch (e) {
            console.error(e);
            // Remove optimistic message on error or show error state
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("Erro ao enviar mensagem.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md h-[80vh] rounded-[32px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
                {/* Header */}
                <div className="bg-brand-600 p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">{title}</h3>
                            <p className="text-xs text-brand-100 opacity-80">{type === 'ORDER' ? 'Chat do Pedido' : 'Suporte'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 space-y-3 custom-scrollbar">
                    {loading && <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-gray-400"/></div>}
                    
                    {!loading && messages.length === 0 && (
                        <div className="text-center text-gray-400 py-10">
                            <p className="text-sm">Nenhuma mensagem ainda.</p>
                            <p className="text-xs mt-1">Comece a conversa!</p>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const isMe = msg.sender_id === userId;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-none'}`}>
                                    <p>{msg.message}</p>
                                    <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-brand-200' : 'text-gray-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {msg.pending && <span className="ml-1 opacity-70">...</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-2xl">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 bg-transparent border-none outline-none text-sm px-2 text-gray-900 dark:text-white"
                            autoFocus
                        />
                        <button 
                            onClick={handleSend} 
                            disabled={!newMessage.trim() || sending}
                            className={`p-2 rounded-xl transition-all ${newMessage.trim() ? 'bg-brand-600 text-white shadow-md' : 'bg-gray-200 dark:bg-gray-600 text-gray-400'}`}
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
