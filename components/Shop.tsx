
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingBag, X, ArrowLeft, Plus, Minus, CreditCard, Barcode, QrCode, Copy, Check, Loader2, AlertTriangle, Search, Wallet, MapPin, ChevronRight, Star, Clock, Tag, Truck, Ticket, Heart, Zap, Shield } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Product, ShopSettings, CartItem, PaymentMethod, Order, Category } from '../types';
import { DataErrorDisplay } from './DataErrorDisplay';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { Skeleton } from './Skeleton';
import { useDialog } from '../utils/dialogService'; // Import useDialog



const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface ShopProps {
    cart: CartItem[];
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
    userLoggedIn: boolean;
}

const ShopSkeleton = () => (
    <div className="space-y-8 p-2">
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-40 rounded-full" />
            <Skeleton className="h-10 w-10" variant="circular" />
        </div>
        <Skeleton className="h-48 w-full rounded-3xl" />
        <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-28 rounded-full flex-shrink-0" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="space-y-3">
                    <Skeleton className="h-40 w-full rounded-3xl" />
                    <Skeleton variant="text" className="h-4 w-3/4" />
                    <Skeleton variant="text" className="h-4 w-1/2" />
                </div>
            ))}
        </div>
    </div>
);

export const Shop: React.FC<ShopProps> = ({ cart, setCart, userLoggedIn }) => {
    const [view, setView] = useState<'list' | 'checkout' | 'success'>('list');
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [settings, setSettings] = useState<ShopSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI States
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('all'); // 'all' or category_id
    const [productQuantity, setProductQuantity] = useState(1); // For the modal

    // Checkout State
    const [shippingAddress, setShippingAddress] = useState({
        name: '',
        cep: '',
        street: '',
        number: '',
        neighborhood: '',
        city: '',
        state: '',
        complement: '',
        reference: ''
    });
    // Remove paymentMethod state as InfinitePay handles it externally

    // Shipping Calculation
    const [calculatingShipping, setCalculatingShipping] = useState(false);
    const [shippingCost, setShippingCost] = useState<number | null>(null);
    const [shippingError, setShippingError] = useState('');

    // Coupon
    const [couponCode, setCouponCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(0); // Value in percentage (0-100) or amount? Let's use % from admin settings
    const [couponMessage, setCouponMessage] = useState('');



    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalOrder, setFinalOrder] = useState<Order | null>(null);

    // UI State for Cart Drawer
    const [isCartOpen, setIsCartOpen] = useState(false);



    const { alert } = useDialog(); // Use the custom dialog service

    const fetchShopData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await cloud.getShopData();
            setProducts(data.products || []);
            setCategories(data.categories || []);
            setSettings(data.settings || null);
        } catch (err: any) {
            // console.error('[Shop] Load Error:', err);
            setError("Não foi possível carregar a vitrine agora.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShopData();
    }, []);



    // --- ACTIONS ---

    const openProductModal = (product: Product) => {
        setSelectedProduct(product);
        setProductQuantity(1);
    };

    const addToCart = () => {
        if (!selectedProduct) return;
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.product.id === selectedProduct.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.product.id === selectedProduct.id
                        ? { ...item, quantity: Math.min(selectedProduct.stock_quantity || 999, item.quantity + productQuantity) }
                        : item
                );
            }
            return [...prevCart, { product: selectedProduct, quantity: productQuantity }];
        });
        setSelectedProduct(null);
        setIsCartOpen(true); // Open cart automatically
    };

    const updateCartQuantity = (productId: string, delta: number) => {
        setCart(prevCart => {
            const updated = prevCart.map(item => {
                if (item.product.id === productId) {
                    const product = products.find(p => p.id === productId);
                    const max = product?.stock_quantity || 999;
                    return { ...item, quantity: Math.min(max, Math.max(0, item.quantity + delta)) };
                }
                return item;
            }).filter(item => item.quantity > 0);
            return updated;
        });
    };

    // Calculations
    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0), [cart]);
    const discountAmount = useMemo(() => (subtotal * appliedDiscount) / 100, [subtotal, appliedDiscount]);
    const total = useMemo(() => {
        let t = subtotal - discountAmount;
        if (shippingCost !== null) t += shippingCost;
        return t;
    }, [subtotal, discountAmount, shippingCost]);

    const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);



    const handleCepChange = (val: string) => {
        let v = val.replace(/\D/g, '').substring(0, 8);
        if (v.length > 5) v = `${v.substring(0, 5)}-${v.substring(5, 8)}`;
        setShippingAddress(prev => ({ ...prev, cep: v }));
    };

    const calculateShipping = async () => {
        const cep = shippingAddress.cep.replace(/\D/g, '');
        if (cep.length !== 8) {
            setShippingError("CEP inválido");
            return;
        }
        if (!settings?.shipping_origin_cep) {
            // Se a loja não configurou CEP, frete fixo ou a combinar
            setShippingCost(15.00);
            return;
        }

        setCalculatingShipping(true);
        setShippingError('');
        setShippingCost(null);

        try {
            // 1. Fetch User Address from BrasilAPI
            const resUser = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
            if (!resUser.ok) throw new Error("CEP não encontrado");
            const dataUser = await resUser.json();

            // Auto-fill address parts
            setShippingAddress(prev => ({
                ...prev,
                street: dataUser.street || '',
                neighborhood: dataUser.neighborhood || '',
                city: dataUser.city || '',
                state: dataUser.state || ''
            }));

            // 2. Calculate Distance (Logic Simulation of Correios)
            // Use Nominatim to get coords for Origin and Dest
            const originCep = settings.shipping_origin_cep.replace(/\D/g, '');
            const resOrigin = await fetch(`https://brasilapi.com.br/api/cep/v2/${originCep}`);
            const dataOrigin = await resOrigin.json(); // Get city/state to help geocoding if needed, or just use CEP for geocode query

            // Geocode Origin
            const geoOriginRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${originCep}, Brazil&limit=1`);
            const geoOriginData = await geoOriginRes.json();

            // Geocode Dest
            const geoDestRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cep}, Brazil&limit=1`);
            const geoDestData = await geoDestRes.json();

            if (geoOriginData.length > 0 && geoDestData.length > 0) {
                const lat1 = parseFloat(geoOriginData[0].lat);
                const lon1 = parseFloat(geoOriginData[0].lon);
                const lat2 = parseFloat(geoDestData[0].lat);
                const lon2 = parseFloat(geoDestData[0].lon);

                // Haversine Distance (simplified "As the crow flies" for estimate)
                const R = 6371; // km
                const dLat = (lat2 - lat1) * Math.PI / 180;
                const dLon = (lon2 - lon1) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const d = R * c; // Distance in km

                // Pricing Logic (Simulation)
                // Base cost R$ 10.00 + R$ 0.50 per km
                let price = 10.00 + (d * 0.50);

                // Free shipping check
                if (settings.free_shipping_threshold && subtotal >= settings.free_shipping_threshold) {
                    price = 0;
                }

                setShippingCost(parseFloat(price.toFixed(2)));
            } else {
                // Fallback if geocoding fails
                setShippingCost(20.00); // Flat rate fallback
            }

        } catch (e: any) {
            // console.error(e);
            setShippingError("Erro ao calcular frete. Tente novamente.");
        } finally {
            setCalculatingShipping(false);
        }
    };

    const applyCoupon = () => {
        if (!settings?.coupons) return;
        const coupon = settings.coupons.find(c => c.code === couponCode.toUpperCase() && c.active);

        if (coupon) {
            setAppliedDiscount(coupon.discount_percent);
            setCouponMessage(`Desconto de ${coupon.discount_percent}% aplicado!`);
        } else {
            setAppliedDiscount(0);
            setCouponMessage('Cupom inválido ou expirado.');
        }
    };

    const handleFinalizeOrder = async () => {
        if (!userLoggedIn) {
            await alert({ title: "Login Necessário", message: "Você precisa estar logado para finalizar a compra." });
            return;
        }
        if (!shippingAddress.name.trim() || !shippingAddress.street.trim() || !shippingAddress.number.trim() || !shippingAddress.neighborhood.trim() || !shippingAddress.cep) {
            await alert({ title: "Endereço Incompleto", message: "Por favor, preencha todos os campos do endereço (Rua, Número, Bairro)." });
            return;
        }
        if (shippingCost === null) {
            await alert({ title: "Frete Não Calculado", message: "Calcule o frete antes de finalizar." });
            return;
        }

        if (!settings?.infinitepay_handle) {
            await alert({ title: "Erro de Configuração", message: "A loja não configurou o pagamento InfinitePay." });
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Create Order Locally
            const order = await cloud.createOrder({
                items: cart.map(item => ({ product_id: item.product.id, name: item.product.name, quantity: item.quantity, price: item.product.price })),
                total_price: total,
                payment_method: 'PENDING', // Will be updated by webhook
                shipping_address: shippingAddress,
                shipping_cost: shippingCost,
                discount: discountAmount,
                coupon_code: appliedDiscount > 0 ? couponCode : undefined
            });

            // 2. Generate InfinitePay Link
            const webhookUrl = "https://pjnxrqemjozlpnvoxpmn.supabase.co/functions/v1/infinitepay-webhook";
            const redirectUrl = window.location.origin + '?tab=shop&status=success_check&order_id=' + order.id;

            const checkoutData = await cloud.createInfinitePayCheckout(
                order.id,
                total,
                settings.infinitepay_handle,
                cart.map(i => ({
                    description: i.product.name,
                    quantity: i.quantity,
                    price: Math.round(i.product.price * 100)
                })),
                redirectUrl,
                webhookUrl
            );

            // 3. Redirect
            if (checkoutData.url) {
                window.location.href = checkoutData.url;
            } else {
                throw new Error("URL de pagamento não gerada.");
            }

        } catch (error: any) {
            await alert({ title: "Erro ao Criar Pedido", message: `Erro: ${error.message}` });
            setIsSubmitting(false); // Only stop loading on error, on success we redirect
        }
    };

    const copyToClipboard = async (text: string) => {
        navigator.clipboard.writeText(text);
        await alert({ title: "Copiado", message: "Copiado!" });
    };

    // Filter Products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeCategory === 'all' || p.category_id === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, activeCategory]);

    // --- RENDERERS ---

    if (loading) return <ShopSkeleton />;
    if (error) return (
        <div className="p-8">
            <DataErrorDisplay title="Lojinha Indisponível" message={error} onRetry={fetchShopData} />
        </div>
    );
    if (!settings?.is_shop_enabled) return <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400"><ShoppingBag className="w-12 h-12 mb-3 opacity-20" /><p>A loja está fechada no momento.</p></div>;

    // LIST VIEW (HOME)
    if (view === 'list') return (
        <div className="animate-in fade-in duration-500 pb-28">

            {/* Minimal Search Header */}
            <div className="sticky top-0 z-30 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-md pt-2 pb-2">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="O que você procura hoje?"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border-none rounded-3xl shadow-sm text-sm font-medium focus:ring-2 focus:ring-brand-500 dark:text-white outline-none"
                    />
                </div>
            </div>

            {/* Modern Promo Banner */}
            {!searchTerm && activeCategory === 'all' && (
                <div className="mt-6 mb-8 relative overflow-hidden rounded-[32px] bg-gray-900 text-white shadow-xl h-64 flex flex-col justify-end p-8 group cursor-pointer transition-transform hover:scale-[1.02]">
                    {/* Background Image/Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-orange-400 opacity-90"></div>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>

                    {/* Floating Elements */}
                    <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center gap-1">
                        <Zap className="w-3 h-3 fill-white" />
                        {settings?.banner_tag || 'Oferta'}
                    </div>

                    <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>

                    <div className="relative z-10">
                        <h2 className="text-3xl font-black leading-none mb-2 tracking-tight">{settings?.banner_title || 'Novidades'}</h2>
                        <p className="text-base text-brand-100 font-medium max-w-xs leading-snug">{settings?.banner_subtitle || 'Confira os melhores produtos.'}</p>

                        {settings?.free_shipping_threshold && (
                            <div className="mt-4 flex items-center gap-2 bg-white/10 w-fit px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm">
                                <Truck className="w-4 h-4 text-white" />
                                <span className="text-xs font-bold">Frete Grátis &gt; R$ {settings.free_shipping_threshold}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Sticky Categories Carousel */}
            <div className="sticky top-20 z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm py-4 -mx-4 px-4 mb-6">
                <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory px-2">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={`snap-start px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wide whitespace-nowrap transition-all duration-300 ${activeCategory === 'all' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 scale-105' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        Tudo
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`snap-start px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-wide whitespace-nowrap transition-all duration-300 ${activeCategory === cat.id ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30 scale-105' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum produto encontrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredProducts.map(p => (
                        <div
                            key={p.id}
                            onClick={() => openProductModal(p)}
                            className="group relative bg-white dark:bg-gray-800 rounded-[24px] p-3 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
                        >
                            {/* Image Container */}
                            <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-700 overflow-hidden relative mb-3">
                                <img src={p.images?.[0] || 'https://via.placeholder.com/200'} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />

                                {/* Heart / Favorite Button Simulation */}
                                <button className="absolute top-2 right-2 p-1.5 bg-white/50 backdrop-blur rounded-full text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                    <Heart className="w-4 h-4" />
                                </button>

                                {!p.is_active && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold uppercase tracking-widest border border-white/50 px-2 py-1 rounded">Esgotado</span>
                                    </div>
                                )}
                                {/* Add Button Overlay */}
                                {p.is_active && (
                                    <button className="absolute bottom-2 right-2 w-10 h-10 bg-white dark:bg-gray-900 text-black dark:text-white rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-300 hover:bg-brand-600 hover:text-white">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            {/* Info */}
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-tight mb-1 line-clamp-2">{p.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">{p.description}</p>
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-gray-900 dark:text-white text-base">{formatCurrency(p.price)}</span>
                                    {/* Mobile Add Button (Always Visible) */}
                                    <div className="md:hidden w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-900 dark:text-white">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Floating Cart Island */}
            {cartCount > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4 animate-in slide-in-from-bottom-20">
                    <button
                        onClick={() => setView('checkout')}
                        className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-2 pl-4 pr-2 rounded-full shadow-2xl flex items-center justify-between hover:scale-[1.02] transition-transform active:scale-95 border border-white/10 dark:border-gray-200"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <ShoppingBag className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-900 dark:border-white"></span>
                            </div>
                            <span className="font-bold text-sm">{cartCount} itens</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white/20 dark:bg-black/10 rounded-full px-4 py-2.5">
                            <span className="font-black text-sm">{formatCurrency(subtotal)}</span>
                            <ArrowLeft className="w-4 h-4 rotate-180" />
                        </div>
                    </button>
                </div>
            )}

            {/* Product Modal (Bottom Sheet) */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedProduct(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" />
                    <div
                        className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-t-[40px] sm:rounded-[40px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-20 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full z-20"></div>

                        <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 z-20 w-10 h-10 bg-white/50 dark:bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-gray-900 dark:text-white hover:bg-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative h-80 bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            <img src={selectedProduct.images?.[0]} className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-white dark:from-gray-900 to-transparent"></div>
                        </div>

                        <div className="px-8 pb-8 pt-2 overflow-y-auto bg-white dark:bg-gray-900">
                            <div className="flex justify-between items-start mb-2">
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white leading-tight">{selectedProduct.name}</h2>
                            </div>

                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-2xl font-medium text-brand-600 dark:text-brand-400">{formatCurrency(selectedProduct.price)}</span>
                                {selectedProduct.stock_quantity && selectedProduct.stock_quantity < 5 && (
                                    <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">Últimas unidades</span>
                                )}
                            </div>

                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8 font-medium">
                                {selectedProduct.description}
                            </p>
                            <div className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-800 p-2 rounded-2xl">
                                    <button
                                        onClick={() => setProductQuantity(q => Math.max(1, q - 1))}
                                        className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors ${productQuantity === 1 ? 'text-gray-300 dark:text-gray-600' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'}`}
                                        disabled={productQuantity === 1}
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="font-black text-xl w-8 text-center dark:text-white">{productQuantity}</span>
                                    <button
                                        onClick={() => setProductQuantity(q => Math.min(selectedProduct.stock_quantity || 99, q + 1))}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:scale-105 transition-transform"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>

                                <Button
                                    onClick={addToCart}
                                    disabled={!selectedProduct.is_active || (selectedProduct.stock_quantity !== null && selectedProduct.stock_quantity <= 0)}
                                    className="flex-1 py-5 rounded-2xl text-lg shadow-xl shadow-brand-500/20"
                                >
                                    Adicionar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Drawer - Novo Layout */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in cursor-pointer"
                        onClick={() => setIsCartOpen(false)}
                    />

                    {/* Drawer Panel */}
                    <div className="relative w-full max-w-lg bg-gray-50 dark:bg-gray-950 h-full shadow-2xl animate-in slide-in-from-right flex flex-col">

                        {/* Header */}
                        <div className="bg-white dark:bg-gray-900 px-6 py-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 flex-shrink-0 z-10">
                            <h2 className="text-xl font-black text-gray-900 dark:text-white">Seu Pedido ({cartCount})</h2>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Items List */}
                            {cart.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                    <ShoppingBag className="w-16 h-16 mb-4 text-gray-300" />
                                    <p className="font-bold">Seu carrinho está vazio</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map(item => (
                                        <div key={item.product.id} className="flex gap-4 bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                                            <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
                                                <img src={item.product.images?.[0]} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2">{item.product.name}</p>
                                                    <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.product.price * item.quantity)}</p>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <p className="text-xs text-gray-400">{formatCurrency(item.product.price)} un</p>
                                                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-2 py-1">
                                                        <button onClick={() => updateCartQuantity(item.product.id, -1)} className="p-1 text-gray-500 hover:text-red-500"><Minus className="w-3 h-3" /></button>
                                                        <span className="text-xs font-bold dark:text-white">{item.quantity}</span>
                                                        <button onClick={() => updateCartQuantity(item.product.id, 1)} className="p-1 text-gray-500 hover:text-green-500"><Plus className="w-3 h-3" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Delivery Form */}
                            {cart.length > 0 && (
                                <section>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> Entrega
                                    </h3>
                                    <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">

                                        {/* CEP Calculation Row */}
                                        <div className="flex gap-3">
                                            <div className="relative flex-1">
                                                <label className="absolute left-4 top-2 text-[10px] font-bold text-gray-400 uppercase">CEP</label>
                                                <input
                                                    type="tel"
                                                    value={shippingAddress.cep}
                                                    onChange={e => handleCepChange(e.target.value)}
                                                    className="w-full pt-6 pb-2 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                                    placeholder="00000-000"
                                                    maxLength={9}
                                                />
                                            </div>
                                            <Button onClick={calculateShipping} disabled={calculatingShipping} className="rounded-2xl px-5 h-auto text-xs shrink-0">
                                                {calculatingShipping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                                            </Button>
                                        </div>
                                        {shippingError && <p className="text-xs text-red-500 font-medium px-2">{shippingError}</p>}

                                        {/* Address Fields Grid */}
                                        <div className="space-y-3">
                                            {/* Rua */}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={shippingAddress.street}
                                                    onChange={e => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                                                    className="w-full py-4 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-gray-400"
                                                    placeholder="Rua / Avenida"
                                                />
                                            </div>

                                            {/* Number & Neighborhood */}
                                            <div className="flex gap-3">
                                                <div className="relative flex-1">
                                                    <input
                                                        type="text"
                                                        value={shippingAddress.number}
                                                        onChange={e => setShippingAddress({ ...shippingAddress, number: e.target.value })}
                                                        className="w-full py-4 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-gray-400"
                                                        placeholder="Número"
                                                    />
                                                </div>
                                                <div className="relative flex-[1.5]">
                                                    <input
                                                        type="text"
                                                        value={shippingAddress.neighborhood}
                                                        onChange={e => setShippingAddress({ ...shippingAddress, neighborhood: e.target.value })}
                                                        className="w-full py-4 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-gray-400"
                                                        placeholder="Bairro"
                                                    />
                                                </div>
                                            </div>

                                            {/* Complement & Reference */}
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={shippingAddress.complement}
                                                    onChange={e => setShippingAddress({ ...shippingAddress, complement: e.target.value })}
                                                    className="w-full py-4 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-gray-400"
                                                    placeholder="Complemento (Apto, Bloco...)"
                                                />
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={shippingAddress.reference}
                                                    onChange={e => setShippingAddress({ ...shippingAddress, reference: e.target.value })}
                                                    className="w-full py-4 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-gray-400"
                                                    placeholder="Ponto de Referência"
                                                />
                                            </div>

                                            {/* Name */}
                                            <div className="relative mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                                <label className="absolute left-4 top-6 text-[10px] font-bold text-gray-400 uppercase">Destinatário</label>
                                                <input
                                                    type="text"
                                                    value={shippingAddress.name}
                                                    onChange={e => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                                                    className="w-full pt-8 pb-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                                    placeholder="Nome de quem vai receber"
                                                />
                                            </div>

                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* Coupon */}
                            {cart.length > 0 && (
                                <section>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Ticket className="w-4 h-4" /> Cupom
                                    </h3>
                                    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                                        <Ticket className="w-5 h-5 text-purple-500" />
                                        <input
                                            type="text"
                                            placeholder="ADICIONAR CUPOM"
                                            value={couponCode}
                                            onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                            className="flex-1 bg-transparent text-sm font-bold outline-none uppercase placeholder:normal-case placeholder:font-medium text-gray-900 dark:text-white placeholder:text-gray-400"
                                        />
                                        <button onClick={applyCoupon} className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline px-2">
                                            APLICAR
                                        </button>
                                    </div>
                                    {couponMessage && <p className={`text-xs mt-2 px-4 font-bold ${appliedDiscount > 0 ? 'text-green-500' : 'text-red-500'}`}>{couponMessage}</p>}
                                </section>
                            )}
                        </div>

                        {/* Sticky Footer */}
                        {cart.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20 flex-shrink-0 safe-area-bottom">
                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    {shippingCost !== null && (
                                        <div className="flex justify-between text-sm text-gray-500">
                                            <span>Frete</span>
                                            <span className="text-gray-900 dark:text-white font-medium">{shippingCost === 0 ? 'Grátis' : formatCurrency(shippingCost)}</span>
                                        </div>
                                    )}
                                    {discountAmount > 0 && (
                                        <div className="flex justify-between text-sm text-green-500 font-bold">
                                            <span>Desconto</span>
                                            <span>- {formatCurrency(discountAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <span className="text-lg font-black text-gray-900 dark:text-white">Total</span>
                                        <span className="text-2xl font-black text-brand-600 dark:text-brand-400">{formatCurrency(total)}</span>
                                    </div>
                                </div>
                                <Button
                                    fullWidth
                                    onClick={handleFinalizeOrder}
                                    disabled={isSubmitting}
                                    className="py-4 rounded-2xl text-base shadow-xl shadow-brand-500/20"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Finalizar Pedido</div>}
                                </Button>
                                <div className="mt-3 text-center">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
                                        <Shield className="w-3 h-3" /> Pagamento 100% Seguro
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );



    // SUCCESS VIEW - (Handling Redirect Return)
    if (view === 'success' && finalOrder) return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 animate-in zoom-in-95">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] shadow-2xl w-full max-w-sm text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-brand-500"></div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Pedido Recebido!</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                    Seu pedido <span className="font-mono font-bold text-gray-900 dark:text-white">#{finalOrder.id.substring(0, 8)}</span> foi criado.
                </p>

                <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-800 dark:text-blue-300 text-sm font-medium">
                    Aguardando confirmação do pagamento. Você será notificado.
                </div>

                <Button onClick={() => { setView('list'); setCart([]); setFinalOrder(null); }} variant="outline" className="w-full py-4 rounded-2xl border-2">
                    Voltar para Loja
                </Button>
            </div >
        </div >
    );

    return null;
};
