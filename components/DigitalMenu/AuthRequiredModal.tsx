import React from 'react';
import { LogIn, UserPlus, X } from 'lucide-react';
import { Button } from '../Button';

interface AuthRequiredModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
    isOpen,
    onClose,
    title = "Login Necessário",
    description = "Para fazer seu pedido e acompanhar o status em tempo real, você precisa estar conectado à sua conta."
}) => {
    if (!isOpen) return null;

    const handleLogin = () => {
        window.location.href = '/login';
    };

    const handleRegister = () => {
        window.location.href = '/cadastro';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <div className="p-8 space-y-8 text-center">
                    <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-3xl flex items-center justify-center mx-auto text-brand-600 shadow-sm border border-brand-100/50">
                        <LogIn className="w-10 h-10" />
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white">Acesse sua Conta</h4>
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
                    </div>

                    <div className="space-y-3">
                        <Button
                            fullWidth
                            onClick={handleLogin}
                            className="py-4 text-lg rounded-2xl shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2"
                        >
                            <LogIn className="w-5 h-5" /> Fazer Login Agora
                        </Button>

                        <Button
                            fullWidth
                            variant="outline"
                            onClick={handleRegister}
                            className="py-4 text-lg rounded-2xl border-2 flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-5 h-5" /> Criar nova conta
                        </Button>

                        <button
                            onClick={onClose}
                            className="text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors pt-2"
                        >
                            Continuar navegando no cardápio
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
