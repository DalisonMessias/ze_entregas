
import React, { useState, useEffect } from 'react';
import { Wallet, Calendar, Clock, ChevronRight, TrendingUp, TrendingDown, Eye, EyeOff, Building, ArrowDownLeft, ArrowUpRight, DollarSign, PiggyBank, CreditCard, Send, Lock, Plus, ArrowLeftRight, Download, Filter, Search, CheckCircle, AlertTriangle, X, Store, Trash2, ShoppingBag, LockKeyhole, Unlock, Copy } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Loader2 } from 'lucide-react';
import { Logo } from './Logo';
import { UserRole, ZebankData, ZebankTransaction, ZebankCard } from '../types';
import { ExclusiveLock } from './ExclusiveLock';
import { Button } from './Button';
import { Skeleton } from './Skeleton';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data inválida';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return 'Data inválida';
    }
};

// --- TOAST COMPONENT ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-5 fade-in duration-300 ${type === 'success' ? 'bg-green-600 text-white' : type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`}>
            {type === 'success' && <CheckCircle className="w-4 h-4" />}
            {type === 'error' && <AlertTriangle className="w-4 h-4" />}
            {type === 'info' && <CheckCircle className="w-4 h-4" />}
            <span className="text-sm font-bold">{message}</span>
        </div>
    );
};

interface ZebankProps {
    userRole?: UserRole;
}

