import React, { useState, useEffect, useRef } from 'react';
import { User, Share2, Copy, Edit2, Save, X, Loader2, Lock, Banknote, Eye, EyeOff, CheckCircle, MapPin, Camera, PhoneIncoming, AlertTriangle, ShieldCheck, RefreshCw, Search } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { UserBankDetails, City, UserRole } from '../types';
import { DataErrorDisplay } from './DataErrorDisplay';
import * as cloud from '../services/cloud';
import { formatPhoneNumber } from '../utils/mapHelpers';
import { Switch } from './Switch';
import { StreetSearchSelect } from './StreetSearchSelect';
import { useDialog } from '../utils/dialogService';
import { useDebounce } from '../hooks/useDebounce';

const PROFILE_FIELD_CONTAINER_CLASS = 'rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/30 p-3';
const PROFILE_INPUT_CLASS = '[&_input]:!rounded-xl [&_input]:!border [&_input]:!border-gray-200 dark:[&_input]:!border-gray-700 [&_input]:!bg-white dark:[&_input]:!bg-gray-900/70 [&_input]:!text-sm [&_input]:!py-3';
const PROFILE_INPUT_READONLY_CLASS = '[&_input]:!rounded-xl [&_input]:!border [&_input]:!border-gray-200 dark:[&_input]:!border-gray-700 [&_input]:!bg-gray-100 dark:[&_input]:!bg-gray-800/70 [&_input]:!text-gray-500 dark:[&_input]:!text-gray-300 [&_input]:!text-sm [&_input]:!py-3';

// Extracted Bank Form Fields Component to avoid re-render focus loss
interface BankFormFieldsProps {
    bankDetails: UserBankDetails;
    setBankDetails: React.Dispatch<React.SetStateAction<UserBankDetails>>;
    showSensitive: boolean;
    setShowSensitive: React.Dispatch<React.SetStateAction<boolean>>;
}

const BankFormFields: React.FC<BankFormFieldsProps> = ({ bankDetails, setBankDetails, showSensitive, setShowSensitive }) => (
    <div className="space-y-4">
        <div className="relative">
            <label className="text-xs font-bold text-gray-500 uppercase">Chave PIX</label>
            <CustomInput
                type={showSensitive ? 'text' : 'password'}
                value={bankDetails.pixKey}
                onChange={e => setBankDetails({ ...bankDetails, pixKey: e.target.value })}
                className={`${PROFILE_INPUT_CLASS} pr-10`}
                placeholder="CPF, Email ou Telefone"
            />
            <button
                type="button"
                onClick={() => setShowSensitive(!showSensitive)}
                aria-label={showSensitive ? "Esconder chave" : "Mostrar chave"}
                className="absolute right-3 top-8 text-gray-400"
            >
                {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Banco (Nome/Cód)</label>
                <CustomInput type="text" value={bankDetails.bankName} onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })} placeholder="Ex: Nubank (260)" className={PROFILE_INPUT_CLASS} />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Tipo de Conta</label>
                <CustomSelect
                    value={bankDetails.accountType || 'corrente'}
                    onChange={(val) => setBankDetails({ ...bankDetails, accountType: val as any })}
                    options={[{ label: 'Corrente', value: 'corrente' }, { label: 'Poupança', value: 'poupanca' }]}
                />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Agência</label>
                <CustomInput type="text" value={bankDetails.agency} onChange={e => setBankDetails({ ...bankDetails, agency: e.target.value })} placeholder="0000" className={PROFILE_INPUT_CLASS} />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Conta com Dígito</label>
                <CustomInput type="text" value={bankDetails.account} onChange={e => setBankDetails({ ...bankDetails, account: e.target.value })} placeholder="00000-0" className={PROFILE_INPUT_CLASS} />
            </div>
        </div>
    </div>
);


interface ProfileDataProps {
    onBack: () => void;
}

const parseLegacyAddress = (rawAddress?: string | null) => {
    if (!rawAddress) {
        return { street: '', number: '', district: '' };
    }

    const [leftPart, rightPart] = String(rawAddress).split('-').map((part) => part.trim());
    const [streetPart = '', numberPart = ''] = (leftPart || '').split(',').map((part) => part.trim());
    const districtPart = (rightPart || '').split(',')[0]?.trim() || '';

    return {
        street: streetPart,
        number: numberPart,
        district: districtPart
    };
};

