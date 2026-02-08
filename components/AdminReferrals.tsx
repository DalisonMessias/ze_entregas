
import React, { useState, useEffect } from 'react';
import { Loader2, Save, Plus, Trash2, Edit2, Settings, Gift, Truck, Ticket, ToggleLeft, ToggleRight, Check, Search } from 'lucide-react';
import * as cloud from '../services/cloud';
import { ReferralConfig, ReferralReward } from '../types';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { useDialog } from '../utils/dialogService';
import { CustomDialog } from './CustomDialog';

export const AdminReferrals: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'config' | 'rewards' | 'history'>('config');
    const [loading, setLoading] = useState(true);

    // Config State
    const [config, setConfig] = useState<ReferralConfig | null>(null);
    const [savingConfig, setSavingConfig] = useState(false);

    // Rewards State
    const [rewards, setRewards] = useState<ReferralReward[]>([]);
    const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<ReferralReward | null>(null);

    // History State
    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Reward Form
    const [rewardForm, setRewardForm] = useState<Partial<ReferralReward>>({
        title: '',
        description: '',
        cost_points: 1000,
        reward_type: 'CUPOM_FIXED',
        reward_value: 0,
        min_order_value: 0,
        is_active: true
    });

    const { alert, confirm, toast } = useDialog();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [configData, rewardsData] = await Promise.all([
                cloud.adminGetReferralConfig(),
                cloud.adminGetReferralRewards()
            ]);
            setConfig(configData);
            setRewards(rewardsData);
        } catch (e) {
            console.error(e);
            toast({ type: 'error', message: 'Erro ao carregar dados.' });
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const data = await cloud.adminGetReferralHistory();
            setHistory(data);
        } catch (e) {
            console.error(e);
            toast({ type: 'error', message: 'Erro ao carregar histórico.' });
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [activeTab]);

    const handleSaveConfig = async () => {
        if (!config) return;
        setSavingConfig(true);
        try {
            const success = await cloud.adminUpdateReferralConfig(config.id, {
                is_active: config.is_active,
                points_per_referral_user: Number(config.points_per_referral_user),
                points_per_referral_store: Number(config.points_per_referral_store),
                points_per_referral_courier: Number(config.points_per_referral_courier),
                reward_validity_days: Number(config.reward_validity_days),
                min_order_value_for_credit: Number(config.min_order_value_for_credit)
            });

            if (success) {
                toast({ type: 'success', message: 'Configurações salvas!' });
            } else {
                toast({ type: 'error', message: 'Erro ao salvar.' });
            }
        } catch (e) {
            toast({ type: 'error', message: 'Erro ao salvar.' });
        } finally {
            setSavingConfig(false);
        }
    };

    const handleOpenRewardModal = (reward?: ReferralReward) => {
        if (reward) {
            setEditingReward(reward);
            setRewardForm(reward);
        } else {
            setEditingReward(null);
            setRewardForm({
                title: '',
                description: '',
                cost_points: 1000,
                reward_type: 'CUPOM_FIXED',
                reward_value: 0,
                min_order_value: 0,
                is_active: true
            });
        }
        setIsRewardModalOpen(true);
    };

    const handleSaveReward = async () => {
        if (!rewardForm.title || !rewardForm.cost_points) {
            toast({ type: 'error', message: 'Preencha os campos obrigatórios.' });
            return;
        }

        try {
            let success = false;
            if (editingReward) {
                success = await cloud.adminUpdateReferralReward(editingReward.id, rewardForm);
            } else {
                success = await cloud.adminCreateReferralReward(rewardForm);
            }

            if (success) {
                toast({ type: 'success', message: 'Recompensa salva!' });
                setIsRewardModalOpen(false);
                loadData();
            } else {
                toast({ type: 'error', message: 'Erro ao salvar recompensa.' });
            }
        } catch (e) {
            toast({ type: 'error', message: 'Erro ao processar.' });
        }
    };

    const handleDeleteReward = async (id: string) => {
        const confirmed = await confirm({ title: 'Excluir', message: 'Tem certeza que deseja desativar esta recompensa?' });
        if (!confirmed) return;

        try {
            const success = await cloud.adminDeleteReferralReward(id);
            if (success) {
                toast({ type: 'success', message: 'Recompensa removida.' });
                loadData();
            } else {
                toast({ type: 'error', message: 'Erro ao remover.' });
            }
        } catch (e) {
            toast({ type: 'error', message: 'Erro ao remover.' });
        }
    };

    if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                <h1 className="text-2xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                    <Gift className="w-6 h-6 text-brand-500" /> Gestão Indique e Ganhe
                </h1>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'config' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Settings className="w-4 h-4" /> Configurações
                    </button>
                    <button
                        onClick={() => setActiveTab('rewards')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'rewards' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Gift className="w-4 h-4" /> Recompensas
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                    >
                        <Loader2 className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} /> Histórico
                    </button>
                </div>
            </div>

            {/* CONFIGURATIONS */}
            {activeTab === 'config' && config && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg dark:text-white">Status do Programa</h3>
                            <button
                                onClick={() => setConfig({ ...config, is_active: !config.is_active })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {config.is_active ? 'O programa está ATIVO e gerando pontos.' : 'O programa está INATIVO. Ninguém ganhará pontos.'}
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 md:col-span-2">
                        <h3 className="font-bold text-lg dark:text-white mb-2">Pontuação por Indicação</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <CustomInput
                                label="Por Usuário (Cliente)"
                                type="number"
                                value={config.points_per_referral_user}
                                onChange={e => setConfig({ ...config, points_per_referral_user: Number(e.target.value) })}
                            />
                            <CustomInput
                                label="Por Lojista"
                                type="number"
                                value={config.points_per_referral_store}
                                onChange={e => setConfig({ ...config, points_per_referral_store: Number(e.target.value) })}
                            />
                            <CustomInput
                                label="Por Entregador"
                                type="number"
                                value={config.points_per_referral_courier}
                                onChange={e => setConfig({ ...config, points_per_referral_courier: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 md:col-span-2">
                        <h3 className="font-bold text-lg dark:text-white mb-2">Regras de Validade</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomInput
                                label="Validade dos Pontos (dias)"
                                type="number"
                                value={config.reward_validity_days}
                                onChange={e => setConfig({ ...config, reward_validity_days: Number(e.target.value) })}
                                helperText="Dias até os pontos expirarem após serem ganhos."
                            />
                            <CustomInput
                                label="Valor Mín. Pedido para Crédito (R$)"
                                type="number"
                                value={config.min_order_value_for_credit}
                                onChange={e => setConfig({ ...config, min_order_value_for_credit: Number(e.target.value) })}
                                helperText="Se 0, credita no cadastro. Se > 0, credita após 1ª compra acima deste valor."
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                        <Button
                            onClick={handleSaveConfig}
                            disabled={savingConfig}
                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg flex items-center gap-2"
                        >
                            {savingConfig ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                            Salvar Configurações
                        </Button>
                    </div>
                </div>
            )}

            {/* REWARDS */}
            {activeTab === 'rewards' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex justify-end">
                        <Button onClick={() => handleOpenRewardModal()} className="bg-brand-600 text-white flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Nova Recompensa
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rewards.map(reward => (
                            <div key={reward.id} className={`bg-white dark:bg-gray-800 p-6 rounded-2xl border shadow-sm relative group transition-all hover:shadow-md ${reward.is_active ? 'border-gray-100 dark:border-gray-700' : 'border-red-100 opacity-60'}`}>
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenRewardModal(reward)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteReward(reward.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>
                                </div>

                                <div className="mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${reward.reward_type === 'FREE_SHIPPING' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                        {reward.reward_type === 'FREE_SHIPPING' ? <Truck className="w-6 h-6" /> : <Ticket className="w-6 h-6" />}
                                    </div>
                                    <h3 className="font-bold text-lg dark:text-white leading-tight mb-1">{reward.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{reward.description}</p>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="text-xs font-bold text-gray-400 uppercase">Custo</div>
                                    <div className="font-black text-brand-600 text-lg">{reward.cost_points} pts</div>
                                </div>
                                <div className="mt-2 text-xs text-gray-400 flex justify-between">
                                    <span>{reward.reward_type === 'FREE_SHIPPING' ? 'Frete Grátis' : reward.reward_type === 'CUPOM_PERCENT' ? `${reward.reward_value}% OFF` : `R$ ${reward.reward_value} OFF`}</span>
                                    {reward.min_order_value > 0 && <span>Mín: R$ {reward.min_order_value}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* HISTORY */}
            {activeTab === 'history' && (
                <div className="animate-in fade-in space-y-4">
                    {history.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-20 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mb-6">
                                <Search className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                                {loadingHistory ? 'Buscando movimentações...' : 'Histórico Vazio'}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                {loadingHistory
                                    ? 'Aguarde um momento enquanto carregamos as transações de pontos mais recentes.'
                                    : 'Ainda não existem registros de indicações ou resgates de pontos no sistema.'}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-900/50">
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Data</th>
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Indicador</th>
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Indicado</th>
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider">Operação</th>
                                            <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Pontos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {history.map((entry) => (
                                            <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="p-4 whitespace-nowrap text-sm dark:text-gray-300">
                                                    {new Date(entry.created_at).toLocaleDateString('pt-BR')} <br />
                                                    <span className="text-[10px] text-gray-400">{new Date(entry.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm dark:text-white capitalize">{entry.referrer_name}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase font-black">{entry.referrer_role}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm dark:text-gray-300">
                                                    {entry.referred_name || <span className="text-gray-400 italic">N/A</span>}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold dark:text-white">
                                                            {entry.operation_type === 'CREDIT_REFERRAL' ? 'Indicação Recebida' :
                                                                entry.operation_type === 'DEBIT_REDEEM' ? 'Resgate de Pontos' :
                                                                    entry.operation_type === 'CREDIT_BONUS' ? 'Bônus Administrativo' :
                                                                        entry.operation_type === 'REVERSAL' ? 'Estorno / Reversão' : entry.operation_type}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 line-clamp-1 max-w-[200px]">{entry.description}</span>
                                                    </div>
                                                </td>
                                                <td className={`p-4 text-right font-black ${entry.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                    {entry.amount > 0 ? '+' : ''}{entry.amount}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* REWARD MODAL */}
            <CustomDialog
                isOpen={isRewardModalOpen}
                onClose={() => setIsRewardModalOpen(false)}
                type="confirm"
                title={editingReward ? "Editar Recompensa" : "Nova Recompensa"}
                message=""
                confirmButtonText="Salvar"
                cancelButtonText="Cancelar"
                onConfirm={handleSaveReward}
                onCancel={() => setIsRewardModalOpen(false)}
            >
                <div className="space-y-4 py-4">
                    <CustomInput
                        label="Título (Ex: Cupom R$ 10)"
                        value={rewardForm.title || ''}
                        onChange={e => setRewardForm({ ...rewardForm, title: e.target.value })}
                    />
                    <CustomInput
                        label="Descrição"
                        value={rewardForm.description || ''}
                        onChange={e => setRewardForm({ ...rewardForm, description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <CustomInput
                            label="Custo em Pontos"
                            type="number"
                            value={rewardForm.cost_points}
                            onChange={e => setRewardForm({ ...rewardForm, cost_points: Number(e.target.value) })}
                        />
                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1 uppercase">Tipo</label>
                            <select
                                value={rewardForm.reward_type}
                                onChange={e => setRewardForm({ ...rewardForm, reward_type: e.target.value as any })}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-brand-500 transition-colors"
                            >
                                <option value="CUPOM_FIXED">Desconto Fixo (R$)</option>
                                <option value="CUPOM_PERCENT">Porcentagem (%)</option>
                                <option value="FREE_SHIPPING">Frete Grátis</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <CustomInput
                            label="Valor do Desconto"
                            type="number"
                            value={rewardForm.reward_value}
                            onChange={e => setRewardForm({ ...rewardForm, reward_value: Number(e.target.value) })}
                            helperText={rewardForm.reward_type === 'FREE_SHIPPING' ? 'Ignorado para Frete Grátis' : 'R$ ou %'}
                        />
                        <CustomInput
                            label="Pedido Mínimo (R$)"
                            type="number"
                            value={rewardForm.min_order_value}
                            onChange={e => setRewardForm({ ...rewardForm, min_order_value: Number(e.target.value) })}
                        />
                    </div>
                </div>
            </CustomDialog>
        </div>
    );
};
