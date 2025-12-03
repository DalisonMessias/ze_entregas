
import React, { useState, useEffect } from 'react';
import { Settings, Truck, Save, Loader2, Store, Lock, MapPin, Phone, Mail, Clock, Info } from 'lucide-react';
import { Button } from './Button';
import { StoreShippingRules } from './StoreShippingRules';
import { ExclusiveLock } from './ExclusiveLock';
import * as cloud from '../services/cloud';
import { PartnerProfile } from '../types';
import { formatPhoneNumber } from '../utils/mapHelpers';

export const StoreSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'shipping'>('general');
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSuperStore, setIsSuperStore] = useState(false);

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

            await cloud.updateMyPartnerProfile({
                name: form.name,
                phone_number: form.phone_number,
                contact_email: form.contact_email,
                opening_hours: form.opening_hours,
                address_zip: form.address_zip,
                address_street: form.address_street,
                address_number: form.address_number,
                address_district: form.address_district,
                address_state: form.address_state,
                city: cityFull
            });
            alert("Dados da loja atualizados com sucesso!");
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600"/></div>;

    return (
        <div className="space-y-6 animate-in fade-in pb-24">
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
                            <Store className="w-5 h-5 text-gray-500"/> Informações Básicas
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nome da Loja</label>
                                <input 
                                    type="text" 
                                    value={form.name} 
                                    onChange={e => handleChange('name', e.target.value)}
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                    placeholder="Ex: Pizzaria do Zé"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Horário de Funcionamento</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400"/>
                                    <input 
                                        type="text" 
                                        value={form.opening_hours} 
                                        onChange={e => handleChange('opening_hours', e.target.value)}
                                        className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        placeholder="Ex: Seg-Sex 18h às 23h"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                            <Phone className="w-5 h-5 text-gray-500"/> Contato
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Telefone / WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400"/>
                                    <input 
                                        type="tel" 
                                        value={form.phone_number} 
                                        onChange={e => handleChange('phone_number', formatPhoneNumber(e.target.value))}
                                        className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Email de Contato</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400"/>
                                    <input 
                                        type="email" 
                                        value={form.contact_email} 
                                        onChange={e => handleChange('contact_email', e.target.value)}
                                        className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        placeholder="contato@loja.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-gray-500"/> Endereço Completo
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase">CEP</label>
                                    <input 
                                        type="text" 
                                        value={form.address_zip} 
                                        onChange={e => handleChange('address_zip', e.target.value)}
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        placeholder="00000-000"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Cidade</label>
                                    <input 
                                        type="text" 
                                        value={form.city} 
                                        onChange={e => handleChange('city', e.target.value)}
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        placeholder="Nome da Cidade"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-[3fr_1fr] gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Rua</label>
                                    <input 
                                        type="text" 
                                        value={form.address_street} 
                                        onChange={e => handleChange('address_street', e.target.value)}
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        placeholder="Av. Principal"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Número</label>
                                    <input 
                                        type="text" 
                                        value={form.address_number} 
                                        onChange={e => handleChange('address_number', e.target.value)}
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        placeholder="123"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Bairro</label>
                                    <input 
                                        type="text" 
                                        value={form.address_district} 
                                        onChange={e => handleChange('address_district', e.target.value)}
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                        placeholder="Centro"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Estado (UF)</label>
                                    <input 
                                        type="text" 
                                        maxLength={2}
                                        value={form.address_state} 
                                        onChange={e => handleChange('address_state', e.target.value.toUpperCase())}
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
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
                        {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Save className="w-5 h-5 mr-2"/> Salvar Alterações</>}
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
