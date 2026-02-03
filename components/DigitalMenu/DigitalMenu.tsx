```javascript
import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Clock, Bike, Store as StoreIcon, MapPin, Search, ShoppingBag, ArrowRight, Loader2, AlertCircle, Trash2, ShoppingCart, Star, QrCode, CreditCard, Banknote, ShieldCheck, Instagram, Facebook, Globe, MessageSquare, ChevronRight, Play, ExternalLink, Calendar, Map, ClipboardList, TrendingUp, DollarSign, Wallet, RefreshCw, X, ChevronUp, Copy, Check, Minus, Plus, ChevronLeft, MessageCircle, Zap, ChefHat } from 'lucide-react';
import * as cloud from '../../services/cloud';
import { PartnerProfile, StoreProduct, StoreDeliverySettings, StoreNeighborhoodFee, StoreShippingRule, StoreAddonGroup, StoreAddonOption } from '../../types';
import { ProductAddonSelector } from '../ProductAddonSelector';
import { Logo } from '../Logo';
import { Button } from '../Button';
import { CustomInput } from '../CustomInput';
import { StreetSearchSelect } from '../StreetSearchSelect';
import { CitySearchSelect } from '../CitySearchSelect';
import { useDialog } from '../../utils/dialogService';
import { formatMinutes, formatMinuteRange } from '../../utils/formatMinutes';
import { getStoreOpenState } from '../../utils/storeHours';
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
    selectedAddons?: {
        optionId: string;
        optionName: string;
        optionPrice: number;
        quantity: number;
    }[];
}

export const DigitalMenu: React.FC<DigitalMenuProps> = ({ citySlug, storeSlug }) => {
    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<PartnerProfile | null>(null);
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [deliverySettings, setDeliverySettings] = useState<StoreDeliverySettings | null>(null);
    const [fees, setFees] = useState<StoreNeighborhoodFee[]>([]);
    const [shippingRules, setShippingRule] = useState<StoreShippingRule[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartRestored, setCartRestored] = useState(false);

    // Product Modal State
    const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
    const [productQuantity, setProductQuantity] = useState(1);
    const [productObservation, setProductObservation] = useState('');
    const [selectedProductAddonGroup, setSelectedProductAddonGroup] = useState<StoreAddonGroup | null>(null);
    const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
    const [currentEditingCartItemId, setCurrentEditingCartItemId] = useState<string | null>(null);

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
                const saved = localStorage.getItem(`ze_cart_${ store.id } `);
                if (saved) {
                    setCart(JSON.parse(saved));
                }
                const savedOrders = localStorage.getItem(`ze_recent_orders_${ store.id } `);
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
            localStorage.setItem(`ze_cart_${ store.id } `, JSON.stringify(cart));
        }
    }, [cart, store?.id, cartRestored]);

    // --- CART LOGIC ---
    const addToCart = (productOverride?: StoreProduct, quantityOverride?: number, addonsOverride?: any[]) => {
        const prod = productOverride || selectedProduct;
        if (!prod) return;

        // Se o produto tem adicionais e não foram fornecidos (vinda do botão "+" direto)
        if (prod.addon_group_id && !addonsOverride && !isAddonModalOpen) {
            handleOpenAddonModal(prod);
            return;
        }

        const qty = quantityOverride || productQuantity;
        const obs = productOverride ? '' : productObservation;
        const addons = addonsOverride || [];

        setCart(prevCart => {
            // Comparar itens considerando adicionais
            const existingItem = prevCart.find(item => 
                item.product.id === prod.id && 
                item.observation === obs &&
                JSON.stringify(item.selectedAddons || []) === JSON.stringify(addons)
            );

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
                    selectedAddons: addons
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

    const handleOpenAddonModal = async (product: StoreProduct, cartItemId?: string) => {
        if (!product.addon_group_id) return;

        try {
            const groups = await cloud.getStoreAddonGroups();
            const group = groups.find(g => g.id === product.addon_group_id);
            if (group) {
                setSelectedProduct(product);
                setSelectedProductAddonGroup(group);
                setCurrentEditingCartItemId(cartItemId || null);
                setIsAddonModalOpen(true);
            }
        } catch (error) {
            console.error("Erro ao carregar grupo de adicionais:", error);
        }
    };

    const handleConfirmAddons = (selectedAddons: any[]) => {
        if (currentEditingCartItemId) {
            // Editando item existente no carrinho
            setCart(prev => prev.map(item => 
                item.id === currentEditingCartItemId 
                    ? { ...item, selectedAddons } 
                    : item
            ));
            setCurrentEditingCartItemId(null);
        } else {
            // Novo item
            addToCart(selectedProduct || undefined, productQuantity, selectedAddons);
        }
        setIsAddonModalOpen(false);
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
                message: `Deseja remover "${item.product.name}" do carrinho ? `,
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

    const cartSubtotal = cart.reduce((sum, item) => {
        const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + (a.optionPrice * a.quantity), 0);
        return sum + ((item.product.price + addonsPrice) * item.quantity);
    }, 0);


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
        if (v.length > 5) v = `${ v.substring(0, 5) } -${ v.substring(5, 8) } `;
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
                image_url: item.product.image_url,
                selected_addons: item.selectedAddons
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
            if (item.observation) msg += `  Obs: ${item.observation}\n`;
            if (item.selectedAddons && item.selectedAddons.length > 0) {
                item.selectedAddons.forEach(addon => {
                    msg += `  + ${addon.quantity}x ${addon.optionName}\n`;
                });
            }
            msg += `  R$ ${(item.product.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
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
    return getStoreOpenState({
        openingHours: store.opening_hours,
        isOpen: store.is_open,
        isCurrentlyOpen: store.is_currently_open
    }).isOpen;
}, [store]);
};
