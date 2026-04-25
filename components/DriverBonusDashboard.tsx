
import React, { useState, useEffect } from 'react';
import { Trophy, Target, Truck, Calendar, ArrowRight, Award, TrendingUp, CheckCircle2, AlertCircle, Loader2, Sparkles, Star, ChevronRight, Gift, Zap, Info } from 'lucide-react';
import * as cloud from '../services/cloud';
import { BonusCampaign, BonusDriverProgress, BonusTier } from '../types';
import { Button } from './Button';
import { BaseModal } from './BaseModal';
import { SectionErrorBoundary } from './SectionErrorBoundary';
import { useDialog } from '../utils/dialogService';

export const DriverBonusDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activeProgress, setActiveProgress] = useState<BonusDriverProgress[]>([]);
    const [availableCampaigns, setAvailableCampaigns] = useState<BonusCampaign[]>([]);
    const [selectedOpportunity, setSelectedOpportunity] = useState<BonusCampaign | null>(null);
    const { confirm, alert } = useDialog();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const sb = cloud.getClient();
            if (!sb) return;

            const { data: { user } } = await sb.auth.getUser();
            if (!user) return;

            // 1. Buscar progresso atual do motorista
            const { data: progressData, error: progressError } = await sb
                .from('bonus_driver_progress')
                .select('*, campaign:bonus_campaigns(*)')
                .eq('driver_id', user.id)
                .order('last_updated', { ascending: false });

            if (progressError) throw progressError;
            setActiveProgress(progressData || []);

            // 2. Buscar campanhas ativas que o motorista ainda não começou (opcional)
            const activeCampaignIds = (progressData || []).map(p => p.campaign_id);
            const { data: campaignsData, error: campaignsError } = await sb
                .from('bonus_campaigns')
                .select('*')
                .eq('is_active', true)
                .gt('end_date', new Date().toISOString())
                .not('id', 'in', `(${activeCampaignIds.length > 0 ? activeCampaignIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

            if (campaignsError) throw campaignsError;
            setAvailableCampaigns(campaignsData || []);

        } catch (error) {
            console.error('Erro ao carregar bônus:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateProgress = (current: number, tiers: BonusTier[]) => {
        if (!tiers || tiers.length === 0) return { percent: 0, nextTier: null };
        const sortedTiers = [...tiers].sort((a, b) => a.deliveries - b.deliveries);
        const nextTier = sortedTiers.find(t => t.deliveries > current) || sortedTiers[sortedTiers.length - 1];
        
        let percent = (current / nextTier.deliveries) * 100;
        if (current >= nextTier.deliveries && current >= sortedTiers[sortedTiers.length - 1].deliveries) {
            percent = 100;
        }

        return {
            percent: Math.min(percent, 100),
            nextTier: current >= sortedTiers[sortedTiers.length - 1].deliveries ? null : nextTier,
            isMaxed: current >= sortedTiers[sortedTiers.length - 1].deliveries
        };
    };

    const handleClaim = async (campaignId: string, amount: number) => {
        if (!await confirm({ title: 'Resgatar Recompensa!', message: `Deseja transferir o seu bônus de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} agora para a sua carteira digital?` })) return;
        
        try {
            setLoading(true);
            const sb = cloud.getClient();
            if (!sb) return;
            const { data, error } = await sb.rpc('claim_bonus_campaign_reward', { p_campaign_id: campaignId });
            
            if (error) throw error;
            if (!data.success) {
                await alert({ title: 'Atenção', message: data.message });
            } else {
                await alert({ title: 'Uhu! Transferência Completa!', message: `R$ ${(data.amount_credited || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foram creditados com sucesso na sua carteira. Obrigado pelo empenho nas entregas!` });
                await loadData();
            }
        } catch (error: any) {
             console.error(error);
             await alert({ title: 'Erro de Autenticação', message: 'Houve uma falha ao resgatar seu bônus. Tente novamente ou abra o suporte.' });
        } finally {
             setLoading(false);
        }
    };

    const handleJoinOpportunity = async (campaignId: string) => {
        try {
            setLoading(true);
            setSelectedOpportunity(null);
            const sb = cloud.getClient();
            if (!sb) return;
            const { data: { user } } = await sb.auth.getUser();
            if (!user) return;
            
            const { error } = await sb.from('bonus_driver_progress').insert({
                campaign_id: campaignId,
                driver_id: user.id,
                deliveries_count: 0
            });
            
            if (error && error.code !== '23505') throw error;
            
            await alert({ title: 'Boa sorte!', message: 'Missão iniciada com sucesso. Acompanhe a barrinha de preenchimento após as próximas entregas e resgate seus bônus!' });
            await loadData();
        } catch (error: any) {
            console.error(error);
            await alert({ title: 'Erro de Autenticação', message: 'Houve uma falha ao participar da campanha. A sua filial pode não ter o habilitado.' });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin w-8 h-8 text-brand-600" /></div>;

    return (
        <SectionErrorBoundary componentName="DriverBonusDashboard">
            <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                {/* HEADER */}
                <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-brand-600 to-brand-800 p-8 text-white shadow-2xl shadow-brand-500/30">
                    <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                        <Trophy className="w-64 h-64" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-brand-100">Portal de Conquistas</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black mb-3">Seus Bônus</h1>
                        <p className="text-brand-100/80 font-medium max-w-md">Complete as metas de entregas e ganhe recompensas exclusivas em dinheiro direto na sua carteira.</p>
                    </div>
                </div>

                {/* CAMPANHAS EM ANDAMENTO */}
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 px-2">
                        <TrendingUp className="w-6 h-6 text-brand-500" /> Missões em Andamento
                    </h2>

                    {activeProgress.length === 0 ? (
                        <div className="bg-white dark:bg-gray-900 rounded-[32px] p-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800">
                            <Target className="w-16 h-16 mx-auto mb-4 text-gray-200" />
                            <p className="text-gray-400 font-bold mb-4 text-lg">Você ainda não iniciou nenhuma campanha de bônus.</p>
                            <p className="text-gray-500 text-sm mb-6">Complete sua primeira entrega hoje para começar a pontuar!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {activeProgress.map(progress => {
                                const { percent, nextTier, isMaxed } = calculateProgress(progress.deliveries_count, progress.campaign?.tiers || []);
                                const currentBonus = progress.bonus_earned || 0;
                                const claimedBonus = progress.bonus_claimed || 0;
                                const pendingClaim = currentBonus - claimedBonus;
                                
                                return (
                                    <div key={progress.id} className="group bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500">
                                        <div className="p-8">
                                            <div className="flex justify-between items-start mb-8">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {progress.campaign?.end_date && new Date(progress.campaign.end_date) < new Date() ? (
                                                              <span className="bg-red-100 dark:bg-red-900/30 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">CAMPANHA ENCERRADA</span>
                                                         ) : (
                                                              <span className="bg-brand-100 dark:bg-brand-900/30 text-brand-600 text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">CAMPANHA ATIVA</span>
                                                         )}
                                                        <span className={`${progress.campaign?.end_date && new Date(progress.campaign.end_date) < new Date() ? 'text-red-400' : 'text-gray-400'} text-[10px] font-bold flex items-center gap-1`}><Calendar className="w-3 h-3" />{progress.campaign?.end_date && new Date(progress.campaign.end_date) < new Date() ? 'Encerrada em' : 'Expira em'} {new Date(progress.campaign?.end_date || '').toLocaleDateString()}</span>
                                                    </div>
                                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{progress.campaign?.title}</h3>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Bônus Agregado</div>
                                                    <div className="text-3xl font-black text-brand-600">R$ {currentBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                                    {pendingClaim > 0 && (
                                                        <Button size="sm" onClick={() => handleClaim(progress.campaign_id, pendingClaim)} className="mt-3 w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-black animate-pulse shadow-green-500/30 hover:scale-[1.02] active:scale-95 transition-transform">
                                                            <Gift className="w-4 h-4 mr-2" /> Resgatar R$ {pendingClaim.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* PROGRESS BAR */}
                                            <div className="space-y-4 mb-8">
                                                <div className="flex justify-between items-end">
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-brand-500 p-2 rounded-xl text-white shadow-lg shadow-brand-500/20">
                                                            <Truck className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <span className="text-2xl font-black text-gray-900 dark:text-white">{progress.deliveries_count}</span>
                                                            <span className="text-xs text-gray-400 font-bold ml-1 uppercase">Entregas feitas</span>
                                                        </div>
                                                    </div>
                                                    {nextTier && (
                                                        <div className="text-right">
                                                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-1">Próxima Meta</span>
                                                            <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-600 text-xs font-black px-3 py-1.5 rounded-full">Faltam {nextTier.deliveries - progress.deliveries_count} pedidos</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="relative h-5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden border-4 border-gray-50 dark:border-gray-900 shadow-inner">
                                                    <div 
                                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                                                        style={{ width: `${percent}%` }}
                                                    >
                                                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* TIERS PREVIEW */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {progress.campaign?.tiers?.sort((a, b) => a.deliveries - b.deliveries).map((tier, idx) => {
                                                    const isCompleted = progress.deliveries_count >= tier.deliveries;
                                                    return (
                                                        <div key={idx} className={`p-4 rounded-3xl border transition-all ${
                                                            isCompleted 
                                                            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                                                            : 'bg-gray-50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800'
                                                        }`}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <Award className={`w-5 h-5 ${isCompleted ? 'text-green-600' : 'text-gray-300'}`} />
                                                                {isCompleted ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-200" />}
                                                            </div>
                                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{tier.deliveries} Pedidos</div>
                                                            <div className={`text-lg font-black ${isCompleted ? 'text-green-700' : 'text-gray-700 dark:text-gray-300'}`}>+ R$ {tier.reward}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-800/30 p-4 px-8 flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                                <Zap className="w-4 h-4 text-yellow-500" /> 
                                                Duração: {new Date(progress.campaign?.start_date || '').toLocaleDateString()} até {new Date(progress.campaign?.end_date || '').toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-black text-brand-600 uppercase tracking-widest animate-pulse">
                                                Atualizado em Tempo Real
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* CAMPANHAS DISPONÍVEIS */}
                {availableCampaigns.length > 0 && (
                    <div className="space-y-6 pt-4">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 px-2">
                            <Star className="w-6 h-6 text-yellow-500" /> Novas Oportunidades
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availableCampaigns.map(campaign => (
                                <div key={campaign.id} className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-lg relative overflow-hidden group">
                                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                                        <Award className="w-24 h-24" />
                                    </div>
                                    <div className="relative z-10">
                                        <span className="text-[10px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-md mb-3 inline-block">LANÇADA AGORA</span>
                                        <h3 className="text-xl font-black mb-2 text-gray-900 dark:text-white">{campaign.title}</h3>
                                        <p className="text-xs text-gray-500 font-medium mb-4 line-clamp-2">{campaign.description || 'Atinga as metas de entrega para ganhar bônus extras.'}</p>
                                        
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
                                            <div className="flex -space-x-2">
                                                {campaign.tiers.slice(0, 3).map((t, idx) => (
                                                    <div key={idx} className="w-8 h-8 rounded-full bg-brand-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[8px] font-bold text-white shadow-md">
                                                        R${t.reward}
                                                    </div>
                                                ))}
                                            </div>
                                            <button onClick={() => setSelectedOpportunity(campaign)} className="text-brand-600 text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:text-brand-800 group-hover:translate-x-1 transition-transform">
                                                Ver Detalhes <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* INFO FOOTER */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[32px] border border-blue-100 dark:border-blue-900/20 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-white dark:bg-blue-900/30 shadow-sm flex items-center justify-center shrink-0">
                        <Info className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-black text-blue-900 dark:text-blue-300 text-sm mb-1 uppercase tracking-tight">Como funciona o pagamento?</h4>
                        <p className="text-blue-700/70 dark:text-blue-400/70 text-xs leading-relaxed font-medium">
                            Os bônus são cumulativos e calculados instantaneamente. Assim que você alcança uma meta, o valor correspondente é provisionado. 
                            O crédito final em sua carteira ocorre conforme os termos de cada campanha definidos pelo administrador.
                        </p>
                    </div>
                </div>
                {/* DETALHES DA CAMPANHA (MODAL) */}
                <BaseModal isOpen={!!selectedOpportunity} onClose={() => setSelectedOpportunity(null)} title="Destravar Missão Especial" maxWidth="md">
                    {selectedOpportunity && (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-600 dark:to-brand-800 p-6 rounded-[32px] text-center shadow-inner">
                                <Target className="w-16 h-16 mx-auto mb-4 text-brand-600 dark:text-brand-200 animate-pulse" />
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{selectedOpportunity.title}</h3>
                                <p className="text-gray-600 dark:text-brand-100 font-medium text-sm leading-relaxed">{selectedOpportunity.description || 'Acumule a quantidade necessária de entregas dentro do período da campanha para bater metas e resgatar bônus generosos direto na sua carteira digital.'}</p>
                            </div>
                            
                            <h4 className="font-black text-sm text-gray-400 uppercase tracking-widest">Recompensas Por Patamar</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {selectedOpportunity.tiers.sort((a, b) => a.deliveries - b.deliveries).map((tier, i) => (
                                    <div key={i} className="bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 py-3 rounded-2xl flex flex-col items-center justify-center hover:border-brand-500 transition-colors cursor-default">
                                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">{tier.deliveries} ETAPAS</span>
                                        <span className="text-xl font-black text-green-600">+ R$ {tier.reward}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex gap-4 mt-6">
                                <Button variant="outline" className="flex-1 font-bold border-2 rounded-2xl" onClick={() => setSelectedOpportunity(null)}>Voltar</Button>
                                <Button className="flex-[2] bg-brand-500 hover:bg-brand-600 text-white shadow-xl shadow-brand-500/20 font-black rounded-2xl" onClick={() => handleJoinOpportunity(selectedOpportunity.id)}>EU QUERO ESSAS METAS</Button>
                            </div>
                        </div>
                    )}
                </BaseModal>

            </div>
        </SectionErrorBoundary>
    );
};

export default DriverBonusDashboard;
