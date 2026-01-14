import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, ChevronDown, Tag, X } from 'lucide-react';

interface CategorySelectorProps {
    categories: any[];
    selectedCategory: string | null;
    onSelect: (categoryId: string | null) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({ categories, selectedCategory, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest">Categoria</label>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[54px] px-4 bg-gray-50 dark:bg-gray-900 border rounded-2xl flex items-center justify-between cursor-pointer transition-all ${isOpen ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-brand-400'}`}
            >
                <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-brand-500" />
                    <span className={selectedCategory ? "text-gray-900 dark:text-white font-bold text-sm" : "text-gray-400 text-sm"}>
                        {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name || "Categoria Desconhecida" : "Selecionar Categoria"}
                    </span>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-[115%] left-0 w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2rem] shadow-2xl z-[150] p-4 animate-in zoom-in duration-200 origin-top">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar categoria..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-900/50 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white text-sm font-medium"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                        />
                        {search && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSearch(''); }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="w-3 h-3 text-gray-400" />
                            </button>
                        )}
                    </div>

                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                        <button
                            onClick={() => {
                                onSelect(null);
                                setIsOpen(false);
                                setSearch('');
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all ${!selectedCategory ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500'}`}
                        >
                            <span className="text-sm font-bold">Sem Categoria</span>
                            {!selectedCategory && <Check className="w-4 h-4" />}
                        </button>

                        {filteredCategories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    onSelect(cat.id);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all ${selectedCategory === cat.id ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                            >
                                <span className="text-sm font-bold">{cat.name}</span>
                                {selectedCategory === cat.id && <Check className="w-4 h-4" />}
                            </button>
                        ))}

                        {filteredCategories.length === 0 && search && (
                            <div className="p-8 text-center flex flex-col items-center">
                                <Tag className="w-8 h-8 text-gray-200 mb-2" />
                                <p className="text-gray-400 text-xs font-bold leading-relaxed">
                                    Nenhuma categoria encontrada para<br />
                                    <span className="text-brand-500">"{search}"</span>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
