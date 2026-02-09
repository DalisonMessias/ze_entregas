import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Link2, MapPin, Calendar, Image as ImageIcon, X, Loader2, Star, Wallet, Clock, MessageCircle } from 'lucide-react';
import * as cloud from '../services/cloud';
import { CityStoreBanner, CityStoreHighlightOrder, CityStoreHighlightSettings, CityStoreBannerAssets, CityStoreBannerRequest, CityStoreBannerRequestMessage } from '../types';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import { ImageUpload } from './ImageUpload';
import { Switch } from './Switch';
import { MobileTabsSelect } from './MobileTabsSelect';

const toLocalInputValue = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const formatCurrency = (val?: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const formatPercent = (val?: number) => `${Number(val || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
const formatDateTime = (value?: string) => value ? new Date(value).toLocaleString('pt-BR') : '-';

export const AdminCityBanners: React.FC = () => {
    const { confirm, alert } = useDialog();
    const [activeTab, setActiveTab] = useState<'banners' | 'highlight'>('banners');
    const [banners, setBanners] = useState<CityStoreBanner[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<CityStoreBanner | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [highlightSettings, setHighlightSettings] = useState<CityStoreHighlightSettings | null>(null);
    const [highlightForm, setHighlightForm] = useState({
        highlight_price: '',
        highlight_duration_days: '30',
        cancel_fee: '',
        banner_ready_price: '',
        banner_design_price: '',
        banner_duration_days: '30',
        banner_enabled: true,
        highlight_enabled: true
    });
    const [highlightOrders, setHighlightOrders] = useState<CityStoreHighlightOrder[]>([]);
    const [loadingHighlights, setLoadingHighlights] = useState(false);
    const [savingHighlights, setSavingHighlights] = useState(false);
    const [bannerAssets, setBannerAssets] = useState<CityStoreBannerAssets | null>(null);
    const [assetsForm, setAssetsForm] = useState({ template_link: '', canva_link: '' });
    const [bannerRequests, setBannerRequests] = useState<CityStoreBannerRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<CityStoreBannerRequest | null>(null);
    const [requestMessages, setRequestMessages] = useState<CityStoreBannerRequestMessage[]>([]);
    const [requestMessageInput, setRequestMessageInput] = useState('');
    const [loadingRequests, setLoadingRequests] = useState(false);

    const [formData, setFormData] = useState<Partial<CityStoreBanner>>({
        name: '',
        city_slug: '',
        image_url: '',
        link: '',
        is_active: true,
        sort_order: 0,
        starts_at: '',
        ends_at: ''
    });

    useEffect(() => {
        loadBanners();
    }, []);

    useEffect(() => {
        if (activeTab === 'highlight') {
            loadHighlightData();
        }
    }, [activeTab]);

    const loadBanners = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetCityStoreBanners();
            setBanners(data || []);
        } catch (error) {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const loadHighlightData = async () => {
        setLoadingHighlights(true);
        try {
            const [settingsData, ordersData, assetsData, requestsData] = await Promise.all([
                cloud.getCityStoreHighlightSettings(),
                cloud.adminGetCityStoreHighlightOrders(),
                cloud.getCityStoreBannerAssets(),
                cloud.adminGetCityStoreBannerRequests()
            ]);
            setHighlightSettings(settingsData || null);
            setHighlightOrders(ordersData || []);
            setHighlightForm({
                highlight_price: settingsData?.highlight_price?.toString() || '',
                highlight_duration_days: settingsData?.highlight_duration_days?.toString() || '30',
                cancel_fee: settingsData?.cancel_fee?.toString() || '0',
                banner_ready_price: settingsData?.banner_ready_price?.toString() || '150',
                banner_design_price: settingsData?.banner_design_price?.toString() || '250',
                banner_duration_days: settingsData?.banner_duration_days?.toString() || '30',
                banner_enabled: settingsData?.banner_enabled ?? true,
                highlight_enabled: settingsData?.highlight_enabled ?? true
            });
            setBannerAssets(assetsData || null);
            setAssetsForm({
                template_link: assetsData?.template_link || '',
                canva_link: assetsData?.canva_link || ''
            });
            setBannerRequests(requestsData || []);
        } finally {
            setLoadingHighlights(false);
        }
    };

    const loadRequestMessages = async (request: CityStoreBannerRequest) => {
        setLoadingRequests(true);
        try {
            const data = await cloud.getCityStoreBannerRequestMessages(request.id);
            setRequestMessages(data || []);
            setSelectedRequest(request);
        } finally {
            setLoadingRequests(false);
        }
    };

    const handleOpenModal = (banner?: CityStoreBanner) => {
        if (banner) {
            setEditingBanner(banner);
            setFormData({
                ...banner,
                starts_at: toLocalInputValue(banner.starts_at),
                ends_at: toLocalInputValue(banner.ends_at)
            });
        } else {
            setEditingBanner(null);
            setFormData({
                name: '',
                city_slug: '',
                image_url: '',
                link: '',
                is_active: true,
                sort_order: 0,
                starts_at: '',
                ends_at: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.city_slug || !formData.image_url) {
            await alert({ title: 'Campos obrigatorios', message: 'Informe nome, cidade (slug) e imagem.' });
            return;
        }

        setIsSaving(true);
        try {
            const payload: Partial<CityStoreBanner> = {
                name: formData.name?.trim(),
                city_slug: formData.city_slug?.trim(),
                image_url: formData.image_url,
                link: formData.link?.trim() || null,
                is_active: formData.is_active ?? true,
                sort_order: Number(formData.sort_order || 0),
                starts_at: formData.starts_at ? new Date(formData.starts_at as string).toISOString() : null,
                ends_at: formData.ends_at ? new Date(formData.ends_at as string).toISOString() : null
            };

            if (editingBanner) {
                await cloud.adminUpdateCityStoreBanner(editingBanner.id, payload);
                await alert({ title: 'Sucesso', message: 'Banner atualizado com sucesso.' });
            } else {
                await cloud.adminCreateCityStoreBanner(payload);
                await alert({ title: 'Sucesso', message: 'Banner criado com sucesso.' });
            }

            setIsModalOpen(false);
            await loadBanners();
        } catch (error: any) {
            await alert({ title: 'Erro ao salvar', message: error?.message || 'Erro desconhecido.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: 'Excluir banner',
            message: 'Tem certeza que deseja excluir este banner?'
        });
        if (!ok) return;

        setLoading(true);
        try {
            await cloud.adminDeleteCityStoreBanner(id);
            setBanners(prev => prev.filter(b => b.id !== id));
        } finally {
            setLoading(false);
        }
    };

    const handleSaveHighlightSettings = async () => {
        const price = Number(highlightForm.highlight_price);
        const cancelFee = Number(highlightForm.cancel_fee);

        if (!price || price <= 0) {
            await alert({ title: 'Campos obrigatorios', message: 'Informe um valor valido.' });
            return;
        }
        if (cancelFee < 0) {
            await alert({ title: 'Taxa invalida', message: 'A taxa de cancelamento nao pode ser negativa.' });
            return;
        }

        setSavingHighlights(true);
        try {
            const result = await cloud.adminUpdateCityStoreHighlightSettings({
                highlight_price: price,
                highlight_duration_days: Number(highlightForm.highlight_duration_days),
                cancel_fee: cancelFee,
                banner_ready_price: Number(highlightForm.banner_ready_price),
                banner_design_price: Number(highlightForm.banner_design_price),
                banner_duration_days: Number(highlightForm.banner_duration_days),
                banner_enabled: highlightForm.banner_enabled,
                highlight_enabled: highlightForm.highlight_enabled
            });
            if (!result.success) {
                await alert({ title: 'Erro ao salvar', message: 'Nao foi possivel atualizar as configuracoes.' });
                return;
            }
            await alert({ title: 'Configuracoes salvas', message: 'Configurações atualizadas com sucesso.' });
            await loadHighlightData();
        } finally {
            setSavingHighlights(false);
        }
    };

    const handleSaveAssets = async () => {
        setSavingHighlights(true);
        try {
            const result = await cloud.adminUpdateCityStoreBannerAssets({
                template_link: assetsForm.template_link?.trim() || null,
                canva_link: assetsForm.canva_link?.trim() || null
            });
            if (!result.success) {
                await alert({ title: 'Erro ao salvar', message: 'Nao foi possivel atualizar os links.' });
                return;
            }
            await alert({ title: 'Links salvos', message: 'Links atualizados com sucesso.' });
            await loadHighlightData();
        } finally {
            setSavingHighlights(false);
        }
    };

    const handleUpdateRequestStatus = async (request: CityStoreBannerRequest, status: string) => {
        const result = await cloud.adminUpdateCityStoreBannerRequest(request.id, { status });
        if (!result.success) {
            await alert({ title: 'Erro', message: 'Nao foi possivel atualizar o status.' });
            return;
        }
        await loadHighlightData();
        if (selectedRequest?.id === request.id) {
            setSelectedRequest({ ...request, status });
        }
    };

    const handleSendMessage = async () => {
        if (!selectedRequest || !requestMessageInput.trim()) return;
        const result = await cloud.sendCityStoreBannerRequestMessage(selectedRequest.id, 'admin', requestMessageInput.trim());
        if (!result.success) {
            await alert({ title: 'Erro', message: 'Nao foi possivel enviar a mensagem.' });
            return;
        }
        setRequestMessageInput('');
        await loadRequestMessages(selectedRequest);
    };

    const getStatusBadgeClasses = (status?: string) => {
        switch ((status || '').toUpperCase()) {
            case 'ACTIVE':
                return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'SCHEDULED':
                return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'CANCELLED':
                return 'bg-red-50 text-red-600 border-red-100';
            case 'EXPIRED':
            default:
                return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

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

    const activeHighlightCount = (() => {
        const now = new Date();
        return highlightOrders.filter(order => {
            const start = new Date(order.starts_at);
            const end = new Date(order.ends_at);
            const status = (order.status || '').toUpperCase();
            return start <= now && end > now && status !== 'CANCELLED' && status !== 'EXPIRED';
        }).length;
    })();

    return (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <MapPin className="w-6 h-6 text-brand-600" /> Banners por Cidade
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Banners exibidos no topo das lojas por cidade.</p>
                    </div>
                    {activeTab === 'banners' && (
                        <Button onClick={() => handleOpenModal()}>
                            <Plus className="w-4 h-4 mr-2" /> Novo Banner
                        </Button>
                    )}
                </div>

                <MobileTabsSelect
                    value={activeTab}
                    onChange={(val) => setActiveTab(val as 'banners' | 'highlight')}
                    options={[
                        { value: 'banners', label: 'Banners' },
                        { value: 'highlight', label: 'Destaque pago' }
                    ]}
                    label="Seção de Banners"
                    className="md:hidden"
                />
                <div className="hidden md:flex flex-wrap gap-2">
                    <Button
                        variant={activeTab === 'banners' ? 'primary' : 'outline'}
                        onClick={() => setActiveTab('banners')}
                        icon={<ImageIcon className="w-4 h-4" />}
                    >
                        Banners
                    </Button>
                    <Button
                        variant={activeTab === 'highlight' ? 'primary' : 'outline'}
                        onClick={() => setActiveTab('highlight')}
                        icon={<Star className="w-4 h-4" />}
                    >
                        Destaque pago
                    </Button>
                </div>
            </div>

            {activeTab === 'banners' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-20 flex justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
                        </div>
                    ) : banners.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">Nenhum banner configurado.</p>
                            <Button variant="outline" className="mt-4" onClick={() => handleOpenModal()}>
                                Criar primeiro banner
                            </Button>
                        </div>
                    ) : (
                        banners.map(banner => (
                            <div key={banner.id} className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all group">
                                <div className="aspect-[16/4] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                                    <img
                                        src={banner.image_url}
                                        alt={banner.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <button
                                            onClick={() => handleOpenModal(banner)}
                                            className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full text-gray-700 dark:text-white hover:text-brand-600 shadow-sm"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(banner.id)}
                                            className="p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full text-red-500 hover:bg-red-50 shadow-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {!banner.is_active && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/30">Inativo</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 space-y-3">
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{banner.name}</h3>
                                    <div className="flex flex-wrap gap-3">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {banner.city_slug}
                                        </div>
                                        {banner.link && (
                                            <div className="flex items-center gap-1.5 text-xs text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-2 py-1 rounded-lg">
                                                <Link2 className="w-3.5 h-3.5" />
                                                Link ativo
                                            </div>
                                        )}
                                        {(banner.starts_at || banner.ends_at) && (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Agenda
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-7 space-y-5">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                <Wallet className="w-5 h-5 text-brand-600" />
                                <h3 className="text-lg font-black">Configuracao do destaque pago</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                                        <Star className="w-4 h-4 text-amber-500" /> Destaque da Loja
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Preço (Base)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white text-sm"
                                                value={highlightForm.highlight_price}
                                                onChange={e => setHighlightForm(prev => ({ ...prev, highlight_price: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Duração (Dias)</label>
                                            <input
                                                type="number"
                                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white text-sm"
                                                value={highlightForm.highlight_duration_days}
                                                onChange={e => setHighlightForm(prev => ({ ...prev, highlight_duration_days: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Taxa Cancel. (%)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white text-sm"
                                                value={highlightForm.cancel_fee}
                                                onChange={e => setHighlightForm(prev => ({ ...prev, cancel_fee: e.target.value }))}
                                            />
                                        </div>
                                        <div className="flex items-end pb-1">
                                            <Switch
                                                label="Habilitar Destaque"
                                                checked={highlightForm.highlight_enabled}
                                                onChange={val => setHighlightForm(prev => ({ ...prev, highlight_enabled: val }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-blue-500" /> Banners da Cidade
                                    </h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Preço Pronto</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white text-sm"
                                                value={highlightForm.banner_ready_price}
                                                onChange={e => setHighlightForm(prev => ({ ...prev, banner_ready_price: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Preço Design</label>
                                            <input
                                                type="number"
                                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white text-sm"
                                                value={highlightForm.banner_design_price}
                                                onChange={e => setHighlightForm(prev => ({ ...prev, banner_design_price: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Duração (Dias)</label>
                                            <input
                                                type="number"
                                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white text-sm"
                                                value={highlightForm.banner_duration_days}
                                                onChange={e => setHighlightForm(prev => ({ ...prev, banner_duration_days: e.target.value }))}
                                            />
                                        </div>
                                        <div className="flex items-end pb-1">
                                            <Switch
                                                label="Habilitar Banners"
                                                checked={highlightForm.banner_enabled}
                                                onChange={val => setHighlightForm(prev => ({ ...prev, banner_enabled: val }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button onClick={handleSaveHighlightSettings} disabled={savingHighlights} icon={<Star className="w-4 h-4" />}>
                                    {savingHighlights ? 'Salvando...' : 'Salvar configuracoes'}
                                </Button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-7 space-y-4">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                <Clock className="w-5 h-5 text-brand-600" />
                                <h3 className="text-lg font-black">Resumo</h3>
                            </div>
                            {loadingHighlights ? (
                                <div className="flex justify-center py-6">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                                </div>
                            ) : (
                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                    <div className="flex items-center justify-between">
                                        <span>Valor atual</span>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(Number(highlightSettings?.highlight_price || 0))}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Duracao</span>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {highlightSettings?.highlight_duration_days || 30} dias
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Pagamentos ativos</span>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {activeHighlightCount}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Taxa de cancelamento</span>
                                        <span className="font-bold text-gray-900 dark:text-white">
                                            {formatPercent(Number(highlightSettings?.cancel_fee || 0))}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-7 space-y-4">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                            <Link2 className="w-5 h-5 text-brand-600" />
                            <h3 className="text-lg font-black">Links para gabaritos</h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Link de gabaritos</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                    value={assetsForm.template_link}
                                    onChange={e => setAssetsForm(prev => ({ ...prev, template_link: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Link do Canva</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                    value={assetsForm.canva_link}
                                    onChange={e => setAssetsForm(prev => ({ ...prev, canva_link: e.target.value }))}
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" onClick={handleSaveAssets} disabled={savingHighlights} icon={<Link2 className="w-4 h-4" />}>
                                    Salvar links de gabarito
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-7">
                        <div className="flex items-center gap-2 mb-4">
                            <Star className="w-5 h-5 text-brand-600" />
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">Lojas que pagaram destaque</h3>
                        </div>

                        {loadingHighlights ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                            </div>
                        ) : highlightOrders.length === 0 ? (
                            <p className="text-sm text-gray-500">Nenhum pagamento registrado.</p>
                        ) : (
                            <div className="space-y-3">
                                {highlightOrders.map(order => (
                                    <div key={order.id} className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black text-gray-900 dark:text-white">
                                                    {order.store?.store_name || order.store?.name || 'Loja sem nome'}
                                                </p>
                                                <p className="text-xs text-gray-500">Cidade: {order.city_slug}</p>
                                            </div>
                                            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getStatusBadgeClasses(order.status)}`}>
                                                {formatHighlightStatus(order.status)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Inicio: {formatDateTime(order.starts_at)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Fim: {formatDateTime(order.ends_at)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Wallet className="w-3.5 h-3.5" />
                                                Valor: {formatCurrency(Number(order.amount_paid || 0))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-7">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageCircle className="w-5 h-5 text-brand-600" />
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">Solicitacoes de banner</h3>
                        </div>

                        {loadingHighlights ? (
                            <div className="flex justify-center py-10">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                            </div>
                        ) : bannerRequests.length === 0 ? (
                            <p className="text-sm text-gray-500">Nenhuma solicitacao registrada.</p>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="space-y-3">
                                    {bannerRequests.map(request => (
                                        <button
                                            key={request.id}
                                            onClick={() => loadRequestMessages(request)}
                                            className={`w-full text-left p-3 rounded-2xl border transition ${selectedRequest?.id === request.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'}`}
                                        >
                                            <p className="text-sm font-black text-gray-900 dark:text-white">{request.store?.store_name || request.store?.name || 'Loja'}</p>
                                            <p className="text-xs text-gray-500">Cidade: {request.city_slug}</p>
                                            <p className="text-xs text-gray-500">Assunto: {formatRequestTopic(request.topic)}</p>
                                            <p className="text-xs text-gray-500">Tipo: {formatRequestType(request.request_type)}</p>
                                            <span className={`inline-flex mt-2 text-[11px] font-bold px-2 py-1 rounded-full border ${getStatusBadgeClasses(request.status)}`}>
                                                {formatHighlightStatus(request.status)}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                <div className="lg:col-span-2 space-y-4">
                                    {!selectedRequest ? (
                                        <div className="text-sm text-gray-500">Selecione uma solicitacao para ver o chat.</div>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <Button variant="outline" onClick={() => handleUpdateRequestStatus(selectedRequest, 'IN_PROGRESS')}>Em andamento</Button>
                                                <Button variant="outline" onClick={() => handleUpdateRequestStatus(selectedRequest, 'DONE')}>Concluido</Button>
                                                <Button variant="outline" onClick={() => handleUpdateRequestStatus(selectedRequest, 'CLOSED')}>Fechar</Button>
                                            </div>

                                            <div className="border border-gray-100 dark:border-gray-700 rounded-2xl p-4 bg-gray-50 dark:bg-gray-900 max-h-[320px] overflow-y-auto space-y-3">
                                                {loadingRequests ? (
                                                    <div className="flex justify-center py-6">
                                                        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                                                    </div>
                                                ) : requestMessages.length === 0 ? (
                                                    <p className="text-xs text-gray-500">Sem mensagens ainda.</p>
                                                ) : (
                                                    requestMessages.map(msg => (
                                                        <div key={msg.id} className={`p-3 rounded-xl ${msg.sender_role === 'admin' ? 'bg-brand-600 text-white ml-auto' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100'} max-w-[80%]`}>
                                                            <p className="text-xs font-bold mb-1">{msg.sender_role === 'admin' ? 'Admin' : 'Loja'} • {formatDateTime(msg.created_at)}</p>
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
                                                    value={requestMessageInput}
                                                    onChange={e => setRequestMessageInput(e.target.value)}
                                                />
                                                <Button onClick={handleSendMessage} icon={<MessageCircle className="w-4 h-4" />}>Enviar</Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">
                                {editingBanner ? 'Editar banner' : 'Novo banner'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Previa (1600x400)</label>
                                <div className="aspect-[16/4] w-full rounded-2xl bg-gray-50 dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                                    {formData.image_url ? (
                                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-center text-gray-400">
                                            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-xs">Insira a URL da imagem abaixo</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nome do banner</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Promo Sao Paulo"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        value={formData.name || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Cidade (slug)</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: sao-paulo"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        value={formData.city_slug || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, city_slug: e.target.value }))}
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">Use o mesmo slug da URL /cidades/slug.</p>
                                </div>

                                <div className="md:col-span-2">
                                    <ImageUpload
                                        label="Imagem do banner (sugerido 1600x400)"
                                        currentImageUrl={formData.image_url}
                                        onImageUploaded={(url) => setFormData(prev => ({ ...prev, image_url: url }))}
                                        folderPath="city_banners"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Link de destino</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: /home ou https://site.com"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        value={formData.link || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Ordem</label>
                                    <input
                                        type="number"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        value={formData.sort_order ?? 0}
                                        onChange={e => setFormData(prev => ({ ...prev, sort_order: Number(e.target.value) }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Inicio (opcional)</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        value={formData.starts_at as string || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Fim (opcional)</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        value={formData.ends_at as string || ''}
                                        onChange={e => setFormData(prev => ({ ...prev, ends_at: e.target.value }))}
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-6">
                                    <Switch
                                        label="Banner ativo"
                                        checked={formData.is_active ?? true}
                                        onChange={val => setFormData(prev => ({ ...prev, is_active: val }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-700">
                            <Button fullWidth onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar banner'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
