
import React, { useState, useEffect } from 'react';
import { Loader2, Power, Clock, MessageSquare, AlertTriangle, CheckCircle, Construction } from 'lucide-react';
import { Button } from './Button';
import { Switch } from './Switch';
import * as cloud from '../services/cloud';
import { MaintenanceSettings } from '../types';
import { useDialog } from '../utils/dialogService';

export const AdminMaintenance: React.FC = () => {
    const { alert } = useDialog();
    const [settings, setSettings] = useState<MaintenanceSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await cloud.getMaintenanceSettings();
                setSettings((data as any) || ({ is_active: false, start_time: '', end_time: '', message: '' } as MaintenanceSettings));
            } catch (e: any) {
                console.error("Error loading maintenance settings", e);
                await alert({ title: 'Erro de Carregamento', message: 'Erro ao carregar configurações de manutenção: ' + (e.message || 'Erro desconhecido') });
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await cloud.updateMaintenanceSettings(settings);
            await alert({ title: 'Configurações Salvas', message: 'Modo manutenção atualizado com sucesso!' });
        } catch (e: any) {
            const msg = e?.message || (typeof e === 'string' ? e : 'Erro desconhecido');
            await alert({ title: 'Erro ao Salvar', message: 'Não foi possível salvar as configurações: ' + msg });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof MaintenanceSettings, value: any) => {
        setSettings(prev => prev ? { ...prev, [field]: value } : null);
    };

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className={`p-6 rounded-2xl border transition-colors ${settings?.is_active ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <Construction className="w-6 h-6 text-orange-600" /> Modo Manutenção
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Quando ativo, bloqueia o acesso de todos os usuários (exceto admins) ao aplicativo.
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        <Switch
                            checked={settings?.is_active || false}
                            onChange={c => handleChange('is_active', c)}
                            label={settings?.is_active ? "ATIVADO" : "DESATIVADO"}
                        />
                    </div>
                </div>

                {settings?.is_active && (
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-4 rounded-xl flex items-center gap-3 mb-6 animate-pulse">
                        <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <p className="text-sm font-bold text-orange-800 dark:text-orange-200">
                            Atenção: O sistema está inacessível para usuários comuns.
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Hora de Início</label>
                            <input
                                type="time"
                                value={settings?.start_time || ''}
                                onChange={e => handleChange('start_time', e.target.value)}
                                className="w-full p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Previsão de Retorno</label>
                            <input
                                type="time"
                                value={settings?.end_time || ''}
                                onChange={e => handleChange('end_time', e.target.value)}
                                className="w-full p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Mensagem para Usuários</label>
                        <textarea
                            value={settings?.message || ''}
                            onChange={e => handleChange('message', e.target.value)}
                            rows={3}
                            className="w-full p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none resize-none"
                            placeholder="Ex: Estamos atualizando o banco de dados..."
                        />
                    </div>
                </div>


                <Button fullWidth onClick={handleSave} disabled={saving} className="mt-6 py-4 text-lg shadow-lg">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Power className="w-5 h-5 mr-2" /> Salvar Configurações</>}
                </Button>
            </div>
        </div>
    );
};