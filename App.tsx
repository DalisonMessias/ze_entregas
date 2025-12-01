
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Save, Minus, Sun, Moon, Bell, BellOff, Package, Map, Clock, X, Search, RotateCcw, Plus, DollarSign, Gauge, Play, Calculator, Settings, Download, Upload, Target, Trophy, User, BarChart3, TrendingDown, TrendingUp, Share2, Wrench, Fuel, CreditCard, Wallet, MapPin, ShieldAlert, Info, Shield, ShoppingCart, Menu, LogOut, FileText, Cloud, Megaphone, Siren, CheckCircle, History, Bot, AlertTriangle, Trash2, Tag, Headphones, ChevronRight, Bike, Power, Users, Banknote, ListOrdered, UserCheck, Smartphone, Link2, Star, Flame, Truck, Loader2, ShoppingBag, ChevronUp, ChevronDown, Rocket, Lock, LayoutDashboard, Newspaper, ShieldCheck, Gift, ListTodo, HelpCircle, UserCog, LifeBuoy, Wand2, IdCard, Globe, Cpu, Ban, Landmark, MessageSquare, Zap } from 'lucide-react';
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

type ActiveTab = 'deliveries' | 'history' | 'addresses' | 'profile' | 'reports' | 'map' | 'admin' | 'shop' | 'assistant' | 'support' | 'wallet' | 'new_request' | 'partner' | 'heatmap' | 'store_team' | 'store_reports' | 'tasks' | 'store_marketing' | 'driver_marketing' | 'store_integrations' | 'store_settings' | 'store_finance_panel';

interface AppProps {
  userId: string;
  userRole: UserRole;
}

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

