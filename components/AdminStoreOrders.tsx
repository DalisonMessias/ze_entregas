import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckSquare, Download, Edit3, Loader2, MapPin, Phone, RefreshCw, Square, Store, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomDateInput } from './CustomDateInput';
import { SelectPersonalizado } from './SelectPersonalizado';
import { useDialog } from '../utils/dialogService';
import * as cloud from '../services/cloud';

type StoreSummary = cloud.AdminOrdersByStoreSummaryItem;
type StoreOrder = cloud.AdminStoreOrderItem;

type SortOptionValue = 'created_desc' | 'created_asc' | 'value_desc' | 'value_asc' | 'status_asc';

interface StatusOption {
    value: string;
    label: string;
}

interface PaymentOption {
    value: string;
    label: string;
}

interface PaymentStatusOption {
    value: string;
    label: string;
}

const DEFAULT_PAGE_SIZE = 10;

const STATUS_OPTIONS: StatusOption[] = [
    { value: 'PENDING', label: 'Pendente' },
    { value: 'ACCEPTED', label: 'Aceito' },
    { value: 'PREPARING', label: 'Em preparo' },
    { value: 'READY', label: 'Pronto' },
    { value: 'ON_WAY', label: 'Em rota' },
    { value: 'DELIVERED', label: 'Entregue' },
    { value: 'CANCELLED', label: 'Cancelado' }
];

const PAYMENT_OPTIONS: PaymentOption[] = [
    { value: 'PIX', label: 'Pix' },
    { value: 'CREDIT_CARD', label: 'Cartao de credito' },
    { value: 'DEBIT_CARD', label: 'Cartao de debito' },
    { value: 'CASH', label: 'Dinheiro' },
    { value: 'BOLETO', label: 'Boleto' },
    { value: 'CUSTOM', label: 'Outro' }
];

const PAYMENT_STATUS_OPTIONS: PaymentStatusOption[] = [
    { value: 'pending', label: 'Nao pago' },
    { value: 'paid', label: 'Pago' },
    { value: 'cancelled', label: 'Cancelado' }
];

const SORT_OPTIONS: Array<{ value: SortOptionValue; label: string }> = [
    { value: 'created_desc', label: 'Data (mais novo)' },
    { value: 'created_asc', label: 'Data (mais antigo)' },
    { value: 'value_desc', label: 'Valor (maior)' },
    { value: 'value_asc', label: 'Valor (menor)' },
    { value: 'status_asc', label: 'Status (A-Z)' }
];

const PAGE_SIZE_OPTIONS = [
    { value: 10, label: '10 por pagina' },
    { value: 25, label: '25 por pagina' },
    { value: 50, label: '50 por pagina' }
];

const STATUS_CHIPS = [
    { value: 'ALL', label: 'Todos' },
    { value: 'PENDING', label: 'Pendente' },
    { value: 'DELIVERED', label: 'Entregue' },
    { value: 'CANCELLED', label: 'Cancelado' }
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const formatDate = (isoDate: string) => {
    if (!isoDate) return '-';
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('pt-BR');
};

const getStatusLabel = (status?: string | null): string => {
    if (!status) return '-';
    return STATUS_OPTIONS.find((item) => item.value === status)?.label || status;
};

const getPaymentLabel = (paymentMethod?: string | null): string => {
    if (!paymentMethod) return '-';
    return PAYMENT_OPTIONS.find((item) => item.value === paymentMethod)?.label || paymentMethod;
};

const getPaymentStatusLabel = (paymentStatus?: string | null): string => {
    if (!paymentStatus) return 'Nao pago';
    const normalized = paymentStatus.toLowerCase();
    return PAYMENT_STATUS_OPTIONS.find((item) => item.value === normalized)?.label || paymentStatus;
};

const getStatusBadgeClass = (status?: string | null): string => {
    switch ((status || '').toUpperCase()) {
        case 'DELIVERED':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'CANCELLED':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        case 'ON_WAY':
        case 'READY':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        default:
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    }
};

const getPaymentBadgeClass = (status?: string | null): string => {
    switch ((status || '').toLowerCase()) {
        case 'paid':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
        case 'cancelled':
            return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300';
    }
};

const parseCurrencyInput = (value: string): number => {
    const input = (value || '').trim();
    if (!input) return NaN;

    if (input.includes(',')) {
        const normalized = input
            .replace(/[^\d,.-]/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
        return Number(normalized);
    }

    const normalized = input.replace(/[^\d.-]/g, '');
    return Number(normalized);
};

const getInitialParam = (key: string): string => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get(key) || '';
};

const toCsvValue = (value: string | number | null | undefined) => {
    const raw = String(value ?? '');
    return `"${raw.replace(/"/g, '""')}"`;
};

const formatPhone = (phone?: string | null) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return phone;
};

