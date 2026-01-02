import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import * as cloud from '../services/cloud';
import { Loader2, Search, Plus, Minus, ShoppingBag, Send, LogOut, Coffee } from 'lucide-react';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import { Logo } from './Logo';

interface Props {
    collaborator: any;
    onLogout: () => void;
}

export const CollaboratorModule: React.FC<Props> = ({ collaborator, onLogout }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [cart, setCart] = useState<{ product: Product, quantity: number, additional?: any[] }[]>([]);
    const [tableIdentifier, setTableIdentifier] = useState('');
    const [sending, setSending] = useState(false);

    const { alert } = useDialog();

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await cloud.getProductsForCollaborator(collaborator.store_id);
            setProducts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
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

    const handleSendOrder = async () => {
        if (cart.length === 0) return;
        if (!tableIdentifier.trim()) {
            await alert({ title: 'Atenção', message: 'Identifique a mesa ou comanda.' });
            return;
        }

        setSending(true);
        try {
            const items = cart.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
                additional: item.additional || []
            }));

            await cloud.placeCollaboratorOrder(collaborator.store_id, collaborator.id, tableIdentifier, items);

            await alert({ title: 'Sucesso', message: 'Pedido enviado para a cozinha/balcão!' });
            setCart([]);
            // setTableIdentifier(''); // Keep table identifier for next order? Usually waiters serve same table.
        } catch (error) {
            console.error(error);
            await alert({ title: 'Erro', message: 'Falha ao enviar pedido. Tente novamente.' });
        } finally {
            setSending(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.internal_code && p.internal_code.toLowerCase().includes(search.toLowerCase()))
    );

    const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center z-10 sticky top-0">
                <div className="flex items-center gap-2">
                    <Logo className="h-8 w-auto text-brand-600" mode="icon" />
                    <span className="font-bold text-gray-700 dark:text-gray-200 text-sm md:text-base">Módulo Mesa / {collaborator.username}</span>
                </div>
                <button onClick={onLogout} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Product List */}
                <div className="flex-1 p-4 flex flex-col overflow-hidden">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar produto (Nome ou Código)..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border-none rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="text-center p-10 text-gray-400">Nenhum produto encontrado.</div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-20 md:pb-0">
                                {filteredProducts.map(product => (
                                    <div key={product.id} onClick={() => addToCart(product)} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm cursor-pointer hover:ring-2 ring-brand-500 transition-all flex flex-col relative group">
                                        {/* Minimalist Card */}
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-2">{product.name}</h3>
                                            <span className="bg-brand-50 text-brand-700 text-xs font-bold px-2 py-1 rounded-lg">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                                            </span>
                                        </div>
                                        {product.internal_code && <span className="text-[10px] text-gray-400 mb-1">Cód: {product.internal_code}</span>}
                                        <p className="text-xs text-gray-500 line-clamp-2 flex-1">{product.description}</p>

                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-600 text-white p-1 rounded-full shadow-lg">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Cart / Sidebar */}
                <div className="w-full md:w-96 bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700 flex flex-col shadow-xl z-20 md:static fixed bottom-0 left-0 right-0 h-[60vh] md:h-auto transform md:transform-none transition-transform duration-300 rounded-t-3xl md:rounded-none" style={{
                    transform: cart.length > 0 && window.innerWidth < 768 ? 'translateY(0)' : window.innerWidth < 768 ? 'translateY(100%)' : 'none',
                    display: window.innerWidth < 768 && cart.length === 0 ? 'none' : 'flex'
                }}>
                    {/* Mobile Handle */}
                    <div className="md:hidden w-12 h-1 bg-gray-300 rounded-full mx-auto my-2" />

                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center justify-center gap-2 mb-2 text-gray-500 font-bold uppercase tracking-wider text-xs">
                            <Coffee className="w-4 h-4" /> Mesa / Comanda
                        </div>
                        <input
                            type="text"
                            value={tableIdentifier}
                            onChange={e => setTableIdentifier(e.target.value)}
                            placeholder="Ex: Mesa 10"
                            className="w-full text-center text-xl font-black bg-transparent border-none outline-none placeholder-gray-300 dark:text-white"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                                <div className="flex-1">
                                    <div className="font-bold text-sm dark:text-white">{item.product.name}</div>
                                    {item.additional && item.additional.length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {item.additional.map((add: any) => `+ ${add.name}`).join(', ')}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-400 mt-1">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center bg-white dark:bg-gray-600 rounded-lg shadow-sm">
                                        <button onClick={() => item.quantity > 1 ? updateQuantity(item.product.id, -1) : removeFromCart(item.product.id)} className="p-1 hover:text-red-500 w-8 flex justify-center"><Minus className="w-4 h-4" /></button>
                                        <span className="font-bold w-6 text-center text-sm">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:text-green-500 w-8 flex justify-center"><Plus className="w-4 h-4" /></button>
                                    </div>
                                    <div className="font-bold text-sm min-w-[60px] text-right">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.product.price * item.quantity)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-500 text-sm">Total</span>
                            <span className="text-2xl font-black text-gray-900 dark:text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                            </span>
                        </div>
                        <Button
                            onClick={handleSendOrder}
                            disabled={cart.length === 0 || sending}
                            fullWidth
                            className="py-4 text-lg shadow-lg shadow-brand-500/20"
                        >
                            {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                <>
                                    <Send className="w-5 h-5 mr-2" /> Enviar Pedido
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Mobile Cart Floating Action Button - Only visible when cart has items and sidebar is hidden */}
                {cart.length > 0 && window.innerWidth < 768 && (
                    <div className="fixed bottom-4 right-4 md:hidden z-10">
                        {/* Logic handled by CSS transform in sidebar */}
                    </div>
                )}
            </div>
        </div>
    );
};
