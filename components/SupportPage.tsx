
import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, FileQuestion, PenTool, ChevronDown, ChevronRight, Send, AlertCircle, CheckCircle, Clock, Headphones, ExternalLink, Loader2, MessageSquare, CalendarClock, Bot, Lock } from 'lucide-react';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { Claim, ShopSettings } from '../types';
import * as cloud from '../services/cloud';
import { ChatWindow } from './ChatWindow';
import { useDialog } from '../utils/dialogService'; // Import useDialog

interface SupportPageProps {
    onBack?: () => void;
    onNavigateToChat?: (tab: 'assistant' | 'support_chat') => void; // Optional prop to link to chat
}

// Helper para verificar horário comercial (Local, Fallback)
const checkBusinessHours = (start: string, end: string): boolean => {
    const now = new Date();
    const day = now.getDay(); // 0 = Domingo, 6 = Sábado
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Parse times e.g. "09:00"
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const currentMinutes = hour * 60 + minute;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Regra: Seg(1) a Sex(5)
    const isWeekDay = day >= 1 && day <= 5;
    const isWorkingHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;

    return isWeekDay && isWorkingHours;
};

const getNextBusinessDayMessage = (): string => {
    const now = new Date();
    let nextDate = new Date(now);

    // Lógica simples para encontrar próximo dia útil às 09h
    if (now.getDay() === 5 && now.getHours() >= 18) { // Sexta a noite -> Segunda
        nextDate.setDate(now.getDate() + 3);
    } else if (now.getDay() === 6) { // Sábado -> Segunda
        nextDate.setDate(now.getDate() + 2);
    } else { // Domingo ou dia de semana
        nextDate.setDate(now.getDate() + 1);
    }

    // Se cair no domingo (caso raro na lógica acima), ajusta pra segunda
    if (nextDate.getDay() === 0) nextDate.setDate(nextDate.getDate() + 1);

    return `Próximo dia útil (${nextDate.toLocaleDateString('pt-BR')}) a partir das 09:00h`;
};

