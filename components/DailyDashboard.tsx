
import React, { useState, useEffect } from 'react';
import { Plus, Calculator, TrendingDown, Settings, Target, Trash2, Fuel, Utensils, Wrench, AlertCircle, Play, Square, CheckCircle, Wallet, X, Save } from 'lucide-react';
import { Button } from './Button';
import { DailyTransaction, DailySummary } from '../types';
import * as storage from '../services/storage';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const DailyDashboard: React.FC = () => {
    const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
    const [fixedValue, setFixedValue] = useState<number>(0);
    const [dailyGoal, setDailyGoal] = useState<number>(0);
    const [summary, setSummary] = useState<DailySummary>({ profit: 0, deliveryCount: 0, km: 0, goal: 0, location: null });
    
    // Modals
    const [showExtraModal, setShowExtraModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);

    // Confirmation Modals
    const [showEndDayConfirm, setShowEndDayConfirm] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    
    // Inputs
    const [extraValue, setExtraValue] = useState('');
    const [extraKm, setExtraKm] = useState('');
    const [expenseValue, setExpenseValue] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('fuel'); // fuel, food, maintenance, other
    
    // Config Inputs (String to handle empty state better)
    const [configFixed, setConfigFixed] = useState('');
    const [configGoal, setConfigGoal] = useState('');

    useEffect(() => {
        loadDailyData();
    }, []);

    useEffect(() => {
        calculateSummary();
    }, [transactions, dailyGoal]);

    const loadDailyData = () => {
        const txs = storage.getTodayTransactions();
        
        // Load settings or default to 0
        const storedFixed = storage.getFixedValue();
        const storedGoal = storage.getDailyGoal();
        
        const fVal = storedFixed !== null ? storedFixed : 0;
        const dGoal = storedGoal !== null ? storedGoal : 0;
        
        setTransactions(txs);
        setFixedValue(fVal);
        setDailyGoal(dGoal);
        
        setConfigFixed(fVal === 0 ? '' : fVal.toString());
        setConfigGoal(dGoal === 0 ? '' : dGoal.toString());
    };

    const calculateSummary = () => {
        const earnings = transactions.filter(t => t.type !== 'expense').reduce((acc, t) => acc + t.value, 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Math.abs(t.value), 0);
        const profit = earnings - expenses;
        const count = transactions.filter(t => t.type !== 'expense').length;
        const km = transactions.reduce((acc, t) => acc + (t.km || 0), 0);

        setSummary({
            profit,
            deliveryCount: count,
            km,
            goal: dailyGoal,
            location: null
        });
    };

    const handleAddTransaction = (tx: DailyTransaction) => {
        const newTxs = [tx, ...transactions];
        setTransactions(newTxs);
        storage.saveTodayTransactions(newTxs);
    };

    // Trigger Delete Modal
    const requestDelete = (id: string) => {
        setDeleteId(id);
    };

    // Confirm Delete
    const confirmDelete = () => {
        if (!deleteId) return;
        const newTxs = transactions.filter(t => t.id !== deleteId);
        setTransactions(newTxs);
        storage.saveTodayTransactions(newTxs);
        setDeleteId(null);
    };

    // --- ACTIONS ---

    const addFixedDelivery = () => {
        // Simply register the delivery using the configured fixed value (defaults to 0)
        // No modal prompt, just quick add.
        handleAddTransaction({
            id: crypto.randomUUID(),
            type: 'standard',
            value: fixedValue,
            timestamp: Date.now(),
            km: 0, 
            paymentMethod: 'cash'
        });
    };

    const addExtraDelivery = () => {
        const val = parseFloat(extraValue.replace(',', '.'));
        const km = parseFloat(extraKm.replace(',', '.'));
        if (isNaN(val) || val <= 0) return alert("Valor inválido");

        handleAddTransaction({
            id: crypto.randomUUID(),
            type: 'extra',
            value: val,
            km: isNaN(km) ? 0 : km,
            timestamp: Date.now(),
            description: 'Entrega Extra'
        });
        setExtraValue('');
        setExtraKm('');
        setShowExtraModal(false);
    };

    const addExpense = () => {
        const val = parseFloat(expenseValue.replace(',', '.'));
        if (isNaN(val) || val <= 0) return alert("Valor inválido");

        handleAddTransaction({
            id: crypto.randomUUID(),
            type: 'expense',
            value: -val, // Negative for logic
            timestamp: Date.now(),
            category: expenseCategory,
            description: expenseCategory === 'fuel' ? 'Combustível' : expenseCategory === 'food' ? 'Alimentação' : 'Outros'
        });
        setExpenseValue('');
        setShowExpenseModal(false);
    };

    const saveConfig = () => {
        // Parse empty strings as 0
        const f = configFixed === '' ? 0 : parseFloat(configFixed.replace(',', '.'));
        const g = configGoal === '' ? 0 : parseFloat(configGoal.replace(',', '.'));
        
        if (!isNaN(f)) {
            setFixedValue(f);
            storage.setFixedValue(f);
        }
        if (!isNaN(g)) {
            setDailyGoal(g);
            storage.setDailyGoal(g);
        }
        setShowConfigModal(false);
    };

    const requestEndDay = () => {
        if (transactions.length === 0) {
            return alert("Não há registros para salvar hoje.");
        }
        setShowEndDayConfirm(true);
    };

    const confirmEndDay = () => {
        // Save to History
        const today = new Date();
        const record = {
            id: crypto.randomUUID(),
            date: today.toISOString(),
            formattedDate: today.toLocaleDateString('pt-BR'),
            formattedTime: today.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'}),
            count: summary.deliveryCount,
            totalValue: summary.profit,
            totalKm: summary.km,
            timestamp: Date.now(),
            transactions: [...transactions] // Copy array
        };

        const currentHistory = storage.getHistory();
        storage.saveHistory([record, ...currentHistory]);
        
        // Clear Today
        setTransactions([]);
        storage.saveTodayTransactions([]);
        
        // Force reset summary visually immediately
        setSummary({ profit: 0, deliveryCount: 0, km: 0, goal: dailyGoal, location: null });
        
        setShowEndDayConfirm(false);
    };

    // Calculate Progress
    const progress = dailyGoal > 0 ? Math.min(100, Math.max(0, (summary.profit / dailyGoal) * 100)) : 0;

    return (
        <div className="space-y-6 animate-in fade-in pb-20">
            
            {/* Goal Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 z-20">
                    <button onClick={() => setShowConfigModal(true)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 hover:text-brand-600 transition-colors">
                        <Settings className="w-5 h-5"/>
                    </button>
                </div>
                
                <div className="relative z-10">
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Lucro Líquido</p>
                    <div className="flex items-baseline gap-1">
                        <h2 className={`text-5xl font-black tracking-tighter ${dailyGoal > 0 && summary.profit >= dailyGoal ? 'text-green-500' : 'text-gray-900 dark:text-white'}`}>
                            {formatCurrency(summary.profit)}
                        </h2>
                    </div>
                    
                    <div className="mt-6">
                        <div className="flex justify-between text-xs font-bold text-gray-400 mb-1">
                            <span>Progresso</span>
                            {dailyGoal > 0 ? (
                                <span>{progress.toFixed(0)}% da Meta ({formatCurrency(dailyGoal)})</span>
                            ) : (
                                <span>Sem meta definida</span>
                            )}
                        </div>
                        <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-brand-500'}`} 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 mb-2">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{summary.deliveryCount}</p>
                    <p className="text-xs text-gray-500 font-bold uppercase">Entregas</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 mb-2">
                        <Settings className="w-5 h-5" />
                    </div>
                    <p className="text-2xl font-black text-gray-900 dark:text-white">{summary.km.toFixed(1)}</p>
                    <p className="text-xs text-gray-500 font-bold uppercase">KM Rodados</p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
                <button 
                    onClick={addFixedDelivery}
                    className="col-span-1 bg-green-600 hover:bg-green-500 active:scale-95 text-white p-4 rounded-2xl shadow-lg shadow-green-900/20 flex flex-col items-center justify-center gap-2 transition-all"
                >
                    <Plus className="w-6 h-6" />
                    <span className="text-xs font-bold leading-none">{fixedValue > 0 ? `R$ ${fixedValue.toFixed(0)}` : 'Adicionar'}</span>
                </button>

                <button 
                    onClick={() => setShowExtraModal(true)}
                    className="col-span-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white p-4 rounded-2xl shadow-lg shadow-blue-900/20 flex flex-col items-center justify-center gap-2 transition-all"
                >
                    <Calculator className="w-6 h-6" />
                    <span className="text-xs font-bold leading-none">Extra</span>
                </button>

                <button 
                    onClick={() => setShowExpenseModal(true)}
                    className="col-span-1 bg-red-500 hover:bg-red-400 active:scale-95 text-white p-4 rounded-2xl shadow-lg shadow-red-900/20 flex flex-col items-center justify-center gap-2 transition-all"
                >
                    <TrendingDown className="w-6 h-6" />
                    <span className="text-xs font-bold leading-none">Gasto</span>
                </button>
            </div>

            <Button onClick={requestEndDay} variant="outline" className="w-full border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20">
                <Square className="w-4 h-4 mr-2 fill-current"/> Encerrar Dia e Salvar
            </Button>

            {/* Today's History */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 pl-2">Histórico de Hoje</h3>
                <div className="space-y-3">
                    {transactions.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-4">Nenhum registro hoje.</p>
                    )}
                    {transactions.map(tx => (
                        <div key={tx.id} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center shadow-sm animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'expense' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {tx.type === 'expense' ? <TrendingDown className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                                        {tx.type === 'standard' ? 'Entrega Padrão' : tx.type === 'extra' ? 'Entrega Extra' : tx.description}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                        {new Date(tx.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        {tx.km ? ` • ${tx.km} km` : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`font-bold ${tx.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                                    {tx.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(tx.value))}
                                </span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); requestDelete(tx.id); }} 
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- MODALS --- */}
            
            {/* End Day Confirmation Modal */}
            {showEndDayConfirm && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="font-bold text-xl dark:text-white mb-2">Encerrar Dia?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Isso salvará o resumo atual no histórico e limpará a tela para um novo dia.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowEndDayConfirm(false)} fullWidth>Cancelar</Button>
                            <Button onClick={confirmEndDay} fullWidth>Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
                        <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="font-bold text-xl dark:text-white mb-2">Excluir Registro?</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Esta ação não pode ser desfeita. O valor será removido do total.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setDeleteId(null)} fullWidth>Cancelar</Button>
                            <Button onClick={confirmDelete} variant="danger" fullWidth>Excluir</Button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* 1. Extra Delivery Modal */}
            {showExtraModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                        <h3 className="font-bold text-lg dark:text-white mb-4">Adicionar Extra</h3>
                        <div className="space-y-3">
                            <input type="tel" placeholder="Valor (R$)" value={extraValue} onChange={e => setExtraValue(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border focus:border-brand-500 dark:border-gray-600 dark:text-white" autoFocus />
                            <input type="number" placeholder="KM (Opcional)" value={extraKm} onChange={e => setExtraKm(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border focus:border-brand-500 dark:border-gray-600 dark:text-white" />
                            <div className="flex gap-2 mt-4">
                                <Button variant="outline" onClick={() => setShowExtraModal(false)} fullWidth>Cancelar</Button>
                                <Button onClick={addExtraDelivery} fullWidth>Adicionar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Expense Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                        <h3 className="font-bold text-lg dark:text-white mb-4">Registrar Gasto</h3>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <button onClick={() => setExpenseCategory('fuel')} className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${expenseCategory === 'fuel' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'border-gray-200 dark:border-gray-600 dark:text-gray-400'}`}>
                                <Fuel className="w-5 h-5"/> <span className="text-[10px] font-bold">Gasolina</span>
                            </button>
                            <button onClick={() => setExpenseCategory('food')} className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${expenseCategory === 'food' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-gray-200 dark:border-gray-600 dark:text-gray-400'}`}>
                                <Utensils className="w-5 h-5"/> <span className="text-[10px] font-bold">Comida</span>
                            </button>
                            <button onClick={() => setExpenseCategory('maintenance')} className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${expenseCategory === 'maintenance' ? 'bg-gray-100 border-gray-500 text-gray-600' : 'border-gray-200 dark:border-gray-600 dark:text-gray-400'}`}>
                                <Wrench className="w-5 h-5"/> <span className="text-[10px] font-bold">Manut.</span>
                            </button>
                        </div>
                        <input type="tel" placeholder="Valor (R$)" value={expenseValue} onChange={e => setExpenseValue(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border focus:border-red-500 dark:border-gray-600 dark:text-white" autoFocus />
                        <div className="flex gap-2 mt-4">
                            <Button variant="outline" onClick={() => setShowExpenseModal(false)} fullWidth>Cancelar</Button>
                            <Button onClick={addExpense} variant="danger" fullWidth>Registrar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Config Modal */}
            {showConfigModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                        <h3 className="font-bold text-lg dark:text-white mb-4">Configurações do Dia</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Meta Diária (R$)</label>
                                <input type="number" placeholder="0.00" value={configGoal} onChange={e => setConfigGoal(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border focus:border-brand-500 dark:border-gray-600 dark:text-white" />
                                <p className="text-[10px] text-gray-400 mt-1">Deixe 0 para não ter meta.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Valor Fixo da Entrega (R$)</label>
                                <input type="number" placeholder="0.00" value={configFixed} onChange={e => setConfigFixed(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border focus:border-brand-500 dark:border-gray-600 dark:text-white" />
                                <p className="text-[10px] text-gray-400 mt-1">Valor usado no botão de ação rápida (+).</p>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <Button variant="outline" onClick={() => setShowConfigModal(false)} fullWidth>Cancelar</Button>
                                <Button onClick={saveConfig} fullWidth>Salvar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
