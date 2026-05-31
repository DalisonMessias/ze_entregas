import React, { useState, useEffect, useRef } from 'react';
import {
    Crown, Check, X, Zap, Star, Lock, Calendar, AlertTriangle,
    Wallet, ChevronRight, Sparkles, Package, MessageSquare, BarChart3,
    Gift, Users, Truck, ShoppingBag, Clock, Badge, ShieldCheck, Rocket
} from 'lucide-react';
import { Loading } from './Loading';
import { Button } from './Button';
import { Switch } from './Switch';
import { Toast } from './Toast';
import * as cloud from '../services/cloud';
import { PartnerFeeSettings, StoreWallet, PlanStatus } from '../types';
import { useDialog } from '../utils/dialogService';
import { PixChargeModal } from './PixChargeModal';

declare const QRious: any;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric'
    });

interface ToastState {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
}

// Configurações visuais e de conteúdo de cada plano
const PLAN_CONFIG = {
    GRATUITO: {
        label: 'Gratuito',
        color: 'gray',
        icon: Package,
        badge: 'Plano Gratuito',
        tagClass: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
        borderActive: 'border-gray-400 ring-4 ring-gray-200 dark:ring-gray-700',
        borderInactive: 'border-gray-100 dark:border-gray-700 hover:border-gray-300',
        buttonClass: 'bg-gray-500 hover:bg-gray-600 text-white',
        checkClass: 'w-4 h-4 text-gray-500 flex-shrink-0',
        lockClass: 'w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0',
        badgeClass: 'bg-gray-500',
        gradient: 'from-gray-600 to-gray-700',
        glowClass: 'shadow-gray-500/20',
    },
    COMISSAO: {
        label: 'Por Pedido',
        color: 'brand',
        icon: ShoppingBag,
        badge: 'Por Pedido',
        tagClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        borderActive: 'border-blue-500 ring-4 ring-blue-500/10',
        borderInactive: 'border-gray-100 dark:border-gray-700 hover:border-blue-200',
        buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
        checkClass: 'w-4 h-4 text-blue-500 flex-shrink-0',
        lockClass: 'w-4 h-4 text-blue-200 dark:text-blue-900/30 flex-shrink-0',
        badgeClass: 'bg-blue-500',
        gradient: 'from-blue-600 to-blue-700',
        glowClass: 'shadow-blue-500/20',
    },
    MENSALIDADE: {
        label: 'Mensal',
        color: 'orange',
        icon: Crown,
        badge: 'Mais Popular',
        tagClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
        borderActive: 'border-orange-500 ring-4 ring-orange-500/10',
        borderInactive: 'border-gray-100 dark:border-gray-700 hover:border-orange-200',
        buttonClass: 'bg-orange-600 hover:bg-orange-700 text-white',
        checkClass: 'w-4 h-4 text-orange-500 flex-shrink-0',
        lockClass: 'w-4 h-4 text-orange-200 dark:text-orange-900/30 flex-shrink-0',
        badgeClass: 'bg-orange-500',
        gradient: 'from-orange-500 to-orange-600',
        glowClass: 'shadow-orange-500/20',
    },
};

// Recursos de cada plano
const PLAN_FEATURES = {
    GRATUITO: {
        included: [
            'Catálogo digital básico',
            'Até 10 produtos cadastrados',
            'Pedidos via link/catálogo',
            'ZéBank (Carteira pessoal)',
            'Suporte via plataforma'
        ],
        excluded: [
            'WhatsBot (automação)',
            'Relatórios avançados',
            'Promoções e cupons',
            'Assistente IA (Ze AI)',
            'Destaque na cidade',
            'Gerentes adicionais',
            'Empréstimos empresariais',
            'Regras de frete avançadas',
        ]
    },
    COMISSAO: {
        included: [
            'Produtos ilimitados',
            'WhatsBot (automação de mensagens)',
            'Relatórios avançados',
            'Promoções e cupons',
            'Assistente IA (Ze AI)',
            'Gerentes adicionais',
            'Empréstimos empresariais',
            'ZéBank + ZéPay completo',
            'Regras de frete avançadas',
        ],
        excluded: [
            'Destaque na cidade',
            'Zero comissão por pedido',
        ]
    },
    MENSALIDADE: {
        included: [
            'Tudo do plano Por Pedido',
            'Zero comissão sobre vendas',
            'Taxa fixa mensal previsível',
            'Destaque na página da cidade',
            'Suporte prioritário',
            'Produtos ilimitados',
            'WhatsBot (automação de mensagens)',
            'Relatórios avançados + exportação',
            'Todos os recursos da plataforma',
        ],
        excluded: []
    }
};

