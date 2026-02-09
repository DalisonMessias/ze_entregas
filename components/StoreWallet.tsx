
import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Plus, AlertTriangle, MapPin, Star, MessageCircle, Crown, ChevronRight, Truck, Send, Users, BarChart3, History, Settings, CreditCard, Headphones, ShoppingBag, Search, FileText, Landmark, UploadCloud, Banknote, TrendingUp } from 'lucide-react';
import { Loading } from './Loading';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { DataErrorDisplay } from './DataErrorDisplay';
import * as cloud from '../services/cloud';
import { StoreWallet, WalletTransaction, PartnerRequest, PartnerRequestStatus, PartnerFeeSettings } from '../types';
import { LiveTrackingMap } from './LiveTrackingMap';
import { RatingModal } from './RatingModal';
import { ChatWindow } from './ChatWindow';
import { SuperStoreModal } from './SuperStoreModal';
import { Skeleton } from './Skeleton';
import { PromoSlider } from './PromoSlider';
import { useDialog } from '../utils/dialogService';
import { TipOfTheDay } from './TipOfTheDay';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';
import { PixChargeModal } from './PixChargeModal';

declare const QRious: any;

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const normalizeSearchText = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const isSubsequence = (query: string, text: string) => {
    if (!query) return true;
    let qi = 0;
    for (let ti = 0; ti < text.length && qi < query.length; ti += 1) {
        if (text[ti] === query[qi]) qi += 1;
    }
    return qi === query.length;
};

const levenshtein = (a: string, b: string) => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const v0 = new Array(b.length + 1).fill(0);
    const v1 = new Array(b.length + 1).fill(0);
    for (let i = 0; i <= b.length; i += 1) v0[i] = i;
    for (let i = 0; i < a.length; i += 1) {
        v1[0] = i + 1;
        for (let j = 0; j < b.length; j += 1) {
            const cost = a[i] === b[j] ? 0 : 1;
            v1[j + 1] = Math.min(
                v1[j] + 1,
                v0[j + 1] + 1,
                v0[j] + cost
            );
        }
        for (let j = 0; j <= b.length; j += 1) v0[j] = v1[j];
    }
    return v0[b.length];
};

const isFuzzyMatch = (query: string, text: string) => {
    if (!query) return true;
    const normalizedText = normalizeSearchText(text);
    if (!normalizedText) return false;
    if (normalizedText.includes(query)) return true;
    if (isSubsequence(query, normalizedText)) return true;
    const maxDistance = query.length <= 4 ? 1 : query.length <= 7 ? 2 : 3;
    return levenshtein(query, normalizedText) <= maxDistance;
};

const getStatusChip = (status: PartnerRequestStatus) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-bold";
    switch (status) {
        case 'PENDING': return <span className={`${baseClasses} bg-yellow-100 text-yellow-700`}>Pendente</span>;
        case 'ACCEPTED':
        case 'IN_TRANSIT': return <span className={`${baseClasses} bg-blue-100 text-blue-700`}>{status === 'ACCEPTED' ? 'Aceito' : 'Em Trânsito'}</span>;
        case 'AWAITING_STORE_DECISION': return <span className={`${baseClasses} bg-orange-100 text-orange-700 animate-pulse`}>Atenção</span>;
        case 'RETURNING': return <span className={`${baseClasses} bg-purple-100 text-purple-700`}>Devolvendo</span>;
        case 'COMPLETED': return <span className={`${baseClasses} bg-green-100 text-green-700`}>Concluído</span>;
        case 'CANCELLED':
        case 'EXPIRED': return <span className={`${baseClasses} bg-red-100 text-red-700`}>{status === 'CANCELLED' ? 'Cancelado' : 'Expirado'}</span>;
        default: return <span className={`${baseClasses} bg-gray-100 text-gray-500`}>{status}</span>;
    }
};

