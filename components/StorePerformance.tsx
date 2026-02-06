import React, { useState, useEffect } from 'react';
import {
    BarChart3, DollarSign, ShoppingBag, TrendingUp, Calendar,
    ArrowUpRight, ArrowDownRight, Clock, Award
} from 'lucide-react';
import { getStorePerformance, StorePerformanceData, PerformanceParams } from '../services/storePerformance';
import { Loading } from './Loading';
import { useDialog } from '../utils/dialogService';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const StorePerformance: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<StorePerformanceData | null>(null);
    const [period, setPeriod] = useState<'7d' | '30d' | 'custom'>('7d');

    // Datas para filtro
    const [dateRange, setDateRange] = useState({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
    });

    useEffect(() => {
        loadData();
    }, [period, dateRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            let start = dateRange.start;
            let end = dateRange.end;
            let granularity: 'day' | 'week' | 'month' = 'day';

            if (period === '7d') {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                start = d.toISOString();
                end = new Date().toISOString();
                granularity = 'day';
            } else if (period === '30d') {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                start = d.toISOString();
                end = new Date().toISOString();
                granularity = 'day';
            }

            const result = await getStorePerformance({
                store_id: '', // Usa o usuário logado
                start_date: start,
                end_date: end,
                granularity
            });

            setData(result);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) return <Loading variant="container" size="lg" />;

    if (!data) return (
        <div className="p-8 text-center text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Não foi possível carregar os dados de desempenho.</p>
        </div>
    );

    const { current, previous, timeline, top_products, peak_hours } = data;

    // Variação percentual
    const calcGrowth = (curr: number, prev: number) => {
        if (!prev) return 0;
        return ((curr - prev) / prev) * 100;
    };

    const revenueGrowth = calcGrowth(current.total_revenue, previous.total_revenue);
    const ordersGrowth = calcGrowth(current.total_orders, previous.total_orders);

    // Max value for graphs scaling
    const maxRevenue = Math.max(...timeline.map(t => t.revenue), 1);
    const maxPeak = Math.max(...peak_hours.map(p => p.count), 1);

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20 fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-7 h-7 text-brand-600" />
                        Desempenho da Loja
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Acompanhe suas vendas e métricas operacionais.</p>
                </div>

                <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setPeriod('7d')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${period === '7d' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        7 dias
                    </button>
                    <button
                        onClick={() => setPeriod('30d')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${period === '30d' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        30 dias
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Faturamento */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <DollarSign className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Faturamento</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                        {formatCurrency(current.total_revenue)}
                    </div>
                    <div className={`flex items-center text-xs font-bold ${revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {revenueGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {Math.abs(revenueGrowth).toFixed(1)}% vs período anterior
                    </div>
                </div>

                {/* Pedidos */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShoppingBag className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pedidos</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                        {current.total_orders}
                    </div>
                    <div className={`flex items-center text-xs font-bold ${ordersGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {ordersGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                        {Math.abs(ordersGrowth).toFixed(1)}% vs período anterior
                    </div>
                </div>

                {/* Ticket Médio */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingUp className="w-24 h-24" />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Ticket Médio</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                        {formatCurrency(current.avg_ticket)}
                    </div>
                    <div className="text-xs text-gray-400">
                        Cálculo baseado em pedidos finalizados
                    </div>
                </div>
            </div>

            {/* Gráfico de Vendas e Top Produtos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico Principal */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-6">Evolução de Vendas</h3>
                    <div className="h-64 flex items-end justify-between gap-2">
                        {timeline.map((point, i) => {
                            const heightPercent = maxRevenue > 0 ? (point.revenue / maxRevenue) * 100 : 0;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs p-2 rounded-lg pointer-events-none whitespace-nowrap z-10">
                                        <div className="font-bold">{formatCurrency(point.revenue)}</div>
                                        <div className="text-gray-300">{point.count} pedidos</div>
                                        <div className="text-gray-400 border-t border-gray-700 mt-1 pt-1">
                                            {new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                        </div>
                                    </div>

                                    <div
                                        className="w-full bg-brand-100 dark:bg-brand-900/30 rounded-t-lg relative transition-all group-hover:bg-brand-200 dark:group-hover:bg-brand-800"
                                        style={{ height: `${heightPercent}%` }}
                                    >
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-brand-500 rounded-t-lg transition-all"
                                            style={{ height: '4px' }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-400 rotate-0 truncate w-full text-center">
                                        {new Date(point.date).toLocaleDateString('pt-BR', { day: '2-digit' })}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Produtos */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-500" />
                        Top Produtos
                    </h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {top_products.length === 0 ? (
                            <div className="text-center text-gray-400 py-10 text-sm">Sem vendas no período</div>
                        ) : (
                            top_products.map((prod, idx) => (
                                <div key={idx} className="flex items-center justify-between border-b border-gray-50 dark:border-gray-700/50 pb-3 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {idx + 1}
                                        </span>
                                        <div className="truncate">
                                            <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{prod.name}</p>
                                            <p className="text-xs text-gray-400">{prod.quantity} unidades</p>
                                        </div>
                                    </div>
                                    <div className="font-bold text-sm text-gray-700 dark:text-gray-300">
                                        {formatCurrency(prod.total)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Operacional: Horários de Pico */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-500" />
                        Horários de Pico
                    </h3>
                    <div className="h-48 flex items-end gap-1">
                        {Array.from({ length: 24 }).map((_, hour) => {
                            const dataPoint = peak_hours.find(p => p.hour === hour);
                            const count = dataPoint ? dataPoint.count : 0;
                            const heightPercent = maxPeak > 0 ? (count / maxPeak) * 100 : 0;

                            return (
                                <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                                    {/* Tooltip */}
                                    {count > 0 && (
                                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none z-10">
                                            {count} peds
                                        </div>
                                    )}

                                    <div
                                        className={`w-full rounded-t-sm transition-all ${count > 0 ? 'bg-orange-400 dark:bg-orange-600' : 'bg-gray-100 dark:bg-gray-800'}`}
                                        style={{ height: `${Math.max(heightPercent, 4)}%` }}
                                    />
                                    {hour % 3 === 0 && (
                                        <span className="text-[9px] text-gray-400">{hour}h</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Métricas Operacionais</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                            <span className="text-xs text-gray-500 uppercase font-bold">Tempo Médio de Entrega</span>
                            <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                {current.avg_delivery_time_min ? current.avg_delivery_time_min.toFixed(0) : '-'} <span className="text-sm font-normal text-gray-400">min</span>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                            <span className="text-xs text-gray-500 uppercase font-bold">Cancelamentos</span>
                            <div className="text-2xl font-black text-red-600 mt-1">
                                {current.cancelled_count}
                            </div>
                            <div className="text-xs text-gray-400">
                                {current.total_orders > 0 ? ((current.cancelled_count || 0) / current.total_orders * 100).toFixed(1) : 0}% do total
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                            <span className="text-xs text-gray-500 uppercase font-bold">Entregas Realizadas</span>
                            <div className="text-2xl font-black text-green-600 mt-1">
                                {current.completed_count}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
