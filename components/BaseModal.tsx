import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    icon?: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
    disableScroll?: boolean;
    fullScreenOnMobile?: boolean;
}

export const BaseModal: React.FC<BaseModalProps> = ({
    isOpen,
    onClose,
    children,
    title,
    icon,
    maxWidth = 'lg',
    disableScroll = false,
    fullScreenOnMobile = false
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        full: 'max-w-full'
    };

    return createPortal(
        <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-center justify-center animate-in fade-in ${
                fullScreenOnMobile ? 'p-0 sm:p-4' : 'p-4'
            }`}
            onClick={onClose}
        >
            <div
                className={`bg-white dark:bg-gray-800 w-full ${maxWidthClasses[maxWidth]} shadow-2xl animate-in zoom-in-95 relative flex flex-col ${
                    fullScreenOnMobile
                        ? 'h-screen max-h-screen rounded-none p-4 sm:p-8 sm:h-auto sm:max-h-[90vh] sm:rounded-2xl'
                        : 'rounded-2xl p-6 sm:p-8 max-h-[90vh]'
                }`}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {(title || icon) && (
                    <div className="flex items-center gap-3 mb-6">
                        {icon && (
                            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                {icon}
                            </div>
                        )}
                        {title && <h3 className="text-2xl font-black text-gray-900 dark:text-white">{title}</h3>}
                    </div>
                )}

                <div className={`${disableScroll ? '' : 'overflow-y-auto pr-2 custom-scrollbar'}`}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};
