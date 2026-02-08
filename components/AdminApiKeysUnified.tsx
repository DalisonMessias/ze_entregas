import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Bot, Map, Navigation, Save, Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Key, Shield, Activity, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { MobileTabsSelect } from './MobileTabsSelect';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';
import { ShopSettings } from '../types';
// Inicializar cliente local via cloud service
const getSupabase = () => cloud.getClient();

interface TabConfig {
    id: string;
    label: string;
    icon: React.ComponentType<any>;
}

const tabs: TabConfig[] = [
    { id: 'external', label: 'Serviços Externos', icon: Map },
    { id: 'integrations', label: 'Integrações (Lojistas)', icon: Shield },
    { id: 'logs', label: 'Auditoria & Logs', icon: Activity },
];

interface ApiKey {
    id: string;
    service_name: string;
    name?: string; // Mantido para compatibilidade se necessário
    key_token: string;
    encrypted_key?: string;
    permissions?: any; // Mantido para compatibilidade
    is_active: boolean;
    created_at: string;
    last_used_at: string | null;
    user_id: string;
    user_profiles?: {
        name: string;
        email: string;
        store_name?: string;
    } | { name: string; email: string; store_name?: string; }[];
}

interface ApiLog {
    id: string;
    endpoint: string;
    method: string;
    status_code: number;
    created_at: string;
    duration_ms: number;
    user_profiles?: {
        name: string;
    }
}

