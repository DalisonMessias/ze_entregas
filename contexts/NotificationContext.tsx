import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AppNotification, NotificationSettings } from '../types';
import { playNotificationSound } from '../utils/audio';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationOptions {
    sound?: boolean;
    vibrate?: boolean;
    duration?: number;
}

interface NotificationContextType {
    showNotification: (message: string, type: NotificationType, options?: NotificationOptions & { actionUrl?: string }) => void;
    settings: NotificationSettings;
    updateSettings: (newSettings: Partial<NotificationSettings>) => void;
    notifications: AppNotification[];
    markAsRead: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<NotificationSettings>({
        enableSound: true,
        enableVibration: true,
        enablePopup: true,
        enableHighContrast: false,
    });

    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    const playSound = useCallback((type: NotificationType) => {
        if (!settings.enableSound) return;

        // Mapeia o tipo da notificação visual para o tom sintetizado correspondente
        const soundType = type === 'success' ? 'success' : (type === 'error' || type === 'warning' ? 'alert' : 'default');
        playNotificationSound(soundType);
    }, [settings.enableSound]);

    const vibrate = useCallback(() => {
        if (!settings.enableVibration || !navigator.vibrate) return;
        navigator.vibrate(200);
    }, [settings.enableVibration]);

    const showNotification = useCallback((message: string, type: NotificationType, options?: NotificationOptions & { actionUrl?: string }) => {
        const useSound = options?.sound ?? true;
        const useVibrate = options?.vibrate ?? true;

        if (useSound) playSound(type);
        if (useVibrate) vibrate();

        const newNotification: AppNotification = {
            id: crypto.randomUUID(),
            user_id: 'local',
            title: type.toUpperCase(),
            message,
            type,
            is_read: false,
            created_at: new Date().toISOString(),
        };

        setNotifications(prev => [newNotification, ...prev]);
    }, [playSound, vibrate]);

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const updateSettings = (newSettings: Partial<NotificationSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    return (
        <NotificationContext.Provider value={{ showNotification, settings, updateSettings, notifications, markAsRead, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};
