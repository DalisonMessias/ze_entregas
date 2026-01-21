import React, { useState, useEffect } from 'react';
import { Loader2, Map, Save, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

export const AdminRoutingConfig: React.FC = () => {
    const { alert } = useDialog();
    const [apiKey, setApiKey] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            setLoading(true);
            try {
                // Now fetching from api_keys table
                const key = await cloud.getApiKey('open_route_service');
                setApiKey(key || '');
            } catch (e: any) {
                console.error("Error loading routing settings:", e);
                await alert({ title: 'Erro de Carregamento', message: 'Erro ao carregar configurações de roteamento: ' + (e.message || 'Erro desconhecido') });
            } finally {
                setLoading(false);
            }
        };
        loadSettings();
    }, [alert]);

    const handleSaveApiKey = async () => {
        setSaving(true);
        try {
            await cloud.adminUpdateApiKey('open_route_service', apiKey);
            await alert({ title: 'Configurações Salvas', message: 'Chave de API do OpenRouteService salva com sucesso!' });
        } catch (e: any) {
            console.error(e);
            await alert({ title: 'Erro ao Salvar', message: 'Erro ao salvar chave de API: ' + (e.message || 'Erro desconhecido') });
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
                    <Map className="w-6 h-6 text-brand-600" /> Configuração de Roteamento
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Integre a otimização de rotas com OpenRouteService.</p>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Chave de API do OpenRouteService</label>
                        <div className="relative">
                            <input
                                type={showApiKey ? "text" : "password"}
                                placeholder="YOUR_ORS_API_KEY"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white pl-11 pr-12 font-mono text-sm"
                            />
                            <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                {showApiKey ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 ml-1">Obtenha sua chave em <a href="https://openrouteservice.org/dev/#/login" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">OpenRouteService Dashboard</a>.</p>
                    </div>
                </div>


                <Button fullWidth onClick={handleSaveApiKey} disabled={saving} className="mt-6 py-4 text-lg shadow-lg">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Chave</>}
                </Button>
            </div>
        </div>
    );
};
