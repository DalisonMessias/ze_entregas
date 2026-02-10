
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  CheckCircle,
  ChefHat,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Send,
  ShoppingBag,
  Store,
  Truck,
  X,
} from 'lucide-react';
import * as cloud from '../../services/cloud';
import { Button } from '../Button';
import { useDialog } from '../../utils/dialogService';
import { PixPaymentModal } from '../PixPaymentModal';

type OrderType = 'DELIVERY' | 'PICKUP';

type Step = {
  status: 'pending' | 'preparing' | 'in_transit' | 'delivered';
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  color: string;
  border: string;
};

const formatCurrency = (value: number) => `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`;

const normalizeStatus = (rawStatus?: string | null) => {
  const status = String(rawStatus || '').trim().toUpperCase();
  if (!status) return 'pending';
  if (
    status === 'PENDING' ||
    status === 'PENDING_PAYMENT' ||
    status === 'PENDING_APPROVAL' ||
    status === 'CONFIRMED' ||
    status.includes('AGUARDANDO') ||
    status.includes('PAGAMENTO A COMBINAR')
  ) {
    return 'pending';
  }
  if (status === 'ACCEPTED' || status === 'PREPARING' || status === 'PRODUCING') return 'preparing';
  if (status === 'READY' || status === 'IN_DELIVERY' || status === 'IN_TRANSIT' || status === 'ON_WAY') return 'in_transit';
  if (status === 'DELIVERED' || status === 'COMPLETED') return 'delivered';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'cancelled';
  return status.toLowerCase();
};

const getSteps = (orderType: OrderType): Step[] => {
  if (orderType === 'PICKUP') {
    return [
      { status: 'pending', label: 'Pedido recebido', desc: 'Aguardando aceite da loja.', icon: Clock, bg: 'bg-amber-100', color: 'text-amber-700', border: 'border-amber-200' },
      { status: 'preparing', label: 'Em preparo', desc: 'Pedido aceito e em producao.', icon: ChefHat, bg: 'bg-orange-100', color: 'text-orange-700', border: 'border-orange-200' },
      { status: 'in_transit', label: 'Pronto para retirar', desc: 'Dirija-se ate a loja com seu codigo.', icon: ShoppingBag, bg: 'bg-blue-100', color: 'text-blue-700', border: 'border-blue-200' },
      { status: 'delivered', label: 'Retirado', desc: 'Retirada concluida.', icon: CheckCircle, bg: 'bg-emerald-100', color: 'text-emerald-700', border: 'border-emerald-200' },
    ];
  }

  return [
    { status: 'pending', label: 'Pedido recebido', desc: 'Aguardando aceite da loja.', icon: Clock, bg: 'bg-amber-100', color: 'text-amber-700', border: 'border-amber-200' },
    { status: 'preparing', label: 'Em preparo', desc: 'Pedido aceito e em producao.', icon: ChefHat, bg: 'bg-orange-100', color: 'text-orange-700', border: 'border-orange-200' },
    { status: 'in_transit', label: 'Saiu para entrega', desc: 'Pedido em rota para seu endereco.', icon: Bike, bg: 'bg-blue-100', color: 'text-blue-700', border: 'border-blue-200' },
    { status: 'delivered', label: 'Entregue', desc: 'Entrega concluida.', icon: CheckCircle, bg: 'bg-emerald-100', color: 'text-emerald-700', border: 'border-emerald-200' },
  ];
};

const getPaymentMethodLabel = (method?: string) => {
  const normalized = String(method || '').toUpperCase();
  if (normalized === 'PIX') return 'PIX';
  if (normalized === 'CREDIT_CARD') return 'Cartao de credito';
  if (normalized === 'DEBIT_CARD') return 'Cartao de debito';
  if (normalized === 'BOLETO') return 'Boleto';
  if (normalized === 'CASH') return 'Dinheiro';
  if (normalized === 'PENDING') return 'A combinar';
  return method || 'Nao informado';
};

