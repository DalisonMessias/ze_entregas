import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, Clock, MapPin, Star, Image as ImageIcon, MessageCircle } from 'lucide-react';
import * as cloud from '../services/cloud';
import { CityStoreHighlightOrder, CityStoreHighlightSettings, PartnerProfile, CityStoreBannerAssets, CityStoreBannerRequest, CityStoreBannerRequestMessage } from '../types';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import { ImageUpload } from './ImageUpload';
import { BaseModal } from './BaseModal';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatPercent = (val?: number) => `${Number(val || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
const formatDateTime = (iso?: string) => iso ? new Date(iso).toLocaleString('pt-BR') : '-';
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

export const StoreHighlight: React.FC = () => {
    const { alert } = useDialog();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [settings, setSettings] = useState<CityStoreHighlightSettings | null>(null);
    const [orders, setOrders] = useState<CityStoreHighlightOrder[]>([]);
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
    const [requestTopic, setRequestTopic] = useState<'BANNER' | 'HIGHLIGHT'>('BANNER');
    const [loadingBannerChat, setLoadingBannerChat] = useState(false);
    const [showActivateModal, setShowActivateModal] = useState(false);
    const [showNoBalanceModal, setShowNoBalanceModal] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<CityStoreHighlightOrder | null>(null);
    const [cancelling, setCancelling] = useState(false);

    const citySlug = profile?.city_slug || '';

    const loadData = async () => {
        setLoading(true);
        try {
            const [profileData, settingsData, assetsData, walletData] = await Promise.all([
                cloud.getMyPartnerProfile(),
                cloud.getCityStoreHighlightSettings(),
                cloud.getCityStoreBannerAssets(),
                cloud.getMyWallet().catch(() => null)
            ]);
            setProfile(profileData || null);
            setSettings(settingsData || null);
            setBannerAssets(assetsData || null);
            setWalletBalance(Number(walletData?.balance_decimal || walletData?.balance || 0));

            if (profileData?.city_slug) {
                const ordersData = await cloud.getMyCityStoreHighlightOrders(profileData.city_slug);
                setOrders(ordersData || []);
            } else {
                const ordersData = await cloud.getMyCityStoreHighlightOrders();
                setOrders(ordersData || []);
            }

            const requestData = await cloud.getMyCityStoreBannerRequests();
            setBannerRequests(requestData || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
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
                await loadData();
            }
        } finally {
            setPurchasing(false);
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
        setLoadingBannerChat(true);
        try {
            const data = await cloud.getCityStoreBannerRequestMessages(request.id);
            setRequestMessages(data || []);
            setSelectedRequest(request);
        } finally {
            setLoadingBannerChat(false);
        }
    };

    const handleCreateBannerRequest = async (type: 'READY' | 'DESIGN_REQUEST') => {
        if (!citySlug) {
            await alert({ title: 'Cidade nao configurada', message: 'Defina a cidade da sua loja primeiro.' });
            return;
        }
        if (type === 'READY' && requestTopic === 'BANNER' && !bannerUrl) {
            await alert({ title: 'Banner obrigatorio', message: 'Envie o banner antes de solicitar.' });
            return;
        }

        const result = await cloud.createCityStoreBannerRequest({
            store_id: profile?.id || '',
            city_slug: citySlug,
            request_type: type,
            topic: requestTopic,
            status: 'OPEN',
            banner_url: bannerUrl || null,
            notes: bannerNotes || null
        });

        if (!result.success) {
            await alert({ title: 'Erro', message: 'Nao foi possivel enviar a solicitacao.' });
            return;
        }
        setBannerNotes('');
        setBannerUrl('');
        await loadData();
        await alert({ title: 'Solicitacao enviada', message: 'Sua solicitacao foi registrada.' });
    };

    const handleSendBannerMessage = async () => {
        if (!selectedRequest || !requestMessage.trim()) return;
        const result = await cloud.sendCityStoreBannerRequestMessage(selectedRequest.id, 'store', requestMessage.trim());
        if (!result.success) {
            await alert({ title: 'Erro', message: 'Nao foi possivel enviar a mensagem.' });
            return;
        }
        setRequestMessage('');
        await loadBannerMessages(selectedRequest);
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
                        Ative seu destaque para aparecer antes das lojas comuns na pagina da sua cidade.
                    </p>
                </div>
                <Button onClick={handleOpenActivate} disabled={loading || purchasing || !settings} icon={<Star className="w-4 h-4" />}>
                    {purchasing ? 'Processando...' : 'Ativar destaque'}
                </Button>
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
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Quantos dias voce quer</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={365}
                                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
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

            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 space-y-6">
                <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-brand-600" />
                    <h3 className="text-lg font-black text-gray-900 dark:text-white">Banner da sua cidade</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Envie seu banner pronto</label>
                            <ImageUpload
                                label="Banner (1600x400 recomendado)"
                                currentImageUrl={bannerUrl}
                                onImageUploaded={(url) => setBannerUrl(url)}
                                folderPath="city_banners_store"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Observacoes</label>
                            <textarea
                                className="w-full min-h-[120px] p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                value={bannerNotes}
                                onChange={e => setBannerNotes(e.target.value)}
                                placeholder="Detalhes sobre o banner ou a campanha."
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button onClick={() => handleCreateBannerRequest('READY')} icon={<ImageIcon className="w-4 h-4" />}>
                                Enviar banner pronto
                            </Button>
                            <Button variant="outline" onClick={() => handleCreateBannerRequest('DESIGN_REQUEST')} icon={<MessageCircle className="w-4 h-4" />}>
                                Pedir criacao para a plataforma
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wider text-gray-400">Gabaritos</p>
                            {bannerAssets?.template_link ? (
                                <a className="text-sm font-bold text-brand-600 hover:underline" href={bannerAssets.template_link} target="_blank" rel="noreferrer">
                                    Baixar gabaritos
                                </a>
                            ) : (
                                <p className="text-xs text-gray-500">Ainda nao disponivel.</p>
                            )}
                        </div>
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wider text-gray-400">Projeto Canva</p>
                            {bannerAssets?.canva_link ? (
                                <a className="text-sm font-bold text-brand-600 hover:underline" href={bannerAssets.canva_link} target="_blank" rel="noreferrer">
                                    Abrir projeto
                                </a>
                            ) : (
                                <p className="text-xs text-gray-500">Ainda nao disponivel.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-3">
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
                                    <p className="text-xs text-gray-500">{formatRequestType(request.request_type)} • {formatHighlightStatus(request.status)}</p>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="lg:col-span-2 space-y-3">
                        <h4 className="text-sm font-black text-gray-900 dark:text-white">Chat exclusivo</h4>
                        <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-gray-50 dark:bg-gray-900 max-h-[280px] overflow-y-auto space-y-3">
                            {loadingBannerChat ? (
                                <div className="flex justify-center py-6">
                                    <div className="w-5 h-5 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
                                </div>
                            ) : requestMessages.length === 0 ? (
                                <p className="text-xs text-gray-500">Nenhuma mensagem ainda.</p>
                            ) : (
                                requestMessages.map(msg => (
                                    <div key={msg.id} className={`p-3 rounded-xl ${msg.sender_role === 'store' ? 'bg-brand-600 text-white ml-auto' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100'} max-w-[80%]`}>
                                        <p className="text-xs font-bold mb-1">{msg.sender_role === 'store' ? 'Voce' : 'Admin'} • {formatDateTime(msg.created_at)}</p>
                                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex flex-col md:flex-row gap-2">
                            <input
                                type="text"
                                className="flex-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                placeholder="Digite sua mensagem..."
                                value={requestMessage}
                                onChange={e => setRequestMessage(e.target.value)}
                            />
                            <Button onClick={handleSendBannerMessage} icon={<MessageCircle className="w-4 h-4" />}>
                                Enviar
                            </Button>
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
                            <p className="text-xs uppercase tracking-wider text-gray-400">Taxa de cancelamento</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(Number(settings?.cancel_fee || 0))}</p>
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
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                title="Cancelar destaque"
                icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
            >
                <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                    <p>Ao cancelar o destaque ativo ou agendado, sera cobrada a taxa abaixo.</p>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                        <p className="text-xs uppercase tracking-wider text-gray-400">Taxa de cancelamento</p>
                        <p className="text-lg font-black text-gray-900 dark:text-white">{formatCurrency(Number(settings?.cancel_fee || 0))}</p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2">
                        <Button variant="outline" onClick={() => setShowCancelModal(false)}>Voltar</Button>
                        <Button variant="danger" onClick={handleCancelHighlight} loading={cancelling}>Confirmar cancelamento</Button>
                    </div>
                </div>
            </BaseModal>
        </div>
    );
};
