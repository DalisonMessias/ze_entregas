import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Paperclip, X, Image as ImageIcon, FileText, Download, Loader2, Clock, AlertCircle } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Button } from './Button';
import { CityStoreBannerRequestMessage } from '../types';
import * as cloud from '../services/cloud';
import { formatDateTime } from '../utils/formatMinutes';
import { checkBusinessHours, getNextBusinessDayMessage } from '../utils/supportHours';

interface ChatExclusivoModalProps {
    isOpen: boolean;
    onClose: () => void;
    requestId: string;
    storeName?: string;
}

export const ChatExclusivoModal: React.FC<ChatExclusivoModalProps> = ({
    isOpen,
    onClose,
    requestId,
    storeName = 'Admin'
}) => {
    const [messages, setMessages] = useState<CityStoreBannerRequestMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [isOpenSupport, setIsOpenSupport] = useState(true);
    const [supportStatusMsg, setSupportStatusMsg] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const loadMessages = async () => {
        if (!requestId) return;
        setLoading(true);
        try {
            const data = await cloud.getCityStoreBannerRequestMessages(requestId);
            setMessages(data);
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && requestId) {
            loadMessages();

            const fetchSupportStatus = async () => {
                try {
                    const settings = await cloud.getShopSettings();
                    if (settings) {
                        const start = settings.support_hours_start || '09:00';
                        const end = settings.support_hours_end || '18:00';
                        const override = (settings.support_status_override || 'AUTO') as 'AUTO' | 'OPEN' | 'CLOSED';

                        const check = (ov: string, s: string, e: string) => {
                            if (ov === 'OPEN') return true;
                            if (ov === 'CLOSED') return false;
                            return checkBusinessHours(s, e);
                        };

                        const open = check(override, start, end);
                        setIsOpenSupport(open);
                        if (!open) {
                            setSupportStatusMsg(getNextBusinessDayMessage(start));
                        }
                    }
                } catch (error) {
                    console.error('Erro ao buscar status do suporte:', error);
                }
            };
            fetchSupportStatus();

            const supabase = cloud.getClient();
            if (!supabase) return;

            const channel = supabase
                .channel(`banner_request_${requestId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'city_store_banner_request_messages',
                        filter: `request_id=eq.${requestId}`
                    },
                    (payload) => {
                        const newMsg = payload.new as CityStoreBannerRequestMessage;
                        setMessages((prev) => {
                            if (prev.find(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [isOpen, requestId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => setFilePreview(event.target?.result as string);
                reader.readAsDataURL(file);
            } else {
                setFilePreview(null);
            }
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || sending) return;

        setSending(true);
        try {
            const success = await cloud.sendCityStoreBannerRequestMessage(
                requestId,
                'store',
                newMessage.trim(),
                selectedFile || undefined
            );

            if (success) {
                setNewMessage('');
                handleRemoveFile();
                await loadMessages();
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        } finally {
            setSending(false);
        }
    };

    const renderMessageContent = (msg: CityStoreBannerRequestMessage) => {
        if (msg.message_type === 'file' && msg.file_url) {
            const isImage = msg.file_mime_type?.startsWith('image/');
            return (
                <div className="space-y-2">
                    {isImage ? (
                        <div className="rounded-lg overflow-hidden border border-white/20">
                            <img
                                src={msg.file_url}
                                alt={msg.file_name}
                                className="max-w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.file_url, '_blank')}
                            />
                        </div>
                    ) : (
                        <div
                            className="flex items-center gap-3 p-3 bg-white/10 rounded-xl cursor-pointer hover:bg-white/20 transition-colors"
                            onClick={() => window.open(msg.file_url, '_blank')}
                        >
                            <FileText className="w-8 h-8 opacity-70" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{msg.file_name}</p>
                                <p className="text-[10px] opacity-70">{(msg.file_size || 0) / 1024 > 1024
                                    ? `${((msg.file_size || 0) / (1024 * 1024)).toFixed(1)} MB`
                                    : `${((msg.file_size || 0) / 1024).toFixed(0)} KB`}</p>
                            </div>
                            <Download className="w-4 h-4" />
                        </div>
                    )}
                    {msg.message && <p className="text-sm whitespace-pre-wrap">{msg.message}</p>}
                </div>
            );
        }
        return <p className="text-sm whitespace-pre-wrap">{msg.message}</p>;
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Chat Exclusivo"
            icon={<MessageCircle className="w-6 h-6 text-brand-600" />}
            maxWidth="2xl"
            disableScroll
        >
            <div className="flex flex-col h-[60vh] -mx-6 -mb-6">
                {/* Header Subtitle */}
                <div className="px-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500">
                        Fale diretamente com nossa equipe sobre sua solicitação.
                    </p>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50/50 dark:bg-gray-900/30">
                    {!isOpenSupport && (
                        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
                            <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-xl text-amber-600 dark:text-amber-400">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-black text-amber-900 dark:text-amber-100 uppercase tracking-tight">Equipe fora de horário</h4>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                                    Nossa equipe humana está offline agora. Você pode enviar sua mensagem e responderemos assim que possível.
                                </p>
                                <div className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> {supportStatusMsg}
                                </div>
                            </div>
                        </div>
                    )}

                    {loading && messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                            <p className="text-sm text-gray-500">Carregando mensagens...</p>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-10">
                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                                <MessageCircle className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Nenhuma mensagem ainda</p>
                            <p className="text-xs text-gray-500 mt-1">Envie sua primeira mensagem abaixo para iniciar a conversa.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${msg.sender_role === 'store' ? 'items-end' : 'items-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${msg.sender_role === 'store'
                                        ? 'bg-brand-600 text-white rounded-tr-none'
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-none border border-gray-100 dark:border-gray-700'
                                        }`}
                                >
                                    <div className="flex justify-between items-center mb-1 gap-4">
                                        <span className="text-[10px] font-black uppercase opacity-70">
                                            {msg.sender_role === 'store' ? 'Você' : storeName}
                                        </span>
                                        <span className="text-[9px] opacity-60">
                                            {formatDateTime(msg.created_at)}
                                        </span>
                                    </div>
                                    {renderMessageContent(msg)}
                                </div>
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    {selectedFile && (
                        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
                            {filePreview ? (
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                    <img src={filePreview} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-6 h-6 text-gray-400" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{selectedFile.name}</p>
                                <p className="text-[10px] text-gray-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                            </div>
                            <button
                                onClick={handleRemoveFile}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <form className="flex items-center gap-2" onSubmit={handleSendMessage}>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl text-gray-500 transition-colors"
                            disabled={sending}
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="image/*,application/pdf"
                        />
                        <input
                            type="text"
                            placeholder="Digite sua mensagem..."
                            className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-500 text-sm dark:text-white"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={sending}
                        />
                        <button
                            type="submit"
                            disabled={sending || (!newMessage.trim() && !selectedFile)}
                            className="p-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-95"
                        >
                            {sending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </BaseModal>
    );
};
