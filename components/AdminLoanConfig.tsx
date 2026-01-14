import React, { useEffect, useState } from 'react';
import { Settings, Plus, Trash2, Edit, Loader2, Save, DollarSign, Percent, Hash, CheckCircle, XCircle, Clock } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { LoanType, LoanLevelLimit, PartnerLoan } from '../types';

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-24 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 fade-in duration-300 border ${type === 'success' ? 'bg-white border-green-100 dark:bg-gray-800 dark:border-green-900' : 'bg-white border-red-100 dark:bg-gray-800 dark:border-red-900'}`}>
            <div className={`p-2 rounded-full ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            </div>
            <div>
                <h4 className={`font-bold text-sm ${type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {type === 'success' ? 'Sucesso' : 'Erro'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>
            </div>
        </div>
    );
};

export const AdminLoanConfig: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'types' | 'levels' | 'loans'>('types');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Loan Types State
    const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
    const [editingType, setEditingType] = useState<Partial<LoanType> | null>(null);

    // Level Limits State
    const [levelLimits, setLevelLimits] = useState<LoanLevelLimit[]>([]);
    const [editingLimit, setEditingLimit] = useState<Partial<LoanLevelLimit> | null>(null);

    // Loans State
    const [loans, setLoans] = useState<PartnerLoan[]>([]);
    const [selectedLoan, setSelectedLoan] = useState<PartnerLoan | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'types') {
                const types = await cloud.adminGetLoanTypes();
                setLoanTypes(types);
            } else if (activeTab === 'levels') {
                const limits = await cloud.adminGetLoanLevelLimits();
                setLevelLimits(limits);
            } else if (activeTab === 'loans') {
                const allLoans = await cloud.adminGetAllLoans();
                setLoans(allLoans);
            }
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro ao carregar dados' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLoanType = async () => {
        if (!editingType) return;
        setSaving(true);
        try {
            if (editingType.id) {
                await cloud.adminUpdateLoanType(editingType.id, editingType);
            } else {
                await cloud.adminCreateLoanType(editingType);
            }
            setToast({ type: 'success', message: 'Tipo de empréstimo salvo com sucesso!' });
            setEditingType(null);
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro ao salvar' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLoanType = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este tipo de empréstimo?')) return;
        try {
            await cloud.adminDeleteLoanType(id);
            setToast({ type: 'success', message: 'Tipo excluído com sucesso!' });
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro ao excluir' });
        }
    };

    const handleSaveLevelLimit = async () => {
        if (!editingLimit) return;
        setSaving(true);
        try {
            await cloud.adminUpsertLoanLevelLimit(editingLimit);
            setToast({ type: 'success', message: 'Limite salvo com sucesso!' });
            setEditingLimit(null);
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro ao salvar' });
        } finally {
            setSaving(false);
        }
    };

    const handleApproveLoan = async (loanId: string) => {
        if (!confirm('Aprovar este empréstimo?')) return;
        try {
            await cloud.adminApproveLoan(loanId);
            setToast({ type: 'success', message: 'Empréstimo aprovado!' });
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro ao aprovar' });
        }
    };

    const handleRejectLoan = async (loanId: string) => {
        const reason = prompt('Motivo da rejeição:');
        if (!reason) return;
        try {
            await cloud.adminRejectLoan(loanId, reason);
            setToast({ type: 'success', message: 'Empréstimo rejeitado!' });
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro ao rejeitar' });
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const renderTypesTab = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-700 dark:text-gray-300">Tipos de Empréstimo</h4>
                <Button onClick={() => setEditingType({ name: '', description: '', interest_rate_monthly: 0, max_installments: 1, target_audience: 'BOTH', is_active: true })}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Tipo
                </Button>
            </div>

            {editingType && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl space-y-3">
                    <input
                        type="text"
                        placeholder="Nome do tipo"
                        value={editingType.name || ''}
                        onChange={e => setEditingType({ ...editingType, name: e.target.value })}
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                    />
                    <textarea
                        value={editingType.description || ''}
                        onChange={e => setEditingType({ ...editingType, description: e.target.value })}
                        className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                    />
                    <div>
                        <label className="text-xs text-gray-500">Público Alvo</label>
                        <CustomSelect
                            value={editingType.target_audience || 'BOTH'}
                            onChange={val => setEditingType({ ...editingType, target_audience: val as 'STORE' | 'COURIER' | 'BOTH' })}
                            options={[
                                { label: 'Ambos', value: 'BOTH' },
                                { label: 'Lojistas', value: 'STORE' },
                                { label: 'Entregadores', value: 'COURIER' }
                            ]}
                            placeholder="Selecione o Público"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500">Taxa Mensal (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={editingType.interest_rate_monthly || 0}
                                onChange={e => setEditingType({ ...editingType, interest_rate_monthly: parseFloat(e.target.value) })}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Máx. Parcelas</label>
                            <input
                                type="number"
                                value={editingType.max_installments || 1}
                                onChange={e => setEditingType({ ...editingType, max_installments: parseInt(e.target.value) })}
                                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleSaveLoanType} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar
                        </Button>
                        <Button variant="outline" onClick={() => setEditingType(null)}>Cancelar</Button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {loanTypes.map(type => (
                    <div key={type.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h5 className="font-bold text-gray-800 dark:text-white">{type.name}</h5>
                            <p className="text-sm text-gray-500">{type.description}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                                <span><Percent className="w-3 h-3 inline mr-1" />{type.interest_rate_monthly}% ao mês</span>
                                <span><Hash className="w-3 h-3 inline mr-1" />Até {type.max_installments}x</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] ${type.target_audience === 'STORE' ? 'bg-blue-100 text-blue-700' :
                                        type.target_audience === 'COURIER' ? 'bg-orange-100 text-orange-700' :
                                            'bg-purple-100 text-purple-700'
                                    }`}>
                                    {type.target_audience === 'STORE' ? 'Lojistas' : type.target_audience === 'COURIER' ? 'Entregadores' : 'Todos'}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setEditingType(type)}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" onClick={() => handleDeleteLoanType(type.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderLevelsTab = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-700 dark:text-gray-300">Limites por Nível</h4>
                <Button onClick={() => setEditingLimit({ partner_level: '', max_limit: 0, allow_negative_balance: false })}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Limite
                </Button>
            </div>

            {editingLimit && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl space-y-3">
                    <CustomSelect
                        value={editingLimit.partner_level || ''}
                        onChange={val => setEditingLimit({ ...editingLimit, partner_level: val as string })}
                        options={[
                            { label: 'BRONZE', value: 'BRONZE' },
                            { label: 'SILVER', value: 'SILVER' },
                            { label: 'GOLD', value: 'GOLD' },
                            { label: 'PLATINUM', value: 'PLATINUM' },
                            { label: 'DIAMOND', value: 'DIAMOND' }
                        ]}
                        placeholder="Selecione o Nível do parceiro"
                    />
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Limite Máximo (R$)</label>
                        <input
                            type="text"
                            placeholder="R$ 0,00"
                            value={editingLimit.max_limit ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(editingLimit.max_limit) : ''}
                            onChange={e => {
                                const value = e.target.value.replace(/\D/g, '');
                                const numberValue = value ? Number(value) / 100 : 0;
                                setEditingLimit({ ...editingLimit, max_limit: numberValue });
                            }}
                            className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                        />
                    </div>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={editingLimit.allow_negative_balance || false}
                            onChange={e => setEditingLimit({ ...editingLimit, allow_negative_balance: e.target.checked })}
                        />
                        <span className="text-sm">Permitir saldo negativo</span>
                    </label>
                    <div className="flex gap-2">
                        <Button onClick={handleSaveLevelLimit} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Salvar
                        </Button>
                        <Button variant="outline" onClick={() => setEditingLimit(null)}>Cancelar</Button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {levelLimits.map(limit => (
                    <div key={limit.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h5 className="font-bold text-gray-800 dark:text-white">{limit.partner_level}</h5>
                            <p className="text-sm text-gray-500">Limite: {formatCurrency(limit.max_limit)}</p>
                            <p className="text-xs text-gray-400">{limit.allow_negative_balance ? '✓ Permite saldo negativo' : '✗ Não permite saldo negativo'}</p>
                        </div>
                        <Button variant="ghost" onClick={() => setEditingLimit(limit)}><Edit className="w-4 h-4" /></Button>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderLoansTab = () => (
        <div className="space-y-4">
            <h4 className="font-bold text-gray-700 dark:text-gray-300">Solicitações de Empréstimo</h4>
            <div className="space-y-2">
                {loans.map(loan => (
                    <div key={loan.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start">
                            <div>
                                <h5 className="font-bold text-gray-800 dark:text-white">{loan.user?.name || 'Usuário'}</h5>
                                <p className="text-sm text-gray-500">{loan.user?.email}</p>
                                <div className="flex gap-4 mt-2 text-sm">
                                    <span><DollarSign className="w-4 h-4 inline" />{formatCurrency(loan.amount_requested)}</span>
                                    <span><Hash className="w-4 h-4 inline" />{loan.installments_count}x de {formatCurrency(loan.amount_total / loan.installments_count)}</span>
                                    <span><Percent className="w-4 h-4 inline" />{loan.interest_rate_applied}%</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${loan.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                    loan.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                                        loan.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                            loan.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                    }`}>
                                    {loan.status}
                                </span>
                                {loan.status === 'PENDING' && (
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleApproveLoan(loan.id)}>
                                            <CheckCircle className="w-4 h-4 mr-1" />Aprovar
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => handleRejectLoan(loan.id)}>
                                            <XCircle className="w-4 h-4 mr-1" />Rejeitar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                    <Settings className="w-5 h-5" /> Gerenciamento de Empréstimos
                </h3>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                    <Button variant={activeTab === 'types' ? 'primary' : 'ghost'} onClick={() => setActiveTab('types')}>Tipos</Button>
                    <Button variant={activeTab === 'levels' ? 'primary' : 'ghost'} onClick={() => setActiveTab('levels')}>Níveis</Button>
                    <Button variant={activeTab === 'loans' ? 'primary' : 'ghost'} onClick={() => setActiveTab('loans')}>Solicitações</Button>
                </div>
            </div>

            {activeTab === 'types' && renderTypesTab()}
            {activeTab === 'levels' && renderLevelsTab()}
            {activeTab === 'loans' && renderLoansTab()}
        </div>
    );
};
