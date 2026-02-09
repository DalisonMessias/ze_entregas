import React, { useState, useEffect, useRef } from 'react';
import { Crown, Check, AlertCircle, Wallet, Copy, X, Store, CreditCard, Calendar, ArrowRight } from 'lucide-react';
import { Loading } from './Loading';
import { Button } from './Button';
import { Switch } from './Switch';
import { Toast } from './Toast';
import * as cloud from '../services/cloud';
import { PartnerFeeSettings, StoreWallet, PartnerProfile } from '../types';
import { useDialog } from '../utils/dialogService';
import { cancelSuperStoreSubscription } from '../services/cloud';

declare const QRious: any;

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface ToastState {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

export const StorePlans: React.FC = () => {
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [wallet, setWallet] = useState<StoreWallet | null>(null);
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'MENSALIDADE' | 'COMISSAO' | null>(null);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);

    // Pix State
    const [showPix, setShowPix] = useState(false);
    const [pixData, setPixData] = useState<{ copyPaste: string, qrCodeBase64?: string } | null>(null);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    const { alert, confirm } = useDialog();

    const loadData = async () => {
        setLoading(true);
        try {
            const [settings, walletData, profileData] = await Promise.all([
                cloud.adminGetFeeSettings(),
                cloud.getMyWallet(),
                cloud.getMyPartnerProfile()
            ]);
            setFees(settings);
            setWallet(walletData);
            setProfile(profileData);

            if (profileData?.super_store_plan_type) {
                setSelectedPlan(profileData.super_store_plan_type as 'MENSALIDADE' | 'COMISSAO');
            } else if (settings?.super_store_monthly_enabled === false) {
                setSelectedPlan('COMISSAO');
            } else {
                setSelectedPlan('MENSALIDADE');
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (showPix && pixData?.copyPaste && qrCanvasRef.current && typeof QRious !== 'undefined') {
            new QRious({
                element: qrCanvasRef.current,
                value: pixData.copyPaste,
                size: 200,
                level: 'H'
            });
        }
    }, [showPix, pixData]);

    const handleSubscribe = async (plan: 'MENSALIDADE' | 'COMISSAO') => {
        if (plan === profile?.super_store_plan_type && profile.is_super_store) {
            return; // Já assinado neste plano
        }

        // Confirmação para troca de plano
        if (profile?.is_super_store) {
            const confirmed = await confirm({
                title: 'Alterar Plano',
                message: `Deseja realmente alterar seu plano para ${plan === 'MENSALIDADE' ? 'Mensalidade' : 'Comissão'}? \n\nA alteração entrará em vigor imediatamente.`,
                confirmButtonText: 'Sim, Alterar',
                cancelButtonText: 'Cancelar'
            });
            if (!confirmed) return;
        }

        let fee = 0;
        if (plan === 'MENSALIDADE') {
            fee = fees?.super_store_monthly_fee || 0;
        }

        setProcessing(true);

        try {
            const currentBalance = wallet?.balance_decimal || 0;

            if (plan === 'MENSALIDADE' && currentBalance < fee) {
                throw new Error("Saldo insuficiente na carteira. Por favor, faça uma recarga no menu Financeiro.");
            }

            await cloud.subscribeToSuperStore(fee, plan);

            setToast({
                message: plan === 'COMISSAO'
                    ? "Plano alterado para Comissão por Pedido."
                    : "Plano alterado para Mensalidade Fixa.",
                type: 'success'
            });

            await loadData();

        } catch (e: any) {
            setToast({
                message: e.message || "Erro ao processar assinatura.",
                type: 'error'
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleCancelSubscription = async () => {
        if (!confirmCancel) return;

        setProcessing(true);
        try {
            const { success, error } = await cloud.cancelSuperStoreSubscription();

            if (success) {
                setToast({
                    message: "Sua assinatura foi cancelada com sucesso. Você voltou para o plano gratuito.",
                    type: 'success'
                });

                setShowCancelModal(false);
                setConfirmCancel(false);
                await loadData();
            } else {
                setToast({
                    message: "Não foi possível cancelar a assinatura. Tente novamente.",
                    type: 'error'
                });
                console.error("Erro ao cancelar:", error);
            }
        } catch (err) {
            console.error("Erro ao processar cancelamento:", err);
            setToast({
                message: "Ocorreu um erro inesperado ao cancelar sua assinatura.",
                type: 'error'
            });
        } finally {
            setProcessing(false);
        }
    };

    const benefits = [
        { title: "Assistente IA (Ze AI)", desc: "Catálogo automático e sugestões inteligentes." },
        { title: "Relatórios Avançados", desc: "Dados financeiros e performance detalhada." },
        { title: "Regras de Frete", desc: "Frete grátis por valor ou raio." },
        { title: "Variações de Produtos", desc: "Suporte completo a tamanhos e adicionais." },
        { title: "Taxa Zero em Retirada", desc: "Isenção em pedidos Takeaway." },
        { title: "Gerentes Adicionais", desc: "Acesso multi-usuário para sua equipe." }
    ];

    if (loading) return <div className="flex justify-center p-10"><Loading variant="container" size="md" /></div>;

    const currentPlan = profile?.is_super_store ? (profile.super_store_plan_type || 'MENSALIDADE') : null;
    const expirationDate = profile?.super_store_expiration ? new Date(profile.super_store_expiration) : null;
    const isExpired = expirationDate ? new Date() > expirationDate : false;

    return (
        <div className="space-y-8 animate-in fade-in pb-24 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Crown className="w-8 h-8 text-yellow-500" />
                        Planos Super Lojista
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Escolha a melhor forma de potencializar suas vendas.</p>
                </div>

                {currentPlan && !isExpired && (
                    <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-green-200 dark:border-green-800">
                        <Check className="w-4 h-4" />
                        {currentPlan === 'MENSALIDADE' ? 'Plano Mensal Ativo' : 'Plano por Comissão Ativo'}
                    </div>
                )}
            </div>

            {/* Status Card */}
            {currentPlan && (
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5">
                        <Crown className="w-48 h-48" />
                    </div>
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Plano Atual</p>
                            <p className="text-2xl font-black text-white">
                                {currentPlan === 'MENSALIDADE' ? 'Pré-pago Mensal' : 'Comissão por Pedido'}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                {currentPlan === 'MENSALIDADE'
                                    ? `Renova em ${formatCurrency(fees?.super_store_monthly_fee || 0)}/mês`
                                    : `${fees?.super_store_commission_percent}% por pedido realizado`
                                }
                            </p>
                        </div>

                        <div>
                            <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Status</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${isExpired ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                <p className="text-lg font-bold">{isExpired ? 'Expirado' : 'Ativo'}</p>
                            </div>
                            {expirationDate && currentPlan === 'MENSALIDADE' && (
                                <p className="text-sm text-gray-400 mt-1">
                                    Válido até {expirationDate.toLocaleDateString('pt-BR')}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col items-end justify-center gap-2">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 w-full md:w-auto">
                                <p className="text-xs text-gray-300 mb-1">Saldo em Carteira</p>
                                <p className="text-xl font-bold flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-gray-300" />
                                    {formatCurrency(wallet?.balance_decimal || 0)}
                                </p>
                            </div>

                            {!isExpired && currentPlan !== 'MENSALIDADE' && (
                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    className="text-red-400 hover:text-red-300 text-sm font-medium hover:underline underline-offset-4 transition-colors flex items-center gap-2 mt-2"
                                >
                                    <X className="w-4 h-4" />
                                    Cancelar assinatura
                                </button>
                            )}

                            {!isExpired && currentPlan === 'MENSALIDADE' && (
                                <div className="flex flex-col items-center gap-1 mt-2">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">
                                        Encerra automaticamente
                                    </p>
                                    <button
                                        onClick={() => setShowCancelModal(true)}
                                        className="text-red-400 hover:text-red-300 text-xs font-bold hover:underline underline-offset-4 transition-colors flex items-center gap-1"
                                    >
                                        <X className="w-3 h-3" />
                                        Encerrar Agora
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Mensalidade Plan */}
                {fees?.super_store_monthly_enabled !== false && (
                    <div className={`bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 transition-all relative overflow-hidden flex flex-col justify-between ${currentPlan === 'MENSALIDADE' ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-gray-100 dark:border-gray-700 hover:border-orange-200'}`}>
                        {currentPlan === 'MENSALIDADE' && (
                            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase">
                                Plano Atual
                            </div>
                        )}

                        <div>
                            <div className="mb-6">
                                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                    Mensalidade
                                </span>
                                <h3 className="text-3xl font-black mt-4 text-gray-900 dark:text-white">
                                    {formatCurrency(fees?.super_store_monthly_fee || 0)}
                                    <span className="text-lg text-gray-400 font-medium">/mês</span>
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                                    Pague um valor fixo e fique livre de comissões sobre suas vendas. Ideal para quem vende muito.
                                </p>
                            </div>

                            <ul className="space-y-3 mb-8">
                                <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                    <span>Zero comissão sobre vendas</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                    <span>Controle total de pagamentos</span>
                                </li>
                                {benefits.slice(0, 3).map((b, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <Check className="w-5 h-5 text-orange-500 flex-shrink-0" />
                                        <span>{b.title}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Button
                            onClick={() => handleSubscribe('MENSALIDADE')}
                            disabled={processing || currentPlan === 'MENSALIDADE'}
                            fullWidth
                            className={currentPlan === 'MENSALIDADE' ? 'opacity-50 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700 text-white'}
                        >
                            {currentPlan === 'MENSALIDADE' ? 'Ativo' : 'Mudar para Mensal'}
                        </Button>
                    </div>
                )}

                {/* Commission Plan */}
                <div className={`bg-white dark:bg-gray-800 rounded-3xl p-8 border-2 transition-all relative overflow-hidden flex flex-col justify-between ${currentPlan === 'COMISSAO' ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-gray-100 dark:border-gray-700 hover:border-brand-200'}`}>
                    {currentPlan === 'COMISSAO' && (
                        <div className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase">
                            Plano Atual
                        </div>
                    )}

                    <div>
                        <div className="mb-6">
                            <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                                Por Pedido
                            </span>
                            <h3 className="text-3xl font-black mt-4 text-gray-900 dark:text-white">
                                {fees?.super_store_commission_percent}%
                                {fees?.super_store_commission_fixed ? <span className="text-xl"> + {formatCurrency(fees.super_store_commission_fixed)}</span> : ''}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                                Sem mensalidade fixa. Pague apenas uma pequena taxa quando vender.
                            </p>
                        </div>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <Check className="w-5 h-5 text-brand-500 flex-shrink-0" />
                                <span>Sem custo fixo mensal</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <Check className="w-5 h-5 text-brand-500 flex-shrink-0" />
                                <span>Pague só se vender</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <AlertCircle className="w-5 h-5 text-brand-500 flex-shrink-0" />
                                <span className="font-medium text-brand-700 dark:text-brand-400">Pagamento automático via saldo</span>
                            </li>
                            {benefits.slice(0, 3).map((b, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                    <Check className="w-5 h-5 text-brand-500 flex-shrink-0" />
                                    <span>{b.title}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <Button
                        onClick={() => handleSubscribe('COMISSAO')}
                        disabled={processing || currentPlan === 'COMISSAO'}
                        fullWidth
                        className={currentPlan === 'COMISSAO' ? 'opacity-50 cursor-not-allowed' : 'bg-brand-600 hover:bg-brand-700 text-white'}
                    >
                        {currentPlan === 'COMISSAO' ? 'Ativo' : 'Mudar para Comissão'}
                    </Button>
                </div>
            </div>

            <div className="mt-8 bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-300">Como funciona a troca de planos?</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        Você pode alternar entre os planos a qualquer momento.
                        Ao mudar para <strong>Mensalidade</strong>, o valor será debitado do seu saldo imediatamente.
                        Ao mudar para <strong>Comissão</strong>, a cobrança mensal é suspensa e você passará a pagar a taxa sobre cada pedido concluído.
                    </p>
                </div>
            </div>

            {/* Modal de Confirmação de Cancelamento */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-[2rem] max-w-md w-full p-8 shadow-2xl transform transition-all scale-100 border border-gray-100 dark:border-gray-700">
                        <div className="text-center mb-8">
                            <div className="bg-red-50 dark:bg-red-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                Cancelar Assinatura?
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                                Você perderá acesso imediato a benefícios como <strong>taxa zero</strong>, <strong>Ze AI</strong> e <strong>relatórios avançados</strong>. Seu status voltará ao plano gratuito original.
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-4 mb-8 border border-gray-100 dark:border-gray-600/50">
                            <Switch
                                checked={confirmCancel}
                                onChange={setConfirmCancel}
                                label="Estou ciente das perdas e desejo cancelar minha assinatura."
                                className="w-full"
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                fullWidth
                                variant="outline"
                                className="h-12 text-base rounded-2xl"
                                onClick={() => {
                                    setShowCancelModal(false);
                                    setConfirmCancel(false);
                                }}
                                disabled={processing}
                            >
                                Manter meu plano
                            </Button>
                            <Button
                                fullWidth
                                variant={confirmCancel ? "danger" : "outline"}
                                className={`h-12 text-base font-bold transition-all duration-300 ${!confirmCancel ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 border-transparent cursor-not-allowed' : 'shadow-lg shadow-red-500/20'}`}
                                onClick={handleCancelSubscription}
                                disabled={!confirmCancel || processing}
                                loading={processing}
                            >
                                Confirmar Cancelamento
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};
