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

    // Rejection Modal State
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [loanToReject, setLoanToReject] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    // Confirmation Modals
    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        action: () => void;
        type: 'danger' | 'success';
    } | null>(null);

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
        setConfirmModal({
            open: true,
            title: 'Excluir Tipo de Empréstimo',
            message: 'Tem certeza que deseja excluir este tipo de empréstimo? Esta ação não pode ser desfeita.',
            type: 'danger',
            action: async () => {
                try {
                    await cloud.adminDeleteLoanType(id);
                    setToast({ type: 'success', message: 'Tipo de empréstimo excluído!' });
                    loadData();
                } catch (e: any) {
                    setToast({ type: 'error', message: e.message || 'Erro ao excluir' });
                }
                setConfirmModal(null);
            }
        });
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
        setConfirmModal({
            open: true,
            title: 'Aprovar Empréstimo',
            message: 'Deseja aprovar esta solicitação de empréstimo?',
            type: 'success',
            action: async () => {
                try {
                    await cloud.adminApproveLoan(loanId);
                    setToast({ type: 'success', message: 'Empréstimo aprovado!' });
                    loadData();
                } catch (e: any) {
                    setToast({ type: 'error', message: e.message || 'Erro ao aprovar' });
                }
                setConfirmModal(null);
            }
        });
    };

    const handleRejectLoan = async (loanId: string) => {
        setLoanToReject(loanId);
        setRejectModalOpen(true);
    };

    const confirmRejectLoan = async () => {
        if (!loanToReject || !rejectionReason.trim()) {
            setToast({ type: 'error', message: 'Por favor, informe o motivo da rejeição' });
            return;
        }
        try {
            await cloud.adminRejectLoan(loanToReject, rejectionReason);
            setToast({ type: 'success', message: 'Empréstimo rejeitado!' });
            setRejectModalOpen(false);
            setLoanToReject(null);
            setRejectionReason('');
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

            {/* Modal de Rejeição */}
            {rejectModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setRejectModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">Rejeitar Empréstimo</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Por favor, informe o motivo da rejeição:</p>
                        <textarea
                            value={rejectionReason}
                            onChange={e => setRejectionReason(e.target.value)}
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 mb-4 min-h-[100px]"
                            placeholder="Ex: Documentação incompleta, histórico de inadimplência, etc."
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
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Rejeitar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Confirmação Genérico */}
            {confirmModal && confirmModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]" onClick={() => setConfirmModal(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-16 h-16 ${confirmModal.type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'} rounded-full flex items-center justify-center mb-4`}>
                                {confirmModal.type === 'danger' ? <Trash2 className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
                            </div>
                            <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-2">{confirmModal.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                {confirmModal.message}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" onClick={() => setConfirmModal(null)} fullWidth>Cancelar</Button>
                            <Button
                                onClick={confirmModal.action}
                                className={confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
                                fullWidth
                            >
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
