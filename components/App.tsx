
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, AppNotification, DailySummary, DailyTransaction } from '../types';
import * as cloud from '../services/cloud';
import * as storage from '../services/storage';
import { initNotificationService, stopNotificationService } from '../services/notificationService';

// Icons
import { Menu, X, LogOut, Sun, Moon, Bell, ShieldAlert, User, Cloud, Info, ShoppingBag, LayoutDashboard, Users, FileCheck, Wallet, Store, Headphones, DollarSign, Settings, MapPin, Share2, Globe, FileText, Smartphone, Bot, Lock, Megaphone, Truck, BarChart3, Map, History, Flame, Star, MessageCircle, AlertTriangle, Newspaper, UserCheck, ArrowLeft, ClipboardList, ListPlus } from 'lucide-react';

// Components
import { Logo } from './Logo';
import { Button } from './Button';
import { NotificationsPanel } from './NotificationsPanel';
import { NotificationsBell } from './NotificationsBell';
import { EmergencyModal } from './EmergencyButton';
import { NotificationSettings } from './NotificationSettings';
import { ChatAssistant } from './ChatAssistant';
import { PrivacyPolicy } from './PrivacyPolicy';

// Pages / Modules
import { AdminPanel } from './AdminPanel';
import { PartnerArea } from './PartnerArea';
import { StoreWalletModule } from './StoreWallet';
import { StoreRequest } from './StoreRequest';
import { OrderHistory } from './OrderHistory';
import { StoreTeam } from './StoreTeam';
import { StoreReports } from './StoreReports';
import { StoreMarketing } from './StoreMarketing';
import { StoreIntegrations } from './StoreIntegrations';
import { StoreSettings } from './StoreSettings';
import { FinancialPanel } from './FinancialPanel';
import { DriverMarketing } from './DriverMarketing';
import { Reports } from './Reports';
import { AddressBook } from './AddressBook';
import { TaskList } from './TaskList';
import { Zebank } from './Zebank';
import { ProfileData } from './ProfileData';
import { SupportPage } from './SupportPage';
import { Shop } from './Shop';
import { AboutApp } from './AboutApp';
import { CloudSync } from './CloudSync';
import { AssociateDriver } from './AssociateDriver';
import { DailyPanel } from './DailyPanel';
import { RouteList } from './RouteList';
import { StatusPage } from './StatusPage';

// Expanded type to include specific admin routes
export type ActiveTab = 
    | 'admin_dashboard' | 'admin_users' | 'admin_validation' | 'admin_notifications' | 'admin_shop' | 'admin_support' 
    | 'admin_ai_config' | 'admin_fees' | 'admin_pwa' | 'admin_payouts' | 'admin_cities' | 'admin_asaas_webhook' 
    | 'admin_levels' | 'admin_ratings' | 'admin_security' | 'admin_blacklist' | 'admin_referrals' | 'admin_institutional' 
    | 'admin_platform_news' | 'admin_store_finance' | 'admin_wallet_control' | 'admin_claims'
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
    | 'store_finance_panel' 
    | 'partner' 
    | 'daily_panel'
    | 'driver_marketing' 
    | 'route_list'
    | 'deliveries' 
    | 'local_history' 
    | 'reports' 
    | 'addresses' 
    | 'tasks' 
    | 'zebank'
    | 'about'
    | 'notifications'
    | 'cloud'
    | 'settings'
    | 'associate_driver'
    | 'status';

interface AppProps {
    userId: string;
    userRole: UserRole;
}

