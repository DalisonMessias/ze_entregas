import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Info, Heart, Clock, DollarSign, Loader2, Link2, Building2, MapPin, Send, X, AlertCircle, CreditCard, Wallet, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { InsurancePlan, InsurancePartner, InsuranceSubscription } from '../types';
import { useDialog } from '../utils/dialogService';

export const InsurancePage: React.FC = () => {
    const [plans, setPlans] = useState<InsurancePlan[]>([]);
    const [partners, setPartners] = useState<InsurancePartner[]>([]);
    const [subscriptions, setSubscriptions] = useState<InsuranceSubscription[]>([]);
    const [loading, setLoading] = useState(true);

    const [showReferralModal, setShowReferralModal] = useState(false);
    const [referralForm, setReferralForm] = useState({ city: '', company: '' });

    const [pendingPlan, setPendingPlan] = useState<InsurancePlan | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const { alert, confirm } = useDialog();

    const activeSub = subscriptions.find(s => s.status === 'ACTIVE');

    const loadData = async () => {
        setLoading(true);
        try {
            const [plansData, partnersData, subsData] = await Promise.all([
                cloud.getInsurancePlans(),
                cloud.getInsurancePartners(),
                cloud.getUserInsuranceSubscriptions()
            ]);
            setPlans(plansData.filter(p => p.is_active));
            setPartners(partnersData.filter(p => p.is_active));
            setSubscriptions(subsData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleHirePlan = async (method: 'WALLET' | 'CARD') => {
        if (!pendingPlan) return;
        setSubmitting(true);
        try {
            await cloud.createInsuranceSubscription(pendingPlan.id, method);
            await alert({ title: 'Contratação Concluída!', message: `Sua proteção "${pendingPlan.title}" foi ativada com sucesso. O valor será debitado conforme o método selecionado.` });
            setPendingPlan(null);
            loadData();
        } catch (e) {
            await alert({ title: 'Erro', message: 'Falha ao processar contratação. Tente novamente.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelPlan = async (id: string) => {
        const ok = await confirm({ title: 'Cancelar Proteção', message: 'Tem certeza que deseja cancelar seu seguro? Você perderá cobertura imediatamente nas próximas renovações.' });
        if (!ok) return;

        try {
            await cloud.cancelInsuranceSubscription(id);
            await alert({ title: 'Plano Cancelado', message: 'Sua assinatura foi desativada e não haverá novas cobranças.' });
            loadData();
        } catch (e) {
            await alert({ title: 'Erro', message: 'Não foi possível cancelar agora.' });
        }
    };

    const handleReferralSubmit = async () => {
        if (!referralForm.city || !referralForm.company) return;
        setSubmitting(true);
        try {
            await cloud.submitInsuranceReferral(referralForm.city, referralForm.company);
            await alert({ title: 'Solicitação Enviada', message: 'Obrigado pela indicação! Nossa equipe irá analisar essa seguradora para sua região.' });
            setShowReferralModal(false);
            setReferralForm({ city: '', company: '' });
        } catch (e) {
            await alert({ title: 'Erro', message: 'Falha ao enviar solicitação.' });
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>;

    return (
        <div className="max-w-5xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Section */}
            <header className="bg-gradient-to-r from-brand-600 to-brand-800 rounded-[40px] p-8 md:p-12 text-white mb-10 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse"></div>
                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-sm font-bold mb-6 border border-white/20">
                        <Shield className="w-4 h-4" />
                        Proteção Real para Parceiros
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                        Trabalhe com a tranquilidade que você merece.
                    </h1>
                    <p className="text-lg text-brand-50 mb-8 leading-relaxed">
                        Seguros exclusivos para entregadores Zé Entregas em parceria com empresas renomadas. Cobertura completa durante e fora das entregas.
                    </p>
                </div>
            </header>

            {/* My Active Subscription */}
            {activeSub && (
                <div className="mb-12 bg-white dark:bg-gray-800 rounded-[32px] p-8 border-2 border-brand-500 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                        <Shield className="w-32 h-32 text-brand-600" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block">Sua Proteção Ativa</span>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white">{activeSub.plan?.title}</h2>
                                <p className="text-gray-500 flex items-center gap-2 mt-1">
                                    <Clock className="w-4 h-4" /> Renovação em {new Date(activeSub.next_billing_date!).toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                            <Button variant="danger" onClick={() => handleCancelPlan(activeSub.id)} className="h-auto py-2 text-xs">Solicitar Cancelamento</Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {activeSub.plan?.features.slice(0, 4).map((f, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
                                    <CheckCircle className="w-4 h-4 text-brand-500" /> {f}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 px-4 md:px-0">
                {plans.map((plan) => {
                    const isMyPlan = activeSub?.plan_id === plan.id;
                    return (
                        <div key={plan.id} className={`relative bg-white dark:bg-gray-800 rounded-[32px] p-8 border ${plan.is_popular ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-gray-100 dark:border-gray-700'} shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col h-full`}>
                            {plan.is_popular && !isMyPlan && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg uppercase tracking-wider whitespace-nowrap">
                                    Mais Popular
                                </div>
                            )}
                            {isMyPlan && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg uppercase tracking-wider whitespace-nowrap">
                                    Plano Atual
                                </div>
                            )}
                            <h3 className="text-xl font-black mb-1">{plan.title}</h3>
                            <div className="mb-4">
                                <span className="text-3xl font-black text-brand-600">{formatCurrency(plan.price_mensal)}</span>
                                <span className="text-gray-400 font-bold">/mês</span>
                            </div>

                            {plan.deductible_percent !== undefined && (
                                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-brand-600 uppercase mb-1">
                                        <Info className="w-3 h-3" /> Detalhes da Franquia
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-300 font-bold">
                                        {plan.deductible_percent}% da Tabela FIPE do veículo
                                    </p>
                                    {plan.deductible_info && (
                                        <p className="text-[10px] text-gray-400 mt-1 leading-tight">{plan.deductible_info}</p>
                                    )}
                                </div>
                            )}

                            <ul className="space-y-4 mb-8 flex-1">
                                {plan.features.map((f, j) => (
                                    <li key={j} className="flex items-start gap-3 text-sm font-medium text-gray-600 dark:text-gray-300">
                                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Button
                                fullWidth
                                disabled={!!activeSub}
                                onClick={() => setPendingPlan(plan)}
                                className={plan.is_popular ? 'bg-brand-600 text-white shadow-lg' : 'bg-gray-100 dark:bg-gray-700 !text-gray-700 dark:!text-gray-200 hover:bg-gray-200'}
                            >
                                {isMyPlan ? 'Plano Ativo' : activeSub ? 'Plano Disponível' : 'Contratar Agora'}
                            </Button>
                        </div>
                    );
                })}
            </div>

            {/* Why Insurance Section */}
            <section className="bg-gray-50 dark:bg-gray-900/50 rounded-[40px] p-10 border border-gray-100 dark:border-gray-800 mb-16 mx-4 md:mx-0">
                <h2 className="text-3xl font-black mb-10 text-center">Por que ter um seguro parceiro?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { icon: <Clock className="w-8 h-8 text-blue-500" />, title: "Ativação Instantânea", desc: "Contratou, está protegido. Sem carência para acidentes." },
                        { icon: <Heart className="w-8 h-8 text-red-500" />, title: "Cobertura 24h", desc: "Vale para quando você está entregando e também no lazer." },
                        { icon: <DollarSign className="w-8 h-8 text-green-500" />, title: "Repasse Automatizado", desc: "Desconto direto na sua carteira Zé Entregas." },
                        { icon: <Info className="w-8 h-8 text-purple-500" />, title: "Suporte VIP", desc: "Atendimento prioritário em caso de sinistros." }
                    ].map((item, i) => (
                        <div key={i} className="text-center">
                            <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md border border-gray-100 dark:border-gray-700">
                                {item.icon}
                            </div>
                            <h4 className="font-bold mb-2">{item.title}</h4>
                            <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Partners Section */}
            <div className="text-center mx-4 md:mx-0">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Em parceria com</p>
                <div className="flex flex-wrap justify-center items-center gap-10 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 mb-8">
                    {partners.length > 0 ? partners.map(p => (
                        <div key={p.id} className="text-2xl font-black uppercase text-gray-400">{p.name}</div>
                    )) : (
                        <div className="text-sm text-gray-400 italic">Seguradoras de renome nacional</div>
                    )}
                </div>

                <div className="inline-flex flex-col items-center">
                    <p className="text-xs text-gray-500 mb-3">Não encontrou sua seguradora local de confiança?</p>
                    <button
                        onClick={() => setShowReferralModal(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-bold hover:border-brand-500 transition-colors shadow-sm"
                    >
                        <Link2 className="w-3 h-3 text-brand-600" />
                        Solicitar Indicação em minha cidade
                    </button>
                </div>
            </div>

            {/* Checkout Modal */}
            {pendingPlan && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[40px] shadow-2xl p-8 relative overflow-hidden">
                        <header className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black italic">Finalizar Contratação</h3>
                                <p className="text-sm text-gray-500">Você escolheu o {pendingPlan.title}</p>
                            </div>
                            <button onClick={() => setPendingPlan(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6 text-gray-400" /></button>
                        </header>

                        <div className="space-y-6">
                            <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-gray-500 font-bold uppercase text-[10px]">Valor Mensal</span>
                                    <span className="text-3xl font-black text-brand-600">{formatCurrency(pendingPlan.price_mensal)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                    <CheckCircle className="w-4 h-4 text-green-500" /> Cobrança recorrente a cada 30 dias
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-gray-400 uppercase ml-2 text-center block">Confirmar contratação via Carteira</label>

                                <button
                                    onClick={() => handleHirePlan('WALLET')}
                                    disabled={submitting}
                                    className="w-full p-8 bg-brand-50 dark:bg-brand-900/20 border-2 border-brand-200 dark:border-brand-800 rounded-[32px] flex flex-col items-center gap-4 hover:border-brand-500 transition-all group active:scale-95 shadow-sm"
                                >
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl text-brand-600 shadow-md">
                                        <Wallet className="w-8 h-8" />
                                    </div>
                                    <div className="text-center">
                                        <div className="font-black text-xl text-gray-900 dark:text-white">Carteira Zé Entregas</div>
                                        <div className="text-xs text-gray-400 mt-1">Débito automático dos seus ganhos</div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 text-brand-600 font-black text-xs uppercase tracking-widest">
                                        Confirmar Agora <Send className="w-3 h-3 -rotate-45" />
                                    </div>
                                </button>
                            </div>

                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed font-bold">
                                    Ao confirmar, você aceita os termos da apólice e autoriza o débito mensal. A cobertura inicia em até 24h após a confirmação.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Indicação */}
            {showReferralModal && (
                <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[40px] shadow-2xl p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Shield className="w-32 h-32" />
                        </div>
                        <header className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black">Indicar Seguradora</h3>
                                <p className="text-xs text-gray-500 mt-1">Sugira uma empresa para sua região</p>
                            </div>
                            <button onClick={() => setShowReferralModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-6 h-6 text-gray-400" /></button>
                        </header>
                        <div className="space-y-6 relative z-10">
                            <div className="space-y-4">
                                <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase ml-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> Cidade / Estado</label><CustomInput value={referralForm.city} onChange={e => setReferralForm({ ...referralForm, city: (e as any).target.value })} placeholder="Ex: São Paulo - SP" /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase ml-2 flex items-center gap-1"><Building2 className="w-3 h-3" /> Nome da Seguradora / Corretora</label><CustomInput value={referralForm.company} onChange={e => setReferralForm({ ...referralForm, company: (e as any).target.value })} placeholder="Ex: Corretora Local LTDA" /></div>
                            </div>
                            <div className="p-4 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex gap-3"><AlertCircle className="w-5 h-5 text-brand-600 shrink-0" /><p className="text-[10px] text-brand-700 dark:text-brand-300 leading-relaxed font-medium">Iremos analisar o cadastro desta empresa e as avaliações locais. Caso aprovada, ela aparecerá na lista de parceiros da sua cidade em breve.</p></div>
                            <Button fullWidth onClick={handleReferralSubmit} disabled={submitting || !referralForm.city || !referralForm.company} className="py-4 shadow-lg shadow-brand-500/20">{submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Send className="w-5 h-5 mr-2" /> Enviar Sugestão</>}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
