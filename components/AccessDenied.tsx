import React from 'react';
import { Lock, ShieldAlert, UserX, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from './Button';
import { UserRole } from '../types';

interface AccessDeniedProps {
    reason?: string;
    requiredRole?: UserRole | UserRole[];
    currentUserRole?: UserRole;
    onBack?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
    reason,
    requiredRole,
    currentUserRole,
    onBack
}) => {
    const getRoleName = (role?: UserRole) => {
        switch (role) {
            case 'admin': return 'Administrador';
            case 'store_partner': return 'Lojista Parceiro';
            case 'delivery_partner': return 'Entregador Parceiro';
            case 'delivery_person': return 'Entregador';
            case 'collaborator': return 'Colaborador';
            case 'user': return 'Cliente';
            default: return 'Usuário';
        }
    };

    const getRequiredRolesText = () => {
        if (!requiredRole) return null;
        if (Array.isArray(requiredRole)) {
            return requiredRole.map(r => getRoleName(r)).join(', ');
        }
        return getRoleName(requiredRole);
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 min-h-[60vh] animate-in fade-in duration-500">
            <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="bg-red-50 dark:bg-red-900/10 p-8 flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-red-200 dark:bg-red-900/30 rounded-full blur-2xl animate-pulse"></div>
                        <div className="relative bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-inner border border-red-100 dark:border-red-900/30">
                            <Lock className="w-12 h-12 text-red-500" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-2 rounded-xl shadow-lg border-2 border-white dark:border-gray-800">
                            <ShieldAlert className="w-4 h-4" />
                        </div>
                    </div>
                </div>

                <div className="p-8 text-center">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
                        Acesso Restrito
                    </h2>

                    <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                        {reason || "Você não possui as permissões necessárias para visualizar esta página ou realizar esta operação."}
                    </p>

                    <div className="space-y-4 mb-8">
                        <div className="flex flex-col gap-3 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 text-left">
                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 mt-0.5">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Motivo da Restrição</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                        {requiredRole ? `Esta área é exclusiva para: ${getRequiredRolesText()}` : "Sua conta atual não possui privilégios para este acesso."}
                                    </p>
                                </div>
                            </div>

                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                            <div className="flex items-start gap-3">
                                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 mt-0.5">
                                    <UserX className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Seu Perfil Atual</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                                        {getRoleName(currentUserRole)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="outline"
                            fullWidth
                            onClick={() => window.location.reload()}
                            className="rounded-2xl border-gray-200 dark:border-gray-700"
                        >
                            Tentar Recarregar
                        </Button>
                        <Button
                            fullWidth
                            onClick={onBack || (() => window.history.back())}
                            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 rounded-2xl"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/30 py-4 px-8 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] text-gray-400 text-center leading-tight">
                        Se você acredita que isso é um erro, entre em contato com o suporte técnico informando seu ID de usuário.
                    </p>
                </div>
            </div>
        </div>
    );
};
