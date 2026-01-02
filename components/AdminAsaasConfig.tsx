import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Shield, Settings, Activity, Loader2, Copy, Check, Eye, X, CreditCard, Lock, DollarSign, RefreshCw, Save, QrCode, Barcode } from 'lucide-react';
import * as cloud from '../services/cloud';
import { AsaasWebhookLog, ShopSettings } from '../types';
import { Button } from './Button';
import { Switch } from './Switch';
import { useDialog } from '../utils/dialogService';

const ALL_ASAAS_EVENTS = [
    { id: 'PAYMENT_CREATED', name: 'Pagamento Criado' },
    { id: 'PAYMENT_UPDATED', name: 'Pagamento Atualizado' },
    { id: 'PAYMENT_CONFIRMED', name: 'Pagamento Confirmado' },
    { id: 'PAYMENT_RECEIVED', name: 'Pagamento Recebido' },
    { id: 'PAYMENT_OVERDUE', name: 'Pagamento Atrasado' },
    { id: 'PAYMENT_DELETED', name: 'Pagamento Removido' },
    { id: 'PAYMENT_RESTORED', name: 'Pagamento Restaurado' },
    { id: 'PAYMENT_REFUNDED', name: 'Pagamento Estornado' },
    { id: 'PAYMENT_CHARGEBACK_REQUESTED', name: 'Chargeback Solicitado' },
    { id: 'PAYMENT_CHARGEBACK_DISPUTE', name: 'Chargeback em Disputa' },
    { id: 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL', name: 'Aguardando Reversão de Chargeback' },
    { id: 'TRANSFER_CREATED', name: 'Transferência Criada' },
    { id: 'TRANSFER_UPDATED', name: 'Transferência Atualizada' },
    { id: 'TRANSFER_DONE', name: 'Transferência Concluída' },
    { id: 'TRANSFER_FAILED', name: 'Transferência Falhou' },
    { id: 'TRANSFER_CANCELLED', name: 'Transferência Cancelada' },
];

export const AsaasWebhookManagement: React.FC = () => {
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
    const [webhookSettings, setWebhookSettings] = useState<{ webhook_secret: string, active_events: string[] } | null>(null);
    const [logs, setLogs] = useState<AsaasWebhookLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<AsaasWebhookLog | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);

    const { alert } = useDialog();

    const webhookUrl = cloud.getWebhookUrl();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [s, ws, l] = await Promise.all([
                cloud.getShopSettings(),
                cloud.adminGetAsaasWebhookSettings(),
                cloud.adminGetAsaasWebhookLogs()
            ]);
            
            // Initialize with defaults if null so UI isn't blocked
            setShopSettings(s || {
                id: 'shop',
                is_shop_enabled: false,
                asaas_active: false,
                payment_methods: { pix: false, boleto: false, credit_card: false },
                asaas_api_key: ''
            });
            
            // Ensure active_events is never undefined
            setWebhookSettings(ws ? { ...ws, active_events: ws.active_events || [] } : { webhook_secret: '', active_events: [] });
            setLogs(l);
        } catch (error) {
            console.error("Failed to load Asaas data:", error);
            alert({ title: 'Asaas', message: 'Erro ao carregar dados do Asaas. Verifique sua conexão.' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleToggleEvent = (eventId: string) => {
        setWebhookSettings(prev => {
            if (!prev) return null;
            const currentEvents = prev.active_events || [];
            const newEvents = currentEvents.includes(eventId)
                ? currentEvents.filter(e => e !== eventId)
                : [...currentEvents, eventId];
            return { ...prev, active_events: newEvents };
        });
    };

    const handleTogglePaymentMethod = (method: 'pix' | 'boleto' | 'credit_card') => {
        setShopSettings(prev => {
            if (!prev) return null;
            const current = prev.payment_methods || { pix: false, boleto: false, credit_card: false };
            return {
                ...prev,
                payment_methods: {
                    ...current,
                    [method]: !current[method]
                }
            };
        });
    };

    const handleSaveChanges = async () => {
        if (!webhookSettings || !shopSettings) return;
        setSaving(true);
        try {
            // Salvar Configurações Gerais
            await cloud.adminUpdateShopSettings({
                asaas_active: shopSettings.asaas_active,
                asaas_api_key: shopSettings.asaas_api_key,
                payment_methods: shopSettings.payment_methods
            });

            // Salvar Webhook
            await cloud.adminUpdateAsaasWebhookSettings(webhookSettings.active_events);
            
            await alert({ title: 'Asaas', message: 'Configurações do Asaas salvas com sucesso!' });
        } catch (error: any) {
            await alert({ title: 'Erro', message: 'Erro ao salvar: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };
    
    const getStatusChip = (status: string) => {
        switch(status) {
            case 'processed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            case 'ignored': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'failed_auth': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-bold';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;
    }

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* Header / Intro */}
            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <DollarSign className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">Integração Asaas</h2>
                        <p className="text-blue-100 text-sm">Gerencie pagamentos, chaves de API e webhooks em um só lugar.</p>
                    </div>
                </div>
            </div>

            {/* General Settings Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="font-bold text-lg dark:text-white mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-500" /> Credenciais e Pagamentos
                </h3>
                
                <div className="space-y-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <Switch 
                            checked={shopSettings?.asaas_active || false} 
                            onChange={c => setShopSettings(s => s ? {...s, asaas_active: c} : null)} 
                            label="Ativar Integração Asaas"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-14">Habilita recebimentos automáticos e repasses para parceiros.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wide">API Key (Produção ou Sandbox)</label>
                        <div className="relative">
                            <input 
                                type={showApiKey ? "text" : "password"} 
                                placeholder="sk_..." 
                                value={shopSettings?.asaas_api_key || ''} 
                                onChange={e => setShopSettings(s => s ? {...s, asaas_api_key: e.target.value} : null)} 
                                className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white pl-11 pr-12 font-mono text-sm" 
                            />
                            <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <button 
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                {showApiKey ? <Eye className="w-5 h-5"/> : <Settings className="w-5 h-5"/>}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 ml-1">Chave disponível no painel do Asaas em Minha Conta {'>'} Integração.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Métodos de Pagamento Aceitos</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <button 
                                onClick={() => handleTogglePaymentMethod('pix')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${shopSettings?.payment_methods?.pix ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'}`}
                            >
                                <QrCode className={`w-8 h-8 ${shopSettings?.payment_methods?.pix ? 'text-green-600' : 'text-gray-300'}`} />
                                <span className="font-bold text-sm">PIX</span>
                                {shopSettings?.payment_methods?.pix && <Check className="w-4 h-4 mt-1" />}
                            </button>

                            <button 
                                onClick={() => handleTogglePaymentMethod('boleto')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${shopSettings?.payment_methods?.boleto ? 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'}`}
                            >
                                <Barcode className={`w-8 h-8 ${shopSettings?.payment_methods?.boleto ? 'text-orange-600' : 'text-gray-300'}`} />
                                <span className="font-bold text-sm">Boleto</span>
                                {shopSettings?.payment_methods?.boleto && <Check className="w-4 h-4 mt-1" />}
                            </button>

                            <button 
                                onClick={() => handleTogglePaymentMethod('credit_card')}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${shopSettings?.payment_methods?.credit_card ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'}`}
                            >
                                <CreditCard className={`w-8 h-8 ${shopSettings?.payment_methods?.credit_card ? 'text-blue-600' : 'text-gray-300'}`} />
                                <span className="font-bold text-sm">Cartão</span>
                                {shopSettings?.payment_methods?.credit_card && <Check className="w-4 h-4 mt-1" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Webhook Settings Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="font-bold text-lg dark:text-white mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-gray-500" /> Configuração de Webhooks
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">URL do Webhook (Copie para o Asaas)</label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <Link2 className="w-4 h-4 text-gray-400" />
                            <input type="text" readOnly value={webhookUrl} className="flex-1 bg-transparent text-sm text-gray-500 truncate outline-none font-mono" />
                            <button onClick={() => copyToClipboard(webhookUrl, 'url')}>
                                {copiedField === 'url' ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4 text-gray-400"/>}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Token de Verificação (Defina igual no Asaas)</label>
                         <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <Shield className="w-4 h-4 text-gray-400" />
                            <input type="text" readOnly value={webhookSettings?.webhook_secret || 'NÃO DEFINIDO'} className="flex-1 bg-transparent text-sm text-gray-500 outline-none font-mono" />
                            <button onClick={() => copyToClipboard(webhookSettings?.webhook_secret || '', 'secret')}>
                                {copiedField === 'secret' ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4 text-gray-400"/>}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">Eventos para Processar</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg custom-scrollbar border border-gray-100 dark:border-gray-700">
                            {ALL_ASAAS_EVENTS.map(event => (
                                <div key={event.id} className="p-2 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                    <Switch 
                                        checked={webhookSettings?.active_events?.includes(event.id) || false}
                                        onChange={() => handleToggleEvent(event.id)}
                                        label={event.name}
                                        className="text-[10px]"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <Button onClick={handleSaveChanges} disabled={saving} className="w-full py-4 text-lg shadow-lg">
                {saving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Todas as Configurações</>}
            </Button>

            {/* Logs Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-gray-500" /> Logs de Eventos
                    </h3>
                    <button onClick={loadData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                 </div>
                <div className="overflow-x-auto max-h-96 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                         <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Evento</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 font-mono text-xs dark:text-white">{log.event_type}</td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusChip(log.status)}`}>{log.status}</span></td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => setSelectedLog(log)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-brand-600">
                                            <Eye className="w-4 h-4"/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {logs.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhum log encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Log Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedLog(null)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h4 className="font-bold dark:text-white">Detalhes do Log</h4>
                            <button onClick={() => setSelectedLog(null)}><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-4 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div><p className="text-xs text-gray-500">Evento</p><p className="font-bold dark:text-white">{selectedLog.event_type}</p></div>
                                <div><p className="text-xs text-gray-500">Status</p><p className="font-bold dark:text-white">{selectedLog.status}</p></div>
                                <div className="col-span-2"><p className="text-xs text-gray-500">Ação Tomada</p><p className="font-bold dark:text-white">{selectedLog.action_taken || '-'}</p></div>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">Payload JSON</p>
                            <pre className="p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs overflow-x-auto text-gray-800 dark:text-gray-200 font-mono">
                                {JSON.stringify(selectedLog.payload, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
