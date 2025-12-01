import React, { useState, useEffect } from 'react';
import { Settings, Truck, Save, Loader2, Store, Lock, Info } from 'lucide-react';
import { Button } from './Button';
import { StoreShippingRules } from './StoreShippingRules'; // Reuse the component
import * as cloud from '../services/cloud';
import { PartnerProfile } from '../types';

export const StoreSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'shipping'>('general');
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSuperStore, setIsSuperStore] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const p = await cloud.getMyPartnerProfile(); // Reusing partner profile type for store basic info
                setProfile(p);
                
                // Check super store status
                const user = await cloud.getClient()?.auth.getUser();
                if (user?.data.user) {
                    const data = await cloud.getClient()?.from('user_profiles').select('is_super_store').eq('id', user.data.user.id).single();
                    if (data?.data) setIsSuperStore(data.data.is_super_store);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600"/></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header / Tabs */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'general' ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-white' : 'text-gray-500'}`}
                    >
                        <Store className="w-4 h-4" /> Dados da Loja
                    </button>
                    <button 
                        onClick={() => setActiveTab('shipping')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'shipping' ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-white' : 'text-gray-500'}`}
                    >
                        {isSuperStore ? <Truck className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Config. Frete
                    </button>
                </div>
            </div>

            {/* General Settings */}
            {activeTab === 'general' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg dark:text-white mb-4">Informações Básicas</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Cidade de Atuação</p>
                            <p className="font-bold text-gray-900 dark:text-white">{profile?.city || 'Não definida'}</p>
                            <p className="text-xs text-gray-400 mt-1">Para alterar a cidade, entre em contato com o suporte.</p>
                        </div>
                        
                        {/* Placeholder for more settings (Name, Address update) */}
                        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <Info className="w-5 h-5 text-blue-600" />
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                Mantenha seu endereço de coleta sempre atualizado na hora de solicitar entregas.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Shipping Rules (Super Store Only) */}
            {activeTab === 'shipping' && (
                isSuperStore ? (
                    <StoreShippingRules />
                ) : (
                    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Recurso Exclusivo</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-6 max-w-xs mx-auto">
                            A configuração avançada de frete (taxas fixas, frete grátis) está disponível apenas para Super Lojistas.
                        </p>
                    </div>
                )
            )}
        </div>
    );
};