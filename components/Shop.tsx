
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingBag, X, ArrowLeft, Plus, Minus, CreditCard, Barcode, QrCode, Copy, Check, Loader2, AlertTriangle, Search, Wallet, MapPin, ChevronRight, Star, Clock, Tag } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Product, ShopSettings, CartItem, PaymentMethod, Order, Category } from '../types';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { Skeleton } from './Skeleton';

// Declare globals from CDN scripts
declare const QRious: any;
declare const JsBarcode: any;

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

interface ShopProps {
    cart: CartItem[];
    setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
    userLoggedIn: boolean;
}

const ShopSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-24 rounded-full flex-shrink-0" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <Skeleton className="w-28 h-28 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-8 w-20 mt-4" />
                    </div>
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
    const [shippingAddress, setShippingAddress] = useState({ name: '', address: '' });
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
    
    // Credit Card State
    const [cardData, setCardData] = useState({
        number: '',
        holder: '',
        expiry: '',
        cvv: '',
        cpf: '',
        installments: 1
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalOrder, setFinalOrder] = useState<Order | null>(null);
    
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);
    const barcodeRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const fetchShopData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await cloud.getShopData();
                setProducts(data.products || []);
                setCategories(data.categories || []);
                setSettings(data.settings || null);
            } catch (err: any) {
                setError("Não foi possível carregar a loja. Tente novamente mais tarde.");
            } finally {
                setLoading(false);
            }
        };
        fetchShopData();
    }, []);

    // Effect for generating QR/Barcode on success screen
    useEffect(() => {
        if (view === 'success' && finalOrder) {
            if (finalOrder.payment_method === 'PIX' && finalOrder.asaas_pix_copy_paste && qrCanvasRef.current && typeof QRious !== 'undefined') {
                new QRious({
                    element: qrCanvasRef.current,
                    value: finalOrder.asaas_pix_copy_paste,
                    size: 200,
                    level: 'H'
                });
            }
            if (finalOrder.payment_method === 'BOLETO' && barcodeRef.current && typeof JsBarcode !== 'undefined') {
                JsBarcode(barcodeRef.current, finalOrder.id.replace(/\D/g, '').substring(0, 44) || "1234567890", {
                    format: "CODE128",
                    lineColor: "#000",
                    width: 2,
                    height: 60,
                    displayValue: false
                });
            }
        }
    }, [view, finalOrder]);

    // --- ACTIONS ---

    const openProductModal = (product: Product) => {
        setSelectedProduct(product);
        setProductQuantity(1);
    };

    const addToCart = () => {
        if (!selectedProduct) return;
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === selectedProduct.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.id === selectedProduct.id
                        ? { ...item, quantity: Math.min(selectedProduct.stock_quantity || 999, item.quantity + productQuantity) }
                        : item
                );
            }
            return [...prevCart, { ...selectedProduct, quantity: productQuantity }];
        });
        setSelectedProduct(null);
    };

    const updateCartQuantity = (productId: string, delta: number) => {
        setCart(prevCart => {
            const updated = prevCart.map(item => {
                if (item.id === productId) {
                    const product = products.find(p => p.id === productId);
                    const max = product?.stock_quantity || 999;
                    return { ...item, quantity: Math.min(max, Math.max(0, item.quantity + delta)) };
                }
                return item;
            }).filter(item => item.quantity > 0);
            return updated;
        });
    };

    const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
    const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

    const handleCreditCardChange = (field: string, value: string) => {
        let cleanValue = value;
        if (field === 'number') cleanValue = value.replace(/\D/g, '').substring(0, 16);
        if (field === 'expiry') {
            const v = value.replace(/\D/g, '');
            if (v.length >= 2) cleanValue = `${v.substring(0,2)}/${v.substring(2,4)}`;
            else cleanValue = v;
        }
        if (field === 'cvv') cleanValue = value.replace(/\D/g, '').substring(0, 4);
        if (field === 'cpf') {
             cleanValue = value.replace(/\D/g, '').substring(0, 11);
             if (cleanValue.length > 9) cleanValue = cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
             else if (cleanValue.length > 6) cleanValue = cleanValue.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
             else if (cleanValue.length > 3) cleanValue = cleanValue.replace(/(\d{3})(\d{1,3})/, "$1.$2");
        }
        
        setCardData(prev => ({ ...prev, [field]: cleanValue }));
    };

    const handleFinalizeOrder = async () => {
        if (!userLoggedIn) {
            alert("Você precisa estar logado para finalizar a compra.");
            return;
        }
        if (!shippingAddress.name.trim() || !shippingAddress.address.trim()) {
            alert("Por favor, preencha o endereço de entrega.");
            return;
        }

        if (paymentMethod === 'CREDIT_CARD') {
            if (cardData.number.length < 13 || !cardData.holder || !cardData.expiry || !cardData.cvv || !cardData.cpf) {
                alert("Preencha todos os dados do cartão, incluindo o CPF do titular.");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            const order = await cloud.createOrder({
                items: cart.map(item => ({ product_id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
                total_price: cartTotal,
                payment_method: paymentMethod,
                shipping_address: shippingAddress,
                payment_details: paymentMethod === 'CREDIT_CARD' ? cardData : undefined
            });

            setFinalOrder(order);
            setCart([]);
            setView('success');

        } catch (error: any) {
            alert(`Erro ao criar pedido: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Copiado!");
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
    if (error) return <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500"><AlertTriangle className="w-10 h-10 mb-2"/>{error}</div>;
    if (!settings?.is_shop_enabled) return <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400"><ShoppingBag className="w-12 h-12 mb-3 opacity-20"/><p>A loja está fechada no momento.</p></div>;

    // LIST VIEW (HOME)
    if (view === 'list') return (
        <div className="animate-in fade-in duration-300">
            
            {/* Search Header */}
            <div className="mb-6 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar itens..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-100 dark:bg-gray-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-500 dark:text-white outline-none shadow-sm"
                />
            </div>

            {/* Promo Banner (if no search) */}
            {!searchTerm && activeCategory === 'all' && (
                <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-soft h-44 flex items-center px-6">
                    <div className="relative z-10">
                        <div className="text-[10px] font-bold uppercase bg-white/20 inline-block px-3 py-1 rounded-full mb-3">Destaque da Semana</div>
                        <h2 className="text-2xl font-black leading-tight mb-1">Peças e Acessórios <br/> para seu corre</h2>
                        <p className="text-sm opacity-90 mt-2 font-medium">Frete grátis acima de R$100</p>
                    </div>
                    <ShoppingBag className="absolute right-[-20px] bottom-[-20px] w-40 h-40 text-white/10 rotate-12" />
                </div>
            )}

            {/* Categories Pills */}
            {categories.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar mb-2">
                    <button 
                        onClick={() => setActiveCategory('all')}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeCategory === 'all' ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-gray-700'}`}
                    >
                        Tudo
                    </button>
                    {categories.map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeCategory === cat.id ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-gray-700'}`}
                        >
                            <Tag className="w-3 h-3"/> {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Product Title */}
            <h3 className="font-black text-gray-800 dark:text-white text-xl mb-4 px-1">
                {activeCategory === 'all' ? 'Cardápio de Peças' : categories.find(c => c.id === activeCategory)?.name || 'Produtos'}
            </h3>
            
            {filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Nenhum produto encontrado.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredProducts.map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => openProductModal(p)}
                            className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700 cursor-pointer flex gap-4 relative overflow-hidden group"
                        >
                            {/* Image - Left Side like iFood */}
                            <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 relative">
                                <img src={p.images?.[0] || 'https://via.placeholder.com/200'} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                {!p.is_active && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold uppercase text-center p-1">Esgotado</div>}
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 flex flex-col justify-between py-1">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight mb-1.5 line-clamp-2">{p.name}</h4>
                                    <div className="flex items-center text-yellow-400 text-xs mb-1">
                                        <Star className="w-3 h-3 fill-current mr-1" /> 4.8
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{p.description}</p>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="font-bold text-gray-900 dark:text-white text-lg">{formatCurrency(p.price)}</span>
                                    <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Floating Cart Bar */}
            {cartCount > 0 && (
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 z-30 animate-in slide-in-from-bottom-10">
                    <button 
                        onClick={() => setView('checkout')}
                        className="w-full bg-brand-600 text-white p-4 rounded-full shadow-2xl shadow-brand-600/30 flex items-center justify-between hover:bg-brand-700 transition-transform active:scale-95"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center font-bold text-sm">
                                {cartCount}
                            </div>
                            <span className="font-medium text-sm opacity-90">Ver sacola</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold">{formatCurrency(cartTotal)}</span>
                            <ChevronRight className="w-5 h-5 opacity-70" />
                        </div>
                    </button>
                </div>
            )}

            {/* Product Modal (Bottom Sheet style) */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setSelectedProduct(null)}>
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in" />
                    <div 
                        className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-20 flex flex-col max-h-[90vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 dark:bg-black/20 backdrop-blur rounded-full flex items-center justify-center text-gray-600 dark:text-white shadow-sm hover:bg-white">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="relative h-72 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                            <img src={selectedProduct.images?.[0]} className="w-full h-full object-cover" />
                        </div>
                        
                        <div className="p-8 overflow-y-auto">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-3">{selectedProduct.name}</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">{selectedProduct.description}</p>
                            
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-600 mb-6 flex items-center justify-between">
                                <span className="font-bold text-sm text-gray-500">Quantidade</span>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setProductQuantity(q => Math.max(1, q - 1))}
                                        className={`w-10 h-10 flex items-center justify-center rounded-full ${productQuantity === 1 ? 'text-gray-300' : 'bg-white dark:bg-gray-600 text-brand-600 shadow-sm'}`}
                                        disabled={productQuantity === 1}
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="font-bold text-xl w-6 text-center dark:text-white">{productQuantity}</span>
                                    <button 
                                        onClick={() => setProductQuantity(q => Math.min(selectedProduct.stock_quantity || 99, q + 1))}
                                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-600 text-brand-600 shadow-sm"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <Button 
                                fullWidth 
                                onClick={addToCart}
                                disabled={!selectedProduct.is_active || (selectedProduct.stock_quantity !== null && selectedProduct.stock_quantity <= 0)}
                                className="py-4 text-lg flex items-center justify-between px-8"
                            >
                                <span>Adicionar</span>
                                <span>{formatCurrency(selectedProduct.price * productQuantity)}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // CHECKOUT VIEW
    if (view === 'checkout') return (
        <div className="pb-32 animate-in slide-in-from-right-5">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 sticky top-0 bg-white dark:bg-gray-900 z-20 py-4 border-b border-gray-50 dark:border-gray-800 px-1">
                <button onClick={() => setView('list')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-brand-600">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-black text-gray-900 dark:text-white">Sacola</h1>
            </div>

            <div className="max-w-xl mx-auto space-y-8 px-2">
                {/* Items List */}
                <section>
                    <div className="space-y-4">
                        {cart.map(item => (
                            <div key={item.id} className="flex items-start gap-4 p-2">
                                <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden flex-shrink-0 border border-gray-100 dark:border-gray-600">
                                    <img src={item.images?.[0]} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-sm text-gray-900 dark:text-white line-clamp-2 leading-tight pr-2">{item.name}</p>
                                        <p className="text-gray-900 dark:text-white font-bold text-sm whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</p>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-2">{formatCurrency(item.price)} / un</p>
                                    <div className="inline-flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1 shadow-sm">
                                        <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 text-brand-600 hover:bg-gray-50 rounded"><Minus className="w-3 h-3"/></button>
                                        <span className="text-xs font-bold w-4 text-center dark:text-white">{item.quantity}</span>
                                        <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 text-brand-600 hover:bg-gray-50 rounded"><Plus className="w-3 h-3"/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="h-px bg-gray-100 dark:bg-gray-800 w-full"></div>

                {/* Address */}
                <section>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2"><MapPin className="w-5 h-5"/> Entrega</h3>
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="Nome do Destinatário" 
                            value={shippingAddress.name}
                            onChange={e => setShippingAddress({...shippingAddress, name: e.target.value})}
                            className="ifood-input w-full p-4 text-sm font-medium text-gray-900 dark:text-white"
                        />
                        <textarea 
                            placeholder="Endereço completo (Rua, Nº, Bairro, Comp...)" 
                            value={shippingAddress.address}
                            onChange={e => setShippingAddress({...shippingAddress, address: e.target.value})}
                            className="ifood-input w-full p-4 text-sm font-medium text-gray-900 dark:text-white h-28 resize-none"
                        />
                    </div>
                </section>

                <div className="h-px bg-gray-100 dark:bg-gray-800 w-full"></div>

                {/* Payment */}
                <section>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Wallet className="w-5 h-5"/> Pagamento</h3>
                    
                    {(paymentMethod as string) !== 'CREDIT_CARD' ? (
                        <div className="grid grid-cols-3 gap-3">
                            {settings?.payment_methods?.pix && (
                                <button 
                                    onClick={() => setPaymentMethod('PIX')}
                                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'PIX' ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 bg-white dark:bg-gray-800'}`}
                                >
                                    <QrCode className="w-6 h-6" />
                                    <span className="text-xs font-bold">PIX</span>
                                </button>
                            )}
                            {settings?.payment_methods?.credit_card && (
                                <button 
                                    onClick={() => setPaymentMethod('CREDIT_CARD')}
                                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'CREDIT_CARD' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 dark:border-gray-700 text-gray-500 bg-white dark:bg-gray-800'}`}
                                >
                                    <CreditCard className="w-6 h-6" />
                                    <span className="text-xs font-bold">Cartão</span>
                                </button>
                            )}
                            {settings?.payment_methods?.boleto && (
                                <button 
                                    onClick={() => setPaymentMethod('BOLETO')}
                                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'BOLETO' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'border-gray-200 dark:border-gray-700 text-gray-500 bg-white dark:bg-gray-800'}`}
                                >
                                    <Barcode className="w-6 h-6" />
                                    <span className="text-xs font-bold">Boleto</span>
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="mb-6 animate-in fade-in">
                            <button 
                                onClick={() => setPaymentMethod('PIX')}
                                className="w-full flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-2xl text-blue-700 dark:text-blue-300 mb-4"
                            >
                                <div className="flex items-center gap-3">
                                    <CreditCard className="w-5 h-5" />
                                    <span className="font-bold">Cartão de Crédito</span>
                                </div>
                                <span className="text-xs font-bold underline">Trocar</span>
                            </button>
                        </div>
                    )}

                    {paymentMethod === 'CREDIT_CARD' && (
                        <div className="space-y-4 animate-in fade-in bg-gray-50 dark:bg-gray-800 p-6 rounded-[24px]">
                            <input 
                                type="tel" placeholder="Número do Cartão" maxLength={16}
                                value={cardData.number} onChange={e => handleCreditCardChange('number', e.target.value)}
                                className="ifood-input w-full p-4 text-sm font-medium bg-white dark:bg-gray-700"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <input 
                                    type="text" placeholder="Nome no Cartão" 
                                    value={cardData.holder} onChange={e => setCardData({...cardData, holder: e.target.value.toUpperCase()})}
                                    className="ifood-input w-full p-4 text-sm font-medium bg-white dark:bg-gray-700"
                                />
                                <input 
                                    type="text" placeholder="CPF do Titular" 
                                    value={cardData.cpf} onChange={e => handleCreditCardChange('cpf', e.target.value)}
                                    className="ifood-input w-full p-4 text-sm font-medium bg-white dark:bg-gray-700"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <input 
                                    type="tel" placeholder="MM/AA" maxLength={5}
                                    value={cardData.expiry} onChange={e => handleCreditCardChange('expiry', e.target.value)}
                                    className="ifood-input w-full p-4 text-sm font-medium bg-white dark:bg-gray-700"
                                />
                                <input 
                                    type="tel" placeholder="CVV" maxLength={4}
                                    value={cardData.cvv} onChange={e => handleCreditCardChange('cvv', e.target.value)}
                                    className="ifood-input w-full p-4 text-sm font-medium bg-white dark:bg-gray-700"
                                />
                            </div>
                            <CustomSelect 
                                value={cardData.installments} 
                                onChange={(val: string) => setCardData({...cardData, installments: Number(val)})}
                                options={[1,2,3,4].map(i => ({ label: `${i}x de ${formatCurrency(cartTotal/i)}`, value: String(i) }))}
                            />
                        </div>
                    )}
                </section>
            </div>

            {/* Sticky Footer Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-50 dark:border-gray-800 z-30">
                <div className="max-w-xl mx-auto flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-gray-500 font-medium">Total</span>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{formatCurrency(cartTotal)}</span>
                    </div>
                    <Button 
                        fullWidth 
                        onClick={handleFinalizeOrder} 
                        disabled={isSubmitting}
                        className="py-4 text-lg shadow-lg shadow-brand-200 dark:shadow-none"
                    >
                        {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : 'Fazer Pedido'}
                    </Button>
                </div>
            </div>
        </div>
    );

    // SUCCESS VIEW
    if (view === 'success' && finalOrder) return (
        <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 animate-in zoom-in-95">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100 dark:shadow-none">
                <Check className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 text-center">Pedido Recebido!</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
                Seu pedido <span className="font-mono font-bold text-gray-800 dark:text-gray-200">#{finalOrder.id.substring(0,8)}</span> foi criado com sucesso.
            </p>

            {/* Payment Details Box */}
            <div className="w-full max-w-sm bg-gray-50 dark:bg-gray-800 rounded-[32px] p-8 border border-gray-100 dark:border-gray-700 mb-8">
                {finalOrder.payment_method === 'PIX' && finalOrder.asaas_pix_copy_paste ? (
                    <div className="text-center space-y-6">
                        <p className="font-bold text-gray-900 dark:text-white">Pague via PIX</p>
                        <div className="bg-white p-4 rounded-2xl inline-block shadow-sm border border-gray-100">
                            <canvas ref={qrCanvasRef} className="w-48 h-48"></canvas>
                        </div>
                        <button onClick={() => copyToClipboard(finalOrder.asaas_pix_copy_paste!)} className="w-full py-4 px-4 bg-white dark:bg-gray-700 rounded-full text-sm font-bold text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-gray-600 flex items-center justify-center gap-2 hover:bg-brand-50 transition-colors">
                            <Copy className="w-4 h-4"/> Copiar Código
                        </button>
                    </div>
                ) : finalOrder.payment_method === 'BOLETO' ? (
                    <div className="text-center space-y-6">
                        <p className="font-bold text-gray-900 dark:text-white">Boleto Bancário</p>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <svg ref={barcodeRef} className="w-full h-20"></svg>
                        </div>
                        {finalOrder.asaas_bank_slip_url && (
                            <a href={finalOrder.asaas_bank_slip_url} target="_blank" rel="noreferrer" className="block w-full py-4 bg-brand-600 text-white rounded-full font-bold text-sm hover:bg-brand-700 transition-colors">
                                Baixar Boleto PDF
                            </a>
                        )}
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-8 h-8 text-blue-600" />
                        </div>
                        <p className="font-bold text-blue-800 dark:text-blue-300 text-lg">Pagamento em Análise</p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">Você será notificado assim que for aprovado.</p>
                    </div>
                )}
            </div>

            <Button onClick={() => { setView('list'); setCart([]); setFinalOrder(null); }} variant="outline" className="w-full max-w-sm py-4 rounded-full border-2">
                Voltar para Loja
            </Button>
        </div>
    );

    return null;
};
