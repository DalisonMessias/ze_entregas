
import React, { useState, useEffect } from 'react';
import { MapPin, Search, Plus, Loader2, X, Check } from 'lucide-react';
import { City } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';

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
    
    // Request Modal
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [reqCity, setReqCity] = useState('');
    const [reqState, setReqState] = useState('');
    const [reqLoading, setReqLoading] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCities(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchCities = async (term: string) => {
        setLoading(true);
        try {
            const data = await cloud.getAvailableCities(term);
            setCities(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestCity = async () => {
        if (!reqCity.trim() || !reqState.trim()) return alert("Preencha cidade e estado.");
        setReqLoading(true);
        try {
            await cloud.requestNewCity(reqCity, reqState, userEmail);
            alert("Solicitação enviada! O admin analisará em breve.");
            setShowRequestModal(false);
            setReqCity('');
            setReqState('');
        } catch (e: any) {
            alert("Erro: " + e.message);
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
                <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar cidade..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white font-medium"
                />
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-brand-500"/></div>
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
                            <button onClick={() => setShowRequestModal(false)}><X className="w-5 h-5 text-gray-400"/></button>
                        </div>
                        <div className="space-y-3">
                            <input 
                                type="text" placeholder="Nome da Cidade" 
                                value={reqCity} onChange={e => setReqCity(e.target.value)}
                                className="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                            <input 
                                type="text" placeholder="Estado (UF)" maxLength={2}
                                value={reqState} onChange={e => setReqState(e.target.value.toUpperCase())}
                                className="w-full p-3 rounded-xl border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
