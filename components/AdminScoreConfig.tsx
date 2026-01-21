import React, { useState, useEffect } from 'react';
import { adminGetScoreConfig, adminUpdateScoreConfig, adminGetBlockingConfig, adminUpdateBlockingConfig, getAllUsers, adminUpdateUserScore, adminGetScoreHistory } from '../services/cloud';
import { Button } from './Button';
import { BaseModal } from './BaseModal';
import { Loader2, Save, Star, AlertCircle, TrendingUp, History, UserX, ShieldAlert, Edit2, CheckCircle2, XCircle, Plus, Minus } from 'lucide-react';
import { ManagedUser } from '../types';
import { useDialog } from '../utils/dialogService';

interface ScoreEventConfig {
    event_key: string;
    impact_value: number;
    is_active: boolean;
    label?: string;
    description?: string;
}

interface BlockingConfig {
    id: string;
    monthly_cancellation_limit: number;
    monthly_refusal_limit: number;
}

export const AdminScoreConfig: React.FC = () => {
    const { alert } = useDialog();
    const [scoreConfigs, setScoreConfigs] = useState<ScoreEventConfig[]>([]);
    const [blockingConfig, setBlockingConfig] = useState<BlockingConfig | null>(null);
    const [drivers, setDrivers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Edit Score State
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
    const [newScore, setNewScore] = useState<string>('');
    const [editReason, setEditReason] = useState('');
    const [isSavingScore, setIsSavingScore] = useState(false);

    // History State
    const [historyUser, setHistoryUser] = useState<ManagedUser | null>(null);
    const [scoreHistory, setScoreHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    };

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
        } catch (e: any) {
            console.error(e);
            await alert({ title: 'Erro de Carregamento', message: 'Erro ao carregar configurações de pontuação: ' + (e.message || 'Erro desconhecido') });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateScore = async (event_key: string, val: number, active: boolean) => {
        try {
            await adminUpdateScoreConfig(event_key, val, active);
            setScoreConfigs(prev => prev.map(c => c.event_key === event_key ? { ...c, impact_value: val, is_active: active } : c));
            await alert({ title: 'Sucesso', message: 'Configuração de score atualizada.' });
        } catch (e: any) {
            await alert({ title: 'Erro ao Atualizar', message: 'Erro ao atualizar score: ' + (e.message || 'Erro desconhecido') });
        }
    };

    const handleSaveBlocking = async () => {
        if (!blockingConfig) return;
        setSaving(true);
        try {
            await adminUpdateBlockingConfig(blockingConfig.id, blockingConfig.monthly_cancellation_limit, blockingConfig.monthly_refusal_limit);
            await alert({ title: 'Sucesso', message: 'Limites de bloqueio atualizados!' });
        } catch (e: any) {
            await alert({ title: 'Erro ao Salvar', message: 'Erro ao salvar limites: ' + (e.message || 'Erro desconhecido') });
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

    const handleOpenEdit = (user: ManagedUser) => {
        setEditingUser(user);
        setNewScore(String(user.score || 0));
        setEditReason('');
    };

    const handleSaveScoreEdit = async () => {
        if (!editingUser) return;
        if (!editReason.trim()) {
            await alert({ title: 'Atenção', message: 'O motivo é obrigatório para ajustes manuais.' });
            return;
        }

        setIsSavingScore(true);
        try {
            const scoreVal = parseInt(newScore);
            const result = await adminUpdateUserScore(editingUser.id, scoreVal, editReason);

            if (result.success) {
                await alert({ title: 'Sucesso', message: 'Score do usuário atualizado com sucesso!' });
                setDrivers(prev => prev.map(d => d.id === editingUser.id ? { ...d, score: scoreVal } : d));
                setEditingUser(null);
            } else {
                await alert({ title: 'Erro ao Atualizar', message: 'Erro ao atualizar score: ' + result.error });
            }
        } catch (e: any) {
            await alert({ title: 'Erro no Processamento', message: 'Erro ao processar requisição: ' + (e.message || 'Erro desconhecido') });
        } finally {
            setIsSavingScore(false);
        }
    };

    const handleOpenHistory = async (user: ManagedUser) => {
        setHistoryUser(user);
        setLoadingHistory(true);
        try {
            const history = await adminGetScoreHistory(user.id);
            setScoreHistory(history);
        } catch (e: any) {
            await alert({ title: 'Erro ao Carregar Histórico', message: 'Falha ao buscar histórico de score: ' + (e.message || 'Erro desconhecido') });
        } finally {
            setLoadingHistory(false);
        }
    };

    if (loading) return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto pb-10">

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
                                <th className="px-4 py-3 text-right">Ações</th>
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
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => handleOpenHistory(driver)}
                                                className="!p-2 h-8 w-8 rounded-full border-gray-200 hover:bg-gray-50 text-gray-500"
                                                title="Ver Histórico"
                                            >
                                                <History className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                onClick={() => handleOpenEdit(driver)}
                                                className="!p-2 h-8 w-8 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 border-transparent"
                                                title="Editar Score Manualmente"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </div>
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


            {/* Edit Modal */}
            <BaseModal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                title="Ajuste Manual de Score"
            >
                {editingUser && (
                    <div className="space-y-4 pt-2">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex gap-3 text-blue-700 dark:text-blue-300 text-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>
                                Você está alterando o score de <strong>{editingUser.name}</strong>.
                                Esta ação será registrada no histórico e deve ser justificada.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Novo Score (0-1000)</label>
                            <div className="flex items-center gap-3">
                                <button
                                    className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors group"
                                    onClick={() => {
                                        const val = parseInt(String(newScore)) || 0;
                                        setNewScore(String(Math.max(0, val - 10)));
                                    }}
                                >
                                    <Minus className="w-5 h-5 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
                                </button>
                                <input
                                    type="text"
                                    readOnly
                                    value={newScore}
                                    className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-center text-lg font-bold dark:text-white outline-none cursor-not-allowed"
                                />
                                <button
                                    className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors group"
                                    onClick={() => {
                                        const val = parseInt(String(newScore)) || 0;
                                        setNewScore(String(Math.min(1000, val + 10)));
                                    }}
                                >
                                    <Plus className="w-5 h-5 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Motivo da Alteração <span className="text-red-500">*</span></label>
                            <div className="p-0.5">
                                <textarea
                                    value={editReason}
                                    onChange={e => setEditReason(e.target.value)}
                                    placeholder="Descreva o motivo deste ajuste..."
                                    className="w-full h-[120px] resize-none p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-brand-500 block"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <Button variant="outline" fullWidth onClick={() => setEditingUser(null)}>Cancelar</Button>
                            <Button fullWidth onClick={handleSaveScoreEdit} disabled={isSavingScore || !editReason.trim()}>
                                {isSavingScore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar Alteração
                            </Button>
                        </div>
                    </div>
                )}
            </BaseModal>

            {/* History Modal */}
            <BaseModal
                isOpen={!!historyUser}
                onClose={() => setHistoryUser(null)}
                title="Histórico de Alterações"
            >
                <div className="pt-2">
                    {loadingHistory ? (
                        <div className="py-10 text-center text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            Carregando histórico...
                        </div>
                    ) : scoreHistory.length === 0 ? (
                        <div className="py-10 text-center text-gray-400 flex flex-col items-center">
                            <History className="w-10 h-10 mb-2 opacity-50" />
                            <p>Nenhuma alteração manual registrada.</p>
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-gray-100 dark:border-gray-700 ml-3 space-y-6 pb-4">
                            {scoreHistory.map((item, idx) => (
                                <div key={item.id || idx} className="ml-6 relative">
                                    <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${item.diff > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>

                                    <div className="flex justify-between items-start mb-1">
                                        <div className="text-xs font-bold text-gray-400">
                                            {formatDate(item.created_at)}
                                        </div>
                                        <div className={`text-xs font-black px-2 py-0.5 rounded-full ${item.diff > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {item.diff > 0 ? '+' : ''}{item.diff} pts
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                                        <div className="flex items-center gap-2 mb-2 text-sm">
                                            <span className="text-gray-500 line-through">{item.old_score}</span>
                                            <TrendingUp className="w-3 h-3 text-gray-300" />
                                            <span className="font-bold text-gray-900 dark:text-white">{item.new_score}</span>
                                        </div>

                                        <p className="text-sm text-gray-700 dark:text-gray-300 italic mb-2">
                                            "{item.reason}"
                                        </p>

                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <ShieldAlert className="w-3 h-3" />
                                            Alterado por: <span className="font-bold">{item.admin?.name || 'Administrador'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </BaseModal>
        </div >
    );
};
