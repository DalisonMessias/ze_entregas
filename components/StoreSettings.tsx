import React, { useState, useEffect } from 'react';
import { Settings, Truck, Save, Loader2, Store, Lock, MapPin, Phone, Mail, Clock, Info, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { StoreShippingRules } from './StoreShippingRules';
import { ExclusiveLock } from './ExclusiveLock';
import * as cloud from '../services/cloud';
import { PartnerProfile } from '../types';
import { formatPhoneNumber } from '../utils/mapHelpers';

// --- TOAST COMPONENT ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-24 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 fade-in duration-300 border ${type === 'success' ? 'bg-white border-green-100 dark:bg-gray-800 dark:border-green-900' : 'bg-white border-red-100 dark:bg-gray-800 dark:border-red-900'}`}>
            <div className={`p-2 rounded-full ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
                <h4 className={`font-bold text-sm ${type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {type === 'success' ? 'Sucesso' : 'Erro'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>
            </div>
            <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
    );
};

export const StoreSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'shipping'>('general');
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Form State
    const [form, setForm] = useState({
        name: '',
        phone_number: '',
        contact_email: '',
        opening_hours: '',
        address_zip: '',
        address_street: '',
        address_number: '',
        address_district: '',
        city: '', // City field from profile
        address_state: ''
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const p = await cloud.getMyPartnerProfile();
                setProfile(p);

                if (p) {
                    setForm({
                        name: p.name || '',
                        phone_number: p.phone_number || '',
                        contact_email: p.contact_email || p.email || '',
                        opening_hours: p.opening_hours || '',
                        address_zip: p.address_zip || '',
                        address_street: p.address_street || '',
                        address_number: p.address_number || '',
                        address_district: p.address_district || '',
                        city: p.city?.split(' - ')[0] || '',
                        address_state: p.address_state || p.city?.split(' - ')[1] || ''
                    });
                }

                // Check super store status
                const user = await cloud.getClient()?.auth.getUser();
                if (user?.data.user) {
                    const data = await cloud.getClient()?.from('user_profiles').select('is_super_store').eq('id', user.data.user.id).single();
                    if (data?.data) setIsSuperStore(data.data.is_super_store);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Construct city string properly if changed
            const cityFull = form.city && form.address_state ? `${form.city} - ${form.address_state}` : form.city;

            const rawPhone = (form.phone_number || '').replace(/\D/g, '');
            const rawZip = (form.address_zip || '').replace(/\D/g, '');

            await cloud.updateMyPartnerProfile({
                name: form.name,
                phone_number: rawPhone,
                contact_email: form.contact_email,
                opening_hours: form.opening_hours,
                address_zip: rawZip,
                address_street: form.address_street,
                address_number: form.address_number,
                address_district: form.address_district,
                address_state: form.address_state,
                city: cityFull
            });
            setToast({ type: 'success', message: "Dados da loja atualizados com sucesso!" });
        } catch (e: any) {
            setToast({ type: 'error', message: "Erro ao salvar: " + e.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in pb-24">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {/* Header / Tabs */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'general' ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-white' : 'text-gray-500'}`}
                    >
                        <Store className="w-4 h-4" /> Dados da Loja
                    </button>
                    <button
                        onClick={() => setActiveTab('shipping')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'shipping' ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-white' : 'text-gray-500'}`}
                    >
                        {isSuperStore ? <Truck className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Config. Frete
                    </button>
                </div>
            </div>

            {/* General Settings */}
            {activeTab === 'general' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-6">

                    {/* Basic Info */}
                    <div>
                        <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                            <Store className="w-5 h-5 text-gray-500" /> Informações Básicas
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nome da Loja</label>
                                <CustomInput
                                    type="text"
                                    value={form.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    placeholder="Ex: Pizzaria do Zé"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Horário de Funcionamento</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 z-10" />
                                    <CustomInput
                                        type="text"
                                        value={form.opening_hours}
                                        onChange={e => handleChange('opening_hours', e.target.value)}
                                        className="pl-10"
                                        placeholder="Ex: Seg-Sex 18h às 23h"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                            <Phone className="w-5 h-5 text-gray-500" /> Contato
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Telefone / WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 z-10" />
                                    <CustomInput
                                        type="tel"
                                        value={form.phone_number}
                                        onChange={e => handleChange('phone_number', e.target.value)}
                                        className="pl-10"
                                        placeholder="(00) 00000-0000"
                                        mask="phone"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Email de Contato</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400 z-10" />
                                    <CustomInput
                                        type="email"
                                        value={form.contact_email}
                                        onChange={e => handleChange('contact_email', e.target.value)}
                                        className="pl-10"
                                        placeholder="contato@loja.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-gray-500" /> Endereço Completo
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">CEP</label>
                                    <CustomInput
                                        type="text"
                                        value={form.address_zip}
                                        onChange={e => handleChange('address_zip', e.target.value)}
                                        placeholder="00000-000"
                                        mask="cep"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Cidade</label>
                                    <CustomInput
                                        type="text"
                                        value={form.city}
                                        onChange={e => handleChange('city', e.target.value)}
                                        placeholder="Nome da Cidade"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-[3fr_1fr] gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Rua</label>
                                    <CustomInput
                                        type="text"
                                        value={form.address_street}
                                        onChange={e => handleChange('address_street', e.target.value)}
                                        placeholder="Av. Principal"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Número</label>
                                    <CustomInput
                                        type="text"
                                        value={form.address_number}
                                        onChange={e => handleChange('address_number', e.target.value)}
                                        placeholder="123"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Bairro</label>
                                    <CustomInput
                                        type="text"
                                        value={form.address_district}
                                        onChange={e => handleChange('address_district', e.target.value)}
                                        placeholder="Centro"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Estado (UF)</label>
                                    <CustomInput
                                        type="text"
                                        maxLength={2}
                                        value={form.address_state}
                                        onChange={e => handleChange('address_state', e.target.value.toUpperCase())}
                                        placeholder="SP"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                            Mantenha esses dados sempre atualizados para facilitar a coleta dos entregadores e o contato dos clientes.
                        </p>
                    </div>

                    <Button onClick={handleSave} disabled={saving} fullWidth className="mt-4 py-4">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Alterações</>}
                    </Button>
                </div>
            )}

            {/* Shipping Rules (Super Store Only) */}
            {activeTab === 'shipping' && (
                isSuperStore ? (
                    <StoreShippingRules />
                ) : (
                    <ExclusiveLock
                        title="Regras de Frete Avançadas"
                        description="Recurso Exclusivo: Acesso disponível apenas para Superlogista. Configure taxas fixas personalizadas ou crie regras de frete grátis."
                    />
                )
            )}
        </div>
    );
};
