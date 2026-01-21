import React, { useRef, useState } from 'react';
import { X, Download, Share2, CheckCircle, AlertTriangle, Clock, Edit3, Save } from 'lucide-react';
import { Button } from './Button';
import { FinancialStatementItem } from '../types';
import html2canvas from 'html2canvas';
import { Logo } from './Logo';
import { useDialog } from '../utils/dialogService';

interface ReceiptModalProps {
    transaction: FinancialStatementItem;
    onClose: () => void;
    userName?: string;
    allowEdit?: boolean;
    onSaveEdit?: (newAmount: number, newCurrency: string) => Promise<void>;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
    transaction,
    onClose,
    userName,
    allowEdit = false,
    onSaveEdit
}) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const { alert, confirm } = useDialog();

    const [isEditing, setIsEditing] = useState(false);
    const [editAmount, setEditAmount] = useState(Math.abs(transaction.amount).toString());
    const [editCurrency, setEditCurrency] = useState('BRL');
    const [saving, setSaving] = useState(false);

    const handleDownload = async () => {
        if (!receiptRef.current) return;
        try {
            const canvas = await html2canvas(receiptRef.current, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true
            });
            const link = document.createElement('a');
            link.download = `comprovante_${transaction.id.substring(0, 8)}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            await alert({ title: "Erro ao Gerar Imagem", message: "Erro ao gerar imagem." });
        }
    };

    const handleSaveEdit = async () => {
        const confirmed = await confirm({
            title: 'Confirmar Edição',
            message: `Tem certeza que deseja alterar o valor para ${formatCurrency(parseFloat(editAmount), editCurrency)}?`,
            confirmButtonText: 'Salvar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmed || !onSaveEdit) return;

        setSaving(true);
        try {
            const newAmount = transaction.amount < 0 ? -parseFloat(editAmount) : parseFloat(editAmount);
            await onSaveEdit(newAmount, editCurrency);
            setIsEditing(false);
            await alert({ title: 'Sucesso', message: 'Valor atualizado com sucesso!' });
        } catch (error) {
            await alert({ title: 'Erro', message: 'Falha ao atualizar valor: ' + (error as Error).message });
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (val: number, currency: string = 'BRL') => {
        const currencyMap: Record<string, string> = {
            'BRL': 'pt-BR',
            'USD': 'en-US',
            'EUR': 'de-DE'
        };

        return new Intl.NumberFormat(currencyMap[currency] || 'pt-BR', {
            style: 'currency',
            currency
        }).format(val);
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Actions Header */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white">Comprovante</h3>
                    <div className="flex items-center gap-2">
                        {allowEdit && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-500"
                                title="Editar valor"
                            >
                                <Edit3 className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Edit Mode */}
                {isEditing && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3">Editar Transação</p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">Valor</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-1 block">Moeda</label>
                                <select
                                    value={editCurrency}
                                    onChange={(e) => setEditCurrency(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="BRL">BRL - Real Brasileiro</option>
                                    <option value="USD">USD - Dólar Americano</option>
                                    <option value="EUR">EUR - Euro</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                    className="flex-1 flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Printable Receipt Area */}
                <div className="p-6 bg-white overflow-y-auto" ref={receiptRef}>
                    <div className="flex flex-col items-center text-center border-b-2 border-dashed border-gray-200 pb-6 mb-6">
                        <Logo className="h-8 w-auto text-black mb-4" />
                        <h2 className="text-gray-900 font-bold text-lg mb-1">Zé Entregas</h2>
                        <p className="text-xs text-gray-400 uppercase tracking-widest">Comprovante de Transação</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Valor</span>
                            <span className={`text-xl font-black ${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(transaction.amount, editCurrency)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Data</span>
                            <span className="text-sm font-bold text-gray-800">{formatDate(transaction.date)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Tipo</span>
                            <span className="text-sm font-bold text-gray-800 uppercase">{transaction.type === 'EARNING' ? 'Ganho' : transaction.type === 'WITHDRAWAL' ? 'Saque' : 'Débito'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Status</span>
                            <div className="flex items-center gap-1">
                                {transaction.status === 'COMPLETED' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                {transaction.status === 'PENDING' && <Clock className="w-4 h-4 text-yellow-500" />}
                                {transaction.status === 'FAILED' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                <span className="text-sm font-bold text-gray-800">{transaction.status}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl mb-6">
                        <p className="text-xs text-gray-400 uppercase mb-1">Descrição</p>
                        <p className="text-sm font-bold text-gray-800">{transaction.description}</p>
                        {transaction.id && <p className="text-[10px] text-gray-400 mt-2 font-mono">ID: {transaction.id}</p>}
                    </div>

                    {userName && (
                        <div className="text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
                            Autenticado para: <strong>{userName}</strong>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700">
                    <Button fullWidth onClick={handleDownload} className="flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" /> Baixar Comprovante
                    </Button>
                </div>
            </div>
        </div>
    );
};