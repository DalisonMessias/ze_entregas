import React, { useState, useEffect } from 'react';
import { ShoppingBag, Hash, CheckCircle, MapPin, Star, Package, ArrowLeft } from 'lucide-react';
import { Loading } from './Loading';
import * as cloud from '../services/cloud';
import { Order } from '../types';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import { RatingModal } from './RatingModal';
import { useDeliveryRating } from '../hooks/useDeliveryRating';

interface UserOrdersProps {
    onBack?: () => void;
}

export const UserOrders: React.FC<UserOrdersProps> = ({ onBack }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Rating State
    const [ratedOrders, setRatedOrders] = useState<Set<string>>(new Set());
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [currentRatingOrder, setCurrentRatingOrder] = useState<Order | null>(null);
    const { submitRating } = useDeliveryRating();
    const { alert } = useDialog();

    const fetchOrders = async () => {
        setLoading(true);
        setError(false);
        try {
            const userOrders = await cloud.getMyOrders();
            // Sort by creation date desc
            const sorted = userOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setOrders(sorted);

            // Fetch Ratings
            const client = cloud.getClient();
            if (!client) return;
            const { data: session } = await client.auth.getSession();
            if (session?.session?.user) {
                const { data: ratings } = await client
                    .from('delivery_ratings')
                    .select('order_id')
                    .eq('user_id', session.session.user.id);
                if (ratings) {
                    setRatedOrders(new Set(ratings.map(r => r.order_id)));
                }
            }
        } catch (err) {
            console.error("Failed to fetch orders:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const getStatusChip = (status: string) => {
        const base = "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider";
        switch (status) {
            case 'pending':
            case 'pending_payment': return <div className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300`}>Pendente</div>;
            case 'pending_approval': return <div className={`${base} bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`}>Aguardando</div>;
            case 'approved':
            case 'paid': return <div className={`${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300`}>Pago / Aprovado</div>;
            case 'preparing': return <div className={`${base} bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300`}>Preparando</div>;
            case 'shipped': return <div className={`${base} bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300`}>Em Rota</div>;
            case 'delivered':
            case 'completed': return <div className={`${base} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`}><CheckCircle className="w-3 h-3" /> Entregue</div>;
            case 'cancelled': return <div className={`${base} bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300`}>Cancelado</div>;
            default: return <div className={`${base} bg-gray-100 text-gray-500`}>{status}</div>;
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const handleRateClick = (order: Order) => {
        setCurrentRatingOrder(order);
        setShowRatingModal(true);
    };

    const handleRateSubmit = async (rating: number, comment: string) => {
        if (!currentRatingOrder || !currentRatingOrder.driver_id) return;
        try {
            await submitRating(currentRatingOrder.id, currentRatingOrder.driver_id, rating, comment);
            setRatedOrders(prev => {
                const next = new Set(prev);
                next.add(currentRatingOrder.id);
                return next;
            });
            setShowRatingModal(false);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 animate-in fade-in pb-20">
            <div className="flex items-center gap-4 mb-8">
                {onBack && (
                    <button onClick={onBack} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                    <ShoppingBag className="w-8 h-8 text-brand-600" /> Meus Pedidos
                </h1>
            </div>

            {loading ? (
                <Loading variant="container" size="lg" message="Carregando seus pedidos..." />
            ) : error ? (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] text-center shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-red-500 font-bold mb-4">Erro ao carregar pedidos.</p>
                    <Button onClick={fetchOrders} variant="outline" size="sm">Tentar novamente</Button>
                </div>
            ) : orders.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-12 rounded-[40px] text-center shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold mb-6">Você ainda não realizou nenhum pedido.</p>
                    <Button onClick={() => window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'home' } }))}>Ir para o início</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orders.map(order => {
                        const isShop = order.store_id === '00000000-0000-0000-0000-000000000000'; // Assuming this for shop orders, or check logic
                        return (
                            <div key={order.id} className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-1">
                                            <Hash className="w-3 h-3" /> {order.id.substring(0, 8)}
                                            <span className="mx-1">•</span>
                                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                                        </div>
                                        <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">
                                            {order.customer_name ? `Pedido na Loja` : `Pedido Zé Entregas`}
                                        </h3>
                                    </div>
                                    {getStatusChip(order.status)}
                                </div>

                                <div className="flex-1 space-y-2 mb-6">
                                    {(order.items as any[]).map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-gray-900/40 p-2 rounded-xl">
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">{item.quantity}x {item.name}</span>
                                            <span className="text-gray-900 dark:text-white font-bold">{formatCurrency(item.price)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-gray-400 uppercase">Total</span>
                                        <span className="text-xl font-black text-brand-600 dark:text-brand-400">{formatCurrency(order.total_price)}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            fullWidth
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs font-bold"
                                            onClick={() => {
                                                window.history.pushState({}, '', `/track/${order.id}`);
                                                window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'order_tracking' } }));
                                            }}
                                        >
                                            <MapPin className="w-4 h-4 mr-1" /> Rastrear / Chat
                                        </Button>

                                        {order.status === 'delivered' && order.driver_id && !ratedOrders.has(order.id) && (
                                            <Button
                                                fullWidth
                                                variant="outline"
                                                size="sm"
                                                className="text-xs font-bold"
                                                onClick={() => handleRateClick(order)}
                                            >
                                                <Star className="w-4 h-4 mr-1" /> Avaliar
                                            </Button>
                                        )}
                                        {ratedOrders.has(order.id) && (
                                            <div className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold text-green-500 uppercase">
                                                <CheckCircle className="w-3 h-3" /> Avaliado
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <RatingModal
                isOpen={showRatingModal}
                onClose={() => setShowRatingModal(false)}
                onSubmit={handleRateSubmit}
                targetName="o Entregador"
                title="Avaliar Entrega"
            />
        </div>
    );
};
