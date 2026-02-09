import React, { useEffect, useMemo, useState, useRef } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, Clock, MapPin, Star, Image as ImageIcon, MessageCircle, ChevronDown, HelpCircle, Info, CreditCard, Wallet, ExternalLink, FileCheck, Loader2 } from 'lucide-react';
import * as cloud from '../services/cloud';
import { CityStoreHighlightOrder, CityStoreHighlightSettings, PartnerProfile, CityStoreBannerAssets, CityStoreBannerRequest, CityStoreBannerRequestMessage } from '../types';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import { ImageUpload } from './ImageUpload';
import { BaseModal } from './BaseModal';
import { ChatExclusivoModal } from './ChatExclusivoModal';
import { MobileBannerPreview } from './MobileBannerPreview';
import { useNotification } from '../contexts/NotificationContext';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatPercent = (val?: number) => `${Number(val || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
import { formatDateTime } from '../utils/formatMinutes';
const formatHighlightStatus = (status?: string) => {
    const normalized = (status || '').toUpperCase();
    switch (normalized) {
        case 'ACTIVE': return 'ATIVO';
        case 'SCHEDULED': return 'AGENDADO';
        case 'CANCELLED': return 'CANCELADO';
        case 'EXPIRED': return 'EXPIRADO';
        case 'OPEN': return 'ABERTO';
        case 'IN_PROGRESS': return 'EM ANDAMENTO';
        case 'DONE': return 'CONCLUIDO';
        case 'CLOSED': return 'FECHADO';
        default: return normalized || '-';
    }
};

const formatRequestType = (type?: string) => {
    const normalized = (type || '').toUpperCase();
    switch (normalized) {
        case 'READY': return 'BANNER PRONTO';
        case 'DESIGN_REQUEST': return 'CRIACAO PELA PLATAFORMA';
        default: return normalized || '-';
    }
};

const formatRequestTopic = (topic?: string) => {
    const normalized = (topic || '').toUpperCase();
    switch (normalized) {
        case 'HIGHLIGHT':
        case 'DESTAQUE':
        case 'STORE_HIGHLIGHT':
            return 'DESTAQUE DA LOJA';
        case 'BANNER':
        default:
            return 'BANNER DA CIDADE';
    }
};

type SelectOption = { value: 'BANNER' | 'HIGHLIGHT'; label: string };

const CustomSelect: React.FC<{
    value: SelectOption['value'];
    options: SelectOption[];
    onChange: (value: SelectOption['value']) => void;
}> = ({ value, options, onChange }) => {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (!wrapperRef.current) return;
            if (!wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const selected = options.find(opt => opt.value === value) || options[0];

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setOpen(prev => !prev)}
                className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            >
                <span className="text-sm font-semibold">{selected?.label}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
                    {options.map(option => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => { onChange(option.value); setOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 ${option.value === value ? 'text-brand-600' : 'text-gray-700 dark:text-gray-200'}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const StoreHighlight: React.FC = () => {
    const { alert } = useDialog();
    const { showNotification } = useNotification();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [settings, setSettings] = useState<CityStoreHighlightSettings | null>(null);
    const [orders, setOrders] = useState<CityStoreHighlightOrder[]>([]);
    const [allCityOrders, setAllCityOrders] = useState<CityStoreHighlightOrder[]>([]);
    const [purchasing, setPurchasing] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [days, setDays] = useState(30);
    const [bannerAssets, setBannerAssets] = useState<CityStoreBannerAssets | null>(null);
    const [bannerRequests, setBannerRequests] = useState<CityStoreBannerRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<CityStoreBannerRequest | null>(null);
    const [requestMessages, setRequestMessages] = useState<CityStoreBannerRequestMessage[]>([]);
    const [requestMessage, setRequestMessage] = useState('');
    const [bannerUrl, setBannerUrl] = useState('');
    const [bannerNotes, setBannerNotes] = useState('');
    const [requestBrief, setRequestBrief] = useState('');
    const [readyRequestTopic, setReadyRequestTopic] = useState<'BANNER' | 'HIGHLIGHT'>('BANNER');
    const [designRequestTopic, setDesignRequestTopic] = useState<'BANNER' | 'HIGHLIGHT'>('BANNER');
    const [loadingBannerChat, setLoadingBannerChat] = useState(false);
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [showNoBalanceModal, setShowNoBalanceModal] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<CityStoreHighlightOrder | null>(null);
    const [cancelling, setCancelling] = useState(false);
    const [isChatModalOpen, setIsChatModalOpen] = useState(false);
    const [showBannerPaymentModal, setShowBannerPaymentModal] = useState(false);
    const [bannerPaymentType, setBannerPaymentType] = useState<'READY' | 'DESIGN_REQUEST' | null>(null);
    const [processingBannerPayment, setProcessingBannerPayment] = useState(false);

    const citySlug = profile?.city_slug || '';
    const topicOptions: SelectOption[] = [
        { value: 'BANNER', label: 'Banner da cidade' },
        { value: 'HIGHLIGHT', label: 'Destaque da loja' }
    ];

    const loadData = async () => {
        setLoading(true);
        try {
            console.log('[StoreHighlight] Iniciando carregamento de dados...');
            const [profileData, settingsData, assetsData, walletData] = await Promise.all([
                cloud.getMyPartnerProfile().then(d => { console.log('[StoreHighlight] Profile carregado'); return d; }),
                cloud.getCityStoreHighlightSettings().then(d => { console.log('[StoreHighlight] Settings carregadas'); return d; }),
                cloud.getCityStoreBannerAssets().then(d => { console.log('[StoreHighlight] Assets carregados'); return d; }),
                cloud.getMyWallet().catch(err => { console.error('[StoreHighlight] Erro carteira:', err); return null; })
            ]);

            setProfile(profileData || null);
            setSettings(settingsData || null);
            setBannerAssets(assetsData || null);
            setWalletBalance(Number(walletData?.balance_decimal || walletData?.balance || 0));

            console.log('[StoreHighlight] Buscando pedidos...');
            if (profileData?.city_slug) {
                const ordersData = await cloud.getMyCityStoreHighlightOrders(profileData.city_slug);
                setOrders(ordersData || []);

                // Filtrar apenas pedidos ativos ou agendados para a cidade
                setAllCityOrders((ordersData || []).filter(o => {
                    const status = (o.status || '').toUpperCase();
                    return status === 'ACTIVE' || status === 'SCHEDULED';
                }));
            } else {
                const ordersData = await cloud.getMyCityStoreHighlightOrders();
                setOrders(ordersData || []);
            }

            console.log('[StoreHighlight] Buscando solicitações de banner...');
            const requests = await cloud.getMyCityStoreBannerRequests();
            setBannerRequests(requests);

            console.log('[StoreHighlight] Carregamento concluído com sucesso.');
        } catch (error) {
            console.error('[StoreHighlight] Erro crítico no carregamento:', error);
            showNotification('Erro ao carregar configurações. Tente atualizar a página.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();

        const supabase = cloud.getClient();
        if (!supabase) return;

        // Subscrição para atualizações de métricas em tempo real
        const channel = supabase
            .channel('highlight_metrics')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'city_store_highlight_orders'
                },
                (payload) => {
                    const updatedOrder = payload.new as CityStoreHighlightOrder;
                    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const activeOrder = useMemo(() => {
        const now = new Date();
        return orders.find(order => {
            const start = new Date(order.starts_at);
            const end = new Date(order.ends_at);
            const status = (order.status || '').toUpperCase();
            return start <= now && end > now && (status === 'ACTIVE' || status === 'SCHEDULED');
        });
    }, [orders]);

    const nextOrder = useMemo(() => {
        const now = new Date();
        const upcoming = orders
            .filter(order => new Date(order.starts_at) > now && order.status === 'SCHEDULED')
            .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
        return upcoming[0];
    }, [orders]);

    const cancelFeePercent = Number(settings?.cancel_fee || 0);
    const getCancelFeeValue = (order?: CityStoreHighlightOrder | null) => {
        if (!order) return 0;
        const amount = Number(order.amount_paid || 0);
        return Math.round((amount * (cancelFeePercent / 100)) * 100) / 100;
    };

    const handleOpenActivate = async () => {
        if (!citySlug) {
            await alert({
                title: 'Cidade nao configurada',
                message: 'Defina a cidade da sua loja em Configuracoes para ativar o destaque.'
            });
            return;
        }
        if (!days || days < 1 || days > 365) {
            await alert({ title: 'Dias invalidos', message: 'Escolha de 1 a 365 dias.' });
            return;
        }

        if (pricePreview > walletBalance) {
            setShowNoBalanceModal(true);
            return;
        }

        setShowActivateModal(true);
    };

    const handleConfirmPurchase = async () => {
        setPurchasing(true);
        try {
            const result = await cloud.purchaseCityStoreHighlight(citySlug, days);
            if (!result.success) {
                const msg = (result as any)?.error?.message || 'Nao foi possivel ativar o destaque.';
                await alert({ title: 'Falha ao ativar', message: msg });
            } else {
                await alert({ title: 'Destaque ativado', message: 'Seu destaque foi ativado para a cidade selecionada.' });
                setShowActivateModal(false);
            }
        } finally {
            setPurchasing(false);
            showNotification('Destaque ativado com sucesso! Sua loja já está no topo.', 'success');
            loadData();
        }
    };

    const handleCancelHighlight = async () => {
        if (!cancelTarget) return;
        const feeValue = getCancelFeeValue(cancelTarget);
        if (feeValue > walletBalance) {
            await alert({ title: 'Saldo insuficiente', message: 'Saldo insuficiente para pagar a taxa de cancelamento.' });
            return;
        }
        setCancelling(true);
        try {
            const result = await cloud.cancelCityStoreHighlight(cancelTarget.id);
            if (!result.success) {
                const msg = (result as any)?.error?.message || 'Nao foi possivel cancelar o destaque.';
                await alert({ title: 'Erro ao cancelar', message: msg });
            } else {
                await alert({ title: 'Destaque cancelado', message: 'Seu destaque foi cancelado com sucesso.' });
                setCancelTarget(null);
                await loadData();
            }
        } finally {
            setCancelling(false);
        }
    };

    const loadBannerMessages = async (request: CityStoreBannerRequest) => {
        setSelectedRequest(request);
        setIsChatModalOpen(true);
    };

    const handleCreateBannerRequest = async (type: 'READY' | 'DESIGN_REQUEST') => {
        if (!citySlug) {
            await alert({ title: 'Cidade não configurada', message: 'Defina a cidade da sua loja primeiro.' });
            return;
        }
        if (type === 'READY' && readyRequestTopic === 'BANNER' && !bannerUrl) {
            await alert({ title: 'Banner obrigatório', message: 'Envie o banner antes de solicitar.' });
            return;
        }

        setBannerPaymentType(type);
        setShowBannerPaymentModal(true);
    };

    const handleConfirmBannerPurchase = async (paymentMethod: 'WALLET' | 'PIX' | 'CREDIT_CARD') => {
        if (!bannerPaymentType) return;

        const price = bannerPaymentType === 'READY'
            ? Number(settings?.banner_ready_price || 150)
            : Number(settings?.banner_design_price || 250);

        if (paymentMethod === 'WALLET' && walletBalance < price) {
            await alert({ title: 'Saldo insuficiente', message: 'Você não possui saldo suficiente na carteira.' });
            return;
        }

        setProcessingBannerPayment(true);
        try {
            const notesPayload = bannerPaymentType === 'DESIGN_REQUEST' ? requestBrief : bannerNotes;

            // Pegar o tópico correto baseado no tipo de pagamento
            const currentTopic = bannerPaymentType === 'READY' ? readyRequestTopic : designRequestTopic;

            // 1. Criar a solicitação
            const requestResult = await cloud.createCityStoreBannerRequest({
                store_id: profile?.id || '',
                city_slug: citySlug,
                request_type: bannerPaymentType,
                topic: currentTopic,
                status: 'OPEN',
                banner_url: bannerUrl || null,
                notes: notesPayload || null
            });

            if (!requestResult.success || !requestResult.data) {
                await alert({ title: 'Erro', message: 'Não foi possível registrar a solicitação.' });
                return;
            }

            const requestId = requestResult.data.id;

            // 2. Processar o pagamento
            const paymentResult = await cloud.purchaseCityStoreBanner(
                citySlug,
                bannerPaymentType,
                paymentMethod,
                requestId
            );

            if (!paymentResult.success) {
                await alert({ title: 'Erro no pagamento', message: (paymentResult as any)?.error?.message || 'Falha ao processar pagamento.' });
                return;
            }

            if (bannerPaymentType === 'DESIGN_REQUEST') {
                setRequestBrief('');
            } else {
                setBannerNotes('');
                setBannerUrl('');
            }
            showNotification('Solicitação de banner enviada! Acompanhe pelo chat.', 'success');

            setShowBannerPaymentModal(false);
            await loadData();
            await alert({ title: 'Solicitação realizada', message: 'Seu pedido foi registrado e o pagamento processado com sucesso.' });

            // Abrir o chat para a nova solicitação
            const newRequest = (await cloud.getMyCityStoreBannerRequests()).find(r => r.id === requestId);
            if (newRequest) setSelectedRequest(newRequest);
            setIsChatModalOpen(true);

        } catch (error) {
            console.error('Erro ao processar compra de banner:', error);
            await alert({ title: 'Erro', message: 'Ocorreu um erro inesperado.' });
        } finally {
            setProcessingBannerPayment(false);
        }
    };


    const pricePreview = useMemo(() => {
        const basePrice = Number(settings?.highlight_price || 0);
        const baseDays = Number(settings?.highlight_duration_days || 30);
        if (!basePrice || !baseDays || !days) return 0;
        return Math.round(((basePrice / baseDays) * days) * 100) / 100;
    }, [settings, days]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Star className="w-6 h-6 text-brand-600" /> Destaque por Cidade
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Ative seu destaque para aparecer antes das lojas comuns na página da sua cidade.
                    </p>
                </div>
                {selectedRequest && (
                    <Button
                        variant="outline"
                        onClick={() => setIsChatModalOpen(true)}
                        icon={<MessageCircle className="w-4 h-4" />}
                    >
                        Abrir Chat Exclusivo
                    </Button>
                )}
            </div>

            {/* Nova Seção: Performance e Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                            <ImageIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">Alcance</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-500">Visualiza&ccedil;&otilde;es</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                                {activeOrder?.views_count || 0}
                            </h3>
                            <span className="text-xs text-emerald-600 font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">Real-time</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600">
                            <ExternalLink className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-lg">Intera&ccedil;&atilde;o</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-500">Cliques no Perfil</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                                {activeOrder?.clicks_count || 0}
                            </h3>
                            <span className="text-xs text-emerald-600 font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">Live</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg">Efici&ecirc;ncia</span>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-gray-500">Taxa de Convers&atilde;o (CTR)</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                                {activeOrder?.views_count ? ((activeOrder.clicks_count || 0) / activeOrder.views_count * 100).toFixed(1) : '0.0'}%
                            </h3>
                            <span className="text-xs text-gray-400 font-bold mb-1">Impacto Real</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nova Seção: Disponibilidade na Cidade (Calendário) */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm animate-in fade-in zoom-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <Calendar className="w-6 h-6 text-brand-600" />
                            Disponibilidade em {profile?.city || 'sua cidade'}
                        </h3>
                        <p className="text-sm text-gray-500 font-bold">Confira os períodos já reservados por outros parceiros</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {allCityOrders.length === 0 ? (
                        <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-gray-900/10 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                            <Calendar className="w-12 h-12 mb-3 opacity-20" />
                            <p className="font-black uppercase tracking-widest text-xs text-center">Nenhuma reserva para os próximos dias</p>
                        </div>
                    ) : (
                        allCityOrders.map((order, idx) => (
                            <div key={order.id || idx} className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-brand-200 transition-colors">
                                <p className="text-sm font-black text-gray-900 dark:text-white mb-1">Destaque Ativo</p>
                                <p className="text-[11px] font-bold text-gray-500">
                                    {new Date(order.starts_at).toLocaleDateString()} &mdash; {new Date(order.ends_at).toLocaleDateString()}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Seção Informativa: Como Funciona */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500">
                <div className="bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/10 dark:to-gray-800 p-6 rounded-3xl border border-brand-100 dark:border-brand-900/20 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <Star className="w-32 h-32 text-brand-600" />
                    </div>
                    <div className="relative space-y-3">
                        <div className="flex items-center gap-2 text-brand-700 dark:text-brand-400 font-black uppercase text-xs tracking-widest">
                            <Info className="w-4 h-4" /> Destaque por Cidade
                        </div>
                        <h4 className="text-lg font-black text-gray-900 dark:text-white">Apareça no topo das buscas</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            Ao ativar o destaque, sua loja será exibida prioritariamente no topo da lista de estabelecimentos da sua cidade, garantindo máxima visibilidade e aumento nas vendas.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Ativação Imediata
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Topo da Lista
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/10 dark:to-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <ImageIcon className="w-32 h-32 text-gray-900 dark:text-white" />
                    </div>
                    <div className="relative space-y-3">
                        <div className="flex items-center gap-2 text-gray-500 font-black uppercase text-xs tracking-widest">
                            <HelpCircle className="w-4 h-4" /> Banner da sua Cidade
                        </div>
                        <h4 className="text-lg font-black text-gray-900 dark:text-white">Sua marca em destaque principal</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            O banner ocupa o espaço mais premium do aplicativo e site em sua cidade. Ideal para promoções especiais, lançamento de cardápio ou reforço de marca exclusivo.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Máxima Exposição
                            </div>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Sucesso Garantido
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-10 text-center text-gray-500">
                    Carregando configuracoes...
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-7 space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm font-bold">Cidade ativa</span>
                            </div>
                            <span className="text-sm font-black text-gray-900 dark:text-white">
                                {citySlug || 'Nao definido'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                <p className="text-xs uppercase tracking-wider text-gray-400">Valor base (30 dias)</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">
                                    {settings ? formatCurrency(Number(settings.highlight_price || 0)) : 'R$ 0,00'}
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                <p className="text-xs uppercase tracking-wider text-gray-400">Duracao base</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">
                                    {settings ? `${settings.highlight_duration_days || 30} dias` : '--'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Quantos dias voce quer</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={365}
                                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white text-2xl font-black"
                                    value={days}
                                    onChange={e => setDays(Number(e.target.value))}
                                />
                            </div>
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                                <p className="text-xs uppercase tracking-wider text-gray-400">Valor calculado</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">
                                    {formatCurrency(pricePreview)}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button onClick={handleOpenActivate} disabled={loading || purchasing || !settings} icon={<Star className="w-4 h-4" />}>
                                {purchasing ? 'Processando...' : 'Ativar destaque'}
                            </Button>
                        </div>

                        {!citySlug && (
                            <div className="flex items-center gap-2 p-4 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="text-sm font-bold">
                                    Configure a cidade da loja em Configuracoes para ativar o destaque.
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-7 space-y-5">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-bold">Status atual</span>
                        </div>

                        {activeOrder ? (
                            <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 space-y-1">
                                <div className="flex items-center gap-2 font-bold">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Destaque ativo
                                </div>
                                <p className="text-xs">Valido ate {formatDateTime(activeOrder.ends_at)}</p>
                            </div>
                        ) : nextOrder ? (
                            <div className="p-4 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 space-y-1">
                                <div className="flex items-center gap-2 font-bold">
                                    <Calendar className="w-4 h-4" />
                                    Destaque agendado
                                </div>
                                <p className="text-xs">Inicia em {formatDateTime(nextOrder.starts_at)}</p>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl bg-gray-50 text-gray-500 border border-gray-100">
                                Nenhum destaque ativo no momento.
                            </div>
                        )}

                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-7">
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">Historico de destaques</h3>
                {orders.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhuma compra registrada.</p>
                ) : (
                    <div className="space-y-3">
                        {orders.map(order => {
                            const status = (order.status || '').toUpperCase();
                            const canCancel = status === 'ACTIVE' || status === 'SCHEDULED';
                            return (
                                <div key={order.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                    <div className="space-y-1">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            Cidade: {order.city_slug}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {formatDateTime(order.starts_at)} - {formatDateTime(order.ends_at)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-start md:items-end gap-2">
                                        <div className="text-right">
                                            <p className="text-sm font-black text-gray-900 dark:text-white">{formatCurrency(Number(order.amount_paid || 0))}</p>
                                            <p className="text-xs text-gray-500">{formatHighlightStatus(order.status)}</p>
                                        </div>
                                        {canCancel && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setCancelTarget(order)}
                                                icon={<AlertTriangle className="w-4 h-4" />}
                                            >
                                                Cancelar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-7 space-y-6">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-brand-600" />
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">Banner da sua cidade</h3>
                    </div>
                    <p className="text-sm text-gray-500">Envie o banner pronto ou peca a criacao para a plataforma.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-black text-gray-900 dark:text-white">Enviar banner pronto</p>
                                <span className="text-[11px] uppercase tracking-wider text-gray-400">Envio rapido</span>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <label className="block text-xs font-bold text-gray-500">Arquivo do banner</label>
                                    <ImageUpload
                                        label="Banner (1600x400 recomendado)"
                                        currentImageUrl={bannerUrl}
                                        onImageUploaded={(url) => setBannerUrl(url)}
                                        folderPath="city_banners_store"
                                    />
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Observacoes</label>
                                        <textarea
                                            className="w-full min-h-[90px] max-h-[160px] p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white resize-none overflow-y-auto"
                                            value={bannerNotes}
                                            onChange={e => setBannerNotes(e.target.value)}
                                            placeholder="Detalhes sobre o banner ou a campanha."
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Assunto</label>
                                            <div className="relative">
                                                <CustomSelect value={readyRequestTopic} options={topicOptions} onChange={(val) => setReadyRequestTopic(val as any)} />
                                            </div>
                                        </div>
                                        <div className="flex md:justify-end">
                                            <Button onClick={() => handleCreateBannerRequest("READY")} icon={<ImageIcon className="w-4 h-4" />}>
                                                Enviar banner
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden xl:flex items-center justify-center bg-gray-100/50 dark:bg-gray-900/20 rounded-2xl p-4">
                                    <MobileBannerPreview imageUrl={bannerUrl} storeName={profile?.store_name} />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-black text-gray-900 dark:text-white">Pedir criacao</p>
                                <span className="text-[11px] uppercase tracking-wider text-gray-400">Briefing</span>
                            </div>
                            <label className="block text-xs font-bold text-gray-500">Como voce quer o banner</label>
                            <textarea
                                className="w-full min-h-[110px] max-h-[200px] p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white resize-none overflow-y-auto"
                                value={requestBrief}
                                onChange={e => setRequestBrief(e.target.value)}
                                placeholder="Explique cores, texto, oferta, periodo e qualquer referencia visual."
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Assunto</label>
                                    <div className="relative">
                                        <CustomSelect value={designRequestTopic} options={topicOptions} onChange={(val) => setDesignRequestTopic(val as any)} />
                                    </div>
                                </div>
                                <div className="flex md:justify-end">
                                    <Button variant="outline" onClick={() => handleCreateBannerRequest("DESIGN_REQUEST")} icon={<MessageCircle className="w-4 h-4" />}>
                                        Pedir criacao
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wider text-gray-400">Gabaritos</p>
                            {bannerAssets?.template_link ? (
                                <a className="text-sm font-bold text-brand-600 hover:underline" href={bannerAssets.template_link} target="_blank" rel="noreferrer">
                                    Baixar gabaritos
                                </a>
                            ) : (
                                <p className="text-xs text-gray-500">Ainda nao disponivel.</p>
                            )}
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wider text-gray-400">Projeto Canva</p>
                            {bannerAssets?.canva_link ? (
                                <a className="text-sm font-bold text-brand-600 hover:underline" href={bannerAssets.canva_link} target="_blank" rel="noreferrer">
                                    Abrir projeto
                                </a>
                            ) : (
                                <p className="text-xs text-gray-500">Ainda nao disponivel.</p>
                            )}
                        </div>

                        <div className="pt-2">
                            <h4 className="text-sm font-black text-gray-900 dark:text-white">Solicitacoes</h4>
                            {bannerRequests.length === 0 ? (
                                <p className="text-xs text-gray-500">Nenhuma solicitacao.</p>
                            ) : (
                                bannerRequests.map(request => (
                                    <button
                                        key={request.id}
                                        className={`w-full text-left p-3 rounded-2xl border ${selectedRequest?.id === request.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'}`}
                                        onClick={() => loadBannerMessages(request)}
                                    >
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{request.city_slug}</p>
                                        <p className="text-xs text-gray-500">{formatRequestTopic(request.topic)} - {formatRequestType(request.request_type)}</p>
                                        <p className="text-xs text-gray-500">{formatHighlightStatus(request.status)}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <BaseModal
                isOpen={showActivateModal}
                onClose={() => setShowActivateModal(false)}
                title="Confirmar destaque"
                icon={<Star className="w-5 h-5 text-brand-600" />}
            >
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>Voce esta prestes a ativar o destaque na cidade <strong className="text-gray-900 dark:text-white">{citySlug || '-'}</strong>.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wider text-gray-400">Dias</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{days} dias</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wider text-gray-400">Valor total</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(pricePreview)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wider text-gray-400">Saldo atual</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(walletBalance)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wider text-gray-400">Taxa de cancelamento (%)</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{formatPercent(settings?.cancel_fee)}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        Se cancelar o destaque antes do fim, sera cobrada a taxa de cancelamento configurada.
                    </p>
                    <div className="flex flex-col md:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowActivateModal(false)}>Cancelar</Button>
                        <Button onClick={handleConfirmPurchase} loading={purchasing}>Confirmar ativacao</Button>
                    </div>
                </div>
            </BaseModal>

            <BaseModal
                isOpen={showNoBalanceModal}
                onClose={() => setShowNoBalanceModal(false)}
                title="Saldo insuficiente"
                icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
            >
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>Voce nao possui saldo suficiente para ativar o destaque.</p>
                    <div className="flex flex-col md:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowNoBalanceModal(false)}>Fechar</Button>
                        <Button onClick={() => { setShowNoBalanceModal(false); window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'zebank' } })); }}>
                            Ir para Ze Bank
                        </Button>
                    </div>
                </div>
            </BaseModal>

            <BaseModal
                isOpen={!!cancelTarget}
                onClose={() => setCancelTarget(null)}
                title="Cancelar destaque"
                icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            >
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>Ao cancelar o destaque selecionado, sera cobrada a taxa abaixo.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wider text-gray-400">Taxa de cancelamento (%)</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{formatPercent(cancelFeePercent)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wider text-gray-400">Valor estimado</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(getCancelFeeValue(cancelTarget))}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">Cidade: {cancelTarget?.city_slug || '-'}</p>
                    <div className="flex flex-col md:flex-row gap-2">
                        <Button variant="outline" onClick={() => setCancelTarget(null)}>Voltar</Button>
                        <Button variant="danger" onClick={handleCancelHighlight} loading={cancelling}>Confirmar cancelamento</Button>
                    </div>
                </div>
            </BaseModal>
            <BaseModal
                isOpen={showBannerPaymentModal}
                onClose={() => setShowBannerPaymentModal(false)}
                title="Pagamento do Banner"
                icon={<CreditCard className="w-6 h-6 text-brand-600" />}
            >
                <div className="space-y-6">
                    <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-gray-500">Valor do serviço:</span>
                            <span className="text-xl font-black text-gray-900 dark:text-white">
                                {formatCurrency(bannerPaymentType === 'READY'
                                    ? Number(settings?.banner_ready_price || 150)
                                    : Number(settings?.banner_design_price || 250))}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest font-black">
                            <Clock className="w-3 h-3" /> Duração: {settings?.banner_duration_days || 30} dias
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase">Escolha a forma de pagamento</p>

                        <button
                            onClick={() => handleConfirmBannerPurchase('WALLET')}
                            disabled={processingBannerPayment}
                            className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-brand-500 bg-white dark:bg-gray-800 transition-all group active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl text-brand-600">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Saldo da Carteira</p>
                                    <p className="text-xs text-gray-500">Seu saldo: {formatCurrency(walletBalance)}</p>
                                </div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />
                        </button>

                        <button
                            onClick={() => handleConfirmBannerPurchase('PIX')}
                            disabled={processingBannerPayment}
                            className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-brand-500 bg-white dark:bg-gray-800 transition-all group active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600">
                                    <FileCheck className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">PIX Dinâmico</p>
                                    <p className="text-xs text-gray-500">Liberação automática após pagamento</p>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-300" />
                        </button>

                        <button
                            onClick={() => handleConfirmBannerPurchase('CREDIT_CARD')}
                            disabled={processingBannerPayment}
                            className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-brand-500 bg-white dark:bg-gray-800 transition-all group active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Cartão de Crédito</p>
                                    <p className="text-xs text-gray-500">Parcele sua publicidade</p>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-300" />
                        </button>
                    </div>

                    {processingBannerPayment && (
                        <div className="flex items-center justify-center gap-3 p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600 font-bold text-sm animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" /> Processando seu pedido...
                        </div>
                    )}
                </div>
            </BaseModal>

            <ChatExclusivoModal
                isOpen={isChatModalOpen}
                onClose={() => setIsChatModalOpen(false)}
                requestId={selectedRequest?.id || ''}
            />

            {/* Espaçamento extra no rodapé para garantir que os selects não sejam cortados */}
            <div className="pb-32" />
        </div>
    );
};
