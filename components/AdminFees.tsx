


import React, { useState, useEffect } from 'react';
import { Loader2, DollarSign, Save, Settings, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { PartnerFeeSettings } from '../types';

const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) return "";
    const amount = Number(value) / 100;
    return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
};

const handlePercentMask = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) return "";
    // Permitir até 2 casas decimais para porcentagem
    const amount = Number(value) / 100;
    return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const parseCurrency = (val: string): number => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
};

const parsePercent = (val: string): number => {
    if (!val) return 0;
    // Divide por 100 para armazenar como decimal (ex: 5,50% -> 0.055)
    return parseFloat(val.replace(/\./g, '').replace(',', '.')) / 100;
};

export const AdminFees: React.FC = () => {
    const [originalFees, setOriginalFees] = useState<PartnerFeeSettings | null>(null);
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const loadFees = async () => {
            setLoading(true);
            try {
                const data = await cloud.adminGetFeeSettings();
                setOriginalFees(data);
                if (data) {
                    setFormValues({
                        global_tax_fixed: (data.global_tax_fixed || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        global_tax_percent: ((data.global_tax_percent || 0) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        base_delivery_value: (data.base_delivery_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        base_delivery_km: (data.base_delivery_km || 0).toString().replace('.', ','),
                        extra_km_value: (data.extra_km_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        additional_stop_fee: (data.additional_stop_fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        super_store_monthly_fee: (data.super_store_monthly_fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        association_fee: (data.association_fee || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        pos_min_value: (data.pos_min_value || 1.00).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                        pos_max_value: (data.pos_max_value || 1000.00).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                    });
                }
            } catch (e: any) {
                setFeedback({ type: 'error', text: 'Erro ao carregar taxas: ' + e.message });
            } finally {
                setLoading(false);
            }
        };
        loadFees();
    }, []);

    const handleFormChange = (field: keyof typeof formValues, value: string) => {
        setFormValues(prev => ({ ...prev, [field]: value }));
    };

    const handleSaveFees = async () => {
        setSaving(true);
        setFeedback(null);
        try {
            const payload: Partial<PartnerFeeSettings> = {
                global_tax_fixed: parseCurrency(formValues.global_tax_fixed),
                global_tax_percent: parsePercent(formValues.global_tax_percent),
                base_delivery_value: parseCurrency(formValues.base_delivery_value),
                base_delivery_km: parseFloat(formValues.base_delivery_km?.replace(',', '.') || '0'),
                extra_km_value: parseCurrency(formValues.extra_km_value),
                additional_stop_fee: parseCurrency(formValues.additional_stop_fee),
                super_store_monthly_fee: parseCurrency(formValues.super_store_monthly_fee),
                association_fee: parseCurrency(formValues.association_fee),
                pos_min_value: parseCurrency(formValues.pos_min_value),
                pos_max_value: parseCurrency(formValues.pos_max_value),
            };
            
            // Mantém campos não editáveis do original para não serem sobrescritos
            const finalPayload = { ...originalFees, ...payload };

            await cloud.adminUpdateFeeSettings(finalPayload as PartnerFeeSettings);
            setFeedback({ type: 'success', text: 'Taxas atualizadas com sucesso!' });
        } catch (e: any) {
            setFeedback({ type: 'error', text: 'Erro ao salvar: ' + e.message });
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
                    <DollarSign className="w-6 h-6 text-brand-600" /> Taxas e Comissões
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Controle as taxas cobradas dos parceiros e lojistas em toda a plataforma.</p>

                <div className="space-y-6">
                    {/* Taxas da Plataforma */}
                    <div>
                        <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">TAXAS GERAIS DA PLATAFORMA</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Taxa Fixa por Entrega (R$)</label>
                                <input type="tel" value={formValues.global_tax_fixed || ''} onChange={e => handleFormChange('global_tax_fixed', handleCurrencyMask(e))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Taxa Percentual por Entrega (%)</label>
                                <input type="tel" value={formValues.global_tax_percent || ''} onChange={e => handleFormChange('global_tax_percent', handlePercentMask(e))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                        </div>
                    </div>

                    {/* Precificação de Entregas */}
                    <div>
                        <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">PRECIFICAÇÃO DE ENTREGAS</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Base da Entrega (R$)</label>
                                <input type="tel" value={formValues.base_delivery_value || ''} onChange={e => handleFormChange('base_delivery_value', handleCurrencyMask(e))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">KM Cobertos pela Base</label>
                                <input type="text" value={formValues.base_delivery_km || ''} onChange={e => handleFormChange('base_delivery_km', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor por KM Adicional (R$)</label>
                                <input type="tel" value={formValues.extra_km_value || ''} onChange={e => handleFormChange('extra_km_value', handleCurrencyMask(e))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Taxa por Parada Extra (R$)</label>
                                <input type="tel" value={formValues.additional_stop_fee || ''} onChange={e => handleFormChange('additional_stop_fee', handleCurrencyMask(e))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                        </div>
                    </div>

                    {/* Taxas de Assinatura e Associação */}
                    <div>
                        <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">TAXAS DE ASSOCIAÇÃO</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mensalidade Super Lojista (R$)</label>
                                <input type="tel" value={formValues.super_store_monthly_fee || ''} onChange={e => handleFormChange('super_store_monthly_fee', handleCurrencyMask(e))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Taxa de Associação de Entregador (R$)</label>
                                <input type="tel" value={formValues.association_fee || ''} onChange={e => handleFormChange('association_fee', handleCurrencyMask(e))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                        </div>
                    </div>

                    {/* Limites da Maquininha */}
                    <div>
                        <h3 className="font-bold text-gray-500 dark:text-gray-400 text-sm mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">LIMITES MAQUININHA POS</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Mínimo de Venda (R$)</label>
                                <input type="tel" value={formValues.pos_min_value || ''} onChange={e => handleFormChange('pos_min_value', handleCurrencyMask(e))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Máximo de Venda (R$)</label>
                                <input type="tel" value={formValues.pos_max_value || ''} onChange={e => handleFormChange('pos_max_value', handleCurrencyMask(e))} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600" />
                            </div>
                        </div>
                    </div>
                </div>
                
                {feedback && (
                    <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 ${feedback.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                        {feedback.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5"/>}
                        <span className="font-bold text-sm">{feedback.text}</span>
                    </div>
                )}

                <Button fullWidth onClick={handleSaveFees} disabled={saving} className="mt-6 py-4 text-lg shadow-lg">
                    {saving ? <Loader2 className="w-6 h-6 animate-spin"/> : <><Save className="w-5 h-5 mr-2"/> Salvar Taxas</>}
                </Button>
            </div>
        </div>
    );
};