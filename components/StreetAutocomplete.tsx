import React, { useState, useEffect, useRef } from 'react';
import { useCityStreets } from '../hooks/useCityStreets';
import { Loader2, MapPin } from 'lucide-react';

interface StreetAutocompleteProps {
    city: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    label?: string;
}

export const StreetAutocomplete: React.FC<StreetAutocompleteProps> = ({
    city,
    value,
    onChange,
    placeholder = "Digite o nome da rua",
    disabled = false,
    label
}) => {
    const { ruas, loading, error } = useCityStreets(city);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Lógica de filtro fuzzy simplificada
    useEffect(() => {
        if (!value || value.length < 2 || !ruas.length) {
            setSuggestions([]);
            return;
        }

        const q = value.toLowerCase();

        // Prioriza: Começa com > Contém
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
            .slice(0, 5); // Max 5 sugestões

        setSuggestions(filtered);
    }, [value, ruas]);

    // Fechar sugestões ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSelect = (street: string) => {
        onChange(street);
        setShowSuggestions(false);
    };

    return (
        <div className="relative" ref={wrapperRef}>
            {label && <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase">{label}</label>}
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-400"
                    autoComplete="new-street-address"
                />

                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin">
                        <Loader2 className="w-4 h-4" />
                    </div>
                )}
            </div>

            {/* Sugestões */}
            {showSuggestions && suggestions.length > 0 && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    {suggestions.map((street, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(street)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2 border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors"
                        >
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {street}
                        </button>
                    ))}
                    <div className="px-2 py-1 bg-gray-50 dark:bg-gray-900/50 text-[10px] text-gray-400 text-center">
                        Sugestões baseadas em {city}
                    </div>
                </div>
            )}

            {error && showSuggestions && value.length > 3 && (
                <div className="absolute z-10 w-full mt-1 p-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/10 rounded">
                    Não foi possível carregar sugestões de rua.
                </div>
            )}
        </div>
    );
};
