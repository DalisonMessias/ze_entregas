
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface DataErrorDisplayProps {
    message?: string;
    onRetry: () => void;
    title?: string;
}

export const DataErrorDisplay: React.FC<DataErrorDisplayProps> = ({
    message = "Não foi possível carregar as informações agora.",
    onRetry,
    title = "Erro de Carregamento"
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 animate-in fade-in">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full text-red-600 dark:text-red-400 mb-4">
                <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6 max-w-xs">
                {message} Verifique sua conexão ou tente novamente.
            </p>
            <Button onClick={onRetry} variant="outline" size="sm" className="bg-white dark:bg-gray-800">
                <RefreshCw className="w-4 h-4 mr-2" /> Tentar Novamente
            </Button>
        </div>
    );
};
