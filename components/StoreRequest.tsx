import React, { useState, useEffect } from 'react';
import { MapPin, Calculator, DollarSign, Navigation, Info, Plus, Trash2, UserX, Phone, Star, X, ShieldCheck, Users, AlertTriangle, Send, Check, Wallet, CheckCircle, Home, Lock } from 'lucide-react';
import { Loading } from './Loading';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { StreetAutocomplete } from './StreetAutocomplete'; // Import StreetAutocomplete
import * as cloud from '../services/cloud';
import { PartnerFeeSettings, OfflineDriver, StoreDeliveryPartner, LoanConfig, ShopSettings } from '../types';
import { openNavigation } from '../utils/mapHelpers';
import { LoanModal } from './LoanModal';
import { estimateDeliveryCosts } from '../utils/estimateDeliveryCosts';

interface AddressData {
    id: string;
    street: string;
    number: string;
    complement?: string;
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
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string, action?: { label: string, onClick: () => void } } | null>(null);
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [onlineDriversCount, setOnlineDriversCount] = useState<number | null>(null);
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);

    const [requestType, setRequestType] = useState<'PLATFORM' | 'ASSOCIATE'>('PLATFORM');
    const [pickup, setPickup] = useState<AddressData>({ id: 'pickup', street: '', number: '', complement: '', neighborhood: '', validated: false });
    const [deliveries, setDeliveries] = useState<AddressData[]>([{ id: crypto.randomUUID(), street: '', number: '', complement: '', neighborhood: '', validated: false }]);

    const [calculating, setCalculating] = useState(false);
    const [distanceKm, setDistanceKm] = useState<number | null>(null);
    const [cost, setCost] = useState<number | null>(null);
    const [partnerNet, setPartnerNet] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [associatedDrivers, setAssociatedDrivers] = useState<StoreDeliveryPartner[]>([]);
    const [selectedAssociateIds, setSelectedAssociateIds] = useState<string[]>([]);
    const [loadingAssociates, setLoadingAssociates] = useState(false);
    const [loanConfig, setLoanConfig] = useState<Partial<LoanConfig> | null>(null);
    const [activeLoan, setActiveLoan] = useState<{ amount: number; status: string; created_at: string } | null>(null);
    const [showLoanModal, setShowLoanModal] = useState(false);
    const [expiresCountdown, setExpiresCountdown] = useState<number | null>(null);
    const [expiresTimer, setExpiresTimer] = useState<any>(null);
    const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
    const [isRealRoute, setIsRealRoute] = useState(false);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const [f, w, user] = await Promise.all([
                    cloud.getPublicFeeSettings(),
                    cloud.getMyWallet(),
                    cloud.getClient()?.auth.getUser()
                ]);

                setFees(f);
                setWalletBalance(w?.balance_decimal || 0);
                try {
                    const [cfg, loan] = await Promise.all([cloud.getLoanConfig(), cloud.getActiveStoreLoan()]);
                    setLoanConfig(cfg);
                    setActiveLoan(loan);
                } catch { }

                try {
                    const settings = await cloud.getShopSettings();
                    setShopSettings(settings);
                } catch { }

                const profile = await cloud.getClient()?.from('user_profiles').select('city, is_super_store, address_street, address_number, address_district, address_zip, address_state, store_address_street, store_address_number, store_address_district, store_address_zip, store_address_state, store_address_city').eq('id', user?.data?.user?.id).single();

                // console.log('[StoreRequest] Profile completo:', profile);

                if (profile?.error) {
                    // console.error('[StoreRequest] Erro ao buscar perfil:', profile.error);
                }

                if (profile?.data) {
                    // console.log('[StoreRequest] profile.data:', profile.data);
                    const rawCity = profile.data.store_address_city || profile.data.city || '';
                    // Aceita tanto "Cidade - UF" quanto "Cidade" (formato antigo)
                    const cleanCity = rawCity.includes(' - ') ? rawCity.split(' - ')[0].trim() : rawCity.trim();
                    // console.log('[StoreRequest] rawCity:', rawCity, 'cleanCity:', cleanCity);
                    setStoreCity(cleanCity);

                    const superStatus = profile.data.is_super_store || false;
                    setIsSuperStore(superStatus);

                    // Autofill pickup address from STORE profile data (Primary Source) or Personal Profile (Secondary)
                    const pData = profile.data;

                    // Lógica de Prioridade: Store Address > Personal Address
                    const useStoreAddress = !!pData.store_address_street || !!pData.store_address_zip;

                    const street = useStoreAddress ? pData.store_address_street : pData.address_street;
                    const number = useStoreAddress ? pData.store_address_number : pData.address_number;
                    const neighborhood = useStoreAddress ? pData.store_address_district : pData.address_district;
                    const zip = useStoreAddress ? pData.store_address_zip : pData.address_zip;
                    const state = useStoreAddress ? pData.store_address_state : pData.address_state;

                    if (street && number) {
                        setPickup(prev => ({
                            ...prev,
                            street: street || prev.street,
                            number: number || prev.number,
                            neighborhood: neighborhood || prev.neighborhood,
                            cep: zip || prev.cep,
                            city: cleanCity || prev.city,
                            state: state || prev.state,
                            validated: false, // Requer review/clique em validar para garantir lat/lng corretos na nova sessão
                            error: undefined
                        }));
                    } else {
                        // Metadata Fallback (Legacy)
                        const metadataAddr: string = (user?.data?.user?.user_metadata?.address as string) || '';
                        if (metadataAddr) {
                            const [left, right] = metadataAddr.split('-').map(s => s.trim());
                            const [streetPart, numberPart] = (left || '').split(',').map(s => s.trim());
                            const rightParts = (right || '').split(',').map(s => s.trim());
                            const cepPart = rightParts.find(p => /\d{5}-?\d{3}/.test(p)) || '';
                            const statePart = rightParts.find(p => /^[A-Z]{2}$/.test(p)) || '';
                            const neighborhoodPart = rightParts[0] || '';
                            setPickup(prev => ({
                                ...prev,
                                street: streetPart || prev.street,
                                number: numberPart || prev.number,
                                neighborhood: neighborhoodPart || prev.neighborhood,
                                cep: cepPart || prev.cep,
                                city: cleanCity || prev.city,
                                state: statePart || prev.state,
                                validated: false,
                                error: undefined
                            }));
                        }
                    }

                    // Auto-detect associated partners
                    try {
                        if (user?.data?.user?.id) {
                            const associates = await cloud.getStoreDeliveryPartners(user.data.user.id);
                            if (associates.length > 0) {
                                setAssociatedDrivers(associates);
                                setSelectedAssociateIds(associates.map(a => a.partner_id));
                                // Não força mais o modo ASSOCIATE, apenas notifica
                                setNotification({ type: 'info', message: `${associates.length} entregador(es) fixo(s) disponível(is). Você pode escolher entre Parceiro Zé ou Entregador Fixo.` });
                            }
                        }
                    } catch (e) {
                        console.error('Failed to load associates:', e);
                    }
                } else {
                    setNotification({
                        type: 'error',
                        message: "Dados do perfil não encontrados. Atualize seu cadastro.",
                        action: {
                            label: "Ir para Configurações",
                            onClick: () => onNavigate('store_settings')
                        }
                    });
                }
            } catch (e) {
                // console.error(e);
                setNotification({ type: 'error', message: "Erro ao carregar configurações." });
            } finally {
                setLoading(false);
            }
        };

        const checkOnlineDrivers = async () => {
            if (storeCity) {
                const count = await cloud.countOnlineDriversInCity(storeCity);
                setOnlineDriversCount(count);
                if (count === 0) {
                    // Optional: setNotification({ type: 'error', message: 'Nenhum entregador online na sua cidade no momento.' });
                }
            }
        };

        init();
    }, []);

    // Effect separate to check drivers when city is loaded/changed
    useEffect(() => {
        if (storeCity) {
            cloud.countOnlineDriversInCity(storeCity).then(setOnlineDriversCount);
        }
    }, [storeCity]);

    // Debug: monitorar mudanças em storeCity
    useEffect(() => {
        // console.log('[StoreRequest] storeCity atualizado para:', storeCity);
    }, [storeCity]);

    useEffect(() => {
        if (requestType === 'ASSOCIATE') {
            setLoadingAssociates(true);
            cloud.getStoreAssociatedPartners()
                .then(setAssociatedDrivers)
                .catch(err => console.error('Error loading associates:', err))
                .finally(() => setLoadingAssociates(false));
        } else {
            setSelectedAssociateIds([]);
            setCost(null);
            setDistanceKm(null);
            setPartnerNet(null);
        }
    }, [requestType]);

    useEffect(() => {
        if (requestType === 'ASSOCIATE' && associatedDrivers.length > 0) {
            setSelectedAssociateIds(associatedDrivers.map(d => d.partner_id));
        }
    }, [associatedDrivers, requestType]);

    // Limpar timer ao desmontar componente
    useEffect(() => {
        return () => {
            if (expiresTimer) {
                clearInterval(expiresTimer);
            }
        };
    }, [expiresTimer]);
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

    const formatAddressString = (addr: AddressData) => {
        const numComp = [addr.number, addr.complement].filter(Boolean).join(' ');
        const cityState = [addr.city, addr.state].filter(Boolean).join(' - ');
        const cepStr = addr.cep ? ` - CEP: ${addr.cep}` : '';
        return `${addr.street}${numComp ? `, ${numComp}` : ''} - ${addr.neighborhood}${cityState ? `, ${cityState}` : ''}${cepStr}`;
    };




    const calculateValues = async () => {
        setCalculating(true);
        setNotification(null);
        try {
            const points = [pickup, ...deliveries];
            if (!points.every(p => p.validated && typeof p.lat === 'number' && typeof p.lng === 'number')) {
                setNotification({ type: 'error', message: 'Valide todos os endereços para calcular.' });
                setCalculating(false);
                return;
            }

            // OSRM Logic
            const orsKey = shopSettings?.open_route_service_api_key;
            let realRouteFound = false;
            let orsDistance = 0;

            if (orsKey && points.length === 2 && requestType === 'PLATFORM') {
                // Try OSRM for simple A->B routed requests (multiple stops might need different API call or loop)
                // For now, let's implement for simple point-to-point or just sum segments if we want to be fancy.
                // To keep consistent with InternalOrders, let's try A->B first.
                // Actually internal orders only handles 1 delivery. Here we can have many.
                // Let's stick to simple logic: if OSRM available, try it.
                // NOTE: ORS free tier has limits.
                try {
                    // Build coordinates string: lon,lat|lon,lat...
                    // ORS expects "start=lon,lat&end=lon,lat" for directions, or "coordinates=[[lon,lat],[lon,lat]]" for POST
                    // We'll use the GET format loop for segments or just estimatedDeliveryCosts fallback
                    // For simplicity and robustness, let's do the loop sum for multi-stop if needed,
                    // but usually it's just Pickup -> Delivery.

                    let totalOrsDist = 0;
                    let success = true;

                    for (let i = 0; i < points.length - 1; i++) {
                        const start = points[i];
                        const end = points[i + 1];
                        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;
                        const resp = await fetch(url);
                        const data = await resp.json();
                        if (data.features && data.features[0]) {
                            totalOrsDist += (data.features[0].properties.summary.distance / 1000);
                        } else {
                            success = false;
                            break;
                        }
                    }

                    if (success) {
                        orsDistance = totalOrsDist;
                        realRouteFound = true;
                    }
                } catch (err) {
                    // console.error('OSRM Failed', err);
                }
            }

            setIsRealRoute(realRouteFound);

            const stops = Math.max(0, deliveries.length - 1);
            const calc = estimateDeliveryCosts(points.map(p => ({ lat: p.lat!, lng: p.lng! })), stops, (fees || {}) as PartnerFeeSettings);


            if (realRouteFound) {
                // Recalculate cost with real distance
                // IMPORTANTE: Cobrar KM apenas até primeira entrega (modelo iFood/99Food)

                // Calcular distância cobrada: apenas coleta → primeira entrega
                let chargedOrsDistance = 0;
                if (points.length >= 2) {
                    try {
                        const start = points[0];
                        const end = points[1];
                        const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${start.lng},${start.lat}&end=${end.lng},${end.lat}`;
                        const resp = await fetch(url);
                        const data = await resp.json();
                        if (data.features && data.features[0]) {
                            chargedOrsDistance = data.features[0].properties.summary.distance / 1000;
                        } else {
                            chargedOrsDistance = orsDistance; // Fallback para total
                        }
                    } catch {
                        chargedOrsDistance = orsDistance; // Fallback para total
                    }
                } else {
                    chargedOrsDistance = orsDistance;
                }

                const baseKm = Number(fees?.base_delivery_km || 0);
                const baseValue = Number(fees?.base_delivery_value || 0);
                const extraPerKm = Number(fees?.extra_km_value || 0);
                const stopFeeTotal = Number(fees?.additional_stop_fee || 0) * Math.max(0, stops);

                // Cobrar KM extra APENAS com base na distância até primeira entrega
                const extraKm = Math.max(0, chargedOrsDistance - baseKm);
                const partnerNetCalc = baseValue + (extraKm * extraPerKm) + stopFeeTotal;

                // Super Lojista: sem taxas da plataforma
                let storeTotal: number;
                if (isSuperStore) {
                    storeTotal = partnerNetCalc; // Paga apenas o valor da entrega
                } else {
                    const feeFixed = Number(fees?.global_tax_fixed || 0);
                    const feePercentValue = Number(fees?.global_tax_percent || 0) * partnerNetCalc;
                    storeTotal = partnerNetCalc + feeFixed + feePercentValue;
                }

                setDistanceKm(orsDistance); // Mostra distância TOTAL (para exibição)
                setPartnerNet(Number(partnerNetCalc.toFixed(2)));
                setCost(Number(storeTotal.toFixed(2)));
            } else {
                setDistanceKm(calc.distanceKm);
                setPartnerNet(calc.partnerNet);
                // Super Lojista: sem taxas da plataforma
                if (isSuperStore) {
                    setCost(calc.partnerNet); // Paga apenas o valor da entrega
                } else {
                    setCost(calc.total); // Paga com taxas normais
                }
            }

        } catch (e: any) {
            setNotification({ type: 'error', message: e.message || 'Erro ao calcular valores.' });
        } finally {
            setCalculating(false);
        }
    };


    // Recalcular valores quando mudar para ASSOCIATE
    useEffect(() => {
        if (requestType === 'ASSOCIATE' && pickup.validated && deliveries.every(d => d.validated)) {
            calculateValues();
        }
    }, [requestType, selectedAssociateIds]);

    useEffect(() => {
        const payload = {
            requestType,
            pickup,
            deliveries,
            distanceKm,
            cost,
            partnerNet,
            selectedAssociateIds,
        };
        try { localStorage.setItem('store_request_state', JSON.stringify(payload)); } catch { }
    }, [requestType, pickup, deliveries, distanceKm, cost, partnerNet, selectedAssociateIds]);

    useEffect(() => {
        const payload = {
            requestType,
            pickup,
            deliveries,
            distanceKm,
            cost,
            partnerNet,
            selectedAssociateIds,
        };
        try { localStorage.setItem('store_request_state', JSON.stringify(payload)); } catch { }
    }, [requestType, pickup, deliveries, distanceKm, cost, partnerNet, selectedAssociateIds]);

    // Auto-validation Effect
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        const scheduleValidation = (addr: AddressData) => {
            if (addr.street && addr.number && addr.neighborhood && !addr.validated && !addr.validating) {
                const t = setTimeout(() => {
                    validateAddress(addr.id);
                }, 1500); // 1.5s debounce
                timers.push(t);
            }
        };

        scheduleValidation(pickup);
        deliveries.forEach(scheduleValidation);

        return () => {
            timers.forEach(clearTimeout);
        };
    }, [
        pickup.street, pickup.number, pickup.neighborhood, pickup.validated, pickup.validating,
        // Deep dependency check for deliveries
        JSON.stringify(deliveries.map(d => ({ id: d.id, s: d.street, n: d.number, b: d.neighborhood, v: d.validated, vg: d.validating })))
    ]);

    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            const inProgress = (pickup.street || deliveries.some(d => d.street)) && !isSubmitting;
            if (inProgress) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [pickup, deliveries, isSubmitting]);

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
            if (!addressToValidate.street) {
                updateState({ validated: false, error: 'Informe a rua/avenida.' });
                return;
            }
            if (!storeCity) {
                updateState({ validated: false, error: 'Cidade do usuário não definida.' });
                return;
            }
            const query = `${addressToValidate.street}, ${storeCity}, Brazil`;
            const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=1&q=${encodeURIComponent(query)}`;
            const ctrl = new AbortController();
            const to = setTimeout(() => ctrl.abort(), 8000);
            let response: Response;
            try {
                response = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' }, referrerPolicy: 'no-referrer', cache: 'no-store', signal: ctrl.signal });
            } finally {
                clearTimeout(to);
            }

            if (!response.ok) throw new Error("Falha na comunicação com a API de endereços.");

            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lang=pt&limit=1`;
                const photonResp = await fetch(photonUrl, { cache: 'no-store' });
                if (!photonResp.ok) throw new Error(`Endereço não encontrado em ${storeCity}.`);
                const photonData = await photonResp.json();
                const feat = photonData?.features?.[0];
                if (!feat) throw new Error(`Endereço não encontrado em ${storeCity}.`);
                const props = feat.properties || {};
                const detectedCityAlt = (props.city || props.town || props.village || props.locality || '').toString();
                if (detectedCityAlt && detectedCityAlt.toLowerCase() !== storeCity.toLowerCase()) {
                    throw new Error(`Endereço inválido. O endereço pertence a ${detectedCityAlt}, não a ${storeCity}.`);
                }
                updateState({
                    street: (props.street || addressToValidate.street) as string,
                    number: addressToValidate.number,
                    neighborhood: addressToValidate.neighborhood,
                    cep: addressToValidate.cep,
                    city: detectedCityAlt || storeCity,
                    state: (props.state || addressToValidate.state) as string,
                    lat: Number((feat.geometry?.coordinates?.[1] ?? addressToValidate.lat) as number),
                    lng: Number((feat.geometry?.coordinates?.[0] ?? addressToValidate.lng) as number),
                    validated: true,
                    error: undefined,
                });
                return;
            }

            const first = data[0];
            const addr = (first.address || {}) as any;
            const detectedCity = addr.city || addr.town || addr.village || '';

            if (detectedCity && detectedCity.toLowerCase() !== storeCity.toLowerCase()) {
                throw new Error(`Endereço inválido. O endereço pertence a ${detectedCity}, não a ${storeCity}.`);
            }

            updateState({
                street: addr.road || addressToValidate.street,
                number: addressToValidate.number,
                neighborhood: addressToValidate.neighborhood,
                cep: addressToValidate.cep,
                city: detectedCity || storeCity,
                state: addr.state || addressToValidate.state,
                lat: parseFloat(first.lat),
                lng: parseFloat(first.lon),
                validated: true,
                error: undefined,
            });

        } catch (e: any) {
            const msg = String(e?.message || 'Erro ao validar endereço.');
            if (msg.includes('Abort')) {
                updateState({ validated: false, error: 'Tempo esgotado ao validar endereço. Tente novamente.' });
            } else {
                updateState({ validated: false, error: msg.includes('resolve') ? 'Falha de rede/DNS ao acessar a API de endereços.' : msg });
            }
        } finally {
            updateState({ validating: false });
        }
    };

    const handleDispatch = async () => {
        setIsSubmitting(true);
        setNotification(null);

        const allAddresses = [pickup, ...deliveries];
        const missingRequired = allAddresses.filter(a => !a.street?.trim() || !a.number?.trim() || !a.neighborhood?.trim());
        if (missingRequired.length > 0) {
            setNotification({ type: 'error', message: "Preencha Rua, Número e Bairro em todos os endereços." });
            setIsSubmitting(false);
            return;
        }
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
                const generatedCodes: string[] = [];
                const user = await cloud.getClient()?.auth.getUser();
                const storeId = user?.data?.user?.id;

                if (!storeId) throw new Error("Usuário não autenticado.");

                for (const partnerId of selectedAssociateIds) {
                    // Usar a nova função específica para associados que lida melhor com múltiplos pontos
                    await cloud.sendDeliveryToAssociatePartner(
                        pickup,
                        deliveries,
                        partnerId,
                        storeId,
                        distanceKm || 0,
                        cost || 0
                    );
                    generatedCodes.push('ENVIADO'); // A nova função não retorna código legível por enquanto ou retorna objeto diferente
                }
                setNotification({ type: 'success', message: `Solicitação enviada para ${selectedAssociateIds.length} entregador(es)!` });
            } else {
                if (distanceKm === null || cost === null || partnerNet === null) {
                    setNotification({ type: 'error', message: 'Calcule os valores antes de confirmar.' });
                    setIsSubmitting(false);
                    return;
                }
                const needed = Math.max(0, (cost || 0) - (walletBalance || 0));
                if (activeLoan && activeLoan.status === 'active') {
                    const canProceed = walletBalance >= (cost || 0);
                    if (!canProceed) {
                        setNotification({ type: 'error', message: 'Empréstimo ativo detectado. Quite o empréstimo atual ou recarregue seu saldo para solicitar nova corrida.' });
                        setIsSubmitting(false);
                        return;
                    }
                }
                if (needed > 0) {
                    if (!loanConfig || needed > loanConfig.credit_limit) {
                        setNotification({ type: 'error', message: 'Saldo insuficiente e limite de crédito indisponível ou insuficiente.' });
                        setIsSubmitting(false);
                        return;
                    }
                    setShowLoanModal(true);
                    setIsSubmitting(false);
                    return;
                }
                const result = await cloud.createPartnerRequest(pickupAddrStr, deliveryAddrStr, distanceKm || 0, cost || 0, partnerNet || 0, (fees || {}) as PartnerFeeSettings, 'PLATFORM');
                if (result && typeof result.availablePartners === 'number' && result.availablePartners === 0) {
                    setNotification({ type: 'error', message: 'Nenhum entregador disponível' });
                } else if (result) {
                    setNotification({ type: 'success', message: `Solicitação enviada para a plataforma Zé! Código de Entrega: ${result.deliveryCode}` });
                    if (result.requestId) {
                        startCountdown(result.expiresAt, result.requestId);
                    }
                }
            }

            setPickup({ id: 'pickup', street: '', number: '', neighborhood: '', validated: false });
            setDeliveries([{ id: crypto.randomUUID(), street: '', number: '', neighborhood: '', validated: false }]);
            setSelectedAssociateIds([]);
            try { localStorage.removeItem('store_request_state'); } catch { }

        } catch (e: any) {
            setNotification({ type: 'error', message: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const startCountdown = (expiresAt?: string, requestId?: string) => {
        if (!expiresAt || !requestId) return;

        setCurrentRequestId(requestId);

        try {
            const end = new Date(expiresAt).getTime();
            const update = async () => {
                const now = Date.now();
                const diff = Math.max(0, Math.floor((end - now) / 1000));
                setExpiresCountdown(diff);

                // Cancelar automaticamente quando o tempo expirar
                if (diff <= 0) {
                    if (expiresTimer) {
                        clearInterval(expiresTimer);
                        setExpiresTimer(null);
                    }
                    try {
                        await cloud.autoCancelUnacceptedRequest(requestId);
                        setNotification({ type: 'info', message: 'Entrega cancelada: nenhum entregador aceitou no prazo de 5 minutos. Valor reembolsado.' });
                        setCurrentRequestId(null);
                        setExpiresCountdown(null);
                    } catch (err: any) {
                        // console.error('Erro ao cancelar solicitação expirada:', err);
                        setNotification({ type: 'error', message: 'Erro ao cancelar entrega expirada.' });
                    }
                }
            };
            update();
            const id = setInterval(update, 1000);
            setExpiresTimer(id);
        } catch { }
    };

    const formatCountdown = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const confirmLoanAndDispatch = async () => {
        setShowLoanModal(false);
        setIsSubmitting(true);
        try {
            const pickupAddrStr = formatAddressString(pickup);
            const deliveryAddrStr = deliveries.map(formatAddressString).join(' -> ');
            const result = await cloud.createPartnerRequest(pickupAddrStr, deliveryAddrStr, distanceKm || 0, cost || 0, partnerNet || 0, (fees || {}) as PartnerFeeSettings, 'PLATFORM');
            if (result && typeof result.availablePartners === 'number' && result.availablePartners === 0) {
                setNotification({ type: 'error', message: 'Nenhum entregador disponível' });
            } else if (result) {
                setNotification({ type: 'success', message: `Solicitação enviada com Empréstimo! Código: ${result.deliveryCode}` });
                if (result.requestId) {
                    startCountdown(result.expiresAt, result.requestId);
                }
            }
            setPickup({ id: 'pickup', street: '', number: '', neighborhood: '', validated: false });
            setDeliveries([{ id: crypto.randomUUID(), street: '', number: '', neighborhood: '', validated: false }]);
            setSelectedAssociateIds([]);
            try { localStorage.removeItem('store_request_state'); } catch { }
        } catch (e: any) {
            setNotification({ type: 'error', message: e.message || 'Erro ao solicitar com empréstimo.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleAssociateSelection = (id: string) => {
        setSelectedAssociateIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
    };


    const [isEditingPickup, setIsEditingPickup] = useState(false);

    const renderAddressInputs = (addr: AddressData, isPickup: boolean) => {
        const handleInputChange = (field: keyof AddressData, value: string) => {
            if (isPickup) {
                setPickup(prev => ({ ...prev, [field]: value, validated: false, error: undefined }));
            } else {
                updateDeliveryField(addr.id, field, value);
            }
        };

        const showForm = !isPickup || isEditingPickup;

        return (
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 flex items-center gap-2">
                        {isPickup ? <Home className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                        {isPickup ? `Endereço de Coleta ${pickup.street ? `(${pickup.street}, ${pickup.number})` : ''}` : 'Endereço de Entrega'}
                    </label>
                    <div className="flex items-center gap-2">
                        {isPickup && (
                            <button
                                onClick={() => setIsEditingPickup(!isEditingPickup)}
                                className="text-[10px] font-bold text-brand-600 hover:underline uppercase tracking-wider"
                            >
                                {isEditingPickup ? 'Ocultar campos' : 'Trocar endereço de coleta'}
                            </button>
                        )}
                        {!isPickup && deliveries.length > 1 && (
                            <button onClick={() => removeDelivery(addr.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        )}
                    </div>
                </div>

                {showForm && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-[2fr_0.5fr_1fr_auto] gap-[15px] items-center" style={{ marginBottom: '15px' }}>
                            <div className="md:col-start-1 md:row-start-1 md:col-span-1">
                                <StreetAutocomplete
                                    city={storeCity}
                                    value={addr.street}
                                    onChange={val => handleInputChange('street', val)}
                                    placeholder="Rua / Avenida"
                                />
                            </div>
                            <div className="md:col-start-2 md:row-start-1 md:col-span-1 md:justify-self-center w-full">
                                <CustomInput type="text" placeholder="Número" value={addr.number} onChange={e => handleInputChange('number', e.target.value)} required />
                            </div>
                            <div className="md:col-start-3 md:row-start-1 md:col-span-1">
                                <CustomInput type="text" placeholder="Bairro" value={addr.neighborhood} onChange={e => handleInputChange('neighborhood', e.target.value)} required />
                            </div>
                            <Button variant="primary" size="sm" onClick={() => validateAddress(addr.id)} disabled={addr.validating} className="w-full md:w-auto md:col-start-4 md:row-start-1 md:justify-self-end rounded-lg h-[46px]">
                                {addr.validating ? <Loading variant="inline" size="sm" /> : 'Validar'}
                            </Button>
                        </div>
                        {addr.error && <p className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {addr.error}</p>}
                        {addr.validated && (
                            <div className="flex items-center justify-between text-xs text-green-600 mt-1 font-bold p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Endereço válido</span>
                                <button onClick={() => openNavigation(addr.lat!, addr.lng!)} className="p-1 hover:bg-green-100 rounded-full" title="Navegar">
                                    <Navigation className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {isPickup && !isEditingPickup && pickup.validated && (
                    <div className="p-3 bg-brand-50/50 dark:bg-brand-900/10 rounded-lg border border-brand-100 dark:border-brand-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-brand-700 dark:text-brand-300 font-medium">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Coleta em: <strong>{pickup.street}, {pickup.number}</strong></span>
                        </div>
                        <Check className="w-4 h-4 text-green-500" />
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="flex justify-center p-10"><Loading variant="container" size="md" message="Carregando dados da entrega..." /></div>;

    return (
        <div className="space-y-6 animate-in fade-in">

            {typeof expiresCountdown === 'number' && expiresCountdown > 0 && (
                <div className="p-3 rounded-xl bg-yellow-50 text-yellow-800 border border-yellow-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-bold">Tempo para expirar: {formatCountdown(expiresCountdown)}</span>

                </div>
            )}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white">Solicitar Entrega</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {storeCity || '(Cidade não configurada - Atualize seu perfil)'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase">Saldo</p>
                        <p className={`font-bold text-lg ${walletBalance > 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(walletBalance)}</p>
                    </div>
                </div>

                <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-xl flex gap-1 mb-6">
                    <button
                        onClick={() => setRequestType('PLATFORM')}
                        className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all rounded-lg ${requestType === 'PLATFORM' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        {isSuperStore ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        Parceiro Zé
                    </button>
                    <button
                        onClick={() => setRequestType('ASSOCIATE')}
                        className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all rounded-lg ${requestType === 'ASSOCIATE' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                    >
                        <Users className="w-4 h-4" /> Entregador Fixo
                    </button>
                </div>

                <div className="space-y-4">
                    {
                        notification && (
                            <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 mb-3 ${notification.type === 'success' ? 'bg-green-100 text-green-700' : notification.type === 'info' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                {notification.type === 'success' ? <Check className="w-5 h-5" /> : notification.type === 'info' ? <Info className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                <span className="font-bold text-sm flex-1">{notification.message}</span>
                                {notification.action && (
                                    <button
                                        onClick={notification.action.onClick}
                                        className="px-3 py-1 bg-white/50 hover:bg-white/80 rounded-lg text-xs font-bold transition-colors mr-2 whitespace-nowrap"
                                    >
                                        {notification.action.label}
                                    </button>
                                )}
                                <button onClick={() => setNotification(null)} className=""><X className="w-4 h-4" /></button>
                            </div>
                        )
                    }

                    {/* Endereços - Visível em ambos os modos */}
                    {renderAddressInputs(pickup, true)}
                    {
                        deliveries.map(d => (
                            <React.Fragment key={d.id}>
                                {renderAddressInputs(d, false)}
                            </React.Fragment>
                        ))
                    }

                    {/* Botão Adicionar Parada - Visível em ambos os modos */}
                    <div className="flex justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addDelivery}
                            className="h-10 rounded-lg focus:ring-2 focus:ring-brand-300"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Adicionar Parada
                        </Button>
                    </div>

                    {requestType === 'PLATFORM' && (
                        <>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Calculator className="w-4 h-4" /> Cálculo de Valores</h3>
                                    <Button size="sm" onClick={calculateValues} disabled={calculating} className="rounded-lg">{calculating ? <Loading variant="inline" size="sm" /> : 'Calcular'}</Button>
                                </div>
                                {isSuperStore && (
                                    <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        <p className="text-xs font-bold text-green-700 dark:text-green-300">
                                            Benefício Super Lojista: Você paga apenas o valor da entrega, sem taxas da plataforma!
                                        </p>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <p className="text-xs font-bold text-gray-500">Distância Total {isRealRoute ? '(Real)' : '(Reta)'}</p>
                                        <p className="font-bold text-lg">{distanceKm !== null ? `${distanceKm.toFixed(2)} km` : '--'}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <p className="text-xs font-bold text-gray-500">Valor Base</p>
                                        <p className="font-bold text-lg">{formatCurrency(Number(fees?.base_delivery_value || 0))}</p>
                                    </div>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                        <p className="text-xs font-bold text-gray-500">Paradas Extras</p>
                                        <p className="font-bold text-lg">{deliveries.length > 1 ? `${deliveries.length - 1} x ${formatCurrency(Number(fees?.additional_stop_fee || 0))}` : '0'}</p>
                                    </div>
                                </div>
                                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-gray-500">Taxas da Plataforma</p>
                                        {isSuperStore ? (
                                            <>
                                                <p className="text-sm text-green-600 dark:text-green-400 font-bold">Fixa: R$ 0,00 (Isento)</p>
                                                <p className="text-sm text-green-600 dark:text-green-400 font-bold">Percentual: 0,0% (Isento)</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm">Fixa: {formatCurrency(Number(fees?.global_tax_fixed || 0))}</p>
                                                <p className="text-sm">Percentual: {((Number(fees?.global_tax_percent || 0)) * 100).toFixed(1)}%</p>
                                            </>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-500">Resumo</p>
                                        <p className="text-sm">Líquido do Entregador: {partnerNet !== null ? formatCurrency(partnerNet) : '--'}</p>
                                        <p className="text-sm font-bold">Total para a Loja: {cost !== null ? formatCurrency(cost) : '--'}</p>
                                    </div>
                                </div>
                            </div>
                            <div data-testid="action-grid" className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ gridAutoRows: '1fr' }}>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleDispatch}
                                    disabled={isSubmitting || distanceKm === null || cost === null || partnerNet === null || cost <= 0 || onlineDriversCount === 0}
                                    className="w-full h-10 rounded-lg focus:ring-2 focus:ring-brand-300 col-span-2"
                                    style={{ alignSelf: 'center', justifySelf: 'stretch' }}
                                >
                                    {isSubmitting ? <Loading variant="inline" size="sm" /> : 'Chamar Entregador Zé'}
                                </Button>
                                {onlineDriversCount === 0 && (
                                    <p className="col-span-1 md:col-span-2 text-center text-xs font-bold text-red-500 mt-2">
                                        Não há entregadores online nesta cidade no momento.
                                    </p>
                                )}
                            </div>
                            <LoanModal
                                isOpen={showLoanModal}
                                onConfirm={confirmLoanAndDispatch}
                                onCancel={() => setShowLoanModal(false)}
                                config={loanConfig as LoanConfig}
                                neededAmount={Math.max(0, (cost || 0) - (walletBalance || 0))}
                            />
                        </>
                    )}


                    {requestType === 'ASSOCIATE' && (
                        <div className="space-y-4 mt-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><Users className="w-4 h-4" /> Selecione os Entregadores</h3>

                            {associatedDrivers.length === 0 ? (
                                <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum entregador fixo associado.</p>
                                    <p className="text-xs text-gray-400 mt-1">Cadastre entregadores fixos no painel de equipe.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {associatedDrivers.map(d => (
                                        <div key={d.id} onClick={() => toggleAssociateSelection(d.partner_id)} className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${selectedAssociateIds.includes(d.partner_id) ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-200'}`}>
                                            {selectedAssociateIds.includes(d.partner_id) ? <CheckCircle className="w-5 h-5 text-brand-600 shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0"></div>}

                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center">
                                                {d.partner_avatar ? (
                                                    <img src={d.partner_avatar} alt={d.partner_name || 'Entregador'} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-gray-500 font-bold">{(d.partner_name || '?').charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>

                                            <div>
                                                <p className="font-bold text-sm dark:text-white">{d.partner_name || 'Sem Nome'}</p>
                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                    {d.partner_phone}
                                                    {d.partner_vehicle && (
                                                        <>
                                                            <span className="w-1 h-1 bg-gray-400 rounded-full" />
                                                            {d.partner_vehicle}
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleDispatch}
                                disabled={isSubmitting || selectedAssociateIds.length === 0}
                                className="w-full h-12 rounded-xl focus:ring-2 focus:ring-brand-300 mt-4 text-sm uppercase tracking-wide"
                            >
                                {isSubmitting ? <Loading variant="inline" size="sm" /> : `Enviar para ${selectedAssociateIds.length > 0 ? selectedAssociateIds.length : ''} Entregador(es)`}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