export const StorePlans: React.FC = () => {
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [wallet, setWallet] = useState<StoreWallet | null>(null);
    const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [toast, setToast] = useState<ToastState | null>(null);
    const [showPixModal, setShowPixModal] = useState(false);
    const [pixAmount, setPixAmount] = useState(0);
    const [userId, setUserId] = useState<string | undefined>(undefined);

    const { confirm } = useDialog();

    const handlePixSuccess = async () => {
        try {
            setProcessing(true);
            const fee = fees?.super_store_monthly_fee || 0;
            await cloud.subscribeToSuperStore(fee, 'MENSALIDADE');
            setToast({
                message: 'Recarga confirmada e plano Mensal ativado com sucesso!',
                type: 'success'
            });
            setShowPixModal(false);
            await loadData();
        } catch (e: any) {
            setToast({
                message: e.message || 'Erro ao ativar o plano após recarga.',
                type: 'error'
            });
        } finally {
            setProcessing(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // Verifica downgrade de planos expirados antes de carregar
            await cloud.checkAndDowngradeExpiredPlan();

            const [settings, walletData, planData, userData] = await Promise.all([
                cloud.adminGetFeeSettings(),
                cloud.getMyWallet(),
                cloud.getMyPlanStatus(),
                cloud.getClient().auth.getUser()
            ]);

            setFees(settings);
            setWallet(walletData);
            setPlanStatus(planData);
            if (userData?.data?.user) {
                setUserId(userData.data.user.id);
            }
        } catch (e) {
            console.error('[StorePlans] Erro ao carregar dados:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSubscribe = async (plan: 'MENSALIDADE' | 'COMISSAO') => {
        // Não processar se já estiver no mesmo plano e ativo
        if (planStatus?.super_store_plan_type === plan && planStatus?.is_super_store && !planStatus?.is_expired) {
            return;
        }

        // Confirmar troca de plano se já tiver um plano ativo
        if (planStatus?.is_super_store && !planStatus?.is_expired) {
            const confirmed = await confirm({
                title: 'Alterar Plano',
                message: `Deseja realmente alterar seu plano para ${plan === 'MENSALIDADE' ? 'Mensal' : 'Por Pedido'}?\n\nA alteração entrará em vigor imediatamente.`,
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
                setPixAmount(fee);
                setShowPixModal(true);
                setProcessing(false);
                return;
            }

            await cloud.subscribeToSuperStore(fee, plan);

            setToast({
                message: plan === 'COMISSAO'
                    ? 'Plano alterado para Por Pedido com sucesso!'
                    : 'Plano alterado para Mensal com sucesso!',
                type: 'success'
            });

            await loadData();
        } catch (e: any) {
            setToast({
                message: e.message || 'Erro ao processar assinatura.',
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
                    message: 'Assinatura cancelada. Você voltou para o Plano Gratuito.',
                    type: 'success'
                });
                setShowCancelModal(false);
                setConfirmCancel(false);
                await loadData();
            } else {
                setToast({
                    message: 'Não foi possível cancelar a assinatura. Tente novamente.',
                    type: 'error'
                });
                console.error('Erro ao cancelar:', error);
            }
        } catch (err) {
            console.error('Erro ao processar cancelamento:', err);
            setToast({
                message: 'Ocorreu um erro inesperado ao cancelar sua assinatura.',
                type: 'error'
            });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loading variant="container" size="md" />
            </div>
        );
    }

    // Determinar o plano efetivo atual
    const effectivePlanLevel = planStatus?.plan_level || 'GRATUITO';
    const isExpired = planStatus?.is_expired || false;
    const expirationDate = planStatus?.super_store_expiration
        ? new Date(planStatus.super_store_expiration)
        : null;

    const isMensalidadeEnabled = fees?.super_store_monthly_enabled !== false;
    const isComissaoEnabled = fees?.super_store_commission_enabled !== false;

    return (
        <div className="space-y-8 animate-in fade-in pb-24 max-w-5xl mx-auto px-1">

            {/* === CABEÇALHO === */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Crown className="w-7 h-7 text-yellow-500" />
                        Planos Super Lojista
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Escolha o plano ideal para escalar sua loja.
                    </p>
                </div>

                {/* Badge do plano atual */}
                <div className={`
                    px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border
                    ${isExpired
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                        : effectivePlanLevel === 'MENSALIDADE'
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                            : effectivePlanLevel === 'COMISSAO'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600'
                    }
                `}>
                    {isExpired ? (
                        <><AlertTriangle className="w-4 h-4" /> Plano Expirado</>
                    ) : effectivePlanLevel === 'MENSALIDADE' ? (
                        <><Crown className="w-4 h-4" /> Plano Mensal Ativo</>
                    ) : effectivePlanLevel === 'COMISSAO' ? (
                        <><ShoppingBag className="w-4 h-4" /> Por Pedido Ativo</>
                    ) : (
                        <><Package className="w-4 h-4" /> Plano Gratuito</>
                    )}
                </div>
            </div>

            {/* === CARD DE STATUS === */}
            {planStatus?.is_super_store && (
                <div className={`
                    relative overflow-hidden rounded-2xl p-6 text-white shadow-xl
                    ${isExpired
                        ? 'bg-gradient-to-r from-red-700 to-red-900'
                        : effectivePlanLevel === 'MENSALIDADE'
                            ? 'bg-gradient-to-r from-orange-500 to-orange-700'
                            : 'bg-gradient-to-r from-blue-600 to-blue-800'
                    }
                `}>
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Crown className="w-48 h-48" />
                    </div>

                    <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {/* Plano */}
                        <div>
                            <p className="text-white/60 text-xs uppercase tracking-wider font-bold mb-1">Plano Atual</p>
                            <p className="text-2xl font-black">
                                {effectivePlanLevel === 'MENSALIDADE' ? 'Pré-pago Mensal' : 'Por Pedido'}
                            </p>
                            {isExpired ? (
                                <p className="text-red-200 text-sm mt-1 font-semibold flex items-center gap-1">
                                    <AlertTriangle className="w-4 h-4" />
                                    Plano expirado — acesso suspenso
                                </p>
                            ) : (
                                <p className="text-white/70 text-sm mt-1">
                                    {effectivePlanLevel === 'MENSALIDADE'
                                        ? `${formatCurrency(fees?.super_store_monthly_fee || 0)}/mês · Zero comissão`
                                        : `${fees?.super_store_commission_percent}% por pedido realizado`
                                    }
                                </p>
                            )}
                        </div>

                        {/* Status + Vencimento */}
                        <div>
                            <p className="text-white/60 text-xs uppercase tracking-wider font-bold mb-1">Status</p>
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${isExpired ? 'bg-red-300' : 'bg-green-300'}`} />
                                <p className="text-lg font-bold">{isExpired ? 'Expirado' : 'Ativo'}</p>
                            </div>
                            {expirationDate && effectivePlanLevel === 'MENSALIDADE' && (
                                <div className={`mt-2 flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg w-fit
                                    ${isExpired ? 'bg-red-900/50 text-red-200' : 'bg-white/15 text-white'}
                                `}>
                                    <Calendar className="w-4 h-4 flex-shrink-0" />
                                    {isExpired ? 'Expirou em ' : 'Válido até '}
                                    {expirationDate.toLocaleDateString('pt-BR')}
                                </div>
                            )}
                        </div>

                        {/* Saldo + Ações */}
                        <div className="flex flex-col items-start sm:items-end justify-center gap-3">
                            <div className="bg-white/10 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 w-full sm:w-auto">
                                <p className="text-xs text-white/60 mb-0.5">Saldo em Carteira</p>
                                <p className="text-xl font-bold flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-white/70" />
                                    {formatCurrency(wallet?.balance_decimal || 0)}
                                </p>
                            </div>

                            {!isExpired && (
                                <button
                                    onClick={() => setShowCancelModal(true)}
                                    className="text-white/70 hover:text-white text-xs font-medium hover:underline underline-offset-4 transition-colors flex items-center gap-1 mt-1"
                                >
                                    <X className="w-3 h-3" />
                                    {effectivePlanLevel === 'MENSALIDADE' ? 'Encerrar plano' : 'Cancelar assinatura'}
                                </button>
                            )}

                            {isExpired && (
                                <div className="bg-red-900/40 border border-red-500/30 px-4 py-2 rounded-xl text-xs text-red-200 font-semibold">
                                    Reative escolhendo um plano abaixo
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* === ALERTA DE PLANO EXPIRADO === */}
            {isExpired && (
                <div className="flex items-start gap-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-5 rounded-2xl">
                    <div className="bg-red-100 dark:bg-red-800/40 p-2 rounded-lg text-red-600 dark:text-red-400 shrink-0">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-red-800 dark:text-red-300 text-sm">
                            Seu plano expirou em {expirationDate?.toLocaleDateString('pt-BR')}
                        </h4>
                        <p className="text-red-700 dark:text-red-400 text-sm mt-1">
                            Você foi retornado automaticamente para o Plano Gratuito. Renove seu plano para recuperar todos os recursos premium.
                        </p>
                    </div>
                </div>
            )}

            {/* === GRADE DE PLANOS === */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* PLANO GRATUITO */}
                <div className={`
                    relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 transition-all flex flex-col
                    ${effectivePlanLevel === 'GRATUITO'
                        ? 'border-gray-400 ring-4 ring-gray-200 dark:ring-gray-700'
                        : 'border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                `}>
                    {effectivePlanLevel === 'GRATUITO' && (
                        <div className="absolute top-0 right-0 bg-gray-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wide">
                            Plano Atual
                        </div>
                    )}

                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                                <Package className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide">
                                Gratuito
                            </span>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                            R$ 0<span className="text-lg text-gray-400 font-medium">/mês</span>
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">
                            Comece sem custo. Teste a plataforma com recursos básicos sem precisar de cartão de crédito.
                        </p>
                    </div>

                    <ul className="space-y-2 mb-6 flex-1">
                        {PLAN_FEATURES.GRATUITO.included.map((item, i) => (
                            <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                                <Check className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                        {PLAN_FEATURES.GRATUITO.excluded.slice(0, 4).map((item, i) => (
                            <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400 dark:text-gray-600 line-through">
                                <Lock className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>

                    <div className={`
                        py-2.5 px-4 rounded-xl text-sm font-bold text-center border-2
                        ${effectivePlanLevel === 'GRATUITO'
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 cursor-default'
                            : 'bg-gray-600 text-white border-transparent cursor-pointer hover:bg-gray-700 transition-colors'
                        }
                    `}>
                        {effectivePlanLevel === 'GRATUITO' ? 'Plano Atual' : 'Plano Básico'}
                    </div>
                </div>

                {/* PLANO POR PEDIDO */}
                {isComissaoEnabled && (
                    <div className={`
                        relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 transition-all flex flex-col
                        ${effectivePlanLevel === 'COMISSAO' && !isExpired
                            ? 'border-blue-500 ring-4 ring-blue-500/10'
                            : 'border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800/40'
                        }
                    `}>
                        {effectivePlanLevel === 'COMISSAO' && !isExpired && (
                            <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wide">
                                Plano Atual
                            </div>
                        )}

                        <div className="mb-5">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                                    <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide">
                                    Por Pedido
                                </span>
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                                {fees?.super_store_commission_percent || '—'}%
                                {fees?.super_store_commission_fixed ? (
                                    <span className="text-base font-medium text-gray-400"> + {formatCurrency(fees.super_store_commission_fixed)}</span>
                                ) : null}
                                <span className="text-lg text-gray-400 font-medium">/pedido</span>
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">
                                Acesse todos os recursos premium sem mensalidade. Pague apenas uma pequena taxa sobre cada venda realizada.
                            </p>
                        </div>

                        <ul className="space-y-2 mb-6 flex-1">
                            {PLAN_FEATURES.COMISSAO.included.map((item, i) => (
                                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                                    <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                            {PLAN_FEATURES.COMISSAO.excluded.map((item, i) => (
                                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-400 dark:text-gray-600 line-through">
                                    <Lock className="w-4 h-4 text-blue-200 dark:text-blue-900/40 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>

                        <Button
                            onClick={() => handleSubscribe('COMISSAO')}
                            disabled={processing || (effectivePlanLevel === 'COMISSAO' && !isExpired)}
                            fullWidth
                            className={effectivePlanLevel === 'COMISSAO' && !isExpired
                                ? 'opacity-50 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white font-bold'
                            }
                            loading={processing}
                        >
                            {effectivePlanLevel === 'COMISSAO' && !isExpired ? 'Plano Ativo' : 'Ativar Por Pedido'}
                        </Button>
                    </div>
                )}

                {/* PLANO MENSAL */}
                {isMensalidadeEnabled && (
                    <div className={`
                        relative bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 transition-all flex flex-col
                        ${effectivePlanLevel === 'MENSALIDADE' && !isExpired
                            ? 'border-orange-500 ring-4 ring-orange-500/10'
                            : 'border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-800/40'
                        }
                    `}>
                        {/* Badge "Mais Popular" */}
                        {!(effectivePlanLevel === 'MENSALIDADE' && !isExpired) && (
                            <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wide flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                Mais Popular
                            </div>
                        )}
                        {effectivePlanLevel === 'MENSALIDADE' && !isExpired && (
                            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-wide">
                                Plano Atual
                            </div>
                        )}

                        <div className="mb-5">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
                                    <Crown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide">
                                    Mensal
                                </span>
                            </div>
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                                {formatCurrency(fees?.super_store_monthly_fee || 0)}
                                <span className="text-lg text-gray-400 font-medium">/mês</span>
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm leading-relaxed">
                                Taxa fixa mensal. Zero comissão sobre suas vendas. Ideal para quem tem alto volume de pedidos.
                            </p>

                            {/* Exibição de vencimento para plano mensal ativo */}
                            {effectivePlanLevel === 'MENSALIDADE' && expirationDate && !isExpired && (
                                <div className="mt-3 flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 px-3 py-2 rounded-xl text-xs text-orange-700 dark:text-orange-400 font-semibold">
                                    <Calendar className="w-4 h-4 flex-shrink-0" />
                                    Renova em: {expirationDate.toLocaleDateString('pt-BR')}
                                </div>
                            )}
                        </div>

                        <ul className="space-y-2 mb-6 flex-1">
                            {PLAN_FEATURES.MENSALIDADE.included.map((item, i) => (
                                <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                                    <Check className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>

                        <Button
                            onClick={() => handleSubscribe('MENSALIDADE')}
                            disabled={processing || (effectivePlanLevel === 'MENSALIDADE' && !isExpired)}
                            fullWidth
                            className={effectivePlanLevel === 'MENSALIDADE' && !isExpired
                                ? 'opacity-50 cursor-not-allowed'
                                : 'bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-500/20'
                            }
                            loading={processing}
                        >
                            {effectivePlanLevel === 'MENSALIDADE' && !isExpired ? 'Plano Ativo' : 'Ativar Mensal'}
                        </Button>
                    </div>
                )}
            </div>

            {/* === COMPARATIVO RÁPIDO === */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm">Comparativo de Planos</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50">
                                <th className="text-left py-3 px-5 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase">Recurso</th>
                                <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase">Gratuito</th>
                                <th className="text-center py-3 px-4 text-gray-500 dark:text-gray-400 font-semibold text-xs uppercase">Por Pedido</th>
                                <th className="text-center py-3 px-4 text-orange-600 dark:text-orange-400 font-semibold text-xs uppercase">Mensal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                            {[
                                { label: 'Catálogo digital', free: true, perOrder: true, monthly: true },
                                { label: 'Produtos no catálogo', free: 'Até 10', perOrder: 'Ilimitado', monthly: 'Ilimitado' },
                                { label: 'WhatsBot (automação)', free: false, perOrder: true, monthly: true },
                                { label: 'Relatórios avançados', free: false, perOrder: true, monthly: true },
                                { label: 'Promoções e cupons', free: false, perOrder: true, monthly: true },
                                { label: 'Assistente IA (Ze AI)', free: false, perOrder: true, monthly: true },
                                { label: 'Gerentes adicionais', free: false, perOrder: true, monthly: true },
                                { label: 'Empréstimos', free: false, perOrder: true, monthly: true },
                                { label: 'Destaque na cidade', free: false, perOrder: false, monthly: true },
                                { label: 'Zero comissão', free: false, perOrder: false, monthly: true },
                            ].map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                                    <td className="py-3 px-5 text-gray-700 dark:text-gray-300 text-sm font-medium">{row.label}</td>
                                    <td className="py-3 px-4 text-center">
                                        {typeof row.free === 'boolean'
                                            ? row.free
                                                ? <Check className="w-4 h-4 text-green-500 mx-auto" />
                                                : <X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
                                            : <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{row.free}</span>
                                        }
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {typeof row.perOrder === 'boolean'
                                            ? row.perOrder
                                                ? <Check className="w-4 h-4 text-blue-500 mx-auto" />
                                                : <X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
                                            : <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{row.perOrder}</span>
                                        }
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {typeof row.monthly === 'boolean'
                                            ? row.monthly
                                                ? <Check className="w-4 h-4 text-orange-500 mx-auto" />
                                                : <X className="w-4 h-4 text-gray-300 dark:text-gray-600 mx-auto" />
                                            : <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">{row.monthly}</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* === INFORMATIVO === */}
            <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                    <Zap className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm">Como funciona a troca de planos?</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                        Você pode mudar de plano a qualquer momento. Ao ativar o <strong>Mensal</strong>, o valor é debitado do seu saldo imediatamente e você tem 30 dias de acesso completo.
                        Ao ativar o <strong>Por Pedido</strong>, a cobrança é feita automaticamente a cada venda concluída.
                        O <strong>Plano Gratuito</strong> é aplicado automaticamente ao criar uma conta ou ao expirar um plano pago.
                    </p>
                </div>
            </div>

            {/* === MODAL CANCELAMENTO === */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 dark:border-gray-700">
                        <div className="text-center mb-7">
                            <div className="bg-red-50 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5">
                                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Cancelar Assinatura?
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                                Você perderá acesso imediato a recursos premium como <strong>WhatsBot</strong>, <strong>Ze AI</strong>, <strong>promoções</strong> e <strong>relatórios avançados</strong>. Seu plano voltará para o <strong>Gratuito</strong>.
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-4 mb-6 border border-gray-100 dark:border-gray-600/50">
                            <Switch
                                checked={confirmCancel}
                                onChange={setConfirmCancel}
                                label="Estou ciente das perdas e desejo cancelar minha assinatura."
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button
                                fullWidth
                                variant="outline"
                                className="h-12 text-sm rounded-2xl"
                                onClick={() => { setShowCancelModal(false); setConfirmCancel(false); }}
                                disabled={processing}
                            >
                                Manter meu plano
                            </Button>
                            <Button
                                fullWidth
                                variant={confirmCancel ? 'danger' : 'outline'}
                                className={`h-12 text-sm font-bold rounded-2xl transition-all duration-300 ${!confirmCancel ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 border-transparent cursor-not-allowed' : 'shadow-lg shadow-red-500/20'}`}
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

            {/* === MODAL DE RECARGA PIX === */}
            {showPixModal && (
                <PixChargeModal
                    isOpen={showPixModal}
                    onClose={() => setShowPixModal(false)}
                    pixKey="SYSTEM"
                    storeName="Zé Entregas"
                    storeCity="Online"
                    userId={userId}
                    customTitle="Recarregar para Assinatura"
                    onPaymentSuccess={handlePixSuccess}
                />
            )}

            {/* === TOAST === */}
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
