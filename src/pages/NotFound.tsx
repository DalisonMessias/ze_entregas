import React from 'react';
import { AlertTriangle, ArrowLeft, Home, LifeBuoy, MapPin, Search } from 'lucide-react';
import { Logo } from '../../components/Logo';

export const NotFound: React.FC = () => {
    const goHome = () => {
        window.location.href = '/';
    };

    const goSupport = () => {
        window.location.href = '/suporte';
    };

    const goBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            goHome();
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-32 -left-32 w-[420px] h-[420px] rounded-full bg-brand-500/10 blur-[120px]" />
                <div className="absolute top-10 right-[-140px] w-[380px] h-[380px] rounded-full bg-orange-400/10 blur-[120px]" />
                <div className="absolute bottom-[-180px] left-1/3 w-[520px] h-[520px] rounded-full bg-brand-600/10 blur-[150px]" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
                <header className="flex items-center justify-between">
                    <button onClick={goHome} className="flex items-center gap-3">
                        <Logo className="h-10 w-auto text-brand-600" mode="icon" />
                        <div className="text-left">
                            <p className="text-xs uppercase tracking-widest text-gray-400 font-black">Pagina perdida</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white">Ze Entregas</p>
                        </div>
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goSupport}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 text-sm font-black text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                        >
                            <LifeBuoy className="w-4 h-4" />
                            Suporte
                        </button>
                        <button
                            onClick={goHome}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-black hover:bg-brand-700 transition-colors"
                        >
                            <Home className="w-4 h-4" />
                            Home
                        </button>
                    </div>
                </header>

                <main className="mt-16 grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-10 items-center">
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 text-xs font-black uppercase tracking-widest">
                            <AlertTriangle className="w-4 h-4" />
                            Erro 404
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-gray-900 dark:text-white leading-tight">
                            Esta rota saiu do mapa.
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl font-medium">
                            A pagina que voce tentou acessar nao existe ou foi movida. Use os atalhos para voltar
                            ao caminho certo.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={goBack}
                                className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Voltar
                            </button>
                            <button
                                onClick={goHome}
                                className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-600/20 transition-all active:scale-95"
                            >
                                <Home className="w-5 h-5" />
                                Ir para a home
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[32px] p-6 md:p-8 shadow-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-brand-600" />
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-widest text-gray-400 font-black">Sugestoes</p>
                                <p className="text-base font-black text-gray-900 dark:text-white">Rotas populares</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {[
                                { label: 'Encontrar lojas', action: goHome },
                                { label: 'Abrir suporte', action: goSupport },
                                { label: 'Buscar pedidos', action: goHome }
                            ].map((item) => (
                                <button
                                    key={item.label}
                                    onClick={item.action}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <span>{item.label}</span>
                                    <Search className="w-4 h-4 text-gray-400" />
                                </button>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
