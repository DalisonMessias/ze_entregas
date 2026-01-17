import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // console.error(`[SectionErrorBoundary] Error in ${this.props.componentName || 'component'}:`, error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 m-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 text-center animate-in fade-in">
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400 mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">
                        Algo deu errado nesta seção
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
                        Não foi possível carregar {this.props.componentName ? `o módulo de ${this.props.componentName}` : 'o conteúdo'}.
                        Isso não afeta o resto do sistema.
                    </p>

                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Tentar Novamente
                    </button>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details className="mt-8 text-left w-full max-w-lg">
                            <summary className="text-xs text-red-400 cursor-pointer hover:underline mb-2">Ver detalhes técnicos</summary>
                            <pre className="text-[10px] bg-red-100 dark:bg-black/50 p-4 rounded text-red-800 dark:text-red-200 overflow-auto max-h-40 whitespace-pre-wrap">
                                {this.state.error.message}
                            </pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
