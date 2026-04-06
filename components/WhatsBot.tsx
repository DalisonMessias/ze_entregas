import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Link2, LogOut, MessageSquare, Power, PowerOff, QrCode, ShieldCheck, Smartphone, RefreshCcw, CheckCircle2, Copy, Share2, Check, Crown, Lock, Megaphone, Users, Plus, Play, StopCircle, Loader2, Image as ImageIcon, Camera, Trash2, ExternalLink, Sparkles, Edit2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AccessDenied } from './AccessDenied';
import { Button } from './Button';
import { Loading } from './Loading';
import * as cloud from '../services/cloud';
import { uploadMarketingAsset } from '../services/upload';
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
}> = ({ label, value, onChange, placeholder, setIsDirty }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadMarketingAsset(file);
            onChange(url);
            if (setIsDirty) setIsDirty(true);
        } catch (err) {
            console.error('Erro no upload:', err);
            alert('Falha ao carregar imagem. Tente novamente.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
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
                
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleUpload} 
                    accept="image/*" 
                    className="hidden" 
                />
                
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 transition-colors disabled:opacity-50"
                    title="Upload de imagem"
                >
                    {uploading ? <RefreshCcw size={18} className="animate-spin" /> : <Plus size={18} />}
                </button>

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
                    Cole o link ou clique no <span className="font-bold text-indigo-500">+</span> para carregar uma imagem do seu computador.
                </p>
            )}
        </div>
    );
};

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
    const { toast, confirm } = useDialog();
    const [isHarmonizing, setIsHarmonizing] = useState(false);
    const [manualPhones, setManualPhones] = useState('');
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
    const [newCampaignLinkUrl, setNewCampaignLinkUrl] = useState('');
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
                newCampaignLinkUrl || null,
                requestOptions
            );
            toast({ message: 'Campanha criada com sucesso! O disparo começará em breve.', type: 'success' });
            setShowNewCampaignModal(false);
            setNewCampaignName('');
            setNewCampaignMessage('');
            setNewCampaignImageUrl(null);
            setNewCampaignLinkUrl('');
            void loadCampaigns();
        } catch (err: any) {
            toast({ message: err.message || 'Erro ao criar campanha.', type: 'error' });
        } finally {
            setCreatingCampaign(false);
        }
    };

    const handleHarmonizeMessage = async (isCampaign = true) => {
        const currentText = isCampaign ? newCampaignMessage : draftMessage;
        if (!currentText.trim()) return;

        setIsHarmonizing(true);
        try {
            const apiKey = await cloud.getAPIKey('google');
            if (!apiKey) {
                toast({ message: 'API do Gemini não configurada.', type: 'error' });
                return;
            }

            const prompt = `Atue como um EXPERT COPYWRITER para WhatsApp. 
            Melhore e harmonize o texto abaixo para uma campanha de marketing. 
            Deve ser profissional, atraente e amigável. 
            Mantenha o sentido original e inclua emojis pertinentes.
            
            TEXTO ORIGINAL: "${currentText}"
            
            RETORNE APENAS O TEXTO MELHORADO, SEM EXPLICAÇÕES.`;

            const response = await cloud.generateAIContent(prompt, apiKey);
            if (response.text) {
                const improvedText = response.text.trim();
                if (isCampaign) {
                    setNewCampaignMessage(improvedText);
                } else {
                    setDraftMessage(improvedText);
                    setIsDirty(true);
                }
                toast({ message: 'Texto harmonizado com IA!', type: 'success' });
            }
        } catch (err: any) {
            console.error('Erro ao harmonizar com IA:', err);
            toast({ message: 'Erro ao harmonizar texto.', type: 'error' });
        } finally {
            setIsHarmonizing(false);
        }
    };

    const handleAddManualPhones = () => {
        if (!manualPhones.trim()) return;

        const phones = manualPhones.split(/[, \n]+/).map(p => {
            let clean = p.replace(/\D/g, '');
            // Se começar com 0, remove o zero inicial
            if (clean.length === 12 && clean.startsWith('0')) clean = clean.substring(1);
            if (clean.length === 11 && clean.startsWith('0')) clean = clean.substring(1);
            
            // Se tiver 10 ou 11 dígitos, assume que falta o DDI +55
            if (clean.length === 10 || clean.length === 11) {
                return `+55${clean}`;
            }
            // Se já tiver o 55 mas sem o +, adiciona o +
            if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
                return `+${clean}`;
            }
            // Se já estiver no formato correto com +55, mantém como está
            if (clean.length >= 12) return `+${clean}`;
            
            return clean;
        }).filter(p => p.length >= 10);

        const newContacts = phones.map(p => ({
            phone: p,
            name: 'Contato Manual',
            last_interaction: new Date().toISOString()
        }));

        // Evitar duplicados
        const filteredNew = newContacts.filter(nc => !selectedContacts.includes(nc.phone));
        
        if (filteredNew.length > 0) {
            setSelectedContacts(prev => [...prev, ...filteredNew.map(c => c.phone)]);
            setAvailableContacts(prev => {
                // Adiciona à lista de disponíveis se não estiverem lá
                const existingPhones = prev.map(ac => ac.phone);
                const toAdd = filteredNew.filter(fn => !existingPhones.includes(fn.phone));
                return [...toAdd, ...prev];
            });
            setManualPhones('');
            toast({ message: `${filteredNew.length} contatos adicionados manualmente.`, type: 'success' });
        } else {
            toast({ message: 'Nenhum contato novo adicionado.', type: 'info' });
        }
    };

    const handleReuseCampaign = (camp: any) => {
        setNewCampaignName(camp.name);
        setNewCampaignMessage(camp.message);
        setNewCampaignImageUrl(camp.image_url);
        setNewCampaignLinkUrl(camp.link_url || '');
        setSelectedContacts([]);
        setShowNewCampaignModal(true);
        void loadAvailableContacts();
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

    const handleDeleteCampaign = async (id: string) => {
        const confirmed = await confirm({
            title: 'Excluir Campanha',
            message: 'Tem certeza que deseja excluir esta campanha e todo o seu histórico de envios? Esta ação não pode ser desfeita.',
            confirmButtonText: 'Excluir',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmed) return;

        try {
            await whatsbot.deleteWhatsBotCampaign(id, requestOptions);
            toast({ message: 'Campanha excluída com sucesso.', type: 'success' });
            void loadCampaigns(true);
        } catch (err: any) {
            toast({ message: 'Erro ao excluir campanha.', type: 'error' });
        }
    };

    useEffect(() => {
        if (canAccessWhatsBot && storeId) {
            void loadCampaigns();
        }
    }, [canAccessWhatsBot, storeId, loadCampaigns]);

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
                        <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/11 text-white/90">
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
                                <div className="relative group">
                                    <textarea
                                        value={draftMessage}
                                        onChange={(e) => {
                                            setDraftMessage(e.target.value);
                                            setIsDirty(true);
                                        }}
                                        placeholder="Ex: Olá! Temos novidades no nosso cardápio hoje..."
                                        className="w-full h-32 p-4 pt-10 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm resize-none dark:text-white"
                                    />
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <button
                                            onClick={() => handleHarmonizeMessage(false)}
                                            disabled={isHarmonizing || !draftMessage.trim()}
                                            title="Harmonizar com IA (Gemini)"
                                            className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all disabled:opacity-50"
                                        >
                                            {isHarmonizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                        </button>
                                        <button className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-all">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <ImageInput 
                                    label="Imagem Opcional - Loja Aberta"
                                    value={draftImageUrl}
                                    onChange={setDraftImageUrl}
                                    setIsDirty={setIsDirty}
                                    placeholder="Faça upload ou cole o link da imagem"
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
                                    label="Imagem Opcional - Loja Fechada"
                                    value={draftClosedImageUrl}
                                    onChange={setDraftClosedImageUrl}
                                    setIsDirty={setIsDirty}
                                    placeholder="Faça upload ou cole o link da imagem"
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
                    {/* Bloco: QR Code */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
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

                    {/* Bloco: Catálogo Digital */}
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

                    {/* Bloco: Campanhas de Marketing */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6 mt-10">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                    <Megaphone className="w-5 h-5 text-orange-600" />
                                </div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Campanhas</h2>
                            </div>
                            <Button 
                                onClick={() => { setShowNewCampaignModal(true); void loadAvailableContacts(); }}
                                className="!py-2 !px-4 !text-xs"
                                icon={<Plus className="w-3.5 h-3.5" />}
                            >
                                Nova
                            </Button>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1 thin-scrollbar">
                            {loadingCampaigns ? (
                                <div className="py-12 flex flex-col items-center justify-center opacity-50">
                                    <Loader2 className="w-6 h-6 text-brand-500 animate-spin mb-2" />
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Carregando...</p>
                                </div>
                            ) : campaigns.length === 0 ? (
                                <div className="py-8 text-center px-4 border border-dashed border-gray-100 rounded-2xl">
                                    <p className="text-xs text-gray-400 italic">Nenhuma campanha enviada recentemente.</p>
                                </div>
                            ) : (
                                campaigns.map((camp) => (
                                    <div key={camp.id} className="p-4 rounded-2xl border border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 relative group">
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="min-w-0">
                                                <p className="font-bold text-sm text-gray-900 dark:text-white truncate pr-16">{camp.name}</p>
                                                <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(camp.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                                            <span>{camp.sent_successfully + camp.sent_failed} / {camp.total_recipients}</span>
                                            <span className="text-brand-500">{Math.round(((camp.sent_successfully + camp.sent_failed) / camp.total_recipients) * 100)}%</span>
                                        </div>
                                        <div className="mt-1 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-500 ${camp.status === 'stopped' ? 'bg-red-500' : 'bg-brand-500'}`}
                                                style={{ width: `${((camp.sent_successfully + camp.sent_failed) / camp.total_recipients) * 100}%` }}
                                            />
                                        </div>
                                        <div className="absolute top-4 right-4 flex items-center gap-2">
                                            <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                camp.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                camp.status === 'processing' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                                                camp.status === 'stopped' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {camp.status === 'completed' ? 'Ok' : camp.status === 'processing' ? '...' : camp.status === 'stopped' ? 'Parado' : 'Pend'}
                                            </div>
                                            {camp.status !== 'processing' && (
                                                <button
                                                    onClick={() => handleDeleteCampaign(camp.id)}
                                                    className="p-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors"
                                                    title="Excluir Campanha"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {camp.status === 'processing' ? (
                                                <button
                                                    onClick={() => handleStopCampaign(camp.id)}
                                                    className="p-1.5 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors"
                                                    title="Parar Campanha"
                                                >
                                                    <StopCircle className="w-3.5 h-3.5" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleReuseCampaign(camp)}
                                                    className="p-1.5 rounded-full bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 transition-colors"
                                                    title="Reusar/Editar Campanha"
                                                >
                                                    <RefreshCcw className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
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
                            {/* Nome da Campanha */}
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

                            {/* Mensagem com Harmonização IA */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Mensagem do Disparo</label>
                                    <button
                                        onClick={() => handleHarmonizeMessage(true)}
                                        disabled={isHarmonizing || !newCampaignMessage.trim()}
                                        title="Harmonizar com IA (Gemini)"
                                        className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full disabled:opacity-50"
                                    >
                                        {isHarmonizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                        {isHarmonizing ? 'Harmonizando...' : 'Harmonizar com IA'}
                                    </button>
                                </div>
                                <textarea 
                                    rows={4}
                                    placeholder="Escreva sua mensagem aqui..."
                                    value={newCampaignMessage}
                                    onChange={(e) => setNewCampaignMessage(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 transition-all min-h-[120px] resize-none dark:text-white"
                                />
                            </div>

                            {/* Imagem */}
                            <ImageInput 
                                label="Imagem da Campanha"
                                value={newCampaignImageUrl}
                                onChange={setNewCampaignImageUrl}
                                placeholder="Faça upload ou cole o link da imagem"
                            />

                            {/* Link Opcional */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Link Opcional (URL)</label>
                                    <button 
                                        onClick={() => setNewCampaignLinkUrl(status?.catalogUrl || '')}
                                        className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
                                    >
                                        <Link2 size={10} />
                                        Link do Catálogo
                                    </button>
                                </div>
                                <input 
                                    type="text"
                                    placeholder="Ex: https://zeentregas.com/sua-loja"
                                    value={newCampaignLinkUrl}
                                    onChange={(e) => setNewCampaignLinkUrl(e.target.value)}
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold text-gray-800 dark:text-white"
                                />
                                <p className="text-[10px] text-gray-400 italic ml-1">O link será anexado ao final da mensagem automaticamente.</p>
                            </div>

                            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 flex items-start gap-3">
                                <Smartphone className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-700/80 dark:text-blue-400 leading-relaxed font-semibold italic">
                                    Seu link do catálogo digital será adicionado manualmente se você desejar. Use palavras variadas para evitar o bloqueio do WhatsApp.
                                </p>
                            </div>

                            {/* Inserção Manual de Contatos */}
                            <div className="pt-4 border-t border-gray-50 dark:border-gray-700 space-y-3">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Adicionar Contatos Manualmente</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={manualPhones}
                                        onChange={(e) => setManualPhones(e.target.value)}
                                        placeholder="DDD + Número (separe por vírgula para massa)"
                                        className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 rounded-xl text-sm dark:text-white"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddManualPhones()}
                                    />
                                    <button
                                        onClick={handleAddManualPhones}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Adicionar
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 italic">
                                    O sistema adiciona automaticamente o DDI +55 se você colocar apenas o DDD.
                                </p>
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
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                                        selectedContacts.includes(contact.phone) ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                                    }`}>
                                                        {contact.name ? contact.name.charAt(0).toUpperCase() : contact.phone.slice(-2)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-800 dark:text-white">
                                                            {contact.name || `+${contact.phone}`}
                                                        </p>
                                                        {contact.name && <p className="text-[10px] text-gray-400 font-bold tracking-wider">+{contact.phone}</p>}
                                                        <p className="text-[9px] text-gray-400 italic">Visto em {new Date(contact.last_interaction).toLocaleDateString()}</p>
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
