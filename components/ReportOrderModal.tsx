import React, { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import { Button } from './Button';

interface ReportOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
    storeId: string; // ID of the store related to the order (or current user if store reporting)
}

export const ReportOrderModal: React.FC<ReportOrderModalProps> = ({ isOpen, onClose, orderId, storeId }) => {
    const [type, setType] = useState('general_problem');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const { alert } = useDialog();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            alert({ title: 'Atenção', message: 'Por favor, descreva o problema.' });
            return;
        }

        setLoading(true);
        try {
            const success = await cloud.createOrderReport(orderId, storeId, type, description);
            if (success) {
                await alert({ title: 'Sucesso', message: 'Problema reportado com sucesso. Nossa equipe analisará o caso.' });
                onClose();
            } else {
                throw new Error('Falha ao reportar.');
            }
        } catch (error) {
            console.error(error);
            alert({ title: 'Erro', message: 'Não foi possível enviar o reporte. Tente novamente.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in scale-95" onClick={e => e.stopPropagation()}>

                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" /> Relatar Problema
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tipo de Problema</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
                        >
                            <option value="general_problem">Problema Geral</option>
                            <option value="item_missing">Item Faltando</option>
                            <option value="wrong_item">Item Errado</option>
                            <option value="delivery_delay">Atraso na Entrega</option>
                            <option value="payment_issue">Problema no Pagamento</option>
                            <option value="driver_issue">Problema com Entregador</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Descrição</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Descreva o que aconteceu..."
                            rows={4}
                            className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none dark:text-white"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button type="button" variant="ghost" fullWidth onClick={onClose}>Cancelar</Button>
                        <Button type="submit" fullWidth disabled={loading}>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Reporte'}
                        </Button>
                    </div>
                </form>

            </div>
        </div>
    );
};
