import React from 'react';
import { AlertTriangle, Check, X, Info, Percent, Calendar, CreditCard } from 'lucide-react';
import { LoanConfig } from '../types';
import { Button } from './Button';

interface LoanModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    config: LoanConfig | null;
    neededAmount: number;
}

export const LoanModal: React.FC<LoanModalProps> = ({ isOpen, onConfirm, onCancel, config, neededAmount }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onCancel}>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                    <Info className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-lg dark:text-white">Empréstimo para Solicitação</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    Seu saldo é insuficiente para cobrir esta entrega. Você pode utilizar um empréstimo automático para concluir a solicitação.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-xs font-bold text-gray-500">Valor Necessário</p>
                        <p className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(neededAmount)}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><Percent className="w-3 h-3"/> Taxa de Juros</p>
                        <p className="font-bold">{config ? `${config.interest_rate_percent.toFixed(2)}%` : '--'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3"/> Prazo</p>
                        <p className="font-bold">{config ? `${config.repayment_days} dias` : '--'}</p>
                    </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-4">
                    <p className="text-xs font-bold text-gray-500 flex items-center gap-1"><CreditCard className="w-3 h-3"/> Limite de Crédito</p>
                    <p className="font-bold">{config ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(config.credit_limit) : '--'}</p>
                    {config && neededAmount > config.credit_limit && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Valor acima do limite configurado.</p>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Button variant="outline" onClick={onCancel}><X className="w-4 h-4 mr-2"/>Cancelar</Button>
                    <Button onClick={onConfirm}><Check className="w-4 h-4 mr-2"/>Confirmar Empréstimo</Button>
                </div>
            </div>
        </div>
    );
};

