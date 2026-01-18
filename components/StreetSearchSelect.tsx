
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ChevronDown, Check, Loader2, X } from 'lucide-react';
import { useCityStreets } from '../hooks/useCityStreets';

interface StreetSearchSelectProps {
    city: string;
    value: string;
    onSelect: (street: string) => void;
    label?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const StreetSearchSelect: React.FC<StreetSearchSelectProps> = ({
    city,
    value,
    onSelect,
    label,
    placeholder = "Selecione uma rua...",
    className = "",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { ruas, loading, error } = useCityStreets(city);
    const [filteredStreets, setFilteredStreets] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter streets based on searchTerm
    useEffect(() => {
        if (!searchTerm) {
            setFilteredStreets(ruas.slice(0, 50)); // Show first 50 by default
            return;
        }

        const q = searchTerm.toLowerCase();
        const filtered = ruas
            .filter(r => r.toLowerCase().includes(q))
            .sort((a, b) => {
                const aLower = a.toLowerCase();
                const bLower = b.toLowerCase();
                const aStarts = aLower.startsWith(q);
                const bStarts = bLower.startsWith(q);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.localeCompare(b);
            })
            .slice(0, 50);

        setFilteredStreets(filtered);
    }, [searchTerm, ruas]);

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

    const handleSelect = (street: string) => {
        onSelect(street);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">{label}</label>}

            <button
                disabled={disabled}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border-2 rounded-2xl text-base text-left outline-none transition-all group overflow-hidden ${isOpen
                    ? 'border-brand-500 ring-4 ring-brand-500/10'
                    : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="flex items-center gap-3 truncate pr-2">
                    <MapPin className={`w-5 h-5 flex-shrink-0 ${value ? 'text-brand-500' : 'text-gray-400'}`} />
                    <span className={`font-bold truncate ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                        {value || placeholder}
                    </span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-[60] mt-2 left-0 w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">
                    {/* Search Field */}
                    <div className="p-3 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar rua..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 font-bold dark:text-white"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-2.5 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                                >
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="max-h-[50vh] min-h-[200px] md:max-h-64 overflow-y-auto custom-scrollbar p-1 overscroll-contain">
                        {loading && (
                            <div className="p-8 text-center">
                                <Loader2 className="w-6 h-6 animate-spin text-brand-500 mx-auto" />
                                <p className="text-xs text-gray-500 mt-2 font-medium">Buscando ruas...</p>
                            </div>
                        )}

                        {!loading && filteredStreets.length > 0 && (
                            <div className="space-y-0.5">
                                {filteredStreets.map((street, idx) => {
                                    const isSelected = value === street;
                                    return (
                                        <button
                                            key={`${street}-${idx}`}
                                            type="button"
                                            onClick={() => handleSelect(street)}
                                            className={`w-full flex items-center justify-between px-3 py-3 text-sm rounded-xl transition-all text-left ${isSelected
                                                ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold'
                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 truncate pr-2">
                                                <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-500' : 'text-gray-400 opacity-50'}`} />
                                                <span className="truncate">{street}</span>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {!loading && filteredStreets.length === 0 && (
                            <div className="px-3 py-10 text-center">
                                <Search className="w-8 h-8 text-gray-200 dark:text-gray-800 mx-auto mb-2" />
                                <p className="text-sm text-gray-400 font-medium">Nenhuma rua encontrada</p>
                                {searchTerm && (
                                    <p className="text-[10px] text-gray-500 mt-1">Tente buscar por outro termo</p>
                                )}
                            </div>
                        )}

                        {!loading && !searchTerm && ruas.length > 50 && (
                            <div className="px-3 py-2 text-[10px] text-gray-400 text-center border-t border-gray-50 dark:border-gray-800 mt-1">
                                Digite para ver mais resultados...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
