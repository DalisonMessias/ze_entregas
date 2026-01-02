import React, { useEffect, useState, useMemo } from 'react';
import { Settings, Percent, Calendar, CreditCard, Loader2, Save, List, DollarSign, FileText, ChevronsUpDown, CheckCircle, AlertTriangle, X } from 'lucide-react';
import * as cloud from '../services/cloud';
import { ShopSettings, LoanConfig, LoanItem, LoanStatus, LoanSummary } from '../types';
import { Button } from './Button';

// Toast Helper
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-24 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 fade-in duration-300 border ${type === 'success' ? 'bg-white border-green-100 dark:bg-gray-800 dark:border-green-900' : 'bg-white border-red-100 dark:bg-gray-800 dark:border-red-900'}`}>
            <div className={`p-2 rounded-full ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
                <h4 className={`font-bold text-sm ${type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {type === 'success' ? 'Sucesso' : 'Erro'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>
            </div>
            <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
        </div>
    );
};

// Tooltip Helper
const Tooltip: React.FC<{ text: string, children: React.ReactNode }> = ({ text, children }) => (
    <div className="relative flex items-center group">
        {children}
        <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
            {text}
        </div>
    </div>
);


export const AdminLoanConfig: React.FC = () => {
    // Config Tab State
    const [shop, setShop] = useState<ShopSettings | null>(null);
    const [cfg, setCfg] = useState<LoanConfig>({ interest_rate_percent: 0, repayment_days: 0, credit_limit: 0, early_repayment_discount_percent: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    
    // General State
    const [activeTab, setActiveTab] = useState<'config' | 'list'>('config');

    // List Tab State
    const [loans, setLoans] = useState<LoanItem[]>([]);
    const [listLoading, setListLoading] = useState(false);
    const [loanSummary, setLoanSummary] = useState<LoanSummary>({ totalLoaned: 0, totalPaid: 0, totalOutstanding: 0, overdueCount: 0 });
    const [loanStatusFilter, setLoanStatusFilter] = useState<LoanStatus | 'ALL'>('ALL');
    const [loanSort, setLoanSort] = useState<{ key: keyof LoanItem, direction: 'asc' | 'desc' }>({ key: 'dueDate', direction: 'asc' });

    // Initial Load for Config
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const s = await cloud.getShopSettings();
            setShop(s);
            const lc = await cloud.getLoanConfig();
            if (lc) {
                setCfg(prev => ({ ...prev, ...lc }));
            }
            setLoading(false);
        };
        load();
    }, []);

    // Load for List Tab when it becomes active
    useEffect(() => {
        if (activeTab === 'list' && loans.length === 0) {
            const loadList = async () => {
                setListLoading(true);
                const allLoans = await cloud.adminGetAllLoans();
                setLoans(allLoans);
                setListLoading(false);
            };
            loadList();
        }
    }, [activeTab]);

    // Memoized calculations for list
    useEffect(() => {
        const totalLoaned = loans.reduce((sum, loan) => sum + loan.amount, 0);
        const totalOutstanding = loans.reduce((sum, loan) => sum + loan.outstandingBalance, 0);
        const totalPaid = totalLoaned - totalOutstanding;
        const overdueCount = loans.filter(loan => loan.status === 'VENCIDO').length;
        setLoanSummary({ totalLoaned, totalPaid, totalOutstanding, overdueCount });
    }, [loans]);

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

    // --- Handlers and Helpers ---
    const handleSaveConfig = async () => {
        if (!shop) return;
        setSaving(true);
        try {
            const company_info = { 
                ...(shop.company_info || {}), 
                loan_config: {
                    interest_rate_percent: Number(cfg.interest_rate_percent || 0),
                    repayment_days: Number(cfg.repayment_days || 0),
                    credit_limit: Number(cfg.credit_limit || 0),
                    early_repayment_discount_percent: Number(cfg.early_repayment_discount_percent || 0),
                } 
            } as any;
            await cloud.adminUpdateShopSettings({ company_info });
            setToast({ type: 'success', message: 'Configurações de empréstimo salvas com sucesso!' });
        } catch (e: any) {
            setToast({ type: 'error', message: 'Erro ao salvar: ' + (e.message || 'Tente novamente') });
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    
    const handleLoanSort = (key: keyof LoanItem) => {
        setLoanSort(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getLoanStatusClass = (status: LoanStatus) => {
        switch (status) {
            case 'PAGO': return 'bg-green-100 text-green-700';
            case 'VENCIDO': return 'bg-red-100 text-red-700 animate-pulse';
            case 'EM_DIA': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    // --- Render Functions for Tabs ---

    const renderConfigTab = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <label className="text-xs font-bold text-gray-500">Taxa de Juros (%)</label>
                    <div className="flex items-center gap-2 mt-2">
                        <Percent className="w-4 h-4 text-gray-400"/>
                        <input type="number" value={cfg.interest_rate_percent} onChange={e => setCfg({ ...cfg, interest_rate_percent: Number(e.target.value) })} className="flex-1 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-sm" />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <label className="text-xs font-bold text-gray-500">Prazo de Pagamento (dias)</label>
                    <div className="flex items-center gap-2 mt-2">
                        <Calendar className="w-4 h-4 text-gray-400"/>
                        <input type="number" value={cfg.repayment_days} onChange={e => setCfg({ ...cfg, repayment_days: Number(e.target.value) })} className="flex-1 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-sm" />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <label className="text-xs font-bold text-gray-500">Limite de Crédito (R$)</label>
                    <div className="flex items-center gap-2 mt-2">
                        <CreditCard className="w-4 h-4 text-gray-400"/>
                        <input type="number" value={cfg.credit_limit} onChange={e => setCfg({ ...cfg, credit_limit: Number(e.target.value) })} className="flex-1 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-sm" />
                    </div>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                    <label className="text-xs font-bold text-yellow-700 dark:text-yellow-400">Desconto Antecipação (%)</label>
                    <div className="flex items-center gap-2 mt-2">
                        <Percent className="w-4 h-4 text-yellow-600"/>
                        <input type="number" value={cfg.early_repayment_discount_percent || ''} onChange={e => setCfg({ ...cfg, early_repayment_discount_percent: Number(e.target.value) })} className="flex-1 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-sm" />
                    </div>
                </div>
            </div>
            <Button onClick={handleSaveConfig} disabled={saving} className="w-full py-3 mt-6">
                {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Save className="w-4 h-4 mr-2"/>Salvar Configurações</>}
            </Button>
        </>
    );

    const renderListTab = () => {
        if (listLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500"/></div>;

        return (
            <div className="space-y-4">
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

                {/* Loan Filters */}
                <div className="flex items-center gap-4">
                    <h4 className="text-sm font-bold text-gray-600 dark:text-gray-300">Filtrar por Status:</h4>
                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                        {(['ALL', 'EM_DIA', 'VENCIDO', 'PAGO'] as const).map(status => (
                            <button key={status} onClick={() => setLoanStatusFilter(status)} className={`py-1 px-3 rounded-lg text-xs font-bold transition-all ${loanStatusFilter === status ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                                {status === 'ALL' ? 'Todos' : status === 'EM_DIA' ? 'Em Dia' : status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Loans Table */}
                <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3"><Tooltip text="Nome do cliente que contratou o empréstimo">Mutuário</Tooltip></th>
                                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleLoanSort('amount')}><Tooltip text="Valor total do empréstimo contratado"><div className="flex items-center gap-1">Valor <ChevronsUpDown className="w-3 h-3"/></div></Tooltip></th>
                                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleLoanSort('startDate')}><Tooltip text="Data em que o empréstimo foi liberado"><div className="flex items-center gap-1">Contratação <ChevronsUpDown className="w-3 h-3"/></div></Tooltip></th>
                                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleLoanSort('dueDate')}><Tooltip text="Data final para quitação do empréstimo"><div className="flex items-center gap-1">Vencimento <ChevronsUpDown className="w-3 h-3"/></div></Tooltip></th>
                                <th scope="col" className="px-6 py-3"><Tooltip text="Situação atual do contrato do empréstimo">Status</Tooltip></th>
                                <th scope="col" className="px-6 py-3"><Tooltip text="Valor restante para a quitação completa">Saldo Devedor</Tooltip></th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredLoans.map(loan => (
                                <tr key={loan.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{loan.borrowerName}</td>
                                    <td className="px-6 py-4">{formatCurrency(loan.amount)}</td>
                                    <td className="px-6 py-4">{new Date(loan.startDate).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-4">{new Date(loan.dueDate).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-bold rounded-full ${getLoanStatusClass(loan.status)}`}>{loan.status === 'EM_DIA' ? 'Em Dia' : loan.status}</span></td>
                                    <td className="px-6 py-4 font-bold text-red-500">{formatCurrency(loan.outstandingBalance)}</td>
                                </tr>
                            ))}
                            {sortedAndFilteredLoans.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-10 text-gray-400">
                                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                                        Nenhum empréstimo encontrado com os filtros atuais.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500"/></div>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="flex justify-between items-center">
                 <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Settings className="w-5 h-5"/> Gerenciamento de Empréstimos</h3>
                 <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                     <Button variant={activeTab === 'config' ? 'primary' : 'ghost'} onClick={() => setActiveTab('config')}>Configurações</Button>
                     <Button variant={activeTab === 'list' ? 'primary' : 'ghost'} onClick={() => setActiveTab('list')}>Listagem Geral</Button>
                 </div>
            </div>

            {activeTab === 'config' && renderConfigTab()}
            {activeTab === 'list' && renderListTab()}
        </div>
    );
};
