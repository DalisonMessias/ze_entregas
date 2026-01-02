import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { UserRole, AppNotification, DailySummary, DailyTransaction, MaintenanceSettings, PartnerProfile } from '../types';
import * as cloud from '../services/cloud';
import * as storage from '../services/storage';
import * as logger from '../services/logger';
import { initNotificationService, stopNotificationService } from '../services/notificationService';

// Tour Imports
import { useTour } from './Tour/TourContext';
import TourComponent from './Tour/Tour';
import { tourSteps } from './Tour/tourSteps';

// Icons
import { Menu, X, LogOut, Sun, Moon, Bell, ShieldAlert, User, UserX, Cloud, Info, ShoppingBag, LayoutDashboard, Layout, Users, FileCheck, Wallet, Store, Headphones, DollarSign, Settings, MapPin, Share2, FileText, Smartphone, Bot, Lock, Megaphone, Truck, BarChart3, Map, History, Flame, Star, MessageCircle, AlertTriangle, Newspaper, UserCheck, ArrowLeft, ClipboardList, Link2, Briefcase, Handshake, Shield, Monitor, Construction, CreditCard, Loader2, Route, Key, Banknote, TrendingUp, HelpCircle, FileSpreadsheet, Zap } from 'lucide-react';

// Components
import { Logo } from './Logo';
import { PwaManager } from './PwaManager';
import { Button } from './Button';
import { NotificationsPanel } from './NotificationsPanel';
import { NotificationsBell } from './NotificationsBell';
import { EmergencyModal } from './EmergencyButton';
import { NotificationSettings } from './NotificationSettings';
import { MaintenancePage } from './MaintenancePage';
import { PartnerDocumentation } from './PartnerDocumentation';

import { HistoryTable } from './HistoryTable';


const AdminPanel = React.lazy(() => import('./AdminPanel').then(module => ({ default: module.AdminPanel })));
const PartnerArea = React.lazy(() => import('./PartnerArea').then(module => ({ default: module.PartnerArea })));
const StoreWalletModule = React.lazy(() => import('./StoreWallet').then(module => ({ default: module.StoreWalletModule })));
const InternalOrders = React.lazy(() => import('./InternalOrders').then(module => ({ default: module.InternalOrders })));

