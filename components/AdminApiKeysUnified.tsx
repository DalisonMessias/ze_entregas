import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Bot, Map, Save, Lock, Eye, EyeOff, CheckCircle, AlertTriangle, Key, Settings } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { ShopSettings } from '../types';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

const tabs: TabConfig[] = [
  { id: 'external', label: 'Serviços Externos', icon: Map },
];

export const AdminApiKeysUnified: React.FC = () => {
    const [activeTab, setActiveTab] = useState('external');
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({});
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const s = await cloud.getShopSettings();
            setShopSettings(s || {
                id: 'shop',
                google_gemini_api_key: '',
                open_route_service_api_key: '',
                asaas_api_key: '',
                asaas_webhook_token: '',
            });
        } catch (error) {
            console.error("Failed to load API Keys data:", error);
            setFeedback({ type: 'error', text: 'Erro ao carregar chaves de API.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSaveSettings = async () => {
        setSaving(true);
        setFeedback(null);
        if (!shopSettings) return;

        try {
            const keyUpdatePromises = [];
            
            if (shopSettings.google_gemini_api_key !== undefined) {
                keyUpdatePromises.push(cloud.adminUpdateApiKey('google_gemini', shopSettings.google_gemini_api_key));
            }
            if (shopSettings.open_route_service_api_key !== undefined) {
                keyUpdatePromises.push(cloud.adminUpdateApiKey('open_route_service', shopSettings.open_route_service_api_key));
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
    
    const renderApiKeyInput = (id: keyof ShopSettings, label: string, placeholder: string, link: string, linkText: string) => (
        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{label}</label>
            <div className="relative">
                <input 
                    type={showKeys[id] ? "text" : "password"} 
                    placeholder={placeholder}
                    value={typeof shopSettings?.[id] === 'string' ? (shopSettings?.[id] as string) : ''} 
                    onChange={e => setShopSettings(s => s ? { ...s, [id]: e.target.value } : null)} 
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white pl-11 pr-12 font-mono text-sm" 
                />
                <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <button 
                    onClick={() => toggleShowKey(id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    {showKeys[id] ? <Eye className="w-5 h-5"/> : <EyeOff className="w-5 h-5"/>}
                </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 ml-1">Obtenha sua chave em <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{linkText}</a>.</p>
        </div>
    );

    const renderExternalServicesTab = () => (
        <div className="space-y-6">
            {/* Google Gemini AI */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Bot className="w-6 h-6 text-brand-600" /> Zé Assistente (Google Gemini)
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Integre o assistente virtual Gemini no aplicativo.</p>
                {renderApiKeyInput('google_gemini_api_key', 'Chave de API do Google Gemini', 'YOUR_GEMINI_API_KEY', 'https://aistudio.google.com/app/apikey', 'Google AI Studio')}
            </div>

            {/* OpenRouteService */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Map className="w-6 h-6 text-brand-600" /> Otimização de Rotas (OpenRouteService)
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Integre a otimização de rotas com OpenRouteService.</p>
                {renderApiKeyInput('open_route_service_api_key', 'Chave de API do OpenRouteService', 'YOUR_ORS_API_KEY', 'https://openrouteservice.org/dev/#/login', 'OpenRouteService Dashboard')}
            </div>
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
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                                    activeTab === tab.id
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
                {/* Asaas config movida para página dedicada */}
            </div>

            {/* Feedback and Save Button */}
            <div className="mt-8 space-y-4">
                {feedback && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {feedback.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                        <span className="font-bold text-sm">{feedback.text}</span>
                    </div>
                )}

                <Button fullWidth onClick={handleSaveSettings} disabled={saving} className="py-4 text-lg shadow-lg">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin"/> : <><Save className="w-5 h-5 mr-2"/> Salvar Configurações</>}
                </Button>
            </div>
        </div>
    );
};
