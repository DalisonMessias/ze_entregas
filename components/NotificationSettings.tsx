
import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Mail, AlertCircle, ShoppingBag, Truck } from 'lucide-react';
import { Switch } from './Switch';
import { NotificationPreferences } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';

interface NotificationSettingsProps {
    onClose: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ onClose }) => {
    const [prefs, setPrefs] = useState<NotificationPreferences>({
        new_orders: true,
        order_updates: true,
        system_alerts: true,
        marketing: true,
        sound_enabled: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            const p = await cloud.getNotificationPreferences();
            setPrefs(p);
        };
        load();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            await cloud.updateNotificationPreferences(prefs);
            // Request native permission if needed
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const update = (key: keyof NotificationPreferences, val: boolean) => {
        setPrefs(p => ({ ...p, [key]: val }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="w-6 h-6 text-brand-500" /> Notificações
                    </h3>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                        <BellOff className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-bold dark:text-white">Novos Pedidos</span>
                        </div>
                        <Switch checked={prefs.new_orders} onChange={c => update('new_orders', c)} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-600 dark:text-green-400">
                                <Truck className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-bold dark:text-white">Status da Entrega</span>
                        </div>
                        <Switch checked={prefs.order_updates} onChange={c => update('order_updates', c)} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg text-red-600 dark:text-red-400">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-bold dark:text-white">Alertas do Sistema</span>
                        </div>
                        <Switch checked={prefs.system_alerts} onChange={c => update('system_alerts', c)} />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                                <Mail className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-bold dark:text-white">Novidades e Dicas</span>
                        </div>
                        <Switch checked={prefs.marketing} onChange={c => update('marketing', c)} />
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between p-3">
                            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                                {prefs.sound_enabled ? <Volume2 className="w-5 h-5"/> : <VolumeX className="w-5 h-5"/>}
                                <span className="text-sm font-bold">Sons</span>
                            </div>
                            <Switch checked={prefs.sound_enabled} onChange={c => update('sound_enabled', c)} />
                        </div>
                    </div>
                </div>

                <Button fullWidth onClick={handleSave} disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Preferências'}
                </Button>
            </div>
        </div>
    );
};
