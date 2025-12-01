import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Calendar, Download, FileText, TrendingUp, TrendingDown, Filter, Loader2, ArrowUpRight, ArrowDownLeft, Wallet } from 'lucide-react';
import { FinancialStatementItem, UserRole } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { CustomDateInput } from './CustomDateInput';
import { ReceiptModal } from './ReceiptModal';

interface FinancialPanelProps {
    userRole: UserRole;
}

export const FinancialPanel: React.FC<FinancialPanelProps> = ({ userRole }) => {
    const [transactions, setTransactions] = useState<FinancialStatementItem[]>([]);
    const [summary, setSummary] = useState({ balance: 0, in: 0, out: 0 });
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('week');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    
    // Modal
    const [selectedTx, setSelectedTx] = useState<FinancialStatementItem | null>(null);
    const [userName, setUserName] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            // Determine dates based on period
            let start = dateRange.start;
            let end = dateRange.end;
            
            if (period !== 'custom') {
                const now = new Date();
                const s = new Date();
                if (period === 'day') {
                    // Today
                } else if (period === 'week') {
                    s.setDate(now.getDate() - 7);
                } else if (period === 'month') {
                    s.setMonth(now.getMonth() - 1);
                }
                start = s.toISOString().split('T')[0];
                end = now.toISOString().split('T')[0];
            }

            const data = await cloud.getFinancialStatement(userRole, start, end);
            setTransactions(data.items);
            setSummary(data.summary);
            
            // Get user name for receipt
            const user = await cloud.getClient()?.auth.getUser();
            if (user?.data.user?.user_metadata?.name) {
                setUserName(user.data.user.user_metadata.name);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [period, dateRange, userRole]); // Reload on filter change

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const handleExportCSV = () => {
        if (transactions.length === 0) return;
        const headers = ["ID", "Data", "Tipo", "Descricao", "Valor", "Status"];
        const rows = transactions.map(t => [
            t.id,
            new Date(t.date).toLocaleDateString(),
            t.type,
            `"${t.description}"`,
            t.amount.toFixed(2),
            t.status
        ].join(','));
        
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + "\n" + rows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `extrato_financeiro_${period}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-20">
            {/* Header / Balance Card */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-[32px] shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-gray-400 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Saldo Disponível
                    </p>
                    <h2 className="text-4xl font-black tracking-tight">{formatCurrency(summary.balance)}</h2>
                    
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-green-400 text-xs font-bold mb-1">
                                <ArrowDownLeft className="w-3 h-3" /> Entradas
                            </div>
                            <p className="font-bold text-lg">{formatCurrency(summary.in)}</p>
                        </div>
                        <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                            <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-1">
                                <ArrowUpRight className="w-3 h-3" /> Saídas
                            </div>
                            <p className="font-bold text-lg">{formatCurrency(summary.out)}</p>
                        </div>
                    </div>
                </div>
                {/* Decor */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-brand-500/20 rounded-full blur-3xl"></div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500"/> Filtros
                    </h3>
                    <button onClick={handleExportCSV} className="text-xs font-bold text-brand-600 flex items-center gap-1 hover:underline">
                        <Download className="w-3 h-3"/> Exportar CSV
                    </button>
                </div>
                
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-4 overflow-x-auto no-scrollbar">
                    {['day', 'week', 'month', 'custom'].map((p) => (
                        <button 
                            key={p}
                            onClick={() => setPeriod(p as any)}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${period === p ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            {p === 'day' ? 'Hoje' : p === 'week' ? '7 Dias' : p === 'month' ? '30 Dias' : 'Personalizado'}
                        </button>
                    ))}
                </div>

                {period === 'custom' && (
                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                        <CustomDateInput value={dateRange.start} onChange={v => setDateRange({...dateRange, start: v})} label="De"/>
                        <CustomDateInput value={dateRange.end} onChange={v => setDateRange({...dateRange, end: v})} label="Até"/>
                    </div>
                )}
            </div>

            {/* Transactions List */}
            <div className="space-y-3">
                <h3 className="font-bold text-gray-800 dark:text-white px-2">Extrato Detalhado</h3>
                
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-brand-500"/></div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
                        <FileText className="w-10 h-10 mx-auto mb-2 opacity-20"/>
                        <p className="text-sm">Nenhuma movimentação no período.</p>
                    </div>
                ) : (
                    transactions.map((tx) => (
                        <div key={tx.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group cursor-pointer hover:border-brand-200 transition-colors" onClick={() => setSelectedTx(tx)}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                                    {tx.amount > 0 ? <TrendingUp className="w-5 h-5"/> : <TrendingDown className="w-5 h-5"/>}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{tx.description}</p>
                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                        {new Date(tx.date).toLocaleDateString('pt-BR')}
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        <span className={`uppercase font-bold text-[10px] ${tx.status === 'COMPLETED' ? 'text-green-500' : tx.status === 'PENDING' ? 'text-yellow-500' : 'text-red-500'}`}>{tx.status === 'COMPLETED' ? 'Concluído' : tx.status === 'PENDING' ? 'Pendente' : 'Falha'}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-black text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                </p>
                                <span className="text-[10px] text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Ver Recibo</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedTx && (
                <ReceiptModal 
                    transaction={selectedTx} 
                    onClose={() => setSelectedTx(null)} 
                    userName={userName}
                />
            )}
        </div>
    );
};