import React, { useState, useEffect } from 'react';
import { Link2, Copy, Check, Eye, EyeOff, Loader2, Info, RefreshCw, FileText } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Button } from './Button';
// Usar cliente do serviço cloud
const getSupabase = () => cloud.getClient();

interface StoreIntegrationsProps {
    onNavigate?: (tab: string) => void;
}

export const StoreIntegrations: React.FC<StoreIntegrationsProps> = ({ onNavigate }) => {
    const [userId, setUserId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [showKey, setShowKey] = useState(false);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [keyId, setKeyId] = useState<string | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [generating, setGenerating] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const user = await cloud.getClient()?.auth.getUser();
                if (user?.data.user) {
                    setUserId(user.data.user.id);
                    await fetchKey(user.data.user.id);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const fetchKey = async (uid: string) => {
        const sb = getSupabase();
        if (!sb) return;

        const { data, error } = await sb
            .from('api_keys')
            .select('*')
            .eq('user_id', uid)
            .eq('is_active', true)
            .order('created_at', { ascending: false }) // Pegar a mais recente
            .limit(1)
            .single();

        if (data) {
            setApiKey(data.key_token);
            setKeyId(data.id);
        } else {
            setApiKey(null);
        }
    };

    const generateKey = async () => {
        // Se já tem chave e não confirmou ainda
        if (apiKey && !showConfirm) {
            setShowConfirm(true);
            // Resetar confirmação após 3 segundos se não clicar
            setTimeout(() => setShowConfirm(false), 3000);
            return;
        }

        setShowConfirm(false);
        setGenerating(true);
        try {
            const sb = getSupabase();
            if (!sb) return;

            // Gerar nova chave
            const newKey = `sk_${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}`;

            // Usar UPSERT agora que temos a constraint correta no banco
            // Isso atualiza a chave existente ou cria uma nova
            const { data, error } = await sb.from('api_keys').upsert({
                user_id: userId,
                name: 'Chave Padrão',
                service_name: `store_integration_${userId}`,
                key_token: newKey,
                encrypted_key: newKey,
                is_active: true, // Sempre ativa ao gerar/regenerar
                permissions: { all: true }
            }, {
                onConflict: 'user_id, service_name'
            }).select().single();

            if (error) throw error;

            if (data) {
                setApiKey(data.key_token);
                setKeyId(data.id);
            }
        } catch (e: any) {
            console.error("Erro detalhado ao gerar chave:", e);
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;

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
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                            Use estas credenciais para automatizar a criação de pedidos.
                        </p>
                        <button
                            onClick={() => onNavigate?.('store_api_docs')}
                            className="flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline"
                        >
                            <FileText className="w-3 h-3" />
                            Ver Documentação da API
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">ID da Loja (Store ID)</label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <input type="text" readOnly value={userId} className="flex-1 bg-transparent text-sm text-gray-700 dark:text-white outline-none font-mono" />
                            <button onClick={() => copyToClipboard(userId, 'id')}>
                                {copiedField === 'id' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Chave de API (Secret Key)</label>
                        {apiKey ? (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                <input
                                    type={showKey ? "text" : "password"}
                                    readOnly
                                    value={apiKey}
                                    className="flex-1 bg-transparent text-sm text-gray-700 dark:text-white outline-none font-mono"
                                />
                                <button onClick={() => setShowKey(!showKey)} className="text-gray-400 hover:text-gray-600">
                                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                                <button onClick={() => copyToClipboard(apiKey, 'key')}>
                                    {copiedField === 'key' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                                </button>
                            </div>
                        ) : (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm rounded-lg border border-yellow-100 dark:border-yellow-800">
                                Nenhuma chave ativa. Gere uma nova abaixo.
                            </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">Mantenha esta chave secreta. Não compartilhe publicamente.</p>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <Button
                        onClick={generateKey}
                        disabled={generating}
                        variant={showConfirm ? "primary" : "outline"} // Destacar quando pedir confirmação
                        fullWidth
                        className={showConfirm ? "bg-red-600 hover:bg-red-700 text-white border-transparent" : ""}
                    >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        {showConfirm
                            ? 'Tem certeza? A chave antiga deixará de funcionar.'
                            : (apiKey ? 'Regenerar Chave' : 'Gerar Nova Chave')
                        }
                    </Button>
                </div>
            </div>
        </div>
    );
};