export const App: React.FC<AppProps> = ({ userId, userRole }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('profile');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [theme, setTheme] = useState<'light'|'dark'>('light');
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showEmergency, setShowEmergency] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    
    // Shop Cart State
    const [cart, setCart] = useState<any[]>([]);

    useEffect(() => {
        // Set initial tab based on role
        if (userRole === 'admin') setActiveTab('admin_dashboard');
        else if (userRole === 'store_partner') setActiveTab('wallet');
        else if (userRole === 'delivery_partner') setActiveTab('partner'); 
        else if (userRole === 'delivery_person') setActiveTab('daily_panel'); // Default for normal user is Daily Panel
        else setActiveTab('shop'); 

        // Init Notifications
        initNotificationService(userId, userRole);
        const interval = setInterval(async () => {
            const notifs = await cloud.getNotifications();
            setNotifications(notifs);
        }, 30000);

        // Load Theme
        const storedTheme = storage.getTheme();
        setTheme(storedTheme);
        if (storedTheme === 'dark') document.documentElement.classList.add('dark');

        return () => {
            stopNotificationService();
            clearInterval(interval);
        };
    }, [userId, userRole]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        storage.setTheme(newTheme);
        if (newTheme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    };

    const handleLogout = async () => {
        await cloud.signOut();
        window.location.reload();
    };

    const navigate = (tab: ActiveTab) => {
        setActiveTab(tab);
        setIsMenuOpen(false);
    };

    const markNotificationRead = async (id: string) => {
        await cloud.markNotificationAsRead(id);
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
            alert('Compartilhe este link: ' + shareData.url);
        }
    };

    // Helper boolean checks for roles
    const isAdmin = userRole === 'admin';
    const isStore = userRole === 'store_partner';
    const isPartner = userRole === 'delivery_partner';
    const isNormalDriver = userRole === 'delivery_person';
    const isDriver = isNormalDriver || isPartner; // Includes both partner and normal driver

    // --- RENDER CONTENT BASED ON TAB ---
    const renderContent = () => {
        // Admin Routing
        if (activeTab.startsWith('admin_')) {
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
                    dailySummary={{ profit: 0, deliveryCount: 0, km: 0, goal: null, location: null }} 
                    transactions={[]} 
                    userId={userId} 
                    userRole={userRole} 
                    onClose={() => navigate(isDriver ? 'daily_panel' : 'shop')} 
                />;
            
            // Store Specific
            case 'wallet': return <StoreWalletModule onNavigate={navigate} />;
            case 'new_request': return <StoreRequest onNavigate={navigate} />;
            case 'history': return <OrderHistory userRole={userRole as 'store_partner' | 'delivery_partner'} />;
            case 'store_team': return <StoreTeam />;
            case 'store_reports': return <StoreReports />;
            case 'store_marketing': return <StoreMarketing />;
            case 'store_integrations': return <StoreIntegrations />;
            case 'store_settings': return <StoreSettings />;
            case 'store_finance_panel': return <FinancialPanel userRole="store_partner" />;

            // Partner & Delivery Person Specific
            case 'partner': return <PartnerArea userRole={userRole} onNavigate={navigate} />;
            case 'daily_panel': return <DailyPanel onNavigate={navigate} />;
            case 'driver_marketing': return <DriverMarketing userRole={userRole} />;
            case 'route_list': return <RouteList userRole={userRole} onNavigate={() => alert('Funcionalidade de mapa removida.')} />;
            case 'reports': return <Reports history={storage.getHistory()} todayStats={{ value: 0, count: 0, km: 0 }} />;
            case 'addresses': return <AddressBook onClose={() => {}} />;
            case 'tasks': return <TaskList />;
            case 'zebank': return <Zebank userRole={userRole} />;
            case 'associate_driver': return <AssociateDriver onBack={() => navigate('daily_panel')} />;
            
            case 'about': return <AboutApp />;
            case 'cloud': return <CloudSync />;
            
            default: return <div className="p-8 text-center text-gray-500">Funcionalidade em desenvolvimento.</div>;
        }
    };

    // Helper to render sidebar button
    const MenuButton = ({ icon: Icon, label, tab, onClick }: { icon: any, label: string, tab?: ActiveTab, onClick?: () => void }) => (
        <button 
            onClick={() => onClick ? onClick() : navigate(tab!)} 
            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${activeTab === tab ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
        >
            <Icon className={`w-5 h-5 ${activeTab === tab ? 'text-brand-600' : 'text-gray-500'}`} />
            <span className="text-sm">{label}</span>
        </button>
    );

    const MenuSection = ({ title }: { title: string }) => (
        <p className="text-[10px] font-bold text-gray-400 uppercase ml-3 mt-4 mb-2 tracking-wider">{title}</p>
    );

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            {/* Header */}
            {
                <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 shadow-sm z-40 flex items-center justify-between px-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200">
                            <Menu className="w-6 h-6" />
                        </button>
                        {/* Back Button for Sub-Views if not root views */}
                        {activeTab !== 'daily_panel' && activeTab !== 'shop' && activeTab !== 'wallet' && activeTab !== 'partner' && activeTab !== 'admin_dashboard' && (
                            <button onClick={() => navigate(isDriver ? 'daily_panel' : 'shop')} className="p-1 rounded-full text-gray-400 hover:text-gray-600 md:hidden">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <Logo className="h-8 w-auto text-brand-600" mode="icon" />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowEmergency(true)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full animate-pulse">
                            <ShieldAlert className="w-6 h-6" />
                        </button>
                        <NotificationsBell unreadCount={unreadCount} onClick={() => setShowNotifications(true)} />
                    </div>
                </header>
            }

            {/* Sidebar Menu */}
            {isMenuOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="relative bg-white dark:bg-gray-900 w-80 h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <Logo className="h-8 w-auto text-brand-600" />
                            <button onClick={() => setIsMenuOpen(false)}><X className="w-6 h-6 text-gray-400 hover:text-gray-600"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            
                            {/* --- ADMIN MENU --- */}
                            {isAdmin && (
                                <>
                                    <MenuSection title="Visão Geral" />
                                    <MenuButton icon={LayoutDashboard} label="Dashboard BI" tab="admin_dashboard" />
                                    <MenuButton icon={ShoppingBag} label="Acessar Loja" tab="shop" />

                                    <MenuSection title="Gestão de Usuários" />
                                    <MenuButton icon={Users} label="Todos os Usuários" tab="admin_users" />
                                    <MenuButton icon={FileCheck} label="Validação de Parceiros" tab="admin_validation" />
                                    <MenuButton icon={Wallet} label="Controle de Saldos" tab="admin_wallet_control" />
                                    <MenuButton icon={ShieldAlert} label="Segurança & Fraude" tab="admin_security" />
                                    <MenuButton icon={User} label="Lista Negra" tab="admin_blacklist" />

                                    <MenuSection title="Operacional" />
                                    <MenuButton icon={Store} label="Gestão da Loja" tab="admin_shop" />
                                    <MenuButton icon={MapPin} label="Cidades" tab="admin_cities" />
                                    <MenuButton icon={Star} label="Níveis de Parceiro" tab="admin_levels" />
                                    <MenuButton icon={MessageCircle} label="Suporte & Tickets" tab="admin_support" />
                                    <MenuButton icon={AlertTriangle} label="Reclamações" tab="admin_claims" />
                                    <MenuButton icon={Star} label="Avaliações" tab="admin_ratings" />

                                    <MenuSection title="Financeiro" />
                                    <MenuButton icon={DollarSign} label="Taxas Globais" tab="admin_fees" />
                                    <MenuButton icon={Wallet} label="Repasses" tab="admin_payouts" />
                                    <MenuButton icon={Cloud} label="Webhooks (Asaas)" tab="admin_asaas_webhook" />

                                    <MenuSection title="Marketing & Conteúdo" />
                                    <MenuButton icon={Megaphone} label="Indicações" tab="admin_referrals" />
                                    <MenuButton icon={Bell} label="Notificações" tab="admin_notifications" />
                                    <MenuButton icon={FileText} label="Institucional" tab="admin_institutional" />
                                    <MenuButton icon={Newspaper} label="Novidades" tab="admin_platform_news" />

                                    <MenuSection title="Configurações do Sistema" />
                                    <MenuButton icon={Bot} label="Inteligência Artificial" tab="admin_ai_config" />
                                    <MenuButton icon={Smartphone} label="App PWA" tab="admin_pwa" />
                                </>
                            )}

                            {/* --- STORE PARTNER MENU --- */}
                            {isStore && (
                                <>
                                    <MenuSection title="Minha Loja" />
                                    <MenuButton icon={LayoutDashboard} label="Painel" tab="wallet" />
                                    <MenuButton icon={Truck} label="Solicitar Entrega" tab="new_request" />
                                    <MenuButton icon={History} label="Histórico de Pedidos" tab="history" />
                                    <MenuButton icon={Users} label="Entregadores Fixos" tab="store_team" />
                                    
                                    <MenuSection title="Gestão" />
                                    <MenuButton icon={BarChart3} label="Relatórios" tab="store_reports" />
                                    <MenuButton icon={Megaphone} label="Marketing" tab="store_marketing" />
                                    <MenuButton icon={Cloud} label="Integrações" tab="store_integrations" />
                                    <MenuButton icon={Settings} label="Configurações" tab="store_settings" />
                                </>
                            )}

                            {/* --- SHARED DRIVER MENU (PARTNER + NORMAL) --- */}
                            {(isPartner || isNormalDriver) && (
                                <>
                                    <MenuSection title="Plataforma Zé" />
                                    <MenuButton icon={Truck} label="Painel de Corridas" tab="partner" />
                                    <MenuButton icon={Wallet} label="Zebank" tab="zebank" />
                                    <MenuButton icon={History} label="Histórico App" tab="history" />
                                    <MenuButton icon={Megaphone} label="Divulgação" tab="driver_marketing" />

                                    <MenuSection title="Meu Controle" />
                                    <MenuButton icon={ClipboardList} label="Painel Diário" tab="daily_panel" />
                                    
                                    <MenuSection title="Crescimento" />
                                    <MenuButton icon={Store} label="Lojas Vinculadas" tab="associate_driver" />

                                    <MenuSection title="Ferramentas" />
                                    <MenuButton icon={ListPlus} label="Lista de Rotas" tab="route_list" />
                                    <MenuButton icon={MapPin} label="Agenda de Endereços" tab="addresses" />
                                    <MenuButton icon={FileCheck} label="Tarefas" tab="tasks" />
                                    <MenuButton icon={BarChart3} label="Relatórios Pessoais" tab="reports" />
                                </>
                            )}

                            {/* --- GENERAL MENU (ALL USERS) --- */}
                            <MenuSection title="Geral" />
                            <MenuButton icon={ShoppingBag} label="Loja de Peças" tab="shop" />
                            <MenuButton icon={User} label="Meu Perfil" tab="profile" />
                            <MenuButton icon={Headphones} label="Suporte" tab="support" />
                            <MenuButton icon={Bot} label="Assistente Zé" tab="assistant" />
                            <MenuButton icon={Cloud} label="Backup Nuvem" tab="cloud" />
                            <MenuButton icon={Info} label="Sobre o App" tab="about" />
                            
                            {/* --- FOOTER ACTIONS --- */}
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                                <MenuButton icon={Globe} label="Idioma (PT-BR)" onClick={() => {}} />
                                <MenuButton icon={Share2} label="Compartilhar App" onClick={handleShareApp} />
                                <MenuButton icon={Lock} label="Privacidade" onClick={() => setShowPrivacy(true)} />
                                <MenuButton icon={UserCheck} label="Verificar Status" onClick={() => navigate('status')} />
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between px-2">
                                <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                </button>
                                <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    <Bell className="w-5 h-5" />
                                </button>
                                <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="text-center text-[10px] text-gray-400">
                                Versão 3.2.0 • Build 2024
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="pt-20 px-4 pb-24 max-w-6xl mx-auto">
                {renderContent()}
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
            {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
        </div>
    );
};
