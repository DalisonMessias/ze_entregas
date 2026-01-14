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
        if (mask === 'currency' && (value !== undefined && value !== null && value !== '')) {
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
            // Se value for 0 (número), String(0) é "0". Se for 0, queremos mostrar "0,00" se for currency?
            // Na verdade, se value for 0 e for currency, o if acima já pegaria se não fosse falsy.
            // Ajustando a lógica do if acima para pegar o 0.
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
            const formatted = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
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
