import { useState, useCallback } from 'react';

export const useDemoMode = () => {
    const [isDemoMode, setIsDemoMode] = useState(false);

    const toggleDemoMode = useCallback(() => {
        setIsDemoMode(prev => !prev);
    }, []);

    const getMockData = useCallback((key: string) => {
        if (!isDemoMode) return null;

        switch (key) {
            case 'terminal':
                return {
                    id: 'demo-terminal-123',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    user_id: 'demo-user',
                    terminal_id: 'DEMO-001',
                    status: 'ACTIVE',
                    label: 'Terminal de Demonstração',
                    model: 'ZÉ-V1',
                    serial_number: 'DEMO123456',
                    pin_code: '1234'
                };
            case 'sales_history':
                return Array.from({ length: 5 }).map((_, i) => ({
                    id: `demo-hist-${i}`,
                    amount: (Math.random() * 100) + 10,
                    status: 'approved',
                    method: 'CREDIT_CARD',
                    created_at: new Date(Date.now() - i * 86400000).toISOString(),
                    brand: 'mastercard',
                    installments: 1
                }));
            default:
                return null;
        }
    }, [isDemoMode]);

    return {
        isDemoMode,
        toggleDemoMode,
        getMockData,
        setIsDemoMode
    };
};
