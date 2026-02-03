
import React, { useState, useEffect } from 'react';
import { Settings, Truck, Save, Store, Lock, MapPin, Phone, Mail, Clock, Zap, Info, CheckCircle, AlertTriangle, X, User, Camera, Printer, Wallet, ChevronDown, Share2, Copy, ExternalLink, Power, MessageCircle } from 'lucide-react';
import { Loading } from './Loading';
import { Switch } from './Switch';
import { StreetAutocomplete } from './StreetAutocomplete';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { StoreShippingRules } from './StoreShippingRules';
import { StoreDeliverySettings } from './StoreDeliverySettings';
import { ExclusiveLock } from './ExclusiveLock';
import { CitySearchSelect } from './CitySearchSelect';
import { OpeningHoursModal } from './OpeningHoursModal';
import * as cloud from '../services/cloud';
import { PartnerProfile, City } from '../types';
import { formatPhoneNumber } from '../utils/mapHelpers';
import { useDialog } from '../utils/dialogService';
import { formatMinutes } from '../utils/formatMinutes';

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

    const [institutionalCategories, setInstitutionalCategories] = useState<any[]>([]);
    const [savingPrinter, setSavingPrinter] = useState(false);
    const [detectingPrinter, setDetectingPrinter] = useState(false);

    const [form, setForm] = useState({
        name: '',
        phone_number: '',
        contact_email: '',
        opening_hours: '',
        preparation_time_min: '0',
        preparation_time_max: '0',
        address_zip: '',
        address_street: '',
        address_number: '',
        address_district: '',
        city: '',
        address_state: '',
        address_complement: '',
        description: '',
        is_open: true,
        delivery_time_max: '0',
        delivery_status: true,
        store_category_id: ''
    });

    const [citySlug, setCitySlug] = useState('');
    const [storeSlug, setStoreSlug] = useState('');

    const loadProfileData = async () => {
        setLoading(true);
        try {
            const [p, cities, cats] = await Promise.all([
                cloud.getMyPartnerProfile(),
                cloud.getAvailableCities(),
                cloud.getInstitutionalCategories()
            ]);

            setProfile(p);
            setAvailableCities(cities);
            setInstitutionalCategories(cats);

            if (p) {
                setCoverUrl(p.cover_url || null);
                setLogoUrl(p.store_logo_url || null);

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
                    city: useStoreAddr
                        ? (p.store_address_city && p.store_address_state ? `${p.store_address_city} - ${p.store_address_state}` : (p.store_address_city || ''))
                        : (p.city || ''),
                    address_state: useStoreAddr ? (p.store_address_state || '') : (p.address_state || p.city?.split(' - ')[1] || ''),
                    address_complement: useStoreAddr ? (p.store_address_complement || '') : (p.address_complement || ''),
                    description: p.description || '',
                    is_open: p.is_currently_open ?? p.is_open ?? true,
                    delivery_time_max: String(p.delivery_time_max || 0),
                    delivery_status: p.is_available ?? true,
                    store_category_id: p.store_category_id || ''
                });

                setCitySlug(p.city_slug || '');
                setStoreSlug(p.store_slug || '');

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

            const user = await cloud.getClient()?.auth.getUser();
            if (user?.data.user) {
                const data = await cloud.getClient()?.from('user_profiles').select('is_super_store, super_store_expiration').eq('id', user.data.user.id).single();
                if (data?.data) {
                    setIsSuperStore(data.data.is_super_store);
                    setExpirationDate(data.data.super_store_expiration);
                }
            }
        } catch (e) {
            console.error(e);
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
            if (type === 'cover') {
                await cloud.updateMyPartnerProfile({ cover_url: url });
            } else {
                await cloud.updateMyPartnerProfile({ store_logo_url: url });
            }
            await alert({ title: 'Sucesso', message: `${type === 'cover' ? 'Capa' : 'Logo'} atualizada com sucesso!` });
        } catch (err: any) {
            await alert({ title: 'Erro no Upload', message: "Erro no upload: " + err.message });
        } finally {
            setUploadingAsset(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
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
                store_address_zip: rawZip,
                store_address_street: form.address_street,
                store_address_number: form.address_number,
                store_address_district: form.address_district,
                store_address_city: cityName,
                store_address_state: cityState,
                store_address_complement: form.address_complement,
                description: form.description,
                is_open: form.is_open,
                is_currently_open: form.is_open,
                delivery_time_max: Number(form.delivery_time_max),
                is_available: form.delivery_status,
                store_category_id: form.store_category_id || null
            });

            const wasManualOpen = (profile?.is_currently_open ?? profile?.is_open) === true;
            if (profile && wasManualOpen && !form.is_open) {
                try {
                    await cloud.generateDailyStoreReport(profile.id);
                    await alert({ title: 'Relatório Gerado', message: 'O relatório de fechamento de caixa foi gerado com sucesso.' });
                } catch (reportError) {
                    console.error("Erro ao gerar relatório:", reportError);
                }
            }

            await alert({ title: 'Sucesso', message: "Dados da loja atualizados com sucesso!" });
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

    const preparationMinLabel = formatMinutes(form.preparation_time_min);
    const preparationMaxLabel = formatMinutes(form.preparation_time_max);

    const handleDetectPrinter = async () => {
        setDetectingPrinter(true);
        try {
            await alert({
                title: 'Configuração de Impressora',
                message: 'O sistema abrirá a janela de impressão do seu navegador. Selecione sua impressora e realize um teste de impressão.'
            });
            window.print();
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

            {activeTab === 'general' && (
                <div className="space-y-10">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden relative group">
                        <div className="h-40 md:h-52 w-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 relative">
                            {coverUrl && <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />}
                            <label className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full cursor-pointer backdrop-blur-sm">
                                {uploadingAsset === 'cover' ? <Loading variant="inline" size="sm" /> : <Camera className="w-5 h-5" />}
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAssetUpload(e, 'cover')} />
                            </label>
                        </div>
                        <div className="absolute top-[80px] md:top-[120px] left-6">
                            <div className="relative group/logo">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 overflow-hidden shadow-lg flex items-center justify-center">
                                    {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Store className="w-10 h-10 md:w-12 md:h-12 text-gray-400" />}
                                </div>
                                <label className="absolute bottom-0 right-0 bg-brand-600 hover:bg-brand-700 text-white p-2 rounded-full cursor-pointer shadow-md border-2 border-white dark:border-gray-800">
                                    {uploadingAsset === 'logo' ? <Loading variant="inline" size="xs" /> : <Camera className="w-4 h-4" />}
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAssetUpload(e, 'logo')} />
                                </label>
                            </div>
                        </div>
                        <div className="mt-16 px-6 pb-6">
                            <h2 className="text-2xl font-bold dark:text-white">{form.name || 'Sua Loja'}</h2>
                            <p className="text-sm text-gray-500">{profile?.email}</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl space-y-8">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold flex items-center gap-2 dark:text-white"><Store className="w-5 h-5 text-brand-600" /> Catálogo Digital</h4>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold ${form.is_open ? 'text-green-600' : 'text-red-600'}`}>{form.is_open ? 'ABERTA' : 'FECHADA'}</span>
                                    <Switch checked={form.is_open} onChange={handleToggleOpen} />
                                </div>
                            </div>
                            {citySlug && storeSlug ? (
                                <div className="flex flex-col md:flex-row gap-3 items-center">
                                    <div className="flex-1 bg-white dark:bg-gray-800 border rounded-lg px-3 py-2 text-sm dark:text-gray-300 w-full truncate font-mono">
                                        {window.location.origin}/{citySlug}/{storeSlug}/produtos
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto">
                                        <Button variant="outline" onClick={handleCopyLink} className="flex-1"><Copy className="w-4 h-4 mr-2" /> Copiar</Button>
                                        <Button variant="outline" onClick={handleShareLink} className="flex-1"><Share2 className="w-4 h-4 mr-2" /> Compartilhar</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">Configure nome e endereço para ativar o catálogo.</div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Store className="w-5 h-5 text-gray-500" /> Informações Básicas</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <CustomInput label="Nome da Loja" value={form.name} onChange={e => handleChange('name', e.target.value)} icon={Store} />
                                <CustomSelect
                                    label="Segmento / Categoria"
                                    value={form.store_category_id}
                                    onChange={val => handleChange('store_category_id', val)}
                                    options={institutionalCategories.map(c => ({ label: c.name, value: c.id }))}
                                    placeholder="Selecione..."
                                />
                            </div>
                            <CustomInput label="Descrição" value={form.description} onChange={e => handleChange('description', e.target.value)} icon={Info} />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <CustomInput label="Preparo Mínimo (min)" value={form.preparation_time_min} onChange={e => handleChange('preparation_time_min', e.target.value.replace(/\D/g, ''))} icon={Zap} helperText={preparationMinLabel} />
                                <CustomInput label="Preparo Máximo (min)" value={form.preparation_time_max} onChange={e => handleChange('preparation_time_max', e.target.value.replace(/\D/g, ''))} icon={Zap} helperText={preparationMaxLabel} />
                                <CustomInput label="Telefone" value={form.phone_number} onChange={e => handleChange('phone_number', e.target.value)} mask="phone" icon={Phone} />
                            </div>
                            <CustomInput label="Horário de Funcionamento" value={form.opening_hours} onClick={() => setIsHoursModalOpen(true)} readOnly icon={Clock} className="cursor-pointer" />
                        </div>

                        <div className="pt-8 border-t dark:border-gray-700 space-y-6">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-gray-500" /> Endereço da Loja</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <CustomInput label="CEP" value={form.address_zip} onChange={e => handleChange('address_zip', e.target.value)} mask="cep" icon={MapPin} />
                                <div className="md:col-span-2">
                                    <CitySearchSelect label="Cidade" value={form.city} onSelect={city => setForm(prev => ({ ...prev, city: `${city.name} - ${city.state}`, address_state: city.state }))} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <StreetAutocomplete label="Rua" value={form.address_street} onChange={val => handleChange('address_street', val)} city={form.city?.split(' - ')[0]} />
                                <div className="grid grid-cols-2 gap-4">
                                    <CustomInput label="Número" value={form.address_number} onChange={e => handleChange('address_number', e.target.value)} />
                                    <CustomInput label="Bairro" value={form.address_district} onChange={e => handleChange('address_district', e.target.value)} />
                                </div>
                            </div>
                            <CustomInput label="Complemento" value={form.address_complement} onChange={e => handleChange('address_complement', e.target.value)} />
                        </div>

                        <Button onClick={handleSave} disabled={saving} fullWidth className="py-4 bg-brand-600 text-white font-black">
                            {saving ? <Loading variant="inline" size="sm" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Tudo</>}
                        </Button>
                    </div>
                </div>
            )}

            {activeTab === 'shipping' && (
                <div className="space-y-8">
                    <StoreDeliverySettings />
                    {isSuperStore ? <StoreShippingRules /> : <ExclusiveLock title="Regras Promocionais" description="Upgrade para Superlogista para acessar regras de frete grátis." />}
                </div>
            )}

            {activeTab === 'printer' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl space-y-6">
                    <div className={`p-4 rounded-xl border-2 ${printerSettings.use_printer ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10' : 'border-gray-200 dark:border-gray-700'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Printer className={`w-8 h-8 ${printerSettings.use_printer ? 'text-brand-600' : 'text-gray-400'}`} />
                                <div>
                                    <h4 className="font-bold dark:text-white">Impressora Térmica</h4>
                                    <p className="text-xs text-gray-500">{printerSettings.use_printer ? 'Configurada' : 'Não ativa'}</p>
                                </div>
                            </div>
                            <Button onClick={() => printerSettings.use_printer ? setPrinterSettings(prev => ({ ...prev, use_printer: false })) : handleDetectPrinter()} variant={printerSettings.use_printer ? 'outline' : 'primary'}>
                                {printerSettings.use_printer ? 'Desativar' : 'Ativar'}
                            </Button>
                        </div>
                    </div>
                    {printerSettings.use_printer && (
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
                            <CustomInput label="Largura (mm)" type="number" value={printerSettings.printer_width} onChange={e => setPrinterSettings({ ...printerSettings, printer_width: e.target.value })} />
                            <CustomInput label="Fonte Base" type="number" value={printerSettings.font_size_base} onChange={e => setPrinterSettings({ ...printerSettings, font_size_base: e.target.value })} />
                            <Button onClick={handleSavePrinter} disabled={savingPrinter} fullWidth className="col-span-2"><Save className="w-4 h-4 mr-2" /> Salvar Impressora</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
