
import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  CheckCircle,
  ChefHat,
  Clock,
  CreditCard,
  Download,
  FileText,
  ImageIcon,
  Loader2,
  MessageCircle,
  Paperclip,
  Phone,
  QrCode,
  RefreshCw,
  Send,
  ShoppingBag,
  Store,
  Truck,
  X,
} from 'lucide-react';
import * as cloud from '../../services/cloud';
import { Button } from '../Button';
import { Logo } from '../Logo';
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

const formatPhone = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return String(value || '').trim();
};

const formatFileSize = (value?: number) => {
  const size = Number(value || 0);
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${size} B`;
};

const isImageAttachment = (mimeType?: string) => String(mimeType || '').toLowerCase().startsWith('image/');

const firstNonEmpty = (...values: Array<any>) => {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
};

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

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando aceite',
  PENDING_PAYMENT: 'Aguardando pagamento',
  PENDING_APPROVAL: 'Aguardando confirmação',
  CONFIRMED: 'Confirmado',
  ACCEPTED: 'Aceito pela loja',
  PREPARING: 'Em preparo',
  PRODUCING: 'Em produção',
  READY: 'Pronto',
  IN_DELIVERY: 'Saiu para entrega',
  IN_TRANSIT: 'Em transito',
  ON_WAY: 'A caminho',
  DELIVERED: 'Entregue',
  COMPLETED: 'concluído',
  CANCELLED: 'Cancelado',
  REJECTED: 'Rejeitado',
};

const getStatusLabel = (rawStatus?: string | null) => {
  const key = String(rawStatus || '').trim().toUpperCase();
  if (!key) return 'Aguardando';
  return STATUS_LABELS[key] || key.replace(/_/g, ' ').toLowerCase();
};

const getSteps = (orderType: OrderType): Step[] => {
  if (orderType === 'PICKUP') {
    return [
      {
        status: 'pending',
        label: 'Pedido recebido',
        desc: 'Aguardando aceite da loja.',
        icon: Clock,
        bg: 'bg-amber-100',
        color: 'text-amber-700',
        border: 'border-amber-200',
      },
      {
        status: 'preparing',
        label: 'Em preparo',
        desc: 'Pedido aceito e Em produção.',
        icon: ChefHat,
        bg: 'bg-orange-100',
        color: 'text-orange-700',
        border: 'border-orange-200',
      },
      {
        status: 'in_transit',
        label: 'Pronto para retirar',
        desc: 'Dirija-se ate a loja com o codigo de retirada.',
        icon: ShoppingBag,
        bg: 'bg-blue-100',
        color: 'text-blue-700',
        border: 'border-blue-200',
      },
      {
        status: 'delivered',
        label: 'Retirado',
        desc: 'Retirada concluida.',
        icon: CheckCircle,
        bg: 'bg-emerald-100',
        color: 'text-emerald-700',
        border: 'border-emerald-200',
      },
    ];
  }

  return [
    {
      status: 'pending',
      label: 'Pedido recebido',
      desc: 'Aguardando aceite da loja.',
      icon: Clock,
      bg: 'bg-amber-100',
      color: 'text-amber-700',
      border: 'border-amber-200',
    },
    {
      status: 'preparing',
      label: 'Em preparo',
      desc: 'Pedido aceito e Em produção.',
      icon: ChefHat,
      bg: 'bg-orange-100',
      color: 'text-orange-700',
      border: 'border-orange-200',
    },
    {
      status: 'in_transit',
      label: 'Saiu para entrega',
      desc: 'Pedido em rota para o endereco informado.',
      icon: Bike,
      bg: 'bg-blue-100',
      color: 'text-blue-700',
      border: 'border-blue-200',
    },
    {
      status: 'delivered',
      label: 'Entregue',
      desc: 'Entrega concluida.',
      icon: CheckCircle,
      bg: 'bg-emerald-100',
      color: 'text-emerald-700',
      border: 'border-emerald-200',
    },
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
  return method || 'Não informado';
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

const isPlatformPayment = (order: any, store?: any) => {
  const method = String(order?.payment_method || '').toUpperCase();
  const details = order?.payment_details || {};
  const gateway = String(details.gateway || details.provider || details.method || '').toLowerCase();

  // Detecção por Métodos On-line Padrão (Sempre Plataforma neste sistema)
  if (['CREDIT_CARD', 'DEBIT_CARD', 'BOLETO'].includes(method)) return true;

  // Detecção por Configuração da Loja
  if (store?.receive_orders_via_platform) {
    if (method === 'PIX') return true;
  }

  // Detecção por Metadados de Gateway
  if (gateway.includes('mercadopago') || gateway.includes('infinitepay') || gateway.includes('pix_automatico')) return true;
  if (!!order?.infinitepay_id || !!order?.infinitepay_url || !!details?.payment_id) return true;

  // Detecção por dados de PIX da plataforma
  if (method === 'PIX' && (!!details?.qr_code || !!details?.pix_payload || !!details?.url)) return true;

  return false;
};

const getCancellationBlockReason = (normalizedStatus: string, rawStatus: string, orderType: OrderType) => {
  const statusLabel = getStatusLabel(rawStatus);

  if (normalizedStatus === 'cancelled') {
    return `Cancelamento indisponível: o pedido ja esta finalizado como ${statusLabel}.`;
  }

  if (normalizedStatus === 'preparing') {
    return `Cancelamento indisponível: o pedido já foi aceito pela loja e está em produção. Status atual: ${statusLabel}.`;
  }

  if (normalizedStatus === 'in_transit' || normalizedStatus === 'delivered') {
    return orderType === 'PICKUP'
      ? `Cancelamento indisponível: o pedido já foi encaminhado para retirada ou concluído. Status atual: ${statusLabel}.`
      : `Cancelamento indisponível: o pedido já foi encaminhado para entrega ou concluído. Status atual: ${statusLabel}.`;
  }

  if (normalizedStatus !== 'pending') {
    return `Cancelamento indisponível para o status atual: ${statusLabel}.`;
  }

  return null;
};

const getOpeningHoursLabel = (openingHours: any) => {
  if (!openingHours) return 'Consulte a loja no chat para confirmar o horario.';
  if (typeof openingHours === 'string' && openingHours.trim()) return openingHours;
  if (typeof openingHours === 'object') return 'Consulte os horarios da loja no chat.';
  return 'Consulte a loja no chat para confirmar o horario.';
};

export const OrderTracking: React.FC = () => {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [store, setStore] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedChatFile, setSelectedChatFile] = useState<File | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [platformPixConfig, setPlatformPixConfig] = useState<{
    pix_key: string;
    pix_key_type: string;
    merchant_name: string;
    merchant_city: string;
  } | null>(null);

  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [lastCancelResult, setLastCancelResult] = useState<any>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
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

      // Auto-open Payment Modal/Checkout for platform orders awaiting payment
      const isPendingPlatform = isPlatformPayment(orderData) &&
        (orderData.status === 'PENDING' || orderData.payment_status === 'pending');

      if (isPendingPlatform && (orderData.receive_orders_via_platform ?? true)) {
        // Se for PIX, abre o modal. Se for Cartão e tiver link, o botão estará lá.
        // Para evitar popups bloqueados, só abrimos o modal de PIX aqui.
        if (orderData.payment_method?.toLowerCase()?.includes('pix')) {
          setShowPixModal(true);
        }
      }

      if (orderData?.store_id) {
        const { data: storeData } = await sb
          .from('user_profiles')
          .select('name, store_name, phone_number, chat_number, receive_orders_via_platform, receive_orders_via_chat, store_logo_url, cover_url, store_address_street, store_address_number, store_address_district, store_address_city, store_address_state, opening_hours, preparation_time, preparation_time_min, preparation_time_max, delivery_time_max, config, pix_key, pix_key_type')
          .eq('id', orderData.store_id)
          .single();

        let mergedStore: any = storeData || null;
        const currentPhone = String(storeData?.chat_number || storeData?.phone_number || '').trim();

        if (!currentPhone) {
          const settings = await cloud.getStoreSettings(orderData.store_id);
          const fallbackPhone = String(settings?.chat_number || settings?.support_phone || settings?.phone_number || '').trim();

          if (fallbackPhone) {
            mergedStore = {
              ...(mergedStore || {}),
              chat_number: mergedStore?.chat_number || fallbackPhone,
              phone_number: mergedStore?.phone_number || fallbackPhone
            };
          }
        }

        setStore(mergedStore);
      }

      const chatData = await cloud.getPublicOrderChat(orderId);
      if (chatData) {
        setChatId(chatData.chatId);
        setMessages(chatData.messages);
      }
    } catch (e) {
      console.error('Erro ao carregar pedido:', e);
      if (!silent) {
        toast({ type: 'error', message: 'Não foi possível carregar o pedido.' });
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
    if (!orderId) return;

    const intervalId = window.setInterval(() => {
      void loadOrder(true);
    }, 120000);

    return () => window.clearInterval(intervalId);
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
    const loadPublicPixConfig = async () => {
      try {
        const config = await cloud.getPublicPixConfig();
        setPlatformPixConfig(config);
      } catch (e) {
        console.error('Erro ao carregar config PIX publica:', e);
      }
    };
    void loadPublicPixConfig();
  }, []);

  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, showChat]);

  const clearSelectedFile = () => {
    setSelectedChatFile(null);
    if (chatFileInputRef.current) {
      chatFileInputRef.current.value = '';
    }
  };

  const handleSelectChatFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      toast({ type: 'warning', message: 'Arquivo muito grande. Limite de 10MB.' });
      event.target.value = '';
      return;
    }

    setSelectedChatFile(file);
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedChatFile) || !orderId) return;
    setSendingMsg(true);
    try {
      const success = await cloud.sendPublicMessage(orderId, newMessage.trim(), selectedChatFile || undefined);
      if (success) {
        setNewMessage('');
        clearSelectedFile();
        await loadOrder(true);
      } else {
        toast({ type: 'error', message: 'Nao foi possivel enviar a mensagem/arquivo.' });
      }
    } catch (e) {
      console.error(e);
      toast({ type: 'error', message: 'Erro ao enviar mensagem.' });
    } finally {
      setSendingMsg(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadOrder(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDownloadReceiptPng = async () => {
    if (!receiptRef.current || !order?.id) return;
    setDownloadingReceipt(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `comprovante-pedido-${String(order.id).slice(0, 8).toUpperCase()}.png`;
      link.click();
      toast({ type: 'success', message: 'Comprovante PNG gerado com sucesso.' });
    } catch (error: any) {
      console.error('Erro ao gerar comprovante PNG:', error);
      toast({ type: 'error', message: 'Nao foi possivel gerar o comprovante.' });
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const openSupport = () => {
    const orderTag = order?.id ? `pedido-${String(order.id).slice(0, 8).toUpperCase()}` : 'pedido';
    const url = `/suporte?ref=${encodeURIComponent(orderTag)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const orderType: OrderType = useMemo(() => {
    const raw = String(order?.order_type || '').toUpperCase();
    if (raw === 'PICKUP' || raw === 'LOCAL') return 'PICKUP';
    if (raw === 'DELIVERY') return 'DELIVERY';
    return order?.shipping_address ? 'DELIVERY' : 'PICKUP';
  }, [order?.order_type, order?.shipping_address]);

  const normalizedStatus = useMemo(() => normalizeStatus(order?.status), [order?.status]);
  const statusLabel = useMemo(() => getStatusLabel(order?.status), [order?.status]);
  const steps = useMemo(() => getSteps(orderType), [orderType]);
  const isCancelled = normalizedStatus === 'cancelled';

  const currentStepIndex = useMemo(() => {
    if (isCancelled) return -1;
    const statusToIndex: Record<string, number> = {
      pending: 0,
      preparing: 1,
      in_transit: 2,
      delivered: 3,
    };
    return statusToIndex[normalizedStatus] ?? 0;
  }, [isCancelled, normalizedStatus]);

  const cancellationBlockReason = useMemo(() => {
    if (!order) return 'Cancelamento indisponível no momento.';
    return getCancellationBlockReason(normalizedStatus, order?.status, orderType);
  }, [order, normalizedStatus, orderType]);

  const canCancel = useMemo(() => !!order && !isCancelled && !cancellationBlockReason, [order, isCancelled, cancellationBlockReason]);

  const paymentConfirmed = useMemo(() => isPaymentConfirmed(order), [order]);
  const platformPayment = useMemo(() => isPlatformPayment(order, store), [order, store]);

  const requiresSupportRefund = useMemo(() => {
    if (lastCancelResult && typeof lastCancelResult.requires_support_refund === 'boolean') {
      return !!lastCancelResult.requires_support_refund;
    }
    return isCancelled && paymentConfirmed && platformPayment;
  }, [isCancelled, paymentConfirmed, platformPayment, lastCancelResult]);

  const shippingAddress = useMemo(() => {
    const raw = order?.shipping_address;
    if (!raw) return null;
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw);
      } catch {
        return { raw };
      }
    }
    return raw;
  }, [order?.shipping_address]);

  const storeName = store?.store_name || store?.name || 'Loja';
  const storeContactRaw = firstNonEmpty(
    store?.chat_number,
    store?.phone_number,
    order?.store?.chat_number,
    order?.store?.phone_number,
    order?.store_phone,
    order?.store_phone_number,
    order?.store_contact_phone,
    order?.payment_details?.store_phone,
    order?.payment_details?.store_phone_number,
    order?.payment_details?.contact_phone,
    order?.payment_details?.whatsapp,
    order?.payment_details?.chat_number
  );
  const storeOwnerPhone = formatPhone(storeContactRaw);
  const storePhoneDigits = String(storeContactRaw).replace(/\D/g, '');
  const storeAddressLine1 = store?.store_address_street
    ? `${store.store_address_street}${store?.store_address_number ? `, ${store.store_address_number}` : ''}`
    : 'Endereço da loja indisponível';
  const storeAddressLine2 = [store?.store_address_district, store?.store_address_city, store?.store_address_state].filter(Boolean).join(' - ');

  const pickupCode = order?.pickup_code || order?.delivery_code || order?.return_code;

  const itemsSubtotal = useMemo(() => {
    if (!Array.isArray(order?.items)) return 0;
    return order.items.reduce((acc: number, item: any) => {
      return acc + Number(item?.total_price || Number(item?.price || 0) * Number(item?.quantity || 0) || 0);
    }, 0);
  }, [order?.items]);

  const deliveryFee = Number(order?.shipping_cost || 0);
  const discountValue = Number(order?.discount || 0);
  const couponDiscountValue = Number((order as any)?.coupon_discount_value || 0);
  const totalValue = Number(order?.total_price || 0);
  const amountPaid = Number(order?.amount_paid || 0);

  const typeTheme = useMemo(
    () =>
      orderType === 'DELIVERY'
        ? {
          pageBg: 'bg-gradient-to-b from-blue-50 via-gray-50 to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950',
          badge: 'bg-blue-100 text-blue-700 border border-blue-200',
          icon: Truck,
          title: 'Entrega',
        }
        : {
          pageBg: 'bg-gradient-to-b from-amber-50 via-gray-50 to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-950',
          badge: 'bg-amber-100 text-amber-700 border border-amber-200',
          icon: Store,
          title: 'Retirada',
        },
    [orderType]
  );

  const estimatedLabel = useMemo(() => {
    const prepMin = Number(store?.preparation_time_min ?? store?.preparation_time ?? 0);
    const prepMaxRaw = Number(store?.preparation_time_max ?? store?.preparation_time ?? prepMin);
    const prepMax = prepMaxRaw > 0 ? prepMaxRaw : prepMin;

    if (orderType === 'PICKUP') {
      if (prepMin > 0 && prepMax > 0) {
        if (prepMin === prepMax) return `${prepMax} min`;
        return `${prepMin}-${prepMax} min`;
      }
      return 'Consulte no chat';
    }

    const deliveryMax = Number(store?.delivery_time_max || 0);
    const totalMax = prepMax + (deliveryMax > 0 ? deliveryMax : 0);
    if (totalMax > 0) return `Ate ${totalMax} min`;
    if (prepMax > 0) return `Ate ${prepMax} min`;
    return 'Consulte no chat';
  }, [store?.preparation_time_min, store?.preparation_time_max, store?.preparation_time, store?.delivery_time_max, orderType]);

  const driverStatusLabel = useMemo(() => {
    if (orderType !== 'DELIVERY') return '';
    if (normalizedStatus === 'delivered') return 'Entrega concluida';
    if (driver && normalizedStatus === 'in_transit') return 'Motoboy em rota';
    if (driver) return 'Entregador definido';
    if (normalizedStatus === 'in_transit') return 'Pedido em rota';
    return 'Aguardando entregador';
  }, [orderType, normalizedStatus, driver]);

  const isPixOrder = useMemo(() => {
    const method = String(order?.payment_method || '').toLowerCase();
    const paymentStatus = String(order?.payment_status || '').toLowerCase();
    const rawStatus = String(order?.status || '').toUpperCase();
    const details = order?.payment_details || {};
    const gateway = String(details?.gateway || details?.provider || '').toLowerCase();
    const isPixByMethod = method.includes('pix');
    const isPixByStatus = rawStatus.includes('PIX') || paymentStatus.includes('pix');
    const isPixByDetails =
      gateway.includes('pix') ||
      gateway.includes('infinitepay') ||
      gateway.includes('mercadopago') ||
      !!details?.pix ||
      !!details?.pix_key ||
      !!details?.pix_payload ||
      !!details?.qr_code ||
      !!details?.qrCode;
    return isPixByMethod || isPixByStatus || isPixByDetails;
  }, [order?.payment_method, order?.payment_status, order?.payment_details, order?.status]);

  const storeReceiveViaPlatform = (store?.receive_orders_via_platform ?? true) === true;
  const storeReceiveViaChat = (store?.receive_orders_via_chat ?? false) === true;
  const storePixConfig = store?.config?.pixdata || {};
  const storePixKey = String(storePixConfig?.keyPix || storePixConfig?.key || store?.pix_key || '').trim();
  const storePixCopyPasteEnabled = !!storePixConfig?.enabled;
  const storePixManualActive = storeReceiveViaChat && storePixCopyPasteEnabled && !!storePixKey;

  const canShowPaymentButton = useMemo(() => {
    const rawStatus = String(order?.status || '').toUpperCase();
    const blockedStatuses = ['CANCELLED', 'REJECTED', 'DELIVERED', 'COMPLETED'];
    const canByStatus = !blockedStatuses.includes(rawStatus);

    if (!canByStatus || paymentConfirmed) return false;

    // Regra 1: Via plataforma ativo => mostra botão para finalizar pagamento (Cartão ou PIX)
    if (storeReceiveViaPlatform && platformPayment) return true;

    // Regra 2: WhatsApp + PIX Manual ativo => mostra botão de ver código
    if (storeReceiveViaChat && isPixOrder && storePixManualActive) return true;

    return false;
  }, [order?.status, isPixOrder, platformPayment, paymentConfirmed, storeReceiveViaChat, storePixManualActive, storeReceiveViaPlatform]);

  const shouldForceWhatsAppReceiving = useMemo(() => {
    if (!isPixOrder) return false;
    if (storeReceiveViaPlatform) return false;
    if (storePixManualActive) return false;
    return true;
  }, [isPixOrder, storeReceiveViaPlatform, storePixManualActive]);

  const paymentDisplayLabel = useMemo(() => {
    if (shouldForceWhatsAppReceiving) return 'Receber via WhatsApp';
    const method = String(order?.payment_method || '').toUpperCase();
    // Se for plataforma OU um dos métodos on-line padrão, mostramos "On-line" como solicitado
    if (platformPayment || method === 'CREDIT_CARD' || (method === 'PIX' && storeReceiveViaPlatform)) {
      return 'On-line';
    }
    return getPaymentMethodLabel(order?.payment_method);
  }, [shouldForceWhatsAppReceiving, order?.payment_method, platformPayment, storeReceiveViaPlatform]);

  const shouldUsePlatformPixData = useMemo(() => {
    const details = order?.payment_details || {};
    const gateway = String(details?.gateway || details?.provider || '').toLowerCase();
    const origin = String(order?.origin || '').toUpperCase();
    const method = String(order?.payment_method || '').toUpperCase();

    // Regra: se loja recebe via plataforma, usar dados da /admin/pix
    if (isPixOrder && storeReceiveViaPlatform) return true;

    // Regra: se loja recebe via WhatsApp, usar dados da /loja/pix
    if (isPixOrder && storeReceiveViaChat) return false;

    // Sinais explicitos de checkout/gateway da plataforma
    if (platformPayment) return true;
    if (gateway === 'infinitepay' || gateway === 'mercadopago') return true;
    if (order?.infinitepay_id || order?.infinitepay_url) return true;

    // Origens publicas/app devem priorizar PIX da plataforma
    if (['APP', 'DIGITAL_MENU', 'MENU_DIGITAL'].includes(origin)) return true;

    // Origens internas geralmente sao atendimento direto (chat/whatsapp/caixa da loja)
    if (['INTERNAL', 'COLLABORATOR'].includes(origin)) return false;

    // Fallback: pedido PIX sem origem clara tende a ser plataforma no /track publico
    if (method === 'PIX') return true;

    return false;
  }, [isPixOrder, storeReceiveViaPlatform, storeReceiveViaChat, platformPayment, order?.payment_details, order?.infinitepay_id, order?.infinitepay_url, order?.origin, order?.payment_method]);

  const pixModalData = useMemo(() => {
    const details = order?.payment_details || {};
    const nestedPix = details.pixData || details.pix_data || {};
    return {
      key:
        (shouldUsePlatformPixData ? platformPixConfig?.pix_key : storePixKey) ||
        (shouldUsePlatformPixData ? platformPixConfig?.pix_key : store?.pix_key) ||
        (shouldUsePlatformPixData ? store?.pix_key : platformPixConfig?.pix_key) ||
        storePixKey ||
        details.pix_key ||
        details.key ||
        nestedPix.key ||
        '',
      key_type:
        (shouldUsePlatformPixData ? platformPixConfig?.pix_key_type : store?.pix_key_type) ||
        (shouldUsePlatformPixData ? store?.pix_key_type : platformPixConfig?.pix_key_type) ||
        details.pix_key_type ||
        details.key_type ||
        nestedPix.key_type ||
        'CPF',
      name:
        (shouldUsePlatformPixData ? platformPixConfig?.merchant_name : store?.config?.pixdata?.name) ||
        (shouldUsePlatformPixData ? store?.config?.pixdata?.name : platformPixConfig?.merchant_name) ||
        store?.name ||
        store?.store_name ||
        nestedPix.name ||
        'LOJA',
      city:
        (shouldUsePlatformPixData ? platformPixConfig?.merchant_city : store?.config?.pixdata?.city) ||
        (shouldUsePlatformPixData ? store?.config?.pixdata?.city : platformPixConfig?.merchant_city) ||
        store?.store_address_city ||
        nestedPix.city ||
        'CIDADE',
    };
  }, [order?.payment_details, store, platformPixConfig, shouldUsePlatformPixData, storePixKey]);

  const platformPixPayload = useMemo(() => {
    const details = order?.payment_details || {};
    const candidates = [
      details.qrCode,
      details.qr_code,
      details.pix_payload,
      details.pix_code,
      details.copy_and_paste,
      details.copiaecola,
      details?.pix?.payload,
      details?.pix?.code,
      details?.pix?.qr_code,
      details?.transaction_data?.qr_code,
      details?.point_of_interaction?.transaction_data?.qr_code,
      details?.data?.point_of_interaction?.transaction_data?.qr_code,
    ];

    const firstValid = candidates.find((value) => typeof value === 'string' && value.trim().length > 20);
    return firstValid ? String(firstValid).trim() : '';
  }, [order?.payment_details]);

  const platformPixCheckoutUrl = useMemo(() => {
    const details = order?.payment_details || {};
    const candidates = [
      order?.infinitepay_url,
      details.url,
      details.payment_link,
      details.checkout_url,
      details.init_point,
      details.sandbox_init_point,
      details?.pix?.url,
      details?.checkout?.url,
    ];

    const firstValid = candidates.find((value) => typeof value === 'string' && /^https?:\/\//i.test(String(value)));
    return firstValid ? String(firstValid) : '';
  }, [order?.payment_details, order?.infinitepay_url]);

  const handleCancelOrder = async () => {
    if (!order?.id) return;

    if (!canCancel) {
      const message = cancellationBlockReason || 'Cancelamento indisponível para o status atual.';
      setLastCancelResult({
        success: false,
        cancelled: false,
        can_cancel: false,
        message,
        current_status: order?.status,
      });
      toast({ type: 'warning', message });
      return;
    }

    const shouldCancel = await confirm({
      title: 'Cancelar pedido',
      message: 'Deseja realmente cancelar este pedido? Esta ação não pode ser desfeita.',
      confirmButtonText: 'Cancelar pedido',
      cancelButtonText: 'Voltar',
    });

    if (!shouldCancel) return;

    setCancellingOrder(true);
    try {
      const result = await cloud.cancelPublicOrder(order.id);
      setLastCancelResult(result);

      if (result.success && result.cancelled) {
        setOrder((prev: any) => (prev ? { ...prev, status: 'CANCELLED' } : prev));
        toast({ type: 'success', message: result.message || 'Pedido cancelado com sucesso.' });

        if (result.requires_support_refund) {
          await alert({
            title: 'Reembolso via suporte',
            message: 'Pagamento confirmado na plataforma. Abra o suporte para solicitar o reembolso.',
          });
        }
      } else if (!result.can_cancel) {
        toast({ type: 'warning', message: result.message || 'Cancelamento indisponível para o status atual.' });
      } else {
        toast({ type: 'error', message: result.message || 'Não foi possível cancelar o pedido.' });
      }

      await loadOrder(true);
    } catch (e) {
      console.error(e);
      toast({ type: 'error', message: 'Erro ao cancelar pedido. Tente novamente.' });
    } finally {
      setCancellingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${typeTheme.pageBg} flex items-center justify-center`}>
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

  return (
    <div className={`min-h-screen ${typeTheme.pageBg} pb-24`}>
      <div className="sticky top-0 z-30 border-b border-gray-200/70 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => window.history.back()} aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Rastreamento</p>
              <h1 className="font-black text-gray-900 dark:text-white truncate">Pedido #{String(order.id).slice(0, 8).toUpperCase()}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isRefreshing}>
              {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Atualizar
            </Button>
            {store && (
              <>
              <span className="text-sm font-bold hidden md:block text-gray-700 dark:text-gray-300">{storeName}</span>
              {store.store_logo_url ? (
                <img src={store.store_logo_url} className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 object-cover" alt="Logo da loja" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-300 font-black">
                  {storeName?.charAt(0)?.toUpperCase() || 'L'}
                </div>
              )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900 p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Acompanhamento em tempo real</p>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">{storeName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{orderType === 'DELIVERY' ? 'Fluxo de entrega' : 'Fluxo de retirada'} ativo</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isRefreshing}>
                {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Atualizar agora
              </Button>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Auto: 2 min</span>
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide ${typeTheme.badge}`}>
                <typeTheme.icon className="w-4 h-4" />
                {typeTheme.title}
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
              <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Tempo estimado</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">{estimatedLabel}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
              <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Pagamento</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">{paymentDisplayLabel}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
              <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-lg font-black text-brand-700 dark:text-brand-300">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </div>

        {(isCancelled || lastCancelResult?.message) && (
          <div className="mb-8 space-y-3">
            {isCancelled && (
              <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-300" />
                <div className="space-y-1">
                  <p className="font-black text-red-700 dark:text-red-300">Pedido cancelado</p>
                  <p className="text-sm text-red-700/90 dark:text-red-200">Este pedido não está mais em andamento.</p>
                </div>
              </div>
            )}

            {lastCancelResult?.message && (
              <div
                aria-live="polite"
                className={`rounded-2xl border p-4 flex items-start gap-3 ${lastCancelResult.success
                  ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/40'
                  : lastCancelResult.can_cancel === false
                    ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/40'
                    : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900/40'
                  }`}
              >
                <AlertTriangle
                  className={`w-5 h-5 flex-shrink-0 mt-0.5 ${lastCancelResult.success
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : lastCancelResult.can_cancel === false
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-red-700 dark:text-red-300'
                    }`}
                />
                <div className="space-y-1 mb-6">
                  <p
                    className={`font-black ${lastCancelResult.success
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : lastCancelResult.can_cancel === false
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-red-700 dark:text-red-300'
                      }`}
                  >
                    {lastCancelResult.success ? 'Cancelamento processado' : 'Cancelamento não realizado'}
                  </p>
                  <p
                    className={`text-sm ${lastCancelResult.success
                      ? 'text-emerald-700/90 dark:text-emerald-200'
                      : lastCancelResult.can_cancel === false
                        ? 'text-amber-700/90 dark:text-amber-200'
                        : 'text-red-700/90 dark:text-red-200'
                      }`}
                  >
                    {lastCancelResult.message}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-8">
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                {orderType === 'DELIVERY' ? 'Timeline da entrega' : 'Timeline da retirada'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {orderType === 'DELIVERY'
                  ? 'Acompanhe cada etapa ate o pedido chegar ao destino.'
                  : 'Acompanhe cada etapa ate o pedido ficar disponivel para retirada.'}
              </p>

              {isCancelled ? (
                <div className="mt-5 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-4">
                  <p className="font-bold text-red-700 dark:text-red-300">Fluxo encerrado por cancelamento.</p>
                </div>
              ) : (
                <div className="relative mt-6 space-y-5">
                  <div className="absolute left-5 top-3 bottom-3 w-px bg-gray-200 dark:bg-gray-700" />
                  {steps.map((step, index) => {
                    const isActive = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;

                    return (
                      <div key={step.status} className={`relative flex items-start gap-4 ${isActive ? 'opacity-100' : 'opacity-45 grayscale'}`}>
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${isActive ? `${step.bg} ${step.color} ${step.border}` : 'bg-gray-100 text-gray-400 border-gray-200'
                            }`}
                        >
                          <step.icon className="w-5 h-5" />
                        </div>
                        <div className="pt-0.5 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-black ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{step.label}</h4>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                                Atual
                              </span>
                            )}
                          </div>
                          <p className={`text-sm ${isActive ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}`}>{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">Itens do pedido</h3>
              <div className="space-y-3">
                {Array.isArray(order.items) && order.items.length > 0 ? (
                  order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white">
                          {Number(item?.quantity || 0)}x {item?.name || 'Item'}
                        </p>
                        {item?.observation && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Obs: {item.observation}</p>}
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(Number(item?.total_price || Number(item?.price || 0) * Number(item?.quantity || 0) || 0))}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum item encontrado para este pedido.</p>
                )}
              </div>

              <div className="mt-5 border-t border-gray-200 dark:border-gray-800 pt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(itemsSubtotal)}</span>
                </div>
                {discountValue > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Pontos Fidelidade</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">- {formatCurrency(discountValue)}</span>
                  </div>
                )}
                {couponDiscountValue > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Cupom de Desconto {order?.coupon_code ? `(${order.coupon_code})` : ''}</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">- {formatCurrency(couponDiscountValue)}</span>
                  </div>
                )}
                {orderType === 'DELIVERY' && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Taxa de entrega</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="font-black text-gray-700 dark:text-gray-200">Total</span>
                  <span className="text-xl font-black text-brand-700 dark:text-brand-300">{formatCurrency(totalValue)}</span>
                </div>
              </div>

              {canShowPaymentButton && (
                <div className="mt-4">
                  <Button
                    fullWidth
                    className="py-3.5 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 rounded-2xl flex items-center justify-center gap-2"
                    onClick={() => {
                      if (shouldUsePlatformPixData) {
                        // Prioridade 1: Link do Gateway (Mercado Pago / InfinitePay)
                        if (platformPixCheckoutUrl) {
                          window.open(platformPixCheckoutUrl, '_blank', 'noopener,noreferrer');
                          toast({ type: 'info', message: 'Abrindo checkout seguro da plataforma.' });
                          return;
                        }

                        // Prioridade 2: QR Code interno da plataforma
                        if (platformPixPayload || pixModalData.key) {
                          setShowPixModal(true);
                          return;
                        }

                        toast({ type: 'warning', message: 'Pagamento da plataforma ainda indisponível. Tente novamente em instantes.' });
                        return;
                      }

                      // Fallback: PIX Manual da Loja
                      if (pixModalData.key) {
                        setShowPixModal(true);
                        return;
                      }

                      toast({ type: 'warning', message: 'Código PIX da loja indisponível para este pedido. Fale com a loja no chat.' });
                    }}
                  >
                    {platformPixCheckoutUrl ? <CreditCard className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                    {platformPixCheckoutUrl ? 'Finalizar Pagamento On-line' : 'Pagar com PIX (ver codigo)'}
                  </Button>
                </div>
              )}
            </div>

            {orderType === 'DELIVERY' ? (
              <div className="rounded-3xl border border-blue-200/70 dark:border-blue-900/30 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                  Dados da entrega
                </h3>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Endereço de entrega</p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {shippingAddress?.street
                        ? `${shippingAddress.street}${shippingAddress?.number ? `, ${shippingAddress.number}` : ''}`
                        : shippingAddress?.raw || 'Endereço não informado'}
                    </p>
                    {shippingAddress?.complement && <p className="text-sm text-gray-500 dark:text-gray-400">{shippingAddress.complement}</p>}
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {[shippingAddress?.district, shippingAddress?.city, shippingAddress?.state].filter(Boolean).join(' - ') || 'Localidade indisponível'}
                    </p>
                    {order?.delivery_location_reference && (
                      <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">Referencia: {order.delivery_location_reference}</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Status do motoboy</p>
                    <p className="font-bold text-gray-900 dark:text-white">{driverStatusLabel}</p>
                    {driver ? (
                      <div className="mt-3 space-y-1 text-sm">
                        <p className="text-gray-700 dark:text-gray-200">
                          <span className="font-bold">Nome:</span> {driver.name || 'Não informado'}
                        </p>
                        {driver.vehicle_type && (
                          <p className="text-gray-600 dark:text-gray-300">
                            <span className="font-bold">Veiculo:</span> {driver.vehicle_type}
                          </p>
                        )}
                        {driver.phone_number && (
                          <p className="text-gray-600 dark:text-gray-300">
                            <span className="font-bold">Contato:</span> {driver.phone_number}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">Entregador ainda não vinculado ao pedido.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-amber-200/70 dark:border-amber-900/30 bg-white dark:bg-gray-900 p-5 sm:p-6 shadow-sm">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                  Dados da retirada
                </h3>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Retirar em</p>
                    <p className="font-bold text-gray-900 dark:text-white">{storeName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{storeAddressLine1}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{storeAddressLine2 || 'Cidade/estado Não informados'}</p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 p-4 space-y-2">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Instrucoes de retirada</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200">
                      {order?.observation || 'Apresente seu codigo na loja para retirada.'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Horario disponivel: {getOpeningHoursLabel(store?.opening_hours)}</p>
                    {pickupCode && (
                      <div className="mt-2 rounded-xl border border-amber-300 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-3">
                        <p className="text-[11px] uppercase tracking-wider font-bold text-amber-700 dark:text-amber-300">Codigo de retirada</p>
                        <p className="text-lg font-black text-amber-800 dark:text-amber-200 tracking-wider">{pickupCode}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <h3 className="text-base font-black text-gray-900 dark:text-white">Pagamento</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Metodo</span>
                  <span className="font-bold text-gray-900 dark:text-white">{paymentDisplayLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status</span>
                  <span className={`font-bold ${paymentConfirmed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {paymentConfirmed ? 'Confirmado' : 'Não confirmado'}
                  </span>
                </div>
                {amountPaid > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Valor pago</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(amountPaid)}</span>
                  </div>
                )}
              </div>

              {platformPayment && paymentConfirmed && (
                <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Regra de reembolso</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Se houver cancelamento, o reembolso e tratado via suporte.
                  </p>
                </div>
              )}

              <div className="mt-4">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={handleDownloadReceiptPng}
                  disabled={downloadingReceipt}
                  icon={downloadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                >
                  {downloadingReceipt ? 'Gerando comprovante...' : 'Baixar comprovante (PNG)'}
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <h3 className="text-base font-black text-gray-900 dark:text-white">Cancelar pedido</h3>
              <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
                Você pode cancelar apenas antes do aceite da loja e antes do envio para produção.
              </p>

              {cancellationBlockReason ? (
                <div className="mt-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-700 dark:text-amber-300" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">{cancellationBlockReason}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-900/20 p-3">
                  <p className="text-sm text-emerald-800 dark:text-emerald-200">
                    Cancelamento disponivel no status atual.
                  </p>
                </div>
              )}

              <div className="mt-4">
                <Button
                  variant="danger"
                  fullWidth
                  onClick={handleCancelOrder}
                  disabled={!canCancel || cancellingOrder}
                  aria-disabled={!canCancel || cancellingOrder}
                >
                  {cancellingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    'Cancelar pedido'
                  )}
                </Button>
              </div>

              {requiresSupportRefund && (
                <div className="mt-4 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20 p-3 space-y-3">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    Pagamento confirmado na plataforma. Para reembolso, abra o suporte e informe o numero do pedido.
                  </p>
                  <Button variant="outline" fullWidth onClick={openSupport}>
                    Abrir suporte
                  </Button>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <h3 className="text-base font-black text-gray-900 dark:text-white">Contato rapido</h3>
              <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Fale com a loja para tirar duvidas sobre seu pedido.</p>

              <div className="mt-4 space-y-2">
                {storeOwnerPhone && (
                  <div className="w-full rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700 text-sm bg-gray-50 dark:bg-gray-800/40">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">Telefone da loja</p>
                    <p className="font-bold text-gray-900 dark:text-white">{storeOwnerPhone}</p>
                  </div>
                )}

                {storePhoneDigits ? (
                  <a
                    href={`tel:${storePhoneDigits}`}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 font-bold transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Ligar para loja
                  </a>
                ) : (
                  <div className="w-full rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                    Telefone da loja nao informado.
                  </div>
                )}

                <Button variant="outline" fullWidth onClick={() => setShowChat(true)} icon={<MessageCircle className="w-4 h-4" />}>
                  Abrir chat
                </Button>

              </div>
            </div>
          </div>
        </div>
      </div>

      {showPixModal && (
        <PixPaymentModal
          isOpen={showPixModal}
          onClose={() => setShowPixModal(false)}
          pixData={pixModalData}
          pixPayloadOverride={shouldUsePlatformPixData ? platformPixPayload || undefined : undefined}
          amount={order.total_price}
          orderId={order.id}
          storePhone={storeContactRaw}
        />
      )}

      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div
          ref={receiptRef}
          style={{ width: 420 }}
          className="bg-white text-gray-900 border-2 border-gray-900 rounded-2xl p-5 font-sans"
        >
          <div className="text-center border-b-2 border-dashed border-gray-300 pb-4">
            <div className="flex justify-center mb-2">
              <Logo className="h-8 w-auto text-black" variant="black" />
            </div>
            <h3 className="text-lg font-black mt-1">Comprovante do Pedido</h3>
            <p className="text-xs text-gray-500">Valido como comprovante digital</p>
          </div>

          <div className="py-4 border-b-2 border-dashed border-gray-300 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Pedido</span>
              <span className="font-black">#{String(order?.id || '').slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Loja</span>
              <span className="font-bold text-right max-w-[250px]">{storeName}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Data</span>
              <span className="font-bold">{order?.created_at ? new Date(order.created_at).toLocaleString('pt-BR') : '--'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="font-bold">{statusLabel}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Pagamento</span>
              <span className="font-bold">{paymentDisplayLabel}</span>
            </div>
          </div>

          <div className="py-4 border-b-2 border-dashed border-gray-300">
            <p className="text-xs uppercase tracking-[0.2em] font-black text-gray-500 mb-2">Itens</p>
            <div className="space-y-1.5">
              {Array.isArray(order?.items) && order.items.length > 0 ? (
                order.items.slice(0, 8).map((item: any, idx: number) => (
                  <div key={`receipt-item-${idx}`} className="flex items-start justify-between gap-3 text-sm">
                    <span className="font-semibold">
                      {Number(item?.quantity || 0)}x {item?.name || 'Item'}
                    </span>
                    <span className="font-bold">
                      {formatCurrency(Number(item?.total_price || Number(item?.price || 0) * Number(item?.quantity || 0) || 0))}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Sem itens detalhados.</p>
              )}
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-bold">{formatCurrency(itemsSubtotal)}</span>
            </div>
            {orderType === 'DELIVERY' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Taxa de entrega</span>
                <span className="font-bold">{formatCurrency(deliveryFee)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-base border-t border-gray-300 pt-2">
              <span className="font-black">Total pago</span>
              <span className="font-black text-brand-700">{formatCurrency(totalValue)}</span>
            </div>
            <p className="text-[11px] text-center text-gray-500 pt-1">
              Plataforma Zé Entregas • {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          className="relative rounded-full w-14 h-14 shadow-lg flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white transition-colors"
          onClick={() => setShowChat(true)}
          aria-label="Abrir chat"
        >
          <MessageCircle size={28} strokeWidth={2.5} />
          {messages.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {showChat && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:mx-auto sm:rounded-3xl h-[84vh] sm:h-[680px] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-brand-50 to-white dark:from-gray-900 dark:to-gray-900 sm:rounded-t-3xl">
              <div className="flex items-center gap-3 min-w-0">
                {store?.store_logo_url ? (
                  <img src={store.store_logo_url} className="w-11 h-11 rounded-2xl border border-gray-200 dark:border-gray-700 object-cover shadow-sm" alt="Store" />
                ) : (
                  <div className="w-11 h-11 rounded-2xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate">{storeName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{messages.length > 0 ? 'Conversa ativa' : 'Envie uma mensagem para a loja'}</p>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/80 dark:hover:bg-gray-800 rounded-xl transition-colors" aria-label="Fechar chat">
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950/50">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Nenhuma mensagem ainda.</p>
                  <p className="text-xs">Use o chat para falar com a loja.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_type === 'guest';
                  const attachment = msg?.attachment || null;
                  const attachmentName = String(attachment?.name || '');
                  const attachmentUrl = String(attachment?.url || '');
                  const attachmentMime = String(attachment?.mimeType || '');
                  const hasAttachment = !!attachmentUrl;
                  const imageAttachment = hasAttachment && isImageAttachment(attachmentMime);
                  const timeLabel = msg?.created_at
                    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--';
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[82%] p-3 rounded-2xl text-sm ${isMe
                          ? 'bg-brand-600 text-white rounded-br-none'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 rounded-bl-none'
                          }`}
                      >
                        {hasAttachment && imageAttachment && (
                          <button
                            type="button"
                            className="block mb-2 rounded-xl overflow-hidden border border-white/20"
                            onClick={() => window.open(attachmentUrl, '_blank', 'noopener,noreferrer')}
                          >
                            <img src={attachmentUrl} alt={attachmentName || 'Imagem'} className="max-w-[220px] max-h-[220px] object-cover" />
                          </button>
                        )}
                        {hasAttachment && !imageAttachment && (
                          <button
                            type="button"
                            className={`w-full mb-2 flex items-center gap-2 rounded-xl px-3 py-2 border ${isMe ? 'border-brand-300/40 bg-brand-500/40 hover:bg-brand-500/50' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800'} transition-colors`}
                            onClick={() => window.open(attachmentUrl, '_blank', 'noopener,noreferrer')}
                          >
                            <FileText className="w-5 h-5 shrink-0" />
                            <div className="min-w-0 text-left">
                              <p className="truncate text-xs font-semibold">{attachmentName || 'Arquivo'}</p>
                              <p className={`text-[10px] ${isMe ? 'text-brand-100' : 'text-gray-500 dark:text-gray-400'}`}>{formatFileSize(attachment?.size)}</p>
                            </div>
                            <Download className="w-4 h-4 ml-auto shrink-0" />
                          </button>
                        )}
                        {msg.message && <p>{msg.message}</p>}
                        <span className={`text-[10px] mt-1 block ${isMe ? 'text-brand-200' : 'text-gray-400'}`}>{timeLabel}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 sm:rounded-b-2xl">
              {selectedChatFile && (
                <div className="mb-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 flex items-center gap-2">
                  {isImageAttachment(selectedChatFile.type) ? (
                    <ImageIcon className="w-4 h-4 text-brand-600 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate">{selectedChatFile.name}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatFileSize(selectedChatFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                    aria-label="Remover arquivo"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={chatFileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  onChange={handleSelectChatFile}
                />
                <button
                  type="button"
                  onClick={() => chatFileInputRef.current?.click()}
                  disabled={sendingMsg}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Anexar arquivo"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={selectedChatFile ? 'Adicione uma mensagem (opcional)...' : 'Digite sua mensagem...'}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                  disabled={sendingMsg}
                />
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedChatFile) || sendingMsg}
                  className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingMsg ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
