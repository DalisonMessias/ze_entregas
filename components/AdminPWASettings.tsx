import React, { useState, useEffect } from 'react';
import { Loader2, Smartphone, Save, CheckCircle, AlertTriangle, Upload, Plus, Trash2, Image as ImageIcon, Layout, Settings, List } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { PWASettings, PWAIcon, PWAScreenshot, PWAShortcut } from '../types';
import { getClient } from '../services/cloud';

export const AdminPWASettings: React.FC = () => {
    const [settings, setSettings] = useState<PWASettings>({} as PWASettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'icons' | 'advanced'>('general');

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            try {
                const data = await cloud.adminGetPWASettings();
                // console.log("loadSettings: Fetched data from DB:", data);
                setSettings(data || ({} as PWASettings));
            } catch (e) {
                console.error("Error loading PWA settings:", e);
                setFeedback({ type: 'error', text: 'Erro ao carregar configurações do PWA.' });
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleChange = (field: keyof PWASettings, value: any) => {
        setSettings(prev => {
            const newSettings = prev ? { ...prev, [field]: value } : {} as PWASettings;
            // Sincroniza name legado com display_name para evitar quebras
            if (field === 'display_name') {
                newSettings.name = value;
            }
            return newSettings;
        });
    };

    const handleSaveSettings = async () => {
        if (!settings) {
            console.warn("handleSaveSettings: Settings is null");
            return;
        }
        console.log("handleSaveSettings: Starting save...", settings);
        setSaving(true);
        setFeedback(null);
        try {
            await cloud.adminUpdatePWASettings(settings);
            console.log("handleSaveSettings: Save completed.");
            setFeedback({ type: 'success', text: 'Configurações do PWA salvas com sucesso! As alterações serão aplicadas automaticamente aos dispositivos.' });

            // Força atualização local também para o admin ver
            const event = new Event('pwa-settings-changed');
            window.dispatchEvent(event);

        } catch (e: any) {
            console.error("handleSaveSettings: Error saving:", e);
            setFeedback({ type: 'error', text: 'Erro ao salvar configurações do PWA: ' + (e.message || JSON.stringify(e)) });
        } finally {
            setSaving(false);
        }
    };

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'screenshot' | 'splash', index?: number) => {
        const file = event.target.files?.[0];
        if (!file || !settings) return;

        console.log(`handleUpload: Uploading ${type}...`, file.name);

        try {
            // Usando lógica de upload existente no cloud.ts ou improvisando upload para 'avatars/pwa'
            const sb = getClient();
            if (!sb) throw new Error("Cliente Supabase não disponível");

            const fileExt = file.name.split('.').pop();
            // Sanitize filename
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `pwa/${type}-${Date.now()}-${cleanFileName}.${fileExt}`;

            console.log("handleUpload: Target path:", fileName);

            const { error: uploadError, data } = await sb.storage
                .from('avatars') // Usando bucket existente 'avatars' como fallback
                .upload(fileName, file, { upsert: true });

            if (uploadError) {
                console.error("handleUpload: Storage upload error:", uploadError);
                throw uploadError;
            }

            const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(fileName);
            console.log("handleUpload: Public URL:", publicUrl);

            // Logica específica por tipo
            if (type === 'icon') {
                const newIcons = [...(settings.icons || [])];
                const newIcon = { src: publicUrl, sizes: '512x512', type: file.type }; // Default
                if (index !== undefined && index < newIcons.length) {
                    newIcons[index] = { ...newIcons[index], src: publicUrl };
                } else {
                    newIcons.push(newIcon);
                }
                handleChange('icons', newIcons);
            } else if (type === 'screenshot') {
                const newScreenshots = [...(settings.screenshots || [])];
                const newShot = { src: publicUrl, sizes: '1080x1920', type: file.type, form_factor: 'narrow' as const };
                newScreenshots.push(newShot);
                handleChange('screenshots', newScreenshots);
            }

        } catch (error: any) {
            console.error("Upload failed", error);
            alert(`Falha no upload: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const addShortcut = () => {
        const newShortcuts = [...(settings?.shortcuts || [])];
        newShortcuts.push({ name: 'Novo Atalho', url: '/', icons: [] });
        handleChange('shortcuts', newShortcuts);
    };

    const updateShortcut = (index: number, field: keyof PWAShortcut, value: any) => {
        const newShortcuts = [...(settings?.shortcuts || [])];
        newShortcuts[index] = { ...newShortcuts[index], [field]: value };
        handleChange('shortcuts', newShortcuts);
    };

    const removeShortcut = (index: number) => {
        const newShortcuts = filteredList(settings?.shortcuts, index);
        handleChange('shortcuts', newShortcuts);
    };

    const filteredList = (list: any[] | undefined, indexToRemove: number) => {
        return (list || []).filter((_, i) => i !== indexToRemove);
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
    }

    const tabs = [
        { id: 'general', label: 'Geral', icon: Settings },
        { id: 'appearance', label: 'Aparência', icon: Layout },
        { id: 'icons', label: 'Ícones & Imagens', icon: ImageIcon },
        { id: 'advanced', label: 'Avançado', icon: List },
    ];

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            <Smartphone className="w-6 h-6 text-brand-600" /> Personalização Total PWA
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Controle completo do aplicativo, atualizado em tempo real para os usuários.</p>
                    </div>
                    <Button onClick={handleSaveSettings} disabled={saving} className="py-2 px-6 shadow-lg whitespace-nowrap">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Tudo</>}
                    </Button>
                </div>

                {/* Tabs */}
                <MobileTabsSelect
                    value={activeTab}
                    onChange={(val) => setActiveTab(val as 'general' | 'appearance' | 'icons' | 'advanced')}
                    options={tabs.map(tab => ({ value: tab.id, label: tab.label }))}
                    label="Seção de PWA"
                    className="md:hidden"
                />
                <div className="hidden md:flex gap-2 overflow-x-auto pb-2 mb-6 border-b border-gray-100 dark:border-gray-700">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-brand-600 text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-6">
                    {/* --- GENERAL TAB --- */}
                    {activeTab === 'general' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do App (Display Name)</label>
                                <input type="text" value={settings?.display_name || ''} onChange={e => handleChange('display_name', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                                <p className="text-xs text-gray-400 mt-1">Nome exibido na tela inicial e splash screen.</p>
                            </div>
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Curto (Short Name)</label>
                                <input type="text" value={settings?.short_name || ''} onChange={e => handleChange('short_name', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                                <p className="text-xs text-gray-400 mt-1">Usado onde o espaço é limitado (ex: ícone do app).</p>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição</label>
                                <textarea rows={3} value={settings?.description || ''} onChange={e => handleChange('description', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">URL Inicial (Start URL)</label>
                                <input type="text" value={settings?.start_url || '/'} onChange={e => handleChange('start_url', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Escopo (Scope)</label>
                                <input type="text" value={settings?.scope || '/'} onChange={e => handleChange('scope', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Idioma (Language)</label>
                                <input type="text" value={settings?.language || 'pt-BR'} onChange={e => handleChange('language', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Versão (App Version)</label>
                                <input type="number" value={settings?.app_version || 1} onChange={e => handleChange('app_version', Number(e.target.value))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                        </div>
                    )}

                    {/* --- APPEARANCE TAB --- */}
                    {activeTab === 'appearance' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cor do Tema (Theme Color)</label>
                                <div className="flex gap-2">
                                    <input type="color" value={settings?.theme_color || '#ED2B05'} onChange={e => handleChange('theme_color', e.target.value)} className="h-12 w-20 p-1 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer" />
                                    <input type="text" value={settings?.theme_color || '#ED2B05'} onChange={e => handleChange('theme_color', e.target.value)} className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 uppercase" />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Cor da barra de ferramentas do navegador/app.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cor de Fundo (Background Color)</label>
                                <div className="flex gap-2">
                                    <input type="color" value={settings?.background_color || '#F9FAFB'} onChange={e => handleChange('background_color', e.target.value)} className="h-12 w-20 p-1 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 cursor-pointer" />
                                    <input type="text" value={settings?.background_color || '#F9FAFB'} onChange={e => handleChange('background_color', e.target.value)} className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 uppercase" />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Cor exibida enquanto o app carrega (splash screen).</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Modo de Exibição (Display)</label>
                                <select value={settings?.display || 'standalone'} onChange={e => handleChange('display', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <option value="standalone">Standalone (App Nativo)</option>
                                    <option value="fullscreen">Fullscreen (Tela Cheia)</option>
                                    <option value="minimal-ui">Minimal UI</option>
                                    <option value="browser">Browser (Navegador)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Orientação</label>
                                <select value={settings?.orientation || 'portrait'} onChange={e => handleChange('orientation', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                                    <option value="any">Qualquer</option>
                                    <option value="portrait">Retrato (Vertical)</option>
                                    <option value="landscape">Paisagem (Horizontal)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cor da Barra de Status</label>
                                <input type="text" placeholder="Ex: #000000" value={settings?.status_bar_color || ''} onChange={e => handleChange('status_bar_color', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                        </div>
                    )}

                    {/* --- ICONS TAB --- */}
                    {activeTab === 'icons' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4">
                            {/* Icons List */}
                            <div>
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">Ícones do App <span className="text-xs font-normal text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">Automático</span></h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {(settings?.icons || []).map((icon, idx) => (
                                        <div key={idx} className="relative group border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                                            <img src={icon.src} alt="icon" className="w-16 h-16 object-contain" />
                                            <div className="text-xs text-center">
                                                <p className="font-bold">{icon.sizes}</p>
                                                <p className="text-gray-400">{icon.type}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const newIcons = filteredList(settings?.icons, idx);
                                                    handleChange('icons', newIcons);
                                                }}
                                                className="absolute top-2 right-2 p-1 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors h-32">
                                        <Upload className="w-6 h-6 text-gray-400" />
                                        <span className="text-xs text-gray-500 font-bold">Adicionar Ícone</span>
                                        <input type="file" className="hidden" accept="image/png,image/jpeg" onChange={e => handleUpload(e, 'icon')} />
                                    </label>
                                </div>
                                <div className="mt-2 text-xs text-gray-400">Recomendado: 192x192 e 512x512 (PNG).</div>
                            </div>

                            {/* Screenshots List */}
                            <div>
                                <h3 className="font-bold text-lg mb-4">Screenshots (Loja de Apps)</h3>
                                <div className="flex gap-4 overflow-x-auto pb-4">
                                    {(settings?.screenshots || []).map((shot, idx) => (
                                        <div key={idx} className="relative group border border-gray-200 dark:border-gray-700 rounded-xl min-w-[150px] w-[150px] aspect-[9/16] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                            <img src={shot.src} alt="screenshot" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => {
                                                    const newShots = filteredList(settings?.screenshots, idx);
                                                    handleChange('screenshots', newShots);
                                                }}
                                                className="absolute top-2 right-2 p-1 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl min-w-[150px] w-[150px] aspect-[9/16] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors">
                                        <Upload className="w-6 h-6 text-gray-400" />
                                        <span className="text-xs text-gray-500 font-bold text-center px-2">Adicionar Screenshot</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'screenshot')} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- ADVANCED TAB --- */}
                    {activeTab === 'advanced' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div>
                                <h3 className="font-bold text-lg mb-4">Categorias</h3>
                                <input
                                    type="text"
                                    placeholder="Ex: business, productivity, social (separados por vírgula)"
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                                    value={(settings?.categories || []).join(', ')}
                                    onChange={e => handleChange('categories', e.target.value.split(',').map(s => s.trim()))}
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-lg">Atalhos (Shortcuts)</h3>
                                    <Button size="sm" onClick={addShortcut}><Plus className="w-4 h-4 mr-1" /> Novo</Button>
                                </div>
                                <div className="space-y-3">
                                    {(settings?.shortcuts || []).map((sc, idx) => (
                                        <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex gap-4 items-start">
                                            <div className="flex-1 grid grid-cols-2 gap-4">
                                                <input type="text" placeholder="Nome do Atalho" value={sc.name} onChange={e => updateShortcut(idx, 'name', e.target.value)} className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm" />
                                                <input type="text" placeholder="URL (/atalho)" value={sc.url} onChange={e => updateShortcut(idx, 'url', e.target.value)} className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm" />
                                                <input type="text" placeholder="Descrição" value={sc.description || ''} onChange={e => updateShortcut(idx, 'description', e.target.value)} className="col-span-2 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm" />
                                            </div>
                                            <button onClick={() => removeShortcut(idx)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                    {(settings?.shortcuts?.length === 0) && <p className="text-sm text-gray-400 italic">Nenhum atalho definido.</p>}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-lg mb-4">Relacionados (Related Applications)</h3>
                                <div className="flex items-center gap-2 mb-2">
                                    <input type="checkbox" checked={settings?.prefer_related_applications || false} onChange={e => handleChange('prefer_related_applications', e.target.checked)} id="prefer_related" className="rounded text-brand-600 focus:ring-brand-500" />
                                    <label htmlFor="prefer_related" className="text-sm font-medium">Preferir apps nativos se instalados</label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {feedback && (
                    <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        <span className="font-bold text-sm">{feedback.text}</span>
                    </div>
                )}
            </div>
        </div>
    );
};