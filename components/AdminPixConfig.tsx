
import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, QrCode, Info } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';

export const AdminPixConfig: React.FC = () => {
    const [config, setConfig] = useState<any>({
        pixKey: '',
        pixKeyType: 'EMAIL',
        merchantName: '',
        merchantCity: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const { alert } = useDialog();

    const keyTypes = [
        { value: 'CPF', label: 'CPF' },
        { value: 'CNPJ', label: 'CNPJ' },
        { value: 'EMAIL', label: 'E-mail' },
        { value: 'PHONE', label: 'Telefone' },
        { value: 'EVP', label: 'Chave Aleatória (EVP)' },
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const gateways = await cloud.getPaymentGateways();
            const pix = gateways.find(g => g.gateway_name === 'pix');
            if (pix && pix.credentials) {
                setConfig({
                    pixKey: pix.credentials.pixKey || '',
                    pixKeyType: pix.credentials.pixKeyType || 'EMAIL',
                    merchantName: pix.credentials.merchantName || '',
                    merchantCity: pix.credentials.merchantCity || ''
                });
            }
        } catch (error) {
            console.error("Failed to load PIX settings:", error);
            alert({ title: "Erro", message: "Erro ao carregar configurações do PIX." });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await cloud.updatePaymentGateway('pix', { credentials: config });
            await alert({ title: "Sucesso", message: "Configurações do PIX salvas com sucesso!" });
        } catch (error: any) {
            await alert({ title: "Erro", message: error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                        <QrCode className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black">Configuração PIX</h2>
                        <p className="text-teal-100 text-sm">Configure os dados para recebimento via PIX Estático.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tipo de Chave</label>
                        <CustomSelect
                            options={keyTypes}
                            value={config.pixKeyType}
                            onChange={(val) => setConfig((s: any) => ({ ...s, pixKeyType: val }))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Chave PIX</label>
                        <CustomInput
                            value={config.pixKey}
                            onChange={e => setConfig((s: any) => ({ ...s, pixKey: e.target.value }))}
                            placeholder="Sua chave PIX"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nome do Beneficiário</label>
                    <CustomInput
                        value={config.merchantName}
                        onChange={e => setConfig((s: any) => ({ ...s, merchantName: e.target.value }))}
                        placeholder="Nome que aparece no banco"
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Máximo 25 caracteres (padrão BACEN).
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Cidade</label>
                    <CustomInput
                        value={config.merchantCity}
                        onChange={e => setConfig((s: any) => ({ ...s, merchantCity: e.target.value }))}
                        placeholder="Cidade do beneficiário"
                    />
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Máximo 15 caracteres (padrão BACEN).
                    </p>
                </div>

                <div className="pt-4">
                    <Button onClick={handleSave} disabled={saving} className="w-full py-4 text-lg shadow-lg bg-teal-600 hover:bg-teal-700 text-white">
                        {saving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Configurações PIX</>}
                    </Button>
                </div>

            </div>

        </div>
    );
};
