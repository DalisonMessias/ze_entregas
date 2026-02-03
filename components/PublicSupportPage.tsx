import React, { useState, useEffect } from 'react';
import {
    CalendarClock,
    ChevronDown,
    ChevronRight,
    Clock,
    ExternalLink,
    FileQuestion,
    Headphones,
    Lock,
    MessageCircle,
    MessageSquare
} from 'lucide-react';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { Logo } from './Logo';

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

export const PublicSupportPage: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'menu' | 'faq'>('menu');
    const [supportPhone, setSupportPhone] = useState<string | null>(null);
    const [supportHours, setSupportHours] = useState<{ start: string; end: string } | null>(null);
    const [loadingSettings, setLoadingSettings] = useState(true);
    const [hasSession, setHasSession] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

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
                        setIsOpen(checkBusinessHours(start, end));
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

    useEffect(() => {
        let mounted = true;
        const sb = cloud.getClient();
        if (!sb) {
            setCheckingSession(false);
            return;
        }
        sb.auth.getSession()
            .then(({ data }) => {
                if (mounted) setHasSession(!!data.session);
            })
            .finally(() => {
                if (mounted) setCheckingSession(false);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const handleOpenWhatsapp = () => {
        const number = supportPhone || "5511999999999";
        const message = encodeURIComponent("Ola, preciso de ajuda com o app Ze Entregas.");
        window.open(`https://wa.me/${number}?text=${message}`, '_blank');
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
    const showPublicHeader = !checkingSession;
    const primaryCtaLabel = hasSession ? 'Meu painel' : 'Entrar';
    const primaryCtaLink = hasSession ? '/home' : '/login';

    const renderMenu = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1.35fr,1fr] gap-4">
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="font-black text-xl text-gray-900 dark:text-white">Canais de atendimento</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Escolha o canal ideal e encontre respostas rapidas.
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
                            onClick={handleOpenWhatsapp}
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
                                    {isOpen ? 'Canal direto com atendentes.' : 'Fora do horario humano.'}
                                </p>
                            </div>
                            {isOpen ? (
                                <ExternalLink className="w-5 h-5 text-green-500" />
                            ) : (
                                <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded text-gray-500">OFFLINE</span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('faq')}
                            className="group flex items-start gap-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                        >
                            <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <FileQuestion className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <h3 className="font-black text-gray-900 dark:text-white">Perguntas frequentes</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Autoatendimento rapido.</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>

                        <a
                            href="/login"
                            className="group flex items-start gap-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                        >
                            <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <Lock className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <h3 className="font-black text-gray-900 dark:text-white">Area do cliente</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Login para abrir chamados.</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        </a>

                        <a
                            href="/login"
                            className="group flex items-start gap-4 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                        >
                            <div className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <h3 className="font-black text-gray-900 dark:text-white">Meus chamados</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhe status e respostas.</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        </a>
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
                                title: 'Use o FAQ primeiro',
                                desc: 'Muitas duvidas podem ser resolvidas em poucos minutos.'
                            },
                            {
                                title: 'Informe dados do pedido',
                                desc: 'Numero do pedido e horario ajudam o time.'
                            },
                            {
                                title: 'Acesse sua conta',
                                desc: 'Logado, voce pode abrir e acompanhar chamados.'
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
                                ? 'Estamos online agora.'
                                : 'Fora do horario, respondemos no proximo dia util.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4 text-brand-600" />
                        Prazo de resposta
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        {isOpen
                            ? 'Respondemos por ordem de chegada.'
                            : `Solicitacoes entram na fila. ${nextBusinessMessage}.`}
                    </p>
                </div>

                <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        <Lock className="w-4 h-4 text-brand-600" />
                        Privacidade
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        Seus dados sao usados apenas para suporte e nao sao compartilhados fora da equipe.
                    </p>
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
                        Respostas para as principais duvidas do app.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveTab('menu')}
                        className="inline-flex items-center gap-2 text-sm font-bold text-brand-600"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Voltar
                    </button>
                    <a href="/login" className="text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        Entrar na conta
                    </a>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-6">
                <div className="space-y-2">
                    {[
                        { q: 'Como fazer um pedido?', a: 'Escolha a loja, adicione os itens ao carrinho e clique em finalizar.' },
                        { q: 'Quais as formas de pagamento?', a: 'Aceitamos PIX, cartao e dinheiro na entrega, dependendo da loja.' },
                        { q: 'Como rastrear meu pedido?', a: 'Voce recebe um link de rastreio ou pode ver na sua conta.' },
                        { q: 'Esqueci minha senha', a: 'Na tela de login, clique em "Esqueci minha senha".' },
                        { q: 'Qual o horario do suporte?', a: `Atendimento humano de seg a sex, das ${supportHoursLabel}.` },
                        { q: 'Como abrir um chamado?', a: 'Entre na sua conta e acesse a area de suporte.' },
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
                            Acesse sua conta para abrir um chamado e acompanhar a resposta.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                        <div className="font-black text-gray-900 dark:text-white mb-2">Status do suporte</div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {supportStatusDescription}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const tabs = [
        { key: 'menu' as const, label: 'Visao geral' },
        { key: 'faq' as const, label: 'FAQ' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {showPublicHeader && (
                <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
                    <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                        <button
                            onClick={() => window.location.href = '/'}
                            className="flex items-center gap-3 text-left"
                        >
                            <Logo className="h-8 w-auto text-brand-600" mode="icon" />
                            <div>
                                <p className="text-xs uppercase tracking-widest text-gray-400 font-black">Central de Ajuda</p>
                                <p className="text-sm font-black text-gray-900 dark:text-white">Suporte Publico</p>
                            </div>
                        </button>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => window.location.href = primaryCtaLink}
                                variant="outline"
                                className="font-black text-sm"
                            >
                                {primaryCtaLabel}
                            </Button>
                            {!hasSession && (
                                <Button
                                    onClick={() => window.location.href = '/cadastro'}
                                    className="font-black text-sm"
                                >
                                    Criar conta
                                </Button>
                            )}
                        </div>
                    </div>
                </header>
            )}
            <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                <header className="relative overflow-hidden rounded-[32px] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8">
                    <div className="absolute -top-32 right-0 w-72 h-72 bg-brand-500/10 blur-[120px]" />
                    <div className="absolute -bottom-24 left-0 w-72 h-72 bg-brand-600/10 blur-[120px]" />

                    <div className="relative z-10 space-y-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-xs font-black uppercase tracking-widest">
                                    <Headphones className="w-4 h-4" />
                                    Suporte Ze Entregas
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mt-4">
                                    Central de suporte publica
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xl">
                                    Encontre respostas rapidas e saiba como falar com nossa equipe.
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
                                    Canal rapido
                                </div>
                                <div className="text-base font-black text-gray-900 dark:text-white mt-1">WhatsApp</div>
                            </div>
                        </div>
                    </div>
                </header>

                <nav className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <section className="bg-white dark:bg-gray-900 rounded-[28px] border border-gray-100 dark:border-gray-800 p-6 md:p-8 shadow-sm">
                    {activeTab === 'menu' && renderMenu()}
                    {activeTab === 'faq' && renderFAQ()}
                </section>
            </div>
        </div>
    );
};
