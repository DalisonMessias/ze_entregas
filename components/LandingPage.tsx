import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Zap, Star, Instagram, Facebook, Twitter, Linkedin, ChevronLeft, ChevronRight, ArrowRight, Activity, DollarSign, Users, BarChart, Store, Bike, CheckCircle, Smartphone, Download, BarChart3, MessageCircle, Gift, Bell, Map, Headphones, Newspaper, Wallet, Megaphone, ShoppingBag, Bot, Navigation } from 'lucide-react';
import { Button } from './Button';
import { TermsOfService } from './TermsOfService';
import { PrivacyPolicy } from './PrivacyPolicy';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import { CompanyModal } from './CompanyModals';
import { Logo } from './Logo';
import { Footer } from './Footer';
import * as cloud from '../services/cloud';
import { ShopSettings } from '../types';

// Interfaces
interface LandingPageProps {
    onLoginClick: () => void;
    onSignupClick: (type: 'STORE_PARTNER' | 'DELIVERY_PARTNER') => void;
}

// Dummy Data
const heroSlides = [
    {
        title: "Revolucione sua Logística",
        subtitle: "A plataforma completa para lojas e entregadores."
    },
    {
        title: "Entregas em Tempo Recorde",
        subtitle: "Otimização de rotas e gestão inteligente."
    },
    {
        title: "Cresça seu Negócio",
        subtitle: "Ferramentas financeiras e insights detalhados."
    }
];

const platformNews: any[] = []; // Empty to hide news section for now

// Hooks
const useCarousel = (totalSlides: number, autoplayInterval: number = 5000) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const nextSlide = useCallback(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, [totalSlides]);

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    };

    const goToSlide = (slideIndex: number) => {
        setCurrentSlide(slideIndex);
    };

    const pause = () => setIsPaused(true);
    const resume = () => setIsPaused(false);

    useEffect(() => {
        if (!isPaused) {
            intervalRef.current = setInterval(nextSlide, autoplayInterval);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isPaused, nextSlide, autoplayInterval]);

    return { currentSlide, nextSlide, prevSlide, goToSlide, pause, resume, isPaused };
};

const useIntersectionObserver = (options: IntersectionObserverInit) => {
    const [ref, setRef] = useState<HTMLElement | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, options);

        if (ref) {
            observer.observe(ref);
        }

        return () => {
            if (ref) observer.unobserve(ref);
        };
    }, [ref, options]);

    return [setRef, isVisible] as const;
};

