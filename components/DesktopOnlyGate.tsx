import React, { useEffect, useMemo, useState } from 'react';
import { Monitor } from 'lucide-react';
import { Button } from './Button';

interface DesktopOnlyGateProps {
    isMobile?: boolean;
    title?: string;
    message?: string;
    hint?: string;
    actionLabel?: string;
    onAction?: () => void;
    children: React.ReactNode;
}

export const DesktopOnlyGate: React.FC<DesktopOnlyGateProps> = ({
    isMobile,
    title = 'Melhor no computador',
    message = 'Esta tela foi pensada para uso em desktop e possui muitos recursos e informações.',
    hint = 'Para ter a melhor experiência, acesse pelo computador ou notebook.',
    actionLabel,
    onAction,
    children
}) => {
    const [localIsMobile, setLocalIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const media = window.matchMedia('(max-width: 767px)');
        const handleResize = () => setLocalIsMobile(media.matches);
        handleResize();
        if ('addEventListener' in media) {
            media.addEventListener('change', handleResize);
            return () => media.removeEventListener('change', handleResize);
        }
        media.addListener(handleResize);
        return () => media.removeListener(handleResize);
    }, []);

    const shouldBlock = useMemo(() => {
        return typeof isMobile === 'boolean' ? isMobile : localIsMobile;
    }, [isMobile, localIsMobile]);

    if (!shouldBlock) return <>{children}</>;

    return (
        <div className="fixed inset-0 z-[60] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Acesso recomendado</p>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
                    </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-4">{message}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{hint}</p>
                {actionLabel && onAction && (
                    <Button onClick={onAction} className="mt-6 w-full">
                        {actionLabel}
                    </Button>
                )}
            </div>
        </div>
    );
};
