import React, { useState, useEffect } from 'react';
import { Loader2, Bot, Save, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { ShopSettings } from '../types';

export const AdminAIConfig: React.FC = () => {
    const [apiKey, setApiKey] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            try {
                const settings = await cloud.getShopSettings();
                setApiKey(settings?.google_gemini_api_key || '');
            } catch (e) {
                console.error("Error loading AI settings:", e);
                setFeedback({ type: 'error', text: 'Erro ao carregar configurações de IA.' });
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, []);

    const handleSaveApiKey = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            await cloud.adminUpdateApiKey('google_gemini', apiKey);
            setFeedback({ type: 'success', text: 'Chave de API do Gemini salva com sucesso!' });
        } catch (e: any) {
            setFeedback({ type: 'error', text: 'Erro ao salvar chave de API: ' + e.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Bot className="w-6 h-6 text-brand-600" /> Configuração de IA
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Integre o assistente virtual Gemini no aplicativo. Sua chave de API é crucial.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chave de API do Google Gemini</label>
                        <div className="relative">
                            <input 
                                type={showApiKey ? "text" : "password"} 
                                placeholder="YOUR_GEMINI_API_KEY" 
                                value={apiKey} 
                                onChange={e => setApiKey(e.target.value)} 
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white pl-11 pr-12 font-mono text-sm" 
                            />
                            <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <button 
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                {showApiKey ? <Eye className="w-5 h-5"/> : <EyeOff className="w-5 h-5"/>}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 ml-1">Obtenha sua chave em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">Google AI Studio</a>.</p>
                    </div>
                </div>
                
                {feedback && (
                    <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {feedback.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                        <span className="font-bold text-sm">{feedback.text}</span>
                    </div>
                )}

                <Button fullWidth onClick={handleSaveApiKey} disabled={saving} className="mt-6 py-4 text-lg shadow-lg">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin"/> : <><Save className="w-5 h-5 mr-2"/> Salvar Chave</>}
                </Button>
            </div>
        </div>
    );
};