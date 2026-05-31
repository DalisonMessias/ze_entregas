import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, MessageCircle, Bot, Shield, Loader2, User, Check, CheckCheck, X, RefreshCw, AlertCircle, Trash2, MoreVertical, Edit2, Copy, Mic, Square, Store } from 'lucide-react';
import * as cloud from '../../services/cloud';
import { getWebSocketUrl, getApiBaseUrl } from '../../utils/apiConfig';
import { PartnerProfile } from '../../types';
import axios from 'axios';
import { BaseModal } from '../BaseModal';
import { Button } from '../Button';
import { PollMessage } from '../InternalChat/Messages/PollMessage';
import { ContactMessage } from '../InternalChat/Messages/ContactMessage';
import { AudioPlayer } from '../AudioPlayer';
import { getStoreOpenState } from '../../utils/storeHours';
import { getUserWithCache } from '../../services/cloud';

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
    const [isWsConnected, setIsWsConnected] = useState(false);
    const [showOptionsObj, setShowOptionsObj] = useState<{ [key: string]: boolean }>({});
    const [showClearModal, setShowClearModal] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    // Customer Name State
    const [customerName, setCustomerName] = useState<string>(localStorage.getItem('ze_customer_name') || '');
    const [showNameModal, setShowNameModal] = useState(false);
    const [tempName, setTempName] = useState('');

    // Store Status State
    const [isStoreOpen, setIsStoreOpen] = useState(true);

    // Typing Indicator State
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const ws = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const visitorId = useRef<string>(localStorage.getItem('ze_visitor_id') || `visitor_${Math.random().toString(36).substr(2, 9)}`);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Refs de controle do WebSocket (não causam re-render)
    const wsRetryCountRef = useRef(0);
    const wsRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wsConnectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wsHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const wsIsMountedRef = useRef(true);
    const WS_MAX_RETRIES = 10;
    const WS_HEARTBEAT_MS = 20000;
    const WS_TIMEOUT_MS = 10000;

    const clearWsTimers = () => {
        if (wsRetryTimerRef.current) { clearTimeout(wsRetryTimerRef.current); wsRetryTimerRef.current = null; }
        if (wsConnectionTimerRef.current) { clearTimeout(wsConnectionTimerRef.current); wsConnectionTimerRef.current = null; }
        if (wsHeartbeatRef.current) { clearInterval(wsHeartbeatRef.current); wsHeartbeatRef.current = null; }
    };

    const silentCloseWs = (socket: WebSocket) => {
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close(1000, 'Cleanup');
        }
    };

    useEffect(() => {
        if (store?.id) {
            wsIsMountedRef.current = true;
            wsRetryCountRef.current = 0;
            loadLocalHistory();
            loadServerHistory();
            connectWebSocket();
        }
        return () => {
            wsIsMountedRef.current = false;
            clearWsTimers();
            if (ws.current) { silentCloseWs(ws.current); ws.current = null; }
        };
    }, [store?.id]);



    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadStore = async () => {
        console.log("StoreChatPage: loadStore called", { citySlug, storeSlug });
        if (!citySlug || !storeSlug) {
            console.error("StoreChatPage: Missing slugs");
            setLoading(false);
            return;
        }
        try {
            const data = await cloud.getStoreBySlug(citySlug, storeSlug);
            console.log("StoreChatPage: store loaded", data);
            if (data) {
                setStore(data);

                // Calculate Store Open State
                try {
                    const openState = getStoreOpenState({
                        openingHours: data.opening_hours,
                        manualStatus: data.is_open,
                        manualOverride: data.manual_override,
                        now: new Date()
                    });
                    setIsStoreOpen(openState.isOpen);
                } catch (err) {
                    console.error("Error calculating store open state", err);
                }

            } else {
                console.error("StoreChatPage: Store not found via slug");
            }
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

        ws.current.onopen = () => {
            console.log("WebSocket connected");
            setIsWsConnected(true);
            setIsConnecting(false);
        };

        ws.current.onclose = () => {
            console.log("WebSocket disconnected");
            setIsWsConnected(false);
            setTimeout(connectWebSocket, 3000);
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Tratamento de presença (Digitando...)
                if (data.type === 'chat.presence') {
                    const presence = data.payload;
                    if (presence.presence === 'composing') {
                        setIsTyping(true);
                        // Auto-limpa após 5s se não receber 'paused'
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 5000);
                    } else {
                        setIsTyping(false);
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    }
                    return;
                }

                // Servidor envia 'chat.message', não 'internal.message'
                if (data.type === 'chat.message') {
                    setIsTyping(false); // Recebeu mensagem, para de digitar
                    const msgPayload = data.payload;
                    const senderId = msgPayload.key?.fromMe ? store!.id : msgPayload.key?.remoteJid;
                    if (senderId === visitorId.current) return; // Evitar duplicatas
                    // Extrair conteúdo da mensagem
                    let content = '';
                    if (msgPayload.message?.conversation) {
                        content = msgPayload.message.conversation;
                    } else if (msgPayload.message?.extendedTextMessage?.text) {
                        content = msgPayload.message.extendedTextMessage.text;
                    }
                    if (!content) return;

                    const newMessage: Message = {
                        id: msgPayload.key?.id || Date.now().toString(),
                        text: content,
                        isFromMe: false,
                        timestamp: new Date(msgPayload.messageTimestamp * 1000 || Date.now()).toISOString(),
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

    const loadServerHistory = async () => {
        if (!store?.id) return;
        try {
            const response = await axios.get(`${getApiBaseUrl()}/messages/${visitorId.current}?storeId=${store.id}`);
            const serverMessages = response.data.map((msg: any) => ({
                id: msg.message_id || msg.id,
                text: msg.content || msg.message,
                // CORREÇÃO CRÍTICA: Usar from_me do banco ao invés de inferir
                // from_me === false -> mensagem do visitante (esquerda)
                // from_me === true -> mensagem da loja (direita para o visitante)
                isFromMe: !msg.from_me, // Invertido porque no contexto do visitante, loja está do lado direito
                timestamp: msg.message_timestamp,
                status: msg.status || 'read'
            }));

            setMessages(prev => {
                const existingIds = new Set(prev.map(m => m.id));
                const filteredNew = serverMessages.filter((m: any) => !existingIds.has(m.id));
                const updated = [...prev, ...filteredNew].sort((a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                saveLocalHistory(updated);
                return updated;
            });
        } catch (e) {
            console.error("Error loading server history", e);
        }
    };

    const sendMessageToApi = async (message: Message) => {
        if (!store?.id) return;

        try {
            const response = await axios.post(`${getApiBaseUrl()}/internal/send`, {
                storeId: store.id,
                visitorId: visitorId.current,
                content: message.text,
                senderId: visitorId.current,
                senderName: customerName || 'Visitante',
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
        if (!isStoreOpen) return;
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

    const handleEditMessage = async (messageId: string, newContent: string) => {
        if (!messageId || !newContent.trim()) return;

        setMessages(prev => {
            const updated = prev.map(m => m.id === messageId ? { ...m, text: newContent, isEdited: true } : m);
            saveLocalHistory(updated);
            return updated;
        });
        setEditingMessageId(null);

        try {
            await axios.patch(`${getApiBaseUrl()}/messages/${messageId}`, {
                content: newContent,
                storeId: store?.id
            });
        } catch (e) {
            console.error("Error editing message", e);
        }
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
        setMessages([]);
        saveLocalHistory([]);

        try {
            // Usa o visitorId como conversationId para visitantes
            await axios.delete(`${getApiBaseUrl()}/conversations/${visitorId.current}/messages?storeId=${store?.id}`);
        } catch (e) {
            console.error("Error clearing chat", e);
        }
        setShowClearModal(false);
    };

    const renderMessageContent = (msg: Message) => {
        // Detect BUTTONS
        if (msg.text?.startsWith('BUTTONS:')) {
            try {
                const buttonData = JSON.parse(msg.text.substring(8));
                return (
                    <div className="space-y-3">
                        {buttonData.message && <p className="whitespace-pre-wrap">{buttonData.message}</p>}
                        <div className="flex flex-col gap-2">
                            {buttonData.buttons.map((btn: any, idx: number) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (btn.url) window.open(btn.url, '_blank');
                                    }}
                                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 ${msg.isFromMe ? 'bg-white text-brand-600 hover:bg-gray-100' : 'bg-brand-600 text-white hover:bg-brand-700'
                                        }`}
                                >
                                    {btn.text}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            } catch (e) { console.error("Error parsing BUTTONS:", e); }
        }

        // Detect Poll
        if (msg.text?.startsWith('POLL:')) {
            try {
                const pollData = JSON.parse(msg.text.substring(5));
                return (
                    <PollMessage
                        messageId={msg.id}
                        question={pollData.question}
                        options={pollData.options}
                        allowMultiple={pollData.allowMultiple}
                        visitorId={msg.isFromMe ? visitorId.current : (store?.id || 'store')}
                        visitorName={msg.isFromMe ? 'Você (Cliente)' : (store?.store_name || 'Loja')}
                    />
                );
            } catch (e) { /* fall through */ }
        }

        // Detect Contact
        if (msg.text?.startsWith('CONTACT:')) {
            try {
                const contactData = JSON.parse(msg.text.substring(8));
                return <ContactMessage name={contactData.name} phone={contactData.phone} />;
            } catch (e) { /* fall through */ }
        }

        // Detect PIX
        if (msg.text?.includes('Chave PIX da Loja:') || msg.text?.includes('Chave PIX:')) {
            const parts = msg.text.split('\n');
            const pixKey = parts.find(p => p.trim() && !p.includes(':'))?.trim() || "";
            return (
                <div className="space-y-2">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {pixKey && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(pixKey);
                                alert('Chave PIX copiada!');
                            }}
                            className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded transition-colors ${msg.isFromMe ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}`}
                        >
                            <Copy size={12} /> Copiar Chave PIX
                        </button>
                    )}
                </div>
            );
        }

        return (
            <p className="whitespace-pre-wrap">
                {msg.text.split(/(\*[^*]+\*)/g).map((part, i) =>
                    part.startsWith('*') && part.endsWith('*') ? (
                        <strong key={i}>{part.slice(1, -1)}</strong>
                    ) : (
                        part
                    )
                )}
            </p>
        );
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
                            <div className={`w-2 h-2 rounded-full ${!isWsConnected ? 'bg-orange-400 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`}></div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{!isWsConnected ? 'Conectando...' : 'Online'}</span>
                        </div>
                    </div>
                </div>

                {/* Botão Limpar Chat */}
                <button
                    onClick={() => setShowClearModal(true)}
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

                        {/* Menu de Opções (Delete) - Fixo sem hover */}
                        {msg.isFromMe && !editingMessageId && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowOptionsObj(prev => ({ [msg.id]: !prev[msg.id] }));
                                    }}
                                    className={`p-1 bg-white/80 shadow-sm border border-gray-100 text-gray-400 hover:text-gray-600 rounded-full transition-all ${showOptionsObj[msg.id] ? 'ring-2 ring-brand-500' : ''}`}
                                >
                                    <MoreVertical size={16} />
                                </button>
                                {showOptionsObj[msg.id] && (
                                    <div className="absolute bottom-full right-0 mb-1 bg-white shadow-lg rounded-lg border border-gray-100 z-20 py-1 min-w-[120px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingMessageId(msg.id);
                                                setEditContent(msg.text);
                                                setShowOptionsObj({});
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <Edit2 size={14} /> Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMessage(msg.id)}
                                            className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-50"
                                        >
                                            <Trash2 size={14} /> Apagar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm relative ${msg.isFromMe ? (msg.status === 'failed' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-brand-600 text-white rounded-tr-none') : 'bg-white text-gray-800 rounded-tl-none'}`}>
                            {editingMessageId === msg.id ? (
                                <div className="min-w-[200px]">
                                    <textarea
                                        value={editContent}
                                        onChange={e => {
                                            setEditContent(e.target.value);
                                            e.target.style.height = 'auto';
                                            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                                        }}
                                        className="w-full p-2 text-sm bg-white/20 text-white placeholder-white/70 border border-white/30 rounded-md focus:outline-none focus:bg-white/30 resize-none overflow-hidden"
                                        rows={1}
                                        autoFocus
                                        onFocus={e => {
                                            e.target.style.height = 'auto';
                                            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                                        }}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleEditMessage(msg.id, editContent);
                                            }
                                            if (e.key === 'Escape') setEditingMessageId(null);
                                        }}
                                    />
                                    <div className="flex justify-end gap-2 mt-1">
                                        <button onClick={() => setEditingMessageId(null)} className="text-[10px] text-white/70 hover:text-white uppercase font-bold tracking-widest">Cancelar</button>
                                        <button onClick={() => handleEditMessage(msg.id, editContent)} className="text-[10px] bg-white text-brand-600 px-2 py-0.5 rounded uppercase font-black tracking-widest hover:bg-gray-100 shadow-sm">Salvar</button>
                                    </div>
                                </div>
                            ) : (
                                renderMessageContent(msg)
                            )}
                            <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${msg.isFromMe ? (msg.status === 'failed' ? 'text-red-500' : 'text-white/70') : 'text-gray-400'}`}>
                                {(msg as any).isEdited && <span className="italic mr-1 opacity-80">editado</span>}
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
                {/* Indicador de Digitando */}
                {isTyping && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {!isStoreOpen ? (
                <div className="bg-gray-100 border-t border-gray-200 p-6 flex flex-col items-center justify-center text-center gap-2">
                    <div className="bg-gray-200 p-3 rounded-full mb-1">
                        <Store size={24} className="text-gray-500" />
                    </div>
                    <h3 className="font-bold text-gray-700 uppercase tracking-widest text-sm">Loja Fechada</h3>
                    <p className="text-xs text-gray-500 max-w-xs">
                        A loja não está recebendo mensagens no momento. Tente novamente durante o horário de funcionamento.
                    </p>
                    {store?.opening_hours && (
                        <p className="text-[10px] text-gray-400 mt-1 font-mono">{store.opening_hours}</p>
                    )}
                </div>
            ) : (
                <div className="bg-white border-t border-gray-100 p-4 flex items-end gap-3">
                    <div className="flex-1 bg-[#F0F2F5] rounded-3xl px-4 py-2 min-h-[44px] flex items-center focus-within:bg-white focus-within:shadow-sm transition-all">
                        <textarea
                            className="bg-transparent border-none outline-none w-full text-[#111B21] placeholder:text-gray-500 text-[15px] resize-none max-h-[150px] overflow-hidden custom-scrollbar leading-relaxed"
                            placeholder="Escreva sua mensagem..."
                            rows={1}
                            value={inputText}
                            onChange={e => {
                                setInputText(e.target.value);
                                // Auto-resize
                                e.target.style.height = 'auto';
                                const newHeight = Math.min(e.target.scrollHeight, 150);
                                e.target.style.height = newHeight + 'px';
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSendMessage();
                                    // Reset height
                                    setTimeout(() => {
                                        (e.target as HTMLTextAreaElement).style.height = 'auto';
                                    }, 0);
                                }
                            }}
                            style={{ minHeight: '24px' }}
                        />
                    </div>
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputText.trim()}
                        className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-md"
                        title="Enviar mensagem"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Modal de Confirmação de Limpeza */}
            <BaseModal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Limpar Conversa" icon={<Trash2 className="w-6 h-6 text-red-500" />}>
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">Tem certeza que deseja apagar todas as mensagens desta conversa?</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Esta ação não pode ser desfeita.</p>
                    <div className="flex gap-3 pt-4">
                        <Button onClick={() => setShowClearModal(false)} variant="outline" fullWidth>Cancelar</Button>
                        <Button onClick={handleClearChat} className="bg-red-500 hover:bg-red-600 text-white" fullWidth>Apagar Tudo</Button>
                    </div>
                </div>
            </BaseModal>

            {/* Modal de Identificação do Cliente */}
            <BaseModal
                isOpen={showNameModal}
                onClose={() => {
                    if (customerName) setShowNameModal(false);
                }}
                title="Como gostaria de ser chamado?"
                icon={<User className="w-6 h-6 text-brand-600" />}
            >
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Olá! Para que a loja e o nosso assistente saibam com quem estão falando, por favor diga seu nome:</p>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Seu Nome</label>
                        <input
                            type="text"
                            value={tempName}
                            onChange={e => setTempName(e.target.value)}
                            placeholder="Digite seu nome ou apelido..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 outline-none font-medium"
                            onKeyDown={e => {
                                if (e.key === 'Enter' && tempName.trim()) {
                                    setCustomerName(tempName.trim());
                                    localStorage.setItem('ze_customer_name', tempName.trim());
                                    setShowNameModal(false);
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <Button
                        onClick={() => {
                            if (tempName.trim()) {
                                setCustomerName(tempName.trim());
                                localStorage.setItem('ze_customer_name', tempName.trim());
                                setShowNameModal(false);
                            }
                        }}
                        className="bg-brand-600 hover:bg-brand-700 text-white w-full py-4 text-sm font-black uppercase tracking-widest"
                        disabled={!tempName.trim()}
                    >
                        Começar Conversa
                    </Button>
                </div>
            </BaseModal>
        </div >
    );
};