// Components
const Header: React.FC<{ onLoginClick: () => void }> = ({ onLoginClick }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}`}>
            <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                <Logo className={`h-8 w-auto ${scrolled ? 'text-brand-600' : 'text-white'}`} />
                <Button onClick={onLoginClick} variant="ghost" className={`${scrolled ? 'text-gray-700 dark:text-gray-200' : 'text-white'} hover:bg-white/10`}>
                    Entrar
                </Button>
            </div>
        </nav>
    );
};

const SectionTitle = ({ title, subtitle }: { title: string, subtitle: string }) => (
    <div className="text-center mb-16 px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight leading-tight">{title}</h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
    </div>
);

const BenefitCard = ({ icon, title, description, colorClass }: { icon: React.ReactNode, title: string, description: string, colorClass: string }) => (
    <div className="group bg-white dark:bg-gray-800 p-8 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-soft hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClass} opacity-10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500`}></div>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${colorClass} text-white`}>
            {icon}
        </div>
        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
);

const NewsCard = ({ item, index }: { item: any; index: number }) => (
    <div>{/* Implement if news needed */}</div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onSignupClick }) => {
    const [scrolled, setScrolled] = useState(false);
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
    const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [installFeedback, setInstallFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Modals State
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [showCookiePrefs, setShowCookiePrefs] = useState(false);
    const [companyModal, setCompanyModal] = useState<'about' | 'careers' | 'press' | 'contact' | null>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });

        const initData = async () => {
            try {
                const settings = await cloud.getShopSettings();
                setShopSettings(settings);
            } catch (e: any) {
                console.error("Error loading shop settings:", e);
            }
        };

        initData();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Helper for hero carousel auto-play
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentHeroSlide(prev => (prev + 1) % heroSlides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleInstallApp = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallFeedback({ type: 'success', text: 'App instalado com sucesso!' });
        }
        setInstallPrompt(null);
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 flex flex-col font-sans">
            <Header onLoginClick={onLoginClick} />

            <main className="flex-1">
                {/* Hero Section */}
                <header id="hero" className="relative pt-32 pb-24 md:pt-48 md:pb-36 px-4 overflow-hidden bg-brand-600 text-white">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>

                    {/* Background Blobs (White/Glow) */}
                    <div className="absolute top-[-20%] right-[-10%] w-[700px] h-[700px] bg-white/10 rounded-full blur-[120px] animate-pulse"></div>
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-500/20 rounded-full blur-[100px] delay-1000 animate-pulse"></div>

                    <div className="max-w-5xl mx-auto text-center relative z-10 min-h-[300px] flex flex-col justify-center">

                        {/* Carousel Content */}
                        {heroSlides.map((slide, index) => (
                            <div
                                key={index}
                                className={`transition-all duration-700 absolute inset-0 flex flex-col items-center justify-center ${index === currentHeroSlide ? 'opacity-100 translate-x-0 relative' : 'opacity-0 translate-x-10 absolute pointer-events-none'}`}
                            >
                                <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[1.1] tracking-tighter drop-shadow-sm">
                                    {slide.title}
                                </h1>

                                <p className="text-lg md:text-2xl text-brand-50 mb-10 max-w-3xl mx-auto leading-relaxed font-medium">
                                    {slide.subtitle}
                                </p>
                            </div>
                        ))}

                        {/* Carousel Indicators */}
                        <div className="flex justify-center gap-3 mt-8 absolute bottom-0 left-0 right-0">
                            {heroSlides.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentHeroSlide(idx)}
                                    className={`h-2 rounded-full transition-all duration-300 ${currentHeroSlide === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`}
                                    aria-label={`Ir para slide ${idx + 1}`}
                                />
                            ))}
                        </div>

                    </div>
                </header>

                {/* Solutions Section (Cards) */}
                <section id="solutions" className="py-24 px-4 relative">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Card Lojista */}
                            <div className="group bg-white dark:bg-gray-800 rounded-[40px] p-8 md:p-12 shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 relative overflow-hidden transition-all hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-500/20 transition-colors"></div>
                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center text-brand-600 mb-6">
                                        <Store className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Para Lojas</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
                                        Centralize seus pedidos, encontre entregadores em segundos e tenha controle total financeiro.
                                    </p>
                                    <ul className="space-y-4 mb-8">
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600" /></div> Gestão de pedidos simplificada</li>
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600" /></div> Radar de entregadores próximos</li>
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600" /></div> Relatórios financeiros detalhados</li>
                                    </ul>
                                    <Button onClick={() => onSignupClick('STORE_PARTNER')} className="bg-brand-600 text-white hover:bg-brand-700 w-full py-4 rounded-2xl text-lg shadow-lg shadow-gray-200/50">
                                        Cadastrar Minha Loja
                                    </Button>
                                </div>
                            </div>

                            {/* Card Entregador */}
                            <div className="group bg-white dark:bg-gray-800 rounded-[40px] p-8 md:p-12 shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 relative overflow-hidden transition-all hover:-translate-y-1">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-green-500/20 transition-colors"></div>
                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 mb-6">
                                        <Bike className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Para Entregadores</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
                                        Receba as melhores corridas, otimize sua rota e receba seus ganhos com transparência.
                                    </p>
                                    <ul className="space-y-4 mb-8">
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600" /></div> Mapa de calor e rotas inteligentes</li>
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600" /></div> Ganhos em tempo real</li>
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600" /></div> Suporte dedicado ao parceiro</li>
                                    </ul>
                                    <Button onClick={() => onSignupClick('DELIVERY_PARTNER')} className="bg-green-600 hover:bg-green-700 text-white w-full py-4 rounded-2xl text-lg shadow-lg shadow-green-500/20">
                                        Cadastrar Veículo
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Benefits Section */}
                <section id="benefits" className="py-24 px-4 bg-white dark:bg-gray-900">
                    <div className="max-w-6xl mx-auto">
                        <SectionTitle title="Por que escolher o Zé?" subtitle="Vantagens pensadas para quem precisa de agilidade e confiança." />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <BenefitCard
                                icon={<Zap className="w-8 h-8" />}
                                title="Ultra Rápido"
                                description="Conexão instantânea entre lojas e entregadores. Otimização de rotas para entregas em tempo recorde."
                                colorClass="from-yellow-400 to-orange-500"
                            />
                            <BenefitCard
                                icon={<Shield className="w-8 h-8" />}
                                title="Segurança Total"
                                description="Verificação rigorosa de parceiros, monitoramento em tempo real e suporte dedicado para qualquer imprevisto."
                                colorClass="from-blue-500 to-cyan-500"
                            />
                            <BenefitCard
                                icon={<Wallet className="w-8 h-8" />}
                                title="Taxas Justas"
                                description="Modelo de negócio transparente. Sem surpresas no final do mês, com repasses rápidos e claros."
                                colorClass="from-green-500 to-emerald-500"
                            />
                        </div>
                    </div>
                </section>

                {/* News Section */}
                {platformNews.length > 0 && (
                    <section className="py-24 px-4 bg-gray-50 dark:bg-gray-950">
                        <div className="max-w-6xl mx-auto">
                            <SectionTitle title="Novidades" subtitle="Fique por dentro das últimas atualizações da plataforma." />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {platformNews.map((item, index) => (
                                    <NewsCard key={item.id} item={item} index={index} />
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* CTA Section */}
                <section id="cadastro" className="py-24 px-4 bg-brand-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-8">Pronto para começar?</h2>
                        <p className="text-xl text-brand-100 mb-12 max-w-2xl mx-auto">
                            Junte-se a milhares de lojas e entregadores que já estão transformando a logística urbana.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-6">
                            <Button
                                onClick={() => onSignupClick('STORE_PARTNER')}
                                className="!bg-white !text-brand-600 !hover:bg-gray-50 py-6 px-10 text-lg rounded-2xl shadow-xl shadow-gray-200/50 transform hover:-translate-y-1 transition-all border-none"
                            >
                                <Store className="w-6 h-6 mr-3" />
                                Cadastrar Minha Loja
                            </Button>
                            <Button
                                onClick={() => onSignupClick('DELIVERY_PARTNER')}
                                className="!bg-gray-900 !text-white !hover:bg-gray-800 py-6 px-10 text-lg rounded-2xl shadow-xl shadow-gray-900/20 transform hover:-translate-y-1 transition-all border-none"
                            >
                                <Bike className="w-6 h-6 mr-3" />
                                Quero Entregar
                            </Button>
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
        </div>
    );
};
