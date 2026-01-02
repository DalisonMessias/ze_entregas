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
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
          <h1 className="text-2xl font-bold mb-4">Ocorreu um erro inesperado.</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Por favor, tente novamente ou entre em contato com o suporte.
          </p>
          <div className="flex gap-3 mb-4">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-brand-600 text-white rounded-lg">Recarregar</button>
            <button onClick={async () => {
                try {
                  const reg = await navigator.serviceWorker.getRegistration();
                  if (reg && reg.waiting) {
                    reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
                    return;
                  }
                } catch {}
                window.location.reload();
              }} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">Forçar atualização</button>
          </div>
          {this.state.error && (
            <details className="text-xs text-red-500 max-w-lg p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
              <summary>Detalhes do Erro</summary>
              <pre className="whitespace-pre-wrap break-words">{this.state.error.message}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
