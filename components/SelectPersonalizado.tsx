import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';

interface Option {
    label: string;
    value: string | number;
}

interface SelectPersonalizadoProps {
    value: string | number;
    onChange: (value: any) => void;
    options: Option[];
    placeholder?: string;
    label?: string;
    className?: string;
    isDisabled?: boolean;
    disabled?: boolean;
    isLoading?: boolean;
    error?: string;
    helperText?: string;
    name?: string;
    id?: string;
    isSearchable?: boolean;
    isClearable?: boolean;
}

export const SelectPersonalizado: React.FC<SelectPersonalizadoProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Selecione...',
    label,
    className = '',
    isDisabled = false,
    disabled = false,
    isLoading = false,
    error,
    helperText,
    name,
    id,
    isSearchable = false,
    isClearable = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const isCurrentlyDisabled = isDisabled || disabled || isLoading;

    // Fechar ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => String(opt.value) === String(value));

    const filteredOptions = isSearchable
        ? options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
        : options;

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label
                    htmlFor={id}
                    className={`block text-xs font-bold mb-1 transition-colors ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    {label}
                </label>
            )}

            <button
                id={id}
                name={name}
                type="button"
                disabled={isCurrentlyDisabled}
                onClick={() => !isCurrentlyDisabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-3.5 bg-white/90 dark:bg-gray-900/40 border rounded-xl text-base text-left shadow-sm transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 ${error
                        ? 'border-red-500/50 hover:border-red-500'
                        : 'border-gray-200/90 dark:border-gray-700/80 hover:border-brand-600 dark:hover:border-brand-500'
                    } ${isCurrentlyDisabled ? 'opacity-60 cursor-not-allowed bg-gray-50/50 dark:bg-gray-800/20' : 'hover:shadow-md'}`}
            >
                <span className={`${selectedOption ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-400'} truncate mr-2`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <div className="flex items-center gap-2">
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                    ) : (
                        <ChevronDown className={`w-5 h-5 text-gray-400 group-hover:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    )}
                </div>
            </button>

            {isOpen && !isCurrentlyDisabled && (
                <div className="absolute z-50 mt-2 right-0 w-full min-w-full origin-top-right bg-white/95 dark:bg-gray-900/95 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl shadow-2xl shadow-black/5 max-h-64 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 backdrop-blur">
                    {isSearchable && (
                        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                            <input
                                type="text"
                                autoFocus
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}

                    <div className="p-2 space-y-1 overflow-y-auto custom-scrollbar">
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                    setSearchTerm('');
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 text-[0.95rem] rounded-xl transition-colors text-left ${String(value) === String(option.value)
                                    ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-bold'
                                    : 'text-gray-700 dark:text-gray-200 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600'
                                    }`}
                            >
                                <span className="truncate">{option.label}</span>
                                {String(value) === String(option.value) && <Check className="w-4 h-4" />}
                            </button>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-gray-400 italic">
                                Nenhuma opção disponível
                            </div>
                        )}
                    </div>
                </div>
            )}

            {error && <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-wider">{error}</p>}
            {!error && helperText && <p className="mt-1 text-[10px] text-gray-400 uppercase tracking-wider">{helperText}</p>}
        </div>
    );
};
