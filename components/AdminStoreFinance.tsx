import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, DollarSign, RefreshCw, FileText, Filter, Eye, User, Search, X } from 'lucide-react';
import * as cloud from '../services/cloud';
import { AdminWalletUser, FinancialStatementItem, UserRole } from '../types';
import { Button } from './Button';
import { CustomDateInput } from './CustomDateInput';
import { ReceiptModal } from './ReceiptModal';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDateTime = (isoString: string) => new Date(isoString).toLocaleString('pt-BR');

export const AdminStoreFinance: React.FC = () => {
    const [stores, setStores] = useState<AdminWalletUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Modal for store's financial details
    const [showStoreDetailModal, setShowStoreDetailModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState<AdminWalletUser | null>(null);
    const [storeTransactions, setStoreTransactions] = useState<FinancialStatementItem[]>([]);
    const [loadingStoreTxs, setLoadingStoreTxs] = useState(false);
    const [txDateRange, setTxDateRange] = useState({ start: '', end: '' });
    const [selectedTx, setSelectedTx] = useState<FinancialStatementItem | null>(null);

    const loadStores = useCallback(async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetAllWallets();
            setStores(data.filter(u => u.role === 'store_partner'));
        } catch (e) {
            console.error("Error loading store wallets:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStores();
    }, [loadStores]);

    const loadStoreTransactions = useCallback(async (storeId: string, startDate: string, endDate: string) => {
        setLoadingStoreTxs(true);
        try {
            const { items } = await cloud.getFinancialStatement('store_partner', startDate, endDate);
            setStoreTransactions(items);
        } catch (e) {
            console.error("Error loading store transactions:", e);
        } finally {
            setLoadingStoreTxs(false);
        }
    }, []);

    const filteredStores = stores.filter(store => 
        (store.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (store.email || '').toLowerCase().includes(search.toLowerCase())
    );

    const openStoreDetails = (store: AdminWalletUser) => {
        setSelectedStore(store);
        const today = new Date().toISOString().split('T')[0];
        setTxDateRange({ start: today, end: today });
        setShowStoreDetailModal(true);
        // Load initial transactions for today
        loadStoreTransactions(store.user_id, today, today);
    };

    const StoreDetailModal: React.FC<{ store: AdminWalletUser, onClose: () => void }> = ({ store, onClose }) => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] rounded-2xl p-6 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-500" /> Finanças de {store.name}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    <div className="bg-gradient-to-br from-green-600 to-green-700 text-white p-4 rounded-xl shadow-lg">
                        <p className="text-xs font-bold uppercase opacity-80">Saldo Atual</p>
                        <h4 className="text-3xl font-black">{formatCurrency(store.balance)}</h4>
                    </div>

                    <div className="flex gap-2">
                        <CustomDateInput value={txDateRange.start} onChange={v => setTxDateRange(prev => ({...prev, start: v}))} label="De" />
                        <CustomDateInput value={txDateRange.end} onChange={v => setTxDateRange(prev => ({...prev, end: v}))} label="Até" />
                        <Button onClick={() => loadStoreTransactions(store.user_id, txDateRange.start, txDateRange.end)} className="py-2 px-3 self-end">
                            <Filter className="w-4 h-4"/>
                        </Button>
                    </div>

                    <h4 className="font-bold text-gray-900 dark:text-white text-md mt-4 flex items-center gap-2"><FileText className="w-4 h-4"/> Extrato</h4>
                    <div className="space-y-3">
                        {loadingStoreTxs ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-500"/></div>
                        ) : storeTransactions.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">Nenhuma transação encontrada no período.</div>
                        ) : (
                            storeTransactions.map(tx => (
                                <div key={tx.id} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer hover:border-brand-200" onClick={() => setSelectedTx(tx)}>
                                    <div>
                                        <p className="font-bold text-sm dark:text-white">{tx.description}</p>
                                        <p className="text-xs text-gray-500">{formatDateTime(tx.date)}</p>
                                    </div>
                                    <span className={`font-black text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(tx.amount)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                {selectedTx && <ReceiptModal transaction={selectedTx} onClose={() => setSelectedTx(null)} userName={store.name} />}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="relative flex-1 w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                    <input 
                        type="text" 
                        placeholder="Buscar loja por nome ou email..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 p-3 bg-white dark:bg-gray-800 rounded-xl outline-none border border-gray-200 dark:border-gray-700 dark:text-white"
                    />
                </div>
                <button onClick={loadStores} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
                    <RefreshCw className="w-5 h-5 text-gray-500"/>
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Loja</th>
                                <th className="px-4 py-3">Saldo</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={3} className="text-center p-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500"/></td></tr>}
                            {!loading && filteredStores.length === 0 && <tr><td colSpan={3} className="text-center p-8 text-gray-400">Nenhuma loja encontrada.</td></tr>}
                            {!loading && filteredStores.map(store => (
                                <tr key={store.user_id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold dark:text-white">{store.name}</p>
                                        <p className="text-xs text-gray-500">{store.email}</p>
                                    </td>
                                    <td className={`px-4 py-3 font-mono font-bold ${store.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                        {formatCurrency(store.balance)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button size="sm" variant="outline" onClick={() => openStoreDetails(store)} className="px-3 py-1.5 text-xs">
                                            <Eye className="w-4 h-4 mr-1"/> Ver Finanças
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedStore && <StoreDetailModal store={selectedStore} onClose={() => setShowStoreDetailModal(false)} />}
        </div>
    );
};