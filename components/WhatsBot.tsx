import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Link2, LogOut, MessageSquare, Power, PowerOff, QrCode, ShieldCheck, Smartphone, RefreshCcw, CheckCircle2, Copy, Share2, Check, Crown, Lock, Megaphone, Users, Plus, Play, StopCircle, Loader2, Image as ImageIcon, Camera, Trash2, ExternalLink, Sparkles, Edit2, Save, Shield, BookOpen, HelpCircle, Send } from 'lucide-react';
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
import { CustomDateInput } from './CustomDateInput';
import { StoreBlocklistModal } from './StoreBlocklistModal';
import { Switch } from './Switch';

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

const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1024;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Falha ao comprimir imagem'));
                    },
                    'image/jpeg',
                    0.7
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
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
            // Compressão antes do upload
            const compressedBlob = await compressImage(file);
            const compressedFile = new File([compressedBlob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg'
            });

            const url = await uploadMarketingAsset(compressedFile);
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

export const WhatsBot: React.FC<{ storeId?: string | null }> = ({ storeId: propStoreId }) => {
    const [status, setStatus] = useState<WhatsBotStatus | null>(null);
    const [storeId, setStoreId] = useState<string | null>(propStoreId || null);
    const [loading, setLoading] = useState(true);
    const [loadingAction, setLoadingAction] = useState<'start' | 'stop' | 'save' | 'logout' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [draftMessage, setDraftMessage] = useState('');
    const [draftClosedMessage, setDraftClosedMessage] = useState('');
    const [draftImageUrl, setDraftImageUrl] = useState<string | null>(null);
    const [draftClosedImageUrl, setDraftClosedImageUrl] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isBlocklistModalOpen, setIsBlocklistModalOpen] = useState(false);
    const isDirtyRef = useRef(false);
    const [copied, setCopied] = useState(false);
    const { toast, confirm } = useDialog();
    const [isHarmonizing, setIsHarmonizing] = useState(false);
    const [manualPhones, setManualPhones] = useState('');
    const { canAccessWhatsBot, loading: loadingPlan } = usePlanPermissions();

    const [creatingCampaign, setCreatingCampaign] = useState(false);
    const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

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

    // Estados de IA
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiContext, setAiContext] = useState('');
    const [aiName, setAiName] = useState('Assistente');

    // Estados de Gatilhos
    const [triggers, setTriggers] = useState<any[]>([]);
    const [loadingTriggers, setLoadingTriggers] = useState(false);
    const [newTriggerKeyword, setNewTriggerKeyword] = useState('');
    const [newTriggerResponse, setNewTriggerResponse] = useState('');
    const [isAddingTrigger, setIsAddingTrigger] = useState(false);
    const [isSavingAi, setIsSavingAi] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);

    // Estados de Treinamento de IA / Base de Conhecimento
    const [knowledgeCards, setKnowledgeCards] = useState<any[]>([]);
    const [loadingKnowledge, setLoadingKnowledge] = useState(false);
    const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<any>(null);
    const [cardQuestion, setCardQuestion] = useState('');
    const [cardAnswer, setCardAnswer] = useState('');
    const [savingCard, setSavingCard] = useState(false);
    const [knowledgeTab, setKnowledgeTab] = useState<'Tudo' | 'Aplicado' | 'Recomendado' | 'Expirado'>('Tudo');
    const [knowledgeFilter, setKnowledgeFilter] = useState<'Tudo' | 'Geral'>('Tudo');

    // Estados do Simulador de Chat
    const [simulatedMessages, setSimulatedMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
        { role: 'assistant', content: 'Experimente o chat com IA!' }
    ]);
    const [testMessageText, setTestMessageText] = useState('');
    const [sendingSimulated, setSendingSimulated] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);


    const getSaudacao = () => {
        const hora = new Date().getHours();
        if (hora >= 5 && hora < 12) return 'Bom dia';
        if (hora >= 12 && hora < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const processSmartVariables = (text: string, contactName?: string) => {
        let processed = text.replace(/\{\{\s*saudacao\s*\}\}/gi, getSaudacao());
        if (contactName) {
            const firstName = contactName.split(' ')[0];
            processed = processed.replace(/\{\{\s*first_name\s*\}\}/gi, firstName);
        } else {
            processed = processed.replace(/\{\{\s*first_name\s*\}\}/gi, 'cliente');
        }
        return processed;
    };

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
                setAiEnabled((data as any).ai_enabled || false);
                setAiContext((data as any).ai_context || '');
                setAiName((data as any).ai_name || 'Assistente');
                
                if (syncDraft) {
                    setIsDirty(false);
                    isDirtyRef.current = false;
                }
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
                let idToUse = propStoreId;
                if (!idToUse) {
                    const profile = await cloud.getMyPartnerProfile();
                    if (!mounted) return;
                    idToUse = profile?.id || null;
                    setStoreId(idToUse);
                }

                if (idToUse) {
                    await refreshStatus(true, idToUse);
                    void loadKnowledge(idToUse);
                } else {
                    setLoading(false);
                }
            } catch (err: any) {
                if (!mounted) return;
                setLoading(false);
                setError(err?.message || 'Erro ao carregar o perfil da loja.');
            }
        };

        if (propStoreId) {
            setStoreId(propStoreId);
            void refreshStatus(true, propStoreId);
            void loadKnowledge(propStoreId);
        } else {
            void load();
        }

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
                {
                    ...requestOptions,
                    ai_enabled: aiEnabled,
                    ai_context: aiContext,
                    ai_name: aiName
                }
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

    const handleSaveAI = async (newAiEnabled?: boolean) => {
        if (!status) return;
        setIsSavingAi(true);
        const targetAiEnabled = newAiEnabled !== undefined ? newAiEnabled : aiEnabled;
        
        try {
            const updated = await whatsbot.updateWhatsBotConfig(
                draftMessage, 
                draftClosedMessage, 
                draftImageUrl, 
                draftClosedImageUrl, 
                {
                    ...requestOptions,
                    ai_enabled: targetAiEnabled,
                    ai_context: aiContext,
                    ai_name: aiName
                }
            );
            
            setStatus(updated);
            setAiEnabled(targetAiEnabled);
            setIsDirty(false);
            isDirtyRef.current = false;
            
            toast({ 
                message: targetAiEnabled ? 'Assistente de IA ativado com sucesso!' : 'Assistente de IA desativado com sucesso!', 
                type: 'success' 
            });
        } catch (error: any) {
            console.error('Erro ao salvar IA:', error);
            const message = error?.response?.data?.message || error?.message || 'Erro ao salvar configurações de IA.';
            toast({ message, type: 'error' });
            // Reverte o estado visual em caso de erro no toggle
            if (newAiEnabled !== undefined) setAiEnabled(!newAiEnabled);
        } finally {
            setIsSavingAi(false);
        }
    };

    const handleToggleAI = () => {
        const nextState = !aiEnabled;
        setAiEnabled(nextState);
        void handleSaveAI(nextState);
    };

    const loadKnowledge = useCallback(async (storeIdOverride?: string | null) => {
        const idToUse = storeIdOverride || storeId;
        if (!idToUse) return;
        setLoadingKnowledge(true);
        try {
            const data = await whatsbot.getWhatsBotKnowledge({ storeId: idToUse });
            setKnowledgeCards(data || []);
        } catch (err: any) {
            console.error('Erro ao carregar base de conhecimento:', err);
        } finally {
            setLoadingKnowledge(false);
        }
    }, [storeId]);

    const handleSaveKnowledgeCard = async () => {
        if (!cardQuestion.trim() || !cardAnswer.trim()) {
            toast({ message: 'Preencha a pergunta e a resposta.', type: 'error' });
            return;
        }

        setSavingCard(true);
        try {
            if (editingCard?.id) {
                // Editar cartão FAQ existente via Supabase diretamente
                const client = cloud.getClient();
                if (!client) throw new Error('Cliente Supabase não disponível.');
                
                const { error } = await client
                    .from('ze_assistant_knowledge_base')
                    .update({
                        title: cardQuestion.trim(),
                        content: cardAnswer.trim(),
                        structured_data: { question: cardQuestion.trim(), answer: cardAnswer.trim() },
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingCard.id);

                if (error) throw error;
                toast({ message: 'Cartão de conhecimento atualizado com sucesso!', type: 'success' });
            } else {
                // Adicionar novo cartão FAQ customizado
                await whatsbot.addWhatsBotKnowledge(cardQuestion.trim(), cardAnswer.trim(), requestOptions);
                toast({ message: 'Cartão de conhecimento adicionado com sucesso!', type: 'success' });
            }

            setCardQuestion('');
            setCardAnswer('');
            setEditingCard(null);
            setIsKnowledgeModalOpen(false);
            void loadKnowledge();
        } catch (err: any) {
            console.error('Erro ao salvar cartão:', err);
            toast({ message: 'Erro ao salvar cartão de conhecimento.', type: 'error' });
        } finally {
            setSavingCard(false);
        }
    };

    const handleDeleteKnowledgeCard = async (card: any) => {
        const ok = await confirm({
            title: 'Excluir Cartão de Conhecimento',
            message: `Tem certeza de que deseja excluir o cartão de conhecimento "${card.title}"? Esta ação não poderá ser desfeita.`
        });
        if (ok) {
            try {
                await whatsbot.deleteWhatsBotKnowledge(card.id, requestOptions);
                toast({ message: 'Cartão de conhecimento excluído com sucesso.', type: 'success' });
                void loadKnowledge();
            } catch (err: any) {
                console.error('Erro ao excluir:', err);
                toast({ message: 'Erro ao excluir cartão de conhecimento.', type: 'error' });
            }
        }
    };

    const handleSyncKnowledge = async () => {
        setLoadingKnowledge(true);
        try {
            await whatsbot.syncWhatsBotKnowledge(requestOptions);
            toast({ message: 'Produtos e informações básicas sincronizados!', type: 'success' });
            void loadKnowledge();
        } catch (err: any) {
            console.error('Erro ao sincronizar:', err);
            toast({ message: 'Erro ao sincronizar dados da loja.', type: 'error' });
        } finally {
            setLoadingKnowledge(false);
        }
    };

    const handleSendSimulatedMessage = async () => {
        if (!testMessageText.trim()) return;

        const userMsg = testMessageText.trim();
        setSimulatedMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setTestMessageText('');
        setSendingSimulated(true);

        try {
            const response = await whatsbot.testWhatsBotAIMessage(userMsg, '553598393707', 'Cliente de Teste', {
                ...requestOptions,
                ai_name: aiName,
                ai_context: aiContext
            });
            if (response && response.success) {
                setSimulatedMessages(prev => [...prev, { role: 'assistant', content: response.responseText }]);
            } else {
                setSimulatedMessages(prev => [...prev, { role: 'assistant', content: response?.responseText || 'Não consegui processar a resposta no momento.' }]);
            }
        } catch (err: any) {
            console.error('Erro no simulador de IA:', err);
            setSimulatedMessages(prev => [...prev, { role: 'assistant', content: 'Tive um problema ao processar sua resposta. Por favor, tente novamente!' }]);
        } finally {
            setSendingSimulated(false);
            // Scroll para o fim após a resposta
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    const filteredKnowledgeCards = useMemo(() => {
        // 1. Cartões do sistema (Sincronizados)
        const systemCards = [
            {
                id: 'sys-offers',
                title: 'Ofertas',
                content: 'A IA sincronizou suas campanhas de marketing, itens promocionais e regras de frete grátis. Para editar, acesse sua página de Marketing.',
                emoji: '🎁',
                isSystem: true,
                isRecommended: false,
                category: 'Geral',
                is_active: true
            },
            {
                id: 'sys-menu',
                title: 'Itens do cardápio',
                content: 'A IA assimilou os itens e preços do seu cardápio. Para garantir a precisão das respostas, mantenha seus produtos atualizados na página do cardápio.',
                emoji: '🍕',
                isSystem: true,
                isRecommended: false,
                category: 'Geral',
                is_active: true
            },
            {
                id: 'sys-info',
                title: 'Informações básicas da loja',
                content: 'A IA foi configurada com os dados da sua loja, como horário, endereço, entregas, formas de pagamento e redes sociais. Você é responsável por manter essas informações atualizadas.',
                emoji: 'ℹ️',
                isSystem: true,
                isRecommended: false,
                category: 'Geral',
                is_active: true
            }
        ];

        // 2. Cartões personalizados vindos do banco de dados (com content_type === 'FAQ')
        const faqCards = knowledgeCards
            .filter(c => c.content_type === 'FAQ')
            .map(c => ({
                id: c.id,
                title: c.title,
                content: c.content,
                emoji: '💬',
                isSystem: false,
                isRecommended: false,
                category: 'Geral',
                is_active: c.is_active
            }));

        // 3. Cenários recomendados padrão
        const allRecommended = [
            {
                title: 'Como agendar uma entrega',
                recommendedAnswer: 'Para agendar uma entrega, basta acessar o nosso cardápio digital, selecionar a opção \'Agendar\' na tela de sacola e escolher a data e o horário desejados! É super rápido e prático! 📅🛵',
                content: 'Configure as regras para o agendamento de entregas de pedidos no catálogo digital.',
                emoji: '📅',
                isSystem: false,
                isRecommended: true,
                category: 'Geral'
            },
            {
                title: 'Como fazer uma reserva',
                recommendedAnswer: 'Sim, fazemos reservas de mesa! Para garantir o seu lugar, basta entrar em contato conosco pelo chat ou ligar informando o dia, horário e quantidade de pessoas. Teremos o prazer de te receber! 🍽️✨',
                content: 'Configure as regras e orientações para reservas de mesas presenciais de clientes.',
                emoji: '✨',
                isSystem: false,
                isRecommended: true,
                category: 'Geral'
            },
            {
                title: 'Formas de Pagamento',
                recommendedAnswer: 'Aceitamos diversas formas de pagamento para facilitar para você! Você pode pagar via Pix, cartões de crédito e débito das principais bandeiras diretamente no checkout do nosso catálogo ou na entrega! 💳💵',
                content: 'Esclareça dúvidas sobre cartões, Pix, troco ou pagamentos online no site.',
                emoji: '💳',
                isSystem: false,
                isRecommended: true,
                category: 'Geral'
            },
            {
                title: 'Taxas de Entrega',
                recommendedAnswer: 'Nossas taxas de entrega variam de acordo com o seu endereço e bairro! Ao digitar o seu CEP ou endereço no cardápio digital, o sistema calcula e te mostra o valor exato na hora! 🛵💨',
                content: 'Esclareça dúvidas sobre valores de entrega por bairro ou retirada física na loja.',
                emoji: '🛵',
                isSystem: false,
                isRecommended: true,
                category: 'Geral'
            }
        ];

        // Se um cenário recomendado já foi aplicado (ou seja, seu título existe em faqCards), remove da lista de recomendados!
        const appliedTitles = faqCards.map(f => f.title.toLowerCase().trim());
        const recommendedCards = allRecommended.filter(r => !appliedTitles.includes(r.title.toLowerCase().trim()));

        // Combinar tudo
        let allCards: any[] = [];

        // Filtro por Abas: Tudo, Aplicado, Recomendado, Expirado
        if (knowledgeTab === 'Tudo') {
            allCards = [...systemCards, ...faqCards, ...recommendedCards];
        } else if (knowledgeTab === 'Aplicado') {
            allCards = [...systemCards, ...faqCards];
        } else if (knowledgeTab === 'Recomendado') {
            allCards = recommendedCards;
        } else if (knowledgeTab === 'Expirado') {
            allCards = []; // Sem cartões expirados simulados no momento
        }

        // Filtro por Pills: Tudo, Geral
        if (knowledgeFilter === 'Geral') {
            allCards = allCards.filter(c => c.category === 'Geral');
        }

        return allCards;
    }, [knowledgeCards, knowledgeTab, knowledgeFilter]);

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
            const response = await whatsbot.createWhatsBotCampaign(
                newCampaignName,
                newCampaignMessage,
                selectedContacts,
                newCampaignImageUrl,
                newCampaignLinkUrl || null,
                {
                    ...requestOptions,
                    scheduledAt: scheduledAt?.toISOString() || null
                }
            );
            console.log('Campanha criada:', response);
            toast({ message: scheduledAt ? 'Campanha agendada com sucesso!' : 'Campanha criada com sucesso!', type: 'success' });
            setShowNewCampaignModal(false);
            setNewCampaignName('');
            setNewCampaignMessage('');
            setSelectedContacts([]);
            setScheduledAt(null);
            setNewCampaignImageUrl(null);
            setNewCampaignLinkUrl('');
            void loadCampaigns();
        } catch (err: any) {
            toast({ message: err.message || 'Erro ao criar campanha.', type: 'error' });
        } finally {
            setCreatingCampaign(false);
        }
    };

    const handleHarmonizeMessage = async (type: 'campaign' | 'open' | 'closed' = 'campaign') => {
        let messageToHarmonize = '';
        if (type === 'campaign') messageToHarmonize = newCampaignMessage;
        else if (type === 'open') messageToHarmonize = draftMessage;
        else if (type === 'closed') messageToHarmonize = draftClosedMessage;

        if (!messageToHarmonize.trim()) return;

        setIsHarmonizing(true);
        try {
            // 1. Carrega provedor de IA preferencial (loja > global)
            let primaryProvider = await cloud.getAPIKey('ai_primary_provider', storeId || undefined)
                || await cloud.getAPIKey('ai_primary_provider')
                || 'google_gemini';

            // 2. Busca chave do Gemini: tenta loja específica primeiro, depois fallback global
            let geminiKey: string | null = null;
            if (storeId) {
                geminiKey = await cloud.getAPIKey('google_gemini', storeId);
            }
            if (!geminiKey) {
                // Fallback: chave global do admin (sem filtro de storeId)
                geminiKey = await cloud.getAPIKey('google_gemini');
            }
            if (!geminiKey) {
                geminiKey = (process as any)?.env?.GEMINI_API_KEY || (import.meta as any)?.env?.VITE_GEMINI_API_KEY || null;
            }

            // 3. Busca chave do Groq: tenta loja específica primeiro, depois fallback global
            let groqKey: string | null = null;
            if (storeId) {
                groqKey = await cloud.getAPIKey('groq', storeId);
            }
            if (!groqKey) {
                // Fallback: chave global do admin (sem filtro de storeId)
                groqKey = await cloud.getAPIKey('groq');
            }
            if (!groqKey) {
                groqKey = (process as any)?.env?.GROQ_API_KEY || (import.meta as any)?.env?.VITE_GROQ_API_KEY || null;
            }

            let selectedProvider = primaryProvider;
            let finalApiKey = '';

            if (primaryProvider === 'groq' && groqKey) {
                selectedProvider = 'groq';
                finalApiKey = groqKey;
            } else if (geminiKey) {
                selectedProvider = 'google_gemini';
                finalApiKey = geminiKey;
            } else if (groqKey) {
                selectedProvider = 'groq';
                finalApiKey = groqKey;
            }

            if (!finalApiKey) {
                toast({ message: 'Chaves de API (Gemini ou Groq) não configuradas ou ativas. Por favor, configure-as na tela de integrações.', type: 'error' });
                setIsHarmonizing(false);
                return;
            }

            let prompt = `Atue como um Copywriter especialista em WhatsApp Marketing.
            Melhore a mensagem abaixo para ser mais amigável, profissional e persuasiva, usando emojis de forma equilibrada.`;

            if (type === 'closed') {
                prompt = `Atue como um Copywriter especialista em WhatsApp Marketing.
                Melhore a mensagem de fechamento da loja abaixo para ser educada, profissional e amigável.
                Informe que estamos fechados mas que em breve retornaremos. Use emojis de forma equilibrada.`;
            }

            if (type === 'campaign') {
                prompt = `Atue como um Copywriter especialista em WhatsApp Marketing.
                Melhore a mensagem de campanha abaixo para ser persuasiva e profissional.
                IMPORTANTE: NÃO inclua links, sites ou a tag [Link da Loja], pois o link já será enviado separadamente pelo sistema.`;
            }

            if (type === 'open') {
                prompt += `\nSe a mensagem mencionar para acessar o site ou catálogo, use a tag [Link da Loja] no local apropriado.`;
            }
            
            prompt += `\n\nMENSAGEM ORIGINAL:\n"${messageToHarmonize}"\n\nRETORNE APENAS O TEXTO DA MENSAGEM HARMONIZADA, SEM COMENTÁRIOS ADICIONAIS.`;

            let generatedText = '';
            let usedProvider = selectedProvider;

            try {
                if (selectedProvider === 'groq') {
                    console.log('[WhatsBot] Gerando conteúdo com Groq...');
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${finalApiKey}`
                        },
                        body: JSON.stringify({
                            model: 'llama-3.1-8b-instant',
                            messages: [
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.7
                        })
                    });

                    if (!response.ok) throw new Error(`Erro na API do Groq: ${response.status}`);
                    const data = await response.json();
                    generatedText = data.choices[0]?.message?.content || '';
                } else {
                    console.log('[WhatsBot] Gerando conteúdo com Gemini...');
                    const response = await cloud.generateAIContent(prompt, finalApiKey);
                    generatedText = (response as any)?.text || '';
                }
            } catch (apiError) {
                console.warn('[WhatsBot] Erro no provedor principal de harmonização. Tentando fallback...', apiError);
                
                // Fallback automático se o principal falhar e houver outro configurado
                if (selectedProvider === 'google_gemini' && groqKey) {
                    usedProvider = 'groq';
                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${groqKey}`
                        },
                        body: JSON.stringify({
                            model: 'llama-3.1-8b-instant',
                            messages: [
                                { role: 'user', content: prompt }
                            ],
                            temperature: 0.7
                        })
                    });

                    if (!response.ok) throw new Error(`Erro na API do Groq (Fallback): ${response.status}`);
                    const data = await response.json();
                    generatedText = data.choices[0]?.message?.content || '';
                } else if (selectedProvider === 'groq' && geminiKey) {
                    usedProvider = 'google_gemini';
                    const response = await cloud.generateAIContent(prompt, geminiKey);
                    generatedText = (response as any)?.text || '';
                } else {
                    throw apiError;
                }
            }
            
            if (generatedText && generatedText.trim()) {
                let text = generatedText.trim();
                
                // Filtro para evitar duplicidade de link em campanhas
                if (type === 'campaign') {
                    text = text.replace(/\{\{\s*catalog_url\s*\}\}/gi, '')
                               .replace(/\{\s*catalogUrl\s*\}/g, '')
                               .replace(/\[Link da Loja\]/gi, '');
                } else {
                    text = text.replace(/\[Link da Loja\]/gi, '{{catalog_url}}');
                }

                if (type === 'campaign') setNewCampaignMessage(text);
                else if (type === 'open') {
                    setDraftMessage(text);
                    setIsDirty(true);
                    isDirtyRef.current = true;
                } else if (type === 'closed') {
                    setDraftClosedMessage(text);
                    setIsDirty(true);
                    isDirtyRef.current = true;
                }
                toast({ message: `Mensagem harmonizada com sucesso! (IA: ${usedProvider === 'groq' ? 'Groq' : 'Gemini'})`, type: 'success' });
            } else {
                throw new Error('Resposta da IA inválida');
            }
        } catch (err: any) {
            console.error('Erro ao harmonizar mensagem:', err);
            toast({ message: 'Erro ao conectar com a IA.', type: 'error' });
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

    const loadTriggers = useCallback(async () => {
        if (!storeId) return;
        setLoadingTriggers(true);
        try {
            const data = await whatsbot.getWhatsBotTriggers(requestOptions);
            setTriggers(data);
        } catch (err) {
            console.error('Erro ao carregar gatilhos:', err);
        } finally {
            setLoadingTriggers(false);
        }
    }, [storeId, requestOptions]);

    const handleAddTrigger = async () => {
        if (!newTriggerKeyword.trim() || !newTriggerResponse.trim()) return;
        setIsAddingTrigger(true);
        try {
            await whatsbot.createWhatsBotTrigger(newTriggerKeyword, newTriggerResponse, requestOptions);
            toast({ message: 'Gatilho adicionado com sucesso!', type: 'success' });
            setNewTriggerKeyword('');
            setNewTriggerResponse('');
            void loadTriggers();
        } catch (err: any) {
            toast({ message: err?.response?.data?.message || 'Erro ao adicionar gatilho.', type: 'error' });
        } finally {
            setIsAddingTrigger(false);
        }
    };

    const handleDeleteTrigger = async (id: string) => {
        const confirmed = await confirm({
            title: 'Excluir Gatilho',
            message: 'Tem certeza que deseja excluir este gatilho de auto-resposta?',
            confirmButtonText: 'Excluir',
            cancelButtonText: 'Cancelar'
        });

        if (confirmed) {
            try {
                await whatsbot.deleteWhatsBotTrigger(id, requestOptions);
                toast({ message: 'Gatilho excluído!', type: 'success' });
                void loadTriggers();
            } catch (err) {
                toast({ message: 'Erro ao excluir gatilho.', type: 'error' });
            }
        }
    };

    useEffect(() => {
        if (storeId) {
            void loadCampaigns();
            void loadTriggers();
        }
    }, [storeId, loadCampaigns, loadTriggers]);

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

    const handleClearCache = async () => {
        const confirmed = await confirm({
            title: 'Limpar Anti-Spam (Hoje)',
            message: 'Tem certeza de que deseja limpar o histórico de envios anti-spam de hoje? Isso fará com que o robô possa enviar novas mensagens hoje para contatos que já receberam a mensagem.',
            confirmButtonText: 'Sim, limpar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmed) return;

        setClearingCache(true);
        try {
            await whatsbot.clearWhatsBotCache(undefined, requestOptions);
            toast({ message: 'Todos os contatos e bloqueios de anti-spam foram liberados com sucesso!', type: 'success' });
            void refreshStatus();
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Erro ao limpar cache do WhatsBot.';
            toast({ message, type: 'error' });
        } finally {
            setClearingCache(false);
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

        let text = '';
        if (customMessage) {
            text = customMessage
                .replace(/\{\{\s*catalog_url\s*\}\}/gi, status.catalogUrl)
                .replace(/\{\s*catalogUrl\s*\}/g, status.catalogUrl);
        } else {
            text = status.catalogUrl
                ? `Olá! Aqui está o link da nossa loja: ${status.catalogUrl}`
                : 'Configure a URL pública do catálogo para usar a mensagem padrão com link.';
        }

        return processSmartVariables(text);
    }, [draftMessage, status]);

    const previewClosedMessage = useMemo(() => {
        if (!status) return '';
        const customMessage = draftClosedMessage.trim();

        let text = '';
        if (customMessage) {
            text = customMessage
                .replace(/\{\{\s*catalog_url\s*\}\}/gi, status.catalogUrl)
                .replace(/\{\s*catalogUrl\s*\}/g, status.catalogUrl);
        } else {
            text = status.catalogUrl
                ? `Olá! No momento estamos fechados, mas você pode conferir nossos produtos e preços aqui para o seu próximo pedido: ${status.catalogUrl}`
                : 'Configure a URL pública do catálogo para usar a mensagem padrão com link.';
        }

        return processSmartVariables(text);
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
                            if (window.location.pathname.includes('/gestor') || window.location.pathname.includes('/loja/gestor')) {
                                window.open(`${window.location.origin}/loja/planos`, '_blank');
                            } else {
                                const event = new CustomEvent('navigateToTab', { detail: { tab: 'store_plans' } });
                                window.dispatchEvent(event);
                            }
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
        <div className="space-y-8 animate-in fade-in pb-24">
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
                            <p className="text-lg font-black">Gatilhos ILIMITADOS</p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/40 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-10">
                <div className="space-y-10">
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
                                    variant="outline"
                                    onClick={handleClearCache}
                                    loading={clearingCache}
                                    disabled={loadingAction !== null}
                                    icon={<RefreshCcw className={`w-4 h-4 ${clearingCache ? 'animate-spin' : ''}`} />}
                                    title="Permite que o bot envie mensagens de boas vindas novamente hoje para quem já recebeu"
                                >
                                    Zerar Anti-Spam Diário
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsBlocklistModalOpen(true)}
                                    disabled={loadingAction !== null}
                                    icon={<Shield className="w-4 h-4 text-red-500" />}
                                    className="border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    Gerenciar Bloqueios
                                </Button>
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
                                    Mensagens de boas-vindas saem 1x ao dia, mas os **Gatilhos de Resposta** funcionam sempre que o cliente digitar a palavra-chave.
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
                                    Defina as mensagens que o bot enviará automaticamente para seus clientes.
                                </p>
                            </div>
                            <Button
                                onClick={handleSave}
                                loading={loadingAction === 'save'}
                                disabled={loadingAction !== null || !isDirty}
                            >
                                Salvar configurações
                            </Button>
                        </div>
                        <div className="space-y-8">
                            {/* Mensagem Aberta */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Mensagem (Loja Aberta)</label>
                                    <button
                                        onClick={() => handleHarmonizeMessage('open')}
                                        disabled={isHarmonizing || !draftMessage.trim()}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                            isHarmonizing 
                                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' 
                                            : 'bg-brand-500/10 text-brand-600 hover:bg-brand-500 hover:text-white'
                                        }`}
                                    >
                                        {isHarmonizing ? (
                                            <><Loader2 size={12} className="animate-spin" /> Harmonizando...</>
                                        ) : (
                                            <><Sparkles size={12} /> Harmonizar com IA</>
                                        )}
                                    </button>
                                </div>
                                <textarea 
                                    value={draftMessage}
                                    onChange={(e) => {
                                        setDraftMessage(e.target.value);
                                        setIsDirty(true);
                                        isDirtyRef.current = true;
                                        e.target.style.height = 'auto';
                                        e.target.style.height = (e.target.scrollHeight) + 'px';
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = (e.target.scrollHeight) + 'px';
                                    }}
                                    placeholder="Olá! Seja bem-vindo ao {{store_name}}..."
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold text-gray-800 dark:text-white resize-none thin-scrollbar min-h-[120px] overflow-hidden leading-relaxed block"
                                />
                                <p className="text-[10px] text-gray-400 italic ml-1">Variáveis: {'{{customer_name}}'}, {'{{store_name}}'}, {'{{catalog_url}}'}</p>
                                <ImageInput 
                                    label="Imagem Opcional - Loja Aberta"
                                    value={draftImageUrl}
                                    onChange={setDraftImageUrl}
                                    setIsDirty={setIsDirty}
                                    placeholder="Upload ou link da imagem"
                                />
                            </div>

                            {/* Mensagem Fechada */}
                            <div className="pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <PowerOff className="w-3 h-3 text-rose-500" />
                                        Mensagem (Loja Fechada)
                                    </label>
                                    <button
                                        onClick={() => handleHarmonizeMessage('closed')}
                                        disabled={isHarmonizing || !draftClosedMessage.trim()}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                            isHarmonizing 
                                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' 
                                            : 'bg-brand-500/10 text-brand-600 hover:bg-brand-500 hover:text-white'
                                        }`}
                                    >
                                        {isHarmonizing ? (
                                            <><Loader2 size={12} className="animate-spin" /> Harmonizando...</>
                                        ) : (
                                            <><Sparkles size={12} /> Harmonizar com IA</>
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    value={draftClosedMessage}
                                    onChange={(e) => {
                                        setDraftClosedMessage(e.target.value);
                                        setIsDirty(true);
                                        isDirtyRef.current = true;
                                        e.target.style.height = 'auto';
                                        e.target.style.height = (e.target.scrollHeight) + 'px';
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = (e.target.scrollHeight) + 'px';
                                    }}
                                    placeholder="Desculpe, no momento estamos fechados..."
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold text-gray-800 dark:text-white resize-none thin-scrollbar min-h-[100px] overflow-hidden leading-relaxed block"
                                />
                                <ImageInput 
                                    label="Imagem Opcional - Loja Fechada"
                                    value={draftClosedImageUrl}
                                    onChange={setDraftClosedImageUrl}
                                    setIsDirty={setIsDirty}
                                    placeholder="Upload ou link da imagem"
                                />

                                <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4 bg-gray-50/50 dark:bg-gray-900/10 mt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MessageSquare className="w-3 h-3 text-gray-400" />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Prévia do Atendimento (Fechado)</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap break-words italic leading-relaxed">
                                        {processSmartVariables(draftClosedMessage || 'O bot enviará a mensagem de fechamento para os clientes.')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bloco: Gatilhos de Auto-resposta */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Gatilhos de Resposta</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Auto-respostas baseadas em palavras-chave.</p>
                            </div>
                            <Button 
                                onClick={handleAddTrigger}
                                disabled={isAddingTrigger || !newTriggerKeyword.trim() || !newTriggerResponse.trim()}
                                loading={isAddingTrigger}
                                className="!py-2.5 !px-6 !text-xs rounded-xl"
                                icon={<Plus className="w-4 h-4" />}
                            >
                                Adicionar
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Palavra-chave</label>
                                <input 
                                    type="text"
                                    placeholder="Ex: Preço, Ajuda"
                                    value={newTriggerKeyword}
                                    onChange={(e) => setNewTriggerKeyword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-brand-500 outline-none text-xs font-bold transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Resposta Automática</label>
                                <input 
                                    type="text"
                                    placeholder="Resposta do bot..."
                                    value={newTriggerResponse}
                                    onChange={(e) => setNewTriggerResponse(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-brand-500 outline-none text-xs font-bold transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1 thin-scrollbar">
                            {loadingTriggers ? (
                                <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-500" /></div>
                            ) : triggers.length === 0 ? (
                                <div className="py-6 text-center border border-dashed rounded-2xl border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Nenhum gatilho ativo</p>
                                </div>
                            ) : (
                                triggers.map((t) => (
                                    <div key={t.id} className="p-4 rounded-xl border border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex items-center justify-between group">
                                        <div className="min-w-0">
                                            <p className="text-xs font-black text-brand-500 uppercase tracking-widest">{t.keyword}</p>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate max-w-[250px]">{t.response}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteTrigger(t.id)}
                                            className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>


                {/* Coluna Direita do Grid Superior */}
                <div className="space-y-10">
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

                    {/* Bloco: Assistente de IA */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-slate-900 dark:text-white">Assistente de IA</h2>
                                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Configuração de IA</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                                <span className={`text-[9px] font-black uppercase tracking-wider ${aiEnabled ? 'text-indigo-500' : 'text-slate-400'}`}>
                                    {aiEnabled ? 'Ativo' : 'Inativo'}
                                </span>
                                <Switch
                                    checked={aiEnabled}
                                    onChange={handleToggleAI}
                                    disabled={isSavingAi}
                                />
                            </div>
                        </div>

                        {aiEnabled && (
                            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 animate-in fade-in duration-300">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Edit2 size={12} className="text-indigo-500" />
                                        Nome do Assistente
                                    </label>
                                    <input
                                        type="text"
                                        value={aiName}
                                        onChange={(e) => {
                                            setAiName(e.target.value);
                                            setIsDirty(true);
                                            isDirtyRef.current = true;
                                        }}
                                        placeholder="Ex: Robô do Zé"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-bold outline-none dark:text-white"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <Bot size={12} className="text-indigo-500" />
                                        Instruções do Assistente (Contexto)
                                    </label>
                                    <textarea
                                        value={aiContext}
                                        onChange={(e) => {
                                            setAiContext(e.target.value);
                                            setIsDirty(true);
                                            isDirtyRef.current = true;
                                        }}
                                        placeholder="Ex: Você é um assistente de vendas da Pizzaria do Zé. Seja engraçado e use emojis. Foque em tirar dúvidas sobre o cardápio e preços."
                                        className="w-full h-24 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-bold outline-none resize-none leading-relaxed dark:text-white"
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        onClick={() => handleSaveAI()}
                                        loading={isSavingAi}
                                        className="!py-2 !px-5 !text-xs !bg-indigo-500 hover:!bg-indigo-600 rounded-xl w-full flex items-center justify-center gap-2"
                                        icon={<Save className="w-3.5 h-3.5" />}
                                    >
                                        Salvar Configurações de IA
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>


                    {/* Bloco: Campanhas de Marketing */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6 mt-0">
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

            {/* Bloco Central: Treinar IA para Atendimento ao Cliente (Largura Total da Página!) */}
            {aiEnabled && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 mt-10 mb-10 animate-in slide-in-from-bottom-4 duration-500">
                    {/* SEÇÃO: Treinar IA para Atendimento ao Cliente + Simulador de Chat */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pt-8 border-t border-indigo-100 dark:border-indigo-500/10 mt-8">
                                    {/* Lado esquerdo: Treinar IA (FAQ e Cartões de Conhecimento) */}
                                    <div className="xl:col-span-2 space-y-6">
                                        <div className="flex items-start justify-between flex-wrap gap-4">
                                            <div>
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Treinar IA para Atendimento ao Cliente</h3>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 italic">Adicione cenários de perguntas e respostas para treinar a IA para perguntas específicas de clientes.</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => void handleSyncKnowledge()}
                                                    disabled={loadingKnowledge}
                                                    variant="outline"
                                                    className="!py-2 !px-4 !text-xs rounded-xl"
                                                    icon={<RefreshCcw className={`w-3.5 h-3.5 ${loadingKnowledge ? 'animate-spin' : ''}`} />}
                                                >
                                                    Sincronizar Loja
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setEditingCard(null);
                                                        setCardQuestion('');
                                                        setCardAnswer('');
                                                        setIsKnowledgeModalOpen(true);
                                                    }}
                                                    className="!py-2 !px-4 !text-xs !bg-orange-600 hover:!bg-orange-700 !text-white rounded-xl shadow-sm"
                                                    icon={<Plus className="w-3.5 h-3.5" />}
                                                >
                                                    Criar seu cartão de conhecimento
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Filtros por abas e pills */}
                                        <div className="flex flex-col gap-4 border-b pb-4 border-slate-100 dark:border-slate-800">
                                            <div className="flex gap-1 overflow-x-auto thin-scrollbar pb-1">
                                                {(['Tudo', 'Aplicado', 'Recomendado', 'Expirado'] as const).map(tab => (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setKnowledgeTab(tab)}
                                                        className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                                                            knowledgeTab === tab 
                                                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm' 
                                                            : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {tab}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 overflow-x-auto thin-scrollbar">
                                                {(['Tudo', 'Geral'] as const).map(pill => (
                                                    <button
                                                        key={pill}
                                                        onClick={() => setKnowledgeFilter(pill)}
                                                        className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all ${
                                                            knowledgeFilter === pill
                                                            ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-white border border-slate-200 dark:border-slate-700'
                                                            : 'bg-transparent text-slate-400 hover:text-slate-600 border border-transparent'
                                                        }`}
                                                    >
                                                        {pill}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Grid de Cartões de Conhecimento */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {loadingKnowledge ? (
                                                <div className="col-span-full py-12 text-center">
                                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Buscando base de conhecimento...</p>
                                                </div>
                                            ) : (
                                                filteredKnowledgeCards.map((card, idx) => (
                                                    <div 
                                                        key={card.id || idx} 
                                                        className={`p-5 rounded-3xl border transition-all flex flex-col justify-between min-h-[160px] ${
                                                            card.isRecommended
                                                            ? 'border-blue-100 dark:border-blue-900/30 bg-blue-50/10 dark:bg-blue-900/5'
                                                            : 'border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 hover:shadow-md'
                                                        }`}
                                                    >
                                                        {/* Conteúdo do cartão de conhecimento */}
                                                        <div>
                                                            <div className="flex items-center justify-between mb-3">
                                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                    card.isRecommended
                                                                    ? 'bg-blue-500/10 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                                                                    : 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                                }`}>
                                                                    {card.isRecommended ? '+ Recomendado' : '✓ Aplicado'}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                                                                <span>{card.emoji || '💡'}</span> {card.title}
                                                            </h4>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-3">
                                                                {card.content}
                                                            </p>
                                                        </div>
                                                        <div className="flex justify-end mt-4 pt-3 border-t border-slate-100/50 dark:border-slate-800/50">
                                                            {card.isSystem ? (
                                                                <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                                                                    <Lock className="w-3.5 h-3.5" />
                                                                    <span className="text-[10px] uppercase tracking-wider">Automático</span>
                                                                </div>
                                                            ) : card.isRecommended ? (
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingCard(null);
                                                                        setCardQuestion(card.title);
                                                                        setCardAnswer(card.recommendedAnswer || '');
                                                                        setIsKnowledgeModalOpen(true);
                                                                    }}
                                                                    className="text-xs font-black uppercase tracking-wider text-blue-600 hover:text-blue-750 transition-colors"
                                                                >
                                                                    Preencher
                                                                </button>
                                                            ) : (
                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={() => handleDeleteKnowledgeCard(card)}
                                                                        className="text-xs font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors"
                                                                    >
                                                                        Excluir
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingCard(card);
                                                                            setCardQuestion(card.title);
                                                                            setCardAnswer(card.content);
                                                                            setIsKnowledgeModalOpen(true);
                                                                        }}
                                                                        className="text-xs font-black uppercase tracking-wider text-slate-700 hover:text-slate-800 dark:text-slate-300 dark:hover:text-slate-100 transition-colors"
                                                                    >
                                                                        Editar
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                            
                                            {!loadingKnowledge && filteredKnowledgeCards.length === 0 && (
                                                <div className="col-span-full py-8 text-center border border-dashed rounded-3xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                                                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Nenhum cartão neste filtro</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Lado direito: Simulador de Chat com IA */}
                                    <div className="xl:col-span-1 flex flex-col h-[520px] rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/15 overflow-hidden shadow-inner">
                                        {/* Cabeçalho do Chat */}
                                        <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0 shadow-sm">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-2xl bg-orange-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-500/20">
                                                    {aiName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-none">{aiName}</h4>
                                                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-0.5 animate-pulse">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSimulatedMessages([{ role: 'assistant', content: 'Experimente o chat com IA!' }])}
                                                className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                Limpar
                                            </button>
                                        </div>

                                        {/* Corpo do Chat */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 thin-scrollbar bg-slate-150/40 dark:bg-slate-900/5 select-text">
                                            {simulatedMessages.map((msg, index) => (
                                                <div 
                                                    key={index}
                                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
                                                >
                                                    <div 
                                                        className={`max-w-[85%] rounded-[1.25rem] px-4 py-3 text-xs leading-relaxed font-bold shadow-sm whitespace-pre-wrap ${
                                                            msg.role === 'user'
                                                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-tr-none'
                                                            : 'bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                            {sendingSimulated && (
                                                <div className="flex justify-start">
                                                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[1.25rem] rounded-tl-none px-4 py-3 flex items-center gap-1 shadow-sm">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-75"></span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-150"></span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce delay-225"></span>
                                                    </div>
                                                </div>
                                            )}
                                            <div ref={chatEndRef} />
                                        </div>

                                        {/* Rodapé do Chat */}
                                        <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex-shrink-0">
                                            {simulatedMessages.length <= 1 && (
                                                <div className="flex flex-col gap-1.5 mb-2.5 animate-in slide-in-from-bottom-2">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">Perguntas simuladas:</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {[
                                                            'Tem como pagar com Pix?',
                                                            'Queria fazer um pedido para entrega',
                                                            'Qual o horário de funcionamento?'
                                                        ].map((qText, qIdx) => (
                                                            <button
                                                                key={qIdx}
                                                                onClick={() => {
                                                                    setTestMessageText(qText);
                                                                }}
                                                                className="text-[11px] font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-150 dark:border-slate-800 transition-all text-left shadow-sm"
                                                            >
                                                                {qText}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="relative flex items-center">
                                                <input
                                                    type="text"
                                                    value={testMessageText}
                                                    onChange={(e) => setTestMessageText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') void handleSendSimulatedMessage();
                                                    }}
                                                    disabled={sendingSimulated}
                                                    placeholder="Digite uma mensagem"
                                                    className="w-full pl-4 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-bold text-slate-800 dark:text-slate-100 outline-none placeholder-slate-400"
                                                />
                                                <button
                                                    onClick={() => void handleSendSimulatedMessage()}
                                                    disabled={sendingSimulated || !testMessageText.trim()}
                                                    className="absolute right-2 p-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-all disabled:opacity-50"
                                                >
                                                    <Send className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

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

                        <div className="p-8 overflow-y-auto space-y-10 flex-1 thin-scrollbar">
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
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded" title="Bom dia/tarde/noite automático">{"{{saudacao}}"}</span>
                                        <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded" title="Primeiro nome do cliente">{"{{first_name}}"}</span>
                                        <button
                                            onClick={() => handleHarmonizeMessage('campaign')}
                                            disabled={isHarmonizing || !newCampaignMessage.trim()}
                                            title="Harmonizar com IA (Gemini)"
                                            className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 transition-colors flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full disabled:opacity-50"
                                        >
                                            {isHarmonizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                            {isHarmonizing ? 'Harmonizando...' : 'Harmonizar com IA'}
                                        </button>
                                    </div>
                                </div>
                                <textarea 
                                    placeholder="Escreva sua mensagem aqui..."
                                    value={newCampaignMessage}
                                    onChange={(e) => {
                                        setNewCampaignMessage(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = (e.target.scrollHeight) + 'px';
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = (e.target.scrollHeight) + 'px';
                                    }}
                                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-brand-500 outline-none transition-all font-bold text-gray-800 dark:text-white resize-none thin-scrollbar min-h-[150px] overflow-hidden leading-relaxed block"
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

                            <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                                <div className="flex items-center gap-2 ml-1">
                                    <RefreshCcw className="w-3.5 h-3.5 text-brand-500" />
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Agendamento de Disparo (Opcional)</label>
                                </div>
                                <CustomDateInput 
                                    label="" 
                                    value={scheduledAt} 
                                    onChange={(date: Date | string | null) => {
                                        if (typeof date === 'string') {
                                            setScheduledAt(new Date(date));
                                        } else {
                                            setScheduledAt(date);
                                        }
                                    }} 
                                />
                                <p className="text-[10px] text-gray-400 italic ml-1">Selecione uma data e hora futura para o envio automático. Deixe vazio para envio imediato.</p>
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
                                        type="tel"
                                        value={manualPhones}
                                        onChange={(e) => {
                                            const rawValue = e.target.value;
                                            // Se for apagar, deixa apagar
                                            if (rawValue.length < manualPhones.length) {
                                                setManualPhones(rawValue);
                                                return;
                                            }

                                            // Formatação para um único número ou o último número após a vírgula
                                            const parts = rawValue.split(',');
                                            const lastPart = parts[parts.length - 1].trim();
                                            const digits = lastPart.replace(/\D/g, '').substring(0, 11);
                                            
                                            let formatted = digits;
                                            if (digits.length > 0) {
                                                if (digits.length <= 2) {
                                                    formatted = `(${digits}`;
                                                } else if (digits.length <= 6) {
                                                    formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
                                                } else if (digits.length <= 10) {
                                                    formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
                                                } else {
                                                    formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
                                                }
                                            }

                                            parts[parts.length - 1] = formatted;
                                            setManualPhones(parts.join(', '));
                                        }}
                                        placeholder="35999123456 (separe por vírgula)"
                                        className="flex-1 px-5 py-3.5 bg-gray-50/50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddManualPhones()}
                                    />
                                    <button
                                        onClick={handleAddManualPhones}
                                        disabled={!manualPhones.trim()}
                                        className="px-6 py-3.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all shadow-lg flex items-center gap-2"
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

            <StoreBlocklistModal 
                isOpen={isBlocklistModalOpen} 
                onClose={() => setIsBlocklistModalOpen(false)} 
                storeId={storeId || ''} 
            />

            {/* Modal de Cartão de Conhecimento (FAQ) */}
            {isKnowledgeModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 select-text">
                        {/* Cabeçalho */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-black text-slate-850 dark:text-slate-100">
                                    {editingCard ? 'Editar Cartão de Conhecimento' : 'Criar seu Cartão de Conhecimento'}
                                </h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Treinar assistente de IA</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsKnowledgeModalOpen(false);
                                    setEditingCard(null);
                                    setCardQuestion('');
                                    setCardAnswer('');
                                }}
                                className="p-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 hover:text-slate-750 transition-colors"
                            >
                                <PowerOff className="w-4 h-4 text-rose-500" />
                            </button>
                        </div>

                        {/* Corpo / Inputs */}
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pergunta do Cliente (Gatilho)</label>
                                <input
                                    type="text"
                                    value={cardQuestion}
                                    onChange={(e) => setCardQuestion(e.target.value)}
                                    placeholder="Ex: Como agendar uma entrega?"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-bold outline-none dark:text-white"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resposta da IA (Treinamento)</label>
                                <textarea
                                    value={cardAnswer}
                                    onChange={(e) => setCardAnswer(e.target.value)}
                                    placeholder="Ex: Para agendar uma entrega, basta acessar o nosso cardápio digital, selecionar a opção 'Agendar' na tela de sacola e escolher a data..."
                                    className="w-full h-36 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 transition-all text-xs font-bold outline-none resize-none leading-relaxed dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Rodapé / Ações */}
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setIsKnowledgeModalOpen(false);
                                    setEditingCard(null);
                                    setCardQuestion('');
                                    setCardAnswer('');
                                }}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancelar
                            </button>
                            <Button
                                onClick={() => void handleSaveKnowledgeCard()}
                                loading={savingCard}
                                className="!py-2.5 !px-6 !text-xs !bg-indigo-500 hover:!bg-indigo-600 rounded-xl"
                                icon={<Save className="w-3.5 h-3.5" />}
                            >
                                Salvar Cartão
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsBot;

