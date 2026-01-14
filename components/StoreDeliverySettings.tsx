
import React, { useState, useEffect } from 'react';
import { MapPin, DollarSign, Plus, Trash2, Loader2, Save, Info, Truck } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { StoreDeliverySettings as IDeliverySettings, StoreNeighborhoodFee } from '../types';
import { useDialog } from '../utils/dialogService';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';

const parseCurrency = (val: string) => {
    if (!val) return 0;
    // Remove tudo que não for dígito ou vírgula, depois troca vírgula por ponto
    const cleanValue = val.replace(/[^\d,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleanValue);
    return isNaN(parsed) ? 0 : parsed;
};

const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Função legada removida, CustomInput agora cuida disso.

export const StoreDeliverySettings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<IDeliverySettings>({
        id: '',
        store_id: '',
        delivery_mode: 'FIXED',
        fixed_fee: 0,
        allow_outside_city: true,
        created_at: '',
        updated_at: ''
    });

    const [fees, setFees] = useState<StoreNeighborhoodFee[]>([]);
    const [fixedFeeStr, setFixedFeeStr] = useState('');

    // New Fee State
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

            // Validar perfil completo
            const validation = validateStoreProfile(profile);
            setProfileValid(validation.isValid);
            setMissingFields(validation.missingFields);

            if (s) {
                console.log('[StoreDeliverySettings] Settings carregadas:', s);
                setSettings(s);
                setFixedFeeStr(formatCurrency(s.fixed_fee || 0));
            }
            setFees(f);
        } catch (e) {
            console.error('[StoreDeliverySettings] Erro ao carregar dados:', e);
            setProfileValid(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        const payload = {
            delivery_mode: settings.delivery_mode,
            fixed_fee: parseCurrency(fixedFeeStr),
            allow_outside_city: settings.allow_outside_city
        };
        console.log('[StoreDeliverySettings] Salvando payload:', payload);
        try {
            await cloud.updateStoreDeliverySettings(payload);
            await alert({ title: "Sucesso", message: "Configurações de entrega salvas com sucesso!" });
            loadData(); // Recarregar para garantir que os dados exibidos são os salvos
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
            loadData(); // Reload to get IDs
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

    // Validação de perfil
    if (profileValid === false) {
        return (
            <ProfileValidationAlert
                onNavigateToSettings={() => window.location.href = '/loja/configuracoes'}
                missingFields={missingFields}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Header Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                    <Truck className="w-6 h-6 text-brand-600" /> Configuração de Entrega Própria
                </h2>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex gap-3 mb-6">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        Estas configurações são usadas quando você opta por <strong>não utilizar</strong> os entregadores parceiros da plataforma.
                        Defina se cobrará um valor único para toda a cidade ou taxas específicas por bairro.
                    </p>
                </div>

                {/* Mode Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button
                        onClick={() => setSettings(prev => ({ ...prev, delivery_mode: 'FIXED' }))}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${settings.delivery_mode === 'FIXED'
                            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10 ring-1 ring-brand-500'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                    >
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600 mb-1">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">Taxa Fixa Única</span>
                        <span className="text-xs text-center text-gray-500">Mesmo valor para qualquer bairro da cidade</span>
                    </button>

                    <button
                        onClick={() => setSettings(prev => ({ ...prev, delivery_mode: 'NEIGHBORHOOD' }))}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${settings.delivery_mode === 'NEIGHBORHOOD'
                            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10 ring-1 ring-brand-500'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                    >
                        <div className="p-2 rounded-full bg-purple-100 text-purple-600 mb-1">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">Taxas por Bairro</span>
                        <span className="text-xs text-center text-gray-500">Defina valores diferentes para cada região</span>
                    </button>
                </div>

                {/* Settings Form */}
                <div className="space-y-6">
                    {/* Fixed Fee Input */}
                    {settings.delivery_mode === 'FIXED' && (
                        <div className="max-w-md animate-in slide-in-from-top-2">
                            <CustomInput
                                label="Valor da Taxa Fixa"
                                value={fixedFeeStr}
                                onChange={e => setFixedFeeStr(e.target.value)}
                                placeholder="0,00"
                                icon={DollarSign}
                                mask="currency"
                            />
                        </div>
                    )}

                    {/* Neighborhood List */}
                    {settings.delivery_mode === 'NEIGHBORHOOD' && (
                        <div className="space-y-4 animate-in slide-in-from-top-2">
                            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-3">Adicionar Novo Bairro</h3>
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1">
                                        <CustomInput
                                            label="Nome do Bairro"
                                            value={newNeighborhood}
                                            onChange={e => setNewNeighborhood(e.target.value)}
                                            placeholder="Ex: Centro"
                                        />
                                    </div>
                                    <div className="w-32">
                                        <CustomInput
                                            label="Valor"
                                            value={newFeeStr}
                                            onChange={e => setNewFeeStr(e.target.value)}
                                            placeholder="0,00"
                                            mask="currency"
                                        />
                                    </div>
                                    <Button onClick={handleAddFee} disabled={saving} className="mb-[2px] h-[42px]">
                                        <Plus className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {fees.length === 0 ? (
                                    <p className="text-center text-gray-400 py-8 text-sm italic">Nenhum bairro cadastrado.</p>
                                ) : (
                                    fees.map(fee => (
                                        <div key={fee.id} className="flex justify-between items-center p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg group hover:border-brand-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500">
                                                    <MapPin className="w-4 h-4" />
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">{fee.neighborhood_name}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold text-gray-900 dark:text-white">R$ {fee.fee.toFixed(2).replace('.', ',')}</span>
                                                <button
                                                    onClick={() => handleDeleteFee(fee.id)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Common Options */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.allow_outside_city ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-600'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.allow_outside_city ? 'translate-x-6' : 'translate-x-0'}`} />
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={settings.allow_outside_city}
                                onChange={e => setSettings(prev => ({ ...prev, allow_outside_city: e.target.checked }))}
                            />
                            <div>
                                <span className="block font-medium text-gray-900 dark:text-white">Permitir edição para "Fora da Cidade"</span>
                                <span className="block text-xs text-gray-500">
                                    Se ativado, permitirá definir o valor manualmente na hora do pedido para locais não mapeados.
                                </span>
                            </div>
                        </label>
                    </div>

                    <div className="pt-4">
                        <Button onClick={handleSaveSettings} disabled={saving} fullWidth size="lg">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Configurações</>}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
