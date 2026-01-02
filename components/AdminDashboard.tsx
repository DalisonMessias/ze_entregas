
import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Download, Store, Bike, Activity, Loader2, ArrowUpRight, ArrowDownRight, Layout, Construction, Award, Star, ShieldOff, Link2, Globe, Newspaper, Banknote, Bot, MapPin, Zap, CreditCard } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { AdminDashboardStats } from '../types';

const KPICard = ({ title, value, subtext, icon, colorClass, trend }: { title: string, value: string, subtext?: string, icon: React.ReactNode, colorClass: string, trend?: 'up' | 'down' }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform ${colorClass.replace('bg-', 'text-')}`}>
            {icon}
        </div>
        <div className="relative z-10">
            <div className="flex justify-between items-start">
                <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
                {trend && (
                    <div className={`flex items-center text-xs font-bold ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                        {trend === 'up' ? '+5%' : '-2%'} {/* Mocked trend for now */}
                    </div>
                )}
            </div>
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
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{item.date.split('-')[2]}</span>
                </div>
            ))}
        </div>
    );
};

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // NOTA: Os componentes Skeleton foram removidos deste arquivo, pois agora são de uso exclusivo da SplashScreen.
    // Nenhuma outra tela deve utilizar o componente Skeleton para carregamento.

    const loadStats = async () => {
        try {
            const data = await cloud.getAdminDashboardStats();
            setStats(data);
            setErrorMsg(null);
        } catch (e: any) {
            console.error("Dashboard error:", e);
            // Safely extract error message
            const msg = e?.message || (typeof e === 'string' ? e : "Erro desconhecido ao carregar dashboard.");
            setErrorMsg(msg);
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
            + `Pedidos Hoje,${stats.orders?.today ?? ''}\n`
            + `Pedidos Semana,${stats.orders?.week ?? ''}\n`
            + `Pedidos Mes,${stats.orders?.month ?? ''}\n`
            + `GMV Total,${stats.finance?.gmv?.toFixed(2) ?? ''}\n`
            + `Receita Plataforma,${stats.finance?.platformRevenue?.toFixed(2) ?? ''}\n`
            + `Lojas Ativas,${stats.users?.stores?.active ?? ''}\n`
            + `Entregadores Online,${stats.users?.drivers?.online ?? ''}`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "admin_dashboard_stats.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (errorMsg || !stats) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-gray-500 h-64 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800">
                <p className="mb-2 font-bold">Falha ao carregar dados do dashboard.</p>
                <p className="text-xs text-red-500 mb-4">{errorMsg}</p>
                <Button onClick={() => { setLoading(true); loadStats(); }} variant="outline" size="sm">Tentar Novamente</Button>
            </div>
        );
    }

    return (
        <div className="space-y-[15px] animate-in fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Dashboard</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Visão geral do desempenho da plataforma.</p>
                </div>
                <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
                    <Download className="w-4 h-4" /> Exportar CSV
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Pedidos Hoje"
                    value={(stats.orders?.today ?? 0).toString()}
                    subtext={`Total: ${stats.orders?.total ?? 0}`}
                    icon={<Activity className="w-8 h-8" />}
                    colorClass="bg-blue-500"
                    trend="up"
                />
                <KPICard
                    title="GMV Mensal"
                    value={formatCurrency(stats.finance?.gmv ?? 0)}
                    subtext="Volume Bruto de Mercadorias"
                    icon={<DollarSign className="w-8 h-8" />}
                    colorClass="bg-green-500"
                    trend="up"
                />
                <KPICard
                    title="Receita Plataforma"
                    value={formatCurrency(stats.finance?.platformRevenue ?? 0)}
                    subtext="Taxas e Mensalidades"
                    icon={<TrendingUp className="w-8 h-8" />}
                    colorClass="bg-purple-500"
                    trend="up"
                />
                <KPICard
                    title="Ticket Médio"
                    value={formatCurrency(stats.finance?.averageTicket ?? 0)}
                    subtext="Por Pedido"
                    icon={<BarChart3 className="w-8 h-8" />}
                    colorClass="bg-orange-500"
                />
            </div>

            {/* Quick Access Grid */}
            <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-sm px-2">Acesso Rápido</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_users' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Usuários</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_validation' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Validação</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_wallet_control' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Saldos</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_shop' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                            <Store className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Loja</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_cities' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400">
                            <Store className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Cidades</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_fees' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Taxas</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_payouts' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Repasses</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_notifications' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Notificações</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_claims' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Suporte</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_security' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                            <Activity className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Segurança</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_pwa' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-full text-pink-600 dark:text-pink-400">
                            <Bike className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">PWA</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_api_keys' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">API Keys</span>
                    </button>

                    {/* Faltantes */}
                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_slides' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                            <Layout className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Banners</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_maintenance' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                            <Construction className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Manutenção</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_levels' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-full text-brand-600 dark:text-brand-400">
                            <Award className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Níveis</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_ratings' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-500 dark:text-yellow-400">
                            <Star className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Avaliações</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_blacklist' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                            <ShieldOff className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Blacklist</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_referrals' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                            <Link2 className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Indicações</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_institutional' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                            <Globe className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Institucional</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_platform_news' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                            <Newspaper className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Notícias</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_store_finance' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <Banknote className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Financeiro Loja</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_ai_config' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                            <Bot className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">IA Config</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_routing' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Roteamento</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_asaas_webhook' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400">
                            <Zap className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Asaas Webhook</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_loan_config' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Empréstimos</span>
                    </button>

                    <button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_investments' } }))} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Investimentos</span>
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Orders Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-brand-600" /> Pedidos nos Últimos Dias
                    </h3>
                    <SimpleBarChart data={stats.orders?.graphData || []} />
                </div>

                <div className="">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-green-500" /> Status em Tempo Real
                        </h3>
                        <div className="space-y-[15px] mb-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                                        <Store className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Lojas Ativas</p>
                                        <p className="font-black text-gray-900 dark:text-white">{stats.users?.stores?.active ?? 0} / {stats.users?.stores?.total ?? 0}</p>
                                    </div>
                                </div>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600">
                                        <Bike className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Entregadores Online</p>
                                        <p className="font-black text-gray-900 dark:text-white">{stats.users?.drivers?.online ?? 0} / {stats.users?.drivers?.total ?? 0}</p>
                                    </div>
                                </div>
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-brand-600 to-brand-700 p-6 rounded-2xl text-white shadow-lg relative overflow-hidden mt-[15px]">
                        <div className="relative z-10">
                            <p className="text-brand-100 text-xs font-bold uppercase mb-1">Dica do Dia</p>
                            <p className="font-medium text-sm leading-relaxed">
                                Lojas com fotos de produtos vendem 30% mais. Incentive seus parceiros a completarem o cadastro!
                            </p>
                        </div>
                        <div className="absolute -bottom-4 -right-4 text-brand-500/30">
                            <Store className="w-24 h-24" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
