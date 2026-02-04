import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Menu, X, LogOut, Sun, Moon, Bell, ShieldAlert, User, UserX, Cloud, Info, ShoppingBag, LayoutDashboard, Layout, Users, FileCheck, Wallet, Store, Headphones, DollarSign, Settings, MapPin, Share2, FileText, Smartphone, Bot, Lock, Megaphone, Truck, BarChart3, Map, History, Flame, Star, MessageCircle, AlertTriangle, Newspaper, UserCheck, ArrowLeft, ClipboardList, Link2, Briefcase, Handshake, Shield, Monitor, Construction, CreditCard, Route, Key, Banknote, TrendingUp, HelpCircle, FileSpreadsheet, Zap, Globe, ListPlus, Lightbulb, RefreshCw, Power, MessageSquare, Landmark, Package, Download, LayoutGrid, ChevronUp, Home, Search, Image as ImageIcon } from 'lucide-react';
import { Loading } from './Loading';

import { UserRole, AppNotification, MaintenanceSettings, PartnerProfile, UserStatus } from '../types';
import * as storage from '../services/storage';
import * as cloud from '../services/cloud';
import * as logger from '../services/logger';
import { initNotificationService, stopNotificationService } from '../services/notificationService';
import { useTour } from '../components/Tour/TourContext';
import TourComponent from './Tour/Tour';
import { SectionErrorBoundary } from './SectionErrorBoundary';
import { tourSteps } from '../components/Tour/tourSteps';
import { getImpersonationState, stopImpersonation } from '../services/impersonation';

// Components
import { Logo } from './Logo';
import { Skeleton } from './Skeleton';
import { PwaManager } from './PwaManager';
import { Button } from './Button';
import { NotificationsPanel } from './NotificationsPanel';
import { NotificationsBell } from './NotificationsBell';
import { EmergencyModal } from './EmergencyButton';
import { NotificationSettings } from './NotificationSettings';
import { MaintenancePage } from './MaintenancePage';
import { PartnerDocumentation } from './PartnerDocumentation';
// Duplicate SectionErrorBoundary import removed
import { ExclusiveLock } from './ExclusiveLock';
import { UserStatusBanner } from './UserStatusBanner';
import { AccessDenied } from './AccessDenied';
import { DesktopOnlyGate } from './DesktopOnlyGate';

// Lazy Loaded Components
const AdminPanel = React.lazy(() => import('./AdminPanel').then(module => ({ default: module.AdminPanel })));
const PartnerArea = React.lazy(() => import('./PartnerArea').then(module => ({ default: module.PartnerArea })));
const StoreWalletModule = React.lazy(() => import('./StoreWallet'));
const InternalOrders = React.lazy(() => import('./InternalOrders').then(module => ({ default: module.InternalOrders })));
const StoreCatalog = React.lazy(() => import('./StoreCatalog').then(module => ({ default: module.StoreCatalog })));
const InternalChatContainer = React.lazy(() => import('./InternalChat/InternalChatContainer'));
const StoreDriversChat = React.lazy(() => import('./InternalChat/StoreDriversChat'));

