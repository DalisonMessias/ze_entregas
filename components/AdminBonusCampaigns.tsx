
import React, { useState, useEffect } from 'react';
import { Plus, Gift, Target, Calendar, Search, Trash2, Edit2, CheckCircle, XCircle, AlertCircle, TrendingUp, Users, Info, Loader2, ArrowRight, Award, Trophy, ChevronRight, LayoutGrid, Truck } from 'lucide-react';
import * as cloud from '../services/cloud';
import { BonusCampaign, BonusTier } from '../types';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { useDialog } from '../utils/dialogService';
import { CustomDateInput } from './CustomDateInput';

const parseCurrency = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    const cleanedValue = value.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanedValue) || 0;
};

export const AdminBonusCampaigns: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState<BonusCampaign[]>([]);
    const [stats, setStats] = useState<any[]>([]);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
    const { alert, confirm } = useDialog();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<BonusCampaign | null>(null);
    const [formData, setFormData] = useState<any>({
        tiers: [{ deliveries: 0, reward: 0 }]
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const sb = cloud.getClient();
            if (!sb) return;

            const { data, error } = await sb.from('bonus_campaigns').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setCampaigns(data || []);
            
            if (data && data.length > 0 && !selectedCampaignId) {
                loadStats(data[0].id);
            }
        } catch (error) {
            console.error(error);
            alert({ title: 'Erro', message: 'Falha ao carregar campanhas.' });
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async (campaignId: string) => {
        setSelectedCampaignId(campaignId);
        try {
            const sb = cloud.getClient();
            if (!sb) return;
            const { data, error } = await sb.rpc('get_admin_bonus_stats', { p_campaign_id: campaignId });
            if (error) throw error;
            setStats(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddTier = () => {
        setFormData({
            ...formData,
            tiers: [...formData.tiers, { deliveries: 0, reward: 0 }]
        });
    };

    const handleRemoveTier = (index: number) => {
        const newTiers = [...formData.tiers];
        newTiers.splice(index, 1);
        setFormData({ ...formData, tiers: newTiers });
    };

    const handleTierChange = (index: number, field: string, value: string) => {
        const newTiers = [...formData.tiers];
        if (field === 'deliveries') {
            newTiers[index].deliveries = parseInt(value) || 0;
        } else {
            newTiers[index].reward = parseCurrency(value);
        }
        setFormData({ ...formData, tiers: newTiers });
    };

    const handleSave = async () => {
        if (!formData.title || !formData.start_date || !formData.end_date || formData.tiers.length === 0) {
            alert({ title: 'Atenção', message: 'Preencha os campos obrigatórios e adicione ao menos uma meta.' });
            return;
        }

        const payload = {
            title: formData.title,
            description: formData.description,
            start_date: new Date(formData.start_date).toISOString(),
            end_date: new Date(formData.end_date).toISOString(),
            is_active: formData.is_active ?? true,
            target_city: formData.target_city || null,
            tiers: formData.tiers.sort((a: any, b: any) => a.deliveries - b.deliveries)
        };

        try {
            const sb = cloud.getClient();
            if (!sb) return;

            if (editingItem) {
                const { error } = await sb.from('bonus_campaigns').update(payload).eq('id', editingItem.id);
                if (error) throw error;
            } else {
                const { error } = await sb.from('bonus_campaigns').insert([payload]);
                if (error) throw error;
            }
            
            loadData();
            setIsModalOpen(false);
        } catch (e: any) {
            alert({ title: 'Erro', message: 'Erro ao salvar campanha: ' + e.message });
        }
    };

    const handleDelete = async (id: string) => {
        if (!await confirm({ title: 'Excluir?', message: 'Tem certeza que deseja remover esta campanha e todo o progresso vinculado?' })) return;
        const sb = cloud.getClient();
        if (sb) {
            await sb.from('bonus_campaigns').delete().eq('id', id);
            loadData();
        }
    };

    const openEdit = (campaign: BonusCampaign) => {
        setEditingItem(campaign);
        setFormData({
            ...campaign,
            start_date: campaign.start_date.split('T')[0],
            end_date: campaign.end_date.split('T')[0]
        });
        setIsModalOpen(true);
    };

    const openNew = () => {
        setEditingItem(null);
        setFormData({
            title: '',
            tiers: [{ deliveries: 25, reward: 30 }, { deliveries: 33, reward: 50 }],
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            is_active: true
        });
        setIsModalOpen(true);
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-8 h-8 text-brand-600" /></div>;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <Award className="w-8 h-8 text-brand-500" /> Campanhas de Bônus
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gerencie metas de produtividade e recompensas para os entregadores parceiros.
                    </p>
                </div>
                <Button onClick={openNew} className="rounded-2xl flex items-center gap-2 h-14 px-8 shadow-xl shadow-brand-500/20 text-lg font-bold">
                    <Plus className="w-6 h-6" /> Criar Campanha
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* LISTA DE CAMPANHAS */}
                <div className="xl:col-span-1 space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                        <LayoutGrid className="w-5 h-5 text-gray-400" /> Histórico de Campanhas
                    </h2>
                    {campaigns.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-10 border border-gray-100 dark:border-gray-800 text-center">
                            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="text-gray-400 font-medium italic">Nenhuma campanha criada.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {campaigns.map(c => (
                                <div 
                                    key={c.id} 
                                    onClick={() => loadStats(c.id)}
                                    className={`group cursor-pointer p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
                                        selectedCampaignId === c.id 
                                        ? 'bg-brand-500 border-brand-400 text-white shadow-xl shadow-brand-500/30' 
                                        : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-brand-200 dark:hover:border-brand-800'
                                    }`}
                                >
                                    {c.is_active && selectedCampaignId !== c.id && (
                                        <div className="absolute top-0 right-0 p-1 px-3 bg-green-500 text-white text-[10px] font-black rounded-bl-xl uppercase">Ativa</div>
                                    )}
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-black text-lg leading-tight pr-8">{c.title}</h3>
                                        {selectedCampaignId !== c.id && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="p-1.5 hover:bg-brand-50 text-brand-600 rounded-lg bg-white shadow-sm"><Edit2 className="w-3.5 h-3.5" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg bg-white shadow-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-medium opacity-80">
                                        <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(c.start_date).toLocaleDateString()}</div>
                                        <div className="flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5" /> {new Date(c.end_date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* DETALHES E ESTATISTICAS */}
                <div className="xl:col-span-2 space-y-6">
                    {selectedCampaignId ? (
                        <>
                            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl p-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <TrendingUp className="w-40 h-40" />
                                </div>
                                <div className="relative z-10">
                                    <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">Desempenho em Tempo Real</span>
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Ranking de Entregadores</h2>
                                    <p className="text-gray-500 text-sm max-w-lg mb-8">Acompanhe quais motoristas já atingiram as metas e o valor total acumulado em bônus para esta campanha.</p>
                                    
                                    <div className="grid grid-cols-3 gap-6 mb-8">
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div className="text-gray-400 text-[10px] font-black uppercase mb-1">Participantes</div>
                                            <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-brand-500" /> {stats.length}</div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div className="text-gray-400 text-[10px] font-black uppercase mb-1">Entregas Totais</div>
                                            <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500" /> {stats.reduce((acc, s) => acc + s.deliveries_count, 0)}</div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div className="text-gray-400 text-[10px] font-black uppercase mb-1">Bônus Provisionado</div>
                                            <div className="text-2xl font-black text-brand-600 flex items-center gap-2 shrink-0">R$ {stats.reduce((acc, s) => acc + s.bonus_earned, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                        </div>
                                    </div>

                                    {stats.length === 0 ? (
                                        <div className="py-20 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl">
                                            <Search className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                                            <p className="text-gray-400 font-medium">Nenhum progresso registrado ainda para esta campanha.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="text-left text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-gray-800">
                                                        <th className="pb-4 pt-4 px-2">Entregador</th>
                                                        <th className="pb-4 pt-4 px-2">Pedidos</th>
                                                        <th className="pb-4 pt-4 px-2">Bônus</th>
                                                        <th className="pb-4 pt-4 px-2 text-right">Última Atualização</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                    {stats.map((s, idx) => (
                                                        <tr key={idx} className="group hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                            <td className="py-4 px-2">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center font-black text-sm uppercase">
                                                                        {s.driver_name?.substring(0, 2)}
                                                                    </div>
                                                                    <div className="font-bold text-gray-900 dark:text-white capitalize">{s.driver_name?.toLowerCase()}</div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-2">
                                                                <span className="font-black text-lg text-gray-700 dark:text-gray-300">{s.deliveries_count}</span>
                                                            </td>
                                                            <td className="py-4 px-2">
                                                                <div className="flex flex-col">
                                                                    <span className={`font-black ${s.bonus_earned > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                                        R$ {s.bonus_earned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                    {s.bonus_earned > 0 && <span className="text-[10px] text-green-500 font-bold tracking-tighter">META ATINGIDA</span>}
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-2 text-right text-xs text-gray-400 font-medium">
                                                                {new Date(s.last_updated).toLocaleString('pt-BR')}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl p-20 text-center flex flex-col items-center">
                            <Trophy className="w-24 h-24 mb-6 text-gray-100" />
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Selecione uma Campanha</h2>
                            <p className="text-gray-500 max-w-md">Selecione uma campanha na lateral para visualizar o ranking de entregadores e estatísticas detalhadas de progresso.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL CRIAR/EDITAR */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/20 dark:to-gray-900">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{editingItem ? 'Editar Campanha' : 'Nova Campanha de Metas'}</h3>
                                <p className="text-sm text-brand-600 font-bold uppercase tracking-widest mt-1">Defina metas e prêmios em dinheiro</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 bg-white dark:bg-gray-800 shadow-lg rounded-2xl flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><XCircle className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto space-y-8 flex-1">
                            <div className="space-y-6">
                                <CustomInput 
                                    label="Título da Campanha" 
                                    placeholder="Ex: Super Bônus de Carnaval" 
                                    value={formData.title || ''} 
                                    onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                    className="text-lg font-bold"
                                />
                                <CustomInput 
                                    label="Descrição Curta (Opcional)" 
                                    placeholder="Explique as regras da campanha..." 
                                    value={formData.description || ''} 
                                    onChange={e => setFormData({ ...formData, description: e.target.value })} 
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-gray-400 uppercase tracking-widest pl-1">Data de Início</label>
                                        <CustomDateInput
                                            value={formData.start_date || ''}
                                            onChange={val => setFormData({ ...formData, start_date: val })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-gray-400 uppercase tracking-widest pl-1">Data de Término</label>
                                        <CustomDateInput
                                            value={formData.end_date || ''}
                                            onChange={val => setFormData({ ...formData, end_date: val })}
                                        />
                                    </div>
                                </div>

                                <CustomInput 
                                    label="Filtro por Cidade (Opcional)" 
                                    placeholder="Ex: São Paulo / Todas" 
                                    value={formData.target_city || ''} 
                                    onChange={e => setFormData({ ...formData, target_city: e.target.value })} 
                                />
                            </div>

                            <div className="space-y-6 bg-gray-50 dark:bg-gray-800/50 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h4 className="text-lg font-black text-gray-900 dark:text-white">Patamares de Recompensa</h4>
                                        <p className="text-xs text-gray-500 font-medium">O bônus será creditado quando atingir o número de pedidos.</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleAddTier} className="rounded-xl flex items-center gap-2 border-brand-200 text-brand-600 hover:bg-brand-50">
                                        <Plus className="w-4 h-4" /> Adicionar Faixa
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {formData.tiers.map((tier: BonusTier, index: number) => (
                                        <div key={index} className="flex flex-col md:flex-row items-end gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm relative group">
                                            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-brand-500 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                                                {index + 1}
                                            </div>
                                            
                                            <div className="flex-1 w-full">
                                                <CustomInput 
                                                    label="Quantidade de Pedidos" 
                                                    type="number" 
                                                    value={tier.deliveries || ''} 
                                                    onChange={e => handleTierChange(index, 'deliveries', e.target.value)} 
                                                    placeholder="Pedidos"
                                                />
                                            </div>
                                            <div className="flex-1 w-full">
                                                <CustomInput 
                                                    label="Valor do Bônus (R$)" 
                                                    mask="currency" 
                                                    value={tier.reward || ''} 
                                                    onChange={e => handleTierChange(index, 'reward', e.target.value)} 
                                                    placeholder="R$ 0,00"
                                                />
                                            </div>
                                            {formData.tiers.length > 1 && (
                                                <button 
                                                    onClick={() => handleRemoveTier(index)}
                                                    className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <label className="flex items-center gap-4 cursor-pointer p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30 transition-all hover:shadow-md" onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}>
                                <div className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${formData.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-300 ${formData.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                                <div>
                                    <span className="text-sm font-black text-gray-900 dark:text-white block">Campanha Ativa</span>
                                    <span className="text-xs text-gray-500 font-medium">{formData.is_active ? 'Disponível para os entregadores no APP' : 'Oculta e desativada'}</span>
                                </div>
                            </label>
                        </div>

                        <div className="p-8 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-4 bg-gray-50 dark:bg-gray-900/50">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-2xl h-14 px-8 border-2 font-bold">Cancelar</Button>
                            <Button onClick={handleSave} className="rounded-2xl h-14 px-10 shadow-xl shadow-brand-500/20 text-lg font-black tracking-wide">
                                <Award className="w-5 h-5 mr-2" /> {editingItem ? 'Atualizar Campanha' : 'Lançar Campanha'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminBonusCampaigns;
