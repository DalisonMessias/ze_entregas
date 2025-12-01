
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Save, Minus, Sun, Moon, Bell, BellOff, Package, Map, Clock, X, Search, RotateCcw, Plus, DollarSign, Gauge, Play, Calculator, Settings, Download, Upload, Target, Trophy, User, BarChart3, TrendingDown, TrendingUp, Share2, Wrench, Fuel, CreditCard, Wallet, MapPin, ShieldAlert, Info, Shield, ShoppingCart, Menu, LogOut, FileText, Cloud, Megaphone, Siren, CheckCircle, History, Bot, AlertTriangle, Trash2, Tag, Headphones, ChevronRight, Bike, Power, Users, Banknote, ListOrdered, UserCheck, Smartphone, Link2, Star, Flame, Truck, Loader2, ShoppingBag, ChevronUp, ChevronDown, Rocket, Lock, LayoutDashboard, Newspaper, ShieldCheck, Gift, ListTodo, HelpCircle, UserCog, LifeBuoy, Wand2, IdCard, Globe, Cpu, Ban, Landmark, MessageSquare, Zap, BookOpen, Store } from 'lucide-react';
import { Button } from './components/Button';
import { HistoryTable } from './components/HistoryTable';
import { AddressBook } from './components/AddressBook';
import { ProfileData } from './components/ProfileData';
import { CloudSync } from './components/CloudSync';
import { Reports } from './components/Reports';
import { RouteCalculator } from './components/RouteCalculator';
import { ShareCard } from './components/ShareCard';
import { Maintenance } from './components/Maintenance';
import { FuelCalculator } from './components/FuelCalculator';
import { OfflineMap } from './components/OfflineMap';
import { PermissionModal } from './components/PermissionModal';
import { AboutApp } from './components/AboutApp';
import { EmergencyModal } from './components/EmergencyButton';
import { AdminPanel } from './components/AdminPanel';
import { NotificationsBell } from './components/NotificationsBell';
import { NotificationsPanel } from './components/NotificationsPanel';
import { Shop } from './components/Shop';
import { ChatAssistant } from './components/ChatAssistant';
import { CustomSelect } from './components/CustomSelect';
import { SupportPage } from './components/SupportPage';
import { StoreWalletModule } from './components/StoreWallet';
import { StoreRequest } from './components/StoreRequest';
import { StoreTeam } from './components/StoreTeam';
import { PartnerArea } from './components/PartnerArea';
import { PartnerDashboardWidgets } from './components/PartnerDashboardWidgets';
import { Switch } from './components/Switch';
import { Heatmap } from './components/Heatmap';
import { Logo } from './components/Logo';
import { SparklesIcon } from './components/SparklesIcon';
import { NotificationSettings } from './components/NotificationSettings';
import { StoreReports } from './components/StoreReports';
import { TaskList } from './components/TaskList';
import { StoreMarketing } from './components/StoreMarketing';
import { DriverMarketing } from './components/DriverMarketing';
import { StoreIntegrations } from './components/StoreIntegrations';
import { StoreSettings } from './components/StoreSettings';
import { OrderHistory } from './components/OrderHistory';
import { FinancialPanel } from './components/FinancialPanel';
import * as storage from './services/storage';
import * as cloud from './services/cloud';
import { initNotificationService, stopNotificationService } from './services/notificationService';
import { AppNotification, DeliveryRecord, Theme, DailyTransaction, UserRole, CartItem, DailySummary, Reminder, AdminSubTab } from './types';

type ActiveTab = 
  | 'deliveries' | 'local_history' | 'history' | 'addresses' | 'profile' | 'reports' | 'map' 
  | 'admin' | 'shop' | 'assistant' | 'support' 
  | 'wallet' | 'new_request' | 'store_team' | 'store_reports' | 'store_marketing' | 'store_integrations' | 'store_settings' | 'store_finance_panel'
  | 'partner' | 'heatmap' | 'tasks' | 'driver_marketing';

interface AppProps {
  userId: string;
  userRole: string; // Accepting string to sanitize later
}

// --- ACCESS CONTROL LIST (RBAC) ---
// Define estritamente o que cada papel pode ver.
const ROLE_ACCESS: Record<string, ActiveTab[]> = {
    admin: [
        // Admin Core
        'admin', 'profile', 'support', 'shop', 'assistant',
        // Store View Access
        'wallet', 'new_request', 'history', 'store_team', 'store_reports', 'store_marketing', 'store_integrations', 'store_settings', 'store_finance_panel',
        // Partner/User View Access
        'partner', 'driver_marketing', 'map', 'deliveries', 'local_history', 'reports', 'addresses', 'tasks', 'heatmap'
    ],
    store_partner: [
        'wallet', 'new_request', 'history', 'store_team', 'store_reports', 'store_marketing', 
        'store_integrations', 'store_settings', 'store_finance_panel', 'support', 'assistant', 'profile', 'shop'
    ],
    delivery_partner: [
        'partner', 'history', 'driver_marketing', 'map', 'shop', 'profile', 'assistant', 'support', 
        'deliveries', 'local_history', 'reports', 'addresses', 'tasks', 'heatmap'
    ],
    user: [
        'deliveries', 'local_history', 'reports', 'addresses', 'tasks', 'map', 'shop', 'profile', 'assistant', 'support'
    ]
};

// Mask Utility for Currency
const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
  let value = e.target.value.replace(/\D/g, "");
  if (!value) {
    setter("");
    return;
  }
  const amount = Number(value) / 100;
  const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  setter(formatted);
};

const parseCurrency = (val: string) => {
  if (!val) return 0;
  return parseFloat(val.replace(/\./g, '').replace(',', '.'));
};

