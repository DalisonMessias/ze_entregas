import React from 'react';
import { X, Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from './Button';

interface NotificationCenterProps {
    onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
    const { notifications, markAsRead, clearAll, settings } = useNotification();

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-sm h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <h2 className="text-lg font-bold dark:text-white">Notificações</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {notifications.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                            <Bell className="w-12 h-12 mb-4 opacity-20" />
                            <p>Nenhuma notificação por enquanto.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`p-4 rounded-xl border transition-all ${notification.is_read ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'}`}
                                    onClick={() => markAsRead(notification.id)}
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-1 flex-shrink-0">
                                            {/* Assuming a default type if missing since AppNotification doesn't explicitly have 'type' field in types.ts but we added it in local state logic?
                                                Actually, AppNotification in types.ts DOES NOT have 'type'.
                                                I should probably add 'type' to AppNotification in types.ts or cast it here.
                                                For now, I'll assume 'info' if vague or cast as any strictly for UI.
                                            */}
                                            {getIcon((notification as any).type || 'info')}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-sm font-bold ${notification.is_read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                                                    {notification.title}
                                                </h4>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                                    {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className={`text-xs ${notification.is_read ? 'text-gray-500 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                                {notification.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {notifications.length > 0 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <Button
                            variant="outline"
                            fullWidth
                            onClick={clearAll}
                            className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Limpar Tudo
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