const DashboardSkeleton = () => (
    <div className="space-y-10">
        <div className="space-y-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <Skeleton className="h-52 w-full rounded-[32px]" />
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {Array.from({ length: 3 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-24 w-full rounded-2xl" />
                ))}
            </div>
        </div>
        <div className="space-y-3">
            <Skeleton className="h-5 w-44" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-24 w-full rounded-2xl" />
                ))}
            </div>
        </div>
        <div className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                    <Skeleton key={idx} className="h-28 w-full rounded-2xl" />
                ))}
            </div>
        </div>
    </div>
);

const RequestsSkeleton = () => (
    <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 w-full rounded-2xl" />
        ))}
    </div>
);

// Main Component - acts as StoreWalletModule
const StoreWalletModule = ({ onNavigate }: { onNavigate?: (tab: any) => void }) => {
    const [wallet, setWallet] = useState<StoreWallet | null>(null);
    const [requests, setRequests] = useState<PartnerRequest[]>([]);
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [showRecharge, setShowRecharge] = useState(false);
    const [showTracking, setShowTracking] = useState<string | null>(null);
    const [ratingRequest, setRatingRequest] = useState<PartnerRequest | null>(null);
    const [showChat, setShowChat] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [userId, setUserId] = useState<string>('');

    // Profile Validation State
    const [profileValid, setProfileValid] = useState<boolean | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    // Shortcuts state
    const [searchShortcut, setSearchShortcut] = useState('');
    const [favoriteShortcuts, setFavoriteShortcuts] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem('store_shortcuts_fav');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [editShortcuts, setEditShortcuts] = useState(false);

    const [loadingWallet, setLoadingWallet] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [errorWallet, setErrorWallet] = useState<string | null>(null);

    const { alert, confirm, toast } = useDialog();

    useEffect(() => {
        const fetchUser = async () => {
            const { data } = await cloud.getClient().auth.getUser();
            if (data.user) setUserId(data.user.id);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('store_shortcuts_fav', JSON.stringify(favoriteShortcuts));
        } catch { }
    }, [favoriteShortcuts]);

    const loadAllData = async (isPolling = false) => {
        if (!isPolling) {
            setLoadingWallet(true);
            setLoadingRequests(true);
            setErrorWallet(null);
        }

        try {
            // Executa todas as promessas em paralelo
            const [walletData, requestsData, feesData, profileData] = await Promise.all([
                cloud.getMyWallet().catch(e => { return null; }),
                cloud.getStoreRequests(50).catch(e => { return []; }), // Limit to 50
                cloud.getPublicFeeSettings().catch(() => null),
                cloud.getMyPartnerProfile().catch(() => null)
            ]);

            // Atualiza estados
            if (walletData) setWallet(walletData);
            if (!walletData && !isPolling) setErrorWallet('Falha ao carregar saldo.'); // Apenas mostra erro se não for polling

            setRequests(requestsData || []);

            if (feesData) setFees(feesData);

            if (profileData) {
                // Perfil carregado
                setIsSuperStore(profileData?.is_super_store || false);
                const validation = validateStoreProfile(profileData);
                setProfileValid(validation.isValid);
                setMissingFields(validation.missingFields);
            } else if (!isPolling) {
                setProfileValid(false);
                setMissingFields(['Perfil não encontrado']);
            }
        } catch (e) {
            // Erro geral silencioso ou tratado na UI
        } finally {
            if (!isPolling) {
                setLoadingWallet(false);
                setLoadingRequests(false);
            }
        }
    };

    useEffect(() => {
        // Carregamento inicial paralelo
        loadAllData(false);

        // Otimização: Em vez de polling fixo, reagimos aos eventos de atualização do sistema (Pulse)
        const handleRefresh = () => {
            loadAllData(true);
        };

        window.addEventListener('refreshNotifications', handleRefresh);
        window.addEventListener('refreshUserRole', handleRefresh);

        return () => {
            window.removeEventListener('refreshNotifications', handleRefresh);
            window.removeEventListener('refreshUserRole', handleRefresh);
        };
    }, []);

    // const handleRecharge = (amount: number, method: 'PIX') => cloud.createRechargeCharge(amount, method);

    const handleDecision = async (id: string, decision: 'RETURN' | 'DISCARD') => {
        const confirmed = await confirm({
            title: "Confirmar Decisão",
            message: decision === 'RETURN' ? "O item será devolvido à loja?" : "O entregador pode ficar/descartar?"
        });
        if (!confirmed) return;

        try {
            await cloud.storeDecideFailedDelivery(id, decision);
            await alert({ title: "Decisão Registrada", message: "Decisão registrada. O entregador foi notificado." });
            loadAllData();
        } catch (e: any) { await alert({ title: "Erro", message: "Erro: " + e.message }); }
    };

    const handleRatePartner = async (rating: number, comment: string) => {
        if (!ratingRequest || !ratingRequest.partner_id) return;
        try {
            await cloud.submitRating(userId, ratingRequest.partner_id, rating, comment, 'STORE_TO_PARTNER');
            await alert({ title: "Avaliação Enviada", message: "Obrigado pela avaliação!" });
            setRatingRequest(null);
            loadAllData();
        } catch (e: any) { await alert({ title: "Erro", message: "Erro: " + e.message }); }
    };

    const handleShareWhatsApp = (req: PartnerRequest) => {
        const text = `📦 *Nova Solicitação de Entrega*\n🆔 Pedido: #${req.id.substring(0, 6)}\n\n📍 *Retirada:* ${req.pickup_address}\n🏁 *Entrega:* ${req.delivery_address}\n💰 *Valor para você:* ${formatCurrency(req.net_value_partner)}\n\nAbra o App Zé Entregas para aceitar!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shortcutGroups: Array<{ title: string; items: { id: string; label: string; icon: any; tab: any; color: string }[] }> = [
        {
            title: 'Operações',
            items: [
                { id: 'solicitar_entrega', label: 'Solicitar Entrega', icon: Truck, tab: 'new_request', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
                { id: 'pedidos_internos', label: 'Pedidos', icon: FileText, tab: 'internal_orders', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
                { id: 'cadastro_manual', label: 'Cadastro Manual', icon: Plus, tab: 'internal_orders_new', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
                { id: 'gestao_pedidos', label: 'Gestão de Pedidos', icon: History, tab: 'history', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' }
            ]
        },
        {
            title: 'Catálogo & Estoque',
            items: [
                { id: 'atualizar_estoque', label: 'Atualizar Estoque', icon: ShoppingBag, tab: 'store_product_import', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
                { id: 'importar_produtos', label: 'Importar Produtos', icon: UploadCloud, tab: 'store_product_import', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
                { id: 'loja_pecas', label: 'Loja de Peças', icon: ShoppingBag, tab: 'shop', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' }
            ]
        },
        {
            title: 'Financeiro',
            items: [
                { id: 'zepay', label: 'ZéPay', icon: CreditCard, tab: 'zepay_store', color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
                { id: 'zebank', label: 'ZéBank', icon: Landmark, tab: 'zebank', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
                { id: 'painel_financeiro', label: 'Painel Financeiro', icon: Banknote, tab: 'store_finance_panel', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' },
                { id: 'planos', label: 'Planos', icon: Crown, tab: 'store_plans', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' }
            ]
        },
        {
            title: 'Relatórios & Vendas',
            items: [
                { id: 'relatorios', label: 'Relatórios', icon: BarChart3, tab: 'store_reports', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
                { id: 'desempenho', label: 'Desempenho', icon: TrendingUp, tab: 'store_performance', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
                { id: 'verificar_vendas', label: 'Verificar Vendas', icon: BarChart3, tab: 'store_reports', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
                { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3, tab: 'store_reports', color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' }
            ]
        },
        {
            title: 'Marketing & Vendas',
            items: [
                { id: 'promocoes_cupons', label: 'Promoções e Cupons', icon: Banknote, tab: 'store_promotions', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
                { id: 'destaque_cidade', label: 'Destaque na Cidade', icon: Star, tab: 'store_highlight', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' }
            ]
        },
        {
            title: 'Equipe & Suporte',
            items: [
                { id: 'minha_equipe', label: 'Minha Equipe', icon: Users, tab: 'store_team', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
                { id: 'responder_mensagens', label: 'Responder Mensagens', icon: MessageCircle, tab: 'support', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' },
                { id: 'suporte', label: 'Suporte', icon: Headphones, tab: 'support', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
                { id: 'integracoes', label: 'Integrações', icon: Send, tab: 'store_integrations', color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
                { id: 'configuracoes', label: 'Configurações', icon: Settings, tab: 'store_settings', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }
            ]
        }
    ];

    const normalizedSearch = normalizeSearchText(searchShortcut);
    const activeRequests = requests.filter((req) => !['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(req.status)).length;
    const pendingDecision = requests.filter((req) => req.status === 'AWAITING_STORE_DECISION').length;
    const inTransit = requests.filter((req) => req.status === 'IN_TRANSIT').length;
    const filteredShortcutGroups = shortcutGroups
        .map(group => {
            const filtered = group.items.filter(item => isFuzzyMatch(normalizedSearch, item.label));
            const sorted = [...filtered].sort((a, b) => {
                const favDiff = Number(favoriteShortcuts.includes(b.id)) - Number(favoriteShortcuts.includes(a.id));
                if (favDiff !== 0) return favDiff;
                return a.label.localeCompare(b.label);
            });
            return { ...group, items: sorted };
        })
        .filter(group => group.items.length > 0);

    if (loadingWallet && !wallet) return <DashboardSkeleton />;

    // Validação de perfil - redirecionar para configurações se perfil incompleto
    if (profileValid === false) {
        return (
            <ProfileValidationAlert
                onNavigateToSettings={() => onNavigate && onNavigate('store_settings')}
                missingFields={missingFields}
            />
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in">
            <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">Painel da Loja</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe o saldo, as entregas e os atalhos mais usados.</p>
            </div>
            {errorWallet && (
                <DataErrorDisplay
                    title="Erro na Carteira"
                    message={errorWallet}
                    onRetry={() => loadAllData(false)}
                />
            )}




            <div className="space-y-8">
                <div className="flex justify-center">
                    <div className="w-full max-w-6xl xl:max-w-7xl space-y-4">
                        <div className={`grid gap-4 ${!isSuperStore && fees ? 'lg:grid-cols-[1.8fr,1fr]' : 'grid-cols-1'} items-stretch`}>
                            <PromoSlider audience="merchants" />

                            {!isSuperStore && fees && (
                                <div
                                    onClick={() => setShowUpgradeModal(true)}
                                    className="relative overflow-hidden bg-gradient-to-br from-yellow-400 to-orange-500 p-6 rounded-[2rem] shadow-lg cursor-pointer transform hover:scale-[1.01] transition-all duration-300 border border-yellow-300/30 flex flex-col justify-center items-center text-center group"
                                >
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Crown className="w-32 h-32 text-white rotate-12" />
                                    </div>
                                    <div className="relative z-10 space-y-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2">
                                                <Crown className="w-3 h-3 text-white fill-current" />
                                                <span className="text-[10px] font-black uppercase text-white tracking-widest">Premium</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-black text-xl text-white leading-tight">Seja Super Lojista</h3>
                                            <p className="text-xs text-yellow-50 font-medium">
                                                Apenas {formatCurrency(fees.super_store_monthly_fee || 0)}/mês
                                            </p>
                                        </div>
                                        <div className="flex justify-center">
                                            <div className="bg-white text-orange-600 w-10 h-10 rounded-full shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <ChevronRight className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <TipOfTheDay role="store_partner" className="w-full" />
                    </div>
                </div>
                <div className="space-y-4">
                    {/* Main Balance Card */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-[32px] shadow-2xl shadow-gray-900/20 relative overflow-hidden">
                        <div className="absolute -right-16 -top-10 opacity-10"><Wallet className="w-48 h-48" /></div>
                        <div className="relative z-10">
                            <p className="text-gray-400 text-sm font-medium">Meu Saldo</p>
                            <h2 className={`text-4xl font-black ${wallet && wallet.balance_decimal < 0 ? 'text-red-400' : 'text-white'}`}>{formatCurrency(wallet?.balance_decimal || 0)}</h2>
                            {wallet && wallet.balance_decimal < 10 && (
                                <div className="mt-2 bg-red-500/80 backdrop-blur-sm text-white text-xs font-bold p-2 rounded-lg flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> Saldo baixo. Recarregue para pedir.
                                </div>
                            )}
                            <Button onClick={() => onNavigate && onNavigate('zepay_store')} className="mt-6 bg-white/10 text-white hover:bg-white/20 border-none backdrop-blur-sm">
                                <Plus className="w-4 h-4 mr-2" /> Abrir ZéPay
                            </Button>
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setShowRecharge(true)} className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                                    <Plus className="w-4 h-4" /> Recarregar
                                </button>
                                {/* Transfer button functionality could be clearer, but keeping UI consistent */}
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Solicitações ativas</p>
                                <div className="p-2 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                                    <Truck className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="mt-3 text-2xl font-black text-gray-900 dark:text-white">{activeRequests}</p>
                            <p className="text-xs text-gray-400">Pedidos em andamento</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Em trânsito</p>
                                <div className="p-2 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                                    <MapPin className="w-4 h-4" />
                                </div>
                            </div>
                            <p className="mt-3 text-2xl font-black text-gray-900 dark:text-white">{inTransit}</p>
                            <p className="text-xs text-gray-400">Corridas na rua</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ações pendentes</p>
                                <div className="p-2 rounded-full bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                            </div>
                            <p className={`mt-3 text-2xl font-black ${pendingDecision > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>{pendingDecision}</p>
                            <p className="text-xs text-gray-400">Precisam de decisão</p>
                        </div>
                    </div>
                </div>

                <section className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h3 className="text-sm font-black text-gray-800 dark:text-white">Ferramentas Rápidas</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Acesso direto às rotinas mais usadas.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1 sm:flex-none">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                                <input
                                    aria-label="Buscar atalhos"
                                    value={searchShortcut}
                                    onChange={(e) => setSearchShortcut(e.target.value)}
                                    placeholder="Buscar..."
                                    className="w-full sm:w-72 md:w-80 h-9 pl-9 pr-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                                />
                            </div>
                            <button
                                onClick={() => setEditShortcuts((v) => !v)}
                                className={`h-9 px-4 rounded-lg text-xs font-bold border ${editShortcuts ? 'bg-gray-900 text-white border-gray-900' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                                aria-pressed={editShortcuts}
                                aria-label="Personalizar atalhos"
                            >
                                {editShortcuts ? 'Concluir' : 'Personalizar'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {filteredShortcutGroups.length === 0 && (
                            <div className="text-center text-sm text-gray-400 py-8">Nenhuma ferramenta encontrada.</div>
                        )}
                        {filteredShortcutGroups.map(group => (
                            <div key={group.title} className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-5 first:border-t-0 first:pt-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{group.title}</p>
                                    {editShortcuts && (
                                        <span className="text-[10px] text-gray-400">Toque na estrela para fixar</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {group.items.map(item => (
                                        <div key={item.id} className="relative">
                                            {editShortcuts && (
                                                <button
                                                    onClick={() => setFavoriteShortcuts(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])}
                                                    aria-label={favoriteShortcuts.includes(item.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                                                    className={`absolute right-2 top-2 z-10 p-1 rounded-full ${favoriteShortcuts.includes(item.id) ? 'bg-yellow-100 text-yellow-700' : 'bg-white/70 dark:bg-gray-800/70 text-gray-500 border border-gray-200 dark:border-gray-700'}`}
                                                >
                                                    <Star className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onNavigate && onNavigate(item.tab)}
                                                aria-label={item.label}
                                                className="flex w-full flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95"
                                            >
                                                <div className={`p-3 rounded-full ${item.color}`}>
                                                    <item.icon className="w-5 h-5" />
                                                </div>
                                                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">{item.label}</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-gray-800 dark:text-white">Corridas em andamento</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">{activeRequests}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Acompanhe solicitações e decisões pendentes.</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => onNavigate && onNavigate('new_request')}>
                            <Plus className="w-4 h-4 mr-2" /> Solicitar entrega
                        </Button>
                    </div>

                    {loadingRequests ? (
                        <RequestsSkeleton />
                    ) : (
                        <div className="space-y-4">
                            {requests.length === 0 && (
                                <div className="bg-gray-50 dark:bg-gray-900/40 p-8 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-center text-gray-400 text-sm">
                                    Nenhuma solicitação ativa no momento.
                                </div>
                            )}
                            {requests.map(req => (
                                <div key={req.id} className="bg-gray-50/60 dark:bg-gray-900/40 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow">
                                    <div className="flex justify-between items-start mb-3">
                                        {getStatusChip(req.status)}
                                        <div className="text-right">
                                            <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(req.total_charged_store)}</p>
                                            <p className="text-xs text-gray-400">{req.distance_km} km</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2 font-mono">#{req.id.substring(0, 8)}</p>
                                    <div className="space-y-2 text-sm">
                                        <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-blue-500 mt-0.5" /> <span className="font-bold">De:</span> {req.pickup_address}</p>
                                        <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-brand-500 mt-0.5" /> <span className="font-bold">Para:</span> {req.delivery_address}</p>
                                        {req.partner && <p className="flex items-start gap-2 pt-2 border-t border-gray-100 dark:border-gray-700"><Truck className="w-4 h-4 text-gray-400 mt-0.5" /> <span className="font-bold">Entregador:</span> {req.partner.name}</p>}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {req.status === 'IN_TRANSIT' && <Button onClick={() => setShowTracking(req.id)} fullWidth size="sm"><MapPin className="w-4 h-4 mr-2" /> Acompanhar</Button>}
                                        {req.status === 'COMPLETED' && !req.rated_by_store && <Button onClick={() => setRatingRequest(req)} fullWidth size="sm"><Star className="w-4 h-4 mr-2" /> Avaliar</Button>}
                                        {req.partner && <Button variant="outline" onClick={() => setShowChat(req.id)} fullWidth size="sm"><MessageCircle className="w-4 h-4 mr-2" /> Chat</Button>}
                                        <Button onClick={() => handleShareWhatsApp(req)} size="sm" className="bg-green-500 hover:bg-green-600 text-white"><MessageCircle className="w-4 h-4" /></Button>
                                    </div>
                                    {req.status === 'AWAITING_STORE_DECISION' && (
                                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg mt-3">
                                            <p className="text-sm font-bold text-orange-600">Ação Necessária</p>
                                            <p className="text-xs text-orange-500 mb-3">O entregador reportou: <span className="italic">"{req.failure_reason}"</span></p>
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" onClick={() => handleDecision(req.id, 'RETURN')}>Pedir Devolução</Button>
                                                <Button size="sm" variant="danger" onClick={() => handleDecision(req.id, 'DISCARD')}>Dispensar Item</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {showTracking && <LiveTrackingMap requestId={showTracking} onClose={() => setShowTracking(null)} driverName={requests.find(r => r.id === showTracking)?.partner?.name} />}
            {ratingRequest && <RatingModal isOpen={!!ratingRequest} onClose={() => setRatingRequest(null)} onSubmit={handleRatePartner} targetName={ratingRequest.partner?.name || 'Entregador'} title="Avaliar Entregador" />}
            {showChat && <ChatWindow orderId={showChat} type="ORDER" onClose={() => setShowChat(null)} title={requests.find(r => r.id === showChat)?.partner?.name || "Chat"} />}
            {showUpgradeModal && <SuperStoreModal onClose={() => setShowUpgradeModal(false)} onSuccess={() => { setShowUpgradeModal(false); loadAllData(); }} />}
            {showRecharge && (
                <PixChargeModal
                    isOpen={showRecharge}
                    onClose={() => setShowRecharge(false)}
                    pixKey="SYSTEM"
                    storeName="Zé Entregas"
                    storeCity="Online"
                    userId={userId}
                    customTitle="Recarregar Carteira"
                    onPaymentSuccess={() => {
                        loadAllData();
                        setShowRecharge(false);
                    }}
                />
            )}
        </div>
    );
};

export default StoreWalletModule;
