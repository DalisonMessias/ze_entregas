
import React, { useState, useEffect } from 'react';
import { HistoryTable } from './HistoryTable';
import * as storage from '../services/storage';
import * as cloud from '../services/cloud';
import { DeliveryRecord } from '../types';
import { Plus, X, Calendar, DollarSign, Package, Gauge } from 'lucide-react';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService'; // Import useDialog

const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) { setter(""); return; }
    const amount = Number(value) / 100;
    setter(amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
};

const parseCurrency = (val: string): number => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
};

export const LocalHistoryPage: React.FC = () => {
    const { alert, confirm } = useDialog();
    const [history, setHistory] = useState<DeliveryRecord[]>([]);
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [expenseFilter, setExpenseFilter] = useState<'all' | 'with' | 'without'>('all');

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRecord, setNewRecord] = useState({ date: '', value: '', count: '', km: '' });

    useEffect(() => {
        setHistory(storage.getHistory());
    }, []);

    const handleUpdate = (newHistory: DeliveryRecord[]) => {
        setHistory(newHistory);
        storage.saveHistory(newHistory);
    };

    const handleClear = async () => {
        const result = await confirm({ title: "Confirmar Exclusão", message: "Tem certeza que deseja apagar todo o histórico local? Esta ação não pode ser desfeita." });
        if (result) {
            storage.saveHistory([]);
            setHistory([]);
        }
    };

    const handleAddRecord = async () => {
        if (!newRecord.date || !newRecord.value) { await alert({ title: "Dados Incompletos", message: "Preencha data e valor." }); return; }

        const dateObj = new Date(newRecord.date);
        const dateParts = newRecord.date.split('-'); // YYYY-MM-DD
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        const value = parseCurrency(newRecord.value);
        const count = parseInt(newRecord.count) || 1;
        const km = parseFloat(newRecord.km.replace(',', '.')) || 0;

        const record: DeliveryRecord = {
            id: crypto.randomUUID(),
            date: new Date(newRecord.date).toISOString(),
            formattedDate: formattedDate,
            formattedTime: 'Manual',
            count: count,
            totalValue: value,
            totalKm: km,
            timestamp: dateObj.getTime(),
            paymentBreakdown: { cash: value, digital: 0 },
            transactions: [
                {
                    id: crypto.randomUUID(),
                    type: 'standard',
                    value: value,
                    km: km,
                    timestamp: dateObj.getTime(),
                    description: 'Resumo Manual',
                    paymentMethod: 'cash'
                }
            ],
            expenseBreakdown: {}
        };

        const updatedHistory = [record, ...history].sort((a, b) => b.timestamp - a.timestamp);

        setHistory(updatedHistory);
        storage.saveHistory(updatedHistory);

        try {
            await cloud.saveManualHistory(record);
        } catch (e) {
            // console.error("Failed to sync manual record", e);
        } finally {
            setShowAddModal(false);
            setNewRecord({ date: '', value: '', count: '', km: '' });
        }
    };

    const handleExport = async () => {
        if (history.length === 0) { await alert({ title: "Nenhum Registro", message: "Nada para exportar." }); return; }

        const headers = "Data,Hora,Entregas,Valor Total,KM Total,Gastos,Lucro Liquido";
        const rows = history.map(r => {
            const expenses = (Object.values(r.expenseBreakdown || {}) as number[]).reduce((a, b) => a + b, 0);
            return `${r.formattedDate},${r.formattedTime},${r.count},${(r.totalValue + expenses).toFixed(2)},${r.totalKm.toFixed(1)},${expenses.toFixed(2)},${r.totalValue.toFixed(2)}`;
        }).join("\n");

        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "ze_historico_local.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Filter Logic
    const filteredHistory = history.filter(record => {
        const recordDate = new Date(record.date);

        if (dateFilter.start) {
            const startDate = new Date(dateFilter.start);
            startDate.setHours(0, 0, 0, 0);
            const recordDateOnly = new Date(recordDate);
            recordDateOnly.setHours(0, 0, 0, 0);
            if (recordDateOnly < startDate) return false;
        }

        if (dateFilter.end) {
            const endDate = new Date(dateFilter.end);
            endDate.setHours(23, 59, 59, 999);
            if (recordDate > endDate) return false;
        }

        const hasExpenses = record.transactions?.some(t => t.type === 'expense');
        if (expenseFilter === 'with' && !hasExpenses) return false;
        if (expenseFilter === 'without' && hasExpenses) return false;

        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in pb-24">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Histórico Local</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Registros manuais salvos no seu dispositivo.
                </p>
            </div>

            <HistoryTable
                history={filteredHistory}
                onClear={handleClear}
                onExport={handleExport}
                onAdd={() => setShowAddModal(true)}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                expenseFilter={expenseFilter}
                setExpenseFilter={setExpenseFilter}
                onUpdateHistory={handleUpdate}
            />

            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-brand-500" /> Novo Registro Manual
                            </h3>
                            <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Data</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        value={newRecord.date}
                                        onChange={e => setNewRecord({ ...newRecord, date: e.target.value })}
                                        className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Lucro Total (R$)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={newRecord.value}
                                        onChange={e => handleCurrencyMask(e, val => setNewRecord({ ...newRecord, value: val }))}
                                        placeholder="0,00"
                                        className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white font-bold text-lg"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Entregas</label>
                                    <div className="relative">
                                        <Package className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            value={newRecord.count}
                                            onChange={e => setNewRecord({ ...newRecord, count: e.target.value })}
                                            placeholder="0"
                                            className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">KM Total</label>
                                    <div className="relative">
                                        <Gauge className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            value={newRecord.km}
                                            onChange={e => setNewRecord({ ...newRecord, km: e.target.value })}
                                            placeholder="0"
                                            className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button fullWidth onClick={handleAddRecord} className="mt-4">Salvar Registro</Button>
                    </div>
                </div>
            )}
        </div>
    );
};
