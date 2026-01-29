import React from 'react';
import { X } from 'lucide-react';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    icon?: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
}

export const BaseModal: React.FC<BaseModalProps> = ({ isOpen, onClose, children, title, icon, maxWidth = 'lg' }) => {
    if (!isOpen) return null;

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

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div
                className={`bg-white dark:bg-gray-800 w-full ${maxWidthClasses[maxWidth]} rounded-2xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 relative flex flex-col max-h-[90vh]`}
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

                <div className="overflow-y-auto pr-2 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
};
