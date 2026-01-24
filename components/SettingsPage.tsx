import React, { useState, useEffect } from 'react';
import { Bell, ChevronLeft, Volume2, VolumeX, Mail, AlertCircle, ShoppingBag, Truck } from 'lucide-react';
import { Switch } from './Switch';
import { NotificationPreferences, UserRole } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';

interface SettingsPageProps {
    onBack: () => void;
    userRole?: UserRole;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, userRole }) => {
    const { alert } = useDialog();
    const [prefs, setPrefs] = useState<NotificationPreferences>({
        new_orders: true,
        order_updates: true,
        system_alerts: true,
        marketing: true,
        sound_enabled: true
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLoading(true);
        cloud.getNotificationPreferences().then(p => {
            if (p) setPrefs(p);
        }).catch(err => {
            // console.error("Failed to load settings", err);
            alert({ title: "Erro", message: "Não foi possível carregar suas configurações." });
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await cloud.updateNotificationPreferences(prefs);
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }
            await alert({ title: "Sucesso", message: "Configurações salvas!" });
        } catch (e) {
            // console.error(e);
            alert({ title: "Erro", message: "Não foi possível salvar suas configurações." });
        } finally {
            setIsSaving(false);
        }
    };

    const update = (key: keyof NotificationPreferences, val: boolean) => {
        setPrefs(p => ({ ...p, [key]: val }));
    };

    if (loading) {
        return (
            <div className="text-center p-10">
                <p className="text-gray-500">Carregando configurações...</p>
            </div>
        );
    }

    const isPartner = userRole === 'store_partner' || userRole === 'delivery_partner' || userRole === 'delivery_person';

    return (
        <div className="space-y-6 animate-in fade-in pb-24">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">Configurações</h2>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Bell className="w-5 h-5 text-brand-500" /> Preferências de Notificação
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Escolha quais notificações você quer receber no app.</p>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {/* Apenas parceiros veem opção de "Novos Pedidos" (tocar quando chegar pedido) */}
                    {isPartner && (
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <ShoppingBag className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-medium dark:text-white">Alertas de Novos Pedidos</span>
                            </div>
                            <Switch checked={prefs.new_orders} onChange={c => update('new_orders', c)} />
                        </div>
                    )}

                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <Truck className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium dark:text-white">Atualizações do Pedido</span>
                        </div>
                        <Switch checked={prefs.order_updates} onChange={c => update('order_updates', c)} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <AlertCircle className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium dark:text-white">Alertas do Sistema</span>
                        </div>
                        <Switch checked={prefs.system_alerts} onChange={c => update('system_alerts', c)} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <span className="text-sm font-medium dark:text-white">Novidades e Dicas</span>
                        </div>
                        <Switch checked={prefs.marketing} onChange={c => update('marketing', c)} />
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-4">
                            {prefs.sound_enabled ? <Volume2 className="w-5 h-5 text-gray-400" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
                            <span className="text-sm font-medium dark:text-white">Sons do App</span>
                        </div>
                        <Switch checked={prefs.sound_enabled} onChange={c => update('sound_enabled', c)} />
                    </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
                    <Button fullWidth size="lg" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </div>

            <button onClick={onBack} className="w-full text-center text-sm font-bold text-gray-500 hover:text-brand-600 p-4">
                Voltar
            </button>
        </div>
    );
};
