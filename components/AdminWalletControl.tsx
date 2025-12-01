
import React, { useState, useEffect } from 'react';
import { Wallet, Search, Filter, RefreshCw, Loader2, Plus, Minus, DollarSign, X } from 'lucide-react';
import * as cloud from '../services/cloud';
import { AdminWalletUser } from '../types';
import { Button } from './Button';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const AdminWalletControl: React.FC = () => {
    const [wallets, setWallets] = useState<AdminWalletUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'STORE_PARTNER' | 'DELIVERY_PARTNER'>('ALL');
    const [search, setSearch] = useState('');
    
    // Modal State
    const [selectedUser, setSelectedUser] = useState<AdminWalletUser | null>(null);
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [actionType, setActionType] = useState<'ADD' | 'REMOVE'>('ADD');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetAllWallets();
            setWallets(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredWallets = wallets.filter(w => {
        const matchesType = filter === 'ALL' || w.role === filter;
        const matchesSearch = w.name?.toLowerCase().includes(search.toLowerCase()) || w.email?.toLowerCase().includes(search.toLowerCase());
        return matchesType && matchesSearch;
    });

    const handleOpenModal = (user: AdminWalletUser, type: 'ADD' | 'REMOVE') => {
        setSelectedUser(user);
        setActionType(type);
        setAmount('');
        setReason('');
    };

    const handleConfirmAdjustment = async () => {
        if (!selectedUser || !amount || !reason) return alert("Preencha todos os campos.");
        const val = parseFloat(amount.replace(',', '.'));
        if (isNaN(val) || val <= 0) return alert("Valor inválido.");

        const finalAmount = actionType === 'ADD' ? val : -val;

        setProcessing(true);
        try {
            await cloud.adminAdjustBalance(selectedUser.user_id, finalAmount, reason);
            alert("Saldo ajustado com sucesso!");
            setSelectedUser(null);
            loadData();
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'ALL' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Todos</button>
                    <button onClick={() => setFilter('STORE_PARTNER')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'STORE_PARTNER' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Lojistas</button>
                    <button onClick={() => setFilter('DELIVERY_PARTNER')} className={`px-4 py-2 rounded-lg text-sm font-bold ${filter === 'DELIVERY_PARTNER' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Entregadores</button>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar nome ou email..." 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
                        />
                    </div>
                    <button onClick={loadData} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700">
                        <RefreshCw className="w-5 h-5 text-gray-500"/>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Usuário</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Saldo Atual</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={4} className="text-center p-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600"/></td></tr>}
                            {!loading && filteredWallets.map(user => (
                                <tr key={user.user_id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold dark:text-white">{user.name}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${user.role === 'STORE_PARTNER' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {user.role === 'STORE_PARTNER' ? 'Lojista' : 'Entregador'}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 font-mono font-bold ${user.balance < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                        {formatCurrency(user.balance)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => handleOpenModal(user, 'ADD')} 
                                                className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" 
                                                title="Adicionar Saldo"
                                            >
                                                <Plus className="w-4 h-4"/>
                                            </button>
                                            <button 
                                                onClick={() => handleOpenModal(user, 'REMOVE')} 
                                                className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" 
                                                title="Remover Saldo"
                                            >
                                                <Minus className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredWallets.length === 0 && (
                                <tr><td colSpan={4} className="text-center p-8 text-gray-400">Nenhum usuário encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
                        <button onClick={() => setSelectedUser(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-3 rounded-full ${actionType === 'ADD' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                <DollarSign className="w-6 h-6"/>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg dark:text-white">{actionType === 'ADD' ? 'Adicionar Saldo' : 'Remover Saldo'}</h3>
                                <p className="text-xs text-gray-500">{selectedUser.name}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Valor (R$)</label>
                                <input 
                                    type="number" 
                                    value={amount} 
                                    onChange={e => setAmount(e.target.value)} 
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Motivo (Obrigatório)</label>
                                <textarea 
                                    value={reason} 
                                    onChange={e => setReason(e.target.value)} 
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white h-20 resize-none"
                                    placeholder="Ex: Bônus por meta, Correção de erro..."
                                />
                            </div>

                            <Button 
                                fullWidth 
                                onClick={handleConfirmAdjustment} 
                                disabled={processing} 
                                variant={actionType === 'ADD' ? 'success' : 'danger'}
                            >
                                {processing ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Confirmar Ajuste'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
