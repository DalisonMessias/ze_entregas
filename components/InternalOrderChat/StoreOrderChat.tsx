import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageCircle, User, Loader2 } from 'lucide-react';
import * as cloud from '../../services/cloud';
import { Button } from '../Button';

interface StoreOrderChatProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    customerName: string;
    storeId: string; // Authenticated Store ID
}

export const StoreOrderChat: React.FC<StoreOrderChatProps> = ({ isOpen, onClose, orderId, customerName, storeId }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Initial Load & Polling
    useEffect(() => {
        if (!isOpen) return;

        loadChat();
        const interval = setInterval(loadChat, 5000);
        return () => clearInterval(interval);
    }, [isOpen, orderId]);

    // Scroll
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const loadChat = async () => {
        try {
            const sb = cloud.getClient();
            if (!sb) return;

            // Find Chat
            const { data: chatData } = await sb
                .from('order_chats')
                .select('id')
                .eq('order_id', orderId)
                .single();

            if (chatData) {
                setChatId(chatData.id);
                // Fetch Messages
                const { data: msgs } = await sb
                    .from('chat_messages')
                    .select('*')
                    .eq('chat_id', chatData.id)
                    .order('created_at', { ascending: true });

                setMessages(msgs || []);
            } else {
                // No chat exists yet (Customer hasn't started one, or we haven't)
                setMessages([]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !storeId) return;
        setSending(true);
        try {
            const sb = cloud.getClient();
            if (!sb) return;

            let currentChatId = chatId;

            // If no chat exists, create one
            if (!currentChatId) {
                const { data: newChat, error: createError } = await sb
                    .from('order_chats')
                    .insert({
                        order_id: orderId,
                        store_id: storeId,
                        user_id: null, // Guest or Unknown User
                        status: 'active'
                    })
                    .select('id')
                    .single();

                if (createError) throw createError;
                currentChatId = newChat.id;
                setChatId(newChat.id);
            }

            // Send Message
            const { error: msgError } = await sb
                .from('chat_messages')
                .insert({
                    chat_id: currentChatId,
                    sender_id: storeId, // Store is sender
                    sender_type: 'store',
                    message: newMessage,
                    type: 'text'
                });

            if (msgError) throw msgError;

            setNewMessage('');
            loadChat(); // Refresh

        } catch (error) {
            console.error('Error sending message:', error);
            alert('Erro ao enviar mensagem.');
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-md h-[80vh] sm:h-[600px] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in scale-95" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">{customerName}</h3>
                            <p className="text-xs text-gray-500">#{orderId.slice(0, 8)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950/50">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Nenhuma mensagem.</p>
                            <p className="text-xs">Inicie a conversa com o cliente.</p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.sender_id === storeId || msg.sender_type === 'store';
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe
                                            ? 'bg-brand-600 text-white rounded-br-none'
                                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 rounded-bl-none'
                                        }`}>
                                        <p>{msg.message}</p>
                                        <span className={`text-[10px] mt-1 block ${isMe ? 'text-brand-200' : 'text-gray-400'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSendMessage();
                        }}
                        className="flex items-center gap-2"
                    >
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm font-medium"
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || sending}
                            className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
