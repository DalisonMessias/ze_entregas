import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
    onSearch?: (query: string) => void;
    value?: string;
    onChange?: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, value, onChange }) => {
    const [internalQuery, setInternalQuery] = useState('');

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

    return (
        <div className="flex items-center gap-2 bg-transparent flex-1">
            <Search size={18} className="text-gray-400" />
            <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Pesquisar ou começar uma nova conversa"
                className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#111B21] placeholder:text-[#667781] placeholder:text-sm"
            />
            {query && (
                <button onClick={handleClear} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors">
                    <X size={16} className="text-gray-500" />
                </button>
            )}
        </div>
    );
};

export default SearchBar;
