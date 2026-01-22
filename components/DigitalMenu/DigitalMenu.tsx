
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, ChevronLeft, Minus, Plus, X, MapPin, Clock, Phone, Search, Store as StoreIcon, AlertCircle, ShoppingCart, Bike, Trash2, ArrowRight, CheckCircle } from 'lucide-react';
import * as cloud from '../../services/cloud';
import { PartnerProfile, StoreProduct, StoreDeliverySettings, StoreNeighborhoodFee } from '../../types';
import { Logo } from '../Logo';
import { Button } from '../Button';
import { CustomInput } from '../CustomInput';
import { CitySearchSelect } from '../CitySearchSelect';
import { CityStreetSelect } from '../CityStreetSelect';
import { Loader2, CreditCard, Banknote, QrCode } from 'lucide-react'; // Added icons for payment

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
    const [error, setError] = useState<string | null>(null);

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartRestored, setCartRestored] = useState(false);

    // Product Modal State
    const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
    const [productQuantity, setProductQuantity] = useState(1);
    const [productObservation, setProductObservation] = useState('');

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

            const [prods, settingsData, feesData] = await Promise.all([
                cloud.getPublicStoreProducts(storeData.id),
                cloud.getPublicDeliverySettings(storeData.id),
                cloud.getPublicNeighborhoodFees(storeData.id)
            ]);

            setProducts(prods);
            setDeliverySettings(settingsData);
            setFees(feesData);

            // Initialize selectedCity with store city
            if (storeData.store_address_city || storeData.city) {
                setSelectedCity({
                    name: storeData.store_address_city || storeData.city,
                    state: storeData.store_address_state || storeData.address_state || 'UF',
                    id: 'store-auto'
                });
            }

            // Set default delivery type based on settings
            if (settingsData) {
                if (settingsData.is_own_delivery_enabled || settingsData.is_partner_delivery_enabled) {
                    setDeliveryType('DELIVERY');
                } else if (settingsData.is_pickup_enabled) {
                    setDeliveryType('PICKUP');
                }
            }

        } catch (err) {
            console.error(err);
            setError('Erro ao carregar cardápio.');
        } finally {
            setLoading(false);
        }
    };

    // --- CART PERSISTENCE ---
    // Restore cart on store load
    useEffect(() => {
        if (store?.id && !cartRestored) {
            try {
                const saved = localStorage.getItem(`ze_cart_${store.id}`);
                if (saved) {
                    setCart(JSON.parse(saved));
                }
            } catch (e) {
                console.error("Failed to restore cart", e);
            }
            setCartRestored(true);
        }
    }, [store?.id, cartRestored]);

    // Save cart on change
    useEffect(() => {
        if (store?.id && cartRestored) {
            localStorage.setItem(`ze_cart_${store.id}`, JSON.stringify(cart));
        }
    }, [cart, store?.id, cartRestored]);

    // --- CART LOGIC ---
    const addToCart = (productOverride?: StoreProduct) => {
        const prod = productOverride || selectedProduct;
        const qty = productOverride ? 1 : productQuantity;
        const obs = productOverride ? '' : productObservation;

        if (!prod) return;
        const item: CartItem = {
            id: crypto.randomUUID(),
            product: prod,
            quantity: qty,
            observation: obs
        };
        setCart(prev => [...prev, item]);

        if (!productOverride) {
            setSelectedProduct(null);
            setProductQuantity(1);
            setProductObservation('');
        }
        // Reform: Don't open cart automatically
        // setIsCartOpen(true); 
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const clearCart = () => {
        if (confirm('Tem certeza que deseja limpar o carrinho?')) {
            setCart([]);
            setIsCartOpen(false);
        }
    };

    const updateQuantity = (id: string, delta: number) => {
        /* ... */
        // Render Section Changes (in next chunk or multi if possible, but let's try to fit)

        // Header fix: The user said background is white on mobile.
        // The current code has:
        // <div className="flex-1 text-center md:text-left text-white md:text-gray-900 md:dark:text-white mb-2">
        // <h1 ... text-white drop-shadow ... md:text-gray-900 ...>
        // Since the cover is h-40 and profile info is -mt-12, the text is appearing OVER the cover image on mobile usually.
        // However, if the cover is missing or user scrolls, or layout shifts...
        // User audio: "on mobile version, the background becomes white, so the name looks weird".
        // This implies the text is WHITE but background is WHITE.
        // I will change the text color logic to be Gray-900 on mobile unless it's explicitly over an image, but the overlap is tricky.
        // Better approach: Make the Store Name Container have a safe background or text color that works.
        // I'll ensure the text is dark on mobile if it's below the cover (which it is, loosely).
        // Actually, in the current DOM structure:
        // Container -mt-12. The avatar is -mt-12. The text is below/beside it.
        // On mobile (flex-col), the text is BELOW the avatar, which is overlapping the cover bottom.
        // So the text is likely explicitly on the white background part on mobile.
        // I will let the text be Gray-900 on mobile and White/Gray-900 on desktop as appropriate.

        // Changing only logic here might be invisible without full file view context for render.
        // I'll stick to logic updates first in this block if possible, but I need to touch JSX.
        // I will replace the logic functions and add clearCart first.

        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQ = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQ };
            }
            return item;
        }));
    };

    const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    const deliveryFee = useMemo(() => {
        if (deliveryType === 'PICKUP') return 0;
        if (!deliverySettings) return 0;

        // Prioridade: Entrega Própria -> Parceira (se implementado)
        if (deliverySettings.is_own_delivery_enabled) {
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

    const handleCheckout = () => {
        if (!customerName || !customerPhone) {
            alert('Por favor, informe seu nome e telefone.');
            return;
        }

        if (deliveryType === 'DELIVERY') {
            // Validate city is set (should be auto-set by Effect or manually if needed, but here we assume Store City is the target)
            // If we use locked city, we might not have 'selectedCity' state filled unless we init it.
            // Let's init selectedCity with store city on load? see below.
            if (!addressStreet || !addressNumber || !cep) {
                alert('Informe o endereço de entrega completo (CEP, Rua e Número).');
                return;
            }
            if (deliverySettings?.own_delivery_mode === 'NEIGHBORHOOD' && !selectedNeighborhoodId) {
                alert('Selecione seu bairro.');
                return;
            }
        }

        // Build WhatsApp Message
        let msg = `*Novo Pedido via Cardápio Digital* 🛍️\n\n`;
        msg += `*Cliente:* ${customerName}\n`;
        msg += `*Telefone:* ${customerPhone}\n\n`;

        msg += `*Pedido:*\n`;
        cart.forEach(item => {
            msg += `${item.quantity}x ${item.product.name} (R$ ${item.product.price.toFixed(2)})\n`;
            if (item.observation) msg += `   _Obs: ${item.observation}_\n`;
        });

        msg += `\n*Subtotal:* R$ ${cartSubtotal.toFixed(2)}\n`;

        if (deliveryType === 'DELIVERY') {
            msg += `*Entrega:* R$ ${deliveryFee.toFixed(2)}\n`;
            msg += `*Total:* R$ ${cartTotal.toFixed(2)}\n\n`;

            msg += `*📍 Endereço de Entrega:*\n`;
            msg += `CEP: ${cep}\n`;
            msg += `Cidade: ${selectedCity.name} - ${selectedCity.state}\n`;
            msg += `${addressStreet}, ${addressNumber}\n`;
            if (addressComplement) msg += `${addressComplement}\n`;
            if (addressReference) msg += `Ref: ${addressReference}\n`;

            if (deliverySettings?.own_delivery_mode === 'NEIGHBORHOOD') {
                const neighborhoodName = fees.find(f => f.id === selectedNeighborhoodId)?.neighborhood_name;
                if (neighborhoodName) msg += `Bairro: ${neighborhoodName}\n`;
            } else if (addressNeighborhood) {
                msg += `Bairro: ${addressNeighborhood}\n`;
            }

        } else {
            msg += `*Total:* R$ ${cartTotal.toFixed(2)}\n\n`;
            msg += `*🛑 Retirada no Local*\n`;
        }

        msg += `\n*Forma de Pagamento:* ${paymentMethod}\n`;
        if (paymentMethod === 'DINHEIRO' && changeFor) {
            msg += `Troco para: R$ ${changeFor}\n`;
        }

        const phone = store?.phone_number?.replace(/\D/g, '');
        if (phone) {
            const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
        } else {
            alert('Erro: Loja sem telefone configurado.');
        }
    };

    const isStoreOpen = store?.is_open ?? true;

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
            {/* --- HEADER --- */}
            <div className="relative bg-white dark:bg-gray-900 shadow-sm z-10">
                {/* Cover */}
                <div className="h-40 md:h-56 bg-gray-200 dark:bg-gray-800 overflow-hidden relative">
                    {store.cover_url ? (
                        <img src={store.cover_url} alt="Capa" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-brand-600 to-brand-800 opacity-20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                {/* Profile Info */}
                <div className="container mx-auto px-4 -mt-12 relative flex flex-col md:flex-row items-center md:items-end gap-4 pb-6">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-gray-900 bg-white dark:bg-gray-800 shadow-lg overflow-hidden flex-shrink-0">
                        {store.store_logo_url ? (
                            <img src={store.store_logo_url} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                                <StoreIcon className="w-8 h-8 text-gray-400" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left text-gray-900 dark:text-white md:dark:text-white mb-2 z-10">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white md:text-white md:drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                {store.store_name || store.name}
                            </h1>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${isStoreOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                {isStoreOpen ? 'Aberto' : 'Fechado'}
                            </span>
                        </div>

                        {store.description && (
                            <p className="hidden md:block text-gray-200 md:text-gray-100 dark:text-gray-400 mb-3 max-w-2xl text-sm leading-relaxed md:drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                                {store.description}
                            </p>
                        )}

                        {/* Mobile Description on White Background (Already handled below) */}

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-medium text-gray-600 dark:text-gray-400 md:text-gray-100">
                            {store.opening_hours && (
                                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 md:backdrop-blur-md md:bg-black/30 px-2.5 py-1.5 rounded-lg border border-transparent md:border-gray-500/30">
                                    <Clock className="w-4 h-4 text-brand-500 md:text-brand-300" /> {store.opening_hours}
                                </div>
                            )}
                            {deliverySettings && (
                                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 md:backdrop-blur-md md:bg-black/30 px-2.5 py-1.5 rounded-lg border border-transparent md:border-gray-500/30">
                                    <Bike className="w-4 h-4 text-brand-500 md:text-brand-300" />
                                    {deliverySettings.delivery_time_min}-{deliverySettings.delivery_time_max} min
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 md:backdrop-blur-md md:bg-black/30 px-2.5 py-1.5 rounded-lg border border-transparent md:border-gray-500/30">
                                <StoreIcon className="w-4 h-4 text-brand-500 md:text-brand-300" /> {products.length} itens
                            </div>
                        </div>

                        {/* Mobile Description on White Background */}
                        {store.description && (
                            <div className="md:hidden mt-4 bg-white dark:bg-gray-900 -mx-4 px-8 py-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed border-t border-gray-100 dark:border-gray-800">
                                {store.description}
                            </div>
                        )}
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCart(product);
                                                }}
                                                className="absolute bottom-4 right-4 w-10 h-10 bg-gray-100 dark:bg-gray-800 hover:bg-brand-600 hover:text-white rounded-full flex items-center justify-center transition-colors shadow-sm z-10"
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
                                    className="py-5 text-lg rounded-2xl shadow-xl shadow-brand-500/20"
                                    onClick={() => addToCart()} // Calling without args uses modal state
                                >
                                    Adicionar
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
                                                {item.product.image_url ? <img src={item.product.image_url} className="w-full h-full object-cover" /> : null}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{item.product.name}</h4>
                                                    <span className="font-bold text-sm">R$ {(item.product.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs text-gray-500">{item.quantity} un</span>
                                                    <button onClick={() => removeFromCart(item.id)} className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">
                                                        <Trash2 className="w-3 h-3" /> Remover
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

                            <div className="h-px bg-gray-100 dark:bg-gray-800" />

                            {/* Identification */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Identificação</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CustomInput label="Seu Nome" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Seu nome" />
                                    <CustomInput label="Seu Telefone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(00) 00000-0000" mask="phone" />
                                </div>
                            </section>

                            {/* Delivery Options */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Entrega</h3>

                                <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4">
                                    {deliverySettings?.is_pickup_enabled && (
                                        <button
                                            onClick={() => setDeliveryType('PICKUP')}
                                            className={`p-3 rounded-xl text-sm font-bold transition-all ${deliveryType === 'PICKUP' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500'}`}
                                        >
                                            <div className="flex items-center justify-center gap-2"><StoreIcon className="w-4 h-4" /> Retirar</div>
                                        </button>
                                    )}
                                    {(deliverySettings?.is_own_delivery_enabled || deliverySettings?.is_partner_delivery_enabled) && (
                                        <button
                                            onClick={() => setDeliveryType('DELIVERY')}
                                            className={`p-3 rounded-xl text-sm font-bold transition-all ${deliveryType === 'DELIVERY' ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-500'}`}
                                        >
                                            <div className="flex items-center justify-center gap-2"><Bike className="w-4 h-4" /> Entrega</div>
                                        </button>
                                    )}
                                </div>

                                {deliveryType === 'DELIVERY' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                        {/* CEP Search */}
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <CustomInput
                                                    label="CEP"
                                                    value={cep}
                                                    onChange={e => handleCepChange(e.target.value)}
                                                    placeholder="00000-000"
                                                    mask="cep"
                                                />
                                            </div>
                                            <div className="pb-1">
                                                {isLoadingCep ? <Loader2 className="w-6 h-6 animate-spin text-brand-500 mb-2" /> : <div className="w-6" />}
                                            </div>
                                        </div>

                                        {/* City (Locked to Store City) */}
                                        <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700 opacity-70 mb-4">
                                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Cidade (Loja)</label>
                                            <div className="font-bold text-gray-700 dark:text-gray-300">
                                                {store?.store_address_city || store?.city || 'Cidade da Loja'} - {store?.store_address_state || store?.address_state || 'UF'}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                                            <div className="md:col-span-3">
                                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 block">Nome da Rua</label>
                                                <CityStreetSelect
                                                    state={store?.store_address_state || store?.address_state || 'SP'}
                                                    city={store?.store_address_city || store?.city || ''}
                                                    value={addressStreet}
                                                    onSelect={(street) => {
                                                        if (street) {
                                                            setAddressStreet(street.logradouro);
                                                            setCep(street.cep);
                                                            setAddressNeighborhood(street.bairro);
                                                            // Auto-select city object to satisfy validation if needed
                                                            setSelectedCity({ name: street.localidade, state: street.uf, id: 'street-auto' });
                                                        } else {
                                                            setAddressStreet('');
                                                            // Don't clear city/cep aggressively
                                                        }
                                                    }}
                                                    placeholder="Digite o nome da rua..."
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-3">
                                            <CustomInput label="Número" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} placeholder="123" />
                                            <div className="col-span-2">
                                                <CustomInput label="CEP" value={cep} onChange={e => setCep(e.target.value)} placeholder="00000-000" mask="cep" />
                                            </div>
                                        </div>

                                        <CustomInput label="Complemento" value={addressComplement} onChange={e => setAddressComplement(e.target.value)} placeholder="Apto 101..." />
                                        <CustomInput label="Ponto de Referência" value={addressReference} onChange={e => setAddressReference(e.target.value)} placeholder="Próximo a..." />

                                        {deliverySettings?.own_delivery_mode === 'NEIGHBORHOOD' ? (
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 block uppercase tracking-wide">Bairro</label>
                                                <select
                                                    value={selectedNeighborhoodId}
                                                    onChange={e => setSelectedNeighborhoodId(e.target.value)}
                                                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all font-medium"
                                                >
                                                    <option value="">Selecione...</option>
                                                    {fees.map(fee => (
                                                        <option key={fee.id} value={fee.id}>{fee.neighborhood_name} (+ R$ {fee.fee.toFixed(2)})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <CustomInput label="Bairro" value={addressNeighborhood} onChange={e => setAddressNeighborhood(e.target.value)} placeholder="Seu bairro" />
                                        )}
                                    </div>
                                )}
                            </section>

                            <div className="h-px bg-gray-100 dark:bg-gray-800" />

                            {/* Payment */}
                            <section className="space-y-4">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Pagamento</h3>

                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setPaymentMethod('PIX')}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${paymentMethod === 'PIX' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <QrCode className="w-6 h-6" />
                                        <span className="text-xs font-bold">PIX</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('CARTAO')}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${paymentMethod === 'CARTAO' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <CreditCard className="w-6 h-6" />
                                        <span className="text-xs font-bold">Cartão</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('DINHEIRO')}
                                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${paymentMethod === 'DINHEIRO' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-600' : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                    >
                                        <Banknote className="w-6 h-6" />
                                        <span className="text-xs font-bold">Dinheiro</span>
                                    </button>
                                </div>

                                {paymentMethod === 'DINHEIRO' && (
                                    <div className="animate-in fade-in">
                                        <CustomInput label="Troco para quanto?" value={changeFor} onChange={e => setChangeFor(e.target.value)} placeholder="R$ 50,00" mask="currency" />
                                    </div>
                                )}
                            </section>

                        </div>

                        {/* Sticky Checkout Footer */}
                        <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                            <div className="flex justify-between items-center mb-4 text-sm">
                                <span className="text-gray-500 font-medium">Total com Entrega</span>
                                <span className="font-black text-2xl text-gray-900 dark:text-white">R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <Button
                                fullWidth
                                size="lg"
                                onClick={handleCheckout}
                                className={`rounded-2xl py-5 text-lg shadow-xl shadow-brand-500/20 ${!isStoreOpen ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                disabled={!isStoreOpen}
                            >
                                {isStoreOpen ? (
                                    <>Enviar Pedido no WhatsApp <ArrowRight className="w-5 h-5 ml-2" /></>
                                ) : (
                                    <>Loja Fechada</>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};
