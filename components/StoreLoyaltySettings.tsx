import React, { useState, useEffect } from 'react';
import { Award, Save, Info, Zap, Settings, HelpCircle } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { Loading } from './Loading';
import * as cloud from '../services/cloud';
import { LoyaltySettings } from '../types';
import { useDialog } from '../utils/dialogService';

interface StoreLoyaltySettingsProps {
    storeId: string;
}

export const StoreLoyaltySettings: React.FC<StoreLoyaltySettingsProps> = ({ storeId }) => {
    const [settings, setSettings] = useState<LoyaltySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { alert } = useDialog();

    useEffect(() => {
        loadSettings();
    }, [storeId]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await cloud.getLoyaltySettings(storeId);
            if (data) {
                setSettings(data);
            } else {
                // Configurações padrão se não existir
                setSettings({
                    store_id: storeId,
                    is_active: false,
                    conversion_factor: 1,
                    calculation_base: 'SUBTOTAL',
                    rounding_rule: 'TRUNC',
                    min_points_redemption: 0,
                    max_discount_percentage: 100
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const success = await cloud.updateLoyaltySettings(settings);
            if (success) {
                await alert({ title: 'Sucesso', message: 'Configurações de fidelidade salvas com sucesso!' });
            } else {
                throw new Error('Falha ao salvar no banco de dados');
            }
        } catch (error: any) {
            await alert({ title: 'Erro', message: 'Erro ao salvar: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof LoyaltySettings, value: any) => {
        setSettings(prev => prev ? { ...prev, [field]: value } : null);
    };

    if (loading) return <div className="flex justify-center p-10"><Loading variant="container" size="md" message="Carregando fidelidade..." /></div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${settings?.is_active ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                            <Award className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold dark:text-white">Programa de Fidelidade</h3>
                            <p className="text-xs text-gray-500">Ative para permitir que clientes ganhem e resgatem pontos.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={settings?.is_active || false}
                            onChange={e => handleChange('is_active', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                    </label>
                </div>

                {!settings?.is_active && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 p-4 rounded-xl flex gap-3 text-amber-800 dark:text-amber-300 text-xs">
                        <Info className="w-4 h-4 flex-shrink-0" />
                        <p>O programa está desativado. Clientes não ganharão pontos em novos pedidos e não poderão resgatar o saldo atual no cardápio digital.</p>
                    </div>
                )}
            </div>

            {settings?.is_active && (
                <>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <Zap className="w-4 h-4" /> Regras de Acúmulo
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomInput
                                label="Pontos por Real Gasto"
                                type="number"
                                value={String(settings.conversion_factor)}
                                onChange={e => handleChange('conversion_factor', parseFloat(e.target.value) || 0)}
                                helperText={`R$ 1,00 = ${settings.conversion_factor} ponto(s)`}
                            />
                            <CustomSelect
                                label="Base de Cálculo"
                                value={settings.calculation_base}
                                onChange={val => handleChange('calculation_base', val)}
                                options={[
                                    { label: 'Subtotal (Produtos)', value: 'SUBTOTAL' },
                                    { label: 'Valor Pago (Total)', value: 'PAID' }
                                ]}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomSelect
                                label="Regra de Arredondamento"
                                value={settings.rounding_rule}
                                onChange={val => handleChange('rounding_rule', val)}
                                options={[
                                    { label: 'Para baixo (Truncar)', value: 'TRUNC' },
                                    { label: 'Mais próximo (Arredondar)', value: 'ROUND' }
                                ]}
                            />
                            <CustomInput
                                label="Validade (em dias)"
                                type="number"
                                value={String(settings.points_expiry_days || '')}
                                onChange={e => handleChange('points_expiry_days', parseInt(e.target.value) || null)}
                                placeholder="Nunca expira"
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <Settings className="w-4 h-4" /> Regras de Resgate
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomInput
                                label="Mínimo para Resgate (Pontos)"
                                type="number"
                                value={String(settings.min_points_redemption)}
                                onChange={e => handleChange('min_points_redemption', parseInt(e.target.value) || 0)}
                            />
                            <CustomInput
                                label="Desconto Máximo (%)"
                                type="number"
                                value={String(settings.max_discount_percentage)}
                                onChange={e => handleChange('max_discount_percentage', parseInt(e.target.value) || 0)}
                                helperText="Limite de desconto em relação ao total do pedido."
                            />
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                <HelpCircle className="w-3 h-3 inline mr-1" />
                                <strong>Dica:</strong> Em nosso sistema, cada 1 ponto acumulado equivale a R$ 1,00 de desconto no resgate do cardápio digital.
                                Você define quão fácil é ganhar pontos no campo "Pontos por Real Gasto".
                            </p>
                        </div>
                    </div>
                </>
            )}

            <Button onClick={handleSave} loading={saving} fullWidth className="py-4 font-black">
                <Save className="w-5 h-5 mr-2" /> Salvar Configurações de Fidelidade
            </Button>
        </div>
    );
};
