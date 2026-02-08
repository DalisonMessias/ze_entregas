
import React, { useState, useEffect } from 'react';
import { Share2, Users, Gift, Copy, ArrowRight, Loader2, Award, Zap, History, Ticket, TrendingUp, TrendingDown, Truck, X } from 'lucide-react';
import * as cloud from '../services/cloud';
import { ReferralDashboardData, UserRole } from '../types';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';

interface ReferralProgramProps {
    userRole: UserRole;
    onClose: () => void;
}


export const ReferralProgram: React.FC<ReferralProgramProps> = ({ userRole, onClose }) => {
    const [data, setData] = useState<ReferralDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [redeemingId, setRedeemingId] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);

    const { alert, confirm } = useDialog();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setHasError(false);
        try {
            const dashboardData = await cloud.getReferralDashboardData();
            if (dashboardData) {
                setData(dashboardData);
            } else {
                setHasError(true);
            }
        } catch (e) {
            console.error(e);
            setHasError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = async () => {
        if (data?.my_code) {
            navigator.clipboard.writeText(data.my_code);
            await alert({ title: "Copiado", message: "Código copiado com sucesso!" });
        }
    };

    const handleShare = () => {
        if (!data?.my_code) return;
        let msg = `Use meu código *${data.my_code}* no Zé Entregas e ganhe benefícios exclusivos! 🚀`;
        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const handleRedeem = async (rewardId: string, cost: number, title: string) => {
        if (!data) return;
        if (data.balance < cost) {
            await alert({ title: "Saldo Insuficiente", message: "Você precisa de mais pontos." });
            return;
        }
        const confirmed = await confirm({
            title: "Confirmar Resgate",
            message: `Trocar ${cost} pontos por "${title}"?`,
            confirmButtonText: "Resgatar agora",
            cancelButtonText: "Depois"
        });
        if (!confirmed) return;

        setRedeemingId(rewardId);
        try {
            const res = await cloud.redeemReferralPoints(rewardId);
            if (res.success) {
                await alert({
                    title: "Sucesso!",
                    message: `Código: ${res.coupon_code}. Salvo em "Meus Prêmios".`
                });
                loadData();
            } else {
                await alert({ title: "Erro", message: res.error || "Erro ao resgatar." });
            }
        } catch (e: any) {
            await alert({ title: "Erro", message: "Erro: " + e.message });
        } finally {
            setRedeemingId(null);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };

    if (loading && !data) return (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-900 z-50 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
            <p className="mt-4 text-gray-500 font-medium">Sincronizando pontos...</p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-gray-50 dark:bg-gray-950 z-50 flex flex-col overflow-y-auto custom-scrollbar animate-in fade-in duration-300">

            {/* Minimalist Professional Header */}
            <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-xl">
                        <Gift className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 dark:text-white leading-tight">Indique e Ganhe</h1>
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Programa de Afiliados Zé</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                </button>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 space-y-8">

                {/* Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Primary Status Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between overflow-hidden relative group">
                        <div className="absolute -right-4 -top-4 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl group-hover:bg-brand-500/10 transition-colors"></div>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Meus Pontos</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-7xl font-black tracking-tighter text-gray-900 dark:text-white">
                                    {data?.balance || 0}
                                </span>
                                <span className="text-xl font-bold text-brand-500">pts</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-50 dark:border-gray-800 flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                                <Award className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-900 dark:text-gray-100">Status Bronze</p>
                                <p className="text-xs text-gray-400 font-medium">Faltam 500 pts para o Prata</p>
                            </div>
                        </div>
                    </div>

                    {/* Share & Code Card */}
                    <div className="bg-gray-900 dark:bg-white rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                            <Share2 className="w-48 h-48 text-white dark:text-gray-900" />
                        </div>

                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 mb-2 block">Seu Código Único</span>
                            <div className="flex items-center gap-4 cursor-pointer" onClick={handleCopyCode}>
                                <span className="text-3xl font-mono font-black text-white dark:text-gray-900 tracking-wider">
                                    {data?.my_code || '---'}
                                </span>
                                <Copy className="w-5 h-5 text-brand-500" />
                            </div>
                        </div>

                        <button
                            onClick={handleShare}
                            className="mt-8 w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-brand-600/20"
                        >
                            <Share2 className="w-5 h-5" />
                            CONVIDAR AMIGOS
                        </button>
                    </div>
                </div>

                {/* Section: Rewards (Grid) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-lg font-black text-gray-900 dark:text-white">Resgatar Prêmios</h2>
                        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] font-black text-gray-500 uppercase">Disponíveis</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data?.rewards?.map(reward => (
                            <div key={reward.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all flex flex-col justify-between group">
                                <div>
                                    <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/30 transition-colors">
                                        {reward.reward_type === 'FREE_SHIPPING' ?
                                            <Truck className="w-6 h-6 text-gray-400 group-hover:text-brand-600" /> :
                                            <Ticket className="w-6 h-6 text-gray-400 group-hover:text-brand-600" />
                                        }
                                    </div>
                                    <h3 className="font-black text-gray-900 dark:text-white mb-1">{reward.title}</h3>
                                    <p className="text-xs text-gray-400 font-medium mb-4 line-clamp-2">{reward.description}</p>
                                </div>

                                <button
                                    onClick={() => handleRedeem(reward.id, reward.cost_points, reward.title)}
                                    disabled={redeemingId === reward.id || (data.balance < reward.cost_points)}
                                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-brand-600 hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-gray-50 group/btn"
                                >
                                    <span className="text-[10px] font-black uppercase tracking-wider">{redeemingId === reward.id ? 'Processando...' : 'Resgatar'}</span>
                                    <span className="font-black text-xs text-brand-600 group-hover/btn:text-white">{reward.cost_points} pts</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section: Active Claims (Horizontal Scroll / List) */}
                {data?.active_claims && data.active_claims.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white">Meus Cupons</h2>
                            <span className="text-[10px] font-black text-brand-500 uppercase">{data.active_claims.length} Ativos</span>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                            {data.active_claims.map(claim => (
                                <div key={claim.id} className="min-w-[280px] snap-start bg-gray-900 dark:bg-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden">
                                    <div className="absolute right-0 top-0 w-24 h-24 bg-brand-500/10 rounded-full blur-2xl"></div>
                                    <div className="flex flex-col gap-4 relative z-10">
                                        <div className="flex justify-between items-start">
                                            <Ticket className="w-8 h-8 text-brand-500" />
                                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Cupom Ativo</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] font-bold text-gray-400 block mb-1 uppercase">Toque para copiar</span>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(claim.coupon_code);
                                                    alert({ title: "Copiado", message: "Use no checkout!" });
                                                }}
                                                className="text-xl font-mono font-black text-white dark:text-gray-900 hover:text-brand-500 transition-colors"
                                            >
                                                {claim.coupon_code}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section: History (Table Style) */}
                <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6">Histórico de Pontos</h2>
                    <div className="space-y-4">
                        {data?.history?.map((item, idx) => {
                            const isCredit = item.operation_type.includes('CREDIT');
                            return (
                                <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors px-2 rounded-xl">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${isCredit ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'text-red-500 bg-red-50 dark:bg-red-900/10'}`}>
                                            {isCredit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-800 dark:text-gray-200">{item.description}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase">{formatDate(item.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className={`font-black ${isCredit ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {isCredit ? '+' : '-'}{item.amount}
                                    </div>
                                </div>
                            );
                        })}
                        {(!data?.history || data.history.length === 0) && (
                            <div className="text-center py-10">
                                <History className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-400 text-sm font-medium">Nenhuma movimentação ainda.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
