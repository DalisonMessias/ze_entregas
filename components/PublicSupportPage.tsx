
import React, { useState, useEffect } from 'react';
import { MessageCircle, FileQuestion, ChevronDown, ChevronRight, ExternalLink, Clock, Headphones, Lock } from 'lucide-react';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

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

export const PublicSupportPage: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'menu' | 'faq'>('menu');
    const [supportPhone, setSupportPhone] = useState<string | null>(null);
    const [loadingSettings, setLoadingSettings] = useState(true);

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
                    setIsOpen(checkBusinessHours('09:00', '18:00'));
                }
            } catch (e) {
                setIsOpen(checkBusinessHours('09:00', '18:00'));
            } finally {
                setLoadingSettings(false);
            }
        };
        fetchSettings();
    }, []);

    const handleOpenWhatsapp = () => {
        const number = supportPhone || "5511999999999"; // Fallback number
        const message = encodeURIComponent("Olá, preciso de ajuda com o app Zé Entregas.");
        window.open(`https://wa.me/${number}?text=${message}`, '_blank');
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
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Central de Ajuda</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {loadingSettings ? "Verificando disponibilidade..." :
                        isOpen
                            ? "Atendimento Online. Como podemos ajudar?"
                            : "Estamos offline no momento. Atendimento Seg-Sex 09h-18h."}
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <button
                    onClick={handleOpenWhatsapp}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${isOpen ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-80'}`}
                >
                    <div className={`p-3 rounded-xl ${isOpen ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            Falar no WhatsApp
                            {!isOpen && <Lock className="w-3 h-3 text-gray-400" />}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Fale com um atendente</p>
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
                        <h3 className="font-bold text-gray-900 dark:text-white">Perguntas Frequentes</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Tire suas dúvidas</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <a href="/login" className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                    <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 p-3 rounded-xl">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div className="text-left flex-1">
                        <h3 className="font-bold text-gray-900 dark:text-white">Área do Cliente</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Faça login para abrir chamados</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>

            </div>
        </div>
    );

    const renderFAQ = () => (
        <div className="space-y-4 animate-in fade-in">
            <button onClick={() => setActiveTab('menu')} className="text-sm font-bold text-brand-600 mb-2 flex items-center gap-1">
                Voltar
            </button>
            <h2 className="font-bold text-lg dark:text-white mb-4">Perguntas Frequentes</h2>
            <div className="space-y-2">
                {[
                    { q: 'Como fazer um pedido?', a: 'Escolha a loja, adicione os itens ao carrinho e clique em finalizar.' },
                    { q: 'Quais as formas de pagamento?', a: 'Aceitamos PIX, Cartão de Crédito e Dinheiro na entrega, dependendo da loja.' },
                    { q: 'Como rastrear meu pedido?', a: 'Após finalizar, você receberá um link de rastreamento ou poderá ver na aba "Meus Pedidos" se estiver logado.' },
                    { q: 'Esqueci minha senha', a: 'Na tela de login, clique em "Esqueci minha senha" para recuperar o acesso.' },
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

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-md mx-auto pt-10">
                {activeTab === 'menu' && renderMenu()}
                {activeTab === 'faq' && renderFAQ()}
            </div>
        </div>
    );
};
