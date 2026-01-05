


<<<<<<< HEAD
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Filter, Calendar, DollarSign, Download, Printer, ChevronDown, ChevronUp, MapPin, Truck, Store, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

import { PartnerRequest, HistoryFilters, PartnerRequestStatus } from '../types';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
=======
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Filter, Calendar, DollarSign, Download, Printer, ChevronDown, ChevronUp, MapPin, Truck, Store, X, CheckCircle, Clock } from 'lucide-react';
import { PartnerRequest, HistoryFilters, PartnerRequestStatus } from '../types';
import * as cloud from '../services/cloud';
>>>>>>> 04096c9171b59e53d616aa9a098ef9923be45507
import { Button } from './Button';
import { CustomDateInput } from './CustomDateInput';
import { CustomSelect } from './CustomSelect';
import { Skeleton } from './Skeleton';
import { ExclusiveLock } from './ExclusiveLock';

interface OrderHistoryProps {
    userRole: 'store_partner' | 'delivery_partner';
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const getStatusLabel = (status: PartnerRequestStatus) => {
    switch (status) {
        case 'PENDING': return 'Pendente';
        case 'ACCEPTED': return 'Aceito';
        case 'IN_TRANSIT': return 'Em Rota';
        case 'COMPLETED': return 'Concluído';
        case 'CANCELLED': return 'Cancelado';
        case 'EXPIRED': return 'Expirado';
        case 'RETURNING': return 'Devolvendo';
        default: return status;
    }
};

const getStatusColor = (status: PartnerRequestStatus) => {
    switch (status) {
        case 'COMPLETED': return 'bg-green-100 text-green-700';
        case 'IN_TRANSIT': return 'bg-blue-100 text-blue-700';
        case 'PENDING': return 'bg-yellow-100 text-yellow-700';
        case 'CANCELLED': return 'bg-red-100 text-red-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

interface OrderHistorySkeletonProps {
    showStats?: boolean;
    showList?: boolean;
    showLoadMore?: boolean;
}

const OrderHistorySkeleton: React.FC<OrderHistorySkeletonProps> = ({ showStats = true, showList = true, showLoadMore = true }) => (
    <div className="space-y-6">
        {showStats && (
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        )}
        {showList && (
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                ))}
            </div>
        )}
        {showLoadMore && (
            <div className="py-4 flex justify-center">
                <Skeleton className="h-8 w-32" variant="text" />
            </div>
        )}
    </div>
);