const StoreRequest = React.lazy(() => import('./StoreRequest').then(module => ({ default: module.StoreRequest })));
const OrderHistory = React.lazy(() => import('./OrderHistory').then(module => ({ default: module.OrderHistory })));
const StoreTeam = React.lazy(() => import('./StoreTeam').then(module => ({ default: module.StoreTeam })));
const StoreReports = React.lazy(() => import('./StoreReports').then(module => ({ default: module.StoreReports })));
const StoreMarketing = React.lazy(() => import('./StoreMarketing').then(module => ({ default: module.StoreMarketing })));
const StoreIntegrations = React.lazy(() => import('./StoreIntegrations').then(module => ({ default: module.StoreIntegrations })));
const StoreSettings = React.lazy(() => import('./StoreSettings').then(module => ({ default: module.StoreSettings })));
const StoreProductImport = React.lazy(() => import('./ProductImportExport').then(module => ({ default: module.ProductImportExport })));
const FinancialPanel = React.lazy(() => import('./FinancialPanel').then(module => ({ default: module.FinancialPanel })));
const DriverMarketing = React.lazy(() => import('./DriverMarketing').then(module => ({ default: module.DriverMarketing })));
const Reports = React.lazy(() => import('./Reports').then(module => ({ default: module.Reports })));
const TaskList = React.lazy(() => import('./TaskList').then(module => ({ default: module.TaskList })));
const Zebank = React.lazy(() => import('./Zebank').then(module => ({ default: module.Zebank })));
const ProfileData = React.lazy(() => import('./ProfileData').then(module => ({ default: module.ProfileData })));
const SupportPage = React.lazy(() => import('./SupportPage').then(module => ({ default: module.SupportPage })));
const Shop = React.lazy(() => import('./Shop').then(module => ({ default: module.Shop })));
const AboutApp = React.lazy(() => import('./AboutApp').then(module => ({ default: module.AboutApp })));
const FaqPage = React.lazy(() => import('./FaqPage').then(module => ({ default: module.FaqPage })));
const SolutionsPage = React.lazy(() => import('./SolutionsPage').then(module => ({ default: module.SolutionsPage })));
const BenefitsPage = React.lazy(() => import('./BenefitsPage').then(module => ({ default: module.BenefitsPage })));
const CloudSync = React.lazy(() => import('./CloudSync').then(module => ({ default: module.CloudSync })));
const AssociateDriver = React.lazy(() => import('./AssociateDriver').then(module => ({ default: module.AssociateDriver })));
const DailyPanel = React.lazy(() => import('./DailyPanel').then(module => ({ default: module.DailyPanel })));
const ToolsPage = React.lazy(() => import('./ToolsPage').then(module => ({ default: module.ToolsPage })));
const StatusPage = React.lazy(() => import('./StatusPage').then(module => ({ default: module.StatusPage })));
const Heatmap = React.lazy(() => import('./Heatmap').then(module => ({ default: module.Heatmap })));
const ZePayStore = React.lazy(() => import('./ZePayStoreModule').then(module => ({ default: module.ZePayStore })));
const LocalHistoryPage = React.lazy(() => import('./LocalHistoryPage').then(module => ({ default: module.LocalHistoryPage })));
const SettingsPage = React.lazy(() => import('./SettingsPage').then(module => ({ default: module.SettingsPage })));
const InstallApp = React.lazy(() => import('./InstallApp').then(module => ({ default: module.InstallApp })));
const ChatAssistant = React.lazy(() => import('./ChatAssistant').then(module => ({ default: module.ChatAssistant })));
const PrivacyPolicy = React.lazy(() => import('./PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const StreetsNeighborhoods = React.lazy(() => import('../src/pages/StreetsNeighborhoods'));
const MarketingModule = React.lazy(() => import('./MarketingModule').then(module => ({ default: module.MarketingModule })));

// Hooks
import { useDialog } from '../utils/dialogService';


// Expanded type to include specific admin routes
export type ActiveTab =
    | 'admin_dashboard' | 'admin_users' | 'admin_validation' | 'admin_notifications' | 'admin_shop' | 'admin_support'
    | 'admin_api_keys' | 'admin_ai_config' | 'admin_routing' | 'admin_asaas_webhook' | 'admin_fees' | 'admin_pwa' | 'admin_payouts' | 'admin_cities'
    | 'admin_levels' | 'admin_ratings' | 'admin_security' | 'admin_blacklist' | 'admin_referrals' | 'admin_institutional'
    | 'admin_platform_news' | 'admin_store_finance' | 'admin_wallet_control' | 'admin_claims' | 'admin_maintenance' | 'admin_loan_config' | 'admin_investments'
    | 'profile'
    | 'support'
    | 'shop'
    | 'assistant'
    | 'wallet'
    | 'new_request'
    | 'history'
    | 'store_team'
    | 'store_reports'
    | 'store_marketing'
    | 'store_integrations'
    | 'store_settings'
    | 'store_product_import'
    | 'store_finance_panel'
    | 'partner'
    | 'daily_panel'
    | 'driver_marketing'
    | 'route_tools'
    | 'local_history' // Renamed for clarity
    | 'reports'
    | 'tasks'
    | 'zebank'
    | 'about'
    | 'faq'
    | 'solutions'
    | 'benefits'
    | 'notifications'
    | 'cloud'
    | 'settings'
    | 'associate_driver'
    | 'status'
    | 'heatmap'
    | 'privacy'
    | 'zepay_store'
    | 'upgrade_to_partner'
    | 'install_app'
    | 'internal_orders'
    | 'admin_slides'
    | 'streets_neighborhoods';



interface AppProps {
    userId: string;
    userRole: UserRole;
}

// Helper para verificar horário de manutenção
const isMaintenanceActive = (settings: MaintenanceSettings): boolean => {
    if (!settings.is_active) return false;

    // Se não houver horário definido, segue apenas o toggle manual (ativo)
    if (!settings.start_time || !settings.end_time) return true;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = settings.start_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;

    const [endH, endM] = settings.end_time.split(':').map(Number);
    const endMinutes = endH * 60 + endM;

    // Lógica para manutenção que cruza a meia-noite (ex: 23:00 as 02:00)
    if (endMinutes < startMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    // Lógica padrão (mesmo dia)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
};

// Componente wrapper para o fluxo de upgrade
const UpgradeToPartnerPage: React.FC = () => {
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadOrInitializeProfile = async () => {
            try {
                let p = await cloud.getMyPartnerProfile();

                // Se o perfil existe mas não tem os campos de parceiro, inicializa
                if (p && !p.vehicle_type) {
                    await cloud.updateMyPartnerProfile({
                        vehicle_type: 'moto',
                        vehicle_plate: '',
                        vehicle_model: '',
                        verification_status: 'NOT_SUBMITTED'
                    });
                    p = await cloud.getMyPartnerProfile();
                }

                setProfile(p);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load profile for upgrade", err);
                setLoading(false);
            }
        };
        loadOrInitializeProfile();
    }, []);

    const handleProfileUpdate = (updatedProfile: PartnerProfile) => {
        setProfile(updatedProfile);
    };

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>;
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-center bg-gray-50 dark:bg-gray-900 rounded-2xl min-h-[60vh]">
                <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Erro ao Carregar Perfil</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        Não foi possível carregar seu perfil. Tente novamente ou entre em contato com o suporte.
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={() => window.location.reload()} variant="outline" fullWidth>
                            Tentar Novamente
                        </Button>
                        <Button onClick={() => {
                            const event = new CustomEvent('navigateToTab', { detail: { tab: 'support' } });
                            window.dispatchEvent(event);
                        }} fullWidth>
                            Suporte
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return <PartnerDocumentation profile={profile} onProfileUpdate={handleProfileUpdate} />;
};


export const App: React.FC<AppProps> = ({ userId, userRole }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true); // Default open on desktop
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showEmergency, setShowEmergency] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [maintenance, setMaintenance] = useState<MaintenanceSettings | null>(null);
    const [effectiveRole, setEffectiveRole] = useState<UserRole>(userRole);

    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Shop Cart State
    const [cart, setCart] = useState<any[]>([]);

    const { alert } = useDialog();

    const mounted = useRef(true);


    // --- TOUR LOGIC ---
    const { startTour, isTourRunning } = useTour();

    // Welcome Tour on first load
    useEffect(() => {
        if (!effectiveRole) return;

        const welcomeTourKey = `universal_welcome_${effectiveRole}`;
        const hasSeenWelcomeTour = localStorage.getItem(`tour-completed-${welcomeTourKey}`);

        if (!hasSeenWelcomeTour && tourSteps.universal?.welcome) {
            setTimeout(() => {
                startTour(tourSteps.universal.welcome, welcomeTourKey);
            }, 1500);
        }
    }, [effectiveRole, startTour]);

    // Page-specific tour on tab change
    useEffect(() => {
        if (isTourRunning || !effectiveRole) return;

        const tourKey = `${effectiveRole}_${activeTab}`;
        const hasSeenTour = localStorage.getItem(`tour-completed-${tourKey}`);
        const stepsForPage = tourSteps[effectiveRole]?.[activeTab] ?? null;

        if (stepsForPage && !hasSeenTour) {
            setTimeout(() => {
                startTour(stepsForPage, tourKey);
            }, 500);
        }
    }, [activeTab, effectiveRole, isTourRunning, startTour]);

    const runCurrentPageTour = () => {
        const tourKey = `${effectiveRole}_${activeTab}`;
        const stepsForPage = tourSteps[effectiveRole]?.[activeTab] ?? tourSteps.universal?.[activeTab] ?? null;

        if (stepsForPage) {
            // Remove o registro de conclusão para permitir que o tour seja refeito
            localStorage.removeItem(`tour-completed-${tourKey}`);
            startTour(stepsForPage, tourKey);
            setIsMenuOpen(false);
        } else {
            alert({ title: 'Tour indisponível', message: 'Não há um tour específico para esta página.' });
        }
    };
    // --- END OF TOUR LOGIC ---


    useEffect(() => {
        initNotificationService(userId, effectiveRole);
        const interval = setInterval(async () => {
            try {
                const notifs = await cloud.getNotifications();
                if (mounted.current) {
                    setNotifications(notifs);
                }
            } catch (error) {
                console.error("Erro ao buscar notificações:", error);
            }
        }, 30000);

        // Check Maintenance Status
        const checkMaintenance = async () => {
            try {
                const settings = await cloud.getMaintenanceSettings();
                if (mounted.current) {
                    setMaintenance(settings);
                }
            } catch (error) {
                console.error("Erro ao verificar status de manutenção:", error);
            }
        };
        checkMaintenance();
        // Check maintenance every 30 seconds to lock/unlock users in real-time
        const maintInterval = setInterval(checkMaintenance, 30000);

        // Load Theme
        const storedTheme = storage.getTheme();
        setTheme(storedTheme);
        if (storedTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');

        return () => {
            stopNotificationService();
            clearInterval(interval);
            clearInterval(maintInterval);
        };
    }, [userId, effectiveRole]);

    useEffect(() => {
        if (!userId) return;

        let cancelled = false;

        const refreshRole = async (reason: string) => {
            try {
                const r = await cloud.getUserRole();
                if (!mounted.current || cancelled) return;
                const propRole = userRole;
                if (r !== propRole) {
                    logger.warn('ROLE_MISMATCH_DB_VS_PROP', { dbRole: r, propRole, reason });
                }
                setEffectiveRole(r);
            } catch {
                if (!mounted.current || cancelled) return;
                logger.warn('ROLE_FETCH_FAILED_FALLBACK_PROP', { fallbackRole: userRole, reason });
                setEffectiveRole(userRole);
            }
        };

        refreshRole('initial');

        const intervalId = window.setInterval(() => {
            void refreshRole('interval');
        }, 60000);

        const handleManualRefresh = () => {
            void refreshRole('manual_event');
        };

        window.addEventListener('refreshUserRole', handleManualRefresh);

        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
            window.removeEventListener('refreshUserRole', handleManualRefresh);
        };
    }, [userId, userRole]);

    useEffect(() => {
        setEffectiveRole(userRole);
        logger.info('ROLE_PROP_UPDATE', { userRole });
    }, [userRole]);

    useEffect(() => {
        if (effectiveRole === 'admin') { setActiveTab('admin_dashboard'); logger.info('ACTIVE_TAB_DEFAULT', { role: effectiveRole, tab: 'admin_dashboard' }); }
        else if (effectiveRole === 'store_partner') { setActiveTab('wallet'); logger.info('ACTIVE_TAB_DEFAULT', { role: effectiveRole, tab: 'wallet' }); }
        else if (effectiveRole === 'delivery_partner') { setActiveTab('partner'); logger.info('ACTIVE_TAB_DEFAULT', { role: effectiveRole, tab: 'partner' }); }
        else if (effectiveRole === 'delivery_person') { setActiveTab('daily_panel'); logger.info('ACTIVE_TAB_DEFAULT', { role: effectiveRole, tab: 'daily_panel' }); }
        else { setActiveTab('shop'); logger.info('ACTIVE_TAB_DEFAULT', { role: effectiveRole, tab: 'shop' }); }
    }, [effectiveRole]);

    // NEW: Global navigation event listener
    useEffect(() => {
        const handleNavigate = (event: CustomEvent) => {
            if (event.detail && event.detail.tab) {
                console.log('[App] Navigating to tab:', event.detail.tab);
                setActiveTab(event.detail.tab as ActiveTab);
                setIsMenuOpen(false);
            }
        };

        window.addEventListener('navigateToTab', handleNavigate as EventListener);

        return () => {
            window.removeEventListener('navigateToTab', handleNavigate as EventListener);
        };
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        storage.setTheme(newTheme);
        if (newTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    };

    useEffect(() => {
        return () => {
            mounted.current = false;
        };
    }, []);

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);

        try {
            await cloud.signOut();
            // A subscription `onAuthStateChange` em AuthWrapper.tsx deve cuidar do resto.
            // No entanto, se a página não redirecionar em 2 segundos, forçamos um reload.
            setTimeout(() => {
                if (mounted.current) {
                    logger.warn('LOGOUT_REDIRECT_FALLBACK', { reason: 'Timeout' });
                    window.location.reload();
                }
            }, 2000);
        } catch (error) {
            if (mounted.current) {
                console.error("Erro ao fazer logout:", error);
                alert({ title: "Erro de Logout", message: `Não foi possível fazer logout. Tente novamente. (${String(error)})` });
                setIsLoggingOut(false);
            }
        }
    };

    const navigate = (tab: ActiveTab) => {
        const allowed = canAccessTab(tab);
        if (!allowed) {
            logger.warn('NAVIGATE_DENIED', { role: effectiveRole, tab });
            setActiveTab(defaultTabByRole[effectiveRole]);
            setIsMenuOpen(false);
            alert({ title: 'Acesso negado', message: 'Você não tem permissão para acessar esta área.' });
            return;
        }
        logger.info('NAVIGATE_ALLOWED', { role: effectiveRole, tab });
        setActiveTab(tab);
        setIsMenuOpen(false);
    };

    const markNotificationRead = async (id: string) => {
        await cloud.markNotificationRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleShareApp = async () => {
        const shareData = {
            title: 'Zé Entregas',
            text: 'Baixe o melhor app para entregadores e lojistas!',
            url: window.location.href.startsWith('http') ? window.location.href : 'https://zeentregas.app'
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error("Erro ao compartilhar:", err);
            }
        } else {
            await alert({ title: 'Compartilhar', message: 'Compartilhe este link: ' + shareData.url });
        }
    };

    const isAdmin = effectiveRole === 'admin';
    const isStore = effectiveRole === 'store_partner';
    const isPartner = effectiveRole === 'delivery_partner';
    const isNormalDriver = effectiveRole === 'delivery_person';
    const isDriver = isNormalDriver || isPartner;

    const generalTabs = new Set<ActiveTab>([
        'shop', 'profile', 'support', 'assistant', 'cloud', 'about', 'faq', 'solutions', 'benefits', 'install_app', 'status', 'privacy', 'streets_neighborhoods', 'settings', 'upgrade_to_partner'
    ]);

    const defaultTabByRole: Record<UserRole, ActiveTab> = {
        admin: 'admin_dashboard',
        store_partner: 'wallet',
        delivery_partner: 'partner',
        delivery_person: 'daily_panel',
        collaborator: 'shop'
    };

    const allowedTabs: Record<UserRole, Set<ActiveTab>> = {
        admin: new Set<ActiveTab>([...generalTabs]),
        store_partner: new Set<ActiveTab>([
            'wallet', 'new_request', 'history', 'store_team', 'store_reports', 'store_marketing', 'store_integrations', 'store_settings', 'store_product_import', 'store_finance_panel', 'zepay_store', 'zebank', 'internal_orders'
        ]),

        delivery_partner: new Set<ActiveTab>([
            'daily_panel', 'partner', 'zebank', 'driver_marketing', 'local_history', 'associate_driver', 'route_tools', 'tasks', 'reports', 'heatmap'
        ]),
        delivery_person: new Set<ActiveTab>([
            'daily_panel', 'partner', 'zebank', 'driver_marketing', 'local_history', 'associate_driver', 'route_tools', 'tasks', 'reports', 'heatmap'
        ]),
        collaborator: new Set<ActiveTab>(['shop'])
    };

    const canAccessTab = (tab: ActiveTab) => {
        if (tab.startsWith('admin_')) return isAdmin;
        if (generalTabs.has(tab)) return true;
        const set = allowedTabs[effectiveRole];
        return set && set.has(tab);
    };



    // --- MAINTENANCE BLOCK ---
    // Verifica se a manutenção está ativa E se estamos dentro do horário programado
    if (maintenance && isMaintenanceActive(maintenance) && !isAdmin) {
        return <MaintenancePage settings={maintenance} />;
    }

    // --- RENDER CONTENT BASED ON TAB ---
    const renderContent = () => {
        if (!canAccessTab(activeTab)) {
            return (
                <div className="p-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300">
                        <Lock className="w-5 h-5" />
                        <span className="font-bold">Acesso restrito</span>
                    </div>
                </div>
            );
        }
        if (activeTab.startsWith('admin_')) {
            if (!isAdmin) {
                return (
                    <div className="p-10 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300">
                            <Lock className="w-5 h-5" />
                            <span className="font-bold">Acesso restrito aos administradores</span>
                        </div>
                    </div>
                );
            }
            const subTab = activeTab.replace('admin_', '') as any;
            return <AdminPanel activeSubTab={subTab} />;
        }

        switch (activeTab) {
            case 'profile': return <ProfileData onBack={() => navigate(isDriver ? 'daily_panel' : 'shop')} />;
            case 'status': return <StatusPage onBack={() => navigate(isDriver ? 'daily_panel' : 'shop')} />;
            case 'support': return <SupportPage onBack={() => navigate(isDriver ? 'daily_panel' : 'shop')} onNavigateToChat={() => navigate('assistant')} />;
            case 'shop': return <Shop cart={cart} setCart={setCart} userLoggedIn={true} />;
            case 'assistant':
                return <ChatAssistant
                    dailySummary={{ profit: 0, deliveryCount: 0, km: 0, expenses: 0, goal: null, location: null }}
                    transactions={[]}
                    userId={userId}
                    userRole={effectiveRole}
                    onClose={() => navigate(isDriver ? 'daily_panel' : 'shop')}
                />;

            // Store Specific
            case 'wallet': return <StoreWalletModule onNavigate={navigate} />;
            case 'new_request': return <StoreRequest onNavigate={navigate} />;
            case 'history': return <OrderHistory userRole={effectiveRole as 'store_partner' | 'delivery_partner'} />;
            case 'store_team': return <StoreTeam />;
            case 'store_reports': return <StoreReports />;
            case 'store_marketing': return <StoreMarketing />;
            case 'store_integrations': return <StoreIntegrations />;
            case 'store_settings': return <StoreSettings />;
            case 'store_product_import': return <StoreProductImport />;
            case 'store_finance_panel': return <ZePayStore />;
            case 'zepay_store': return <ZePayStore />; // ZéPay Module
            case 'internal_orders': return <InternalOrders />;


            // Partner & Delivery Person Specific
            case 'partner': return <PartnerArea userRole={effectiveRole} onNavigate={navigate} />;
            case 'daily_panel': return <DailyPanel onNavigate={navigate} />;
            case 'driver_marketing': return <DriverMarketing userRole={effectiveRole} />;
            case 'route_tools': return <ToolsPage userRole={effectiveRole} />;
            case 'reports': return <Reports history={storage.getHistory()} todayStats={{ value: 0, count: 0, km: 0 }} />;
            case 'tasks': return <TaskList />;
            case 'zebank': return <Zebank userRole={effectiveRole} />;
            case 'associate_driver': return <AssociateDriver onBack={() => navigate('daily_panel')} />;
            case 'heatmap': return <Heatmap userRole={effectiveRole} />;
            case 'local_history': return <LocalHistoryPage />;

            case 'about': return <AboutApp />;
            case 'faq': return <FaqPage />;
            case 'solutions': return <SolutionsPage />;
            case 'benefits': return <BenefitsPage />;
            case 'install_app': return <InstallApp onBack={() => navigate(isDriver ? 'daily_panel' : 'shop')} />;
            case 'cloud': return <CloudSync />;
            case 'privacy': return <PrivacyPolicy onClose={() => { }} />; // Direct access to privacy policy
            case 'upgrade_to_partner': return <UpgradeToPartnerPage />;
            case 'settings': return <SettingsPage onBack={() => navigate(isDriver ? 'daily_panel' : 'shop')} />;
            case 'streets_neighborhoods': return <StreetsNeighborhoods />;

            default: return <div className="p-10 text-center text-gray-500">Etapa não implementada: {activeTab}</div>;
        }
    };

    // Helper to render sidebar button
    const MenuButton = ({ icon: Icon, label, tab, onClick, id }: { icon: any, label: string, tab?: ActiveTab, onClick?: () => void, id?: string }) => (
        <button
            id={id}
            title={!isSidebarExpanded ? label : undefined}
            onClick={() => onClick ? onClick() : navigate(tab!)}
            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === tab ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'} ${!isSidebarExpanded ? 'justify-center md:px-2' : ''}`}
        >
            <Icon className={`w-5 h-5 ${activeTab === tab ? 'text-brand-600' : 'text-gray-500'} flex-shrink-0`} />
            <span className={`text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${!isSidebarExpanded ? 'md:hidden w-0 opacity-0' : 'w-auto opacity-100'}`}>{label}</span>
        </button>
    );

    const MenuSection = ({ title }: { title: string }) => (
        <p className={`text-[10px] font-bold text-gray-400 uppercase ml-3 mt-4 mb-2 tracking-wider transition-opacity duration-300 ${!isSidebarExpanded ? 'md:hidden' : ''}`}>{title}</p>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            {/* TOUR COMPONENT */}
            <TourComponent />

            {/* CONNECTION STATUS BAR RE MOVED per user request */}
            <PwaManager />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 shadow-sm z-40 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <button
                        id="header-menu-button"
                        onClick={() => {
                            // Mobile: Toggle Modal Drawer
                            if (window.innerWidth < 768) {
                                setIsMenuOpen(true);
                            } else {
                                // Desktop: Toggle Collapse
                                setIsSidebarExpanded(!isSidebarExpanded);
                            }
                        }}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    {/* Back Button for Sub-Views if not root views */}
                    {activeTab !== 'daily_panel' && activeTab !== 'shop' && activeTab !== 'wallet' && activeTab !== 'partner' && activeTab !== 'admin_dashboard' && (
                        <button onClick={() => navigate(isDriver ? 'daily_panel' : 'shop')} className="p-1 rounded-full text-gray-400 hover:text-gray-600 md:hidden">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                    )}

                </div>

                <div className="flex items-center gap-2">
                    <button id="header-emergency-button" onClick={() => setShowEmergency(true)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full animate-pulse">
                        <ShieldAlert className="w-6 h-6" />
                    </button>
                    <div id="header-notifications-bell">
                        <NotificationsBell unreadCount={unreadCount} onClick={() => setShowNotifications(true)} />
                    </div>
                </div>
            </header>

            {/* Sidebar Menu */}
            {/* Mobile Backdrop - Only visible on mobile when menu is open */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-300"
                    onClick={() => setIsMenuOpen(false)}
                ></div>
            )}

            {/* Sidebar Container */}
            <div className={`
                fixed z-50 
                /* Mobile Styles: Inset-0 (Drawer), driven by isMenuOpen */
                ${isMenuOpen ? 'inset-y-0 left-0 translate-x-0' : '-translate-x-full'} 
                
                /* Desktop Styles: Persistent Rail, driven by isSidebarExpanded */
                md:translate-x-0 md:top-16 md:left-0 md:bottom-0 md:border-r md:shadow-none
                ${isSidebarExpanded ? 'md:w-80' : 'md:w-20'}
                
                bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 flex flex-col
            `}>
                {/* Header (Logo + Close Button) - Mobile Only mostly, or adapted for desktop */}
                <div className={`
                    flex items-center 
                    ${isSidebarExpanded ? 'justify-between p-6' : 'justify-center p-4'}
                    border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 min-h-[4rem]
                `}>
                    {/* Logo - Show only when expanded */}
                    {isSidebarExpanded && <Logo className="h-8 w-auto text-brand-600" />}

                    {/* Logo Icon Only - Show when collapsed */}
                    {!isSidebarExpanded && <Logo className="h-8 w-auto text-brand-600" mode="icon" />}

                    {/* Close Button - Visible only on Mobile */}
                    <button onClick={() => setIsMenuOpen(false)} className="md:hidden"><X className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">

                    {/* --- ADMIN MENU --- */}
                    {isAdmin && (
                        <>
                            <MenuSection title="Admin" />
                            <MenuButton icon={LayoutDashboard} label="Dashboard" tab="admin_dashboard" id="admin-dashboard-link" />
                            <MenuButton icon={Layout} label="Banners/Slides" tab="admin_slides" />
                            <MenuButton icon={Construction} label="Manutenção" tab="admin_maintenance" />
                        </>
                    )}

                    {/* --- STORE PARTNER MENU --- */}
                    {isStore && (
                        <>
                            <MenuSection title="Loja" />
                            <MenuButton icon={LayoutDashboard} label="Painel" tab="wallet" id="store-wallet-link" />
                            <MenuButton icon={Truck} label="Solicitar Entrega" tab="new_request" id="store-new-request-link" />
                        </>
                    )}

                    {isPartner && (
                        <>
                            <MenuSection title="Entregas" />
                            <MenuButton icon={ClipboardList} label="Painel Diário" tab="daily_panel" id="driver-daily-panel-link" />
                            <MenuButton icon={Truck} label="Painel de Corridas" tab="partner" />
                            <MenuButton icon={Megaphone} label="Marketing (Entregadores)" tab="driver_marketing" />
                        </>
                    )}
                    {isNormalDriver && (
                        <>
                            <MenuSection title="Entregas" />
                            <MenuButton icon={ClipboardList} label="Painel Diário" tab="daily_panel" id="driver-daily-panel-link" />
                            <MenuButton icon={Truck} label="Painel de Corridas" tab="partner" />
                            <MenuButton icon={Megaphone} label="Marketing (Entregadores)" tab="driver_marketing" />
                        </>
                    )}

                    {/* --- GENERAL MENU (ALL USERS) --- */}
                    <MenuSection title="Geral" />
                    <MenuButton icon={User} label="Meu Perfil" tab="profile" />
                    <MenuButton icon={Headphones} label="Suporte" tab="support" />
                    <MenuButton icon={Bot} label="Assistente Zé" tab="assistant" />
                    <MenuButton icon={HelpCircle} label="Ver Tour da Página" onClick={runCurrentPageTour} />

                    {/* --- FOOTER ACTIONS --- */}
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                        {/* Idioma removido: app opera exclusivamente em PT-BR */}
                        <MenuButton icon={Share2} label="Compartilhar App" onClick={handleShareApp} />
                        <MenuButton icon={Lock} label="Política de Privacidade" tab="privacy" /> {/* DIRECT ACCESS */}
                        <MenuButton icon={UserCheck} label="Verificar Status" onClick={() => navigate('status')} />
                    </div>
                </div>

                <div className={`
                    border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 
                    ${isSidebarExpanded ? 'p-4 space-y-3' : 'p-2 space-y-2'}
                `}>
                    <div className={`flex items-center ${isSidebarExpanded ? 'justify-between px-2' : 'flex-col gap-2'}`}>
                        <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => navigate('settings')}
                            aria-label="Configurações"
                            className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <button onClick={handleLogout} disabled={isLoggingOut} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 disabled:opacity-50">
                            {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
                        </button>
                    </div>
                    {isSidebarExpanded && (
                        <div className="text-center text-[10px] text-gray-400">
                            Versão 3.2.0 • Build 2025
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <main className={`pt-20 px-4 pb-24 mx-auto transition-all duration-300 ${isSidebarExpanded ? 'md:ml-80' : 'md:ml-20'}`}>
                <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>}>
                    {renderContent()}
                </Suspense>
            </main>

            {/* Modals */}
            <EmergencyModal isOpen={showEmergency} onClose={() => setShowEmergency(false)} />
            {showNotifications && (
                <NotificationsPanel
                    notifications={notifications}
                    onMarkAsRead={markNotificationRead}
                    onClose={() => setShowNotifications(false)}
                />
            )}
            {showSettings && <NotificationSettings onClose={() => setShowSettings(false)} />}
            {showPrivacy && (
                <Suspense fallback={<div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600" /></div>}>
                    <PrivacyPolicy onClose={() => setShowPrivacy(false)} />
                </Suspense>
            )}
        </div>
    );
};