const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const App: React.FC<AppProps> = ({ userId, userRole }) => {
  // 1. Normalize Role immediately
  const safeRole = useMemo(() => (userRole || 'user').toLowerCase(), [userRole]);
  
  // 2. Define Initial Tab based on Normalized Role
  const getInitialTab = useCallback((): ActiveTab => {
      if (safeRole === 'admin') return 'admin';
      if (safeRole === 'store_partner') return 'wallet';
      if (safeRole === 'delivery_partner') return 'partner'; 
      return 'deliveries'; 
  }, [safeRole]);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab());
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<AdminSubTab>('dashboard');
  
  // 3. Helper to check access
  const canAccess = useCallback((tab: ActiveTab): boolean => {
      const allowedTabs = ROLE_ACCESS[safeRole] || ROLE_ACCESS['user'];
      return allowedTabs.includes(tab);
  }, [safeRole]);

  // 4. Security Effect: Redirect if on forbidden tab
  useEffect(() => {
      if (!canAccess(activeTab)) {
          console.warn(`[Security] Redirecting from unauthorized tab: ${activeTab} for role: ${safeRole}`);
          setActiveTab(getInitialTab());
      }
  }, [activeTab, safeRole, canAccess, getInitialTab]);

  // Data State
  const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
  const [history, setHistoryState] = useState<DeliveryRecord[]>([]);
  const [fixedValue, setFixedValue] = useState<number | null>(null);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);
  
  // Settings State
  const [theme, setThemeState] = useState<Theme>('light');
  
  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  const [menuOpen, setMenuOpen] = useState(false);

  // Search & Filter State
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'with' | 'without'>('all');

  // Modals - Tools
  const [showRouteCalc, setShowRouteCalc] = useState(false);
  const [showFuelCalc, setShowFuelCalc] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  
  const [showEndDayConfirm, setShowEndDayConfirm] = useState(false);
  const [showDaySummary, setShowDaySummary] = useState(false);
  const [daySummaryData, setDaySummaryData] = useState<{ profit: number; cash: number; digital: number; count: number; km: number } | null>(null);

  const [showStartModal, setShowStartModal] = useState(false);
  const [startDayValue, setStartDayValue] = useState('');
  const [startDayGoal, setStartDayGoal] = useState('');

  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraValue, setExtraValue] = useState('');
  const [extraKm, setExtraKm] = useState('');
  const [extraDesc, setExtraDesc] = useState('');

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseValue, setExpenseValue] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'fuel' | 'food' | 'maintenance' | 'other'>('fuel');
  const [expenseDesc, setExpenseDesc] = useState('');

  // Global Blitz Modal
  const [showBlitzModal, setShowBlitzModal] = useState(false);
  const [selectedBlitzType, setSelectedBlitzType] = useState<'BLITZ' | 'ACCIDENT' | 'TRAFFIC' | 'DANGER'>('BLITZ');
  const [blitzLocationLoading, setBlitzLocationLoading] = useState(false);

  // Delete Confirmation
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.length;

  // Shop Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // UI State for transactions list
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  
  // Super Store Check
  const [isSuperStore, setIsSuperStore] = useState(false);

  // Map Navigation State
  const [mapDestination, setMapDestination] = useState<{lat: number, lng: number, name: string, fullAddress: string} | null>(null);

  // Refs
  const menuRef = useRef<HTMLDivElement>(null);

  // --- INITIALIZATION ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedTheme = storage.getTheme();
        setThemeState(savedTheme);
        document.documentElement.classList.toggle('dark', savedTheme === 'dark');

        setHistoryState(storage.getHistory());
        setTransactions(storage.getTodayTransactions());
        setFixedValue(storage.getFixedValue());
        setDailyGoal(storage.getDailyGoal());
        
        // Load Notifications from Cloud
        cloud.getNotifications().then(setNotifications);
        
        // Check Super Store Status if Store Partner OR Admin (Admins can monitor super store features)
        if (safeRole === 'store_partner' || safeRole === 'admin') {
            const user = await cloud.getClient()?.auth.getUser();
            if (user?.data.user) {
                const profile = await cloud.getClient()?.from('user_profiles').select('is_super_store').eq('id', user.data.user.id).single();
                if (profile?.data) {
                    setIsSuperStore(profile.data.is_super_store);
                } else if (safeRole === 'admin') {
                    // Admins always see Super Store features for monitoring
                    setIsSuperStore(true);
                }
            }
        }

      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // Check Permissions on Load
    if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
            if (result.state === 'prompt') {
                setShowPermissionModal(true);
            }
        }).catch(() => {
            // Silently ignore
        });
    }
    
    // Init Notification Service
    initNotificationService(userId, safeRole as UserRole);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        stopNotificationService();
    };
  }, [userId, safeRole]);

  const handleLogout = async () => {
      await cloud.signOut();
      window.location.reload();
  };

  const getDailySummary = (): DailySummary => {
      const grossIncome = transactions.filter(t => t.type !== 'expense').reduce((sum, t) => sum + t.value, 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.value), 0);
      const profit = grossIncome - expenses;
      const count = transactions.filter(t => t.type !== 'expense').length;
      const km = transactions.reduce((sum, t) => sum + (t.km || 0), 0);
      const location = null; 
      
      return { profit, deliveryCount: count, km, goal: dailyGoal, location };
  };

  // --- BLITZ / GLOBAL ALERT HANDLER ---
  const handleGlobalReportBlitz = async () => {
      setBlitzLocationLoading(true);
      
      if (!navigator.geolocation) {
          alert("Geolocalização não suportada.");
          setBlitzLocationLoading(false);
          return;
      }

      navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              const data = await res.json();
              const address = data.display_name.split(',')[0];
              const city = data.address.city || data.address.town || data.address.village || 'Cidade Desconhecida';

              await cloud.reportBlitz(latitude, longitude, selectedBlitzType, address, city);
              alert("Alerta enviado com sucesso! Outros usuários na região serão notificados.");
              setShowBlitzModal(false);
          } catch(e: any) {
              alert("Erro ao reportar: " + e.message);
          } finally {
              setBlitzLocationLoading(false);
          }
      }, (err) => {
          alert("Erro ao obter localização: " + err.message);
          setBlitzLocationLoading(false);
      }, { enableHighAccuracy: true });
  };

  // --- TRANSACTION HANDLERS ---
  const handleStartDay = () => {
    // Permite iniciar com 0 se não preenchido
    const val = startDayValue ? parseCurrency(startDayValue) : 0;
    const goal = startDayGoal ? parseCurrency(startDayGoal) : 0;
    
    setFixedValue(val);
    setDailyGoal(goal);
    
    storage.setFixedValue(val);
    storage.setDailyGoal(goal);
    
    setShowStartModal(false);
  };

  const handleAddDelivery = (type: 'standard' | 'extra') => {
    let val = 0;
    let km = 0;
    let desc = '';

    if (type === 'standard') {
        // Verifica se é null (não iniciado), aceita 0 se foi configurado como 0
        if (fixedValue === null) {
            setShowStartModal(true); 
            return;
        }
        val = fixedValue;
        desc = 'Entrega Padrão';
    } else { // type === 'extra'
        val = parseCurrency(extraValue);
        km = parseFloat(extraKm.replace(',', '.')) || 0;
        desc = extraDesc || 'Entrega Extra';
        if (val <= 0) return alert('Valor inválido');
    }

    const newTx: DailyTransaction = {
        id: generateUUID(),
        type,
        value: val,
        km,
        timestamp: Date.now(),
        description: desc,
        paymentMethod: 'cash' 
    };

    const updated = [newTx, ...transactions];
    setTransactions(updated);
    storage.saveTodayTransactions(updated);
    setShowExtraModal(false);
    setExtraValue(''); setExtraKm(''); setExtraDesc('');
  };

  const handleSaveMapRun = (value: number, km: number) => {
      const newTx: DailyTransaction = {
          id: generateUUID(),
          type: 'extra',
          value: value,
          km: km,
          timestamp: Date.now(),
          description: 'Corrida Finalizada (Mapa)',
          paymentMethod: 'cash'
      };
      const updated = [newTx, ...transactions];
      setTransactions(updated);
      storage.saveTodayTransactions(updated);
      setActiveTab('deliveries'); 
  };

  const handleAddExpense = () => {
      const val = parseCurrency(expenseValue);
      if (val <= 0) return alert('Valor inválido');

      const newTx: DailyTransaction = {
          id: generateUUID(),
          type: 'expense',
          value: -val,
          km: 0,
          timestamp: Date.now(),
          description: expenseDesc,
          category: expenseCategory
      };

      const updated = [newTx, ...transactions];
      setTransactions(updated);
      storage.saveTodayTransactions(updated);
      setShowExpenseModal(false);
      setExpenseValue(''); setExpenseDesc('');
  };

  const handleDeleteTransaction = (id: string) => {
      setTransactionToDelete(id);
  };

  const confirmDeleteTransaction = () => {
      if (!transactionToDelete) return;
      const updated = transactions.filter(t => t.id !== transactionToDelete);
      setTransactions(updated);
      storage.saveTodayTransactions(updated);
      setTransactionToDelete(null);
  };

  const handleEndDay = () => {
      const summary = getDailySummary();
      const cash = transactions.reduce((acc, t) => (t.value > 0 && t.paymentMethod === 'cash' ? acc + t.value : acc), 0);
      const digital = transactions.reduce((acc, t) => (t.value > 0 && t.paymentMethod === 'digital' ? acc + t.value : acc), 0);
      
      setDaySummaryData({ 
          profit: summary.profit,
          count: summary.deliveryCount,
          km: summary.km,
          cash,
          digital
      });
      setShowEndDayConfirm(true);
  };

  const confirmEndDay = () => {
      if (!daySummaryData) return;
      
      const now = new Date();
      const newRecord: DeliveryRecord = {
          id: generateUUID(),
          date: now.toISOString(),
          formattedDate: now.toLocaleDateString('pt-BR'),
          formattedTime: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          count: daySummaryData.count,
          totalValue: daySummaryData.profit,
          totalKm: daySummaryData.km,
          timestamp: Date.now(),
          paymentBreakdown: { cash: daySummaryData.cash, digital: daySummaryData.digital },
          transactions: transactions
      };

      const updatedHistory = [newRecord, ...history];
      setHistoryState(updatedHistory);
      storage.saveHistory(updatedHistory);
      
      setTransactions([]);
      storage.saveTodayTransactions([]);
      setFixedValue(null);
      storage.setFixedValue(0); 
      
      setShowEndDayConfirm(false);
      setShowDaySummary(true);
  };

  const handleNavigateFromAddressBook = (destination: {lat: number, lng: number, name: string, fullAddress: string}) => {
      setMapDestination(destination);
      setActiveTab('map');
  };

  // --- RENDER CONTENT WITH PROTECTION ---
  const renderContent = () => {
      // If role doesn't have access to the tab, prevent rendering
      if (!canAccess(activeTab)) return null;

      switch(activeTab) {
          case 'admin': return <AdminPanel activeSubTab={activeAdminSubTab as any} />;
          case 'shop': return <Shop cart={cart} setCart={setCart} userLoggedIn={!!userId} />;
          case 'assistant': return <ChatAssistant dailySummary={getDailySummary()} transactions={transactions} userId={userId} userRole={safeRole as UserRole} onClose={() => setActiveTab(getInitialTab())} />;
          case 'support': return <SupportPage onBack={() => setActiveTab('deliveries')} onNavigateToChat={() => setActiveTab('assistant')} />;
          
          // History Views
          case 'history': return <OrderHistory userRole={safeRole === 'store_partner' ? 'store_partner' : 'delivery_partner'} />;
          case 'local_history': return <HistoryTable history={history} onClear={() => {}} onExport={() => {}} dateFilter={dateFilter} setDateFilter={setDateFilter} expenseFilter={expenseFilter} setExpenseFilter={setExpenseFilter} onUpdateHistory={setHistoryState} />;
          
          case 'reports': return <Reports history={history} todayStats={{ value: getDailySummary().profit, count: getDailySummary().deliveryCount, km: getDailySummary().km }} />;
          case 'addresses': return <AddressBook onClose={() => setActiveTab('deliveries')} onNavigateInternal={handleNavigateFromAddressBook} />;
          case 'profile': return <ProfileData onBack={() => setActiveTab('deliveries')} />;
          
          case 'map': return <OfflineMap initialDestination={mapDestination} onClearDestination={() => setMapDestination(null)} onBack={() => setActiveTab('deliveries')} onSaveRoute={handleSaveMapRun} onOpenBlitzModal={() => setShowBlitzModal(true)} />;
          
          case 'heatmap': return <Heatmap />;
          case 'tasks': return <TaskList />;
          
          // Store Specific
          case 'wallet': return <StoreWalletModule />;
          case 'new_request': return <StoreRequest />;
          case 'store_team': return <StoreTeam />;
          case 'store_reports': return <StoreReports />;
          case 'store_marketing': return <StoreMarketing />;
          case 'store_integrations': return <StoreIntegrations />;
          case 'store_settings': return <StoreSettings />;
          case 'store_finance_panel': return <FinancialPanel userRole='store_partner' />;
          
          // Partner Specific
          case 'partner': return <PartnerArea />;
          case 'driver_marketing': return <DriverMarketing userRole={safeRole === 'delivery_partner' ? 'delivery_partner' : 'user'} />;
          
          case 'deliveries':
          default:
              
              const dashboardContent = (
                  <div className="space-y-6">
                          {/* Financial Summary Card */}
                          <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 text-center relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4 opacity-10">
                                  <DollarSign className="w-24 h-24 text-brand-500" />
                              </div>
                              <h2 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Lucro Líquido Hoje</h2>
                              <div className="text-4xl font-black text-gray-900 dark:text-white my-2 tracking-tight">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getDailySummary().profit)}
                              </div>
                              <div className="flex justify-center gap-4 text-xs font-medium text-gray-400">
                                  <span className="flex items-center gap-1"><Package className="w-3 h-3"/> {getDailySummary().deliveryCount} entregas</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1"><Gauge className="w-3 h-3"/> {getDailySummary().km.toFixed(1)} km</span>
                              </div>
                              
                              {fixedValue === 0 && (
                                  <div className="flex items-center justify-center gap-2 mt-4 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800 text-xs text-yellow-700 dark:text-yellow-400 animate-in fade-in">
                                      <AlertTriangle className="w-3 h-3" />
                                      <span>Dia iniciado sem registrar valores.</span>
                                  </div>
                              )}
                              
                              {dailyGoal && dailyGoal > 0 && (
                                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                                          <span>Meta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dailyGoal)}</span>
                                          <span>{Math.min(100, (getDailySummary().profit / dailyGoal) * 100).toFixed(0)}%</span>
                                      </div>
                                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                          <div 
                                            className="h-full bg-brand-500 rounded-full transition-all duration-1000" 
                                            style={{ width: `${Math.min(100, (getDailySummary().profit / dailyGoal) * 100)}%` }}
                                          ></div>
                                      </div>
                                  </div>
                              )}
                          </div>
                          
                          {/* Quick Actions Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <Button onClick={() => setShowStartModal(true)} variant="outline" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                  <Target className="w-4 h-4 mr-2 text-blue-500"/> {fixedValue !== null ? 'Editar Config' : 'Começar Dia'}
                              </Button>
                              <Button onClick={() => handleAddDelivery('standard')}>
                                  <Plus className="w-4 h-4 mr-2"/> Entrega Rápida
                              </Button>
                              <Button onClick={() => setShowExtraModal(true)} variant="outline" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                  <Calculator className="w-4 h-4 mr-2 text-green-500"/> Entrega Extra
                              </Button>
                              <Button onClick={() => setShowExpenseModal(true)} variant="outline" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                  <TrendingDown className="w-4 h-4 mr-2 text-red-500"/> Registrar Gasto
                              </Button>
                          </div>

                          {/* Utilities Section */}
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
                              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Utilitários</h3>
                              <div className="grid grid-cols-4 gap-2">
                                  <button onClick={() => setShowRouteCalc(true)} className="flex flex-col items-center gap-1 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors">
                                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                          <Calculator className="w-5 h-5"/>
                                      </div>
                                      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Calc. Rota</span>
                                  </button>
                                  <button onClick={() => setShowFuelCalc(true)} className="flex flex-col items-center gap-1 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors">
                                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                                          <Fuel className="w-5 h-5"/>
                                      </div>
                                      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Combustível</span>
                                  </button>
                                  <button onClick={() => setShowMaintenance(true)} className="flex flex-col items-center gap-1 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors">
                                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300">
                                          <Wrench className="w-5 h-5"/>
                                      </div>
                                      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Manutenção</span>
                                  </button>
                                  <button onClick={() => setActiveTab('map')} className="flex flex-col items-center gap-1 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors">
                                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                                          <Map className="w-5 h-5"/>
                                      </div>
                                      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">Mapa</span>
                                  </button>
                              </div>
                          </div>

                          {/* Recent Transactions List */}
                          <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                  <span className="font-bold text-gray-900 dark:text-white text-sm">Últimas Atividades</span>
                                  {transactions.length > 0 && (
                                      <button onClick={handleEndDay} className="text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded">
                                          Encerrar Dia
                                      </button>
                                  )}
                              </div>
                              {transactions.length === 0 ? (
                                  <div className="p-8 text-center text-gray-400 text-sm">
                                      <Package className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                                      Nenhuma atividade hoje.
                                  </div>
                              ) : (
                                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                      {transactions.slice(0, showAllTransactions ? undefined : 5).map(t => (
                                          <div key={t.id} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                              <div className="flex items-center gap-3">
                                                  <div className={`w-2 h-2 rounded-full ${t.type === 'expense' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                                  <div>
                                                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t.description || (t.type === 'expense' ? 'Despesa' : 'Entrega')}</p>
                                                      <p className="text-[10px] text-gray-400">{new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                  </div>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                  <span className={`font-bold text-sm ${t.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}>
                                                      {t.type === 'expense' ? '-' : '+'}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(t.value))}
                                                  </span>
                                                  <button onClick={() => handleDeleteTransaction(t.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                      <Trash2 className="w-4 h-4"/>
                                                  </button>
                                              </div>
                                          </div>
                                      ))}
                                      {transactions.length > 5 && (
                                          <button 
                                            onClick={() => setShowAllTransactions(!showAllTransactions)}
                                            className="w-full py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                          >
                                              {showAllTransactions ? 'Ver Menos' : `Ver Mais (${transactions.length - 5})`}
                                          </button>
                                      )}
                                  </div>
                              )}
                          </div>
                  </div>
              );

              return (
                  <div className="animate-in fade-in pb-20">
                      {(safeRole === 'delivery_partner' || safeRole === 'admin') && (
                          <PartnerDashboardWidgets onNavigate={setActiveTab} userRole={safeRole === 'admin' ? 'delivery_partner' : safeRole as UserRole} />
                      )}
                      
                      <div className={safeRole === 'delivery_partner' ? 'mt-6' : ''}>
                        {dashboardContent}
                      </div>
                  </div>
              );
      }
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${theme}`}>
      {/* Mobile Header */}
      {(activeTab as string) !== 'map' && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-brand-600 dark:bg-gray-900 border-b border-brand-700 dark:border-gray-800 z-40 flex items-center justify-between px-4 shadow-md">
            <div className="flex items-center gap-3">
                <button onClick={() => setMenuOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-brand-700 dark:hover:bg-gray-800 transition-colors">
                    <Menu className="w-6 h-6 text-white dark:text-gray-200" />
                </button>
                {/* Logo Responsiva: Ícone no Mobile, Completa no Desktop */}
                <Logo className="h-8 w-auto md:hidden" variant="full-white" mode="icon" />
                <Logo className="h-8 w-auto hidden md:block" variant="full-white" mode="full" />
            </div>
            <div className="flex items-center gap-2">
                <NotificationsBell 
                  unreadCount={unreadCount} 
                  onClick={() => setShowNotifications(true)} 
                  className="text-white hover:bg-brand-700 dark:hover:bg-gray-800"
                />
            </div>
        </header>
      )}

      {/* Sidebar Menu - REVISED STRUCTURE FOR RBAC */}
      {menuOpen && (
          <div className="fixed inset-0 z-50 flex">
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)}></div>
              <div ref={menuRef} className="relative w-72 bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <div className="flex flex-col">
                          <h2 className="font-black text-xl text-gray-900 dark:text-white flex items-center gap-2">
                              <Logo className="h-6 w-auto" mode="icon"/> Menu
                          </h2>
                          <div className="mt-1 px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs font-bold text-brand-600 w-fit uppercase">
                              {safeRole === 'admin' ? 'Administrador' : safeRole === 'store_partner' ? 'Lojista' : safeRole === 'delivery_partner' ? 'Parceiro' : 'Usuário'}
                          </div>
                      </div>
                      <button onClick={() => setMenuOpen(false)}><X className="w-6 h-6 text-gray-400"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                      
                      {/* === ADMIN MENU === */}
                      {safeRole === 'admin' && (
                          <div className="space-y-6">
                              {/* GERAL */}
                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Geral</p>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('dashboard'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <LayoutDashboard className="w-5 h-5"/> Dashboard
                                  </button>
                              </div>

                              {/* USUÁRIOS */}
                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Usuários</p>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('users'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Users className="w-5 h-5"/> Gerenciar Usuários
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('validation'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <UserCheck className="w-5 h-5"/> Validação de Parceiros
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('blacklist'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Ban className="w-5 h-5"/> Lista Negra
                                  </button>
                              </div>

                              {/* FINANCEIRO */}
                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Financeiro</p>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('wallet_control'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Wallet className="w-5 h-5"/> Controle de Carteiras
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('fees'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <DollarSign className="w-5 h-5"/> Taxas e Preços
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('payouts'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Banknote className="w-5 h-5"/> Regras de Repasse
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('asaas_webhook'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Link2 className="w-5 h-5"/> Integração Asaas
                                  </button>
                              </div>

                              {/* OPERACIONAL */}
                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Operacional</p>
                                  <button onClick={() => { setActiveTab('shop'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <ShoppingBag className="w-5 h-5"/> Acessar Loja
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('shop'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <ShoppingBag className="w-5 h-5"/> Gestão de Produtos
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('cities'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <MapPin className="w-5 h-5"/> Cidades
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('levels'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Star className="w-5 h-5"/> Níveis de Parceiro
                                  </button>
                              </div>

                              {/* SUPORTE & SEGURANÇA */}
                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Suporte & Segurança</p>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('support'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <MessageSquare className="w-5 h-5"/> Chat Suporte
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('claims'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Headphones className="w-5 h-5"/> Chamados
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('security'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <ShieldCheck className="w-5 h-5"/> Monitor de Fraude
                                  </button>
                              </div>

                              {/* MARKETING & CONTEÚDO */}
                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Marketing</p>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('platform_news'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Megaphone className="w-5 h-5"/> Novidades (News)
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('referrals'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Gift className="w-5 h-5"/> Indique e Ganhe
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('institutional'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Globe className="w-5 h-5"/> Institucional
                                  </button>
                              </div>

                              {/* SISTEMA */}
                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Sistema</p>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('ai_config'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Bot className="w-5 h-5"/> Configuração IA
                                  </button>
                                  <button onClick={() => { setActiveTab('admin'); setActiveAdminSubTab('pwa'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Smartphone className="w-5 h-5"/> Configuração App
                                  </button>
                              </div>

                              {/* VISUALIZAÇÃO DE MENUS (APENAS PARA ADMIN) */}
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                  <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">--- VISÃO LOJISTA ---</p>
                                  <button onClick={() => { setActiveTab('wallet'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Store className="w-5 h-5"/> Painel Lojista
                                  </button>
                              </div>

                              {/* Fixed comparison */}
                              <div className="mt-2">
                                  <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">--- VISÃO PARCEIRO ---</p>
                                  <button onClick={() => { setActiveTab('partner'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Bike className="w-5 h-5"/> Painel Entregador
                                  </button>
                              </div>

                              <div className="mt-2 mb-4">
                                  <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">--- VISÃO USUÁRIO ---</p>
                                  <button onClick={() => { setActiveTab('deliveries'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Package className="w-5 h-5"/> Painel Usuário (Manual)
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* === LOJISTA MENU === */}
                      {safeRole === 'store_partner' && (
                          <div className="space-y-6">
                              <div className="space-y-1">
                                  <button onClick={() => { setActiveTab('wallet'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Wallet className="w-5 h-5"/> Carteira e Pedidos
                                  </button>
                                  <button onClick={() => { setActiveTab('new_request'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Plus className="w-5 h-5"/> Nova Solicitação
                                  </button>
                                  <button onClick={() => { setActiveTab('store_finance_panel'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <DollarSign className="w-5 h-5"/> Controle Financeiro
                                  </button>
                              </div>

                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Gestão</p>
                                  <button onClick={() => { setActiveTab('store_team'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Users className="w-5 h-5"/> Meus Entregadores
                                  </button>
                                  <button onClick={() => { setActiveTab('history'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <History className="w-5 h-5"/> Histórico de Entregas
                                  </button>
                              </div>

                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Super Loja</p>
                                  <button onClick={() => { setActiveTab('store_reports'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isSuperStore ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-gray-400 cursor-not-allowed opacity-50'}`} disabled={!isSuperStore}>
                                      <BarChart3 className="w-5 h-5"/> Relatórios Avançados {!isSuperStore && <Lock className="w-3 h-3 ml-auto"/>}
                                  </button>
                                  <button onClick={() => { setActiveTab('store_marketing'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Megaphone className="w-5 h-5"/> Marketing
                                  </button>
                                  <button onClick={() => { setActiveTab('store_integrations'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Link2 className="w-5 h-5"/> Integrações
                                  </button>
                              </div>

                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Conta</p>
                                  <button onClick={() => { setActiveTab('store_settings'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Settings className="w-5 h-5"/> Configurações da Loja
                                  </button>
                                  <button onClick={() => { setActiveTab('profile'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <User className="w-5 h-5"/> Perfil e Bancos
                                  </button>
                                  <button onClick={() => { setActiveTab('support'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <LifeBuoy className="w-5 h-5"/> Suporte
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* === DELIVERY PARTNER MENU === */}
                      {safeRole === 'delivery_partner' && (
                          <div className="space-y-6">
                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Plataforma</p>
                                  <button onClick={() => { setActiveTab('partner'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Bike className="w-5 h-5"/> Painel de Pedidos
                                  </button>
                                  <button onClick={() => { setActiveTab('history'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <History className="w-5 h-5"/> Histórico da Plataforma
                                  </button>
                                  <button onClick={() => { setActiveTab('driver_marketing'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Gift className="w-5 h-5"/> Indique e Ganhe
                                  </button>
                              </div>

                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Controle Pessoal</p>
                                  <button onClick={() => { setActiveTab('deliveries'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <LayoutDashboard className="w-5 h-5"/> Painel Diário
                                  </button>
                                  <button onClick={() => { setActiveTab('local_history'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <ListOrdered className="w-5 h-5"/> Histórico Manual
                                  </button>
                                  <button onClick={() => { setActiveTab('reports'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <BarChart3 className="w-5 h-5"/> Meus Relatórios
                                  </button>
                                  <button onClick={() => { setActiveTab('map'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Map className="w-5 h-5"/> Mapa Offline
                                  </button>
                              </div>

                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Conta</p>
                                  <button onClick={() => { setActiveTab('profile'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <User className="w-5 h-5"/> Meu Perfil
                                  </button>
                                  <button onClick={() => { setActiveTab('shop'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <ShoppingBag className="w-5 h-5"/> Loja de Peças
                                  </button>
                                  <button onClick={() => { setActiveTab('support'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <LifeBuoy className="w-5 h-5"/> Ajuda
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* === USER MENU (NORMAL) === */}
                      {safeRole === 'user' && (
                          <div className="space-y-6">
                              <div className="space-y-1">
                                  <button onClick={() => { setActiveTab('deliveries'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <LayoutDashboard className="w-5 h-5"/> Painel Diário
                                  </button>
                                  <button onClick={() => { setActiveTab('local_history'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <ListOrdered className="w-5 h-5"/> Histórico
                                  </button>
                                  <button onClick={() => { setActiveTab('reports'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <BarChart3 className="w-5 h-5"/> Relatórios
                                  </button>
                                  <button onClick={() => { setActiveTab('tasks'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <ListTodo className="w-5 h-5"/> Tarefas
                                  </button>
                              </div>

                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ferramentas</p>
                                  <button onClick={() => { setActiveTab('map'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <Map className="w-5 h-5"/> Mapa Offline
                                  </button>
                                  <button onClick={() => { setActiveTab('addresses'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <MapPin className="w-5 h-5"/> Agenda de Endereços
                                  </button>
                                  <button onClick={() => { setActiveTab('driver_marketing'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <IdCard className="w-5 h-5"/> Cartão Digital
                                  </button>
                              </div>

                              <div className="space-y-1">
                                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Conta</p>
                                  <button onClick={() => { setActiveTab('profile'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <User className="w-5 h-5"/> Meu Perfil
                                  </button>
                                  <button onClick={() => { setActiveTab('shop'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <ShoppingBag className="w-5 h-5"/> Loja de Peças
                                  </button>
                                  <button onClick={() => { setActiveTab('support'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                      <LifeBuoy className="w-5 h-5"/> Ajuda
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* --- GLOBAL FOOTER ACTIONS --- */}
                      <div className="pt-6 border-t border-gray-100 dark:border-gray-800 mt-4 space-y-2">
                          <button onClick={() => { setActiveTab('assistant'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white shadow-lg shadow-brand-500/30 hover:shadow-brand-500/50 transition-all">
                              <SparklesIcon className="w-5 h-5 text-white"/> Assistente Zé
                          </button>
                          
                          <div className="grid grid-cols-2 gap-2 mt-2">
                              <button onClick={() => { setShowSettingsModal(true); setMenuOpen(false); }} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                  <Settings className="w-5 h-5"/> <span className="text-xs font-bold">Ajustes</span>
                              </button>
                              <button onClick={handleLogout} className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                                  <LogOut className="w-5 h-5"/> <span className="text-xs font-bold">Sair</span>
                              </button>
                          </div>
                          <div className="text-center mt-4">
                              <p className="text-[10px] text-gray-400">Versão 3.5.0 (Beta)</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Main Content Area */}
      <main className={`transition-all duration-300 ${(activeTab as string) === 'map' ? 'pt-0 h-screen' : 'pt-20 px-4 pb-24 md:pb-8 max-w-7xl mx-auto'}`}>
        {renderContent()}
      </main>

      {/* Mobile Footer Navigation - Only for User/Partner flows, hidden on Map/Admin */}
      {(activeTab as string) !== 'map' && (activeTab as string) !== 'admin' && (activeTab as string) !== 'wallet' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around items-center h-16 z-40 md:hidden pb-safe">
            {/* Logic to show different footer based on role is handled in renderContent/activeTab, 
                but here we show generic shortcuts for common tabs if applicable */}
            
            {safeRole === 'store_partner' ? (
                <>
                    <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center justify-center w-full h-full ${(activeTab as string) === 'wallet' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>
                        <Wallet className="w-6 h-6 mb-0.5" />
                        <span className="text-[10px] font-medium">Carteira</span>
                    </button>
                    <button onClick={() => setActiveTab('new_request')} className={`flex flex-col items-center justify-center w-full h-full ${(activeTab as string) === 'new_request' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>
                        <div className="bg-brand-600 text-white p-3 rounded-full -mt-6 shadow-lg border-4 border-gray-50 dark:border-gray-900">
                            <Plus className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-medium mt-1">Novo</span>
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center justify-center w-full h-full ${(activeTab as string) === 'history' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>
                        <History className="w-6 h-6 mb-0.5" />
                        <span className="text-[10px] font-medium">Histórico</span>
                    </button>
                </>
            ) : (
                <>
                    <button onClick={() => setActiveTab(getInitialTab())} className={`flex flex-col items-center justify-center w-full h-full ${(activeTab as string) === 'deliveries' || (activeTab as string) === 'partner' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>
                        {safeRole === 'delivery_partner' ? <Bike className="w-6 h-6 mb-0.5" /> : <LayoutDashboard className="w-6 h-6 mb-0.5" />}
                        <span className="text-[10px] font-medium">Início</span>
                    </button>
                    <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center justify-center w-full h-full ${(activeTab as string) === 'map' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>
                        <div className="bg-brand-600 text-white p-3 rounded-full -mt-6 shadow-lg border-4 border-gray-50 dark:border-gray-900">
                            <Map className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-medium mt-1">Mapa</span>
                    </button>
                    <button onClick={() => setActiveTab(safeRole === 'delivery_partner' ? 'history' : 'local_history')} className={`flex flex-col items-center justify-center w-full h-full ${(activeTab as string) === 'history' || (activeTab as string) === 'local_history' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>
                        <History className="w-6 h-6 mb-0.5" />
                        <span className="text-[10px] font-medium">Histórico</span>
                    </button>
                </>
            )}
        </nav>
      )}

      {/* --- MODALS --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Ajustes</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X/></button>
            </div>
            
            <div className="space-y-4">
               {/* Theme Toggle */}
               <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-600 rounded-xl shadow-sm text-gray-700 dark:text-white">
                          {theme === 'light' ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
                      </div>
                      <span className="font-bold text-gray-700 dark:text-gray-200">Tema Escuro</span>
                  </div>
                  <Switch 
                    checked={theme === 'dark'} 
                    onChange={(checked) => {
                        const newTheme = checked ? 'dark' : 'light';
                        setThemeState(newTheme);
                        storage.setTheme(newTheme);
                        document.documentElement.classList.toggle('dark', newTheme === 'dark');
                    }}
                  />
               </div>

               <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-600 rounded-xl shadow-sm text-gray-700 dark:text-white">
                          <Bell className="w-5 h-5"/>
                      </div>
                      <span className="font-bold text-gray-700 dark:text-gray-200">Notificações</span>
                  </div>
                  <button onClick={() => { setShowSettingsModal(false); setShowNotifications(true); }} className="text-xs font-bold text-blue-500 hover:underline">Configurar</button>
               </div>

               <button 
                 onClick={() => { setShowSettingsModal(false); setShowAboutModal(true); }}
                 className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
               >
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-gray-600 rounded-xl shadow-sm text-gray-700 dark:text-white">
                          <Info className="w-5 h-5"/>
                      </div>
                      <span className="font-bold text-gray-700 dark:text-gray-200">Sobre o App</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400"/>
               </button>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button variant="danger" fullWidth onClick={() => { 
                    if(confirm("Tem certeza? Isso apagará todos os dados locais.")) {
                        storage.clearAllData(); 
                        window.location.reload(); 
                    }
                }}>
                    <Trash2 className="w-4 h-4 mr-2"/> Limpar Dados Locais
                </Button>
                <p className="text-center text-[10px] text-gray-400 mt-3">ID: {userId}</p>
            </div>
          </div>
        </div>
      )}

      {/* Start Day Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowStartModal(false)}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-6" onClick={e => e.stopPropagation()}>
                <div className="text-center">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Começar o Dia 🚀</h3>
                    <p className="text-gray-500 text-sm">Defina seus valores para hoje.</p>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Valor Fixo da Entrega</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                            <input 
                                type="tel" 
                                value={startDayValue} 
                                onChange={e => handleCurrencyMask(e, setStartDayValue)} 
                                className="w-full pl-10 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl text-xl font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                placeholder="0,00"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Meta de Lucro (Opcional)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                            <input 
                                type="tel" 
                                value={startDayGoal} 
                                onChange={e => handleCurrencyMask(e, setStartDayGoal)} 
                                className="w-full pl-10 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl text-xl font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-green-500 transition-all"
                                placeholder="0,00"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button variant="outline" fullWidth onClick={() => setShowStartModal(false)}>Cancelar</Button>
                    <Button fullWidth onClick={handleStartDay}>Iniciar</Button>
                </div>
            </div>
        </div>
      )}

      {/* Extra Delivery Modal */}
      {showExtraModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowExtraModal(false)}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Entrega Extra</h3>
                    <button onClick={() => setShowExtraModal(false)}><X className="w-6 h-6 text-gray-400"/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Valor Cobrado</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                            <input 
                                type="tel" 
                                value={extraValue} 
                                onChange={e => handleCurrencyMask(e, setExtraValue)} 
                                className="w-full pl-10 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl text-2xl font-black text-green-600 outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="0,00"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Distância (KM)</label>
                            <input 
                                type="number" 
                                value={extraKm} 
                                onChange={e => setExtraKm(e.target.value)} 
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Descrição</label>
                            <input 
                                type="text" 
                                value={extraDesc} 
                                onChange={e => setExtraDesc(e.target.value)} 
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl font-medium dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                placeholder="Opcional"
                            />
                        </div>
                    </div>
                </div>

                <Button fullWidth onClick={() => handleAddDelivery('extra')} disabled={!extraValue}>
                    Confirmar
                </Button>
            </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowExpenseModal(false)}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white text-red-500 flex items-center gap-2">
                        <TrendingDown className="w-6 h-6"/> Nova Despesa
                    </h3>
                    <button onClick={() => setShowExpenseModal(false)}><X className="w-6 h-6 text-gray-400"/></button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Valor Gasto</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                            <input 
                                type="tel" 
                                value={expenseValue} 
                                onChange={e => handleCurrencyMask(e, setExpenseValue)} 
                                className="w-full pl-10 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl text-2xl font-black text-red-500 outline-none focus:ring-2 focus:ring-red-500"
                                placeholder="0,00"
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Categoria</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'fuel', label: 'Combustível', icon: Fuel },
                                { id: 'food', label: 'Alimentação', icon: ShoppingBag },
                                { id: 'maintenance', label: 'Manutenção', icon: Wrench },
                                { id: 'other', label: 'Outros', icon: Tag }
                            ].map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setExpenseCategory(cat.id as any)}
                                    className={`p-3 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${expenseCategory === cat.id ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                >
                                    <cat.icon className="w-4 h-4"/> {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Descrição</label>
                        <input 
                            type="text" 
                            value={expenseDesc} 
                            onChange={e => setExpenseDesc(e.target.value)} 
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl font-medium dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Detalhes (Opcional)"
                        />
                    </div>
                </div>

                <Button fullWidth onClick={handleAddExpense} disabled={!expenseValue} className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20 border-none">
                    Salvar Despesa
                </Button>
            </div>
        </div>
      )}

      {/* Day Summary Modal */}
      {showDaySummary && daySummaryData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowDaySummary(false)}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Dia Finalizado!</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Bom descanso, guerreiro.</p>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                        <span className="text-gray-500 font-bold">Lucro Total</span>
                        <span className="text-xl font-black text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(daySummaryData.profit)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
                            <p className="text-xs text-gray-400 font-bold uppercase">Entregas</p>
                            <p className="text-lg font-black dark:text-white">{daySummaryData.count}</p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center">
                            <p className="text-xs text-gray-400 font-bold uppercase">KM Total</p>
                            <p className="text-lg font-black dark:text-white">{daySummaryData.km.toFixed(1)}</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" fullWidth onClick={() => { setShowDaySummary(false); setShowShareCard(true); }}>
                        <Share2 className="w-4 h-4 mr-2"/> Compartilhar
                    </Button>
                    <Button fullWidth onClick={() => setShowDaySummary(false)}>
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* Confirmation Modal for End Day */}
      {showEndDayConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl text-center">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Encerrar o Dia?</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                      Isso salvará seu histórico e limpará as entregas da tela inicial. Tem certeza?
                  </p>
                  <div className="flex gap-3">
                      <Button variant="outline" fullWidth onClick={() => setShowEndDayConfirm(false)}>Cancelar</Button>
                      <Button fullWidth onClick={confirmEndDay}>Sim, Encerrar</Button>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Transaction Confirm */}
      {transactionToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl text-center">
                  <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Excluir Item?</h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                      Essa ação não pode ser desfeita.
                  </p>
                  <div className="flex gap-3">
                      <Button variant="outline" fullWidth onClick={() => setTransactionToDelete(null)}>Cancelar</Button>
                      <Button variant="danger" fullWidth onClick={confirmDeleteTransaction}>Excluir</Button>
                  </div>
              </div>
          </div>
      )}

      {/* Global Modals */}
      {showRouteCalc && <RouteCalculator onClose={() => setShowRouteCalc(false)} />}
      {showFuelCalc && <FuelCalculator onClose={() => setShowFuelCalc(false)} />}
      {showMaintenance && <Maintenance onClose={() => setShowMaintenance(false)} />}
      {showShareCard && daySummaryData && (
        <ShareCard 
            data={{ 
                value: daySummaryData.profit, 
                count: daySummaryData.count, 
                km: daySummaryData.km, 
                date: new Date().toLocaleDateString('pt-BR') 
            }} 
            onClose={() => setShowShareCard(false)} 
        />
      )}
      {showNotifications && (
          <NotificationsPanel 
            notifications={notifications} 
            onMarkAsRead={(id) => {
                cloud.markNotificationAsRead(id);
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            }}
            onClose={() => setShowNotifications(false)}
          />
      )}
      <EmergencyModal isOpen={showEmergencyModal} onClose={() => setShowEmergencyModal(false)} />
      {showAboutModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowAboutModal(false)}>
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold dark:text-white">Sobre</h3>
                      <button onClick={() => setShowAboutModal(false)}><X className="w-5 h-5 text-gray-400"/></button>
                  </div>
                  <AboutApp />
              </div>
          </div>
      )}
      <PermissionModal onClose={() => setShowPermissionModal(false)} />

      {/* Global FABs (Floating Action Buttons) */}
      <div className="fixed bottom-24 right-4 flex flex-col gap-3 z-30">
          <button 
            onClick={() => setShowEmergencyModal(true)}
            className="w-12 h-12 bg-red-600 rounded-full shadow-lg shadow-red-600/40 flex items-center justify-center text-white hover:scale-110 transition-transform animate-pulse"
          >
              <Siren className="w-6 h-6" />
          </button>
      </div>

      {/* Blitz Alert Modal */}
      {showBlitzModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Siren className="w-8 h-8 text-red-600 animate-pulse" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 dark:text-white">Alerta na Pista!</h3>
                      <p className="text-gray-500 text-sm">O que está acontecendo?</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                      <button 
                          onClick={() => setSelectedBlitzType('BLITZ')}
                          className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${selectedBlitzType === 'BLITZ' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                          <span className="text-2xl">🚔</span>
                          <span className="font-bold text-xs dark:text-white">Blitz</span>
                      </button>
                      <button 
                          onClick={() => setSelectedBlitzType('ACCIDENT')}
                          className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${selectedBlitzType === 'ACCIDENT' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                          <span className="text-2xl">💥</span>
                          <span className="font-bold text-xs dark:text-white">Acidente</span>
                      </button>
                      <button 
                          onClick={() => setSelectedBlitzType('TRAFFIC')}
                          className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${selectedBlitzType === 'TRAFFIC' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                          <span className="text-2xl">🚦</span>
                          <span className="font-bold text-xs dark:text-white">Trânsito</span>
                      </button>
                      <button 
                          onClick={() => setSelectedBlitzType('DANGER')}
                          className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${selectedBlitzType === 'DANGER' ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                          <span className="text-2xl">⚠️</span>
                          <span className="font-bold text-xs dark:text-white">Perigo</span>
                      </button>
                  </div>

                  <div className="space-y-3">
                      <Button fullWidth onClick={handleGlobalReportBlitz} disabled={blitzLocationLoading}>
                          {blitzLocationLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reportar Agora'}
                      </Button>
                      <Button variant="ghost" fullWidth onClick={() => setShowBlitzModal(false)}>
                          Cancelar
                      </Button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};