import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Calendar, Download, FileText, TrendingUp, TrendingDown, Filter, Loader2, ArrowUpRight, ArrowDownLeft, Wallet, PiggyBank, Copy, Info, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { FinancialStatementItem, UserRole, LoanItem, LoanStatus, LoanSummary, LoanConfig } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { CustomDateInput } from './CustomDateInput';
import { ReceiptModal } from './ReceiptModal';

interface FinancialPanelProps {
    userRole: UserRole;
    hideHeader?: boolean;
    defaultOrigin?: 'store' | 'personal';
}

const Tooltip: React.FC<{ text: string, children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative flex items-center group">
        {children}
        <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {text}
        </div>
    </div>
);

// Mock Data for Loans
const mockLoanData: LoanItem[] = [
    { id: 'L001', borrowerName: 'João da Silva', amount: 5000, startDate: '2024-05-01', dueDate: '2024-11-01', status: 'ACTIVE', outstandingBalance: 2500 },
    { id: 'L002', borrowerName: 'Maria Oliveira', amount: 10000, startDate: '2024-03-15', dueDate: '2024-09-15', status: 'OVERDUE', outstandingBalance: 3000 },
    { id: 'L003', borrowerName: 'Carlos Pereira', amount: 2000, startDate: '2024-06-20', dueDate: '2024-08-20', status: 'PAID', outstandingBalance: 0 },
    { id: 'L004', borrowerName: 'Ana Costa', amount: 15000, startDate: '2024-01-10', dueDate: '2025-01-10', status: 'ACTIVE', outstandingBalance: 12000 },
    { id: 'L005', borrowerName: 'Pedro Martins', amount: 3000, startDate: '2023-12-05', dueDate: '2024-06-05', status: 'OVERDUE', outstandingBalance: 1000 },
];

