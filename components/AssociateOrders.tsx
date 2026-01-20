
import React, { useState, useEffect } from 'react';
import { Package, MapPin, Navigation, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import * as cloud from '../services/cloud';
import * as storage from '../services/storage';
import { Order, DailyTransaction } from '../types';
import { useDialog } from '../utils/dialogService';

export const AssociateOrders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const { confirm, alert } = useDialog();

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await cloud.getAssociateActiveOrders();
            setOrders(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
        // Polling para atualização automática
        const interval = setInterval(loadOrders, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleUpdateStatus = async (orderId: string, newStatus: string, actionName: string) => {
        const confirmed = await confirm({
            title: actionName,
            message: `Deseja realmente marcar este pedido como ${actionName}?`,
            confirmButtonText: 'Sim, confirmar',
            cancelButtonText: 'Cancelar'
        });

        if (confirmed) {
            try {
                await cloud.updateOrderStatus(orderId, newStatus);

                // Se for finalizar entrega, adiciona ao Painel Diário (Financeiro)
                if (newStatus === 'DELIVERED') {
                    const order = orders.find(o => o.id === orderId);
                    if (order) {
                        const amount = Number(order.shipping_cost || 0);
                        const transaction: DailyTransaction = {
                            id: crypto.randomUUID(),
                            type: 'extra', // Usamos 'extra' para permitir valores variáveis
                            value: amount,
                            timestamp: Date.now(),
                            description: `Entrega Loja #${order.id.slice(0, 5)}`,
                            paymentMethod: 'cash', // Assumimos dinheiro por padrão ou podemos refinar depois
                            km: 0
                        };
                        const current = storage.getTodayTransactions();
                        storage.saveTodayTransactions([transaction, ...current]);
                    }
                }

                await loadOrders();
                await alert({ title: 'Sucesso', message: `Status atualizado para ${newStatus}!` });
            } catch (error) {
                await alert({ title: 'Erro', message: 'Falha ao atualizar status.' });
            }
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: any = {
            'READY': 'bg-blue-100 text-blue-700 border-blue-200',
            'ON_WAY': 'bg-amber-100 text-amber-700 border-amber-200',
            'DELIVERED': 'bg-green-100 text-green-700 border-green-200'
        };
        const labels: any = {
            'READY': 'Pronto para Entrega',
            'ON_WAY': 'Saiu para Entrega',
            'DELIVERED': 'Entregue'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || 'bg-gray-100'}`}>
                {labels[status] || status}
            </span>
        );
    };

    if (loading && orders.length === 0) {
        return <div className="p-8 text-center text-gray-500">Carregando pedidos...</div>;
    }

    return (
        <div className="max-w-md mx-auto p-4 space-y-4 pb-20">
            <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
                <Package className="w-8 h-8 text-brand-600" />
                Pedidos da Loja
            </h1>

            {orders.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Nenhum pedido ativo no momento.</p>
                </div>
            ) : (
                orders.map(order => (
                    <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <span className="font-mono font-bold text-gray-600">#{order.id.slice(0, 5)}</span>
                            {getStatusBadge(order.status)}
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                            {/* Store Info */}
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Retirar em</p>
                                    <p className="font-bold text-gray-800">{(order as any).store?.store_name || 'Loja Parceira'}</p>
                                    <p className="text-sm text-gray-600">
                                        {(order as any).store?.address_street}, {(order as any).store?.address_number}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 my-2"></div>

                            {/* Customer Info */}
                            <div className="flex items-start gap-3">
                                <Navigation className="w-5 h-5 text-brand-600 mt-1" />
                                <div>
                                    <p className="text-xs text-brand-600 uppercase font-bold">Entregar para</p>
                                    <p className="font-bold text-gray-800">{(order as any).user?.name || order.customer_name || 'Cliente'}</p>
                                    <p className="text-sm text-gray-600">
                                        {order.shipping_address?.street}, {order.shipping_address?.number}
                                    </p>
                                    <p className="text-sm text-gray-500">{order.shipping_address?.district} - {order.shipping_address?.city}</p>
                                    {order.shipping_address?.complement && (
                                        <p className="text-xs text-gray-500 mt-1 bg-yellow-50 p-1 rounded">
                                            Obs: {order.shipping_address.complement}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Pagamento se for na entrega */}
                            {order.payment_method !== 'PIX' && order.payment_method !== 'CREDIT_CARD' && (
                                <div className="bg-red-50 p-3 rounded-lg flex items-center gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    <div>
                                        <p className="text-xs font-bold text-red-700 uppercase">Cobrar na Entrega</p>
                                        <p className="font-bold text-lg text-red-800">R$ {Number(order.total_price).toFixed(2).replace('.', ',')}</p>
                                        <p className="text-xs text-red-600 capitalize">{order.payment_method.toLowerCase().replace('_', ' ')}</p>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                            {order.status === 'READY' && (
                                <button
                                    onClick={() => handleUpdateStatus(order.id, 'ON_WAY', 'Sair para Entrega')}
                                    className="flex-1 bg-brand-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-700 transition"
                                >
                                    <Navigation className="w-5 h-5" />
                                    Sair para Entrega
                                </button>
                            )}

                            {order.status === 'ON_WAY' && (
                                <button
                                    onClick={() => handleUpdateStatus(order.id, 'DELIVERED', 'Finalizar Entrega')}
                                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                    Entregue
                                </button>
                            )}

                            {/* Se status for diferente, apenas info ou nada */}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};