const normalizeAddressFields = (profileData: any, metadata: any) => {
    const legacyAddress = parseLegacyAddress(profileData?.address || metadata?.address);

    return {
        street: profileData?.address_street || metadata?.address_street || legacyAddress.street,
        number: profileData?.address_number || metadata?.address_number || legacyAddress.number,
        district: profileData?.address_district || metadata?.address_district || legacyAddress.district
    };
};

export const ProfileData: React.FC<ProfileDataProps> = ({ onBack }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Bank Data State
    const [bankDetails, setBankDetails] = useState<UserBankDetails>({
        fullName: '', pixKey: '', pixType: 'cpf', bankName: '', bankNumber: '', agency: '', account: '', accountType: 'corrente'
    });
    const [showBankModal, setShowBankModal] = useState(false);

    // Profile Data State
    const [personalData, setPersonalData] = useState({ name: '', phone: '', email: '', city: '', address: '' });
    const [addressNumber, setAddressNumber] = useState('');
    const [addressNeighborhood, setAddressNeighborhood] = useState('');
    const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

    // City Editing State
    const [isEditingCity, setIsEditingCity] = useState(false);
    const [citySearchTerm, setCitySearchTerm] = useState('');
    const [cityOptions, setCityOptions] = useState<City[]>([]);
    const [loadingCityOptions, setLoadingCityOptions] = useState(false);
    const debouncedCitySearch = useDebounce(citySearchTerm, 250);

    // Partner Settings
    const [isPartner, setIsPartner] = useState(false);
    const [userRole, setUserRole] = useState<UserRole>('user');
    const [sharePhoneOffline, setSharePhoneOffline] = useState(false);
    const [showShareDisclaimer, setShowShareDisclaimer] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    // Toast State (Replaces Status Message)
    const { alert } = useDialog();
    const [showSensitive, setShowSensitive] = useState(false);

    const [user, setUser] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchUserAndData = async () => {
        setIsLoading(true);
        setProfileError(null);
        try {
            const client = cloud.getClient();
            if (!client) throw new Error("Supabase client not found");

            const { data: { user } } = await (client.auth as any).getUser();
            setUser(user);

            if (user) {
                const role = await cloud.getUserRole();
                setUserRole(role);
                setIsPartner(role === 'delivery_partner' || role === 'delivery_person');
                const metadata = user.user_metadata || {};

                // Fetch from user_profiles table (source of truth)
                const { data: profileData, error } = await client.from('user_profiles').select('*').eq('id', user.id).single();

                if (error) {
                    // console.error('[ProfileData] DB Error:', error);
                }

                if (profileData) {
                    const normalizedAddress = normalizeAddressFields(profileData, metadata);
                    setPersonalData({
                        name: profileData.name || metadata.name || '',
                        phone: profileData.phone_number || metadata.phone || '',
                        email: profileData.email || user.email || '',
                        city: profileData.city || metadata.city || '',
                        address: normalizedAddress.street || ''
                    });
                    setAddressNumber(normalizedAddress.number || '');
                    setAddressNeighborhood(normalizedAddress.district || '');

                    if (profileData.avatar_url) {
                        setProfilePictureUrl(profileData.avatar_url);
                    } else if (metadata.profile_picture_url) {
                        setProfilePictureUrl(metadata.profile_picture_url);
                    }

                    if (role === 'delivery_partner' || role === 'delivery_person') {
                        setSharePhoneOffline(profileData.share_phone_offline || false);
                    }

                    if (profileData.bank_details) {
                        setBankDetails(prev => ({ ...prev, ...profileData.bank_details }));
                    }
                } else {
                    const normalizedAddress = normalizeAddressFields(null, metadata);
                    // Fallback to auth metadata
                    setPersonalData({
                        name: metadata.name || '',
                        phone: metadata.phone || '',
                        email: user.email || '',
                        city: metadata.city || '',
                        address: normalizedAddress.street || ''
                    });
                    setAddressNumber(normalizedAddress.number || '');
                    setAddressNeighborhood(normalizedAddress.district || '');

                    if (metadata.profile_picture_url) {
                        setProfilePictureUrl(metadata.profile_picture_url);
                    }
                    if (metadata.bank_details) {
                        setBankDetails(prev => ({ ...prev, ...metadata.bank_details }));
                    }
                }
            } else {
                throw new Error("Usuário não autenticado");
            }
        } catch {
            // console.error('[ProfileData] Critical Error');
            setProfileError("Falha ao carregar dados do perfil.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUserAndData();
    }, []);

    useEffect(() => {
        if (!isEditingCity) return;

        const controller = new AbortController();
        const signal = controller.signal;

        const loadCitiesForEdit = async () => {
            setLoadingCityOptions(true);
            try {
                const data = await cloud.getAvailableCities(debouncedCitySearch, signal);
                if (signal.aborted) return;

                const [currentNameRaw, currentStateRaw] = (personalData.city || '').split(' - ');
                const currentName = (currentNameRaw || '').trim().toLowerCase();
                const currentState = (currentStateRaw || '').trim().toLowerCase();

                const filtered = (data || []).filter((city) => {
                    const cityName = (city.name || '').trim().toLowerCase();
                    const cityState = (city.state || '').trim().toLowerCase();
                    if (!currentName) return true;
                    if (currentState) return !(cityName === currentName && cityState === currentState);
                    return cityName !== currentName;
                });

                setCityOptions(filtered);
            } catch (e: any) {
                if (e?.name !== 'AbortError') {
                    console.error('Erro ao carregar cidades para edição:', e);
                }
            } finally {
                if (!signal.aborted) setLoadingCityOptions(false);
            }
        };

        loadCitiesForEdit();

        return () => controller.abort();
    }, [isEditingCity, debouncedCitySearch, personalData.city]);

    if (profileError) {
        return (
            <div className="p-8">
                <DataErrorDisplay
                    title="Perfil Indisponível"
                    message={profileError}
                    onRetry={fetchUserAndData}
                />
                <Button variant="ghost" fullWidth onClick={onBack} className="mt-4">Voltar</Button>
            </div>
        );
    }

    const handleSaveAll = async () => {
        setIsLoading(true);
        try {
            const client = cloud.getClient();
            if (user && client) {
                if (!personalData.address.trim() || !addressNumber.trim() || !addressNeighborhood.trim()) {
                    await alert({ title: 'Erro', message: 'Rua, Número e Bairro são obrigatórios.' });
                    setIsLoading(false);
                    return;
                }
                const composedAddress = `${personalData.address.trim()}, ${addressNumber.trim()} - ${addressNeighborhood.trim()}`;
                // Save core metadata to user_profiles table
                const rawPhone = (personalData.phone || '').replace(/\D/g, '');
                const { error: profileUpdateError } = await client
                    .from('user_profiles')
                    .update({
                        phone_number: rawPhone,
                        city: personalData.city,
                        address: composedAddress,
                        address_street: personalData.address.trim(),
                        address_number: addressNumber.trim(),
                        address_district: addressNeighborhood.trim(),
                        bank_details: bankDetails
                    })
                    .eq('id', user.id);

                if (profileUpdateError) throw profileUpdateError;

                // Save Partner Settings if applicable
                if (isPartner) {
                    await cloud.updateMyPartnerProfile({
                        share_phone_offline: sharePhoneOffline
                    });
                }

                await alert({ title: 'Sucesso', message: 'Dados atualizados com sucesso!' });
                setShowBankModal(false);
            }
        } catch (e: any) {
            await alert({ title: 'Erro ao Salvar', message: 'Erro ao salvar: ' + e.message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setUploadingAvatar(true);
        try {
            const publicUrl = await cloud.uploadProfilePicture(file);
            setProfilePictureUrl(publicUrl);
            // Save URL immediately to user_profiles table
            const client = cloud.getClient();
            if (user && client) {
                await client.from('user_profiles').update({
                    avatar_url: publicUrl
                }).eq('id', user.id);
            }
            await alert({ title: 'Sucesso', message: 'Foto de perfil atualizada!' });
        } catch (e: any) {
            await alert({ title: 'Erro no Upload', message: "Erro no upload da foto: " + e.message });
        } finally {
            setUploadingAvatar(false);
        }
    };

    const copyPixKey = async () => {
        if (bankDetails.pixKey) {
            navigator.clipboard.writeText(bankDetails.pixKey);
            await alert({ title: 'Sucesso', message: "Chave PIX copiada!" });
        }
    };

    const sharePixKey = async () => {
        if (bankDetails.pixKey && navigator.share) {
            try {
                await navigator.share({
                    title: 'Minha Chave PIX',
                    text: `Minha chave PIX (${bankDetails.pixType || 'Chave'}): ${bankDetails.pixKey}\nBanco: ${bankDetails.bankName || 'Não informado'}`,
                });
            } catch {
                // console.error(err);
            }
        } else {
            copyPixKey();
        }
    };

    const toggleShareOffline = (val: boolean) => {
        if (val) {
            setShowShareDisclaimer(true);
        } else {
            setSharePhoneOffline(false);
        }
    };

    const confirmShareOffline = () => {
        setSharePhoneOffline(true);
        setShowShareDisclaimer(false);
    };

    const hasBankData = !!bankDetails.pixKey;
    const completionFields = [
        personalData.phone,
        personalData.city,
        personalData.address,
        addressNumber,
        addressNeighborhood
    ];
    const completionPercent = Math.round((completionFields.filter(v => !!v?.trim()).length / completionFields.length) * 100);
    const roleBadgeConfig: Record<UserRole, { label: string; className: string }> = {
        admin: {
            label: 'Administrador',
            className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
        },
        store_partner: {
            label: 'Lojista',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'
        },
        delivery_partner: {
            label: 'Entregador Parceiro',
            className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
        },
        delivery_person: {
            label: 'Entregador',
            className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
        },
        collaborator: {
            label: 'Colaborador',
            className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
        },
        user: {
            label: 'Cliente',
            className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
        }
    };
    const roleBadge = roleBadgeConfig[userRole] || roleBadgeConfig.user;

    return (
        <div className="space-y-8 sm:space-y-10 animate-in fade-in pb-8">
            <div className="flex items-center justify-between">
                
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    Meu Perfil
                </span>
            </div>

            <section className="relative overflow-hidden rounded-[30px] border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-brand-50 via-white to-sky-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 sm:p-8 shadow-sm">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-900/20" />
                <div className="pointer-events-none absolute -left-24 -bottom-20 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl dark:bg-sky-900/20" />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="relative group cursor-pointer mx-auto sm:mx-0" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-4 border-white/80 dark:border-gray-700 shadow-xl bg-gray-200 dark:bg-gray-700">
                                {profilePictureUrl ? (
                                    <img src={profilePictureUrl} alt="Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <User className="w-10 h-10" />
                                    </div>
                                )}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-brand-600 text-white p-2 rounded-xl shadow-lg group-hover:scale-105 transition-transform">
                                {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                            </div>
                            <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                        </div>

                        <div className="text-center sm:text-left">
                            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
                                {personalData.name || 'Usuario'}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 break-all">
                                {personalData.email || 'Sem email'}
                            </p>
                            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-3">
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/80 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {personalData.city || 'Cidade nao definida'}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${roleBadge.className}`}>
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    {roleBadge.label}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/70 dark:border-gray-700 bg-white/80 dark:bg-gray-800/70 p-4 w-full lg:w-72">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                Completude
                            </p>
                            <p className="text-sm font-black text-brand-600">{completionPercent}%</p>
                        </div>
                        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div className="h-full bg-brand-600 transition-all duration-500" style={{ width: `${completionPercent}%` }} />
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                            Atualize telefone, cidade e endereco para manter seu perfil completo.
                        </p>
                    </div>
                </div>
            </section>
            {/* Personal Data Section */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-black text-lg text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-500" /> Dados Pessoais
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Informacoes principais de conta e contato.</p>

                <div className="space-y-4">
                    <div className={PROFILE_FIELD_CONTAINER_CLASS}>
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Nome Completo <Lock className="w-3 h-3" /></label>
                        <CustomInput type="text" value={personalData.name} disabled className={PROFILE_INPUT_READONLY_CLASS} />
                    </div>

                    <div className={PROFILE_FIELD_CONTAINER_CLASS}>
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Email <Lock className="w-3 h-3" /></label>
                        <CustomInput type="text" value={personalData.email} disabled className={PROFILE_INPUT_READONLY_CLASS} />
                    </div>

                    <div className={PROFILE_FIELD_CONTAINER_CLASS}>
                        <label className="text-xs font-bold text-gray-500 uppercase">Telefone / WhatsApp</label>
                        <CustomInput
                            type="tel"
                            value={personalData.phone}
                            onChange={e => setPersonalData({ ...personalData, phone: formatPhoneNumber(e.target.value) })}
                            className={PROFILE_INPUT_CLASS}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className={PROFILE_FIELD_CONTAINER_CLASS}>
                            <label className="text-xs font-bold text-gray-500 uppercase">Cidade</label>
                            {isEditingCity ? (
                                <div className="mt-1 rounded-xl border border-brand-200/80 dark:border-brand-900/60 bg-brand-50/40 dark:bg-brand-900/20 p-3 space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            autoFocus
                                            type="text"
                                            value={citySearchTerm}
                                            onChange={(e) => setCitySearchTerm(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && cityOptions.length > 0) {
                                                    const city = cityOptions[0];
                                                    setPersonalData({ ...personalData, city: `${city.name} - ${city.state}` });
                                                    setCitySearchTerm('');
                                                    setIsEditingCity(false);
                                                }
                                            }}
                                            placeholder="Digite para filtrar cidades..."
                                            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/30"
                                        />
                                    </div>

                                    <div className="max-h-44 overflow-y-auto custom-scrollbar rounded-lg border border-gray-200/70 dark:border-gray-700 bg-white dark:bg-gray-900/60">
                                        {loadingCityOptions ? (
                                            <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Carregando cidades...
                                            </div>
                                        ) : cityOptions.length > 0 ? (
                                            cityOptions.map((city) => (
                                                <button
                                                    key={city.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setPersonalData({ ...personalData, city: `${city.name} - ${city.state}` });
                                                        setCitySearchTerm('');
                                                        setIsEditingCity(false);
                                                    }}
                                                    className="w-full px-3 py-2.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                                                >
                                                    {city.name} - {city.state}
                                                </button>
                                            ))
                                        ) : (
                                            <p className="p-4 text-center text-xs text-gray-500">Nenhuma cidade disponivel para seleção.</p>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setIsEditingCity(false)}
                                        className="mt-2 text-xs font-bold text-red-500 hover:underline w-full text-center"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <CustomInput
                                            type="text"
                                            value={personalData.city}
                                            disabled
                                            className={PROFILE_INPUT_READONLY_CLASS}
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCitySearchTerm('');
                                            setIsEditingCity(true);
                                        }}
                                        className="h-11 w-11 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl text-blue-500 border border-gray-200 dark:border-gray-600 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        title="Atualizar cidade"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className={PROFILE_FIELD_CONTAINER_CLASS}>
                            <label className="text-xs font-bold text-gray-500 uppercase">Rua</label>
                            <StreetSearchSelect
                                city={(personalData.city || '').split(' - ')[0] || personalData.city}
                                value={personalData.address}
                                onSelect={(street) => setPersonalData(prev => ({ ...prev, address: street }))}
                                placeholder="Digite o nome da rua..."
                                className="[&>div>button]:!rounded-xl [&>div>button]:!border [&>div>button]:!border-gray-200 dark:[&>div>button]:!border-gray-700 [&>div>button]:!bg-white dark:[&>div>button]:!bg-gray-900/70 [&>div>button]:!text-sm [&>div>button]:!py-3"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className={PROFILE_FIELD_CONTAINER_CLASS}>
                                <label className="text-xs font-bold text-gray-500 uppercase">Numero</label>
                                <CustomInput type="text" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="Ex: 123" className={PROFILE_INPUT_CLASS} required />
                            </div>
                            <div className={PROFILE_FIELD_CONTAINER_CLASS}>
                                <label className="text-xs font-bold text-gray-500 uppercase">Bairro</label>
                                <CustomInput type="text" value={addressNeighborhood} onChange={e => setAddressNeighborhood(e.target.value)} placeholder="Ex: Centro" className={PROFILE_INPUT_CLASS} required />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Partner Specific Settings */}
            {isPartner && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-black text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <PhoneIncoming className="w-5 h-5 text-orange-500" /> Preferencias de Parceiro
                    </h3>

                    <div className="flex items-center justify-between">
                        <div className="flex-1 pr-4">
                            <p className="text-sm font-bold text-gray-800 dark:text-white">Contato Direto Offline</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Permite que lojas parceiras visualizem seu telefone quando nao houver entregadores online.
                            </p>
                        </div>
                        <Switch checked={sharePhoneOffline} onChange={toggleShareOffline} />
                    </div>
                </div>
            )}

            {/* Bank Data Section - AVAILABLE FOR DELIVERY PARTNERS/STORES ONLY */}
            {isPartner && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-black text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-green-500" /> Dados Bancarios
                    </h3>

                    {hasBankData ? (
                        <div className="animate-in fade-in">
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl mb-4 border border-gray-100 dark:border-gray-600">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
                                        <Banknote className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Banco</p>
                                        <p className="font-bold text-gray-800 dark:text-white">{bankDetails.bankName || 'Nao informado'}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 break-all">
                                    Chave PIX:
                                    <span className="font-mono bg-white dark:bg-gray-800 ml-2 px-2 py-0.5 rounded border dark:border-gray-600">{bankDetails.pixKey}</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setShowBankModal(true)}
                                    className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Edit2 className="w-4 h-4 text-blue-500" />
                                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Editar</span>
                                </button>
                                <button
                                    onClick={copyPixKey}
                                    className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Copy className="w-4 h-4 text-gray-500" />
                                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Copiar</span>
                                </button>
                                <button
                                    onClick={sharePixKey}
                                    className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Share2 className="w-4 h-4 text-brand-600" />
                                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Compartilhar</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <BankFormFields
                            bankDetails={bankDetails}
                            setBankDetails={setBankDetails}
                            showSensitive={showSensitive}
                            setShowSensitive={setShowSensitive}
                        />
                    )}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    Acoes
                </p>
                <Button fullWidth onClick={handleSaveAll} disabled={isLoading} className="py-4 shadow-lg">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Alteracoes</>}
                </Button>
            </div>

            {/* MyOrders moved to separate tab */}

            {/* Bank Edit Modal */}
            {showBankModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowBankModal(false)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                <Edit2 className="w-5 h-5 text-brand-500" /> Editar Dados Bancarios
                            </h3>
                            <button onClick={() => setShowBankModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <BankFormFields
                            bankDetails={bankDetails}
                            setBankDetails={setBankDetails}
                            showSensitive={showSensitive}
                            setShowSensitive={setShowSensitive}
                        />

                        <Button fullWidth onClick={handleSaveAll} disabled={isLoading} className="mt-4">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Offline Share Disclaimer Modal */}
            {showShareDisclaimer && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl">
                        <div className="text-center mb-4">
                            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-500">
                                <PhoneIncoming className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Contato Direto Offline</h3>
                        </div>

                        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 mb-6 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <p className="flex gap-2">
                                <CheckCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                                Seu telefone sera visivel apenas para lojas parceiras quando nao houver ninguem online.
                            </p>
                            <p className="flex gap-2">
                                <CheckCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                                Qualquer negociacao ou pagamento sera feito diretamente entre voce e a loja.
                            </p>
                            <p className="flex gap-2 font-bold text-red-500">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                A plataforma nao se responsabiliza por entregas combinadas fora do sistema.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" fullWidth onClick={() => setShowShareDisclaimer(false)}>Cancelar</Button>
                            <Button fullWidth onClick={confirmShareOffline}>Concordo e Ativar</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
