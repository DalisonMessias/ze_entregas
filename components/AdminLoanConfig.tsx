import React, { useEffect, useState } from 'react';
import { Settings, Plus, Trash2, Edit, Loader2, Save, DollarSign, Percent, Hash, CheckCircle, XCircle, Clock, Users, AlertTriangle, Eye, Landmark } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { LoanType, LoanLevelLimit, PartnerLoan } from '../types';
import { useDialog } from '../utils/dialogService';


export const AdminLoanConfig: React.FC = () => {
    const { alert, confirm } = useDialog();
    const [activeTab, setActiveTab] = useState<'types' | 'levels' | 'loans'>('types');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Loan Types State
    const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
    const [editingType, setEditingType] = useState<Partial<LoanType> | null>(null);

    // Level Limits State
    const [levelLimits, setLevelLimits] = useState<LoanLevelLimit[]>([]);
    const [editingLimit, setEditingLimit] = useState<Partial<LoanLevelLimit> | null>(null);

    // Loans State
    const [loans, setLoans] = useState<PartnerLoan[]>([]);
    const [selectedLoan, setSelectedLoan] = useState<PartnerLoan | null>(null);

    // Rejection Modal State
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [loanToReject, setLoanToReject] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

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
            await alert({ title: 'Erro de Carregamento', message: e.message || 'Erro ao carregar dados de empréstimos' });
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
            await alert({ title: 'Sucesso', message: 'Tipo de empréstimo salvo com sucesso!' });
            setEditingType(null);
            await loadData();
        } catch (e: any) {
            await alert({ title: 'Erro ao Salvar', message: e.message || 'Erro ao salvar tipo de empréstimo' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLoanType = async (id: string) => {
        const ok = await confirm({
            title: 'Excluir Tipo de Empréstimo',
            message: 'Tem certeza que deseja excluir este tipo de empréstimo? Esta ação não pode ser desfeita.'
        });

        if (!ok) return;

        setSaving(true);
        try {
            await cloud.adminDeleteLoanType(id);
            await alert({ title: 'Sucesso', message: 'Tipo de empréstimo excluído!' });
            await loadData();
        } catch (e: any) {
            await alert({ title: 'Erro ao Excluir', message: e.message || 'Erro ao excluir tipo de empréstimo' });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveLevelLimit = async () => {
        if (!editingLimit) return;
        setSaving(true);
        try {
            await cloud.adminUpsertLoanLevelLimit(editingLimit);
            await alert({ title: 'Sucesso', message: 'Limite de nível salvo com sucesso!' });
            setEditingLimit(null);
            await loadData();
        } catch (e: any) {
            await alert({ title: 'Erro ao Salvar', message: e.message || 'Erro ao salvar limite de nível' });
        } finally {
            setSaving(false);
        }
    };

    // Approval Modal State
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [loanToApprove, setLoanToApprove] = useState<PartnerLoan | null>(null);

    // ... (existing effects and other handlers)

    const handleApproveLoan = (loanId: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (loan) {
            setLoanToApprove(loan);
            setApproveModalOpen(true);
        }
    };

    const confirmApproveLoan = async () => {
        if (!loanToApprove) return;

        setSaving(true);
        try {
            await cloud.adminApproveLoan(loanToApprove.id);
            await alert({ title: 'Sucesso', message: 'Empréstimo aprovado com sucesso!' });
            setApproveModalOpen(false);
            setLoanToApprove(null);
            await loadData();
        } catch (e: any) {
            await alert({ title: 'Erro ao Aprovar', message: e.message || 'Erro ao aprovar empréstimo' });
        } finally {
            setSaving(false);
        }
    };

    const handleRejectLoan = async (loanId: string) => {
        setLoanToReject(loanId);
        setRejectModalOpen(true);
    };

    const confirmRejectLoan = async () => {
        if (!loanToReject || !rejectionReason.trim()) {
            await alert({ title: 'Atenção', message: 'Por favor, informe o motivo da rejeição' });
            return;
        }
        setSaving(true);
        try {
            await cloud.adminRejectLoan(loanToReject, rejectionReason);
            await alert({ title: 'Sucesso', message: 'Empréstimo rejeitado com sucesso!' });
            setRejectModalOpen(false);
            setLoanToReject(null);
            setRejectionReason('');
            await loadData();
        } catch (e: any) {
            await alert({ title: 'Erro ao Rejeitar', message: e.message || 'Erro ao rejeitar empréstimo' });
        } finally {
            setSaving(false);
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
                <Button onClick={() => setEditingLimit({ user_type: 'DELIVERY', partner_level: '', max_limit: 0, max_installments: 12, allow_negative_balance: false })}>
                    <Plus className="w-4 h-4 mr-2" /> Novo Limite
                </Button>
            </div>

            {editingLimit && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl space-y-3">
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Tipo de Usuário</label>
                        <CustomSelect
                            value={editingLimit.user_type || 'DELIVERY'}
                            onChange={val => setEditingLimit({ ...editingLimit, user_type: val as 'DELIVERY' | 'STORE' })}
                            options={[
                                { label: 'Entregador', value: 'DELIVERY' },
                                { label: 'Lojista', value: 'STORE' }
                            ]}
                            placeholder="Selecione o tipo de usuário"
                        />
                    </div>
                    <CustomSelect
                        value={editingLimit.partner_level || ''}
                        onChange={val => setEditingLimit({ ...editingLimit, partner_level: val as string })}
                        options={[
                            { label: 'BRONZE', value: 'BRONZE' },
                            { label: 'PRATA', value: 'PRATA' },
                            { label: 'OURO', value: 'OURO' },
                            { label: 'DIAMANTE', value: 'DIAMANTE' }
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
                    <div>
                        <label className="text-xs text-gray-500 block mb-1">Parcelas Máximas</label>
                        <input
                            type="number"
                            placeholder="12"
                            value={editingLimit.max_installments || ''}
                            onChange={e => setEditingLimit({ ...editingLimit, max_installments: parseInt(e.target.value) || 0 })}
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
                            <div className="flex items-center gap-2">
                                <h5 className="font-bold text-gray-800 dark:text-white">{limit.partner_level}</h5>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${limit.user_type === 'DELIVERY'
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    }`}>
                                    {limit.user_type === 'DELIVERY' ? 'Entregador' : 'Lojista'}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500">Limite: {formatCurrency(limit.max_limit)} • Máx: {limit.max_installments}x</p>
                            <p className="text-xs text-gray-400">{limit.allow_negative_balance ? '✓ Permite saldo negativo' : '✗ Não permite saldo negativo'}</p>
                        </div>
                        <Button variant="ghost" onClick={() => setEditingLimit(limit)}><Edit className="w-4 h-4" /></Button>
                    </div>
                ))}
            </div>
        </div>
    );

    // View Modal State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [loanToView, setLoanToView] = useState<PartnerLoan | null>(null);

    const handleViewLoan = (loanId: string) => {
        const loan = loans.find(l => l.id === loanId);
        if (loan) {
            setLoanToView(loan);
            setViewModalOpen(true);
        }
    };

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
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => handleViewLoan(loan.id)} title="Ver Detalhes">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                    {loan.status === 'PENDING' && (
                                        <>
                                            <Button size="sm" onClick={() => handleApproveLoan(loan.id)}>
                                                <CheckCircle className="w-4 h-4 mr-1" />Aprovar
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleRejectLoan(loan.id)}>
                                                <XCircle className="w-4 h-4 mr-1" />Rejeitar
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">

            <div className="flex gap-2 border-b border-gray-100 dark:border-gray-700 pb-4 overflow-x-auto">
                <Button variant={activeTab === 'types' ? 'primary' : 'ghost'} onClick={() => setActiveTab('types')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Tipos de Empréstimo
                </Button>
                <Button variant={activeTab === 'levels' ? 'primary' : 'ghost'} onClick={() => setActiveTab('levels')}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Limites por Nível
                </Button>
                <Button variant={activeTab === 'loans' ? 'primary' : 'ghost'} onClick={() => setActiveTab('loans')}>
                    <Clock className="w-4 h-4 mr-2" />
                    Solicitações
                </Button>
            </div>

            {activeTab === 'types' && renderTypesTab()}
            {activeTab === 'levels' && renderLevelsTab()}
            {activeTab === 'loans' && renderLoansTab()}

            {/* Modal de Rejeição */}
            {rejectModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setRejectModalOpen(false)}>
                    {/* ... (existing rejection modal logic) */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center mb-4">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-2">
                                <XCircle className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">Rejeitar Empréstimo</h3>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">Informe o motivo da rejeição para notificar o parceiro:</p>

                        <textarea
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 mb-4 min-h-[100px] focus:ring-2 focus:ring-red-500 outline-none resize-none"
                            placeholder="Ex: Histórico financeiro incompatível..."
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setRejectModalOpen(false);
                                    setLoanToReject(null);
                                    setRejectionReason('');
                                }}
                                fullWidth
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmRejectLoan}
                                disabled={!rejectionReason.trim()}
                                fullWidth
                                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                            >
                                Rejeitar Solicitação
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Rico de Aprovação */}
            {approveModalOpen && loanToApprove && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setApproveModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-0 max-w-4xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Aprovar Empréstimo</h3>
                                    <p className="text-xs text-gray-500">Revise os dados antes de confirmar</p>
                                </div>
                            </div>
                            <button onClick={() => setApproveModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Coluna Esquerda: Dados do Empréstimo */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Detalhes da Solicitação</h4>
                                        <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-400">Valor Solicitado</span>
                                                <span className="font-black text-lg text-gray-800 dark:text-white">{formatCurrency(loanToApprove.amount_requested)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600 dark:text-gray-400">Total a Pagar</span>
                                                <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(loanToApprove.amount_total)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600 dark:text-gray-400">Juros Aplicados</span>
                                                <span className="font-bold text-gray-800 dark:text-white">{loanToApprove.interest_rate_applied}% a.m.</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600 dark:text-gray-400">Parcelamento</span>
                                                <span className="font-bold text-gray-800 dark:text-white">{loanToApprove.installments_count}x de {formatCurrency(loanToApprove.amount_total / loanToApprove.installments_count)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-gray-600 dark:text-gray-400">Data Solicitação</span>
                                                <span className="text-sm text-gray-800 dark:text-white">{new Date(loanToApprove.created_at).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                                                <span className="text-gray-600 dark:text-gray-400">Método de Recebimento</span>
                                                <span className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-1">
                                                    {loanToApprove.disbursement_method === 'BANK_ACCOUNT' ? <Landmark className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                                    {loanToApprove.disbursement_method === 'BANK_ACCOUNT' ? 'Conta Bancária' : 'Carteira Digital'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Tipo de Empréstimo</h4>
                                        <div className="border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-4">
                                            <p className="font-bold text-indigo-700 dark:text-indigo-300">{loanToApprove.loan_type?.name}</p>
                                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{loanToApprove.loan_type?.description}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Coluna Direita: Dados do Usuário */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Dados do Solicitante</h4>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                {loanToApprove.user?.avatar_url ? (
                                                    <img src={loanToApprove.user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <Users className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg text-gray-900 dark:text-white">{loanToApprove.user?.name || 'Não informado'}</p>
                                                <div className="flex flex-col gap-1 text-sm text-gray-500 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">Email:</span>
                                                        <span>{loanToApprove.user?.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">CPF:</span>
                                                        <span>{loanToApprove.user?.cpf || 'Não informado'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">Telefone:</span>
                                                        <span>{loanToApprove.user?.phone_number || 'Não informado'}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex gap-2">
                                                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                        {loanToApprove.user?.partner_level || 'Nível N/A'}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                                                        {loanToApprove.user?.vehicle_type || 'Veículo N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Dados Bancários</h4>
                                        {loanToApprove.user?.bank_details ? (
                                            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 text-sm space-y-2 border border-gray-200 dark:border-gray-700">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="block text-xs text-gray-500">Banco</span>
                                                        <span className="font-medium">{loanToApprove.user.bank_details.bankName}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-gray-500">Tipo Chave PIX</span>
                                                        <span className="font-medium">{loanToApprove.user.bank_details.pixType}</span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="block text-xs text-gray-500">Chave PIX</span>
                                                        <span className="font-medium font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 block mt-1">
                                                            {loanToApprove.user.bank_details.pixKey}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-gray-500">Agência</span>
                                                        <span className="font-medium">{loanToApprove.user.bank_details.agency}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-gray-500">Conta</span>
                                                        <span className="font-medium">{loanToApprove.user.bank_details.account}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
                                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                                <p className="text-sm text-red-600 dark:text-red-400">Usuário sem dados bancários cadastrados.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setApproveModalOpen(false)}
                                disabled={saving}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmApproveLoan}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700 text-white border-green-600 pl-6 pr-8"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Confirmar Aprovação
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes (View Modal) */}
            {viewModalOpen && loanToView && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-0 max-w-4xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center">
                                    <Eye className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Detalhes do Empréstimo</h3>
                                    <p className="text-xs text-gray-500">Visualizando informações completas</p>
                                </div>
                            </div>
                            <button onClick={() => setViewModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Coluna Esquerda: Dados do Empréstimo */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Detalhes da Solicitação</h4>
                                        <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-400">Valor Solicitado</span>
                                                <span className="font-black text-lg text-gray-800 dark:text-white">{formatCurrency(loanToView.amount_requested)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600 dark:text-gray-400">Total a Pagar</span>
                                                <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(loanToView.amount_total)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600 dark:text-gray-400">Juros Aplicados</span>
                                                <span className="font-bold text-gray-800 dark:text-white">{loanToView.interest_rate_applied}% a.m.</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-600 dark:text-gray-400">Parcelamento</span>
                                                <span className="font-bold text-gray-800 dark:text-white">{loanToView.installments_count}x de {formatCurrency(loanToView.amount_total / loanToView.installments_count)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-gray-600 dark:text-gray-400">Data Solicitação</span>
                                                <span className="text-sm text-gray-800 dark:text-white">{new Date(loanToView.created_at).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                                                <span className="text-gray-600 dark:text-gray-400">Método de Recebimento</span>
                                                <span className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-1">
                                                    {loanToView.disbursement_method === 'BANK_ACCOUNT' ? <Landmark className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                                    {loanToView.disbursement_method === 'BANK_ACCOUNT' ? 'Conta Bancária' : 'Carteira Digital'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2">
                                                <span className="text-gray-600 dark:text-gray-400">Status Atual</span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${loanToView.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                    loanToView.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                        loanToView.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {loanToView.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Tipo de Empréstimo</h4>
                                        <div className="border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-4">
                                            <p className="font-bold text-indigo-700 dark:text-indigo-300">{loanToView.loan_type?.name}</p>
                                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">{loanToView.loan_type?.description}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Coluna Direita: Dados do Usuário */}
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Dados do Solicitante</h4>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                {loanToView.user?.avatar_url ? (
                                                    <img src={loanToView.user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <Users className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg text-gray-900 dark:text-white">{loanToView.user?.name || 'Não informado'}</p>
                                                <div className="flex flex-col gap-1 text-sm text-gray-500 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">Email:</span>
                                                        <span>{loanToView.user?.email}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">CPF:</span>
                                                        <span>{loanToView.user?.cpf || 'Não informado'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-700 dark:text-gray-300">Telefone:</span>
                                                        <span>{loanToView.user?.phone_number || 'Não informado'}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex gap-2">
                                                    <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                        {loanToView.user?.partner_level || 'Nível N/A'}
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                                                        {loanToView.user?.vehicle_type || 'Veículo N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Dados Bancários</h4>
                                        {loanToView.user?.bank_details ? (
                                            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-xl p-4 text-sm space-y-2 border border-gray-200 dark:border-gray-700">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <span className="block text-xs text-gray-500">Banco</span>
                                                        <span className="font-medium">{loanToView.user.bank_details.bankName}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-gray-500">Tipo Chave PIX</span>
                                                        <span className="font-medium">{loanToView.user.bank_details.pixType}</span>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="block text-xs text-gray-500">Chave PIX</span>
                                                        <span className="font-medium font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 block mt-1">
                                                            {loanToView.user.bank_details.pixKey}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-gray-500">Agência</span>
                                                        <span className="font-medium">{loanToView.user.bank_details.agency}</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs text-gray-500">Conta</span>
                                                        <span className="font-medium">{loanToView.user.bank_details.account}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
                                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                                <p className="text-sm text-red-600 dark:text-red-400">Usuário sem dados bancários cadastrados.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
                            <Button
                                onClick={() => setViewModalOpen(false)}
                                className="bg-gray-800 text-white"
                            >
                                Fechar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
