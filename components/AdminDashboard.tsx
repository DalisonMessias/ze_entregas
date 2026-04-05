
import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Download, Store, Bike, Activity, Loader2, ArrowUpRight, ArrowDownRight, Layout, Construction, Award, Star, ShieldOff, Link2, Globe, Newspaper, Banknote, Bot, MapPin, Zap, CreditCard, FileCheck, Wallet, Megaphone, Headphones, ShieldAlert, Smartphone, Key, Package, LayoutGrid, Scale, ClipboardList } from 'lucide-react';
import { Button } from './Button';
import { DataErrorDisplay } from './DataErrorDisplay';
import * as cloud from '../services/cloud';
import { AdminDashboardStats } from '../types';
import { TipOfTheDay } from './TipOfTheDay';

const KPICard = ({ title, value, subtext, icon, colorClass, trendValue }: { title: string, value: string, subtext?: string, icon: React.ReactNode, colorClass: string, trendValue?: number }) => {
    const trend = trendValue !== undefined && trendValue !== 0 ? (trendValue > 0 ? 'up' : 'down') : undefined;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform ${colorClass.replace('bg-', 'text-')}`}>
                {icon}
            </div>
            <div className="relative z-10">
                <div className="flex justify-between items-start">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
                    {trend && (
                        <div className={`flex items-center text-xs font-bold ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                            {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                            {trend === 'up' ? '+' : ''}{trendValue?.toFixed(1)}%
                        </div>
                    )}
                </div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1">{value}</h3>
                {subtext && <p className="text-xs font-medium text-gray-400">{subtext}</p>}
            </div>
            <div className={`absolute bottom-0 left-0 h-1 w-full ${colorClass}`}></div>
        </div>
    );
};

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

export const AdminDashboard = () => {
    const [stats, setStats] = useState<AdminDashboardStats>({} as AdminDashboardStats);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // NOTA: Os componentes Skeleton foram removidos deste arquivo, pois agora são de uso exclusivo da SplashScreen.
    // Nenhuma outra tela deve utilizar o componente Skeleton para carregamento.

    const loadStats = async (signal?: AbortSignal) => {
        try {
            const data = await cloud.getAdminDashboardStats(signal);
            if (!signal?.aborted) {
                setStats(data || {} as AdminDashboardStats);
                setErrorMsg(null);
            }
        } catch (e: any) {
            if (e.name !== 'AbortError' && e.code !== '20') {
                console.error("Dashboard error:", e);
                // Safely extract error message
                const msg = e?.message || (typeof e === 'string' ? e : "Erro desconhecido ao carregar dashboard.");
                setErrorMsg(msg);
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        loadStats(controller.signal);

        const interval = setInterval(() => {
            if (!document.hidden) {
                loadStats(controller.signal);
            }
        }, 60000); // Exemplo de otimização simples: Só carrega se a aba estiver visível

        return () => {
            controller.abort();
            clearInterval(interval);
        };
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

    // Loading screen removed as requested by user. 
    // Data will populate as it arrives. 
    // "stats" is initialized as null, so we handle optional chaining in UI.


    return (
        <div className="space-y-[15px] animate-in fade-in">
            {errorMsg && !stats.orders && (
                <div className="p-8">
                    <DataErrorDisplay title="Falha ao Carregar Dashboard" message={errorMsg} onRetry={loadStats} />
                </div>
            )}
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
                    trendValue={stats.orders?.trend}
                />
                <KPICard
                    title="GMV (Vendas)"
                    value={formatCurrency(stats.finance?.gmv ?? 0)}
                    subtext="Volume Bruto Transacionado"
                    icon={<DollarSign className="w-8 h-8" />}
                    colorClass="bg-green-500"
                    trendValue={stats.finance?.gmvTrend}
                />
                <KPICard
                    title="Receita (Taxas)"
                    value={formatCurrency(stats.finance?.platformRevenue ?? 0)}
                    subtext="Assinaturas e Comissões"
                    icon={<TrendingUp className="w-8 h-8" />}
                    colorClass="bg-purple-500"
                    trendValue={stats.finance?.revenueTrend}
                />
                <KPICard
                    title="Recargas (Caixa)"
                    value={formatCurrency(stats.finance?.recharges ?? 0)}
                    subtext="Depósitos de Lojas"
                    icon={<Wallet className="w-8 h-8" />}
                    colorClass="bg-orange-500"
                />
            </div>

            {/* Breakdown Financeiro Extra (Novo Bloco) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                            <Store className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-500">Taxas de Lojas</span>
                    </div>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(stats.finance?.fees ?? 0)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-pink-600">
                            <Bike className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-500">Taxas de Entregadores</span>
                    </div>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(stats.finance?.driverFees ?? 0)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg text-teal-600">
                            <Award className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-500">Associações/Planos</span>
                    </div>
                    <p className="text-xl font-black text-gray-900 dark:text-white">{formatCurrency(stats.finance?.subscriptions ?? 0)}</p>
                </div>
            </div>

            {/* Quick Access Grid */}
            <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-sm px-2">Acesso Rápido</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_users' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Usuários</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_bonuses' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-full text-brand-600 dark:text-brand-400">
                            <Award className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Bônus</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_validation' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <FileCheck className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Validação</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_global_coupons' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-full text-brand-600 dark:text-brand-400">
                            <Banknote className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Cupons</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_wallet_control' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Saldos</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_shop' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                            <Store className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Loja Admin</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_base_catalog' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-full text-brand-600 dark:text-brand-400">
                            <Package className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Catálogo Base</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_cities' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Cidades</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_location_map' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <Globe className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Mapa</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_store_categories' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                            <LayoutGrid className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Categorias</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_fees' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Taxas</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_payouts' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Repasses</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_notifications' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Notificações</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_claims' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                            <Headphones className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Suporte</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_security' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Segurança</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_pwa' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-full text-pink-600 dark:text-pink-400">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">App PWA</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_api_keys' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                            <Key className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">API Keys</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_slides' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                            <Layout className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Banners</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_maintenance' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                            <Construction className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Manutenção</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_levels' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-full text-brand-600 dark:text-brand-400">
                            <Award className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Níveis</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_ratings' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-500 dark:text-yellow-400">
                            <Star className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Avaliações</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_blacklist' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                            <ShieldOff className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Blacklist</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_referrals' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                            <Link2 className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Indicações</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_institutional' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                            <Globe className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Institucional</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_platform_news' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                            <Newspaper className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Notícias</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_store_finance' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <Banknote className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Financeiro Loja</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_store_orders' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-400">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Pedidos por Loja</span>
                    </Button>



                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_infinitepay' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-lime-100 dark:bg-lime-900/30 rounded-full text-lime-600 dark:text-lime-400">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">InfinitePay</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_loan_config' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Empréstimos</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_investments' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Investimentos</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_score_config' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-full text-brand-600 dark:text-brand-400">
                            <Star className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Config Score</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_payment_gateways' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Gateways</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_payment_gateways' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-500 dark:text-blue-400">
                            <Link2 className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Mercado Pago</span>
                    </Button>
                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_street_requests' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Ruas Sugeridas</span>
                    </Button>

                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'admin_mediation' } }))} variant="outline" className="flex-col gap-2 p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                            <Scale className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">Mediação AI</span>
                    </Button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Orders Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-brand-600" /> Pedidos nos Últimos Dias
                    </h3>
                    <SimpleBarChart data={stats.orders?.graphData || []} />
                </div>

                <div className="">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl">
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

                    <TipOfTheDay role="admin" className="mt-[15px]" />
                </div>
            </div>
        </div>
    );
};
