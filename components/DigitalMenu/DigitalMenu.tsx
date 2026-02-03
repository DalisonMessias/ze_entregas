import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Clock, Bike, Store as StoreIcon, MapPin, Search, ShoppingBag, ArrowRight, Loader2, AlertCircle, Trash2, ShoppingCart, Star, QrCode, CreditCard, Banknote, ShieldCheck, Instagram, Facebook, Globe, MessageSquare, ChevronRight, Play, ExternalLink, Calendar, Map, ClipboardList, TrendingUp, DollarSign, Wallet, RefreshCw, X, ChevronUp, Copy, Check, Minus, Plus, ChevronLeft, MessageCircle, Zap, ChefHat } from 'lucide-react';
import * as cloud from '../../services/cloud';
import { PartnerProfile, StoreProduct, StoreDeliverySettings, StoreNeighborhoodFee, StoreShippingRule } from '../../types';
import { Logo } from '../Logo';
import { Button } from '../Button';
import { CustomInput } from '../CustomInput';
import { StreetSearchSelect } from '../StreetSearchSelect';
import { CitySearchSelect } from '../CitySearchSelect';
import { useDialog } from '../../utils/dialogService';
import { StoreRatingModal } from './StoreRatingModal';
import { PixPaymentModal } from '../PixPaymentModal';
import { ShippingRulesModal } from './ShippingRulesModal';
import { AuthRequiredModal } from './AuthRequiredModal';

interface DigitalMenuProps {
    citySlug: string;
    storeSlug: string;
}

interface CartItem {
    id: string; // unique ID for cart item
    product: StoreProduct;
    quantity: number;
    observation?: string;
}

