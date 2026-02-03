import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Search, Loader2, Store, ShoppingBag } from 'lucide-react';
import { Logo } from './Logo';
import { StoreCard } from './StoreCard';
import * as cloud from '../services/cloud';
import { PublicStoreProfile } from '../types';

interface CityStoresListProps {
    citySlug: string;
}

export const CityStoresList: React.FC<CityStoresListProps> = ({ citySlug }) => {
    const [stores, setStores] = useState<PublicStoreProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cityName, setCityName] = useState('');

    useEffect(() => {
        fetchStores();
    }, [citySlug]);

    const fetchStores = async () => {
        setLoading(true);
        try {
            const data = await cloud.getPublicStoresByCity(citySlug);
            setStores(data || []);

            // Tenta derivar o nome da cidade do slug (melhoria: buscar metadados se necessário)
            if (data && data.length > 0) {
                setCityName(data[0].store_address_city || citySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
            } else {
                setCityName(citySlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
            }
        } catch (error) {
            console.error('Failed to fetch stores per city:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        window.history.pushState({}, '', '/cidades');
        window.dispatchEvent(new Event('popstate'));
    };

    const handleStoreClick = (store: PublicStoreProfile) => {
        const url = `/${store.city_slug}/${store.store_slug}/produtos`;
        window.history.pushState({ tab: 'digital_menu' }, '', url);
        window.dispatchEvent(new Event('popstate'));
        window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'digital_menu' } }));
    };

    const filteredStores = stores.filter(store =>
        store.store_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-500" />
                        </button>
                        <Logo className="h-8 w-auto text-brand-600" mode="icon" />
                        <div>
                            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                                Lojas em {cityName}
                            </h1>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                {stores.length} estabelecimentos
                            </p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-2">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar loja..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 pr-6 py-3.5 bg-gray-100 dark:bg-gray-800/50 border-2 border-transparent focus:border-brand-500/20 rounded-2xl text-base focus:ring-4 focus:ring-brand-500/10 outline-none w-[400px] transition-all"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-brand-600" />
                        <p className="text-gray-500 font-bold animate-pulse">Buscando lojas parceiras...</p>
                    </div>
                ) : stores.length > 0 ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredStores.map(store => (
                                <StoreCard
                                    key={store.id}
                                    store={store}
                                    onClick={() => handleStoreClick(store)}
                                />
                            ))}
                        </div>

                        {filteredStores.length === 0 && (
                            <div className="py-20 text-center">
                                <Search className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Nenhuma loja encontrada</h3>
                                <p className="text-gray-500 font-medium">Tente buscar por um termo diferente.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-20 text-center bg-white dark:bg-gray-900 rounded-[48px] border border-dashed border-gray-200 dark:border-gray-800">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShoppingBag className="w-12 h-12 text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Ainda não temos lojas parceiras aqui</h3>
                        <p className="text-gray-500 font-medium max-w-md mx-auto mb-10">
                            Estamos conversando com os melhores estabelecimentos de {cityName} para trazer o Zé até você em breve!
                        </p>
                        <button
                            onClick={handleBack}
                            className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-transform"
                        >
                            Ver outras cidades
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};