export const OrderHistory: React.FC<OrderHistoryProps> = ({ userRole }) => {
    const [requests, setRequests] = useState<PartnerRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<HistoryFilters>({
        status: 'ALL'
    });
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [selectedOrder, setSelectedOrder] = useState<PartnerRequest | null>(null);
<<<<<<< HEAD
    const [cancelLoading, setCancelLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const dialog = useDialog();

    const clientStats = useMemo(() => {
        const value = requests
            .filter(r => r.status !== 'CANCELLED')
            .reduce((acc, r) => acc + (userRole === 'store_partner' ? r.total_charged_store : r.net_value_partner), 0);

        const completed = requests.filter(r => r.status === 'COMPLETED').length;
        const cancelled = requests.filter(r => r.status === 'CANCELLED').length;

        return { value, completed, cancelled };
    }, [requests, userRole]);
=======
>>>>>>> 04096c9171b59e53d616aa9a098ef9923be45507

    const loadData = useCallback(async (isRefresh = false) => {
        setLoading(true);
        try {
            const currentPage = isRefresh ? 0 : page;
            const res = await cloud.fetchPartnerRequestHistory(userRole, filters, currentPage);
<<<<<<< HEAD
            const data = Array.isArray(res?.data) ? res.data : [];
            const statsRes = res?.stats ?? null;

            if (isRefresh) {
                setRequests(data);
                setPage(1); // Next page
            } else {
                setRequests(prev => [...prev, ...data]);
=======
            
            if (isRefresh) {
                setRequests(res.data);
                setPage(1); // Next page
            } else {
                setRequests(prev => [...prev, ...res.data]);
>>>>>>> 04096c9171b59e53d616aa9a098ef9923be45507
                setPage(prev => prev + 1);
            }
            
            if (res.data.length < 20) setHasMore(false);
            else setHasMore(true);

            if (res.stats) setStats(res.stats);

            setHasMore(data.length >= 20);

            if (statsRes) setStats(statsRes);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [userRole, filters, page]);

    // Initial load
    useEffect(() => {
        // Skip load if role is not allowed (will show lock)
        if (userRole === 'delivery_person' as any) {
            setLoading(false);
            return;
        }
        loadData(true);
    }, [filters, userRole]); // Reload when filters change

    const handleDownloadCSV = () => {
        if (requests.length === 0) return;
        const headers = ["ID", "Data", "Status", "Coleta", "Entrega", "Valor", "Distancia"];
        const rows = requests.map(r => [
            r.id.substring(0, 8),
            new Date(r.created_at).toLocaleDateString(),
            r.status,
            `"${r.pickup_address}"`,
            `"${r.delivery_address}"`,
            (userRole === 'store_partner' ? r.total_charged_store : r.net_value_partner).toFixed(2),
            r.distance_km
        ].join(','));
<<<<<<< HEAD

=======
        
>>>>>>> 04096c9171b59e53d616aa9a098ef9923be45507
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "historico_entregas.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (userRole === 'delivery_person' as any) {
<<<<<<< HEAD
        return (
            <ExclusiveLock
=======
         return (
            <ExclusiveLock 
>>>>>>> 04096c9171b59e53d616aa9a098ef9923be45507
                title="Histórico da Plataforma"
                description="O histórico de pedidos oficiais da plataforma é exclusivo para parceiros. Você pode usar o Histórico Pessoal para suas entregas manuais."
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in pb-20">
            {/* Header & Stats */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Histórico de Pedidos</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl transition-colors ${showFilters ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>
                            <Filter className="w-5 h-5" />
                        </button>
                        <button onClick={handleDownloadCSV} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-colors">
                            <Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {stats || requests.length > 0 ? (
                    <div className="grid grid-cols-4 gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                            <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase">{userRole === 'store_partner' ? 'Valor Gasto' : 'Ganhos'}</p>
                            <p className="text-lg font-black text-green-700 dark:text-green-300">{formatCurrency(clientStats.value)}</p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Concluídas</p>
                            <p className="text-lg font-black text-blue-700 dark:text-blue-300">{clientStats.completed}</p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
                            <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase">Canceladas</p>
                            <p className="text-lg font-black text-red-700 dark:text-red-300">{clientStats.cancelled}</p>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase">Falhas</p>
                            <p className="text-lg font-black text-orange-700 dark:text-orange-300">{stats?.counts?.failed || 0}</p>
                        </div>
                    </div>
                ) : (
                    <OrderHistorySkeleton showList={false} showLoadMore={false} />
                )}
            </div>

            {/* Filters Collapsible */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                        <CustomDateInput
                            label="De"
                            value={filters.startDate || ''}
                            onChange={(v) => setFilters(prev => ({ ...prev, startDate: v }))}
                        />
                        <CustomDateInput
                            label="Até"
                            value={filters.endDate || ''}
                            onChange={(v) => setFilters(prev => ({ ...prev, endDate: v }))}
                        />
                    </div>
                    <CustomSelect
                        label="Status"
                        value={filters.status || 'ALL'}
                        onChange={(v) => setFilters(prev => ({ ...prev, status: v as any }))}
                        options={[
                            { label: 'Todos', value: 'ALL' },
                            { label: 'Concluído', value: 'COMPLETED' },
                            { label: 'Em Rota', value: 'IN_TRANSIT' },
                            { label: 'Cancelado', value: 'CANCELLED' },
                        ]}
                    />
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" size="sm" onClick={() => setFilters({ status: 'ALL' })}>Limpar</Button>
                        <Button size="sm" onClick={() => loadData(true)}>Aplicar</Button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-3">
                {loading && requests.length === 0 ? (
                    <OrderHistorySkeleton showStats={false} showLoadMore={false} />
                ) : requests.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>Nenhum registro encontrado.</p>
                    </div>
                ) : (
                    <>
                        {requests.map(req => (
                            <div key={req.id} onClick={() => setSelectedOrder(req)} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-brand-300 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-xs font-mono text-gray-400 mb-1">#{req.id.substring(0, 8)}</p>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(req.status)}`}>
                                            {getStatusLabel(req.status)}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-gray-900 dark:text-white">
                                            {formatCurrency(userRole === 'store_partner' ? req.total_charged_store : req.net_value_partner)}
                                        </p>
                                        <p className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 truncate">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                                        <span className="truncate">{req.pickup_address}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 truncate">
                                        <div className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0"></div>
                                        <span className="truncate">{req.delivery_address}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* Load More */}
                {hasMore && !loading && requests.length > 0 && (
                    <Button
                        variant="ghost"
                        fullWidth
                        onClick={() => loadData(false)}
                        className="mt-4"
                    >
                        Carregar Mais
                    </Button>
                )}

                {hasMore && loading && requests.length > 0 && (
                    <OrderHistorySkeleton showStats={false} showList={false} />
                )}
            </div>

            {/* Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedOrder(null)}>
<<<<<<< HEAD
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="order-details-title">
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <h3 id="order-details-title" className="font-bold dark:text-white">Detalhes do Pedido</h3>
                            <button onClick={() => setSelectedOrder(null)}><X className="w-5 h-5 text-gray-400" /></button>
=======
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <h3 className="font-bold dark:text-white">Detalhes do Pedido</h3>
                            <button onClick={() => setSelectedOrder(null)}><X className="w-5 h-5 text-gray-400"/></button>
>>>>>>> 04096c9171b59e53d616aa9a098ef9923be45507
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="text-center">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Valor Total</p>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                                    {formatCurrency(userRole === 'store_partner' ? selectedOrder.total_charged_store : selectedOrder.net_value_partner)}
                                </h2>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedOrder.status)}`}>
                                    {getStatusLabel(selectedOrder.status)}
<<<<<<< HEAD
                                </span>                            </div>
=======
                                </span>
                            </div>
>>>>>>> 04096c9171b59e53d616aa9a098ef9923be45507

                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <MapPin className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase">Coleta</p>
                                        <p className="text-sm dark:text-white leading-tight">{selectedOrder.pickup_address}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <MapPin className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase">Entrega</p>
                                        <p className="text-sm dark:text-white leading-tight">{selectedOrder.delivery_address}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-400 text-xs">Data</p>
                                    <p className="font-bold dark:text-white">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">Horário</p>
<<<<<<< HEAD
                                    <p className="font-bold dark:text-white">{new Date(selectedOrder.created_at).toLocaleTimeString().slice(0, 5)}</p>
=======
                                    <p className="font-bold dark:text-white">{new Date(selectedOrder.created_at).toLocaleTimeString().slice(0,5)}</p>
>>>>>>> 04096c9171b59e53d616aa9a098ef9923be45507
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">Distância</p>
                                    <p className="font-bold dark:text-white">{selectedOrder.distance_km} km</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">ID</p>
<<<<<<< HEAD
                                    <p className="font-mono text-xs dark:text-white">{selectedOrder.id.substring(0, 8)}</p>
=======
                                    <p className="font-mono text-xs dark:text-white">{selectedOrder.id.substring(0,8)}</p>
>>>>>>> 04096c9171b59e53d616aa9a098ef9923be45507
                                </div>
                            </div>

                            {/* Partner/Store Info */}
                            <div className="border-t dark:border-gray-700 pt-4">
                                {userRole === 'store_partner' && selectedOrder.partner ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"><Truck className="w-5 h-5 text-gray-500" /></div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase">Entregador</p>
                                            <p className="font-bold dark:text-white">{selectedOrder.partner.name}</p>
                                            <p className="text-xs text-gray-500">{selectedOrder.partner.vehicle_plate}</p>
                                        </div>
                                    </div>
                                ) : userRole === 'delivery_partner' && selectedOrder.store ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"><Store className="w-5 h-5 text-gray-500" /></div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase">Loja</p>
                                            <p className="font-bold dark:text-white">{selectedOrder.store.name}</p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col gap-3">
                            {actionMessage && (
                                <p className="text-sm text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20 px-3 py-2 rounded-md">{actionMessage}</p>
                            )}
                            {actionError && (
                                <p className="text-sm text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20 px-3 py-2 rounded-md">{actionError}</p>
                            )}
                            {userRole === 'store_partner' && selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                                <div className="space-y-2">
                                    <button
                                        onClick={() => {
                                            dialog.alert({ title: 'Relatar Problema', message: 'Funcionalidade em breve.' });
                                        }}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold uppercase bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white transition-colors"
                                    >
                                        <AlertTriangle className="w-5 h-5" />
                                        Relatar Problema
                                    </button>

                                    <button
                                        onClick={async () => {
                                            setActionMessage(null);
                                            setActionError(null);
                                            const ok = await dialog.confirm({
                                                title: 'Cancelar Pedido',
                                                message: 'Tem certeza que deseja cancelar este pedido de entrega? Esta ação não pode ser desfeita.',
                                                confirmButtonText: 'Confirmar Cancelamento',
                                                cancelButtonText: 'Voltar'
                                            });
                                            if (!ok) return;
                                            try {
                                                setCancelLoading(true);
                                                await cloud.storeCancelPartnerRequest(selectedOrder.id);
                                                setActionMessage('Pedido cancelado com sucesso.');
                                                setActionError(null);
                                                setSelectedOrder(prev => prev ? { ...prev, status: 'CANCELLED' } as PartnerRequest : prev);
                                                setRequests(prev => prev.map(r => r.id === selectedOrder.id ? { ...r, status: 'CANCELLED' } as PartnerRequest : r));
                                            } catch (e: any) {
                                                const msg = e?.message || 'Falha ao cancelar o pedido.';
                                                setActionError(msg);
                                                setActionMessage(null);
                                            } finally {
                                                setCancelLoading(false);
                                            }
                                        }}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold uppercase ${cancelLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white transition-colors`}
                                        disabled={cancelLoading}
                                        aria-disabled={cancelLoading}
                                    >
                                        {cancelLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Processando...
                                            </>
                                        ) : (
                                            <>Cancelar Pedido de Entrega</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
<<<<<<< HEAD
};

=======
};
>>>>>>> 04096c9171b59e53d616aa9a098ef9923be45507
