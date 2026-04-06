import React, { useState } from 'react';
import { Gift, Share2, Award, Wand2, ChevronLeft, Megaphone, ChevronRight, Palette, Lock, Crown } from 'lucide-react';
import { ReferralProgram } from './ReferralProgram';
import { PromotionCardGenerator } from './PromotionCardGenerator';
import { MarketingModule } from './MarketingModule';
import { usePlanPermissions } from '../hooks/usePlanPermissions';

export const StoreMarketing: React.FC = () => {
    // Alterado o estado inicial para 'menu' para não abrir o Indique e Ganhe direto
    const [currentView, setCurrentView] = useState<'menu' | 'referral' | 'digital_card' | 'studio'>('menu');
    const { canAccessMarketing, loading: loadingPlan } = usePlanPermissions();

    const handlePaidFeatureClick = (view: 'digital_card' | 'studio') => {
        if (!canAccessMarketing) {
            const event = new CustomEvent('navigateToTab', { detail: { tab: 'store_plans' } });
            window.dispatchEvent(event);
            return;
        }
        setCurrentView(view);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header / Navigation */}
            {currentView === 'menu' ? (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                        <Megaphone className="w-6 h-6 text-purple-600" /> Marketing e Crescimento
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Ferramentas exclusivas para divulgar sua loja e ganhar benefícios na plataforma.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Card: Indique e Ganhe */}
                        <button
                            onClick={() => setCurrentView('referral')}
                            className="flex flex-col items-start p-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 relative overflow-hidden group w-full text-left"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <Gift className="w-24 h-24 rotate-12" />
                            </div>
                            <div className="bg-white/20 p-3 rounded-2xl mb-4 backdrop-blur-sm">
                                <Gift className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black mb-1">Indique e Ganhe</h3>
                            <p className="text-sm text-purple-100 opacity-90 mb-4 font-medium">
                                Convide outras lojas e ganhe descontos nas taxas.
                            </p>
                            <div className="mt-auto flex items-center text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full">
                                Acessar Programa <ChevronRight className="w-3 h-3 ml-1" />
                            </div>
                        </button>

                        {/* Card: Cartão Digital */}
                        <button
                            onClick={() => handlePaidFeatureClick('digital_card')}
                            className="flex flex-col items-start p-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-3xl shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 w-full text-left group relative overflow-hidden"
                        >
                            {!canAccessMarketing && !loadingPlan && (
                                <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] rounded-3xl flex items-center justify-center z-10">
                                    <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-lg">
                                        <Lock className="w-4 h-4 text-amber-500" />
                                        <span className="text-xs font-black text-gray-700 dark:text-white uppercase tracking-wider">Plano Pago</span>
                                    </div>
                                </div>
                            )}
                            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-2xl mb-4 text-orange-600 dark:text-orange-400">
                                <Wand2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">Gerador de Cartão</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
                                Crie artes profissionais para postar nas redes sociais.
                            </p>
                            <div className="mt-auto flex items-center text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:text-brand-600 transition-colors">
                                {canAccessMarketing ? 'Criar Arte' : 'Requer plano pago'} <ChevronRight className="w-3 h-3 ml-1" />
                            </div>
                        </button>

                        {/* Card: Estúdio de Marketing (Canvas) */}
                        <button
                            onClick={() => handlePaidFeatureClick('studio')}
                            className="flex flex-col items-start p-6 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/50 rounded-3xl shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 w-full text-left group relative overflow-hidden"
                        >
                            {!canAccessMarketing && !loadingPlan && (
                                <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] rounded-3xl flex items-center justify-center z-10">
                                    <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-lg">
                                        <Lock className="w-4 h-4 text-amber-500" />
                                        <span className="text-xs font-black text-gray-700 dark:text-white uppercase tracking-wider">Plano Pago</span>
                                    </div>
                                </div>
                            )}
                            <div className="bg-purple-600 p-3 rounded-2xl mb-4 text-white">
                                <Palette className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">Estúdio de Marketing</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
                                Crie artes personalizadas com nosso editor avançado.
                            </p>
                            <div className="mt-auto flex items-center text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:text-purple-500 transition-colors">
                                {canAccessMarketing ? 'Abrir Estúdio' : 'Requer plano pago'} <ChevronRight className="w-3 h-3 ml-1" />
                            </div>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <button
                        onClick={() => setCurrentView('menu')}
                        className="flex items-center text-sm font-bold text-gray-500 hover:text-brand-600 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Marketing
                    </button>

                    <div className="animate-in slide-in-from-right-5 fade-in duration-300">
                        {currentView === 'referral' && (
                            <ReferralProgram
                                userRole="store_partner"
                                onClose={() => setCurrentView('menu')}
                            />
                        )}

                        {currentView === 'digital_card' && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                                <PromotionCardGenerator />
                            </div>
                        )}

                        {currentView === 'studio' && (
                            <div className="animate-in fade-in zoom-in-95 duration-500">
                                <MarketingModule />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};