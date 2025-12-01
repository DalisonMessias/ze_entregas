
import React, { useState } from 'react';
import { Gift, ChevronLeft, Megaphone, ChevronRight, IdCard } from 'lucide-react';
import { ReferralProgram } from './ReferralProgram';
import { PromotionCardGenerator } from './PromotionCardGenerator';
import { UserRole } from '../types';

interface DriverMarketingProps {
    userRole: UserRole;
}

export const DriverMarketing: React.FC<DriverMarketingProps> = ({ userRole }) => {
    const [currentView, setCurrentView] = useState<'menu' | 'referral' | 'digital_card'>('menu');

    return (
        <div className="space-y-6 animate-in fade-in pb-24">
            {/* Header / Navigation */}
            {currentView === 'menu' ? (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                        <Megaphone className="w-6 h-6 text-brand-600" /> Marketing Pessoal
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Ferramentas para divulgar seu trabalho, conseguir mais clientes e ganhar bônus.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Card: Indique e Ganhe */}
                        <button 
                            onClick={() => setCurrentView('referral')}
                            className="flex flex-col items-start p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 relative overflow-hidden group w-full text-left"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                <Gift className="w-24 h-24 rotate-12" />
                            </div>
                            <div className="bg-white/20 p-3 rounded-2xl mb-4 backdrop-blur-sm">
                                <Gift className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black mb-1">Indique e Ganhe</h3>
                            <p className="text-sm text-green-100 opacity-90 mb-4 font-medium">
                                Convide outros entregadores ou lojas e ganhe prioridade e benefícios.
                            </p>
                            <div className="mt-auto flex items-center text-xs font-bold bg-white/20 px-3 py-1.5 rounded-full">
                                Acessar Programa <ChevronRight className="w-3 h-3 ml-1" />
                            </div>
                        </button>

                        {/* Card: Cartão Digital */}
                        <button 
                            onClick={() => setCurrentView('digital_card')}
                            className="flex flex-col items-start p-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-3xl shadow-sm hover:shadow-md transition-all transform hover:-translate-y-1 w-full text-left group"
                        >
                            <div className="bg-brand-50 dark:bg-brand-900/30 p-3 rounded-2xl mb-4 text-brand-600 dark:text-brand-400">
                                <IdCard className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">Cartão de Visita</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
                                Crie artes profissionais para divulgar seus serviços no WhatsApp.
                            </p>
                            <div className="mt-auto flex items-center text-xs font-bold text-gray-600 dark:text-gray-300 group-hover:text-brand-600 transition-colors">
                                Criar Arte <ChevronRight className="w-3 h-3 ml-1" />
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
                        <ChevronLeft className="w-4 h-4 mr-1" /> Voltar para Menu
                    </button>

                    <div className="animate-in slide-in-from-right-5 fade-in duration-300">
                        {currentView === 'referral' && (
                            <ReferralProgram 
                                userRole={userRole}
                                onClose={() => setCurrentView('menu')} 
                            />
                        )}

                        {currentView === 'digital_card' && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700">
                                <PromotionCardGenerator />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
