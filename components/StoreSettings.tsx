
import React, { useState, useEffect } from 'react';
import { Settings, Truck, Save, Loader2, Store, Lock, MapPin, Phone, Mail, Clock, Zap, Info, CheckCircle, AlertTriangle, X, User, Camera } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { StoreShippingRules } from './StoreShippingRules';
import { StoreDeliverySettings } from './StoreDeliverySettings';
import { ExclusiveLock } from './ExclusiveLock';
import { CitySearchSelect } from './CitySearchSelect';
import { OpeningHoursModal } from './OpeningHoursModal';
import * as cloud from '../services/cloud';
import { PartnerProfile, City } from '../types';
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
    const [availableCities, setAvailableCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [expirationDate, setExpirationDate] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);

    // Branding State
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [uploadingAsset, setUploadingAsset] = useState<'cover' | 'logo' | null>(null);

    // Form State


    // Agora usando store_address_* para a loja, mas inicializando com fallback se vazio
    const [form, setForm] = useState({
        name: '',
        phone_number: '',
        contact_email: '',
        opening_hours: '',
        preparation_time_min: '0',
        preparation_time_max: '0',

        // Store Address Fields
        address_zip: '',
        address_street: '',
        address_number: '',
        address_district: '',
        city: '',
        address_state: '',
        address_complement: ''
    });

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [p, cities] = await Promise.all([
                    cloud.getMyPartnerProfile(),
                    cloud.getAvailableCities()
                ]);

                setProfile(p);
                setAvailableCities(cities);

                if (p) {


                    setCoverUrl(p.cover_url || null);
                    setLogoUrl(p.store_logo_url || null);

                    // Lógica de Fallback Inteligente: Se store_address_* estiver vazio, usa o address_* (migração suave) 
                    // Se store_address_* estiver preenchido, usa ele.
                    const useStoreAddr = !!p.store_address_zip || !!p.store_address_street;

                    setForm({
                        name: p.store_name || p.name || '',
                        phone_number: p.phone_number || '',
                        contact_email: p.contact_email || p.email || '',
                        opening_hours: p.opening_hours || '',
                        preparation_time_min: String(p.preparation_time_min || 0),
                        preparation_time_max: String(p.preparation_time_max || 0),

                        address_zip: useStoreAddr ? (p.store_address_zip || '') : (p.address_zip || ''),
                        address_street: useStoreAddr ? (p.store_address_street || '') : (p.address_street || ''),
                        address_number: useStoreAddr ? (p.store_address_number || '') : (p.address_number || ''),
                        address_district: useStoreAddr ? (p.store_address_district || '') : (p.address_district || ''),

                        // Parse City/State
                        city: useStoreAddr
                            ? (p.store_address_city && p.store_address_state ? `${p.store_address_city} - ${p.store_address_state}` : (p.store_address_city || ''))
                            : (p.city || ''),

                        address_state: useStoreAddr ? (p.store_address_state || '') : (p.address_state || p.city?.split(' - ')[1] || ''),
                        address_complement: useStoreAddr ? (p.store_address_complement || '') : (p.store_address_complement || '') // TODO: Add to generic too if needed
                    });
                }

                // Check super store status
                const user = await cloud.getClient()?.auth.getUser();
                if (user?.data.user) {
                    const data = await cloud.getClient()?.from('user_profiles').select('is_super_store, super_store_expiration').eq('id', user.data.user.id).single();
                    if (data?.data) {
                        setIsSuperStore(data.data.is_super_store);
                        setExpirationDate(data.data.super_store_expiration);
                    }
                }
            } catch (e) {
                // console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'logo') => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploadingAsset(type);

        try {
            const url = await cloud.uploadStoreAsset(file, type);
            if (type === 'cover') setCoverUrl(url);
            else setLogoUrl(url);

            // Auto-save the URL to profile immediately
            if (type === 'cover') {
                await cloud.updateMyPartnerProfile({ cover_url: url });
            } else {
                await cloud.updateMyPartnerProfile({ store_logo_url: url });
            }

            setToast({ type: 'success', message: `${type === 'cover' ? 'Capa' : 'Logo'} atualizada com sucesso!` });
        } catch (err: any) {
            // console.error(err);
            setToast({ type: 'error', message: "Erro no upload: " + err.message });
        } finally {
            setUploadingAsset(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Construct city string properly
            // Form.city is likely "CityName - UF" from the picker
            // We want to save separate fields for store address

            const cityParts = form.city.split(' - ');
            const cityName = cityParts[0];
            const cityState = form.address_state || cityParts[1] || '';

            const rawPhone = (form.phone_number || '').replace(/\D/g, '');
            const rawZip = (form.address_zip || '').replace(/\D/g, '');

            await cloud.updateMyPartnerProfile({
                store_name: form.name,
                phone_number: rawPhone,
                contact_email: form.contact_email,
                opening_hours: form.opening_hours,
                preparation_time_min: parseInt(form.preparation_time_min) || 0,
                preparation_time_max: parseInt(form.preparation_time_max) || 0,

                // Saving to NEW Store Address fields
                store_address_zip: rawZip,
                store_address_street: form.address_street,
                store_address_number: form.address_number,
                store_address_district: form.address_district,
                store_address_city: cityName,
                store_address_state: cityState,
                store_address_complement: form.address_complement,

                // Also update legacy/display 'city' field for compatibility if needed, 
                // but usually 'city' on profile is for search. Let's keep them synced for now or just update store fields.
                // Updating regular address fields too? User asked to SEPARATE. 
                // So we should NOT overwrite 'address_*' (personal) with store address here.
                // We only save to store_address_*.
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

            <OpeningHoursModal
                isOpen={isHoursModalOpen}
                onClose={() => setIsHoursModalOpen(false)}
                onConfirm={(val) => handleChange('opening_hours', val)}
                initialValue={form.opening_hours}
            />

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

            {/* Super Store Expiration Banner */}
            {isSuperStore && expirationDate && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-full text-amber-600 dark:text-amber-400">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Super Lojista Ativo</h4>
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                Seu plano vence em: <strong>{new Date(expirationDate).toLocaleDateString('pt-BR')}</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}


            {/* General Settings */}
            {activeTab === 'general' && (
                <div className="space-y-10">

                    {/* --- BRANDING SECTION (NEW) --- */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden relative group">
                        {/* Cover Image */}
                        <div className="h-40 md:h-52 w-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 relative">
                            {coverUrl && (
                                <img src={coverUrl} alt="Capa da Loja" className="w-full h-full object-cover" />
                            )}

                            <label className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer transition-all backdrop-blur-sm">
                                {uploadingAsset === 'cover' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAssetUpload(e, 'cover')} />
                            </label>
                        </div>

                        {/* Store Logo */}
                        <div className="absolute top-[80px] md:top-[120px] left-6">
                            <div className="relative group/logo">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 overflow-hidden shadow-lg flex items-center justify-center">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                    ) : (
                                        <Store className="w-10 h-10 md:w-12 md:h-12 text-gray-400" />
                                    )}
                                </div>
                                <label className="absolute bottom-0 right-0 bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-full cursor-pointer shadow-md transition-all border-2 border-white dark:border-gray-800">
                                    {uploadingAsset === 'logo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAssetUpload(e, 'logo')} />
                                </label>
                            </div>
                        </div>

                        <div className="mt-16 px-6 pb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{form.name || 'Nome da Sua Loja'}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
                        </div>
                    </div>


                    {/* Store Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-8">
                        <div>
                            <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                                <Store className="w-5 h-5 text-gray-500" /> Informações Básicas
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <CustomInput
                                    label="Nome da Loja"
                                    type="text"
                                    value={form.name}
                                    onChange={e => handleChange('name', e.target.value)}
                                    placeholder="Ex: Pizzaria do Zé"
                                    icon={Store}
                                />
                                <CustomInput
                                    label="Horário de Funcionamento"
                                    type="text"
                                    value={form.opening_hours}
                                    onClick={() => setIsHoursModalOpen(true)}
                                    readOnly
                                    placeholder="Toque para configurar horários"
                                    icon={Clock}
                                    className="cursor-pointer"
                                    helperText="Defina os horários que sua loja estará aberta no app."
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <CustomInput
                                        label="Preparo Mínimo (min)"
                                        type="number"
                                        value={form.preparation_time_min}
                                        onChange={e => handleChange('preparation_time_min', e.target.value)}
                                        placeholder="Min"
                                        icon={Zap}
                                        helperText="Ex: 10 min"
                                    />
                                    <CustomInput
                                        label="Preparo Máximo (min)"
                                        type="number"
                                        value={form.preparation_time_max}
                                        onChange={e => handleChange('preparation_time_max', e.target.value)}
                                        placeholder="Max"
                                        icon={Zap}
                                        helperText="Ex: 20 min"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CustomInput
                                    label="Telefone / WhatsApp da Loja"
                                    type="tel"
                                    value={form.phone_number}
                                    onChange={e => handleChange('phone_number', e.target.value)}
                                    placeholder="(00) 00000-0000"
                                    mask="phone"
                                    icon={Phone}
                                />
                                <CustomInput
                                    label="Email de Contato da Loja"
                                    type="email"
                                    value={form.contact_email}
                                    onChange={e => handleChange('contact_email', e.target.value)}
                                    placeholder="contato@loja.com"
                                    icon={Mail}
                                />
                            </div>
                        </div>

                        {/* Store Address (Separated) */}
                        <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-gray-500" /> Endereço da Loja
                            </h3>
                            <p className="text-xs text-gray-500 mb-4 -mt-2">Este endereço será exibido para os clientes e usado para calcular o frete.</p>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <CustomInput
                                        label="CEP"
                                        type="text"
                                        value={form.address_zip}
                                        onChange={e => handleChange('address_zip', e.target.value)}
                                        placeholder="00000-000"
                                        mask="cep"
                                        icon={MapPin}
                                    />
                                    <div className="md:col-span-2">
                                        <CitySearchSelect
                                            label="Cidade"
                                            value={form.city}
                                            onSelect={(city) => {
                                                setForm(prev => ({
                                                    ...prev,
                                                    city: `${city.name} - ${city.state}`,
                                                    address_state: city.state
                                                }));
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomInput
                                        label="Rua"
                                        type="text"
                                        value={form.address_street}
                                        onChange={e => handleChange('address_street', e.target.value)}
                                        placeholder="Av. Principal"
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <CustomInput
                                            label="Número"
                                            type="text"
                                            value={form.address_number}
                                            onChange={e => handleChange('address_number', e.target.value)}
                                            placeholder="123"
                                        />
                                        <CustomInput
                                            label="UF"
                                            type="text"
                                            maxLength={2}
                                            value={form.address_state}
                                            onChange={e => handleChange('address_state', e.target.value.toUpperCase())}
                                            placeholder="SP"
                                            readOnly
                                            className="opacity-70"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomInput
                                        label="Bairro"
                                        type="text"
                                        value={form.address_district}
                                        onChange={e => handleChange('address_district', e.target.value)}
                                        placeholder="Centro"
                                    />
                                    <CustomInput
                                        label="Complemento"
                                        type="text"
                                        value={form.address_complement}
                                        onChange={e => handleChange('address_complement', e.target.value)}
                                        placeholder="Sala 1, Térreo..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-8 mb-8">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3 ">
                                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-blue-800 dark:text-blue-200">
                                    Estas informações são exclusivas da <strong>{form.name || 'Loja'}</strong> e não alteram seus dados pessoais de cadastro.
                                </p>
                            </div>
                        </div>

                        <Button onClick={handleSave} disabled={saving} fullWidth className="mt-4 py-4">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Alterações da Loja</>}
                        </Button>
                    </div>


                </div>
            )}


            {/* Shipping Settings */}
            {activeTab === 'shipping' && (
                <div className="space-y-8">
                    {/* Basic Delivery Settings (Available to Everyone) */}
                    <StoreDeliverySettings />

                    {/* Advanced Rules (Super Store Only) */}
                    {isSuperStore ? (
                        <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
                            <StoreShippingRules />
                        </div>
                    ) : (
                        <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
                            <ExclusiveLock
                                title="Regras Promocionais Avançadas"
                                description="Recurso Exclusivo: Acesso disponível apenas para Superlogista. Crie regras de frete grátis por valor mínimo e outras promoções."
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


