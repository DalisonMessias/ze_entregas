import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import * as cloud from '../services/cloud';

interface CityStreetSelectProps {
    state: string;
    city: string;
    value: string; // The street name
    onSelect: (street: any) => void; // Returns full street object from ViaCEP
    placeholder?: string;
    disabled?: boolean;
}

export const CityStreetSelect: React.FC<CityStreetSelectProps> = ({
    state,
    city,
    value,
    onSelect,
    placeholder = "Busque o nome da rua...",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(value || '');
    const [streets, setStreets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setSearchTerm(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
        setIsOpen(true);

        if (debounceTimer) clearTimeout(debounceTimer);

        if (term.length < 3) {
            setStreets([]);
            return;
        }

        const timer = setTimeout(async () => {
            if (!state || !city) return;
            setLoading(true);
            try {
                const data = await cloud.getStreetsByCity(state, city, term);
                setStreets(data);
            } catch (error) {
                console.error('Error searching streets', error);
                setStreets([]);
            } finally {
                setLoading(false);
            }
        }, 800);

        setDebounceTimer(timer);
    };

    const handleSelect = (street: any) => {
        // ViaCEP returns: logradouro, complemento, bairro, localidade, uf, cep

        // Remove "Rua", "Av", etc prefix if desired or keep it? 
        // User usually types "Silveira", API returns "Rua Silveira Martins".
        // Let's keep the user's view clean but return the full object.

        onSelect(street);
        setSearchTerm(street.logradouro);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className={`block w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all sm:text-sm ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => {
                        if (!disabled) setIsOpen(true);
                        // Trigger search even if previously closed? No, only if typed.
                    }}
                    disabled={disabled}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {loading ? (
                        <Loader2 className="h-4 w-4 text-brand-500 animate-spin" />
                    ) : searchTerm ? (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                onSelect(null); // Clear selection
                                setStreets([]);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    ) : null}
                </div>
            </div>

            {isOpen && !disabled && (streets.length > 0 || (searchTerm.length >= 3 && !loading)) && (
                <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-xl max-h-60 rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm animate-in fade-in slide-in-from-top-2">
                    {loading && (
                        <li className="cursor-default select-none relative py-2 pl-3 pr-9 text-gray-500 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Buscando ruas...
                        </li>
                    )}

                    {!loading && streets.length === 0 && searchTerm.length >= 3 && (
                        <li className="cursor-default select-none relative py-2 pl-3 pr-9 text-gray-500">
                            Nenhuma rua encontrada.
                        </li>
                    )}

                    {!loading && streets.map((street, index) => (
                        <li
                            key={`${street.cep}-${index}`}
                            className="cursor-pointer select-none relative py-3 pl-3 pr-9 hover:bg-brand-50 dark:hover:bg-brand-900/20 group border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                            onClick={() => handleSelect(street)}
                        >
                            <div className="flex items-center">
                                <span className="font-medium block truncate text-gray-900 dark:text-white group-hover:text-brand-700 transition-colors">
                                    {street.logradouro}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 ml-0 mt-0.5">
                                {street.bairro} • CEP {street.cep}
                            </div>
                        </li>
                    ))}

                    {/* Add option to use exact text if needed? User required 'no modify'? 
                        "sem poder modificar a cidade". Street is "CityStreetSelect".
                        If user wants to type a street that IS NOT in API, we should allow it as fallback?
                        Usually yes, but the user specifically asked for "CityStreetSelect" to "show streets".
                        I'll just allow free typing (searchTerm updates) but emphasis on list selection.
                    */}
                </ul>
            )}
        </div>
    );
};
