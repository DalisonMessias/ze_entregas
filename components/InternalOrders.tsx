import React, { useState, useEffect } from 'react';
import { StoreProduct, Order, CartItem, Product, PaymentMethod } from '../types';
import * as cloud from '../services/cloud';
import { Loader2, Search, Plus, Trash2, Printer, Save, ShoppingBag, Minus, X, Edit2, Package, Image as ImageIcon, CreditCard, Banknote, HelpCircle, CheckCircle, Clock, FileText, History as HistoryIcon, LayoutList, Share2, Copy } from 'lucide-react';


import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { useDialog } from '../utils/dialogService';

export const InternalOrders: React.FC = () => {
    // View State
    const [view, setView] = useState<'NEW_ORDER' | 'HISTORY'>('NEW_ORDER');

    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<{ product: StoreProduct, quantity: number }[]>([]);
    const { confirm, alert: showAlert } = useDialog();

    // Ticket State
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [observation, setObservation] = useState('');

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
    const [amountPaidStr, setAmountPaidStr] = useState('');
    const [customPaymentLabel, setCustomPaymentLabel] = useState('');
    const [processing, setProcessing] = useState(false);

    // Print Preview State
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [lastOrder, setLastOrder] = useState<Order | null>(null);

    // Product Management State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<StoreProduct>>({});
    const [savingProduct, setSavingProduct] = useState(false);

    // History State
    const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    useEffect(() => {
        if (view === 'HISTORY') {
            loadHistory();
        }
    }, [view]);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await cloud.getStoreProducts();
            setProducts(data);
        } catch (error) {
            console.error(error);
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

    const handleSaveProduct = async () => {
        if (!editingProduct.name || !editingProduct.price) return;
        setSavingProduct(true);
        try {
            if (editingProduct.id) {
                await cloud.updateStoreProduct(editingProduct as StoreProduct);
            } else {
                await cloud.createStoreProduct({
                    name: editingProduct.name,
                    description: editingProduct.description,
                    price: Number(editingProduct.price),
                    image_url: editingProduct.image_url,
                    category: editingProduct.category,
                    is_active: true
                });
            }
            await loadProducts();
            setIsProductModalOpen(false);
        } catch (error) {
            console.error(error);
            showAlert({ title: 'Erro', message: 'Erro ao salvar produto' });
        } finally {
            setSavingProduct(false);
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

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    );

    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

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
                    product_id: i.product.id,
                    name: i.product.name,
                    quantity: i.quantity,
                    price: i.product.price
                })),
                total_price: total,
                payment_method: paymentMethod,
                shipping_address: {}, // Empty for internal/pickup
                shipping_cost: 0,
                discount: 0,
                store_id: user.id,
                customer_name: customerName,
                customer_phone: customerPhone,
                observation: observation,
                origin: 'INTERNAL',
                amount_paid: paymentMethod === 'CASH' ? amountPaidIdx : undefined,
                change_amount: changeAmount,
                custom_payment_label: paymentMethod === 'OTHER' ? customPaymentLabel : undefined
            });

            setLastOrder(order);
            setShowPrintPreview(true);

            // Clear cart
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
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
                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold dark:text-white">Catálogo</h2>
                                <p className="text-gray-500 text-sm">Selecione os produtos</p>
                            </div>
                            <div>
                                <Button onClick={openNewProductModal} size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Produto
                                </Button>
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
                    <div className="w-full lg:w-96 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full lg:h-auto overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold dark:text-white">Comanda</h2>
                            <span className="text-sm font-mono text-gray-400">#{Math.floor(Math.random() * 1000).toString().padStart(4, '0')}</span>
                        </div>

                        <div className="space-y-4 mb-4">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <CustomInput
                                        label="Nome do Cliente"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Nome"
                                    />
                                </div>
                                <div className="w-1/3">
                                    <CustomInput
                                        label="Telefone"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        placeholder="(00) ..."
                                    />
                                </div>
                            </div>

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
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 mb-4 min-h-[150px]">
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
                        <div className="mb-4 space-y-3">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400">Pagamento</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'CASH', label: 'Dinheiro', icon: Banknote },
                                    { id: 'PIX', label: 'Pix', icon: CheckCircle },
                                    { id: 'CREDIT_CARD', label: 'Crédito', icon: CreditCard },
                                    { id: 'DEBIT_CARD', label: 'Débito', icon: CreditCard },
                                    { id: 'OTHER', label: 'Outro', icon: HelpCircle },
                                ].map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                                        className={`flex items-center gap-2 p-2 rounded-lg border text-sm transition-all ${paymentMethod === method.id ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/20 dark:border-brand-500 dark:text-brand-300' : 'bg-gray-50 dark:bg-gray-700 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'}`}
                                    >
                                        <method.icon className="w-4 h-4" />
                                        {method.label}
                                    </button>
                                ))}
                            </div>

                            {paymentMethod === 'CASH' && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-800">
                                    <CustomInput
                                        label="Valor Recebido"
                                        mask="currency"
                                        value={amountPaidStr}
                                        onChange={(e) => setAmountPaidStr(e.target.value)}
                                        placeholder="0,00"
                                        className="bg-white dark:bg-gray-800"
                                    />
                                    {changeAmount > 0 && (
                                        <div className="mt-2 flex justify-between items-center text-sm font-bold text-yellow-700 dark:text-yellow-400">
                                            <span>Troco:</span>
                                            <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(changeAmount)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {paymentMethod === 'OTHER' && (
                                <CustomInput
                                    label="Detalhe"
                                    value={customPaymentLabel}
                                    onChange={(e) => setCustomPaymentLabel(e.target.value)}
                                    placeholder="Descrição"
                                />
                            )}
                        </div>

                        {/* Totals */}
                        <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-4 mt-auto">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-gray-500">Total</span>
                                <span className="text-3xl font-black text-gray-900 dark:text-white">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                                </span>
                            </div>

                            <Button
                                className="w-full py-6 text-lg"
                                disabled={cart.length === 0 || processing}
                                onClick={handleCheckout}
                            >
                                {processing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Printer className="w-5 h-5 mr-2" />}
                                Finalizar
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">
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

            {/* Print Preview Modal */}
            {showPrintPreview && lastOrder && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-sm w-full max-w-[380px] p-8 shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col h-[85vh]">
                        <div className="flex justify-between items-center mb-4 no-print">
                            <h3 className="font-bold text-gray-900">Visualizar Impressão</h3>
                            <button onClick={() => setShowPrintPreview(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white text-black font-mono text-sm p-4 border border-gray-200 shadow-inner">
                            {/* Receipt Content */}
                            <div className="text-center mb-4">
                                <h2 className="text-xl font-black uppercase">Minha Loja</h2>
                                <p className="text-xs text-gray-500">Comprovante de Pedido</p>
                                <p className="text-xs text-gray-500">{new Date(lastOrder.created_at).toLocaleString('pt-BR')}</p>
                            </div>

                            <div className="mb-4 border-b border-dashed border-gray-300 pb-2">
                                <p><span className="font-bold">Cliente:</span> {lastOrder.customer_name || 'Balcão'}</p>
                                {lastOrder.customer_phone && <p><span className="font-bold">Tel:</span> {lastOrder.customer_phone}</p>}
                                {lastOrder.observation && <p><span className="font-bold">Obs:</span> {lastOrder.observation}</p>}
                            </div>

                            <table className="w-full text-left mb-4">
                                <thead>
                                    <tr className="border-b border-black">
                                        <th className="pb-1">Qtd</th>
                                        <th className="pb-1">Item</th>
                                        <th className="pb-1 text-right">Vl.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lastOrder.items.map((item, i) => (
                                        <tr key={i}>
                                            <td className="py-1 align-top">{item.quantity}x</td>
                                            <td className="py-1 align-top">{item.name}</td>
                                            <td className="py-1 align-top text-right">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.quantity)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="border-t border-dashed border-black pt-2 space-y-1">
                                <div className="flex justify-between font-bold text-lg">
                                    <span>TOTAL</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lastOrder.total_price)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span>Forma Pagto:</span>
                                    <span>
                                        {lastOrder.payment_method === 'CREDIT_CARD' ? 'Crédito' :
                                            lastOrder.payment_method === 'DEBIT_CARD' ? 'Débito' :
                                                lastOrder.payment_method === 'PIX' ? 'Pix' :
                                                    lastOrder.payment_method === 'CASH' ? 'Dinheiro' : 'Outro'}
                                    </span>
                                </div>
                                {(lastOrder.amount_paid || 0) > 0 && (
                                    <div className="flex justify-between text-xs">
                                        <span>Valor Pago:</span>
                                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lastOrder.amount_paid!)}</span>
                                    </div>
                                )}
                                {(lastOrder.change_amount || 0) > 0 && (
                                    <div className="flex justify-between text-xs font-bold">
                                        <span>Troco:</span>
                                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lastOrder.change_amount!)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 text-center text-xs opacity-50">
                                <p>Este documento não tem valor fiscal.</p>
                                <p>Sistema Zé Entregas</p>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-3 no-print">
                            <Button variant="outline" className="flex-1" onClick={() => setShowPrintPreview(false)}>Fechar</Button>
                            <Button variant="outline" onClick={handleShare} title="Compartilhar no WhatsApp">
                                <Share2 className="w-5 h-5" />
                            </Button>
                            <Button className="flex-1" onClick={() => window.print()}>
                                <Printer className="w-5 h-5 mr-2" />
                                Imprimir
                            </Button>
                        </div>


                        <style>{`
                            @media print {
                                body * {
                                    visibility: hidden;
                                }
                                .fixed.inset-0.bg-black\\/80 {
                                    background: white;
                                    position: absolute;
                                    inset: 0;
                                }
                                .fixed.inset-0.bg-black\\/80 * {
                                    visibility: visible;
                                }
                                .no-print {
                                    display: none !important;
                                }
                                .overflow-y-auto {
                                    overflow: visible !important;
                                    height: auto !important;
                                    border: none !important;
                                    box-shadow: none !important;
                                }
                            }
                        `}</style>
                    </div>
                </div>
            )}

            {/* Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold dark:text-white">
                                {editingProduct.id ? 'Editar Produto' : 'Novo Produto'}
                            </h3>
                            <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <CustomInput
                                label="Nome do Produto"
                                value={editingProduct.name || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                placeholder="Ex: X-Salada"
                            />

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <CustomInput
                                        label="Preço"
                                        mask="currency"
                                        value={editingProduct.price || ''}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/\D/g, '');
                                            const floatVal = Number(raw) / 100;
                                            setEditingProduct({ ...editingProduct, price: floatVal });
                                        }}
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>

                            <CustomInput
                                label="URL da Imagem (Opcional)"
                                value={editingProduct.image_url || ''}
                                onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                                placeholder="https://..."
                            />

                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Descrição</label>
                                <textarea
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 min-h-[100px] dark:text-white"
                                    value={editingProduct.description || ''}
                                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                    placeholder="Ingredientes, detalhes..."
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
                            <Button className="flex-1" onClick={handleSaveProduct} disabled={savingProduct || !editingProduct.name}>
                                {savingProduct ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                                Salvar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
