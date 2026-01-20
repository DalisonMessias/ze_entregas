import React, { useState, useEffect } from 'react';
import { adminGetScoreConfig, adminUpdateScoreConfig, adminGetBlockingConfig, adminUpdateBlockingConfig, getAllUsers } from '../services/cloud';
import { Button } from './Button';
import { Loader2, Save, Star, AlertCircle, TrendingUp, History, UserX, ShieldAlert } from 'lucide-react';
import { ManagedUser } from '../types';

interface ScoreEventConfig {
    event_key: string;
    impact_value: number;
    is_active: boolean;
    label?: string;
    description?: string;
}

interface BlockingConfig {
    monthly_cancellation_limit: number;
    monthly_refusal_limit: number;
}

export const AdminScoreConfig: React.FC = () => {
    const [scoreConfigs, setScoreConfigs] = useState<ScoreEventConfig[]>([]);
    const [blockingConfig, setBlockingConfig] = useState<BlockingConfig | null>(null);
    const [drivers, setDrivers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [configs, block, allUsers] = await Promise.all([
                adminGetScoreConfig(),
                adminGetBlockingConfig(),
                getAllUsers()
            ]);
            setScoreConfigs(configs);
            setBlockingConfig(block);
            setDrivers(allUsers.filter(u => u.role === 'delivery_partner'));
        } catch (e) {
            console.error(e);
            setToast({ message: 'Erro ao carregar configurações', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateScore = async (eventKey: string, val: number, active: boolean) => {
        try {
            await adminUpdateScoreConfig(eventKey, val, active);
            setScoreConfigs(prev => prev.map(c => c.event_key === eventKey ? { ...c, impact_value: val, is_active: active } : c));
            setToast({ message: 'Score atualizado com sucesso', type: 'success' });
        } catch (e) {
            setToast({ message: 'Erro ao atualizar score', type: 'error' });
        }
    };

    const handleSaveBlocking = async () => {
        if (!blockingConfig) return;
        setSaving(true);
        try {
            await adminUpdateBlockingConfig(blockingConfig.monthly_cancellation_limit, blockingConfig.monthly_refusal_limit);
            setToast({ message: 'Limites de bloqueio atualizados', type: 'success' });
        } catch (e) {
            setToast({ message: 'Erro ao salvar limites', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const getEventLabel = (key: string) => {
        const labels: Record<string, string> = {
            'ORDER_COMPLETED': 'Pedido Concluído',
            'DELIVERY_SUCCESS': 'Entrega Concluída',
            'DELIVERY_IN_TIME': 'Entrega no Prazo',
            'HIGH_ACCEPTANCE_RATE': 'Alta Taxa de Aceitação',
            'ORDER_CANCELLED_BY_DRIVER': 'Pedido Cancelado pelo Entregador',
            'ORDER_REFUSED_BY_DRIVER': 'Pedido Recusado pelo Entregador',
            'ABANDON_AFTER_ACCEPT': 'Abandono após Aceite',
            'CUSTOMER_NEGATIVE_RATING': 'Avaliação Negativa do Cliente',
            'CUSTOMER_POSITIVE_RATING': 'Avaliação Positiva do Cliente',
            'REPORT_VALIDATED': 'Denúncia Validada',
            'MANUAL_ADJUSTMENT': 'Ajuste Manual'
        };
        return labels[key] || key;
    };

    if (loading) return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto pb-10">
            {toast && (
                <div className={`fixed top-24 right-4 z-50 p-4 rounded-xl shadow-lg border animate-in slide-in-from-right-10 ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {toast.message}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-6">
                {/* Score Config Panel */}
                <div className="flex-1 bg-white dark:bg-gray-800 p-6 rounded-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg text-brand-600">
                            <Star className="w-5 h-5" />
                        </div>
                        <h3 className="font-black text-xl dark:text-white">Pesos de Eventos (Score)</h3>
                    </div>

                    <div className="space-y-4">
                        {scoreConfigs.map(config => (
                            <div key={config.event_key} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold text-sm dark:text-white">{config.label || getEventLabel(config.event_key)}</h4>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-tight font-mono">
                                        ID: {getEventLabel(config.event_key).toUpperCase().replace(/\s+/g, '_')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        value={config.impact_value}
                                        onChange={e => handleUpdateScore(config.event_key, parseInt(e.target.value), config.is_active)}
                                        className="w-16 p-2 text-center bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg text-sm dark:text-white"
                                    />
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={config.is_active}
                                            onChange={e => handleUpdateScore(config.event_key, config.impact_value, e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600"></div>
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Blocking Limits Panel */}
                <div className="w-full md:w-80 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <h3 className="font-black text-xl dark:text-white">Bloqueio Automático</h3>
                        </div>

                        {blockingConfig && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Limite Mensal de Cancelamentos</label>
                                    <input
                                        type="number"
                                        value={blockingConfig.monthly_cancellation_limit}
                                        onChange={e => setBlockingConfig({ ...blockingConfig, monthly_cancellation_limit: parseInt(e.target.value) })}
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Limite Mensal de Recusas</label>
                                    <input
                                        type="number"
                                        value={blockingConfig.monthly_refusal_limit}
                                        onChange={e => setBlockingConfig({ ...blockingConfig, monthly_refusal_limit: parseInt(e.target.value) })}
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                                    />
                                </div>
                                <Button fullWidth onClick={handleSaveBlocking} disabled={saving} variant="danger">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    Salvar Limites
                                </Button>
                                <p className="text-[10px] text-gray-500 text-center">
                                    Ao atingir o limite, o entregador parceiro será bloqueado automaticamente até o próximo mês.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-brand-600 p-6 rounded-2xl text-white">
                        <h4 className="font-black text-lg mb-2">Dica de Gestão</h4>
                        <p className="text-sm opacity-90 leading-relaxed">
                            O sistema de score incentiva a qualidade do atendimento. Recomenda-se manter o peso de "Pedido Concluído" positivo e o de "Recusas" negativo para equilibrar a balança.
                        </p>
                    </div>
                </div>
            </div>

            {/* Drivers Overview */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                            <History className="w-5 h-5" />
                        </div>
                        <h3 className="font-black text-xl dark:text-white">Panorama de Scores (Entregadores)</h3>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Entregador</th>
                                <th className="px-4 py-3 text-center">Score Atual</th>
                                <th className="px-4 py-3 text-center">Cancelamentos (Mês)</th>
                                <th className="px-4 py-3 text-center">Recusas (Mês)</th>
                                <th className="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {drivers.map(driver => (
                                <tr key={driver.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-4">
                                        <div className="font-bold dark:text-white">{driver.name}</div>
                                        <div className="text-[10px] text-gray-500">{driver.email}</div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`font-black text-lg ${driver.score && driver.score >= 800 ? 'text-green-500' : driver.score && driver.score >= 400 ? 'text-orange-500' : 'text-red-500'}`}>
                                            {driver.score ?? 500}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`font-bold ${driver.cancellation_count_monthly >= (blockingConfig?.monthly_cancellation_limit || 999) ? 'text-red-600' : 'dark:text-gray-300'}`}>
                                            {driver.cancellation_count_monthly || 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`font-bold ${driver.refusal_count_monthly >= (blockingConfig?.monthly_refusal_limit || 999) ? 'text-red-600' : 'dark:text-gray-300'}`}>
                                            {driver.refusal_count_monthly || 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${driver.status === 'active' ? 'bg-green-100 text-green-700' : driver.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {driver.status === 'active' ? 'Ativo' : driver.status === 'blocked' ? 'Bloqueado' : driver.status === 'suspended' ? 'Suspenso' : driver.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {drivers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-10 text-center text-gray-500">
                                        Nenhum entregador parceiro encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