export const FinancialPanel: React.FC<FinancialPanelProps> = ({ userRole, hideHeader, defaultOrigin }) => {
    const [transactions, setTransactions] = useState<FinancialStatementItem[]>([]);
    const [summary, setSummary] = useState({ balance: 0, in: 0, out: 0 });
    const [loading, setLoading] = useState(true);
    const [personalSavings, setPersonalSavings] = useState(0);
    const [personalCode, setPersonalCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'extrato' | 'emprestimos'>(defaultOrigin === 'personal' ? 'emprestimos' : 'extrato');
    const [loanConfig, setLoanConfig] = useState<LoanConfig | null>(null);

    // Filters
    const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('week');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [origin, setOrigin] = useState<'store' | 'personal'>(defaultOrigin ?? 'store');
    const [opType, setOpType] = useState<'all' | 'earning' | 'debit' | 'withdrawal' | 'refund'>('all');

    // Modal
    const [selectedTx, setSelectedTx] = useState<FinancialStatementItem | null>(null);
    const [userName, setUserName] = useState('');

    // Loan State
    const [loans, setLoans] = useState<LoanItem[]>([]);
    const [loanSummary, setLoanSummary] = useState<LoanSummary>({ totalLoaned: 0, totalPaid: 0, totalOutstanding: 0, overdueCount: 0 });
    const [loanStatusFilter, setLoanStatusFilter] = useState<LoanStatus | 'ALL'>('ALL');
    const [loanSort, setLoanSort] = useState<{ key: keyof LoanItem, direction: 'asc' | 'desc' }>({ key: 'dueDate', direction: 'asc' });

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

            if (origin === 'personal') {
                const allowed = userRole === 'delivery_partner' || userRole === 'delivery_person' || userRole === 'admin';
                if (!allowed) {
                    setTransactions([]);
                    setSummary({ balance: 0, in: 0, out: 0 });
                    setPersonalSavings(0);
                    setPersonalCode('');
                    setLoans([]);
                    return;
                }
                const z = await cloud.getZebankDashboardData();
                if (z) {
                    const items: FinancialStatementItem[] = (z.recent_transactions || []).map((t: any) => {
                        const dir = String(t.direction || '').toUpperCase();
                        const statusRaw = String(t.status || '').toUpperCase();
                        const status = statusRaw.includes('APPROVED') || statusRaw.includes('COMPLETED') ? 'COMPLETED' : statusRaw.includes('PENDING') ? 'PENDING' : 'FAILED';
                        const amt = Number(t.amount || 0);
                        return {
                            id: String(t.id),
                            date: String(t.created_at),
                            type: dir === 'IN' ? 'EARNING' : 'DEBIT',
                            description: String(t.description || (dir === 'IN' ? 'Entrada Pessoal' : 'Saída Pessoal')),
                            amount: dir === 'IN' ? Math.abs(amt) : -Math.abs(amt),
                            status,
                        };
                    });
                    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    const totalIn = items.filter(i => i.amount > 0).reduce((sum, i) => sum + i.amount, 0);
                    const totalOut = items.filter(i => i.amount < 0).reduce((sum, i) => sum + Math.abs(i.amount), 0);
                    setTransactions(items);
                    setSummary({ balance: Number(z.balance || 0), in: totalIn, out: totalOut });
                    setPersonalSavings(Number(z.savings_balance || 0));
                    setPersonalCode(String(z.my_code || ''));
                } else {
                    setTransactions([]);
                    setSummary({ balance: 0, in: 0, out: 0 });
                    setPersonalSavings(0);
                    setPersonalCode('');
                }
                const loansData = await cloud.getStoreLoans();
                setLoans(loansData);

            } else {
                const data = await cloud.getFinancialStatement(userRole, start, end);
                setTransactions(data.items);
                setSummary(data.summary);
                setPersonalSavings(0);
                setPersonalCode('');
                const loansData = await cloud.getStoreLoans();
                setLoans(loansData);
            }

            // Get user name for receipt
            const user = await cloud.getClient()?.auth.getUser();
            if (user?.data.user?.user_metadata?.name) {
                setUserName(user.data.user.user_metadata.name);
            }

        } catch (e: any) {
            setError(String(e?.message || 'Falha ao carregar dados'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [period, dateRange, userRole, origin]);

    useEffect(() => {
        cloud.getLoanConfig().then(setLoanConfig).catch(() => { });
    }, []);

    useEffect(() => {
        const sb = cloud.getClient();
        if (!sb || typeof (sb as any).channel !== 'function') return;
        const channel = (sb as any)
            .channel('store-loans')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'store_wallet_transactions' }, (payload: any) => {
                const t = payload?.new?.type || payload?.old?.type;
                if (t === 'loan') {
                    cloud.getStoreLoans().then(setLoans).catch(() => { });
                }
            })
            .subscribe();
        return () => {
            try { (sb as any).removeChannel(channel); } catch { }
        };
    }, [userRole]);

    useEffect(() => {
        // Calculate loan summary whenever loans data changes
        const totalLoaned = loans.reduce((sum, loan) => sum + loan.amount, 0);
        const totalOutstanding = loans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
        const totalPaid = totalLoaned - totalOutstanding;
        const overdueCount = loans.filter(loan => loan.status === 'OVERDUE').length;
        setLoanSummary({ totalLoaned, totalPaid, totalOutstanding, overdueCount });
    }, [loans]);

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

    const filteredTransactions = useMemo(() => {
        let list = transactions;
        // Type filter
        if (opType !== 'all') {
            const map: Record<'all' | 'earning' | 'debit' | 'withdrawal' | 'refund', FinancialStatementItem['type'][]> = {
                all: ['EARNING', 'DEBIT', 'WITHDRAWAL', 'REFUND'],
                earning: ['EARNING'],
                debit: ['DEBIT'],
                withdrawal: ['WITHDRAWAL'],
                refund: ['REFUND']
            };
            list = list.filter(t => map[opType].includes(t.type));
        }
        return list;
    }, [transactions, opType]);

    const sortedAndFilteredLoans = useMemo(() => {
        return loans
            .filter(loan => loanStatusFilter === 'ALL' || loan.status === loanStatusFilter)
            .sort((a, b) => {
                const aValue = a[loanSort.key];
                const bValue = b[loanSort.key];
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return loanSort.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
                }
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return loanSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }
                return 0;
            });
    }, [loans, loanStatusFilter, loanSort]);

    const handleLoanSort = (key: keyof LoanItem) => {
        setLoanSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getLoanStatusClass = (status: LoanStatus) => {
        switch (status) {
            case 'PAID': return 'bg-green-100 text-green-700'; // PAID (PAGO)
            case 'OVERDUE': return 'bg-red-100 text-red-700 animate-pulse';
            case 'ACTIVE': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const renderLoansSection = () => (
        <div className="space-y-4 pt-6">
            <hr className="border-gray-200 dark:border-gray-700" />
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-gray-500" /> Gestão de Empréstimos
                </h3>
                {/* <Button variant="outline">Novo Empréstimo</Button> */}
            </div>

            {/* Loan Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Total Emprestado</p>
                    <p className="text-lg font-black text-gray-800 dark:text-white">{formatCurrency(loanSummary.totalLoaned)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Total Amortizado</p>
                    <p className="text-lg font-black text-green-600">{formatCurrency(loanSummary.totalPaid)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Saldo Devedor</p>
                    <p className="text-lg font-black text-red-600">{formatCurrency(loanSummary.totalOutstanding)}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Vencidos</p>
                    <p className={`text-lg font-black ${loanSummary.overdueCount > 0 ? 'text-red-500 animate-pulse' : 'text-gray-800 dark:text-white'}`}>{loanSummary.overdueCount}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Juros (%)</p>
                    <p className="text-lg font-black text-gray-800 dark:text-white">{loanConfig?.interest_rate_percent ?? 0}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Prazo (dias)</p>
                    <p className="text-lg font-black text-gray-800 dark:text-white">{loanConfig?.repayment_days ?? 0}</p>
                </div>
            </div>

            {/* Loan Filters */}
            <div className="flex items-center gap-4">
                <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300">Filtrar por Status:</h4>
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                    {(['ALL', 'ACTIVE', 'OVERDUE', 'PAID'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setLoanStatusFilter(status)}
                            className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${loanStatusFilter === status ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                            aria-label={`Filtrar empréstimos por status: ${status === 'ALL' ? 'Todos' : status === 'ACTIVE' ? 'Em Dia' : status === 'OVERDUE' ? 'Vencido' : 'Pago'}`}
                        >
                            {status === 'ALL' ? 'Todos' : status === 'ACTIVE' ? 'Em Dia' : status === 'OVERDUE' ? 'Vencido' : 'Pago'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Loans Table */}
            <div className="md:hidden space-y-3">
                {sortedAndFilteredLoans.map(loan => (
                    <div key={loan.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Mutuário</p>
                                <p className="font-bold text-gray-900 dark:text-white">{loan.borrowerName}</p>
                            </div>
                            <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${getLoanStatusClass(loan.status)}`}>
                                {loan.status === 'ACTIVE' ? 'Em Dia' : loan.status === 'OVERDUE' ? 'Vencido' : loan.status === 'PAID' ? 'Pago' : loan.status}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                            <div>
                                <p className="text-gray-400 uppercase font-bold text-[10px]">Valor</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{formatCurrency(loan.amount)}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 uppercase font-bold text-[10px]">Saldo</p>
                                <p className="font-semibold text-red-500">{formatCurrency(loan.outstandingBalance)}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 uppercase font-bold text-[10px]">Contratação</p>
                                <p className="font-semibold text-gray-700 dark:text-gray-200">{new Date(loan.startDate).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 uppercase font-bold text-[10px]">Vencimento</p>
                                <p className="font-semibold text-gray-700 dark:text-gray-200">{new Date(loan.dueDate).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                    </div>
                ))}
                {sortedAndFilteredLoans.length === 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 text-center text-gray-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        Nenhum empréstimo encontrado com os filtros atuais.
                    </div>
                )}
            </div>

            <div className="hidden md:block overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <table className="min-w-[720px] w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">
                                <Tooltip text="Nome do cliente que contratou o empréstimo">Mutuário</Tooltip>
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleLoanSort('amount')}
                                aria-sort={loanSort.key === 'amount' ? (loanSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                <Tooltip text="Valor total do empréstimo contratado">
                                    <div className="flex items-center gap-1">Valor <ChevronsUpDown className="w-3 h-3" /></div>
                                </Tooltip>
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleLoanSort('startDate')}
                                aria-sort={loanSort.key === 'startDate' ? (loanSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                <Tooltip text="Data em que o empréstimo foi liberado">
                                    <div className="flex items-center gap-1">Contratação <ChevronsUpDown className="w-3 h-3" /></div>
                                </Tooltip>
                            </th>
                            <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleLoanSort('dueDate')}
                                aria-sort={loanSort.key === 'dueDate' ? (loanSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                                <Tooltip text="Data final para quitação do empréstimo">
                                    <div className="flex items-center gap-1">Vencimento <ChevronsUpDown className="w-3 h-3" /></div>
                                </Tooltip>
                            </th>
                            <th scope="col" className="px-6 py-3">
                                <Tooltip text="Situação atual do contrato do empréstimo">Status</Tooltip>
                            </th>
                            <th scope="col" className="px-6 py-3">
                                <Tooltip text="Valor restante para a quitação completa">Saldo Devedor</Tooltip>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedAndFilteredLoans.map(loan => (
                            <tr key={loan.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{loan.borrowerName}</td>
                                <td className="px-6 py-4">{formatCurrency(loan.amount)}</td>
                                <td className="px-6 py-4">{new Date(loan.startDate).toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4">{new Date(loan.dueDate).toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${getLoanStatusClass(loan.status)}`}>
                                        {loan.status === 'ACTIVE' ? 'Em Dia' : loan.status === 'OVERDUE' ? 'Vencido' : loan.status === 'PAID' ? 'Pago' : loan.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-red-500">{formatCurrency(loan.outstandingBalance)}</td>
                            </tr>
                        ))}
                        {sortedAndFilteredLoans.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-gray-400">
                                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    Nenhum empréstimo encontrado com os filtros atuais.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in pb-20">
            {!hideHeader && (
                <div className={`${origin === 'personal' ? 'bg-gradient-to-br from-indigo-900 to-purple-900 ring-1 ring-purple-400/40' : 'bg-gradient-to-br from-gray-900 to-gray-800'} text-white p-6 rounded-[32px] shadow-2xl relative overflow-hidden`}>
                    <div className="relative z-10">
                        <p className="text-gray-200 text-xs font-bold uppercase mb-1 flex items-center gap-2">
                            {origin === 'personal' ? <PiggyBank className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                            {origin === 'personal' ? 'Conta Pessoal' : 'Saldo Disponível'}
                        </p>
                        {origin === 'personal' && (
                            <p className="text-[11px] text-purple-200 font-bold">Saldo da sua Conta Pessoal (Zebank)</p>
                        )}
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
                        {origin === 'personal' && (
                            <div className="mt-6 bg-white/10 p-3 rounded-2xl backdrop-blur-sm flex items-center justify-between">
                                <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
                                    <PiggyBank className="w-3 h-3" /> Cofrinho
                                </div>
                                <p className="font-bold text-sm">{formatCurrency(personalSavings)}</p>
                            </div>
                        )}
                        {origin === 'personal' && personalCode && (
                            <div className="mt-3 bg-white/10 p-3 rounded-2xl backdrop-blur-sm flex items-center gap-2">
                                <span className="text-xs font-bold text-purple-100">Meu Código:</span>
                                <span className="text-xs font-mono text-white">{personalCode}</span>
                                <button
                                    className="ml-auto text-xs font-bold text-white/80 hover:text-white flex items-center gap-1"
                                    onClick={() => navigator.clipboard && navigator.clipboard.writeText(personalCode)}
                                >
                                    <Copy className="w-3 h-3" /> Copiar
                                </button>
                            </div>
                        )}
                    </div>
                    <div className={`absolute -right-10 -bottom-10 w-40 h-40 ${origin === 'personal' ? 'bg-purple-500/20' : 'bg-brand-500/20'} rounded-full blur-3xl`}></div>
                </div>
            )}

            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl flex gap-2 mb-4">
                {(['extrato', 'emprestimos'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 dark:text-gray-300'}`}
                    >
                        {tab === 'extrato' ? 'Extrato' : 'Empréstimos'}
                    </button>
                ))}
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-2xl text-sm font-bold">{error}</div>
            )}

            {activeTab === 'extrato' && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-500" /> Filtros
                        </h3>
                        <button onClick={handleExportCSV} className="text-xs font-bold text-brand-600 flex items-center gap-1 hover:underline">
                            <Download className="w-3 h-3" /> Exportar CSV
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div data-testid="origin-filter-group" className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl overflow-x-auto no-scrollbar">
                            {['store', 'personal'].map((o) => (
                                <button
                                    key={o}
                                    onClick={() => setOrigin(o as any)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${origin === o ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    {o === 'store' ? 'Loja' : 'Pessoal'}
                                </button>
                            ))}
                        </div>
                        <div data-testid="op-type-filter-group" className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl overflow-x-auto no-scrollbar">
                            {['all', 'earning', 'debit', 'withdrawal', 'refund'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setOpType(t as any)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${opType === t ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    {t === 'all' ? 'Todos' : t === 'earning' ? 'Entradas' : t === 'debit' ? 'Saídas' : t === 'withdrawal' ? 'Saques' : 'Estornos'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {period === 'custom' && (
                        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                            <CustomDateInput value={dateRange.start} onChange={v => setDateRange({ ...dateRange, start: v })} label="De" />
                            <CustomDateInput value={dateRange.end} onChange={v => setDateRange({ ...dateRange, end: v })} label="Até" />
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'extrato' && (
                <div className="space-y-3">
                    <h3 className="font-bold text-gray-800 dark:text-white px-2">{origin === 'personal' ? 'Extrato Pessoal' : 'Extrato Detalhado'}</h3>

                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Nenhuma movimentação no período.</p>
                        </div>
                    ) : (
                        filteredTransactions.map((tx) => (
                            <div key={tx.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between group cursor-pointer hover:border-brand-200 transition-colors" onClick={() => setSelectedTx(tx)}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                                        {tx.amount > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{tx.description}</p>
                                        <p className="text-xs text-gray-400 flex items-center gap-1">
                                            {new Date(tx.date).toLocaleDateString('pt-BR')} {new Date(tx.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span className="uppercase font-bold text-[10px] text-gray-500">{tx.type === 'EARNING' ? 'Entrada' : tx.type === 'DEBIT' ? 'Saída' : tx.type === 'WITHDRAWAL' ? 'Saque' : 'Estorno'}</span>
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
            )}

            {/* Loans Section */}
            {activeTab === 'emprestimos' && (!loading) && (userRole === 'delivery_partner' || userRole === 'store_partner') && renderLoansSection()}


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
