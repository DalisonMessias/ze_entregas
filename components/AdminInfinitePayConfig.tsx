
import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Link2, Copy, Check, Info } from 'lucide-react';
import * as cloud from '../services/cloud';
import { ShopSettings } from '../types';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import { CustomInput } from './CustomInput';

export const AdminInfinitePayConfig: React.FC = () => {
    const [config, setConfig] = useState<cloud.ServiceConfig>({ apiKey: '', handle: '', webhookSecret: '' });
    const [fees, setFees] = useState({ pix: 0, credit_card: 0, credit_card_installments: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // The webhook URL is fixed based on Supabase project, or we can construct it
    // Assuming standard Supabase Edge Function URL structure
    const webhookUrl = "https://pjnxrqemjozlpnvoxpmn.supabase.co/functions/v1/infinitepay-webhook";

    const { alert } = useDialog();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await cloud.getServiceConfig('infinitepay');
            if (data) {
                setConfig(data);
            }
            const gateways = await cloud.getPaymentGateways();
            const gw = gateways.find(g => g.gateway_name === 'infinitepay');
            if (gw?.fees) {
                setFees(gw.fees);
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
            await cloud.saveServiceConfig('infinitepay', config);
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
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <Settings className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">InfinitePay</h2>
                        <p className="text-green-100 text-sm">Configure sua API Key, Infinite Tag e Webhook.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Infinite Tag (Handle)</label>
                    <CustomInput
                        type="text"
                        value={config.handle || ''}
                        onChange={e => setConfig(s => ({ ...s, handle: e.target.value }))}
                        placeholder="Ex: @sualoja"
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Sua identificação única na InfinitePay.
                    </p>
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
                    <p className="text-xs text-gray-500 mt-2">Configure esta URL no painel de desenvolvedor da InfinitePay para receber atualizações de status.</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Webhook Secret (Opcional)</label>
                    <CustomInput
                        type="password"
                        value={config.webhookSecret || ''}
                        onChange={e => setConfig(s => ({ ...s, webhookSecret: e.target.value }))}
                        placeholder="Secret para validação de assinatura"
                    />
                </div>

                <div className="pt-4 space-y-4">
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Taxas Dinâmicas (%)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Taxa PIX (%)</label>
                                <CustomInput
                                    type="number"
                                    value={fees.pix}
                                    onChange={e => setFees(s => ({ ...s, pix: Number(e.target.value) }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Crédito à Vista (%)</label>
                                <CustomInput
                                    type="number"
                                    value={fees.credit_card}
                                    onChange={e => setFees(s => ({ ...s, credit_card: Number(e.target.value) }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Crédito Parcelado (%)</label>
                                <CustomInput
                                    type="number"
                                    value={fees.credit_card_installments}
                                    onChange={e => setFees(s => ({ ...s, credit_card_installments: Number(e.target.value) }))}
                                />
                            </div>
                        </div>
                    </div>

                    <Button onClick={async () => {
                        setSaving(true);
                        try {
                            await cloud.saveServiceConfig('infinitepay', config);
                            await cloud.updatePaymentGateway('infinitepay', { fees });
                            await alert({ title: "Sucesso", message: "Configurações e taxas salvas!" });
                        } catch (error: any) {
                            await alert({ title: "Erro", message: error.message });
                        } finally {
                            setSaving(false);
                        }
                    }} disabled={saving} className="w-full py-4 text-lg shadow-lg bg-green-600 hover:bg-green-700 text-white">
                        {saving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Configurações</>}
                    </Button>
                </div>

            </div>
        </div>
    );
};