const App: React.FC<AppProps> = ({ userId, userRole }) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // Set default active tab based on role immediately
  const getInitialTab = (): ActiveTab => {
      const role = userRole.toLowerCase();
      if (role === 'admin') return 'admin';
      if (role === 'store_partner') return 'wallet';
      if (role === 'delivery_partner') return 'partner'; // Entregadores começam no painel de parceiro
      return 'deliveries'; // Usuários normais no painel pessoal
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTab);
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<AdminSubTab>('dashboard');
  
  // Data State
  const [transactions, setTransactions] = useState<DailyTransaction[]>([]);
  const [history, setHistoryState] = useState<DeliveryRecord[]>([]);
  const [fixedValue, setFixedValue] = useState<number | null>(null);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);
  
  // Settings State
  const [theme, setThemeState] = useState<Theme>('light');
  
  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
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
        
        // Check Super Store Status if Store Partner
        if (userRole === 'store_partner') {
            const user = await cloud.getClient()?.auth.getUser();
            if (user?.data.user) {
                const profile = await cloud.getClient()?.from('user_profiles').select('is_super_store').eq('id', user.data.user.id).single();
                if (profile?.data) {
                    setIsSuperStore(profile.data.is_super_store);
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
    initNotificationService(userId, userRole);
    
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
  }, [userRole]);

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

  // --- TRANSACTION HANDLERS ---
  const handleStartDay = () => {
    const val = parseCurrency(startDayValue);
    const goal = parseCurrency(startDayGoal);
    
    if (val > 0) setFixedValue(val);
    if (goal > 0) setDailyGoal(goal);
    
    storage.setFixedValue(val);
    storage.setDailyGoal(goal);
    
    setShowStartModal(false);
  };

  const handleAddDelivery = (type: 'standard' | 'extra') => {
    let val = 0;
    let km = 0;
    let desc = '';

    if (type === 'standard') {
        if (!fixedValue) {
            setShowStartModal(true); // Open StartDayModal if fixedValue is not set
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
        paymentMethod: 'cash' // Default
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
      setActiveTab('deliveries'); // Return to dashboard
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
      
      // Clear today
      setTransactions([]);
      storage.saveTodayTransactions([]);
      setFixedValue(null);
      storage.setFixedValue(0); // Set to 0 instead of null to properly clear and trigger input placeholder
      
      setShowEndDayConfirm(false);
      setShowDaySummary(true);
  };

  const handleNavigateFromAddressBook = (destination: {lat: number, lng: number, name: string, fullAddress: string}) => {
      setMapDestination(destination);
      setActiveTab('map');
  };

  const renderContent = () => {
      switch(activeTab) {
          case 'admin': return <AdminPanel activeSubTab={activeAdminSubTab as any} />;
          case 'shop': return <Shop cart={cart} setCart={setCart} userLoggedIn={!!userId} />;
          case 'assistant': return <ChatAssistant dailySummary={getDailySummary()} transactions={transactions} userId={userId} userRole={userRole} onClose={() => setActiveTab(getInitialTab())} />;
          case 'support': return <SupportPage onBack={() => setActiveTab('deliveries')} onNavigateToChat={() => setActiveTab('assistant')} />;
          
          // History View Logic: 
          // If Store OR Delivery Partner, use Cloud OrderHistory. 
          // If Normal User, use Local HistoryTable.
          case 'history': 
            return (userRole === 'store_partner' || userRole === 'delivery_partner') 
                ? <OrderHistory userRole={userRole} /> 
                : <HistoryTable history={history} onClear={() => {}} onExport={() => {}} dateFilter={dateFilter} setDateFilter={setDateFilter} expenseFilter={expenseFilter} setExpenseFilter={setExpenseFilter} onUpdateHistory={setHistoryState} />;
          
          case 'reports': return <Reports history={history} todayStats={{ value: getDailySummary().profit, count: getDailySummary().deliveryCount, km: getDailySummary().km }} />;
          case 'addresses': return <AddressBook onClose={() => setActiveTab('deliveries')} onNavigateInternal={handleNavigateFromAddressBook} />;
          case 'profile': return <ProfileData onBack={() => setActiveTab('deliveries')} />;
          case 'map': return <OfflineMap initialDestination={mapDestination} onClearDestination={() => setMapDestination(null)} onBack={() => setActiveTab('deliveries')} onSaveRoute={handleSaveMapRun} />;
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
          case 'driver_marketing': return <DriverMarketing userRole={userRole} />;
          
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
                              
                              {dailyGoal && (
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
                          <div className="grid grid-cols-2 gap-3">
                              <Button onClick={() => setShowStartModal(true)} variant="outline" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                  <Target className="w-4 h-4 mr-2 text-blue-500"/> {fixedValue ? 'Editar Meta' : 'Começar Dia'}
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
                      {userRole === 'delivery_partner' && (
                          <PartnerDashboardWidgets onNavigate={setActiveTab} userRole={userRole} />
                      )}
                      
                      <div className={userRole === 'delivery_partner' ? 'mt-6' : ''}>
                        {dashboardContent}
                      </div>
                  </div>
              );
      }
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${theme}`}>
      {/* Mobile Header - Updated to Brand Red background with White Text/Icons */}
      {activeTab !== 'map' && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-brand-600 dark:bg-gray-900 border-b border-brand-700 dark:border-gray-800 z-40 flex items-center justify-between px-4 shadow-md">
            <div className="flex items-center gap-3">
                <button onClick={() => setMenuOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-brand-700 dark:hover:bg-gray-800 transition-colors">
                    <Menu className="w-6 h-6 text-white dark:text-gray-200" />
                </button>
                <Logo className="h-8 w-auto" variant="full-white" />
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

      {/* Sidebar Menu - REVISED STRUCTURE */}
      {menuOpen && (
          <div className="fixed inset-0 z-50 flex">
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)}></div>
              <div ref={menuRef} className="relative w-72 bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <h2 className="font-black text-xl text-gray-900 dark:text-white flex items-center gap-2">
                          <Logo className="h-6 w-auto" /> Menu
                      </h2>
                      <button onClick={() => setMenuOpen(false)}><X className="w-6 h-6 text-gray-400"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                      
                      {/* === DELIVERY PARTNER MENU === */}
                      {userRole === 'delivery_partner' && (
                          <>
                            <div className="space-y-1 bg-green-50 dark:bg-green-900/10 rounded-xl p-2 border border-green-100 dark:border-green-900/30 mb-4">
                                <p className="px-2 text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Bike className="w-3 h-3 fill-current"/> Plataforma</p>
                                <button onClick={() => { setActiveTab('partner'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'partner' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 font-bold' : 'text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900/30'}`}>
                                    <Truck className="w-4 h-4"/> Painel do Parceiro
                                </button>
                                <button onClick={() => { setActiveTab('history'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                                    <History className="w-4 h-4"/> Histórico de Pedidos
                                </button>
                            </div>

                            <div className="space-y-1">
                                <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Controle Pessoal (Manual)</p>
                                <button onClick={() => { setActiveTab('deliveries'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <LayoutDashboard className="w-5 h-5"/> Painel Diário
                                </button>
                                <button onClick={() => { setActiveTab('reports'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <BarChart3 className="w-5 h-5"/> Relatórios Financeiros
                                </button>
                                <button onClick={() => { setActiveTab('addresses'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <MapPin className="w-5 h-5"/> Agenda de Endereços
                                </button>
                                <button onClick={() => { setActiveTab('tasks'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <ListTodo className="w-5 h-5"/> Lista de Tarefas
                                </button>
                            </div>

                            <div className="space-y-1 mt-4">
                                <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ferramentas</p>
                                <button onClick={() => { setActiveTab('driver_marketing'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Megaphone className="w-5 h-5"/> Marketing Pessoal
                                </button>
                                <button onClick={() => { setActiveTab('map'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Map className="w-5 h-5"/> Mapa Offline
                                </button>
                                <button onClick={() => { setActiveTab('map'); setMenuOpen(false); setTimeout(() => { const btn = document.querySelector('button.animate-pulse'); if(btn) (btn as HTMLButtonElement).click(); }, 300); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                    <Zap className="w-5 h-5"/> Alerta Relâmpago
                                </button>
                                <button onClick={() => { setShowRouteCalc(true); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Calculator className="w-5 h-5"/> Calculadora de Rota
                                </button>
                                <button onClick={() => { setShowFuelCalc(true); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Fuel className="w-5 h-5"/> Calc. Combustível
                                </button>
                                <button onClick={() => { setShowMaintenance(true); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Wrench className="w-5 h-5"/> Manutenção
                                </button>
                                <button onClick={() => { setActiveTab('shop'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <ShoppingBag className="w-5 h-5"/> Loja de Peças
                                </button>
                            </div>

                            <div className="space-y-1 mt-4">
                                <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Conta & Ajuda</p>
                                <button onClick={() => { setActiveTab('profile'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <User className="w-5 h-5"/> Meu Perfil
                                </button>
                                <button onClick={() => { setActiveTab('assistant'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Bot className="w-5 h-5"/> Assistente IA
                                </button>
                                <button onClick={() => { setActiveTab('support'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Headphones className="w-5 h-5"/> Suporte
                                </button>
                            </div>
                          </>
                      )}

                      {/* === NORMAL USER MENU === */}
                      {userRole === 'user' && (
                          <>
                            <div className="space-y-1">
                                <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Gestão Diária</p>
                                <button onClick={() => { setActiveTab('deliveries'); setMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'deliveries' ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                                    <LayoutDashboard className="w-5 h-5"/> Painel Principal
                                </button>
                                <button onClick={() => { setActiveTab('history'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <History className="w-5 h-5"/> Histórico
                                </button>
                                <button onClick={() => { setActiveTab('reports'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <BarChart3 className="w-5 h-5"/> Relatórios
                                </button>
                                <button onClick={() => { setActiveTab('addresses'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <MapPin className="w-5 h-5"/> Agenda de Endereços
                                </button>
                                <button onClick={() => { setActiveTab('tasks'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <ListTodo className="w-5 h-5"/> Lista de Tarefas
                                </button>
                            </div>

                            <div className="space-y-1 mt-4">
                                <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ferramentas</p>
                                <button onClick={() => { setActiveTab('map'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Map className="w-5 h-5"/> Mapa Offline
                                </button>
                                <button onClick={() => { setActiveTab('map'); setMenuOpen(false); setTimeout(() => { const btn = document.querySelector('button.animate-pulse'); if(btn) (btn as HTMLButtonElement).click(); }, 300); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                    <Zap className="w-5 h-5"/> Alerta Relâmpago
                                </button>
                                <button onClick={() => { setShowRouteCalc(true); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Calculator className="w-5 h-5"/> Calculadora de Rota
                                </button>
                                <button onClick={() => { setShowFuelCalc(true); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Fuel className="w-5 h-5"/> Calc. Combustível
                                </button>
                                <button onClick={() => { setShowMaintenance(true); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Wrench className="w-5 h-5"/> Manutenção
                                </button>
                                <button onClick={() => { setActiveTab('shop'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <ShoppingBag className="w-5 h-5"/> Loja de Peças
                                </button>
                            </div>

                            <div className="space-y-1 mt-4">
                                <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Conta & Ajuda</p>
                                <button onClick={() => { setActiveTab('profile'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <User className="w-5 h-5"/> Meu Perfil
                                </button>
                                <button onClick={() => { setActiveTab('assistant'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Bot className="w-5 h-5"/> Assistente IA
                                </button>
                                <button onClick={() => { setActiveTab('support'); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <Headphones className="w-5 h-5"/> Suporte
                                </button>
                            </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
      <main className="flex-1 pb-20 p-4 max-w-xl mx-auto w-full">
          {renderContent()}
      </main>

      <EmergencyModal isOpen={showEmergencyModal} onClose={() => setShowEmergencyModal(false)} />
      {showSettingsModal && <NotificationSettings onClose={() => setShowSettingsModal(false)} />}
      {showAboutModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold dark:text-white">Sobre</h3>
                      <button onClick={() => setShowAboutModal(false)}><X className="w-5 h-5"/></button>
                  </div>
                  <AboutApp />
              </div>
          </div>
      )}
      {showPermissionModal && <PermissionModal onClose={() => setShowPermissionModal(false)} />}
      
      {showRouteCalc && <RouteCalculator onClose={() => setShowRouteCalc(false)} />}
      {showFuelCalc && <FuelCalculator onClose={() => setShowFuelCalc(false)} />}
      {showShareCard && daySummaryData && <ShareCard data={{ value: daySummaryData.profit, count: daySummaryData.count, km: daySummaryData.km, date: new Date().toLocaleDateString() }} onClose={() => setShowShareCard(false)} />}
      {showMaintenance && <Maintenance onClose={() => setShowMaintenance(false)} />}
      
      {/* End Day Confirmation */}
      {showEndDayConfirm && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm">
                  <h3 className="font-bold text-lg mb-2 dark:text-white">Encerrar o dia?</h3>
                  <p className="text-gray-500 mb-4">Isso salvará o histórico e limpará o painel para amanhã.</p>
                  <div className="flex gap-3">
                      <Button variant="outline" fullWidth onClick={() => setShowEndDayConfirm(false)}>Cancelar</Button>
                      <Button fullWidth onClick={confirmEndDay}>Confirmar</Button>
                  </div>
              </div>
          </div>
      )}

      {/* Day Summary Modal */}
      {showDaySummary && daySummaryData && (
          <ShareCard 
              data={{
                  value: daySummaryData.profit,
                  count: daySummaryData.count,
                  km: daySummaryData.km,
                  date: new Date().toLocaleDateString()
              }}
              onClose={() => setShowDaySummary(false)}
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

    </div>
  );
};

export default App;
