import React, { useEffect, useState, useCallback } from 'react';
import {
    Headphones,
    MessageCircle,
    Bot,
    PenTool,
    FileQuestion,
    Clock,
    ChevronDown,
    ChevronRight,
    Lock,
    ExternalLink,
    CalendarClock,
    ImagePlus,
    Send,
    AlertCircle,
    CheckCircle,
    MessageSquare,
    Save
} from 'lucide-react';
import { Loading } from './Loading';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { MobileTabsSelect } from './MobileTabsSelect';
import { Claim } from '../types';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import { checkBusinessHours, getNextBusinessDayMessage } from '../utils/supportHours';

export const StoreSupport: React.FC = () => {
    const MAX_ATTACHMENTS = 5;
    const [activeTab, setActiveTab] = useState<'menu' | 'ticket' | 'faq' | 'history'>('menu');
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loadingClaims, setLoadingClaims] = useState(false);
    const [supportPhone, setSupportPhone] = useState<string | null>(null);
    const [supportHours, setSupportHours] = useState<{ start: string; end: string } | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [supportOverride, setSupportOverride] = useState<'AUTO' | 'OPEN' | 'CLOSED'>('AUTO');
    const [lastStatusCheck, setLastStatusCheck] = useState<Date | null>(null);

    const [ticketType, setTicketType] = useState('other');
    const [ticketDesc, setTicketDesc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attachments, setAttachments] = useState<File[]>([]);

    const [showClosedModal, setShowClosedModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'whatsapp' | 'ticket' | null>(null);

    const dialog = useDialog();

    const computeIsOpen = (override: 'AUTO' | 'OPEN' | 'CLOSED', hours: { start: string; end: string }) => {
        if (override === 'OPEN') return true;
        if (override === 'CLOSED') return false;
        return checkBusinessHours(hours.start, hours.end);
    };

    const fetchSettings = useCallback(async (mounted: boolean) => {
        try {
            const settings = await cloud.getShopSettings();
            if (settings) {
                if (settings.support_phone) {
                    setSupportPhone(settings.support_phone);
                }

                const start = settings.support_hours_start || '09:00';
                const end = settings.support_hours_end || '18:00';
                const override = (settings.support_status_override || 'AUTO') as 'AUTO' | 'OPEN' | 'CLOSED';
                if (mounted) {
                    setSupportHours({ start, end });
                    setSupportOverride(override);
                    setIsOpen(computeIsOpen(override, { start, end }));
                    setLastStatusCheck(new Date());
                }
            } else if (mounted) {
                const fallback = { start: '09:00', end: '18:00' };
                setSupportHours(fallback);
                setSupportOverride('AUTO');
                setIsOpen(computeIsOpen('AUTO', fallback));
                setLastStatusCheck(new Date());
            }
        } catch {
            if (mounted) {
                const fallback = { start: '09:00', end: '18:00' };
                setSupportHours(fallback);
                setSupportOverride('AUTO');
                setIsOpen(computeIsOpen('AUTO', fallback));
                setLastStatusCheck(new Date());
            }
        } finally {
            if (mounted) setLoadingSettings(false);
        }
    }, []);

    useEffect(() => {
        let mounted = true;
        void fetchSettings(mounted);
        const refreshInterval = window.setInterval(() => void fetchSettings(mounted), 5 * 60 * 1000);
        return () => {
            mounted = false;
            window.clearInterval(refreshInterval);
        };
    }, [fetchSettings]);

    useEffect(() => {
        if (!supportHours) return;
        const tick = () => setIsOpen(computeIsOpen(supportOverride, supportHours));
        tick();
        const interval = window.setInterval(tick, 60 * 1000);
        return () => window.clearInterval(interval);
    }, [supportHours, supportOverride]);

    const fetchClaims = async () => {
        setClaims([]);
        setLoadingClaims(true);
        try {
            const data = await cloud.getMyClaims();
            setClaims(data || []);
        } catch {
            setClaims([]);
        } finally {
            setLoadingClaims(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            void fetchClaims();
        }
    }, [activeTab]);

    const handleInteraction = (action: 'whatsapp' | 'ticket') => {
        if (isOpen) {
            if (action === 'whatsapp') handleOpenWhatsapp();
            if (action === 'ticket') setActiveTab('ticket');
        } else {
            setPendingAction(action);
            setShowClosedModal(true);
        }
    };

    const supportHoursLabel = supportHours
        ? `${supportHours.start} - ${supportHours.end}`
        : '09:00 - 18:00';
    const nextBusinessMessage = getNextBusinessDayMessage(supportHours?.start || '09:00');
    const supportStatusLabel = loadingSettings
        ? 'Verificando status...'
        : isOpen
            ? 'Atendimento online'
            : 'Atendimento offline';
    const supportStatusDescription = loadingSettings
        ? 'Aguarde um instante.'
        : isOpen
            ? 'Equipe humana disponível agora.'
            : `Equipe humana indisponível. ${nextBusinessMessage}.`;

    const handleSubmitTicket = async (isScheduling: boolean = false) => {
        if (!ticketDesc.trim()) {
            await dialog.alert({ title: "Erro no chamado", message: "Descreva o problema detalhadamente." });
            return;
        }
        if (attachments.length > MAX_ATTACHMENTS) {
            await dialog.alert({ title: "Limite de imagens", message: `Você pode anexar no máximo ${MAX_ATTACHMENTS} imagens.` });
            return;
        }
        setIsSubmitting(true);
        try {
            const finalDesc = isScheduling
                ? `[AGENDAMENTO FORA DE HORARIO] ${ticketDesc}`
                : ticketDesc;

            await cloud.createClaim(ticketType, finalDesc, attachments);

            if (isScheduling) {
                await dialog.alert({ title: "Chamado registrado", message: `Registramos seu chamado fora do horário. Nossa equipe responde no ${nextBusinessMessage}.` });
                setShowClosedModal(false);
                setPendingAction(null);
            } else {
                await dialog.alert({ title: "Chamado enviado", message: "Recebemos seu chamado. Vamos responder o mais rápido possível." });
            }

            setTicketDesc('');
            setAttachments([]);
            setActiveTab('history');
        } catch (e: any) {
            await dialog.alert({ title: "Erro", message: "Erro ao abrir chamado: " + e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const addAttachments = async (files: File[]) => {
        if (files.length === 0) return;
        const remaining = MAX_ATTACHMENTS - attachments.length;
        if (remaining <= 0) {
            await dialog.alert({ title: "Limite de imagens", message: `Você pode anexar no máximo ${MAX_ATTACHMENTS} imagens.` });
            return;
        }
        const toAdd = files.slice(0, remaining);
        setAttachments(prev => [...prev, ...toAdd]);
        if (files.length > remaining) {
            await dialog.alert({ title: "Limite de imagens", message: `Apenas ${MAX_ATTACHMENTS} imagens serão anexadas.` });
        }
    };

    const handleOpenWhatsapp = () => {
        const number = supportPhone || "5511999999999";
        const message = encodeURIComponent("Olá, sou parceiro Zé Entregas e preciso de ajuda.");
        window.open(`https://wa.me/${number}?text=${message}`, '_blank');
    };

    const tabs = [
        { key: 'menu' as const, label: 'Visão Geral', icon: Headphones },
        { key: 'ticket' as const, label: 'Abrir Chamado', icon: PenTool },
        { key: 'faq' as const, label: 'Perguntas Frequentes', icon: FileQuestion },
        { key: 'history' as const, label: 'Meus Chamados', icon: Clock }
    ];

    const faqs = [
        { q: 'Como solicitar uma entrega pelo Gestor?', a: 'Acesse o menu "Nova Comanda" ou "Nova Entrega" e preencha os dados de endereço do cliente e valor do pedido. O sistema acionará automaticamente a fila de entregadores.' },
        { q: 'Como funciona o aceite automático?', a: 'Na barra lateral de pedidos, você pode ativar o "Aceite Automático". Os pedidos novos serão aprovados síncronamente pela nossa cozinha sem necessidade de clique manual.' },
        { q: 'Como gerenciar e alterar horários da loja?', a: 'No menu "Ajustes do Gestor", aba "Operação", você pode configurar e alterar os horários estruturados de abertura e fechamento da loja.' },
        { q: 'O que fazer se um pedido estiver atrasado?', a: 'Selecione o pedido na aba de monitoramento do gestor para visualizar os detalhes e a localização do entregador no mapa ou acionar o chat direto com o suporte.' },
        { q: 'Qual o horário do suporte oficial?', a: `Nosso suporte humano atende de segunda a sexta, das ${supportHoursLabel}.` }
    ];

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in pb-24 font-sans text-gray-800 dark:text-gray-200">
            {/* Header Integrado */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6 md:p-8 rounded-[32px] shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10">
                    <Headphones className="w-48 h-48" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                            <Headphones className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/80">Gestor de Pedidos</p>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Central de Suporte</h1>
                        </div>
                    </div>
                    <p className="text-xs md:text-sm text-white/90 max-w-xl">
                        Tire dúvidas operacionais, gerencie chamados técnicos e receba atendimento personalizado para a sua loja.
                    </p>
                </div>
            </div>

            {/* Menu de Abas Premium */}
            <div className="flex bg-gray-150/10 dark:bg-gray-800 p-1.5 rounded-2xl overflow-x-auto no-scrollbar border border-gray-100 dark:border-gray-700/60 max-w-2xl">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight flex items-center justify-center gap-2 whitespace-nowrap transition-all ${
                                activeTab === tab.key
                                    ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-white shadow-sm border border-gray-100/50 dark:border-gray-800'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Aba 1: Visão Geral */}
            {activeTab === 'menu' && (
                <div className="space-y-6 md:space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
                        <div className="space-y-5">
                            <div>
                                <h2 className="font-black text-lg text-gray-900 dark:text-white">Canais Disponíveis</h2>
                                <p className="text-xs text-gray-400">Escolha o melhor meio para esclarecer suas dúvidas operacionais.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleInteraction('whatsapp')}
                                    className={`group flex items-start gap-4 p-5 rounded-3xl border transition-all text-left ${
                                        isOpen
                                            ? 'bg-green-50/20 dark:bg-green-900/10 border-green-200 dark:border-green-800/40 hover:bg-green-50/30 hover:scale-[1.01]'
                                            : 'bg-gray-50/30 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800 opacity-90'
                                    }`}
                                >
                                    <div className={`p-3 rounded-2xl ${isOpen ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700'}`}>
                                        <MessageCircle className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Fale via WhatsApp</h3>
                                            {!isOpen && <Lock className="w-3.5 h-3.5 text-gray-400" />}
                                        </div>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            {isOpen ? 'Suporte humano em tempo real.' : 'Deixe sua mensagem no horário comercial.'}
                                        </p>
                                    </div>
                                    {isOpen ? (
                                        <ExternalLink className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    ) : (
                                        <span className="text-[9px] font-black tracking-widest bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500">OFFLINE</span>
                                    )}
                                </button>

                                <button
                                    onClick={() => handleInteraction('ticket')}
                                    className="group flex items-start gap-4 p-5 rounded-3xl border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 hover:scale-[1.01] transition-all text-left"
                                >
                                    <div className="p-3 rounded-2xl bg-red-500 text-white">
                                        <PenTool className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Abrir Chamado</h3>
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                            Reportar falhas técnicas ou bugs com comprovantes de imagens.
                                        </p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                </button>
                            </div>
                        </div>

                        {/* Status Lateral */}
                        <div className="bg-gray-100/50 dark:bg-gray-800/40 p-5 rounded-[2rem] border border-gray-100/40 dark:border-gray-800/60 space-y-4">
                            <div className="flex items-center gap-2 text-sm font-extrabold text-gray-700 dark:text-gray-300">
                                <CalendarClock className="w-4 h-4 text-red-500" />
                                Horário de Funcionamento
                            </div>
                            <div className="space-y-1">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                                    isOpen
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                }`}>
                                    {supportStatusLabel}
                                </span>
                                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                                    {supportStatusDescription}
                                </p>
                            </div>
                            <div className="text-[10px] text-gray-400 font-bold border-t border-gray-250/10 pt-3">
                                Atendimento operacional humano de segunda a sexta, das {supportHoursLabel}.
                            </div>
                        </div>
                    </div>

                    {/* Dicas de Usabilidade */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            <AlertCircle className="w-4.5 h-4.5 text-red-500" /> Dicas de Atendimento Rápido
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { title: 'Identifique o Pedido', desc: 'Sempre informe o número do pedido (ex: #5031b) ao tratar de problemas de entrega ou comanda.' },
                                { title: 'Explique o Fluxo', desc: 'Detalhe em qual etapa do fluxo operacional o erro ocorreu (ex: aceitando pedido, imprimindo comanda).' },
                                { title: 'Envie Evidências', desc: 'Se a tela apresentar algum erro ou travar, tire um print e anexe ao abrir um chamado técnico.' }
                            ].map((tip, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-md bg-red-500/10 text-red-500 flex items-center justify-center text-xs font-black">{idx + 1}</span>
                                        <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{tip.title}</h4>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed pl-7">{tip.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Aba 2: Novo Chamado */}
            {activeTab === 'ticket' && (
                <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                    <div>
                        <h2 className="font-black text-lg text-gray-900 dark:text-white">Novo Chamado Técnico</h2>
                        <p className="text-xs text-gray-400 mt-1">Nossa equipe técnica revisará os dados do formulário e responderá diretamente no histórico.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
                        <div className="space-y-5">
                            <CustomSelect
                                label="Tipo do Problema / Assunto"
                                value={ticketType}
                                onChange={setTicketType}
                                options={[
                                    { label: 'Problema na Comanda / Pedidos', value: 'order_issue' },
                                    { label: 'Falha de Integração ou WhatsBot', value: 'whatsbot_bug' },
                                    { label: 'Erro de Localização ou GPS', value: 'gps_error' },
                                    { label: 'Dificuldades Financeiras / Repasses', value: 'billing_issue' },
                                    { label: 'Sugestões de Melhorias', value: 'suggestion' },
                                    { label: 'Outros Assuntos Técnicos', value: 'other' }
                                ]}
                            />

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">Descrição Detalhada</label>
                                <textarea
                                    value={ticketDesc}
                                    onChange={e => setTicketDesc(e.target.value)}
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-250/10 focus:border-red-500/50 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 transition-all text-gray-800 dark:text-white h-36 resize-none placeholder:text-gray-500"
                                    placeholder="Descreva detalhadamente o erro ocorrido, incluindo mensagens de erro exibidas..."
                                />
                            </div>

                            {/* Anexo de Arquivos */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Imagens Anexas ({attachments.length}/{MAX_ATTACHMENTS})</span>
                                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-black text-red-500 uppercase tracking-widest bg-red-500/5 hover:bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/10 transition-colors">
                                        <ImagePlus className="w-4 h-4" />
                                        Selecionar Prints
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={e => {
                                                void addAttachments(Array.from(e.target.files || []));
                                                e.currentTarget.value = '';
                                            }}
                                        />
                                    </label>
                                </div>

                                {attachments.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {attachments.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-semibold">
                                                <span className="truncate flex-1">{file.name}</span>
                                                <button
                                                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                    className="text-red-500 hover:text-red-700 font-extrabold"
                                                >
                                                    Remover
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Button onClick={() => handleSubmitTicket(false)} disabled={isSubmitting} fullWidth className="py-4 font-black">
                                {isSubmitting ? <Loading variant="inline" size="sm" /> : <><Send className="w-4.5 h-4.5 mr-2" /> Enviar Chamado</>}
                            </Button>
                        </div>

                        {/* Painel lateral de Requisitos */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-900/40 p-5 rounded-2xl border border-gray-150/10 space-y-3">
                                <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Instruções de Abertura</h4>
                                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-2 list-disc pl-4 leading-relaxed">
                                    <li>Preencha o formulário com dados reais; não use caracteres ou códigos inválidos.</li>
                                    <li>Imagens anexadas devem ser em formato de foto (.png, .jpg, .jpeg) de até 5MB.</li>
                                    <li>Nosso SLA de suporte técnico padrão é de até 24h úteis para resolução de problemas comuns.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Aba 3: Perguntas Frequentes */}
            {activeTab === 'faq' && (
                <div className="space-y-4">
                    <div>
                        <h2 className="font-black text-lg text-gray-900 dark:text-white">Perguntas Frequentes</h2>
                        <p className="text-xs text-gray-400 mt-1">Dúvidas rápidas sobre a operação e funcionamento do Gestor na cozinha.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
                        <div className="space-y-2">
                            {faqs.map((faq, idx) => (
                                <details key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 group transition-all">
                                    <summary className="font-extrabold text-sm dark:text-white cursor-pointer list-none flex justify-between items-center select-none">
                                        {faq.q}
                                        <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3 italic">
                                        {faq.a}
                                    </p>
                                </details>
                            ))}
                        </div>

                        <div className="bg-gray-100/50 dark:bg-gray-800/40 p-5 rounded-[2rem] border border-gray-100/40 dark:border-gray-800/60 flex flex-col justify-between h-48">
                            <div>
                                <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2">Suporte no WhatsApp</h4>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    Não encontrou sua dúvida operacional? Fale diretamente com nosso time de atendimento.
                                </p>
                            </div>
                            <Button variant="outline" onClick={() => handleInteraction('whatsapp')} fullWidth>
                                <MessageCircle className="w-4 h-4 mr-2 text-green-500" /> Iniciar Conversa
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Aba 4: Meus Chamados */}
            {activeTab === 'history' && (
                <div className="space-y-5">
                    <div>
                        <h2 className="font-black text-lg text-gray-900 dark:text-white">Meus Chamados Tecnicos</h2>
                        <p className="text-xs text-gray-400 mt-1">Acompanhe as respostas e o andamento de todos os chamados abertos da sua loja.</p>
                    </div>

                    {loadingClaims ? (
                        <div className="py-20 flex justify-center">
                            <Loading variant="inline" size="md" message="Carregando chamados..." />
                        </div>
                    ) : claims.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                            <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2 opacity-30 animate-pulse" />
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Nenhum chamado aberto encontrado</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {claims.map(claim => (
                                <div key={claim.id} className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-gray-400 font-mono">#{claim.id.slice(0, 6)}</span>
                                            <span className="font-extrabold text-sm dark:text-white uppercase tracking-wide">{claim.type.replace('_', ' ')}</span>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                            claim.status === 'resolved'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                : claim.status === 'open'
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                                        }`}>
                                            {claim.status === 'open' ? 'Pendente' : claim.status === 'resolved' ? 'Resolvido' : claim.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium bg-gray-50 dark:bg-gray-900/40 p-3.5 rounded-2xl border border-gray-150/10 italic">
                                        "{claim.description}"
                                    </p>

                                    {claim.admin_response && (
                                        <div className="p-4 bg-red-500/5 dark:bg-red-500/5 rounded-2xl border border-red-500/10 text-xs">
                                            <div className="flex items-center gap-1 text-red-500 font-black uppercase tracking-wider text-[10px] mb-1">
                                                <Headphones className="w-3.5 h-3.5" /> Retorno do Suporte
                                            </div>
                                            <p className="font-extrabold text-gray-800 dark:text-white italic leading-relaxed">
                                                "{claim.admin_response}"
                                            </p>
                                        </div>
                                    )}

                                    <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 pl-1">
                                        <span>Enviado em {new Date(claim.created_at).toLocaleDateString('pt-BR')} às {new Date(claim.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Suporte Offline */}
            {showClosedModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-sans select-none animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-[#0B0F19]/60 backdrop-blur-sm" onClick={() => setShowClosedModal(false)} />
                    <div className="w-full max-w-md bg-[#161B26] border border-gray-800/85 rounded-[28px] shadow-2xl p-6 relative z-10 flex flex-col gap-6 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 mb-4 animate-bounce-slow">
                                <Clock className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-black text-white uppercase tracking-wider">Atendimento Offline</h3>
                            <p className="text-xs text-gray-400 leading-relaxed mt-2">
                                No momento nossa equipe humana está indisponível. {nextBusinessMessage}.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <button
                                onClick={() => {
                                    if (pendingAction === 'whatsapp') handleOpenWhatsapp();
                                    if (pendingAction === 'ticket') setActiveTab('ticket');
                                    setShowClosedModal(false);
                                }}
                                className="w-full py-3.5 bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-red-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                            >
                                <span>Continuar Mesmo Assim</span>
                            </button>
                            <button
                                onClick={() => setShowClosedModal(false)}
                                className="w-full py-3.5 bg-transparent text-gray-450 hover:text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl active:scale-[0.98] transition-all text-center"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
