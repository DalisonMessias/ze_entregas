import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Link2, LogOut, MessageSquare, Power, PowerOff, QrCode, ShieldCheck, Smartphone, RefreshCcw, CheckCircle2, Copy, Share2, Check, Crown, Lock, Megaphone, Users, Plus, Play, StopCircle, Loader2, Image as ImageIcon, Camera, Trash2, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AccessDenied } from './AccessDenied';
import { Button } from './Button';
import { Loading } from './Loading';
import * as cloud from '../services/cloud';
import * as whatsbot from '../services/whatsbot';
import { WhatsBotStatus } from '../types';
import { useDialog } from '../utils/dialogService';
import { usePlanPermissions } from '../hooks/usePlanPermissions';

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

const ImageInput: React.FC<{
    label: string;
    value: string | null;
    onChange: (val: string | null) => void;
    placeholder?: string;
    setIsDirty?: (val: boolean) => void;
}> = ({ label, value, onChange, placeholder, setIsDirty }) => (
    <div className="space-y-2 mt-4 mb-4">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <ImageIcon size={16} className="text-indigo-500" />
            {label}
        </label>
        <div className="flex gap-2">
            <div className="relative flex-1">
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => {
                        onChange(e.target.value || null);
                        if (setIsDirty) setIsDirty(true);
                    }}
                    placeholder={placeholder || "https://exemplo.com/imagem.jpg"}
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all text-sm outline-none"
                />
                <Camera size={18} className="absolute right-3 top-2.5 text-slate-400" />
            </div>
            {value && (
                <button
                    onClick={() => {
                        onChange(null);
                        if (setIsDirty) setIsDirty(true);
                    }}
                    className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-900/30 transition-colors"
                    title="Remover imagem"
                >
                    <Trash2 size={18} />
                </button>
            )}
        </div>
        {value && value.startsWith('http') && (
            <div className="mt-2 relative group w-full max-w-[240px] aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-sm">
                <img 
                    src={value} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=URL+Inv%C3%A1lida';
                    }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={value} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white">
                        <ExternalLink size={18} />
                    </a>
                </div>
            </div>
        )}
        {!value && (
            <p className="text-[11px] text-slate-400 italic">
                Cole o link de uma imagem (JPG, PNG) para enviar com a mensagem.
            </p>
        )}
    </div>
);

