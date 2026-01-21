import React, { useState, useEffect } from 'react';
import { Product, CartItem } from '../types';
import * as cloud from '../services/cloud';
import { Html5Qrcode } from 'html5-qrcode';
import { Loader2, Search, Plus, Minus, ShoppingBag, Send, LogOut, Coffee, LayoutGrid, ClipboardList, CheckCircle, User, Clock, TrendingUp, History, Home, X, ArrowLeft, Printer, Truck, MapPin, RotateCcw, Check, Scan, MessageCircle } from 'lucide-react';
import { StreetAutocomplete } from './StreetAutocomplete';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import { Logo } from './Logo';

const WhatsappContainer = React.lazy(() => import('./Whatsapp/WhatsappContainer'));

interface Props {
    collaborator: any;
    onLogout: () => void;
}

const parseCurrency = (val: string): number => {
    if (!val) return 0;
    const digits = val.replace(/\D/g, '');
    return Number(digits) / 100;
};

type View = 'dashboard' | 'menu' | 'tables' | 'history' | 'reports' | 'external_order' | 'orders' | 'whatsapp_chat';

export const CollaboratorModule: React.FC<Props> = ({ collaborator, onLogout }) => {
    const [view, setView] = useState<View>('dashboard');
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [openOrders, setOpenOrders] = useState<any[]>([]);
    const [closedOrders, setClosedOrders] = useState<any[]>([]);
    const [summary, setSummary] = useState({ total_sales: 0, total_orders: 0, avg_ticket: 0 });
    const [orders, setOrders] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [showTicketPrint, setShowTicketPrint] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [tableName, setTableName] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState(''); // Novo: Telefone do cliente
    const [isExternalOrder, setIsExternalOrder] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
    const [shippingCost, setShippingCost] = useState(0);
    const [addressStreet, setAddressStreet] = useState('');
    const [addressNumber, setAddressNumber] = useState('');
    const [addressNeighborhood, setAddressNeighborhood] = useState('');
    const [address, setAddress] = useState({
        city: '',
        state: '',
        lat: 0,
        lng: 0,
        validated: false,
        validating: false,
        error: ''
    });

    const [fees, setFees] = useState<any>(null);
    const [shippingRules, setShippingRules] = useState<any[]>([]);
    const [storeProfile, setStoreProfile] = useState<any>(null);
    const [storeCity, setStoreCity] = useState(''); // Estado estável para a cidade
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [showObservations, setShowObservations] = useState<number | null>(null); // Index do item no carrinho
    const [showPreCheck, setShowPreCheck] = useState<any | null>(null); // Order para conferência
    const [showProfile, setShowProfile] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [currentAvatarUrl, setCurrentAvatarUrl] = useState(collaborator.avatar_url);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Custom Product State
    const [isCustomProductModalOpen, setIsCustomProductModalOpen] = useState(false);
    const [customProduct, setCustomProduct] = useState({ name: '', price: '', quantity: 1 });
    const [isScannerOpen, setIsScannerOpen] = useState(false); // Novo Scanner State

    useEffect(() => {
        setCurrentAvatarUrl(collaborator.avatar_url);
    }, [collaborator.avatar_url]);

    const { alert, confirm } = useDialog();


    useEffect(() => {
        loadData();
    }, [collaborator.store_id]); // Changed to collaborator.store_id as storeId is not defined

    const loadData = async () => {
        setLoading(true);
        try {
            const [ordersData, storeProfileData, f, rules] = await Promise.all([
                cloud.getOpenOrders(collaborator.store_id),
                cloud.getStoreProfileForCollaborator(collaborator.store_id),
                cloud.getPublicFeeSettings(),
                cloud.getStoreShippingRules()
            ]);
            setOrders(ordersData);
            if (storeProfileData) {
                setStoreProfile(storeProfileData);
                setStoreCity(storeProfileData.city || '');
            }
            setFees(f);
            setShippingRules(rules || []);

            // Original loadInitialData calls
            await Promise.all([
                loadProducts(),
                loadCategories(),
                loadOpenOrders(),
                loadClosedOrders(),
                loadSummary()
            ]);
        } catch (error) {
            // console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) {
            await alert({ title: 'Erro', message: 'Preencha as duas senhas.' });
            return;
        }
        if (newPassword.length < 6) {
            await alert({ title: 'Erro', message: 'A nova senha deve ter pelo menos 6 caracteres.' });
            return;
        }

        setSending(true);
        try {
            const success = await cloud.updateCollaboratorPassword(collaborator.id, oldPassword, newPassword);
            if (success) {
                await alert({ title: 'Sucesso', message: 'Senha alterada com sucesso!' });
                setChangingPassword(false);
                setOldPassword('');
                setNewPassword('');
            } else {
                await alert({ title: 'Erro', message: 'Senha atual incorreta.' });
            }
        } catch {
            await alert({ title: 'Erro', message: 'Falha ao comunicar com o servidor.' });
        } finally {
            setSending(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingPhoto(true);
        try {
            const filename = `collaborators/${collaborator.id}/${Date.now()}_${file.name}`;
            const publicUrl = await cloud.uploadAvatar(file, filename);

            if (publicUrl) {
                await cloud.updateCollaboratorAvatar(collaborator.id, publicUrl);
                setCurrentAvatarUrl(publicUrl);
                await alert({ title: 'Sucesso', message: 'Foto de perfil atualizada!' });
            }
        } catch (error) {
            // console.error(error);
            await alert({ title: 'Erro', message: 'Falha ao enviar a foto.' });
        } finally {
            setUploadingPhoto(false);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const loadProducts = async () => {
        try {
            const data = await cloud.getProductsForCollaborator(collaborator.store_id);
            setProducts(data);
        } catch (error) { console.error(error); }
    };

    const loadCategories = async () => {
        try {
            const data = await cloud.getCategoriesForCollaborator(collaborator.store_id);
            setCategories(data);
        } catch (error) { console.error(error); }
    };

    const loadOpenOrders = async () => {
        try {
            const data = await cloud.getOpenOrders(collaborator.store_id);
            setOpenOrders(data);
        } catch (error) { console.error(error); }
    };

    const loadClosedOrders = async () => {
        try {
            const data = await cloud.getStoreInternalOrders(collaborator.store_id);
            setClosedOrders(data);
        } catch (error) { console.error(error); }
    };

    const loadTickets = async () => {
        try {
            const data = await cloud.getOrdersTickets(collaborator.store_id);
            setTickets(data);
        } catch (error) { console.error(error); }
    };

    const loadSummary = async () => {
        try {
            const data = await cloud.getCollaboratorSummary(collaborator.store_id, collaborator.id);
            setSummary(data);
        } catch (error) { console.error(error); }
    };

    const handleAddCustomProduct = () => {
        if (!customProduct.name || !customProduct.price) {
            alert({ title: 'Erro', message: 'Preencha nome e preço.' });
            return;
        }

        const price = parseCurrency(customProduct.price);
        if (price <= 0) {
            alert({ title: 'Erro', message: 'Preço inválido.' });
            return;
        }

        const newProduct: Product = {
            id: `custom_${Date.now()}`,
            store_id: collaborator.store_id,
            name: `${customProduct.name} (Avulso)`,
            price: price,
            is_active: true,
            description: 'Produto Adicionado Manualmente',
            category_id: '',
            stock_quantity: null
        };

        setCart(prev => [...prev, { product: newProduct, quantity: customProduct.quantity }]);
        setIsCustomProductModalOpen(false);
        setCustomProduct({ name: '', price: '', quantity: 1 });
    };

    const openCustomProductModal = () => {
        setCustomProduct({ name: '', price: '', quantity: 1 });
        setIsCustomProductModalOpen(true);
    };

    const addToCart = (product: Product) => {
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

    const validateAddress = async () => {
        if (!addressStreet || !addressNumber) {
            await alert({ title: 'Erro', message: 'Preencha a rua e o número.' });
            return;
        }

        const city = storeProfile?.city?.split(' - ')[0].trim() || '';
        if (!city) {
            await alert({ title: 'Erro', message: 'Cidade da loja não configurada.' });
            return;
        }

        setAddress(prev => ({ ...prev, validating: true, error: '' }));
        try {
            const query = `${addressStreet}, ${addressNumber}, ${addressNeighborhood || ''}, ${city}, Brazil`;
            const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=1`;

            const response = await fetch(url, {
                headers: { 'Accept-Language': 'pt-BR' }
            });
            const data = await response.json();

            if (data && data.length > 0) {
                const first = data[0];
                setAddress(prev => ({
                    ...prev,
                    lat: parseFloat(first.lat),
                    lng: parseFloat(first.lon),
                    validated: true,
                    validating: false
                }));
            } else {
                setAddress(prev => ({ ...prev, validated: false, validating: false, error: 'Endereço não localizado.' }));
                await alert({ title: 'Erro', message: 'Endereço não localizado no mapa.' });
            }
        } catch (error) {
            // console.error(error);
            setAddress(prev => ({ ...prev, validating: false, error: 'Erro ao validar.' }));
            await alert({ title: 'Erro', message: 'Falha na comunicação com serviço de mapas.' });
        }
    };

    const calculateShipping = async () => {
        if (!address.validated || !fees || !storeProfile) return;

        // Se for parceiro Zé (global_tax_fixed > 0 indica sistema de parceiros)
        const isPartnerSystem = fees.global_tax_fixed > 0;

        if (isPartnerSystem) {
            let storeLat = storeProfile.lat || 0;
            let storeLng = storeProfile.lng || 0;

            // Se não tiver coordenadas, tenta geocodificar o endereço da loja
            if (!storeLat || !storeLng) {
                try {
                    const storeAddress = storeProfile.address_street ? `${storeProfile.address_street}, ${storeProfile.city || ''}, Brazil` : `${storeProfile.city || ''}, Brazil`;
                    const storeQuery = encodeURIComponent(storeAddress);
                    const storeUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${storeQuery}`;
                    const storeResp = await fetch(storeUrl, { headers: { 'Accept-Language': 'pt-BR' } });
                    const storeData = await storeResp.json();
                    if (storeData && storeData.length > 0) {
                        storeLat = parseFloat(storeData[0].lat);
                        storeLng = parseFloat(storeData[0].lon);
                    }
                } catch (e) {
                    // console.error('[CollaboratorModule] Erro ao geocodificar loja:', e);
                }
            }

            if (!storeLat || !storeLng) return;

            const baseKm = Number(fees.base_delivery_km || 0);
            const baseValue = Number(fees.base_delivery_value || 0);
            const extraPerKm = Number(fees.extra_km_value || 0);

            // Haversine
            const toRad = (v: number) => v * Math.PI / 180;
            const R = 6371;
            const dLat = toRad(address.lat - storeLat);
            const dLon = toRad(address.lng - storeLng);
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(storeLat)) * Math.cos(toRad(address.lat)) * Math.sin(dLon / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            const extraKm = Math.max(0, distance - baseKm);
            const cost = baseValue + (extraKm * extraPerKm);
            setShippingCost(Number(cost.toFixed(2)));
        } else {
            // Regras da loja (store_shipping_rules)
            const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
            const freeRule = shippingRules.find(r => r.rule_type === 'free_above');
            const fixedRule = shippingRules.find(r => r.rule_type === 'fixed_rate');

            if (freeRule && subtotal >= freeRule.threshold) {
                setShippingCost(0);
            } else if (fixedRule) {
                setShippingCost(Number(fixedRule.value));
            } else {
                setShippingCost(0);
            }
        }
    };

    useEffect(() => {
        if (address.validated && isExternalOrder && deliveryMethod === 'DELIVERY') {
            calculateShipping();
        } else {
            setShippingCost(0);
        }
    }, [address.validated, deliveryMethod, cart]);

    const handleSendOrder = async () => {
        if (cart.length === 0) return;

        // --- TRAVA DE LOJA FECHADA ---
        if (storeProfile && !storeProfile.is_open) {
            await alert({
                title: 'Loja Fechada',
                message: 'Não é possível realizar pedidos enquanto a loja estiver marcada como fechada no sistema.'
            });
            return;
        }

        if (!isExternalOrder && !tableName.trim()) {
            await alert({ title: 'Atenção', message: 'Identifique a mesa ou comanda.' });
            return;
        }

        if (isExternalOrder && deliveryMethod === 'DELIVERY' && !address.validated) {
            await alert({ title: 'Atenção', message: 'Valide o endereço de entrega.' });
            return;
        }

        setSending(true);
        try {
            const items = cart.map(i => ({
                product_id: i.product.id,
                name: i.product.name,
                quantity: i.quantity,
                unit_price: i.product.price,
                price: i.product.price,
                observation: i.observation
            }));

            if (isExternalOrder) {
                // Pedido Externo (Delivery/Retirada) via createOrder
                const subtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

                await cloud.createOrder({
                    items,
                    total_price: subtotal + shippingCost,
                    payment_method: 'OTHER', // Collaborator doesn't process payment here usually, or it's pending
                    shipping_address: deliveryMethod === 'DELIVERY' ? {
                        street: addressStreet,
                        number: addressNumber,
                        neighborhood: addressNeighborhood,
                        city: address.city || (storeProfile?.city?.split(' - ')[0].trim())
                    } : {},
                    shipping_cost: shippingCost,
                    discount: 0,
                    store_id: collaborator.store_id,
                    customer_name: customerName,
                    customer_phone: customerPhone,
                    collaborator_name: collaborator.name, // RASTREABILIDADE
                    observation: 'Pedido via Garçom Premium' + (deliveryMethod === 'PICKUP' ? ' (RETIRADA)' : ''),
                    origin: 'INTERNAL'
                });

                await alert({ title: 'Sucesso', message: 'Pedido externo criado com sucesso!' });
            } else {
                // Pedido de Mesa via placeCollaboratorOrder
                await cloud.placeCollaboratorOrder(
                    collaborator.store_id,
                    collaborator.id,
                    tableName,
                    items,
                    customerName,
                    selectedOrderId || undefined,
                    collaborator.name // RASTREABILIDADE
                );
                await alert({ title: 'Sucesso', message: selectedOrderId ? 'Pedido atualizado!' : 'Pedido enviado para a cozinha!' });
            }

            loadOpenOrders();
            loadSummary();

            // Reset states
            setCart([]);
            setTableName('');
            setCustomerName('');
            setCustomerPhone('');
            setIsExternalOrder(false);
            setDeliveryMethod('PICKUP');
            setAddressStreet('');
            setAddressNumber('');
            setAddressNeighborhood('');
            setAddress({ city: '', state: '', lat: 0, lng: 0, validated: false, validating: false, error: '' });
            setShippingCost(0);
            setView('dashboard');
        } catch (error) {
            // console.error(error);
            await alert({ title: 'Erro', message: 'Falha ao enviar pedido.' });
        } finally {
            setSending(false);
        }
    };

    const handleSelectOrder = (order: any) => {
        setSelectedOrderId(order.id);
        setTableName(order.table_identifier); // Changed from setTableIdentifier
        setCustomerName(order.customer_name || '');
        setView('menu'); // Changed to 'MENU'
    };

    const handleCloseOrder = async (order: any) => {
        const result = await confirm({
            title: 'Finalizar Mesa',
            message: `Encerrar mesa "${order.table_identifier}"? Total: R$ ${order.total_amount?.toFixed(2)}`,
            confirmButtonText: 'Finalizar e Limpar'
        });

        if (!result) return;

        try {
            await cloud.closeCollaboratorOrder(order.id);
            if (selectedOrderId === order.id) {
                setSelectedOrderId(null);
                setTableName(''); // Changed from setTableIdentifier
                setCustomerName('');
            }
            loadOpenOrders();
            loadClosedOrders();
            loadSummary();
        } catch {
            await alert({ title: 'Erro', message: 'Falha ao finalizar mesa.' });
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !selectedCategory ? true :
            selectedCategory === 'none' ? !p.category_id :
                p.category_id === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const totalCart = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    const renderDashboard = () => (
        <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
            {/* Boas vindas e Resumo Rápido */}
            <section className="bg-gradient-to-br from-brand-600 to-brand-700 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-1">Olá, {collaborator.name?.split(' ')[0] || 'Colaborador'}! 👋</h2>
                    <p className="text-brand-100 text-sm font-medium mb-6">Veja como está seu desempenho hoje.</p>

                    <div className="grid grid-cols-1 gap-3">
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-200 mb-1">Vendas Hoje</p>
                                <p className="text-xl font-black">R$ {summary.total_sales?.toFixed(2)}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-brand-200 opacity-50" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-200 mb-1">Mesas</p>
                                <p className="text-xl font-black">{summary.total_orders}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/10 flex flex-col">
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-200 mb-1">Ticket Médio</p>
                                <p className="text-xl font-black">R$ {summary.avg_ticket?.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
            </section>

            {/* Blocos de Ação */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => { setView('menu'); setSelectedOrderId(null); setTableName(''); setCustomerName(''); setIsExternalOrder(false); }} // Changed to 'MENU' and setTableName
                    className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                    <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-7 h-7" />
                    </div>
                    <span className="font-black text-gray-800 dark:text-gray-200 text-sm">Abrir Mesa</span>
                </button>

                <button
                    onClick={() => setIsScannerOpen(true)}
                    className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all group lg:col-span-2 relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-brand-600 opacity-0 group-hover:opacity-100 transition-opacity z-0" />
                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-brand-600 transition-colors z-10">
                        <Scan className="w-7 h-7" />
                    </div>
                    <span className="font-black text-gray-800 dark:text-gray-200 group-hover:text-white text-sm z-10 transition-colors">Ler QR Code Mesa</span>
                </button>

                <button
                    onClick={() => { setView('tables'); loadOpenOrders(); }}
                    className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all group relative"
                >
                    <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ClipboardList className="w-7 h-7" />
                    </div>
                    <span className="font-black text-gray-800 dark:text-gray-200 text-sm">Mesas Ativas</span>
                    {openOrders.length > 0 && <span className="absolute top-4 right-4 w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800">{openOrders.length}</span>}
                </button>

                <button
                    onClick={() => { setView('history'); loadClosedOrders(); }}
                    className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                    <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <History className="w-7 h-7" />
                    </div>
                    <span className="font-black text-gray-800 dark:text-gray-200 text-sm">Histórico</span>
                </button>

                <button
                    onClick={() => { setView('reports'); loadClosedOrders(); }}
                    className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                    <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-7 h-7" />
                    </div>
                    <span className="font-black text-gray-800 dark:text-gray-200 text-sm">Relatórios</span>
                </button>

                <button
                    onClick={() => setShowProfile(true)}
                    className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center gap-3 hover:shadow-xl hover:-translate-y-1 transition-all group lg:col-span-2 relative overflow-hidden"
                >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden border-2 border-transparent group-hover:border-brand-500">
                        {currentAvatarUrl ? (
                            <img src={currentAvatarUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600">
                                <User className="w-7 h-7" />
                            </div>
                        )}
                    </div>
                    <span className="font-black text-gray-800 dark:text-gray-200 text-sm">Meu Perfil</span>
                </button>

                <button
                    onClick={() => {
                        setIsExternalOrder(true);
                        setView('menu');
                    }}
                    className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-3 group active:scale-95"
                >
                    <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                        <ShoppingBag className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-black dark:text-white uppercase tracking-tighter">Novo Pedido Externo</span>
                    <span className="text-[10px] text-gray-400 font-bold -mt-2">Delivery / Retirada</span>
                </button>

                <button
                    onClick={() => setView('whatsapp_chat')}
                    className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col items-center gap-3 group active:scale-95"
                >
                    <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <MessageCircle className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-black dark:text-white uppercase tracking-tighter">WhatsApp</span>
                    <span className="text-[10px] text-gray-400 font-bold -mt-2">Atendimento Interno</span>
                </button>

                {/* Botão de Impressão removido para colaboradores */}
            </div>
        </div>
    );

    const renderOrders = () => (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar pb-24">
            <div className="flex justify-between items-center px-2">
                <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                    <Printer className="w-6 h-6 text-brand-600" /> Fila de Pedidos
                </h2>
                <Button variant="secondary" size="sm" onClick={loadTickets} className="rounded-xl h-8 text-[10px] w-auto px-4">Atualizar</Button>
            </div>

            {tickets.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-[40px] border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <p className="text-gray-400 font-bold italic">Nenhum pedido enviado recentemente.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {tickets.map(ticket => (
                        <div key={ticket.id} className="bg-white dark:bg-gray-800 p-5 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                            {ticket.orders_collaborators?.table_identifier || 'S/M'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold">
                                            Enviado às {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <h3 className="font-black text-gray-800 dark:text-white">
                                        {ticket.orders_collaborators?.customer_name || 'Mesa'}
                                    </h3>
                                </div>
                                {/* Botão de impressão removido */}
                            </div>
                            <div className="space-y-1.5 pt-2 border-t border-gray-50 dark:border-gray-700/50">
                                {(Array.isArray(ticket.items) ? ticket.items : []).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-xs font-medium">
                                        <span className="text-gray-600 dark:text-gray-400">{item.quantity}x {item.name || item.product?.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderHistory = () => (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar pb-24">
            <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                <History className="w-6 h-6 text-brand-600" /> Vendas de Hoje
            </h2>

            {closedOrders.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-[40px] border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <p className="text-gray-400 font-bold italic">Nenhuma mesa fechada por você hoje.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {closedOrders.map(order => (
                        <div key={order.id} className="bg-white dark:bg-gray-800 p-5 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black px-2 py-0.5 rounded-full">{order.table_identifier}</span>
                                        <span className="text-[10px] text-gray-400 font-bold">Encerrada às {new Date(order.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <h3 className="font-black text-gray-800 dark:text-white">{order.customer_name || 'Cliente'}</h3>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-green-600">R$ {order.total_amount?.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="text-[10px] text-gray-400 truncate">
                                {order.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderReports = () => {
        // Calcular vendas por categoria
        const stats: Record<string, { total: number, count: number }> = {};
        closedOrders.forEach(order => {
            order.items?.forEach((item: any) => {
                const cat = item.category_name || 'Diversos';
                if (!stats[cat]) stats[cat] = { total: 0, count: 0 };
                stats[cat].total += item.total_price || (item.unit_price * item.quantity);
                stats[cat].count += item.quantity;
            });
        });

        return (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar pb-24">
                <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-brand-600" /> Relatório por Categoria
                </h2>

                {Object.keys(stats).length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-[40px] border-2 border-dashed border-gray-100 dark:border-gray-700 font-bold text-gray-400">
                        Nenhum dado disponível para hoje.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(stats).sort((a, b) => b[1].total - a[1].total).map(([cat, data]) => (
                            <div key={cat} className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-gray-800 dark:text-white uppercase text-xs tracking-widest mb-1">{cat}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold">{data.count} itens vendidos</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-brand-600">R$ {data.total.toFixed(2)}</p>
                                    <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
                                        <div
                                            className="h-full bg-brand-500 rounded-full"
                                            style={{ width: `${(data.total / summary.total_sales) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen h-[100dvh] bg-gray-100 dark:bg-gray-900 flex flex-col font-sans select-none overflow-hidden">
            {/* Header com Navegação - Escondido no WhatsApp Chat mobile para ganhar espaço */}
            <header className={`${view === 'whatsapp_chat' ? 'hidden md:flex' : 'flex'} bg-white dark:bg-gray-800 shadow-md p-4 justify-between items-center z-40 sticky top-0 flex-shrink-0`}>
                <div className="flex items-center gap-3">
                    {view !== 'dashboard' ? (
                        <button onClick={() => setView('dashboard')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500"><ArrowLeft className="w-6 h-6" /></button>
                    ) : (
                        <Logo className="h-9 w-auto text-brand-600" mode="icon" />
                    )}
                    <div>
                        <h1 className="font-black text-gray-800 dark:text-white leading-tight">ZÉ ENTREGA</h1>
                        <p className="text-[10px] text-brand-600 font-bold tracking-widest uppercase">Módulo Garçom</p>
                    </div>
                </div>

                <button onClick={onLogout} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                    <LogOut className="w-6 h-6" />
                </button>
            </header>

            {/* Visão de Conteúdo Principal */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {loading && <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>}

                {view === 'dashboard' && renderDashboard()}
                {view === 'history' && renderHistory()}
                {view === 'reports' && renderReports()}
                {view === 'orders' && renderOrders()}
                {view === 'whatsapp_chat' && (
                    <div className="flex-1 flex flex-col overflow-hidden md:items-center md:justify-center md:bg-gray-200/50 md:p-4">
                        <React.Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>}>
                            <WhatsappContainer
                                storeId={collaborator.store_id}
                                attendantId={collaborator.id}
                                onBack={() => setView('dashboard')}
                            />
                        </React.Suspense>
                    </div>
                )}

                {view === 'tables' && (
                    <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar pb-24">
                        <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                            <Coffee className="w-6 h-6 text-brand-600" /> Mesas Ativas
                        </h2>
                        {openOrders.length === 0 ? (
                            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-[40px] border-2 border-dashed border-gray-100 dark:border-gray-700">
                                <p className="text-gray-400 font-bold italic">Nenhuma mesa ativa no momento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {openOrders.map(order => (
                                    <div key={order.id} className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-50 dark:border-gray-700 group hover:shadow-xl transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-brand-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">{order.table_identifier}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold">
                                                        <Clock className="w-3 h-3 inline mr-1" />
                                                        {new Date(order.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tight">{order.customer_name || 'Mesa Sem Nome'}</h3>
                                                <p className="text-[10px] font-bold text-brand-600 mt-1 uppercase">
                                                    {order.items?.length || 0} {order.items?.length === 1 ? 'item pedido' : 'itens pedidos'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Total</p>
                                                <p className="text-xl font-black text-brand-600 italic">
                                                    R$ {(order.total_amount || order.items?.reduce((acc: number, i: any) => acc + (i.total_price || (i.price * i.quantity) || 0), 0) || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button fullWidth variant="secondary" onClick={() => handleSelectOrder(order)} className="rounded-2xl text-xs py-3">Add Itens</Button>
                                            <Button fullWidth onClick={() => setShowPreCheck(order)} className="rounded-2xl text-xs py-3 bg-orange-500 hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-500/20">Conferir</Button>
                                            {/* Botão de Encerrar removido para colaboradores */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {view === 'menu' && (
                    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Buscar produto..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border-none rounded-2xl shadow-sm outline-none font-bold"
                                />
                            </div>
                            <button
                                onClick={openCustomProductModal}
                                className="p-4 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all flex items-center justify-center"
                                title="Adicionar Produto Avulso"
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                            {selectedOrderId && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 px-4 py-3 rounded-2xl border border-orange-100 flex items-center gap-2">
                                    <Coffee className="w-5 h-5 text-orange-600" />
                                    <span className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-tighter leading-none">Editando<br />{tableName}</span>
                                </div>
                            )}
                        </div>
                        {/* Categorias Barra Horizontal */}
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={`px-5 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all ${!selectedCategory ? 'bg-brand-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-500'}`}
                            >
                                TODOS
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-5 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all ${selectedCategory === cat.id ? 'bg-brand-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-500'}`}
                                >
                                    {cat.name.toUpperCase()}
                                </button>
                            ))}
                            {/* Adicionar opção de Sem Categoria se houver produtos sem categoria_id */}
                            {products.some(p => !p.category_id) && (
                                <button
                                    onClick={() => setSelectedCategory('none')}
                                    className={`px-5 py-2.5 rounded-2xl font-black text-xs whitespace-nowrap transition-all ${selectedCategory === 'none' ? 'bg-brand-600 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-500'}`}
                                >
                                    DIVERSOS
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-32">
                                {filteredProducts.map(p => (
                                    <div key={p.id} onClick={() => addToCart(p)} className="bg-white dark:bg-gray-800 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all relative group">
                                        <div className="h-28 bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                                            {p.images && p.images[0] ? (
                                                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300"><ShoppingBag className="w-8 h-8" /></div>
                                            )}
                                            <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md px-2 py-1 rounded-lg">
                                                <p className="text-[10px] font-black text-brand-600 italic">R$ {p.price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h4 className="font-black text-xs h-8 line-clamp-2 dark:text-white leading-tight">{p.name}</h4>
                                            <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-tighter truncate">{(p as any).category_name || 'Diversos'}</p>
                                        </div>
                                        <div className="absolute bottom-3 right-3 bg-brand-600 text-white p-2 rounded-xl scale-0 group-hover:scale-100 transition-transform"><Plus className="w-4 h-4" /></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Observações */}
            {
                showObservations !== null && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom-5">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-black text-xl dark:text-white">Observação</h3>
                                <button onClick={() => setShowObservations(null)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                            <p className="text-sm font-bold text-gray-500 mb-4">{cart[showObservations]?.product.name}</p>
                            <textarea
                                autoFocus
                                value={cart[showObservations]?.observation || ''}
                                onChange={(e) => {
                                    const newCart = [...cart];
                                    newCart[showObservations].observation = e.target.value;
                                    setCart(newCart);
                                }}
                                placeholder="Ex: Sem cebola, gelo e limão..."
                                className="w-full h-32 bg-gray-50 dark:bg-gray-900 border-none rounded-3xl p-5 font-bold outline-none ring-2 ring-transparent focus:ring-brand-500 transition-all text-sm mb-6"
                            />
                            <Button fullWidth onClick={() => setShowObservations(null)} className="py-4 rounded-2xl shadow-lg shadow-brand-500/20">Salvar Nota</Button>
                        </div>
                    </div>
                )
            }

            {/* Modal de Conferência de Mesa (Pré-check) */}
            {
                showPreCheck && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[40px] p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="font-black text-2xl dark:text-white uppercase leading-none">{showPreCheck.table_identifier}</h3>
                                    <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mt-1">Conferência de Mesa</p>
                                </div>
                                <button onClick={() => setShowPreCheck(null)} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 hover:text-black dark:hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-8">
                                {showPreCheck.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-start border-b border-gray-50 dark:border-gray-700 pb-3">
                                        <div className="flex-1 pr-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-brand-600">{item.quantity}x</span>
                                                <span className="font-bold text-gray-800 dark:text-white text-sm uppercase">{item.name}</span>
                                            </div>
                                            {item.observation && (
                                                <p className="text-[10px] text-orange-600 font-black ml-6 mt-0.5 bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-md inline-block">
                                                    OBS: {item.observation}
                                                </p>
                                            )}
                                            {item.additional?.map((a: any, i: number) => (
                                                <p key={i} className="text-[10px] text-orange-500 font-bold ml-6 mt-0.5">↳ {a.value}</p>
                                            ))}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-gray-900 dark:text-white text-sm">R$ {item.total_price?.toFixed(2)}</p>
                                            <p className="text-[9px] text-gray-400">un: R$ {item.unit_price?.toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl space-y-3 mb-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Subtotal</span>
                                    <span className="font-black text-gray-800 dark:text-white">R$ {showPreCheck.total_amount?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
                                    <span className="font-black text-brand-600 uppercase">Total Geral</span>
                                    <span className="text-2xl font-black text-brand-600 italic">R$ {showPreCheck.total_amount?.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button fullWidth variant="secondary" onClick={() => setShowPreCheck(null)} className="py-4">Voltar</Button>
                                <Button fullWidth onClick={async () => {
                                    await alert({ title: 'Simulação', message: 'Função de compartilhar resumo acionada com sucesso!' });
                                }} className="py-4 bg-orange-600 hover:bg-orange-700">Compartilhar</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Aba do Carrinho e Botão Flutuante */}
            {
                view !== 'dashboard' && cart.length > 0 && (
                    <div className={`fixed inset-x-0 bottom-0 z-[60] bg-white dark:bg-gray-800 shadow-[0_-20px_60px_rgba(0,0,0,0.15)] rounded-t-[40px] p-6 transition-transform duration-300 ${cart.length > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
                        <div className="max-w-md mx-auto space-y-4">
                            {/* Lista Compacta de Itens no Carrinho */}
                            <div className="max-h-32 overflow-y-auto mb-2 space-y-2 custom-scrollbar">
                                {cart.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl">
                                        <div className="flex-1 truncate">
                                            <p className="text-[10px] font-black uppercase dark:text-white truncate">{item.product.name}</p>
                                            {item.observation && <p className="text-[8px] text-orange-500 font-bold truncate">Obs: {item.observation}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm"><Minus className="w-3 h-3 text-gray-400" /></button>
                                            <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm"><Plus className="w-3 h-3 text-brand-600" /></button>
                                            <button onClick={() => setShowObservations(idx)} className={`p-1 rounded-lg ${item.observation ? 'bg-orange-100 text-orange-600' : 'bg-white dark:bg-gray-800 text-gray-400'}`}><Clock className="w-3 h-3" /></button>
                                            <button onClick={() => removeFromCart(item.product.id)} className="p-1 text-red-400"><X className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                {!isExternalOrder ? (
                                    <input
                                        type="text"
                                        placeholder="Identificação da Mesa / Comanda"
                                        value={tableName}
                                        onChange={e => setTableName(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                                    />
                                ) : (
                                    <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-3xl border border-gray-100 dark:border-gray-800">
                                        <div className="flex bg-white dark:bg-gray-900 p-1 rounded-2xl gap-1">
                                            <button
                                                onClick={() => setDeliveryMethod('PICKUP')}
                                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all ${deliveryMethod === 'PICKUP' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400'}`}
                                            >
                                                <ShoppingBag className="w-4 h-4 mx-auto mb-1" />
                                                Retirada
                                            </button>
                                            <button
                                                onClick={() => setDeliveryMethod('DELIVERY')}
                                                className={`flex-1 py-3 text-[10px] font-black uppercase tracking-tighter rounded-xl transition-all ${deliveryMethod === 'DELIVERY' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400'}`}
                                            >
                                                <Truck className="w-4 h-4 mx-auto mb-1" />
                                                Delivery
                                            </button>
                                        </div>

                                        {deliveryMethod === 'DELIVERY' && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="col-span-2">
                                                        <StreetAutocomplete
                                                            city={storeCity}
                                                            value={addressStreet}
                                                            onChange={val => {
                                                                setAddressStreet(val);
                                                                setAddress(prev => ({ ...prev, validated: false }));
                                                            }}
                                                            className="w-full bg-white dark:bg-gray-900 p-3 rounded-xl text-[10px] font-bold outline-none border border-gray-100 dark:border-gray-800 dark:text-white"
                                                            placeholder="Rua"
                                                        />
                                                    </div>
                                                    <input
                                                        type="text" placeholder="Nº" value={addressNumber}
                                                        onChange={e => {
                                                            setAddressNumber(e.target.value);
                                                            setAddress(prev => ({ ...prev, validated: false }));
                                                        }}
                                                        className="w-full bg-white dark:bg-gray-900 p-3 rounded-xl text-[10px] font-bold outline-none border border-gray-100 dark:border-gray-800 dark:text-white"
                                                    />
                                                </div>
                                                <input
                                                    type="text" placeholder="Bairro" value={addressNeighborhood}
                                                    onChange={e => {
                                                        setAddressNeighborhood(e.target.value);
                                                        setAddress(prev => ({ ...prev, validated: false }));
                                                    }}
                                                    className="w-full bg-white dark:bg-gray-900 p-3 rounded-xl text-[10px] font-bold outline-none border border-gray-100 dark:border-gray-800 dark:text-white"
                                                />

                                                <button
                                                    onClick={validateAddress}
                                                    disabled={address.validating || address.validated}
                                                    className={`w-full py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${address.validated ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-brand-50 text-brand-600'}`}
                                                >
                                                    {address.validating ? <Loader2 className="w-4 h-4 animate-spin" /> : address.validated ? <Check className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                                                    {address.validated ? 'Endereço Validado' : 'Validar Endereço'}
                                                </button>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="text" placeholder="Tel. Cliente" value={customerPhone}
                                                onChange={e => setCustomerPhone(e.target.value)}
                                                className="w-full bg-white dark:bg-gray-900 p-3 rounded-xl text-[10px] font-bold outline-none border border-gray-100 dark:border-gray-800"
                                            />
                                            <input
                                                type="text" placeholder="Nome Cliente" value={customerName}
                                                onChange={e => setCustomerName(e.target.value)}
                                                className="w-full bg-white dark:bg-gray-900 p-3 rounded-xl text-[10px] font-bold outline-none border border-gray-100 dark:border-gray-800"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center px-2">
                                    <span className="text-gray-400 font-bold text-[10px] uppercase">Itens no carrinho</span>
                                    <span className="text-gray-800 dark:text-white font-black text-xs">{cart.length}</span>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span className="text-gray-400">Subtotal</span>
                                        <span className="text-gray-800 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0))}</span>
                                    </div>
                                    {shippingCost > 0 && (
                                        <div className="flex justify-between items-center text-[10px] font-bold text-brand-600">
                                            <span>Taxa de Entrega</span>
                                            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(shippingCost)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <span className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-tighter">Total Geral</span>
                                        <span className="text-lg font-black text-brand-600">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0) + shippingCost)}
                                        </span>
                                    </div>
                                </div>

                                <Button fullWidth onClick={handleSendOrder} disabled={sending} className="py-5 text-xs font-black uppercase tracking-widest rounded-[32px] shadow-xl shadow-brand-500/20">
                                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : isExternalOrder ? 'Finalizar Pedido Externo' : 'Enviar para Cozinha'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Perfil */}
            {
                showProfile && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in fade-in zoom-in-95">
                            <div className="flex flex-col items-center text-center">
                                <div className="relative group/avatar">
                                    <div
                                        onClick={triggerFileInput}
                                        className="w-24 h-24 bg-brand-100 dark:bg-brand-900/30 text-brand-600 rounded-[32px] flex items-center justify-center mb-6 overflow-hidden cursor-pointer border-4 border-transparent hover:border-brand-500 transition-all relative"
                                    >
                                        {uploadingPhoto ? (
                                            <Loader2 className="w-8 h-8 animate-spin" />
                                        ) : currentAvatarUrl ? (
                                            <img src={currentAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-12 h-12" />
                                        )}

                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                            <p className="text-white text-[10px] font-bold uppercase">Alterar</p>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handlePhotoUpload}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </div>
                                <h3 className="font-black text-2xl text-gray-900 dark:text-white mb-1">{collaborator.name}</h3>
                                <p className="text-brand-600 font-black text-[10px] uppercase tracking-[0.2em] mb-8">{collaborator.role === 'collaborator' ? 'Garçom Premium' : collaborator.role}</p>

                                <div className="w-full space-y-3 mb-8">
                                    {!changingPassword ? (
                                        <>
                                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl flex justify-between items-center text-xs font-bold">
                                                <span className="text-gray-400">Identificação ID</span>
                                                <span className="text-gray-800 dark:text-white uppercase">{collaborator.id?.substring(0, 8)}</span>
                                            </div>
                                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl flex justify-between items-center text-xs font-bold">
                                                <span className="text-gray-400">E-mail Login</span>
                                                <span className="text-gray-800 dark:text-white lowercase">{collaborator.email}</span>
                                            </div>
                                            <button
                                                onClick={() => setChangingPassword(true)}
                                                className="w-full py-3 text-xs font-black text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-2xl transition-colors border-2 border-dashed border-brand-200 dark:border-brand-900/50"
                                            >
                                                ALTERAR SENHA
                                            </button>
                                        </>
                                    ) : (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <input
                                                type="password"
                                                placeholder="Senha Atual"
                                                value={oldPassword}
                                                onChange={e => setOldPassword(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
                                            />
                                            <input
                                                type="password"
                                                placeholder="Nova Senha"
                                                value={newPassword}
                                                onChange={e => setNewPassword(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-brand-500"
                                            />
                                            <div className="flex gap-2">
                                                <Button fullWidth variant="secondary" onClick={() => { setChangingPassword(false); setOldPassword(''); setNewPassword(''); }} className="py-2.5">Cancelar</Button>
                                                <Button fullWidth onClick={handleChangePassword} disabled={sending} className="py-2.5">{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {!changingPassword && <Button fullWidth onClick={() => setShowProfile(false)} className="py-4">Fechar Perfil</Button>}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Produto Avulso */}
            {isCustomProductModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-xl dark:text-white">Produto Avulso</h3>
                            <button onClick={() => setIsCustomProductModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Nome do Produto</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Item Manual"
                                    value={customProduct.name}
                                    onChange={e => setCustomProduct({ ...customProduct, name: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-brand-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Preço (R$)</label>
                                    <input
                                        type="text"
                                        placeholder="0,00"
                                        value={customProduct.price}
                                        onChange={e => {
                                            let val = e.target.value.replace(/\D/g, '');
                                            if (val === '') {
                                                setCustomProduct({ ...customProduct, price: '' });
                                                return;
                                            }
                                            const numericValue = parseInt(val, 10) / 100;
                                            setCustomProduct({ ...customProduct, price: numericValue.toFixed(2).replace('.', ',') });
                                        }}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Quantidade</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={customProduct.quantity}
                                        onChange={e => setCustomProduct({ ...customProduct, quantity: parseInt(e.target.value) || 1 })}
                                        className="w-full bg-gray-50 dark:bg-gray-900 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button fullWidth onClick={handleAddCustomProduct} className="py-4 shadow-lg shadow-brand-500/20">Adicionar à Mesa</Button>
                    </div>
                </div>
            )}
            {/* Ticket Print Modal */}
            {showTicketPrint && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[40px] w-full max-w-sm">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <Printer className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight leading-tight">Comanda de Produção</h3>
                            <p className="text-xs text-gray-500 font-bold uppercase mt-1">
                                {showTicketPrint.orders_collaborators?.table_identifier} • {showTicketPrint.orders_collaborators?.customer_name || 'Sem Nome'}
                            </p>
                        </div>

                        <div className="space-y-4 mb-8 border-y border-gray-100 dark:border-gray-700 py-6 max-h-[40vh] overflow-y-auto custom-scrollbar">
                            {(Array.isArray(showTicketPrint.items) ? showTicketPrint.items : []).map((item: any, i: number) => (
                                <div key={i}>
                                    <div className="flex justify-between items-start">
                                        <span className="font-black text-gray-800 dark:text-white">{item.quantity}x {item.name || item.product?.name}</span>
                                    </div>
                                    {item.observation && (
                                        <p className="text-xs text-orange-600 font-black mt-1 italic">OBS: {item.observation}</p>
                                    )}
                                    {item.additional?.map((a: any, ai: number) => (
                                        <p key={ai} className="text-[10px] text-gray-400 font-bold ml-4 mt-0.5">↳ {a.value || a.name}</p>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="secondary" onClick={() => setShowTicketPrint(null)} className="rounded-2xl py-4 font-black uppercase text-[10px] tracking-widest h-auto">Fechar</Button>
                            <Button onClick={() => window.print()} className="rounded-2xl py-4 font-black uppercase text-[10px] tracking-widest bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/20 h-auto">Imprimir</Button>
                        </div>
                    </div>
                </div>
            )}
            {/* Scanner Modal */}
            {isScannerOpen && (
                <div className="fixed inset-0 bg-black/90 z-[110] flex flex-col items-center justify-center p-4">
                    <button
                        onClick={() => setIsScannerOpen(false)}
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-[120]"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <h2 className="text-white text-xl font-bold mb-6 flex items-center gap-2">
                        <Scan className="w-6 h-6 text-brand-500" />
                        Escanear Mesa
                    </h2>

                    <div className="w-full max-w-sm bg-black rounded-3xl overflow-hidden border border-gray-800 relative aspect-square shadow-2xl shadow-brand-500/10">
                        <div id="reader" className="w-full h-full"></div>
                        <div className="absolute inset-0 pointer-events-none border-2 border-brand-500/30 rounded-3xl" />
                        {/* Overlay indicativo */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/50 rounded-xl" />
                    </div>

                    <p className="text-gray-400 text-sm mt-8 text-center max-w-xs font-medium">
                        Aponte a câmera para o QR Code da mesa para iniciar.
                    </p>

                    <ScannerLogic
                        onScan={(decodedText) => {
                            try {
                                const data = JSON.parse(decodedText);
                                if (data.action === 'open_table' && data.table_identifier) {
                                    setIsScannerOpen(false);

                                    // Feedback visual/sonoro poderia ser adicionado aqui

                                    // Definir mesa e mudar view
                                    setTableName(data.table_identifier);
                                    setView('menu');

                                    // Limpar estados de novo pedido
                                    setIsExternalOrder(false);
                                    setSelectedOrderId(null);
                                    setCustomerName('');

                                    alert({ title: 'Mesa Identificada', message: `Mesa ${data.table_identifier} aberta com sucesso!` });
                                }
                            } catch (e) {
                                // console.log('QR Code scan error or invalid format', e);
                            }
                        }}
                        onClose={() => setIsScannerOpen(false)}
                    />
                </div>
            )}
        </div >
    );
};

// Logica separada para garantir cleanup correto do scanner
const ScannerLogic = ({ onScan, onClose }: { onScan: (text: string) => void, onClose: () => void }) => {
    useEffect(() => {
        let html5QrCode: Html5Qrcode | null = null;
        let isMounted = true;

        const startScanner = async () => {
            try {
                html5QrCode = new Html5Qrcode("reader");

                // Configuração da câmera
                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                // Tenta iniciar a câmera traseira diretamente
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        onScan(decodedText);
                        if (html5QrCode) {
                            html5QrCode.stop().then(() => {
                                html5QrCode?.clear();
                            }).catch(console.error);
                        }
                    },
                    (errorMessage) => {
                        // Erro de scan (silencioso)
                    }
                );
            } catch (err) {
                console.error("Erro ao iniciar câmera:", err);
                // Se falhar a câmera traseira, tenta qualquer uma disponível
                try {
                    if (html5QrCode && isMounted) {
                        await html5QrCode.start(
                            { facingMode: "user" }, // fallback para frontal ou padrão
                            { fps: 10, qrbox: { width: 250, height: 250 } },
                            (decodedText) => {
                                onScan(decodedText);
                            },
                            () => { }
                        );
                    }
                } catch (e2) {
                    console.error("Falha total na câmera:", e2);
                }
            }
        };

        const startScannerDirect = () => {
            // Lógica de início imediato
            startScanner();
        };
        startScannerDirect();

        return () => {
            isMounted = false;
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    html5QrCode?.clear();
                }).catch(console.error);
            }
        };
    }, []);

    return null;
};
