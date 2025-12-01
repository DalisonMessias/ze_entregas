
import React, { useState, useEffect } from 'react';
import { Wallet, Calendar, Clock, ChevronRight, TrendingUp, TrendingDown, Eye, EyeOff, Building, ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Loader2 } from 'lucide-react';
import { Logo } from './Logo';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return 'Data inválida';
    }
};

export const Zebank: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [nextPayoutDate, setNextPayoutDate] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [showBalance, setShowBalance] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await cloud.getZebankDashboardData();
            setBalance(data.balance);
            setNextPayoutDate(data.nextPayoutDate);
            setHistory(data.history);
        } catch (e) {
            console.error("Failed to load Zebank data", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
                <p className="text-gray-500 font-medium">Carregando carteira...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in pb-24">
            {/* Header Zebank Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-700 rounded-[32px] p-8 text-white shadow-2xl shadow-brand-500/30">
                {/* Texture */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-2">
                            <Logo className="h-6 w-auto text-white" mode="icon" variant="white" />
                            <span className="font-black text-xl tracking-tight">Zebank</span>
                        </div>
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm border border-white/10">
                            <Building className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    <div className="mb-2">
                        <p className="text-brand-100 text-sm font-medium mb-1 flex items-center gap-2">
                            Saldo Disponível
                            <button onClick={() => setShowBalance(!showBalance)} className="opacity-70 hover:opacity-100 transition-opacity p-1">
                                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                        </p>
                        {showBalance ? (
                            <h1 className="text-4xl font-black tracking-tight">{formatCurrency(balance)}</h1>
                        ) : (
                            <h1 className="text-4xl font-black tracking-tight tracking-widest">••••••</h1>
                        )}
                        <p className="text-xs text-brand-200 mt-2 font-medium bg-black/10 inline-block px-2 py-1 rounded">
                            Somente ganhos via plataforma
                        </p>
                    </div>
                </div>
            </div>

            {/* Next Payout Info */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
                <div>
                    <p className="text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Próximo Pagamento</p>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {nextPayoutDate ? formatDate(nextPayoutDate) : 'A definir'}
                        </h3>
                    </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-full">
                    <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
            </div>

            {/* History Section */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2 px-2">
                    <TrendingUp className="w-5 h-5 text-gray-500" /> Histórico Recente
                </h3>

                {history.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-2xl text-center border border-dashed border-gray-200 dark:border-gray-700">
                        <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Nenhuma movimentação recente.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((item, index) => (
                            <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        item.type === 'EARNING' ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                    }`}>
                                        {item.type === 'EARNING' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{item.description}</p>
                                        <p className="text-xs text-gray-400">{formatDate(item.date)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${item.type === 'EARNING' ? 'text-green-600' : 'text-red-500'}`}>
                                        {item.type === 'EARNING' ? '+' : ''}{formatCurrency(item.amount)}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium uppercase">{item.status}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
