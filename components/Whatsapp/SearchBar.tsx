import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
    onSearch?: (query: string) => void;
    value?: string;
    onChange?: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, value, onChange }) => {
    const [internalQuery, setInternalQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const query = value !== undefined ? value : internalQuery;

    const handleSearch = (newValue: string) => {
        if (onChange) {
            onChange(newValue);
        } else {
            setInternalQuery(newValue);
        }
        if (onSearch) onSearch(newValue);
    };

    const handleClear = () => {
        handleSearch('');
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
                <Search size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex-1 max-w-md">
            <Search size={18} className="text-gray-500" />
            <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar mensagens..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 dark:text-white"
                autoFocus
            />
            {query && (
                <button onClick={handleClear} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                    <X size={16} className="text-gray-500" />
                </button>
            )}
            <button onClick={() => setIsOpen(false)} className="text-xs text-blue-500 hover:text-blue-600">
                Fechar
            </button>
        </div>
    );
};

export default SearchBar;
