import React, { useEffect, useState } from 'react';
import {
    ArrowLeft,
    Bot,
    CalendarClock,
    ChevronDown,
    ChevronRight,
    Clock,
    ExternalLink,
    FileQuestion,
    Headphones,
    Lock,
    MessageCircle,
    MessageSquare,
    PenTool,
    Send
} from 'lucide-react';
import { Loading } from './Loading';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { Claim } from '../types';
import * as cloud from '../services/cloud';
import { ChatWindow } from './ChatWindow';
import { useDialog } from '../utils/dialogService';

interface SupportPageProps {
    onBack?: () => void;
    onNavigateToChat?: (tab: 'assistant' | 'support_chat') => void;
}

const checkBusinessHours = (start: string, end: string): boolean => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const currentMinutes = hour * 60 + minute;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const isWeekDay = day >= 1 && day <= 5;
    const isWorkingHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;

    return isWeekDay && isWorkingHours;
};

const getNextBusinessDayMessage = (): string => {
    const now = new Date();
    let nextDate = new Date(now);

    if (now.getDay() === 5 && now.getHours() >= 18) {
        nextDate.setDate(now.getDate() + 3);
    } else if (now.getDay() === 6) {
        nextDate.setDate(now.getDate() + 2);
    } else {
        nextDate.setDate(now.getDate() + 1);
    }

    if (nextDate.getDay() === 0) nextDate.setDate(nextDate.getDate() + 1);

    return `Proximo dia util (${nextDate.toLocaleDateString('pt-BR')}) a partir das 09:00h`;
};

