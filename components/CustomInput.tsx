import React, { useState, useEffect } from 'react';

interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    mask?: 'currency' | 'phone' | 'cpf' | 'cnpj' | 'cep';
}

export const CustomInput: React.FC<CustomInputProps> = ({
    label,
    mask,
    value,
    onChange,
    className = '',
    ...props
}) => {
    const [displayValue, setDisplayValue] = useState('');

    // Currency Formatter
    const formatCurrency = (val: string) => {
        // Remove non-digits
        let numeric = val.replace(/\D/g, '');

        // Convert to number and divide by 100
        const amount = Number(numeric) / 100;

        // Format to BRL
        return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    };

    useEffect(() => {
        if (mask === 'currency' && value) {
            // If value comes in as number or string, format it for display
            // Assuming value is like "100.50" or 100.50 
            // OR assuming value is already formatted? Usually external value is raw.
            // Let's assume external value is raw string/number.

            // However, standard controlled input behavior expects value to match what's typed if possible.
            // Let's rely on displayValue for the input view, but we need to sync with props.value

            // Simplification: logic inside handleChange will handle user typing. 
            // This useEffect handles if parent changes value programmatically (e.g. loading from DB).
            const valStr = String(value);
            if (!valStr.includes(',')) {
                // Is likely a raw number (e.g. 10.5) => format to 10,50
                // But be careful about 'R$' prefix if we want it. Let's stick to simple decimal "10,50" as requested "exemplo: 1,00".
                // Actually, to make "1,00" from "1", we can just use toLocaleString if it's a valid number.
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
            // Remove all non-digits
            const digits = newVal.replace(/\D/g, '');

            // If empty, set empty
            if (!digits) {
                setDisplayValue('');
                if (onChange) {
                    const syntheticEvent = { ...e, target: { ...e.target, value: '' } };
                    onChange(syntheticEvent);
                }
                return;
            }

            // Masking logic: 
            // 1 -> 0,01
            // 10 -> 0,10
            // 100 -> 1,00
            const amount = Number(digits) / 100;
            const formatted = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

            setDisplayValue(formatted);

            // Pass the RAW value or Formatted value to parent?
            // Usually better to pass the formatted value if the parent expects "1,00".
            // The prompt says "preenchendo o valor conforme o usuário digita (exemplo: 1,00)".
            // Most masking libs pass the formatted string.

            if (onChange) {
                // Create a synthetic event with the formatted value
                const syntheticEvent = { ...e, target: { ...e.target, value: formatted } };
                onChange(syntheticEvent);
            }
        } else {
            setDisplayValue(newVal);
            if (onChange) onChange(e);
        }
    };

    return (
        <div className={`relative ${className}`}>
            {label && <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{label}</label>}
            <input
                {...props}
                value={displayValue}
                onChange={handleChange}
                className={`w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all font-bold text-gray-700 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            />
        </div>
    );
};
