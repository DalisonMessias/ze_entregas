
import React, { useState, useEffect } from 'react';
import { MapPin, DollarSign, Plus, Trash2, Loader2, Save, Info, Truck, ShoppingBag, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { StoreDeliverySettings as IDeliverySettings, StoreNeighborhoodFee } from '../types';
import { useDialog } from '../utils/dialogService';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';

const parseCurrency = (val: string) => {
    if (!val) return 0;
    const cleanValue = val.replace(/[^\d,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
};

const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const StoreDeliverySettings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Novo Estado seguindo a interface atualizada
    const [settings, setSettings] = useState<IDeliverySettings>({
        id: '',
        store_id: '',
        is_pickup_enabled: true,
        is_own_delivery_enabled: false,
        own_delivery_mode: 'FIXED',
        fixed_fee: 0,
        is_partner_delivery_enabled: false,
        radius_km: 0,
        delivery_time_min: 30,
        delivery_time_max: 60,
        created_at: '',
        updated_at: ''
    });

    const [fees, setFees] = useState<StoreNeighborhoodFee[]>([]);

    // String states for inputs
    const [fixedFeeStr, setFixedFeeStr] = useState('');
    const [radiusKmStr, setRadiusKmStr] = useState('');
    const [newNeighborhood, setNewNeighborhood] = useState('');
    const [newFeeStr, setNewFeeStr] = useState('');

    const [profileValid, setProfileValid] = useState<boolean | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    const { alert, confirm } = useDialog();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [s, f, profile] = await Promise.all([
                cloud.getStoreDeliverySettings(),
                cloud.getStoreNeighborhoodFees(),
                cloud.getMyPartnerProfile()
            ]);

            const validation = validateStoreProfile(profile);
            setProfileValid(validation.isValid);
            setMissingFields(validation.missingFields);

            if (s) {
                setSettings(s);
                setFixedFeeStr(formatCurrency(s.fixed_fee || 0));
                setRadiusKmStr(String(s.radius_km || 0));
            }
            setFees(f);
        } catch (e) {
            console.error(e);
            setProfileValid(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        const payload = {
            is_pickup_enabled: settings.is_pickup_enabled,
            is_own_delivery_enabled: settings.is_own_delivery_enabled,
            own_delivery_mode: settings.own_delivery_mode,
            fixed_fee: parseCurrency(fixedFeeStr),
            is_partner_delivery_enabled: settings.is_partner_delivery_enabled,
            radius_km: parseFloat(radiusKmStr) || 0,
            delivery_time_min: Number(settings.delivery_time_min),
            delivery_time_max: Number(settings.delivery_time_max)
        };

        try {
            await cloud.updateStoreDeliverySettings(payload);
            await alert({ title: "Sucesso", message: "Configurações de entrega salvas com sucesso!" });
            loadData();
        } catch (e: any) {
            await alert({ title: "Erro", message: "Erro ao salvar: " + e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleAddFee = async () => {
        if (!newNeighborhood || !newFeeStr) {
            await alert({ title: "Campos Incompletos", message: "Preencha o bairro e o valor." });
            return;
        }

        setSaving(true);
        try {
            await cloud.upsertStoreNeighborhoodFee({
                neighborhood_name: newNeighborhood.trim(),
                fee: parseCurrency(newFeeStr),
                is_active: true
            });
            setNewNeighborhood('');
            setNewFeeStr('');
            await alert({ title: "Sucesso", message: "Taxa de bairro adicionada!" });
            loadData();
        } catch (e: any) {
            await alert({ title: "Erro", message: "Erro ao adicionar taxa: " + e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteFee = async (id: string) => {
        if (await confirm({ title: "Remover Taxa", message: "Deseja remover esta taxa?" })) {
            try {
                await cloud.deleteStoreNeighborhoodFee(id);
                setFees(prev => prev.filter(f => f.id !== id));
            } catch (e: any) {
                await alert({ title: "Erro", message: "Erro ao remover: " + e.message });
            }
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;

    if (profileValid === false) {
        return (
            <ProfileValidationAlert
                onNavigateToSettings={() => window.location.href = '/loja/configuracoes'}
                missingFields={missingFields}
            />
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in pb-20">

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-brand-100 text-brand-600 rounded-xl">
                    <Truck className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Opções de Entrega</h2>
                    <p className="text-gray-500 dark:text-gray-400">Configure como seus clientes receberão os pedidos</p>
                </div>
            </div>

            {/* 1. RETIRADA NO LOCAL */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${settings.is_pickup_enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                            <ShoppingBag className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Retirada no Local</h3>
                            <p className="text-sm text-gray-500">Permitir que o cliente busque o pedido na loja</p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!!settings.is_pickup_enabled}
                            onChange={(e) => setSettings(prev => ({ ...prev, is_pickup_enabled: e.target.checked }))}
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                    </label>
                </div>
            </div>

            {/* Link para Frete Grátis (User Request: "cade a função de ativar entregas gatis") */}
            <div className="bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/10 dark:to-gray-800 p-6 rounded-3xl border border-brand-100 dark:border-brand-900/30 shadow-sm relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-brand-100 text-brand-600">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                Entrega Grátis Condicional <span className="text-[10px] bg-brand-200 text-brand-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Fidelidade</span>
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Configure regras para oferecer frete grátis acima de um valor.</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => {
                            // Find the tab button for 'shipping' logic or scroll to it if already visible?
                            // In this context, StoreDeliverySettings is rendered INSIDE the shipping tab.
                            // But StoreShippingRules is likely a sibling BELOW.
                            // We can emit a custom event or just let the user know it is below.
                            // The user renders: <StoreDeliverySettings /> <StoreShippingRules />
                            // So we just need to scroll down or highlight.
                            const rulesSection = document.getElementById('shipping-rules-section');
                            if (rulesSection) {
                                rulesSection.scrollIntoView({ behavior: 'smooth' });
                            } else {
                                // Fallback: Just alert or hope the user sees it below.
                                // Or better: Adding an ID to StoreShippingRules wrapper in parent would be ideal, 
                                // but we can't edit parent easily here.
                                // We will rely on user scrolling or modify StoreShippingRules to have ID.
                                window.scrollBy({ top: 500, behavior: 'smooth' });
                            }
                        }}
                        variant="ghost"
                        className="bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 text-brand-600"
                    >
                        Configurar Regras <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            </div>

            {/* 2. ENTREGA PRÓPRIA */}
            <div className={`bg-white dark:bg-gray-800 p-6 rounded-3xl border shadow-sm transition-all ${settings.is_own_delivery_enabled ? 'border-brand-200 dark:border-brand-900 ring-1 ring-brand-100 dark:ring-brand-900/30' : 'border-gray-100 dark:border-gray-700'}`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${settings.is_own_delivery_enabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Entrega Própria</h3>
                            <p className="text-sm text-gray-500">Você utiliza seus próprios entregadores</p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={!!settings.is_own_delivery_enabled}
                            onChange={(e) => setSettings(prev => ({ ...prev, is_own_delivery_enabled: e.target.checked }))}
                        />
                        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                {settings.is_own_delivery_enabled && (
                    <div className="space-y-6 animate-in slide-in-from-top-4">

                        {/* Tempo Estimado */}
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl">
                            <div className="col-span-2 flex items-center gap-2 mb-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Tempo de Entrega Estimado</span>
                            </div>
                            <CustomInput
                                label="Mínimo (min)"
                                type="number"
                                value={settings.delivery_time_min !== undefined && settings.delivery_time_min !== null ? String(settings.delivery_time_min) : ''}
                                onChange={e => setSettings(prev => ({ ...prev, delivery_time_min: parseInt(e.target.value) || 0 }))}
                                placeholder="30"
                            />
                            <CustomInput
                                label="Máximo (min)"
                                type="number"
                                value={settings.delivery_time_max !== undefined && settings.delivery_time_max !== null ? String(settings.delivery_time_max) : ''}
                                onChange={e => setSettings(prev => ({ ...prev, delivery_time_max: parseInt(e.target.value) || 0 }))}
                                placeholder="60"
                            />
                        </div>

                        {/* Modos de Taxa */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {[
                                { id: 'FIXED', label: 'Taxa Fixa', desc: 'Valor único para toda a cidade' },
                                { id: 'NEIGHBORHOOD', label: 'Por Bairro', desc: 'Valores específicos por região' },
                                // { id: 'RADIUS', label: 'Por Raio (KM)', desc: 'Calculado pela distância' } // Futuro
                            ].map((mode) => (
                                <button
                                    key={mode.id}
                                    onClick={() => setSettings(prev => ({ ...prev, own_delivery_mode: mode.id as any }))}
                                    className={`p-4 rounded-xl border-2 text-left transition-all ${settings.own_delivery_mode === mode.id
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}
                                >
                                    <div className="font-bold text-gray-900 dark:text-white mb-1">{mode.label}</div>
                                    <div className="text-xs text-gray-500">{mode.desc}</div>
                                </button>
                            ))}
                        </div>

                        {/* Configuração do Modo Selecionado */}
                        <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">

                            {settings.own_delivery_mode === 'FIXED' && (
                                <div>
                                    <CustomInput
                                        label="Valor da Taxa Fixa"
                                        value={fixedFeeStr || ''}
                                        onChange={e => setFixedFeeStr(e.target.value)}
                                        placeholder="0,00"
                                        mask="currency"
                                        icon={DollarSign}
                                    />
                                </div>
                            )}

                            {settings.own_delivery_mode === 'NEIGHBORHOOD' && (
                                <div className="space-y-4">
                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1">
                                            <CustomInput
                                                label="Nome do Bairro"
                                                value={newNeighborhood ?? ''}
                                                onChange={e => setNewNeighborhood(e.target.value)}
                                                placeholder="Ex: Centro"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <CustomInput
                                                label="Valor"
                                                value={newFeeStr ?? ''}
                                                onChange={e => setNewFeeStr(e.target.value)}
                                                placeholder="0,00"
                                                mask="currency"
                                            />
                                        </div>
                                        <Button onClick={handleAddFee} disabled={saving} className="mb-[2px] h-[42px]">
                                            <Plus className="w-5 h-5" />
                                        </Button>
                                    </div>

                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                        {fees.length === 0 ? (
                                            <p className="text-center text-gray-400 py-4 text-sm italic">Nenhum bairro cadastrado.</p>
                                        ) : (
                                            fees.map(fee => (
                                                <div key={fee.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <span className="font-medium text-gray-800 dark:text-gray-200">{fee.neighborhood_name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold">R$ {fee.fee.toFixed(2).replace('.', ',')}</span>
                                                        <button onClick={() => handleDeleteFee(fee.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>

            {/* 3. ENTREGA PARCEIRA (Apenas Informativo por enquanto ou Toggle se disponível) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm opacity-60">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Entrega Parceira (Zé Entregas)</h3>
                            <p className="text-sm text-gray-500">Utilize nossa frota de entregadores</p>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold text-gray-500">Em Breve</span>
                </div>
            </div>

            {/* Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-center z-50 md:static md:bg-transparent md:border-0 md:p-0 md:justify-end">
                <Button onClick={handleSaveSettings} disabled={saving} className="w-full md:w-auto min-w-[200px] py-4 shadow-xl shadow-brand-500/20">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Configurações</>}
                </Button>
            </div>

        </div>
    );
};
