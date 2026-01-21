import React, { useState, useEffect } from 'react';
import { Wallet, Settings, Check, X, TestTube, Activity } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import type { PaymentGatewayConfig, FinancialTransaction } from '../types';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5 fade-in duration-300 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
            <span className="text-sm font-bold">{message}</span>
            <button onClick={onClose} className="ml-2"><X className="w-4 h-4" /></button>
        </div>
    );
};

export const AdminPaymentGateways = () => {
    const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([]);
    const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const [editingGateway, setEditingGateway] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [gatewaysData, txData] = await Promise.all([
                cloud.getPaymentGateways(),
                cloud.getAllFinancialTransactions()
            ]);
            setGateways(gatewaysData || []);
            setTransactions(txData || []);
        } catch (error: any) {
            setToast({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (gatewayName: string, currentState: boolean) => {
        // Validação: não permitir desativar ambos
        const activeCount = gateways.filter(g => g.is_active).length;
        if (currentState && activeCount === 1) {
            setToast({
                type: 'error',
                message: 'Não é possível desativar todos os gateways. Mantenha pelo menos um ativo.'
            });
            return;
        }

        try {
            await cloud.updatePaymentGateway(gatewayName, { is_active: !currentState });
            setToast({ type: 'success', message: 'Gateway atualizado com sucesso!' });
            loadData();
        } catch (error: any) {
            setToast({ type: 'error', message: error.message });
        }
    };

    const handleSetPrimary = async (gatewayName: string) => {
        try {
            await cloud.setPaymentGatewayPrimary(gatewayName);
            setToast({ type: 'success', message: `${gatewayName} definido como principal!` });
            loadData();
        } catch (error: any) {
            setToast({ type: 'error', message: error.message });
        }
    };

    const handleSaveCredentials = async (gatewayName: string) => {
        try {
            await cloud.updatePaymentGateway(gatewayName, { credentials });
            setToast({ type: 'success', message: 'Credenciais salvas com sucesso!' });
            setEditingGateway(null);
            setCredentials({});
            loadData();
        } catch (error: any) {
            setToast({ type: 'error', message: error.message });
        }
    };

    const handleTestConnection = async (gatewayName: string) => {
        try {
            const result = await cloud.testPaymentGateway(gatewayName);
            if (result.success) {
                setToast({ type: 'success', message: 'Conexão testada com sucesso!' });
            } else {
                setToast({ type: 'error', message: `Teste falhou: ${result.error}` });
            }
            // Recarregar logs para mostrar o resultado do teste
            const txData = await cloud.getAllFinancialTransactions();
            setTransactions(txData || []);
        } catch (error: any) {
            setToast({ type: 'error', message: error.message });
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const getSourceLabel = (source: string) => {
        switch (source) {
            case 'ZEBANK': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">ZéBank</span>;
            case 'ZEPAY_STORE': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">Lojista</span>;
            case 'TERMINAL': return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">Maquininha</span>;
            default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">Sistema</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <Wallet className="w-8 h-8 text-brand-600" />
                <h1 className="text-2xl font-bold dark:text-white">Configuração de Gateways de Pagamento</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {gateways.map((gateway) => (
                    <div
                        key={gateway.id}
                        className={`border-2 rounded-xl p-6 transition-all ${gateway.is_primary
                            ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                            }`}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Settings className="w-6 h-6 text-brand-600" />
                                <h3 className="text-lg font-bold dark:text-white capitalize">
                                    {gateway.gateway_name === 'infinitepay' ? 'InfinitePay' : 'Mercado Pago'}
                                </h3>
                            </div>
                            {gateway.is_primary && (
                                <span className="px-3 py-1 bg-brand-600 text-white text-xs font-bold rounded-full">
                                    Principal
                                </span>
                            )}
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${gateway.is_active
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                    {gateway.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                    {gateway.is_active ? 'Ativo' : 'Inativo'}
                                </div>
                            </div>
                        </div>

                        {/* Ações de Configuração */}
                        <div className="mb-4">
                            <Button
                                onClick={() => {
                                    const tab = gateway.gateway_name === 'infinitepay' ? 'admin_infinitepay' : 'admin_mercadopago';
                                    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab } }));
                                }}
                                variant="ghost"
                                size="sm"
                                fullWidth
                                icon={<Settings className="w-4 h-4" />}
                            >
                                Configurar Credenciais
                            </Button>
                        </div>

                        {/* Ações de Status */}
                        <div className="space-y-2">
                            <Button
                                onClick={() => handleToggleActive(gateway.gateway_name, gateway.is_active)}
                                variant={gateway.is_active ? 'danger' : 'primary'}
                                size="sm"
                                fullWidth
                            >
                                {gateway.is_active ? 'Desativar' : 'Ativar'}
                            </Button>

                            {!gateway.is_primary && gateway.is_active && (
                                <Button
                                    onClick={() => handleSetPrimary(gateway.gateway_name)}
                                    variant="secondary"
                                    size="sm"
                                    fullWidth
                                >
                                    Definir como Principal
                                </Button>
                            )}

                            <Button
                                onClick={() => handleTestConnection(gateway.gateway_name)}
                                variant="ghost"
                                size="sm"
                                fullWidth
                                icon={<TestTube className="w-4 h-4" />}
                            >
                                Testar Conexão
                            </Button>
                        </div>
                    </div>
                ))}
            </div>


            {/* Seção de Logs */}
            <div className="mt-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-brand-600" />
                    <h3 className="text-lg font-bold dark:text-white">Transações Financeiras (Unificadas)</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Origem</th>
                                <th className="px-4 py-3">Usuário</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Valor</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        Nenhuma transação registrada.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => (
                                    <tr key={tx.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-xs w-[140px]">
                                            {new Date(tx.created_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-4 py-3">
                                            {getSourceLabel(tx.source)}
                                        </td>
                                        <td className="px-4 py-3 font-medium">
                                            {tx.user_name || tx.user_id || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-xs uppercase text-gray-500">
                                            {tx.type}
                                        </td>
                                        <td className={`px-4 py-3 font-mono font-bold ${Number(tx.amount) > 0 ? 'text-green-600' : Number(tx.amount) < 0 ? 'text-red-600' : 'text-gray-600'
                                            }`}>
                                            {formatCurrency(Number(tx.amount))}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${['COMPLETED', 'PAID', 'SUCCESS', 'ACTIVE'].includes(tx.status?.toUpperCase())
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30'
                                                }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]" title={tx.description || ''}>
                                            {tx.description || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};