export const Zebank: React.FC<ZebankProps> = ({ userRole }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ZebankData | null>(null);
    // Alterado para false por padrão (saldo oculto)
    const [showBalance, setShowBalance] = useState(false);
    
    // View States
    const [activeTab, setActiveTab] = useState<'home' | 'savings' | 'cards' | 'history'>('home');
    
    // Modals
    const [modal, setModal] = useState<'transfer' | 'savings' | 'add_card' | 'simulate_purchase' | 'delete_card_confirm' | 'toggle_status_confirm' | null>(null);
    
    // State for actions requiring specific ID
    const [cardToDeleteId, setCardToDeleteId] = useState<string | null>(null);
    const [cardToToggleStatus, setCardToToggleStatus] = useState<{id: string, currentStatus: 'ACTIVE' | 'BLOCKED'} | null>(null);

    const [amount, setAmount] = useState('');
    const [transferCode, setTransferCode] = useState('');
    const [savingsAction, setSavingsAction] = useState<'DEPOSIT' | 'RETRIEVE'>('DEPOSIT');
    const [processing, setProcessing] = useState(false);
    
    // New Card Form
    const [cardHolder, setCardHolder] = useState('');
    
    // Simulation Form
    const [simMerchant, setSimMerchant] = useState('');
    const [simCardId, setSimCardId] = useState('');

    // Toast State
    const [toast, setToast] = useState<{ msg: string, type: 'success' | 'error' | 'info' } | null>(null);

    useEffect(() => {
        if (userRole && userRole !== 'delivery_partner') {
            setLoading(false);
            return;
        }
        loadData();
    }, [userRole]);

    const showToast = (type: 'success' | 'error' | 'info', msg: string) => {
        setToast({ msg, type });
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await cloud.getZebankDashboardData();
            setData(result);
        } catch (e) {
            console.error("Failed to load Zebank data", e);
            showToast('error', "Erro ao carregar dados.");
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!amount || !transferCode) return showToast('error', "Preencha todos os campos.");
        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || val <= 0) return showToast('error', "Valor inválido.");
        
        setProcessing(true);
        try {
            await cloud.zebankTransferP2P(transferCode.toUpperCase(), val);
            showToast('success', "Transferência realizada com sucesso!");
            setModal(null);
            setAmount('');
            setTransferCode('');
            loadData();
        } catch (e: any) {
            showToast('error', "Erro: " + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleSavings = async () => {
        if (!amount) return showToast('error', "Preencha o valor.");
        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || val <= 0) return showToast('error', "Valor inválido.");

        setProcessing(true);
        try {
            await cloud.zebankManageSavings(savingsAction, val);
            showToast('success', savingsAction === 'DEPOSIT' ? "Guardado com sucesso!" : "Resgatado com sucesso!");
            setModal(null);
            setAmount('');
            loadData();
        } catch (e: any) {
            showToast('error', "Erro: " + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleAddCard = async () => {
        if (data?.cards && data.cards.length >= 2) {
            return showToast('error', "Limite de 2 cartões atingido.");
        }
        if (!cardHolder.trim()) return showToast('error', "Nome no cartão é obrigatório.");
        
        setProcessing(true);
        try {
            await cloud.zebankCreateVirtualCard(cardHolder);
            showToast('success', "Cartão virtual criado e salvo com sucesso!");
            setModal(null);
            setCardHolder('');
            loadData(); // Recarrega para mostrar o novo cartão vindo do DB
        } catch (e: any) {
            showToast('error', "Erro: " + e.message);
        } finally {
            setProcessing(false);
        }
    };

    const openDeleteConfirmation = (cardId: string) => {
        setCardToDeleteId(cardId);
        setModal('delete_card_confirm');
    };

    const confirmDeleteCard = async () => {
        if (!cardToDeleteId) return;
        setProcessing(true);
        try {
            await cloud.zebankDeleteCard(cardToDeleteId);
            showToast('success', "Cartão excluído com sucesso.");
            setModal(null);
            setCardToDeleteId(null);
            loadData();
        } catch (e: any) {
            showToast('error', "Erro: " + e.message);
        } finally {
            setProcessing(false);
        }
    };

    // Open the confirmation modal for blocking/unblocking
    const openToggleStatusModal = (cardId: string, currentStatus: 'ACTIVE' | 'BLOCKED') => {
        setCardToToggleStatus({ id: cardId, currentStatus });
        setModal('toggle_status_confirm');
    };

    // Execute the block/unblock action
    const confirmToggleStatus = async () => {
        if (!cardToToggleStatus) return;
        const { id, currentStatus } = cardToToggleStatus;
        const newStatus: 'ACTIVE' | 'BLOCKED' = currentStatus === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        
        // Optimistic UI Update
        setData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                cards: prev.cards?.map(c => c.id === id ? { ...c, status: newStatus } : c)
            }
        });
        setModal(null);

        setProcessing(true);
        try {
            await cloud.zebankToggleCardStatus(id, newStatus);
            showToast('success', `Cartão ${newStatus === 'ACTIVE' ? 'desbloqueado' : 'bloqueado'}!`);
            // Recarrega em background para garantir sincronia
            loadData();
        } catch (e: any) {
            // Reverte
            setData(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    cards: prev.cards?.map(c => c.id === id ? { ...c, status: currentStatus } : c)
                }
            });
            showToast('error', "Erro ao alterar status: " + e.message);
        } finally {
            setProcessing(false);
            setCardToToggleStatus(null);
        }
    };

    const handleOpenSimulation = (cardId: string) => {
        setSimCardId(cardId);
        setModal('simulate_purchase');
        setAmount('');
        setSimMerchant('');
        setProcessing(false); 
    };

    const handleSimulatePurchase = async () => {
        if (!amount || !simMerchant) return showToast('error', "Preencha valor e estabelecimento.");
        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || val <= 0) return showToast('error', "Valor inválido.");

        setProcessing(true);
        try {
            await cloud.simulateCardTransaction(simCardId, val, simMerchant);
            showToast('success', `Compra de R$ ${val.toFixed(2)} aprovada!`);
            setModal(null);
            loadData();
        } catch(e: any) {
            showToast('error', e.message || "Transação Recusada.");
        } finally {
            setProcessing(false);
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return showToast('error', 'Nada para copiar.');

        const handleSuccess = () => showToast('success', `${label} copiado!`);
        const handleError = () => showToast('error', "Erro ao copiar.");

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(handleSuccess).catch(() => {
                fallbackCopy(text, handleSuccess, handleError);
            });
        } else {
            fallbackCopy(text, handleSuccess, handleError);
        }
    };

    const fallbackCopy = (text: string, onSuccess: () => void, onError: () => void) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) onSuccess();
            else onError();
        } catch (err) {
            onError();
        }
    };

    // Card Styling Logic based on Level
    const getCardStyle = (level: string = 'BRONZE') => {
        const lvl = level.toUpperCase();
        if (lvl === 'PLATINUM' || lvl === 'DIAMOND') {
            return 'bg-gradient-to-r from-gray-900 to-black text-white border-gray-700'; // Black
        } else if (lvl === 'SILVER' || lvl === 'GOLD') {
            return 'bg-gradient-to-r from-orange-500 to-red-600 text-white border-orange-400'; // Orange
        }
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300'; // Clean/Simple
    };

    const getCardTextStyle = (level: string = 'BRONZE') => {
        const lvl = level.toUpperCase();
        if (lvl === 'BRONZE') return 'text-gray-800';
        return 'text-white';
    };

    if (userRole && userRole !== 'delivery_partner') {
        return (
            <ExclusiveLock 
                title="Carteira do Parceiro"
                description="Gestão de saldo exclusiva para parceiros. Receba de lojas, transfira para colegas e gerencie seus ganhos na plataforma."
            />
        );
    }

    if (loading && !data) {
        return (
            <div className="space-y-6 p-4">
                <Skeleton className="h-48 w-full rounded-3xl" />
                <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="pb-24 animate-in fade-in">
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* Aviso de Escopo Interno */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-100 dark:border-yellow-800 p-3 text-center">
                <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center justify-center gap-2 font-medium">
                    <Lock className="w-3 h-3" />
                    Uso exclusivo para transações internas da plataforma.
                </p>
            </div>

            {/* Header / Account Card */}
            <div className="relative overflow-hidden bg-gray-900 rounded-b-[40px] p-8 text-white shadow-2xl mb-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-2">
                            <Logo className="h-6 w-auto text-white" mode="icon" variant="white" />
                            <span className="font-bold text-lg tracking-tight">Zebank</span>
                        </div>
                        <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm flex items-center gap-2">
                            <span className="text-[10px] font-mono opacity-80">CÓD:</span>
                            <span className="font-mono font-bold text-sm cursor-pointer hover:text-brand-300" onClick={() => copyToClipboard(data?.my_code || '', 'Código')}>{data?.my_code || '---'}</span>
                        </div>
                    </div>

                    <div className="mb-6">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                            Saldo em Conta
                            <button onClick={() => setShowBalance(!showBalance)} className="opacity-70 hover:opacity-100">
                                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                        </p>
                        {showBalance ? (
                            <h1 className="text-4xl font-black tracking-tight">{formatCurrency(data?.balance || 0)}</h1>
                        ) : (
                            <h1 className="text-4xl font-black tracking-tight tracking-widest">••••••</h1>
                        )}
                    </div>

                    {/* Next Payout Widget */}
                    {data?.next_payout_date && (
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 flex items-center gap-3 mb-3 border border-white/5">
                            <div className="bg-green-500 p-2 rounded-lg text-white">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-300 uppercase font-bold">Próximo Repasse</p>
                                <p className="text-sm font-bold">
                                    {(data.next_payout_date && data.next_payout_date !== 'Indefinida') ? formatDate(data.next_payout_date) : 'A definir'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Savings Teaser */}
                    <div 
                        onClick={() => { setActiveTab('savings'); }}
                        className="bg-white/5 backdrop-blur-md rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors border border-white/5"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-brand-500 p-2 rounded-lg">
                                <PiggyBank className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-300 uppercase font-bold">Reserva Pessoal</p>
                                <p className="font-bold text-sm">
                                    {showBalance ? formatCurrency(data?.savings_balance || 0) : '••••'}
                                </p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mb-8">
                <div className="grid grid-cols-4 gap-2">
                    <button onClick={() => setModal('transfer')} className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Send className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 text-center leading-tight">Transferir</span>
                    </button>
                    
                    <button onClick={() => setActiveTab('cards')} className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 text-center leading-tight">Cartões</span>
                    </button>

                    <button onClick={() => { setModal('savings'); setSavingsAction('DEPOSIT'); }} className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                            <PiggyBank className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 text-center leading-tight">Guardar</span>
                    </button>

                    <button onClick={() => setActiveTab('home')} className="flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 text-center leading-tight">Extrato</span>
                    </button>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="px-4 space-y-6">
                
                {/* CARDS VIEW */}
                {activeTab === 'cards' && (
                    <div className="space-y-4 animate-in slide-in-from-right-10">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">Meus Cartões</h3>
                            <button onClick={() => setModal('add_card')} className="bg-brand-600 text-white p-2 rounded-full shadow-lg hover:bg-brand-700">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        {data?.cards && data.cards.length > 0 ? (
                            data.cards.map(card => {
                                const cardColorClass = getCardStyle(data.partner_level);
                                const textColorClass = getCardTextStyle(data.partner_level);
                                const isBlocked = card.status === 'BLOCKED';

                                return (
                                    <div key={card.id} className="relative group mb-6">
                                        <div className={`p-6 rounded-2xl shadow-xl relative overflow-hidden flex flex-col justify-between transition-transform transform border ${cardColorClass} ${isBlocked ? 'opacity-75 grayscale' : ''}`}>
                                            {/* Top Row */}
                                            <div className="flex justify-between items-start relative z-10">
                                                <span className={`text-[10px] font-bold font-mono border px-2 py-0.5 rounded ${textColorClass} border-current opacity-70`}>DÉBITO VIRTUAL</span>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => openToggleStatusModal(card.id, card.status)}
                                                        className={`p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition-colors z-20`}
                                                    >
                                                        {isBlocked ? <LockKeyhole className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                                    </button>
                                                    <button onClick={() => openDeleteConfirmation(card.id)} className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-500 hover:text-white transition-colors z-20">
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Number Row */}
                                            <div className="relative z-10 my-6">
                                                <div className="flex items-center justify-between">
                                                    <p className={`text-lg font-mono tracking-widest ${textColorClass}`}>
                                                        {card.card_number ? card.card_number.replace(/(\d{4})/g, '$1 ').trim() : `•••• •••• •••• ${card.card_last_four}`}
                                                    </p>
                                                    <button 
                                                        onClick={() => copyToClipboard(card.card_number || '', 'Número do Cartão')} 
                                                        className={`p-1.5 rounded-full bg-black/10 hover:bg-black/20 transition-colors ${textColorClass}`}
                                                        title="Copiar Número"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Bottom Row */}
                                            <div className="flex justify-between items-end relative z-10">
                                                <div>
                                                    <p className={`text-[9px] opacity-70 uppercase mb-0.5 ${textColorClass}`}>Titular</p>
                                                    <div className="flex items-center gap-1">
                                                        <p className={`font-bold text-sm tracking-wide ${textColorClass}`}>{card.card_holder}</p>
                                                        <button onClick={() => copyToClipboard(card.card_holder, 'Nome do Titular')} className={`opacity-60 hover:opacity-100 ${textColorClass}`}>
                                                            <Copy className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-3">
                                                    <div>
                                                        <p className={`text-[9px] opacity-70 uppercase mb-0.5 ${textColorClass}`}>Validade</p>
                                                        <div className="flex items-center gap-1">
                                                            <span className={`font-bold text-sm ${textColorClass}`}>{card.expiration_date}</span>
                                                            <button onClick={() => copyToClipboard(card.expiration_date, 'Validade')} className={`opacity-60 hover:opacity-100 ${textColorClass}`}>
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className={`text-[9px] opacity-70 uppercase mb-0.5 ${textColorClass}`}>CVV</p>
                                                        <div className="flex items-center gap-1">
                                                            <span className={`font-bold text-sm ${textColorClass}`}>{card.cvv || '•••'}</span>
                                                            <button onClick={() => copyToClipboard(card.cvv || '', 'CVV')} className={`opacity-60 hover:opacity-100 ${textColorClass}`}>
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Blocked Overlay */}
                                            {isBlocked && (
                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 backdrop-blur-[1px]">
                                                    <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-black uppercase tracking-widest text-sm shadow-lg flex items-center gap-2">
                                                        <Lock className="w-4 h-4" /> Bloqueado
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Action Buttons Below Card */}
                                        <div className="mt-2 flex justify-end">
                                            <button 
                                                onClick={() => handleOpenSimulation(card.id)}
                                                disabled={isBlocked}
                                                className={`text-xs font-bold flex items-center gap-1 hover:underline px-3 py-2 rounded-lg transition-colors ${isBlocked ? 'text-gray-400 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20'}`}
                                            >
                                                <ShoppingBag className="w-3 h-3"/> Testar Cartão
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium text-sm">Nenhum cartão virtual.</p>
                                <Button onClick={() => setModal('add_card')} variant="outline" className="mt-3">
                                    Criar Cartão Grátis
                                </Button>
                            </div>
                        )}
                        <p className="text-xs text-gray-400 text-center px-4">
                            Este cartão é de <strong>débito</strong>. O valor é descontado na hora da sua carteira. Máximo 2 cartões.
                        </p>
                    </div>
                )}

                {/* SAVINGS VIEW */}
                {activeTab === 'savings' && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 animate-in slide-in-from-right-10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <PiggyBank className="w-6 h-6 text-brand-500" /> Reserva Pessoal
                            </h3>
                            <button onClick={() => setActiveTab('home')} className="text-xs font-bold text-gray-400 hover:text-gray-600">Voltar</button>
                        </div>
                        
                        <div className="bg-brand-50 dark:bg-brand-900/20 p-6 rounded-2xl text-center mb-6 border border-brand-100 dark:border-brand-800">
                            <p className="text-brand-600 dark:text-brand-400 text-xs font-bold uppercase mb-2">Total Guardado</p>
                            <h2 className="text-3xl font-black text-brand-700 dark:text-brand-300">{formatCurrency(data?.savings_balance || 0)}</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Button onClick={() => { setModal('savings'); setSavingsAction('DEPOSIT'); }} className="bg-brand-600 hover:bg-brand-700 text-white border-none">
                                Guardar +
                            </Button>
                            <Button onClick={() => { setModal('savings'); setSavingsAction('RETRIEVE'); }} variant="outline">
                                Resgatar
                            </Button>
                        </div>
                    </div>
                )}

                {/* TRANSACTIONS LIST (HOME DEFAULT) */}
                {activeTab === 'home' && (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <ArrowLeftRight className="w-4 h-4 text-gray-400" /> Movimentações
                            </h3>
                        </div>
                        
                        <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                            {data?.recent_transactions.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 text-sm">
                                    Nenhuma movimentação recente.
                                </div>
                            ) : (
                                data?.recent_transactions.map(tx => (
                                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                tx.direction === 'IN' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                            }`}>
                                                {tx.type === 'SAVINGS_DEPOSIT' ? <PiggyBank className="w-5 h-5" /> : 
                                                 tx.type === 'SAVINGS_RETRIEVE' ? <Wallet className="w-5 h-5" /> :
                                                 tx.type === 'TRANSFER_P2P' ? <Send className="w-5 h-5" /> :
                                                 tx.type === 'PAYMENT' ? <ShoppingBag className="w-5 h-5" /> :
                                                 tx.direction === 'IN' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-900 dark:text-white">{tx.description}</p>
                                                <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                                            </div>
                                        </div>
                                        <span className={`font-bold text-sm ${tx.direction === 'IN' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                                            {tx.direction === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODALS --- */}

            {/* Delete Card Confirmation Modal */}
            {modal === 'delete_card_confirm' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative text-center">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="font-black text-xl text-gray-900 dark:text-white mb-2">Excluir Cartão?</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                            Esta ação é irreversível. O cartão será invalidado imediatamente.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setModal(null)} fullWidth>Cancelar</Button>
                            <Button onClick={confirmDeleteCard} variant="danger" fullWidth disabled={processing}>
                                {processing ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirmar Exclusão'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toggle Status Confirmation Modal */}
            {modal === 'toggle_status_confirm' && cardToToggleStatus && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${cardToToggleStatus.currentStatus === 'ACTIVE' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                            {cardToToggleStatus.currentStatus === 'ACTIVE' ? <Lock className="w-8 h-8" /> : <Unlock className="w-8 h-8" />}
                        </div>
                        <h3 className="font-black text-xl text-gray-900 dark:text-white mb-2">
                            {cardToToggleStatus.currentStatus === 'ACTIVE' ? 'Bloquear Cartão?' : 'Desbloquear Cartão?'}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                            {cardToToggleStatus.currentStatus === 'ACTIVE' 
                                ? 'O cartão ficará temporariamente inativo e não poderá ser usado.' 
                                : 'O cartão será reativado para uso imediato.'}
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => { setModal(null); setCardToToggleStatus(null); }} fullWidth>Cancelar</Button>
                            <Button onClick={confirmToggleStatus} variant={cardToToggleStatus.currentStatus === 'ACTIVE' ? 'danger' : 'success'} fullWidth disabled={processing}>
                                {processing ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirmar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transfer Modal */}
            {modal === 'transfer' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
                        <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        <h3 className="font-black text-xl text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Send className="w-5 h-5 text-blue-500"/> Transferência</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Código do Destinatário</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={transferCode}
                                        onChange={e => setTransferCode(e.target.value.toUpperCase())}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-transparent focus:border-brand-500 outline-none font-mono text-center uppercase dark:text-white"
                                        placeholder="EX: A1B2C3"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1 text-center">Código único do Parceiro ou Loja.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Valor (R$)</label>
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-transparent focus:border-brand-500 outline-none font-black text-2xl text-center dark:text-white"
                                    placeholder="0.00"
                                    inputMode="decimal"
                                />
                            </div>
                            <Button fullWidth onClick={handleTransfer} disabled={processing} className="py-4 shadow-lg shadow-brand-500/20">
                                {processing ? <Loader2 className="w-6 h-6 animate-spin"/> : 'Confirmar Envio'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Savings Modal */}
            {modal === 'savings' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
                        <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3 text-brand-600">
                                <PiggyBank className="w-8 h-8" />
                            </div>
                            <h3 className="font-black text-xl text-gray-900 dark:text-white">
                                {savingsAction === 'DEPOSIT' ? 'Guardar Valor' : 'Resgatar Valor'}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {savingsAction === 'DEPOSIT' ? 'O valor sairá do seu saldo disponível.' : 'O valor voltará para seu saldo disponível.'}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <input 
                                type="number" 
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-transparent focus:border-brand-500 outline-none font-black text-3xl text-center text-gray-900 dark:text-white"
                                placeholder="0.00"
                                autoFocus
                                inputMode="decimal"
                            />
                            <Button fullWidth onClick={handleSavings} disabled={processing} className="py-4 shadow-lg">
                                {processing ? <Loader2 className="w-6 h-6 animate-spin"/> : 'Confirmar'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Card Modal */}
            {modal === 'add_card' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
                        <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-brand-500"/> Novo Cartão Virtual</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Nome no Cartão</label>
                                <input 
                                    type="text" 
                                    value={cardHolder}
                                    onChange={e => setCardHolder(e.target.value.toUpperCase())}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border border-transparent focus:border-brand-500 dark:text-white uppercase"
                                    placeholder="NOME COMPLETO"
                                />
                            </div>
                            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-xl text-xs text-gray-500 dark:text-gray-400">
                                <p>Este cartão será vinculado ao seu saldo Zebank. Ele funciona como débito e tem validade de 4 anos.</p>
                            </div>
                            <Button fullWidth onClick={handleAddCard} disabled={processing}>
                                {processing ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Gerar Cartão'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Simulate Purchase Modal */}
            {modal === 'simulate_purchase' && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
                        <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        <h3 className="font-black text-lg dark:text-white mb-4 flex items-center gap-2 text-green-600"><ShoppingBag className="w-5 h-5"/> Simular Compra</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Teste seu cartão em tempo real. O valor será debitado do seu saldo se aprovado.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Estabelecimento</label>
                                <input 
                                    type="text" 
                                    value={simMerchant}
                                    onChange={e => setSimMerchant(e.target.value)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border border-transparent focus:border-green-500 dark:text-white"
                                    placeholder="Ex: Supermercado"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Valor (R$)</label>
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border border-transparent focus:border-green-500 dark:text-white font-bold text-xl"
                                    placeholder="0.00"
                                    inputMode="decimal"
                                />
                            </div>
                            <Button fullWidth onClick={handleSimulatePurchase} disabled={processing} className="bg-green-600 hover:bg-green-700 border-none">
                                {processing ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Pagar Agora'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
