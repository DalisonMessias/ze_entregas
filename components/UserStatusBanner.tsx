import React from 'react';
import { AlertTriangle, Clock, Ban, Lock } from 'lucide-react';
import { UserStatus } from '../types';

interface UserStatusBannerProps {
    status: UserStatus;
    reason?: string | null;
}

export const UserStatusBanner: React.FC<UserStatusBannerProps> = ({ status, reason }) => {
    if (status === 'active' || status === 'banned') return null;

    const config = {
        pending: {
            bg: 'bg-orange-50 from-orange-50 to-orange-100 dark:bg-orange-900/30 dark:from-orange-900/20 dark:to-orange-900/10',
            border: 'border-orange-200 dark:border-orange-800',
            text: 'text-orange-800 dark:text-orange-200',
            icon: <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
            title: 'Cadastro em Análise',
            message: 'Sua conta está sob análise da nossa equipe. Algumas funcionalidades estão limitadas apenas para visualização até a aprovação final.'
        },
        suspended: {
            bg: 'bg-red-50 from-red-50 to-red-100 dark:bg-red-900/30 dark:from-red-900/20 dark:to-red-900/10',
            border: 'border-red-200 dark:border-red-800',
            text: 'text-red-800 dark:text-red-200',
            icon: <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />,
            title: 'Conta Suspensa',
            message: 'Sua conta foi temporariamente suspensa. Entre em contato com o suporte para regularizar sua situação.'
        },
        blocked: {
            bg: 'bg-gray-100 from-gray-100 to-gray-200 dark:bg-gray-800 dark:from-gray-800 dark:to-gray-700',
            border: 'border-gray-300 dark:border-gray-600',
            text: 'text-gray-800 dark:text-gray-200',
            icon: <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />,
            title: 'Acesso Bloqueado',
            message: 'Sua conta encontra-se bloqueada. O acesso às funcionalidades de escrita foi revogado.'
        }
    };

    const current = config[status as keyof typeof config];
    if (!current) return null;

    return (
        <div
            className={`w-full p-4 mb-4 rounded-xl border-l-4 shadow-sm bg-gradient-to-r flex items-start gap-4 animate-in slide-in-from-top-2 ${current.bg} ${current.border} ${current.text}`}
            role="alert"
        >
            <div className="shrink-0 mt-0.5 animate-bounce-slow">
                {current.icon}
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-sm uppercase tracking-wide mb-1 flex items-center gap-2">
                    {current.title}
                </h3>
                <p className="text-sm opacity-90 leading-relaxed max-w-4xl">
                    {current.message}
                </p>
                {reason && (
                    <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded-lg text-xs font-mono">
                        <span className="font-bold">Motivo:</span> {reason}
                    </div>
                )}
            </div>
        </div>
    );
};
