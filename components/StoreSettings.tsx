import React, { useState, useEffect } from 'react';
import { Truck, Save, Store, MapPin, Phone, Mail, Clock, Zap, Info, User, Camera, Printer, Share2, Copy, Power } from 'lucide-react';
import { Loading } from './Loading';
import { StreetAutocomplete } from './StreetAutocomplete';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { MobileTabsSelect } from './MobileTabsSelect';
import { StoreShippingRules } from './StoreShippingRules';
import { StoreDeliverySettings } from './StoreDeliverySettings';
import { ExclusiveLock } from './ExclusiveLock';
import { CitySearchSelect } from './CitySearchSelect';
import { OpeningHoursModal } from './OpeningHoursModal';
import * as cloud from '../services/cloud';
import { PartnerProfile } from '../types';
import { useDialog } from '../utils/dialogService';
import { formatMinutes } from '../utils/formatMinutes';

type TabKey = 'profile' | 'operation' | 'branding' | 'shipping' | 'printer';

export const StoreSettings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('profile');
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [loadingPrinter, setLoadingPrinter] = useState(false);
    const [printerLoaded, setPrinterLoaded] = useState(false);
    const [saving, setSaving] = useState(false);
    const [shippingMounted, setShippingMounted] = useState(false);
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [expirationDate, setExpirationDate] = useState<string | null>(null);
    const [loadingSuperStore, setLoadingSuperStore] = useState(false);
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
        delivery_status: true,
        store_category_id: ''
    });

    const [citySlug, setCitySlug] = useState('');
    const [storeSlug, setStoreSlug] = useState('');

    const tabs: { id: TabKey; label: string; icon: React.ElementType }[] = [
        { id: 'profile', label: 'Perfil', icon: User },
        { id: 'operation', label: 'Operação', icon: Power },
        { id: 'branding', label: 'Aparência', icon: Camera },
        { id: 'shipping', label: 'Entrega/Retirada', icon: Truck },
        { id: 'printer', label: 'Impressora', icon: Printer }
    ];

    const loadSuperStoreStatus = async () => {
        setLoadingSuperStore(true);
        try {
            const user = await cloud.getClient()?.auth.getUser();
            if (user?.data.user) {
                const data = await cloud.getClient()?.from('user_profiles').select('is_super_store, super_store_expiration').eq('id', user.data.user.id).single();
                if (data?.data) {
                    setIsSuperStore(!!data.data.is_super_store);
                    setExpirationDate(data.data.super_store_expiration || null);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingSuperStore(false);
        }
    };

    const loadProfileData = async () => {
        setLoadingProfile(true);
        try {
            const [p, cats] = await Promise.all([
                cloud.getMyPartnerProfile(),
                cloud.getInstitutionalCategories()
            ]);

            setProfile(p);
            setInstitutionalCategories(cats || []);

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
                    delivery_status: p.is_available ?? true,
                    store_category_id: p.store_category_id || ''
                });

                setCitySlug(p.city_slug || '');
                setStoreSlug(p.store_slug || '');

                if (p.is_super_store !== undefined && p.is_super_store !== null) {
                    setIsSuperStore(!!p.is_super_store);
                    setExpirationDate(p.super_store_expiration || null);
                } else {
                    setIsSuperStore(false);
                    setExpirationDate(null);
                    loadSuperStoreStatus();
                }
            } else {
                setIsSuperStore(false);
                setExpirationDate(null);
                loadSuperStoreStatus();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingProfile(false);
        }
    };

    const loadPrinterSettings = async (storeId: string) => {
        setLoadingPrinter(true);
        try {
            const { data: printerData } = await cloud.getClient()?.from('printer_settings').select('*').eq('store_id', storeId).single() || {};
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
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingPrinter(false);
            setPrinterLoaded(true);
        }
    };

    useEffect(() => {
        loadProfileData();
    }, []);

    useEffect(() => {
        if (activeTab !== 'printer' || printerLoaded || !profile?.id) return;
        loadPrinterSettings(profile.id);
    }, [activeTab, printerLoaded, profile?.id]);

    useEffect(() => {
        if (activeTab === 'shipping') {
            setShippingMounted(true);
        }
    }, [activeTab]);

    useEffect(() => {
        const timeout = setTimeout(() => setShippingMounted(true), 400);
        return () => clearTimeout(timeout);
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

            const { error } = await cloud.updateMyPartnerProfile({
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
                is_available: form.delivery_status,
                store_category_id: form.store_category_id ? String(form.store_category_id) : null
            });
            if (error) throw error;

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

    if (loadingProfile) return <div className="flex justify-center p-10"><Loading variant="container" size="md" message="Carregando configurações..." /></div>;

    return (
        <div className="space-y-5 md:space-y-6 animate-in fade-in pb-24">
            <OpeningHoursModal
                isOpen={isHoursModalOpen}
                onClose={() => setIsHoursModalOpen(false)}
                onConfirm={(val) => handleChange('opening_hours', val)}
                initialValue={form.opening_hours}
            />

            <MobileTabsSelect
                value={activeTab}
                onChange={(val) => setActiveTab(val as TabKey)}
                options={tabs.map(tab => ({ value: tab.id, label: tab.label }))}
                label="Seção"
                className="md:hidden"
            />
            <div className="hidden md:flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {!loadingSuperStore && isSuperStore && expirationDate && (
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

            {activeTab === 'profile' && (
                <div className="space-y-5 md:space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Informações da Loja</h3>
                            <p className="text-xs text-gray-400">Nome, categoria e descrição do seu negócio.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomInput label="Nome da Loja" value={form.name} onChange={e => handleChange('name', e.target.value)} icon={Store} />
                            <CustomSelect
                                label="Segmento / Categoria"
                                value={form.store_category_id}
                                onChange={val => handleChange('store_category_id', String(val))}
                                options={institutionalCategories.map(c => ({ label: c.name, value: String(c.id) }))}
                                placeholder="Selecione..."
                            />
                        </div>
                        <CustomInput label="Descrição" value={form.description} onChange={e => handleChange('description', e.target.value)} icon={Info} />
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Contato</h3>
                            <p className="text-xs text-gray-400">Como clientes podem falar com a sua loja.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomInput label="Telefone" value={form.phone_number} onChange={e => handleChange('phone_number', e.target.value)} mask="phone" icon={Phone} />
                            <CustomInput label="E-mail de Contato" type="email" value={form.contact_email} onChange={e => handleChange('contact_email', e.target.value)} icon={Mail} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Endereço da Loja</h3>
                            <p className="text-xs text-gray-400">Usamos estes dados para seu catálogo e entregas.</p>
                        </div>
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

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Catálogo Digital</h3>
                            <p className="text-xs text-gray-400">Compartilhe o link do seu cardápio com clientes.</p>
                        </div>
                        {citySlug && storeSlug ? (
                            <div className="flex flex-col md:flex-row gap-3 items-center">
                                <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:text-gray-300 w-full truncate font-mono">
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

                    <Button onClick={handleSave} disabled={saving} fullWidth className="py-4 bg-brand-600 text-white font-black">
                        {saving ? <Loading variant="inline" size="sm" /> : <><Save className="w-5 h-5 mr-2" /> Salvar alterações</>}
                    </Button>
                </div>
            )}

            {activeTab === 'operation' && (
                <div className="space-y-5 md:space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Horário de Funcionamento</h3>
                            <p className="text-xs text-gray-400">Defina seus horários para clientes visualizarem.</p>
                        </div>
                        <CustomInput
                            label="Horário de Funcionamento"
                            value={form.opening_hours}
                            onClick={() => setIsHoursModalOpen(true)}
                            readOnly
                            icon={Clock}
                            className="cursor-pointer"
                        />
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Tempo de Preparo</h3>
                            <p className="text-xs text-gray-400">Intervalo estimado de preparação dos pedidos.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomInput label="Preparo Mínimo (min)" value={form.preparation_time_min} onChange={e => handleChange('preparation_time_min', e.target.value.replace(/\D/g, ''))} icon={Zap} helperText={preparationMinLabel} />
                            <CustomInput label="Preparo Máximo (min)" value={form.preparation_time_max} onChange={e => handleChange('preparation_time_max', e.target.value.replace(/\D/g, ''))} icon={Zap} helperText={preparationMaxLabel} />
                        </div>
                    </div>

                    <Button onClick={handleSave} disabled={saving} fullWidth className="py-4 bg-brand-600 text-white font-black">
                        {saving ? <Loading variant="inline" size="sm" /> : <><Save className="w-5 h-5 mr-2" /> Salvar alterações</>}
                    </Button>
                </div>
            )}

            {activeTab === 'branding' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Capa</h3>
                                <p className="text-xs text-gray-400">Imagem principal do seu catálogo. (Recomendado: 1200x400px)</p>
                            </div>
                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                {uploadingAsset === 'cover' ? <Loading variant="inline" size="xs" /> : <Camera className="w-4 h-4" />}
                                Alterar
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAssetUpload(e, 'cover')} />
                            </label>
                        </div>
                        <div className="h-28 md:h-32 w-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-xl overflow-hidden">
                            {coverUrl ? (
                                <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Sem capa</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Logo</h3>
                                <p className="text-xs text-gray-400">Identidade visual da sua loja.</p>
                            </div>
                            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                                {uploadingAsset === 'logo' ? <Loading variant="inline" size="xs" /> : <Camera className="w-4 h-4" />}
                                Alterar
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAssetUpload(e, 'logo')} />
                            </label>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <Store className="w-8 h-8 text-gray-400" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{form.name || 'Sua Loja'}</p>
                                <p className="text-xs text-gray-400">Use uma imagem quadrada (Recomendado: 400x400px).</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {shippingMounted ? (
                <div className={activeTab === 'shipping' ? 'space-y-5 md:space-y-6' : 'hidden'}>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Entrega e Retirada</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Configure como seus clientes recebem os pedidos.</p>
                    </div>
                    <StoreDeliverySettings profile={profile} />
                    {loadingSuperStore ? (
                        <div className="flex justify-center p-6"><Loading variant="inline" size="sm" /></div>
                    ) : (
                        isSuperStore
                            ? <StoreShippingRules />
                            : <ExclusiveLock title="Regras Promocionais" description="Upgrade para Superlogista para acessar regras de frete grátis." />
                    )}
                </div>
            ) : activeTab === 'shipping' ? (
                <div className="space-y-5 md:space-y-6">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Entrega e Retirada</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Configure como seus clientes recebem os pedidos.</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex justify-center">
                        <Loading variant="container" size="sm" message="Carregando opções de entrega..." />
                    </div>
                </div>
            ) : null}

            {activeTab === 'printer' && (
                <div className="space-y-5 md:space-y-6">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Impressora</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Configure sua impressora térmica para pedidos.</p>
                    </div>

                    {loadingPrinter ? (
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 flex justify-center">
                            <Loading variant="container" size="sm" message="Carregando impressora..." />
                        </div>
                    ) : (
                        <>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${printerSettings.use_printer ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <Printer className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold dark:text-white">Impressora Térmica</h4>
                                            <p className="text-xs text-gray-500">{printerSettings.use_printer ? 'Configurada' : 'Não ativa'}</p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => printerSettings.use_printer ? setPrinterSettings(prev => ({ ...prev, use_printer: false })) : handleDetectPrinter()}
                                        variant={printerSettings.use_printer ? 'outline' : 'primary'}
                                        loading={detectingPrinter}
                                    >
                                        {printerSettings.use_printer ? 'Desativar' : 'Ativar'}
                                    </Button>
                                </div>
                            </div>

                            {printerSettings.use_printer && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">Configurações</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <CustomInput label="Largura (mm)" type="number" value={printerSettings.printer_width} onChange={e => setPrinterSettings({ ...printerSettings, printer_width: e.target.value })} />
                                        <CustomInput label="Fonte Base" type="number" value={printerSettings.font_size_base} onChange={e => setPrinterSettings({ ...printerSettings, font_size_base: e.target.value })} />
                                    </div>
                                    <Button onClick={handleSavePrinter} disabled={savingPrinter} fullWidth>
                                        {savingPrinter ? <Loading variant="inline" size="sm" /> : <><Save className="w-4 h-4 mr-2" /> Salvar Impressora</>}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

