import React, { useState, useEffect } from 'react';
import { Calculator, ChevronRight, AlertTriangle, Clock, CheckCircle, XCircle, TrendingUp, Calendar, DollarSign, FileText, Loader2, Landmark } from 'lucide-react';
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
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [activeView, setActiveView] = useState<'dashboard' | 'simulate' | 'myloans'>('dashboard');

    // Modals State
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [loanToCancel, setLoanToCancel] = useState<string | null>(null);

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
    const [userLimit, setUserLimit] = useState<{ max_limit: number; max_installments: number; allow_negative_balance: boolean } | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null); // 'store_partner', 'delivery_partner', etc.
    const [userBalance, setUserBalance] = useState<number>(0);
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
    const [hasBankDetails, setHasBankDetails] = useState<boolean>(false); // Novo estado

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [types, limit, loans, role, balance, user] = await Promise.all([
                cloud.getLoanTypes(),
                cloud.getUserLoanLimit(),
                cloud.getUserLoans(),
                cloud.getUserRole(),
                cloud.getUserWalletBalance(),
                cloud.getClient()?.auth.getUser()
            ]);

            setLoanTypes(types);
            setUserLimit(limit);
            setMyLoans(loans);
            setUserRole(role || null);
            setUserBalance(balance);

            if (user?.data?.user?.id) {
                const { data: profile } = await cloud.getClient()
                    ?.from('user_profiles')
                    .select('bank_details')
                    .eq('id', user.data.user.id)
                    .single();

                // Verifica se existe algum detalhe bancário configurado
                if (profile?.bank_details && Object.keys(profile.bank_details).length > 0) {
                    setHasBankDetails(true);
                } else {
                    setHasBankDetails(false);
                }
            }

        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro ao carregar dados' });
        } finally {
            setLoading(false);
        }
    };

    // Computed Values
    const usedLimit = myLoans
        .filter(l => ['ACTIVE', 'PENDING'].includes(l.status))
        .reduce((sum, l) => sum + (l.amount_requested || 0), 0);

    const availableLimit = userLimit ? Math.max(0, userLimit.max_limit - usedLimit) : 0;

    const handleSimulate = async () => {
        if (!simForm.loanTypeId || !simForm.amount || simForm.installments < 1) {
            return setToast({ type: 'error', message: 'Preencha todos os campos' });
        }

        const amount = parseFloat(simForm.amount.replace(/\./g, '').replace(',', '.')); // Fix parse

        if (amount > availableLimit) {
            return setToast({ type: 'error', message: `Valor acima do seu limite disponível (${formatCurrency(availableLimit)})` });
        }

        setSimulating(true);
        try {
            const res = await cloud.simulateLoan(amount, simForm.loanTypeId, simForm.installments);
            setSimulation(res);
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro ao simular' });
        } finally {
            setSimulating(false);
        }
    };

    const handlePayInstallment = async (installment: LoanInstallment) => {
        try {
            // Get shop handle or use default
            const settings = await cloud.getShopSettings();
            const handle = settings?.infinitepay_handle || 'general';

            const res = await cloud.createInfinitePayCheckout(
                installment.id,
                installment.amount,
                handle,
                [{ name: `Parcela Empréstimo #${installment.loan_id.substring(0, 8)}`, price: installment.amount, quantity: 1 }],
                window.location.href,
                `${window.location.origin}/api/infinitepay-webhook`
            );

            if (res.url) {
                window.location.href = res.url;
            } else {
                setToast({ type: 'error', message: 'Erro ao gerar link de pagamento' });
            }
        } catch (e: any) {
            // Tratamento amigável para erro da função edge
            if (e.message && e.message.includes('FunctionsFetchError')) {
                setToast({ type: 'error', message: 'Erro de conexão com serviço de pagamento. Tente novamente mais tarde.' });
            } else {
                setToast({ type: 'error', message: e.message || 'Erro ao processar pagamento' });
            }
        }
    };

    const handleRequestLoan = async () => {
        if (!simulation) return;

        if (!hasBankDetails && userRole !== 'admin') {
            setToast({ type: 'error', message: 'Você precisa configurar seus dados bancários no perfil antes de solicitar um empréstimo.' });
            return;
        }

        setRequestModalOpen(true);
    };

    const [disbursementMethod, setDisbursementMethod] = useState<'WALLET' | 'BANK_ACCOUNT'>('WALLET');

    const confirmRequestLoan = async () => {
        if (!simulation) {
            setRequestModalOpen(false);
            return;
        }

        setRequestModalOpen(false);
        setRequesting(true);
        try {
            await cloud.requestLoan(simulation.amount, simForm.loanTypeId, simForm.installments, disbursementMethod);
            setToast({ type: 'success', message: 'Empréstimo solicitado com sucesso!' });
            setSimulation(null);
            setSimForm({ loanTypeId: '', amount: '', installments: 1 });
            setDisbursementMethod('WALLET'); // Reset to default

            // Recarregar dados para atualizar limite
            await loadData();

            updateView('myloans');
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

    const handleCancelLoan = (loanId: string) => {
        setLoanToCancel(loanId);
        setCancelModalOpen(true);
    };

    const confirmCancelLoan = async () => {
        if (!loanToCancel) return;

        setCancelModalOpen(false);
        setLoading(true);
        try {
            await cloud.cancelLoan(loanToCancel);
            setToast({ type: 'success', message: 'Solicitação cancelada com sucesso.' });
            setSelectedLoan(null);
            setLoanToCancel(null);
            await loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || 'Erro ao cancelar' });
        } finally {
            setLoading(false);
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
                        <p className="text-2xl font-black">{formatCurrency(availableLimit)}</p>
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
                                    <p><span className="font-bold text-gray-700 dark:text-gray-300">Seu Limite:</span> {formatCurrency(availableLimit)}</p>
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

                            // Validar contra o limite disponível calculado
                            if (amount > availableLimit) {
                                setToast({ type: 'error', message: `Valor não pode ser maior que seu limite disponível de ${formatCurrency(availableLimit)}` });
                                return;
                            }

                            const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            setSimForm({ ...simForm, amount: formatted });
                        }}
                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                        placeholder="0,00"
                    />
                    {userLimit && (
                        <p className="text-xs text-gray-500 mt-1">
                            Limite disponível: {formatCurrency(availableLimit)}
                        </p>
                    )}
                </div>

                <div>
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 block">Número de Parcelas</label>
                    {(() => {
                        const selectedType = loanTypes.find(t => t.id === simForm.loanTypeId);
                        const typeMax = selectedType?.max_installments || 12;
                        const userMax = userLimit?.max_installments || 12;
                        const finalMax = Math.min(typeMax, userMax);

                        return (
                            <div className="space-y-3">
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                    {Array.from({ length: finalMax }, (_, i) => i + 1).map(n => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setSimForm({ ...simForm, installments: n })}
                                            className={`py-3 rounded-xl text-sm font-bold transition-all border-2 ${simForm.installments === n
                                                ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/20'
                                                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-brand-200'
                                                }`}
                                        >
                                            {n}x
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center italic">
                                    * Máximo permitido para seu nível: {finalMax}x
                                </p>
                            </div>
                        );
                    })()}
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
                    {/* UI de Seleção de Destino */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <h5 className="font-bold text-gray-800 dark:text-white mb-3">Onde deseja receber o valor?</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => setDisbursementMethod('WALLET')}
                                className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${disbursementMethod === 'WALLET'
                                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/10'
                                    : 'border-gray-100 dark:border-gray-700 hover:border-brand-200'
                                    }`}
                            >
                                <div className={`p-2 rounded-full ${disbursementMethod === 'WALLET' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                    <DollarSign className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold ${disbursementMethod === 'WALLET' ? 'text-brand-900 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300'}`}>Carteira Digital</p>
                                    <p className="text-xs text-gray-500">Saldo na plataforma</p>
                                </div>
                            </button>

                            <button
                                onClick={() => setDisbursementMethod('BANK_ACCOUNT')}
                                disabled={!hasBankDetails}
                                className={`p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${disbursementMethod === 'BANK_ACCOUNT'
                                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/10'
                                    : 'border-gray-100 dark:border-gray-700 hover:border-brand-200'
                                    } ${!hasBankDetails ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div className={`p-2 rounded-full ${disbursementMethod === 'BANK_ACCOUNT' ? 'bg-brand-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                    <Landmark className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold ${disbursementMethod === 'BANK_ACCOUNT' ? 'text-brand-900 dark:text-brand-300' : 'text-gray-700 dark:text-gray-300'}`}>Conta Bancária</p>
                                    <p className="text-xs text-gray-500">{hasBankDetails ? 'Depósito via Pix/TED' : 'Dados não cadastrados'}</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* DISCLAIMER DE PRAZO DE ENVIO */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-bold">
                            O valor será enviado em 2 a 5 dias úteis.
                        </p>
                    </div>

                    {!hasBankDetails && userRole !== 'admin' && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <p className="text-xs text-red-700 dark:text-red-300 font-bold">
                                Você precisa adicionar seus dados bancários no perfil para solicitar.
                            </p>
                        </div>
                    )}

                    <div className="pt-4 border-t border-green-300 dark:border-green-600">
                        <p className="text-xs text-green-700 dark:text-green-400 mb-3">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            {userRole === 'store_partner'
                                ? 'As parcelas deverão ser pagas mensalmente via boleto ou PIX.'
                                : 'As parcelas serão descontadas automaticamente do seu repasse semanal.'
                            }
                        </p>
                        <Button fullWidth onClick={handleRequestLoan} disabled={requesting || (!hasBankDetails && userRole !== 'admin' && disbursementMethod === 'BANK_ACCOUNT')}>
                            {requesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                            Solicitar Empréstimo
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );

    const translateStatus = (status: string) => {
        const map: Record<string, string> = {
            'PENDING': 'Pendente',
            'ACTIVE': 'Ativo',
            'PAID': 'Pago',
            'REJECTED': 'Rejeitado',
            'CANCELLED': 'Cancelado',
            'OVERDUE': 'Atrasado'
        };
        return map[status] || status;
    };

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
                                        selectedLoan.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                }`}>
                                {translateStatus(selectedLoan.status)}
                            </span>
                        </div>

                        {selectedLoan.status === 'REJECTED' && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl mb-4">
                                <p className="text-sm font-bold text-red-800 dark:text-red-300">Empréstimo Rejeitado</p>
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                    {selectedLoan.rejection_reason || 'Motivo não informado pela análise de crédito.'}
                                </p>
                            </div>
                        )}

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

                    {selectedLoan.status === 'PENDING' && (
                        <Button
                            variant="outline"
                            fullWidth
                            className="mt-4 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                            onClick={() => handleCancelLoan(selectedLoan.id)}
                        >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancelar Solicitação
                        </Button>
                    )}

                    {selectedLoan.status !== 'REJECTED' && selectedLoan.status !== 'CANCELLED' && (
                        <div>
                            <h5 className="font-bold text-gray-800 dark:text-white mb-3">Parcelas</h5>
                            <div className="space-y-2">
                                {installments.map(inst => (
                                    <div key={inst.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-white">Parcela {inst.installment_number}/{selectedLoan.installments_count}</p>
                                            <p className="text-xs text-gray-500">Vencimento: {new Date(inst.due_date).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <p className="font-bold">{formatCurrency(inst.amount)}</p>
                                            <span className={`text-xs px-2 py-1 rounded-full ${inst.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                inst.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {inst.status === 'PAID' ? 'Pago' : inst.status === 'OVERDUE' ? 'Atrasado' : 'Pendente'}
                                            </span>
                                            {(() => {
                                                const isStore = userRole === 'store_partner';
                                                const isDelivery = userRole === 'delivery_partner' || userRole === 'delivery_person';
                                                const canPay = (isStore || (isDelivery && userBalance < inst.amount)) &&
                                                    selectedLoan.status === 'ACTIVE' &&
                                                    inst.status !== 'PAID';

                                                if (canPay) {
                                                    return (
                                                        <button
                                                            onClick={() => handlePayInstallment(inst)}
                                                            className="mt-1 text-[10px] bg-brand-600 text-white px-2 py-1 rounded-lg hover:bg-brand-700 transition-colors font-bold shadow-sm"
                                                        >
                                                            Pagar com InfinitePay
                                                        </button>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
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
                                            loan.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                    }`}>
                                    {translateStatus(loan.status)}
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

            {/* Modal de Confirmação de Solicitação */}
            {requestModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]" onClick={() => setRequestModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 text-brand-600 rounded-full flex items-center justify-center mb-4">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-2">Confirmar Solicitação</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Deseja solicitar o empréstimo de <span className="font-bold text-gray-800 dark:text-white">{simForm.amount}</span> em <span className="font-bold text-gray-800 dark:text-white">{simForm.installments}x</span>?
                                <br /><br />
                                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold block">
                                    Previsão de envio: 2 a 5 dias úteis.
                                </span>
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setRequestModalOpen(false)}
                                fullWidth
                                disabled={requesting}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={confirmRequestLoan}
                                fullWidth
                                disabled={requesting}
                            >
                                {requesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Cancelamento */}
            {cancelModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]" onClick={() => setCancelModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-2">Cancelar Solicitação?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Tem certeza que deseja cancelar esta solicitação de empréstimo?
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setCancelModalOpen(false)}
                                fullWidth
                                disabled={loading}
                            >
                                Não, Manter
                            </Button>
                            <Button
                                onClick={confirmCancelLoan}
                                fullWidth
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                                Sim, Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default LoansModule;
