import React, { useEffect, useMemo, useState, Suspense, useRef } from 'react';
import { Play, Laptop, CheckCircle, Bell, ArrowRight, ShieldCheck, Sparkles, Zap, Globe, Store, Lock, ClipboardList, ShoppingBag, History, MessageSquare, Settings, Headphones, Search, SlidersHorizontal, Sun, Moon, LogOut, RefreshCw, Volume2, VolumeX, AlertCircle, ArrowLeft, MapPin, X } from 'lucide-react';
import { supabase, getMyPartnerProfile } from '../services/cloud';
import { UserRole } from '../types';

// Lazy loaded components para o sub-sistema autônomo e standalone
const StoreCatalog = React.lazy(() => import('./StoreCatalog').then(module => ({ default: module.StoreCatalog })));
const OrderHistory = React.lazy(() => import('./OrderHistory'));
const InternalChatContainer = React.lazy(() => import('./InternalChat/InternalChatContainer'));
const StoreSettings = React.lazy(() => import('./StoreSettings').then(module => ({ default: module.StoreSettings })));
import { PartnerProfile } from '../types';
import { ActiveTab } from '../types/navigation';
import { Loading } from './Loading';
import { useDialog } from '../utils/dialogService';
import { getStoreOpenState } from '../utils/storeHours';

interface StoreGestorProps {
  onNavigate?: (tab: ActiveTab) => void;
  userId?: string;
  userRole?: UserRole;
}