export const SupportPage: React.FC<SupportPageProps> = ({ onBack, onNavigateToChat }) => {
    const [activeTab, setActiveTab] = useState<'menu' | 'ticket' | 'faq' | 'history'>('menu');
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loadingClaims, setLoadingClaims] = useState(false);
    const [supportPhone, setSupportPhone] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [loadingSettings, setLoadingSettings] = useState(true);

    const [ticketType, setTicketType] = useState('other');
    const [ticketDesc, setTicketDesc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showClosedModal, setShowClosedModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'whatsapp' | 'ticket' | 'chat' | null>(null);

    const [showLiveChat, setShowLiveChat] = useState(false);

    const { alert } = useDialog();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await cloud.getShopSettings();
                if (settings) {
                    if (settings.support_phone) {
                        setSupportPhone(settings.support_phone);
                    }

                    const override = settings.support_status_override || 'AUTO';
                    if (override === 'OPEN') {
                        setIsOpen(true);
                    } else if (override === 'CLOSED') {
                        setIsOpen(false);
                    } else {
                        setIsOpen(checkBusinessHours(
                            settings.support_hours_start || '09:00',
                            settings.support_hours_end || '18:00'
                        ));
                    }
                } else {
                    setIsOpen(checkBusinessHours('09:00', '18:00'));
                }
            } catch {
                setIsOpen(checkBusinessHours('09:00', '18:00'));
            } finally {
                setLoadingSettings(false);
            }
        };
        fetchSettings();
    }, []);

    const fetchClaims = async () => {
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
            fetchClaims();
        }
    }, [activeTab]);

    const handleInteraction = (action: 'whatsapp' | 'ticket' | 'chat') => {
        if (isOpen) {
            if (action === 'whatsapp') handleOpenWhatsapp();
            if (action === 'ticket') setActiveTab('ticket');
            if (action === 'chat') setShowLiveChat(true);
        } else {
            setPendingAction(action);
            setShowClosedModal(true);
        }
    };

    const handleSubmitTicket = async (isScheduling: boolean = false) => {
        if (!ticketDesc.trim()) {
            await alert({ title: "Erro no chamado", message: "Descreva o problema." });
            return;
        }
        setIsSubmitting(true);
        try {
            const finalDesc = isScheduling
                ? `[AGENDAMENTO FORA DE HORARIO] ${ticketDesc}`
                : ticketDesc;

            await cloud.createClaim(ticketType, finalDesc);

            if (isScheduling) {
                await alert({ title: "Agendamento confirmado", message: "Agendamento realizado! Nossa equipe respondera no proximo dia util." });
                setShowClosedModal(false);
                setPendingAction(null);
            } else {
                await alert({ title: "Chamado enviado", message: "Chamado aberto com sucesso!" });
            }

            setTicketDesc('');
            setActiveTab('history');
        } catch (e: any) {
            await alert({ title: "Erro", message: "Erro ao abrir chamado: " + e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenWhatsapp = () => {
        const number = supportPhone || "5511999999999";
        const message = encodeURIComponent("Ola, preciso de ajuda com o app Ze Entregas.");
        window.open(`https://wa.me/${number}?text=${message}`, '_blank');
    };

    const goToAssistant = () => {
        if (onNavigateToChat) {
            onNavigateToChat('assistant');
        } else {
            const btn = Array.from(document.querySelectorAll('button')).find(b =>
                b.textContent?.includes('Assistente') || b.textContent?.includes('Assistente Ze')
            );
            if (btn) btn.click();
        }
        setShowClosedModal(false);
    };

    const renderMenu = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
                onClick={() => handleInteraction('chat')}
                className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${isOpen
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-80'
                    }`}
            >
                <div className={`p-3 rounded-xl ${isOpen ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-black text-gray-900 dark:text-white">Chat ao vivo</h3>
                        {!isOpen && <Lock className="w-3 h-3 text-gray-400" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Atendimento imediato</p>
                </div>
                {isOpen ? <ChevronRight className="w-5 h-5 text-blue-500" /> : <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded text-gray-500">FECHADO</span>}
            </button>

            <button
                onClick={() => handleInteraction('whatsapp')}
                className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${isOpen
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-80'
                    }`}
            >
                <div className={`p-3 rounded-xl ${isOpen ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    <MessageCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-black text-gray-900 dark:text-white">WhatsApp</h3>
                        {!isOpen && <Lock className="w-3 h-3 text-gray-400" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Canal alternativo</p>
                </div>
                {isOpen ? <ExternalLink className="w-5 h-5 text-green-500" /> : <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded text-gray-500">FECHADO</span>}
            </button>

            <button
                onClick={() => setActiveTab('faq')}
                className="group flex items-center gap-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left"
            >
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <FileQuestion className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-black text-gray-900 dark:text-white">Central de ajuda</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Perguntas frequentes</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
                onClick={() => handleInteraction('ticket')}
                className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all text-left ${isOpen
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-80'
                    }`}
            >
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <PenTool className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-black text-gray-900 dark:text-white">Abrir chamado</h3>
                        {!isOpen && <CalendarClock className="w-3 h-3 text-gray-400" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Relate um problema tecnico</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            <button
                onClick={() => setActiveTab('history')}
                className="group flex items-center gap-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left md:col-span-2"
            >
                <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    <Clock className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <h3 className="font-black text-gray-900 dark:text-white">Meus chamados</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhe o status</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
        </div>
    );

    const renderTicketForm = () => (
        <div className="space-y-6">
            <div>
                <h2 className="font-black text-xl text-gray-900 dark:text-white">Novo chamado</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Descreva o problema com o maximo de detalhes para agilizar o atendimento.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr] gap-4">
                <CustomSelect
                    label="Tipo de problema"
                    value={ticketType}
                    onChange={setTicketType}
                    options={[
                        { label: 'Problema no app', value: 'app_bug' },
                        { label: 'Erro de endereco', value: 'address_error' },
                        { label: 'Problema com cliente', value: 'client_issue' },
                        { label: 'Sugestao', value: 'suggestion' },
                        { label: 'Outro', value: 'other' },
                    ]}
                />
                <div className={`rounded-2xl border p-4 text-sm ${isOpen ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-200' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                    <div className="font-black mb-1">
                        {loadingSettings ? 'Verificando status...' : (isOpen ? 'Atendimento online' : 'Atendimento fechado')}
                    </div>
                    <p className="text-xs">
                        {loadingSettings ? 'Aguarde um instante.' : (isOpen ? 'Estamos prontos para ajudar agora.' : getNextBusinessDayMessage())}
                    </p>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Descricao detalhada</label>
                <textarea
                    value={ticketDesc}
                    onChange={e => setTicketDesc(e.target.value)}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white h-36 resize-none"
                    placeholder="Descreva o que aconteceu..."
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <Button fullWidth onClick={() => handleSubmitTicket(false)} disabled={isSubmitting}>
                    {isSubmitting ? <Loading variant="inline" size="sm" /> : <Send className="w-5 h-5 mr-2" />}
                    {isSubmitting ? 'Enviando...' : 'Enviar chamado'}
                </Button>
                <Button fullWidth variant="outline" onClick={() => setActiveTab('menu')}>
                    Voltar
                </Button>
            </div>
        </div>
    );

    const renderFAQ = () => (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="font-black text-xl text-gray-900 dark:text-white">Perguntas frequentes</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Respostas diretas para o dia a dia.</p>
                </div>
                <Button variant="outline" onClick={() => window.location.href = '/faq'}>
                    Ver pagina publica
                </Button>
            </div>
            <div className="space-y-2">
                {[
                    { q: 'Como mudar minha meta diaria?', a: 'Na tela inicial, clique em "Comecar o dia" e defina o valor da meta.' },
                    { q: 'O app funciona sem internet?', a: 'Sim. Funcoes basicas como registrar entregas e mapa funcionam offline.' },
                    { q: 'Como salvo um endereco?', a: 'Va na aba "Enderecos" e clique em "Salvar".' },
                    { q: 'Meus dados estao seguros?', a: 'Sim. Seus dados sao salvos na nuvem e no seu aparelho.' },
                    { q: 'Qual o horario de suporte?', a: 'Atendimento humano de segunda a sexta, das 09h as 18h.' },
                ].map((item, idx) => (
                    <details key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 group">
                        <summary className="font-bold text-sm dark:text-white cursor-pointer list-none flex justify-between items-center">
                            {item.q}
                            <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3">
                            {item.a}
                        </p>
                    </details>
                ))}
            </div>
        </div>
    );

    const renderHistory = () => (
        <div className="space-y-4">
            <div>
                <h2 className="font-black text-xl text-gray-900 dark:text-white">Historico de chamados</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe o andamento dos seus pedidos.</p>
            </div>
            {loadingClaims ? (
                <Loading variant="container" size="md" />
            ) : claims.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhum chamado registrado.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {claims.map(claim => (
                        <div key={claim.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-sm dark:text-white uppercase tracking-wide">{claim.type.replace('_', ' ')}</span>
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${claim.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                    claim.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                    {claim.status === 'open' ? 'Aberto' : claim.status === 'resolved' ? 'Resolvido' : claim.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{claim.description}</p>

                            {claim.admin_response && (
                                <div className="mt-3 mb-3 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-100 dark:border-brand-900/30">
                                    <div className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-1 flex items-center gap-1">
                                        <Headphones className="w-3 h-3" /> Resposta do suporte:
                                    </div>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 italic">"{claim.admin_response}"</p>
                                </div>
                            )}

                            <div className="text-xs text-gray-400">
                                {new Date(claim.created_at).toLocaleDateString('pt-BR')} as {new Date(claim.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const tabs = [
        { key: 'menu' as const, label: 'Visao geral', icon: Headphones },
        { key: 'ticket' as const, label: 'Abrir chamado', icon: PenTool },
        { key: 'faq' as const, label: 'FAQ', icon: FileQuestion },
        { key: 'history' as const, label: 'Meus chamados', icon: Clock }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                <header className="relative overflow-hidden rounded-[32px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8">
                    <div className="absolute -top-32 right-0 w-72 h-72 bg-brand-500/10 blur-[120px]" />
                    <div className="absolute -bottom-24 left-0 w-72 h-72 bg-brand-600/10 blur-[120px]" />

                    <div className="relative z-10 space-y-6">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar
                            </button>
                        )}

                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-black uppercase tracking-widest">
                                    <Headphones className="w-4 h-4" />
                                    Central de suporte
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mt-4">
                                    Precisa de ajuda? Resolva por aqui.
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xl">
                                    Escolha o canal de atendimento ideal e acompanhe seus chamados em um so lugar.
                                </p>
                            </div>

                            <div className={`rounded-2xl border p-4 text-sm min-w-[220px] ${isOpen ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-200' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                <div className="font-black">
                                    {loadingSettings ? 'Verificando status...' : (isOpen ? 'Atendimento online' : 'Atendimento fechado')}
                                </div>
                                <p className="text-xs mt-1">
                                    {loadingSettings ? 'Aguarde um instante.' : (isOpen ? 'Equipe disponivel agora.' : getNextBusinessDayMessage())}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button onClick={() => handleInteraction('chat')}>
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Chat ao vivo
                            </Button>
                            <Button variant="outline" onClick={() => handleInteraction('whatsapp')}>
                                WhatsApp
                            </Button>
                            <Button variant="outline" onClick={() => setActiveTab('ticket')}>
                                Abrir chamado
                            </Button>
                        </div>
                    </div>
                </header>

                <nav className="flex flex-wrap gap-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive
                                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>

                <section className="bg-white dark:bg-gray-900 rounded-[28px] border border-gray-100 dark:border-gray-800 p-6 md:p-8 shadow-sm">
                    {activeTab === 'menu' && renderMenu()}
                    {activeTab === 'ticket' && renderTicketForm()}
                    {activeTab === 'faq' && renderFAQ()}
                    {activeTab === 'history' && renderHistory()}
                </section>
            </div>

            {showClosedModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
                                <Clock className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Atendimento fechado</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                Nosso time humano atende apenas de seg a sex, das 09h as 18h.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={goToAssistant}
                                className="w-full flex items-center p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-colors"
                            >
                                <div className="bg-brand-500 text-white p-2 rounded-lg mr-3">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-brand-900 dark:text-brand-100 text-sm">Tentar resolver com o Ze</div>
                                    <div className="text-xs text-brand-700 dark:text-brand-300 opacity-80">Respostas automaticas 24h</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-brand-400 ml-auto" />
                            </button>

                            {pendingAction === 'ticket' || pendingAction === 'whatsapp' || pendingAction === 'chat' ? (
                                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                                    <h4 className="font-bold text-sm dark:text-white mb-2">Agendar atendimento?</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                        Podemos registrar sua solicitacao agora e nossa equipe respondera no {getNextBusinessDayMessage()}.
                                    </p>

                                    <div className="space-y-2">
                                        {pendingAction === 'whatsapp' || pendingAction === 'chat' ? (
                                            <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded text-center">
                                                Chat ao vivo indisponivel fora do horario.
                                            </p>
                                        ) : (
                                            <>
                                                <textarea
                                                    value={ticketDesc}
                                                    onChange={e => setTicketDesc(e.target.value)}
                                                    className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white resize-none h-20"
                                                    placeholder="Descreva seu problema..."
                                                />
                                                <Button fullWidth onClick={() => handleSubmitTicket(true)} disabled={isSubmitting} className="h-10 text-sm">
                                                    {isSubmitting ? 'Agendando...' : 'Confirmar agendamento'}
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setPendingAction('ticket')}
                                    className="w-full flex items-center p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                >
                                    <div className="bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 p-2 rounded-lg mr-3">
                                        <CalendarClock className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-gray-900 dark:text-white text-sm">Agendar para dia util</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 opacity-80">Retornaremos no horario comercial</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
                                </button>
                            )}
                        </div>

                        <button onClick={() => { setShowClosedModal(false); setPendingAction(null); }} className="w-full mt-4 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {showLiveChat && (
                <ChatWindow
                    type="SUPPORT"
                    onClose={() => setShowLiveChat(false)}
                    title="Suporte ao vivo"
                />
            )}
        </div>
    );
};
