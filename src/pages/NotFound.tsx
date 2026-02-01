import React from 'react';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { Logo } from '../../components/Logo';

export const NotFound: React.FC = () => {
    const goHome = () => {
        // Dispara evento para App.tsx ou recarrega para root
        window.location.href = '/home';
    };

    const goBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            goHome();
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-lg w-full bg-white dark:bg-gray-900/80 backdrop-blur-xl p-8 md:p-12 rounded-[40px] shadow-2xl border border-gray-100 dark:border-gray-800">
                <div className="mb-8 flex justify-center">
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-3xl animate-bounce-slow">
                        <AlertTriangle className="w-16 h-16 text-orange-500 dark:text-orange-400" />
                    </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
                    404
                </h1>

                <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                    Página não encontrada
                </h2>

                <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                    Ops! A página que você está procurando parece ter ido fazer uma entrega e não voltou.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={goBack}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Voltar
                    </button>

                    <button
                        onClick={goHome}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/20 transition-all active:scale-95"
                    >
                        <Home className="w-5 h-5" />
                        Ir para o Início
                    </button>
                </div>
            </div>

            <div className="mt-12 opacity-50 relative z-10">
                <Logo className="h-8 w-auto text-gray-400" mode="icon" />
            </div>
        </div>
    );
};
