import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calculator, FileText, Clock, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import { Button } from './Button';
import { LoanType, PartnerLoan, LoanInstallment, LoanSimulation } from '../types';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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

const LoansModule: React.FC = () => {
    const { confirm } = useDialog();
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [activeView, setActiveView] = useState<'dashboard' | 'simulate' | 'myloans'>('dashboard');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        if (view === 'simulate' || view === 'myloans' || view === 'dashboard') {
            setActiveView(view);
        }
    }, []);

    const updateView = (view: 'dashboard' | 'simulate' | 'myloans') => {
        setActiveView(view);
        const url = new URL(window.location.href);
        url.searchParams.set('view', view);
        window.history.pushState({}, '', url.toString());
    };

    // Data
    const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
    const [userLimit, setUserLimit] = useState<{ max_limit: number; allow_negative_balance: boolean } | null>(null);
    const [myLoans, setMyLoans] = useState<PartnerLoan[]>([]);
    const [selectedLoan, setSelectedLoan] = useState<PartnerLoan | null>(null);
    const [installments, setInstallments] = useState<LoanInstallment[]>([]);

    // Simulation Form
    const [simForm, setSimForm] = useState({
        loanTypeId: '',
        amount: '',
        installments: 1
    });
    const [simulation, setSimulation] = useState<LoanSimulation | null>(null);
    const [simulating, setSimulating] = useState(false);
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [types, limit, loans] = await Promise.all([
                cloud.getLoanTypes(),
                cloud.getUserLoanLimit(),
                cloud.getUserLoans()
            ]);
            setLoanTypes(types);
            setUserLimit(limit);
            setMyLoans(loans);
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro ao carregar dados' });
        } finally {
            setLoading(false);
        }
    };

    const handleSimulate = async () => {
        if (!simForm.loanTypeId || !simForm.amount || simForm.installments < 1) {
            return setToast({ type: 'error', message: 'Preencha todos os campos' });
        }

        setSimulating(true);
        try {
            const amount = parseFloat(simForm.amount.replace(/\./g, '').replace(',', '.'));
            const result = await cloud.simulateLoan(amount, simForm.loanTypeId, simForm.installments);
            setSimulation(result);
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro na simulação' });
        } finally {
            setSimulating(false);
        }
    };

    const handleRequestLoan = async () => {
        if (!simulation) return;

        if (!simulation) return;

        const confirmed = await confirm({
            title: 'Confirmar Solicitação',
            message: `Deseja solicitar o empréstimo de ${simForm.amount} em ${simForm.installments}x?`,
            confirmButtonText: 'Sim, solicitar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirmed) return;

        setRequesting(true);
        try {
            const amount = parseFloat(simForm.amount.replace(/\./g, '').replace(',', '.'));
            await cloud.requestLoan(amount, simForm.loanTypeId, simForm.installments);
            setToast({ type: 'success', message: 'Empréstimo solicitado com sucesso!' });
            setSimulation(null);
            setSimForm({ loanTypeId: '', amount: '', installments: 1 });
            updateView('myloans');
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro ao solicitar empréstimo' });
        } finally {
            setRequesting(false);
        }
    };

    const handleViewLoanDetails = async (loan: PartnerLoan) => {
        setSelectedLoan(loan);
        try {
            const inst = await cloud.getLoanInstallments(loan.id);
            setInstallments(inst);
        } catch (e: any) {
            setToast({ type: 'error', message: 'Erro ao carregar parcelas' });
        }
    };

    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-2">Empréstimo Parceiro</h3>
                <p className="text-sm opacity-90 mb-4">Crédito rápido para entregadores verificados</p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs opacity-70">Limite Disponível</p>
                        <p className="text-2xl font-black">{userLimit ? formatCurrency(userLimit.max_limit) : '---'}</p>
                    </div>
                    <div>
                        <p className="text-xs opacity-70">Empréstimos Ativos</p>
                        <p className="text-2xl font-black">{myLoans.filter(l => l.status === 'ACTIVE').length}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => updateView('simulate')}
                    className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-brand-500 transition-colors"
                >
                    <Calculator className="w-8 h-8 text-brand-600 mb-3" />
                    <h4 className="font-bold text-gray-800 dark:text-white">Simular</h4>
                    <p className="text-xs text-gray-500 mt-1">Calcule seu empréstimo</p>
                </button>
                <button
                    onClick={() => updateView('myloans')}
                    className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-brand-500 transition-colors"
                >
                    <FileText className="w-8 h-8 text-brand-600 mb-3" />
                    <h4 className="font-bold text-gray-800 dark:text-white">Meus Empréstimos</h4>
                    <p className="text-xs text-gray-500 mt-1">Ver histórico</p>
                </button>
            </div>

            <div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-3">Tipos Disponíveis</h4>
                <div className="space-y-2">
                    {loanTypes.map(type => (
                        <div key={type.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                            <h5 className="font-bold text-gray-800 dark:text-white">{type.name}</h5>
                            <p className="text-sm text-gray-500 mt-1">{type.description}</p>
                            <div className="flex gap-4 mt-3 text-xs text-gray-600 dark:text-gray-400">
                                <span><TrendingUp className="w-3 h-3 inline mr-1" />{type.interest_rate_monthly}% ao mês</span>
                                <span>Até {type.max_installments}x</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderSimulate = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <button onClick={() => updateView('dashboard')} className="text-gray-500 hover:text-gray-700">
                    ← Voltar
                </button>
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Simulação de Empréstimo</h3>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
                <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Tipo de Empréstimo</label>
                    <select
                        value={simForm.loanTypeId}
                        onChange={e => setSimForm({ ...simForm, loanTypeId: e.target.value })}
                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    >
                        <option value="">Selecione...</option>
                        {loanTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name} - {type.interest_rate_monthly}% a.m.</option>
                        ))}
                    </select>

                    {simForm.loanTypeId && (() => {
                        const selectedType = loanTypes.find(t => t.id === simForm.loanTypeId);
                        if (!selectedType) return null;
                        return (
                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 text-sm space-y-2">
                                <p><span className="font-bold text-gray-700 dark:text-gray-300">Descrição:</span> {selectedType.description}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <p><span className="font-bold text-gray-700 dark:text-gray-300">Taxa:</span> {selectedType.interest_rate_monthly}% a.m.</p>
                                    <p><span className="font-bold text-gray-700 dark:text-gray-300">Máx. Parcelas:</span> {selectedType.max_installments}x</p>
                                    <p><span className="font-bold text-gray-700 dark:text-gray-300">Limite da Modalidade:</span> {formatCurrency(selectedType.max_amount)}</p>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Valor Desejado (R$)</label>
                    <input
                        type="text"
                        value={simForm.amount}
                        onChange={e => {
                            let value = e.target.value.replace(/\D/g, "");
                            if (!value) {
                                setSimForm({ ...simForm, amount: "" });
                                return;
                            }
                            const amount = Number(value) / 100;
                            const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            setSimForm({ ...simForm, amount: formatted });
                        }}
                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                        placeholder="0,00"
                    />
                </div>

                <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">Número de Parcelas</label>
                    <input
                        type="number"
                        min="1"
                        max={loanTypes.find(t => t.id === simForm.loanTypeId)?.max_installments || 12}
                        value={simForm.installments}
                        onChange={e => setSimForm({ ...simForm, installments: parseInt(e.target.value) || 1 })}
                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                </div>

                <Button fullWidth onClick={handleSimulate} disabled={simulating}>
                    {simulating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                    Simular
                </Button>
            </div>

            {simulation && (
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-2xl border border-green-200 dark:border-green-700 space-y-4">
                    <h4 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" /> Resultado da Simulação
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-green-700 dark:text-green-400">Valor por Parcela</p>
                            <p className="text-xl font-black text-green-900 dark:text-green-200">{formatCurrency(simulation.amount_per_installment)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-green-700 dark:text-green-400">Total com Juros</p>
                            <p className="text-xl font-black text-green-900 dark:text-green-200">{formatCurrency(simulation.total_amount)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-green-700 dark:text-green-400">Juros Totais</p>
                            <p className="text-sm font-bold text-green-800 dark:text-green-300">{formatCurrency(simulation.total_interest)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-green-700 dark:text-green-400">Primeira Parcela</p>
                            <p className="text-sm font-bold text-green-800 dark:text-green-300">{new Date(simulation.first_due_date).toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-green-300 dark:border-green-600">
                        <p className="text-xs text-green-700 dark:text-green-400 mb-3">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            As parcelas serão descontadas automaticamente do seu repasse semanal.
                        </p>
                        <Button fullWidth onClick={handleRequestLoan} disabled={requesting}>
                            {requesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            Solicitar Empréstimo
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderMyLoans = () => (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
                <button onClick={() => { updateView('dashboard'); setSelectedLoan(null); }} className="text-gray-500 hover:text-gray-700">
                    ← Voltar
                </button>
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Meus Empréstimos</h3>
            </div>

            {selectedLoan ? (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white">{selectedLoan.loan_type?.name}</h4>
                                <p className="text-sm text-gray-500">Solicitado em {new Date(selectedLoan.created_at).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedLoan.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                selectedLoan.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                                    selectedLoan.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                        'bg-gray-100 text-gray-700'
                                }`}>
                                {selectedLoan.status}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500">Valor Solicitado</p>
                                <p className="text-lg font-bold">{formatCurrency(selectedLoan.amount_requested)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Total a Pagar</p>
                                <p className="text-lg font-bold">{formatCurrency(selectedLoan.amount_total)}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h5 className="font-bold text-gray-800 dark:text-white mb-3">Parcelas</h5>
                        <div className="space-y-2">
                            {installments.map(inst => (
                                <div key={inst.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-white">Parcela {inst.installment_number}/{selectedLoan.installments_count}</p>
                                        <p className="text-xs text-gray-500">Vencimento: {new Date(inst.due_date).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{formatCurrency(inst.amount)}</p>
                                        <span className={`text-xs px-2 py-1 rounded-full ${inst.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                            inst.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {inst.status === 'PAID' ? 'Pago' : inst.status === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    {myLoans.length === 0 && (
                        <p className="text-center text-gray-500 py-8">Nenhum empréstimo encontrado.</p>
                    )}
                    {myLoans.map(loan => (
                        <div
                            key={loan.id}
                            onClick={() => handleViewLoanDetails(loan)}
                            className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-500 transition-colors cursor-pointer"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h5 className="font-bold text-gray-800 dark:text-white">{loan.loan_type?.name || 'Empréstimo'}</h5>
                                    <p className="text-sm text-gray-500">{formatCurrency(loan.amount_requested)} em {loan.installments_count}x</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${loan.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                    loan.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                                        loan.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-700'
                                    }`}>
                                    {loan.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="space-y-6 pb-24">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {activeView === 'dashboard' && renderDashboard()}
            {activeView === 'simulate' && renderSimulate()}
            {activeView === 'myloans' && renderMyLoans()}
        </div>
    );
};
export default LoansModule;