export const StoreGestor: React.FC<StoreGestorProps> = ({ onNavigate, userId: propUserId, userRole: propUserRole }) => {
  const dialog = useDialog();

  const [localUserId, setLocalUserId] = useState<string | null>(propUserId && propUserId !== 'guest' ? propUserId : null);
  const [localUserRole, setLocalUserRole] = useState<UserRole | null>(propUserRole && propUserId !== 'guest' ? propUserRole : null);

  const activeUserIdRef = useRef<string | null>(localUserId);
  useEffect(() => {
    activeUserIdRef.current = localUserId;
  }, [localUserId]);

  // Estados locais para controle de autenticação standalone
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Estados para filtros avançados de pedidos
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'PREPARING' | 'READY' | 'DISPATCHED'>('ALL');
  const [filterDeliveryType, setFilterDeliveryType] = useState<'ALL' | 'DELIVERY' | 'PICKUP'>('ALL');
  const [orderBy, setOrderBy] = useState<'NEWEST' | 'OLDEST'>('NEWEST');

  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<'pedidos' | 'cardapio' | 'historico' | 'chat' | 'config'>('pedidos');
  const [activeSubTab, setActiveSubTab] = useState<'agora' | 'agendados'>('agora');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoAccept, setAutoAccept] = useState(() => {
    const saved = localStorage.getItem('gestor_auto_accept');
    return saved ? JSON.parse(saved) : false;
  });
  const [showSalesSummary, setShowSalesSummary] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [audioAlert, setAudioAlert] = useState<HTMLAudioElement | null>(null);
  const [isAlerting, setIsAlerting] = useState(false);
  const [now, setNow] = useState(new Date());
  
  // Estado para armazenar o pedido atualmente selecionado pelo lojista
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

  // Métricas dinâmicas
  const [metrics, setMetrics] = useState({
    pausedItems: 0,
    monthOrdersCount: 0,
    monthRevenue: 0,
    lastMonthOrdersCount: 0,
  });

  const showSuccess = (msg: string) => dialog.alert({ title: 'Sucesso', message: msg });
  const showError = (msg: string) => dialog.alert({ title: 'Erro', message: msg });

  // Carregar dados da loja baseados no usuário logado atualmente no Supabase
  const loadStoreData = async () => {
    try {
      const p = await getMyPartnerProfile();
      if (p) {
        setProfile(p);
        await Promise.all([
          loadOrders(p.id),
          loadMetrics(p.id)
        ]);
      }
    } catch (e) {
      console.error('[StoreGestor] Erro ao carregar dados:', e);
    } finally {
      setInitialLoading(false);
    }
  };

  // Carregar pedidos reais do banco de dados (restrito estritamente ao dia de hoje: 00:00 às 23:59)
  const loadOrders = async (storeId: string) => {
    setLoadingOrders(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', storeId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (e) {
      console.error('[StoreGestor] Erro ao buscar pedidos do dia atual:', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Carregar métricas reais baseadas em dados
  const loadMetrics = async (storeId: string) => {
    try {
      // 1. Contar itens pausados (is_active = false)
      const { count: pausedCount } = await supabase
        .from('store_products')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId)
        .eq('is_active', false);

      // 2. Pedidos concluídos do mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: monthOrders, error: monthError } = await supabase
        .from('orders')
        .select('total_price, status')
        .eq('store_id', storeId)
        .gte('created_at', startOfMonth.toISOString());

      if (monthError) throw monthError;

      const completedOrders = (monthOrders || []).filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED');
      const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);

      setMetrics({
        pausedItems: pausedCount || 0,
        monthOrdersCount: completedOrders.length,
        monthRevenue: totalRevenue,
        lastMonthOrdersCount: 0 // Mock de comparação
      });
    } catch (e) {
      console.error('[StoreGestor] Erro ao buscar métricas:', e);
    }
  };

  // Efeito de inicialização com escuta de sessão local
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Se o usuário for o mesmo, ignora para evitar re-carregamentos indesejados (ex: ao focar a tela e dar TOKEN_REFRESHED)
        if (session.user.id === activeUserIdRef.current) return;

        setLocalUserId(session.user.id);
        setLocalUserRole('store_partner');
        setInitialLoading(true);
        try {
          const p = await getMyPartnerProfile();
          if (p) {
            setProfile(p);
            await Promise.all([
              loadOrders(p.id),
              loadMetrics(p.id)
            ]);
          }
        } catch (e) {
          console.error('[StoreGestor] Erro ao carregar dados pós-autenticação:', e);
        } finally {
          setInitialLoading(false);
        }
      } else {
        if (!propUserId || propUserId === 'guest') {
          setLocalUserId(null);
          setLocalUserRole(null);
          setProfile(null);
          setInitialLoading(false);
        }
      }
    });

    if (propUserId && propUserId !== 'guest') {
      setLocalUserId(propUserId);
      setLocalUserRole(propUserRole || 'store_partner');
      loadStoreData();
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setLocalUserId(session.user.id);
          setLocalUserRole('store_partner');
          loadStoreData();
        } else {
          setInitialLoading(false);
        }
      });
    }

    // Timer para atualizar o relógio interno
    const timer = setInterval(() => setNow(new Date()), 60000);

    // Preparar áudio de notificação operacional (campainha retro de restaurante)
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
    audio.loop = true;
    setAudioAlert(audio);

    return () => {
      subscription.unsubscribe();
      clearInterval(timer);
      audio.pause();
    };
  }, [propUserId]);

  // Monitorar novos pedidos via canal em tempo real do Supabase
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('gestor-realtime-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${profile.id}`
        },
        async (payload) => {
          // Atualiza lista de pedidos
          setOrders(prev => [payload.new, ...prev]);
          
          // Trata o som de novo pedido se habilitado
          if (soundEnabled) {
            setIsAlerting(true);
            if (audioAlert) {
              audioAlert.play().catch(err => console.log('Bloqueio de reprodução do navegador:', err));
            }
          }

          // Trata auto-aceite se configurado
          if (autoAccept && payload.new.id) {
            try {
              await supabase
                .from('orders')
                .update({ status: 'PREPARING' })
                .eq('id', payload.new.id);
              
              // Atualiza localmente
              setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, status: 'PREPARING' } : o));
            } catch (err) {
              console.error('Erro no auto-aceite:', err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, soundEnabled, autoAccept, audioAlert]);

  // Parar alerta de som
  const handleSilenceAlert = () => {
    setIsAlerting(false);
    if (audioAlert) {
      audioAlert.pause();
      audioAlert.currentTime = 0;
    }
  };

  // Salvar auto-aceite
  const handleToggleAutoAccept = () => {
    const nextVal = !autoAccept;
    setAutoAccept(nextVal);
    localStorage.setItem('gestor_auto_accept', JSON.stringify(nextVal));
    showSuccess(nextVal ? 'Aceite automático de pedidos ATIVADO!' : 'Aceite automático DESATIVADO!');
  };

  // Alternar abertura manual da loja
  const handleToggleStoreOpen = async () => {
    if (!profile) return;
    const nextState = !profile.is_open;
    setInitialLoading(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_open: nextState,
          manual_override: true,
          manual_override_until: null // Limpa expiração anterior
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, is_open: nextState, manual_override: true } : null);
      showSuccess(nextState ? 'Sua loja está ABERTA para pedidos!' : 'Sua loja foi FECHADA com sucesso.');
    } catch (e: any) {
      console.error('[StoreGestor] Erro ao alterar status de abertura da loja:', e);
      showError('Erro ao alterar status da loja: ' + (e?.message || e?.details || JSON.stringify(e)));
    } finally {
      setInitialLoading(false);
    }
  };

  // Buscar detalhes completos de um pedido (com items) do banco
  const loadOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setLoadingOrderDetails(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single();

      if (error) throw error;
      if (data) {
        // Normaliza o campo items se vier como string JSON
        if (typeof data.items === 'string') {
          try { data.items = JSON.parse(data.items); } catch { data.items = []; }
        }
        setSelectedOrder(data);
      }
    } catch (e: any) {
      console.error('[StoreGestor] Erro ao buscar detalhes do pedido:', e);
      showError('Erro ao carregar detalhes: ' + (e?.message || JSON.stringify(e)));
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  // Aceitar pedido manualmente
  const handleAcceptOrder = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'PREPARING' })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('[StoreGestor] Erro ao aceitar pedido (Supabase):', error);
        throw error;
      }

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'PREPARING' } : o));
      setSelectedOrder((prev: any) => prev && prev.id === orderId ? { ...prev, status: 'PREPARING' } : prev);
      handleSilenceAlert();
      showSuccess('Pedido aceito com sucesso! Enviado para a cozinha.');
    } catch (e: any) {
      console.error('[StoreGestor] Erro crítico ao aceitar pedido:', e);
      showError('Erro ao aceitar pedido: ' + (e?.message || e?.details || e?.hint || JSON.stringify(e)));
    }
  };

  // Cancelar pedido
  const handleCancelOrder = async (orderId: string) => {
    const confirmed = await dialog.confirm({
      title: 'Recusar Pedido',
      message: 'Tem certeza que deseja recusar e cancelar este pedido?',
      confirmButtonText: 'Sim, recusar',
      cancelButtonText: 'Não, manter'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'CANCELLED' })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
      handleSilenceAlert();
      showSuccess('Pedido recusado e cancelado.');
    } catch (e: any) {
      console.error('[StoreGestor] Erro crítico ao recusar/cancelar pedido:', e);
      showError('Erro ao recusar pedido: ' + (e?.message || e?.details || JSON.stringify(e)));
    }
  };

  // Marcar pedido como pronto (Cozinha finalizada -> Pronto para entrega/retirada)
  const handleReadyOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'READY' })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'READY' } : o));
      setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: 'READY' } : prev);
      showSuccess('Pedido marcado como pronto! Enviado para entrega/retirada.');
    } catch (e: any) {
      console.error('[StoreGestor] Erro ao marcar pedido como pronto:', e);
      showError('Erro ao alterar status: ' + (e?.message || e?.details || JSON.stringify(e)));
    }
  };

  // Despachar pedido (Saiu para entrega)
  const handleDispatchOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'DISPATCHED' })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'DISPATCHED' } : o));
      setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: 'DISPATCHED' } : prev);
      showSuccess('Pedido despachado! O entregador saiu para a entrega.');
    } catch (e: any) {
      console.error('[StoreGestor] Erro ao despachar pedido:', e);
      showError('Erro ao despachar pedido: ' + (e?.message || e?.details || JSON.stringify(e)));
    }
  };

  // Finalizar e marcar como entregue
  const handleDeliverOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'DELIVERED' })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'DELIVERED' } : o));
      setSelectedOrder(prev => prev && prev.id === orderId ? { ...prev, status: 'DELIVERED' } : prev);
      showSuccess('Pedido entregue com sucesso!');
    } catch (e: any) {
      console.error('[StoreGestor] Erro ao finalizar e entregar pedido:', e);
      showError('Erro ao entregar pedido: ' + (e?.message || e?.details || JSON.stringify(e)));
    }
  };

  // Autenticação local (Login Standalone)
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Por favor, insira o e-mail e a senha operacional.');
      return;
    }

    setIsAuthenticating(true);
    setLoginError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword
      });

      if (error) throw error;

      if (data?.user) {
        setLocalUserId(data.user.id);
        setLocalUserRole('store_partner');
        showSuccess('Bem-vindo! Painel do Gestor conectado com sucesso.');
      }
    } catch (err: any) {
      console.error('[StoreGestor] Erro de login local:', err);
      setLoginError(err.message || 'Credenciais inválidas. Verifique seu e-mail e sua senha.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Logout local (SignOut Standalone)
  const handleLocalLogout = async () => {
    const confirmed = await dialog.confirm({
      title: 'Desconectar Painel',
      message: 'Deseja realmente desconectar e encerrar a recepção de pedidos na cozinha?',
      confirmButtonText: 'Sim, sair',
      cancelButtonText: 'Não, manter'
    });

    if (!confirmed) return;

    try {
      setInitialLoading(true);
      await supabase.auth.signOut();
      setLocalUserId(null);
      setLocalUserRole(null);
      setProfile(null);
      showSuccess('Você foi desconectado com sucesso.');
    } catch (err) {
      console.error('[StoreGestor] Erro no logout:', err);
      showError('Erro ao processar desconexão.');
    } finally {
      setInitialLoading(false);
    }
  };

  // Formatação de Moeda
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Mapeador dinâmico de status badge (Etiqueta Operacional de Alta Fidelidade)
  const getStatusBadge = (status: string) => {
    switch (String(status).toUpperCase()) {
      case 'PENDING':
        return {
          label: 'Novo',
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
        };
      case 'CONFIRMED':
        return {
          label: 'Confirmado',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
        };
      case 'PREPARING':
      case 'ACCEPTED':
        return {
          label: 'Cozinha',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
        };
      case 'READY':
      case 'READY_TO_PICKUP':
      case 'READY_FOR_DELIVERY':
        return {
          label: 'Pronto',
          className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
        };
      case 'DISPATCHED':
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
      case 'DELIVERING':
        return {
          label: 'Trânsito',
          className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
        };
      case 'DELIVERED':
      case 'COMPLETED':
        return {
          label: 'Entregue',
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
        };
      case 'CANCELLED':
      case 'REJECTED':
        return {
          label: 'Recusado',
          className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
        };
      default:
        return {
          label: status,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300'
        };
    }
  };

  // Filtros de busca de pedidos com suporte a filtros avançados e ordenação
  const filteredOrders = useMemo(() => {
    const filtered = orders.filter(o => {
      const matchesSearch = searchQuery.trim() === '' || 
        String(o.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTab = filterStatus !== 'ALL'
        ? true // Se escolheu um status específico no filtro, mostra ele independentemente da aba ativa
        : activeSubTab === 'agora' 
        ? o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
        : o.status === 'DELIVERED' || o.status === 'CANCELLED' || o.status === 'COMPLETED';

      const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
      
      const matchesDelivery = filterDeliveryType === 'ALL' 
        ? true 
        : filterDeliveryType === 'DELIVERY' 
        ? o.delivery_address && o.delivery_address !== 'Retirada na Loja (Balcão)'
        : !o.delivery_address || o.delivery_address === 'Retirada na Loja (Balcão)';

      return matchesSearch && matchesTab && matchesStatus && matchesDelivery;
    });

    const sorted = [...filtered];
    if (orderBy === 'NEWEST') {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return sorted;
  }, [orders, searchQuery, activeSubTab, filterStatus, filterDeliveryType, orderBy]);

  // Estado de abertura da loja
  const openState = useMemo(() => {
    if (!profile) return null;
    return getStoreOpenState({
      openingHours: profile.opening_hours,
      manualStatus: profile.is_open,
      manualOverride: profile.manual_override,
      now,
    });
  }, [profile, now]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loading variant="container" size="lg" message="Carregando Gestor Web..." />
      </div>
    );
  }

  // Renderiza tela de login autônoma e estilizada se o lojista não possuir uma sessão ativa
  if (!localUserId) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4 overflow-hidden relative select-none font-sans">
        {/* Efeitos decorativos de fundo */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-red-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[60%] rounded-full bg-red-500/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#161B26]/85 backdrop-blur-xl border border-gray-800/80 rounded-[32px] p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shadow-lg mb-4">
              <Store className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">
              Zé Entregas
            </h1>
            <p className="text-xs text-gray-400 font-extrabold uppercase tracking-widest mt-1">
              Gestor de Pedidos Cozinha
            </p>
          </div>

          <form onSubmit={handleLocalLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-2xl flex items-center gap-2.5 animate-in shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">
                E-mail de Operação
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="exemplo@loja.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-[#0B0F19] text-white border border-gray-800 focus:border-red-500/50 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider block">
                Senha Operacional
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#0B0F19] text-white border border-gray-800 focus:border-red-500/50 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider py-4 rounded-2xl shadow-lg shadow-red-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isAuthenticating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Gestor</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-gray-800/40 pt-6">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Dispositivo Registrado para Cozinha
            </span>
            <div className="flex items-center justify-center gap-1.5 mt-2 text-xs font-semibold text-emerald-500 bg-emerald-500/5 px-3 py-1 rounded-full w-fit mx-auto border border-emerald-500/10">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Conexão Supabase Criptografada</span>
            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="h-screen flex bg-[#FAFBFD] dark:bg-[#0B0F19] text-gray-800 dark:text-gray-200 overflow-hidden font-sans">
      
      {/* Alerta de som ativo piscante */}
      {isAlerting && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-3 px-6 z-[9999] flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 animate-swing" />
            <span className="font-extrabold text-sm uppercase tracking-wider">
              NOVO PEDIDO OPERACIONAL RECEBIDO! A campainha está tocando na cozinha.
            </span>
          </div>
          <button
            onClick={handleSilenceAlert}
            className="bg-white text-red-600 font-black text-xs uppercase px-4 py-2 rounded-xl shadow hover:bg-gray-100 active:scale-95 transition-all"
          >
            Silenciar Alerta
          </button>
        </div>
      )}

      {/* 1. Menu Lateral Esquerdo Standalone (Estilo iFood) */}
      <aside className="w-18 md:w-20 bg-[#1A1E29] flex flex-col justify-between items-center py-6 flex-shrink-0 z-30 shadow-2xl">
        <div className="flex flex-col items-center gap-8 w-full">
          {/* Logo da Loja */}
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-inner overflow-hidden border border-gray-700/30">
            {profile?.store_logo_url ? (
              <img src={profile.store_logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Store className="w-6 h-6 text-red-500" />
            )}
          </div>

          {/* Abas e Atalhos */}
          <div className="flex flex-col gap-5 w-full px-2">
            <button
              onClick={() => setActiveMenu('pedidos')}
              title="Painel de Pedidos"
              className={`w-full p-3.5 rounded-2xl flex items-center justify-center transition-all ${
                activeMenu === 'pedidos'
                  ? 'bg-red-500/10 text-red-500 dark:text-red-400 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
              }`}
            >
              <ClipboardList className="w-6 h-6" />
            </button>

            <button
              onClick={() => setActiveMenu('cardapio')}
              title="Cardápio / Produtos"
              className={`w-full p-3.5 rounded-2xl flex items-center justify-center transition-all ${
                activeMenu === 'cardapio'
                  ? 'bg-red-500/10 text-red-500 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
              }`}
            >
              <ShoppingBag className="w-6 h-6" />
            </button>

            <button
              onClick={() => setActiveMenu('historico')}
              title="Histórico de Vendas"
              className={`w-full p-3.5 rounded-2xl flex items-center justify-center transition-all ${
                activeMenu === 'historico'
                  ? 'bg-red-500/10 text-red-500 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
              }`}
            >
              <History className="w-6 h-6" />
            </button>

            <button
              onClick={() => setActiveMenu('chat')}
              title="Conversas / Chats"
              className={`w-full p-3.5 rounded-2xl flex items-center justify-center transition-all ${
                activeMenu === 'chat'
                  ? 'bg-red-500/10 text-red-500 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
              }`}
            >
              <MessageSquare className="w-6 h-6" />
            </button>

            <button
              onClick={() => setActiveMenu('config')}
              title="Configurações da Loja"
              className={`w-full p-3.5 rounded-2xl flex items-center justify-center transition-all ${
                activeMenu === 'config'
                  ? 'bg-red-500/10 text-red-500 font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/40'
              }`}
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Rodapé do Menu Lateral */}
        <div className="flex flex-col gap-4 items-center">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Silenciar Campainha' : 'Ativar Campainha'}
            className={`p-3 rounded-2xl transition-all ${
              soundEnabled ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-gray-500 hover:bg-gray-800'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={handleLocalLogout}
            title="Sair do Gestor (Logout)"
            className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* 2. Barra Operacional Lateral de Pedidos (Sidebar Central) */}
      <section className="w-80 md:w-90 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col justify-between flex-shrink-0 z-20 shadow-md">
        
        {/* Topo: Seletores de abas Agora/Agendados */}
        <div className="p-4 space-y-4 border-b border-gray-50 dark:border-gray-800">
          <div className="flex bg-gray-50 dark:bg-gray-800/60 p-1.5 rounded-2xl border border-gray-100/50 dark:border-gray-800">
            <button
              onClick={() => setActiveSubTab('agora')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                activeSubTab === 'agora'
                  ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-white shadow border border-gray-100/60 dark:border-gray-800'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Agora ({orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'COMPLETED').length})
            </button>
            <button
              onClick={() => setActiveSubTab('agendados')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                activeSubTab === 'agendados'
                  ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-white shadow border border-gray-100/60 dark:border-gray-800'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              Finalizados ({orders.filter(o => o.status === 'DELIVERED' || o.status === 'CANCELLED' || o.status === 'COMPLETED').length})
            </button>
          </div>

          {/* Aceite automático de pedidos (Switch Style iFood) */}
          <div className="flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40 p-3 rounded-2xl border border-gray-100/40 dark:border-gray-800/60">
            <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300">
              Aceite automático de pedidos
            </span>
            <button
              onClick={handleToggleAutoAccept}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                autoAccept ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white shadow absolute transition-all ${
                  autoAccept ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Busca e filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar pedido"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20"
              />
            </div>
            <button
              onClick={() => setShowFilterModal(true)}
              title="Filtros avançados"
              className={`p-2.5 rounded-xl border flex items-center justify-center flex-shrink-0 active:scale-95 transition-all ${
                filterStatus !== 'ALL' || filterDeliveryType !== 'ALL' || orderBy !== 'NEWEST'
                  ? 'bg-red-500/10 border-red-500 text-red-500 font-bold'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <SlidersHorizontal className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Lista Central de Pedidos Encontrados */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {loadingOrders ? (
            <div className="py-12 flex justify-center">
              <Loading variant="inline" size="sm" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <ClipboardList className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Nenhum pedido encontrado</p>
            </div>
          ) : (
            filteredOrders.map(order => (
              <div
                key={order.id}
                onClick={() => loadOrderDetails(order)}
                className={`p-4 rounded-2xl border transition-all hover:scale-[1.01] cursor-pointer ${
                  selectedOrder?.id === order.id
                    ? 'border-red-500 bg-red-50/10 dark:bg-red-500/5 shadow-md'
                    : order.status === 'PENDING'
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-900/10'
                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">
                      #{String(order.id).slice(-6)}
                    </span>
                    <h5 className="font-extrabold text-sm text-gray-900 dark:text-white mt-0.5">
                      {order.customer_name || 'Cliente Geral'}
                    </h5>
                  </div>
                  {(() => {
                    const badge = getStatusBadge(order.status);
                    return (
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                  <span className="font-semibold">{formatBRL(order.total_price || 0)}</span>
                  <span className="font-mono text-[10px]">
                    {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Ações Rápidas por Pedido — parar propagação para não re-abrir detalhes */}
                {order.status === 'PENDING' && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
                      className="py-2 rounded-xl border border-red-200 text-red-600 dark:border-red-900/30 dark:text-red-400 font-extrabold text-xs hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all text-center flex items-center justify-center"
                    >
                      Recusar
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAcceptOrder(order.id); }}
                      className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs active:scale-95 transition-all text-center flex items-center justify-center"
                    >
                      Aceitar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Rodapé da Sidebar: Resumo de Vendas */}
        <div className="p-4 border-t border-gray-150/10 bg-gray-50 dark:bg-gray-800/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">Resumo de Vendas</span>
            <button
              onClick={() => setShowSalesSummary(!showSalesSummary)}
              className={`w-9 h-5 rounded-full transition-colors relative flex items-center ${
                showSalesSummary ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
              }`}
            >
              <span
                className={`w-4.5 h-4.5 rounded-full bg-white shadow absolute transition-all ${
                  showSalesSummary ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
          {showSalesSummary && (
            <div className="mt-3 flex items-center justify-between text-xs font-black text-gray-805 dark:text-white animate-in slide-in-from-bottom-2 duration-250">
              <span>{orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length} pedidos concluídos</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">
                {formatBRL(orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').reduce((sum, o) => sum + (o.total_price || 0), 0))}
              </span>
            </div>
          )}
        </div>
      </section>

      {activeMenu === 'pedidos' && (
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-[#FAFBFD] dark:bg-[#0B0F19]">
          {selectedOrder ? (
            loadingOrderDetails ? (
              /* Loading de detalhes do pedido */
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                <div className="w-10 h-10 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest">Carregando detalhes do pedido...</p>
              </div>
            ) : (
            /* DETALHES COMPLETOS DO PEDIDO (Estilo iFood Premium) */
            <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-250">
              {/* Botão Voltar e Cabeçalho */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition-all flex items-center justify-center flex-shrink-0 active:scale-95"
                    title="Voltar ao Painel Geral"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl font-mono font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        #{String(selectedOrder.id).slice(-6)}
                      </span>
                      {(() => {
                        const badge = getStatusBadge(selectedOrder.status);
                        return (
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full ${badge.className}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[11px] text-gray-400 font-semibold mt-1 font-mono">
                      Realizado em {new Date(selectedOrder.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>

                {/* Ações de Cozinha Baseadas no Status do Pedido Selecionado */}
                <div className="flex items-center gap-2">
                  {selectedOrder.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleCancelOrder(selectedOrder.id)}
                        className="px-5 py-2.5 rounded-xl border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 font-extrabold text-xs uppercase tracking-wider hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all"
                      >
                        Recusar
                      </button>
                      <button
                        onClick={() => handleAcceptOrder(selectedOrder.id)}
                        className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow active:scale-95 transition-all"
                      >
                        Aceitar Pedido
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'PREPARING' && (
                    <button
                      onClick={() => handleReadyOrder(selectedOrder.id)}
                      className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs uppercase tracking-wider shadow active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Marcar como Pronto</span>
                    </button>
                  )}
                  {selectedOrder.status === 'READY' && (
                    <button
                      onClick={() => handleDispatchOrder(selectedOrder.id)}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider shadow active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Zap className="w-4 h-4 animate-pulse" />
                      <span>Despachar Pedido</span>
                    </button>
                  )}
                  {selectedOrder.status === 'DISPATCHED' && (
                    <button
                      onClick={() => handleDeliverOrder(selectedOrder.id)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider shadow active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Finalizar Entrega</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Detalhes de Produtos e Valores */}
                <div className="md:col-span-2 space-y-6">
                  {/* Bloco de Itens do Pedido */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <ShoppingBag className="w-4.5 h-4.5 text-red-500" /> Itens na Cozinha
                    </h3>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {(() => {
                        const items = Array.isArray(selectedOrder.items) 
                          ? selectedOrder.items 
                          : typeof selectedOrder.items === 'string' 
                          ? JSON.parse(selectedOrder.items) 
                          : [];
                        
                        if (items.length === 0) {
                          return <p className="text-xs text-gray-400 py-4">Nenhum item discriminado no pedido.</p>;
                        }

                        return items.map((item: any, idx: number) => (
                          <div key={idx} className="py-3 flex justify-between items-start gap-4">
                            <div className="flex gap-2.5">
                              <span className="font-mono text-xs font-black text-red-500 bg-red-500/5 px-2.5 py-0.5 rounded-lg border border-red-500/10 flex-shrink-0 h-fit">
                                {item.quantity || item.qty || 1}x
                              </span>
                              <div>
                                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight">
                                  {item.product_name || item.name || 'Produto Geral'}
                                </h4>
                                {item.options && (
                                  <p className="text-[10px] text-gray-400 font-semibold mt-1 bg-gray-50 dark:bg-gray-900/50 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-800 w-fit">
                                    {item.options}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="font-semibold font-mono text-xs text-gray-750 dark:text-gray-300">
                              {formatBRL((item.price || item.unit_price || 0) * (item.quantity || item.qty || 1))}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Resumo Financeiro */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3 font-semibold text-xs text-gray-500 dark:text-gray-400">
                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
                      Resumo de Valores
                    </h3>
                    <div className="flex justify-between">
                      <span>Subtotal dos Itens</span>
                      <span className="font-mono text-gray-800 dark:text-gray-250">
                        {formatBRL((selectedOrder.total_price || 0) - (selectedOrder.delivery_fee || 0) + (selectedOrder.discount || 0))}
                      </span>
                    </div>
                    {selectedOrder.delivery_fee > 0 && (
                      <div className="flex justify-between">
                        <span>Taxa de Entrega</span>
                        <span className="font-mono text-gray-800 dark:text-gray-250">
                          {formatBRL(selectedOrder.delivery_fee || 0)}
                        </span>
                      </div>
                    )}
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Desconto Cupom/Promoção</span>
                        <span className="font-mono">
                          -{formatBRL(selectedOrder.discount || 0)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white border-t border-gray-100 dark:border-gray-700/50 pt-3 mt-2">
                      <span>Total do Pedido</span>
                      <span className="font-mono text-base text-emerald-600 dark:text-emerald-400">
                        {formatBRL(selectedOrder.total_price || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Detalhes de Cliente e Endereço */}
                <div className="space-y-6">
                  {/* Informações do Cliente */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Dados do Cliente
                    </h3>
                    <div className="space-y-3.5">
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Nome</span>
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                          {selectedOrder.customer_name || 'Cliente Geral'}
                        </span>
                      </div>
                      {selectedOrder.customer_phone && (
                        <div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Telefone</span>
                          <span className="font-semibold text-xs text-gray-700 dark:text-gray-300 font-mono">
                            {selectedOrder.customer_phone}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Pagamento</span>
                        <span className="font-semibold text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          {selectedOrder.payment_method || 'Cartão (Online)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Endereço de Entrega */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
                    <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-4.5 h-4.5 text-red-500" /> Endereço de Entrega
                    </h3>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-750 dark:text-gray-300 leading-relaxed">
                        {selectedOrder.delivery_address || 'Retirada na Loja (Balcão)'}
                      </p>
                    </div>
                  </div>

                  {/* Observação Geral */}
                  {selectedOrder.notes && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-3xl p-6 space-y-2">
                      <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-wider block">
                        Observação de Preparo
                      </h4>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-305 leading-relaxed italic">
                        "{selectedOrder.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )
          ) : (
            /* DASHBOARD TRADICIONAL OPERACIONAL (SE NENHUM PEDIDO SELECIONADO) */
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-250">
              
              {/* Banner de Boas-vindas e Abertura de Loja */}
              <div className="bg-gradient-to-r from-red-50/60 to-orange-50/60 dark:from-gray-800/40 dark:to-gray-800/20 border border-red-100/50 dark:border-gray-700/60 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 ${
                    openState?.isOpen 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-305 dark:border-emerald-900/40' 
                      : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-950/20 dark:text-red-305 dark:border-red-900/40'
                  }`}>
                    {openState?.isOpen ? <Store className="w-6 h-6 animate-pulse" /> : <Lock className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                      Olá, {profile?.store_name || profile?.name || 'Loja de Testes'}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {openState?.isOpen ? 'Sua loja está online e visível para o recebimento de novos pedidos.' : 'Sua loja está atualmente offline.'}
                    </p>
                  </div>
                </div>

                {/* Toggle de Abertura Manual Rápido */}
                <button
                  onClick={handleToggleStoreOpen}
                  className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm transition-all duration-200 active:scale-95 ${
                    openState?.isOpen
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200 dark:shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-250 dark:shadow-none'
                  }`}
                >
                  {openState?.isOpen ? 'Fechar Loja' : 'Abrir Loja'}
                </button>
              </div>

              {/* Cards de Alerta/Novidades estilo iFood */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-5 rounded-3xl shadow-md hover:shadow-lg transition-shadow relative overflow-hidden flex flex-col justify-between h-36">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <MessageSquare className="w-24 h-24" />
                  </div>
                  <span className="bg-white/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full w-fit">
                    WHATSAPP INTEGRADO
                  </span>
                  <div>
                    <h3 className="font-black text-base leading-tight">Automatize o atendimento</h3>
                    <p className="text-xs text-blue-100 mt-1">
                      Conecte seu WhatsBot e responda a clientes em tempo real.
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-5 rounded-3xl shadow-md hover:shadow-lg transition-shadow relative overflow-hidden flex flex-col justify-between h-36">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ShoppingBag className="w-24 h-24" />
                  </div>
                  <span className="bg-white/20 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full w-fit">
                    INSUMOS OPERACIONAIS
                  </span>
                  <div>
                    <h3 className="font-black text-base leading-tight">Reposição de estoque rápida</h3>
                    <p className="text-xs text-red-105 mt-1">
                      Acesse a loja oficial e compre embalagens com desconto.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloco de Métricas Operacionais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Card: Horário de Funcionamento */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-44">
                  <div>
                    <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Horário de Funcionamento
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Hoje e Amanhã configurados:
                    </p>
                    <div className="mt-3 font-mono text-sm font-extrabold text-gray-800 dark:text-white flex gap-2">
                      <span className="bg-gray-50 dark:bg-gray-900 border border-gray-150/10 px-3 py-1 rounded-xl">
                        {profile?.opening_hours || '11:00 - 23:00'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">Zé Entregas Automação Ativa</span>
                </div>

                {/* Card: Itens Pausados no Cardápio */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-44">
                  <div>
                    <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Itens Pausados no Cardápio
                    </h4>
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mt-3">
                      {metrics.pausedItems}
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveMenu('cardapio')}
                    className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 w-fit"
                  >
                    Revisar cardápio <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Card: Pedidos Concluídos do Mês */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between h-44">
                  <div>
                    <h4 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Pedidos Concluídos do Mês
                    </h4>
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mt-3">
                      {metrics.monthOrdersCount}
                    </h2>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      Faturamento: {formatBRL(metrics.monthRevenue)}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">Comparado com o mês anterior</span>
                </div>
              </div>

              {/* Rodapé de Status do Gestor */}
              <footer className="border-t border-gray-150/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>Web 9.317.0</span>
                  <span>Desktop 0.10.0</span>
                  <span>Expedição 2.0.7</span>
                </div>
                <span className="text-emerald-500 flex items-center gap-1.5 bg-emerald-500/5 dark:bg-emerald-400/5 px-3 py-1.5 rounded-full border border-emerald-500/10">
                  <CheckCircle className="w-3.5 h-3.5" /> Gestor de Pedidos atualizado!
                </span>
              </footer>
            </div>
          )}
        </main>
      )}

      {/* Renderização do Cardápio Standalone */}
      {activeMenu === 'cardapio' && (
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-[#FAFBFD] dark:bg-[#0B0F19]">
          <div className="flex justify-between items-center border-b border-gray-150/10 pb-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-red-500" /> Meu Cardápio Operacional
              </h2>
              <p className="text-xs text-gray-400">Gerencie seus produtos, preços e disponibilidade na cozinha.</p>
            </div>
          </div>
          <Suspense fallback={<div className="py-20 flex justify-center"><Loading variant="inline" size="md" message="Carregando cardápio..." /></div>}>
            <StoreCatalog />
          </Suspense>
        </main>
      )}

      {/* Renderização do Histórico Standalone */}
      {activeMenu === 'historico' && (
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-[#FAFBFD] dark:bg-[#0B0F19]">
          <div className="flex justify-between items-center border-b border-gray-150/10 pb-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <History className="w-6 h-6 text-red-500" /> Histórico de Pedidos
              </h2>
              <p className="text-xs text-gray-400">Consulte relatórios e vendas passadas de forma direta.</p>
            </div>
          </div>
          <Suspense fallback={<div className="py-20 flex justify-center"><Loading variant="inline" size="md" message="Carregando histórico..." /></div>}>
            <OrderHistory userRole="store_partner" />
          </Suspense>
        </main>
      )}

      {/* Renderização das Conversas / Chats Standalone */}
      {activeMenu === 'chat' && (
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-[#FAFBFD] dark:bg-[#0B0F19]">
          <div className="flex justify-between items-center border-b border-gray-150/10 pb-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-red-500" /> Conversas & Chamados
              </h2>
              <p className="text-xs text-gray-400">Atenda chamados e converse com seus clientes em tempo real.</p>
            </div>
          </div>
          <Suspense fallback={<div className="py-20 flex justify-center"><Loading variant="inline" size="md" message="Iniciando chat..." /></div>}>
            {localUserId && <InternalChatContainer storeId={localUserId} attendantId={localUserId} filterType="customer" />}
          </Suspense>
        </main>
      )}

      {/* Renderização das Configurações Standalone */}
      {activeMenu === 'config' && (
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar bg-[#FAFBFD] dark:bg-[#0B0F19]">
          <div className="flex justify-between items-center border-b border-gray-150/10 pb-4">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <Settings className="w-6 h-6 text-red-500" /> Ajustes do Gestor
              </h2>
              <p className="text-xs text-gray-400">Altere horários, formas de entrega e regras operacionais.</p>
            </div>
          </div>
          <Suspense fallback={<div className="py-20 flex justify-center"><Loading variant="inline" size="md" message="Carregando configurações..." /></div>}>
            <StoreSettings />
          </Suspense>
        </main>
      )}

      {/* MODAL DE FILTROS AVANÇADOS PREMIUM (Estilo iFood Dark Mode) */}
      {showFilterModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none font-sans animate-in fade-in duration-200">
          {/* Backdrop com desfoque */}
          <div 
            onClick={() => setShowFilterModal(false)}
            className="absolute inset-0 bg-[#0B0F19]/60 backdrop-blur-sm" 
          />

          {/* Card do Modal */}
          <div className="w-full max-w-md bg-[#161B26] border border-gray-800/85 rounded-[28px] shadow-2xl relative z-10 p-6 flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            
            {/* Topo do Modal */}
            <div className="flex items-center justify-between border-b border-gray-800/40 pb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Filtros de Pedidos
                </h3>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/60 active:scale-95 transition-all"
                title="Fechar Filtros"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Conteúdo dos Filtros */}
            <div className="space-y-5">
              
              {/* 1. Status do Pedido */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Status do Pedido
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'ALL', label: 'Todos os Status' },
                    { val: 'PENDING', label: 'Novos (Pendente)' },
                    { val: 'PREPARING', label: 'Cozinha (Preparo)' },
                    { val: 'READY', label: 'Pronto (Expedição)' },
                    { val: 'DISPATCHED', label: 'Trânsito (Entrega)' },
                    { val: 'DELIVERED', label: 'Entregues' },
                    { val: 'CANCELLED', label: 'Cancelados' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setFilterStatus(opt.val as any)}
                      className={`px-3 py-2.5 rounded-xl font-bold text-xs text-center border active:scale-95 transition-all ${
                        opt.val === 'ALL' ? 'col-span-2' : ''
                      } ${
                        filterStatus === opt.val
                          ? 'bg-red-500/10 border-red-500 text-red-500'
                          : 'bg-[#0B0F19] border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Forma de Entrega */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Forma de Entrega
                </span>
                <div className="flex bg-[#0B0F19] p-1 rounded-xl border border-gray-800/60">
                  {[
                    { val: 'ALL', label: 'Todos' },
                    { val: 'DELIVERY', label: 'Apenas Entrega' },
                    { val: 'PICKUP', label: 'Apenas Retirada' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setFilterDeliveryType(opt.val as any)}
                      className={`flex-1 py-2 rounded-lg font-bold text-[11px] text-center active:scale-95 transition-all ${
                        filterDeliveryType === opt.val
                          ? 'bg-red-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Ordenação de Pedidos */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                  Ordenar por
                </span>
                <div className="flex bg-[#0B0F19] p-1 rounded-xl border border-gray-800/60">
                  {[
                    { val: 'NEWEST', label: 'Mais Recentes Primeiro' },
                    { val: 'OLDEST', label: 'Mais Antigos Primeiro' }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setOrderBy(opt.val as any)}
                      className={`flex-1 py-2 rounded-lg font-bold text-[11px] text-center active:scale-95 transition-all ${
                        orderBy === opt.val
                          ? 'bg-red-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Ações do Modal */}
            <div className="flex gap-3 border-t border-gray-800/40 pt-4 mt-2">
              <button
                onClick={() => {
                  setFilterStatus('ALL');
                  setFilterDeliveryType('ALL');
                  setOrderBy('NEWEST');
                  setShowFilterModal(false);
                  showSuccess('Todos os filtros foram limpos.');
                }}
                className="flex-1 py-3 rounded-xl border border-gray-800 text-gray-400 font-extrabold text-xs uppercase tracking-wider hover:text-white hover:bg-gray-800/40 active:scale-95 transition-all text-center"
              >
                Limpar Filtros
              </button>
              <button
                onClick={() => {
                  setShowFilterModal(false);
                  showSuccess('Filtros aplicados com sucesso!');
                }}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs uppercase tracking-wider shadow shadow-red-600/10 active:scale-95 transition-all text-center"
              >
                Aplicar Filtros
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
