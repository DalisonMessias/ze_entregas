
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Plus, Loader2, X, Check } from 'lucide-react';
import { City } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { useDialog } from '../utils/dialogService';

interface CitySelectorProps {
    onSelect: (cityName: string, cityState: string) => void;
    selectedCity?: string;
    userEmail?: string;
}

export const CitySelector: React.FC<CitySelectorProps> = ({ onSelect, selectedCity, userEmail }) => {
    const [search, setSearch] = useState('');
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const didInitialLoad = useRef(false);

    // Request Modal
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [reqCity, setReqCity] = useState('');
    const [reqState, setReqState] = useState('');
    const [reqLoading, setReqLoading] = useState(false);

    const { alert } = useDialog();

    useEffect(() => {
        if (!didInitialLoad.current) {
            didInitialLoad.current = true;
            void fetchCities('');
            return;
        }
        const timer = setTimeout(() => {
            void fetchCities(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchCities = async (term: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await cloud.getAvailableCities(term);
            setCities(data);
        } catch (e: any) {
            setError(e?.message ? String(e.message) : 'Falha ao carregar cidades');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestCity = async () => {
        if (!reqCity.trim() || !reqState.trim()) {
            await alert({ title: 'Cidade', message: 'Preencha cidade e estado.' });
            return;
        }
        setReqLoading(true);
        try {
            await cloud.requestNewCity(reqCity, reqState, userEmail);
            await alert({ title: 'Solicitação', message: 'Solicitação enviada! O admin analisará em breve.' });
            setShowRequestModal(false);
            setReqCity('');
            setReqState('');
        } catch (e: any) {
            await alert({ title: 'Erro', message: 'Erro: ' + e.message });
        } finally {
            setReqLoading(false);
        }
    };

    return (
        <div className="w-full space-y-4">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                Cidade de Atuação
            </label>

            <div className="relative">
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400 z-10" />
                <CustomInput
                    type="text"
                    placeholder="Buscar cidade..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
                ) : error ? (
                    <div className="p-4 text-center">
                        <p className="text-xs text-red-600">{error}</p>
                        <button onClick={() => fetchCities(search)} className="mt-2 text-xs font-bold text-brand-600 hover:underline">Tentar novamente</button>
                    </div>
                ) : cities.length > 0 ? (
                    cities.map(city => {
                        const cityStr = `${city.name} - ${city.state}`;
                        const isSelected = selectedCity === cityStr;
                        return (
                            <button
                                key={city.id}
                                onClick={() => onSelect(city.name, city.state)}
                                className={`w-full text-left px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-50 dark:border-gray-700 last:border-0 ${isSelected ? 'bg-brand-50 dark:bg-brand-900/20' : ''}`}
                            >
                                <span className={`text-sm ${isSelected ? 'font-bold text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {city.name} <span className="text-gray-400 ml-1">({city.state})</span>
                                </span>
                                {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                            </button>
                        );
                    })
                ) : (
                    <div className="p-4 text-center">
                        <p className="text-xs text-gray-400 mb-2">Cidade não encontrada.</p>
                        <button
                            onClick={() => setShowRequestModal(true)}
                            className="text-xs font-bold text-brand-600 hover:underline flex items-center justify-center gap-1 mx-auto"
                        >
                            <Plus className="w-3 h-3" /> Solicitar inclusão
                        </button>
                    </div>
                )}
            </div>

            {selectedCity && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-bold text-green-700 dark:text-green-300">Selecionado: {selectedCity}</span>
                </div>
            )}

            {/* Request Modal */}
            {showRequestModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900 dark:text-white">Solicitar Cidade</h3>
                            <button onClick={() => setShowRequestModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="space-y-3">
                            <CustomInput
                                type="text" placeholder="Nome da Cidade"
                                value={reqCity} onChange={e => setReqCity(e.target.value)}
                            />
                            <CustomInput
                                type="text" placeholder="Estado (UF)" maxLength={2}
                                value={reqState} onChange={e => setReqState(e.target.value.toUpperCase())}
                            />
                            <Button fullWidth onClick={handleRequestCity} disabled={reqLoading}>
                                {reqLoading ? 'Enviando...' : 'Enviar Solicitação'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
