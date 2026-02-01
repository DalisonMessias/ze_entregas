import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
    variant?: 'full' | 'container' | 'inline' | 'overlay';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    message?: string;
    backdrop?: boolean;
    className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
    variant = 'container',
    size = 'md',
    message,
    backdrop = false,
    className = ''
}) => {
    const sizeClasses = {
        xs: 'w-4 h-4',
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16'
    };

    const spinner = (
        <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className={`${sizeClasses[size]} animate-spin text-brand-600`} />
            {message && (
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm animate-pulse">
                    {message}
                </p>
            )}
        </div>
    );

    if (variant === 'full') {
        return (
            <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-gray-950 ${className}`}>
                {spinner}
            </div>
        );
    }

    if (variant === 'overlay') {
        return (
            <div className={`absolute inset-0 z-50 flex items-center justify-center ${backdrop ? 'bg-white/60 dark:bg-black/60 backdrop-blur-sm' : 'bg-white/30 dark:bg-black/30'} ${className}`}>
                {spinner}
            </div>
        );
    }

    if (variant === 'inline') {
        return <Loader2 className={`${sizeClasses[size]} animate-spin ${className}`} />;
    }

    return (
        <div className={`flex items-center justify-center p-6 ${className}`}>
            {spinner}
        </div>
    );
};