export const AdminStoreOrders: React.FC = () => {
    const { confirm, alert, toast } = useDialog();

    const [summary, setSummary] = useState<StoreSummary[]>([]);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    const [selectedStore, setSelectedStore] = useState<StoreSummary | null>(null);
    const [pendingStoreFromUrl, setPendingStoreFromUrl] = useState<string>(getInitialParam('aso_store'));
    const [orders, setOrders] = useState<StoreOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState<string | null>(null);

    const [orderIdSearch, setOrderIdSearch] = useState<string>(getInitialParam('aso_q'));
    const [statusFilter, setStatusFilter] = useState<string>(getInitialParam('aso_status') || 'ALL');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>(getInitialParam('aso_method') || 'ALL');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(getInitialParam('aso_payment') || 'ALL');
    const [dateFrom, setDateFrom] = useState<string>(getInitialParam('aso_from'));
    const [dateTo, setDateTo] = useState<string>(getInitialParam('aso_to'));
    const [sortBy, setSortBy] = useState<SortOptionValue>((getInitialParam('aso_sort') as SortOptionValue) || 'created_desc');
    const [pageSize, setPageSize] = useState<number>(() => {
        const initial = Number(getInitialParam('aso_page_size') || DEFAULT_PAGE_SIZE);
        return [10, 25, 50].includes(initial) ? initial : DEFAULT_PAGE_SIZE;
    });
    const [currentPage, setCurrentPage] = useState<number>(() => {
        const initial = Number(getInitialParam('aso_page') || 1);
        return Number.isFinite(initial) && initial > 0 ? initial : 1;
    });

    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState<string>('PENDING');

    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
    const [quickStatusByOrderId, setQuickStatusByOrderId] = useState<Record<string, string>>({});

    const [editingOrder, setEditingOrder] = useState<StoreOrder | null>(null);
    const [editingStatus, setEditingStatus] = useState('');
    const [editingPaymentMethod, setEditingPaymentMethod] = useState('');
    const [editingPaymentStatus, setEditingPaymentStatus] = useState('');
    const [editingTotalPrice, setEditingTotalPrice] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const loadSummary = useCallback(async () => {
        setSummaryLoading(true);
        setSummaryError(null);
        try {
            const data = await cloud.adminGetOrdersByStoreSummary();
            setSummary(data);
        } catch (error: any) {
            console.error(error);
            setSummaryError(error?.message || 'Falha ao carregar pedidos por loja.');
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    const loadOrders = useCallback(async (storeId: string): Promise<StoreOrder[]> => {
        setOrdersLoading(true);
        setOrdersError(null);
        try {
            const data = await cloud.adminGetOrdersByStore(storeId);
            setOrders(data);
            setQuickStatusByOrderId(
                data.reduce((acc, order) => {
                    acc[order.id] = order.status || 'PENDING';
                    return acc;
                }, {} as Record<string, string>)
            );
            setSelectedOrderIds(new Set());
            return data;
        } catch (error: any) {
            console.error(error);
            setOrdersError(error?.message || 'Falha ao carregar pedidos da loja.');
            return [];
        } finally {
            setOrdersLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const openStore = useCallback(async (store: StoreSummary) => {
        setSelectedStore(store);
        setCurrentPage(1);
        await loadOrders(store.store_id);
    }, [loadOrders]);

    useEffect(() => {
        if (!pendingStoreFromUrl || summaryLoading || selectedStore) return;
        const store = summary.find((item) => item.store_id === pendingStoreFromUrl);
        if (!store) {
            setPendingStoreFromUrl('');
            return;
        }
        void openStore(store);
        setPendingStoreFromUrl('');
    }, [pendingStoreFromUrl, summaryLoading, summary, selectedStore, openStore]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        const setParam = (key: string, value?: string | number | null) => {
            const finalValue = value == null ? '' : String(value);
            if (!finalValue || finalValue === 'ALL') {
                params.delete(key);
                return;
            }
            params.set(key, finalValue);
        };

        setParam('aso_store', selectedStore?.store_id || '');
        setParam('aso_q', orderIdSearch);
        setParam('aso_status', statusFilter);
        setParam('aso_method', paymentMethodFilter);
        setParam('aso_payment', paymentStatusFilter);
        setParam('aso_from', dateFrom);
        setParam('aso_to', dateTo);
        setParam('aso_sort', sortBy);
        setParam('aso_page', currentPage);
        setParam('aso_page_size', pageSize);

        const qs = params.toString();
        const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash || ''}`;
        window.history.replaceState({}, '', nextUrl);
    }, [
        selectedStore?.store_id,
        orderIdSearch,
        statusFilter,
        paymentMethodFilter,
        paymentStatusFilter,
        dateFrom,
        dateTo,
        sortBy,
        currentPage,
        pageSize
    ]);

    const selectedStoreName = useMemo(() => selectedStore?.store_name || 'Loja', [selectedStore]);

    const filteredOrders = useMemo(() => {
        const term = orderIdSearch.trim().toLowerCase();
        return orders.filter((order) => {
            if (term && !order.id.toLowerCase().includes(term)) return false;
            if (statusFilter !== 'ALL' && (order.status || '') !== statusFilter) return false;
            if (paymentMethodFilter !== 'ALL' && (order.payment_method || '') !== paymentMethodFilter) return false;
            if (paymentStatusFilter !== 'ALL' && (order.payment_status || '').toLowerCase() !== paymentStatusFilter.toLowerCase()) return false;

            const orderDay = (order.created_at || '').slice(0, 10);
            if (dateFrom && orderDay && orderDay < dateFrom) return false;
            if (dateTo && orderDay && orderDay > dateTo) return false;

            return true;
        });
    }, [orders, orderIdSearch, statusFilter, paymentMethodFilter, paymentStatusFilter, dateFrom, dateTo]);

    const sortedOrders = useMemo(() => {
        const data = [...filteredOrders];
        data.sort((a, b) => {
            switch (sortBy) {
                case 'created_asc':
                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                case 'value_desc':
                    return Number(b.total_price || 0) - Number(a.total_price || 0);
                case 'value_asc':
                    return Number(a.total_price || 0) - Number(b.total_price || 0);
                case 'status_asc':
                    return getStatusLabel(a.status).localeCompare(getStatusLabel(b.status), 'pt-BR');
                case 'created_desc':
                default:
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });
        return data;
    }, [filteredOrders, sortBy]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedOrders.length / pageSize)), [sortedOrders.length, pageSize]);

    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedOrders.slice(start, start + pageSize);
    }, [sortedOrders, currentPage, pageSize]);

    const totalOrders = orders.length;
    const totalValue = orders.reduce((acc, order) => acc + Number(order.total_price || 0), 0);
    const paidCount = orders.filter((order) => (order.payment_status || '').toLowerCase() === 'paid').length;
    const deliveredCount = orders.filter((order) => (order.status || '').toUpperCase() === 'DELIVERED').length;
    const paidRate = totalOrders > 0 ? Math.round((paidCount / totalOrders) * 100) : 0;
    const deliveredRate = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;

    const allPageSelected = paginatedOrders.length > 0 && paginatedOrders.every((order) => selectedOrderIds.has(order.id));
    const hasSelection = selectedOrderIds.size > 0;
    const showPagination = !ordersLoading && !ordersError && sortedOrders.length > 0;

    useEffect(() => {
        setCurrentPage(1);
    }, [orderIdSearch, statusFilter, paymentMethodFilter, paymentStatusFilter, dateFrom, dateTo, sortBy, pageSize, selectedStore?.store_id]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const refreshSelectedStore = async (): Promise<StoreOrder[]> => {
        if (!selectedStore) return [];
        const [, refreshedOrders] = await Promise.all([loadSummary(), loadOrders(selectedStore.store_id)]);
        return refreshedOrders;
    };

    const handleQuickUpdateStatus = async (orderId: string) => {
        const nextStatus = quickStatusByOrderId[orderId];
        if (!nextStatus) return;

        setUpdatingOrderId(orderId);
        try {
            await cloud.adminUpdateOrderStatus(orderId, nextStatus);
            toast({ type: 'success', message: 'Status do pedido atualizado.' });
            await refreshSelectedStore();
        } catch (error: any) {
            console.error(error);
            await alert(error?.message || 'Erro ao atualizar status do pedido.');
        } finally {
            setUpdatingOrderId(null);
        }
    };

    const handleBulkUpdateStatus = async () => {
        if (!hasSelection) {
            await alert('Selecione pelo menos um pedido.');
            return;
        }

        try {
            await Promise.all(Array.from(selectedOrderIds).map((orderId) => cloud.adminUpdateOrderStatus(orderId, bulkStatus)));
            toast({ type: 'success', message: 'Status atualizado para os pedidos selecionados.' });
            await refreshSelectedStore();
        } catch (error: any) {
            console.error(error);
            await alert(error?.message || 'Erro ao atualizar status em lote.');
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        const shortId = orderId.slice(0, 8);
        const confirmed = await confirm({
            title: 'Deletar pedido',
            message: `Confirma deletar o pedido #${shortId}? Esta acao nao pode ser desfeita.`,
            confirmButtonText: 'Deletar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmed) return;

        setDeletingOrderId(orderId);
        try {
            await cloud.adminDeleteOrder(orderId);
            toast({ type: 'success', message: 'Pedido deletado com sucesso.' });
            await refreshSelectedStore();
        } catch (error: any) {
            console.error(error);
            await alert(error?.message || 'Erro ao deletar pedido.');
        } finally {
            setDeletingOrderId(null);
        }
    };

    const handleBulkDelete = async () => {
        if (!hasSelection) {
            await alert('Selecione pelo menos um pedido.');
            return;
        }

        const ids = Array.from(selectedOrderIds);
        const sampleIds = ids.slice(0, 5).map((id) => `#${id.slice(0, 8)}`).join(', ');
        const suffix = ids.length > 5 ? '...' : '';
        const confirmed = await confirm({
            title: 'Deletar pedidos selecionados',
            message: `Confirma deletar ${ids.length} pedidos (${sampleIds}${suffix})? Esta acao nao pode ser desfeita.`,
            confirmButtonText: 'Deletar tudo',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmed) return;

        try {
            await Promise.all(ids.map((orderId) => cloud.adminDeleteOrder(orderId)));
            toast({ type: 'success', message: 'Pedidos selecionados deletados com sucesso.' });
            await refreshSelectedStore();
        } catch (error: any) {
            console.error(error);
            await alert(error?.message || 'Erro ao deletar pedidos selecionados.');
        }
    };

    const openEditModal = (order: StoreOrder) => {
        setEditingOrder(order);
        setEditingStatus(order.status || 'PENDING');
        setEditingPaymentMethod(order.payment_method || 'PIX');
        setEditingPaymentStatus((order.payment_status || 'pending').toLowerCase());
        setEditingTotalPrice(String(Number(order.total_price || 0)));
    };

    const closeEditModal = () => {
        setEditingOrder(null);
        setEditingStatus('');
        setEditingPaymentMethod('');
        setEditingPaymentStatus('');
        setEditingTotalPrice('');
    };

    const saveOrderEdit = async (goToNext = false) => {
        if (!editingOrder) return;

        const parsedTotal = parseCurrencyInput(editingTotalPrice);
        if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
            await alert('Informe um valor valido para o pedido.');
            return;
        }

        const currentOrderId = editingOrder.id;
        const currentIndex = sortedOrders.findIndex((order) => order.id === currentOrderId);
        const nextOrderId = currentIndex >= 0 ? sortedOrders[currentIndex + 1]?.id : undefined;

        setIsSavingEdit(true);
        try {
            await cloud.adminEditOrder(editingOrder.id, {
                status: editingStatus,
                payment_method: editingPaymentMethod,
                payment_status: editingPaymentStatus,
                total_price: parsedTotal
            });
            toast({ type: 'success', message: 'Pedido atualizado com sucesso.' });
            const refreshedOrders = await refreshSelectedStore();

            if (goToNext && nextOrderId) {
                const nextOrder = refreshedOrders.find((order) => order.id === nextOrderId);
                if (nextOrder) {
                    openEditModal(nextOrder);
                    return;
                }
            }
            closeEditModal();
        } catch (error: any) {
            console.error(error);
            await alert(error?.message || 'Erro ao salvar alteracoes do pedido.');
        } finally {
            setIsSavingEdit(false);
        }
    };

    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrderIds((prev) => {
            const next = new Set(prev);
            if (next.has(orderId)) {
                next.delete(orderId);
            } else {
                next.add(orderId);
            }
            return next;
        });
    };

    const toggleSelectCurrentPage = () => {
        setSelectedOrderIds((prev) => {
            const next = new Set(prev);
            if (allPageSelected) {
                paginatedOrders.forEach((order) => next.delete(order.id));
            } else {
                paginatedOrders.forEach((order) => next.add(order.id));
            }
            return next;
        });
    };

    const exportCsv = () => {
        if (!selectedStore || sortedOrders.length === 0 || typeof window === 'undefined') return;

        const headers = ['ID', 'Data', 'Status', 'Valor', 'Cliente', 'FormaPagamento', 'Pagamento'];
        const rows = sortedOrders.map((order) => [
            order.id,
            order.created_at,
            getStatusLabel(order.status),
            Number(order.total_price || 0).toFixed(2),
            order.customer_name || '',
            getPaymentLabel(order.payment_method),
            getPaymentStatusLabel(order.payment_status)
        ]);

        const csv = [
            headers.map((header) => toCsvValue(header)).join(','),
            ...rows.map((row) => row.map((col) => toCsvValue(col)).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `pedidos-${selectedStore.store_id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!selectedStore) {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-brand-50 dark:bg-brand-900/30 rounded-2xl">
                            <Store className="w-7 h-7 text-brand-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white">Pedidos por Loja</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Visao consolidada de pedidos no admin.</p>
                        </div>
                    </div>
                    <button
                        onClick={loadSummary}
                        className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Atualizar"
                    >
                        <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-200" />
                    </button>
                </div>

                {summaryLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                    </div>
                ) : summaryError ? (
                    <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 space-y-3">
                        <p className="font-bold">Falha ao carregar pedidos por loja.</p>
                        <p className="text-sm">{summaryError}</p>
                        <Button size="sm" onClick={loadSummary}>Tentar novamente</Button>
                    </div>
                ) : summary.length === 0 ? (
                    <div className="p-10 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma loja com pedidos encontrada.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {summary.map((store) => (
                            <button
                                key={store.store_id}
                                onClick={() => openStore(store)}
                                className="group text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-brand-200 transition-all overflow-hidden"
                            >
                                <div className="h-24 bg-gradient-to-r from-brand-100 to-brand-50 dark:from-brand-900/40 dark:to-gray-800 relative">
                                    {store.cover_url ? (
                                        <img src={store.cover_url} alt={`Capa ${store.store_name}`} className="w-full h-full object-cover" />
                                    ) : null}
                                    <div className="absolute inset-0 bg-black/20" />
                                </div>

                                <div className="p-4">
                                    <div className="-mt-9 mb-2 flex items-end gap-3">
                                        <div className="w-14 h-14 rounded-2xl border-2 border-white dark:border-gray-800 bg-white dark:bg-gray-900 shadow overflow-hidden flex items-center justify-center">
                                            {store.store_logo_url ? (
                                                <img src={store.store_logo_url} alt={`Logo ${store.store_name}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-brand-700 dark:text-brand-300 font-black text-lg">
                                                    {store.store_name?.charAt(0).toUpperCase() || 'L'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-lg font-black text-gray-900 dark:text-white leading-tight line-clamp-2">{store.store_name}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 mb-4 min-h-[48px]">
                                        {(store.city || store.state) ? (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {store.city}{store.city && store.state ? ' - ' : ''}{store.state || ''}
                                            </p>
                                        ) : null}
                                        {store.phone_number ? (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                                <Phone className="w-3.5 h-3.5" />
                                                {formatPhone(store.phone_number)}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-end justify-between">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">Pedidos</p>
                                            <p className="text-3xl font-black text-brand-600">{store.orders_count}</p>
                                        </div>
                                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 group-hover:bg-brand-100">
                                            Abrir loja
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => setSelectedStore(null)}>
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </Button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">{selectedStoreName}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Pedidos da loja</p>
                    </div>
                </div>
                <button
                    onClick={() => loadOrders(selectedStore.store_id)}
                    className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Atualizar lista"
                >
                    <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-200" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs uppercase font-bold text-gray-400">Total de pedidos</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{totalOrders}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs uppercase font-bold text-gray-400">Total em valor</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs uppercase font-bold text-gray-400">Pagamento confirmado</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{paidRate}%</p>
                    <p className="text-xs text-gray-500">{paidCount} de {totalOrders}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <p className="text-xs uppercase font-bold text-gray-400">Entregues</p>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{deliveredRate}%</p>
                    <p className="text-xs text-gray-500">{deliveredCount} de {totalOrders}</p>
                </div>
            </div>

            <div className="max-w-md">
                <CustomInput
                    label="Buscar pedido por ID"
                    placeholder="Digite parte do ID do pedido"
                    value={orderIdSearch}
                    onChange={(e) => setOrderIdSearch(e.target.value)}
                    className="mb-6"
                />
            </div>

            <div className="flex flex-wrap gap-2 mt-1 mb-2">
                {STATUS_CHIPS.map((chip) => {
                    const active = statusFilter === chip.value;
                    return (
                        <button
                            key={chip.value}
                            type="button"
                            onClick={() => setStatusFilter(chip.value)}
                            className={`px-3 py-1.5 text-xs rounded-full font-bold border transition-colors ${active
                                ? 'bg-brand-600 border-brand-600 text-white'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                                }`}
                        >
                            {chip.label}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3 mt-2">
                <SelectPersonalizado
                    id="filter-status"
                    label="Status"
                    value={statusFilter}
                    onChange={(value: string) => setStatusFilter(value)}
                    options={[{ value: 'ALL', label: 'Todos os status' }, ...STATUS_OPTIONS]}
                />
                <SelectPersonalizado
                    id="filter-payment"
                    label="Pagamento"
                    value={paymentStatusFilter}
                    onChange={(value: string) => setPaymentStatusFilter(value)}
                    options={[{ value: 'ALL', label: 'Todos os pagamentos' }, ...PAYMENT_STATUS_OPTIONS]}
                />
                <SelectPersonalizado
                    id="filter-payment-method"
                    label="Forma pagto."
                    value={paymentMethodFilter}
                    onChange={(value: string) => setPaymentMethodFilter(value)}
                    options={[{ value: 'ALL', label: 'Todas as formas' }, ...PAYMENT_OPTIONS]}
                />
                <CustomDateInput
                    id="filter-date-from"
                    label="Data inicial"
                    value={dateFrom || null}
                    onChange={(value) => setDateFrom(value || '')}
                    max={dateTo || undefined}
                />
                <CustomDateInput
                    id="filter-date-to"
                    label="Data final"
                    value={dateTo || null}
                    onChange={(value) => setDateTo(value || '')}
                    min={dateFrom || undefined}
                />
                <SelectPersonalizado
                    id="filter-sort"
                    label="Ordenar"
                    value={sortBy}
                    onChange={(value: SortOptionValue) => setSortBy(value)}
                    options={SORT_OPTIONS}
                />
            </div>

            <div className="flex flex-col lg:flex-row gap-3 lg:items-end lg:justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex flex-wrap items-end gap-2">
                    <SelectPersonalizado
                        id="filter-page-size"
                        label="Itens por pagina"
                        value={pageSize}
                        onChange={(value: number) => setPageSize(Number(value))}
                        options={PAGE_SIZE_OPTIONS}
                        className="min-w-[180px]"
                    />
                    <Button size="sm" variant="outline" onClick={exportCsv}>
                        <Download className="w-4 h-4" /> Exportar CSV
                    </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <SelectPersonalizado
                        id="bulk-status"
                        value={bulkStatus}
                        onChange={(value: string) => setBulkStatus(value)}
                        options={STATUS_OPTIONS}
                        className="min-w-[220px]"
                    />
                    <Button size="sm" variant="secondary" onClick={handleBulkUpdateStatus} disabled={!hasSelection}>
                        Atualizar selecionados
                    </Button>
                    <Button size="sm" variant="danger" onClick={handleBulkDelete} disabled={!hasSelection}>
                        Deletar selecionados ({selectedOrderIds.size})
                    </Button>
                </div>
            </div>

            {ordersLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                </div>
            ) : ordersError ? (
                <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 space-y-3">
                    <p className="font-bold">Falha ao carregar pedidos da loja.</p>
                    <p className="text-sm">{ordersError}</p>
                    <Button size="sm" onClick={() => loadOrders(selectedStore.store_id)}>Tentar novamente</Button>
                </div>
            ) : orders.length === 0 ? (
                <div className="p-10 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Esta loja nao possui pedidos no momento.</p>
                </div>
            ) : sortedOrders.length === 0 ? (
                <div className="p-10 text-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum pedido encontrado para os filtros aplicados.</p>
                </div>
            ) : (
                <div className="space-y-4 mt-10">
                    <div className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                        <button
                            type="button"
                            onClick={toggleSelectCurrentPage}
                            className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200"
                        >
                            {allPageSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            Selecionar pagina atual
                        </button>
                        <p className="text-xs text-gray-500">Selecionados: {selectedOrderIds.size}</p>
                    </div>

                    {paginatedOrders.map((order) => (
                        <div key={order.id} data-testid={`order-card-${order.id}`} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedOrderIds.has(order.id)}
                                        onChange={() => toggleOrderSelection(order.id)}
                                        aria-label={`Selecionar pedido ${order.id}`}
                                        className="h-4 w-4"
                                    />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Pedido</p>
                                        <p className="font-black text-gray-900 dark:text-white">#{order.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(order.created_at)}</div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-sm">
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Status</p>
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(order.status)}`}>
                                        {getStatusLabel(order.status)}
                                    </span>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Valor</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(order.total_price)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Forma pagto.</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{getPaymentLabel(order.payment_method)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Pago?</p>
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getPaymentBadgeClass(order.payment_status)}`}>
                                        {getPaymentStatusLabel(order.payment_status)}
                                    </span>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Cliente</p>
                                    <p className="font-bold text-gray-900 dark:text-white">{order.customer_name || '-'}</p>
                                </div>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <SelectPersonalizado
                                        id={`status-${order.id}`}
                                        value={quickStatusByOrderId[order.id] || order.status || 'PENDING'}
                                        onChange={(value: string) => setQuickStatusByOrderId((prev) => ({ ...prev, [order.id]: value }))}
                                        options={STATUS_OPTIONS}
                                        className="min-w-[220px]"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => handleQuickUpdateStatus(order.id)}
                                        disabled={updatingOrderId === order.id}
                                    >
                                        {updatingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                        Atualizar
                                    </Button>
                                </div>

                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openEditModal(order)}>
                                        <Edit3 className="w-4 h-4" /> Editar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="danger"
                                        onClick={() => handleDeleteOrder(order.id)}
                                        disabled={deletingOrderId === order.id}
                                    >
                                        {deletingOrderId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        Deletar
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showPagination ? (
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, sortedOrders.length)} de {sortedOrders.length} pedidos
                    </p>
                    <div className="flex items-center gap-2 sm:justify-end">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </Button>
                        <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[110px] text-center">
                            Pagina {currentPage} de {totalPages}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Proxima
                        </Button>
                    </div>
                </div>
            ) : null}

            {editingOrder && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-2xl space-y-4">
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Editar pedido #{editingOrder.id.slice(0, 8)}</h2>
                        <div className="space-y-3">
                            <SelectPersonalizado
                                id="edit-order-status"
                                label="Status"
                                value={editingStatus || 'PENDING'}
                                onChange={(value: string) => setEditingStatus(value)}
                                options={STATUS_OPTIONS}
                            />
                            <SelectPersonalizado
                                id="edit-order-payment-method"
                                label="Forma de pagamento"
                                value={editingPaymentMethod || 'PIX'}
                                onChange={(value: string) => setEditingPaymentMethod(value)}
                                options={PAYMENT_OPTIONS}
                            />
                            <SelectPersonalizado
                                id="edit-order-payment-status"
                                label="Pagamento"
                                value={editingPaymentStatus || 'pending'}
                                onChange={(value: string) => setEditingPaymentStatus(value)}
                                options={PAYMENT_STATUS_OPTIONS}
                            />
                            <CustomInput
                                aria-label="Valor total"
                                label="Valor total"
                                mask="currency"
                                value={editingTotalPrice}
                                onChange={(e) => setEditingTotalPrice(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap justify-end gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={closeEditModal}>Cancelar</Button>
                            <Button size="sm" variant="secondary" onClick={() => saveOrderEdit(true)} disabled={isSavingEdit}>
                                {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Salvar e proximo
                            </Button>
                            <Button size="sm" onClick={() => saveOrderEdit(false)} disabled={isSavingEdit}>
                                {isSavingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Salvar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
