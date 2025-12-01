
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Filter, Calendar, DollarSign, Download, Printer, ChevronDown, ChevronUp, MapPin, Truck, Store, X, CheckCircle, Clock, ShoppingBag, LayoutList, History } from 'lucide-react';
import { PartnerRequest, HistoryFilters, PartnerRequestStatus, UserRole, Order, DeliveryRecord } from '../types';
import * as cloud from '../services/cloud';
import * as storage from '../services/storage';
import { Button } from './Button';
import { CustomDateInput } from './CustomDateInput';
import { CustomSelect } from './CustomSelect';
import { Skeleton } from './Skeleton';
import { HistoryTable } from './HistoryTable';

interface OrderHistoryProps {
    userRole: UserRole;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const getStatusLabel = (status: PartnerRequestStatus | string) => {
    switch (status) {
        case 'PENDING': return 'Pendente';
        case 'ACCEPTED': return 'Aceito';
        case 'IN_TRANSIT': return 'Em Rota';
        case 'COMPLETED': return 'Concluído';
        case 'CANCELLED': return 'Cancelado';
        case 'EXPIRED': return 'Expirado';
        case 'RETURNING': return 'Devolvendo';
        // Shop Status
        case 'pending_payment': return 'Aguardando Pagamento';
        case 'paid': return 'Pago';
        case 'approved': return 'Aprovado';
        case 'shipped': return 'Enviado';
        case 'delivered': return 'Entregue';
        case 'cancelled': return 'Cancelado';
        default: return status;
    }
};

const getStatusColor = (status: PartnerRequestStatus | string) => {
    switch (status) {
        case 'COMPLETED':
        case 'paid':
        case 'approved':
        case 'delivered': return 'bg-green-100 text-green-700';
        
        case 'IN_TRANSIT': 
        case 'shipped': return 'bg-blue-100 text-blue-700';
        
        case 'PENDING': 
        case 'pending_payment': return 'bg-yellow-100 text-yellow-700';
        
        case 'CANCELLED': 
        case 'cancelled': return 'bg-red-100 text-red-700';
        
        default: return 'bg-gray-100 text-gray-700';
    }
};

export const OrderHistory: React.FC<OrderHistoryProps> = ({ userRole }) => {
    // Tab State for users who might use both manual and app features
    const [viewMode, setViewMode] = useState<'APP_ORDERS' | 'MANUAL_DIARY'>('APP_ORDERS');

    // Shared State
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    // Delivery Partner/Store State
    const [requests, setRequests] = useState<PartnerRequest[]>([]);
    const [filters, setFilters] = useState<HistoryFilters>({ status: 'ALL' });
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [stats, setStats] = useState<any>(null);

    // Normal User State (Shop Orders)
    const [shopOrders, setShopOrders] = useState<Order[]>([]);

    // Manual Diary State
    const [manualHistory, setManualHistory] = useState<DeliveryRecord[]>([]);
    const [manualDateFilter, setManualDateFilter] = useState({ start: '', end: '' });
    const [manualExpenseFilter, setManualExpenseFilter] = useState<'all' | 'with' | 'without'>('all');

    useEffect(() => {
        // Default view mode based on role
        if (userRole === 'user') {
            setViewMode('MANUAL_DIARY'); // Users default to their diary
        } else {
            setViewMode('APP_ORDERS'); // Partners default to app orders
        }
    }, [userRole]);

    const loadData = useCallback(async (isRefresh = false) => {
        setLoading(true);
        try {
            if (viewMode === 'MANUAL_DIARY') {
                const history = storage.getHistory();
                setManualHistory(history);
                setLoading(false);
                return;
            }

            if (userRole === 'user' && viewMode === 'APP_ORDERS') {
                // Fetch Shop Orders for Normal User
                const orders = await cloud.getMyOrders();
                setShopOrders(orders);
                setHasMore(false); 
            } else {
                // Fetch Partner Requests for Delivery/Store Partners
                const currentPage = isRefresh ? 0 : page;
                const roleParam = userRole as 'store_partner' | 'delivery_partner';
                const res = await cloud.fetchPartnerRequestHistory(roleParam, filters, currentPage);
                
                if (isRefresh) {
                    setRequests(res.data);
                    setPage(1); // Next page
                } else {
                    setRequests(prev => [...prev, ...res.data]);
                    setPage(prev => prev + 1);
                }
                
                if (res.data.length < 20) setHasMore(false);
                else setHasMore(true);

                if (res.stats) setStats(res.stats);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [userRole, filters, page, viewMode]);

    // Reload when view mode or filters change
    useEffect(() => {
        loadData(true);
    }, [filters, viewMode]);

    // Handle Manual History Filter Logic locally since it's client-side
    const filteredManualHistory = manualHistory.filter(record => {
        const recordDate = new Date(record.date);
        const start = manualDateFilter.start ? new Date(manualDateFilter.start) : null;
        const end = manualDateFilter.end ? new Date(manualDateFilter.end) : null;
        
        if (end) end.setHours(23, 59, 59, 999);

        if (start && recordDate < start) return false;
        if (end && recordDate > end) return false;

        if (manualExpenseFilter === 'with') {
            return record.transactions?.some(t => t.type === 'expense');
        }
        if (manualExpenseFilter === 'without') {
            return !record.transactions?.some(t => t.type === 'expense');
        }

        return true;
    });

    const handleDownloadCSV = () => {
        if (viewMode === 'MANUAL_DIARY') {
             if (filteredManualHistory.length === 0) return;
             const headers = ["Data", "Entregas", "Valor Total", "KM Total", "Dinheiro", "Digital"];
             const rows = filteredManualHistory.map(r => [
                 r.formattedDate,
                 r.count,
                 r.totalValue.toFixed(2),
                 r.totalKm.toFixed(1),
                 r.paymentBreakdown?.cash.toFixed(2) || '0.00',
                 r.paymentBreakdown?.digital.toFixed(2) || '0.00'
             ].join(','));
             downloadFile(headers, rows, "diarias_manuais.csv");
             return;
        }

        if (userRole === 'user') {
            if (shopOrders.length === 0) return;
            const headers = ["ID", "Data", "Status", "Itens", "Total"];
            const rows = shopOrders.map(o => [
                o.id.substring(0, 8),
                new Date(o.created_at).toLocaleDateString(),
                o.status,
                `"${o.items.map(i => `${i.quantity}x ${i.name}`).join('; ')}"`,
                o.total_price.toFixed(2)
            ].join(','));
            downloadFile(headers, rows, "meus_pedidos_loja.csv");
        } else {
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
            downloadFile(headers, rows, "historico_corridas_app.csv");
        }
    };

    const downloadFile = (headers: string[], rows: string[], filename: string) => {
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- VIEW SWITCHER ---
    const renderSwitcher = () => (
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
            <button 
                onClick={() => setViewMode('MANUAL_DIARY')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'MANUAL_DIARY' ? 'bg-white dark:bg-gray-700 shadow text-brand-600 dark:text-white' : 'text-gray-500'}`}
            >
                <LayoutList className="w-4 h-4 inline mr-1"/> Diárias (Manual)
            </button>
            <button 
                onClick={() => setViewMode('APP_ORDERS')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'APP_ORDERS' ? 'bg-white dark:bg-gray-700 shadow text-brand-600 dark:text-white' : 'text-gray-500'}`}
            >
                <ShoppingBag className="w-4 h-4 inline mr-1"/> Pedidos do App
            </button>
        </div>
    );

    // --- MANUAL HISTORY RENDER ---
    if (viewMode === 'MANUAL_DIARY') {
        return (
            <div className="space-y-6 animate-in fade-in pb-20">
                {(userRole === 'user' || userRole === 'delivery_partner') && renderSwitcher()}
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <History className="w-6 h-6 text-brand-500" /> Histórico de Diárias
                    </h2>
                    
                    <HistoryTable 
                        history={filteredManualHistory}
                        onClear={() => {
                            if(confirm("Limpar todo o histórico?")) {
                                setManualHistory([]);
                                storage.saveHistory([]);
                            }
                        }}
                        onExport={handleDownloadCSV}
                        dateFilter={manualDateFilter}
                        setDateFilter={setManualDateFilter}
                        expenseFilter={manualExpenseFilter}
                        setExpenseFilter={setManualExpenseFilter}
                        onUpdateHistory={(newHistory) => setManualHistory(newHistory)}
                    />
                </div>
            </div>
        );
    }

    // --- APP ORDERS RENDER (USER) ---
    if (userRole === 'user' && viewMode === 'APP_ORDERS') {
        return (
            <div className="space-y-6 animate-in fade-in pb-20">
                {renderSwitcher()}
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-brand-500" /> Pedidos na Loja
                    </h2>
                    <button onClick={handleDownloadCSV} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-colors">
                        <Download className="w-5 h-5"/>
                    </button>
                </div>

                <div className="space-y-3">
                    {loading && shopOrders.length === 0 ? (
                        [1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
                    ) : shopOrders.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                            <p>Nenhum pedido realizado na loja.</p>
                        </div>
                    ) : (
                        shopOrders.map(order => (
                            <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-xs font-mono text-gray-400 mb-1">#{order.id.substring(0, 8)}</p>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(order.status)}`}>
                                            {getStatusLabel(order.status)}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-black text-gray-900 dark:text-white">
                                            {formatCurrency(order.total_price)}
                                        </p>
                                        <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="space-y-1 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                                    {order.items.slice(0, 2).map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between text-xs text-gray-600 dark:text-gray-300">
                                            <span>{item.quantity}x {item.name}</span>
                                            <span>{formatCurrency(item.price)}</span>
                                        </div>
                                    ))}
                                    {order.items.length > 2 && <p className="text-[10px] text-gray-400 text-center">+ {order.items.length - 2} itens</p>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // --- PARTNER REQUESTS RENDER (PARTNERS) ---
    return (
        <div className="space-y-6 animate-in fade-in pb-20">
            {/* For Delivery Partners, allow switch to Manual Diary */}
            {userRole === 'delivery_partner' && renderSwitcher()}

            {/* Header & Stats */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Truck className="w-6 h-6 text-brand-500" /> Corridas do App
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={() => setShowFilters(!showFilters)} className={`p-2 rounded-xl transition-colors ${showFilters ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}>
                            <Filter className="w-5 h-5"/>
                        </button>
                        <button onClick={handleDownloadCSV} className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 transition-colors">
                            <Download className="w-5 h-5"/>
                        </button>
                    </div>
                </div>

                {stats ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-800">
                            <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase">Total Movimentado</p>
                            <p className="text-lg font-black text-green-700 dark:text-green-300">{formatCurrency(stats.loaded_value || 0)}</p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase">Entregas</p>
                            <p className="text-lg font-black text-blue-700 dark:text-blue-300">{stats.total_items}</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
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
                    <>
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-24 w-full rounded-xl" />
                        ))}
                    </>
                ) : requests.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <Clock className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                        <p>Nenhum registro encontrado.</p>
                    </div>
                ) : (
                    <>
                        {requests.map(req => (
                            <div key={req.id} onClick={() => setSelectedItem(req)} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-brand-300 transition-all">
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
                     <div className="py-4 flex justify-center">
                        <Skeleton className="h-8 w-32" variant="text" />
                     </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                            <h3 className="font-bold dark:text-white">Detalhes do Pedido</h3>
                            <button onClick={() => setSelectedItem(null)}><X className="w-5 h-5 text-gray-400"/></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="text-center">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Valor Total</p>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                                    {formatCurrency(userRole === 'store_partner' ? selectedItem.total_charged_store : selectedItem.net_value_partner)}
                                </h2>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedItem.status)}`}>
                                    {getStatusLabel(selectedItem.status)}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <MapPin className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"/>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase">Coleta</p>
                                        <p className="text-sm dark:text-white leading-tight">{selectedItem.pickup_address}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                    <MapPin className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0"/>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase">Entrega</p>
                                        <p className="text-sm dark:text-white leading-tight">{selectedItem.delivery_address}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-400 text-xs">Data</p>
                                    <p className="font-bold dark:text-white">{new Date(selectedItem.created_at).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">Horário</p>
                                    <p className="font-bold dark:text-white">{new Date(selectedItem.created_at).toLocaleTimeString().slice(0,5)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">Distância</p>
                                    <p className="font-bold dark:text-white">{selectedItem.distance_km} km</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-xs">ID</p>
                                    <p className="font-mono text-xs dark:text-white">{selectedItem.id.substring(0,8)}</p>
                                </div>
                            </div>

                            {/* Partner/Store Info */}
                            <div className="border-t dark:border-gray-700 pt-4">
                                {userRole === 'store_partner' && selectedItem.partner ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"><Truck className="w-5 h-5 text-gray-500"/></div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase">Entregador</p>
                                            <p className="font-bold dark:text-white">{selectedItem.partner.name}</p>
                                            <p className="text-xs text-gray-500">{selectedItem.partner.vehicle_plate}</p>
                                        </div>
                                    </div>
                                ) : userRole === 'delivery_partner' && selectedItem.store ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"><Store className="w-5 h-5 text-gray-500"/></div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase">Loja</p>
                                            <p className="font-bold dark:text-white">{selectedItem.store.name}</p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
