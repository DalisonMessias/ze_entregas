import React, { useState, useEffect } from 'react';
import { Wallet, Settings, Check, X, TestTube, Activity } from 'lucide-react';
import { Button } from './Button';
import { cloud } from '../services/cloud';
import { useToast } from '../utils/toastService';
import type { PaymentGatewayConfig } from '../services/paymentGateway';

export const AdminPaymentGateways = () => {
    const [gateways, setGateways] = useState<PaymentGatewayConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setToast] = useToast();
    const [editingGateway, setEditingGateway] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});

    useEffect(() => {
        loadGateways();
    }, []);

    const loadGateways = async () => {
        setLoading(true);
        try {
            const data = await cloud.getPaymentGateways();
            setGateways(data || []);
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
            loadGateways();
        } catch (error: any) {
            setToast({ type: 'error', message: error.message });
        }
    };

    const handleSetPrimary = async (gatewayName: string) => {
        try {
            await cloud.setPaymentGatewayPrimary(gatewayName);
            setToast({ type: 'success', message: `${gatewayName} definido como principal!` });
            loadGateways();
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
            loadGateways();
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
        } catch (error: any) {
            setToast({ type: 'error', message: error.message });
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

                        {/* Credenciais */}
                        {editingGateway === gateway.gateway_name ? (
                            <div className="space-y-3 mb-4">
                                {gateway.gateway_name === 'infinitepay' ? (
                                    <>
                                        <input
                                            type="text"
                                            placeholder="API Key"
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            value={credentials.apiKey || ''}
                                            onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                                        />
                                        <input
                                            type="text"
                                            placeholder="API Secret (opcional)"
                                            className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            value={credentials.apiSecret || ''}
                                            onChange={(e) => setCredentials({ ...credentials, apiSecret: e.target.value })}
                                        />
                                    </>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="Access Token"
                                        className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        value={credentials.accessToken || ''}
                                        onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                                    />
                                )}
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleSaveCredentials(gateway.gateway_name)}
                                        size="sm"
                                        fullWidth
                                    >
                                        Salvar
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            setEditingGateway(null);
                                            setCredentials({});
                                        }}
                                        variant="ghost"
                                        size="sm"
                                        fullWidth
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-4">
                                <Button
                                    onClick={() => {
                                        setEditingGateway(gateway.gateway_name);
                                        setCredentials(gateway.credentials || {});
                                    }}
                                    variant="ghost"
                                    size="sm"
                                >
                                    Configurar Credenciais
                                </Button>
                            </div>
                        )}

                        {/* Ações */}
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
                    <h3 className="text-lg font-bold dark:text-white">Últimas Transações</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Log de tentativas de pagamento será exibido aqui (implementação futura)
                </p>
            </div>
        </div>
    );
};
