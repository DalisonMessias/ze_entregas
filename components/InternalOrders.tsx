import React, { useState, useEffect } from 'react';
import { StoreProduct, Order, CartItem, Product, PaymentMethod, StoreDeliverySettings, StoreNeighborhoodFee } from '../types';
import * as cloud from '../services/cloud';
import { Loader2, Search, Plus, Trash2, Printer, Save, ShoppingBag, Minus, X, Edit2, Package, Image as ImageIcon, CreditCard, Banknote, HelpCircle, CheckCircle, Clock, FileText, History as HistoryIcon, LayoutList, Share2, Copy, Coffee, MapPin, Bike, Store, Home, Calculator } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { useDialog } from '../utils/dialogService';
import { ProductModal } from './ProductModal';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';
import { estimateDeliveryCosts } from '../utils/estimateDeliveryCosts';
import { DistrictSearchSelect } from './DistrictSearchSelect';
import { LocationHelpModal } from './LocationHelpModal';
import { StreetAutocomplete } from './StreetAutocomplete';

// Interface para detalhamento da taxa do Parceiro Zé
interface PlatformFeeDetails {
    baseValue: number;
    baseKm: number;
    additionalValue: number;
    additionalKm: number;
    totalDistance: number;
}

export const InternalOrders: React.FC = () => {
    // View State
    const [view, setView] = useState<'NEW_ORDER' | 'HISTORY' | 'TABLES'>('NEW_ORDER');

    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [activeTables, setActiveTables] = useState<any[]>([]); // Nova: Mesas ativas
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<{ product: StoreProduct, quantity: number }[]>([]);
    const { confirm, alert: showAlert } = useDialog();

    // Ticket State
    const [orderType, setOrderType] = useState<'LOCAL' | 'PICKUP' | 'DELIVERY'>('LOCAL');
    const [deliveryMode, setDeliveryMode] = useState<'OWN' | 'PLATFORM' | 'ASSOCIATE' | null>(null); // Modo de entrega
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [observation, setObservation] = useState('');

    // Address State (Capacity for Delivery)
    const [addressZip, setAddressZip] = useState('');
    const [addressStreet, setAddressStreet] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressDistrict, setAddressDistrict] = useState('');
    const [addressCity, setAddressCity] = useState('');

    const [storeCity, setStoreCity] = useState(''); // Estado para cidade da loja
    const [storeStreet, setStoreStreet] = useState(''); // Estado para rua da loja (para cálculo mais preciso)
    const [deliveryFeeStr, setDeliveryFeeStr] = useState('');
    const [deliverySettings, setDeliverySettings] = useState<StoreDeliverySettings | null>(null);
    const [neighborhoodFees, setNeighborhoodFees] = useState<StoreNeighborhoodFee[]>([]);
    const [platformFees, setPlatformFees] = useState<any>(null); // Taxas globais da plataforma
    const [platformFeeDetails, setPlatformFeeDetails] = useState<PlatformFeeDetails | null>(null);
    const [isDeliveryFeeEditable, setIsDeliveryFeeEditable] = useState(true);
    const [calculatedDistance, setCalculatedDistance] = useState<number | null>(null);
    const [isRealRoute, setIsRealRoute] = useState(false);

    // Location by Coordinates/Link State
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [locationInput, setLocationInput] = useState('');
    const [isLocationOnly, setIsLocationOnly] = useState(false);
    const [calculationMode, setCalculationMode] = useState<'FIXED' | 'NEIGHBORHOOD' | null>(null);

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
    const [paymentTiming, setPaymentTiming] = useState<'ONLINE' | 'ON_DELIVERY'>('ON_DELIVERY'); // Default para entrega
    const [amountPaidStr, setAmountPaidStr] = useState('');
    const [customPaymentLabel, setCustomPaymentLabel] = useState('');
    const [processing, setProcessing] = useState(false);

    // Print Preview State
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);

    // Product Management State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<StoreProduct>>({});
    const [isSavingProduct, setIsSavingProduct] = useState(false);

    // History State
    const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Custom Product State
    const [isCustomProductModalOpen, setIsCustomProductModalOpen] = useState(false);
    const [customProduct, setCustomProduct] = useState<{ name: string; price: string; quantity: number }>({ name: '', price: '', quantity: 1 });
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

    // Profile Validation State
    const [profileValid, setProfileValid] = useState<boolean | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    useEffect(() => {
        loadProducts();
    }, []);

    // Calcular taxa de entrega automaticamente baseado no modo selecionado
    useEffect(() => {
        console.log('[InternalOrders] Cálculo automático:', { orderType, deliveryMode, addressStreet, addressNumber, addressDistrict, platformFees });

        if (orderType !== 'DELIVERY' || !deliveryMode || !addressDistrict) {
            console.log('[InternalOrders] Condições não atendidas para cálculo');
            return;
        }

        console.log('[InternalOrders] Iniciando cálculo para modo:', deliveryMode, 'neighborhoodFees:', neighborhoodFees.length, 'platformFees:', platformFees);

        // ASSOCIATE ou OWN: Usa as configurações de entrega própria da loja
        if (deliveryMode === 'ASSOCIATE' || deliveryMode === 'OWN') {
            const currentCalcMode = calculationMode || deliverySettings?.delivery_mode || 'FIXED';
            console.log('[InternalOrders] Modo ASSOCIATE/OWN - Usando modo de cálculo:', currentCalcMode);

            if (currentCalcMode === 'FIXED') {
                const fee = deliverySettings?.fixed_fee || 0;
                setDeliveryFeeStr(fee.toFixed(2).replace('.', ','));
                setIsDeliveryFeeEditable(false);
            } else {
                console.log('[InternalOrders] Buscando bairro:', addressDistrict);
                const neighborhoodFee = neighborhoodFees.find(
                    f => f.neighborhood_name.toLowerCase() === addressDistrict.toLowerCase()
                );

                if (neighborhoodFee) {
                    setDeliveryFeeStr(neighborhoodFee.fee.toFixed(2).replace('.', ','));
                    setIsDeliveryFeeEditable(false);
                } else {
                    // Se não encontrou o bairro nas taxas cadastradas
                    setDeliveryFeeStr('');
                    setIsDeliveryFeeEditable(true); // Permite digitar manual
                }
            }
        }

        // PLATFORM: Usa cálculo da plataforma
        if (deliveryMode === 'PLATFORM' && platformFees) {
            const baseValue = Number(platformFees.base_delivery_value || 0);
            const taxFixed = Number(platformFees.global_tax_fixed || 0);
            const taxPercent = Number(platformFees.global_tax_percent || 0);

            const partnerNet = baseValue;
            const storeTotal = partnerNet + taxFixed + (partnerNet * taxPercent);

            console.log('[InternalOrders] Taxa plataforma calculada:', storeTotal, 'Base:', baseValue, 'Fixa:', taxFixed, '%:', taxPercent);
            setDeliveryFeeStr(storeTotal.toFixed(2).replace('.', ','));
            setIsDeliveryFeeEditable(false);
        } else if (deliveryMode === 'PLATFORM') {
            setDeliveryFeeStr('');
            setIsDeliveryFeeEditable(true);
        }
    }, [orderType, deliveryMode, addressDistrict, neighborhoodFees, platformFees, deliverySettings, calculationMode]);

    // Autocomplete: Busca dados do cliente baseado no telefone
    useEffect(() => {
        const digits = customerPhone.replace(/\D/g, '');
        if (digits.length >= 10) {
            const timer = setTimeout(async () => {
                const lastOrder = await cloud.findCustomerByPhone(customerPhone);
                if (lastOrder) {
                    // Se não tiver nome preenchido, preenche
                    if (!customerName) setCustomerName(lastOrder.customer_name || '');

                    // Se estiver em modo entrega e endereços vazios, preenche
                    if (orderType === 'DELIVERY' && lastOrder.shipping_address) {
                        const addr = lastOrder.shipping_address;
                        if (!addressStreet) setAddressStreet(addr.street || '');
                        if (!addressNumber) setAddressNumber(addr.number || '');
                        if (!addressDistrict) setAddressDistrict(addr.district || '');
                        if (!addressCity) setAddressCity(addr.city || '');
                    }
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [customerPhone, orderType]);

    // Detector de links de localização ou coordenadas
    useEffect(() => {
        if (!locationInput) {
            setLatitude(null);
            setLongitude(null);
            return;
        }

        // Caso 1: Coordenadas diretas (ex: -12.345, -67.890)
        const coordRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
        const coordMatch = locationInput.match(coordRegex);
        if (coordMatch) {
            setLatitude(parseFloat(coordMatch[1]));
            setLongitude(parseFloat(coordMatch[2]));
            return;
        }

        // Caso 2: Links do Google Maps (q=lat,lng ou search/lat,lng ou @lat,lng)
        const googleRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        const googleMatch = locationInput.match(googleRegex);
        if (googleMatch) {
            setLatitude(parseFloat(googleMatch[1]));
            setLongitude(parseFloat(googleMatch[2]));
            return;
        }

        // Caso 3: Links curtos ou outros formatos (q=lat,lng)
        const queryRegex = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;
        const queryMatch = locationInput.match(queryRegex);
        if (queryMatch) {
            setLatitude(parseFloat(queryMatch[1]));
            setLongitude(parseFloat(queryMatch[2]));
            return;
        }
    }, [locationInput]);

    // Calcular taxa ou apenas distância baseado no modo selecionado
    const handleDeliveryCalculation = async () => {
        // Para calcular distância, precisamos de latitude/longitude
        if (!latitude && !longitude) {
            if (!addressStreet || !addressNumber || !addressDistrict) {
                showAlert({ title: 'Dados incompletos', message: 'Preencha o endereço ou cole um link de localização para calcular.' });
                return;
            }
        }

        setProcessing(true);
        setPlatformFeeDetails(null);
        try {
            // Geocodificar endereço da loja (coleta)
            // Modificação: Usar Rua + Cidade para maior precisão (sem número/bairro conforme solicitado)
            const storeAddress = storeStreet ? `${storeStreet}, ${storeCity}, Brazil` : `${storeCity}, Brazil`;
            const storeQuery = encodeURIComponent(storeAddress);
            const storeUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=1&q=${storeQuery}`;

            const storeResp = await fetch(storeUrl, { headers: { 'Accept-Language': 'pt-BR' }, cache: 'no-store' });
            const storeData = await storeResp.json();

            if (!Array.isArray(storeData) || storeData.length === 0) {
                throw new Error('Não foi possível localizar o endereço da loja.');
            }

            const storeLat = parseFloat(storeData[0].lat);
            const storeLng = parseFloat(storeData[0].lon);

            let deliveryLat = latitude;
            let deliveryLng = longitude;

            // Se não tiver coordenadas do link, geocodifica o endereço
            if (!deliveryLat || !deliveryLng) {
                // Modificação solicitada: Usar apenas Rua e Cidade para geocodificação para evitar erros com número/bairro
                const deliveryAddress = `${addressStreet}, ${storeCity}, Brazil`;
                const deliveryQuery = encodeURIComponent(deliveryAddress);
                const deliveryUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=br&limit=1&q=${deliveryQuery}`;

                const deliveryResp = await fetch(deliveryUrl, { headers: { 'Accept-Language': 'pt-BR' }, cache: 'no-store' });
                const deliveryData = await deliveryResp.json();

                if (!Array.isArray(deliveryData) || deliveryData.length === 0) {
                    throw new Error(`Endereço de entrega não encontrado em ${storeCity}.`);
                }

                deliveryLat = parseFloat(deliveryData[0].lat);
                deliveryLng = parseFloat(deliveryData[0].lon);
            }

            // Tentar usar OpenRouteService para rota real se houver API Key
            let distanceKmResult = 0;
            let realRouteResult = false;

            try {
                const shopSettings = await cloud.getShopSettings();
                const orsKey = shopSettings?.open_route_service_api_key;

                if (orsKey) {
                    console.log('[InternalOrders] Usando OpenRouteService para rota real...');
                    const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${storeLng},${storeLat}&end=${deliveryLng},${deliveryLat}`;
                    const orsResp = await fetch(orsUrl);
                    const orsData = await orsResp.json();

                    if (orsData.features && orsData.features[0]) {
                        // Distância vem em metros, converter para km
                        distanceKmResult = Number((orsData.features[0].properties.summary.distance / 1000).toFixed(2));
                        realRouteResult = true;
                        console.log('[InternalOrders] Rota real calculada:', distanceKmResult, 'km');
                    }
                }
            } catch (orsError) {
                console.error('[InternalOrders] Erro ao usar ORS, caindo para linha reta:', orsError);
            }

            setIsRealRoute(realRouteResult);


            // Calcular usando estimateDeliveryCosts (usa linha reta por padrão no points array)
            // Se já temos a distância real, passamos ela ou simulamos
            const points = [
                { lat: storeLat, lng: storeLng },
                { lat: deliveryLat!, lng: deliveryLng! }
            ];

            const calc = estimateDeliveryCosts(points, 0, (deliveryMode === 'PLATFORM' ? platformFees : { base_delivery_km: 0, base_delivery_value: 0, extra_km_value: 0, global_tax_fixed: 0, global_tax_percent: 0, additional_stop_fee: 0 }) as any);

            // Se conseguimos a rota real, sobrescrevemos a distância do calc
            if (realRouteResult) {
                calc.distanceKm = distanceKmResult;
                // Se for plataforma, precisamos recalcular os custos baseados na nova distância
                if (deliveryMode === 'PLATFORM' && platformFees) {
                    const baseKm = Number(platformFees.base_delivery_km || 0);
                    const baseValue = Number(platformFees.base_delivery_value || 0);
                    const extraPerKm = Number(platformFees.extra_km_value || 0);
                    const extraKm = Math.max(0, distanceKmResult - baseKm);
                    const partnerNet = baseValue + (extraKm * extraPerKm);
                    const feeFixed = Number(platformFees.global_tax_fixed || 0);
                    const feePercent = Number(platformFees.global_tax_percent || 0) * partnerNet;
                    calc.total = Number((partnerNet + feeFixed + feePercent).toFixed(2));
                }
            }

            setCalculatedDistance(calc.distanceKm);

            if (deliveryMode === 'PLATFORM') {
                setDeliveryFeeStr(calc.total.toFixed(2).replace('.', ','));
                setIsDeliveryFeeEditable(false);

                // Calcular detalhes para exibir na UI
                if (platformFees) {
                    const baseKm = Number(platformFees.base_delivery_km || 0);
                    const baseValue = Number(platformFees.base_delivery_value || 0);
                    const extraPerKm = Number(platformFees.extra_km_value || 0);
                    const distance = calc.distanceKm;
                    const extraKm = Math.max(0, distance - baseKm);
                    const additionalValue = extraKm * extraPerKm;

                    setPlatformFeeDetails({
                        baseValue,
                        baseKm,
                        additionalValue,
                        additionalKm: extraKm,
                        totalDistance: distance
                    });
                }

                showAlert({
                    title: 'Cálculo Concluído!',
                    message: `Distância (${realRouteResult ? 'Ruas' : 'Linha Reta'}): ${calc.distanceKm}km\nTotal: R$ ${calc.total.toFixed(2)}`
                });
            } else {
                showAlert({
                    title: 'Distância Calculada!',
                    message: `O endereço está a ${calc.distanceKm}km (${realRouteResult ? 'por ruas' : 'linha reta'}) da loja. Defina o valor manualmente.`
                });
                setIsDeliveryFeeEditable(true);
            }
        } catch (error: any) {
            console.error('[InternalOrders] Erro ao calcular:', error);
            showAlert({ title: 'Erro ao calcular', message: error.message || 'Não foi possível realizar o cálculo.' });
        } finally {
            setProcessing(false);
        }
    };

    useEffect(() => {
        if (view === 'HISTORY') {
            loadHistory();
        } else if (view === 'TABLES') {
            loadActiveTables();
        }
    }, [view]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const [productsData, profile, settings, fees] = await Promise.all([
                cloud.getStoreProducts(),
                cloud.getMyPartnerProfile(),
                cloud.getStoreDeliverySettings(),
                cloud.getStoreNeighborhoodFees()
            ]);

            setProducts(productsData);
            setDeliverySettings(settings);
            setNeighborhoodFees(fees);
            if (settings) {
                setCalculationMode(settings.delivery_mode);
            }

            // Carregar taxas globais da plataforma para cálculo do Parceiro Zé
            try {
                console.log('[InternalOrders] Carregando taxas da plataforma...');
                const globalFees = await cloud.getPublicFeeSettings();
                console.log('[InternalOrders] Taxas carregadas:', globalFees);
                setPlatformFees(globalFees);
            } catch (error) {
                console.error('[InternalOrders] Erro ao carregar taxas da plataforma:', error);
            }

            // Validar perfil completo
            const validation = validateStoreProfile(profile);
            console.log('[InternalOrders] Validação:', validation);

            setProfileValid(validation.isValid);
            setMissingFields(validation.missingFields);

            if (validation.isValid && profile) {
                setStoreCity(profile.city || '');
                setStoreStreet(profile.address_street || '');
                setAddressCity(profile.city || '');
            }
        } catch (error) {
            console.error('[InternalOrders] Erro ao carregar:', error);
            setProfileValid(false);
            setMissingFields(['Erro ao carregar perfil']);
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const data = await cloud.getInternalOrders();
            setHistoryOrders(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const loadActiveTables = async () => {
        setLoading(true);
        try {
            const mbClient = cloud.getClient();
            if (!mbClient) return;
            const { data: { user } } = await mbClient.auth.getUser();
            if (!user) return;

            const data = await cloud.getOpenOrders(user.id);
            setActiveTables(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product: StoreProduct) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const handleSaveProduct = async (productData: Partial<StoreProduct>) => {
        if (!productData.name || !productData.price) return;
        setIsSavingProduct(true);
        try {
            if (productData.id) {
                await cloud.updateStoreProduct(productData as StoreProduct);
            } else {
                await cloud.createStoreProduct({
                    name: productData.name,
                    description: productData.description || '',
                    price: Number(productData.price),
                    image_url: productData.image_url,
                    category_id: productData.category_id,
                    is_active: productData.is_active !== false
                });
            }
            await loadProducts();
            setIsProductModalOpen(false);
        } catch (error) {
            console.error(error);
            showAlert({ title: 'Erro', message: 'Erro ao salvar produto' });
        } finally {
            setIsSavingProduct(false);
        }
    };

    const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const confirmed = await confirm({
            title: 'Excluir Produto',
            message: 'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.'
        });

        if (confirmed) {
            setLoading(true);
            try {
                await cloud.deleteStoreProduct(id);
                await loadProducts();
                removeFromCart(id);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
    };

    const openNewProductModal = () => {
        setEditingProduct({ is_active: true, price: 0 });
        setIsProductModalOpen(true);
    };

    const openEditProductModal = (product: StoreProduct, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingProduct({ ...product });
        setIsProductModalOpen(true);
    };

    const handleAddCustomProduct = () => {
        if (!customProduct.name || !customProduct.price) {
            showAlert({ title: 'Erro', message: 'Preencha nome e preço.' });
            return;
        }

        const price = parseFloat(customProduct.price.replace(',', '.'));
        if (isNaN(price) || price <= 0) {
            showAlert({ title: 'Erro', message: 'Preço inválido.' });
            return;
        }

        const newProduct: StoreProduct = {
            id: `custom_${Date.now()}`,
            store_id: '', // Será preenchido no checkout ou ignorado
            name: `${customProduct.name} (Avulso)`,
            price: price,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            description: 'Produto Adicionado Manualmente'
        };

        setCart(prev => [...prev, { product: newProduct, quantity: customProduct.quantity }]);
        setIsCustomProductModalOpen(false);
        setCustomProduct({ name: '', price: '', quantity: 1 });
    };

    const openCustomProductModal = () => {
        setCustomProduct({ name: '', price: '', quantity: 1 });
        setIsCustomProductModalOpen(true);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const deliveryFee = orderType === 'DELIVERY' ? Number(deliveryFeeStr.replace(/\D/g, '')) / 100 : 0;
    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) + deliveryFee;

    // Recalcular taxa ao mudar bairro, tipo ou modo de entrega
    useEffect(() => {
        if (orderType !== 'DELIVERY' || !deliverySettings) return;

        // Se for PLATFORM, o cálculo é via botão.
        // Modo GPS (isLocationOnly) agora permite cálculo automático se o Bairro for preenchido.
        if (deliveryMode === 'PLATFORM') {
            return;
        }

        if (calculationMode === 'FIXED') {
            setDeliveryFeeStr(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(deliverySettings.fixed_fee || 0));
            setIsDeliveryFeeEditable(false);
        } else if (calculationMode === 'NEIGHBORHOOD') {
            // Modo Bairro
            const normalizedDistrict = (addressDistrict || '').trim().toLowerCase();
            const feeConfig = neighborhoodFees.find(f => f.neighborhood_name.toLowerCase() === normalizedDistrict);

            if (feeConfig) {
                setDeliveryFeeStr(new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(feeConfig.fee));
                setIsDeliveryFeeEditable(false);
            } else {
                // Bairro não encontrado
                if (deliverySettings.allow_outside_city) {
                    setIsDeliveryFeeEditable(true);
                    // Não limpamos o valor se estiver editável, permitimos o usuário digitar
                } else {
                    setDeliveryFeeStr('0,00');
                    setIsDeliveryFeeEditable(false);
                }
            }
        }
    }, [addressDistrict, orderType, deliverySettings, neighborhoodFees, calculationMode, deliveryMode]);

    // Resetar campos ao mudar modo de entrega
    useEffect(() => {
        setCalculatedDistance(null);
        if (deliveryMode === 'PLATFORM') {
            setDeliveryFeeStr('0,00');
            setIsDeliveryFeeEditable(false);
        } else {
            setLocationInput('');
        }
    }, [deliveryMode]);

    // Resetar distância ao mudar endereço relevante
    useEffect(() => {
        setCalculatedDistance(null);
    }, [addressStreet, addressNumber, addressDistrict, locationInput]);

    const handleCopySummary = () => {
        let summary = `*NOVO PEDIDO*\n\n`;
        if (customerName) summary += `👤 *Cliente:* ${customerName}\n`;
        if (customerPhone) summary += `📞 *Tel:* ${customerPhone}\n`;

        summary += `\n🛒 *Itens:*\n`;
        cart.forEach(item => {
            summary += `${item.quantity}x ${item.product.name} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price * item.quantity)}\n`;
        });

        if (orderType === 'DELIVERY') {
            summary += `\n🚚 *Entrega:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deliveryFee)}\n`;
            summary += `📍 *Endereço:* ${addressStreet}, ${addressNumber} - ${addressDistrict}\n`;
        }

        summary += `\n💰 *TOTAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}*`;

        if (observation) summary += `\n\n📝 *Obs:* ${observation}`;

        navigator.clipboard.writeText(summary);
        showAlert({ title: "Copiado!", message: "Resumo copiado para a área de transferência." });
    };

    // Change Calculation
    const amountPaidIdx = Number(amountPaidStr.replace(/\D/g, '')) / 100;
    const changeAmount = paymentMethod === 'CASH' && amountPaidIdx > total ? amountPaidIdx - total : 0;

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        if (!paymentMethod) {
            showAlert({ title: 'Atenção', message: 'Selecione a forma de pagamento.' });
            return;
        }

        setProcessing(true);
        try {
            // Get user ID for store_id
            const mbClient = cloud.getClient();
            if (!mbClient) throw new Error("Client not ready");

            const { data: { user } } = await mbClient.auth.getUser();
            if (!user) throw new Error("User not found");

            const order = await cloud.createOrder({
                items: cart.map(i => ({
                    product_id: i.product.id.startsWith('custom_') ? 'custom' : i.product.id, // Envia 'custom' ou null se o backend aceitar, mas 'custom' é mais seguro para lógica de string
                    name: i.product.name,
                    quantity: i.quantity,
                    price: i.product.price
                })),
                total_price: total,
                payment_method: paymentMethod,
                shipping_address: orderType === 'DELIVERY' ? {
                    street: addressStreet,
                    number: addressNumber,
                    district: addressDistrict,
                    city: addressCity,
                    zip: addressZip,
                    latitude: latitude,
                    longitude: longitude,
                    is_location_delivery: isLocationOnly
                } : {},
                shipping_cost: deliveryFee,
                discount: 0,
                store_id: user.id,
                customer_name: orderType === 'LOCAL' ? 'Consumo Local' : customerName,
                customer_phone: customerPhone,
                observation: observation,
                origin: 'INTERNAL',
                amount_paid: paymentMethod === 'CASH' ? amountPaidIdx : undefined,
                change_amount: changeAmount,
                custom_payment_label: paymentMethod === 'OTHER' ? customPaymentLabel : undefined,
                order_type: orderType,
                delivery_mode: orderType === 'DELIVERY' ? (deliveryMode || undefined) : undefined
            });

            setLastOrder(order);
            setShowPrintPreview(true);

            // Clear cart
            setCart([]);
            setPaymentTiming('ON_DELIVERY'); // Reset timing
            if (orderType === 'LOCAL') {
                setCustomerName('');
                setCustomerPhone('');
            }
            // Keep customer info for Pickup/Delivery might be useful? User asked to hide for local.
            // Let's clear everything for a fresh order.
            setCustomerName('');
            setCustomerPhone('');
            setAddressZip('');
            setAddressStreet('');
            setAddressNumber('');
            setAddressDistrict('');
            setAddressCity('');
            setDeliveryFeeStr('');
            setObservation('');
            setPaymentMethod('');
            setAmountPaidStr('');
            setCustomPaymentLabel('');

        } catch (error) {
            console.error('Checkout error:', error);
            showAlert({ title: 'Erro', message: 'Erro ao finalizar pedido.' });
        } finally {
            setProcessing(false);
        }
    };

    const handleCloseTable = async (tableOrder: any) => {
        const result = await confirm({
            title: 'Encerrar Mesa',
            message: `Deseja encerrar a mesa "${tableOrder.table_identifier}"? Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tableOrder.total_amount)}`,
            confirmButtonText: 'Encerrar e Finalizar'
        });

        if (!result) return;

        try {
            await cloud.closeCollaboratorOrder(tableOrder.id);
            await loadActiveTables();
            showAlert({ title: 'Sucesso', message: 'Mesa encerrada com sucesso!' });
        } catch {
            showAlert({ title: 'Erro', message: 'Falha ao encerrar mesa.' });
        }
    };

    const handleShare = () => {
        if (!lastOrder) return;
        const text = `*Pedido #${lastOrder.id.substring(0, 4)}*\n` +
            `----------------\n` +
            `Cliente: ${lastOrder.customer_name || 'Balcão'}\n` +
            `----------------\n` +
            lastOrder.items.map(i => `${i.quantity}x ${i.name}`).join('\n') + '\n' +
            `----------------\n` +
            `*TOTAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lastOrder.total_price)}*`;

        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleShareCurrentCart = () => {
        if (cart.length === 0) {
            showAlert({ title: "Carrinho Vazio", message: "Adicione itens antes de compartilhar." });
            return;
        }

        let summary = `*NOVO PEDIDO (Em Aprovação)*\n\n`;
        if (customerName) summary += `👤 *Cliente:* ${customerName}\n`;

        summary += `\n🛒 *Itens:*\n`;
        cart.forEach(item => {
            summary += `${item.quantity}x ${item.product.name} - ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price * item.quantity)}\n`;
        });

        if (orderType === 'DELIVERY') {
            summary += `\n🚚 *Taxa de Entrega:* ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deliveryFee)}\n`;
            if (addressStreet) {
                summary += `📍 *Endereço:* ${addressStreet}, ${addressNumber} - ${addressDistrict}\n`;
            }
        }

        const currentTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) + deliveryFee;
        summary += `\n💰 *TOTAL: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentTotal)}*`;

        if (observation) summary += `\n\n📝 *Obs:* ${observation}`;

        summary += `\n\n*Aguardando aprovação para finalizar.*`;

        const phone = customerPhone.replace(/\D/g, '');
        // Se tiver telefone do cliente, usa, senão abre sem número
        const url = phone
            ? `https://wa.me/55${phone}?text=${encodeURIComponent(summary)}`
            : `https://wa.me/?text=${encodeURIComponent(summary)}`;

        window.open(url, '_blank');
    };

    const handleDuplicate = (order: Order) => {
        const newCart: { product: StoreProduct, quantity: number }[] = [];
        let missingProducts = 0;

        order.items.forEach(item => {
            const prod = products.find(p => p.id === item.product_id);
            if (prod) {
                newCart.push({ product: prod, quantity: item.quantity });
            } else {
                missingProducts++;
            }
        });

        if (newCart.length === 0) {
            showAlert({ title: 'Erro', message: 'Nenhum produto deste pedido está mais disponível no catálogo.' });
            return;
        }

        if (missingProducts > 0) {
            showAlert({ title: 'Aviso', message: `${missingProducts} produtos não foram encontrados e foram removidos do carrinho.` });
        }

        setCart(newCart);
        setCustomerName(order.customer_name || '');
        setCustomerPhone(order.customer_phone || '');
        setObservation(order.observation || '');
        setView('NEW_ORDER');
    };

    // Validação de perfil - redirecionar para configurações se perfil incompleto
    if (profileValid === false) {
        console.log('[InternalOrders] Exibindo alerta - campos faltantes:', missingFields);
        return (
            <ProfileValidationAlert
                onNavigateToSettings={() => window.location.href = '/loja/configuracoes'}
                missingFields={missingFields}
            />
        );
    }

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col animate-in fade-in">

            {/* Header Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setView('NEW_ORDER')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${view === 'NEW_ORDER' ? 'bg-brand-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}
                >
                    <Plus className="w-4 h-4" />
                    Novo Pedido
                </button>
                <button
                    onClick={() => setView('TABLES')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${view === 'TABLES' ? 'bg-brand-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}
                >
                    <LayoutList className="w-4 h-4" />
                    Mesas Ativas
                </button>
                <button
                    onClick={() => setView('HISTORY')}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 ${view === 'HISTORY' ? 'bg-brand-600 text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}
                >
                    <HistoryIcon className="w-4 h-4" />
                    Histórico
                </button>
            </div>

            {view === 'NEW_ORDER' ? (
                <div className="flex flex-col lg:flex-row flex-1 gap-4 overflow-hidden">
                    {/* Left: Catalog */}
                    <div className="w-full lg:w-150  bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold dark:text-white">Catálogo</h2>
                                <p className="text-gray-500 text-sm">Selecione os produtos</p>
                            </div>
                            <div>
                                <div>
                                    <Button onClick={openNewProductModal} size="sm" className="mr-2">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Produto
                                    </Button>
                                    <Button onClick={openCustomProductModal} size="sm" variant="secondary">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Avulso
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar produto..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
                            ) : filteredProducts.length === 0 ? (
                                <div className="text-center py-20 text-gray-400">
                                    <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <p>Nenhum produto encontrado.</p>
                                    <Button variant="outline" className="mt-4" onClick={openNewProductModal}>Cadastrar Primeiro Produto</Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {filteredProducts.map(product => (
                                        <div
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            className="relative flex flex-col text-left bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl hover:bg-brand-50 dark:hover:bg-gray-700 border border-transparent hover:border-brand-200 transition-all group cursor-pointer"
                                        >
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button
                                                    onClick={(e) => openEditProductModal(product, e)}
                                                    className="p-1.5 bg-white dark:bg-gray-800 text-gray-600 hover:text-brand-600 rounded-lg shadow-sm"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDeleteProduct(product.id, e)}
                                                    className="p-1.5 bg-white dark:bg-gray-800 text-gray-600 hover:text-red-500 rounded-lg shadow-sm"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="h-24 w-full bg-white dark:bg-gray-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                                                {product.image_url ? (
                                                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <ShoppingBag className="w-8 h-8 text-gray-300" />
                                                )}
                                            </div>
                                            <h3 className="font-bold text-gray-900 dark:text-white line-clamp-2 text-sm mb-1">{product.name}</h3>
                                            <p className="text-brand-600 font-bold">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Order Ticket */}
                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full lg:h-auto overflow-hidden">
                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-0">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                                <h2 className="text-xl font-bold dark:text-white">Comanda</h2>
                                <span className="text-sm font-mono text-gray-400">#{Math.floor(Math.random() * 1000).toString().padStart(4, '0')}</span>
                            </div>

                            <div className="space-y-4 mb-4">
                                {/* Order Type Selector */}
                                <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl mb-4">
                                    <button
                                        onClick={() => setOrderType('LOCAL')}
                                        className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${orderType === 'LOCAL' ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                    >
                                        <Store className="w-4 h-4 mb-1" />
                                        Local
                                    </button>
                                    <button
                                        onClick={() => setOrderType('PICKUP')}
                                        className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${orderType === 'PICKUP' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                    >
                                        <ShoppingBag className="w-4 h-4 mb-1" />
                                        Retirada
                                    </button>
                                    <button
                                        onClick={() => setOrderType('DELIVERY')}
                                        className={`flex flex-col items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${orderType === 'DELIVERY' ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                    >
                                        <Bike className="w-4 h-4 mb-1" />
                                        Entrega
                                    </button>
                                </div>

                                {orderType !== 'LOCAL' && (
                                    <div className="flex gap-2 animate-in slide-in-from-top-2">
                                        <div className="flex-1">
                                            <CustomInput
                                                label="Nome do Cliente"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                                placeholder="Nome"
                                                autoComplete="name"
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <CustomInput
                                                label="Telefone"
                                                value={customerPhone}
                                                onChange={(e) => setCustomerPhone(e.target.value)}
                                                placeholder="(00) ..."
                                                mask="phone"
                                                autoComplete="tel"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Formulário de endereço - apenas para DELIVERY */}
                                {orderType === 'DELIVERY' && (
                                    <div className="space-y-4">
                                        {/* Seletor de Modo de Entrega - SEMPRE VISÍVEL NO TOPO */}
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3">
                                            <div className="text-center space-y-2">
                                                <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                                                    💡 Escolha o Modo de Entrega
                                                </p>
                                                <p className="text-xs text-blue-700 dark:text-blue-400">
                                                    Selecione como deseja realizar a entrega:
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <button
                                                    onClick={() => {
                                                        setDeliveryMode('PLATFORM');
                                                        setDeliveryFeeStr('0,00');
                                                        setPlatformFeeDetails(null);
                                                    }}
                                                    className={`p-3 bg-white dark:bg-gray-800 rounded-xl border-2 transition-all text-left ${deliveryMode === 'PLATFORM'
                                                        ? 'border-green-500 ring-2 ring-green-200 dark:ring-green-800'
                                                        : 'border-green-200 dark:border-green-800 hover:border-green-400'
                                                        }`}
                                                >
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                                        Parceiro Zé {deliveryMode === 'PLATFORM' && '✓'}
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        Entregador da plataforma
                                                    </p>
                                                </button>

                                                <button
                                                    onClick={() => setDeliveryMode('OWN')}
                                                    className={`p-3 bg-white dark:bg-gray-800 rounded-xl border-2 transition-all text-left ${deliveryMode === 'OWN'
                                                        ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                                                        : 'border-blue-200 dark:border-blue-800 hover:border-blue-400'
                                                        }`}
                                                >
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                                        Entrega Própria {deliveryMode === 'OWN' && '✓'}
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        Eu mesmo envio o entregador
                                                    </p>
                                                </button>

                                                <button
                                                    onClick={() => setDeliveryMode('ASSOCIATE')}
                                                    className={`p-3 bg-white dark:bg-gray-800 rounded-xl border-2 transition-all text-left ${deliveryMode === 'ASSOCIATE'
                                                        ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800'
                                                        : 'border-purple-200 dark:border-purple-800 hover:border-purple-400'
                                                        }`}
                                                >
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                                                        Entregador Fixo {deliveryMode === 'ASSOCIATE' && '✓'}
                                                    </p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        Entregador associado à loja
                                                    </p>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Detalhes do Endereço e Taxa - Só aparece se um modo for selecionado */}
                                        {deliveryMode && (
                                            <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30 space-y-3 animate-in fade-in slide-in-from-top-2">

                                                {/* Seletor de Tipo de Cobrança (Apenas para OWN/ASSOCIATE) */}
                                                {(deliveryMode === 'OWN' || deliveryMode === 'ASSOCIATE') && neighborhoodFees.length > 0 && (
                                                    <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg border border-orange-200 dark:border-orange-800/50">
                                                        <label className="text-[10px] uppercase font-bold text-gray-500 mb-2 block">Tipo de Cobrança</label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setCalculationMode('FIXED')}
                                                                className={`flex-1 py-1 px-2 rounded-md text-xs font-bold transition-all ${calculationMode === 'FIXED'
                                                                    ? 'bg-orange-500 text-white shadow-sm'
                                                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}`}
                                                            >
                                                                Taxa Fixa
                                                            </button>
                                                            <button
                                                                onClick={() => setCalculationMode('NEIGHBORHOOD')}
                                                                className={`flex-1 py-1 px-2 rounded-md text-xs font-bold transition-all ${calculationMode === 'NEIGHBORHOOD'
                                                                    ? 'bg-orange-500 text-white shadow-sm'
                                                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'}`}
                                                            >
                                                                Por Bairro
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Toggle Modo Localização */}
                                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`p-1.5 rounded-lg ${isLocationOnly ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'} transition-colors`}>
                                                            <MapPin className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">Entregar por Localização</p>
                                                            <p className="text-[10px] text-gray-500">Usa link do Maps em vez de endereço</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setIsLocationOnly(!isLocationOnly)}
                                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${isLocationOnly ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isLocationOnly ? 'translate-x-5' : 'translate-x-1'}`}
                                                        />
                                                    </button>
                                                </div>

                                                {/* Campo de Link/Coordenadas (Apenas se o toggle estiver ativo) */}
                                                {isLocationOnly && (
                                                    <div>
                                                        <CustomInput
                                                            label="Link do Google Maps ou Coordenadas"
                                                            value={locationInput}
                                                            onChange={(e) => setLocationInput(e.target.value)}
                                                            placeholder="Cole aqui o link ou coordenada..."
                                                            autoComplete="off"
                                                        />
                                                        <button
                                                            onClick={() => setIsHelpModalOpen(true)}
                                                            className="text-[10px] text-blue-500 hover:text-blue-700 underline mt-1 flex items-center gap-1"
                                                        >
                                                            <HelpCircle className="w-3 h-3" />
                                                            Como usar essa função?
                                                        </button>
                                                    </div>
                                                )}
                                                {latitude && longitude && (
                                                    <div className="flex items-center gap-1 mt-1 text-[10px] font-bold text-green-600 dark:text-green-400 animate-pulse">
                                                        <CheckCircle className="w-3 h-3" />
                                                        📍 Coordenadas capturadas com sucesso!
                                                    </div>
                                                )}

                                                {/* Campos de Endereço */}
                                                <div className="space-y-4">
                                                    {/* Rua e Número (Ocultos se GPS estiver ativo) */}
                                                    {!isLocationOnly && (
                                                        <div className="flex gap-2">
                                                            <div className="flex-[3]">
                                                                <StreetAutocomplete
                                                                    label="Rua"
                                                                    city={storeCity}
                                                                    value={addressStreet}
                                                                    onChange={setAddressStreet}
                                                                    placeholder="Nome da Rua"
                                                                    disabled={isLocationOnly}
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <CustomInput
                                                                    label="Número"
                                                                    value={addressNumber}
                                                                    onChange={(e) => setAddressNumber(e.target.value)}
                                                                    placeholder="Nº"
                                                                    disabled={isLocationOnly}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Bairro e Cidade (Ocultos no modo GPS) */}
                                                    {!isLocationOnly && (
                                                        <div className="flex gap-2">
                                                            <div className="flex-1">
                                                                {calculationMode === 'NEIGHBORHOOD' && deliveryMode !== 'PLATFORM' ? (
                                                                    <DistrictSearchSelect
                                                                        label="Bairro"
                                                                        value={addressDistrict}
                                                                        neighborhoods={neighborhoodFees}
                                                                        onSelect={(n) => setAddressDistrict(n.neighborhood_name)}
                                                                        placeholder="Filtrar bairro..."
                                                                        disabled={isLocationOnly}
                                                                    />
                                                                ) : (
                                                                    <CustomInput
                                                                        label="Bairro"
                                                                        value={addressDistrict}
                                                                        onChange={(e) => setAddressDistrict(e.target.value)}
                                                                        placeholder="Bairro"
                                                                        autoComplete="address-level3"
                                                                        disabled={isLocationOnly}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="flex-1">
                                                                <CustomInput
                                                                    label="Cidade"
                                                                    value={addressCity}
                                                                    onChange={(e) => setAddressCity(e.target.value)}
                                                                    placeholder="Cidade"
                                                                    disabled={true}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-end gap-2">
                                                    <div className="flex-1">
                                                        <CustomInput
                                                            label="Taxa de Entrega (R$)"
                                                            value={deliveryFeeStr}
                                                            onChange={(e) => setDeliveryFeeStr(e.target.value)}
                                                            placeholder={deliveryMode === 'PLATFORM' ? "Clique em Calcular" : "0,00"}
                                                            mask="currency"
                                                            disabled={deliveryMode === 'PLATFORM' ? true : !isDeliveryFeeEditable}
                                                        />
                                                        {calculatedDistance !== null && (
                                                            <div className="mt-1 flex flex-col gap-0.5">
                                                                <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                                                    <Bike className="w-3 h-3" />
                                                                    📏 Distância: {calculatedDistance} km
                                                                </div>
                                                                <p className="text-[8px] text-gray-400 dark:text-gray-500 italic">
                                                                    * Calculado por {isRealRoute ? 'Ruas' : 'GPS (Linha Reta)'}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {(deliveryMode === 'PLATFORM' || isLocationOnly) && (
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={handleDeliveryCalculation}
                                                            disabled={processing || (!locationInput && (!addressStreet || !addressNumber || !addressDistrict))}
                                                            className="h-[46px] px-4"
                                                            title={deliveryMode === 'PLATFORM' ? "Calcular Taxa Parceiro" : "Calcular Distância"}
                                                        >
                                                            {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                                                deliveryMode === 'PLATFORM' ? 'Calcular' : 'Calcular'
                                                            )}
                                                        </Button>
                                                    )}
                                                    {deliveryMode !== 'PLATFORM' && !isLocationOnly && !isDeliveryFeeEditable && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => setIsDeliveryFeeEditable(true)}
                                                            className="h-[46px] px-3"
                                                            title="Editar Taxa Manualmente"
                                                        >
                                                            Editar
                                                        </Button>
                                                    )}
                                                </div>

                                                {/* Detalhamento da Taxa (Apenas Parceiro Zé após cálculo) */}
                                                {deliveryMode === 'PLATFORM' && platformFeeDetails && (
                                                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 text-[10px] text-blue-800 dark:text-blue-200">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span>Base (até {platformFeeDetails.baseKm}km):</span>
                                                            <span className="font-bold">
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(platformFeeDetails.baseValue)}
                                                            </span>
                                                        </div>
                                                        {platformFeeDetails.additionalKm > 0 && (
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span>Adicional ({platformFeeDetails.additionalKm.toFixed(1)}km):</span>
                                                                <span className="font-bold">
                                                                    + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(platformFeeDetails.additionalValue)}
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="border-t border-blue-200 dark:border-blue-700 mt-1 pt-1 flex justify-between items-center font-bold">
                                                            <span>Total:</span>
                                                            <span>
                                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(platformFeeDetails.baseValue + platformFeeDetails.additionalValue)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Botão Somar Tudo (Prévia) */}
                                {cart.length > 0 && (
                                    <div className="flex justify-end">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleCopySummary}
                                            className="text-xs"
                                        >
                                            <Calculator className="w-3 h-3 mr-1" />
                                            Copiar Resumo
                                        </Button>

                                        {(orderType === 'PICKUP' || orderType === 'DELIVERY') && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleShareCurrentCart}
                                                className="text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 ml-2"
                                            >
                                                <Share2 className="w-3 h-3 mr-1" />
                                                Enviar p/ Aprovação
                                            </Button>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Observação</label>
                                    <textarea
                                        className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm resize-none dark:text-white"
                                        rows={2}
                                        placeholder="Ex: Sem cebola..."
                                        value={observation}
                                        onChange={e => setObservation(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Cart Items */}
                            <div className="space-y-3 mb-6 min-h-[100px]">
                                {cart.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 text-sm">
                                        <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50 text-gray-300" />
                                        <p>Carrinho vazio</p>
                                    </div>
                                ) : cart.map((item, index) => (
                                    <div key={index} className="flex justify-between items-start group">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm dark:text-gray-200">{item.product.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                                <button onClick={() => item.quantity > 1 ? updateQuantity(item.product.id, -1) : removeFromCart(item.product.id)} className="p-1 hover:text-red-500">
                                                    <Minus className="w-3 h-3" />
                                                </button>
                                                <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:text-green-500">
                                                    <Plus className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <span className="text-sm font-bold w-16 text-right">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price * item.quantity)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Payment Selection */}
                            <div className="mb-6 space-y-3 pb-6">
                                <div className="flex justify-between items-end">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">Forma de Pagamento</label>
                                    {paymentMethod && (
                                        <button
                                            onClick={() => setPaymentMethod('')}
                                            className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                            Trocar
                                        </button>
                                    )}
                                </div>

                                {/* Payment Timing Logic for Delivery/Pickup */}
                                {orderType !== 'LOCAL' && (
                                    <div className="flex gap-2 mb-4 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl">
                                        <button
                                            onClick={() => { setPaymentTiming('ONLINE'); setPaymentMethod(''); }}
                                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${paymentTiming === 'ONLINE' ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm ring-1 ring-brand-200' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Pagamento Online (Já Pago)
                                        </button>
                                        <button
                                            onClick={() => { setPaymentTiming('ON_DELIVERY'); setPaymentMethod(''); }}
                                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${paymentTiming === 'ON_DELIVERY' ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-sm ring-1 ring-orange-200' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                        >
                                            <Banknote className="w-4 h-4" />
                                            Pagar na Entrega/Retirada
                                        </button>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { id: 'CASH', label: 'Dinheiro', icon: Banknote, color: 'emerald', show: paymentTiming === 'ON_DELIVERY' || orderType === 'LOCAL' },
                                        { id: 'PIX', label: paymentTiming === 'ONLINE' ? 'Pix (Já Pago)' : 'Pix (Maquininha)', icon: CheckCircle, color: 'cyan', show: true },
                                        { id: 'CREDIT_CARD', label: paymentTiming === 'ONLINE' ? 'Crédito (Já Pago)' : 'Cartão de Crédito (Maquininha)', icon: CreditCard, color: 'brand', show: true },
                                        { id: 'DEBIT_CARD', label: paymentTiming === 'ONLINE' ? 'Débito (Já Pago)' : 'Cartão de Débito (Maquininha)', icon: CreditCard, color: 'blue', show: true },
                                        { id: 'OTHER', label: 'Outras Formas', icon: HelpCircle, color: 'gray', show: true },
                                    ].filter(m => m.show && (!paymentMethod || paymentMethod === m.id)).map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                                            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${paymentMethod === method.id
                                                ? `bg-${method.color}-50 border-${method.color}-500 text-${method.color}-700 dark:bg-${method.color}-900/10 dark:border-${method.color}-500 dark:text-${method.color}-400`
                                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-brand-200 dark:hover:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${paymentMethod === method.id ? `bg-${method.color}-100 dark:bg-${method.color}-500/20` : 'bg-gray-100 dark:bg-gray-800'}`}>
                                                    <method.icon className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold text-left">{method.label}</span>
                                            </div>
                                            {paymentMethod === method.id && (
                                                <div className={`w-6 h-6 rounded-full bg-${method.color}-500 flex items-center justify-center text-white scale-in-center`}>
                                                    <CheckCircle className="w-4 h-4" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {paymentMethod === 'CASH' && (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 animate-in slide-in-from-top-2 duration-300">
                                        <CustomInput
                                            label="Quanto o cliente entregou?"
                                            mask="currency"
                                            value={amountPaidStr}
                                            onChange={(e) => setAmountPaidStr(e.target.value)}
                                            placeholder="R$ 0,00"
                                            className="bg-white dark:bg-gray-800 text-lg font-bold"
                                        />
                                        {changeAmount > 0 && (
                                            <div className="mt-3 flex justify-between items-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                                                <span className="text-gray-500 font-medium">Troco a devolver:</span>
                                                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(changeAmount)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {paymentMethod === 'OTHER' && (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <CustomInput
                                            label="Especifique a forma de pagamento"
                                            value={customPaymentLabel}
                                            onChange={(e) => setCustomPaymentLabel(e.target.value)}
                                            placeholder="Ex: Vale Refeição, Pix Terceiros..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Fixed Footer: Totals */}
                        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">Total do Pedido</span>
                                <span className="text-3xl font-black text-gray-900 dark:text-white">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                                </span>
                            </div>

                            <Button
                                className="w-full py-7 text-xl font-black rounded-2xl shadow-lg shadow-brand-500/20"
                                disabled={cart.length === 0 || processing}
                                onClick={handleCheckout}
                            >
                                {processing ? (
                                    <Loader2 className="w-6 h-6 animate-spin mr-3" />
                                ) : (
                                    <Printer className="w-6 h-6 mr-3" />
                                )}
                                FINALIZAR PEDIDO
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden">
                    {view === 'TABLES' ? (
                        <div className="h-full bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold dark:text-white uppercase tracking-tight">Mesas no Salão</h2>
                                    <p className="text-gray-500 text-sm">Controle de comandas abertas pelos garçons</p>
                                </div>
                                <div className="bg-brand-50 dark:bg-brand-900/20 px-4 py-2 rounded-xl border border-brand-100">
                                    <p className="text-[10px] font-black text-brand-600 uppercase">Mesas Ativas</p>
                                    <p className="text-xl font-black text-brand-600">{activeTables.length}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {loading ? (
                                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
                                ) : activeTables.length === 0 ? (
                                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                                        <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <Coffee className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="text-gray-400 font-bold italic">Nenhuma mesa aberta no salão no momento.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                                        {activeTables.map(table => (
                                            <div key={table.id} className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[32px] border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="bg-brand-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">{table.table_identifier}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold">
                                                                <Clock className="w-3 h-3 inline mr-1" />
                                                                {new Date(table.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-black text-gray-800 dark:text-white uppercase tracking-tight truncate max-w-[150px]">{table.customer_name || 'Mesa Sem Nome'}</h3>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Total Acumulado</p>
                                                        <p className="text-xl font-black text-brand-600 italic">R$ {table.total_amount?.toFixed(2)}</p>
                                                    </div>
                                                </div>

                                                <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-3 mb-4 max-h-32 overflow-y-auto text-xs space-y-2 border border-black/5">
                                                    {table.items?.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between">
                                                            <span className="text-gray-500 font-bold">{item.quantity}x <span className="text-gray-800 dark:text-gray-200">{item.name}</span></span>
                                                            <span className="font-bold">R$ {item.total_price.toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button fullWidth variant="secondary" onClick={() => {
                                                        const order = { ...table, created_at: table.created_at || new Date().toISOString() };
                                                        setLastOrder(order);
                                                        setShowPrintPreview(true);
                                                    }} className="rounded-2xl text-xs py-3">Conferir</Button>
                                                    <Button fullWidth onClick={() => handleCloseTable(table)} className="rounded-2xl text-xs py-3 bg-green-600 hover:bg-green-700">Finalizar</Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full overflow-hidden">
                            {/* History View */}
                            <h2 className="text-2xl font-bold dark:text-white mb-6">Histórico de Pedidos Internos</h2>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {loadingHistory ? (
                                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
                                ) : historyOrders.length === 0 ? (
                                    <div className="text-center py-20 text-gray-400">
                                        <HistoryIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>Nenhum pedido encontrado.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="text-gray-500 font-bold text-xs bg-gray-50 dark:bg-gray-900">
                                            <tr>
                                                <th className="p-3 rounded-l-xl">Data</th>
                                                <th className="p-3">Cliente</th>
                                                <th className="p-3">Itens</th>
                                                <th className="p-3">Total</th>
                                                <th className="p-3">Pagamento</th>
                                                <th className="p-3 rounded-r-xl text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {historyOrders.map(order => (
                                                <tr key={order.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="p-3 dark:text-gray-300">
                                                        {new Date(order.created_at).toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString().slice(0, 5)}</span>
                                                    </td>
                                                    <td className="p-3 dark:text-white font-bold">{order.customer_name || '-'}</td>
                                                    <td className="p-3 dark:text-gray-300">
                                                        {order.items.length} itens
                                                    </td>
                                                    <td className="p-3 font-bold dark:text-white">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_price)}
                                                    </td>
                                                    <td className="p-3 dark:text-gray-300 text-xs">
                                                        {order.payment_method === 'CREDIT_CARD' ? 'Crédito' :
                                                            order.payment_method === 'DEBIT_CARD' ? 'Débito' :
                                                                order.payment_method === 'PIX' ? 'Pix' :
                                                                    order.payment_method === 'CASH' ? 'Dinheiro' : 'Outro'}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                onClick={() => { setLastOrder(order); setShowPrintPreview(true); }}
                                                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300"
                                                                title="Visualizar/Imprimir"
                                                            >
                                                                <Printer className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDuplicate(order)}
                                                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-600 dark:text-gray-300"
                                                                title="Duplicar Pedido"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )
            }

            {/* Custom Product Modal */}
            {
                isCustomProductModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-8 shadow-2xl space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-black text-xl dark:text-white">Adicionar Avulso</h3>
                                <button onClick={() => setIsCustomProductModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="space-y-4">
                                <CustomInput
                                    label="Nome do Produto"
                                    placeholder="Ex: Bebida Extra"
                                    value={customProduct.name}
                                    onChange={e => setCustomProduct({ ...customProduct, name: e.target.value })}
                                />
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <CustomInput
                                            label="Preço (R$)"
                                            placeholder="0,00"
                                            mask="currency"
                                            value={customProduct.price}
                                            onChange={e => setCustomProduct({ ...customProduct, price: e.target.value })}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-xs font-bold text-gray-500 mb-1 block">Qtd</label>
                                        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-2 h-[52px]">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full bg-transparent border-none text-center font-bold outline-none"
                                                value={customProduct.quantity}
                                                onChange={e => setCustomProduct({ ...customProduct, quantity: parseInt(e.target.value) || 1 })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button fullWidth onClick={handleAddCustomProduct} className="py-4 shadow-lg shadow-brand-500/20">
                                Adicionar à Comanda
                            </Button>
                        </div>
                    </div>
                )
            }

            {/* Product Modal - Keep here for adding new products */}
            <ProductModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                product={editingProduct}

                onSave={handleSaveProduct}
                isSaving={isSavingProduct}
            />

            <LocationHelpModal
                isOpen={isHelpModalOpen}
                onClose={() => setIsHelpModalOpen(false)}
            />

            {/* Print Preview Modal */}
            {
                showPrintPreview && lastOrder && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                        {/* Simplified Content, usually PrintTicket component */}
                        <div className="bg-white p-6 rounded-lg w-full max-w-sm max-h-[90vh] overflow-y-auto">
                            <h3 className="font-bold text-center mb-4">Pedido #{lastOrder.id.slice(0, 4)}</h3>
                            <div className="space-y-2 mb-4">
                                {lastOrder.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span>{item.quantity}x {item.name}</span>
                                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="border-t pt-2 font-bold flex justify-between">
                                <span>Total</span>
                                <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lastOrder.total_price)}</span>
                            </div>
                            <div className="flex gap-2 mt-6 no-print">
                                <Button fullWidth variant="secondary" onClick={() => setShowPrintPreview(false)}>Fechar</Button>
                                <Button fullWidth onClick={handleShare} className="bg-green-600 hover:bg-green-700">Compartilhar</Button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
