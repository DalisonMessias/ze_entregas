import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, Check, X } from 'lucide-react';
import { City } from '../types';
import * as cloud from '../services/cloud';

interface LandingCitySelectorProps {
    value: string;
    onSelect: (city: City) => void;
    placeholder?: string;
}

export const LandingCitySelector: React.FC<LandingCitySelectorProps> = ({
    value,
    onSelect,
    placeholder = "Qual sua cidade ou endereço?"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(''); // Começa vazio para mostrar todas ao focar
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Quando o valor muda externamente (seleção concluída), atualiza o campo e fecha
    useEffect(() => {
        if (value) {
            setSearchTerm(value.split(' - ')[0]); // Mostra apenas o nome da cidade no input
        }
    }, [value]);

    useEffect(() => {
        if (!isOpen) return;

        const controller = new AbortController();
        const signal = controller.signal;

        const fetchCities = async () => {
            setLoading(true);
            try {
                // Se searchTerm for vazio, traz as cidades padrão/disponíveis
                const query = searchTerm.length >= 2 ? searchTerm : '';
                const data = await cloud.getAvailableCities(query, signal);
                if (!signal.aborted) {
                    setCities(data || []);
                }
            } catch (error) {
                if (!signal.aborted) {
                    console.error('Failed to fetch cities:', error);
                }
            } finally {
                if (!signal.aborted) {
                    setLoading(false);
                }
            }
        };

        const timer = setTimeout(fetchCities, 200);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [searchTerm, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (city: City) => {
        onSelect(city);
        setSearchTerm(`${city.name} - ${city.state}`);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full max-w-3xl mx-auto z-[100]" ref={containerRef}>
            {/* Main Bar */}
            <div className={`relative flex items-center bg-white dark:bg-gray-900 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] transition-all duration-300 ${isOpen ? 'rounded-t-[32px]' : 'rounded-[32px]'
                }`}>
                <div className="flex-1 flex items-center group">
                    <div className="pl-8 text-gray-400 group-focus-within:text-brand-500 transition-colors">
                        <MapPin className="w-6 h-6" />
                    </div>

                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (!isOpen) setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className="w-full pl-5 pr-12 py-7 bg-transparent border-none text-xl font-bold text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0 outline-none"
                    />

                    {(searchTerm || isOpen) && (
                        <div className="absolute right-6 flex items-center gap-2">
                            {loading && <Loader2 className="w-5 h-5 animate-spin text-brand-500" />}
                            {searchTerm && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setIsOpen(true);
                                    }}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Dropdown Results */}
            {isOpen && (
                <div className="absolute z-[1000] top-full left-0 w-full bg-white dark:bg-gray-900 border-x border-b border-gray-100 dark:border-gray-800 rounded-b-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] animate-in fade-in duration-200 overflow-hidden">
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                        {loading && searchTerm.length > 0 && (
                            <div className="p-10 text-center">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-500 mx-auto" />
                                <p className="text-sm text-gray-500 mt-3 font-bold">Buscando as melhores opções...</p>
                            </div>
                        )}

                        {!loading && cities.length > 0 && (
                            <div className="p-2">
                                {cities.slice(0, 5).map((city) => {
                                    const cityFullName = `${city.name} - ${city.state}`;
                                    const isSelected = value === cityFullName;
                                    return (
                                        <button
                                            key={city.id}
                                            type="button"
                                            onClick={() => handleSelect(city)}
                                            className={`w-full flex items-center justify-between px-6 py-4 text-left rounded-2xl transition-all mb-1 ${isSelected
                                                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold'
                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-black text-lg">{city.name}</span>
                                                <span className="text-xs uppercase font-bold tracking-widest opacity-60">{city.state}</span>
                                            </div>
                                            {isSelected && (
                                                <div className="p-1.5 bg-brand-500 text-white rounded-lg">
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}

                                <div className="p-2 mt-2 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.history.pushState({}, '', '/cidades');
                                            window.dispatchEvent(new Event('popstate'));
                                        }}
                                        className="w-full py-4 text-center text-brand-600 font-black text-sm uppercase tracking-wider hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-all"
                                    >
                                        Ver todas as cidades
                                    </button>
                                </div>
                            </div>
                        )}

                        {!loading && cities.length === 0 && (
                            <div className="px-6 py-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MapPin className="w-8 h-8 text-gray-200" />
                                </div>
                                <p className="text-gray-900 dark:text-white font-black">Nenhuma cidade encontrada</p>
                                <p className="text-sm text-gray-500 mt-1 font-medium italic">Tente buscar por um nome diferente.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
