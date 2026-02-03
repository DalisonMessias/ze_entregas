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

const getNextBusinessDayMessage = (startTime: string = '09:00'): string => {
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

    return `Proximo dia util (${nextDate.toLocaleDateString('pt-BR')}) a partir das ${startTime}h`;
};

export const SupportPage: React.FC<SupportPageProps> = ({ onBack, onNavigateToChat }) => {
    const [activeTab, setActiveTab] = useState<'menu' | 'ticket' | 'faq' | 'history'>('menu');
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loadingClaims, setLoadingClaims] = useState(false);
    const [supportPhone, setSupportPhone] = useState<string | null>(null);
    const [supportHours, setSupportHours] = useState<{ start: string; end: string } | null>(null);
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

                    const start = settings.support_hours_start || '09:00';
                    const end = settings.support_hours_end || '18:00';
                    setSupportHours({ start, end });

                    const override = settings.support_status_override || 'AUTO';
                    if (override === 'OPEN') {
                        setIsOpen(true);
                    } else if (override === 'CLOSED') {
                        setIsOpen(false);
                    } else {
                        setIsOpen(checkBusinessHours(
                            start,
                            end
                        ));
                    }
                } else {
                    setSupportHours({ start: '09:00', end: '18:00' });
                    setIsOpen(checkBusinessHours('09:00', '18:00'));
                }
            } catch {
                setSupportHours({ start: '09:00', end: '18:00' });
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
            ? 'Equipe humana disponivel agora.'
            : `Equipe humana indisponivel. ${nextBusinessMessage}.`;

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
                await alert({ title: "Chamado registrado", message: `Registramos seu chamado fora do horario. Nossa equipe responde no ${nextBusinessMessage}.` });
                setShowClosedModal(false);
                setPendingAction(null);
            } else {
                await alert({ title: "Chamado enviado", message: "Recebemos seu chamado. Vamos responder assim que possivel." });
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
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr,1fr] gap-4">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-black text-xl text-gray-900 dark:text-white">Canais de atendimento</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Escolha o canal ideal e acompanhe seus chamados em um so lugar.
                            </p>
                        </div>
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${loadingSettings
                                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                                : isOpen
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200'
                                }`}
                        >
                            {loadingSettings ? 'Status' : (isOpen ? 'Online' : 'Offline')}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                            onClick={() => handleInteraction('chat')}
                            className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all text-left ${isOpen
                                ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-800 hover:bg-brand-100 dark:hover:bg-brand-900/30'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-90'
                                }`}
                        >
                            <div className={`p-3 rounded-xl ${isOpen ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-gray-900 dark:text-white">Chat ao vivo</h3>
                                    {!isOpen && <Lock className="w-3 h-3 text-gray-400" />}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isOpen ? 'Fale com um atendente agora.' : 'Equipe humana offline. Use o assistente 24h.'}
                                </p>
                            </div>
                            {isOpen ? (
                                <ChevronRight className="w-5 h-5 text-brand-500" />
                            ) : (
                                <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded text-gray-500">OFFLINE</span>
                            )}
                        </button>

                        <button
                            onClick={() => handleInteraction('whatsapp')}
                            className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all text-left ${isOpen
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-90'
                                }`}
                        >
                            <div className={`p-3 rounded-xl ${isOpen ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                <MessageCircle className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-gray-900 dark:text-white">WhatsApp</h3>
                                    {!isOpen && <Lock className="w-3 h-3 text-gray-400" />}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isOpen ? 'Canal alternativo para suporte humano.' : 'Deixe seu chamado e respondemos no horario util.'}
                                </p>
                            </div>
                            {isOpen ? (
                                <ExternalLink className="w-5 h-5 text-green-500" />
                            ) : (
                                <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded text-gray-500">OFFLINE</span>
                            )}
                        </button>

                        <button
                            onClick={() => handleInteraction('ticket')}
                            className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all text-left ${isOpen
                                ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <PenTool className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-gray-900 dark:text-white">Abrir chamado</h3>
                                    {!isOpen && <CalendarClock className="w-3 h-3 text-gray-400" />}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isOpen ? 'Registro oficial com acompanhamento.' : 'Registre agora e retornamos no proximo dia util.'}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>

                        <button
                            onClick={() => setActiveTab('history')}
                            className="group flex items-start gap-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                        >
                            <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <h3 className="font-black text-gray-900 dark:text-white">Meus chamados</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhe respostas e status.</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                        <CalendarClock className="w-4 h-4 text-brand-600" />
                        Como agilizar o atendimento
                    </div>
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        {[
                            {
                                title: 'Informe o tipo do problema',
                                desc: 'Ajuda o time a direcionar seu chamado.'
                            },
                            {
                                title: 'Descreva o que aconteceu',
                                desc: 'Inclua horario, tela e comportamento observado.'
                            },
                            {
                                title: 'Se tiver, informe o numero do pedido',
                                desc: 'Isso acelera a analise do suporte.'
                            },
                        ].map((item, index) => (
                            <div key={item.title} className="flex gap-3">
                                <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-200 flex items-center justify-center text-xs font-black">
                                    {index + 1}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-white text-sm">{item.title}</div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className={`rounded-xl border p-3 text-xs ${isOpen
                        ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-900/40'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        <div className="font-bold text-gray-900 dark:text-white">Horario do suporte humano</div>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Seg a sex, {supportHoursLabel}. {isOpen
                                ? 'Se o chat estiver ocupado, abra um chamado.'
                                : 'Fora do horario, deixe um chamado e use o assistente 24h.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                    onClick={() => setActiveTab('faq')}
                    className="group flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                >
                    <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <FileQuestion className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <div className="font-black text-gray-900 dark:text-white text-sm">Central de ajuda</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Artigos e perguntas frequentes.</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                    onClick={goToAssistant}
                    className="group flex items-center gap-3 p-4 rounded-2xl border border-brand-100 dark:border-brand-900/40 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-all text-left"
                >
                    <div className="p-2 rounded-xl bg-brand-600 text-white">
                        <Bot className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <div className="font-black text-brand-900 dark:text-brand-100 text-sm">Assistente 24h</div>
                        <div className="text-xs text-brand-700 dark:text-brand-300">Respostas automaticas a qualquer hora.</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-brand-400" />
                </button>

                <button
                    onClick={() => setActiveTab('history')}
                    className="group flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                >
                    <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                        <div className="font-black text-gray-900 dark:text-white text-sm">Meus chamados</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Veja respostas e atualizacoes.</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4 text-brand-600" />
                        Prazo de resposta
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        {isOpen
                            ? 'Respondemos por ordem de chegada. Se preferir, abra um chamado para acompanhar o protocolo.'
                            : 'Chamados abertos fora do horario entram na fila e respondemos no proximo dia util.'}
                    </p>
                </div>

                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        <Lock className="w-4 h-4 text-brand-600" />
                        Privacidade
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        Seus dados sao usados apenas para resolver o chamado e nao sao compartilhados fora da equipe.
                    </p>
                </div>
            </div>
        </div>
    );

    const renderTicketForm = () => (
        <div className="space-y-6">
            <div>
                <h2 className="font-black text-xl text-gray-900 dark:text-white">Novo chamado</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Descreva o problema com detalhes para agilizar o atendimento.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-6">
                <div className="space-y-5">
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

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Descricao detalhada</label>
                        <textarea
                            value={ticketDesc}
                            onChange={e => setTicketDesc(e.target.value)}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white h-36 resize-none"
                            placeholder="Ex: Ao finalizar entrega, o app trava na tela de confirmacao..."
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

                <div className="space-y-4">
                    <div className={`rounded-2xl border p-4 text-sm ${isOpen
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-200'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'
                        }`}
                    >
                        <div className="font-black mb-1">{supportStatusLabel}</div>
                        <p className="text-xs">
                            {loadingSettings
                                ? 'Aguarde um instante.'
                                : isOpen
                                    ? 'Estamos prontos para ajudar agora.'
                                    : `Sua solicitacao entra na fila. ${nextBusinessMessage}.`}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm">
                        <div className="font-black text-gray-900 dark:text-white mb-2">O que informar</div>
                        <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-start gap-2">
                                <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold">1</span>
                                <span>Numero do pedido (se houver) e cidade.</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold">2</span>
                                <span>Passo a passo do problema e tela onde aconteceu.</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold">3</span>
                                <span>Horarios aproximados e prints, se possivel.</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm">
                        <div className="font-black text-gray-900 dark:text-white mb-2">Horario humano</div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Seg a sex, {supportHoursLabel}. Fora desse horario, o assistente 24h continua disponivel.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderFAQ = () => (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="font-black text-xl text-gray-900 dark:text-white">Perguntas frequentes</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Autoatendimento rapido para as duvidas mais comuns.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => window.location.href = '/faq'}>
                        Ver FAQ publica
                    </Button>
                    <Button onClick={() => handleInteraction('ticket')}>
                        Abrir chamado
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-6">
                <div className="space-y-2">
                    {[
                        { q: 'Como mudar minha meta diaria?', a: 'Na tela inicial, clique em "Comecar o dia" e defina o valor da meta.' },
                        { q: 'O app funciona sem internet?', a: 'Sim. Funcoes basicas como registrar entregas e mapa funcionam offline.' },
                        { q: 'Como salvo um endereco?', a: 'Va na aba "Enderecos" e clique em "Salvar".' },
                        { q: 'Como acompanho um chamado?', a: 'Acesse "Meus chamados" e veja o status e as respostas.' },
                        { q: 'Onde vejo os horarios de suporte?', a: `Atendimento humano de seg a sex, das ${supportHoursLabel}.` },
                        { q: 'Como atualizar meus dados?', a: 'Abra o menu de perfil e edite nome, telefone e enderecos.' },
                        { q: 'Meus dados estao seguros?', a: 'Sim. Seus dados sao usados apenas para suporte e operacao do app.' },
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

                <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                        <div className="font-black text-gray-900 dark:text-white mb-2">Nao encontrou?</div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Abra um chamado e deixe o maximo de detalhes possiveis. Nossa equipe responde no horario util.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                        <div className="font-black text-gray-900 dark:text-white mb-2">Dica rapida</div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Sempre que possivel, envie o numero do pedido e a hora aproximada do ocorrido.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderHistory = () => (
        <div className="space-y-4">
            <div>
                <h2 className="font-black text-xl text-gray-900 dark:text-white">Historico de chamados</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Acompanhe o andamento dos seus chamados e as respostas do time.
                </p>
            </div>
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-sm text-gray-600 dark:text-gray-300">
                {loadingSettings
                    ? 'Verificando status do suporte...'
                    : isOpen
                        ? 'As respostas aparecem aqui assim que o time atender seu chamado.'
                        : `Equipe humana offline. ${nextBusinessMessage}.`}
            </div>
            {loadingClaims ? (
                <Loading variant="container" size="md" />
            ) : claims.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Nenhum chamado registrado ainda.</p>
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
                                    Suporte Ze Entregas
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mt-4">
                                    Central de suporte completa
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xl">
                                    Resolva duvidas, abra chamados e acompanhe respostas com canais dedicados e autoatendimento.
                                </p>
                            </div>

                            <div className={`rounded-2xl border p-4 text-sm min-w-[220px] ${isOpen ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-200' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                <div className="font-black">{supportStatusLabel}</div>
                                <p className="text-xs mt-1">{supportStatusDescription}</p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                                    <Clock className="w-4 h-4" />
                                    Horario humano: {supportHoursLabel}
                                </div>
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
                            <Button variant="outline" onClick={() => setActiveTab('faq')}>
                                FAQ
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-4 text-sm">
                                <div className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    Horario humano
                                </div>
                                <div className="text-base font-black text-gray-900 dark:text-white mt-1">{supportHoursLabel}</div>
                            </div>
                            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-4 text-sm">
                                <div className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    Resposta
                                </div>
                                <div className="text-base font-black text-gray-900 dark:text-white mt-1">
                                    {isOpen ? 'Ordem de chegada' : 'Proximo dia util'}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-4 text-sm">
                                <div className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                    Assistente 24h
                                </div>
                                <div className="text-base font-black text-gray-900 dark:text-white mt-1">Disponivel agora</div>
                            </div>
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
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Equipe humana offline</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                Nosso time atende de seg a sex, {supportHoursLabel}. Agora voce pode usar o assistente 24h ou registrar um chamado.
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
                                    <div className="font-bold text-brand-900 dark:text-brand-100 text-sm">Resolver com Assistente 24h</div>
                                    <div className="text-xs text-brand-700 dark:text-brand-300 opacity-80">Respostas automaticas a qualquer hora</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-brand-400 ml-auto" />
                            </button>

                            {pendingAction === 'ticket' || pendingAction === 'whatsapp' || pendingAction === 'chat' ? (
                                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                                    <h4 className="font-bold text-sm dark:text-white mb-2">Registrar chamado fora do horario?</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                        Seu chamado entra na fila e nossa equipe responde no {nextBusinessMessage}.
                                    </p>

                                    <div className="space-y-2">
                                        {pendingAction === 'whatsapp' || pendingAction === 'chat' ? (
                                            <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded text-center">
                                                Chat ao vivo e WhatsApp ficam disponiveis no horario humano.
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
                                    <div className="font-bold text-gray-900 dark:text-white text-sm">Deixar chamado na fila</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 opacity-80">Responderemos no proximo dia util</div>
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
