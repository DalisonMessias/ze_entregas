import React, { useState, useEffect, useMemo } from 'react';
import { Phone, Clock, Bike, Store as StoreIcon, MapPin, Search, ShoppingBag, ArrowRight, Loader2, AlertCircle, Trash2, ShoppingCart, Star, QrCode, CreditCard, Banknote, ShieldCheck, Instagram, Facebook, Globe, MessageSquare, ChevronRight, Play, ExternalLink, Calendar, Map, ClipboardList, TrendingUp, DollarSign, Wallet, RefreshCw, X, ChevronUp, Copy, Check, Minus, Plus, ChevronLeft, MessageCircle, Zap, ChefHat, Award, Info, Ticket, CheckCircle2 } from 'lucide-react';
import * as cloud from '../../services/cloud';
import { PartnerProfile, StoreProduct, StoreDeliverySettings, StoreNeighborhoodFee, StoreShippingRule, StoreAddonGroup, StoreAddonOption, LoyaltySettings, PaymentGatewayConfig } from '../../types';
import { ProductAddonSelector } from '../ProductAddonSelector';
import { Logo } from '../Logo';
import { Button } from '../Button';
import { CustomInput } from '../CustomInput';
import { StreetSearchSelect } from '../StreetSearchSelect';
import { CitySearchSelect } from '../CitySearchSelect';
import { useDialog } from '../../utils/dialogService';
import { formatMinutes, formatMinuteRange } from '../../utils/formatMinutes';
import { StoreRatingModal } from './StoreRatingModal';
import { PixPaymentModal } from '../PixPaymentModal';
import { ShippingRulesModal } from './ShippingRulesModal';
import { AuthRequiredModal } from './AuthRequiredModal';
import { MobileTabsSelect } from '../MobileTabsSelect';
import { SelectPersonalizado } from '../SelectPersonalizado';
import { getStoreOpenState } from '../../utils/storeHours';

interface DigitalMenuProps {
    citySlug: string;
    storeSlug: string;
}

type LocalStoreProduct = StoreProduct & {
    ativo?: boolean;
    preco_promocional?: number | null;
    data_inicio?: string | null;
    data_fim?: string | null;
    promo_name?: string | null;
    promo_discount_type?: string | null;
    promo_discount_value?: number | null;
};

interface CartItem {
    id: string; // unique ID for cart item
    product: LocalStoreProduct;
    quantity: number;
    observation?: string;
    selectedAddons?: {
        optionId: string;
        optionName: string;
        optionPrice: number;
        quantity: number;
    }[];
    selectedSize?: string;
    sizePrice?: number;
}

