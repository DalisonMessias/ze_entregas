import React, { useState, useEffect } from 'react';
import { Crown, Check, Loader2, X, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { PartnerFeeSettings } from '../types';

interface SuperStoreModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const SuperStoreModal: React.FC<SuperStoreModalProps> = ({ onClose, onSuccess }) => {
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadFees = async () => {
            try {
                const settings = await cloud.adminGetFeeSettings();
                setFees(settings);
            } catch (e) {
                console.error(e);
                setError('Erro ao carregar valores.');
            } finally {
                setLoading(false);
            }
        };
        loadFees();
    }, []);

    const handleSubscribe = async () => {
        if (!fees?.super_store_monthly_fee) return;
        setProcessing(true);
        setError('');
        try {
            await cloud.subscribeToSuperStore(fees.super_store_monthly_fee);
            alert("Parabéns! Você agora é um Super Lojista.");
            onSuccess();
            onClose();
        } catch (e: any) {
            setError(e.message || "Erro ao processar assinatura.");
        } finally {
            setProcessing(false);
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full z-10">
                    <X className="w-5 h-5 text-white"/>
                </button>

                {/* Header Image/Gradient */}
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 text-center pt-12 pb-16 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '20px 20px' }}></div>
                    <div className="relative z-10">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Crown className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight">Super Lojista</h2>
                        <p className="text-yellow-100 text-sm font-medium mt-1">Nível exclusivo para quem quer crescer</p>
                    </div>
                </div>

                <div className="p-6 -mt-8 bg-white dark:bg-gray-800 rounded-t-[32px] relative z-20">
                    <div className="space-y-4 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="p-1 bg-green-100 rounded-full mt-0.5"><Check className="w-3 h-3 text-green-600"/></div>
                            <div>
                                <p className="font-bold text-sm dark:text-white">Gerentes Adicionais</p>
                                <p className="text-xs text-gray-500">Cadastre sua equipe para gerenciar pedidos.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-1 bg-green-100 rounded-full mt-0.5"><Check className="w-3 h-3 text-green-600"/></div>
                            <div>
                                <p className="font-bold text-sm dark:text-white">Regras de Frete</p>
                                <p className="text-xs text-gray-500">Crie regras de frete grátis ou fixo.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-1 bg-green-100 rounded-full mt-0.5"><Check className="w-3 h-3 text-green-600"/></div>
                            <div>
                                <p className="font-bold text-sm dark:text-white">Relatórios Exclusivos</p>
                                <p className="text-xs text-gray-500">Acesse dados detalhados de performance.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-1 bg-green-100 rounded-full mt-0.5"><Check className="w-3 h-3 text-green-600"/></div>
                            <div>
                                <p className="font-bold text-sm dark:text-white">Prioridade na Fila</p>
                                <p className="text-xs text-gray-500">Seus pedidos aparecem primeiro para entregadores.</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 mb-4">
                            <AlertCircle className="w-4 h-4"/> {error}
                        </div>
                    )}

                    <div className="text-center mb-4">
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500"/>
                        ) : (
                            <p className="text-3xl font-black text-gray-900 dark:text-white">
                                {formatCurrency(fees?.super_store_monthly_fee || 0)}
                                <span className="text-xs font-medium text-gray-400 ml-1">/mês</span>
                            </p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">Debitado automaticamente do saldo da carteira.</p>
                    </div>

                    <Button onClick={handleSubscribe} disabled={loading || processing} fullWidth className="py-4 text-lg bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 border-none shadow-lg shadow-orange-500/30">
                        {processing ? <Loader2 className="w-6 h-6 animate-spin"/> : 'Ativar Agora'}
                    </Button>
                </div>
            </div>
        </div>
    );
};