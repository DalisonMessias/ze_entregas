import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, MessageCircle, Bot, Shield, Loader2, User, Check, CheckCheck, X, RefreshCw, AlertCircle, Trash2, MoreVertical } from 'lucide-react';
import * as cloud from '../../services/cloud';
import { getWebSocketUrl, getApiBaseUrl } from '../../utils/apiConfig';
import { PartnerProfile } from '../../types';
import axios from 'axios';

interface StoreChatPageProps {
    citySlug: string;
    storeSlug: string;
    onBack: () => void;
}

interface Message {
    id: string;
    text: string;
    isFromMe: boolean;
    timestamp: string;
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export const StoreChatPage: React.FC<StoreChatPageProps> = ({ citySlug, storeSlug, onBack }) => {

    const [store, setStore] = useState<PartnerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isConnecting, setIsConnecting] = useState(true);
    const [showOptionsObj, setShowOptionsObj] = useState<{ [key: string]: boolean }>({});

    const ws = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const visitorId = useRef<string>(localStorage.getItem('ze_visitor_id') || `visitor_${Math.random().toString(36).substr(2, 9)}`);


    useEffect(() => {
        // Close context menus on click outside
        const handleClickOutside = () => setShowOptionsObj({});
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        if (store?.id) {
            connectWebSocket();
        }
        return () => ws.current?.close();
    }, [store?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadStore = async () => {
        if (!citySlug || !storeSlug) return;
        try {
            const data = await cloud.getStoreBySlug(citySlug, storeSlug);
            setStore(data);
        } catch (e) {
            console.error("Error loading store", e);
        } finally {
            setLoading(false);
        }
    };

    const loadLocalHistory = () => {
        const saved = localStorage.getItem(`ze_chat_history_${storeSlug}`);
        if (saved) {
            try {
                setMessages(JSON.parse(saved));
            } catch (e) {
                console.error("Error loading chat history", e);
            }
        }
    };

    const saveLocalHistory = (newMessages: Message[]) => {
        localStorage.setItem(`ze_chat_history_${storeSlug}`, JSON.stringify(newMessages));
    };

    const connectWebSocket = () => {
        const wsUrl = `${getWebSocketUrl()}?visitorId=${visitorId.current}&storeId=${store?.id}`;
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => setIsConnecting(false);
        ws.current.onclose = () => {
            setIsConnecting(true);
            setTimeout(connectWebSocket, 3000);
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'internal.message' && data.payload.senderId !== visitorId.current) {
                    const newMessage: Message = {
                        id: data.payload.message_id || Date.now().toString(),
                        text: data.payload.content,
                        isFromMe: false,
                        timestamp: new Date().toISOString(),
                        status: 'read'
                    };
                    setMessages(prev => {
                        // Evita duplicatas se o WS reenviar
                        if (prev.some(m => m.id === newMessage.id)) return prev;
                        const updated = [...prev, newMessage];
                        saveLocalHistory(updated);
                        return updated;
                    });
                }
            } catch (e) {
                console.error("Error processing WS message", e);
            }
        };
    };

