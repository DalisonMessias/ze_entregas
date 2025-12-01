
import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Download, Store, Bike, Activity, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { AdminDashboardStats } from '../types';
import { Skeleton } from './Skeleton';

const KPICard = ({ title, value, subtext, icon, colorClass }: { title: string, value: string, subtext?: string, icon: React.ReactNode, colorClass: string }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform ${colorClass.replace('bg-', 'text-')}`}>
            {icon}
        </div>
        <div className="relative z-10">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
            <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1">{value}</h3>
            {subtext && <p className="text-xs font-medium text-gray-400">{subtext}</p>}
        </div>
        <div className={`absolute bottom-0 left-0 h-1 w-full ${colorClass}`}></div>
    </div>
);

const SimpleBarChart = ({ data }: { data: { date: string, count: number }[] }) => {
    const max = Math.max(...data.map(d => d.count), 1);
    
    return (
        <div className="flex items-end justify-between h-48 gap-2 w-full">
            {data.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="w-full flex-1 flex items-end justify-center relative">
                        <div 
                            className="w-full max-w-[40px] bg-brand-500 dark:bg-brand-600 rounded-t-lg transition-all duration-500 ease-out hover:bg-brand-400 relative group-hover:shadow-lg"
                            style={{ height: `${(item.count / max) * 100}%`, minHeight: '4px' }}
                        >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap transition-opacity z-10">
                                {item.count} pedidos
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{item.date.split('-')[0]}</span>
                </div>
            ))}
        </div>
    );
};

const DashboardSkeleton = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-2 h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
        </div>
    </div>
);

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await cloud.getAdminDashboardStats();
            setStats(data);
        } catch (e) {
            console.error("Dashboard error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const handleExport = () => {
        if (!stats) return;
        const csvContent = "data:text/csv;charset=utf-8," 
            + "METRICA,VALOR\n"
            + `Pedidos Hoje,${stats.orders.today}\n`
            + `Pedidos Semana,${stats.orders.week}\n`
            + `Pedidos Mes,${stats.orders.month}\n`
            + `GMV Total,${stats.finance.gmv.toFixed(2)}\n`
            + `Receita Plataforma,${stats.finance.platformRevenue.toFixed(2)}\n`
            + `Lojas Ativas,${stats.users.stores.active}\n`
            + `Entregadores Online,${stats.users.drivers.online}`;
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "dashboard_relatorio.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading && !stats) {
        return <DashboardSkeleton />;
    }

    return (
        <div className="space-y-6 animate-in fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Visão Geral</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Acompanhe os indicadores em tempo real.</p>
                </div>
                <Button onClick={handleExport} variant="outline" className="text-xs">
                    <Download className="w-4 h-4 mr-2"/> Exportar Relatório
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                    title="Pedidos Hoje" 
                    value={stats?.orders.today.toString() || "0"} 
                    subtext={`${stats?.orders.week} na semana`}
                    icon={<Activity className="w-8 h-8"/>}
                    colorClass="bg-blue-500"
                />
                <KPICard 
                    title="Faturamento (GMV)" 
                    value={formatCurrency(stats?.finance.gmv || 0)} 
                    subtext="Total Transacionado (Mês)"
                    icon={<DollarSign className="w-8 h-8"/>}
                    colorClass="bg-green-500"
                />
                <KPICard 
                    title="Receita Plataforma" 
                    value={formatCurrency(stats?.finance.platformRevenue || 0)} 
                    subtext="Lucro Líquido (Taxas)"
                    icon={<TrendingUp className="w-8 h-8"/>}
                    colorClass="bg-purple-500"
                />
                <KPICard 
                    title="Entregadores Online" 
                    value={stats?.users.drivers.online.toString() || "0"} 
                    subtext={`De ${stats?.users.drivers.total} cadastrados`}
                    icon={<Bike className="w-8 h-8"/>}
                    colorClass="bg-orange-500"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Orders Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-gray-500"/> Volume de Pedidos (7 Dias)
                        </h3>
                    </div>
                    {stats?.orders.graphData && <SimpleBarChart data={stats.orders.graphData} />}
                </div>

                {/* Status Breakdown */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg dark:text-white mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-500"/> Status da Rede
                    </h3>
                    
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500 flex items-center gap-2"><Store className="w-4 h-4"/> Lojas Ativas</span>
                                <span className="font-bold dark:text-white">{stats?.users.stores.active} / {stats?.users.stores.total}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${stats?.users.stores.total ? (stats.users.stores.active / stats.users.stores.total) * 100 : 0}%` }}></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-500 flex items-center gap-2"><Bike className="w-4 h-4"/> Frota Online</span>
                                <span className="font-bold dark:text-white">{stats?.users.drivers.online} / {stats?.users.drivers.total}</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${stats?.users.drivers.total ? (stats.users.drivers.online / stats.users.drivers.total) * 100 : 0}%` }}></div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 mt-4">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ticket Médio</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">
                                {formatCurrency(stats?.finance.averageTicket || 0)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
