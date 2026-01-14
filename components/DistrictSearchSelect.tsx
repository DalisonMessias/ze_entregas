
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, ChevronDown, Check, X } from 'lucide-react';
import { StoreNeighborhoodFee } from '../types';

interface DistrictSearchSelectProps {
    value: string;
    neighborhoods: StoreNeighborhoodFee[];
    onSelect: (neighborhood: StoreNeighborhoodFee) => void;
    label?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const DistrictSearchSelect: React.FC<DistrictSearchSelectProps> = ({
    value,
    neighborhoods,
    onSelect,
    label,
    placeholder = "Selecione o bairro...",
    className = "",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter neighborhoods based on search
    const filteredNeighborhoods = neighborhoods.filter(n =>
        n.neighborhood_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    const handleSelect = (neighborhood: StoreNeighborhoodFee) => {
        onSelect(neighborhood);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && <label className="block text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1 ml-1">{label}</label>}

            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-left outline-none focus:ring-2 focus:ring-brand-500 dark:text-white h-[44px] transition-all ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-900' : ''}`}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <MapPin className={`w-4 h-4 flex-shrink-0 ${value ? 'text-orange-500' : 'text-gray-400'}`} />
                    <span className={`font-bold truncate ${value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                        {value || placeholder}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180 text-orange-500' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-[100] mt-2 left-0 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">
                    {/* Campo de Busca */}
                    <div className="p-2 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                placeholder="Buscar bairro..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-8 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 font-bold dark:text-white"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md"
                                >
                                    <X className="w-3 h-3 text-gray-400" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Lista de Resultados */}
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredNeighborhoods.length > 0 ? (
                            filteredNeighborhoods.map((n) => (
                                <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => handleSelect(n)}
                                    className={`w-full flex items-center justify-between p-3 text-sm text-left hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors ${value === n.neighborhood_name ? 'bg-orange-50/50 dark:bg-orange-900/5' : ''}`}
                                >
                                    <div className="flex flex-col">
                                        <span className={`font-bold ${value === n.neighborhood_name ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                            {n.neighborhood_name}
                                        </span>
                                        <span className="text-[10px] text-gray-500">
                                            Taxa: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n.fee)}
                                        </span>
                                    </div>
                                    {value === n.neighborhood_name && <Check className="w-4 h-4 text-orange-500" />}
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm italic">
                                Nenhum bairro encontrado...
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
