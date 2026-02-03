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

interface DigitalMenuProps {
    citySlug: string;
    storeSlug: string;
}

interface CartItem {
    id: string;
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
    const [shippingRules, setShippingRules] = useState<StoreShippingRule[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [cartRestored, setCartRestored] = useState(false);

    // Product Modal State
    const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
    const [selectedProductAddonGroup, setSelectedProductAddonGroup] = useState<StoreAddonGroup | null>(null);
    const [isAddonModalOpen, setIsAddonModalOpen] = useState(false);
    const [currentEditingCartItemId, setCurrentEditingCartItemId] = useState<string | null>(null);

    // Checkout State
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryType, setDeliveryType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const { alert } = useDialog();

    useEffect(() => {
        loadStoreData();
    }, [citySlug, storeSlug]);

    const loadStoreData = async () => {
        setLoading(true);
        try {
            const storeData = await cloud.getStoreBySlug(citySlug, storeSlug);
            if (!storeData) {
                setError('Loja não encontrada.');
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
            setDeliverySettings(settingsData || null);
            setFees(feesData || []);
            setShippingRules(rulesData || []);
        } catch (err) {
            console.error(err);
            setError('Erro ao carregar cardápio.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAddonModal = async (product: StoreProduct, cartItemId?: string) => {
        const hasAddons = !!product.addon_group_id || (product.addon_options && product.addon_options.length > 0);
        if (!hasAddons) {
            addToCart(product, 1, []);
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
            setIsAddonModalOpen(true);
        } catch (error) {
            console.error("Erro ao carregar adicionais:", error);
        }
    };

    const addToCart = (product: StoreProduct, quantity: number, addons: any[]) => {
        setCart(prev => {
            const newItem: CartItem = {
                id: crypto.randomUUID(),
                product,
                quantity,
                selectedAddons: addons
            };
            return [...prev, newItem];
        });
    };

    const handleConfirmAddons = (selectedAddons: any[]) => {
        if (currentEditingCartItemId) {
            setCart(prev => prev.map(item =>
                item.id === currentEditingCartItemId ? { ...item, selectedAddons } : item
            ));
        } else if (selectedProduct) {
            addToCart(selectedProduct, 1, selectedAddons);
        }
        setIsAddonModalOpen(false);
        setCurrentEditingCartItemId(null);
    };

    const isStoreOpen = useMemo(() => {
        if (!store) return true;
        return getStoreOpenState({
            openingHours: store.opening_hours,
            isOpen: store.is_open,
            isCurrentlyOpen: store.is_currently_open
        }).isOpen;
    }, [store]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
        </div>
    );

    if (error) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900">{error}</h2>
            <Button className="mt-4" onClick={() => window.location.reload()}>Tentar Novamente</Button>
        </div>
    );

    const cartTotal = cart.reduce((sum, item) => {
        const addonsPrice = (item.selectedAddons || []).reduce((s, a) => s + (a.optionPrice * a.quantity), 0);
        return sum + ((item.product.price + addonsPrice) * item.quantity);
    }, 0);

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl overflow-hidden bg-slate-100 border border-slate-100 shadow-sm">
                            <img src={store?.store_logo_url || '/placeholder.png'} alt={store?.store_name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">{store?.store_name}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isStoreOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {isStoreOpen ? 'Aberto Agora' : 'Fechado'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setIsCartOpen(true)} className="relative p-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:scale-105 transition-all">
                        <ShoppingBag className="w-6 h-6" />
                        {cart.length > 0 && (
                            <span className="absolute -top-2 -right-2 w-6 h-6 bg-brand-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                                {cart.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map(product => (
                        <div key={product.id} className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-slate-100 hover:border-brand-500/30 transition-all group">
                            <div className="flex gap-4">
                                <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-50 flex-shrink-0 border border-slate-100">
                                    <img src={product.image_url || '/placeholder.png'} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 line-clamp-1">{product.name}</h4>
                                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-brand-600 font-black text-lg">R$ {product.price.toFixed(2).replace('.', ',')}</span>
                                        <button
                                            onClick={() => handleOpenAddonModal(product)}
                                            className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl hover:bg-brand-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isAddonModalOpen && selectedProduct && (
                <ProductAddonSelector
                    isOpen={isAddonModalOpen}
                    onClose={() => setIsAddonModalOpen(false)}
                    product={selectedProduct}
                    addonGroup={selectedProductAddonGroup}
                    onConfirm={handleConfirmAddons}
                    initialAddons={currentEditingCartItemId ? cart.find(i => i.id === currentEditingCartItemId)?.selectedAddons : []}
                />
            )}

            {isCartOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col rounded-l-[3rem]">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Seu Carrinho</h3>
                            <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-slate-100 rounded-2xl transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <ShoppingBag className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 font-medium">Seu carrinho está vazio</p>
                                </div>
                            ) : (
                                cart.map(item => {
                                    const itemAddonsPrice = (item.selectedAddons || []).reduce((s, a) => s + (a.optionPrice * a.quantity), 0);
                                    return (
                                        <div key={item.id} className="bg-slate-50 rounded-3xl p-4 flex gap-4">
                                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white border border-slate-200">
                                                <img src={item.product.image_url} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <h5 className="font-bold text-slate-800">{item.product.name}</h5>
                                                    <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))} className="text-red-400 hover:text-red-500">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                                                    {item.selectedAddons?.map(a => `${a.quantity}x ${a.optionName}`).join(', ')}
                                                </div>
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="font-black text-slate-900">R$ {(item.product.price + itemAddonsPrice).toFixed(2).replace('.', ',')}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-500 uppercase">Qtd: {item.quantity}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className="p-8 bg-slate-50/50 border-t border-slate-100 rounded-bl-[3rem]">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total</span>
                                <span className="text-3xl font-black text-slate-900 italic tracking-tighter">
                                    R$ {cartTotal.toFixed(2).replace('.', ',')}
                                </span>
                            </div>
                            <Button fullWidth className="py-5 rounded-3xl text-lg font-black tracking-tight" onClick={() => alert({ title: 'Checkout', message: 'Funcionalidade de checkout sendo integrada...' })}>
                                Finalizar Pedido <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