const CommentsList: React.FC<{ storeId: string, showComments?: boolean }> = ({ storeId, showComments = true }) => {
    const [ratings, setRatings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await cloud.getStoreRatings(storeId, showComments);
                setRatings(data);
            } catch (e) {
                console.error("Error loading ratings for menu:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [storeId, showComments]);

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>;
    if (ratings.length === 0) return <p className="text-center text-gray-500 py-8">Nenhum comentário disponível ainda.</p>;

    const formatName = (fullName: string) => {
        if (!fullName) return 'Cliente';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length <= 1) return parts[0] || 'Cliente';
        return `${parts[0]} ${parts[parts.length - 1]}`;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ratings.map((r) => {
                const displayName = r.is_anonymous ? 'Cliente Anônimo' : formatName(r.evaluator?.name);
                const displayInitial = r.is_anonymous ? '?' : (displayName.charAt(0).toUpperCase());

                return (
                    <div key={r.id} className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:border-gray-200 dark:hover:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 font-bold text-xs uppercase">
                                    {displayInitial}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1">
                                        {displayName}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-medium">
                                        {new Date(r.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />
                                ))}
                            </div>
                        </div>
                        {!r.is_anonymous && r.comment && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{r.comment}"</p>
                        )}
                        {r.store_response && (
                            <div className="mt-4 pl-4 border-l-2 border-brand-200 dark:border-brand-900/30">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <StoreIcon className="w-3 h-3 text-brand-500" />
                                    <p className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Resposta da Loja</p>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">"{r.store_response}"</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export const DigitalMenu: React.FC<DigitalMenuProps> = ({ citySlug, storeSlug }) => {
    const [loading, setLoading] = useState(true);
    const [store, setStore] = useState<PartnerProfile | null>(null);
    const [products, setProducts] = useState<LocalStoreProduct[]>([]);
    const [deliverySettings, setDeliverySettings] = useState<StoreDeliverySettings | null>(null);
    const [fees, setFees] = useState<StoreNeighborhoodFee[]>([]);
    const [shippingRules, setShippingRules] = useState<StoreShippingRule[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [paymentGateways, setPaymentGateways] = useState<PaymentGatewayConfig[]>([]);

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartRestored, setCartRestored] = useState(false);

    // Product Modal State
    const [selectedProduct, setSelectedProduct] = useState<LocalStoreProduct | null>(null);
    const [productQuantity, setProductQuantity] = useState(1);
    const [productObservation, setProductObservation] = useState('');
    const [orderObservation, setOrderObservation] = useState('');
    const [selectedProductAddonGroup, setSelectedProductAddonGroup] = useState<StoreAddonGroup | null>(null);
    const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
    const [currentEditingCartItemId, setCurrentEditingCartItemId] = useState<string | null>(null);

    // Size State
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [currentPrice, setCurrentPrice] = useState<number>(0);

    // Checkout State
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
    const [hasInitialDeliveryTypeSet, setHasInitialDeliveryTypeSet] = useState(false);

    // Address Fields
    const [cep, setCep] = useState('');
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
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
    const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPixModalOpen, setIsPixModalOpen] = useState(false);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
    const [checkoutTotal, setCheckoutTotal] = useState(0);
    const [recentOrders, setRecentOrders] = useState<string[]>([]);
    const [isRecentOrdersModalOpen, setIsRecentOrdersModalOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Loyalty State
    const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
    const [loyaltyBalance, setLoyaltyBalance] = useState<number>(0);
    const [pointsRedeemed, setPointsRedeemed] = useState<number>(0);
    const [loyaltyDiscountValue, setLoyaltyDiscountValue] = useState<number>(0);
    const [isApplyingLoyalty, setIsApplyingLoyalty] = useState(false);

    // Coupon State
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
    const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

    // Personal Balance State (Hybrid Payment)
    const [personalBalance, setPersonalBalance] = useState<number>(0);
    const [usePersonalBalance, setUsePersonalBalance] = useState<boolean>(false);
    const [walletTransactionId, setWalletTransactionId] = useState<string | null>(null);
    const [isWalletLoading, setIsWalletLoading] = useState(false);

    const { alert, confirm } = useDialog();

    useEffect(() => {
        loadStoreData();
    }, [citySlug, storeSlug]);

    useEffect(() => {
        if (selectedProduct) {
            if (selectedProduct.has_sizes && selectedProduct.default_size) {
                setSelectedSize(selectedProduct.default_size);
                setCurrentPrice(selectedProduct.price_by_size?.[selectedProduct.default_size] || selectedProduct.price);
            } else {
                setSelectedSize('');
                setCurrentPrice(selectedProduct.price);
            }
            setProductQuantity(1);
            setProductObservation('');
        }
    }, [selectedProduct]);

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

            const menuData = await cloud.getPublicStoreMenuData(storeData.id);

            setProducts(menuData.products);
            setDeliverySettings(menuData.deliverySettings);
            setFees(menuData.neighborhoodFees);
            setShippingRules(menuData.shippingRules);
            setLoyaltySettings(menuData.loyaltySettings);
            const gateways = menuData.paymentGateways || [];
            setPaymentGateways(gateways);

            // Set default payment method based on primary gateway
            if (gateways.length > 0) {
                const primary = gateways.find(g => g.is_primary && g.is_active);
                if (primary) {
                    if (primary.gateway_name === 'mercadopago' || primary.gateway_name === 'infinitepay') {
                        // Se o modo plataforma estiver ativo e houver gateway on-line, sugerimos cartão/on-line
                        if (storeData.receive_orders_via_platform) {
                            setPaymentMethod('CREDIT_CARD');
                        }
                    } else {
                        setPaymentMethod('PIX');
                    }
                }
            }

            // Initialize selectedCity with store city
            if (storeData.store_address_city || storeData.city) {
                setSelectedCity({
                    name: storeData.store_address_city || storeData.city,
                    state: storeData.store_address_state || storeData.address_state || 'UF',
                    id: 'store-auto'
                });
            }

            // Set default delivery type based on settings - ENHANCED LOGIC
            const settingsData = menuData.deliverySettings;
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
        const checkAuth = async (storeId: string) => {
            const { user } = await cloud.getUserWithCache();
            if (user) {
                setIsLoggedIn(true);
                // Get name and phone from profile to populate checkout
                const sb = cloud.getClient();
                if (sb) {
                    setIsLoadingAddress(true);
                    try {
                        const { data: profile } = await sb.from('user_profiles')
                            .select('name, phone_number, address_zip, address_street, address_number, address_district, address_complement, address_reference')
                            .eq('id', user.id)
                            .single();

                        if (profile) {
                            if (profile.name) setCustomerName(profile.name);
                            if (profile.phone_number) setCustomerPhone(profile.phone_number);

                            // Auto-fill address if not already interacting
                            if (profile.address_zip) setCep(profile.address_zip);
                            if (profile.address_street) setAddressStreet(profile.address_street);
                            if (profile.address_number) setAddressNumber(profile.address_number);
                            if (profile.address_district) setAddressNeighborhood(profile.address_district);
                            if (profile.address_complement) setAddressComplement(profile.address_complement);
                            if (profile.address_reference) setAddressReference(profile.address_reference);
                        }
                    } catch (err) {
                        console.error("Erro ao carregar endereço do perfil:", err);
                    } finally {
                        setIsLoadingAddress(false);
                    }
                }

                // Fetch Loyalty Balance
                try {
                    const balance = await cloud.getLoyaltyBalance(storeId);
                    setLoyaltyBalance(balance);
                } catch (bErr) {
                    console.error("Error loading loyalty balance:", bErr);
                }

                // Fetch Personal Balance (Hybrid Payment)
                try {
                    const sb = cloud.getClient();
                    if (sb) {
                        const { data: wallet } = await sb.from('driver_wallets')
                            .select('balance_decimal')
                            .eq('driver_id', user.id)
                            .single();
                        if (wallet) {
                            setPersonalBalance(Number(wallet.balance_decimal) || 0);
                        }
                    }
                } catch (wErr) {
                    console.error("Error loading personal balance:", wErr);
                }
            }
        };

        if (store?.id) {
            checkAuth(store.id);
        }
    }, [store?.id]);

    // --- REALTIME UPDATES ---
    useEffect(() => {
        if (!store?.id) return;

        const client = cloud.getClient();
        if (!client) return;

        console.log("Subscribing to store updates:", store.id);

        const subscription = client
            .channel(`store_status_${store.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_profiles',
                    filter: `id=eq.${store.id}`
                },
                (payload) => {
                    console.log("Store update received:", payload);
                    const newStore = payload.new as PartnerProfile;
                    if (newStore) {
                        setStore(prev => {
                            if (!prev) return null;
                            return { ...prev, ...newStore };
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            console.log("Unsubscribing from store updates");
            subscription.unsubscribe();
        };
    }, [store?.id]);

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
        if (deliverySettings && !hasInitialDeliveryTypeSet) {
            const canDeliverAvailable = deliverySettings.is_own_delivery_enabled || deliverySettings.is_partner_delivery_enabled;
            const canPickupAvailable = deliverySettings.is_pickup_enabled;

            if (canDeliverAvailable && !canPickupAvailable && deliveryType !== 'DELIVERY') {
                setDeliveryType('DELIVERY');
            } else if (!canDeliverAvailable && canPickupAvailable && deliveryType !== 'PICKUP') {
                setDeliveryType('PICKUP');
            }
            setHasInitialDeliveryTypeSet(true);
        }
    }, [deliverySettings, deliveryType, hasInitialDeliveryTypeSet]);

    // Save cart on change
    useEffect(() => {
        if (store?.id && cartRestored) {
            localStorage.setItem(`ze_cart_${store.id}`, JSON.stringify(cart));
        }
    }, [cart, store?.id, cartRestored]);

    // --- CART LOGIC ---
    const addToCart = (product: StoreProduct, quantity: number, addons: any[], observation?: string, size?: string, price?: number) => {
        setCart(prev => {
            const newItem: CartItem = {
                id: crypto.randomUUID(),
                product,
                quantity,
                selectedAddons: addons,
                observation: observation,
                selectedSize: size,
                sizePrice: price
            };
            return [...prev, newItem];
        });
        setSelectedProduct(null);
        setProductQuantity(1);
        setProductObservation('');
        setSelectedSize('');
    };

    const handleOpenAddonModal = async (product: StoreProduct, cartItemId?: string, quantity?: number, observation?: string) => {
        const hasAddons = !!product.addon_group_id || (product.addon_options && product.addon_options.length > 0);
        const qty = quantity || productQuantity || 1;
        const obs = observation || productObservation || '';

        if (!hasAddons) {
            const initialSize = product.has_sizes && product.default_size ? product.default_size : '';
            const initialPrice = product.has_sizes && product.default_size
                ? (product.price_by_size?.[product.default_size] || product.price)
                : product.price;

            addToCart(product, qty, [], obs, initialSize, initialPrice);
            return;
        }

        try {
            let group = null;
            if (product.addon_group_id) {
                const groups = await cloud.getStoreAddonGroups();
                group = groups.find(g => g.id === product.addon_group_id) || null;
            }

            setSelectedProduct(product);
            setSelectedProductAddonGroup(group);
            setCurrentEditingCartItemId(cartItemId || null);
            // We'll use the current component state (productQuantity, productObservation)
            // for the additions, as it's already set or passed in.
            setIsAddonModalOpen(true);
        } catch (error) {
            console.error("Erro ao carregar adicionais:", error);
        }
    };

    const handleConfirmAddons = (selectedAddons: any[]) => {
        if (currentEditingCartItemId) {
            setCart(prev => prev.map(item =>
                item.id === currentEditingCartItemId ? { ...item, selectedAddons } : item
            ));
        } else if (selectedProduct) {
            addToCart(selectedProduct, productQuantity, selectedAddons, productObservation, selectedSize, currentPrice);
        }
        setIsAddonModalOpen(false);
        setCurrentEditingCartItemId(null);
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

    const cartSubtotal = cart.reduce((sum, item) => {
        const addonsPrice = (item.selectedAddons || []).reduce((s, a) => Number(s) + (Number(a.optionPrice) * Number(a.quantity)), 0);
        const basePrice = cloud.getProductPrice(item.product, item.sizePrice);
        return Number(sum) + ((basePrice + addonsPrice) * Number(item.quantity));
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
    }, [deliveryType, deliverySettings, fees, selectedNeighborhoodId, cartSubtotal, shippingRules]);

    // Total Bruto antes da divisão híbrida
    const grossTotal = Number(cartSubtotal) + Number(deliveryFee) - Number(loyaltyDiscountValue) - Number(couponDiscount);

    // Calculo Hibrido
    const walletAmountToUse = useMemo(() => {
        if (!usePersonalBalance || !isLoggedIn || personalBalance <= 0) return 0;
        return Math.min(personalBalance, grossTotal);
    }, [usePersonalBalance, isLoggedIn, personalBalance, grossTotal]);

    const cartTotal = grossTotal - walletAmountToUse;

    const pointsToEarn = useMemo(() => {
        if (!loyaltySettings || !loyaltySettings.is_active) return 0;

        let baseValue = cartSubtotal;
        if (loyaltySettings.calculation_base === 'PAID') {
            baseValue = cartTotal;
        }

        let points = baseValue * loyaltySettings.conversion_factor;

        if (loyaltySettings.rounding_rule === 'ROUND') {
            return Math.round(points);
        } else {
            return Math.floor(points);
        }
    }, [cartSubtotal, cartTotal, loyaltySettings]);

    const handleRedeemPoints = async () => {
        if (!loyaltySettings || !isLoggedIn || loyaltyBalance <= 0) return;

        // Validar limites
        if (loyaltyBalance < loyaltySettings.min_points_redemption) {
            alert({
                title: 'Pontos Insuficientes',
                message: `O resgate mínimo é de ${loyaltySettings.min_points_redemption} pontos.`
            });
            return;
        }

        // Calcular desconto máximo permitido
        const maxDiscount = (cartSubtotal * loyaltySettings.max_discount_percentage) / 100;

        // Simular resgate (1 ponto = 1 real? Preciso confirmar a regra de conversão de resgate. 
        // No checkout do admin não defini a taxa de resgate, assumi 1:1 para simplificar no SQL se não houver campo específico.
        // Na verdade, no redeem_loyalty_points do SQL o discount_value é passado.
        // Vou assumir 1 ponto = 1 real (ou usar uma constante se o lojista configurar - mas não adicionei esse campo).
        // Vou considerar 1 ponto = 1 Real por padrão.

        let redeemed = loyaltyBalance;
        let discount = redeemed; // 1:1

        if (discount > maxDiscount) {
            discount = maxDiscount;
            redeemed = Math.ceil(discount); // Se 1:1
        }

        if (discount > cartSubtotal) {
            discount = cartSubtotal;
            redeemed = Math.ceil(discount);
        }

        const confirmed = await confirm({
            title: 'Resgatar Pontos',
            message: `Deseja usar ${redeemed} pontos para ganhar R$ ${discount.toFixed(2)} de desconto?`,
            confirmButtonText: 'Resgatar',
            cancelButtonText: 'Cancelar'
        });

        if (confirmed) {
            setPointsRedeemed(redeemed);
            setLoyaltyDiscountValue(discount);
        }
    };

    const handleRemoveLoyalty = () => {
        setPointsRedeemed(0);
        setLoyaltyDiscountValue(0);
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        if (!isLoggedIn) {
            setIsAuthModalOpen(true);
            return;
        }

        setIsApplyingCoupon(true);
        try {
            const res = await (cloud as any).validateCoupon(
                store!.id,
                couponCode.trim(),
                cartSubtotal,
                customerPhone
            );

            if (res.success && res.discount_value !== undefined) {
                setCouponDiscount(res.discount_value);
                setAppliedCoupon(couponCode.trim());
                alert({
                    title: 'Cupom Aplicado! 🎫',
                    message: res.message || `Desconto de R$ ${res.discount_value.toFixed(2)} aplicado com sucesso.`
                });
            } else {
                alert({
                    title: 'Cupom Inválido',
                    message: res.message || 'Este cupom não pôde ser aplicado.'
                });
            }
        } catch (err) {
            console.error(err);
            alert({ title: 'Erro', message: 'Erro ao validar cupom.' });
        } finally {
            setIsApplyingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setCouponDiscount(0);
        setAppliedCoupon(null);
        setCouponCode('');
    };

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
        const isCommissionPlan = store?.super_store_plan_type === 'COMISSAO';
        const isPlatformEnabled = store?.receive_orders_via_platform || isCommissionPlan;

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
                const orderItems = cart.map(item => {
                    const addonsPriceValue = (item.selectedAddons || []).reduce((s, a) => Number(s) + (Number(a.optionPrice) * Number(a.quantity)), 0);
                    const basePrice = cloud.getProductPrice(item.product, item.sizePrice);

                    return {
                        product_id: item.product.id,
                        name: item.product.name + (item.selectedSize ? ` (${item.selectedSize})` : ''),
                        quantity: Number(item.quantity),
                        unit_price: basePrice,
                        total_price: (basePrice + addonsPriceValue) * Number(item.quantity),
                        observation: item.observation,
                        image_url: item.product.image_url,
                        selected_addons: item.selectedAddons
                    };
                });

                // Validar PIX se selecionado (Apenas se NÃO for checkout online automatizado)
                const isOnlineCheckout = store?.config?.online_payments?.enabled;

                if (paymentMethod === 'PIX' && !isOnlineCheckout) {
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

                let currentWalletTxId = null;

                // --- HYBRID PAYMENT: RESERVA DE SALDO ---
                if (walletAmountToUse > 0) {
                    setIsWalletLoading(true);
                    try {
                        const { data: res, error: wErr } = await cloud.getClient().rpc('prepare_wallet_payment', {
                            p_user_id: (await cloud.getUserWithCache()).user?.id,
                            p_amount: walletAmountToUse,
                            p_description: `Pedido na loja ${store?.store_name || 'Ze Entregas'}`
                        });

                        if (wErr || !res?.success) {
                            throw new Error(res?.message || 'Erro ao reservar saldo na carteira.');
                        }

                        currentWalletTxId = res.transaction_id;
                        setWalletTransactionId(currentWalletTxId);
                    } catch (e: any) {
                        alert({ title: 'Erro de Saldo', message: e.message });
                        setIsSubmitting(false);
                        setIsWalletLoading(false);
                        return;
                    } finally {
                        setIsWalletLoading(false);
                    }
                }

                const { success, orderId, error } = await (cloud.createPublicOrder as any)(
                    store!.id,
                    orderItems,
                    cartTotal,
                    paymentMethod,
                    shippingAddress,
                    deliveryType,
                    customerName,
                    customerPhone,
                    isPixActive, // Sempre true se for PIX e tiver chave
                    orderObservation,
                    pointsRedeemed,
                    loyaltyDiscountValue,
                    appliedCoupon || '',
                    couponDiscount
                );

                if (success && orderId) {
                    // Success!
                    setCheckoutTotal(cartTotal);
                    setCart([]);
                    setPointsRedeemed(0);
                    setLoyaltyDiscountValue(0);
                    setIsCartOpen(false);

                    // Salvar nos pedidos recentes
                    const updatedRecent = [orderId, ...recentOrders.filter(id => id !== orderId)].slice(0, 10);
                    setRecentOrders(updatedRecent);
                    localStorage.setItem(`ze_recent_orders_${store!.id}`, JSON.stringify(updatedRecent));

                    // AUTOMATED CHECKOUT LOGIC (Mercado Pago / InfinitePay)
                    // Prioriza o gateway marcado como "Principal" no Admin da Plataforma
                    if (store?.config?.online_payments?.enabled) {
                        try {
                            const onlineConfig = store.config.online_payments;

                            // Buscar gateway principal (configurado no admin da plataforma)
                            const primaryGateway = paymentGateways.find(g => g.is_primary && g.is_active);

                            // Determinar qual gateway usar:
                            let gateway: string | null = null;

                            if (primaryGateway) {
                                // Se o gateway principal for MP ou InfinitePay, e a loja aceitar pagamentos on-line da plataforma
                                if (primaryGateway.gateway_name === 'mercadopago' || primaryGateway.gateway_name === 'infinitepay') {
                                    gateway = primaryGateway.gateway_name;
                                }
                            }

                            // Fallback legado se não houver um principal definido ou ativo
                            if (!gateway) {
                                gateway = onlineConfig.accept_mercadopago ? 'mercadopago' : (onlineConfig.accept_infinitepay ? 'infinitepay' : null);
                            }

                            // Se o gateway principal for 'pix' (estático), ele NÃO entra no fluxo de redirecionamento,
                            // mas o handleCheckout deve saber disso para não tentar criar checkout externo.
                            const isPixGatewayPrimary = primaryGateway?.gateway_name === 'pix';

                            if (gateway) {
                                if (gateway === 'mercadopago') {
                                    // Novo fluxo via Orders API (MP)
                                    await alert({
                                        title: 'Processando...',
                                        message: 'Gerando pagamento via Mercado Pago. Aguarde.',
                                    });

                                    const checkoutRes = await cloud.createOrderCheckout(gateway, {
                                        amount: cartTotal,
                                        items: orderItems,
                                        payer: {
                                            name: customerName,
                                            phone: customerPhone,
                                            email: 'cliente@zeentregas.com'
                                        },
                                        processing_mode: 'automatic',
                                        metadata: { orderId }
                                    });

                                    // Lógica de Redirecionamento: Sempre prioriza a URL do Checkout do Gateway se retornar
                                    if (checkoutRes.success) {
                                        if (checkoutRes.url) {
                                            window.location.href = checkoutRes.url;
                                            return;
                                        }

                                        // Fallback para rastreamento interno se houver apenas QR Code (fluxo legado ou configuração específica)
                                        if (checkoutRes.qrCode) {
                                            await alert({
                                                title: 'Pagamento Gerado',
                                                message: 'O pagamento on-line foi gerado com sucesso. Finalize o pagamento agora para que a loja receba seu pedido.'
                                            });
                                            window.location.href = `/track/${orderId}`;
                                            return;
                                        }
                                    }
                                    throw new Error(checkoutRes.error || 'Erro ao gerar pagamento MP');
                                } else if (gateway === 'infinitepay') {
                                    // Fluxo InfinitePay
                                    await alert({
                                        title: 'Processando...',
                                        message: 'Gerando pagamento via InfinitePay. Aguarde.',
                                    });

                                    const checkoutRes = await cloud.createOrderCheckout(gateway, {
                                        orderId,
                                        amount: cartTotal,
                                        items: orderItems,
                                        payer: {
                                            name: customerName,
                                            phone: customerPhone,
                                            email: 'cliente@zeentregas.com'
                                        },
                                        back_urls: {
                                            success: `${window.location.origin}/track/${orderId}`,
                                            failure: `${window.location.origin}/track/${orderId}`,
                                            pending: `${window.location.origin}/track/${orderId}`
                                        },
                                        auto_return: 'approved'
                                    });

                                    if (checkoutRes.success) {
                                        if (checkoutRes.url) {
                                            window.location.href = checkoutRes.url;
                                            return;
                                        }

                                        if (checkoutRes.qrCode) {
                                            await alert({
                                                title: 'Pagamento Gerado',
                                                message: 'O pagamento via InfinitePay foi gerado com sucesso.'
                                            });
                                            window.location.href = `/track/${orderId}`;
                                            return;
                                        }
                                    }
                                    throw new Error(checkoutRes.error || 'Erro ao gerar checkout InfinitePay');
                                }
                            }
                        } catch (e: any) {
                            console.error('Auto checkout error:', e);
                            await alert({
                                title: 'Erro no Pagamento',
                                message: e.message || 'Ocorreu um erro ao processar o pagamento.'
                            });
                        }
                    }

                    // FALLBACK: Lógica de PIX (Automático vs Manual) ou redirecionamento padrão
                    if (paymentMethod === 'PIX') {
                        // Se o gateway principal for 'pix' (estático da plataforma) OU se a loja tem seu próprio PIX ativo
                        // e não redirecionamos para MP/InfinitePay acima.
                        if (store?.config?.pixdata?.enabled || (paymentGateways.find(g => g.gateway_name === 'pix' && g.is_active)?.is_active)) {
                            setCreatedOrderId(orderId);
                            setIsPixModalOpen(true);
                        } else {
                            // --- CONFIRMAR SALDO SE FOR PIX MANUAL (Sem Webhook) ---
                            if (currentWalletTxId) {
                                await cloud.getClient().rpc('confirm_wallet_payment', { p_transaction_id: currentWalletTxId });
                                setWalletTransactionId(null);
                            }

                            await alert({
                                title: 'Pedido Recebido com Sucesso! 🎉',
                                message: `Seu pedido #${orderId.slice(0, 8).toUpperCase()} foi registrado.\n\nComo o pagamento selecionado foi PIX (Manual), por favor, combine o pagamento diretamente com a loja.\n\nVocê será redirecionado para o rastreamento.`
                            });
                            window.location.href = `/track/${orderId}`;
                        }
                    } else {
                        // --- CONFIRMAR SALDO PARA OUTROS MÉTODOS (Dinheiro/Cartão na entrega etc) ---
                        if (currentWalletTxId) {
                            await cloud.getClient().rpc('confirm_wallet_payment', { p_transaction_id: currentWalletTxId });
                            setWalletTransactionId(null);
                        }

                        await alert({
                            title: 'Pedido Recebido com Sucesso! 🎉',
                            message: `Seu pedido #${orderId.slice(0, 8).toUpperCase()} foi enviado para a loja.\n\nVocê será redirecionado para a tela de rastreamento.`
                        });
                        window.location.href = `/track/${orderId}`;
                    }
                } else {
                    throw error || new Error('Falha ao criar pedido');
                }

            } catch (err: any) {
                console.error(err);

                // --- ESTORNO DE SALDO EM CASO DE FALHA NO PEDIDO ---
                if (walletTransactionId || (walletAmountToUse > 0)) {
                    const txId = walletTransactionId;
                    if (txId) {
                        await cloud.getClient().rpc('cancel_wallet_payment', { p_transaction_id: txId });
                        setWalletTransactionId(null);
                    }
                }

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
                const addonsPriceValue = (item.selectedAddons || []).reduce((s, a) => Number(s) + (Number(a.optionPrice) * Number(a.quantity)), 0);
                const basePrice = cloud.getProductPrice(item.product, item.sizePrice);
                msg += `• ${item.quantity}x ${item.product.name}\n`;
                if (item.selectedAddons && item.selectedAddons.length > 0) {
                    item.selectedAddons.forEach(addon => {
                        msg += `  + ${addon.quantity}x ${addon.optionName}\n`;
                    });
                }
                msg += `  Subtotal: R$ ${((basePrice + addonsPriceValue) * item.quantity).toFixed(2).replace('.', ',')}\n`;
                if (item.observation) msg += `  Obs: ${item.observation}\n`;
            });

            msg += `\n--------------------------------\n`;
            msg += `*FINANCEIRO:*\n`;
            msg += `Subtotal: R$ ${cartSubtotal.toFixed(2).replace('.', ',')}\n`;
            if (couponDiscount > 0) {
                msg += `Cupom (${appliedCoupon}): -R$ ${couponDiscount.toFixed(2).replace('.', ',')}\n`;
            }
            if (loyaltyDiscountValue > 0) {
                msg += `Fidelidade: -R$ ${loyaltyDiscountValue.toFixed(2).replace('.', ',')}\n`;
            }

            if (deliveryType === 'DELIVERY') {
                const fee = typeof deliveryFee === 'number' ? deliveryFee : 0;
                msg += `Entrega: R$ ${fee.toFixed(2).replace('.', ',')}\n`;
                msg += `*TOTAL: R$ ${cartTotal.toFixed(2).replace('.', ',')}*\n`;
                msg += `--------------------------------\n\n`;

                msg += `*DADOS DE ENTREGA:*\n`;
                msg += `*Tipo:* Entrega em Domicilio\n`;
                msg += `*Ender:* ${addressStreet}, ${addressNumber}\n`;
                if (addressComplement) msg += `*Comp:* ${addressComplement}\n`;

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


    // --- COMPUTED DATA ---

    const isStoreOpen = useMemo(() => {
        if (!store) return false;
        return getStoreOpenState({
            openingHours: store.opening_hours,
            manualStatus: store.is_open,
            manualOverride: store.manual_override
        }).isOpen;
    }, [store]);

    const selectedProductPromoPrice = useMemo(() => {
        if (!selectedProduct) return 0;
        return cloud.getProductPrice(selectedProduct, currentPrice);
    }, [selectedProduct, currentPrice]);

    const selectedProductHasPromo = useMemo(() => {
        if (!selectedProduct) return false;
        return !!(selectedProduct.ativo && selectedProductPromoPrice !== currentPrice);
    }, [selectedProduct, selectedProductPromoPrice, currentPrice]);

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
    const preparationLabel = formatMinuteRange(store?.preparation_time_min, store?.preparation_time_max) || formatMinutes(store?.preparation_time);
    const deliveryLabel = formatMinuteRange(deliverySettings?.delivery_time_min, deliverySettings?.delivery_time_max);

    // --- RENDER ---

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-50 dark:bg-gray-950 flex items-center justify-center">
                <div className="flex items-center gap-3 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
                    <span>Carregando cardápio...</span>
                </div>
            </div>
        );
    }

    if (error || !store) {
        return (
            <div className="min-h-screen bg-neutral-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
                    <AlertCircle className="w-10 h-10 text-red-500 mb-3 mx-auto" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{error || 'Loja não encontrada'}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Tente novamente em alguns instantes.</p>
                    <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
                </div>
            </div>
        );
    }

    // Groupping Products - REMOVED (Handled by useMemo above)
    // const categories = Array.from(new Set(products.map(p => p.category || 'Outros'))).sort();

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-gray-950 pb-24 md:pb-0 text-gray-900 dark:text-white">
            {/* --- FIXED NAVBAR --- */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-gray-200/70 dark:border-gray-800/80 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Logo className="h-8 w-auto" onClick={() => window.location.href = '/'} />

                    </div>
                    <div className="flex-1 max-w-lg mx-auto hidden md:block">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                            <input type="text" className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 rounded-full text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder-gray-400 text-gray-900 dark:text-white" placeholder="Buscar no cardápio..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {recentOrders.length > 0 && (
                            <button
                                onClick={() => setIsRecentOrdersModalOpen(true)}
                                className="flex items-center gap-2 p-2.5 sm:px-4 sm:py-2 rounded-full border border-gray-200/70 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 transition-colors"
                                title="Acompanhar Meus Pedidos"
                            >
                                <ClipboardList className="w-5 h-5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline text-xs font-semibold">Acompanhar Pedido</span>
                            </button>
                        )}
                        <button onClick={() => setIsCartOpen(true)} className="relative flex-shrink-0 bg-gray-900 text-white hover:bg-gray-800 p-2.5 rounded-full transition-colors">
                            <ShoppingBag className="w-5 h-5" />
                            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
                        </button>
                    </div>
                </div>
                <div className="md:hidden px-4 pb-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-400" /></div>
                        <input type="text" className="block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 rounded-full text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder-gray-400 text-gray-900 dark:text-white" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="border-t border-gray-200/70 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 py-2.5">
                    <div className="container mx-auto px-4 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth snap-x">
                        {categories.map(cat => (<button key={cat} onClick={() => setSelectedCategoryFilter(cat)} className={`snap-start px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap transition-all border ${selectedCategoryFilter === cat ? 'bg-gray-900 text-white border-gray-900 shadow-sm' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200/70 dark:border-gray-800 hover:border-gray-300'}`}>{cat}</button>))}
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
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl border border-white/80 dark:border-gray-800 bg-white/90 dark:bg-gray-900 shadow-sm ring-1 ring-black/5 overflow-hidden flex-shrink-0">
                        {store.store_logo_url ? (
                            <img src={store.store_logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                <StoreIcon className="w-8 h-8 text-gray-400" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left text-gray-900 dark:text-white mb-2 z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-center md:justify-start gap-2 mb-2">
                            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 md:text-white dark:text-white">
                                {store.store_name || store.name}
                            </h1>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider self-center md:self-auto ${isStoreOpen ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}`}>
                                {isStoreOpen ? 'Aberto' : 'Fechado'}
                            </span>
                        </div>

                        {store.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 max-w-2xl leading-relaxed">
                                {store.description}
                            </p>
                        )}

                        <div className="mt-6 bg-white/90 dark:bg-gray-900/70 border border-gray-200/70 py-2 px-2 rounded-xl flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                            {store.average_rating !== undefined && (
                                <div
                                    onClick={() => {
                                        if (store.show_comments_on_menu && (store.ratings_count || 0) > 0) {
                                            setIsReviewsModalOpen(true);
                                        } else {
                                            setIsRatingModalOpen(true);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200 border border-gray-200/70 dark:border-gray-800 px-3 py-1.5 rounded-full backdrop-blur shadow-sm cursor-pointer hover:border-amber-300 transition-colors"
                                >
                                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    <span>{store.average_rating ? store.average_rating.toFixed(1).replace('.', ',') : 'Novo'}</span>
                                    {(store.ratings_count || 0) > 0 && (
                                        <span className="text-gray-400 font-medium">({store.ratings_count})</span>
                                    )}
                                </div>
                            )}
                            {store.opening_hours && (
                                <div className="flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200 border border-gray-200/70 dark:border-gray-800 px-3 py-1.5 rounded-full backdrop-blur shadow-sm">
                                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-300" /> {store.opening_hours}
                                </div>
                            )}
                            {preparationLabel && (
                                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/60 px-3 py-1.5 rounded-full shadow-sm">
                                    <ChefHat className="w-4 h-4" />
                                    Preparo: {preparationLabel}
                                </div>
                            )}
                            {(canDeliver || canPickup) && (
                                <div className="flex items-center gap-2 flex-nowrap">
                                    {canDeliver && (
                                        <div className="flex items-center gap-1.5 bg-gray-900 text-white border border-gray-900 px-3 py-1.5 rounded-full shadow-sm">
                                            <Bike className="w-4 h-4 text-white" />
                                            Entrega
                                        </div>
                                    )}
                                    {canPickup && (
                                        <div className="flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-200 border border-brand-200/60 dark:border-brand-800/50 px-3 py-1.5 rounded-full shadow-sm">
                                            <StoreIcon className="w-4 h-4" /> Retirada
                                        </div>
                                    )}
                                </div>
                            )}
                            {canDeliver && deliveryLabel && (
                                <div className="flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200 border border-gray-200/70 dark:border-gray-800 px-3 py-1.5 rounded-full backdrop-blur shadow-sm">
                                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                                    {deliveryLabel}
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/70 text-gray-700 dark:text-gray-200 border border-gray-200/70 dark:border-gray-800 px-3 py-1.5 rounded-full backdrop-blur shadow-sm">
                                <StoreIcon className="w-4 h-4 text-gray-500 dark:text-gray-300" /> {products.length} itens
                            </div>


                            {/* Botão de Avaliação Unificado */}
                            <div
                                onClick={() => setIsRatingModalOpen(true)}
                                className="flex items-center gap-1.5 bg-white/90 dark:bg-gray-900/70 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 px-3 py-1.5 rounded-full cursor-pointer hover:border-amber-300 transition-colors shadow-sm"
                            >
                                <Star className="w-4 h-4 fill-current" />
                                <span className="font-bold">Avaliar</span>
                            </div>

                            {/* Botão Ver Avaliações - Se habilitado pelo lojista */}
                            {store.show_comments_on_menu && (store.ratings_count || 0) > 0 && (
                                <div
                                    onClick={() => setIsReviewsModalOpen(true)}
                                    className="flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-200 border border-brand-200/60 dark:border-brand-800/60 px-3 py-1.5 rounded-full cursor-pointer hover:bg-brand-100 transition-colors shadow-sm"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="font-bold">Ver Avaliações</span>
                                </div>
                            )}

                            {/* Botão Falar com a Loja */}
                            <div
                                onClick={() => {
                                    window.history.pushState({}, '', `/${citySlug}/${storeSlug}/chat`);
                                    window.dispatchEvent(new CustomEvent('popstate'));
                                    window.dispatchEvent(new CustomEvent('pushstate_changed'));
                                }}
                                className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-full cursor-pointer hover:bg-gray-800 transition-colors shadow-sm"
                            >
                                <MessageCircle className="w-4 h-4" />
                                <span className="font-bold">Falar com a Loja</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-10">

                {/* --- PRODUCT LIST (Full Width) --- */}
                <div className="space-y-8">
                    {/* Active Sections Loop */}
                    {activeSections.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
                                <Search className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200">Nenhum produto encontrado.</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tente outro termo ou categoria.</p>
                                <Button variant="outline" className="mt-5" onClick={() => { setSearchTerm(''); setSelectedCategoryFilter('Todos'); }}>
                                    Limpar Filtros
                                </Button>
                            </div>
                        </div>
                    ) : (
                        activeSections.map(cat => (
                            <div key={cat} className="scroll-mt-32">
                                <h2 className="text-lg md:text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-5 flex items-center gap-3">
                                    <span className="w-2 h-2 bg-brand-500 rounded-full" />
                                    <span>{cat}</span>
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                    {filteredProducts.filter(p => (p.category || 'Outros') === cat).map(product => (
                                        <div
                                            key={product.id}
                                            className="group relative bg-white/90 dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/70 dark:border-gray-800 hover:border-gray-300 transition-all flex gap-4 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5"
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
                                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-brand-600 transition-colors line-clamp-2">{product.name}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">{product.description}</p>
                                                    {product.ativo && product.preco_promocional !== null && product.preco_promocional !== undefined ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-xs text-gray-400 line-through">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base font-black text-red-600 dark:text-red-400">R$ {product.preco_promocional.toFixed(2).replace('.', ',')}</span>
                                                                <span className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-[10px] px-1.5 py-0.5 rounded-lg font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-0.5">
                                                                    <Zap className="w-2.5 h-2.5 fill-red-600 dark:fill-red-400" /> Promoção
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-base font-semibold text-brand-600 dark:text-brand-400">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                                                    )}
                                                </div>

                                                {product.image_url ? (
                                                    <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-200/70 dark:border-gray-800">
                                                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    </div>
                                                ) : (
                                                    <div className="w-24 h-24 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-200/70 dark:border-gray-800">
                                                        <ShoppingBag className="w-7 h-7 text-gray-300" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Quick Add Button - Explicit '+' separate from card click */}
                                            <button
                                                disabled={!isStoreOpen}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenAddonModal(product);
                                                }}
                                                className={`absolute bottom-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm z-10 ${!isStoreOpen
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-900 hover:text-white'
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
                        className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center font-semibold text-sm">
                                {cart.reduce((acc, i) => acc + i.quantity, 0)}
                            </div>
                            <span className="font-bold">Ver Carrinho</span>
                        </div>
                        <span className="font-semibold text-lg">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                    </button>
                </div>
            )}


            {/* --- PRODUCT PREVIEW MODAL --- */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 sm:p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
                    <div className="relative bg-white/95 dark:bg-gray-900 w-full max-w-md rounded-t-[24px] md:rounded-[28px] border border-gray-200/70 dark:border-gray-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 flex flex-col max-h-[90vh]">

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
                                <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white leading-tight mb-2">{selectedProduct.name}</h3>
                                <div className="flex items-center gap-3">
                                    {selectedProductHasPromo ? (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs text-gray-400 line-through">R$ {currentPrice.toFixed(2).replace('.', ',')}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-black text-red-600 dark:text-red-400">R$ {selectedProductPromoPrice.toFixed(2).replace('.', ',')}</span>
                                                <span className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-lg font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-0.5">
                                                    <Zap className="w-3 h-3 fill-red-600 dark:fill-red-400" /> Promoção
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xl font-semibold text-brand-600">R$ {currentPrice.toFixed(2).replace('.', ',')}</span>
                                    )}
                                    {selectedProduct.category && <span className="bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider border border-gray-200/70 dark:border-gray-800">{selectedProduct.category}</span>}
                                </div>
                            </div>
 
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">{selectedProduct.description}</p>
 
                            {/* Size Selection */}
                            {selectedProduct.has_sizes && selectedProduct.available_sizes && selectedProduct.available_sizes.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-3">Escolha o Tamanho</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedProduct.available_sizes.map(size => {
                                            const isSelected = selectedSize === size;
                                            const price = selectedProduct.price_by_size?.[size];
                                            
                                            // Pré-cálculo da promoção para a variação de tamanho
                                            const pPrice = price !== undefined ? cloud.getProductPrice(selectedProduct, price) : undefined;
                                            const hasP = !!(selectedProduct.ativo && price !== undefined && pPrice !== price);
 
                                            const buttonClass = isSelected
                                                ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                                : 'border-gray-200/70 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300';

                                            return (
                                                <button
                                                    key={size}
                                                    onClick={() => {
                                                        setSelectedSize(size);
                                                        if (price !== undefined) setCurrentPrice(price);
                                                    }}
                                                    className={`px-4 py-2 rounded-xl border-2 transition-all text-sm font-bold flex items-center gap-2 ${buttonClass}`}
                                                >
                                                    <span>{size}</span>
                                                    {price !== undefined && pPrice !== undefined && (
                                                        <span className={`text-xs font-normal ${isSelected ? 'text-brand-600' : 'text-gray-400'} flex flex-col items-end`}>
                                                            {hasP && <span className="line-through text-[10px] text-gray-400">R$ {price.toFixed(2).replace('.', ',')}</span>}
                                                            <span>R$ {pPrice.toFixed(2).replace('.', ',')}</span>
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="mb-8">
                                <label className="block text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 mb-2">Alguma observação?</label>
                                <textarea
                                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none"
                                    placeholder="Ex: Sem cebola, ponto da carne..."
                                    rows={3}
                                    value={productObservation}
                                    onChange={e => setProductObservation(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl p-1">
                                    <button
                                        onClick={() => setProductQuantity(Math.max(1, productQuantity - 1))}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                                    ><Minus className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                                    <span className="w-9 text-center font-semibold text-base">{productQuantity}</span>
                                    <button
                                        onClick={() => setProductQuantity(productQuantity + 1)}
                                        className="w-10 h-10 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                                    ><Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" /></button>
                                </div>
                                <Button
                                    fullWidth
                                    disabled={!isStoreOpen}
                                    className={`py-4 text-base rounded-xl shadow-sm ${!isStoreOpen ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed shadow-none' : 'shadow-brand-500/20'}`}
                                    onClick={() => handleOpenAddonModal(selectedProduct)}
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
                    <div className="relative w-full max-w-lg bg-white/95 dark:bg-gray-900 h-full border-l border-gray-200/70 dark:border-gray-800 shadow-2xl animate-in slide-in-from-right flex flex-col">

                        {/* Header */}
                        <div className="p-5 border-b border-gray-200/70 dark:border-gray-800 flex items-center justify-between">
                            <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Finalizar Pedido</h2>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 rounded-full border border-gray-200/70 dark:border-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 transition-colors"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4">

                            {/* Review Items */}
                            <section>
                                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Seus Itens</h3>
                                <div className="space-y-4">
                                    {cart.length === 0 && (
                                        <div className="border border-dashed border-gray-200/80 dark:border-gray-800 rounded-xl p-6 text-center bg-white/70 dark:bg-gray-900/60">
                                            <ShoppingBag className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Seu carrinho está vazio.</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Adicione produtos para continuar.</p>
                                            <button
                                                onClick={() => setIsCartOpen(false)}
                                                className="mt-4 text-xs font-semibold text-gray-700 dark:text-gray-200 border border-gray-200/70 dark:border-gray-800 px-3 py-1.5 rounded-full hover:border-gray-300 transition-colors"
                                            >
                                                Voltar ao cardápio
                                            </button>
                                        </div>
                                    )}
                                    {cart.map(item => (
                                        <div key={item.id} className="flex gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200/70 dark:border-gray-800 shadow-sm">
                                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200/70 dark:border-gray-800">
                                                {item.product.image_url ? <img src={item.product.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-gray-400" /></div>}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">{item.product.name}{item.selectedSize ? ` (${item.selectedSize})` : ''}</h4>
                                                    {(() => {
                                                        const basePrice = cloud.getProductPrice(item.product, item.sizePrice);
                                                        const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + (a.optionPrice * a.quantity), 0);
                                                        return (
                                                            <span className="font-semibold text-sm flex-shrink-0 ml-2">R$ {((basePrice + addonsPrice) * item.quantity).toFixed(2).replace('.', ',')}</span>
                                                        );
                                                    })()}
                                                </div>
                                                {item.selectedAddons && item.selectedAddons.length > 0 && (
                                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase font-bold tracking-wider space-y-0.5">
                                                        {item.selectedAddons.map(a => (
                                                            <div key={a.optionId}>+ {a.quantity}x {a.optionName}</div>
                                                        ))}
                                                    </div>
                                                )}
                                                {item.observation && <p className="text-xs text-gray-500 mt-1 italic">Obs: {item.observation}</p>}

                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-lg p-0.5">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded-md transition-all"><Minus className="w-4 h-4 text-gray-600 dark:text-gray-400" /></button>
                                                        <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded-md transition-all"><Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" /></button>
                                                    </div>
                                                    <button onClick={() => removeFromCart(item.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {cart.length > 0 && (
                                        <button onClick={clearCart} className="w-full py-3 text-xs font-semibold text-white bg-brand-600 hover:text-white rounded-xl hover:bg-brand-700 transition-all ">
                                            Limpar Carrinho
                                        </button>
                                    )}
                                </div>
                            </section>

                            {/* Order Observation */}
                            <section className='bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200/70 dark:border-gray-800 shadow-sm'>
                                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2 block">Observação do Pedido</label>
                                <textarea
                                    value={orderObservation}
                                    onChange={e => setOrderObservation(e.target.value)}
                                    placeholder="Ex: Campainha não funciona, deixar na portaria..."
                                    className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none resize-none border border-gray-200/70 dark:border-gray-800 font-medium text-gray-900 dark:text-white placeholder-gray-400"
                                    rows={2}
                                />
                            </section>

                            <div className="h-px bg-gray-100 dark:bg-gray-800" />

                            {/* Coupon Section */}
                            <section className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200/70 dark:border-gray-800 shadow-sm space-y-3">
                                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Ticket className="w-3 h-3" /> Cupom de Desconto
                                </h3>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                            placeholder="Digite seu cupom"
                                            disabled={!!appliedCoupon || isApplyingCoupon}
                                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none uppercase font-bold"
                                        />
                                        {appliedCoupon && (
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            </div>
                                        )}
                                    </div>
                                    {appliedCoupon ? (
                                        <button
                                            onClick={handleRemoveCoupon}
                                            className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors border border-red-100"
                                        >
                                            Remover
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={!couponCode.trim() || isApplyingCoupon}
                                            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-sm"
                                        >
                                            {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                                        </button>
                                    )}
                                </div>
                                {appliedCoupon && (
                                    <p className="text-[10px] text-green-600 font-bold uppercase tracking-wider animate-in fade-in">
                                        Desconto de R$ {couponDiscount.toFixed(2).replace('.', ',')} aplicado!
                                    </p>
                                )}
                            </section>

                            <div className="h-px bg-gray-100 dark:bg-gray-800" />

                            {/* Identification */}
                            <section className="space-y-4 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200/70 dark:border-gray-800 shadow-sm">
                                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Identificação</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomInput label="Seu Nome" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Seu nome" />
                                    <CustomInput label="Seu Telefone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(00) 00000-0000" mask="phone" />
                                </div>
                            </section>

                            {/* Delivery Options - CONDITIONAL RENDERING */}
                            <section className="space-y-4  bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200/70 dark:border-gray-800 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Entrega ou Retirada</h3>
                                </div>

                                {/* Calculate Availability */}
                                {(() => {
                                    const canDeliver = deliverySettings?.is_own_delivery_enabled || deliverySettings?.is_partner_delivery_enabled;
                                    const canPickup = deliverySettings?.is_pickup_enabled;

                                    // 1. Both Available: Show Tabs
                                    if (canDeliver && canPickup) {
                                        return (
                                            <div className="space-y-3">
                                                <MobileTabsSelect
                                                    value={deliveryType}
                                                    onChange={(val) => setDeliveryType(val as 'DELIVERY' | 'PICKUP')}
                                                    options={[
                                                        { value: 'DELIVERY', label: 'Entrega' },
                                                        { value: 'PICKUP', label: 'Retirada' }
                                                    ]}
                                                    label="Entrega ou retirada"
                                                    className="md:hidden"
                                                />
                                                <div className="hidden md:grid grid-cols-2 p-1 bg-gray-50 dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-xl mb-4 relative">
                                                    {/* Tabs Indicator Background */}
                                                    <div
                                                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700 rounded-lg border border-gray-200/70 dark:border-gray-700 shadow-sm transition-all duration-300 ease-in-out ${deliveryType === 'PICKUP' ? 'left-[calc(50%+2px)]' : 'left-1'
                                                            }`}
                                                    />

                                                    <button
                                                        onClick={() => setDeliveryType('DELIVERY')}
                                                        className={`relative z-10 p-2.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${deliveryType === 'DELIVERY' ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                                            }`}
                                                    >
                                                        <Bike className="w-4 h-4" /> Entrega
                                                    </button>

                                                    <button
                                                        onClick={() => setDeliveryType('PICKUP')}
                                                        className={`relative z-10 p-2.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${deliveryType === 'PICKUP' ? 'text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                                            }`}
                                                    >
                                                        <StoreIcon className="w-4 h-4" /> Retirada
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // 2. Only Delivery
                                    if (canDeliver && !canPickup) {
                                        return (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 border border-gray-200/70 dark:border-gray-800 rounded-xl flex items-center justify-center gap-2 font-semibold mb-4">
                                                <Bike className="w-5 h-5" />
                                                <span>Apenas Entrega Disponível</span>
                                            </div>
                                        );
                                    }

                                    // 3. Only Pickup
                                    if (!canDeliver && canPickup) {
                                        return (
                                            <div className="p-3 bg-gray-50 dark:bg-gray-900/40 text-gray-700 dark:text-gray-200 border border-gray-200/70 dark:border-gray-800 rounded-xl flex items-center justify-center gap-2 font-semibold mb-4">
                                                <StoreIcon className="w-5 h-5" />
                                                <span>Apenas Retirada na Loja</span>
                                            </div>
                                        );
                                    }

                                    // 4. None (Should not happen if store is active, but fallback)
                                    return (
                                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-center font-semibold mb-4 border border-red-100">
                                            Momentaneamente indisponível
                                        </div>
                                    );
                                })()}

                                {canPickup && deliveryType === 'PICKUP' && (
                                    <div className="space-y-2 animate-in fade-in p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/70 dark:border-gray-800 text-center shadow-sm">
                                        <div className="w-11 h-11 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-2 border border-gray-200/70 dark:border-gray-800">
                                            <MapPin className="w-6 h-6 text-gray-500" />
                                        </div>
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Retirar na Loja</h4>
                                        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                            {(store?.store_address_street || store?.address_street) && <p>{`${store.store_address_street || store.address_street}, ${store.store_address_number || store.address_number}`}</p>}
                                            {(store?.store_address_district || store?.address_district) && <p>{store.store_address_district || store.address_district}</p>}
                                            {(store?.store_address_city || store?.city) && <p>{`${store.store_address_city || store.city} - ${store.store_address_state || store.address_state}`}</p>}
                                        </div>
                                        {store?.phone_number && (
                                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 mt-4 flex justify-center">
                                                <a
                                                    href={`tel:${store.phone_number.replace(/\D/g, '')}`}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full font-semibold text-xs hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                                                >
                                                    <Phone className="w-4 h-4" />
                                                    <span>Ligar: {store.phone_number}</span>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {canDeliver && deliveryType === 'DELIVERY' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 relative">
                                        {isLoadingAddress && (
                                            <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/20 p-2 rounded-lg animate-pulse mb-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Buscando seu endereço salvo...</span>
                                            </div>
                                        )}
                                        {!isLoadingAddress && isLoggedIn && !addressStreet && (
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400 italic mb-2">
                                                Campos podem ser preenchidos manualmente se necessário.
                                            </div>
                                        )}

                                        {/* Rua - StreetSearchSelect */}
                                        <div className="col-span-2">
                                            <StreetSearchSelect
                                                city={store.store_address_city || store.city || ''}
                                                value={addressStreet}
                                                onSelect={setAddressStreet}
                                                label="Rua"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <CustomInput label="Número" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="123" />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <CustomInput label="Complemento" value={addressComplement} onChange={e => setAddressComplement(e.target.value)} placeholder="Apto, Bloco" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {deliverySettings?.own_delivery_mode === 'NEIGHBORHOOD' ? (
                                                <SelectPersonalizado
                                                    label="Bairro (Taxa de Entrega)"
                                                    value={selectedNeighborhoodId}
                                                    onChange={val => setSelectedNeighborhoodId(val as string)}
                                                    options={[
                                                        { label: 'Selecione o bairro...', value: '' },
                                                        ...fees.map(fee => ({
                                                            label: `${fee.neighborhood_name} (+ R$ ${fee.fee.toFixed(2)})`,
                                                            value: fee.id
                                                        }))
                                                    ]}
                                                />
                                            ) : (
                                                <CustomInput label="Bairro" value={addressNeighborhood} onChange={e => setAddressNeighborhood(e.target.value)} placeholder="Seu bairro" />
                                            )}
                                        </div>

                                        <CustomInput label="Ponto de Referência" value={addressReference} onChange={e => setAddressReference(e.target.value)} placeholder="Próximo a..." />
                                    </div>
                                )}
                            </section>

                            <div className="h-px bg-gray-100 dark:bg-gray-800" />

                            {/* Payment Section (Hidden if Online Checkout via Platform is active) */}
                            {!store?.receive_orders_via_platform ? (
                                <section className="space-y-4 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200/70 dark:border-gray-800 shadow-sm">
                                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Pagamento</h3>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {/* PIX logic updated for coexistence */}
                                        {(store?.config?.pixdata?.enabled || (store?.receive_orders_via_platform && store?.config?.online_payments?.enabled)) && (
                                            <button
                                                onClick={() => setPaymentMethod('PIX')}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2 ${paymentMethod === 'PIX' ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-200' : 'border-gray-200/70 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                            >
                                                <QrCode className="w-6 h-6" />
                                                <span className="text-xs font-semibold">PIX</span>
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setPaymentMethod('CREDIT_CARD')}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2 ${paymentMethod === 'CREDIT_CARD' ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-200' : 'border-gray-200/70 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        >
                                            <CreditCard className="w-6 h-6" />
                                            <span className="text-xs font-semibold">Cartão</span>
                                        </button>

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
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2 ${paymentMethod === 'CASH' ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-200' : 'border-gray-200/70 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        >
                                            <Banknote className="w-6 h-6" />
                                            <span className="text-xs font-semibold">Dinheiro</span>
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
                            ) : (
                                <section className="space-y-4 p-4 bg-brand-50/50 dark:bg-brand-900/10 rounded-2xl border border-brand-100/50 dark:border-brand-900/30">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[11px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest flex items-center gap-2">
                                            <ShieldCheck className="w-3 h-3" /> Pagamento On-line
                                        </h3>
                                        <div className="px-2 py-0.5 bg-brand-100 dark:bg-brand-900/30 rounded-full">
                                            <span className="text-[9px] font-black text-brand-700 dark:text-brand-300 uppercase">
                                                {(() => {
                                                    const primary = paymentGateways.find(g => g.is_primary && g.is_active);
                                                    if (primary?.gateway_name === 'mercadopago') return 'Mercado Pago';
                                                    if (primary?.gateway_name === 'infinitepay') return 'InfinitePay';
                                                    if (primary?.gateway_name === 'pix') return 'PIX Estático';
                                                    return 'Seguro';
                                                })()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {/* PIX On-line - Sempre disponível se houver qualquer gateway da plataforma ativo */}
                                        {paymentGateways.some(g => g.is_active) && (
                                            <button
                                                onClick={() => setPaymentMethod('PIX')}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2 ${paymentMethod === 'PIX' ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-200' : 'border-gray-200/70 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:border-brand-200 hover:bg-white dark:hover:bg-gray-800/50'}`}
                                            >
                                                <QrCode className="w-5 h-5" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">PIX On-line</span>
                                            </button>
                                        )}

                                        {/* Cartão On-line - Só aparece se o gateway principal NÃO for PIX Estático */}
                                        {(() => {
                                            const primary = paymentGateways.find(g => g.is_primary && g.is_active);
                                            const isAutomated = primary?.gateway_name === 'mercadopago' || primary?.gateway_name === 'infinitepay';
                                            const canShowCard = store?.config?.online_payments?.enabled || store?.receive_orders_via_platform;

                                            if (!isAutomated || !canShowCard) return null;

                                            return (
                                                <button
                                                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2 ${paymentMethod === 'CREDIT_CARD' ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-200' : 'border-gray-200/70 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:border-brand-200 hover:bg-white dark:hover:bg-gray-800/50'}`}
                                                >
                                                    <CreditCard className="w-5 h-5" />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider">Cartão On-line</span>
                                                </button>
                                            );
                                        })()}
                                    </div>

                                    <p className="text-[10px] text-brand-700/70 dark:text-brand-300/70 leading-relaxed italic text-center px-2">
                                        {paymentMethod === 'PIX'
                                            ? `O pagamento será processado via PIX ${paymentGateways.find(g => g.is_primary && g.is_active)?.gateway_name === 'pix' ? 'Estático' : 'Automático'}.`
                                            : `A transação será processada com segurança via ${paymentGateways.find(g => g.is_primary)?.gateway_name === 'mercadopago' ? 'Mercado Pago' : (paymentGateways.find(g => g.is_primary)?.gateway_name === 'infinitepay' ? 'InfinitePay' : 'Gateway Seguro')}.`}
                                    </p>
                                </section>
                            )}


                            {/* Personal Balance (Wallet) - Hybrid Payment UI */}
                            {isLoggedIn && personalBalance > 0 && (
                                <section className="animate-in fade-in slide-in-from-bottom-2">
                                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Wallet className="w-3 h-3" /> Carteira Pessoal (ZéBank)
                                    </h3>
                                    <div className={`p-4 rounded-2xl border transition-all ${usePersonalBalance ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-900/10' : 'bg-white dark:bg-gray-800 border-gray-200/70 dark:border-gray-700'} shadow-sm`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${usePersonalBalance ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                                    <DollarSign className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Saldo Disponível</p>
                                                    <p className="text-base font-black text-gray-900 dark:text-white leading-tight">R$ {personalBalance.toFixed(2).replace('.', ',')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">{usePersonalBalance ? 'Usando' : 'Usar'}</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={usePersonalBalance}
                                                        onChange={(e) => setUsePersonalBalance(e.target.checked)}
                                                    />
                                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                                                </label>
                                            </div>
                                        </div>
                                        {usePersonalBalance && (
                                            <div className="mt-3 pt-3 border-t border-brand-100 dark:border-brand-900/30 flex items-center justify-between">
                                                <p className="text-[10px] text-brand-700 dark:text-brand-300 font-medium">
                                                    Valor a descontar: <strong>- R$ {walletAmountToUse.toFixed(2).replace('.', ',')}</strong>
                                                </p>
                                                {walletAmountToUse < grossTotal && (
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                                                        Residual: R$ {cartTotal.toFixed(2).replace('.', ',')}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Loyalty Points */}
                            {loyaltySettings?.is_active && (
                                <section className="animate-in fade-in slide-in-from-bottom-2">
                                    <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Award className="w-3 h-3" /> Programa de Fidelidade
                                    </h3>

                                    {!isLoggedIn ? (
                                        <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/30 p-4 rounded-xl text-center">
                                            <p className="text-xs text-brand-800 dark:text-brand-300 mb-2">Faça login para acumular e resgatar pontos!</p>
                                            <button
                                                onClick={() => setIsAuthModalOpen(true)}
                                                className="text-[10px] font-black uppercase text-brand-600 hover:underline"
                                            >
                                                Entrar ou Cadastrar
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700 rounded-2xl p-4 shadow-sm space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-brand-100 text-brand-600 rounded-xl flex items-center justify-center">
                                                        <Zap className="w-5 h-5 fill-current" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Seu Saldo</p>
                                                        <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">{loyaltyBalance} pontos</p>
                                                    </div>
                                                </div>

                                                {pointsRedeemed > 0 ? (
                                                    <button
                                                        onClick={handleRemoveLoyalty}
                                                        className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-wider flex items-center gap-1"
                                                    >
                                                        <X className="w-3 h-3" /> Remover
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={handleRedeemPoints}
                                                        disabled={loyaltyBalance < (loyaltySettings?.min_points_redemption || 0)}
                                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${loyaltyBalance >= (loyaltySettings?.min_points_redemption || 0)
                                                            ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700'
                                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        Resgatar
                                                    </button>
                                                )}
                                            </div>

                                            {pointsRedeemed > 0 && (
                                                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-xl flex items-center gap-3 animate-in zoom-in-95">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                                                        <strong>- R$ {loyaltyDiscountValue.toFixed(2).replace('.', ',')}</strong> aplicado com sucesso!
                                                    </p>
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                    <Info className="w-3 h-3" />
                                                    Nesse pedido você ganhará <strong>{pointsToEarn} pontos</strong>
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}

                        </div>

                        {/* Sticky Checkout Footer */}
                        <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-200/70 dark:border-gray-800 shadow-[0_-8px_20px_rgba(0,0,0,0.04)] z-20">
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Subtotal</span>
                                    <span>R$ {cartSubtotal.toFixed(2).replace('.', ',')}</span>
                                </div>
                                {deliveryType === 'DELIVERY' && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Entrega</span>
                                        {deliveryFee === 0 ? (
                                            <span className="font-semibold text-green-600 flex items-center">
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
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200/70 dark:border-gray-800">
                                    <span className="font-medium text-gray-900 dark:text-white">Total</span>
                                    <div className="text-right">
                                        {loyaltyDiscountValue > 0 && (
                                            <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1 animate-in slide-in-from-right-2">
                                                - R$ {loyaltyDiscountValue.toFixed(2).replace('.', ',')} (PONTOS)
                                            </div>
                                        )}
                                        {couponDiscount > 0 && (
                                            <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1 animate-in slide-in-from-right-2">
                                                - R$ {couponDiscount.toFixed(2).replace('.', ',')} (CUPOM: {appliedCoupon})
                                            </div>
                                        )}
                                        {walletAmountToUse > 0 && (
                                            <div className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-1 animate-in slide-in-from-right-2">
                                                - R$ {walletAmountToUse.toFixed(2).replace('.', ',')} (CARTEIRA)
                                            </div>
                                        )}
                                        <div className="flex flex-col items-end">
                                            <span className="font-semibold text-2xl text-gray-900 dark:text-white leading-tight">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                                            {walletAmountToUse > 0 && cartTotal > 0 && (
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Valor Restante no {paymentMethod === 'PIX' ? 'PIX' : 'Cartão'}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            onClick={handleCheckout}
                            className={`mb-6 w-[calc(100%-32px)] max-w-[300px] mx-auto block rounded-xl py-4 text-base shadow-sm ${!isStoreOpen || isSubmitting ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
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
            )}

            {/* Pix Payment Modal */}
            {
                isPixModalOpen && createdOrderId && (store?.config?.pixdata || store?.pix_key) && (
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
                )
            }


            {/* Comments Section */}
            {
                store.show_comments_on_menu && (
                    <div className="container mx-auto px-4 py-12 border-t border-gray-200/70 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Avaliações da Loja</h2>
                                <p className="text-sm text-gray-500">O que nossos clientes estão dizendo</p>
                            </div>
                            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                <span className="text-lg font-bold text-amber-700 dark:text-amber-400">
                                    {store.average_rating ? store.average_rating.toFixed(1).replace('.', ',') : '0,0'}
                                </span>
                            </div>
                        </div>

                        <CommentsList storeId={store.id} showComments={store.show_comments_on_menu} />
                    </div>
                )
            }
            {
                isRatingModalOpen && store && (
                    <StoreRatingModal
                        isOpen={isRatingModalOpen}
                        onClose={() => setIsRatingModalOpen(false)}
                        storeId={store.id}
                        storeName={store.store_name || store.name}
                        onRatingSuccess={() => loadStoreData()}
                    />
                )
            }

            {
                isRecentOrdersModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsRecentOrdersModalOpen(false)} />
                        <div className="relative bg-white dark:bg-gray-900 w-full max-w-sm rounded-2xl border border-gray-200/70 dark:border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in-95">
                            <div className="p-5 border-b border-gray-200/70 dark:border-gray-800 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Meus Pedidos</h3>
                                <button onClick={() => setIsRecentOrdersModalOpen(false)} className="p-2 rounded-full border border-gray-200/70 dark:border-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-5 space-y-3 max-h-[400px] overflow-y-auto">
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
                                            className="w-full p-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl border border-gray-200/70 dark:border-gray-800 flex items-center justify-between transition-all group"
                                        >
                                            <div className="text-left">
                                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Pedido</p>
                                                <p className="font-semibold text-gray-900 dark:text-white">#{id.slice(0, 8).toUpperCase()}</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
                                        </button>
                                    ))
                                )}
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                                <p className="text-[10px] text-center text-gray-400 font-medium uppercase tracking-widest">Apenas pedidos feitos via plataforma</p>
                            </div>
                        </div>
                    </div>
                )
            }

            <ShippingRulesModal
                isOpen={isRulesModalOpen}
                onClose={() => setIsRulesModalOpen(false)}
                rules={shippingRules}
            />

            <AuthRequiredModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
            />

            {
                isAddonModalOpen && selectedProduct && (
                    <ProductAddonSelector
                        isOpen={isAddonModalOpen}
                        onClose={() => setIsAddonModalOpen(false)}
                        product={selectedProduct}
                        addonGroup={selectedProductAddonGroup}
                        onConfirm={handleConfirmAddons}
                        initialAddons={currentEditingCartItemId ? cart.find(i => i.id === currentEditingCartItemId)?.selectedAddons : []}
                    />
                )
            }

            {/* Modal de Avaliações Detalhado */}
            {
                isReviewsModalOpen && store && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsReviewsModalOpen(false)} />
                        <div className="relative bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[28px] border border-gray-200/70 dark:border-gray-800 shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
                            <div className="p-6 border-b border-gray-200/70 dark:border-gray-800 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Avaliações da Loja</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center gap-1 text-amber-500">
                                            <Star className="w-4 h-4 fill-current" />
                                            <span className="font-bold text-sm">{store.average_rating ? store.average_rating.toFixed(1) : '0.0'}</span>
                                        </div>
                                        <span className="text-gray-400 text-xs">•</span>
                                        <span className="text-gray-500 text-xs font-medium">{store.ratings_count || 0} avaliações</span>
                                    </div>
                                </div>
                                <button onClick={() => setIsReviewsModalOpen(false)} className="p-2.5 rounded-full border border-gray-200/70 dark:border-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                <CommentsList storeId={store.id} showComments={store.show_comments_on_menu} />
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200/70 dark:border-gray-800 flex justify-center">
                                <button
                                    onClick={() => {
                                        setIsReviewsModalOpen(false);
                                        setIsRatingModalOpen(true);
                                    }}
                                    className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
                                >
                                    Deixar minha avaliação
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
};
