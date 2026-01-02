import React, { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
import { CustomDialog } from '../components/CustomDialog';

interface DialogOptions {
    title: string;
    message: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    placeholder?: string;
}

interface DialogContextType {
    alert: (options: DialogOptions) => Promise<void>;
    confirm: (options: DialogOptions) => Promise<boolean>;
    prompt: (options: DialogOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [dialogState, setDialogState] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm' | 'prompt';
        title: string;
        message: string;
        resolve: ((value?: any) => void) | null;
        reject: ((reason?: any) => void) | null;
        confirmButtonText?: string;
        cancelButtonText?: string;
        placeholder?: string;
    }>({
        isOpen: false,
        type: 'alert',
        title: '',
        message: '',
        resolve: null,
        reject: null,
    });

    // Keep refs to the current resolver and dialog type so we can safely
    // resolve/reject pending promises if the provider unmounts unexpectedly.
    const resolveRef = useRef<((v?: any) => void) | null>(null);
    const typeRef = useRef<'alert' | 'confirm' | 'prompt' | null>(null);

    const closeDialog = () => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
    };

    const handleConfirm = (inputValue?: string) => {
        if (dialogState.type === 'alert') {
            dialogState.resolve?.();
            resolveRef.current = null;
            typeRef.current = null;
        } else if (dialogState.type === 'confirm') {
            dialogState.resolve?.(true);
            resolveRef.current = null;
            typeRef.current = null;
        } else if (dialogState.type === 'prompt') {
            dialogState.resolve?.(inputValue || '');
            resolveRef.current = null;
            typeRef.current = null;
        }
        closeDialog();
    };

    const handleCancel = () => {
        if (dialogState.type === 'confirm') {
            dialogState.resolve?.(false);
            resolveRef.current = null;
            typeRef.current = null;
        } else if (dialogState.type === 'prompt') {
            dialogState.resolve?.(null); // Return null for prompt cancellation
            resolveRef.current = null;
            typeRef.current = null;
        }
        closeDialog();
    };

    const alert = (options: DialogOptions): Promise<void> => {
        return new Promise(resolve => {
            setDialogState({
                isOpen: true,
                type: 'alert',
                title: options.title,
                message: options.message,
                resolve: resolve,
                reject: null,
                confirmButtonText: options.confirmButtonText || 'OK',
            });
            resolveRef.current = resolve;
            typeRef.current = 'alert';
        });
    };

    const confirm = (options: DialogOptions): Promise<boolean> => {
        return new Promise(resolve => {
            setDialogState({
                isOpen: true,
                type: 'confirm',
                title: options.title,
                message: options.message,
                resolve: resolve,
                reject: null,
                confirmButtonText: options.confirmButtonText || 'Confirmar',
                cancelButtonText: options.cancelButtonText || 'Cancelar',
            });
            resolveRef.current = resolve as any;
            typeRef.current = 'confirm';
        });
    };

    const prompt = (options: DialogOptions): Promise<string | null> => {
        return new Promise(resolve => {
            setDialogState({
                isOpen: true,
                type: 'prompt',
                title: options.title,
                message: options.message,
                resolve: resolve,
                reject: null,
                confirmButtonText: options.confirmButtonText || 'OK',
                cancelButtonText: options.cancelButtonText || 'Cancelar',
                placeholder: options.placeholder,
            });
            resolveRef.current = resolve as any;
            typeRef.current = 'prompt';
        });
    };

    // Cleanup: if the provider unmounts while a dialog is open, resolve the
    // pending promise with a safe default so callers don't hang forever.
    useEffect(() => {
        return () => {
            try {
                if (resolveRef.current) {
                    if (typeRef.current === 'confirm') resolveRef.current(false);
                    else if (typeRef.current === 'prompt') resolveRef.current(null);
                    else resolveRef.current();
                }
            } catch (e) {
                // swallow
            }
        };
    }, []);

    return (
        <DialogContext.Provider value={{ alert, confirm, prompt }}>
            {children}
            <CustomDialog
                isOpen={dialogState.isOpen}
                onClose={closeDialog}
                type={dialogState.type}
                title={dialogState.title}
                message={dialogState.message}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                confirmButtonText={dialogState.confirmButtonText}
                cancelButtonText={dialogState.cancelButtonText}
                placeholder={dialogState.placeholder}
            />
        </DialogContext.Provider>
    );
};

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (context === undefined) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};