export const WhatsBot: React.FC = () => {
    const [status, setStatus] = useState<WhatsBotStatus | null>(null);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingAction, setLoadingAction] = useState<'start' | 'stop' | 'save' | 'logout' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [draftMessage, setDraftMessage] = useState('');
    const [draftClosedMessage, setDraftClosedMessage] = useState('');
    const [draftImageUrl, setDraftImageUrl] = useState<string | null>(null);
    const [draftClosedImageUrl, setDraftClosedImageUrl] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const isDirtyRef = useRef(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useDialog();
    const { canAccessWhatsBot, loading: loadingPlan } = usePlanPermissions();

    // Estados de Campanhas
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(false);
    const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
    const [availableContacts, setAvailableContacts] = useState<any[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [newCampaignName, setNewCampaignName] = useState('');
    const [newCampaignMessage, setNewCampaignMessage] = useState('');
    const [newCampaignImageUrl, setNewCampaignImageUrl] = useState<string | null>(null);
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [creatingCampaign, setCreatingCampaign] = useState(false);

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
                setDraftImageUrl(data.imageUrl || null);
                setDraftClosedImageUrl(data.closedImageUrl || null);
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

                // Carrega o status do WhatsBot apenas se o plano permitir
                // A verificação de plano é feita pelo hook usePlanPermissions
                if (profile?.id) {
                    await refreshStatus(true, profile?.id || null);
                } else {
                    setLoading(false);
                }
            } catch (err: any) {
                if (!mounted) return;
                setLoading(false);
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
            const updated = await whatsbot.updateWhatsBotConfig(
                draftMessage, 
                draftClosedMessage, 
                draftImageUrl, 
                draftClosedImageUrl, 
                requestOptions
            );
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

    const loadCampaigns = useCallback(async (quiet = false) => {
        if (!storeId) return;
        if (!quiet) setLoadingCampaigns(true);
        try {
            const data = await whatsbot.getWhatsBotCampaigns(requestOptions);
            setCampaigns(data || []);
        } catch (err: any) {
            console.error('Erro ao carregar campanhas:', err);
        } finally {
            if (!quiet) setLoadingCampaigns(false);
        }
    }, [storeId, requestOptions]);

    const loadAvailableContacts = useCallback(async () => {
        if (!storeId) return;
        setLoadingContacts(true);
        try {
            const data = await whatsbot.getWhatsBotAvailableContacts(requestOptions);
            setAvailableContacts(data || []);
            // Pré-selecionar todos por padrão
            setSelectedContacts((data || []).map((c: any) => c.phone));
        } catch (err: any) {
            toast({ message: 'Erro ao carregar contatos para a campanha.', type: 'error' });
        } finally {
            setLoadingContacts(false);
        }
    }, [storeId, requestOptions, toast]);

    const handleCreateCampaign = async () => {
        if (!newCampaignName.trim() || !newCampaignMessage.trim() || selectedContacts.length === 0) {
            toast({ message: 'Preencha todos os campos e selecione ao menos um contato.', type: 'error' });
            return;
        }

        setCreatingCampaign(true);
        try {
            await whatsbot.createWhatsBotCampaign(
                newCampaignName,
                newCampaignMessage,
                selectedContacts,
                newCampaignImageUrl,
                requestOptions
            );
            toast({ message: 'Campanha criada com sucesso! O disparo começará em breve.', type: 'success' });
            setShowNewCampaignModal(false);
            setNewCampaignName('');
            setNewCampaignMessage('');
            void loadCampaigns();
        } catch (err: any) {
            toast({ message: err.message || 'Erro ao criar campanha.', type: 'error' });
        } finally {
            setCreatingCampaign(false);
        }
    };

    const handleStopCampaign = async (id: string) => {
        try {
            await whatsbot.stopWhatsBotCampaign(id, requestOptions);
            toast({ message: 'Campanha interrompida.', type: 'success' });
            void loadCampaigns(true);
        } catch (err: any) {
            toast({ message: 'Erro ao parar campanha.', type: 'error' });
        }
    };

    useEffect(() => {
        if (canAccessWhatsBot && storeId) {
            void loadCampaigns();
        }
    }, [canAccessWhatsBot, storeId, loadCampaigns]);

    // Polling para atualizar progresso das campanhas se houver alguma em processamento
    useEffect(() => {
        const hasActiveCampaigns = campaigns.some(c => c.status === 'processing' || c.status === 'pending');
        if (!hasActiveCampaigns || !canAccessWhatsBot || !storeId) return;

        const interval = setInterval(() => {
            void loadCampaigns(true);
        }, 5000);

        return () => clearInterval(interval);
    }, [campaigns, canAccessWhatsBot, storeId, loadCampaigns]);

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

    if (loading || loadingPlan) {
        return <Loading variant="container" size="md" message="Carregando WhatsBot..." />;
    }

    if (!canAccessWhatsBot) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in">
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-xl max-w-md w-full">
                    <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                        <Bot className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">WhatsBot Bloqueado</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                        O <strong>WhatsBot</strong> é exclusivo para lojistas nos planos <strong>Por Pedido</strong> ou <strong>Mensal</strong>. Automatize seu atendimento via WhatsApp!
                    </p>
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm text-left">
                            <MessageSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-300">Resposta automática via WhatsApp</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm text-left">
                            <Link2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-300">Envia o link do catálogo digital automaticamente</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-sm text-left">
                            <ShieldCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-300">Anti-spam: 1 envio por contato por dia</span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const event = new CustomEvent('navigateToTab', { detail: { tab: 'store_plans' } });
                            window.dispatchEvent(event);
                        }}
                        className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
                    >
                        <Crown className="w-4 h-4" />
                        Ver Planos e Fazer Upgrade
                    </button>
                </div>
            </div>
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

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-wider text-gray-400">Mensagem (Loja Aberta)</label>
                                <textarea
                                    value={draftMessage}
                                    onChange={(event) => {
                                        setDraftMessage(event.target.value);
                                        setIsDirty(true);
                                        isDirtyRef.current = true;
                                    }}
                                    rows={4}
                                    placeholder="Ex: Oi! Nosso catálogo está aqui: {{catalog_url}}"
                                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
                                />
                                <ImageInput 
                                    label="Imagem Opcional (URL) - Loja Aberta"
                                    value={draftImageUrl}
                                    onChange={setDraftImageUrl}
                                    setIsDirty={setIsDirty}
                                    placeholder="Link da imagem para quando a loja estiver ABERTA"
                                />
                                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-3 h-3 text-gray-400" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Prévia (Aberto)</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words">{previewMessage}</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                                <label className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                                    <PowerOff className="w-3 h-3 text-rose-500" />
                                    Mensagem (Loja Fechada)
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
                                <ImageInput 
                                    label="Imagem Opcional (URL) - Loja Fechada"
                                    value={draftClosedImageUrl}
                                    onChange={setDraftClosedImageUrl}
                                    setIsDirty={setIsDirty}
                                    placeholder="Link da imagem para quando a loja estiver FECHADA"
                                />
                                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-3 h-3 text-gray-400" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Prévia (Fechado)</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words">{previewClosedMessage}</p>
                                </div>
                            </div>

                            <p className="text-[11px] text-gray-400 italic">
                                Você pode usar <code className="font-mono text-indigo-500 font-bold">{'{{catalog_url}}'}</code> para inserir o link automaticamente na mensagem.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 h-fit sticky top-6">
                        <div className="flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-gray-500" />
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">QR Code de Conexão</h2>
                        </div>

                        <div className="min-h-[300px] flex flex-col justify-center">
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
                                    <p className="text-sm font-medium">
                                        Ligue o bot para gerar um novo QR ou aguarde a reconexão automática.
                                    </p>
                                </div>
                            )}
                        </div>
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

            {/* Nova Seção: Campanhas de Marketing */}
            <div className="pt-8 border-t border-gray-100 dark:border-gray-700/50 mt-8">
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                            <Megaphone className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                Campanhas de Marketing
                                <span className="px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/40 text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wider">Beta</span>
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Dispare mensagens em massa para seus contatos com segurança.</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => { setShowNewCampaignModal(true); void loadAvailableContacts(); }}
                        icon={<Plus className="w-4 h-4" />}
                    >
                        Nova Campanha
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loadingCampaigns ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-900/10 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-700">
                            <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Carregando campanhas...</p>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-900/10 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-700 text-center px-6">
                            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                <Megaphone className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">Nenhuma campanha enviada</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                                Crie sua primeira campanha para disparar promoções ou avisos importantes para seus clientes via WhatsApp.
                            </p>
                        </div>
                    ) : (
                        campaigns.map((camp) => (
                            <div key={camp.id} className="bg-white dark:bg-gray-800 p-5 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-gray-900 dark:text-white truncate" title={camp.name}>{camp.name}</h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            {new Date(camp.created_at).toLocaleDateString()} às {new Date(camp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                        camp.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                        camp.status === 'processing' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                                        camp.status === 'stopped' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {camp.status === 'completed' ? 'Concluída' :
                                         camp.status === 'processing' ? 'Enviando...' :
                                         camp.status === 'stopped' ? 'Parada' :
                                         'Pendente'}
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 italic">
                                    "{camp.message}"
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-gray-500 uppercase tracking-widest text-[10px]">Progresso</span>
                                        <span className="text-gray-900 dark:text-white">
                                            {camp.sent_successfully + camp.sent_failed} / {camp.total_recipients}
                                        </span>
                                    </div>
                                    
                                    <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-500 rounded-full ${camp.status === 'stopped' ? 'bg-red-500' : 'bg-brand-500'}`}
                                            style={{ width: `${( (camp.sent_successfully + camp.sent_failed) / camp.total_recipients ) * 100}%` }}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <div className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 text-center">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Sucesso</p>
                                            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">{camp.sent_successfully}</p>
                                        </div>
                                        <div className="p-2 rounded-2xl bg-red-50 dark:bg-red-900/10 text-center">
                                            <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter">Falha</p>
                                            <p className="text-sm font-black text-red-700 dark:text-red-400">{camp.sent_failed}</p>
                                        </div>
                                    </div>
                                </div>

                                {camp.status === 'processing' && (
                                    <button
                                        onClick={() => handleStopCampaign(camp.id)}
                                        className="absolute bottom-4 right-4 p-2 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/30 hover:scale-110 active:scale-95 transition-transform"
                                        title="Parar campanha imediatamente"
                                    >
                                        <StopCircle className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Nova Campanha */}
            {showNewCampaignModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-gray-50 dark:border-gray-700 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                                    <Megaphone className="w-6 h-6 text-brand-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Nova Campanha</h2>
                                    <p className="text-sm text-gray-500">Configure sua transmissão segura.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowNewCampaignModal(false)}
                                className="p-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto space-y-6 flex-1 thin-scrollbar">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Campanha</label>
                                <input 
                                    type="text"
                                    placeholder="Ex: Promoção de Quarta-feira"
                                    value={newCampaignName}
                                    onChange={(e) => setNewCampaignName(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold text-gray-800 dark:text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Mensagem do Disparo</label>
                                <textarea 
                                    rows={4}
                                    placeholder="Escreva sua mensagem aqui..."
                                    value={newCampaignMessage}
                                    onChange={(e) => setNewCampaignMessage(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all min-h-[120px] resize-none"
                                />
                                <ImageInput 
                                    label="Imagem da Campanha (URL)"
                                    value={newCampaignImageUrl}
                                    onChange={setNewCampaignImageUrl}
                                    placeholder="https://exemplo.com/banner-promocao.jpg"
                                />
                                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 flex items-start gap-3">
                                    <Smartphone className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-blue-700/80 dark:text-blue-400 leading-relaxed font-semibold italic">
                                        Seu link do catálogo digital será adicionado manualmente se você desejar. Use palavras variadas para evitar o bloqueio do WhatsApp.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-gray-50 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Selecionar Contatos</label>
                                    <span className="text-[10px] font-black text-brand-500 underline cursor-pointer hover:opacity-80" onClick={() => setSelectedContacts(availableContacts.map(c => c.phone))}>Selecionar Todos</span>
                                </div>
                                
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-2 thin-scrollbar">
                                    {loadingContacts ? (
                                        <div className="py-8 text-center text-xs text-gray-400 uppercase tracking-widest font-bold">Buscando contatos...</div>
                                    ) : availableContacts.length === 0 ? (
                                        <div className="py-8 text-center text-xs text-gray-400 italic">Nenhum contato encontrado no histórico do bot.</div>
                                    ) : (
                                        availableContacts.map((contact) => (
                                            <label 
                                                key={contact.phone} 
                                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                                                    selectedContacts.includes(contact.phone) 
                                                    ? 'border-brand-500 bg-brand-50/20 dark:bg-brand-500/10' 
                                                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/30 hover:border-gray-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                                                        selectedContacts.includes(contact.phone) ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                                    }`}>
                                                        {contact.phone.slice(-2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-800 dark:text-white">+{contact.phone}</p>
                                                        <p className="text-[10px] text-gray-400">Visto em {new Date(contact.last_interaction).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <input 
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={selectedContacts.includes(contact.phone)}
                                                    onChange={() => {
                                                        if (selectedContacts.includes(contact.phone)) {
                                                            setSelectedContacts(prev => prev.filter(p => p !== contact.phone));
                                                        } else {
                                                            setSelectedContacts(prev => [...prev, contact.phone]);
                                                        }
                                                    }}
                                                />
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                                    selectedContacts.includes(contact.phone) ? 'bg-brand-500 border-brand-500' : 'border-gray-200 dark:border-gray-600'
                                                }`}>
                                                    {selectedContacts.includes(contact.phone) && <Check className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50/50 dark:bg-gray-900/20 border-t border-gray-50 dark:border-gray-700 shrink-0">
                            <div className="flex items-center gap-3 mb-6 p-4 rounded-[2rem] bg-orange-50 dark:bg-orange-900/10 border border-orange-100/50 dark:border-orange-800/20">
                                <ShieldCheck className="w-6 h-6 text-orange-600 shrink-0" />
                                <p className="text-[10px] text-orange-700/80 dark:text-orange-400 font-bold uppercase leading-tight tracking-[0.05em]">
                                    O disparo respeitará o delay de segurança de 30-90 segundos para cada mensagem, visando proteger seu número contra banimentos.
                                </p>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setShowNewCampaignModal(false)}
                                    className="flex-1 py-4 px-6 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-black text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={creatingCampaign || selectedContacts.length === 0}
                                    onClick={handleCreateCampaign}
                                    className="flex-[2] py-4 px-6 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 text-white text-sm font-black shadow-lg shadow-brand-500/25 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                                >
                                    {creatingCampaign ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Criando...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            Começar Disparo ({selectedContacts.length})
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsBot;
