import { useState, useEffect } from 'react';

/**
 * Hook para debouncing de valores.
 * Útil para evitar múltiplas execuções de lógica pesada ou requisições em cada tecla pressionada.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
