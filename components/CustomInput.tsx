import React, { useState, useEffect } from 'react';

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    mask?: 'currency' | 'phone' | 'cpf' | 'cnpj' | 'cep';
    icon?: React.ElementType | React.ReactNode;
    helperText?: string;
    error?: string | boolean;
    success?: boolean;
}

export const CustomInput: React.FC<CustomInputProps> = ({
    label,
    mask,
    icon: Icon,
    value,
    onChange,
    className = '',
    helperText,
    error,
    success,
    ...props
}) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isRestricted, setIsRestricted] = useState(false);

    useEffect(() => {
        const handleRestricted = () => setIsRestricted(true);
        const handleUnrestricted = () => setIsRestricted(false);

        window.addEventListener('restricted_mode_active', handleRestricted);
        window.addEventListener('restricted_mode_inactive', handleUnrestricted);

        return () => {
            window.removeEventListener('restricted_mode_active', handleRestricted);
            window.removeEventListener('restricted_mode_inactive', handleUnrestricted);
        };
    }, []);

    useEffect(() => {
        if (mask === 'currency' && (value !== undefined && value !== null && value !== '')) {
            const valStr = String(value);
            if (!valStr.includes(',')) {
                const num = Number(valStr);
                if (!isNaN(num)) {
                    setDisplayValue(num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
                } else {
                    setDisplayValue(valStr);
                }
            } else {
                setDisplayValue(valStr);
            }
        } else {
            setDisplayValue(String(value ?? ''));
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
            const formatted = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            setDisplayValue(formatted);
            if (onChange) {
                const syntheticEvent = { ...e, target: { ...e.target, value: formatted } } as any;
                onChange(syntheticEvent);
            }
        } else if (mask === 'phone') {
            const digits = newVal.replace(/\D/g, '');
            let formatted = digits;
            if (digits.length <= 11) {
                if (digits.length > 2) formatted = `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
                if (digits.length > 7) formatted = `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7, 11)}`;
            } else {
                formatted = `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7, 11)}`;
            }
            setDisplayValue(formatted);
            if (onChange) {
                const syntheticEvent = { ...e, target: { ...e.target, value: formatted } } as any;
                onChange(syntheticEvent);
            }
        } else if (mask === 'cpf') {
            const digits = newVal.replace(/\D/g, '').substring(0, 11);
            let formatted = digits;
            if (digits.length > 3) formatted = `${digits.substring(0, 3)}.${digits.substring(3)}`;
            if (digits.length > 6) formatted = `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6)}`;
            if (digits.length > 9) formatted = `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6, 9)}-${digits.substring(9)}`;
            setDisplayValue(formatted);
            if (onChange) {
                const syntheticEvent = { ...e, target: { ...e.target, value: formatted } } as any;
                onChange(syntheticEvent);
            }
        } else if (mask === 'cnpj') {
            const digits = newVal.replace(/\D/g, '').substring(0, 14);
            let formatted = digits;
            if (digits.length > 2) formatted = `${digits.substring(0, 2)}.${digits.substring(2)}`;
            if (digits.length > 5) formatted = `${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5)}`;
            if (digits.length > 8) formatted = `${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5, 8)}/${digits.substring(8)}`;
            if (digits.length > 12) formatted = `${digits.substring(0, 2)}.${digits.substring(2, 5)}.${digits.substring(5, 8)}/${digits.substring(8, 12)}-${digits.substring(12)}`;
            setDisplayValue(formatted);
            if (onChange) {
                const syntheticEvent = { ...e, target: { ...e.target, value: formatted } } as any;
                onChange(syntheticEvent);
            }
        } else if (mask === 'cep') {
            const digits = newVal.replace(/\D/g, '').substring(0, 8);
            let formatted = digits;
            if (digits.length > 5) formatted = `${digits.substring(0, 5)}-${digits.substring(5)}`;
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
            {label && (
                <label className={`block text-xs font-bold mb-1 transition-colors ${error ? 'text-red-500' : success ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${error ? 'text-red-400' : success ? 'text-green-400' : 'text-gray-400 dark:text-gray-500 group-focus-within:text-brand-500'
                        }`}>
                        {React.isValidElement(Icon) ? Icon : React.createElement(Icon as React.ElementType, { className: "w-5 h-5" })}
                    </div>
                )}
                <input
                    {...props}
                    value={displayValue}
                    onChange={handleChange}
                    disabled={isRestricted || props.disabled}
                    className={`w-full p-4 bg-gray-50 dark:bg-gray-800/50 border-2 rounded-2xl outline-none transition-all text-gray-700 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-base
                        ${Icon ? 'pl-12' : 'pl-4'}
                        ${error
                            ? 'border-red-200 dark:border-red-900/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                            : success
                                ? 'border-green-200 dark:border-green-900/50 focus:border-green-500 focus:ring-4 focus:ring-green-500/10'
                                : 'border-gray-100 dark:border-gray-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 group-hover:border-gray-200 dark:group-hover:border-gray-600'
                        }
                        ${isRestricted ? 'bg-gray-100 dark:bg-gray-800' : ''}
                    `}
                />
            </div>
            {(error && typeof error === 'string') && (
                <p className="text-xs text-red-500 mt-1.5 ml-1 font-medium animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
            {helperText && !error && (
                <p className="text-[10px] text-gray-400 mt-1 ml-1">{helperText}</p>
            )}
        </div>
    );
};
