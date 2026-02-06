import React from 'react';
import { ChevronDown } from 'lucide-react';

interface MobileTabsSelectOption {
    value: string;
    label: string;
}

interface MobileTabsSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: MobileTabsSelectOption[];
    label?: string;
    className?: string;
    id?: string;
}

export const MobileTabsSelect: React.FC<MobileTabsSelectProps> = ({
    value,
    onChange,
    options,
    label = 'Seção',
    className = '',
    id
}) => {
    const selectId = id || `mobile-tabs-${label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div className={`md:hidden ${className}`}>
            {label && (
                <label htmlFor={selectId} className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    id={selectId}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            </div>
        </div>
    );
};
