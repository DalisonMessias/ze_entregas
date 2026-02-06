
import React, { useState, useEffect } from 'react';
import { Navigation, Image as ImageIcon, Volume2, Save, Loader2, CheckCircle, AlertTriangle, Car, Bike, Info } from 'lucide-react';
import { Button } from './Button';
import { Switch } from './Switch';
import { MobileTabsSelect } from './MobileTabsSelect';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import { ShopSettings } from '../types';

interface NavIcon {
    vehicle_type: 'car' | 'moto' | 'bike';
    icon_url: string;
    is_active: boolean;
}

export const AdminNavigationConfig: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'icons' | 'audio'>('icons');
    const [icons, setIcons] = useState<NavIcon[]>([]);
    const [settings, setSettings] = useState<ShopSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { alert } = useDialog();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [iconsData, shopData] = await Promise.all([
                cloud.getNavigationIcons(),
                cloud.getShopSettings()
            ]);

            // Garantir que temos os 3 tipos representados
            const types: ('car' | 'moto' | 'bike')[] = ['car', 'moto', 'bike'];
            const normalizedIcons = types.map(t => {
                const existing = iconsData.find(i => i.vehicle_type === t);
                return existing || { vehicle_type: t, icon_url: '', is_active: true };
            });

            setIcons(normalizedIcons as NavIcon[]);
            setSettings(shopData);
        } catch (error) {
            console.error("Error loading navigation config:", error);
            setFeedback({ type: 'error', text: 'Erro ao carregar configurações.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveIcons = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            await Promise.all(icons.map(icon =>
                cloud.adminManageNavigationIcon(icon.vehicle_type, icon.icon_url, icon.is_active)
            ));
            setFeedback({ type: 'success', text: 'Ícones salvos com sucesso!' });
        } catch (error: any) {
            setFeedback({ type: 'error', text: 'Erro ao salvar ícones: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAudio = async () => {
        setSaving(true);
        setFeedback(null);
        if (!settings) return;
        try {
            await cloud.adminUpdateNavigationSettings({
                voice_id: settings.navigation_voice_id,
                voice_enabled: settings.navigation_voice_enabled
            });
            setFeedback({ type: 'success', text: 'Configurações de áudio salvas!' });
        } catch (error: any) {
            setFeedback({ type: 'error', text: 'Erro ao salvar áudio: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const updateIconUrl = (type: string, url: string) => {
        setIcons(prev => prev.map(i => i.vehicle_type === type ? { ...i, icon_url: url } : i));
    };

    const toggleIconActive = (type: string, active: boolean) => {
        setIcons(prev => prev.map(i => i.vehicle_type === type ? { ...i, is_active: active } : i));
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-50 dark:bg-brand-900/30 rounded-2xl">
                    <Navigation className="w-8 h-8 text-brand-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Configurações de Navegação</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie ícones de veículos e áudio do GPS.</p>
                </div>
            </div>

            <MobileTabsSelect
                value={activeTab}
                onChange={(val) => setActiveTab(val as any)}
                options={[
                    { value: 'icons', label: 'Ícones de Veículos' },
                    { value: 'audio', label: 'Áudios & ElevenLabs' }
                ]}
                label="Seção"
                className="md:hidden"
            />

            <div className="hidden md:flex gap-4 border-b border-gray-100 dark:border-gray-800">
                <button
                    onClick={() => setActiveTab('icons')}
                    className={`pb-4 px-2 font-bold text-sm transition-all border-b-2 ${activeTab === 'icons' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-400'}`}
                >
                    Ícones de Veículos
                </button>
                <button
                    onClick={() => setActiveTab('audio')}
                    className={`pb-4 px-2 font-bold text-sm transition-all border-b-2 ${activeTab === 'audio' ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-400'}`}
                >
                    Áudios & ElevenLabs
                </button>
            </div>

            <div className="space-y-6">
                {activeTab === 'icons' ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {icons.map(icon => (
                                <div key={icon.vehicle_type} className="bg-white dark:bg-gray-800 p-6 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {icon.vehicle_type === 'car' && <Car className="w-5 h-5 text-blue-500" />}
                                            {icon.vehicle_type === 'moto' && <Navigation className="w-5 h-5 text-orange-500" />}
                                            {icon.vehicle_type === 'bike' && <Bike className="w-5 h-5 text-green-500" />}
                                            <span className="font-bold capitalize dark:text-white">
                                                {icon.vehicle_type === 'moto' ? 'Moto' : icon.vehicle_type === 'car' ? 'Carro' : 'Bicicleta'}
                                            </span>
                                        </div>
                                        <Switch
                                            checked={icon.is_active}
                                            onChange={(val) => toggleIconActive(icon.vehicle_type, val)}
                                        />
                                    </div>

                                    <div className="aspect-square bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700">
                                        {icon.icon_url ? (
                                            <img src={icon.icon_url} alt={icon.vehicle_type} className="w-20 h-20 object-contain" />
                                        ) : (
                                            <ImageIcon className="w-12 h-12 text-gray-300" />
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">URL do Ícone (PNG/SVG)</label>
                                        <input
                                            type="text"
                                            value={icon.icon_url}
                                            onChange={(e) => updateIconUrl(icon.vehicle_type, e.target.value)}
                                            placeholder="https://exemplo.com/icone.png"
                                            className="w-full mt-1 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button fullWidth onClick={handleSaveIcons} disabled={saving}>
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar Ícones</>}
                        </Button>
                    </div>
                ) : (
                    <div className="max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-[40px] border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
                        <div className="flex items-center justify-between p-4 bg-brand-50 dark:bg-brand-900/20 rounded-3xl">
                            <div className="flex items-center gap-3">
                                <Volume2 className="w-6 h-6 text-brand-600" />
                                <div>
                                    <h3 className="font-bold dark:text-white">Voz de Instruções (TTS)</h3>
                                    <p className="text-xs text-gray-500">ElevenLabs Voz Narrada</p>
                                </div>
                            </div>
                            <Switch
                                checked={settings?.navigation_voice_enabled || false}
                                onChange={(val) => setSettings(s => s ? { ...s, navigation_voice_enabled: val } : null)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-3xl">
                            <div className="flex items-center gap-3">
                                <Volume2 className="w-6 h-6 text-blue-600" />
                                <div>
                                    <h3 className="font-bold dark:text-white">Efeitos de Navegação</h3>
                                    <p className="text-xs text-gray-500">Alertas e Beeps de manobra</p>
                                </div>
                            </div>
                            <Switch
                                checked={settings?.navigation_sounds_enabled !== false}
                                onChange={(val) => setSettings(s => s ? { ...s, navigation_sounds_enabled: val } : null)}
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Voice ID (Rachel default: 21m00Tcm4lfs74u9DeyB)</label>
                                <input
                                    type="text"
                                    value={settings?.navigation_voice_id || ''}
                                    onChange={(e) => setSettings(s => s ? { ...s, navigation_voice_id: e.target.value } : null)}
                                    placeholder="Voice ID do ElevenLabs"
                                    className="w-full mt-1 p-4 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white font-mono"
                                />
                            </div>

                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex gap-3">
                                <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                    A chave de API do ElevenLabs e outras chaves globais agora são gerenciadas centralizadamente em
                                    <span className="font-bold"> /admin/api-keys</span>.
                                </p>
                            </div>
                        </div>

                        <Button
                            fullWidth
                            onClick={async () => {
                                setSaving(true);
                                setFeedback(null);
                                if (!settings) return;
                                try {
                                    await cloud.adminUpdateNavigationSettings({
                                        voice_id: settings.navigation_voice_id,
                                        voice_enabled: settings.navigation_voice_enabled,
                                        sounds_enabled: settings.navigation_sounds_enabled
                                    });
                                    setFeedback({ type: 'success', text: 'Configurações de áudio salvas!' });
                                } catch (error: any) {
                                    setFeedback({ type: 'error', text: 'Erro ao salvar áudio: ' + error.message });
                                } finally {
                                    setSaving(false);
                                }
                            }}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar Configurações de Áudio</>}
                        </Button>
                    </div>
                )}

                {feedback && (
                    <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
                        {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        <span className="font-bold text-sm">{feedback.text}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
