
import React, { useState } from 'react';
import { Trash2, Wallet, CreditCard, ChevronDown, Filter, TrendingDown, Plus, Calendar, Clock, Edit2 } from 'lucide-react';
import { DeliveryRecord, DailyTransaction } from '../types';
import { CustomDateInput } from './CustomDateInput';
import { CustomSelect } from './CustomSelect';
import { Button } from './Button';
import * as storage from '../services/storage';

interface HistoryTableProps {
  history: DeliveryRecord[];
  onClear: () => void;
  onExport: () => void;
  onAdd?: () => void; // Nova prop opcional
  dateFilter: { start: string, end: string };
  setDateFilter: (filter: { start: string, end: string }) => void;
  expenseFilter: 'all' | 'with' | 'without';
  setExpenseFilter: (filter: 'all' | 'with' | 'without') => void;
  onUpdateHistory: (history: DeliveryRecord[]) => void;
}

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


export const HistoryTable: React.FC<HistoryTableProps> = ({ history, onClear, onExport, onAdd, dateFilter, setDateFilter, expenseFilter, setExpenseFilter, onUpdateHistory }) => {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<{ recordId: string; tx: DailyTransaction } | null>(null);
  const [editedValue, setEditedValue] = useState('');
  const [editedKm, setEditedKm] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [transactionToRefund, setTransactionToRefund] = useState<{ recordId: string; tx: DailyTransaction } | null>(null);

  const formatCurrency = (val?: number) => {
    if (val === undefined || isNaN(val)) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatKm = (val?: number) => {
    if (!val || isNaN(val)) return '-';
    return `${val.toFixed(1)} km`;
  };

  const openEditModal = (recordId: string, tx: DailyTransaction) => {
    setEditingTx({ recordId, tx });
    setEditedValue(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Math.abs(tx.value)));
    setEditedKm(String(tx.km || ''));
  };

  const handleSaveEdit = () => {
    if (!editingTx) return;

    const newHistory = history.map(record => {
      if (record.id === editingTx.recordId) {
        const updatedTransactions = (record.transactions || []).map(tx => {
          if (tx.id === editingTx.tx.id) {
            const newValue = parseCurrency(editedValue);
            return {
              ...tx,
              value: tx.type === 'expense' ? -newValue : newValue,
              km: parseFloat(editedKm.replace(',', '.')) || 0,
            };
          }
          return tx;
        });

        // Recalculate totals for the record
        const expenses = updatedTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Math.abs(curr.value), 0);
        const grossIncome = updatedTransactions.filter(t => t.type !== 'expense').reduce((acc, curr) => acc + curr.value, 0);
        const totalValue = grossIncome - expenses;
        const totalKm = updatedTransactions.reduce((acc, curr) => acc + (curr.km || 0), 0);
        const cash = updatedTransactions.reduce((acc, t) => (t.value > 0 && t.paymentMethod === 'cash' ? acc + t.value : acc), 0);
        const digital = updatedTransactions.reduce((acc, t) => (t.value > 0 && t.paymentMethod === 'digital' ? acc + t.value : acc), 0);
        const expenseBreakdown: Record<string, number> = {};
        updatedTransactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
          expenseBreakdown[t.category!] = (expenseBreakdown[t.category!] || 0) + Math.abs(t.value);
        });

        return {
          ...record,
          transactions: updatedTransactions,
          totalValue,
          totalKm,
          paymentBreakdown: { cash, digital },
          expenseBreakdown,
        };
      }
      return record;
    });

    onUpdateHistory(newHistory);
    storage.saveHistory(newHistory);
    setEditingTx(null);
  };

  const handleConfirmRefund = () => {
    if (!transactionToRefund) return;

    const newHistory = history.map(record => {
      if (record.id === transactionToRefund.recordId) {
        const updatedTransactions = (record.transactions || []).map(tx => {
          if (tx.id === transactionToRefund.tx.id) {
            return {
              ...tx,
              isRefunded: true,
              value: -Math.abs(tx.value), // Ensure value is negative for refunded transactions
            };
          }
          return tx;
        });

        // Recalculate totals for the record
        const expenses = updatedTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Math.abs(curr.value), 0);
        const grossIncome = updatedTransactions.filter(t => t.type !== 'expense').reduce((acc, curr) => acc + curr.value, 0);
        const totalValue = grossIncome - expenses; // Refunded transactions will contribute negatively here
        const totalKm = updatedTransactions.reduce((acc, curr) => acc + (curr.km || 0), 0);
        const cash = updatedTransactions.reduce((acc, t) => (t.value > 0 && t.paymentMethod === 'cash' && !t.isRefunded ? acc + t.value : acc), 0);
        const digital = updatedTransactions.reduce((acc, t) => (t.value > 0 && t.paymentMethod === 'digital' && !t.isRefunded ? acc + t.value : acc), 0);
        const expenseBreakdown: Record<string, number> = {};
        updatedTransactions.filter(t => t.type === 'expense' && t.category).forEach(t => {
          expenseBreakdown[t.category!] = (expenseBreakdown[t.category!] || 0) + Math.abs(t.value);
        });

        return {
          ...record,
          transactions: updatedTransactions,
          totalValue,
          totalKm,
          paymentBreakdown: { cash, digital },
          expenseBreakdown,
        };
      }
      return record;
    });

    onUpdateHistory(newHistory);
    storage.saveHistory(newHistory);
    setShowRefundModal(false);
    setTransactionToRefund(null);
  };


  return (
    <div className="">

      {/* Filter Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <h3 className="font-bold text-gray-500 text-sm">Filtros</h3>
          </div>
          {onAdd && (
            <button onClick={onAdd} className="mt-2 text-white bg-brand-700 hover:bg-brand-800 flex items-center gap-1 text-xs font-bold bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-full">
              <Plus className="w-3 h-3" /> Novo Registro
            </button>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 min-w-[150px]">
            <CustomDateInput
              value={dateFilter.start}
              onChange={(val) => setDateFilter({ ...dateFilter, start: val })}
              label="De"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <CustomDateInput
              value={dateFilter.end}
              onChange={(val) => setDateFilter({ ...dateFilter, end: val })}
              label="Até"
            />
          </div>
          <div className="flex-1 min-w-[180px] flex items-end">
            <div className="relative w-full">
              <TrendingDown className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
              <CustomSelect
                label="Filtro de Gastos"
                value={expenseFilter}
                onChange={(val) => setExpenseFilter(val as any)}
                options={[
                  { label: 'Todos os Dias', value: 'all' },
                  { label: 'Com Gastos', value: 'with' },
                  { label: 'Sem Gastos', value: 'without' },
                ]}
                className="pl-8"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tools */}
      <div className="flex justify-end items-center gap-3 mb-4">
        <button
          onClick={onExport}
          className="px-4 py-2 bg-white dark:bg-gray-800 rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
        >
          Exportar CSV
        </button>
        <button
          onClick={onClear}
          className="px-4 py-2 bg-red-50 dark:bg-red-900/20 rounded-full text-xs font-bold text-red-500 hover:bg-red-100 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Limpar
        </button>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 dark:text-gray-500 font-medium">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((record) => {
            const isExpanded = expandedRowId === record.id;
            return (
              <div
                key={record.id}
                onClick={() => setExpandedRowId(isExpanded ? null : record.id)}
                className="bg-white dark:bg-gray-800 p-5 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                      {record.formattedDate.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">{record.formattedDate}</h4>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" /> {record.formattedTime}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-gray-900 dark:text-white text-lg">{formatCurrency(record.totalValue)}</div>
                    <div className="text-xs font-bold text-gray-400">{record.count} entregas</div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl">
                      <div className="text-center flex-1 border-r border-gray-200 dark:border-gray-600">
                        <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1"><Wallet className="w-3 h-3" /> Dinheiro</div>
                        <div className="font-bold text-green-600 text-sm">{formatCurrency(record.paymentBreakdown?.cash)}</div>
                      </div>
                      <div className="text-center flex-1 border-r border-gray-200 dark:border-gray-600">
                        <div className="text-[10px] uppercase font-bold text-gray-400 flex items-center justify-center gap-1"><CreditCard className="w-3 h-3" /> Digital</div>
                        <div className="font-bold text-blue-600 text-sm">{formatCurrency(record.paymentBreakdown?.digital)}</div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-[10px] uppercase font-bold text-gray-400">KM Total</div>
                        <div className="font-bold text-gray-700 dark:text-gray-300 text-sm">{formatKm(record.totalKm)}</div>
                      </div>
                    </div>

                    {/* Transactions List */}
                    {record.transactions && record.transactions.length > 0 ? (
                      <div className="space-y-2">
                        {record.transactions.map((t) => (
                          <div key={t.id} className="flex justify-between items-center text-xs py-2 border-b border-gray-50 dark:border-gray-700 last:border-0 group">
                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                              {t.type === 'expense' ? (
                                <div className="w-1 h-4 bg-red-500 rounded-full"></div>
                              ) : (
                                <div className="w-1 h-4 bg-green-500 rounded-full"></div>
                              )}
                              <span className="font-medium">
                                {t.type === 'standard' ? 'Entrega Padrão' : t.type === 'extra' ? 'Entrega Extra' : `Gasto (${t.category})`}
                              </span>
                              {t.description && <span className="text-gray-400">- {t.description}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`font-bold ${t.type === 'expense' ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                {t.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(t.value))}
                                {t.isRefunded && <span className="ml-2 text-red-500 font-bold">(Reembolsado)</span>}
                              </div>
                              {!t.isRefunded && t.type !== 'expense' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTransactionToRefund({ recordId: record.id, tx: t });
                                    setShowRefundModal(true);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500"
                                  title="Reembolsar Transação"
                                >
                                  <TrendingDown className="w-3 h-3" />
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); openEditModal(record.id, t); }} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-blue-500">
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-gray-400 italic py-2">Sem detalhes.</p>
                    )}
                  </div>
                )}

                {!isExpanded && (
                  <div className="flex justify-center pt-2">
                    <ChevronDown className="w-4 h-4 text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingTx && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setEditingTx(null)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg dark:text-white">Editar Transação</h3>
            <div>
              <label className="text-xs font-bold text-gray-400">Valor (R$)</label>
              <input type="tel" value={editedValue} onChange={e => handleCurrencyMask(e, setEditedValue)} className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mt-1" autoFocus />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400">KM</label>
              <input type="number" value={editedKm} onChange={e => setEditedKm(e.target.value)} className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mt-1" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth onClick={() => setEditingTx(null)}>Cancelar</Button>
              <Button fullWidth onClick={handleSaveEdit}>Salvar</Button>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && transactionToRefund && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowRefundModal(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg dark:text-white">Confirmar Reembolso</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Você tem certeza que deseja reembolsar a seguinte transação?
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl text-sm">
              <p><strong>Tipo:</strong> {transactionToRefund.tx.type === 'standard' ? 'Entrega Padrão' : 'Entrega Extra'}</p>
              <p><strong>Valor:</strong> {formatCurrency(Math.abs(transactionToRefund.tx.value))}</p>
              {transactionToRefund.tx.description && <p><strong>Descrição:</strong> {transactionToRefund.tx.description}</p>}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth onClick={() => setShowRefundModal(false)}>Cancelar</Button>
              <Button fullWidth onClick={() => handleConfirmRefund()}>Confirmar Reembolso</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
