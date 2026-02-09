import React, { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, Save, RefreshCw, Truck, Percent, CreditCard, Users, AlertTriangle } from 'lucide-react';
import { useDialog } from '../utils/dialogService';
import * as cloud from '../services/cloud';
import { PartnerFeeSettings, SystemFee } from '../types';
import { Switch } from './Switch';

// ... (existing code for helper functions) ...



const CurrencyInput = ({
    value,
    onChange,
    disabled,
    label,
    prefix = "R$"
}: {
    value: number,
    onChange: (v: number) => void,
    disabled?: boolean,
    label?: string
    prefix?: string
}) => {
    const [displayValue, setDisplayValue] = useState(value ? (value * 100).toString() : "0");

    useEffect(() => {
        setDisplayValue(value !== undefined ? (value * 100).toFixed(0) : "0");
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val === '') val = '0';
        setDisplayValue(val);
        const numberValue = parseInt(val, 10) / 100;
        onChange(numberValue);
    };

    const formatted = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(parseInt(displayValue, 10) / 100);

    return (
        <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{prefix}</span>
            <input
                type="text"
                value={formatted}
                onChange={handleChange}
                disabled={disabled}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-right font-medium text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
            />
        </div>
    );
};

const GlobalCurrencyInput = ({
    label,
    value,
    onChange,
    icon: Icon
}: {
    label: string,
    value: number,
    onChange: (val: string) => void,
    icon: any
}) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400">
                <Icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-gray-700">{label}</span>
        </div>
        <div className="w-32">
            <CurrencyInput
                value={value ?? 0}
                onChange={(v) => onChange(v.toString())}
            />
        </div>
    </div>
);

const GlobalNumberInput = ({
    label,
    value,
    onChange,
    icon: Icon,
    prefix = ""
}: {
    label: string,
    value: number,
    onChange: (val: string) => void,
    icon: any,
    prefix?: string
}) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400">
                <Icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-gray-700">{label}</span>
        </div>
        <div className="relative w-32">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">{prefix}</span>
            <input
                type="number"
                step="0.01"
                min="0"
                value={value ?? 0}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-right font-medium text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
            />
        </div>
    </div>
);