const StoreRequest = React.lazy(() => import('./StoreRequest').then(module => ({ default: module.StoreRequest })));
const OrderHistory = React.lazy(() => import('./OrderHistory'));
const StoreTeam = React.lazy(() => import('./StoreTeam').then(module => ({ default: module.StoreTeam })));
const StoreReports = React.lazy(() => import('./StoreReports').then(module => ({ default: module.StoreReports })));
const StoreMarketing = React.lazy(() => import('./StoreMarketing').then(module => ({ default: module.StoreMarketing })));
const StoreIntegrations = React.lazy(() => import('./StoreIntegrations').then(module => ({ default: module.StoreIntegrations })));
const PrintCatalogGenerator = React.lazy(() => import('./PrintCatalogGenerator').then(module => ({ default: module.PrintCatalogGenerator })));
const StoreSettings = React.lazy(() => import('./StoreSettings').then(module => ({ default: module.StoreSettings })));
const StoreProductImport = React.lazy(() => import('./ProductImportExport').then(module => ({ default: module.ProductImportExport })));
const ZePayStore = React.lazy(() => import('./ZePayStoreModule').then(module => ({ default: module.ZePayStore })));
const StoreApiDocs = React.lazy(() => import('./StoreApiDocs').then(module => ({ default: module.StoreApiDocs })));
const StoreReceivingPayment = React.lazy(() => import('./StoreReceivingPayment').then(module => ({ default: module.StoreReceivingPayment })));
const AdminMercadoPagoConfig = React.lazy(() => import('./AdminMercadoPagoConfig').then(module => ({ default: module.AdminMercadoPagoConfig })));
const AdminAIConfig = React.lazy(() => import('./AdminAIConfig').then(module => ({ default: module.AdminAIConfig })));
const AdminInsuranceConfig = React.lazy(() => import('./AdminInsuranceConfig').then(module => ({ default: module.AdminInsuranceConfig })));
const AdminPlatformCoupons = React.lazy(() => import('./AdminPlatformCoupons'));
const StorePromotions = React.lazy(() => import('./StorePromotions').then(module => ({ default: module.StorePromotions })));

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
const AssociateOrders = React.lazy(() => import('./AssociateOrders').then(module => ({ default: module.AssociateOrders })));
const ToolsPage = React.lazy(() => import('./ToolsPage').then(module => ({ default: module.ToolsPage })));
const StatusPage = React.lazy(() => import('./StatusPage').then(module => ({ default: module.StatusPage })));
const Heatmap = React.lazy(() => import('./Heatmap').then(module => ({ default: module.Heatmap })));
const LocalHistoryPage = React.lazy(() => import('./LocalHistoryPage').then(module => ({ default: module.LocalHistoryPage })));
const SettingsPage = React.lazy(() => import('./SettingsPage').then(module => ({ default: module.SettingsPage })));
const InstallApp = React.lazy(() => import('./InstallApp').then(module => ({ default: module.InstallApp })));
const ChatAssistant = React.lazy(() => import('./ChatAssistant').then(module => ({ default: module.ChatAssistant })));
const PrivacyPolicy = React.lazy(() => import('./PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const InsurancePage = React.lazy(() => import('./InsurancePage').then(module => ({ default: module.InsurancePage })));
const StreetsList = React.lazy(() => import('../src/pages/StreetsList'));
const LoansModule = React.lazy(() => import('./LoansModule'));
const CollaboratorWrapper = React.lazy(() => import('./CollaboratorWrapper').then(m => ({ default: m.CollaboratorWrapper })));
const ScorePanel = React.lazy(() => import('./ScorePanel').then(m => ({ default: m.ScorePanel })));
const LandingPage = React.lazy(() => import('./LandingPage').then(module => ({ default: module.LandingPage })));
const DigitalMenu = React.lazy(() => import('./DigitalMenu/DigitalMenu').then(module => ({ default: module.DigitalMenu })));
const PartnerStore = React.lazy(() => import('./PartnerStore').then(m => ({ default: m.PartnerStore })));
const PartnerDelivery = React.lazy(() => import('./PartnerDelivery').then(m => ({ default: m.PartnerDelivery })));
const OrderTracking = React.lazy(() => import('./OrderTracking/OrderTracking').then(m => ({ default: m.OrderTracking })));
const UserOrders = React.lazy(() => import('./UserOrders').then(m => ({ default: m.UserOrders })));
const StoreChatPage = React.lazy(() => import('./DigitalMenu/StoreChatPage').then(m => ({ default: m.StoreChatPage })));
const StreetRequestPage = React.lazy(() => import('../src/pages/StreetRequestPage').then(m => ({ default: m.StreetRequestPage })));
const StreetRequestsAdmin = React.lazy(() => import('../src/pages/StreetRequestsAdmin').then(m => ({ default: m.StreetRequestsAdmin })));
const MerchantPOSMobile = React.lazy(() => import('./MerchantPOSMobile').then(m => ({ default: m.MerchantPOSMobile })));
const MerchantPOSDesktop = React.lazy(() => import('./MerchantPOSDesktop').then(m => ({ default: m.MerchantPOSDesktop })));

// Additional Components from Remote
const AddressBook = React.lazy(() => import('./AddressBook').then(module => ({ default: module.AddressBook })));
const RouteList = React.lazy(() => import('./RouteList').then(module => ({ default: module.RouteList })));
const NotFound = React.lazy(() => import('../src/pages/NotFound').then(module => ({ default: module.NotFound })));

// Hooks
import { StoreStatus } from './StoreStatus';
import { useDialog } from '../utils/dialogService';
import { getTabFromUrl, syncUrlWithTab } from '../utils/routeMap';


// Expanded type to include specific admin routes
export type ActiveTab =
    | 'admin_dashboard' | 'admin_users' | 'admin_lojas' | 'admin_validation' | 'admin_notifications' | 'admin_shop' | 'admin_support'
    | 'admin_api_keys' | 'admin_ai_config' | 'admin_routing' | 'admin_infinitepay' | 'admin_fees' | 'admin_pwa' | 'admin_payouts' | 'admin_cities'
    | 'admin_levels' | 'admin_ratings' | 'admin_security' | 'admin_blacklist' | 'admin_referrals' | 'admin_institutional'
    | 'admin_platform_news' | 'admin_store_finance' | 'admin_wallet_control' | 'admin_claims' | 'admin_maintenance' | 'admin_loan_config' | 'admin_investments'
    | 'admin_slides' | 'admin_tips' | 'admin_chat' | 'admin_payment_gateways' | 'admin_mercadopago' | 'admin_pix_config' | 'admin_location_map' | 'admin_base_catalog'
    | 'order_tracking'
    | 'admin_store_categories' | 'admin_global_coupons' | 'admin_image_gallery'
    | 'admin_insurance' | 'admin_street_requests' | 'admin_mediation'
    | 'store_drivers_chat'
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
    | 'store_status'
    | 'store_receiving_payment'
    | 'store_finance_panel'
    | 'partner'
    | 'daily_panel'
    | 'driver_marketing'
    | 'route_tools'
    | 'route_list'
    | 'local_history'
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
    | 'associate_orders'
    | 'status'
    | 'heatmap'
    | 'addresses'
    | 'privacy'
    | 'zepay_store'
    | 'upgrade_to_partner'
    | 'install_app'
    | 'internal_orders'
    | 'internal_orders_new'
    | 'store_catalog'
    | 'store_print_catalog'
    | 'store_api_docs'
    | 'store_promotions'

    | 'streets_list'
    | 'score'
    | 'store_loans'
    | 'loans'
    | 'collaborator_area'
    | 'internal_chat'
    | 'chat'
    | 'forgot_password'
    | 'login'
    | 'signup'
    | 'partner_store'
    | 'partner_delivery'
    | 'insurance'
    | 'home'
    | 'my_orders'
    | 'digital_menu'
    | 'store_public_chat'
    | 'street_request'
    | 'zepoint'
    | 'not_found';


interface AppProps {
    userId: string;
    userRole: UserRole;
    initialUserStatus?: UserStatus;
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

// Componente Banner de Impersonation (Local)
const ImpersonationBanner = () => {
    const [state, setState] = useState(getImpersonationState());

    useEffect(() => {
        const check = () => setState(getImpersonationState());
        window.addEventListener('impersonation_change', check);
        // Check inicial caso já esteja ativo
        check();
        return () => window.removeEventListener('impersonation_change', check);
    }, []);

    if (!state?.isActive) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] max-w-sm w-full animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-red-600 text-white p-4 rounded-3xl shadow-2xl border-4 border-white/20 flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <ShieldAlert className="w-24 h-24" />
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className="bg-white/20 p-2 rounded-xl">
                        <UserCheck className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-red-100 uppercase tracking-wider">Modo de Acesso</p>
                        <p className="font-bold text-lg leading-tight line-clamp-1">{state.storeName}</p>
                    </div>
                </div>

                <div className="text-xs text-red-100 font-medium bg-black/10 p-2 rounded-lg relative z-10">
                    Motivo: "{state.reason}"
                </div>

                <button
                    onClick={async () => {
                        await stopImpersonation();
                        window.location.href = '/admin/lojas';
                    }}
                    className="w-full bg-white text-red-600 py-3 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-gray-100 transition-colors shadow-sm active:scale-95 duration-200 relative z-10 flex items-center justify-center gap-2"
                >
                    <LogOut className="w-4 h-4" />
                    Sair do Acesso
                </button>
            </div>
        </div>
    );
};

// Componente wrapper para o fluxo de upgrade
const UpgradeToPartnerPage: React.FC = () => {
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadOrInitializeProfile = async () => {
            try {
                let p = await cloud.getMyPartnerProfile();

                // Se não existir perfil, cria um novo
                if (!p) {
                    try {
                        await cloud.updateMyPartnerProfile({
                            vehicle_type: 'moto',
                            vehicle_plate: '',
                            vehicle_model: '',
                            verification_status: 'NOT_SUBMITTED'
                        });
                        // Tenta carregar novamente após criar
                        p = await cloud.getMyPartnerProfile();
                    } catch (createErr) {
                        console.error("Failed to auto-create partner profile", createErr);
                    }
                }

                // Se mesmo após tentar criar, ainda for null (ex: erro de RLS ou latência)
                // Criamos um objeto em memória para não travar a UI
                if (!p) {
                    console.warn("Profile creation pending/failed, using in-memory fallback");
                    p = {
                        id: 'temp_id',
                        user_id: 'current_user',
                        is_active: true,
                        verification_status: 'NOT_SUBMITTED',
                        vehicle_type: 'moto',
                        name: '',
                        is_super_store: false
                    } as PartnerProfile;
                }

                // Se o perfil existe mas está incompleto (migração antiga)
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

                // FINAL FALLBACK: Em caso de erro catastrófico, força um perfil vazio
                setProfile({
                    id: 'temp_id_err',
                    user_id: 'current_user',
                    is_active: true,
                    verification_status: 'NOT_SUBMITTED',
                    vehicle_type: 'moto',
                    name: '',
                    is_super_store: false
                } as PartnerProfile);
                setLoading(false);
            }
        };
        loadOrInitializeProfile();
    }, []);

    const handleProfileUpdate = (updatedProfile: PartnerProfile) => {
        setProfile(updatedProfile);
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-in fade-in max-w-3xl mx-auto p-4 w-full">
                {/* Header */}
                <Skeleton className="h-32 w-full rounded-3xl" />

                {/* Section 1 */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                </div>

                {/* Section 2 */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="space-y-3">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </div>
            </div>
        );
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


export const App: React.FC<AppProps> = ({ userId, userRole, initialUserStatus = 'active' }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
        if (typeof window === 'undefined') return 'profile';
        const tabFromUrl = getTabFromUrl(window.location.pathname);
        const authTabs = ['login', 'signup', 'forgot_password'];

        // If URL doesn't map to a valid tab and it's not root, it's a 404
        if (!tabFromUrl && window.location.pathname !== '/' && window.location.pathname !== '/home') {
            return 'not_found';
        }

        if (tabFromUrl && !authTabs.includes(tabFromUrl)) return tabFromUrl;

        // Default tabs by role
        if (!userId || userId === 'guest') return 'home';

        if (userRole === 'admin') return 'admin_dashboard'; // Admin
        if (userRole === 'store_partner') return 'wallet'; // Lojistas
        if (userRole === 'delivery_person') return 'daily_panel'; //Entregadores Normais
        if (userRole === 'delivery_partner') return 'partner'; // Entregadores Parceiros
        if (userRole === 'collaborator') return 'collaborator_area'; // Colaboradores

        return 'home'; // Fallback padrão mais seguro
    });
    const [userStatus, setUserStatus] = useState<UserStatus>(initialUserStatus || 'active');
    const [blockingReason, setBlockingReason] = useState<string | null>(null);
    const [isRestrictedMode, setIsRestrictedMode] = useState(['blocked', 'suspended', 'pending'].includes(initialUserStatus || ''));
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false); // Default collapsed on desktop per user request
    const [isStoreMoreOpen, setIsStoreMoreOpen] = useState(false);
    const [isDriverMoreOpen, setIsDriverMoreOpen] = useState(false);
    const [isMobileViewport, setIsMobileViewport] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showEmergency, setShowEmergency] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [maintenance, setMaintenance] = useState<MaintenanceSettings | null>(null);
    const [effectiveRole, setEffectiveRole] = useState<UserRole>(userRole);
    const [showScrollTop, setShowScrollTop] = useState(false);

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [navigationKey, setNavigationKey] = useState(0);

    // --- Constants & Config ---
    const generalTabs = new Set<ActiveTab>([
        'shop', 'profile', 'support', 'assistant', 'cloud', 'about', 'faq', 'solutions', 'benefits', 'install_app', 'status', 'privacy', 'streets_list', 'settings', 'upgrade_to_partner', 'internal_chat',
        'partner_store', 'partner_delivery', 'home', 'digital_menu', 'login', 'signup', 'order_tracking', 'my_orders', 'store_public_chat', 'street_request', 'not_found'
    ]);

    const defaultTabByRole: Record<UserRole, ActiveTab> = {
        admin: 'admin_dashboard',
        store_partner: 'wallet',
        delivery_partner: 'partner',
        delivery_person: 'daily_panel',
        collaborator: 'collaborator_area',
        user: 'home'
    };

    const storeTabTitles: Partial<Record<ActiveTab, string>> = {
        wallet: 'Início',
        history: 'Pedidos',
        new_request: 'Nova Entrega',
        internal_orders: 'Pedidos',
        internal_orders_new: 'Novo Pedido',
        store_catalog: 'Produtos',
        store_product_import: 'Importar Produtos',
        store_print_catalog: 'Catálogo Impresso',
        store_promotions: 'Promoções',
        store_status: 'Status da Loja',
        store_team: 'Equipe',
        store_reports: 'Relatórios',
        store_marketing: 'Marketing',
        store_integrations: 'Integrações',
        store_settings: 'Configurações',
        store_receiving_payment: 'Recebimento PIX',
        store_finance_panel: 'Financeiro',
        zepay_store: 'ZéPay',
        zebank: 'ZéBank',
        store_loans: 'Empréstimos',
        store_api_docs: 'Docs API',
        internal_chat: 'Chat com Clientes',
        store_drivers_chat: 'Chat com Entregadores',
        zepoint: 'ZéPoint'
    };

    const storeRootTabs = new Set<ActiveTab>(['wallet', 'history', 'store_catalog', 'zebank']);
    const storeOrdersTabs = new Set<ActiveTab>(['history', 'new_request', 'internal_orders', 'internal_orders_new', 'my_orders']);
    const storeProductsTabs = new Set<ActiveTab>(['store_catalog', 'store_product_import', 'store_print_catalog', 'store_promotions']);
    const storeFinanceTabs = new Set<ActiveTab>(['zebank', 'zepay_store', 'store_finance_panel', 'store_loans', 'store_receiving_payment']);
    const driverRootTabs = new Set<ActiveTab>(['daily_panel', 'partner']);
    const driverOrdersTabs = new Set<ActiveTab>(['associate_orders']);
    const driverRoutesTabs = new Set<ActiveTab>(['route_tools', 'route_list']);
    const driverRidesTabs = new Set<ActiveTab>(['partner']);
    const driverFinanceTabs = new Set<ActiveTab>(['zebank']);

    // Shop Cart State
    const [cart, setCart] = useState<any[]>([]);

    // WhatsApp Unread Count State
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const [pendingTicketsCount, setPendingTicketsCount] = useState(0);

    const { alert } = useDialog();

    const mounted = useRef(true);

    // Poll for WhatsApp Unread Count (from IndexedDB or Cache if available)
    // Using a custom event listener that WhatsappContainer or Service can emit
    useEffect(() => {
        const handleUnreadUpdate = (event: CustomEvent) => {
            if (event.detail && typeof event.detail.count === 'number') {
                setChatUnreadCount(event.detail.count);
            }
        };

        window.addEventListener('chat_unread_update', handleUnreadUpdate as EventListener);

        // Initial check via service if possible, or just wait for event
        // Importing service dynamically to avoid circular dependencies if any
        import('../services/chatOfflineService').then(({ chatOfflineService }) => {
            chatOfflineService.getUnreadCount().then(count => setChatUnreadCount(count));
        }).catch(() => { });

        return () => {
            window.removeEventListener('chat_unread_update', handleUnreadUpdate as EventListener);
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const media = window.matchMedia('(max-width: 767px)');
        const handleResize = () => setIsMobileViewport(media.matches);
        handleResize();
        if ('addEventListener' in media) {
            media.addEventListener('change', handleResize);
            return () => media.removeEventListener('change', handleResize);
        }
        // Fallback para navegadores antigos
        (media as any).addListener(handleResize);
        return () => (media as any).removeListener(handleResize);
    }, []);


    // --- TOUR LOGIC ---
    const { startTour, isTourRunning } = useTour();

    // Welcome Tour on first load
    useEffect(() => {
        if (!effectiveRole) return;

        const welcomeTourKey = `universal_welcome_${effectiveRole}`;
        const hasSeenWelcomeTour = localStorage.getItem(`tour-completed-${welcomeTourKey}`);

        if (!hasSeenWelcomeTour && tourSteps.universal?.welcome) {
            startTour(tourSteps.universal.welcome, welcomeTourKey);
        }
    }, [effectiveRole, startTour]);

    // Page-specific tour on tab change
    useEffect(() => {
        if (isTourRunning || !effectiveRole) return;

        const tourKey = `${effectiveRole}_${activeTab}`;
        const hasSeenTour = localStorage.getItem(`tour-completed-${tourKey}`);
        const stepsForPage = tourSteps[effectiveRole]?.[activeTab] ?? null;

        if (stepsForPage && !hasSeenTour) {
            startTour(stepsForPage, tourKey);
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
        if (!userId || userId === 'guest') {
            // Se for um visitante, carregamos apenas as configurações básicas do sistema (manutenção, notícias, etc.)
            const fetchPublicPulse = async () => {
                try {
                    const { maintenance: maintSettings } = await cloud.getSystemPulse();
                    if (mounted.current) {
                        setMaintenance(maintSettings as unknown as MaintenanceSettings);
                        logger.info('PUBLIC_PULSE_LOADED', { maintenance: !!maintSettings });
                    }
                } catch (error) {
                    console.error("Erro no Public Pulse:", error);
                }
            };
            fetchPublicPulse();
            return;
        }

        initNotificationService(userId, effectiveRole);

        const fetchPulse = async () => {
            try {
                // OTIMIZAÇÃO: Um único chamado unificado (Pulse) para todas as verificações periódicas
                const { notifications: notifs, maintenance: maintSettings, role: currentRole, pendingTicketsCount: count } = await cloud.getSystemPulse();

                if (mounted.current) {
                    setNotifications(notifs);
                    setMaintenance(maintSettings as unknown as MaintenanceSettings);
                    setPendingTicketsCount(count);

                    // Atualizar status do usuário
                    const { status: freshStatus } = await cloud.getInitialUserData();
                    if (freshStatus) {
                        setUserStatus(freshStatus);
                        setIsRestrictedMode(['blocked', 'suspended', 'pending'].includes(freshStatus));

                        // Fetch blocking reason if restricted
                        if (['blocked', 'suspended'].includes(freshStatus)) {
                            const details = await cloud.getBlockingDetails();
                            if (details) setBlockingReason(details.reason);
                        } else {
                            setBlockingReason(null);
                        }
                    }

                    // Verificação proativa de role (unifica o que estava no outro useEffect)
                    if (currentRole && currentRole !== effectiveRole) {
                        logger.warn('ROLE_MISMATCH_PULSE', { dbRole: currentRole, currentEffective: effectiveRole });
                        setEffectiveRole(currentRole);
                    }
                }
            } catch (error) {
                console.error("Erro no System Pulse:", error);
            }
        };

        fetchPulse();

        // Polling unificado a cada 30 segundos
        const pulseInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                fetchPulse();
            }
        }, 30000);

        // Realtime Subscription para Tickets Pendentes e Atualizações Críticas
        const sb = cloud.getClient();
        let ticketSubscription: any = null;

        if (sb && userId && effectiveRole === 'store_partner') {
            ticketSubscription = sb
                .channel('tickets-badge-counter')
                .on(
                    'postgres_changes',
                    {
                        event: '*', // INSERT, UPDATE, DELETE
                        schema: 'public',
                        table: 'orders_tickets',
                        filter: `store_id=eq.${userId}`
                    },
                    () => {
                        // Ao receber qualquer evento relevante, atualizamos o contador
                        // Isso garante que o badge reflita a realidade instantaneamente
                        cloud.getPendingTicketsCount().then(c => {
                            if (mounted.current) setPendingTicketsCount(c);
                        });
                    }
                )
                .subscribe();
        }

        // Listeners para recarregamento sob demanda
        const handleRefreshPulse = () => {
            void fetchPulse();
        };
        window.addEventListener('refreshNotifications', handleRefreshPulse);
        window.addEventListener('refreshUserRole', handleRefreshPulse);

        // Load Theme
        const storedTheme = storage.getTheme();
        setTheme(storedTheme);
        if (storedTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');

        return () => {
            stopNotificationService();
            clearInterval(pulseInterval);
            window.removeEventListener('refreshNotifications', handleRefreshPulse);
            window.removeEventListener('refreshUserRole', handleRefreshPulse);
            if (ticketSubscription) sb?.removeChannel(ticketSubscription);
        };
    }, [userId, effectiveRole]);

    // O polling de Role foi integrado ao Pulse acima para maior eficiência.
    // Este efeito agora cuida apenas da sincronização de prop vinda do AuthWrapper.
    useEffect(() => {
        if (!userId) return;
        setEffectiveRole(userRole);
        logger.info('ROLE_PROP_SYNC', { userRole });
    }, [userId, userRole]);

    useEffect(() => {
        setEffectiveRole(userRole);
        logger.info('ROLE_PROP_UPDATE', { userRole });
    }, [userRole]);

    // Lógica principal de Roteamento / Aba Inicial
    useEffect(() => {
        let path = window.location.pathname;
        const legacyPath = path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

        // Legacy deep links for Comanda now live under /loja/pedidos
        if (legacyPath === '/loja/comanda' && (window.location.search || window.location.hash)) {
            window.location.replace('/loja/pedidos');
            return;
        }

        const tabFromUrl = getTabFromUrl(path);

        if (!tabFromUrl && path !== '/' && path !== '/home' && !path.startsWith('/track/')) {
            setActiveTab('not_found');
            return;
        }

        // REDIRECIONAMENTO DE LINK CURTO DE PEDIDO (ID de 8 caracteres)
        const pathSegments = path.split('/').filter(Boolean);
        if (pathSegments.length === 1 && pathSegments[0].length === 8 && !tabFromUrl) {
            const shortId = pathSegments[0];
            const handleShortLinkRedirect = async () => {
                try {
                    const order = await cloud.getOrderByShortId(shortId);
                    if (order && order.is_location_delivery && order.shipping_address?.latitude && order.shipping_address?.longitude) {
                        const { latitude, longitude } = order.shipping_address;
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
                        window.location.href = mapsUrl;
                        return;
                    } else if (order) {
                        // Se for um pedido normal, talvez queira abrir no tracking? 
                        // O requisito pede apenas "Entregar por Localização" -> Maps.
                        // Mas podemos redirecionar para o tracking se for um pedido regular.
                        navigate('order_tracking'); // Ou manter no fluxo normal
                    }
                } catch (error) {
                    console.error('Erro no redirecionamento de link curto:', error);
                }
            };
            handleShortLinkRedirect();
            return;
        }
        const authTabs = ['login', 'signup', 'forgot_password'];
        const publicTabs: ActiveTab[] = ['partner_store', 'partner_delivery', 'home', 'digital_menu', 'order_tracking', 'store_public_chat', 'faq'];
        const isAuthenticated = userId && userId !== 'guest';

        // DEBUG ROUTING
        console.log('[App Routing Debug]', {
            path,
            tabFromUrl,
            isAuthenticated,
            userId,
            effectiveRole,
            isInPublicTabs: tabFromUrl && publicTabs.includes(tabFromUrl),
            isInAuthTabs: tabFromUrl && authTabs.includes(tabFromUrl)
        });

        // REDIRECIONAMENTO: Se o usuário estiver logado, não pode acessar as páginas de autenticação
        if (isAuthenticated && tabFromUrl && authTabs.includes(tabFromUrl)) {
            logger.warn('AUTH_PAGE_ACCESS_DENIED_LOGGED_IN', { tab: tabFromUrl, user: userId });
            const defaultTab = defaultTabByRole[effectiveRole] || 'home';
            navigate(defaultTab);
            return;
        }

        // Se não houver sessão ativa e estivermos na raiz ou /home, mantemos a tab home
        if ((!userId || userId === 'guest') && (path === '/' || path === '/home')) {
            setActiveTab('home');
            logger.info('ACTIVE_TAB_GUEST_HOME', { path: path }); // Fixed shorthand
            return;
        }

        // Se a aba da URL é uma página de autenticação, não fazemos nada aqui.
        // O AuthWrapper é responsável por redirecionar o usuário após o login.
        if (tabFromUrl && authTabs.includes(tabFromUrl)) {
            logger.info('ROUTING_SKIPPED_ON_AUTH_PAGE', { tab: tabFromUrl });
            return;
        }

        // Prioridade MÁXIMA para rotas públicas - Nunca sobrescrever com role default enquanto estivermos nela
        if (tabFromUrl && publicTabs.includes(tabFromUrl)) {
            setActiveTab(tabFromUrl);
            logger.info('ACTIVE_TAB_PUBLIC_STAY', { tab: tabFromUrl, path });
            return;
        }

        // Se a URL já aponta para uma aba válida (e não de autenticação), usamos ela.
        if (tabFromUrl && !authTabs.includes(tabFromUrl)) {
            setActiveTab(tabFromUrl);
            logger.info('ACTIVE_TAB_FROM_URL', { tab: tabFromUrl });
        } else {
            // Se a URL não tem uma aba válida (ex: rota raiz '/'), definimos a aba padrão baseada na role.
            if (userId && userId !== 'guest') {
                if (effectiveRole === 'admin') { setActiveTab('admin_dashboard'); }
                else if (effectiveRole === 'store_partner') { setActiveTab('wallet'); }
                else if (effectiveRole === 'delivery_partner') { setActiveTab('partner'); }
                else if (effectiveRole === 'delivery_person') { setActiveTab('daily_panel'); }
                else { setActiveTab('home'); }
                logger.info('ACTIVE_TAB_DEFAULT_ROLE', { role: effectiveRole });
            } else {
                setActiveTab('home');
                logger.info('ACTIVE_TAB_DEFAULT_GUEST', { role: effectiveRole });
            }
        }
    }, [effectiveRole, userId]);

    // Sincroniza URL quando a aba muda
    useEffect(() => {
        if (activeTab) {
            syncUrlWithTab(activeTab, effectiveRole);
        }
    }, [activeTab, effectiveRole]);

    // NEW: Global navigation event listener & History support
    useEffect(() => {
        const handleNavigate = (event: CustomEvent) => {
            if (event.detail && event.detail.tab) {
                // console.log('[App] Navigating to tab:', event.detail.tab);
                setActiveTab(event.detail.tab as ActiveTab);
                setIsMenuOpen(false);
            }
        };

        const handlePopState = (event: PopStateEvent) => {
            // Quando o usuário clica em Voltar/Avançar
            const tabFromUrl = getTabFromUrl(window.location.pathname);
            if (tabFromUrl) {
                setActiveTab(tabFromUrl);
            } else if (event.state && event.state.tab) {
                setActiveTab(event.state.tab);
            }
        };

        window.addEventListener('navigateToTab', handleNavigate as EventListener);
        window.addEventListener('popstate', handlePopState);

        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 400);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('navigateToTab', handleNavigate as EventListener);
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('scroll', handleScroll);
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
        logger.info('NAVIGATE_REQUESTED', { role: effectiveRole, tab });
        setNavigationKey(prev => prev + 1);
        setActiveTab(tab);
        setIsMenuOpen(false);
        setIsStoreMoreOpen(false);
    };

    const isAdmin = effectiveRole === 'admin';
    const isStore = effectiveRole === 'store_partner';
    const isPartner = effectiveRole === 'delivery_partner';
    const isNormalDriver = effectiveRole === 'delivery_person';
    const isDriver = isNormalDriver || isPartner;

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
            // Fallback for desktop or non-supported browsers
            await alert({ title: 'Compartilhar', message: 'Compartilhe este link: ' + shareData.url });
        }
    };



    const storeNavKey = (() => {
        if (!isStore) return null;
        if (storeOrdersTabs.has(activeTab)) return 'orders';
        if (storeProductsTabs.has(activeTab)) return 'products';
        if (storeFinanceTabs.has(activeTab)) return 'finance';
        if (storeRootTabs.has(activeTab)) return 'home';
        return 'more';
    })();

    const driverNavKey = (() => {
        if (!isDriver) return null;
        if (driverRidesTabs.has(activeTab)) return 'rides';
        if (driverOrdersTabs.has(activeTab)) return 'orders';
        if (driverRoutesTabs.has(activeTab)) return 'routes';
        if (driverFinanceTabs.has(activeTab)) return 'finance';
        if (driverRootTabs.has(activeTab)) return 'home';
        return 'more';
    })();

    const headerTitle = isStore ? (storeTabTitles[activeTab] || 'Painel da Loja') : '';

    const adminRootTabs = new Set<ActiveTab>(['admin_dashboard']);
    const userRootTabs = new Set<ActiveTab>(['home']);

    const shouldShowBack = () => {
        if (isStore) return !storeRootTabs.has(activeTab);
        if (isAdmin) return !adminRootTabs.has(activeTab);
        if (isDriver) return !driverRootTabs.has(activeTab);
        if (effectiveRole === 'user') return !userRootTabs.has(activeTab);
        return activeTab !== defaultTabByRole[effectiveRole];
    };

    const allowedTabs: Record<UserRole, Set<ActiveTab>> = {
        admin: new Set<ActiveTab>([...generalTabs,
            'admin_dashboard', 'admin_users', 'admin_lojas', 'admin_validation', 'admin_notifications', 'admin_shop', 'admin_support',
            'admin_api_keys', 'admin_ai_config', 'admin_routing', 'admin_fees', 'admin_pwa', 'admin_payouts', 'admin_cities', 'admin_infinitepay',
            'admin_levels', 'admin_ratings', 'admin_security', 'admin_blacklist', 'admin_referrals', 'admin_institutional',
            'admin_platform_news', 'admin_store_finance', 'admin_wallet_control', 'admin_claims', 'admin_maintenance', 'admin_slides', 'admin_tips', 'admin_loan_config',
            'admin_investments', 'admin_chat', 'admin_payment_gateways', 'admin_mercadopago', 'admin_pix_config', 'admin_location_map', 'admin_base_catalog', 'admin_store_categories', 'admin_global_coupons', 'admin_insurance', 'admin_street_requests', 'admin_mediation', 'zepoint',
            'store_drivers_chat'
        ]),
        store_partner: new Set<ActiveTab>([
            'store_status', 'wallet', 'new_request', 'history', 'store_team', 'store_reports', 'store_marketing', 'store_integrations', 'store_settings', 'store_receiving_payment', 'store_product_import', 'store_finance_panel', 'zepay_store', 'zebank', 'internal_orders', 'internal_orders_new', 'store_catalog', 'store_print_catalog', 'store_api_docs', 'store_loans', 'store_promotions', 'internal_chat', 'store_drivers_chat', 'zepoint'
        ]),

        delivery_partner: new Set<ActiveTab>([
            'daily_panel', 'associate_orders', 'partner', 'zebank', 'driver_marketing', 'local_history', 'associate_driver', 'route_tools', 'route_list', 'tasks', 'reports', 'heatmap', 'addresses', 'loans', 'insurance', 'score', 'zepoint'
        ]),
        delivery_person: new Set<ActiveTab>([
            'daily_panel', 'associate_orders', 'partner', 'zebank', 'driver_marketing', 'local_history', 'associate_driver', 'route_tools', 'route_list', 'tasks', 'reports', 'heatmap', 'addresses', 'insurance', 'score', 'zepoint'
        ]),
        collaborator: new Set(['collaborator_area', 'shop', 'internal_orders', 'internal_orders_new', 'store_catalog']), // Added shop access
        user: new Set(['shop', 'profile', 'support', 'addresses', 'home', 'notifications', 'privacy', 'settings', 'zebank']) // Basic user access
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
            let required: UserRole[] = [];

            // Tenta identificar os papéis permitidos para esta aba
            for (const [role, tabs] of Object.entries(allowedTabs)) {
                if (tabs.has(activeTab)) {
                    required.push(role as UserRole);
                }
            }

            return (
                <AccessDenied
                    currentUserRole={effectiveRole}
                    requiredRole={required.length > 0 ? required : undefined}
                    onBack={() => navigate(defaultTabByRole[effectiveRole])}
                    reason="Você não possui permissão de acesso para esta funcionalidade específica. Verifique seu nível de privilégios ou entre em contato com o administrador."
                />
            );
        }
        if (activeTab.startsWith('admin_')) {
            if (!isAdmin) {
                return (
                    <AccessDenied
                        currentUserRole={effectiveRole}
                        requiredRole="admin"
                        onBack={() => navigate(defaultTabByRole[effectiveRole])}
                        reason="Esta área é de uso exclusivo da equipe de administração do sistema Zé Entregas."
                    />
                );
            }
            const subTab = activeTab.replace('admin_', '') as any;
            return (
                <SectionErrorBoundary componentName="Admin Panel">
                    {activeTab === 'admin_ai_config' && <AdminAIConfig />}
                    {activeTab === 'admin_mercadopago' && <AdminMercadoPagoConfig />}
                    {activeTab === 'admin_insurance' && <AdminInsuranceConfig />}
                    {activeTab === 'admin_global_coupons' && <AdminPlatformCoupons />}
                    {activeTab !== 'admin_ai_config' && activeTab !== 'admin_mercadopago' && activeTab !== 'admin_insurance' && activeTab !== 'admin_global_coupons' && <AdminPanel activeSubTab={subTab} />}
                </SectionErrorBoundary>
            );
        }

        const content = (() => {
            const isAuthenticated = !!userId && userId !== 'guest';
            switch (activeTab) {
                case 'home': return <LandingPage
                    isAuthenticated={isAuthenticated}
                    onLoginClick={() => navigate('login')}
                    onSignupClick={(type) => navigate('signup' as any)}
                    onDashboardClick={() => navigate(effectiveRole === 'user' ? 'profile' : (defaultTabByRole[effectiveRole] || 'profile'))}
                />;
                case 'my_orders': return <UserOrders onBack={() => navigate('profile')} />;
                case 'digital_menu':
                    const pathParts = window.location.pathname.split('/');
                    const cSlug = pathParts[1] || '';
                    const sSlug = pathParts[2] || '';
                    return <DigitalMenu citySlug={cSlug} storeSlug={sSlug} />;
                case 'store_public_chat':
                    const chatPathParts = window.location.pathname.split('/');
                    // /city/store/chat
                    return <StoreChatPage citySlug={chatPathParts[1]} storeSlug={chatPathParts[2]} onBack={() => {
                        window.history.pushState({}, '', `/${chatPathParts[1]}/${chatPathParts[2]}`);
                        window.dispatchEvent(new CustomEvent('popstate'));
                    }} />;
                case 'profile': return <ProfileData onBack={() => navigate(isDriver ? 'daily_panel' : 'shop')} />;
                case 'status': return <StatusPage onBack={() => navigate(isDriver ? 'daily_panel' : 'shop')} />;
                case 'support': return <SupportPage layout="embedded" userRole={effectiveRole} onBack={() => navigate(isDriver ? 'daily_panel' : 'shop')} onNavigateToChat={() => navigate('assistant')} />;
                case 'shop': return <Shop cart={cart} setCart={setCart} userLoggedIn={true} />;
                case 'assistant':
                    return <ChatAssistant
                        dailySummary={{
                            profit: 0,
                            deliveryCount: 0,
                            km: 0,
                            expenses: 0,
                            goal: null,
                            location: null,
                            address: '',
                            name: 'N/A',
                            lat: 0,
                            lng: 0,
                            completed: false
                        }}
                        transactions={[]}
                        userId={userId}
                        userRole={effectiveRole}
                        onClose={() => navigate(isDriver ? 'daily_panel' : 'shop')}
                    />;
                case 'admin_chat': return <InternalChatContainer storeId={userId} attendantId={userId} />;
                case 'internal_chat': return <InternalChatContainer storeId={userId} attendantId={userId} filterType="customer" />;
                case 'store_drivers_chat': return <StoreDriversChat storeId={userId} attendantId={userId} />;
                case 'chat': return <InternalChatContainer storeId={userId} attendantId={userId} />;
                case 'order_tracking': return <OrderTracking />;

                // Store Specific
                case 'store_status': return <div className="max-w-4xl mx-auto"><StoreStatus /></div>;
                case 'wallet': return <StoreWalletModule onNavigate={navigate} />;
                case 'new_request': return <StoreRequest onNavigate={navigate} />;
                case 'history': return <OrderHistory userRole={effectiveRole as 'store_partner'} />;
                case 'store_team': return <StoreTeam />;
                case 'store_reports': return <StoreReports />;
                case 'store_marketing':
                    return (
                        <DesktopOnlyGate
                            isMobile={isMobileViewport}
                            title="Marketing no desktop"
                            message="O estúdio de marketing possui muitos elementos de edição e exportação."
                            hint="Para ter a melhor experiência, acesse pelo computador ou notebook."
                            actionLabel="Voltar ao início"
                            onAction={() => navigate(defaultTabByRole[effectiveRole])}
                        >
                            <StoreMarketing />
                        </DesktopOnlyGate>
                    );
                case 'store_integrations':
                    return (
                        <DesktopOnlyGate
                            isMobile={isMobileViewport}
                            title="Integrações no desktop"
                            message="Esta tela é voltada para configurações avançadas e uso interno."
                            hint="Para ter a melhor experiência, acesse pelo computador ou notebook."
                            actionLabel="Voltar ao início"
                            onAction={() => navigate(defaultTabByRole[effectiveRole])}
                        >
                            <StoreIntegrations onNavigate={navigate} />
                        </DesktopOnlyGate>
                    );
                case 'store_settings': return <StoreSettings />;
                case 'store_receiving_payment': return <StoreReceivingPayment />;
                case 'store_product_import':
                    return (
                        <DesktopOnlyGate
                            isMobile={isMobileViewport}
                            title="Importação no desktop"
                            message="A importação/exportação de planilhas exige tela maior para mapear colunas e revisar dados."
                            hint="Para ter a melhor experiência, acesse pelo computador ou notebook."
                            actionLabel="Voltar ao início"
                            onAction={() => navigate(defaultTabByRole[effectiveRole])}
                        >
                            <StoreProductImport />
                        </DesktopOnlyGate>
                    );
                case 'store_finance_panel': return <ZePayStore />;
                case 'zepay_store': return <ZePayStore />; // ZéPay Module
                case 'internal_orders': return <InternalOrders mode="full" />;
                case 'internal_orders_new': return <InternalOrders mode="new_order" />;
                case 'store_catalog': return <StoreCatalog />;
                case 'store_print_catalog':
                    return (
                        <DesktopOnlyGate
                            isMobile={isMobileViewport}
                            title="Catálogo impresso no desktop"
                            message="Este gerador trabalha com layouts grandes e exportação em PDF."
                            hint="Para ter a melhor experiência, acesse pelo computador ou notebook."
                            actionLabel="Voltar ao início"
                            onAction={() => navigate(defaultTabByRole[effectiveRole])}
                        >
                            <PrintCatalogGenerator />
                        </DesktopOnlyGate>
                    );
                case 'store_promotions': return <StorePromotions storeId={userId} />;
                case 'store_api_docs':
                    return (
                        <DesktopOnlyGate
                            isMobile={isMobileViewport}
                            title="Docs de API no desktop"
                            message="A documentação contém exemplos de código e muitos detalhes técnicos."
                            hint="Para ter a melhor experiência, acesse pelo computador ou notebook."
                            actionLabel="Voltar ao início"
                            onAction={() => navigate(defaultTabByRole[effectiveRole])}
                        >
                            <StoreApiDocs onNavigate={navigate} />
                        </DesktopOnlyGate>
                    );
                case 'store_loans': return <LoansModule />;
                case 'collaborator_area': return <CollaboratorWrapper userId={userId} onLogout={handleLogout} />;
                case 'zepoint':
                    if (isStore || isAdmin) {
                        return isMobileViewport
                            ? <MerchantPOSMobile onClose={() => navigate(defaultTabByRole[effectiveRole])} />
                            : <MerchantPOSDesktop onClose={() => navigate(defaultTabByRole[effectiveRole])} />;
                    }
                    return <MerchantPOSMobile onClose={() => navigate(defaultTabByRole[effectiveRole])} />;


                // Partner & Delivery Person Specific
                case 'partner': return <PartnerArea userRole={effectiveRole} onNavigate={navigate} />;
                case 'daily_panel': return <DailyPanel onNavigate={navigate} />;
                case 'driver_marketing': return <DriverMarketing userRole={effectiveRole} />;
                case 'route_tools': return <ToolsPage userRole={effectiveRole} />;
                case 'route_list': return <RouteList userRole={effectiveRole} />;
                case 'reports': return <Reports history={storage.getHistory()} todayStats={{ value: 0, count: 0, km: 0 }} />;
                case 'tasks': return <TaskList />;
                case 'zebank': return <Zebank userRole={effectiveRole} />;
                case 'loans': return <LoansModule />;
                case 'associate_orders': return <AssociateOrders />;
                case 'associate_driver': return <AssociateDriver onBack={() => navigate('daily_panel')} />;
                case 'heatmap': return <Heatmap userRole={effectiveRole} />;
                case 'local_history': return <LocalHistoryPage />;
                case 'addresses': return <AddressBook onClose={() => { }} />;
                case 'score':
                    if (isPartner) return <div className="max-w-4xl mx-auto"><ScorePanel /></div>;
                    return (
                        <div className="max-w-4xl mx-auto">
                            <ExclusiveLock
                                title="Meu Score"
                                description="O sistema de score é uma exclusividade para parceiros verificados. Acompanhe seu desempenho, receba mais pedidos e aumente seus ganhos."
                            />
                        </div>
                    );
                case 'partner_store': return <PartnerStore />;
                case 'partner_delivery': return <PartnerDelivery />;
                case 'insurance': return <InsurancePage />;

                case 'about': return <AboutApp />;
                case 'faq': return <FaqPage />;
                case 'solutions': return <SolutionsPage />;
                case 'benefits': return <BenefitsPage />;
                case 'install_app': return <InstallApp onBack={() => navigate(isDriver ? 'daily_panel' : 'shop')} />;
                case 'cloud': return <CloudSync />;
                case 'privacy': return <PrivacyPolicy onClose={() => navigate(isDriver ? 'daily_panel' : 'shop')} />; // Direct access to privacy policy
                case 'upgrade_to_partner': return <UpgradeToPartnerPage />;
                case 'settings': return <SettingsPage onBack={() => navigate(effectiveRole === 'user' ? 'profile' : (isDriver ? 'daily_panel' : 'shop'))} userRole={effectiveRole} />;
                case 'streets_list': return <StreetsList />;
                case 'not_found': return <NotFound />;

                default: return <div className="p-10 text-center text-gray-500">Etapa não implementada: {activeTab}</div>;
            }
        })();

        return (
            <React.Suspense fallback={
                <div className="flex items-center justify-center p-20">
                    <Loading variant="inline" size="md" />
                </div>
            }>
                <SectionErrorBoundary key={`${activeTab}-${navigationKey}`} componentName={activeTab}>
                    {content}
                </SectionErrorBoundary>
            </React.Suspense>
        );
    };

    // Helper to render sidebar button
    const MenuButton = ({ icon: Icon, label, tab, onClick, id, badge }: { icon: any, label: string, tab?: ActiveTab, onClick?: () => void, id?: string, badge?: number }) => (
        <button
            id={id}
            title={!isSidebarExpanded ? label : undefined}
            onClick={() => onClick ? onClick() : navigate(tab!)}
            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all duration-200 relative group ${activeTab === tab ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 font-bold shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'} ${!isSidebarExpanded ? 'md:justify-center md:px-2' : ''}`}
        >
            <div className="relative">
                <Icon className={`w-5 h-5 ${activeTab === tab ? 'text-brand-600' : 'text-gray-500'} flex-shrink-0 group-hover:scale-110 transition-transform`} />
                {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900 px-1 animate-pulse">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </div>
            <span className={`text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ${!isSidebarExpanded ? 'md:hidden md:w-0 md:opacity-0 w-auto opacity-100' : 'w-auto opacity-100'}`}>{label}</span>
        </button>
    );

    const MenuSection = ({ title }: { title: string }) => (
        <p className={`text-[10px] font-bold text-gray-400 uppercase ml-3 mt-4 mb-2 tracking-wider transition-opacity duration-300 ${!isSidebarExpanded ? 'md:hidden' : ''}`}>{title}</p>
    );

    const storeBottomNavItems: Array<{ key: string; label: string; tab?: ActiveTab; onClick?: () => void; icon: any }> = [
        { key: 'home', label: 'Início', tab: 'wallet' as ActiveTab, icon: Home },
        { key: 'orders', label: 'Pedidos', tab: 'history' as ActiveTab, icon: ClipboardList },
        { key: 'products', label: 'Produtos', tab: 'store_catalog' as ActiveTab, icon: ShoppingBag },
        { key: 'finance', label: 'Financeiro', tab: 'zebank' as ActiveTab, icon: Wallet },
        { key: 'more', label: 'Mais', onClick: () => setIsStoreMoreOpen(true), icon: LayoutGrid }
    ];

    const storeMoreSections: Array<{ title: string; items: Array<{ label: string; tab?: ActiveTab; onClick?: () => void; icon: any; badge?: number }> }> = [
        {
            title: 'Operações',
            items: [
                { label: 'Solicitar Entrega', tab: 'new_request', icon: Truck },
                { label: 'Comanda', tab: 'internal_orders_new', icon: FileText },
                { label: 'Pedidos', tab: 'internal_orders', icon: ClipboardList, badge: pendingTicketsCount },
                { label: 'Status da Loja', tab: 'store_status', icon: Power }
            ]
        },
        {
            title: 'Gestão',
            items: [
                { label: 'Equipe', tab: 'store_team', icon: Users },
                { label: 'Relatórios', tab: 'store_reports', icon: BarChart3 },
                { label: 'Configurações', tab: 'store_settings', icon: Settings }
            ]
        },
        {
            title: 'Marketing & Vendas',
            items: [
                { label: 'Marketing', tab: 'store_marketing', icon: Megaphone },
                { label: 'Promoções e Cupons', tab: 'store_promotions', icon: Banknote }
            ]
        },
        {
            title: 'Integrações',
            items: [
                { label: 'Integrações', tab: 'store_integrations', icon: Cloud },
                { label: 'Docs API', tab: 'store_api_docs', icon: Key },
                { label: 'Importar/Exportar', tab: 'store_product_import', icon: Download },
                { label: 'Catálogo Impresso', tab: 'store_print_catalog', icon: ImageIcon }
            ]
        },
        {
            title: 'Financeiro',
            items: [
                { label: 'ZéPay', tab: 'zepay_store', icon: CreditCard },
                { label: 'Painel Financeiro', tab: 'store_finance_panel', icon: Landmark },
                { label: 'Empréstimos', tab: 'store_loans', icon: DollarSign },
                { label: 'Recebimento PIX', tab: 'store_receiving_payment', icon: Smartphone }
            ]
        },
        {
            title: 'Comunicação',
            items: [
                { label: 'Chat com Clientes', tab: 'internal_chat', icon: MessageSquare },
                { label: 'Chat c/ Entregadores', tab: 'store_drivers_chat', icon: MessageCircle },
                { label: 'ZéPoint (POS)', tab: 'zepoint', icon: Smartphone }
            ]
        },
        {
            title: 'Conta & Suporte',
            items: [
                { label: 'Meu Perfil', tab: 'profile', icon: User },
                { label: 'Suporte', tab: 'support', icon: Headphones },
                { label: 'Assistente Zé', tab: 'assistant', icon: Bot },
                { label: 'Perguntas Frequentes', tab: 'faq', icon: HelpCircle },
                { label: 'Backup Nuvem', tab: 'cloud', icon: Cloud },
                { label: 'Ruas', tab: 'streets_list', icon: Map },
                { label: 'Loja de Peças', tab: 'shop', icon: ShoppingBag },
                { label: 'Verificar Status', tab: 'status', icon: UserCheck },
                { label: 'Configurações do App', tab: 'settings', icon: Settings },
                { label: 'Sobre o App', tab: 'about', icon: Info },
                { label: 'Instalar App', tab: 'install_app', icon: Smartphone },
                { label: 'Compartilhar App', onClick: handleShareApp, icon: Share2 },
                { label: 'Política de Privacidade', onClick: () => setShowPrivacy(true), icon: Lock }
            ]
        }
    ];

    const StoreMoreItem = ({ icon: Icon, label, tab, onClick, badge }: { icon: any; label: string; tab?: ActiveTab; onClick?: () => void; badge?: number }) => (
        <button
            onClick={() => {
                if (onClick) onClick();
                if (tab) navigate(tab);
                setIsStoreMoreOpen(false);
            }}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.99] transition-all"
        >
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</span>
            </div>
            {badge !== undefined && badge > 0 && (
                <span className="min-w-[20px] h-[20px] px-1 rounded-full text-[10px] font-bold bg-red-500 text-white flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                </span>
            )}
        </button>
    );

    const StoreBottomNav = () => (
        <nav className="fixed bottom-0 left-0 right-0 z-[45] md:hidden" aria-label="Navegação principal da loja">
            <div className={`bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0)+0.75rem)] ${isStoreMoreOpen ? 'shadow-[0_-6px_16px_rgba(0,0,0,0.12)]' : ''}`}>
                <div className="grid grid-cols-5 gap-1">
                    {storeBottomNavItems.map((item, index) => {
                        const isActive = storeNavKey === item.key;
                        const isCenterItem = index === Math.floor(storeBottomNavItems.length / 2);
                        return (
                            <button
                                key={item.key}
                                onClick={() => {
                                    if (item.onClick) {
                                        item.onClick();
                                    } else if (item.tab) {
                                        navigate(item.tab);
                                    }
                                }}
                                className={`flex flex-col items-center justify-center ${isCenterItem ? 'py-0.5' : 'gap-1 py-2'} rounded-xl transition-all ${isCenterItem ? 'text-brand-600' : isActive ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {isCenterItem ? (
                                    <>
                                        <div className="w-[66px] h-[66px] -mt-5 rounded-full bg-brand-600 shadow-lg flex items-center justify-center">
                                            <item.icon className="w-8 h-8 text-white" />
                                        </div>
                                        <span className="sr-only">{item.label}</span>
                                    </>
                                ) : (
                                    <>
                                        <item.icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-gray-500 dark:text-gray-400'}`} />
                                        <span className={`text-[10px] font-bold ${isActive ? 'text-brand-600' : 'text-gray-500 dark:text-gray-400'}`}>{item.label}</span>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );

    const StoreMoreSheet = () => (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Mais opções da loja">
            <div className="absolute inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom,0)+4.5rem)] bg-black/50 backdrop-blur-sm" onClick={() => setIsStoreMoreOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-10 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3" />
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-gray-900 dark:text-white">Mais opções</h3>
                        <button
                            onClick={() => setIsStoreMoreOpen(false)}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                            aria-label="Fechar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="p-4 space-y-5 pb-[calc(env(safe-area-inset-bottom,0)+4.5rem)]">
                    {storeMoreSections.map(section => {
                        const visibleItems = section.items.filter(item => !item.tab || canAccessTab(item.tab));
                        if (visibleItems.length === 0) return null;
                        return (
                            <div key={section.title} className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{section.title}</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {visibleItems.map(item => (
                                        <StoreMoreItem
                                            key={`${section.title}-${item.label}`}
                                            icon={item.icon}
                                            label={item.label}
                                            tab={item.tab}
                                            onClick={item.onClick}
                                            badge={item.badge}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const driverBottomNavItems: Array<{ key: string; label: string; tab?: ActiveTab; onClick?: () => void; icon: any }> = [
        { key: 'home', label: 'Início', tab: 'daily_panel' as ActiveTab, icon: Home },
        { key: 'rides', label: 'Corridas', tab: 'partner' as ActiveTab, icon: Truck },
        { key: 'routes', label: 'Rotas', tab: 'route_tools' as ActiveTab, icon: Route },
        { key: 'finance', label: 'ZéBank', tab: 'zebank' as ActiveTab, icon: Wallet },
        { key: 'more', label: 'Mais', onClick: () => setIsDriverMoreOpen(true), icon: LayoutGrid }
    ];

    const driverMoreSections: Array<{ title: string; items: Array<{ label: string; tab?: ActiveTab; onClick?: () => void; icon: any }> }> = [
        {
            title: 'Operação',
            items: [
                { label: 'Painel Diário', tab: 'daily_panel', icon: ClipboardList },
                { label: 'Corridas', tab: 'partner', icon: Truck },
                { label: 'Pedidos da Loja', tab: 'associate_orders', icon: Package }
            ]
        },
        {
            title: 'Rota & Produtividade',
            items: [
                { label: 'Ferramentas de Rota', tab: 'route_tools', icon: Zap },
                { label: 'Lista de Rotas', tab: 'route_list', icon: ListPlus },
                { label: 'Tarefas', tab: 'tasks', icon: FileCheck },
                { label: 'Relatórios', tab: 'reports', icon: BarChart3 },
                { label: 'Mapa de Calor', tab: 'heatmap', icon: Flame },
                { label: 'Meus Endereços', tab: 'addresses', icon: MapPin }
            ]
        },
        {
            title: 'Finanças & Benefícios',
            items: [
                { label: 'ZéBank', tab: 'zebank', icon: Landmark },
                { label: 'Empréstimos', tab: 'loans', icon: DollarSign },
                { label: 'Seguro Parceiro', tab: 'insurance', icon: Shield },
                { label: 'Meu Score', tab: 'score', icon: Star }
            ]
        },
        {
            title: 'Crescimento',
            items: [
                { label: 'Lojas Vinculadas', tab: 'associate_driver', icon: Store },
                { label: 'Divulgação', tab: 'driver_marketing', icon: Megaphone },
                { label: 'Histórico Local', tab: 'local_history', icon: History },
                { label: 'ZéPoint (POS)', tab: 'zepoint', icon: Smartphone }
            ]
        },
        {
            title: 'Conta & Suporte',
            items: [
                { label: 'Meu Perfil', tab: 'profile', icon: User },
                { label: 'Suporte', tab: 'support', icon: Headphones },
                { label: 'Assistente Zé', tab: 'assistant', icon: Bot },
                { label: 'Perguntas Frequentes', tab: 'faq', icon: HelpCircle },
                { label: 'Backup Nuvem', tab: 'cloud', icon: Cloud },
                { label: 'Ruas', tab: 'streets_list', icon: Map },
                { label: 'Loja de Peças', tab: 'shop', icon: ShoppingBag },
                { label: 'Verificar Status', tab: 'status', icon: UserCheck },
                { label: 'Configurações do App', tab: 'settings', icon: Settings },
                { label: 'Sobre o App', tab: 'about', icon: Info },
                { label: 'Instalar App', tab: 'install_app', icon: Smartphone },
                { label: 'Compartilhar App', onClick: handleShareApp, icon: Share2 },
                { label: 'Política de Privacidade', onClick: () => setShowPrivacy(true), icon: Lock }
            ]
        }
    ];

    const DriverMoreItem = ({ icon: Icon, label, tab, onClick }: { icon: any; label: string; tab?: ActiveTab; onClick?: () => void }) => (
        <button
            onClick={() => {
                if (onClick) onClick();
                if (tab) navigate(tab);
                setIsDriverMoreOpen(false);
            }}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-[0.99] transition-all"
        >
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</span>
            </div>
        </button>
    );

    const DriverBottomNav = () => (
        <nav className="fixed bottom-0 left-0 right-0 z-[45] md:hidden" aria-label="Navegação principal do entregador">
            <div className={`bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0)+0.75rem)] ${isDriverMoreOpen ? 'shadow-[0_-6px_16px_rgba(0,0,0,0.12)]' : ''}`}>
                <div className="grid grid-cols-5 gap-1">
                    {driverBottomNavItems.map((item, index) => {
                        const isActive = driverNavKey === item.key;
                        const isCenterItem = index === Math.floor(driverBottomNavItems.length / 2);
                        return (
                            <button
                                key={item.key}
                                onClick={() => {
                                    if (item.onClick) {
                                        item.onClick();
                                    } else if (item.tab) {
                                        navigate(item.tab);
                                    }
                                }}
                                className={`flex flex-col items-center justify-center ${isCenterItem ? 'py-0.5' : 'gap-1 py-2'} rounded-xl transition-all ${isCenterItem ? 'text-brand-600' : isActive ? 'text-brand-600 bg-brand-50 dark:bg-brand-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                {isCenterItem ? (
                                    <>
                                        <div className="w-[66px] h-[66px] -mt-5 rounded-full bg-brand-600 shadow-lg flex items-center justify-center">
                                            <item.icon className="w-8 h-8 text-white" />
                                        </div>
                                        <span className="sr-only">{item.label}</span>
                                    </>
                                ) : (
                                    <>
                                        <item.icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-gray-500 dark:text-gray-400'}`} />
                                        <span className={`text-[10px] font-bold ${isActive ? 'text-brand-600' : 'text-gray-500 dark:text-gray-400'}`}>{item.label}</span>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );

    const DriverMoreSheet = () => (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Mais opções do entregador">
            <div className="absolute inset-x-0 top-0 bottom-[calc(env(safe-area-inset-bottom,0)+4.5rem)] bg-black/50 backdrop-blur-sm" onClick={() => setIsDriverMoreOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-10 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3" />
                    <div className="flex items-center justify-between">
                        <h3 className="text-base font-black text-gray-900 dark:text-white">Mais opções</h3>
                        <button
                            onClick={() => setIsDriverMoreOpen(false)}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                            aria-label="Fechar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="p-4 space-y-5 pb-[calc(env(safe-area-inset-bottom,0)+4.5rem)]">
                    {driverMoreSections.map(section => {
                        const visibleItems = section.items.filter(item => !item.tab || canAccessTab(item.tab));
                        if (visibleItems.length === 0) return null;
                        return (
                            <div key={section.title} className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{section.title}</p>
                                <div className="grid grid-cols-1 gap-2">
                                    {visibleItems.map(item => (
                                        <DriverMoreItem
                                            key={`${section.title}-${item.label}`}
                                            icon={item.icon}
                                            label={item.label}
                                            tab={item.tab}
                                            onClick={item.onClick}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    // Verificação de rotas públicas internas que devem renderizar sem sidebar (Full Width)
    const publicTabs: ActiveTab[] = ['partner_store', 'partner_delivery', 'home', 'digital_menu', 'order_tracking', 'store_public_chat', 'faq'];
    const isPublicTab = publicTabs.includes(activeTab);
    const showStoreBottomNav = isStore && !isPublicTab;
    const showDriverBottomNav = isDriver && !isPublicTab;
    const showBottomNav = showStoreBottomNav || showDriverBottomNav;
    const hideMobileMenuButton = isMobileViewport && showBottomNav;

    if (isPublicTab) return (
        <div className={theme === 'dark' ? 'dark' : ''}>
            <ImpersonationBanner />
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 font-sans selection:bg-brand-500/20 selection:text-brand-700 transition-colors duration-300">
                {renderContent()}

                {showPrivacy && (
                    <Suspense fallback={<Loading variant="container" size="md" />}>
                        <PrivacyPolicy onClose={() => setShowPrivacy(false)} />
                    </Suspense>
                )}
            </div>
        </div>
    );

    return (
        <div className={theme === 'dark' ? 'dark' : ''}>
            <ImpersonationBanner />
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                {/* TOUR COMPONENT */}
                <SectionErrorBoundary componentName="Tour">
                    <TourComponent />
                </SectionErrorBoundary>

                {/* CONNECTION STATUS BAR RE MOVED per user request */}
                <SectionErrorBoundary componentName="PWA Manager">
                    <PwaManager />
                </SectionErrorBoundary>

                {/* Header */}
                <SectionErrorBoundary componentName="Header">
                    <header className="fixed top-0 left-0 right-0 h-16 bg-brand-600 shadow-sm z-40 flex items-center justify-between px-4 border-b border-brand-700/60 text-white">
                        <div className="flex items-center gap-3">
                            {isMobileViewport && !hideMobileMenuButton && (
                                <button
                                    id="header-menu-button"
                                    onClick={() => {
                                        // Mobile: Toggle Modal Drawer
                                        setIsMenuOpen(true);
                                    }}
                                    className="p-2 -ml-2 rounded-full hover:bg-brand-700 text-white"
                                >
                                    <Menu className="w-6 h-6" />
                                </button>
                            )}
                            {/* Back Button for Sub-Views if not root views */}
                            {shouldShowBack() && (
                                <button
                                    onClick={() => navigate(defaultTabByRole[effectiveRole] || 'home')}
                                    className="p-1 rounded-full text-white hover:bg-brand-700 md:hidden"
                                    aria-label="Voltar"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            )}

                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center gap-2"
                                aria-label="Ir para a home"
                            >
                                <Logo
                                    className="h-7 w-auto"
                                    variant="full-white"
                                    mode={isMobileViewport ? 'icon' : 'full'}
                                />
                            </button>

                            {isStore && (
                                <span className="md:hidden text-xs font-bold text-white/90 max-w-[160px] truncate">
                                    {headerTitle}
                                </span>
                            )}

                        </div>

                        <div className="flex items-center gap-5 md:gap-2">
                            <button
                                id="header-emergency-button"
                                onClick={() => setShowEmergency(true)}
                                className="p-2 text-white hover:bg-brand-700 rounded-full animate-pulse"
                            >
                                <ShieldAlert className="w-6 h-6" />
                            </button>
                            <div id="header-notifications-bell">
                                <NotificationsBell
                                    unreadCount={unreadCount}
                                    onClick={() => setShowNotifications(true)}
                                    className="text-white hover:bg-brand-700"
                                />
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="p-2 text-white hover:bg-brand-700 rounded-full transition-colors"
                                title="Recarregar dados"
                            >
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                    </header>
                </SectionErrorBoundary>

                {/* Sidebar Menu */}
                {/* Mobile Backdrop - Only visible on mobile when menu is open */}
                {isMenuOpen && (
                    <div
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-300"
                        onClick={() => setIsMenuOpen(false)}
                    ></div>
                )}

                {/* Sidebar Container */}
                <SectionErrorBoundary componentName="Menu Lateral">
                    <div
                        onMouseEnter={() => !isMobileViewport && setIsSidebarExpanded(true)}
                        onMouseLeave={() => !isMobileViewport && setIsSidebarExpanded(false)}
                        className={`
                    fixed z-50 
                    /* Mobile Styles: Inset-0 (Drawer), driven by isMenuOpen */
                    ${isMenuOpen ? 'inset-y-0 left-0 translate-x-0' : '-translate-x-full'} 
                    
                    /* Desktop Styles: Persistent Rail, driven by isSidebarExpanded */
                    md:translate-x-0 md:top-16 md:left-0 md:bottom-0 shadow-sm
                    ${isSidebarExpanded ? 'md:w-80' : 'md:w-20'}
                    
                    bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 flex flex-col
                `}>
                        {/* Mobile Header (Close Only) */}
                        <div className="md:hidden flex items-center justify-end p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                            <button onClick={() => setIsMenuOpen(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                                <X className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">

                            {/* --- ADMIN MENU --- */}
                            {isAdmin && (
                                <>
                                    <MenuSection title="Visão Geral" />
                                    <MenuButton icon={LayoutDashboard} label="Dashboard BI" tab="admin_dashboard" id="admin-dashboard-link" />
                                    <MenuButton icon={History} label="Meus Pedidos" tab="my_orders" />
                                    <MenuButton icon={ShoppingBag} label="Acessar Loja" tab="shop" />

                                    <MenuSection title="Gestão de Usuários" />
                                    <MenuButton icon={Users} label="Todos os Usuários" tab="admin_users" />
                                    <MenuButton icon={Store} label="Gerenciar Lojas" tab="admin_lojas" />
                                    <MenuButton icon={MapPin} label="Solicitações de Ruas" tab="admin_street_requests" />
                                    <MenuButton icon={FileCheck} label="Validação de Parceiros" tab="admin_validation" />
                                    <MenuButton icon={Wallet} label="Controle de Saldos" tab="admin_wallet_control" />
                                    <MenuButton icon={ShieldAlert} label="Segurança & Fraude" tab="admin_security" />
                                    <MenuButton icon={UserX} label="Lista Negra" tab="admin_blacklist" />

                                    <MenuSection title="Operacional" />
                                    <MenuButton icon={Store} label="Gestão da Loja" tab="admin_shop" />
                                    <MenuButton icon={Package} label="Catálogo Base" tab="admin_base_catalog" />
                                    <MenuButton icon={ImageIcon} label="Galeria de Imagens" tab="admin_image_gallery" />
                                    <MenuButton icon={LayoutGrid} label="Categorias de Loja" tab="admin_store_categories" />

                                    <MenuButton icon={MapPin} label="Cidades" tab="admin_cities" />
                                    <MenuButton icon={Star} label="Níveis de Parceiro" tab="admin_levels" />
                                    <MenuButton icon={MessageCircle} label="Suporte & Tickets" tab="admin_claims" />
                                    <MenuButton icon={MessageSquare} label="Chat Interno" tab="admin_chat" />

                                    <MenuSection title="Conteúdo & App" />
                                    <MenuButton icon={Lightbulb} label="Dicas do Dia" tab="admin_tips" />
                                    {/* <MenuButton icon={Newspaper} label="Notícias" tab="admin_platform_news" /> */}
                                    <MenuButton icon={Star} label="Avaliações" tab="admin_ratings" />
                                    <MenuButton icon={Layout} label="Banners/Slides" tab="admin_slides" />
                                    <MenuButton icon={Construction} label="Manutenção" tab="admin_maintenance" />

                                    <MenuSection title="Financeiro" />
                                    <MenuButton icon={DollarSign} label="Taxas Globais" tab="admin_fees" />
                                    <MenuButton icon={Banknote} label="Cupons Globais (Plataforma)" tab="admin_global_coupons" />
                                    <MenuButton icon={Wallet} label="Repasses" tab="admin_payouts" />
                                    <MenuButton icon={CreditCard} label="Config. Empréstimos" tab="admin_loan_config" />
                                    <MenuButton icon={DollarSign} label="Financeiro das Lojas" tab="admin_store_finance" />
                                    <MenuButton icon={CreditCard} label="Gateways de Pagamento" tab="admin_payment_gateways" />
                                    <MenuButton icon={Link2} label="Mercado Pago" tab="admin_mercadopago" />
                                    <MenuButton icon={Smartphone} label="Configurar PIX" tab="admin_pix_config" />
                                    <MenuButton icon={Smartphone} label="ZéPoint (POS)" tab="zepoint" />
                                    <MenuButton icon={Link2} label="Configurar InfinitePay" tab="admin_infinitepay" />

                                    <MenuSection title="Marketing & Conteúdo" />
                                    <MenuButton icon={Megaphone} label="Indicações" tab="admin_referrals" />
                                    <MenuButton icon={Bell} label="Notificações Globais" tab="admin_notifications" />
                                    <MenuButton icon={Shield} label="Config. Seguros" tab="admin_insurance" />
                                    <MenuButton icon={FileText} label="Institucional" tab="admin_institutional" />
                                    <MenuButton icon={Newspaper} label="Novidades da Plataforma" tab="admin_platform_news" />

                                    <MenuSection title="Configurações do Sistema" />
                                    <MenuButton icon={Bot} label="Inteligência Artificial" tab="admin_ai_config" />
                                    <MenuButton icon={Cloud} label="APIs & Integrações" tab="admin_api_keys" />
                                    <MenuButton icon={Smartphone} label="App PWA" tab="admin_pwa" />
                                    <MenuButton icon={Headphones} label="Suporte & Tickets" tab="admin_support" />
                                    <MenuButton icon={Route} label="Config. Roteamento" tab="admin_routing" />
                                    <MenuButton icon={TrendingUp} label="Gestão de Investimentos" tab="admin_investments" />
                                </>
                            )}

                            {/* --- STORE PARTNER MENU --- */}
                            {isStore && (
                                <>
                                    <MenuSection title="Minha Loja" />
                                    <MenuButton icon={Power} label="Status da Loja" tab="store_status" />
                                    <MenuButton icon={LayoutDashboard} label="Painel" tab="wallet" id="store-wallet-link" />
                                    <MenuButton icon={Truck} label="Solicitar Entrega" tab="new_request" id="store-new-request-link" />
                                    <MenuButton icon={History} label="Histórico de Pedidos" tab="history" />
                                    <MenuButton icon={Landmark} label="ZéBank" tab="zebank" />
                                    <MenuButton icon={Smartphone} label="ZéPoint (POS)" tab="zepoint" />
                                    <MenuButton icon={MessageSquare} label="Chat com Clientes" tab="internal_chat" />
                                    <MenuButton icon={MessageCircle} label="Chat c/ Entregadores" tab="store_drivers_chat" />
                                    <MenuButton icon={Users} label="Colaboradores" tab="store_team" />
                                    <MenuButton icon={History} label="Meus Pedidos" tab="my_orders" />
                                    <MenuButton icon={DollarSign} label="Empréstimos" tab="store_loans" />

                                    <MenuSection title="Gestão" />
                                    <MenuButton icon={BarChart3} label="Relatórios" tab="store_reports" />
                                    <MenuButton icon={Megaphone} label="Marketing" tab="store_marketing" />
                                    <MenuButton icon={Cloud} label="Integrações" tab="store_integrations" />
                                    <MenuButton icon={Settings} label="Configurações" tab="store_settings" />
                                    <MenuButton icon={Smartphone} label="Recebimento PIX" tab="store_receiving_payment" />
                                    <MenuButton icon={Download} label="Importar/Exportar Produtos" tab="store_product_import" />
                                    <MenuButton icon={ShoppingBag} label="Catálogo" tab="store_catalog" />
                                    <MenuButton icon={Banknote} label="Promoções e Cupons" tab="store_promotions" />
                                    <MenuButton icon={FileText} label="Comanda" tab="internal_orders_new" />
                                    <MenuButton icon={ClipboardList} label="Pedidos" tab="internal_orders" badge={pendingTicketsCount} />
                                    <MenuButton icon={CreditCard} label="Financeiro ZéPay" tab="zepay_store" />
                                    <MenuButton icon={Key} label="Docs API / Integradores" tab="store_api_docs" />
                                </>
                            )}

                            {/* --- USER MENU --- */}
                            {effectiveRole === 'user' && (
                                <>
                                    <MenuSection title="Minha Conta" />
                                    <MenuButton icon={Home} label="Início" tab="home" />
                                    <MenuButton icon={History} label="Meus Pedidos" tab="my_orders" />
                                    <MenuButton icon={Landmark} label="ZéBank" tab="zebank" />
                                </>
                            )}

                            {/* --- SHARED DRIVER MENU (PARTNER + NORMAL) --- */}
                            {(isPartner || isNormalDriver) && (
                                <>
                                    <MenuSection title="Plataforma Zé" />
                                    <MenuButton icon={ClipboardList} label="Painel Diário" tab="daily_panel" id="driver-daily-panel-link" />
                                    <MenuButton icon={Package} label="Pedidos da Loja" tab="associate_orders" />
                                    <MenuButton icon={Truck} label="Painel de Corridas" tab="partner" />
                                    <MenuButton icon={Landmark} label="ZéBank" tab="zebank" />
                                    <MenuButton icon={Star} label="Meu Score" tab="score" />
                                    <MenuButton icon={History} label="Histórico Local" tab="local_history" />
                                    <MenuButton icon={DollarSign} label="Empréstimos" tab="loans" />
                                    <MenuButton icon={Megaphone} label="Divulgação" tab="driver_marketing" />
                                    <MenuButton icon={History} label="Meus Pedidos" tab="my_orders" />
                                    <MenuButton icon={Shield} label="Seguro Parceiro" tab="insurance" />

                                    <MenuSection title="Crescimento" />
                                    <MenuButton icon={Store} label="Lojas Vinculadas" tab="associate_driver" />

                                    <MenuSection title="Ferramentas" />
                                    <MenuButton icon={ListPlus} label="Lista de Rotas" tab="route_list" />
                                    <MenuButton icon={FileCheck} label="Tarefas" tab="tasks" />
                                    <MenuButton icon={BarChart3} label="Relatórios Pessoais" tab="reports" />
                                    <MenuButton icon={Flame} label="Mapa de Calor" tab="heatmap" />
                                    <MenuButton icon={MapPin} label="Meus Endereços" tab="addresses" />
                                    <MenuButton icon={Zap} label="Ferramentas de Rota" tab="route_tools" />
                                    <MenuButton icon={Smartphone} label="ZéPoint (POS)" tab="zepoint" />
                                </>
                            )}


                            {/* --- GENERAL MENU (ALL USERS) --- */}
                            <MenuSection title="Geral" />
                            {/* Exibe Ruas para todos EXCETO colaborador e usuário comum */}
                            {effectiveRole !== 'collaborator' && effectiveRole !== 'user' && (
                                <MenuButton icon={Map} label="Ruas" tab="streets_list" />
                            )}

                            {/* Loja de Peças apenas para Entregadores */}
                            {(isPartner || isNormalDriver) && (
                                <MenuButton icon={ShoppingBag} label="Loja de Peças" tab="shop" />
                            )}

                            <MenuButton icon={User} label="Meu Perfil" tab="profile" />
                            <MenuButton icon={Headphones} label="Suporte" tab="support" />
                            <MenuButton icon={HelpCircle} label="Perguntas Frequentes (FAQ)" tab="faq" />
                            <MenuButton icon={Bell} label="Notificações" tab="notifications" />
                            <MenuButton icon={Bot} label="Assistente Zé" tab="assistant" />

                            {/* Backup Nuvem apenas para quem opera offline (Entregadores/Lojistas) */}
                            {effectiveRole !== 'user' && (
                                <MenuButton icon={Cloud} label="Backup Nuvem" tab="cloud" />
                            )}

                            <MenuButton icon={Info} label="Sobre o App" tab="about" />
                            {effectiveRole === 'user' && ( // Apenas user vê instalar app aqui, para outros já tem fluxo próprio ou não precisa
                                <MenuButton icon={Smartphone} label="Instalar App" tab="install_app" />
                            )}

                            {/* --- FOOTER ACTIONS --- */}
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                                {/* Idioma removido: app opera exclusivamente em PT-BR */}
                                <MenuButton icon={Share2} label="Compartilhar App" onClick={handleShareApp} />
                                <MenuButton icon={Lock} label="Política de Privacidade" onClick={() => setShowPrivacy(true)} /> {/* DIRECT ACCESS */}

                                {effectiveRole !== 'user' && (
                                    <MenuButton icon={UserCheck} label="Verificar Status" onClick={() => navigate('status')} />
                                )}
                            </div>
                        </div>

                        <div className={`
                    border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50
                    p-4
                    ${isSidebarExpanded ? 'md:space-y-3' : 'md:space-y-2 md:p-2'}
                `}>
                            <div className={`flex items-center justify-between md:justify-center w-full ${isSidebarExpanded ? 'md:justify-between md:px-2 md:flex-row' : 'md:flex-col md:gap-2'}`}>
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
                                    {isLoggingOut ? <Loading variant="inline" size="sm" /> : <LogOut className="w-5 h-5" />}
                                </button>
                            </div>
                            {isSidebarExpanded && (
                                <div className="text-center text-[10px] text-gray-400">
                                    Versão 3.2.0 • Build 2025
                                </div>
                            )}
                        </div>
                    </div>

                </SectionErrorBoundary>

                {/* Main Content Area */}
                <main className={`pt-20 transition-all duration-300 ${activeTab === 'zepoint' ? '' : 'px-4 mx-auto'} ${isSidebarExpanded ? 'md:ml-80' : 'md:ml-20'} ${showBottomNav ? 'pb-24 md:pb-6' : 'pb-6'}`}>
                    {activeTab !== 'support' && <UserStatusBanner status={userStatus} reason={blockingReason} />}
                    <Suspense fallback={<Loading variant="container" size="md" />}>
                        {renderContent()}
                    </Suspense>
                </main>

                {showStoreBottomNav && <StoreBottomNav />}
                {showDriverBottomNav && <DriverBottomNav />}
                {isStore && isStoreMoreOpen && <StoreMoreSheet />}
                {isDriver && isDriverMoreOpen && <DriverMoreSheet />}

                {/* Modals */}
                <EmergencyModal isOpen={showEmergency} onClose={() => setShowEmergency(false)} />
                {showNotifications && (
                    <SectionErrorBoundary componentName="Notificações">
                        <NotificationsPanel
                            notifications={notifications}
                            onMarkAsRead={markNotificationRead}
                            onClose={() => setShowNotifications(false)}
                        />
                    </SectionErrorBoundary>
                )}
                {showSettings && (
                    <SectionErrorBoundary componentName="Configurações de Notificação">
                        <NotificationSettings onClose={() => setShowSettings(false)} />
                    </SectionErrorBoundary>
                )}
                {showPrivacy && (
                    <Suspense fallback={<Loading variant="container" size="md" />}>
                        <PrivacyPolicy onClose={() => setShowPrivacy(false)} />
                    </Suspense>
                )}

                {/* Botão Voltar ao Topo */}
                {showScrollTop && (
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className={`fixed right-6 z-50 p-4 bg-brand-600 text-white rounded-full shadow-2xl hover:bg-brand-700 transition-all animate-in fade-in slide-in-from-bottom-4 active:scale-90 ${showBottomNav && isMobileViewport ? 'bottom-24' : 'bottom-6'} md:bottom-6`}
                        aria-label="Voltar ao Topo"
                    >
                        <ChevronUp className="w-6 h-6" />
                    </button>
                )}
            </div>
        </div>
    );
};