export const SupportPage: React.FC<SupportPageProps> = ({ onBack, onNavigateToChat }) => {
    const [activeTab, setActiveTab] = useState<'menu' | 'ticket' | 'faq' | 'history'>('menu');
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loadingClaims, setLoadingClaims] = useState(false);
    const [supportPhone, setSupportPhone] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false); // Default closed until check
    const [loadingSettings, setLoadingSettings] = useState(true);

    // Ticket Form
    const [ticketType, setTicketType] = useState('other');
    const [ticketDesc, setTicketDesc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Closed Modal
    const [showClosedModal, setShowClosedModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'whatsapp' | 'ticket' | 'chat' | null>(null);

    // Live Chat State
    const [showLiveChat, setShowLiveChat] = useState(false);

    const { alert } = useDialog(); // Use the custom dialog service

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await cloud.getShopSettings();
                if (settings) {
                    if (settings.support_phone) {
                        setSupportPhone(settings.support_phone);
                    }

                    // Determine Status
                    const override = settings.support_status_override || 'AUTO';
                    if (override === 'OPEN') {
                        setIsOpen(true);
                    } else if (override === 'CLOSED') {
                        setIsOpen(false);
                    } else {
                        // AUTO
                        setIsOpen(checkBusinessHours(
                            settings.support_hours_start || '09:00',
                            settings.support_hours_end || '18:00'
                        ));
                    }
                } else {
                    // Fallback default
                    setIsOpen(checkBusinessHours('09:00', '18:00'));
                }
            } catch (e) {
                // console.error("Error fetching settings", e);
                setIsOpen(checkBusinessHours('09:00', '18:00')); // Fallback on error
            } finally {
                setLoadingSettings(false);
            }
        };
        fetchSettings();
    }, []);

    const fetchClaims = async () => {
        setLoadingClaims(true);
        try {
            // FIX: Chamada da API para getMyClaims
            const data = await cloud.getMyClaims();
            setClaims(data || []);
        } catch (e) {
            // console.error(e);
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
            await alert({ title: "Erro no Chamado", message: "Descreva o problema." });
            return;
        }
        setIsSubmitting(true);
        try {
            // Se for agendamento, adiciona tag na descrição
            const finalDesc = isScheduling
                ? `[AGENDAMENTO FORA DE HORÁRIO] ${ticketDesc}`
                : ticketDesc;

            // FIX: Chamada da API para createClaim
            await cloud.createClaim(ticketType, finalDesc);

            if (isScheduling) {
                await alert({ title: "Agendamento Confirmado", message: "Agendamento realizado! Nossa equipe responderá no próximo dia útil." });
                setShowClosedModal(false);
                setPendingAction(null);
            } else {
                await alert({ title: "Chamado Enviado", message: "Chamado aberto com sucesso!" });
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
        const message = encodeURIComponent("Olá, preciso de ajuda com o app Zé Entregas.");
        window.open(`https://wa.me/${number}?text=${message}`, '_blank');
    };

    // Função para forçar navegação para o chat (simulada via DOM se prop não passada)
    const goToAssistant = () => {
        if (onNavigateToChat) {
            onNavigateToChat('assistant'); // Chamar o Chat Assistant
        } else {
            // Fallback: Tenta encontrar o botão do menu mobile ou desktop
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Assistente') || b.textContent?.includes('Assistente Zé'));
            if (btn) btn.click();
        }
        setShowClosedModal(false);
    };

    const renderMenu = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 text-center relative overflow-hidden">
                {!isOpen && !loadingSettings && (
                    <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-[10px] font-bold py-1 uppercase tracking-widest">
                        Atendimento Fechado
                    </div>
                )}
                <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                    <Headphones className="w-8 h-8 text-brand-600" />
                </div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Como podemos ajudar?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {loadingSettings ? "Verificando disponibilidade..." :
                        isOpen
                            ? "Estamos online! Escolha uma opção abaixo."
                            : "Estamos offline no momento. Atendimento Seg-Sex 09h-18h."}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <button
                    onClick={() => handleInteraction('chat')}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${isOpen ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-80'}`}
                >
                    <div className={`p-3 rounded-xl ${isOpen ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Chat ao Vivo
                            {!isOpen && <Lock className="w-3 h-3 text-gray-400" />}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Fale com um atendente agora</p>
                    </div>
                    {isOpen ? <ChevronRight className="w-5 h-5 text-blue-500" /> : <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded text-gray-500">FECHADO</span>}
                </button>

                <button
                    onClick={() => handleInteraction('whatsapp')}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${isOpen ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-80'}`}
                >
                    <div className={`p-3 rounded-xl ${isOpen ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            WhatsApp
                            {!isOpen && <Lock className="w-3 h-3 text-gray-400" />}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Canal alternativo</p>
                    </div>
                    {isOpen ? <ExternalLink className="w-5 h-5 text-green-500" /> : <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded text-gray-500">FECHADO</span>}
                </button>

                <button
                    onClick={() => setActiveTab('faq')}
                    className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-3 rounded-xl">
                        <FileQuestion className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white">Central de Ajuda</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Perguntas frequentes (FAQ)</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button
                    onClick={() => handleInteraction('ticket')}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${isOpen ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800 opacity-80'}`}
                >
                    <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-3 rounded-xl">
                        <PenTool className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Abrir Chamado
                            {!isOpen && <CalendarClock className="w-3 h-3 text-gray-400" />}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Relate um problema técnico</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button
                    onClick={() => setActiveTab('history')}
                    className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-3 rounded-xl">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white">Meus Chamados</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhe o status</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
            </div>
        </div>
    );

    const renderTicketForm = () => (
        <div className="space-y-4 animate-in fade-in">
            <h2 className="font-bold text-lg dark:text-white mb-4">Novo Chamado</h2>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <CustomSelect
                    label="Tipo de Problema"
                    value={ticketType}
                    onChange={setTicketType}
                    options={[
                        { label: 'Problema no App', value: 'app_bug' },
                        { label: 'Erro de Endereço', value: 'address_error' },
                        { label: 'Problema com Cliente', value: 'client_issue' },
                        { label: 'Sugestão', value: 'suggestion' },
                        { label: 'Outro', value: 'other' },
                    ]}
                />
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Descrição Detalhada</label>
                    <textarea
                        value={ticketDesc}
                        onChange={e => setTicketDesc(e.target.value)}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white h-32 resize-none"
                        placeholder="Descreva o que aconteceu..."
                    />
                </div>
                <Button fullWidth onClick={() => handleSubmitTicket(false)} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
                    {isSubmitting ? 'Enviando...' : 'Enviar Chamado'}
                </Button>
            </div>
        </div>
    );

    const renderFAQ = () => (
        <div className="space-y-4 animate-in fade-in">
            <h2 className="font-bold text-lg dark:text-white mb-4">Perguntas Frequentes</h2>
            <div className="space-y-2">
                {[
                    { q: 'Como mudar minha meta diária?', a: 'Na tela inicial, clique em "Começar o dia" e defina o valor da meta.' },
                    { q: 'O app funciona sem internet?', a: 'Sim! Todas as funções básicas como registrar entregas e mapa funcionam offline.' },
                    { q: 'Como salvo um endereço?', a: 'Vá na aba "Endereços" e clique em "Salvar". Você também pode usar o comando de voz.' },
                    { q: 'Meus dados estão seguros?', a: 'Sim. Se você criou uma conta, seus dados são salvos na nuvem e no seu aparelho.' },
                    { q: 'Qual o horário de suporte?', a: 'Nosso time humano atende de Segunda a Sexta, das 09h às 18h. Fora desse horário, conte com o Zé Assistente!' },
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
        <div className="space-y-4 animate-in fade-in">
            <h2 className="font-bold text-lg dark:text-white mb-4">Histórico de Chamados</h2>
            {loadingClaims ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
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

                            {/* Admin Response Section */}
                            {claim.admin_response && (
                                <div className="mt-3 mb-3 p-3 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-100 dark:border-brand-900/30">
                                    <div className="text-xs font-bold text-brand-600 dark:text-brand-400 mb-1 flex items-center gap-1">
                                        <Headphones className="w-3 h-3" /> Resposta do Suporte:
                                    </div>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 italic">"{claim.admin_response}"</p>
                                </div>
                            )}

                            <div className="text-xs text-gray-400">
                                {new Date(claim.created_at).toLocaleDateString('pt-BR')} às {new Date(claim.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {activeTab === 'menu' && renderMenu()}
            {activeTab === 'ticket' && renderTicketForm()}
            {activeTab === 'faq' && renderFAQ()}
            {activeTab === 'history' && renderHistory()}

            {/* Modal de Atendimento Fechado */}
            {showClosedModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
                                <Clock className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Atendimento Fechado</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                                Nosso time humano atende apenas de Seg a Sex, das 09h às 18h.
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
                                    <div className="font-bold text-brand-900 dark:text-brand-100 text-sm">Tentar resolver com o Zé</div>
                                    <div className="text-xs text-brand-700 dark:text-brand-300 opacity-80">Respostas automáticas 24h</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-brand-400 ml-auto" />
                            </button>

                            {pendingAction === 'ticket' || pendingAction === 'whatsapp' || pendingAction === 'chat' ? (
                                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                                    <h4 className="font-bold text-sm dark:text-white mb-2">Agendar Atendimento?</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                        Podemos registrar sua solicitação agora e nossa equipe responderá no {getNextBusinessDayMessage()}.
                                    </p>

                                    <div className="space-y-2">
                                        {pendingAction === 'whatsapp' || pendingAction === 'chat' ? (
                                            <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded text-center">
                                                Chat ao vivo indisponível fora do horário.
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
                                                    {isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}
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
                                        <div className="font-bold text-gray-900 dark:text-white text-sm">Agendar para dia útil</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 opacity-80">Retornaremos no horário comercial</div>
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
                    title="Suporte ao Vivo"
                />
            )}
        </div>
    );
};