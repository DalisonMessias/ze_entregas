import React, { useEffect, useState } from 'react';
import {
    Bot,
    CalendarClock,
    ChevronDown,
    ChevronRight,
    Clock,
    ExternalLink,
    FileQuestion,
    Headphones,
    ImagePlus,
    Lock,
    MessageCircle,
    MessageSquare,
    PenTool,
    Send
} from 'lucide-react';
import { Loading } from './Loading';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { MobileTabsSelect } from './MobileTabsSelect';
import { Claim, UserRole } from '../types';
import * as cloud from '../services/cloud';
import { ChatWindow } from './ChatWindow';
import { useDialog } from '../utils/dialogService';
import { checkBusinessHours, getNextBusinessDayMessage } from '../utils/supportHours';

interface SupportPageProps {
    onBack?: () => void;
    onNavigateToChat?: (tab: 'assistant' | 'support_chat') => void;
    layout?: 'embedded' | 'standalone';
    userRole?: UserRole;
}

export const SupportPage: React.FC<SupportPageProps> = ({ onNavigateToChat, layout = 'embedded', userRole }) => {
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
    const [pendingAction, setPendingAction] = useState<'whatsapp' | 'ticket' | 'chat' | null>(null);

    const [showLiveChat, setShowLiveChat] = useState(false);

    const { alert } = useDialog();

    const resolvedRole: UserRole = userRole || 'user';
    const isStoreRole = resolvedRole === 'store_partner' || resolvedRole === 'collaborator';
    const isDriverRole = resolvedRole === 'delivery_partner' || resolvedRole === 'delivery_person';
    const isAdminRole = resolvedRole === 'admin';
    const roleKey = (isAdminRole ? 'admin' : isStoreRole ? 'store' : isDriverRole ? 'driver' : 'user') as 'admin' | 'store' | 'driver' | 'user';

    const goToTab = (tab: string) => {
        window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab } }));
    };

    const computeIsOpen = (override: 'AUTO' | 'OPEN' | 'CLOSED', hours: { start: string; end: string }) => {
        if (override === 'OPEN') return true;
        if (override === 'CLOSED') return false;
        return checkBusinessHours(hours.start, hours.end);
    };

    useEffect(() => {
        let mounted = true;
        const fetchSettings = async () => {
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
        };
        fetchSettings();
        const refreshInterval = window.setInterval(fetchSettings, 5 * 60 * 1000);
        return () => {
            mounted = false;
            window.clearInterval(refreshInterval);
        };
    }, []);

    useEffect(() => {
        if (!supportHours) return;
        const tick = () => setIsOpen(computeIsOpen(supportOverride, supportHours));
        tick();
        const interval = window.setInterval(tick, 60 * 1000);
        return () => window.clearInterval(interval);
    }, [supportHours, supportOverride]);

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
    const lastStatusLabel = lastStatusCheck
        ? `Atualizado às ${lastStatusCheck.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        : 'Atualizando status...';

    const roleContent = {
        store: {
            badge: 'Lojista',
            headline: 'Suporte para lojistas',
            subheadline: 'Pedidos, comanda, entregas e financeiro da sua loja.',
            highlights: [
                { title: 'Pedidos e comanda', desc: 'Fila, producao e status.' },
                { title: 'Entregas', desc: 'Solicitacoes e motoristas.' },
                { title: 'Financeiro', desc: 'ZéBank, repasses e taxas.' },
            ],
            tips: [
                { title: 'Informe o numero do pedido', desc: 'Ajuda a localizar seu chamado rapidamente.' },
                { title: 'Explique a etapa do fluxo', desc: 'Ex.: producao, saida ou entrega.' },
                { title: 'Inclua prints quando possivel', desc: 'Facilita a analise do time.' },
            ],
            actions: [
                { label: 'Fila de pedidos', desc: 'Producao e comanda', onClick: () => goToTab('internal_orders') },
                { label: 'Solicitar entrega', desc: 'Nova entrega', onClick: () => goToTab('new_request') },
                { label: 'Financeiro', desc: 'Saldo e repasses', onClick: () => goToTab('zebank') },
            ],
            faqs: [
                { q: 'Como solicitar uma entrega?', a: 'Vá em "Solicitar entrega" e preencha os dados do pedido.' },
                { q: 'Como acompanhar pedidos?', a: 'Acesse "Fila de pedidos" para ver status e producao.' },
                { q: 'Como ajustar horarios da loja?', a: 'Na tela de configuracoes da loja, atualize o horario.' },
                { q: 'Como ver repasses?', a: 'No ZéBank voce acompanha saldo, repasses e extratos.' },
                { q: 'Qual o horario do suporte?', a: `Atendimento humano seg a sex, das ${supportHoursLabel}.` },
            ],
            faqNotes: [
                { title: 'Dica para lojistas', body: 'Inclua numero do pedido e cidade para agilizar o atendimento.' },
                { title: 'Horario humano', body: `Seg a sex, ${supportHoursLabel}. Fora disso, o assistente 24h ajuda.` },
            ],
        },
        driver: {
            badge: 'Entregador',
            headline: 'Suporte para entregadores',
            subheadline: 'Rotas, pagamentos, bloqueio e performance.',
            highlights: [
                { title: 'Rotas e corridas', desc: 'Aceite, retirada e entrega.' },
                { title: 'Pagamentos', desc: 'Saldo, repasses e extratos.' },
                { title: 'Score e bloqueio', desc: 'Entenda regras e limites.' },
            ],
            tips: [
                { title: 'Informe a corrida', desc: 'Use codigo ou horario aproximado.' },
                { title: 'Explique o que ocorreu', desc: 'Ex.: cancelamento, rota ou pagamento.' },
                { title: 'Envie prints do app', desc: 'Ajuda na analise do time.' },
            ],
            actions: [
                { label: 'Rotas', desc: 'Mapa e ferramentas', onClick: () => goToTab('route_list') },
                { label: 'Entregas', desc: 'Minhas corridas', onClick: () => goToTab('associate_orders') },
                { label: 'ZéBank', desc: 'Saldo e repasses', onClick: () => goToTab('zebank') },
            ],
            faqs: [
                { q: 'Como iniciar o dia?', a: 'Abra o painel e ative sua disponibilidade.' },
                { q: 'Posso recusar uma corrida?', a: 'Sim, mas recusas frequentes afetam seu score.' },
                { q: 'Como confirmar entrega?', a: 'Use o codigo de entrega informado pelo cliente.' },
                { q: 'Quando recebo o pagamento?', a: 'Os repasses aparecem no ZéBank conforme sua configuracao.' },
                { q: 'Qual o horario do suporte?', a: `Atendimento humano seg a sex, das ${supportHoursLabel}.` },
            ],
            faqNotes: [
                { title: 'Dica para entregadores', body: 'Informe codigo da entrega e horario aproximado.' },
                { title: 'Status do suporte', body: supportStatusDescription },
            ],
        },
        user: {
            badge: 'Cliente',
            headline: 'Suporte para clientes',
            subheadline: 'Pedidos, pagamentos e dados da conta.',
            highlights: [
                { title: 'Meus pedidos', desc: 'Acompanhe status e entregas.' },
                { title: 'Pagamentos', desc: 'PIX, cartao e comprovantes.' },
                { title: 'Conta', desc: 'Enderecos e dados pessoais.' },
            ],
            tips: [
                { title: 'Informe o numero do pedido', desc: 'Ajuda a localizar o atendimento.' },
                { title: 'Detalhe o problema', desc: 'Ex.: pagamento, entrega ou item.' },
                { title: 'Atualize seus dados', desc: 'Enderecos corretos evitam atrasos.' },
            ],
            actions: [
                { label: 'Minha conta', desc: 'Perfil e dados', onClick: () => goToTab('profile') },
                { label: 'Enderecos', desc: 'Gerencie locais', onClick: () => goToTab('addresses') },
                { label: 'Lojas', desc: 'Voltar para comprar', onClick: () => goToTab('shop') },
            ],
            faqs: [
                { q: 'Como fazer um pedido?', a: 'Escolha a loja, adicione itens e finalize o carrinho.' },
                { q: 'Quais formas de pagamento?', a: 'PIX e cartao, conforme disponibilidade da loja.' },
                { q: 'Como rastrear meu pedido?', a: 'Veja o status na sua conta ou pelo link recebido.' },
                { q: 'Esqueci minha senha', a: 'Na tela de login, clique em "Esqueci minha senha".' },
                { q: 'Qual o horario do suporte?', a: `Atendimento humano seg a sex, das ${supportHoursLabel}.` },
            ],
            faqNotes: [
                { title: 'Precisa de ajuda?', body: 'Abra um chamado e descreva o problema com detalhes.' },
                { title: 'Privacidade', body: 'Seus dados sao usados apenas para suporte.' },
            ],
        },
        admin: {
            badge: 'Admin',
            headline: 'Suporte para administracao',
            subheadline: 'Tickets, chat interno e configuracoes.',
            highlights: [
                { title: 'Tickets', desc: 'Triagem e respostas.' },
                { title: 'Chat interno', desc: 'Contato com times e lojas.' },
                { title: 'Configuracoes', desc: 'Politicas e parametros.' },
            ],
            tips: [
                { title: 'Use filtros de status', desc: 'Priorize abertos e urgentes.' },
                { title: 'Documente a resposta', desc: 'Registre sempre a resolucao.' },
                { title: 'Anexe evidencias', desc: 'Ajuda em auditorias futuras.' },
            ],
            actions: [
                { label: 'Tickets', desc: 'Fila de chamados', onClick: () => goToTab('admin_claims') },
                { label: 'Suporte admin', desc: 'Config. de suporte', onClick: () => goToTab('admin_support') },
                { label: 'Chat interno', desc: 'Mensagens', onClick: () => goToTab('admin_chat') },
            ],
            faqs: [
                { q: 'Como responder um ticket?', a: 'Abra o chamado e envie a resposta com status atualizado.' },
                { q: 'Como ver tickets de lojas?', a: 'Use filtros por loja e status em "Tickets".' },
                { q: 'Como configurar horario de suporte?', a: 'Atualize em "Suporte admin".' },
                { q: 'Qual o horario do suporte humano?', a: `Seg a sex, ${supportHoursLabel}.` },
            ],
            faqNotes: [
                { title: 'Boas praticas', body: 'Registre o motivo e a solucao em cada ticket.' },
            ],
        },
    };

    const roleInfo = roleContent[roleKey];

    const handleSubmitTicket = async (isScheduling: boolean = false) => {
        if (!ticketDesc.trim()) {
            await alert({ title: "Erro no chamado", message: "Descreva o problema." });
            return;
        }
        if (attachments.length > MAX_ATTACHMENTS) {
            await alert({ title: "Limite de imagens", message: `Você pode anexar no máximo ${MAX_ATTACHMENTS} imagens.` });
            return;
        }
        setIsSubmitting(true);
        try {
            const finalDesc = isScheduling
                ? `[AGENDAMENTO FORA DE HORARIO] ${ticketDesc}`
                : ticketDesc;

            await cloud.createClaim(ticketType, finalDesc, attachments);

            if (isScheduling) {
                await alert({ title: "Chamado registrado", message: `Registramos seu chamado fora do horario. Nossa equipe responde no ${nextBusinessMessage}.` });
                setShowClosedModal(false);
                setPendingAction(null);
            } else {
                await alert({ title: "Chamado enviado", message: "Recebemos seu chamado. Vamos responder assim que possivel." });
            }

            setTicketDesc('');
            setAttachments([]);
            setActiveTab('history');
        } catch (e: any) {
            await alert({ title: "Erro", message: "Erro ao abrir chamado: " + e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const addAttachments = async (files: File[]) => {
        if (files.length === 0) return;
        const remaining = MAX_ATTACHMENTS - attachments.length;
        if (remaining <= 0) {
            await alert({ title: "Limite de imagens", message: `Você pode anexar no máximo ${MAX_ATTACHMENTS} imagens.` });
            return;
        }
        const toAdd = files.slice(0, remaining);
        setAttachments(prev => [...prev, ...toAdd]);
        if (files.length > remaining) {
            await alert({ title: "Limite de imagens", message: `Apenas ${MAX_ATTACHMENTS} imagens serão anexadas.` });
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
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr,1fr] gap-5">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            onClick={goToAssistant}
                            className="group flex items-start gap-4 p-5 rounded-2xl border border-brand-100 dark:border-brand-900/40 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/30 transition-all text-left"
                        >
                            <div className="p-3 rounded-xl bg-brand-600 text-white">
                                <Bot className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-brand-900 dark:text-brand-100">Assistente 24h</h3>
                                </div>
                                <p className="text-xs text-brand-700 dark:text-brand-300">
                                    Respostas automaticas a qualquer hora.
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-brand-400" />
                        </button>

                    </div>
                </div>

                <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-5 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                        <CalendarClock className="w-4 h-4 text-brand-600" />
                        Dicas para {roleInfo.badge.toLowerCase()}
                    </div>
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        {roleInfo.tips.map((item, index) => (
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Horario humano: {supportHoursLabel}. {isOpen ? 'Equipe online agora.' : 'Fora do horario, deixe um chamado.'}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white">Acoes do seu perfil</h3>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{roleInfo.badge}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {roleInfo.actions.map((action) => (
                        <button
                            key={action.label}
                            onClick={action.onClick}
                            className="group flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                        >
                            <div className="flex-1">
                                <div className="font-black text-gray-900 dark:text-white text-sm">{action.label}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{action.desc}</div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4 text-brand-600" />
                    Informacoes importantes
                </div>
                <ul className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li>
                        <span className="font-bold">Prazo de resposta:</span>{' '}
                        {isOpen ? 'Respondemos por ordem de chegada.' : 'Chamados entram na fila e respondemos no proximo dia util.'}
                    </li>
                    <li>
                        <span className="font-bold">Privacidade:</span> Seus dados sao usados apenas para suporte.
                    </li>
                </ul>
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

                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Anexar imagens ({attachments.length}/{MAX_ATTACHMENTS})</label>
                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-600">
                                <ImagePlus className="w-4 h-4" />
                                Selecionar arquivos
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        void addAttachments(Array.from(e.target.files || []));
                                        e.currentTarget.value = '';
                                    }}
                                />
                            </label>
                        </div>
                        {attachments.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {attachments.map((file, idx) => (
                                    <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs">
                                        <span className="truncate">{file.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                            className="text-red-500 hover:text-red-600 font-bold"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-gray-400">Envie fotos do problema para agilizar o atendimento.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button fullWidth onClick={() => handleSubmitTicket(false)} disabled={isSubmitting}>
                            {isSubmitting ? <Loading variant="inline" size="sm" /> : <Send className="w-5 h-5 mr-2" />}
                            {isSubmitting ? 'Enviando...' : 'Enviar chamado'}
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
                    {roleInfo.faqs.map((item, idx) => (
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
                    {roleInfo.faqNotes.map((note) => (
                        <div key={note.title} className="rounded-2xl bg-gray-50 dark:bg-gray-900/40 p-4">
                            <div className="font-black text-gray-900 dark:text-white mb-2">{note.title}</div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {note.body}
                            </p>
                        </div>
                    ))}
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

    const isStandalone = layout === 'standalone';

    return (
        <div data-testid="support-root" className={isStandalone ? "min-h-screen bg-gray-50 dark:bg-gray-950" : undefined}>
            <div
                data-testid="support-container"
                className={isStandalone ? "max-w-5xl mx-auto px-4 py-8 space-y-8" : "w-full max-w-5xl mx-auto py-8 space-y-8"}
            >
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
                                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-2">
                                    Perfil: {roleInfo.badge}
                                </p>
                                <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mt-4">
                                    {roleInfo.headline}
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-xl">
                                    {roleInfo.subheadline}
                                </p>
                            </div>

                            <div className={`rounded-2xl border p-4 text-sm min-w-[220px] ${isOpen ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 text-green-700 dark:text-green-200' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                                <div className="font-black">{supportStatusLabel}</div>
                                <p className="text-xs mt-1">{supportStatusDescription}</p>
                                <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
                                    <Clock className="w-4 h-4" />
                                    Horario humano: {supportHoursLabel}
                                </div>
                                <div className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                                    {lastStatusLabel}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {roleInfo.highlights.map((item) => (
                                <div key={item.title} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-4 text-sm">
                                    <div className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                        {item.title}
                                    </div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                                        {item.desc}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </header>

                <MobileTabsSelect
                    value={activeTab}
                    onChange={(val) => setActiveTab(val as 'menu' | 'ticket' | 'faq' | 'history')}
                    options={[
                        { value: 'menu', label: 'Menu' },
                        { value: 'ticket', label: 'Abrir Ticket' },
                        { value: 'faq', label: 'FAQ' },
                        { value: 'history', label: 'Histórico' }
                    ]}
                    label="Seção de Suporte"
                    className="md:hidden"
                />
                <nav className="hidden md:flex gap-2 overflow-x-auto no-scrollbar pb-1 mt-2">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isActive
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
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">Anexar imagens ({attachments.length}/{MAX_ATTACHMENTS})</label>
                                                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-600">
                                                        <ImagePlus className="w-4 h-4" />
                                                        Selecionar arquivos
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            multiple
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                void addAttachments(Array.from(e.target.files || []));
                                                                e.currentTarget.value = '';
                                                            }}
                                                        />
                                                    </label>
                                                </div>
                                                {attachments.length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {attachments.map((file, idx) => (
                                                            <div key={`${file.name}-${idx}`} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs">
                                                                <span className="truncate">{file.name}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                                    className="text-red-500 hover:text-red-600 font-bold"
                                                                >
                                                                    Remover
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
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
