import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Link2, LogOut, MessageSquare, Power, PowerOff, QrCode, ShieldCheck, Smartphone, RefreshCcw, CheckCircle2, Copy, Share2, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AccessDenied } from './AccessDenied';
import { Button } from './Button';
import { Loading } from './Loading';
import * as cloud from '../services/cloud';
import * as whatsbot from '../services/whatsbot';
import { WhatsBotStatus } from '../types';
import { useDialog } from '../utils/dialogService';

const statusMap: Record<WhatsBotStatus['connectionStatus'], { label: string; badge: string }> = {
    CONNECTED: {
        label: 'Conectado',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    },
    CONNECTING: {
        label: 'Conectando',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    },
    WAITING_QR: {
        label: 'Aguardando QR',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    },
    DISCONNECTED: {
        label: 'Desconectado',
        badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
};

export const WhatsBot: React.FC = () => {
    const [status, setStatus] = useState<WhatsBotStatus | null>(null);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingAction, setLoadingAction] = useState<'start' | 'stop' | 'save' | 'logout' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [draftMessage, setDraftMessage] = useState('');
    const [draftClosedMessage, setDraftClosedMessage] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [isSuperStore, setIsSuperStore] = useState<boolean | null>(null);
    const isDirtyRef = useRef(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useDialog();

    const requestOptions = useMemo(() => ({
        storeId
    }), [storeId]);

    const refreshStatus = useCallback(async (syncDraft = false, storeIdOverride?: string | null) => {
        try {
            const data = await whatsbot.getWhatsBotStatus({
                storeId: storeIdOverride || requestOptions.storeId
            });
            setStatus(data);
            setError(null);
            if (syncDraft || !isDirtyRef.current) {
                setDraftMessage(data.customMessage || '');
                setDraftClosedMessage(data.customClosedMessage || '');
                setIsDirty(false);
                isDirtyRef.current = false;
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Erro ao carregar status do WhatsBot.');
        } finally {
            setLoading(false);
        }
    }, [requestOptions]);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            try {
                const profile = await cloud.getMyPartnerProfile();
                if (!mounted) return;

                setStoreId(profile?.id || null);
                const superStore = !!profile?.is_super_store;
                setIsSuperStore(superStore);

                if (superStore) {
                    await refreshStatus(true, profile?.id || null);
                } else {
                    setLoading(false);
                }
            } catch (err: any) {
                if (!mounted) return;
                setLoading(false);
                setIsSuperStore(false);
                setError(err?.message || 'Erro ao carregar o perfil da loja.');
            }
        };

        void load();

        return () => {
            mounted = false;
        };
    }, [refreshStatus]);

    useEffect(() => {
        if (!status) return;
        if (!status.enabled && status.connectionStatus === 'DISCONNECTED') return;

        const interval = setInterval(() => {
            void refreshStatus();
        }, 5000);

        return () => clearInterval(interval);
    }, [refreshStatus, status]);

    const handleSave = async () => {
        setLoadingAction('save');
        try {
            const updated = await whatsbot.updateWhatsBotConfig(draftMessage, draftClosedMessage, requestOptions);
            setStatus(updated);
            setDraftMessage(updated.customMessage || '');
            setDraftClosedMessage(updated.customClosedMessage || '');
            setIsDirty(false);
            isDirtyRef.current = false;
            setError(null);
            toast({ message: 'Configurações do WhatsBot salvas com sucesso.', type: 'success' });
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao salvar a mensagem do WhatsBot.';
            setError(message);
            toast({ message, type: 'error' });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleStart = async () => {
        setLoadingAction('start');
        try {
            const updated = await whatsbot.startWhatsBot(requestOptions);
            setStatus(updated);
            setDraftMessage(updated.customMessage || '');
            setDraftClosedMessage(updated.customClosedMessage || '');
            setIsDirty(false);
            isDirtyRef.current = false;
            setError(null);
            toast({ message: 'WhatsBot ligado com sucesso.', type: 'success' });
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao ligar o WhatsBot.';
            setError(message);
            toast({ message, type: 'error' });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleStop = async () => {
        setLoadingAction('stop');
        try {
            const updated = await whatsbot.stopWhatsBot(requestOptions);
            setStatus(updated);
            setDraftMessage(updated.customMessage || '');
            setDraftClosedMessage(updated.customClosedMessage || '');
            setIsDirty(false);
            isDirtyRef.current = false;
            setError(null);
            toast({ message: 'WhatsBot desligado imediatamente.', type: 'success' });
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao desligar o WhatsBot.';
            setError(message);
            toast({ message, type: 'error' });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleLogout = async () => {
        setLoadingAction('logout');
        try {
            const updated = await whatsbot.logoutWhatsBot(requestOptions);
            setStatus(updated);
            setDraftMessage(updated.customMessage || '');
            setDraftClosedMessage(updated.customClosedMessage || '');
            setIsDirty(false);
            isDirtyRef.current = false;
            setError(null);
            toast({ message: 'Sessão do WhatsBot encerrada com sucesso.', type: 'success' });
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao encerrar sessão do WhatsBot.';
            setError(message);
            toast({ message, type: 'error' });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleCopyLink = async () => {
        if (!status?.catalogUrl) return;
        try {
            await navigator.clipboard.writeText(status.catalogUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ message: 'Link copiado para a área de transferência!', type: 'success' });
        } catch (err) {
            toast({ message: 'Erro ao copiar o link.', type: 'error' });
        }
    };

    const handleShareLink = async () => {
        if (!status?.catalogUrl) return;
        
        const shareData = {
            title: status.enabled ? `Catálogo - ${status.connectedPhone || 'Loja'}` : 'Meu Catálogo Digital',
            text: 'Confira nosso catálogo digital e faça seu pedido!',
            url: status.catalogUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                // Usuário cancelou ou erro no dispositivo
            }
        } else {
            // Fallback para WhatsApp Web
            window.open(`https://wa.me/?text=${encodeURIComponent(shareData.text + " " + shareData.url)}`, '_blank');
        }
    };

    const previewMessage = useMemo(() => {
        if (!status) return '';
        const customMessage = draftMessage.trim();

        if (customMessage) {
            return customMessage
                .replace(/\{\{\s*catalog_url\s*\}\}/gi, status.catalogUrl)
                .replace(/\{\s*catalogUrl\s*\}/g, status.catalogUrl);
        }

        return status.catalogUrl
            ? `Olá! Aqui está o link da nossa loja: ${status.catalogUrl}`
            : 'Configure a URL pública do catálogo para usar a mensagem padrão com link.';
    }, [draftMessage, status]);

    const previewClosedMessage = useMemo(() => {
        if (!status) return '';
        const customMessage = draftClosedMessage.trim();

        if (customMessage) {
            return customMessage
                .replace(/\{\{\s*catalog_url\s*\}\}/gi, status.catalogUrl)
                .replace(/\{\s*catalogUrl\s*\}/g, status.catalogUrl);
        }

        return status.catalogUrl
            ? `Olá! No momento estamos fechados, mas você pode conferir nossos produtos e preços aqui para o seu próximo pedido: ${status.catalogUrl}`
            : 'Configure a URL pública do catálogo para usar a mensagem padrão com link.';
    }, [draftClosedMessage, status]);

    if (loading) {
        return <Loading variant="container" size="md" message="Carregando WhatsBot..." />;
    }

    if (isSuperStore === false) {
        return (
            <AccessDenied
                currentUserRole="store_partner"
                requiredRole="store_partner"
                reason="O WhatsBot é um recurso exclusivo para super lojistas."
            />
        );
    }

    if (!status) {
        return (
            <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">{error || 'Não foi possível carregar o WhatsBot.'}</p>
                </div>
                <Button onClick={() => { setLoading(true); void refreshStatus(true); }}>
                    Tentar novamente
                </Button>
            </div>
        );
    }

    const statusInfo = statusMap[status.connectionStatus];

    return (
        <div className="space-y-6 animate-in fade-in pb-24">
            <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 text-white p-6 md:p-8 rounded-[32px] shadow-2xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10">
                    <Bot className="w-48 h-48" />
                </div>
                <div className="relative z-10 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">Automação WhatsApp</p>
                            <h1 className="text-3xl font-black tracking-tight">WhatsBot</h1>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${statusInfo.badge}`}>
                            {statusInfo.label}
                        </span>
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white/90">
                            {status.enabled ? 'Bot ligado' : 'Bot desligado'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                            <p className="text-[11px] font-black uppercase tracking-wider text-white/60 mb-1">Conexão</p>
                            <p className="text-lg font-black">{statusInfo.label}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                            <p className="text-[11px] font-black uppercase tracking-wider text-white/60 mb-1">Número conectado</p>
                            <p className="text-lg font-black break-all">+{status.connectedPhone || 'Ainda não conectado'}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                            <p className="text-[11px] font-black uppercase tracking-wider text-white/60 mb-1">Proteção anti-spam</p>
                            <p className="text-lg font-black">1 envio por dia</p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Controle do Bot</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Ligue o bot para manter a resposta automática ativa e desligue para interromper imediatamente os envios.
                                </p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {!status.enabled ? (
                                    <Button
                                        variant="success"
                                        onClick={handleStart}
                                        loading={loadingAction === 'start'}
                                        disabled={loadingAction !== null}
                                        icon={<Power className="w-4 h-4" />}
                                    >
                                        Ligar Bot
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        onClick={handleStop}
                                        loading={loadingAction === 'stop'}
                                        disabled={loadingAction !== null}
                                        icon={<PowerOff className="w-4 h-4" />}
                                    >
                                        Desligar Bot
                                    </Button>
                                )}
                                <Button
                                    variant="danger"
                                    onClick={handleLogout}
                                    loading={loadingAction === 'logout'}
                                    disabled={loadingAction !== null}
                                    icon={<LogOut className="w-4 h-4" />}
                                >
                                    Sair / Reset
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Envio controlado por contato</span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    O WhatsBot só responde uma vez por dia para cada número, evitando mensagens repetidas no mesmo contato.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Smartphone className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">Reconexão automática</span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Se o WhatsApp cair enquanto o bot estiver ligado, o sistema tenta reconectar automaticamente preservando a sessão salva.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Mensagem Automática</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Se este campo ficar vazio, o sistema envia a mensagem padrão com o link do catálogo digital.
                                </p>
                            </div>
                            <Button
                                onClick={handleSave}
                                loading={loadingAction === 'save'}
                                disabled={loadingAction !== null || !isDirty}
                            >
                                Salvar mensagem
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Texto personalizado</label>
                            <textarea
                                value={draftMessage}
                                onChange={(event) => {
                                    setDraftMessage(event.target.value);
                                    setIsDirty(true);
                                    isDirtyRef.current = true;
                                }}
                                rows={6}
                                placeholder="Ex: Oi! Nosso catálogo está aqui: {{catalog_url}}"
                                className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                            />
                            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                        <PowerOff className="w-3 h-3" />
                                        Texto (Loja Fechada)
                                    </label>
                                    <textarea
                                        value={draftClosedMessage}
                                        onChange={(event) => {
                                            setDraftClosedMessage(event.target.value);
                                            setIsDirty(true);
                                            isDirtyRef.current = true;
                                        }}
                                        rows={4}
                                        placeholder="Ex: Olá! No momento estamos fechados, mas confira nosso catálogo: {{catalog_url}}"
                                        className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                                    />
                                    <p className="text-[10px] text-gray-400 italic">
                                        Esta mensagem será enviada apenas quando a loja estiver marcada como <strong>FECHADA</strong>.
                                    </p>
                                </div>
                                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-3 h-3 text-gray-400" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Prévia (Fechado)</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words">{previewClosedMessage}</p>
                                </div>
                            </div>

                            <p className="text-xs text-gray-400">
                                Você pode usar <code className="font-mono">{'{{catalog_url}}'}</code> ou <code className="font-mono">{'{catalogUrl}'}</code> para inserir o link automaticamente na mensagem.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/20">
                            <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-bold text-gray-900 dark:text-white">Prévia da resposta</span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">{previewMessage}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-gray-500" />
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">QR Code de Conexão</h2>
                        </div>

                        {status.enabled && !status.qrCode && status.connectionStatus === 'CONNECTING' ? (
                            <div className="text-center py-10">
                                <RefreshCcw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                                <p className="text-gray-600 dark:text-gray-400">Iniciando conexão segura...</p>
                            </div>
                        ) : !status.enabled ? (
                            <div className="text-center py-10 opacity-60">
                                {status.connectedPhone ? (
                                    <>
                                        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                        <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Pronto para Conectar</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 px-6">
                                            Identificamos uma sessão ativa com o número <strong>{status.connectedPhone}</strong>. <br />
                                            Clique em <strong>"Ligar Bot"</strong> para ativar o atendimento automático.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Aguardando Ativação</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 px-6">
                                            Ligue o bot para gerar um novo QR Code e começar a automação.
                                        </p>
                                    </>
                                )}
                            </div>
                        ) : status.enabled && status.connectionStatus === 'WAITING_QR' && status.qrCode ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                                    <QRCodeSVG value={status.qrCode} size={240} includeMargin />
                                </div>
                                <p className="text-sm text-center text-gray-500 dark:text-gray-400">
                                    Escaneie este QR Code com o WhatsApp do número que ficará responsável pelas respostas automáticas.
                                </p>
                            </div>
                        ) : status.connectionStatus === 'CONNECTED' ? (
                            <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/30 p-8 text-center bg-emerald-50/50 dark:bg-emerald-900/10">
                                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                                    <ShieldCheck className="w-8 h-8 text-emerald-600" />
                                </div>
                                <p className="font-black text-gray-900 dark:text-white mb-1">WhatsApp Conectado</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    O robô está pronto para responder mensagens. Você pode usar o botão "Sair / Reset" para trocar de conta.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
                                <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">QR Code indisponível</p>
                                <p className="text-sm">
                                    Ligue o bot para gerar um novo QR ou aguarde a reconexão automática quando a sessão precisar ser autenticada novamente.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div className="flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-gray-500" />
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Catálogo Digital</h2>
                        </div>
                        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-4 space-y-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Link usado na mensagem padrão</p>
                                <p className="text-sm font-mono break-all text-gray-700 dark:text-gray-200">
                                    {status.catalogUrl || 'Configure PUBLIC_APP_URL e os slugs da loja para montar o link público.'}
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={handleCopyLink}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                >
                                    {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                    {copied ? 'Copiado!' : 'Copiar Link'}
                                </button>
                                <button
                                    onClick={handleShareLink}
                                    className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-brand-500 text-white text-xs font-bold hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20"
                                >
                                    <Share2 className="w-3 h-3" />
                                    Compartilhar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WhatsBot;
