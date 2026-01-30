import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode; // Optional fallback UI
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render shows the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    // console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-6 text-center animate-in fade-in">
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
          </div>
          <h1 className="text-3xl font-black mb-2 text-gray-900 dark:text-white">Ops! Algo deu errado.</h1>
          <p className="text-base text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            O sistema encontrou um erro inesperado e precisou ser interrompido para sua segurança. Isso geralmente é temporário.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-600/20 transition-all active:scale-95"
            >
              Tentar Novamente
            </button>

            <button
              onClick={async () => {
                try {
                  // Hard Reset: Clear critical local storage (except auth if possible, but safely clear all for stability)
                  // Preserving only essential auth tokens if they are separate, but assuming total wipe is safer for "Hard Reset"
                  // Actually, let's try to preserve the session if possible, but clearing cache is priority.
                  if (window.caches) {
                    const keys = await window.caches.keys();
                    await Promise.all(keys.map(key => window.caches.delete(key)));
                  }

                  // Unregister service workers
                  const regs = await navigator.serviceWorker.getRegistrations();
                  for (const reg of regs) {
                    await reg.unregister();
                  }

                  // Clear local storage items that might cause issues (keeping basics)
                  // localStorage.clear(); // Too aggressive? Let's clear specific logs or cache.
                  localStorage.removeItem('supabase.auth.token'); // Force re-login if auth state is corrupted

                } catch (e) {
                  console.error("Hard reset failed", e);
                }
                window.location.reload();
              }}
              className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-xl font-bold transition-all active:scale-95"
            >
              Resetar Tudo
            </button>
          </div>

          <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
            Se o problema persistir, por favor entre em contato com o suporte técnico.
          </p>

          {this.state.error && (
            <details className="mt-4 text-left w-full max-w-lg opacity-50 hover:opacity-100 transition-opacity">
              <summary className="text-xs text-center cursor-pointer mb-2">Detalhes Técnicos</summary>
              <pre className="text-[10px] p-4 bg-gray-100 dark:bg-black/50 rounded-lg overflow-auto max-h-32 whitespace-pre-wrap border border-gray-200 dark:border-gray-800 select-all">
                {this.state.error.toString()}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
