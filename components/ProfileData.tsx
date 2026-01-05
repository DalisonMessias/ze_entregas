import React, { useState, useEffect, useRef } from 'react';
import { User, CreditCard, Share2, Copy, Edit2, Save, Check, ShoppingBag, Hash, Phone, Mail, Settings, X, Loader2, Lock, Banknote, Eye, EyeOff, CheckCircle, MapPin, Camera, Upload, PhoneIncoming, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { UserBankDetails, Order, UserRole } from '../types';
import * as storage from '../services/storage';
import * as cloud from '../services/cloud';
import { formatPhoneNumber } from '../utils/mapHelpers';
import { Switch } from './Switch';
import { CitySelector } from './CitySelector';

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
            <button onClick={onClose} aria-label="Fechar" className="ml-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
    );
};

// Internal Component for Orders
const MyOrders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const userOrders = await cloud.getMyOrders();
                setOrders(userOrders);
            } catch (error) {
                console.error("Failed to fetch orders:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const getStatusChip = (status: string) => {
        const base = "text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1.5";
        switch (status) {
            case 'pending_payment': return <div className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`}>{status.replace('_', ' ')}</div>;
            case 'pending_approval': return <div className={`${base} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`}>{status.replace('_', ' ')}</div>;
            case 'approved': return <div className={`${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`}>{status.replace('_', ' ')}</div>;
            case 'paid': return <div className={`${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`}>{status.replace('_', ' ')}</div>;
            case 'shipped': return <div className={`${base} bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300`}>{status.replace('_', ' ')}</div>;
            case 'delivered': return <div className={`${base} bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300`}><CheckCircle className="w-3 h-3" /> {status.replace('_', ' ')}</div>;
            case 'cancelled': return <div className={`${base} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`}>{status.replace('_', ' ')}</div>;
            default: return <div className={`${base} bg-gray-100 text-gray-500`}>{status}</div>;
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 mt-6 mb-6">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-500" /> Meus Pedidos da Loja
            </h3>
            {loading ? (
                <div className="text-center py-4 text-gray-400">Carregando pedidos...</div>
            ) : orders.length === 0 ? (
                <div className="text-center py-4 text-gray-400">Você ainda não fez nenhum pedido.</div>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {orders.map(order => (
                        <div key={order.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <div className="text-xs font-mono text-gray-500 flex items-center gap-1">
                                    <Hash className="w-3 h-3" /> {order.id.substring(0, 8)}
                                </div>
                                {getStatusChip(order.status)}
                            </div>
                            <div className="mt-2 space-y-1">
                                {order.items.map(item => (
                                    <div key={item.product_id} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-700 dark:text-gray-300">{item.quantity}x {item.name}</span>
                                        <span className="text-gray-500 dark:text-gray-400">{formatCurrency(item.price)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2 flex justify-between items-center">
                                <span className="font-bold text-gray-800 dark:text-white">Total</span>
                                <span className="font-bold text-brand-600 dark:text-brand-400">{formatCurrency(order.total_price)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


interface ProfileDataProps {
    onBack: () => void;
}

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

    // Partner Settings
    const [isPartner, setIsPartner] = useState(false);
    const [sharePhoneOffline, setSharePhoneOffline] = useState(false);
    const [showShareDisclaimer, setShowShareDisclaimer] = useState(false);

    // Toast State (Replaces Status Message)
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [showSensitive, setShowSensitive] = useState(false);

    const [user, setUser] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchUserAndData = async () => {
            const client = cloud.getClient();
            if (client) {
                const { data: { user } } = await (client.auth as any).getUser();
                setUser(user);

                if (user) {
                    const role = await cloud.getUserRole();
                    setIsPartner(role === 'delivery_partner' || role === 'delivery_person');

                    // Fetch from user_profiles table (source of truth)
                    const { data: profileData, error } = await client.from('user_profiles').select('*').eq('id', user.id).single();

                    if (profileData) {
                        setPersonalData({
                            name: profileData.name || user.user_metadata.name || '',
                            phone: profileData.phone_number || user.user_metadata.phone || '',
                            email: profileData.email || user.email || '',
                            city: profileData.city || user.user_metadata.city || '',
                            address: profileData.address || user.user_metadata.address || '' // Assuming address field exists or will exist
                        });
                        const fullAddrStr = profileData.address || user.user_metadata.address || '';
                        if (fullAddrStr) {
                            const [left, right] = fullAddrStr.split('-').map((s: string) => s.trim());
                            const [, num] = (left || '').split(',').map((s: string) => s.trim());
                            const neighborhoodPart = (right || '').split(',')[0]?.trim() || '';
                            setAddressNumber(num || '');
                            setAddressNeighborhood(neighborhoodPart || '');
                        }

                        if (profileData.avatar_url) {
                            setProfilePictureUrl(profileData.avatar_url);
                        } else if (user.user_metadata.profile_picture_url) {
                            setProfilePictureUrl(user.user_metadata.profile_picture_url); // Fallback to old metadata
                        }

                        if (role === 'delivery_partner' || role === 'delivery_person') {
                            setSharePhoneOffline(profileData.share_phone_offline || false);
                        }
                    } else {
                        // Fallback to auth metadata
                        setPersonalData({
                            name: user.user_metadata.name || '',
                            phone: user.user_metadata.phone || '',
                            email: user.email || '',
                            city: user.user_metadata.city || '',
                            address: user.user_metadata.address_street || user.user_metadata.address || ''
                        });

                        if (user.user_metadata.address_street) {
                            setAddressNumber(user.user_metadata.address_number || '');
                            setAddressNeighborhood(user.user_metadata.address_district || '');
                        } else {
                            // Legacy parsing for metadata
                            const fullAddrStr = user.user_metadata.address || '';
                            if (fullAddrStr) {
                                const [left, right] = fullAddrStr.split('-').map((s: string) => s.trim());
                                const [street, num] = (left || '').split(',').map((s: string) => s.trim());
                                const neighborhoodPart = (right || '').split(',')[0]?.trim() || '';
                                setPersonalData(prev => ({ ...prev, address: street || '' }));
                                setAddressNumber(num || '');
                                setAddressNeighborhood(neighborhoodPart || '');
                            }
                        }

                        if (user.user_metadata.profile_picture_url) {
                            setProfilePictureUrl(user.user_metadata.profile_picture_url);
                        }
                        if (user.user_metadata.bank_details) {
                            setBankDetails(prev => ({ ...prev, ...user.user_metadata.bank_details }));
                        }
                    }
                }
            };
        };
    };
    fetchUserAndData();
}, []);

const handleSaveAll = async () => {
    setIsLoading(true);
    setToast(null); // Clear previous message
    try {
        const client = cloud.getClient();
        if (user && client) {
            if (!personalData.address.trim() || !addressNumber.trim() || !addressNeighborhood.trim()) {
                setToast({ type: 'error', message: 'Rua, Número e Bairro são obrigatórios.' });
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

            setToast({ type: 'success', message: 'Dados atualizados com sucesso!' });
            setShowBankModal(false);
        }
    } catch (e: any) {
        setToast({ type: 'error', message: 'Erro ao salvar: ' + e.message });
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
        setToast({ type: 'success', message: 'Foto de perfil atualizada!' });
    } catch (e: any) {
        setToast({ type: 'error', message: "Erro no upload da foto: " + e.message });
    } finally {
        setUploadingAvatar(false);
    }
};

const copyPixKey = () => {
    if (bankDetails.pixKey) {
        navigator.clipboard.writeText(bankDetails.pixKey);
        setToast({ type: 'success', message: "Chave PIX copiada!" });
    }
};

const sharePixKey = async () => {
    if (bankDetails.pixKey && navigator.share) {
        try {
            await navigator.share({
                title: 'Minha Chave PIX',
                text: `Minha chave PIX (${bankDetails.pixType || 'Chave'}): ${bankDetails.pixKey}\nBanco: ${bankDetails.bankName || 'Não informado'}`,
            });
        } catch (err) {
            console.error(err);
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

const BankFormFields = () => (
    <div className="space-y-4">
        <div className="relative">
            <label className="text-xs font-bold text-gray-500 uppercase">Chave PIX</label>
            <CustomInput
                type={showSensitive ? 'text' : 'password'}
                value={bankDetails.pixKey}
                onChange={e => setBankDetails({ ...bankDetails, pixKey: e.target.value })}
                className="pr-10"
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
                <CustomInput type="text" value={bankDetails.bankName} onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })} placeholder="Ex: Nubank (260)" />
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
                <CustomInput type="text" value={bankDetails.agency} onChange={e => setBankDetails({ ...bankDetails, agency: e.target.value })} placeholder="0000" />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Conta com Dígito</label>
                <CustomInput type="text" value={bankDetails.account} onChange={e => setBankDetails({ ...bankDetails, account: e.target.value })} placeholder="00000-0" />
            </div>
        </div>
    </div>
);

return (
    <div className="space-y-6 animate-in fade-in">
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* Profile Picture Section */}
        <div className="flex flex-col items-center justify-center py-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl bg-gray-200 dark:bg-gray-700">
                    {profilePictureUrl ? (
                        <img src={profilePictureUrl} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <User className="w-12 h-12" />
                        </div>
                    )}
                </div>
                <div className="absolute bottom-0 right-0 bg-brand-600 p-2 rounded-full text-white shadow-md group-hover:scale-110 transition-transform">
                    {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Toque para alterar a foto</p>
        </div>

        {/* Personal Data Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" /> Dados Pessoais
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Nome Completo <Lock className="w-3 h-3" /></label>
                    <CustomInput type="text" value={personalData.name} disabled className="bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed" />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">Email <Lock className="w-3 h-3" /></label>
                    <CustomInput type="text" value={personalData.email} disabled className="bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed" />
                </div>

                <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Telefone / WhatsApp</label>
                    <CustomInput
                        type="tel"
                        value={personalData.phone}
                        onChange={e => setPersonalData({ ...personalData, phone: formatPhoneNumber(e.target.value) })}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Cidade</label>
                        {isEditingCity ? (
                            <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600">
                                <CitySelector
                                    onSelect={(name, state) => {
                                        setPersonalData({ ...personalData, city: `${name} - ${state}` });
                                        setIsEditingCity(false);
                                    }}
                                    selectedCity={personalData.city}
                                />
                                <button
                                    onClick={() => setIsEditingCity(false)}
                                    className="mt-2 text-xs font-bold text-red-500 hover:underline w-full text-center"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <div className="relative">
                                <CustomInput
                                    type="text"
                                    value={personalData.city}
                                    disabled
                                    className="bg-gray-100 dark:bg-gray-700 pr-10"
                                />
                                <button
                                    onClick={() => setIsEditingCity(true)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-gray-600 rounded-lg text-blue-500 shadow-sm"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Endereço Completo</label>
                        <CustomInput
                            type="text"
                            value={personalData.address}
                            onChange={e => setPersonalData({ ...personalData, address: e.target.value })}
                            placeholder="Rua / Avenida"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Número</label>
                            <CustomInput type="text" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="Ex: 123" required />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Bairro</label>
                            <CustomInput type="text" value={addressNeighborhood} onChange={e => setAddressNeighborhood(e.target.value)} placeholder="Ex: Centro" required />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Partner Specific Settings */}
        {isPartner && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <PhoneIncoming className="w-5 h-5 text-orange-500" /> Preferências de Parceiro
                </h3>

                <div className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                        <p className="text-sm font-bold text-gray-800 dark:text-white">Contato Direto Offline</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Permitir que lojas vejam seu telefone e liguem quando você estiver offline, caso não haja entregadores disponíveis.
                        </p>
                    </div>
                    <Switch checked={sharePhoneOffline} onChange={toggleShareOffline} />
                </div>
            </div>
        )}

        {/* Bank Data Section - AVAILABLE FOR ALL USERS */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-500" /> Dados Bancários
            </h3>

            {hasBankData ? (
                <div className="animate-in fade-in">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl mb-4 border border-gray-100 dark:border-gray-600">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                                <Banknote className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Banco</p>
                                <p className="font-bold text-gray-800 dark:text-white">{bankDetails.bankName || 'Cadastrado'}</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Chave PIX: <span className="font-mono bg-white dark:bg-gray-800 px-2 py-0.5 rounded border dark:border-gray-600">{bankDetails.pixKey}</span></p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => setShowBankModal(true)}
                            className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Edit2 className="w-5 h-5 text-blue-500" />
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Editar</span>
                        </button>
                        <button
                            onClick={copyPixKey}
                            className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Copy className="w-5 h-5 text-gray-500" />
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Copiar</span>
                        </button>
                        <button
                            onClick={sharePixKey}
                            className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Share2 className="w-5 h-5 text-brand-600" />
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Compartilhar</span>
                        </button>
                    </div>
                </div>
            ) : (
                <BankFormFields />
            )}
        </div>

        <Button fullWidth onClick={handleSaveAll} disabled={isLoading} className="py-4 text-lg shadow-lg">
            {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-5 h-5 mr-2" /> Salvar Alterações</>}
        </Button>

        <MyOrders />

        {/* Bank Edit Modal */}
        {showBankModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowBankModal(false)}>
                <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                            <Edit2 className="w-5 h-5 text-brand-500" /> Editar Dados Bancários
                        </h3>
                        <button onClick={() => setShowBankModal(false)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <BankFormFields />

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
                            Seu telefone será visível apenas para lojas parceiras quando não houver ninguém online.
                        </p>
                        <p className="flex gap-2">
                            <CheckCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
                            Qualquer negociação ou pagamento será feito diretamente entre você e a loja.
                        </p>
                        <p className="flex gap-2 font-bold text-red-500">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            A plataforma NÃO se responsabiliza por entregas combinadas fora do sistema.
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
