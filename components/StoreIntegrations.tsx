import React, { useState, useEffect } from 'react';
import { Link2, Copy, Check, Eye, EyeOff, Loader2, Info } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Button } from './Button';

export const StoreIntegrations: React.FC = () => {
    const [userId, setUserId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [showKey, setShowKey] = useState(false);
    const [apiKey, setApiKey] = useState('sk_store_placeholder_key_...'); // Placeholder for now or fetch real key if implemented
    const [copiedField, setCopiedField] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const user = await cloud.getClient()?.auth.getUser();
                if (user?.data.user) {
                    setUserId(user.data.user.id);
                    // In a real scenario, fetch a dedicated API key for the store
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600"/></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                    <Link2 className="w-6 h-6 text-blue-600" /> Integrações (API)
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Dados para conectar seu sistema de PDV ou e-commerce ao Zé Entregas.
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3 mb-6">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"/>
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        Use estas credenciais para automatizar a criação de pedidos. Consulte a <a href="#" className="underline font-bold">documentação da API</a>.
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">ID da Loja (Store ID)</label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <input type="text" readOnly value={userId} className="flex-1 bg-transparent text-sm text-gray-700 dark:text-white outline-none font-mono" />
                            <button onClick={() => copyToClipboard(userId, 'id')}>
                                {copiedField === 'id' ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4 text-gray-400"/>}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Chave de API (Secret Key)</label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <input 
                                type={showKey ? "text" : "password"} 
                                readOnly 
                                value={apiKey} 
                                className="flex-1 bg-transparent text-sm text-gray-700 dark:text-white outline-none font-mono" 
                            />
                            <button onClick={() => setShowKey(!showKey)} className="text-gray-400 hover:text-gray-600">
                                {showKey ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                            </button>
                            <button onClick={() => copyToClipboard(apiKey, 'key')}>
                                {copiedField === 'key' ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4 text-gray-400"/>}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Mantenha esta chave secreta. Não compartilhe publicamente.</p>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <Button variant="outline" fullWidth>Gerar Nova Chave</Button>
                </div>
            </div>
        </div>
    );
};