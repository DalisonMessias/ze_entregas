
import React, { useState, useEffect } from 'react';
import { Smartphone, Save, Loader2, Info, AlertTriangle, CheckCircle, Wallet, QrCode, Copy } from 'lucide-react';
import { Switch } from './Switch';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

export const StoreReceivingPayment: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pixConfig, setPixConfig] = useState({
        enabled: false,
        keyPix: '',
        name: '',
        city: ''
    });
    const { alert } = useDialog();

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const profile = await cloud.getMyPartnerProfile();
            if (profile?.config?.pixdata) {
                // Mapeamento caso os dados antigos existam
                const data = profile.config.pixdata;
                setPixConfig({
                    enabled: data.enabled || false,
                    keyPix: data.keyPix || data.key || '',
                    name: data.name || data.receiverName || '',
                    city: data.city || ''
                });
            } else if (profile?.pix_key) {
                setPixConfig(prev => ({ ...prev, keyPix: profile.pix_key || '' }));
            }
        } catch (error) {
            console.error('Erro ao carregar configurações de PIX:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (pixConfig.enabled && (!pixConfig.keyPix || !pixConfig.name || !pixConfig.city)) {
            await alert({
                title: 'Dados Incompletos',
                message: 'Para ativar o PIX, preencha a chave, o nome do recebedor e a cidade.'
            });
            return;
        }

        setSaving(true);
        try {
            const profile = await cloud.getMyPartnerProfile();
            const currentConfig = profile?.config || {};

            await cloud.updateMyPartnerProfile({
                config: {
                    ...currentConfig,
                    pixdata: pixConfig
                }
            });

            await alert({
                title: 'Sucesso',
                message: 'Configurações de recebimento PIX atualizadas com sucesso!'
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
        <div className="max-w-4xl mx-auto p-4 space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600">
                        <Smartphone className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Pagamento Automático via PIX</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            Aumente suas vendas oferecendo o PIX. Ao ativar, o sistema gera um QR Code e código Copia e Cola para o cliente pagar na hora de finalizar o pedido.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <span className={`text-sm font-bold ${pixConfig.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                        {pixConfig.enabled ? 'ATIVO NO CARDÁPIO' : 'INATIVO'}
                    </span>
                    <Switch
                        checked={pixConfig.enabled}
                        onChange={() => setPixConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-gray-400" /> Dados do Recebedor
                    </h3>

                    <div className="space-y-4">
                        <CustomInput
                            label="Chave PIX"
                            value={pixConfig.keyPix}
                            onChange={e => setPixConfig(prev => ({ ...prev, keyPix: e.target.value }))}
                            placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                            icon={QrCode}
                        />
                        <CustomInput
                            label="Nome do Recebedor (conforme banco)"
                            value={pixConfig.name}
                            onChange={e => setPixConfig(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: José da Silva Ltda"
                            icon={Info}
                        />
                        <CustomInput
                            label="Cidade"
                            value={pixConfig.city}
                            onChange={e => setPixConfig(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="Ex: São Paulo"
                            icon={Info}
                        />
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                            <strong>Atenção:</strong> Estes dados são usados para gerar o QR Code estático (PIX Copia e Cola).
                            Certifique-se de que os dados estão corretos para evitar problemas nos pagamentos.
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" /> Como funciona?
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <div className="w-6 h-6 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 flex items-center justify-center flex-shrink-0 font-bold">1</div>
                                <span>Quando o cliente escolher <strong>PIX</strong> no checkout, ele verá o QR Code e o código para pagamento.</span>
                            </li>
                            <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <div className="w-6 h-6 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 flex items-center justify-center flex-shrink-0 font-bold">2</div>
                                <span>O pedido entrará no seu sistema com o status <strong>"Aguardando Pagamento (PIX)"</strong>.</span>
                            </li>
                            <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <div className="w-6 h-6 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 flex items-center justify-center flex-shrink-0 font-bold">3</div>
                                <span>Você deve conferir o recebimento no seu banco antes de iniciar a produção.</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-brand-600 p-8 rounded-3xl shadow-xl shadow-brand-500/20 text-white relative overflow-hidden">
                        <div className="relative z-10 space-y-4">
                            <h3 className="font-bold text-lg">Pronto para começar?</h3>
                            <p className="text-sm text-brand-100 leading-relaxed">
                                Clique no botão abaixo para salvar suas configurações e ativar o recebimento automático no seu cardápio.
                            </p>
                            <Button
                                fullWidth
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-white text-brand-600 hover:bg-brand-50 border-none py-6 rounded-2xl text-lg font-black shadow-lg"
                            >
                                {saving ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Salvando...</> : <><Save className="w-5 h-5 mr-2" /> Salvar Configurações</>}
                            </Button>
                        </div>
                        <QrCode className="absolute -bottom-10 -right-10 w-40 h-40 text-white/10 rotate-12" />
                    </div>
                </div>
            </div>
        </div>
    );
};
