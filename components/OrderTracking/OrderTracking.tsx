import React, { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle, Clock, ChefHat, Bike, MessageCircle, MapPin, Phone, User, ArrowLeft, Send, X, ShoppingBag, QrCode } from 'lucide-react';
import * as cloud from '../../services/cloud';
import { Button } from '../Button';
import { useDialog } from '../../utils/dialogService';
import { PixPaymentModal } from '../PixPaymentModal';

export const OrderTracking: React.FC = () => {
    const [orderId, setOrderId] = useState<string | null>(null);
    const [order, setOrder] = useState<any>(null);
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);
    const [showPixModal, setShowPixModal] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const { alert } = useDialog();

    // Parse URL
    useEffect(() => {
        const path = window.location.pathname;
        const match = path.match(/\/track\/([a-f0-9-]+)/i);
        if (match && match[1]) {
            setOrderId(match[1]);
        } else {
            setLoading(false);
        }
    }, []);

    // Load Order
    useEffect(() => {
        if (orderId) {
            loadOrder();
            // Poll for updates (Simulation of Realtime)
            const interval = setInterval(loadOrder, 5000);
            return () => clearInterval(interval);
        }
    }, [orderId]);

    // Scroll chat
    useEffect(() => {
        if (showChat) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, showChat]);

    const loadOrder = async () => {
        if (!orderId) return;
        try {
            const sb = cloud.getClient();
            if (!sb) return;

            // Fetch Order
            const { data: orderData, error } = await sb
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (error) throw error;
            setOrder((prev: any) => {
                // Only update if status changed to avoid re-renders or checks?
                // Actually React handles diffing.
                return orderData;
            });

            // Fetch Store
            if (orderData?.store_id && !store) {
                const { data: storeData } = await sb
                    .from('user_profiles')
                    .select('store_name, phone_number, store_logo_url, cover_url, store_address_street, store_address_number, store_address_district, store_address_city, store_address_state, config, pix_key, pix_key_type')
                    .eq('id', orderData.store_id)
                    .single();
                setStore(storeData);
            }

            // Fetch Public Chat Messages
            const chatData = await cloud.getPublicOrderChat(orderId);
            if (chatData) {
                setChatId(chatData.chatId);
                setMessages(chatData.messages);
            }

        } catch (e) {
            console.error("Erro ao carregar pedido:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !orderId) return;
        setSendingMsg(true);
        try {
            const success = await cloud.sendPublicMessage(orderId, newMessage);
            if (success) {
                setNewMessage('');
                await loadOrder(); // Refresh messages immediately
            } else {
                await alert({ title: 'Erro', message: 'Não foi possível enviar a mensagem.' });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSendingMsg(false);
        }
    };

    const getSteps = (type: string) => {
        if (type === 'PICKUP') {
            return [
                { status: 'pending', label: 'Aguardando', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100' },
                { status: 'accepted', label: 'Em Preparação', icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-100' },
                { status: 'in_transit', label: 'Pronto para Retirada', icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-100' },
                { status: 'completed', label: 'Retirado', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' }
            ];
        }
        // Default / Delivery
        return [
            { status: 'pending', label: 'Aguardando', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100' },
            { status: 'accepted', label: 'Em Preparação', icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-100' },
            { status: 'in_transit', label: 'Saiu para Entrega', icon: Bike, color: 'text-blue-500', bg: 'bg-blue-100' },
            { status: 'completed', label: 'Entregue', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' }
        ];
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <ArrowLeft className="w-8 h-8 text-gray-400 mb-4 cursor-pointer" onClick={() => window.history.back()} />
                <h2 className="text-xl font-bold text-gray-900">Pedido não encontrado</h2>
                <p className="text-gray-500">Verifique o link e tente novamente.</p>
            </div>
        );
    }

    const steps = getSteps(order.order_type);
    const normalizedStatus = order.status?.toLowerCase();
    const currentStepIndex = steps.findIndex(s =>
        s.status === normalizedStatus ||
        (s.status === 'accepted' && normalizedStatus === 'preparing')
    ) !== -1
        ? steps.findIndex(s => s.status === normalizedStatus || (s.status === 'accepted' && normalizedStatus === 'preparing'))
        : (normalizedStatus === 'rejected' || normalizedStatus === 'cancelled' ? -1 : 0);

    const isCancelled = normalizedStatus === 'cancelled' || normalizedStatus === 'rejected';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="font-bold text-gray-900 dark:text-white">Pedido #{order.id.slice(0, 8).toUpperCase()}</h1>
                    </div>
                    {store && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold hidden md:block text-gray-700 dark:text-gray-300">{store.store_name}</span>
                            {store.store_logo_url ? (
                                <img src={store.store_logo_url} className="w-8 h-8 rounded-full border border-gray-100" alt="Store Logo" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                                    {store.store_name?.charAt(0)}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-2xl">

                {/* Status Card */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
                    {isCancelled ? (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-red-600 mb-2">Pedido Cancelado</h2>
                            <p className="text-gray-500">Este pedido foi cancelado ou rejeitado.</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                                {order.order_type === 'PICKUP' ? 'Status da Retirada' : 'Status da Entrega'}
                            </h2>
                            <div className="space-y-8 relative">
                                {/* Line */}
                                <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-gray-800 -z-10" />

                                {steps.map((step, index) => {
                                    const isActive = index <= currentStepIndex;
                                    const isCurrent = index === currentStepIndex;

                                    return (
                                        <div key={step.status} className={`flex items-start gap-4 ${isActive ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${isActive ? step.bg + ' ' + step.color : 'bg-gray-100 text-gray-400'}`}>
                                                <step.icon className="w-6 h-6" />
                                            </div>
                                            <div className="pt-2">
                                                <h3 className={`font-bold ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>{step.label}</h3>
                                                {isCurrent && <p className="text-sm text-brand-600 font-medium animate-pulse">Em andamento...</p>}
                                            </div>
                                            {isCurrent && (
                                                <div className="ml-auto">
                                                    <span className="px-2 py-1 bg-brand-100 text-brand-700 text-xs font-bold rounded-full">Atual</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Order Details */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-gray-400" /> Detalhes do Pedido
                    </h3>
                    <div className="space-y-3">
                        {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-start text-sm">
                                <div className="flex gap-2">
                                    <span className="font-bold text-gray-900 dark:text-white">{item.quantity}x</span>
                                    <span className="text-gray-600 dark:text-gray-300">{item.name}</span>
                                </div>
                                <span className="font-medium text-gray-900 dark:text-white">R$ {item.total_price.toFixed(2).replace('.', ',')}</span>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-800 mt-4 pt-4 flex justify-between items-center">
                        <span className="font-bold text-gray-500">Total</span>
                        <span className="font-black text-xl text-brand-600">R$ {order.total_price.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>

                {/* Delivery/Pickup Info */}
                {order.order_type === 'DELIVERY' && order.shipping_address && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-20">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-gray-400" /> Endereço de Entrega
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {order.shipping_address.street}, {order.shipping_address.number}
                        </p>
                        {order.shipping_address.complement && (
                            <p className="text-sm text-gray-500">{order.shipping_address.complement}</p>
                        )}
                        <p className="text-sm text-gray-500">
                            {order.shipping_address.district} - {order.shipping_address.city}
                        </p>
                    </div>
                )}

                {order.order_type === 'PICKUP' && store && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 mb-20">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-gray-400" /> Retirar em
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 font-bold">
                            {store.store_name}
                        </p>
                        <p className="text-sm text-gray-500">
                            {store.store_address_street}, {store.store_address_number}
                        </p>
                        <p className="text-sm text-gray-500">
                            {store.store_address_district} - {store.store_address_city}/{store.store_address_state}
                        </p>
                    </div>
                )}

                {/* Pix Recovery Button */}
                {(order.payment_method?.toLowerCase().includes('pix')) &&
                    (order.status?.toLowerCase().includes('aguardando') ||
                        order.status?.toLowerCase() === 'pending' ||
                        order.status?.toLowerCase() === 'accepted' ||
                        order.status?.toLowerCase() === 'preparing') && (
                        <div className="fixed bottom-24 left-4 right-4 z-40 md:static md:mb-6">
                            <Button
                                fullWidth
                                className="py-4 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 rounded-2xl flex items-center justify-center gap-2"
                                onClick={() => setShowPixModal(true)}
                            >
                                <QrCode className="w-6 h-6" />
                                Pagar com PIX (Ver Código)
                            </Button>
                        </div>
                    )}
            </div>

            {/* Pix Payment Modal (Recovery) */}
            {showPixModal && store && (
                <PixPaymentModal
                    isOpen={showPixModal}
                    onClose={() => setShowPixModal(false)}
                    pixData={{
                        ...(store?.config?.pixdata || {
                            enabled: true,
                            key: store?.pix_key,
                            key_type: store?.pix_key_type || 'CPF',
                            bank_name: 'Banco'
                        }),
                        name: store?.config?.pixdata?.name || store?.store_name || 'LOJA',
                        city: store?.config?.pixdata?.city || store?.store_address_city || 'CIDADE'
                    }}
                    amount={order.total_price}
                    orderId={order.id}
                    storePhone={store.phone_number}
                />
            )}

            {/* Floating Chat Button */}
            <div className="fixed bottom-6 right-6 z-40">
                <Button
                    className="rounded-full w-14 h-14 shadow-lg flex items-center justify-center p-2.5 bg-brand-600 hover:bg-brand-700 text-white"
                    onClick={() => setShowChat(true)}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none transform translate-y-[0.5px]">
                        <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"></path>
                    </svg>
                    {messages.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                            {messages.length}
                        </span>
                    )}
                </Button>
            </div>

            {/* Chat Drawer/Modal */}
            {
                showChat && (
                    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:mx-auto sm:rounded-2xl h-[80vh] sm:h-[600px] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">

                            {/* Chat Header */}
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    {store?.store_logo_url ? (
                                        <img src={store.store_logo_url} className="w-10 h-10 rounded-full border border-gray-100" alt="Store" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                                            <MessageCircle className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{store?.store_name || 'Chat com a Loja'}</h3>
                                        <p className="text-xs text-gray-500">
                                            {messages.length > 0 ? 'Online' : 'Envie uma mensagem'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setShowChat(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950/50">
                                {messages.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400">
                                        <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">Nenhuma mensagem ainda.</p>
                                        <p className="text-xs">Tire suas dúvidas diretamente com a loja.</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isMe = msg.sender_type === 'guest';
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe
                                                    ? 'bg-brand-600 text-white rounded-br-none'
                                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 rounded-bl-none'
                                                    }`}>
                                                    <p>{msg.message}</p>
                                                    <span className={`text-[10px] mt-1 block ${isMe ? 'text-brand-200' : 'text-gray-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 rounded-b-2xl">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Digite sua mensagem..."
                                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                        disabled={sendingMsg}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || sendingMsg}
                                        className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {sendingMsg ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </form>
                            </div>

                        </div>
                    </div>
                )
            }

        </div >
    );
};
