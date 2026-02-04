import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Search, PlusCircle, Loader2, Globe, Building2, ExternalLink } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';
import { City } from '../types';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import { RequestCityModal } from './RequestCityModal';

export const CitiesList: React.FC = () => {
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const { alert, confirm } = useDialog();

    useEffect(() => {
        fetchCities();
    }, []);

    const fetchCities = async () => {
        setLoading(true);
        try {
            const data = await cloud.getAvailableCities();
            setCities(data || []);
        } catch (error) {
            console.error('Failed to fetch cities:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        window.history.pushState({}, '', '/home');
        window.dispatchEvent(new Event('popstate'));
    };

    const handleRequestCity = () => {
        setIsRequestModalOpen(true);
    };

    const filteredCities = cities.filter(city =>
        city.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        city.state.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Agrupa cidades por estado
    const groupedCities = filteredCities.reduce((acc, city) => {
        if (!acc[city.state]) acc[city.state] = [];
        acc[city.state].push(city);
        return acc;
    }, {} as Record<string, City[]>);

    const states = Object.keys(groupedCities).sort();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-brand-600 text-white backdrop-blur-xl border-b border-brand-700/60">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-brand-700 rounded-full transition-colors text-white"
                        >
                            <ArrowLeft className="w-6 h-6 text-white" />
                        </button>
                        <Logo className="h-8 w-auto" mode="icon" variant="full-white" />
                        <h1 className="text-xl font-black text-white tracking-tight">
                            Nossas Cidades
                        </h1>
                    </div>

                    <div className="hidden md:flex items-center gap-2">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Qual cidade você procura?"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 pr-6 py-3.5 bg-white border-2 border-transparent focus:border-brand-500/20 rounded-2xl text-base text-gray-900 placeholder-gray-400 focus:ring-4 focus:ring-brand-500/10 outline-none w-[400px] transition-all"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Hero section inside listing */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">
                        Onde o Zé <span className="text-brand-600">entrega.</span>
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg font-medium max-w-2xl mx-auto">
                        Estamos expandindo rapidamente para levar o melhor da sua cidade até você.
                        Confira se já atendemos na sua região.
                    </p>
                </div>

                <div className="md:hidden mb-8">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Qual cidade você procura?"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-base focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-brand-600" />
                        <p className="text-gray-500 font-bold animate-pulse">Carregando cidades...</p>
                    </div>
                ) : states.length > 0 ? (
                    <div className="space-y-16">
                        {states.map(state => (
                            <section key={state} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="px-4 py-1 bg-brand-600 text-white rounded-lg font-black text-xl shadow-lg shadow-brand-600/20">
                                        {state}
                                    </div>
                                    <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                                    <span className="text-gray-400 font-bold text-sm uppercase tracking-widest">
                                        {groupedCities[state].length} {groupedCities[state].length === 1 ? 'Cidade' : 'Cidades'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {groupedCities[state].map(city => (
                                        <button
                                            key={city.id}
                                            onClick={() => {
                                                const slug = (city as any).city_slug || (city as any).slug || city.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
                                                window.history.pushState({}, '', `/cidades/${slug}`);
                                                window.dispatchEvent(new Event('popstate'));
                                            }}
                                            className="group bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-50 dark:border-gray-800 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 text-left relative overflow-hidden"
                                        >
                                            <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-brand-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>

                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/30 group-hover:text-brand-500 transition-colors rounded-2xl">
                                                    <Building2 className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-xl text-gray-900 dark:text-white tracking-tight group-hover:text-brand-600 transition-colors">
                                                        {city.name}
                                                    </h3>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{state}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50 dark:border-gray-800">
                                                <span className="text-xs font-black text-brand-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                                                    Ver lojas
                                                </span>
                                                <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-xl group-hover:bg-brand-600 group-hover:text-white transition-all transform rotate-[-45deg] group-hover:rotate-0">
                                                    <ArrowLeft className="w-4 h-4 rotate-180" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Globe className="w-12 h-12 text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Não encontramos esta cidade</h3>
                        <p className="text-gray-500 font-medium mb-10 italic">Tente buscar por outro termo ou peça para expandirmos.</p>

                        <Button
                            onClick={handleRequestCity}
                            className="bg-brand-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-brand-600/20"
                        >
                            <PlusCircle className="w-5 h-5 mr-3 inline-block" />
                            Solicitar Minha Cidade
                        </Button>
                    </div>
                )}

                {/* Bottom CTA */}
                {!loading && states.length > 0 && (
                    <div className="mt-32 p-12 bg-white dark:bg-gray-900 rounded-[48px] border border-gray-50 dark:border-gray-800 shadow-2xl overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none group-hover:scale-150 transition-transform duration-1000"></div>

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="text-center md:text-left">
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Sua cidade não está na lista?</h3>
                                <p className="text-gray-500 font-medium italic">Seja o primeiro a levar o Zé Entregas para sua região!</p>
                            </div>
                            <Button
                                onClick={handleRequestCity}
                                className="bg-gray-900 dark:bg-brand-600 text-white px-10 py-5 rounded-2xl font-black shadow-xl"
                            >
                                <PlusCircle className="w-5 h-5 mr-3 inline-block" />
                                Solicitar Cidade
                            </Button>
                        </div>
                    </div>
                )}
            </main>

            <RequestCityModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
            />
        </div>
    );
};
