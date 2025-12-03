
import React, { useState, useEffect } from 'react';
import { MapPin, Calculator, Loader2, DollarSign, Navigation, Info, Plus, Trash2, UserX, Phone, Star, X, ShieldCheck, Users, AlertTriangle, Send, Check, Wallet, CheckCircle, Home, Lock } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { PartnerFeeSettings, OfflineDriver, StoreDeliveryPartner } from '../types';
import { openNavigation } from '../utils/mapHelpers';

interface AddressData {
    id: string;
    street: string;
    number: string;
    neighborhood: string;
    cep?: string;
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
    validated: boolean;
    error?: string;
    validating?: boolean;
}

interface StoreRequestProps {
    onNavigate: (tab: any) => void;
}

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const StoreRequest: React.FC<StoreRequestProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [storeCity, setStoreCity] = useState<string>('');
    const [walletBalance, setWalletBalance] = useState(0);
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [isSuperStore, setIsSuperStore] = useState(false);

    const [requestType, setRequestType] = useState<'PLATFORM' | 'ASSOCIATE'>('PLATFORM');
    const [pickup, setPickup] = useState<AddressData>({ id: 'pickup', street: '', number: '', neighborhood: '', validated: false });
    const [deliveries, setDeliveries] = useState<AddressData[]>([{ id: crypto.randomUUID(), street: '', number: '', neighborhood: '', validated: false }]);
    
    const [calculating, setCalculating] = useState(false);
    const [distanceKm, setDistanceKm] = useState<number | null>(null);
    const [cost, setCost] = useState<number | null>(null);
    const [partnerNet, setPartnerNet] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [associatedDrivers, setAssociatedDrivers] = useState<StoreDeliveryPartner[]>([]);
    const [selectedAssociateIds, setSelectedAssociateIds] = useState<string[]>([]);
    const [loadingAssociates, setLoadingAssociates] = useState(false);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const [f, w, user] = await Promise.all([
                    cloud.adminGetFeeSettings(),
                    cloud.getMyWallet(),
                    cloud.getClient()?.auth.getUser()
                ]);
                
                setFees(f);
                setWalletBalance(w?.balance_decimal || 0);
                
                const profile = await cloud.getClient()?.from('user_profiles').select('city, is_super_store').eq('id', user?.data?.user?.id).single();
                
                if (profile?.data) {
                    const rawCity = profile.data.city || '';
                    const cleanCity = rawCity.split(' - ')[0].trim();
                    setStoreCity(cleanCity);
                    
                    const superStatus = profile.data.is_super_store || false;
                    setIsSuperStore(superStatus);

                    // Se não for Super Store, força o modo Associado por padrão
                    if (!superStatus) {
                        setRequestType('ASSOCIATE');
                    }
                } else {
                    setNotification({ type: 'error', message: "Dados do perfil não encontrados. Atualize seu cadastro."});
                }
            } catch (e) {
                console.error(e);
                 setNotification({ type: 'error', message: "Erro ao carregar configurações."});
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (requestType === 'ASSOCIATE') {
            setLoadingAssociates(true);
            cloud.getStoreAssociatedPartners()
                .then(setAssociatedDrivers)
                .catch(console.error)
                .finally(() => setLoadingAssociates(false));
        } else {
            setSelectedAssociateIds([]);
        }
    }, [requestType]);

    const handleSelectPlatform = () => {
        if (!isSuperStore) {
            setNotification({ type: 'info', message: "Recurso Exclusivo: Apenas Superlogistas podem selecionar entregadores parceiros." });
            return;
        }
        setRequestType('PLATFORM');
    };

    const addDelivery = () => setDeliveries([...deliveries, { id: crypto.randomUUID(), street: '', number: '', neighborhood: '', validated: false }]);
    const removeDelivery = (id: string) => {
        if (deliveries.length > 1) setDeliveries(deliveries.filter(d => d.id !== id));
    };
    
    const updateDeliveryField = (id: string, field: keyof AddressData, value: string) => {
        setDeliveries(prev => prev.map(d => d.id === id ? { ...d, [field]: value, validated: false, error: undefined } : d));
    };

    const formatAddressString = (addr: AddressData) => `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city} - ${addr.state}`;

    const validateAddress = async (id: string) => {
        const isPickup = id === 'pickup';
        const addressToValidate = isPickup ? pickup : deliveries.find(d => d.id === id);
        if (!addressToValidate || !addressToValidate.street) return;

        const updateState = (data: Partial<AddressData>) => {
            if (isPickup) setPickup(prev => ({ ...prev, ...data }));
            else setDeliveries(prev => prev.map(d => d.id === id ? { ...d, ...data } : d));
        };

        updateState({ validating: true, error: undefined, validated: false });

        try {
            const query = `${addressToValidate.street}, ${addressToValidate.number || ''}, ${addressToValidate.neighborhood || ''}`;
            const response = await fetch(`https://api.geocode.br/search?q=${encodeURIComponent(query)}&municipio=${encodeURIComponent(storeCity)}`);
            
            if (!response.ok) throw new Error("Falha na comunicação com a API de endereços.");
            
            const data = await response.json();

            if (!data.features || data.features.length === 0) {
                throw new Error(`Endereço não encontrado em ${storeCity}. Tente ser mais específico.`);
            }
            
            const result = data.features[0];
            const properties = result.properties;
            
            if (properties.city.toLowerCase() !== storeCity.toLowerCase()) {
                throw new Error(`Endereço inválido. O endereço pertence a ${properties.city}, não a ${storeCity}.`);
            }

            updateState({
                street: properties.street || addressToValidate.street,
                number: properties.housenumber || addressToValidate.number,
                neighborhood: properties.district || addressToValidate.neighborhood,
                cep: properties.postcode,
                city: properties.city,
                state: properties.state,
                lat: result.geometry.coordinates[1],
                lng: result.geometry.coordinates[0],
                validated: true,
                error: undefined,
            });

        } catch (e: any) {
            updateState({ validated: false, error: e.message });
        } finally {
            updateState({ validating: false });
        }
    };
    
    const handleDispatch = async () => {
        setIsSubmitting(true);
        setNotification(null);

        const allAddresses = [pickup, ...deliveries];
        if (allAddresses.some(addr => !addr.validated)) {
            setNotification({ type: 'error', message: "Valide todos os endereços antes de continuar." });
            setIsSubmitting(false);
            return;
        }

        if (requestType === 'ASSOCIATE' && selectedAssociateIds.length === 0) {
            setNotification({ type: 'error', message: "Selecione pelo menos um entregador fixo." });
            setIsSubmitting(false);
            return;
        }

        try {
            const pickupAddrStr = formatAddressString(pickup);
            const deliveryAddrStr = deliveries.map(formatAddressString).join(' -> ');
            
            if (requestType === 'ASSOCIATE') {
                 for (const partnerId of selectedAssociateIds) {
                    await cloud.createPartnerRequest(pickupAddrStr, deliveryAddrStr, 0, 0, 0, fees, 'ASSOCIATE', partnerId);
                }
                setNotification({ type: 'success', message: `Solicitação enviada para ${selectedAssociateIds.length} entregador(es)!` });
            } else {
                if (walletBalance < (cost || 0)) {
                    setNotification({ type: 'error', message: "Saldo insuficiente para esta solicitação." });
                    setIsSubmitting(false);
                    return;
                }
                await cloud.createPartnerRequest(pickupAddrStr, deliveryAddrStr, distanceKm || 0, cost || 0, partnerNet || 0, fees, 'PLATFORM');
                setNotification({ type: 'success', message: "Solicitação enviada para a plataforma Zé!" });
            }

            setPickup({ id: 'pickup', street: '', number: '', neighborhood: '', validated: false });
            setDeliveries([{ id: crypto.randomUUID(), street: '', number: '', neighborhood: '', validated: false }]);
            setSelectedAssociateIds([]);

        } catch (e: any) {
            setNotification({ type: 'error', message: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleAssociateSelection = (id: string) => {
        setSelectedAssociateIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
    };
    
    const renderAddressInputs = (addr: AddressData, isPickup: boolean) => {
        const handleInputChange = (field: keyof AddressData, value: string) => {
            if (isPickup) {
                setPickup(prev => ({ ...prev, [field]: value, validated: false, error: undefined }));
            } else {
                updateDeliveryField(addr.id, field, value);
            }
        };

        return (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                        {isPickup ? <Home className="w-4 h-4"/> : <MapPin className="w-4 h-4"/>} 
                        {isPickup ? 'Endereço de Coleta' : 'Endereço de Entrega'}
                    </label>
                    {!isPickup && deliveries.length > 1 && (
                        <button onClick={() => removeDelivery(addr.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-2">
                    <input type="text" placeholder="Rua / Avenida" value={addr.street} onChange={e => handleInputChange('street', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-sm" />
                    <input type="text" placeholder="Número" value={addr.number} onChange={e => handleInputChange('number', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-sm" />
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                    <input type="text" placeholder="Bairro" value={addr.neighborhood} onChange={e => handleInputChange('neighborhood', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-sm" />
                    <Button variant="outline" onClick={() => validateAddress(addr.id)} disabled={addr.validating} className="h-full px-4">
                        {addr.validating ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Validar'}
                    </Button>
                </div>
                {addr.error && <p className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> {addr.error}</p>}
                {addr.validated && (
                    <div className="flex items-center justify-between text-xs text-green-600 mt-1 font-bold p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Endereço OK: {addr.cep}</span>
                        <button onClick={() => openNavigation(addr.lat!, addr.lng!)} className="p-1 hover:bg-green-100 rounded-full" title="Abrir no Waze">
                            <Navigation className="w-4 h-4"/>
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600"/></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            {notification && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 ${notification.type === 'success' ? 'bg-green-100 text-green-700' : notification.type === 'info' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    {notification.type === 'success' ? <Check className="w-5 h-5"/> : notification.type === 'info' ? <Info className="w-5 h-5"/> : <AlertTriangle className="w-5 h-5" />}
                    <span className="font-bold text-sm">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white">Solicitar Entrega</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {storeCity}</p>
                    </div>
                     <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase">Saldo</p>
                        <p className={`font-bold text-lg ${walletBalance > 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(walletBalance)}</p>
                    </div>
                </div>

                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-xl flex gap-1 mb-6">
                    <button 
                        onClick={handleSelectPlatform} 
                        className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all rounded-lg ${requestType === 'PLATFORM' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        {isSuperStore ? <ShieldCheck className="w-4 h-4"/> : <Lock className="w-4 h-4"/>} 
                        Parceiro Zé
                    </button>
                    <button 
                        onClick={() => setRequestType('ASSOCIATE')} 
                        className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all rounded-lg ${requestType === 'ASSOCIATE' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                    >
                        <Users className="w-4 h-4"/> Entregador Fixo
                    </button>
                </div>

                {requestType === 'PLATFORM' && (
                    <div className="space-y-4">
                       {renderAddressInputs(pickup, true)}
                       {deliveries.map(d => renderAddressInputs(d, false))}
                       <Button variant="outline" size="sm" onClick={addDelivery} fullWidth><Plus className="w-4 h-4 mr-1"/> Adicionar Parada</Button>
                       <Button fullWidth onClick={handleDispatch} disabled={isSubmitting} className="py-4 mt-4">
                         {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Chamar Entregador Zé'}
                       </Button>
                    </div>
                )}
                
                {requestType === 'ASSOCIATE' && (
                    <div className="space-y-6">
                        {loadingAssociates ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400"/> : 
                        associatedDrivers.length === 0 ? (
                            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                                <UserX className="w-8 h-8 text-red-400 mx-auto mb-2"/>
                                <p className="font-bold text-red-600 text-sm">Nenhum entregador associado.</p>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-sm font-bold text-gray-500 mb-2">Selecione o(s) entregador(es)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {associatedDrivers.map(d => (
                                        <div key={d.id} onClick={() => toggleAssociateSelection(d.partner_id)} className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer ${selectedAssociateIds.includes(d.partner_id) ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                                            {selectedAssociateIds.includes(d.partner_id) ? <CheckCircle className="w-5 h-5 text-brand-600"/> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>}
                                            <div>
                                                <p className="font-bold text-sm dark:text-white">{d.partner_name}</p>
                                                <p className="text-xs text-gray-500">{d.partner_vehicle}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                             {renderAddressInputs(pickup, true)}
                             {deliveries.map(d => renderAddressInputs(d, false))}
                             <Button variant="outline" size="sm" onClick={addDelivery} fullWidth><Plus className="w-4 h-4 mr-1"/> Adicionar Parada</Button>
                        </div>

                        <Button fullWidth onClick={handleDispatch} disabled={isSubmitting || loadingAssociates || associatedDrivers.length === 0} className="py-4 mt-4">
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5 mr-2"/>}
                            Enviar para Selecionado(s)
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
