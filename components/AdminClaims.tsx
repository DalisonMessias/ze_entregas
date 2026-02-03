
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, MessageCircle, FileText, X, CheckCircle, Clock, Eye, Send, AlertTriangle, RefreshCw, Settings, Save, Phone } from 'lucide-react';
import { Claim, ShopSettings } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';

const formatDateTime = (isoString: string) => new Date(isoString).toLocaleString('pt-BR');

const getStatusChipColor = (status: string) => {
    switch (status) {
        case 'open': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        case 'closed': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300';
        default: return 'bg-gray-100 text-gray-500';
    }
};

export const AdminClaims: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'claims' | 'settings'>('claims');
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved' | 'closed'>('open');

    // Modal State
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
    const [adminResponse, setAdminResponse] = useState('');
    const [processing, setProcessing] = useState(false);

    // Settings State
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);

    const { alert } = useDialog();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'claims') {
                const data = await cloud.adminGetSupportClaims(statusFilter);
                setClaims(data);
            } else {
                const settings = await cloud.getShopSettings();
                setShopSettings(settings || { is_shop_enabled: true } as any);
            }
        } catch (e) {
            console.error("Error loading data:", e);
        } finally {
            setLoading(false);
        }
    }, [activeTab, statusFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateClaim = async (status: 'open' | 'resolved' | 'closed') => {
        if (!selectedClaim) return;
        setProcessing(true);
        try {
            await cloud.adminUpdateClaim(selectedClaim.id, { admin_response: adminResponse, status });
            await alert({ title: 'Chamado Atualizado', message: `O status do chamado foi alterado para ${status === 'resolved' ? 'resolvido' : status === 'closed' ? 'fechado' : 'aberto'}.` });
            await loadData();
            setSelectedClaim(null);
            setAdminResponse('');
        } catch (e: any) {
            console.error(e);
            await alert({ title: 'Erro no Chamado', message: 'Erro ao atualizar chamado: ' + (e.message || "Erro desconhecido") });
        } finally {
            setProcessing(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!shopSettings) return;
        setSavingSettings(true);
        try {
            await cloud.adminUpdateShopSettings({
                support_phone: shopSettings.support_phone,
                support_hours_start: shopSettings.support_hours_start,
                support_hours_end: shopSettings.support_hours_end,
                support_status_override: shopSettings.support_status_override
            });
            await alert({ title: 'Suporte', message: 'Configurações de suporte salvas com sucesso!' });
        } catch (e: any) {
            await alert({ title: 'Erro de Configuração', message: 'Erro ao salvar: ' + (e.message || "Erro desconhecido") });
        } finally {
            setSavingSettings(false);
        }
    };

    const updateShopSetting = (field: keyof ShopSettings, value: any) => {
        setShopSettings(prev => prev ? { ...prev, [field]: value } : null);
    };

    const ClaimDetailsModal: React.FC<{ claim: Claim, onClose: () => void }> = ({ claim, onClose }) => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><FileText className="w-5 h-5 text-brand-500" /> Detalhes do Chamado</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                    <p><strong>ID Usuário:</strong> {claim.user_id}</p>
                    <p><strong>Email:</strong> {claim.user_email}</p>
                    <p><strong>Tipo:</strong> {claim.type}</p>
                    <p><strong>Descrição:</strong> {claim.description}</p>
                    <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusChipColor(claim.status)}`}>{claim.status}</span></p>
                    <p><strong>Criado em:</strong> {formatDateTime(claim.created_at)}</p>

                    {claim.admin_response && (
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm mt-4">Resposta Anterior do Admin:</p>
                            <p className="text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">{claim.admin_response}</p>
                        </div>
                    )}

                    {(claim.status === 'open' || claim.status === 'resolved') && (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sua Resposta</label>
                                <textarea
                                    value={adminResponse}
                                    onChange={e => setAdminResponse(e.target.value)}
                                    rows={4}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 resize-y"
                                    placeholder="Digite sua resposta ou observações aqui..."
                                />
                            </div>
                            <div className="flex gap-3 mt-4">
                                {claim.status === 'open' && (
                                    <Button fullWidth onClick={() => handleUpdateClaim('resolved')} disabled={processing} variant="success">
                                        {processing ? <Loader2 className="animate-spin" /> : 'Marcar como Resolvido'}
                                    </Button>
                                )}
                                {claim.status === 'resolved' && (
                                    <Button fullWidth onClick={() => handleUpdateClaim('open')} disabled={processing} variant="outline">
                                        {processing ? <Loader2 className="animate-spin" /> : 'Reabrir Chamado'}
                                    </Button>
                                )}
                                <Button fullWidth onClick={() => handleUpdateClaim('closed')} disabled={processing} variant="danger">
                                    {processing ? <Loader2 className="animate-spin" /> : 'Fechar Chamado'}
                                </Button>
                            </div>
                        </>
                    )}
                    <Button fullWidth variant="outline" onClick={onClose} className="mt-4">Fechar</Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('claims')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'claims' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Chamados</button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'settings' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Configurações</button>
            </div>

            {activeTab === 'claims' && (
                <>
                    <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mb-4 overflow-x-auto no-scrollbar">
                        <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-bold ${statusFilter === 'all' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Todos</button>
                        <button onClick={() => setStatusFilter('open')} className={`px-4 py-2 rounded-lg text-sm font-bold ${statusFilter === 'open' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Abertos</button>
                        <button onClick={() => setStatusFilter('resolved')} className={`px-4 py-2 rounded-lg text-sm font-bold ${statusFilter === 'resolved' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Resolvidos</button>
                        <button onClick={() => setStatusFilter('closed')} className={`px-4 py-2 rounded-lg text-sm font-bold ${statusFilter === 'closed' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Fechados</button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg dark:text-white">Lista de Chamados</h3>
                            <button onClick={loadData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="overflow-x-auto max-h-96 custom-scrollbar">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Tipo</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Data</th>
                                        <th className="px-4 py-3 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></td></tr>}
                                    {!loading && claims.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum chamado encontrado.</td></tr>}
                                    {!loading && claims.map(claim => (
                                        <tr key={claim.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-4 py-3 font-mono text-xs dark:text-white">{claim.id.substring(0, 8)}</td>
                                            <td className="px-4 py-3">{claim.type.replace('_', ' ')}</td>
                                            <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusChipColor(claim.status)}`}>{claim.status}</span></td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(claim.created_at)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <Button size="sm" variant="outline" onClick={() => setSelectedClaim(claim)} className="px-3 py-1.5 text-xs">
                                                    <Eye className="w-4 h-4 mr-1" /> Ver
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'settings' && shopSettings && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500" /> Configuração de Atendimento</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Defina os horários e canais de suporte da plataforma.</p>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone de Suporte (WhatsApp)</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={shopSettings.support_phone || ''}
                                onChange={e => updateShopSetting('support_phone', e.target.value)}
                                className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                placeholder="5511999999999"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Início (HH:MM)</label>
                            <input
                                type="time"
                                value={shopSettings.support_hours_start || ''}
                                onChange={e => updateShopSetting('support_hours_start', e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Término (HH:MM)</label>
                            <input
                                type="time"
                                value={shopSettings.support_hours_end || ''}
                                onChange={e => updateShopSetting('support_hours_end', e.target.value)}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status do Atendimento (Override)</label>
                        <select
                            value={shopSettings.support_status_override || 'AUTO'}
                            onChange={e => updateShopSetting('support_status_override', e.target.value)}
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none dark:text-white"
                        >
                            <option value="AUTO">Automático (Baseado no Horário)</option>
                            <option value="OPEN">Forçar Aberto (Sempre Online)</option>
                            <option value="CLOSED">Forçar Fechado (Manutenção/Feriado)</option>
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Controla a disponibilidade do chat e abertura de tickets.</p>
                    </div>

                    <Button fullWidth onClick={handleSaveSettings} disabled={savingSettings} className="mt-4">
                        {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Configurações</>}
                    </Button>
                </div>
            )}

            {selectedClaim && <ClaimDetailsModal claim={selectedClaim} onClose={() => setSelectedClaim(null)} />}
        </div>
    );
};
