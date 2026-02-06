import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Edit2, CheckCircle, X, Save, Loader2, Info, Building2, MessageSquare, MapPin, Clock, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { InsurancePlan, InsurancePartner, InsuranceReferralRequest } from '../types';
import { useDialog } from '../utils/dialogService';

export const AdminInsuranceConfig: React.FC = () => {
    const [plans, setPlans] = useState<InsurancePlan[]>([]);
    const [partners, setPartners] = useState<InsurancePartner[]>([]);
    const [referrals, setReferrals] = useState<InsuranceReferralRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Partial<InsurancePlan> | null>(null);
    const [editingPartner, setEditingPartner] = useState<Partial<InsurancePartner> | null>(null);
    const [activeTab, setActiveTab] = useState<'plans' | 'partners' | 'referrals'>('plans');
    const { alert, confirm } = useDialog();

    const loadData = async () => {
        setLoading(true);
        try {
            const [plansData, partnersData, referralsData] = await Promise.all([
                cloud.getInsurancePlans(),
                cloud.getInsurancePartners(),
                cloud.getInsuranceReferrals()
            ]);
            setPlans(plansData);
            setPartners(partnersData);
            setReferrals(referralsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSavePlan = async () => {
        if (!editingPlan?.title || !editingPlan?.price_mensal) {
            await alert({ title: 'Campos Obrigatórios', message: 'Preencha o título e o valor mensal.' });
            return;
        }

        setSaving(true);
        try {
            await cloud.saveInsurancePlan(editingPlan);
            await alert({ title: 'Sucesso', message: 'Plano salvo com sucesso!' });
            setEditingPlan(null);
            loadData();
        } catch (e: any) {
            await alert({ title: 'Erro ao Salvar', message: e.message || 'Erro interno.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePlan = async (id: string) => {
        const ok = await confirm({ title: 'Excluir Plano', message: 'Tem certeza que deseja remover este plano? Esta ação não pode ser desfeita.' });
        if (!ok) return;

        try {
            await cloud.deleteInsurancePlan(id);
            loadData();
        } catch (e: any) {
            await alert({ title: 'Erro', message: 'Não foi possível excluir o plano.' });
        }
    };

    const handleSavePartner = async () => {
        if (!editingPartner?.name) return;
        setSaving(true);
        try {
            await cloud.saveInsurancePartner(editingPartner);
            setEditingPartner(null);
            loadData();
        } catch (e) {
            await alert({ title: 'Erro', message: 'Falha ao salvar parceiro.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeletePartner = async (id: string) => {
        const ok = await confirm({ title: 'Remover Parceiro', message: 'Deseja remover esta seguradora da lista?' });
        if (!ok) return;
        try {
            await cloud.deleteInsurancePartner(id);
            loadData();
        } catch (e) {
            await alert({ title: 'Erro', message: 'Falha ao remover parceiro.' });
        }
    };

    const handleUpdateReferralStatus = async (id: string, status: string) => {
        try {
            await cloud.updateInsuranceReferralStatus(id, status);
            loadData();
        } catch (e) {
            await alert({ title: 'Erro', message: 'Falha ao atualizar status.' });
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-brand-600" />
                        Gestão de Seguros
                    </h2>
                    <p className="text-sm text-gray-500">Configure planos, franquias e empresas parceiras.</p>
                </div>
                <MobileTabsSelect
                    value={activeTab}
                    onChange={(val) => setActiveTab(val as 'plans' | 'partners' | 'referrals')}
                    options={[
                        { value: 'plans', label: 'Planos' },
                        { value: 'partners', label: 'Empresas Parceiras' },
                        { value: 'referrals', label: 'Indicações' }
                    ]}
                    label="Seção de Seguros"
                    className="md:hidden w-full"
                />
                <div className="hidden md:flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl overflow-x-auto no-scrollbar max-w-full">
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'plans' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600' : 'text-gray-500'}`}
                    >
                        Planos
                    </button>
                    <button
                        onClick={() => setActiveTab('partners')}
                        className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'partners' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600' : 'text-gray-500'}`}
                    >
                        Empresas Parceiras
                    </button>
                    <button
                        onClick={() => setActiveTab('referrals')}
                        className={`px-4 md:px-6 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all whitespace-nowrap relative ${activeTab === 'referrals' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600' : 'text-gray-500'}`}
                    >
                        Indicações
                        {referrals.filter(r => r.status === 'PENDING').length > 0 && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                        )}
                    </button>
                </div>
            </header>

            {activeTab === 'plans' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <Button onClick={() => setEditingPlan({ title: '', price_mensal: 0, features: [], is_popular: false, is_active: true, deductible_percent: 0 })} className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Novo Plano
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {plans.map(plan => (
                            <div key={plan.id} className={`bg-white dark:bg-gray-800 rounded-3xl p-6 border ${plan.is_popular ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-gray-100 dark:border-gray-700'} shadow-xl relative`}>
                                {plan.is_popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Mais Popular</span>}
                                <h3 className="text-xl font-black mb-1">{plan.title}</h3>
                                <p className="text-2xl font-bold text-brand-600">R$ {plan.price_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}<span className="text-xs text-gray-400">/mês</span></p>
                                {plan.deductible_percent !== undefined && <div className="mt-2 text-[10px] font-black uppercase bg-gray-100 dark:bg-gray-700 inline-block px-2 py-1 rounded text-gray-500">Franquia: {plan.deductible_percent}% FIPE</div>}
                                <ul className="space-y-2 my-6">{plan.features?.map((f, i) => (<li key={i} className="flex items-center gap-2 text-xs text-gray-500"><CheckCircle className="w-4 h-4 text-green-500" /> {f}</li>))}</ul>
                                <div className="flex gap-2 border-t pt-4 border-gray-100 dark:border-gray-700">
                                    <Button variant="outline" fullWidth onClick={() => setEditingPlan(plan)} className="text-xs py-2 h-auto"><Edit2 className="w-3 h-3 mr-1" /> Editar</Button>
                                    <Button variant="danger" fullWidth onClick={() => handleDeletePlan(plan.id)} className="text-xs py-2 h-auto"><Trash2 className="w-3 h-3 mr-1" /> Remover</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'partners' && (
                <div className="bg-white dark:bg-gray-800 rounded-[32px] p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-8">
                        <h3 className="font-black text-xl">Seguradoras Parceiras</h3>
                        <Button size="sm" onClick={() => setEditingPartner({ name: '', is_active: true })} className="h-9 w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" /> Adicionar Empresa</Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {partners.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 group">
                                <div className="flex items-center gap-3"><Building2 className="w-5 h-5 text-gray-400" /><span className="font-bold text-sm">{p.name}</span></div>
                                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingPartner(p)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeletePartner(p.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'referrals' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="font-black text-xl flex items-center gap-2"><MessageSquare className="w-5 h-5 text-brand-600" /> Solicitações de Indicação</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-[10px] uppercase font-black text-gray-400">
                                    <tr>
                                        <th className="px-6 py-4">Usuário</th>
                                        <th className="px-6 py-4">Localização</th>
                                        <th className="px-6 py-4">Empresa Sugerida</th>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {referrals.map(r => (
                                        <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold">{(r as any).user?.name || 'Vendedor'}</div>
                                                <div className="text-[10px] text-gray-400">{(r as any).user?.email}</div>
                                            </td>
                                            <td className="px-6 py-4 flex items-center gap-2 text-gray-500"><MapPin className="w-3 h-3" /> {r.city}</td>
                                            <td className="px-6 py-4 font-black text-brand-600">{r.recommended_company}</td>
                                            <td className="px-6 py-4 text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : r.status === 'ANALYZED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {r.status === 'PENDING' ? 'Pendente' : r.status === 'ANALYZED' ? 'Analisada' : 'Rejeitada'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {r.status === 'PENDING' && (
                                                        <>
                                                            <button onClick={() => handleUpdateReferralStatus(r.id, 'ANALYZED')} className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"><CheckCircle className="w-4 h-4" /></button>
                                                            <button onClick={() => handleUpdateReferralStatus(r.id, 'REJECTED')} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><X className="w-4 h-4" /></button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {referrals.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Nenhuma indicação recebida.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Plano */}
            {editingPlan && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[40px] shadow-2xl p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <header className="flex justify-between items-center mb-8"><h3 className="text-2xl font-black">{editingPlan.id ? 'Editar Plano' : 'Novo Plano'}</h3><button onClick={() => setEditingPlan(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6 text-gray-400" /></button></header>
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Título do Plano</label><CustomInput value={editingPlan.title || ''} onChange={e => setEditingPlan({ ...editingPlan, title: (e as any).target.value })} placeholder="Ex: Proteção Total" /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Preço Mensal (R$)</label><input type="number" step="0.01" value={editingPlan.price_mensal} onChange={e => setEditingPlan({ ...editingPlan, price_mensal: parseFloat(e.target.value) })} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none border border-transparent focus:border-brand-500 font-bold" placeholder="0,00" /></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Taxa de Franquia (% FIPE)</label><input type="number" step="0.1" value={editingPlan.deductible_percent || 0} onChange={e => setEditingPlan({ ...editingPlan, deductible_percent: parseFloat(e.target.value) })} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none border border-transparent focus:border-brand-500 font-bold" placeholder="Ex: 5.0" /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Info Adicional Franquia</label><input value={editingPlan.deductible_info || ''} onChange={e => setEditingPlan({ ...editingPlan, deductible_info: e.target.value })} className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl outline-none border border-transparent focus:border-brand-500 text-sm" placeholder="Ex: Mínimo de R$ 500,00 para reparos." /></div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl">
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editingPlan.is_popular} onChange={e => setEditingPlan({ ...editingPlan, is_popular: e.target.checked })} className="w-5 h-5 rounded accent-brand-600" /><span className="text-sm font-bold">Destaque (Mais Popular)</span></label>
                                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editingPlan.is_active} onChange={e => setEditingPlan({ ...editingPlan, is_active: e.target.checked })} className="w-5 h-5 rounded accent-brand-600" /><span className="text-sm font-bold">Ativo</span></label>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Benefícios / Coberturas</label><Button variant="ghost" onClick={() => setEditingPlan({ ...editingPlan, features: [...(editingPlan.features || []), ''] })} className="text-xs h-auto py-1"><Plus className="w-3 h-3 mr-1" /> Adicionar</Button></div>
                                <div className="space-y-2">{editingPlan.features?.map((feat, idx) => (<div key={idx} className="flex gap-2 animate-in slide-in-from-left-2"><input value={feat} onChange={e => { const f = [...(editingPlan.features || [])]; f[idx] = e.target.value; setEditingPlan({ ...editingPlan, features: f }); }} className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none text-sm" placeholder="Ex: Assistência 24h" /><button onClick={() => { const f = [...(editingPlan.features || [])]; f.splice(idx, 1); setEditingPlan({ ...editingPlan, features: f }); }} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"><Trash2 className="w-4 h-4" /></button></div>))}</div>
                            </div>
                            <Button fullWidth onClick={handleSavePlan} disabled={saving} className="py-4">{saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Plano</>}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Parceiro */}
            {editingPartner && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[40px] shadow-2xl p-8">
                        <header className="flex justify-between items-center mb-6"><h3 className="font-black text-xl">{editingPartner.id ? 'Editar Parceiro' : 'Novo Parceiro'}</h3><button onClick={() => setEditingPartner(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button></header>
                        <div className="space-y-4">
                            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Nome da Seguradora</label><CustomInput value={editingPartner.name || ''} onChange={e => setEditingPartner({ ...editingPartner, name: (e as any).target.value })} /></div>
                            <Button fullWidth onClick={handleSavePartner} disabled={saving} className="py-3">{saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Salvar Empresa'}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