export const AdminFees: React.FC = () => {
    const [fees, setFees] = useState<SystemFee[]>([]);
    const [globalFees, setGlobalFees] = useState<PartnerFeeSettings | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { alert, confirm } = useDialog();

    // Estado local para edição
    const [editValues, setEditValues] = useState<{ [key: string]: number }>({});
    const [editGlobal, setEditGlobal] = useState<Partial<PartnerFeeSettings>>({});

    const loadFees = async () => {
        setLoading(true);
        try {
            const [feesData, globalFeesData] = await Promise.all([
                cloud.getSystemFees(),
                cloud.adminGetFeeSettings()
            ]);

            setFees(feesData);
            setGlobalFees(globalFeesData);

            // Inicializar valores de edição SystemFees
            const initialValues: { [key: string]: number } = {};
            feesData.forEach(f => initialValues[f.key] = f.value);
            setEditValues(initialValues);

            // Inicializar valores de edição GlobalFees
            if (globalFeesData) {
                setEditGlobal(globalFeesData);
            }

        } catch (e) {
            console.error("Error loading fees:", e);
            await alert("Erro ao carregar taxas.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFees();
    }, []);

    const handleChange = (key: string, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setEditValues(prev => ({ ...prev, [key]: numValue }));
        }
    };

    const handleGlobalChange = (key: keyof PartnerFeeSettings, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setEditGlobal(prev => ({ ...prev, [key]: numValue }));
        }
    };

    const handleGlobalToggle = (key: keyof PartnerFeeSettings, value: boolean) => {
        setEditGlobal(prev => ({ ...prev, [key]: value }));
    };

    // Auto-save para configurações de desconto combo
    const handleComboDiscountToggle = async (value: boolean) => {
        console.log('🔄 Toggle desconto combo:', value);
        setEditGlobal(prev => ({ ...prev, combo_discount_enabled: value }));
        setSaving(true);
        try {
            console.log('💾 Salvando no backend:', { combo_discount_enabled: value });
            await cloud.adminUpdateFeeSettings({ combo_discount_enabled: value });
            console.log('✅ Salvo com sucesso!');
            await alert(`Desconto combo ${value ? 'ativado' : 'desativado'} com sucesso!`);
        } catch (e) {
            console.error("❌ Error updating combo discount:", e);
            await alert("Erro ao atualizar configuração de desconto combo.");
            // Reverter o estado em caso de erro
            setEditGlobal(prev => ({ ...prev, combo_discount_enabled: !value }));
        } finally {
            setSaving(false);
        }
    };

    const handleComboDiscountPercentChange = async (value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
            setEditGlobal(prev => ({ ...prev, combo_discount_percent: numValue }));

            // Debounce - salvar após 1 segundo sem mudanças
            if (typeof window !== 'undefined') {
                if ((window as any).comboDiscountTimeout) {
                    clearTimeout((window as any).comboDiscountTimeout);
                }

                (window as any).comboDiscountTimeout = setTimeout(async () => {
                    setSaving(true);
                    try {
                        await cloud.adminUpdateFeeSettings({ combo_discount_percent: numValue });
                        await alert(`Desconto combo atualizado para ${numValue}%!`);
                    } catch (e) {
                        console.error("Error updating combo discount percent:", e);
                        await alert("Erro ao atualizar percentual de desconto combo.");
                    } finally {
                        setSaving(false);
                    }
                }, 1000);
            }
        }
    };

    const handleSave = async (key: string) => {
        const fee = fees.find(f => f.key === key);
        if (!fee) return;

        const newValue = editValues[key];
        if (newValue === undefined) return;

        if (await confirm(`Deseja atualizar a taxa "${fee.description}" para R$ ${newValue.toFixed(2)}?`)) {
            setSaving(true);
            try {
                await cloud.updateSystemFee(key, newValue);
                await alert("Taxa atualizada com sucesso!");
                loadFees();
            } catch (e) {
                console.error("Error updating fee:", e);
                await alert("Erro ao atualizar taxa.");
            } finally {
                setSaving(false);
            }
        }
    };

    const handleSaveGlobal = async () => {
        if (!editGlobal) return;

        if (await confirm("Deseja salvar as alterações nas Taxas Globais? Isso afetará todos os cálculos do sistema.")) {
            setSaving(true);
            try {
                await cloud.adminUpdateFeeSettings(editGlobal);
                await alert("Taxas globais atualizadas com sucesso!");
                loadFees(); // Recarregar para garantir sincronia
            } catch (e) {
                console.error("Error updating global fees:", e);
                await alert("Erro ao atualizar taxas globais.");
            } finally {
                setSaving(false);
            }
        }
    };



    return (
        <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
            <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 px-6 py-4 z-30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold text-gray-900">Gestão de Taxas</h1>
                        <p className="text-sm text-gray-500">Configuração de valores e custos do sistema</p>
                    </div>
                </div>
                <button
                    onClick={loadFees}
                    className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
                    title="Recarregar"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </header>

            <main className="pt-24 px-6 max-w-5xl mx-auto space-y-8 pb-12">

                {/* Seção 1: Taxas Globais de Entrega e Parceiros */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <Truck className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Parâmetros Globais</h3>
                                <p className="text-sm text-gray-500">Configurações de entrega e comissões</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSaveGlobal}
                            disabled={loading || saving}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            <span>Salvar Alterações</span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center text-gray-500">Carregando parâmetros...</div>
                    ) : (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">

                            <div className="col-span-1 md:col-span-2">
                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Entregas</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <GlobalCurrencyInput
                                        label="Valor Base de Entrega"
                                        value={editGlobal.base_delivery_value as number}
                                        onChange={(v) => handleGlobalChange('base_delivery_value', v)}
                                        icon={DollarSign}
                                    />
                                    <GlobalNumberInput
                                        label="KM Base Incluso"
                                        value={editGlobal.base_delivery_km as number}
                                        onChange={(v) => handleGlobalChange('base_delivery_km', v)}
                                        icon={Truck}
                                        prefix="KM"
                                    />
                                    <GlobalCurrencyInput
                                        label="Valor por KM Excedente"
                                        value={editGlobal.extra_km_value as number}
                                        onChange={(v) => handleGlobalChange('extra_km_value', v)}
                                        icon={DollarSign}
                                    />
                                    <GlobalCurrencyInput
                                        label="Taxa por Parada Adicional"
                                        value={editGlobal.additional_stop_fee as number}
                                        onChange={(v) => handleGlobalChange('additional_stop_fee', v)}
                                        icon={DollarSign}
                                    />
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 mt-2">Comissões e Taxas Fixas</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <GlobalCurrencyInput
                                        label="Taxa Fixa (App)"
                                        value={editGlobal.global_tax_fixed as number}
                                        onChange={(v) => handleGlobalChange('global_tax_fixed', v)}
                                        icon={DollarSign}
                                    />
                                    <GlobalNumberInput
                                        label="Comissão (%)"
                                        value={editGlobal.global_tax_percent as number}
                                        onChange={(v) => handleGlobalChange('global_tax_percent', v)}
                                        icon={Percent}
                                        prefix="%"
                                    />
                                    <GlobalCurrencyInput
                                        label="Mensalidade Super Lojista"
                                        value={editGlobal.super_store_monthly_fee as number}
                                        onChange={(v) => handleGlobalChange('super_store_monthly_fee', v)}
                                        icon={CreditCard}
                                    />
                                    <GlobalCurrencyInput
                                        label="Taxa de Associação"
                                        value={editGlobal.association_fee as number}
                                        onChange={(v) => handleGlobalChange('association_fee', v)}
                                        icon={Users}
                                    />
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 mt-2">Planos Super Lojista</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Plano Mensalidade */}
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-white rounded-lg shadow-sm text-brand-600">
                                                    <CreditCard className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold text-gray-900">Plano Mensalidade</span>
                                            </div>
                                            <Switch
                                                checked={!!editGlobal.super_store_monthly_enabled}
                                                onChange={(checked) => handleGlobalToggle('super_store_monthly_enabled', checked)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-500 uppercase">Valor da Mensalidade</label>
                                            <CurrencyInput
                                                value={editGlobal.super_store_monthly_fee as number}
                                                onChange={(v) => handleGlobalChange('super_store_monthly_fee', v.toString())}
                                                disabled={!editGlobal.super_store_monthly_enabled}
                                            />
                                        </div>
                                    </div>

                                    {/* Plano Comissão */}
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-white rounded-lg shadow-sm text-brand-600">
                                                    <Percent className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold text-gray-900">Plano Comissão</span>
                                            </div>
                                            <Switch
                                                checked={!!editGlobal.super_store_commission_enabled}
                                                onChange={(checked) => handleGlobalToggle('super_store_commission_enabled', checked)}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-gray-500 uppercase">Comissão (%)</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">%</span>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={editGlobal.super_store_commission_percent ?? 0}
                                                        onChange={(e) => handleGlobalChange('super_store_commission_percent', e.target.value)}
                                                        disabled={!editGlobal.super_store_commission_enabled}
                                                        className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-right font-medium text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all disabled:bg-gray-100"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-gray-500 uppercase">Valor Fixo (R$)</label>
                                                <CurrencyInput
                                                    value={editGlobal.super_store_commission_fixed as number}
                                                    onChange={(v) => handleGlobalChange('super_store_commission_fixed', v.toString())}
                                                    disabled={!editGlobal.super_store_commission_enabled}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Seção 2: Taxas do Sistema (Avaliações, etc) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-brand-50 rounded-xl">
                                <DollarSign className="w-6 h-6 text-brand-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Taxas de Serviços</h3>
                                <p className="text-sm text-gray-500">Defina os custos para serviços específicos (como avaliações)</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 gap-4">
                        {loading ? (
                            <div className="col-span-full p-8 text-center text-gray-500">Carregando...</div>
                        ) : fees.length === 0 ? (
                            <div className="col-span-full p-8 text-center text-gray-500">Nenhuma taxa de serviço encontrada.</div>
                        ) : (
                            fees.map(fee => (
                                <div key={fee.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm text-brand-600">
                                            <DollarSign className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-700">{fee.description}</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-32">
                                            <CurrencyInput
                                                value={editValues[fee.key] ?? fee.value}
                                                onChange={(v) => handleChange(fee.key, v.toString())}
                                            />
                                        </div>
                                        <button
                                            onClick={() => handleSave(fee.key)}
                                            disabled={saving || editValues[fee.key] === fee.value}
                                            className="p-2 text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
                                            title="Salvar"
                                        >
                                            <Save className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Seção de Desconto Combo */}
                    <div className="px-6 pb-6">
                        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                            <h5 className="flex items-center gap-2 text-sm font-bold text-yellow-800 mb-3">
                                <AlertTriangle className="w-4 h-4" />
                                Desconto Combo (Avaliações)
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <GlobalNumberInput
                                    label="Desconto Combo (%)"
                                    value={editGlobal.combo_discount_percent as number}
                                    onChange={(v) => handleComboDiscountPercentChange(v)}
                                    icon={Percent}
                                    prefix="%"
                                />
                                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-yellow-200">
                                    <span className="font-medium text-gray-700">Habilitar Desconto</span>
                                    <Switch
                                        checked={!!editGlobal.combo_discount_enabled}
                                        onChange={(checked) => handleComboDiscountToggle(checked)}
                                        disabled={saving}
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-yellow-700 mt-3">
                                * Aplica desconto automático quando o lojista solicita Editar Comentário + Excluir Avaliação simultaneamente.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-2 justify-center">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <p className="text-xs text-center text-gray-500">
                            Atenção: Super Lojistas são isentos dessas taxas de serviço automaticamente.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};