const isPaymentConfirmed = (order: any) => {
  const paymentStatus = String(order?.payment_status || '').toUpperCase();
  const infinitepayStatus = String(order?.infinitepay_status || '').toUpperCase();
  const amountPaid = Number(order?.amount_paid || 0);
  return (
    ['PAID', 'CONFIRMED', 'COMPLETED', 'APPROVED', 'SUCCESS'].includes(paymentStatus) ||
    ['PAID', 'COMPLETED', 'APPROVED'].includes(infinitepayStatus) ||
    amountPaid > 0
  );
};

const isPlatformPayment = (order: any) => {
  const method = String(order?.payment_method || '').toUpperCase();
  const details = order?.payment_details || {};
  const gateway = String(details.gateway || details.provider || '').toLowerCase();
  if (['CREDIT_CARD', 'DEBIT_CARD', 'BOLETO'].includes(method)) return true;
  if (method === 'PIX' && (!!order?.infinitepay_id || !!order?.infinitepay_status || !!order?.infinitepay_url || gateway === 'mercadopago' || gateway === 'infinitepay')) return true;
  return false;
};

export const OrderTracking: React.FC = () => {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);

  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [lastCancelResult, setLastCancelResult] = useState<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const { alert, confirm, toast } = useDialog();

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/track\/([a-f0-9-]+)/i);

    if (match && match[1]) {
      setOrderId(match[1]);
    } else {
      setLoading(false);
    }
  }, []);

  const loadOrder = async (silent = false) => {
    if (!orderId) return;

    if (!silent) {
      setLoading(true);
    }

    try {
      const sb = cloud.getClient();
      if (!sb) return;

      const { data: orderData, error } = await sb
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(orderData);

      if (orderData?.store_id) {
        const { data: storeData } = await sb
          .from('user_profiles')
          .select('name, store_name, phone_number, store_logo_url, cover_url, store_address_street, store_address_number, store_address_district, store_address_city, store_address_state, opening_hours, preparation_time, preparation_time_min, preparation_time_max, delivery_time_max, config, pix_key, pix_key_type')
          .eq('id', orderData.store_id)
          .single();
        setStore(storeData || null);
      }

      const chatData = await cloud.getPublicOrderChat(orderId);
      if (chatData) {
        setChatId(chatData.chatId);
        setMessages(chatData.messages);
      }
    } catch (e) {
      console.error('Erro ao carregar pedido:', e);
      if (!silent) {
        toast({ type: 'error', message: 'Nao foi possivel carregar o pedido.' });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!orderId) return;

    void loadOrder();

    const sb = cloud.getClient();
    if (!sb) return;

    const channel = sb
      .channel(`order-updates-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const updatedOrder = payload.new as any;
          setOrder((prev: any) => ({ ...prev, ...updatedOrder }));
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    if (!order?.driver_id) {
      setDriver(null);
      return;
    }

    const loadDriver = async () => {
      const sb = cloud.getClient();
      if (!sb) return;
      const { data } = await sb
        .from('user_profiles')
        .select('id, name, phone_number, vehicle_type, is_available')
        .eq('id', order.driver_id)
        .single();
      setDriver(data || null);
    };

    void loadDriver();
  }, [order?.driver_id]);

  useEffect(() => {
    if (!chatId) return;

    const sb = cloud.getClient();
    if (!sb) return;

    const channel = sb
      .channel(`chat-messages-${chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${chatId}` },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [chatId]);

  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !orderId) return;
    setSendingMsg(true);
    try {
      const success = await cloud.sendPublicMessage(orderId, newMessage);
      if (success) {
        setNewMessage('');
        await loadOrder(true);
      } else {
        toast({ type: 'error', message: 'Nao foi possivel enviar a mensagem.' });
      }
    } catch (e) {
      console.error(e);
      toast({ type: 'error', message: 'Erro ao enviar mensagem.' });
    } finally {
      setSendingMsg(false);
    }
  };
