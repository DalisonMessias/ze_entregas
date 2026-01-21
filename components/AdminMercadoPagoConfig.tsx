
import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Link2, Copy, Check, Info } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import { CustomInput } from './CustomInput';

export const AdminMercadoPagoConfig: React.FC = () => {
    const [config, setConfig] = useState<any>({ accessToken: '', publicKey: '', webhookSecret: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Webhook URL fixa
    const webhookUrl = "https://pjnxrqemjozlpnvoxpmn.supabase.co/functions/v1/mercadopago-webhook";

    const { alert } = useDialog();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Reutiliza a função genérica ou a específica de gateways.
            // Para manter consistência com o que o AdminPaymentGateways fazia, vamos buscar a config do gateway 'mercadopago'
            const gateways = await cloud.getPaymentGateways();
            const mp = gateways.find(g => g.gateway_name === 'mercadopago');
            if (mp && mp.credentials) {
                setConfig(mp.credentials);
            }
        } catch (error) {
            console.error("Failed to load settings:", error);
            alert({ title: "Erro", message: "Erro ao carregar configurações." });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Salva dentro da estrutura do gateway 'mercadopago'
            await cloud.updatePaymentGateway('mercadopago', { credentials: config });
            await alert({ title: "Sucesso", message: "Configurações salvas!" });
        } catch (error: any) {
            await alert({ title: "Erro", message: error.message });
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <Settings className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">Mercado Pago</h2>
                        <p className="text-blue-100 text-sm">Configure suas credenciais de API e Webhook.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Access Token</label>
                    <CustomInput
                        type="password"
                        value={config.accessToken || ''}
                        onChange={e => setConfig((s: any) => ({ ...s, accessToken: e.target.value }))}
                        placeholder="APP_USR-..."
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Token de produção gerado no painel do Mercado Pago.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Public Key (Opcional)</label>
                    <CustomInput
                        type="text"
                        value={config.publicKey || ''}
                        onChange={e => setConfig((s: any) => ({ ...s, publicKey: e.target.value }))}
                        placeholder="APP_USR-..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Webhook URL</label>
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                        <Link2 className="w-4 h-4 text-gray-400" />
                        <span className="flex-1 text-sm font-mono text-gray-600 dark:text-gray-300 truncate">{webhookUrl}</span>
                        <button onClick={copyToClipboard} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Configure esta URL no painel de desenvolvedor do Mercado Pago para receber notificações IPN.</p>
                </div>

                <div className="pt-4">
                    <Button onClick={handleSave} disabled={saving} className="w-full py-4 text-lg shadow-lg bg-blue-600 hover:bg-blue-700 text-white">
                        {saving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Configurações</>}
                    </Button>
                </div>

            </div>
        </div>
    );
};
