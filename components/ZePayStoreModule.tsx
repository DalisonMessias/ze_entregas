
import React, { useState, useEffect } from 'react';
import { Wallet, CreditCard, Send, Plus, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, CheckCircle, AlertTriangle, X, Lock, Eye, EyeOff, Trash2, Sliders, Smartphone, Copy } from 'lucide-react';
import { Loading } from './Loading';
import * as cloud from '../services/cloud';
import { generatePaymentQRCode, checkPaymentStatus } from '../services/paymentGateway';
import { ZePayData, StoreVirtualCard } from '../types';
import { ExclusiveLock } from './ExclusiveLock';
import { Button } from './Button';
import { Skeleton } from './Skeleton';
import { Logo } from './Logo';
import { FinancialPanel } from './FinancialPanel';
import { MerchantPOSDesktop } from './MerchantPOSDesktop';
import { useDialog } from '../utils/dialogService';
import { CustomInput } from './CustomInput';
import { PixChargeModal } from './PixChargeModal';
declare const QRious: any;

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

const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) {
        setter("");
        return;
    }
    const amount = Number(value) / 100;
    const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setter(formatted);
};



export const ZePayStore: React.FC = () => {
    const [data, setData] = useState<ZePayData | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [isSuperStore, setIsSuperStore] = useState<boolean | null>(null); // Null = loading check
    const [loading, setLoading] = useState(true);
    const { alert, confirm, toast } = useDialog();
    const [activeTab, setActiveTab] = useState<'overview' | 'extract'>('overview');
    const [showPOS, setShowPOS] = useState(false);
    const [showRecharge, setShowRecharge] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [pixDetails, setPixDetails] = useState<{ copyPaste: string; txId: string; gatewayUsed: string } | null>(null);
    const [polling, setPolling] = useState(false);
    useEffect(() => {
        if (showRecharge && pixDetails?.copyPaste) {
            try {
                const el = document.getElementById('zepay-pix-qr') as HTMLCanvasElement | null;
                if (el && typeof QRious !== 'undefined') new QRious({ element: el, value: pixDetails.copyPaste, size: 200, level: 'H' });
            } catch { }
        }
    }, [showRecharge, pixDetails]);

    // Modals
    const [showTransfer, setShowTransfer] = useState(false);
    const [showNewCard, setShowNewCard] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState<StoreVirtualCard | null>(null);
    const [showPixCharge, setShowPixCharge] = useState(false);

    // Forms
    const [transferForm, setTransferForm] = useState({ code: '', amount: '' });
    const [cardForm, setCardForm] = useState({ name: '' });
    const [limitForm, setLimitForm] = useState(100);
    const [processing, setProcessing] = useState(false);
    const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

    useEffect(() => {
        checkAccessAndLoad();
    }, []);

    // Polling para verificar status do pagamento
    useEffect(() => {
        if (!polling || !pixDetails?.txId) return;

        const interval = setInterval(async () => {
            try {
                const status = await checkPaymentStatus(pixDetails.txId);
                if (status.status === 'paid') {
                    clearInterval(interval);
                    setPolling(false);
                    await alert({ title: 'Pagamento Confirmado', message: `R$ ${status.amount?.toFixed(2)} recebido com sucesso.` });
                    setShowRecharge(false);
                    setPixDetails(null);
                    setRechargeAmount('');
                    // Recarregar saldo
                    checkAccessAndLoad();
                } else if (status.status === 'failed' || status.status === 'expired') {
                    clearInterval(interval);
                    setPolling(false);
                    await alert({ title: 'Pagamento Expirado', message: 'Pagamento expirou ou falhou.' });
                    setPixDetails(null);
                }
            } catch (error: any) {
                console.error('Erro ao verificar status:', error);
            }
        }, 5000); // Verifica a cada 5 segundos

        return () => clearInterval(interval);
    }, [polling, pixDetails]);

    const checkAccessAndLoad = async () => {
        if (!data) setLoading(true);
        try {
            // 1. Check Profile (Exclusive Lock)
            const profileData = await cloud.getMyPartnerProfile();
            setProfile(profileData);

            const isSuper = !!profileData?.is_super_store;
            setIsSuperStore(isSuper);
            if (isSuper) {
                const dashboardData = await cloud.getZebankDashboardData();
                if (!dashboardData.my_code && profile?.association_code) {
                    dashboardData.my_code = profile.association_code;
                }
                setData(dashboardData);
            } else {
                setData(null);
            }
        } catch (e: any) {
            // console.error(e);
            await alert({ title: 'Erro', message: "Erro ao carregar dados." });
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!transferForm.code || !transferForm.amount) return;
        setProcessing(true);
        try {
            const amount = parseFloat(transferForm.amount.replace(/\./g, '').replace(',', '.'));
            await cloud.zebankTransferP2P(transferForm.code.toUpperCase(), amount);
            await alert({ title: 'Sucesso', message: 'Transferência realizada com sucesso!' });
            setShowTransfer(false);
            setTransferForm({ code: '', amount: '' });
            checkAccessAndLoad(); // Refresh
        } catch (e: any) {
            await alert({ title: 'Erro na Transferência', message: e.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleCreateCard = async () => {
        if (!cardForm.name) return;
        setProcessing(true);
        try {
            await cloud.zebankCreateVirtualCard(cardForm.name);
            await alert({ title: 'Sucesso', message: 'Cartão virtual criado!' });
            setShowNewCard(false);
            setCardForm({ name: '' });
            checkAccessAndLoad(); // Refresh
        } catch (e: any) {
            await alert({ title: 'Erro na Criação', message: e.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleOpenLimitModal = (card: StoreVirtualCard) => {
        setLimitForm(card.spending_limit_percent || 100);
        setShowLimitModal(card);
    };

    const handleUpdateLimit = async () => {
        if (!showLimitModal) return;
        setProcessing(true);
        try {
            await cloud.updateCardLimit(showLimitModal.id, limitForm, 'STORE');
            await alert({ title: 'Sucesso', message: 'Limite atualizado!' });
            setShowLimitModal(null);
            checkAccessAndLoad();
        } catch (e: any) {
            await alert({ title: 'Erro no Limite', message: e.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleGeneratePayment = async () => {
        if (!rechargeAmount) {
            toast({ message: 'Informe o valor da recarga.', type: 'warning' });
            return;
        }

        const amount = parseFloat(rechargeAmount.replace(/\./g, '').replace(',', '.'));
        if (amount < 1) {
            toast({ message: 'Valor mínimo: R$ 1,00', type: 'warning' });
            return;
        }

        setShowRecharge(true);
    };

    if (loading && isSuperStore === null) {
        return <Loading variant="full" message="Carregando Zebank..." />;
    }

    // Render com tabs internas (lojistas têm acesso ao módulo; recursos avançados são bloqueados visualmente)

    return (
        <div className="space-y-6 animate-in fade-in pb-24">


            <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-1 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('overview')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap ${activeTab === 'overview' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>Visão Geral</button>
                <button onClick={() => setActiveTab('extract')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap ${activeTab === 'extract' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}>Extrato</button>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-gray-900 to-black text-white p-6 rounded-[32px] shadow-2xl shadow-gray-900/20 relative overflow-hidden">
                        <div className="absolute -right-10 -top-10 opacity-20">
                            <Logo className="h-48 w-auto" variant="full-white" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                    <Wallet className="w-5 h-5 text-white" />
                                </div>
                                <span className="font-bold tracking-wide">ZéPay Lojista</span>
                            </div>
                            <div className="mb-6">
                                <p className="text-gray-400 text-xs font-bold uppercase mb-1">Saldo Corporativo</p>
                                <h2 className="text-4xl font-black">{formatCurrency(data?.balance || 0)}</h2>
                            </div>
                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                    <p className="text-xs text-gray-300">Código da Loja:</p>
                                    <p className="font-mono font-bold text-white">{data?.my_code || '---'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Actions */}
                    {isSuperStore ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <button
                                onClick={() => setShowTransfer(true)}
                                className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                            >
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 mb-2">
                                    <ArrowLeftRight className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Transferir</span>
                            </button>
                            <button
                                onClick={() => setShowNewCard(true)}
                                className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                            >
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 mb-2">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Novo Cartão</span>
                            </button>
                            <button
                                onClick={() => setShowRecharge(true)}
                                className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                            >
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 mb-2">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Adicionar Saldo</span>
                            </button>
                            <button
                                onClick={() => setShowPixCharge(true)}
                                className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                            >
                                <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-full text-teal-600 mb-2">
                                    <ArrowDownLeft className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Receber PIX</span>
                            </button>
                            <button
                                onClick={() => { const evt = new CustomEvent('navigateToTab', { detail: { tab: 'zepoint' } }); window.dispatchEvent(evt); }}
                                className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                            >
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 mb-2">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Maquininha</span>
                            </button>
                        </div>
                    ) : (
                        <ExclusiveLock
                            title="Recursos Corporativos"
                            description="Transferências e cartões corporativos são exclusivos de Super Lojistas."
                        />
                    )}

                    {/* Cards List */}
                    {isSuperStore && (
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4 px-2">Cartões da Equipe</h3>
                            {data?.cards.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                                    <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Nenhum cartão corporativo criado.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {data?.cards.map(card => (
                                        <div key={card.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-xl">
                                                        <CreditCard className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 dark:text-white">{card.name}</p>
                                                        <p className="text-xs text-gray-500 font-mono">**** {card.card_number.slice(-4)}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {card.status === 'ACTIVE' ? 'Ativo' : 'Bloqueado'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4">
                                                <div className="text-xs">
                                                    <p className="text-gray-400">Limite Mensal</p>
                                                    <p className="font-bold text-gray-800 dark:text-gray-200">{card.spending_limit_percent}% do Saldo</p>
                                                </div>
                                                <button onClick={() => handleOpenLimitModal(card)} className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500">
                                                    <Sliders className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Transactions */}
                    {isSuperStore && (
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white mb-4 px-2">Histórico Corporativo</h3>
                            <div className="space-y-3">
                                {data?.recent_transactions.map(tx => (
                                    <div key={tx.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${tx.type === 'IN' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                {tx.type === 'IN' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-gray-900 dark:text-white">{tx.description}</p>
                                                <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                                            </div>
                                        </div>
                                        <span className={`font-bold ${tx.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.type === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'extract' && (
                <FinancialPanel userRole="store_partner" hideHeader />
            )}


            {showRecharge && (
                <PixChargeModal
                    isOpen={showRecharge}
                    onClose={() => {
                        setShowRecharge(false);
                        setRechargeAmount('');
                        setPixDetails(null);
                    }}
                    pixKey="SYSTEM"
                    storeName="Zé Entregas"
                    storeCity="Distribuição"
                    userId={profile?.id}
                    customTitle="Adicionar Saldo"
                    onPaymentSuccess={async (val) => {
                        toast({ message: `Saldo de R$ ${val.toFixed(2)} adicionado com sucesso.`, type: 'success' });
                        checkAccessAndLoad();
                    }}
                />
            )}



            {/* Modals */}
            {showTransfer && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg dark:text-white">Transferência B2B</h3>
                            <button onClick={() => setShowTransfer(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <CustomInput
                            type="text"
                            placeholder="Código da Loja Destino"
                            value={transferForm.code}
                            onChange={e => setTransferForm({ ...transferForm, code: e.target.value.toUpperCase() })}
                            className="uppercase font-mono"
                        />
                        <CustomInput
                            mask="currency"
                            placeholder="Valor (R$)"
                            value={transferForm.amount}
                            onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
                        />
                        <Button fullWidth onClick={handleTransfer} disabled={processing}>
                            {processing ? <Loading variant="inline" size="sm" /> : 'Confirmar Transferência'}
                        </Button>
                    </div>
                </div>
            )}

            {showNewCard && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg dark:text-white">Novo Cartão Corporativo</h3>
                            <button onClick={() => setShowNewCard(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <CustomInput
                            type="text"
                            placeholder="Nome no Cartão (Ex: Despesas Marketing)"
                            value={cardForm.name}
                            onChange={e => setCardForm({ name: e.target.value })}
                        />
                        <Button fullWidth onClick={handleCreateCard} disabled={processing}>
                            {processing ? <Loading variant="inline" size="sm" /> : 'Criar Cartão'}
                        </Button>
                    </div>
                </div>
            )}

            {showLimitModal && (
                <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg dark:text-white">Ajustar Limite</h3>
                            <button onClick={() => setShowLimitModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>

                        <div className="relative pt-6 pb-2">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={limitForm}
                                onChange={(e) => setLimitForm(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-brand-600"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-2 font-bold">
                                <span>0%</span>
                                <span>{limitForm}%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-center">
                            <p className="text-xs text-gray-500 uppercase font-bold">Limite Calculado</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">
                                {formatCurrency((data?.balance || 0) * (limitForm / 100))}
                            </p>
                        </div>

                        <Button fullWidth onClick={handleUpdateLimit} disabled={processing}>
                            {processing ? <Loading variant="inline" size="sm" /> : 'Salvar Limite'}
                        </Button>
                    </div>
                </div>
            )}

            {showPixCharge && (
                <PixChargeModal
                    isOpen={showPixCharge}
                    onClose={() => setShowPixCharge(false)}
                    pixKey={profile?.pix_key || profile?.cpf || ''}
                    pixKeyType={profile?.pix_key_type}
                    storeName={profile?.store_name || 'LOJA'}
                    storeCity={profile?.store_address_city || 'CIDADE'}
                    customTitle="Receber PIX"
                    onPaymentSuccess={async (val) => {
                        toast({ message: `Cobranca de R$ ${val.toFixed(2)} recebida!`, type: 'success' });
                        checkAccessAndLoad();
                    }}
                />
            )}
        </div>
    );
};
