import React from 'react';
import { AlertTriangle, ArrowLeft, Home, LayoutDashboard, LifeBuoy, MapPin, Search } from 'lucide-react';
import { Logo } from '../../components/Logo';

interface NotFoundProps {
    isAuthenticated?: boolean;
    panelPath?: string | null;
}

export const NotFound: React.FC<NotFoundProps> = ({ isAuthenticated = false, panelPath = null }) => {
    const goHome = () => {
        window.location.href = '/';
    };

    const goPanel = () => {
        window.location.href = panelPath || '/';
    };

    const goSupport = () => {
        window.location.href = '/suporte';
    };

    const goPrimary = () => {
        if (isAuthenticated) {
            goPanel();
            return;
        }
        goHome();
    };

    const goBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            goPrimary();
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
                <header className="flex items-center justify-between bg-brand-600 text-white rounded-2xl px-6 py-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goBack}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm font-black text-white hover:bg-brand-700 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Voltar
                        </button>
                        <button onClick={goHome} className="flex items-center gap-3">
                            <Logo className="h-10 w-auto" mode="icon" variant="full-white" />
                            <div className="text-left">
                                <p className="text-xs uppercase tracking-widest text-white/80 font-black">Pagina perdida</p>
                                <p className="text-sm font-black text-white">Ze Entregas</p>
                            </div>
                        </button>
                        
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goSupport}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm font-black text-white hover:bg-brand-700 transition-colors"
                        >
                            <LifeBuoy className="w-4 h-4" />
                            Suporte
                        </button>
                        <button
                            onClick={goPrimary}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm font-black text-white hover:bg-brand-700 transition-colors"
                        >
                            {isAuthenticated ? <LayoutDashboard className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                            {isAuthenticated ? 'Ir para meu painel' : 'Ir para a home'}
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
                                { label: isAuthenticated ? 'Meu painel' : 'Home', action: goPrimary },
                                { label: 'Suporte', action: goSupport },
                                { label: 'FAQ', action: () => window.location.href = '/faq' },
                                { label: 'Meus pedidos', action: () => window.location.href = '/meus-pedidos' }
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