    const sendMessageToApi = async (message: Message) => {
        if (!store?.id) return;

        try {
            const response = await axios.post(`${getApiBaseUrl()}/chat/internal/send`, {
                storeId: store.id,
                visitorId: visitorId.current,
                content: message.text,
                senderId: visitorId.current,
                isFromVisitor: true
            }, { timeout: 10000 }); // Timeout de 10s para falha

            if (response.data.success) {
                setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'sent' } : m));
                // Atualiza local history após sucesso
                setMessages(current => {
                    saveLocalHistory(current);
                    return current;
                });
            } else {
                throw new Error('Server returned false success');
            }
        } catch (e) {
            console.error("Error sending message", e);
            setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'failed' } : m));
            setMessages(current => {
                saveLocalHistory(current);
                return current;
            });
        }
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        const tempId = Date.now().toString();
        const newMessage: Message = {
            id: tempId,
            text: inputText,
            isFromMe: true,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        setMessages(prev => {
            const updated = [...prev, newMessage];
            saveLocalHistory(updated);
            return updated;
        });
        setInputText('');

        await sendMessageToApi(newMessage);
    };


    const handleRetryMessage = async (message: Message) => {
        // Volta para pending
        setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'pending' } : m));
        await sendMessageToApi(message);
    };

    const handleDeleteMessage = async (messageId: string) => {
        // Otimista: remove da UI imediatamente
        setMessages(prev => {
            const updated = prev.filter(m => m.id !== messageId);
            saveLocalHistory(updated);
            return updated;
        });

        // Chama API (se não for mensagem local temporária que falhou antes de ter ID real)
        try {
            await axios.delete(`${getApiBaseUrl()}/messages/${messageId}?storeId=${store?.id}`);
        } catch (e) {
            console.error("Error deleting message", e);
        }
    };

    const handleClearChat = async () => {
        if (!confirm('Tem certeza que deseja apagar todas as mensagens?')) return;

        setMessages([]);
        saveLocalHistory([]);

        try {
            // Usa o visitorId como conversationId para visitantes
            await axios.delete(`${getApiBaseUrl()}/conversations/${visitorId.current}/messages?storeId=${store?.id}`);
        } catch (e) {
            console.error("Error clearing chat", e);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 p-4 flex items-center gap-4 shadow-sm z-10">
                <button
                    onClick={() => {
                        onBack();
                        window.dispatchEvent(new CustomEvent('pushstate_changed'));
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold overflow-hidden">
                        {store?.store_logo_url ? <img src={store.store_logo_url} className="w-full h-full object-cover" /> : store?.store_name?.[0].toUpperCase()}
                    </div>
                    <div>
                        <h1 className="font-black text-gray-900 leading-tight uppercase tracking-tighter text-sm">Chat com {store?.store_name}</h1>
                        <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${isConnecting ? 'bg-orange-400 animate-pulse' : 'bg-green-500'}`}></div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isConnecting ? 'Conectando...' : 'Online'}</span>
                        </div>
                    </div>
                </div>

                {/* Botão Limpar Chat */}
                <button
                    onClick={handleClearChat}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-red-500"
                    title="Limpar conversa"
                >
                    <Trash2 className="w-5 h-5" />
                </button>

                {/* Botão Fechar (X) adicional para clareza */}
                <button
                    onClick={() => {
                        onBack();
                        window.dispatchEvent(new CustomEvent('pushstate_changed'));
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-auto"
                >
                    <X className="w-6 h-6 text-gray-400" />
                </button>
            </header>

            {/* Messages Area */}
            <div
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f0f2f5] relative"
                style={{
                    backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                    backgroundRepeat: 'repeat',
                    backgroundSize: '400px',
                    backgroundBlendMode: 'overlay'
                }}
            >
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-50">
                        <MessageCircle size={48} className="text-gray-400 mb-4" />
                        <h3 className="text-gray-600 font-bold uppercase tracking-widest text-sm">Inicie uma conversa</h3>
                        <p className="text-gray-500 text-xs">Fale agora mesmo com a loja de forma nativa e sem complicações.</p>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={`group flex ${msg.isFromMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-200 items-center gap-2 relative`}>

                        {/* Botão de Retry para mensagens falhadas */}
                        {msg.isFromMe && msg.status === 'failed' && (
                            <button
                                onClick={() => handleRetryMessage(msg)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="Tentar enviar novamente"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        )}

                        {/* Menu de Opções (Delete) - Aparece no Hover ou Click */}
                        {msg.isFromMe && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowOptionsObj(prev => ({ [msg.id]: !prev[msg.id] }));
                                    }}
                                    className={`p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity ${showOptionsObj[msg.id] ? 'opacity-100' : ''}`}
                                >
                                    <MoreVertical size={16} />
                                </button>
                                {showOptionsObj[msg.id] && (
                                    <div className="absolute top-full right-0 mt-1 bg-white shadow-lg rounded-lg border border-gray-100 z-20 py-1 min-w-[120px]">
                                        <button
                                            onClick={() => handleDeleteMessage(msg.id)}
                                            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <Trash2 size={14} /> Apagar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm relative ${msg.isFromMe ? (msg.status === 'failed' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-brand-600 text-white rounded-tr-none') : 'bg-white text-gray-800 rounded-tl-none'}`}>
                            {msg.text}
                            <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${msg.isFromMe ? (msg.status === 'failed' ? 'text-red-500' : 'text-white/70') : 'text-gray-400'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {msg.isFromMe && (
                                    <span>
                                        {msg.status === 'pending' ? <Loader2 size={10} className="animate-spin" /> :
                                            msg.status === 'failed' ? <AlertCircle size={10} /> :
                                                msg.status === 'sent' ? <Check size={10} /> :
                                                    <CheckCheck size={10} />}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-gray-100 p-4 flex items-end gap-2">
                <div className="flex-1 bg-gray-100 rounded-2xl p-2 min-h-[48px] flex items-center px-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-500/20 transition-all border border-transparent focus-within:border-brand-500">
                    <textarea
                        className="bg-transparent border-none outline-none w-full text-sm resize-none custom-scrollbar py-1"
                        placeholder="Escreva sua mensagem..."
                        rows={1}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />
                </div>
                <button
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                    className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-lg shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                    <Send className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
