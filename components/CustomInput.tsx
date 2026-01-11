import React, { useState, useEffect } from 'react';

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    mask?: 'currency' | 'phone' | 'cpf' | 'cnpj' | 'cep';
    icon?: React.ElementType;
}

export const CustomInput: React.FC<CustomInputProps> = ({
    label,
    mask,
    icon: Icon,
    value,
    onChange,
    className = '',
    ...props
}) => {
    const [displayValue, setDisplayValue] = useState('');

    // ... (logic remains same)
    // Currency Formatter logic...

    useEffect(() => {
        if (mask === 'currency' && value) {
            const valStr = String(value);
            if (!valStr.includes(',')) {
                const num = Number(valStr);
                if (!isNaN(num)) {
                    setDisplayValue(num.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
                } else {
                    setDisplayValue(valStr);
                }
            } else {
                setDisplayValue(valStr);
            }
        } else {
            setDisplayValue(String(value || ''));
        }
    }, [value, mask]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let newVal = e.target.value;

        if (mask === 'currency') {
            const digits = newVal.replace(/\D/g, '');
            if (!digits) {
                setDisplayValue('');
                if (onChange) {
                    const syntheticEvent = { ...e, target: { ...e.target, value: '' } } as any;
                    onChange(syntheticEvent);
                }
                return;
            }
            const amount = Number(digits) / 100;
            const formatted = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            setDisplayValue(formatted);
            if (onChange) {
                const syntheticEvent = { ...e, target: { ...e.target, value: formatted } } as any;
                onChange(syntheticEvent);
            }
        } else {
            setDisplayValue(newVal);
            if (onChange) onChange(e);
        }
    };

    return (
        <div className={`w-full ${className}`}>
            {label && <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10">
                        <Icon className="w-4 h-4" />
                    </div>
                )}
                <input
                    {...props}
                    value={displayValue}
                    onChange={handleChange}
                    className={`w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-bold text-gray-700 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${Icon ? 'pl-10' : ''}`}
                />
            </div>
        </div>
    );
};