export const DigitalMenu: React.FC<DigitalMenuProps> = ({ citySlug, storeSlug }) => {
    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<PartnerProfile | null>(null);
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [deliverySettings, setDeliverySettings] = useState<StoreDeliverySettings | null>(null);
    const [fees, setFees] = useState<StoreNeighborhoodFee[]>([]);
    const [shippingRules, setShippingRules] = useState<StoreShippingRule[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartRestored, setCartRestored] = useState(false);

    // Product Modal State
    const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
    const [productQuantity, setProductQuantity] = useState(1);
    const [productObservation, setProductObservation] = useState('');
    const [orderObservation, setOrderObservation] = useState('');

    // Checkout State
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');

    // Address Fields
    const [cep, setCep] = useState('');
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const [addressStreet, setAddressStreet] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressComplement, setAddressComplement] = useState('');
    const [addressReference, setAddressReference] = useState('');
    const [addressNeighborhood, setAddressNeighborhood] = useState(''); // Text fallback
    const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState(''); // For fees
    const [selectedCity, setSelectedCity] = useState<any>(null); // from CitySearchSelect

    // Search & Filter State
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    const [paymentMethod, setPaymentMethod] = useState('PIX');
    const [changeFor, setChangeFor] = useState('');
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
    const [checkoutTotal, setCheckoutTotal] = useState(0);
    const [recentOrders, setRecentOrders] = useState<string[]>([]);
    const [isRecentOrdersModalOpen, setIsRecentOrdersModalOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const { alert, confirm } = useDialog();

    useEffect(() => {
        loadStoreData();
    }, [citySlug, storeSlug]);

    const loadStoreData = async () => {
        setLoading(true);
        try {
            const storeData = await cloud.getStoreBySlug(citySlug, storeSlug);
            if (!storeData) {
                setError('Loja não encontrada.');
                setLoading(false);
                return;
            }
            setStore(storeData);

            const [prods, settingsData, feesData, rulesData] = await Promise.all([
                cloud.getPublicStoreProducts(storeData.id),
                cloud.getPublicDeliverySettings(storeData.id),
                cloud.getPublicNeighborhoodFees(storeData.id),
                cloud.getPublicShippingRules(storeData.id)
            ]);

            setProducts(prods);
            setDeliverySettings(settingsData);
            setFees(feesData);
            setShippingRules(rulesData);

            // Initialize selectedCity with store city
            if (storeData.store_address_city || storeData.city) {
                setSelectedCity({
                    name: storeData.store_address_city || storeData.city,
                    state: storeData.store_address_state || storeData.address_state || 'UF',
                    id: 'store-auto'
                });
            }

            // Set default delivery type based on settings - ENHANCED LOGIC
            if (settingsData) {
                const canDeliver = settingsData.is_own_delivery_enabled || settingsData.is_partner_delivery_enabled;
                const canPickup = settingsData.is_pickup_enabled;

                if (canDeliver && !canPickup) {
                    setDeliveryType('DELIVERY');
                } else if (!canDeliver && canPickup) {
                    setDeliveryType('PICKUP');
                } else if (canDeliver && canPickup) {
                    setDeliveryType('DELIVERY');
                }
            }

        } catch (err) {
            console.error(err);
            setError('Erro ao carregar cardápio.');
        } finally {
            setLoading(false);
        }
    };

    // --- AUTH CHECK ---
    useEffect(() => {
        const checkAuth = async () => {
            const { user } = await cloud.getUserWithCache();
            if (user) {
                setIsLoggedIn(true);
                // Get name and phone from profile to populate checkout
                const sb = cloud.getClient();
                if (sb) {
                    const { data: profile } = await sb.from('user_profiles')
                        .select('name, phone_number')
                        .eq('id', user.id)
                        .single();
                    if (profile) {
                        if (profile.name) setCustomerName(profile.name);
                        if (profile.phone_number) setCustomerPhone(profile.phone_number);
                    }
                }
            }
        };
        checkAuth();
    }, []);

    // --- CART PERSISTENCE ---
    // Restore cart on store load
    useEffect(() => {
        if (store?.id && !cartRestored) {
            try {
                const saved = localStorage.getItem(`ze_cart_${store.id}`);
                if (saved) {
                    setCart(JSON.parse(saved));
                }
                const savedOrders = localStorage.getItem(`ze_recent_orders_${store.id}`);
                if (savedOrders) {
                    setRecentOrders(JSON.parse(savedOrders));
                }
            } catch (e) {
                console.error("Failed to restore data", e);
            }
            setCartRestored(true);
        }
    }, [store?.id, cartRestored]);

    // --- SYNC DELIVERY TYPE ---
    useEffect(() => {
        if (deliverySettings) {
            const canDeliverAvailable = deliverySettings.is_own_delivery_enabled || deliverySettings.is_partner_delivery_enabled;
            const canPickupAvailable = deliverySettings.is_pickup_enabled;

            if (canDeliverAvailable && !canPickupAvailable && deliveryType !== 'DELIVERY') {
                setDeliveryType('DELIVERY');
            } else if (!canDeliverAvailable && canPickupAvailable && deliveryType !== 'PICKUP') {
                setDeliveryType('PICKUP');
            }
        }
    }, [deliverySettings, deliveryType]);

    // Save cart on change
    useEffect(() => {
        if (store?.id && cartRestored) {
            localStorage.setItem(`ze_cart_${store.id}`, JSON.stringify(cart));
        }
    }, [cart, store?.id, cartRestored]);

    // --- CART LOGIC ---
    const addToCart = (productOverride?: StoreProduct, quantityOverride?: number) => {
        const prod = productOverride || selectedProduct;
        if (!prod) return;

        const qty = quantityOverride || productQuantity;
        const obs = productOverride ? '' : productObservation;

        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.product.id === prod.id && item.observation === obs);

            if (existingItem) {
                return prevCart.map(item =>
                    item.id === existingItem.id
                        ? { ...item, quantity: item.quantity + qty }
                        : item
                );
            } else {
                const newItem: CartItem = {
                    id: crypto.randomUUID(),
                    product: prod,
                    quantity: qty,
                    observation: obs,
                };
                return [...prevCart, newItem];
            }
        });

        if (!productOverride) {
            setSelectedProduct(null);
            setProductQuantity(1);
            setProductObservation('');
        }
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const clearCart = async () => {
        const confirmed = await confirm({
            title: 'Limpar Carrinho',
            message: 'Tem certeza que deseja remover todos os itens do carrinho?',
            confirmButtonText: 'Limpar',
            cancelButtonText: 'Cancelar'
        });
        if (confirmed) {
            setCart([]);
            setIsCartOpen(false);
        }
    };

    const updateQuantity = async (id: string, delta: number) => {
        let newCart = [...cart];
        const itemIndex = newCart.findIndex(item => item.id === id);

        if (itemIndex === -1) return;

        const item = newCart[itemIndex];
        const newQuantity = item.quantity + delta;

        if (newQuantity <= 0) {
            const confirmed = await confirm({
                title: 'Remover Item',
                message: `Deseja remover "${item.product.name}" do carrinho?`,
                confirmButtonText: 'Remover',
                cancelButtonText: 'Cancelar'
            });
            if (confirmed) {
                newCart.splice(itemIndex, 1);
            }
        } else {
            newCart[itemIndex] = { ...item, quantity: newQuantity };
        }

        setCart(newCart);
    };

    const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    const deliveryFee = useMemo(() => {
        if (deliveryType === 'PICKUP') return 0;
        if (!deliverySettings) return 0;

        // Prioridade: Entrega Própria -> Parceira (se implementado)
        if (deliverySettings.is_own_delivery_enabled) {
            // Verificar Regras de Frete (Ex: Frete Grátis acima de X)
            // Aplica-se ao subtotal do carrinho
            const freeShippingRule = shippingRules.find(r => r.rule_type === 'free_above');
            if (freeShippingRule && freeShippingRule.threshold && cartSubtotal >= freeShippingRule.threshold) {
                return 0;
            }

            if (deliverySettings.own_delivery_mode === 'FIXED') return deliverySettings.fixed_fee;
            if (deliverySettings.own_delivery_mode === 'NEIGHBORHOOD') {
                const fee = fees.find(f => f.id === selectedNeighborhoodId);
                return fee ? fee.fee : 0;
            }
        }

        return 0; // Fallback
    }, [deliveryType, deliverySettings, fees, selectedNeighborhoodId]);

    const cartTotal = cartSubtotal + deliveryFee;

    const handleCepChange = async (val: string) => {
        let v = val.replace(/\D/g, '').substring(0, 8);
        if (v.length > 5) v = `${v.substring(0, 5)}-${v.substring(5, 8)}`;
        setCep(v);

        if (v.replace(/\D/g, '').length === 8) {
            setIsLoadingCep(true);
            try {
                const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${v.replace(/\D/g, '')}`);
                if (!res.ok) throw new Error('CEP not found');
                const data = await res.json();

                // NOT autofilling street as requested
                // Autocomplete Neighborhood if text fallback is used
                if (data.neighborhood) setAddressNeighborhood(data.neighborhood);
                if (data.street) setAddressStreet(data.street);

                // City autofill
                if (data.city) {
                    setSelectedCity({ name: data.city, state: data.state, id: 'cep-auto' });
                }

            } catch (e) {
                // console.error(e);
            } finally {
                setIsLoadingCep(false);
            }
        }
    };

    const handleCheckout = async () => {
        if (!isLoggedIn) {
            setIsAuthModalOpen(true);
            return;
        }

        if (!customerName || !customerPhone) {
            alert({ title: 'Atenção', message: 'Por favor, informe seu nome e telefone.' });
            return;
        }

        if (deliveryType === 'DELIVERY') {
            if (!addressStreet || !addressNumber) {
                alert({ title: 'Endereço Incompleto', message: 'Informe a Rua e o Número para entrega.' });
                return;
            }
            if (deliverySettings?.own_delivery_mode === 'NEIGHBORHOOD' && !selectedNeighborhoodId) {
                alert({ title: 'Bairro não selecionado', message: 'Selecione seu bairro para calcular a taxa de entrega.' });
                return;
            }
        }

        const usePlatform = store?.receive_orders_via_platform;
        const useWhatsApp = store?.receive_orders_via_chat;

        // --- LOGICA DE DECISÃO DE FLUXO SIMPLIFICADA (28/01 - v3) ---
        // Prioridade ABSOLUTA para Plataforma se estiver ativada.
        // O usuário relatou conflito quando ambas as opções estão ativas.

        const isPixPayment = paymentMethod === 'PIX';
        const isPlatformEnabled = store?.receive_orders_via_platform;

        // Se a plataforma estiver ativa, o fluxo é SEMPRE plataforma.
        // O PIX Automático define apenas se abre o modal ou não (tratado no sucesso do pedido).
        let flowMode: 'PLATFORM' | 'WHATSAPP' = isPlatformEnabled ? 'PLATFORM' : 'WHATSAPP';

        // Fallback: Se plataforma desligada e whatsapp desligado, força plataforma (segurança)
        if (!isPlatformEnabled && !store?.receive_orders_via_chat) {
            flowMode = 'PLATFORM';
        }

        // PLATFORM CHECKOUT
        if (flowMode === 'PLATFORM') {
            setIsSubmitting(true);
            try {
                // Prepare Address
                const shippingAddress = {
                    street: addressStreet,
                    number: addressNumber,
                    complement: addressComplement,
                    district: addressNeighborhood,
                    city: selectedCity?.name || store?.city,
                    state: selectedCity?.state || store?.address_state,
                    reference: addressReference,
                    zip: cep,
                    neighborhood_id: selectedNeighborhoodId,
                    fee: deliveryFee
                };

                // Prepare Items
                const orderItems = cart.map(item => ({
                    product_id: item.product.id,
                    name: item.product.name,
                    quantity: item.quantity,
                    price: item.product.price,
                    total_price: item.product.price * item.quantity,
                    observation: item.observation,
                    image_url: item.product.image_url
                }));

                // Validar PIX se selecionado
                if (paymentMethod === 'PIX') {
                    // Check pix_key OR legacy config
                    // UNIFIED LOGIC: Check key existence in either new config or legacy field
                    const hasPixKey = !!store?.pix_key || !!store?.config?.pixdata?.enabled || (!!store?.config?.pixdata?.key);

                    if (!hasPixKey) {
                        await alert({
                            title: 'Pagamento Indisponível',
                            message: 'O pagamento via PIX automático não está disponível nesta loja no momento. Por favor, escolha outra forma de pagamento ou combine com a loja pelo WhatsApp.'
                        });
                        setIsSubmitting(false);
                        return;
                    }
                }

                const isPixActive = true; // Se passou da validação acima, consideramos ativo para tentar gerar o modal

                const { success, orderId, error } = await cloud.createPublicOrder(
                    store!.id,
                    orderItems,
                    cartTotal,
                    paymentMethod,
                    shippingAddress,
                    deliveryType,
                    customerName,
                    customerPhone,
                    isPixActive, // Sempre true se for PIX e tiver chave
                    orderObservation
                );

                if (success && orderId) {
                    // Success!
                    setCheckoutTotal(cartTotal);
                    setCart([]);
                    setIsCartOpen(false);

                    // Salvar nos pedidos recentes
                    const updatedRecent = [orderId, ...recentOrders.filter(id => id !== orderId)].slice(0, 10);
                    setRecentOrders(updatedRecent);
                    localStorage.setItem(`ze_recent_orders_${store!.id}`, JSON.stringify(updatedRecent));

                    // Lógica de PIX Ativo (Unified)
                    if (paymentMethod === 'PIX') {
                        setCreatedOrderId(orderId);
                        setIsPixModalOpen(true);
                    } else {
                        await alert({
                            title: 'Pedido Recebido com Sucesso! 🎉',
                            message: `Seu pedido #${orderId.slice(0, 8).toUpperCase()} foi enviado para a loja.\n\nVocê será redirecionado para a tela de rastreamento.`
                        });
                        // Redirect to Tracking
                        window.location.href = `/track/${orderId}`;
                    }
                } else {
                    throw error || new Error('Falha ao criar pedido');
                }

            } catch (err: any) {
                console.error(err);
                await alert({ title: 'Erro', message: 'Ocorreu um erro ao processar seu pedido pela plataforma. Tente novamente ou use o WhatsApp.' });
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // WHATSAPP CHECKOUT
        if (flowMode === 'WHATSAPP') {
            // Build WhatsApp Message - Clean Format
            let msg = `*NOVO PEDIDO* - ${store?.store_name || 'Ze Entregas'}\n`;
            msg += `--------------------------------\n`;
            msg += `*Cliente:* ${customerName}\n`;
            msg += `*Telefone:* ${customerPhone}\n`;
            msg += `--------------------------------\n\n`;

            msg += `*RESUMO DO PEDIDO:*\n`;
            cart.forEach(item => {
                msg += `• ${item.quantity}x ${item.product.name}\n`;
                msg += `  R$ ${(item.product.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
                if (item.observation) msg += `  Obs: ${item.observation}\n`;
            });

            msg += `\n--------------------------------\n`;
            msg += `*FINANCEIRO:*\n`;
            msg += `Subtotal: R$ ${cartSubtotal.toFixed(2).replace('.', ',')}\n`;

            if (deliveryType === 'DELIVERY') {
                const fee = typeof deliveryFee === 'number' ? deliveryFee : 0;
                msg += `Entrega: R$ ${fee.toFixed(2).replace('.', ',')}\n`;
                msg += `*TOTAL: R$ ${cartTotal.toFixed(2).replace('.', ',')}*\n`;
                msg += `--------------------------------\n\n`;

                msg += `*DADOS DE ENTREGA:*\n`;
                msg += `*Tipo:* Entrega em Domicilio\n`;
                msg += `*Ender:* ${addressStreet}, ${addressNumber}\n`;
                if (addressComplement) msg += `*Comp:* ${addressComplement}\n`;

                // Neighborhood Logic
                let finalNeighborhood = addressNeighborhood;
                if (deliverySettings?.own_delivery_mode === 'NEIGHBORHOOD' && selectedNeighborhoodId) {
                    const nName = fees.find(f => f.id === selectedNeighborhoodId)?.neighborhood_name;
                    if (nName) finalNeighborhood = nName;
                }
                if (finalNeighborhood) msg += `*Bairro:* ${finalNeighborhood}\n`;

                if (addressReference) msg += `*Ref:* ${addressReference}\n`;
                msg += `*Cidade:* ${selectedCity?.name || store?.city || ''} - ${selectedCity?.state || store?.address_state || ''}\n`;

            } else {
                msg += `*TOTAL: R$ ${cartTotal.toFixed(2).replace('.', ',')}*\n`;
                msg += `--------------------------------\n\n`;
                msg += `*DADOS DE ENTREGA:*\n`;
                msg += `*Tipo:* Retirada na Loja\n`;
                msg += `*Cidade:* ${selectedCity?.name || store?.city || ''}\n`;
            }

            msg += `\n*Forma de Pagamento:* ${paymentMethod}\n`;

            const hasPixKey = !!store?.pix_key || !!store?.config?.pixdata?.enabled;
            if (paymentMethod === 'PIX') {
                if (hasPixKey) {
                    msg += `_(Pagamento via PIX selecionado)_\n`;
                } else {
                    msg += `_(Pagamento na Entrega/Retirada.)_\n`;
                }
            }

            if (paymentMethod === 'CASH' && changeFor) {
                msg += `Troco para: ${changeFor}\n`;
            }

            // PRIORIDADE PARA NÚMERO DE WHATSAPP CONFIGURADO
            const phone = (store?.chat_number || store?.phone_number)?.replace(/\D/g, '');
            if (phone) {
                const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
                window.open(url, '_blank');
            } else {
                alert({ title: 'Erro na Loja', message: 'Não foi possível enviar o pedido pois a loja não configurou um número de telefone.' });
            }
        }
    };

    const isStoreOpen = useMemo(() => {
        if (!store) return true;
        // Check Manual Override (is_currently_open)
        // Se is_currently_open for false, a loja tá fechada manualmente.
        // Se for true (ou null), respeita o horário.
        if (store.is_currently_open === false) return false;

        // Check Schedule
        if (!store.opening_hours) return true;

        try {
            const now = new Date();
            const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
            const currentDay = days[now.getDay()];
            const currentTime = now.getHours() * 100 + now.getMinutes();

            const dayConfigs = store.opening_hours.toLowerCase().split(',').map(s => s.trim());
            const todayConfig = dayConfigs.find(c => c.startsWith(currentDay));

            if (!todayConfig) return true; // Sem config pro dia = Aberto? (Ou fechado? Backend assume aberto se não tem config especifica mas tem string)

            const timeRange = todayConfig.split(':')[1]?.trim();
            if (!timeRange || timeRange === 'fechado') return false;
            if (timeRange === '24h') return true;

            const [start, end] = timeRange.split('-').map(t => {
                const [h, m] = t.trim().split(':').map(Number);
                return h * 100 + m;
            });

            return currentTime >= start && currentTime <= end;
        } catch (e) {
            console.error("Error parsing opening hours", e);
            return true;
        }
    }, [store]);

    // --- COMPUTED DATA ---

    // 1. All Categories
    const categories = useMemo(() => {
        const cats = Array.from(new Set(products.map(p => p.category || 'Outros'))).sort();
        return ['Todos', ...cats];
    }, [products]);

    // 2. Filtered Products
    const filteredProducts = useMemo(() => {
        let filtered = products;

        // By Category
        if (selectedCategoryFilter !== 'Todos') {
            filtered = filtered.filter(p => (p.category || 'Outros') === selectedCategoryFilter);
        }

        // By Search Term
        if (searchTerm.trim()) {
            const lowerInfo = searchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(lowerInfo) ||
                (p.description && p.description.toLowerCase().includes(lowerInfo))
            );
        }

        return filtered;
    }, [products, selectedCategoryFilter, searchTerm]);

    // 3. Active Sections (Categories present in filtered view)
    const activeSections = useMemo(() => {
        if (selectedCategoryFilter !== 'Todos') return [selectedCategoryFilter];
        const presentCats = Array.from(new Set(filteredProducts.map(p => p.category || 'Outros'))).sort();
        return presentCats;
    }, [filteredProducts, selectedCategoryFilter]);

    // 4. Delivery Availability
    const canDeliver = useMemo(() => deliverySettings?.is_own_delivery_enabled || deliverySettings?.is_partner_delivery_enabled, [deliverySettings]);
    const canPickup = useMemo(() => deliverySettings?.is_pickup_enabled, [deliverySettings]);

    // --- RENDER ---

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    if (error || !store) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{error || 'Loja não encontrada'}</h2>
                <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
            </div>
        );
    }

    // Groupping Products - REMOVED (Handled by useMemo above)
    // const categories = Array.from(new Set(products.map(p => p.category || 'Outros'))).sort();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24 md:pb-0">
            {/* --- FIXED NAVBAR --- */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Logo className="h-8 w-auto" onClick={() => window.location.href = '/'} />
                        {recentOrders.length > 0 && (
                            <button
                                onClick={() => setIsRecentOrdersModalOpen(true)}
                                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-brand-50 text-brand-600 rounded-lg text-xs font-bold hover:bg-brand-100 transition-colors"
                            >
                                <ClipboardList className="w-4 h-4" />
                                Acompanhar Pedido
                            </button>
                        )}
                    </div>
                    <div className="flex-1 max-w-lg mx-auto hidden md:block">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                            <input type="text" className="block w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-transparent rounded-full text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-gray-700 transition-all placeholder-gray-500 text-gray-900 dark:text-white" placeholder="Buscar no cardápio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {recentOrders.length > 0 && (
                            <button
                                onClick={() => setIsRecentOrdersModalOpen(true)}
                                className="bg-brand-50 text-brand-600 hover:bg-brand-100 p-2.5 rounded-xl transition-colors"
                                title="Acompanhar Meus Pedidos"
                            >
                                <ClipboardList className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={() => setIsCartOpen(true)} className="relative flex-shrink-0 bg-brand-50 text-brand-600 hover:bg-brand-100 p-2.5 rounded-xl transition-colors">
                            <ShoppingBag className="w-5 h-5" />
                            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
                        </button>
                    </div>
                </div>
                <div className="md:hidden px-4 pb-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                        <input type="text" className="block w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-transparent rounded-full text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-gray-700 transition-all placeholder-gray-500 text-gray-900 dark:text-white" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="border-t border-gray-50 dark:border-gray-800 bg-white dark:bg-gray-900 py-3">
                    <div className="container mx-auto px-4 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x">
                        {categories.map(cat => (<button key={cat} onClick={() => setSelectedCategoryFilter(cat)} className={`snap-start px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${selectedCategoryFilter === cat ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-300'}`}>{cat}</button>))}
                    </div>
                </div>
            </div>
            <div className="pt-[140px] md:pt-[120px]" />

            {/* --- STORE BANNER --- */}
            <div className="relative z-0">
                <div className="h-48 md:h-80 bg-gray-200 dark:bg-gray-800 overflow-hidden relative">
                    {store.cover_url ? (
                        <img src={store.cover_url} alt="Capa" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-600 to-brand-800 opacity-20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className="container mx-auto px-4 -mt-10 relative flex flex-col md:flex-row items-center md:items-start gap-4 pb-6">
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-800 shadow-lg overflow-hidden flex-shrink-0">
                        {store.store_logo_url ? (
                            <img src={store.store_logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                <StoreIcon className="w-8 h-8 text-gray-400" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left text-gray-900 dark:text-white mb-2 z-10 md:mt-2">
                        <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start gap-2 mb-2">
                            <h1 className="text-xl md:text-2xl font-black text-gray-900 md:text-white dark:text-white md:drop-shadow-md">
                                {store.store_name || store.name}
                            </h1>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider self-center md:self-auto ${isStoreOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                {isStoreOpen ? 'Aberto' : 'Fechado'}
                            </span>
                        </div>

                        {store.description && (
                            <p className="text-sm md:block text-gray-600 dark:text-gray-400 mb-3 max-w-2xl leading-relaxed">
                                {store.description}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-medium text-gray-600 dark:text-gray-400 md:text-gray-100">
                            {store.opening_hours && (
                                <div className="flex items-center gap-1.5 bg-gray-500 text-white px-2.5 py-1.5 rounded-lg">
                                    <Clock className="w-4 h-4 text-white" /> {store.opening_hours}
                                </div>
                            )}
                            {(store.preparation_time_min || store.preparation_time_max) && (
                                <div className="flex items-center gap-1.5 bg-orange-500 text-white px-2.5 py-1.5 rounded-lg">
                                    <ChefHat className="w-4 h-4 text-white" />
                                    Preparo: {store.preparation_time_min || 0}-{store.preparation_time_max || 0} min
                                </div>
                            )}
                            {canDeliver && deliverySettings && (
                                <div className="flex items-center gap-1.5 bg-gray-500 text-white px-2.5 py-1.5 rounded-lg">
                                    <Bike className="w-4 h-4 text-white" />
                                    {deliverySettings.delivery_time_min}-{deliverySettings.delivery_time_max} min
                                </div>
                            )}
                            {canPickup && (
                                <div className="flex items-center gap-1.5 bg-brand-500 text-white px-2.5 py-1.5 rounded-lg">
                                    <StoreIcon className="w-4 h-4 text-white" /> Retirada
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 bg-gray-500 text-white px-2.5 py-1.5 rounded-lg">
                                <StoreIcon className="w-4 h-4 text-white" /> {products.length} itens
                            </div>

                            {/* Botão de Avaliação - Sempre visível na barra de badges */}
                            <div
                                onClick={() => setIsRatingModalOpen(true)}
                                className="flex items-center gap-1.5 bg-yellow-500/90 text-white px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-yellow-500 transition-colors shadow-sm"
                            >
                                <Star className="w-4 h-4 fill-white text-white" />
                                <span className="font-bold">
                                    {store.average_rating ? store.average_rating.toFixed(1) : 'Avaliar'}
                                </span>
                            </div>

                            {/* Botão Falar com a Loja - Fixo ao lado do Avaliar */}
                            <div
                                onClick={() => {
                                    window.history.pushState({}, '', `/${citySlug}/${storeSlug}/chat`);
                                    window.dispatchEvent(new CustomEvent('popstate'));
                                    window.dispatchEvent(new CustomEvent('pushstate_changed'));
                                }}
                                className="flex items-center gap-1.5 bg-brand-600 text-white px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-brand-700 transition-colors shadow-sm"
                            >
                                <MessageCircle className="w-4 h-4" />
                                <span className="font-bold">Falar com a Loja</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">

                {/* --- PRODUCT LIST (Full Width) --- */}
                <div className="space-y-10">
                    {/* Active Sections Loop */}
                    {activeSections.length === 0 ? (
                        <div className="text-center py-20">
                            <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-500">Nenhum produto encontrado.</h3>
                            <p className="text-gray-400 text-sm">Tente buscar por outro termo ou categoria.</p>
                            <Button variant="outline" className="mt-4" onClick={() => { setSearchTerm(''); setSelectedCategoryFilter('Todos'); }}>
                                Limpar Filtros
                            </Button>
                        </div>
                    ) : (
                        activeSections.map(cat => (
                            <div key={cat} className="scroll-mt-32">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-brand-500 rounded-full" /> {cat}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredProducts.filter(p => (p.category || 'Outros') === cat).map(product => (
                                        <div
                                            key={product.id}
                                            className="group relative bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700 transition-all flex gap-4 overflow-hidden shadow-sm hover:shadow-md"
                                        >
                                            {/* Card content - Opens Preview */}
                                            <div
                                                className="flex-1 flex gap-4 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedProduct(product);
                                                    setProductQuantity(1);
                                                    setProductObservation('');
                                                }}
                                            >
                                                <div className="flex-1 py-1">
                                                    <h3 className="font-bold text-gray-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors line-clamp-2">{product.name}</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">{product.description}</p>
                                                    <span className="font-black text-lg text-brand-600">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                                                </div>

                                                {product.image_url ? (
                                                    <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    </div>
                                                ) : (
                                                    <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                        <ShoppingBag className="w-8 h-8 text-gray-300" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Quick Add Button - Explicit '+' separate from card click */}
                                            <button
                                                disabled={!isStoreOpen}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCart(product, 1);
                                                }}
                                                className={`absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-sm z-10 ${!isStoreOpen
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-brand-600 hover:text-white'
                                                    }`}
                                            >
                                                <Plus className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )))}
                </div>

                {/* --- REMOVED DESKTOP SIDEBAR --- */}

            </div>

            {/* --- MOBILE FLOATING CART --- */}
            {cart.length > 0 && (
                <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full bg-brand-600 text-white p-4 rounded-2xl shadow-xl shadow-brand-600/30 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                                {cart.reduce((acc, i) => acc + i.quantity, 0)}
                            </div>
                            <span className="font-bold">Ver Carrinho</span>
                        </div>
                        <span className="font-black text-lg">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                    </button>
                </div>
            )}


            {/* --- PRODUCT PREVIEW MODAL --- */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 sm:p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
                    <div className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-t-[32px] md:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 flex flex-col max-h-[90vh]">

                        {/* Drag Handle for Mobile */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/30 backdrop-blur rounded-full z-20 md:hidden"></div>

                        {/* Header Image */}
                        <div className="h-64 bg-gray-200 dark:bg-gray-800 relative flex-shrink-0">
                            {selectedProduct.image_url ? (
                                <img src={selectedProduct.image_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-16 h-16 text-gray-400" /></div>
                            )}
                            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur"><X className="w-6 h-6" /></button>
                            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent"></div>
                        </div>

                        <div className="p-8 pt-2 overflow-y-auto">
                            <div className="mb-6">
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white leading-tight mb-2">{selectedProduct.name}</h3>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl font-bold text-brand-600">R$ {selectedProduct.price.toFixed(2).replace('.', ',')}</span>
                                    {selectedProduct.category && <span className="bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs font-bold px-2 py-1 rounded-lg uppercase tracking-wider">{selectedProduct.category}</span>}
                                </div>
                            </div>

                            <p className="text-gray-500 dark:text-gray-400 text-base leading-relaxed mb-8">{selectedProduct.description}</p>

                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Alguma observação?</label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                    placeholder="Ex: Sem cebola, ponto da carne..."
                                    rows={3}
                                    value={productObservation}
                                    onChange={e => setProductObservation(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-2xl p-1.5 shadow-inner">
                                    <button
                                        onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                                        className="w-12 h-12 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm"
                                    ><Minus className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                                    <span className="w-10 text-center font-black text-lg">{productQuantity}</span>
                                    <button
                                        onClick={() => setProductQuantity(productQuantity + 1)}
                                        className="w-12 h-12 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm"
                                    ><Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                                </div>
                                <Button
                                    fullWidth
                                    disabled={!isStoreOpen}
                                    className={`py-5 text-lg rounded-2xl shadow-xl ${!isStoreOpen ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed shadow-none' : 'shadow-brand-500/20'}`}
                                    onClick={() => addToCart()} // Calling without args uses modal state
                                >
                                    {isStoreOpen ? 'Adicionar' : 'Loja Fechada'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CHECKOUT DRAWER --- */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={() => setIsCartOpen(false)} />
                    <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 h-full shadow-2xl animate-in slide-in-from-right flex flex-col">

                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Finalizar Pedido</h2>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><X className="w-6 h-6 text-gray-500" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Review Items */}
                            <section>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Seus Itens</h3>
                                <div className="space-y-4">
                                    {cart.map(item => (
                                        <div key={item.id} className="flex gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-xl overflow-hidden flex-shrink-0">
                                                {item.product.image_url ? <img src={item.product.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-gray-400" /></div>}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2">{item.product.name}</h4>
                                                    <span className="font-bold text-sm flex-shrink-0 ml-2">R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                                                </div>
                                                {item.observation && <p className="text-xs text-gray-500 mt-1 italic">Obs: {item.observation}</p>}

                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center bg-white dark:bg-gray-700 rounded-lg p-0.5 shadow-inner">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-all"><Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" /></button>
                                                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-all"><Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" /></button>
                                                    </div>
                                                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {cart.length > 0 && (
                                        <button onClick={clearCart} className="w-full py-2 text-sm font-bold text-gray-400 hover:text-red-500 border border-dashed border-gray-300 rounded-xl hover:border-red-300 hover:bg-red-50 transition-all">
                                            Limpar Carrinho
                                        </button>
                                    )}
                                </div>
                            </section>

                            {/* Order Observation */}
                            <section>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Observação do Pedido</label>
                                <textarea
                                    value={orderObservation}
                                    onChange={e => setOrderObservation(e.target.value)}
                                    placeholder="Ex: Campainha não funciona, deixar na portaria..."
                                    className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none border border-gray-100 dark:border-gray-800 font-medium text-gray-900 dark:text-white placeholder-gray-400"
                                    rows={2}
                                />
                            </section>

                            <div className="h-px bg-gray-100 dark:bg-gray-800" />

                            {/* Identification */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Identificação</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomInput label="Seu Nome" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Seu nome" />
                                    <CustomInput label="Seu Telefone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(00) 00000-0000" mask="phone" />
                                </div>
                            </section>

                            {/* Delivery Options - CONDITIONAL RENDERING */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Entrega ou Retirada</h3>
                                </div>

                                {/* Calculate Availability */}
                                {(() => {
                                    const canDeliver = deliverySettings?.is_own_delivery_enabled || deliverySettings?.is_partner_delivery_enabled;
                                    const canPickup = deliverySettings?.is_pickup_enabled;

                                    // 1. Both Available: Show Tabs
                                    if (canDeliver && canPickup) {
                                        return (
                                            <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4 relative">
                                                {/* Tabs Indicator Background */}
                                                <div
                                                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700 rounded-xl shadow-sm transition-all duration-300 ease-in-out ${deliveryType === 'PICKUP' ? 'left-[calc(50%+2px)]' : 'left-1'
                                                        }`}
                                                />

                                                <button
                                                    onClick={() => setDeliveryType('DELIVERY')}
                                                    className={`relative z-10 p-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${deliveryType === 'DELIVERY' ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                                        }`}
                                                >
                                                    <Bike className="w-4 h-4" /> Entrega
                                                </button>

                                                <button
                                                    onClick={() => setDeliveryType('PICKUP')}
                                                    className={`relative z-10 p-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${deliveryType === 'PICKUP' ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                                        }`}
                                                >
                                                    <StoreIcon className="w-4 h-4" /> Retirada
                                                </button>
                                            </div>
                                        );
                                    }

                                    // 2. Only Delivery
                                    if (canDeliver && !canPickup) {
                                        return (
                                            <div className="p-3 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-xl flex items-center justify-center gap-2 font-bold mb-4">
                                                <Bike className="w-5 h-5" />
                                                <span>Apenas Entrega Disponível</span>
                                            </div>
                                        );
                                    }

                                    // 3. Only Pickup
                                    if (!canDeliver && canPickup) {
                                        return (
                                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-xl flex items-center justify-center gap-2 font-bold mb-4">
                                                <StoreIcon className="w-5 h-5" />
                                                <span>Apenas Retirada na Loja</span>
                                            </div>
                                        );
                                    }

                                    // 4. None (Should not happen if store is active, but fallback)
                                    return (
                                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-center font-bold mb-4">
                                            Momentaneamente indisponível
                                        </div>
                                    );
                                })()}

                                {canPickup && deliveryType === 'PICKUP' && (
                                    <div className="space-y-2 animate-in fade-in p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 text-center">
                                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                                            <MapPin className="w-6 h-6 text-gray-500" />
                                        </div>
                                        <h4 className="text-base font-bold text-gray-900 dark:text-white">Retirar na Loja</h4>
                                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                            {(store?.store_address_street || store?.address_street) && <p>{`${store.store_address_street || store.address_street}, ${store.store_address_number || store.address_number}`}</p>}
                                            {(store?.store_address_district || store?.address_district) && <p>{store.store_address_district || store.address_district}</p>}
                                            {(store?.store_address_city || store?.city) && <p>{`${store.store_address_city || store.city} - ${store.store_address_state || store.address_state}`}</p>}
                                        </div>
                                        {store?.phone_number && (
                                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-4 flex justify-center">
                                                <a
                                                    href={`tel:${store.phone_number.replace(/\D/g, '')}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl font-bold text-sm hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                                >
                                                    <Phone className="w-4 h-4" />
                                                    <span>Ligar: {store.phone_number}</span>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {canDeliver && deliveryType === 'DELIVERY' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">

                                        {/* Rua - StreetSearchSelect */}
                                        <div className="col-span-2">
                                            <StreetSearchSelect
                                                city={store.store_address_city || store.city || ''}
                                                value={addressStreet}
                                                onSelect={setAddressStreet}
                                                label="Rua"
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <CustomInput label="Número" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="123" />
                                            </div>
                                            <div className="col-span-2">
                                                <CustomInput label="Complemento" value={addressComplement} onChange={e => setAddressComplement(e.target.value)} placeholder="Apto, Bloco" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {deliverySettings?.own_delivery_mode === 'NEIGHBORHOOD' ? (
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block uppercase tracking-wide">Bairro (Taxa de Entrega)</label>
                                                    <select
                                                        value={selectedNeighborhoodId}
                                                        onChange={e => setSelectedNeighborhoodId(e.target.value)}
                                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all font-medium"
                                                    >
                                                        <option value="">Selecione o bairro...</option>
                                                        {fees.map(fee => (
                                                            <option key={fee.id} value={fee.id}>{fee.neighborhood_name} (+ R$ {fee.fee.toFixed(2)})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ) : (
                                                <CustomInput label="Bairro" value={addressNeighborhood} onChange={e => setAddressNeighborhood(e.target.value)} placeholder="Seu bairro" />
                                            )}
                                        </div>

                                        <CustomInput label="Ponto de Referência" value={addressReference} onChange={e => setAddressReference(e.target.value)} placeholder="Próximo a..." />
                                    </div>
                                )}
                            </section>

                            <div className="h-px bg-gray-100 dark:bg-gray-800" />

                            {/* Payment */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pagamento</h3>

                                <div className="grid grid-cols-3 gap-2">
                                    {/* PIX: Show if Store has PIX enabled (Auto or Manual) */}
                                    {/* User Request Correction: "independe se ativo ou nao vai motra o pix... se ativo abreo o modal... se noa tivo ainda mostar o botao... e vindo como forma de pagamento sem abrir o modal" */}

                                    <button
                                        onClick={() => setPaymentMethod('PIX')}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${paymentMethod === 'PIX' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <QrCode className="w-6 h-6" />
                                        {/* Show (Auto) tag only if it WILL open the modal */}
                                        <span className="text-xs font-bold">PIX {(store?.receive_orders_via_platform && store?.config?.pixdata?.enabled) ? '(Auto)' : ''}</span>
                                    </button>

                                    {/* CARTÃO */}
                                    <button
                                        onClick={() => setPaymentMethod('CREDIT_CARD')}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${paymentMethod === 'CREDIT_CARD' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <CreditCard className="w-6 h-6" />
                                        <span className="text-xs font-bold">Cartão</span>
                                    </button>

                                    {/* DINHEIRO */}
                                    <button
                                        onClick={() => {
                                            setPaymentMethod('CASH');
                                            setTimeout(() => {
                                                const changeInput = document.getElementById('change-input-container');
                                                if (changeInput) {
                                                    changeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }
                                            }, 100);
                                        }}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${paymentMethod === 'CASH' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <Banknote className="w-6 h-6" />
                                        <span className="text-xs font-bold">Dinheiro</span>
                                    </button>
                                </div>

                                {paymentMethod === 'CASH' && (
                                    <div id="change-input-container" className="animate-in fade-in pt-2">
                                        <CustomInput
                                            label="Troco para quanto?"
                                            value={changeFor}
                                            onChange={e => setChangeFor(e.target.value)}
                                            placeholder="R$ 50,00"
                                            mask="currency"
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </section>

                        </div>

                        {/* Sticky Checkout Footer */}
                        <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Subtotal</span>
                                    <span>R$ {cartSubtotal.toFixed(2).replace('.', ',')}</span>
                                </div>
                                {deliveryType === 'DELIVERY' && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Entrega</span>
                                        {deliveryFee === 0 ? (
                                            <span className="font-bold text-green-600 flex items-center">
                                                Grátis*
                                                <button
                                                    onClick={() => setIsRulesModalOpen(true)}
                                                    className="text-[10px] text-gray-400 font-normal ml-1 hover:text-brand-600 hover:underline transition-colors"
                                                >
                                                    (Ver normas)
                                                </button>
                                            </span>
                                        ) : (
                                            <span className="text-gray-900 dark:text-gray-300">+ R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                                        )}
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <span className="font-medium text-gray-900 dark:text-white">Total</span>
                                    <span className="font-black text-2xl text-gray-900 dark:text-white">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                                </div>
                            </div>
                            <Button
                                fullWidth
                                size="lg"
                                onClick={handleCheckout}
                                className={`rounded-2xl py-5 text-lg shadow-xl shadow-brand-500/20 ${!isStoreOpen || isSubmitting ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                disabled={!isStoreOpen || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Enviando...</>
                                ) : isStoreOpen ? (
                                    <>
                                        {store?.receive_orders_via_platform ? 'Enviar Pedido' : 'Enviar no WhatsApp'}
                                        <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                ) : (
                                    <>Loja Fechada</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pix Payment Modal */}
            {isPixModalOpen && createdOrderId && (store?.config?.pixdata || store?.pix_key) && (
                <PixPaymentModal
                    isOpen={isPixModalOpen}
                    onClose={() => {
                        setIsPixModalOpen(false);
                        // Redirect to Tracking
                        window.history.pushState({}, '', `/track/${createdOrderId}`);
                        window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'order_tracking' } }));
                    }}
                    pixData={{
                        ...(store?.config?.pixdata || {
                            enabled: true,
                            key: store?.pix_key,
                            key_type: store?.pix_key_type || 'CPF',
                            bank_name: 'Banco'
                        }),
                        name: store?.config?.pixdata?.name || store?.name || store?.store_name || 'LOJA',
                        city: store?.config?.pixdata?.city || store?.store_address_city || store?.city || 'CIDADE'
                    }}
                    amount={checkoutTotal}
                    orderId={createdOrderId}
                    storePhone={store.chat_number || store.phone_number}
                />
            )}


            {/* Ratings Modal */}
            {isRatingModalOpen && store && (
                <StoreRatingModal
                    isOpen={isRatingModalOpen}
                    onClose={() => setIsRatingModalOpen(false)}
                    storeId={store.id}
                    storeName={store.store_name || store.name}
                />
            )}

            {isRecentOrdersModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsRecentOrdersModalOpen(false)} />
                    <div className="relative bg-white dark:bg-gray-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Meus Pedidos</h3>
                            <button onClick={() => setIsRecentOrdersModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                            {recentOrders.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">Nenhum pedido recente encontrado.</p>
                            ) : (
                                recentOrders.map((id, index) => (
                                    <button
                                        key={id}
                                        onClick={() => {
                                            // Force full navigation to ensure tracking page loads correctly for visitors
                                            window.location.assign(`/track/${id}`);
                                        }}
                                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-all group"
                                    >
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pedido</p>
                                            <p className="font-black text-gray-900 dark:text-white">#{id.slice(0, 8).toUpperCase()}</p>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-500 transition-colors" />
                                    </button>
                                ))
                            )}
                        </div>
                        <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
                            <p className="text-[10px] text-center text-gray-400 font-medium uppercase tracking-widest">Apenas pedidos feitos via plataforma</p>
                        </div>
                    </div>
                </div>
            )}

            <ShippingRulesModal
                isOpen={isRulesModalOpen}
                onClose={() => setIsRulesModalOpen(false)}
                rules={shippingRules}
            />

            <AuthRequiredModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />

        </div>
    );
};
