import React from 'react';
import { AlertTriangle, Settings } from 'lucide-react';
import { Button } from './Button';

interface ProfileValidationAlertProps {
    onNavigateToSettings: () => void;
    missingFields?: string[];
}

/**
 * Componente reutilizável para exibir alerta quando dados do perfil/loja não estão configurados.
 * Usado em todas as páginas do lojista para garantir que o perfil esteja completo.
 */
export const ProfileValidationAlert: React.FC<ProfileValidationAlertProps> = ({
    onNavigateToSettings,
    missingFields = []
}) => {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center space-y-6 animate-in fade-in">
                <div className="flex justify-center">
                    <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                        <AlertTriangle className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Perfil Incompleto
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Complete os dados da sua loja para acessar esta funcionalidade.
                    </p>

                    {missingFields.length > 0 && (
                        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
                            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-300 mb-2">
                                Campos obrigatórios faltando:
                            </p>
                            <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1 text-left">
                                {missingFields.map((field, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                                        {field}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <Button
                    onClick={onNavigateToSettings}
                    className="w-full flex items-center justify-center gap-2"
                    size="lg"
                >
                    <Settings className="w-5 h-5" />
                    Ir para Configurações
                </Button>
            </div>
        </div>
    );
};
