
import React, { useState, useEffect } from 'react';
import { Smartphone, Save, Loader2, Info, AlertTriangle, CheckCircle, Wallet, QrCode, Copy, MessageCircle, CreditCard, Globe, Server } from 'lucide-react';
import { Switch } from './Switch';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

export const StoreReceivingPayment: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { alert } = useDialog();

    // Configuração de Recebimento de Pedidos (Raiz do Profile)
    const [orderConfig, setOrderConfig] = useState({
        receive_orders_via_platform: true,
        receive_orders_via_chat: false,
        chat_number: ''
    });

    // Configuração de Pagamento Online (JSONB config.online_payments)
    const [onlinePaymentConfig, setOnlinePaymentConfig] = useState({
        enabled: false,
        accept_infinitepay: false,
        accept_mercadopago: false
    });

    // Configuração de PIX (Raiz + JSONB)
    const [pixKeyType, setPixKeyType] = useState<'cpf' | 'cnpj' | 'email' | 'phone' | 'random'>('random');
    const [pixConfig, setPixConfig] = useState({
        enabled: false,
        keyPix: '',
        name: '',
        city: ''
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const profile = await cloud.getMyPartnerProfile();
            if (!profile) return;

            // 1. Carregar Order Config
            setOrderConfig({
                receive_orders_via_platform: profile.receive_orders_via_platform ?? true,
                receive_orders_via_chat: profile.receive_orders_via_chat ?? false,
                chat_number: profile.chat_number || profile.phone_number || ''
            });

            // 2. Carregar Online Payment Config (do campo config JSONB)
            const currentConfig = profile.config || {};
            const onlineConfig = currentConfig.online_payments || {};
            setOnlinePaymentConfig({
                enabled: onlineConfig.enabled || false,
                accept_infinitepay: onlineConfig.accept_infinitepay || false,
                accept_mercadopago: onlineConfig.accept_mercadopago || false
            });

            // 3. Carregar PIX Config
            if (profile.config?.pixdata) {
                const data = profile.config.pixdata;
                const key = data.keyPix || data.key || '';
                setPixConfig({
                    enabled: data.enabled || false,
                    keyPix: key,
                    name: data.name || data.receiverName || '',
                    city: data.city || ''
                });
                inferPixType(key);
            } else if (profile.pix_key) {
                const key = profile.pix_key || '';
                setPixConfig(prev => ({ ...prev, keyPix: key }));
                inferPixType(key);
            }

        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        } finally {
            setLoading(false);
        }
    };

    const inferPixType = (key: string) => {
        if (key.includes('@')) setPixKeyType('email');
        else if (key.length > 14) setPixKeyType('cnpj');
        else if (key.length === 11 || (key.length === 14 && key.includes('.'))) setPixKeyType('cpf');
        else if (key.length >= 10 && !isNaN(Number(key.replace(/\D/g, '')))) setPixKeyType('phone');
        else setPixKeyType('random');
    };

    const handleSave = async () => {
        // Validação PIX
        if (pixConfig.enabled && (!pixConfig.keyPix || !pixConfig.name || !pixConfig.city)) {
            await alert({
                title: 'Dados Incompletos',
                message: 'Para ativar o PIX, é obrigatório informar a chave, nome e cidade.'
            });
            return;
        }

        // Validação WhatsApp
        if (orderConfig.receive_orders_via_chat && !orderConfig.chat_number) {
            await alert({
                title: 'WhatsApp Obrigatório',
                message: 'Para receber pedidos via WhatsApp, informe o número.'
            });
            return;
        }

        setSaving(true);
        try {
            const profile = await cloud.getMyPartnerProfile();
            const currentConfig = profile?.config || {};

            const rawChatNumber = (orderConfig.chat_number || '').replace(/\D/g, '');

            await cloud.updateMyPartnerProfile({
                // Atualiza campos raiz
                receive_orders_via_platform: orderConfig.receive_orders_via_platform,
                receive_orders_via_chat: orderConfig.receive_orders_via_chat,
                chat_number: rawChatNumber,

                // Atualiza JSONB config
                config: {
                    ...currentConfig,
                    pixdata: pixConfig,
                    online_payments: onlinePaymentConfig
                }
            });

            await alert({
                title: 'Sucesso',
                message: 'Todas as configurações de recebimento foram salvas!'
            });
        } catch (error: any) {
            await alert({
                title: 'Erro ao Salvar',
                message: 'Não foi possível salvar as configurações: ' + error.message
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-8 animate-in fade-in pb-24">

            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600">
                    <Wallet className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">Recebimento e Pagamentos</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Configure como sua loja recebe pedidos e quais formas de pagamento aceita.
                    </p>
                </div>
            </div>

            {/* SEÇÃO 1: MÉTODO DE RECEBIMENTO DE PEDIDOS */}
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-brand-600" /> Método de Recebimento de Pedidos
                </h3>

                <div className="p-5 bg-gray-50 dark:bg-gray-700/50 rounded-2xl space-y-5 border border-gray-100 dark:border-gray-600">
                    {/* Opção Plataforma */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Receber via Plataforma <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] uppercase font-bold">Recomendado</span>
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                Fluxo profissional automatizado. Pedidos chegam no painel em tempo real, geram relatórios financeiros e permitem rastreamento pelo cliente.
                            </p>
                        </div>
                        <Switch
                            checked={orderConfig.receive_orders_via_platform}
                            onChange={() => {
                                setOrderConfig(prev => ({
                                    ...prev,
                                    receive_orders_via_platform: !prev.receive_orders_via_platform,
                                    // Se ativar plataforma, desativa WhatsApp
                                    receive_orders_via_chat: !prev.receive_orders_via_platform ? false : prev.receive_orders_via_chat
                                }));
                            }}
                        />
                    </div>

                    <div className="w-full h-px bg-gray-200 dark:bg-gray-600" />

                    {/* Opção WhatsApp */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-green-600" /> Receber via WhatsApp
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                Atendimento manual. O cliente envia o carrinho como mensagem. Ideal para operações simples sem gestão de motoboys da plataforma.
                            </p>
                        </div>
                        <Switch
                            checked={orderConfig.receive_orders_via_chat}
                            onChange={() => {
                                setOrderConfig(prev => ({
                                    ...prev,
                                    receive_orders_via_chat: !prev.receive_orders_via_chat,
                                    // Se ativar WhatsApp, desativa plataforma
                                    receive_orders_via_platform: !prev.receive_orders_via_chat ? false : prev.receive_orders_via_platform
                                }));
                            }}
                        />
                    </div>

                    {orderConfig.receive_orders_via_chat && (
                        <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                            <CustomInput
                                label="Número do WhatsApp para Pedidos"
                                type="tel"
                                value={orderConfig.chat_number}
                                onChange={e => setOrderConfig(prev => ({ ...prev, chat_number: e.target.value }))}
                                placeholder="(00) 00000-0000"
                                mask="phone"
                                icon={Smartphone}
                                helperText="Número que receberá as mensagens dos clientes."
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* SEÇÃO 2: PAGAMENTOS ONLINE */}
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-600" /> Pagamentos Online
                    </h3>
                    <Switch
                        checked={onlinePaymentConfig.enabled}
                        onChange={() => setOnlinePaymentConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                    />
                </div>

                {onlinePaymentConfig.enabled ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                        {/* InfinitePay */}
                        <div className={`p-5 rounded-2xl border transition-all ${onlinePaymentConfig.accept_infinitepay ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 border-gray-100 dark:bg-gray-700/30'}`}>
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-gray-700 dark:text-white" />
                                    <span className="font-bold text-gray-800 dark:text-white">InfinitePay</span>
                                </div>
                                <Switch
                                    checked={onlinePaymentConfig.accept_infinitepay}
                                    onChange={() => setOnlinePaymentConfig(prev => ({ ...prev, accept_infinitepay: !prev.accept_infinitepay }))}
                                />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Receba pagamentos via Link de Pagamento da InfinitePay. Requer configuração das credenciais no painel administrativo.
                            </p>
                        </div>

                        {/* Mercado Pago */}
                        <div className={`p-5 rounded-2xl border transition-all ${onlinePaymentConfig.accept_mercadopago ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-gray-50 border-gray-100 dark:bg-gray-700/30'}`}>
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-gray-700 dark:text-white" />
                                    <span className="font-bold text-gray-800 dark:text-white">Mercado Pago</span>
                                </div>
                                <Switch
                                    checked={onlinePaymentConfig.accept_mercadopago}
                                    onChange={() => setOnlinePaymentConfig(prev => ({ ...prev, accept_mercadopago: !prev.accept_mercadopago }))}
                                />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Integração nativa com Mercado Pago para PIX automático e Cartões.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-center">
                        <p className="text-sm text-gray-500">Ative os pagamentos online para oferecer mais opções aos seus clientes.</p>
                    </div>
                )}
            </div>

            {/* SEÇÃO 3: PIX AUTOMÁTICO */}
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-teal-600" /> Pagamento via PIX (Copia e Cola)
                    </h3>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 px-4 py-2 rounded-full border border-gray-100 dark:border-gray-700">
                        <span className={`text-xs font-bold ${pixConfig.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                            {pixConfig.enabled ? 'ATIVO' : 'INATIVO'}
                        </span>
                        <Switch
                            checked={pixConfig.enabled}
                            onChange={() => setPixConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="relative">
                            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wider">Tipo de Chave</label>
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
                                {[
                                    { id: 'cpf', label: 'CPF' },
                                    { id: 'cnpj', label: 'CNPJ' },
                                    { id: 'email', label: 'E-mail' },
                                    { id: 'phone', label: 'Celular' },
                                    { id: 'random', label: 'Aleatória' }
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => {
                                            setPixKeyType(type.id as any);
                                            setPixConfig(prev => ({ ...prev, keyPix: '' }));
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${pixKeyType === type.id
                                            ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                                            : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                            <CustomInput
                                label="Chave PIX"
                                value={pixConfig.keyPix}
                                mask={pixKeyType === 'cpf' ? 'cpf' : pixKeyType === 'cnpj' ? 'cnpj' : pixKeyType === 'phone' ? 'phone' : undefined}
                                onChange={e => setPixConfig(prev => ({ ...prev, keyPix: e.target.value }))}
                                placeholder={
                                    pixKeyType === 'cpf' ? '000.000.000-00' :
                                        pixKeyType === 'cnpj' ? '00.000.000/0000-00' :
                                            pixKeyType === 'phone' ? '(00) 00000-0000' :
                                                pixKeyType === 'email' ? 'exemplo@email.com' :
                                                    'Chave aleatória'
                                }
                                icon={QrCode}
                            />
                        </div>
                        <CustomInput
                            label="Nome do Recebedor (Titular)"
                            value={pixConfig.name}
                            onChange={e => setPixConfig(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: Minha Loja Ltda"
                            icon={Info}
                        />
                        <CustomInput
                            label="Cidade do Recebedor"
                            value={pixConfig.city}
                            onChange={e => setPixConfig(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="Ex: São Paulo"
                            icon={Info}
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-teal-50 dark:bg-teal-900/20 rounded-2xl border border-teal-100 dark:border-teal-800/30">
                            <h4 className="font-bold text-teal-800 dark:text-teal-300 mb-2 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Vantagens do PIX
                            </h4>
                            <ul className="text-xs text-teal-700 dark:text-teal-400 space-y-2 list-disc list-inside">
                                <li>Recebimento instantâneo na sua conta.</li>
                                <li>Sem taxas de intermediadores (dependendo do seu banco).</li>
                                <li>Cliente paga escaneando o QR Code ou colando o código.</li>
                            </ul>
                        </div>

                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                <strong>Importante:</strong> Ao ativar o PIX, você é responsável por conferir se o valor caiu na sua conta bancária antes de enviar o pedido. O sistema apenas facilita a geração do código para o cliente.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* BARRA FIXA DE SALVAR (Mobile friendly) */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-50 md:static md:bg-transparent md:border-none md:p-0">
                <div className="max-w-4xl mx-auto">
                    <Button
                        fullWidth
                        onClick={handleSave}
                        disabled={saving}
                        className="py-4 rounded-xl text-lg font-black shadow-xl shadow-brand-500/20"
                    >
                        {saving ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Salvando...</> : <><Save className="w-5 h-5 mr-2" /> Salvar Todas as Configurações</>}
                    </Button>
                </div>
            </div>

        </div>
    );
};
