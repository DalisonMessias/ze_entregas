import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Zap, Star, Instagram, Facebook, Twitter, Linkedin, ChevronLeft, ChevronRight, ArrowRight, Activity, DollarSign, Users, BarChart, Store, Bike, CheckCircle, Smartphone, Download, BarChart3, MessageCircle, Gift, Bell, Map, Headphones, Newspaper, Wallet, Megaphone, ShoppingBag, Bot, Navigation, MapPin, X } from 'lucide-react';
import { Button } from './Button';
import { TermsOfService } from './TermsOfService';
import { PrivacyPolicy } from './PrivacyPolicy';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import { CompanyModal } from './CompanyModals';
import { Logo } from './Logo';
import { Footer } from './Footer';
import { CitySearchSelect } from './CitySearchSelect';
import { StoreCard } from './StoreCard';
import { InstallApp } from './InstallApp';
import * as cloud from '../services/cloud';
import { ShopSettings, PublicStoreProfile, City } from '../types';

interface LandingPageProps {
    isAuthenticated: boolean;
    onLoginClick: () => void;
    onSignupClick: (type?: 'STORE_PARTNER' | 'DELIVERY_PARTNER' | 'USER') => void;
    onDashboardClick?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ isAuthenticated, onLoginClick, onSignupClick, onDashboardClick }) => {
    const [scrolled, setScrolled] = useState(false);
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);

    // Cidade e Lojas
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [stores, setStores] = useState<PublicStoreProfile[]>([]);
    const [loadingStores, setLoadingStores] = useState(false);
    const storesRef = useRef<HTMLElement>(null);

    // Modals State
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showCookiePrefs, setShowCookiePrefs] = useState(false);
    const [companyModal, setCompanyModal] = useState<'about' | 'careers' | 'press' | 'contact' | null>(null);
    const [showInstallModal, setShowInstallModal] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });

        const initData = async () => {
            try {
                const settings = await cloud.getShopSettings();
                setShopSettings(settings);
            } catch (e: any) { }
        };

        initData();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleCitySelect = async (city: City) => {
        const cityFullName = `${city.name} - ${city.state}`;
        setSelectedCity(cityFullName);
        setLoadingStores(true);

        try {
            // Se a cidade já tiver um slug (ex: vindo da busca/IBGE), usamos ele.
            // Caso contrário, geramos um slug compatível.
            let slug = (city as any).city_slug || (city as any).slug;

            if (!slug) {
                slug = city.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
            }

            const data = await cloud.getPublicStoresByCity(slug);
            setStores(data || []);

            setTimeout(() => {
                storesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (e) {
            console.error("Error loading stores:", e);
        } finally {
            setLoadingStores(false);
        }
    };

    const handleStoreClick = (store: PublicStoreProfile) => {
        // Use pushState to avoid full reload and maintain SPA state
        const url = `/${store.city_slug}/${store.store_slug}/produtos`;
        window.history.pushState({ tab: 'digital_menu' }, '', url);
        // Dispatch custom event to notify App.tsx to change tab
        window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'digital_menu' } }));
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col font-sans">
            {/* Header iFood Style */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    <Logo
                        className="h-8 w-auto"
                        variant={scrolled ? 'default' : 'full-white'}
                        onClick={() => window.location.href = '/home'}
                    />
                    {!isAuthenticated ? (
                        <div className="flex items-center gap-2 sm:gap-4">
                            {scrolled ? (
                                <>
                                    <Button
                                        onClick={onLoginClick}
                                        className="bg-[#EA1D2C] text-white hover:bg-brand-700 font-bold text-xs sm:text-base px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all"
                                    >
                                        Entrar
                                    </Button>
                                    <Button
                                        onClick={() => onSignupClick()}
                                        className="bg-[#EA1D2C] text-white hover:bg-brand-700 font-bold text-xs sm:text-base px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all"
                                    >
                                        <span className="sm:hidden">Criar Conta</span>
                                        <span className="hidden sm:inline">Cadastrar</span>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        onClick={onLoginClick}
                                        variant="ghost"
                                        className="text-white font-bold hover:bg-white/10 hover:text-white text-xs sm:text-base px-2 sm:px-4"
                                    >
                                        Entrar
                                    </Button>
                                    <Button
                                        onClick={() => onSignupClick()}
                                        variant="ghost"
                                        className="text-white font-bold hover:bg-white/10 hover:text-white text-xs sm:text-base px-2 sm:px-4 border border-white/20 sm:border-none rounded-lg"
                                    >
                                        <span className="sm:hidden">Criar Conta</span>
                                        <span className="hidden sm:inline">Cadastrar</span>
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={onDashboardClick}
                                className={`${scrolled ? 'bg-[#EA1D2C] text-white' : 'bg-white/20 text-white hover:bg-white/30'} font-bold px-3 sm:px-6 rounded-xl transition-all flex items-center gap-2`}
                            >
                                <Users className="w-5 h-5" />
                                <span className="hidden sm:inline">Meu Painel</span>
                            </Button>
                        </div>
                    )}
                </div>
            </nav>

            <main className="flex-1">
                {/* Hero iFood Style */}
                <section className="relative h-[600px] flex items-center justify-center z-40">
                    <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none"></div>
                    <img
                        src="https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop"
                        alt="Background"
                        className="absolute inset-0 w-full h-full object-cover z-0"
                    />

                    <div className="relative z-50 w-full max-w-4xl px-4 text-center">
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter drop-shadow-xl">
                            Tudo para facilitar seu dia.
                        </h1>
                        <p className="text-lg md:text-xl text-white/90 mb-12 font-medium max-w-2xl mx-auto drop-shadow-md">
                            O Zé Entregas leva o melhor da sua cidade até você.
                        </p>

                        <div className="relative z-[60] bg-white p-2 md:p-3 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 max-w-2xl mx-auto transform transition-all hover:scale-[1.01]">
                            <div className="flex-1 relative">
                                <CitySearchSelect
                                    value={selectedCity}
                                    onSelect={handleCitySelect}
                                    placeholder="Informe seu endereço ou cidade"
                                    className="!bg-transparent !border-none !p-1"
                                />
                            </div>
                            <Button
                                className="bg-[#EA1D2C] text-white hover:bg-red-700 py-4 px-10 rounded-xl text-lg font-black shrink-0 relative z-10"
                                onClick={() => storesRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                Buscar
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Listagem de Lojas - Dinâmica */}
                <section
                    ref={storesRef}
                    className={`bg-gray-50 dark:bg-gray-950 overflow-hidden transition-all duration-700 ease-in-out ${selectedCity ? 'max-h-[2000px] py-16 opacity-100' : 'max-h-0 py-0 opacity-0'
                        }`}
                >
                    <div className="max-w-6xl mx-auto px-4">
                        {selectedCity && (
                            <div className="mb-12">
                                <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-2">
                                    Lojas em <span className="text-[#EA1D2C]">{selectedCity.split(' - ')[0]}</span>
                                </h2>
                                <p className="text-gray-500 font-medium font-sans">As melhores opções da sua região</p>
                            </div>
                        )}

                        {loadingStores ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-white dark:bg-gray-800 h-[300px] rounded-3xl animate-pulse" />
                                ))}
                            </div>
                        ) : stores.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {stores.map(store => (
                                    <StoreCard key={store.id} store={store} onClick={() => handleStoreClick(store)} />
                                ))}
                            </div>
                        ) : selectedCity && (
                            <div className="text-center py-12">
                                <div className="bg-white dark:bg-gray-800 p-8 rounded-[32px] shadow-sm max-w-sm mx-auto">
                                    <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 font-bold">Nenhuma loja encontrada nesta região ainda.</p>
                                    <p className="text-sm text-gray-400 mt-2">Que tal ser o primeiro parceiro da sua cidade?</p>
                                    <Button onClick={() => onSignupClick('STORE_PARTNER')} className="mt-6 text-[#EA1D2C] font-bold">Quero ser parceiro</Button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Bloco "Como Funciona" - Novo */}
                <section className="py-24 px-4 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-black text-center mb-16 tracking-tighter text-gray-900 dark:text-white">
                            Peça em <span className="text-[#EA1D2C]">3 passos simples</span>.
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                            <div className="hidden md:block absolute top-24 left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-gray-200 dark:border-gray-800 -z-10"></div>

                            <div className="flex flex-col items-center text-center group">
                                <div className="w-20 h-20 bg-red-50 text-[#EA1D2C] rounded-full flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                                    <MapPin className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black mb-3 text-gray-900 dark:text-white">Informe sua localização</h3>
                                <p className="text-gray-500 font-medium">Basta colocar seu endereço para ver todas as lojas que entregam para você.</p>
                            </div>

                            <div className="flex flex-col items-center text-center group">
                                <div className="w-20 h-20 bg-red-50 text-[#EA1D2C] rounded-full flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                                    <ShoppingBag className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black mb-3 text-gray-900 dark:text-white">Escolha seus produtos</h3>
                                <p className="text-gray-500 font-medium">Navegue pelas melhores lojas da sua região e adicione tudo ao carrinho.</p>
                            </div>

                            <div className="flex flex-col items-center text-center group">
                                <div className="w-20 h-20 bg-red-50 text-[#EA1D2C] rounded-full flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                                    <Navigation className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black mb-3 text-gray-900 dark:text-white">Acompanhe a entrega</h3>
                                <p className="text-gray-500 font-medium">Receba notificações em tempo real e saiba exatamente onde seu pedido está.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Seção "Baixe o App" - Novo */}
                <section className="px-4 py-8">
                    <div className="max-w-6xl mx-auto bg-[#EA1D2C] rounded-[40px] p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
                        <div className="flex-1 z-10">
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-[1.1]">
                                Leve o Zé <br />
                                <span className="opacity-80">no seu bolso.</span>
                            </h2>
                            <p className="text-white/80 text-lg mb-10 max-w-md font-medium">
                                Baixe nosso aplicativo para ter a melhor experiência e receber cupons exclusivos todos os dias.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={() => setShowInstallModal(true)}
                                    className="bg-black text-white px-8 py-4 rounded-2xl flex items-center gap-3 hover:scale-105 transition-transform shadow-2xl group"
                                >
                                    <Download className="w-8 h-8 text-brand-500 group-hover:animate-bounce" />
                                    <div className="text-left">
                                        <p className="text-[10px] uppercase font-bold opacity-60 leading-none">Instalar agora</p>
                                        <p className="text-lg font-black leading-none">Aplicativo PWA</p>
                                    </div>
                                </button>
                                <div className="hidden sm:flex items-center gap-2 text-white/60 text-xs font-bold px-4">
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                    Funciona em Android, iOS e PC
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 relative -mb-16 md:-mb-32">
                            <div className="bg-white/20 w-80 h-80 rounded-full blur-3xl absolute -z-10 top-0 left-0"></div>
                            <Smartphone className="w-64 h-auto text-white opacity-20 transform rotate-12 mx-auto md:ml-auto" />
                        </div>
                    </div>
                </section>

                {/* Vantagens para Lojistas - Novo */}
                <section className="py-24 px-4 bg-gray-50 dark:bg-gray-950">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
                        <div className="flex-1 order-2 md:order-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm transform translate-y-8">
                                    <BarChart3 className="w-10 h-10 text-[#EA1D2C] mb-4" />
                                    <h4 className="font-black text-gray-900 dark:text-white mb-2">Gestão Inteligente</h4>
                                    <p className="text-sm text-gray-500 font-medium">Painel completo com métricas e vendas em tempo real.</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm">
                                    <Zap className="w-10 h-10 text-[#EA1D2C] mb-4" />
                                    <h4 className="font-black text-gray-900 dark:text-white mb-2">Vendas Rápidas</h4>
                                    <p className="text-sm text-gray-500 font-medium">Catálogo digital otimizado para conversão no WhatsApp.</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm transform translate-y-8">
                                    <Shield className="w-10 h-10 text-[#EA1D2C] mb-4" />
                                    <h4 className="font-black text-gray-900 dark:text-white mb-2">Segurança Total</h4>
                                    <p className="text-sm text-gray-500 font-medium">Sua loja, suas regras e pagamentos garantidos.</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm">
                                    <Bot className="w-10 h-10 text-[#EA1D2C] mb-4" />
                                    <h4 className="font-black text-gray-900 dark:text-white mb-2">IA Integrada</h4>
                                    <p className="text-sm text-gray-500 font-medium">Assistente IA para ajudar na descrição e fotos.</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 order-1 md:order-2">
                            <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
                                Transforme seu negócio com o <span className="text-[#EA1D2C]">Zé Entregas</span>.
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 font-medium">
                                Oferecemos mais do que entregas. Damos as ferramentas para você digitalizar sua loja e vender onde seus clientes estão.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <Button onClick={() => onSignupClick('STORE_PARTNER')} className="bg-[#EA1D2C] text-white hover:bg-red-700 px-10 py-5 rounded-2xl text-lg font-black shadow-xl">
                                    Começar agora grátis
                                </Button>
                                <Button
                                    onClick={() => {
                                        window.history.pushState({ tab: 'partner_store' }, '', '/partner-store');
                                        window.dispatchEvent(new CustomEvent('pushstate_changed'));
                                        window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'partner_store' } }));
                                    }}
                                    variant="outline"
                                    className="px-10 py-5 rounded-2xl text-lg font-black border-gray-300 dark:border-gray-700"
                                >
                                    Saiba mais
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Vantagens para Entregadores - Novo */}
                <section className="py-24 px-4 bg-white dark:bg-gray-900">
                    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
                        <div className="flex-1">
                            <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
                                Sua rota, sua rotina, <br />
                                <span className="text-[#EA1D2C]">seu dinheiro</span>.
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 font-medium">
                                No Zé, você é dono do seu tempo. Escolha as melhores rotas, realize entregas e receba seus ganhos de forma simples e rápida.
                            </p>
                            <ul className="space-y-4 mb-10">
                                <li className="flex items-center gap-4 text-gray-700 dark:text-gray-300 font-bold">
                                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                    Pagamentos rápidos via PIX
                                </li>
                                <li className="flex items-center gap-4 text-gray-700 dark:text-gray-300 font-bold">
                                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                    Liberdade total de horários
                                </li>
                                <li className="flex items-center gap-4 text-gray-700 dark:text-gray-300 font-bold">
                                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                    Suporte humanizado 24h
                                </li>
                            </ul>
                            <div className="flex flex-wrap gap-4">
                                <Button onClick={() => onSignupClick('DELIVERY_PARTNER')} className="bg-[#EA1D2C] text-white hover:bg-red-700 px-10 py-5 rounded-2xl text-lg font-black shadow-xl">
                                    Quero ser entregador
                                </Button>
                                <Button
                                    onClick={() => {
                                        window.history.pushState({ tab: 'partner_delivery' }, '', '/partner-delivery');
                                        window.dispatchEvent(new CustomEvent('pushstate_changed'));
                                        window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'partner_delivery' } }));
                                    }}
                                    variant="outline"
                                    className="px-10 py-5 rounded-2xl text-lg font-black border-gray-300 dark:border-gray-700"
                                >
                                    Ver detalhes
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-1 gap-6">
                            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-[40px] border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-lg transition-all">
                                <Bike className="w-16 h-16 text-[#EA1D2C]/20 absolute -right-4 -bottom-4 group-hover:scale-125 transition-transform" />
                                <div className="relative z-10">
                                    <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Flexibilidade</h4>
                                    <p className="text-gray-600 dark:text-gray-400 font-medium">Trabalhe quando quiser, de onde quiser. Sem chefes, sem pressão.</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-[40px] border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-lg transition-all">
                                <Wallet className="w-16 h-16 text-[#EA1D2C]/20 absolute -right-4 -bottom-4 group-hover:scale-125 transition-transform" />
                                <div className="relative z-10">
                                    <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Liquidez</h4>
                                    <p className="text-gray-600 dark:text-gray-400 font-medium">Saques descomplicados. Seu dinheiro na conta no momento que você precisar.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer
                shopSettings={shopSettings}
                setShowTerms={setShowTerms}
                setShowPrivacy={setShowPrivacy}
                setShowCookiePrefs={setShowCookiePrefs}
                setCompanyModal={setCompanyModal}
                onLoginClick={onLoginClick}
            />

            {showTerms && <TermsOfService onClose={() => setShowTerms(false)} />}
            {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
            {showCookiePrefs && <CookiePreferencesModal onClose={() => setShowCookiePrefs(false)} />}
            {companyModal && <CompanyModal type={companyModal} onClose={() => setCompanyModal(null)} data={shopSettings?.company_info} />}

            {/* Modal de Instalação PWA */}
            {showInstallModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden relative border border-white/10">
                        <button
                            onClick={() => setShowInstallModal(false)}
                            className="absolute top-6 right-6 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors z-10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="p-8 md:p-12 overflow-y-auto max-h-[90vh]">
                            <InstallApp onBack={() => setShowInstallModal(false)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
