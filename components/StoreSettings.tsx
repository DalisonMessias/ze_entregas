
import React, { useState, useEffect } from 'react';
import { Settings, Truck, Save, Store, Lock, MapPin, Phone, Mail, Clock, Zap, Info, CheckCircle, AlertTriangle, X, User, Camera, Printer, Wallet, ChevronDown, Share2, Copy, ExternalLink, Power, MessageCircle } from 'lucide-react';
import { Loading } from './Loading';
import { Switch } from './Switch';
import { StreetAutocomplete } from './StreetAutocomplete';
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
import { useDialog } from '../utils/dialogService';

// --- TOAST COMPONENT ---



export const StoreSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'general' | 'shipping' | 'printer'>('general');
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [availableCities, setAvailableCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [expirationDate, setExpirationDate] = useState<string | null>(null);
    const { alert, confirm } = useDialog();
    const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);

    // Branding State
    const [coverUrl, setCoverUrl] = useState<string | null>(null);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [uploadingAsset, setUploadingAsset] = useState<'cover' | 'logo' | null>(null);

    // Printer Settings State
    const [printerSettings, setPrinterSettings] = useState({
        printer_width: '80',
        paper_type: 'thermal',
        margin_top: '0',
        margin_bottom: '0',
        margin_left: '2',
        margin_right: '2',
        font_size_base: '12',
        auto_cut: true,
        use_printer: false,
        printer_name: ''
    });
    const [savingPrinter, setSavingPrinter] = useState(false);
    const [detectingPrinter, setDetectingPrinter] = useState(false);
    const [detectedPrinters, setDetectedPrinters] = useState<string[]>([]);

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
        address_complement: '',
        description: '',
        is_open: true,


    });

    const [citySlug, setCitySlug] = useState('');
    const [storeSlug, setStoreSlug] = useState('');

    const loadProfileData = async () => {
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
                    address_complement: useStoreAddr ? (p.store_address_complement || '') : (p.store_address_complement || ''),
                    description: p.description || '',
                    is_open: p.is_open ?? true,


                });

                setCitySlug(p.city_slug || '');
                setStoreSlug(p.store_slug || '');


                // Load printer settings
                const { data: printerData } = await cloud.getClient()?.from('printer_settings').select('*').eq('store_id', p.id).single() || {};
                if (printerData) {
                    setPrinterSettings({
                        printer_width: String(printerData.printer_width || 80),
                        paper_type: printerData.paper_type || 'thermal',
                        margin_top: String(printerData.margin_top || 0),
                        margin_bottom: String(printerData.margin_bottom || 0),
                        margin_left: String(printerData.margin_left || 2),
                        margin_right: String(printerData.margin_right || 2),
                        font_size_base: String(printerData.font_size_base || 12),
                        auto_cut: printerData.auto_cut !== false,
                        use_printer: printerData.use_printer || false,
                        printer_name: printerData.printer_name || ''
                    });
                }
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

    useEffect(() => {
        loadProfileData();
    }, []);

    const handleChange = (field: string, value: string | boolean) => {
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

            await alert({ title: 'Sucesso', message: `${type === 'cover' ? 'Capa' : 'Logo'} atualizada com sucesso!` });
        } catch (err: any) {
            // console.error(err);
            await alert({ title: 'Erro no Upload', message: "Erro no upload: " + err.message });
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
                description: form.description,
                is_open: form.is_open,

                // Order Config


                // Also update legacy/display 'city' field for compatibility if needed, 
                // but usually 'city' on profile is for search. Let's keep them synced for now or just update store fields.
                // Updating regular address fields too? User asked to SEPARATE. 
                // So we should NOT overwrite 'address_*' (personal) with store address here.
                // We only save to store_address_*.
            });

            // Se a loja estava aberta e agora está fechada, gera o relatório
            if (profile && profile.is_open && !form.is_open) {
                try {
                    await cloud.generateDailyStoreReport(profile.id);
                    // Opcional: Avisar que o relatório foi gerado?
                    await alert({ title: 'Relatório Gerado', message: 'O relatório de fechamento de caixa foi gerado com sucesso.' });
                } catch (reportError) {
                    console.error("Erro ao gerar relatório no salvamento de configurações:", reportError);
                }
            }

            await alert({ title: 'Sucesso', message: "Dados da loja atualizados com sucesso!" });

            // Reload profile to get updated slugs/data
            await loadProfileData();
        } catch (e: any) {
            await alert({ title: 'Erro ao Salvar', message: 'Erro ao salvar: ' + e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleCopyLink = () => {
        const link = `${window.location.origin}/${citySlug}/${storeSlug}/produtos`;
        navigator.clipboard.writeText(link);
        alert({ title: 'Link Copiado', message: 'O link do seu catálogo foi copiado para a área de transferência.' });
    };

    const handleShareLink = async () => {
        const link = `${window.location.origin}/${citySlug}/${storeSlug}/produtos`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: form.name,
                    text: `Veja nosso cardápio digital: ${form.name}`,
                    url: link
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            handleCopyLink();
        }
    };

    const handleToggleOpen = () => {
        setForm(prev => ({ ...prev, is_open: !prev.is_open }));
    };

    const handleDetectPrinter = async () => {
        setDetectingPrinter(true);
        try {
            // 1. Alert user about what will happen
            await alert({
                title: 'Configuração de Impressora',
                message: 'O sistema abrirá a janela de impressão do seu navegador. Selecione sua impressora e realize um teste de impressão.'
            });

            // 2. Open print dialog
            window.print();

            // 3. Ask for confirmation
            const confirmed = await confirm({
                title: 'Confirmação de Teste',
                message: 'A impressão de teste saiu corretamente na sua impressora térmica?',
                confirmButtonText: 'Sim, funcionou',
                cancelButtonText: 'Não / Cancelar'
            });

            if (confirmed) {
                setPrinterSettings(prev => ({
                    ...prev,
                    use_printer: true,
                    printer_name: 'Impressora Configurada'
                }));
                await alert({
                    title: 'Impressora Ativada',
                    message: 'Sua impressora foi configurada e ativada com sucesso!'
                });
            } else {
                setPrinterSettings(prev => ({
                    ...prev,
                    use_printer: false,
                    printer_name: ''
                }));
            }

        } catch (error: any) {
            console.error('Erro ao detectar impressora:', error);
            await alert({
                title: 'Erro',
                message: 'Ocorreu um erro ao tentar configurar a impressora.'
            });
        } finally {
            setDetectingPrinter(false);
        }
    };

    const handleSavePrinter = async () => {
        setSavingPrinter(true);
        try {
            const user = await cloud.getClient()?.auth.getUser();
            if (!user?.data.user) throw new Error('Usuário não autenticado');

            const payload = {
                store_id: user.data.user.id,
                printer_width: parseInt(printerSettings.printer_width),
                paper_type: printerSettings.paper_type,
                margin_top: parseInt(printerSettings.margin_top),
                margin_bottom: parseInt(printerSettings.margin_bottom),
                margin_left: parseInt(printerSettings.margin_left),
                margin_right: parseInt(printerSettings.margin_right),
                font_size_base: parseInt(printerSettings.font_size_base),
                auto_cut: printerSettings.auto_cut,
                use_printer: printerSettings.use_printer,
                printer_name: printerSettings.printer_name
            };

            const { error } = await cloud.getClient()?.from('printer_settings').upsert(payload, { onConflict: 'store_id' }) || {};
            if (error) throw error;

            await alert({ title: 'Sucesso', message: 'Configurações de impressora salvas!' });
        } catch (e: any) {
            await alert({ title: 'Erro ao Salvar', message: 'Erro ao salvar: ' + e.message });
        } finally {
            setSavingPrinter(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loading variant="container" size="md" message="Carregando configurações..." /></div>;

    return (
        <div className="space-y-6 animate-in fade-in pb-24">


            <OpeningHoursModal
                isOpen={isHoursModalOpen}
                onClose={() => setIsHoursModalOpen(false)}
                onConfirm={(val) => handleChange('opening_hours', val)}
                initialValue={form.opening_hours}
            />

            {/* Header / Tabs */}
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-6 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'general' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500'}`}
                >
                    <Store className="w-4 h-4" /> Dados da Loja
                </button>
                <button
                    onClick={() => setActiveTab('shipping')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'shipping' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500'}`}
                >
                    {isSuperStore ? <Truck className="w-4 h-4" /> : <Lock className="w-4 h-4" />} Config. Frete
                </button>
                <button
                    onClick={() => setActiveTab('printer')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'printer' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500'}`}
                >
                    <Printer className="w-4 h-4" /> Impressora
                </button>
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
                    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden relative group">
                        {/* Cover Image */}
                        <div className="h-40 md:h-52 w-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 relative">
                            {coverUrl && (
                                <img src={coverUrl} alt="Capa da Loja" className="w-full h-full object-cover" />
                            )}

                            <label className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer transition-all backdrop-blur-sm">
                                {uploadingAsset === 'cover' ? <Loading variant="inline" size="sm" /> : <Camera className="w-5 h-5" />}
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/bmp, image/tiff"
                                    onChange={(e) => handleAssetUpload(e, 'cover')}
                                />
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
                                    {uploadingAsset === 'logo' ? <Loading variant="inline" size="xs" /> : <Camera className="w-4 h-4" />}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/bmp, image/tiff"
                                        onChange={(e) => handleAssetUpload(e, 'logo')}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="mt-16 px-6 pb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{form.name || 'Nome da Sua Loja'}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
                        </div>
                    </div>


                    {/* Store Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl space-y-8">

                        {/* Catalog Link & Status Section */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Store className="w-5 h-5 text-brand-600" /> Catálogo Digital
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${form.is_open ? 'text-green-600' : 'text-red-600'}`}>
                                        {form.is_open ? 'LOJA ABERTA' : 'LOJA FECHADA'}
                                    </span>
                                    <Switch
                                        checked={form.is_open}
                                        onChange={handleToggleOpen}
                                    />
                                </div>
                            </div>

                            {citySlug && storeSlug ? (
                                <div className="flex flex-col md:flex-row gap-3 items-center">
                                    <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-300 w-full truncate font-mono">
                                        {window.location.origin}/{citySlug}/{storeSlug}/produtos
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <Button type="button" variant="outline" onClick={handleCopyLink} className="flex-1 md:flex-none">
                                            <Copy className="w-4 h-4 mr-2" /> Copiar
                                        </Button>
                                        <Button type="button" variant="outline" onClick={handleShareLink} className="flex-1 md:flex-none">
                                            <Share2 className="w-4 h-4 mr-2" /> Compartilhar
                                        </Button>
                                        <a
                                            href={`/${citySlug}/${storeSlug}/produtos`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                                        >
                                            <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                                    Salve as configurações de endereço (Cidade) e Nome para gerar o link do catálogo.
                                </div>
                            )}

                            <p className="text-xs text-gray-500">
                                Definir a loja como <strong>Fechada</strong> impedirá que clientes finalizem novos pedidos, mas o catálogo permanecerá visível.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                                <Store className="w-5 h-5 text-gray-500" /> Informações Básicas
                            </h3>
                            <div className="space-y-4">
                                {/* Linha 1: Nome e Horário */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomInput
                                        label="Nome da Loja"
                                        type="text"
                                        value={form.name}
                                        onChange={e => handleChange('name', e.target.value)}
                                        placeholder="Ex: Pizzaria do Zé"
                                        icon={Store}
                                    />
                                    <div className="md:col-span-2">
                                        <CustomInput
                                            label="Descrição da Loja"
                                            type="text"
                                            value={form.description}
                                            onChange={e => handleChange('description', e.target.value)}
                                            placeholder="Descreva sua loja, especialidades..."
                                            icon={Info}
                                        />
                                    </div>
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
                                </div>

                                {/* Linha 2: Preparo Min, Max e Telefone */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <CustomInput
                                        label="Preparo Mínimo (min)"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={form.preparation_time_min}
                                        onChange={e => handleChange('preparation_time_min', e.target.value.replace(/\D/g, ''))}
                                        placeholder="Min"
                                        icon={Zap}
                                        helperText="Ex: 10 min"
                                    />
                                    <CustomInput
                                        label="Preparo Máximo (min)"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={form.preparation_time_max}
                                        onChange={e => handleChange('preparation_time_max', e.target.value.replace(/\D/g, ''))}
                                        placeholder="Max"
                                        icon={Zap}
                                        helperText="Ex: 20 min"
                                    />
                                    <CustomInput
                                        label="Telefone / WhatsApp da Loja"
                                        type="tel"
                                        value={form.phone_number}
                                        onChange={e => handleChange('phone_number', e.target.value)}
                                        placeholder="(00) 00000-0000"
                                        mask="phone"
                                        icon={Phone}
                                    />
                                </div>

                                <CustomInput
                                    label="E-mail da Loja"
                                    type="email"
                                    value={form.contact_email}
                                    onChange={e => handleChange('contact_email', e.target.value)}
                                    placeholder="email@loja.com"
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
                                    <div className="relative">
                                        <StreetAutocomplete
                                            label="Rua"
                                            value={form.address_street}
                                            onChange={val => handleChange('address_street', val)}
                                            city={form.city ? form.city.split(' - ')[0] : ''}
                                            placeholder="Av. Principal"
                                        />
                                    </div>
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

                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            fullWidth
                            className="mt-4 py-4 bg-white !text-brand-600 hover:!bg-gray-100 border-2 border-gray-100 dark:border-gray-700 font-black shadow-sm"
                        >
                            {saving ? <Loading variant="inline" size="sm" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Alterações da Loja</>}
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
            )
            }

            {/* Printer Settings */}
            {activeTab === 'printer' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl space-y-6">
                    <div>
                        <h3 className="font-bold text-lg dark:text-white mb-2 flex items-center gap-2">
                            <Printer className="w-5 h-5 text-gray-500" /> Configurações de Impressora
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Gerencie a impressão de tickets de pedidos e configure sua impressora térmica.
                        </p>

                        {/* Master Toggle */}
                        <div className={`p-4 rounded-xl border-2 transition-all mb-8 ${printerSettings.use_printer ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${printerSettings.use_printer ? 'bg-brand-100 text-brand-600' : 'bg-gray-200 text-gray-500'}`}>
                                        <Printer className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 dark:text-white">Utilizar Impressora</h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {printerSettings.use_printer ? 'Impressão habilitada e configurada.' : 'Nenhuma impressora ativa. A opção de imprimir será ocultada.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {printerSettings.use_printer && (
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Ativa
                                        </span>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (printerSettings.use_printer) {
                                                // Disable
                                                setPrinterSettings(prev => ({ ...prev, use_printer: false }));
                                            } else {
                                                // Enable logic -> must detect
                                                handleDetectPrinter();
                                            }
                                        }}
                                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${printerSettings.use_printer ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
                                    >
                                        {printerSettings.use_printer ? 'Desativar' : 'Ativar e Configurar'}
                                    </button>
                                </div>
                            </div>

                            {printerSettings.use_printer && printerSettings.printer_name && (
                                <div className="mt-4 pt-4 border-t border-brand-200 dark:border-brand-800/30 flex justify-between items-center">
                                    <span className="text-xs font-medium text-brand-800 dark:text-brand-300">Impressora Detectada: <span className="font-bold">{printerSettings.printer_name}</span></span>
                                    <button onClick={handleDetectPrinter} className="text-xs font-bold text-brand-600 hover:underline">
                                        Refazer Teste de Impressão
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Settings Form - Only show if enabled */}
                        {printerSettings.use_printer && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                {/* Paper Settings */}
                                <div>
                                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-4">Tipo de Papel</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Largura do Papel</label>
                                            <select
                                                value={printerSettings.printer_width}
                                                onChange={(e) => setPrinterSettings(prev => ({ ...prev, printer_width: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                            >
                                                <option value="58">58mm (Compacta)</option>
                                                <option value="80">80mm (Padrão)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Tipo de Papel</label>
                                            <select
                                                value={printerSettings.paper_type}
                                                onChange={(e) => setPrinterSettings(prev => ({ ...prev, paper_type: e.target.value }))}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                            >
                                                <option value="thermal">Térmico</option>
                                                <option value="a4">A4 (Comum)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Margins */}
                                <div>
                                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-4">Margens (mm)</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <CustomInput
                                            label="Superior"
                                            type="number"
                                            value={printerSettings.margin_top}
                                            onChange={(e) => setPrinterSettings(prev => ({ ...prev, margin_top: e.target.value }))}
                                            placeholder="0"
                                        />
                                        <CustomInput
                                            label="Inferior"
                                            type="number"
                                            value={printerSettings.margin_bottom}
                                            onChange={(e) => setPrinterSettings(prev => ({ ...prev, margin_bottom: e.target.value }))}
                                            placeholder="0"
                                        />
                                        <CustomInput
                                            label="Esquerda"
                                            type="number"
                                            value={printerSettings.margin_left}
                                            onChange={(e) => setPrinterSettings(prev => ({ ...prev, margin_left: e.target.value }))}
                                            placeholder="2"
                                        />
                                        <CustomInput
                                            label="Direita"
                                            type="number"
                                            value={printerSettings.margin_right}
                                            onChange={(e) => setPrinterSettings(prev => ({ ...prev, margin_right: e.target.value }))}
                                            placeholder="2"
                                        />
                                    </div>
                                </div>

                                {/* Font & Options */}
                                <div>
                                    <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-4">Aparência</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <CustomInput
                                            label="Tamanho da Fonte (pt)"
                                            type="number"
                                            value={printerSettings.font_size_base}
                                            onChange={(e) => setPrinterSettings(prev => ({ ...prev, font_size_base: e.target.value }))}
                                            placeholder="12"
                                            helperText="Tamanho base do texto no ticket"
                                        />
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                            <input
                                                type="checkbox"
                                                id="auto_cut"
                                                checked={printerSettings.auto_cut}
                                                onChange={(e) => setPrinterSettings(prev => ({ ...prev, auto_cut: e.target.checked }))}
                                                className="w-5 h-5 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                                            />
                                            <label htmlFor="auto_cut" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                                Corte automático do papel
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-blue-800 dark:text-blue-200">
                                        <p className="font-bold mb-1">Dica de Configuração</p>
                                        <p>Para impressoras térmicas de 80mm, use as configurações padrão. Se o ticket estiver cortado ou com margens erradas, ajuste os valores acima.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