export const AdminApiKeysUnified: React.FC = () => {
    const [activeTab, setActiveTab] = useState('external');
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { alert, confirm } = useDialog();

    // Estados para gerenciamento de chaves de loja
    const [storeKeys, setStoreKeys] = useState<ApiKey[]>([]);
    const [storeLogs, setStoreLogs] = useState<ApiLog[]>([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [globalKeys, setGlobalKeys] = useState<{ [key: string]: string }>({
        google_gemini: '',
        open_route_service: '',
        eleven_labs: '',
        eleven_labs_voice_id: ''
    });


    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Carregar chaves globais da tabela api_keys
            const [gemini, ors, eleven] = await Promise.all([
                cloud.getApiKey('google_gemini'),
                cloud.getApiKey('open_route_service'),
                cloud.getApiKeyDetails('eleven_labs')
            ]);

            setGlobalKeys({
                google_gemini: gemini || '',
                open_route_service: ors || '',
                eleven_labs: eleven?.key || '',
                eleven_labs_voice_id: eleven?.voice_id || ''
            });


            const s = await cloud.getShopSettings();
            setShopSettings(s);
        } catch (error) {
            console.error("Failed to load API Keys data:", error);
            setFeedback({ type: 'error', text: 'Erro ao carregar chaves de API.' });
        } finally {
            setLoading(false);
        }
    }, []);

    const loadStoreData = async () => {
        setDataLoading(true);
        const sb = getSupabase();
        if (!sb) {
            setDataLoading(false);
            return;
        }

        try {
            if (activeTab === 'integrations') {
                const { data, error } = await sb
                    .from('api_keys')
                    .select('id, service_name, key_token, encrypted_key, is_active, created_at, last_used_at, user_id, user_profiles(name, email, store_name)')
                    .order('created_at', { ascending: false });

                if (data) setStoreKeys(data);
            } else if (activeTab === 'logs') {
                const { data, error } = await sb
                    .from('api_logs')
                    .select('*, user_profiles(name)')
                    .order('created_at', { ascending: false })
                    .limit(100);
                if (data) setStoreLogs(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (activeTab === 'integrations' || activeTab === 'logs') {
            loadStoreData();
        }
    }, [activeTab]);

    const handleSaveSettings = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            const keyUpdatePromises = [];

            if (globalKeys.google_gemini !== undefined) {
                keyUpdatePromises.push(cloud.adminUpdateApiKey('google_gemini', globalKeys.google_gemini));
            }
            if (globalKeys.open_route_service !== undefined) {
                keyUpdatePromises.push(cloud.adminUpdateApiKey('open_route_service', globalKeys.open_route_service));
            }
            if (globalKeys.eleven_labs !== undefined) {
                keyUpdatePromises.push(cloud.adminUpdateApiKey('eleven_labs', globalKeys.eleven_labs, globalKeys.eleven_labs_voice_id));
            }


            await Promise.all(keyUpdatePromises);

            setFeedback({ type: 'success', text: 'Chaves de API salvas com sucesso!' });
        } catch (e: any) {
            setFeedback({ type: 'error', text: 'Erro ao salvar chaves: ' + e.message });
        } finally {
            setSaving(false);
        }
    };

    const toggleShowKey = (key: string) => {
        setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleStatus = async (key: ApiKey) => {
        const confirmed = await confirm({ title: 'Confirmar Ação', message: `Deseja ${key.is_active ? 'desativar' : 'ativar'} esta chave?` });
        if (!confirmed) return;
        const sb = getSupabase();
        if (!sb) return;
        try {
            await sb.from('api_keys').update({ is_active: !key.is_active }).eq('id', key.id);
            loadStoreData();
        } catch (e) {
            await alert({ title: 'Erro', message: 'Erro ao atualizar' });
        }
    };

    const deleteKey = async (id: string) => {
        const confirmed = await confirm({ title: 'Atenção', message: 'Tem certeza? Isso quebrará a integração do lojista.' });
        if (!confirmed) return;
        const sb = getSupabase();
        if (!sb) return;
        try {
            await sb.from('api_keys').delete().eq('id', id);
            loadStoreData();
        } catch (e) {
            await alert({ title: 'Erro', message: 'Erro ao deletar' });
        }
    };

    const renderApiKeyInput = (id: string, label: string, placeholder: string, link: string, linkText: string, description: string) => (
        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{label}</label>
            <div className="relative mb-2">
                <input
                    type={showKeys[id] ? "text" : "password"}
                    placeholder={placeholder}
                    value={globalKeys[id] || ''}
                    onChange={e => setGlobalKeys(prev => ({ ...prev, [id]: e.target.value }))}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white pl-11 pr-12 font-mono text-sm"
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                    onClick={() => toggleShowKey(id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    {showKeys[id] ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
            </div>
            <div className="flex flex-col gap-1 px-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
                <p className="text-[10px] text-gray-400">
                    <span className="font-bold">Como obter:</span> Visite o <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{linkText}</a>, crie uma nova chave e cole-a acima.
                </p>
            </div>
        </div>
    );

    const renderExternalServicesTab = () => (
        <div className="mt-8 space-y-8">
            {/* Google Gemini AI */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <Bot className="w-6 h-6 text-blue-600" />
                    </div>
                    Zé Assistente (Google Gemini)
                </h2>
                {renderApiKeyInput(
                    'google_gemini',
                    'Chave de API do Google Gemini',
                    'AIzaSy...',
                    'https://aistudio.google.com/app/apikey',
                    'Google AI Studio',
                    'Responsável pela inteligência do Zé Assistente, permitindo que ele gere respostas para o suporte, analise catálogos e interaja com os usuários de forma humana.'
                )}
            </div>

            {/* OpenRouteService */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                        <Navigation className="w-6 h-6 text-purple-600" />
                    </div>
                    OpenRouteService (Logística)
                </h2>
                {renderApiKeyInput(
                    'open_route_service',
                    'Chave de API do ORS',
                    '5b3ce3...',
                    'https://openrouteservice.org/dev/#/home',
                    'Dashboard do ORS',
                    'Fundamental para o cálculo preciso de taxas de entrega por distância (km), otimização de rotas e navegação GPS dentro do aplicativo.'
                )}
            </div>

            {/* ElevenLabs TTS */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                        <Activity className="w-6 h-6 text-green-600" />
                    </div>
                    ElevenLabs (Vozes de IA)
                </h2>
                {renderApiKeyInput(
                    'eleven_labs',
                    'Chave de API do ElevenLabs',
                    'sk_...',
                    'https://elevenlabs.io/app/settings/api-keys',
                    'Configurações do ElevenLabs',
                    'Proporciona vozes extremamente realistas para as instruções de navegação e alertas, tornando a experiência do entregador mais profissional e fluida.'
                )}

                {/* Voice ID Input */}
                <div className="mb-6 ml-4 border-l-2 border-gray-100 pl-4 dark:border-gray-700">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">ID da Voz (Voice ID) - Opcional</label>
                    <div className="relative mb-2">
                        <input
                            type="text"
                            placeholder="Ex: 21m00Tcm4TlvDq8ikWAM (Rachel)"
                            value={globalKeys.eleven_labs_voice_id || ''}
                            onChange={e => setGlobalKeys(prev => ({ ...prev, eleven_labs_voice_id: e.target.value }))}
                            autoComplete="off"
                            spellCheck={false}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white font-mono text-sm"
                        />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        Copie o ID da voz desejada na biblioteca do ElevenLabs. Se deixar em branco, o sistema usará a voz padrão ou navegador.
                    </p>
                </div>
            </div>


            {/* Feedback and Save Button */}
            <div className="mt-8 space-y-4">
                {feedback && (
                    <div className={`p-4 mt-8 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {feedback.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        <span className="font-bold text-sm">{feedback.text}</span>
                    </div>
                )}

                <Button fullWidth onClick={handleSaveSettings} disabled={saving} className="py-4 mt-8 mb-8 text-lg shadow-lg">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Configurações</>}
                </Button>
            </div>
        </div>
    );

    const renderIntegrationsTab = () => (
        <div className="space-y-8 mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden overflow-x-auto">
                {dataLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8" /></div> : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Lojista</th>
                                <th className="px-4 py-3">Nome da Chave</th>
                                <th className="px-4 py-3">Token (Parcial)</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Último Uso</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {storeKeys.map(k => (
                                <tr key={k.id} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="px-4 py-3">
                                        <div className="font-bold dark:text-white">
                                            {Array.isArray(k.user_profiles) ? k.user_profiles[0]?.store_name || k.user_profiles[0]?.name : (k.user_profiles as any)?.store_name || (k.user_profiles as any)?.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {Array.isArray(k.user_profiles) ? k.user_profiles[0]?.email : (k.user_profiles as any)?.email}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{k.service_name}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{k.key_token.substring(0, 10)}...</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${k.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {k.is_active ? 'Ativa' : 'Inativa'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Nunca'}
                                    </td>
                                    <td className="px-4 py-3 text-right flex justify-end gap-2">
                                        <button onClick={() => toggleStatus(k)} className="text-blue-500 hover:bg-blue-50 p-2 rounded">
                                            {k.is_active ? 'Desativar' : 'Ativar'}
                                        </button>
                                        <button onClick={() => deleteKey(k.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {storeKeys.length === 0 && <tr><td colSpan={6} className="text-center p-8 text-gray-400">Nenhuma chave encontrada.</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );

    const renderLogsTab = () => (
        <div className="mt-8 bg-gray-900 text-green-400 p-4 rounded-xl font-mono text-xs h-[360px] sm:h-[480px] md:h-[600px] overflow-y-auto">
            {dataLoading ? <div className="text-center p-4"><Loader2 className="animate-spin mx-auto w-6 h-6" /></div> : (
                <>
                    {storeLogs.map(l => (
                        <div key={l.id} className="border-b border-gray-800 py-2 flex gap-4">
                            <span className="text-gray-500">[{new Date(l.created_at).toLocaleTimeString()}]</span>
                            <span className={`font-bold ${l.status_code >= 400 ? 'text-red-400' : 'text-green-400'}`}>{l.method}</span>
                            <span className="text-white">{l.endpoint}</span>
                            <span className="text-yellow-500">{l.status_code}</span>
                            <span className="text-gray-400 ml-auto">{l.duration_ms || 0}ms</span>
                        </div>
                    ))}
                    {storeLogs.length === 0 && <div className="text-center text-gray-600 mt-10">... Sem logs recentes ...</div>}
                </>
            )}
        </div>
    );

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                    <Key className="w-8 h-8 text-brand-600" />
                    Gerenciamento de Chaves de API
                </h1>
            </div>

            {/* Tab Navigation */}
            <MobileTabsSelect
                value={activeTab}
                onChange={(val) => setActiveTab(val)}
                options={tabs.map(tab => ({ value: tab.id, label: tab.label }))}
                label="Seção de API Keys"
                className="md:hidden"
            />
            <div className="hidden md:block border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8 overflow-x-auto no-scrollbar whitespace-nowrap">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === tab.id
                                    ? 'border-brand-500 text-brand-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'external' && renderExternalServicesTab()}
                {activeTab === 'integrations' && renderIntegrationsTab()}
                {activeTab === 'logs' && renderLogsTab()}
            </div>
        </div>
    );
};
