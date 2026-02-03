import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Shield, Zap, Star, Instagram, Facebook, Twitter, Linkedin, ChevronLeft, ChevronRight, ArrowRight, Activity, DollarSign, Users, BarChart, Store, Bike, CheckCircle, Smartphone, Download, BarChart3, MessageCircle, Gift, Bell, Map, Headphones, Newspaper, Wallet, Megaphone, ShoppingBag, Bot, Navigation, MapPin, X } from 'lucide-react';
import { Button } from './Button';
import { TermsOfService } from './TermsOfService';
import { PrivacyPolicy } from './PrivacyPolicy';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import { CompanyModal } from './CompanyModals';
import { Logo } from './Logo';
import { Footer } from './Footer';
import { LandingCitySelector } from './LandingCitySelector';
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
    const [featuredOffset, setFeaturedOffset] = useState(0);
    const storesRef = useRef<HTMLElement>(null);
    const cityRequestId = useRef(0);

    // Modals State
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showCookiePrefs, setShowCookiePrefs] = useState(false);
    const [companyModal, setCompanyModal] = useState<'about' | 'careers' | 'press' | 'contact' | null>(null);
    const [showInstallModal, setShowInstallModal] = useState(false);

    const paymentLabels = [
        shopSettings?.payment_methods?.pix ? 'PIX' : null,
        shopSettings?.payment_methods?.credit_card ? 'Cartão' : null,
        shopSettings?.payment_methods?.boleto ? 'Boleto' : null
    ].filter(Boolean) as string[];

    const supportLine = shopSettings?.support_hours_start && shopSettings?.support_hours_end
        ? `Atendimento: ${shopSettings.support_hours_start} às ${shopSettings.support_hours_end}`
        : 'Atendimento rápido pelo app';

    const supportContact = shopSettings?.support_phone
        ? `Contato: ${shopSettings.support_phone}`
        : 'Contato via chat e e-mail';

    const highlightItems = [
        {
            title: 'Lojas da sua cidade',
            description: 'Encontre lojas locais prontas para entregar perto de você.',
            icon: MapPin
        },
        {
            title: 'Acompanhamento do pedido',
            description: 'Acompanhe o status e cada etapa da entrega em tempo real.',
            icon: Navigation
        },
        {
            title: 'Instale como app',
            description: 'Use no celular ou no PC com o PWA leve e rápido.',
            icon: Smartphone
        },
        {
            title: 'Suporte e ajuda',
            description: `${supportLine}. ${supportContact}.`,
            icon: Headphones
        }
    ];

    const faqItems = [
        {
            question: 'Preciso baixar o app?',
            answer: 'Não. Você pode usar direto no navegador e, se quiser, instalar como PWA em segundos.'
        },
        {
            question: 'Como acompanho o pedido?',
            answer: 'Você recebe atualizações no app e pode ver o status a qualquer momento.'
        },
        {
            question: 'Quais cidades atendem?',
            answer: 'Digite sua cidade no campo acima para ver as lojas disponíveis na região.'
        },
        {
            question: 'Sou lojista ou entregador, como entro?',
            answer: 'Use os botões de cadastro e siga o passo a passo para começar.'
        }
    ];

    const handleFaqClick = useCallback(() => {
        if (typeof window === 'undefined') return;
        window.history.pushState({ tab: 'faq' }, '', '/faq');
        window.dispatchEvent(new CustomEvent('pushstate_changed'));
        window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'faq' } }));
    }, []);

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
        const requestId = ++cityRequestId.current;
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
            if (requestId !== cityRequestId.current) return;
            setStores(data || []);

            setTimeout(() => {
                if (requestId !== cityRequestId.current) return;
                storesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (e) {
            console.error("Error loading stores:", e);
        } finally {
            if (requestId === cityRequestId.current) {
                setLoadingStores(false);
            }
        }
    };


    const handleCityClear = useCallback(() => {
        cityRequestId.current += 1;
        setSelectedCity('');
        setStores([]);
        setLoadingStores(false);
        setFeaturedOffset(0);
    }, []);

    const handleStoreClick = (store: PublicStoreProfile) => {
        // Use pushState to avoid full reload and maintain SPA state
        const url = `/${store.city_slug}/${store.store_slug}/produtos`;
        window.history.pushState({ tab: 'digital_menu' }, '', url);
        // Dispatch custom event to notify App.tsx to change tab
        window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'digital_menu' } }));
    };

    const featuredStores = useMemo(() => {
        if (stores.length <= 4) return stores;
        const start = featuredOffset % stores.length;
        return Array.from({ length: 4 }, (_, index) => stores[(start + index) % stores.length]);
    }, [stores, featuredOffset]);

    useEffect(() => {
        setFeaturedOffset(0);
    }, [stores.length, selectedCity]);

    useEffect(() => {
        if (stores.length <= 4) return;
        const interval = window.setInterval(() => {
            setFeaturedOffset(prev => (prev + 4) % stores.length);
        }, 6000);
        return () => window.clearInterval(interval);
    }, [stores.length]);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col font-sans">
            {/* Header iFood Style */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    <Logo
                        className="h-8 w-auto"
                        variant={scrolled ? 'default' : 'full-white'}
                        onClick={() => window.location.href = '/'}
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
                {/* Hero section redesigned with modern gradient and better typography */}
                <section className="relative min-h-[600px] flex items-center justify-center">
                    {/* Background layers */}
                    <div className="absolute inset-0 bg-gray-900 dark:bg-black z-0">
                        <img
                            src="https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop"
                            alt="Background"
                            className="absolute inset-0 w-full h-full object-cover opacity-50 transition-scale duration-[10s] hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-gray-900 dark:to-black z-10"></div>
                    </div>

                    <div className="relative z-20 w-full max-w-5xl px-6 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-tight">
                            Tudo para o seu dia <br />
                            <span className="text-brand-500">mais fácil.</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-white/80 mb-12 font-medium max-w-2xl mx-auto">
                            O Zé Entregas leva o melhor da sua cidade <br className="hidden md:block" /> até o conforto da sua casa.
                        </p>

                        <LandingCitySelector
                            value={selectedCity}
                            onSelect={handleCitySelect}
                            placeholder="Em qual cidade você está?"
                        />

                        {/* Trust Badges or Microcopy */}
                        <div className="mt-10 flex flex-wrap justify-center gap-6 text-white/60 text-sm font-bold opacity-80">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-green-400" />
                                <span>Entregas Seguras</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-400" />
                                <span>Rápido e Prático</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Star className="w-4 h-4 text-orange-400 fill-orange-400" />
                                <span>Melhores Lojas</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Community spotlight section */}
                <section className="py-16 bg-white dark:bg-gray-950">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-brand-600">Comunidade</p>
                                <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white">
                                    Aqui só tem gente boa!
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400 font-medium">
                                    Uma seleção rápida de lojas para você conhecer.
                                </p>
                            </div>
                            {stores.length > 4 && (
                                <div className="text-xs font-black uppercase tracking-widest text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-full">
                                    Mostrando 4 de {stores.length} • Alternando
                                </div>
                            )}
                        </div>

                        {!selectedCity && (
                            <div className="text-center py-10 px-4 bg-gray-50 dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800">
                                <p className="text-gray-500 dark:text-gray-400 font-medium">
                                    Escolha uma cidade acima para ver as lojas em destaque.
                                </p>
                            </div>
                        )}

                        {selectedCity && loadingStores && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                                        <div className="w-full h-28 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse mb-5"></div>
                                        <div className="h-5 w-3/4 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse mb-2"></div>
                                        <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedCity && !loadingStores && featuredStores.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-700">
                                {featuredStores.map((store, index) => (
                                    <div key={`${store.id}-${index}`} className="animate-in fade-in slide-in-from-bottom-4">
                                        <StoreCard store={store} onClick={() => handleStoreClick(store)} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {selectedCity && !loadingStores && featuredStores.length === 0 && (
                            <div className="text-center py-10 px-4 bg-gray-50 dark:bg-gray-900/60 rounded-3xl border border-gray-100 dark:border-gray-800">
                                <p className="text-gray-500 dark:text-gray-400 font-medium">
                                    Ainda não encontramos lojas nessa cidade.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Store Listing Section with better responsiveness and visual feedback */}
                <section
                    ref={storesRef}
                    className={`bg-gray-50 dark:bg-gray-900 overflow-hidden transition-all duration-700 ease-in-out ${selectedCity ? 'max-h-[5000px] py-16 md:py-24 opacity-100' : 'max-h-0 py-0 opacity-0'
                        }`}
                >
                    <div className="max-w-7xl mx-auto px-6">
                        {selectedCity && (
                            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
                                <div>
                                    <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                                        Lojas em <span className="text-brand-600">{selectedCity.split(' - ')[0]}</span>
                                    </h2>
                                    <p className="text-gray-500 font-bold flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        {stores.length} lojas encontradas na sua região
                                    </p>
                                </div>
                                <div className="hidden md:flex gap-2">
                                    <div className="px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-xs font-black uppercase text-gray-400">
                                        Filtros rápidos
                                    </div>
                                </div>
                            </div>
                        )}

                        {loadingStores ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <div key={i} className="bg-white dark:bg-gray-800 rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                                        <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse mb-6"></div>
                                        <div className="h-6 w-3/4 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse mb-3"></div>
                                        <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse mb-6"></div>
                                        <div className="flex justify-between items-center mt-auto">
                                            <div className="w-20 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                                            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : stores.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-in fade-in duration-700">
                                {stores.map((store, index) => (
                                    <div key={store.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                                        <StoreCard store={store} onClick={() => handleStoreClick(store)} />
                                    </div>
                                ))}
                            </div>
                        ) : selectedCity && (
                            <div className="text-center py-20 px-4">
                                <div className="bg-white dark:bg-gray-800 p-12 rounded-[48px] shadow-2xl max-w-lg mx-auto border border-gray-50 dark:border-gray-700 transform hover:scale-[1.02] transition-transform">
                                    <div className="w-24 h-24 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-8">
                                        <Store className="w-12 h-12 text-brand-500" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Ainda não estamos por aqui</h3>
                                    <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                                        Infelizmente não encontramos lojas em <span className="font-bold">{selectedCity.split(' - ')[0]}</span>. <br />
                                        Seja o primeiro a levar o Zé Entregas para sua cidade!
                                    </p>
                                    <Button
                                        onClick={() => onSignupClick('STORE_PARTNER')}
                                        className="w-full bg-brand-600 text-white hover:bg-brand-700 py-5 rounded-2xl text-lg font-black shadow-xl shadow-brand-600/20 transition-all font-sans"
                                    >
                                        Quero ser um parceiro
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Bloco "Destaques" - Mais Informações */}
                <section className="py-20 px-4 bg-white dark:bg-gray-950">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-brand-600">Mais informações</p>
                                <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight">
                                    Experiência completa do início ao fim.
                                </h2>
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xl">
                                Do pedido ao acompanhamento, tudo acontece no mesmo lugar com clareza e praticidade.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {highlightItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.title}
                                        className="bg-gray-50 dark:bg-gray-900/60 p-6 rounded-[28px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-900 flex items-center justify-center border border-gray-200 dark:border-gray-800 mb-4">
                                            <Icon className="w-6 h-6 text-brand-600" />
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">{item.title}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{item.description}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {paymentLabels.length > 0 && (
                            <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs font-black uppercase text-gray-400">
                                <span className="tracking-widest">Formas de pagamento:</span>
                                {paymentLabels.map((label) => (
                                    <span
                                        key={label}
                                        className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                                    >
                                        {label}
                                    </span>
                                ))}
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

                {/* FAQ Rápido */}
                <section className="py-24 px-4 bg-gray-50 dark:bg-gray-950">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-brand-600">FAQ rápido</p>
                            <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight mb-6">
                                Dúvidas comuns, respostas diretas.
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-8">
                                Se quiser mais detalhes, acesse a página completa de perguntas frequentes.
                            </p>
                            <Button
                                onClick={handleFaqClick}
                                variant="outline"
                                className="px-10 py-4 rounded-2xl text-base font-black border-gray-300 dark:border-gray-700"
                            >
                                Ver FAQ completo
                            </Button>
                        </div>
                        <div className="space-y-4">
                            {faqItems.map((item) => (
                                <div
                                    key={item.question}
                                    className="bg-white dark:bg-gray-900 p-6 rounded-[28px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
                                >
                                    <h3 className="text-base font-black text-gray-900 dark:text-white mb-2">{item.question}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{item.answer}</p>
                                </div>
                            ))}
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
