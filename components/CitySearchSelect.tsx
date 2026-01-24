
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ChevronDown, Check, Loader2, X } from 'lucide-react';
import { City } from '../types';
import * as cloud from '../services/cloud';

interface CitySearchSelectProps {
    value: string;
    onSelect: (city: City) => void;
    label?: string;
    placeholder?: string;
    className?: string;
}

export const CitySearchSelect: React.FC<CitySearchSelectProps> = ({
    value,
    onSelect,
    label,
    placeholder = "Selecione uma cidade...",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial load and search
    useEffect(() => {
        const fetchCities = async () => {
            setLoading(true);
            try {
                const data = await cloud.getAvailableCities(searchTerm);
                setCities(data || []);
            } catch (error) {
                console.error('Failed to fetch cities:', error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchCities, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Close on click outside
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
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</label>}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-base text-left focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all hover:border-gray-200 dark:hover:border-gray-600 group"
            >
                <div className="flex items-center gap-2">
                    <MapPin className={`w-4 h-4 ${value ? 'text-brand-500' : 'text-gray-400'}`} />
                    <span className={`font-bold ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                        {value || placeholder}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-[60] mt-2 left-0 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">
                    {/* Search Field */}
                    <div className="p-3 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar por nome..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-2 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                                >
                                    <X className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="md:max-h-60 overflow-y-auto custom-scrollbar overscroll-contain">
                        {loading && (
                            <div className="p-8 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto" />
                                <p className="text-xs text-gray-500 mt-2 font-medium">Buscando cidades...</p>
                            </div>
                        )}

                        {!loading && cities.length > 0 && (
                            <div className="p-1">
                                {cities.map((city) => {
                                    const cityFullName = `${city.name} - ${city.state}`;
                                    const isSelected = value === cityFullName || value === city.name;
                                    return (
                                        <button
                                            key={city.id}
                                            type="button"
                                            onClick={() => handleSelect(city)}
                                            className={`w-full flex items-center justify-between px-3 py-3 text-sm rounded-xl transition-all text-left mb-0.5 ${isSelected
                                                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold'
                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <div className="flex flex-col">
                                                <span>{city.name}</span>
                                                <span className="text-[10px] opacity-60 uppercase tracking-tighter">{city.state}</span>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {!loading && cities.length === 0 && (
                            <div className="px-3 py-10 text-center">
                                <MapPin className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                                <p className="text-sm text-gray-400 font-medium">Nenhuma cidade encontrada</p>
                                {searchTerm && (
                                    <p className="text-[10px] text-gray-500 mt-1">Tente buscar por outro termo</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
