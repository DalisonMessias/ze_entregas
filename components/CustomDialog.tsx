import React, { useState } from 'react';
import { BaseModal } from './BaseModal';
import { Info, AlertTriangle, HelpCircle } from 'lucide-react';

interface CustomDialogProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'alert' | 'confirm' | 'prompt';
    title: string;
    message: string;
    onConfirm?: (inputValue?: string) => void;
    onCancel?: () => void;
    confirmButtonText?: string;
    cancelButtonText?: string;
    placeholder?: string; // For prompt input
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
    isOpen,
    onClose,
    type,
    title,
    message,
    onConfirm,
    onCancel,
    confirmButtonText = 'Confirmar',
    cancelButtonText = 'Cancelar',
    placeholder = '',
}) => {
    const [inputValue, setInputValue] = useState('');

    const handleConfirm = () => {
        onConfirm?.(type === 'prompt' ? inputValue : undefined);
        onClose();
    };

    const handleCancel = () => {
        onCancel?.();
        onClose();
    };

    let iconComponent;
    let iconBgClass;
    if (type === 'alert') {
        iconComponent = <Info className="w-6 h-6 text-blue-500" />;
        iconBgClass = 'bg-blue-50 dark:bg-blue-900/20';
    } else if (type === 'confirm') {
        iconComponent = <HelpCircle className="w-6 h-6 text-yellow-500" />;
        iconBgClass = 'bg-yellow-50 dark:bg-yellow-900/20';
    } else if (type === 'prompt') {
        iconComponent = <AlertTriangle className="w-6 h-6 text-brand-500" />; // Reusing brand color for prompt
        iconBgClass = 'bg-brand-50 dark:bg-brand-900/20';
    }

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={title} icon={iconComponent}>
            <div className="space-y-4 text-gray-600 dark:text-gray-300">
                <p className="whitespace-pre-wrap">{message}</p>

                {type === 'prompt' && (
                    <input
                        type="text"
                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={placeholder}
                    />
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                    {(type === 'confirm' || type === 'prompt') && (
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            {cancelButtonText}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 transition-colors"
                    >
                        {confirmButtonText}
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
