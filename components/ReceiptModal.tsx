import React, { useRef } from 'react';
import { X, Download, Share2, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { Button } from './Button';
import { FinancialStatementItem } from '../types';
import html2canvas from 'html2canvas';
import { Logo } from './Logo';
import { useDialog } from '../utils/dialogService'; // Import useDialog

interface ReceiptModalProps {
    transaction: FinancialStatementItem;
    onClose: () => void;
    userName?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose, userName }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const { alert } = useDialog(); // Use the custom dialog service

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
            // console.error(e);
            await alert({ title: "Erro ao Gerar Imagem", message: "Erro ao gerar imagem." });
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

                {/* Actions Header */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white">Comprovante</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"><X className="w-5 h-5" /></button>
                </div>

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
                                {formatCurrency(transaction.amount)}
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