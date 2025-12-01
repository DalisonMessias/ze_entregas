
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Store, Bike, Shield, Zap, Bell, Map, BarChart3, Headphones, CheckCircle, ChevronDown, Smartphone, Star, Instagram, Facebook, Twitter, Linkedin, Download, Gift, MessageCircle, Newspaper, Wallet, Megaphone, ShoppingBag, Users, Bot, Navigation } from 'lucide-react';
import { Button } from './Button';
import { TermsOfService } from './TermsOfService';
import { PrivacyPolicy } from './PrivacyPolicy';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import { CompanyModal } from './CompanyModals';
import { Logo } from './Logo';
import * as cloud from '../services/cloud';
import { ShopSettings, CompanyInfo, PlatformNews } from '../types';

// Helper: Componente para renderizar ícones dinamicamente
const icons: { [key: string]: React.ElementType } = {
  Bike,
  BarChart3,
  MessageCircle,
  Gift,
  Zap,
  Shield,
  Bell,
  Map,
  Headphones,
  CheckCircle,
  Smartphone,
  Star,
  Newspaper,
  Wallet,
  Megaphone,
  ShoppingBag,
  Users,
  Bot,
  Navigation
};

const IconComponent = ({ name, ...props }: { name: string, [key: string]: any }) => {
  const Icon = icons[name];
  if (!Icon) return <Zap {...props} />; // Ícone de fallback
  return <Icon {...props} />;
};

// Helper: Hook para observar interseção (animação de scroll)
const useIntersectionObserver = (options: IntersectionObserverInit) => {
    const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
    const [node, setNode] = useState<HTMLElement | null>(null);

    const observer = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
        if (observer.current) observer.current.disconnect();

        observer.current = new window.IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setEntry(entry);
                observer.current?.unobserve(entry.target);
            }
        }, options);

        const { current: currentObserver } = observer;
        if (node) currentObserver.observe(node);

        return () => currentObserver.disconnect();
    }, [node, options]);

    return [setNode, entry];
};

// Helper: Card de Novidade
interface NewsCardProps {
    item: PlatformNews;
    index: number;
}

const NewsCard: React.FC<NewsCardProps> = ({ item, index }) => {
    const [ref, entry] = useIntersectionObserver({ threshold: 0.1 });
    const isVisible = !!entry;

    return (
        <div ref={ref as any} className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: `${index * 100}ms` }}>
             <div className="group bg-white dark:bg-gray-800 p-8 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-soft hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden h-full flex flex-col">
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-500 to-orange-500 opacity-10 rounded-bl-[100px] -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-500`}></div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm bg-brand-600 text-white`}>
                    <IconComponent name={item.icon_name} className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed flex-1">{item.description}</p>
            </div>
        </div>
    );
};


interface LandingPageProps {
    onLoginClick: () => void;
    onSignupClick: (type: 'STORE_PARTNER' | 'DELIVERY_PARTNER') => void;
}

const handleScroll = (e: React.MouseEvent<HTMLElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
        // Offset for fixed header
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }
};

const Header: React.FC<{ onLoginClick: () => void; onSignupClick: () => void; }> = ({ onLoginClick, onSignupClick }) => {
    return (
        <nav className="w-full fixed top-0 left-0 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 z-50 transition-colors duration-300">
            <div className="px-4 md:px-8 py-4 flex justify-between items-center max-w-7xl mx-auto w-full">
                <a href="#hero" onClick={(e) => handleScroll(e, 'hero')} className="flex items-center gap-2 group text-black dark:text-white">
                    {/* Logo Mobile (Ícone) */}
                    <Logo className="h-10 w-auto md:hidden text-black transition-transform group-hover:scale-105" mode="icon" />
                    {/* Logo Desktop (Completa) */}
                    <Logo className="h-10 w-auto hidden md:block text-black transition-transform group-hover:scale-105" mode="full" />
                </a>
                <div className="hidden md:flex items-center gap-8 text-sm font-bold">
                    <a href="#solutions" onClick={(e) => handleScroll(e, 'solutions')} className="text-gray-600 dark:text-gray-300 hover:text-brand-600 transition-colors">Soluções</a>
                    <a href="#app" onClick={(e) => handleScroll(e, 'app')} className="text-gray-600 dark:text-gray-300 hover:text-brand-600 transition-colors">App</a>
                    <a href="#benefits" onClick={(e) => handleScroll(e, 'benefits')} className="text-gray-600 dark:text-gray-300 hover:text-brand-600 transition-colors">Vantagens</a>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={onLoginClick} variant="outline" className="py-2 px-5 text-xs font-bold rounded-full border-gray-200 hover:bg-gray-50">
                        Entrar
                    </Button>
                    <Button onClick={() => { const el = document.getElementById('cadastro'); if(el) el.scrollIntoView({ behavior: 'smooth' }); }} className="py-2 px-5 text-xs font-bold shadow-lg shadow-brand-500/20 bg-brand-600 text-white hover:bg-brand-700 rounded-full">
                        Criar Conta
                    </Button>
                </div>
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

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onSignupClick }) => {
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showCookieModal, setShowCookieModal] = useState(false);
    const [companyModal, setCompanyModal] = useState<'about' | 'careers' | 'press' | 'contact' | null>(null);
    const [socialLinks, setSocialLinks] = useState<any>({});
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({});
    const [platformNews, setPlatformNews] = useState<PlatformNews[]>([]);
    
    // PWA Install State
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [installFeedback, setInstallFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Hero Carousel State
    const [currentHeroSlide, setCurrentHeroSlide] = useState(0);

    const heroSlides = [
        {
            title: <>A Revolução da <span className="bg-white/20 px-2 rounded-lg text-white backdrop-blur-sm">Logística Urbana</span>.</>,
            subtitle: "Conectamos lojas e entregadores com tecnologia de ponta. Otimize rotas, reduza custos e escale seu negócio com eficiência máxima."
        },
        {
            title: <>Sua Loja Vendendo <br/><span className="text-yellow-300">Muito Mais</span>.</>,
            subtitle: "Tenha controle total da sua operação. Encontre entregadores em segundos, gerencie pagamentos e fidelize seus clientes com entregas expressas."
        },
        {
            title: <>Liberdade para <span className="underline decoration-wavy decoration-white/50">Faturar Alto</span>.</>,
            subtitle: "Para quem vive na estrada: escolha suas corridas, receba com transparência e tenha as melhores ferramentas para o seu corre diário."
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentHeroSlide((prev) => (prev + 1) % heroSlides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        cloud.getShopSettings().then(s => {
            if (s?.social_media) setSocialLinks(s.social_media);
            if (s?.company_info) setCompanyInfo(s.company_info);
        });
        
        cloud.getActivePlatformNews().then(setPlatformNews);

        // Check for global deferred prompt (from index.tsx)
        if ((window as any).deferredPrompt) {
            setInstallPrompt((window as any).deferredPrompt);
        }

        // PWA Install Listeners
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
            (window as any).deferredPrompt = e;
        };

        const handleAppInstalled = () => {
            setInstallPrompt(null);
            (window as any).deferredPrompt = null;
            setInstallFeedback({ type: 'success', text: 'Aplicativo instalado com sucesso!' });
            setTimeout(() => setInstallFeedback(null), 5000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallApp = async () => {
        if (!installPrompt) return;
        
        installPrompt.prompt();
        
        const { outcome } = await installPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        } else {
            // Optional: User dismissed
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 flex flex-col font-sans">
            <Header onLoginClick={onLoginClick} onSignupClick={() => {}} />
            
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
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600"/></div> Gestão de pedidos simplificada</li>
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600"/></div> Radar de entregadores próximos</li>
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600"/></div> Relatórios financeiros detalhados</li>
                                    </ul>
                                    <Button onClick={() => onSignupClick('STORE_PARTNER')} className="bg-brand-600 hover:bg-brand-700 text-white w-full py-4 rounded-2xl text-lg shadow-lg shadow-brand-500/20">
                                        Começar como Loja
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
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600"/></div> Mapa de calor e rotas inteligentes</li>
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600"/></div> Ganhos em tempo real</li>
                                        <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300 font-medium"><div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle className="w-4 h-4 text-green-600"/></div> Suporte dedicado ao parceiro</li>
                                    </ul>
                                    <Button onClick={() => onSignupClick('DELIVERY_PARTNER')} className="bg-green-600 hover:bg-green-700 text-white w-full py-4 rounded-2xl text-lg shadow-lg shadow-green-500/20">
                                        Cadastrar Veículo
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* App Showcase Section */}
                <section id="app" className="py-24 px-4 bg-gray-900 text-white relative overflow-hidden">
                    {/* Abstract Shapes */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-brand-600 rounded-full blur-[150px]"></div>
                        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600 rounded-full blur-[150px]"></div>
                    </div>

                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
                        <div>
                            <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-white/20">
                                Experiência Mobile
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                                Seu escritório <br/> na palma da mão.
                            </h2>
                            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                                Desenvolvemos uma experiência fluida e intuitiva. Acompanhe métricas, gerencie entregas e acesse o suporte em poucos toques, onde quer que você esteja.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                    <Smartphone className="w-8 h-8 text-brand-400" />
                                    <div>
                                        <p className="font-bold text-white">App Leve</p>
                                        <p className="text-xs text-gray-400">Funciona em qualquer celular</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                                    <Zap className="w-8 h-8 text-yellow-400" />
                                    <div>
                                        <p className="font-bold text-white">Sem Travamentos</p>
                                        <p className="text-xs text-gray-400">Otimizado para velocidade</p>
                                    </div>
                                </div>
                            </div>

                            {/* PWA Install Button Area */}
                            {installPrompt && (
                                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                                    <Button 
                                        onClick={handleInstallApp}
                                        className="bg-white text-gray-900 hover:bg-gray-100 font-bold py-4 px-8 rounded-full shadow-xl shadow-white/10 flex items-center gap-3 transition-transform hover:scale-105 border-none"
                                    >
                                        <Download className="w-5 h-5" />
                                        Instalar Aplicativo
                                    </Button>
                                    <p className="text-xs text-gray-400 mt-2 ml-4">Versão Web App (PWA) disponível</p>
                                </div>
                            )}

                            {installFeedback && (
                                <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 animate-in zoom-in-95 ${
                                    installFeedback.type === 'success' 
                                    ? 'bg-green-500/20 border border-green-500/50 text-green-100' 
                                    : 'bg-red-500/20 border border-red-500/50 text-red-100'
                                }`}>
                                    {installFeedback.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <Shield className="w-5 h-5"/>}
                                    <span className="font-bold">{installFeedback.text}</span>
                                </div>
                            )}

                        </div>
                        <div className="relative">
                            {/* Mockup Placeholder - CSS Only */}
                            <div className="relative mx-auto border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-xl">
                                <div className="w-[148px] h-[18px] bg-gray-800 top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute"></div>
                                <div className="h-[32px] w-[3px] bg-gray-800 absolute -left-[17px] top-[72px] rounded-l-lg"></div>
                                <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[124px] rounded-l-lg"></div>
                                <div className="h-[46px] w-[3px] bg-gray-800 absolute -left-[17px] top-[178px] rounded-l-lg"></div>
                                <div className="h-[64px] w-[3px] bg-gray-800 absolute -right-[17px] top-[142px] rounded-r-lg"></div>
                                <div className="rounded-[2rem] overflow-hidden w-[272px] h-[572px] bg-white dark:bg-gray-900 relative">
                                    {/* Screen Content Simulation */}
                                    <div className="absolute inset-0 bg-gray-50 flex flex-col">
                                        <div className="h-40 bg-brand-600 rounded-b-[30px] p-6 pt-12 text-white flex flex-col justify-end pb-4">
                                            {/* Custom White Logo for Brand Background */}
                                            <div className="mb-4">
                                                 <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 1234.74 313.45"
                                                    className="h-8 w-auto"
                                                    fillRule="evenodd"
                                                    clipRule="evenodd"
                                                    shapeRendering="geometricPrecision"
                                                    textRendering="geometricPrecision"
                                                    imageRendering="optimizeQuality"
                                                  >
                                                    <g>
                                                        {/* Box - White */}
                                                        <path fill="#FFFFFF" d="M92.91 0l127.63 0c51.1,0 92.91,41.81 92.91,92.91l0 127.62c0,51.1 -41.81,92.91 -92.91,92.91l-127.63 0c-51.1,0 -92.91,-41.81 -92.91,-92.91l0 -127.62c0,-51.1 41.81,-92.91 92.91,-92.91z"/>
                                                        {/* Icon - Brand Red to standout against white box */}
                                                        <path fill="#ED2B05" fillRule="nonzero" d="M163.72 216.59c10.64,-6.28 42.29,-24.16 45.85,-26.04 0.9,-0.6 1.66,-1.42 2.2,-2.36 0.59,-1.02 0.92,-2.22 0.92,-3.49l0 -52.05 -20.55 11.8c-0.3,0.2 -0.61,0.38 -0.93,0.53l-27.49 15.78 0 55.83zm-24.2 -113.84l48.66 27.85 17.42 -10 -45.62 -26.05c-0.44,-0.23 -0.93,-0.42 -1.44,-0.55 -0.57,-0.15 -1.18,-0.23 -1.82,-0.23 -0.63,0 -1.25,0.08 -1.82,0.23 -0.64,0.17 -1.21,0.4 -1.71,0.68 0,0.16 -5.93,3.62 -13.68,8.07zm34.61 35.92l-48.71 -27.88c-6.84,3.88 -13.37,7.56 -17.48,9.86l48.8 28.01 17.4 -9.99zm-73.37 -6.02l0 52.05c0,1.26 0.33,2.46 0.92,3.49 0.61,1.06 1.48,1.96 2.54,2.57l45.52 26 0 -55.99 -48.97 -28.11zm56.48 101.01l-0.51 0.02 -0.51 -0.02 -0.03 0 -0.06 -0c-1.62,-0.04 -3.24,-0.29 -4.83,-0.71 -1.5,-0.4 -2.99,-0.99 -4.43,-1.76l-0.62 -0.31 -48.97 -28.02c-3.26,-1.88 -5.89,-4.55 -7.69,-7.66 -1.82,-3.15 -2.83,-6.76 -2.83,-10.48l0 -55.97c0,-3.72 1.01,-7.33 2.83,-10.49 1.68,-2.91 4.09,-5.43 7.05,-7.28l0.63 -0.41 24.42 -13.95 0.15 -0.08 0.01 -0 24.4 -13.94c1.64,-0.91 3.33,-1.62 5.04,-2.08 1.78,-0.48 3.6,-0.72 5.42,-0.72 1.82,0 3.65,0.25 5.42,0.72 1.59,0.42 3.15,1.05 4.63,1.86 4.29,2.25 49.39,27.79 49.39,28.23 3.26,1.88 5.89,4.55 7.69,7.66 1.82,3.16 2.83,6.76 2.83,10.49l0 55.97c0,3.72 -1.01,7.33 -2.83,10.49 -1.68,-2.91 -4.09,-5.43 -7.05,7.28l-0.63 0.41 -48.98 27.99c-1.64,0.91 -3.33,1.62 -5.04,2.08 -1.58,0.43 -3.2,0.67 -4.83,0.72l-0.06 0 -0.03 0z"/>
                                                        {/* Zé - White */}
                                                        <path fill="#FFFFFF" fillRule="nonzero" d="M375.02 201.97c0,3.91 1.87,5.78 5.79,5.78l69.4 0c3.74,0 5.61,-1.87 5.61,-5.78l0 -19.05c0,-3.91 -1.87,-5.78 -5.61,-5.78l-36.23 0 37.59 -57.16c1.7,-2.55 2.89,-5.44 2.89,-9.02l0 -17.86c0,-3.91 -1.87,-5.78 -5.78,-5.78l-66 0c-3.91,0 -5.78,1.87 -5.78,5.78l0 19.05c0,3.91 1.87,5.78 5.78,5.78l33 0 -37.76 57.16c-1.7,2.55 -2.89,5.44 -2.89,9.01l0 17.86zm140.68 -16.5c-11.57,0 -16.67,-3.23 -18.03,-12.76l42.53 0c4.08,0 5.95,-1.53 5.95,-5.78l0 -9.87c0,-28.75 -12.25,-44.4 -38.95,-44.4 -26.88,0 -41.17,14.8 -41.17,47.97 0,34.7 15.31,48.82 46.61,48.82 10.72,0 19.73,-2.04 26.03,-4.76 3.06,-1.53 4.59,-3.06 4.08,-6.8l-1.7 -12.08c-0.51,-3.57 -3.06,-4.93 -6.63,-3.74 -4.76,1.7 -11.57,3.4 -18.71,3.4zm-8.17 -49.67c6.63,0 9.53,5.1 9.53,16.16l0 1.87 -20.24 0c0.85,-13.61 3.57,-18.03 10.72,-18.03zm-13.95 -33.34c-0.85,2.55 0.17,4.25 3.23,4.25l12.93 0c3.23,0 4.93,-0.68 6.98,-2.89l12.42 -12.93c1.87,-2.04 1.36,-5.61 -2.04,-5.61l-23.14 0c-3.23,0 -4.59,1.36 -5.44,3.74l-4.93 13.44z"/>
                                                        {/* Entregas - White */}
                                                        <path fill="#FFFFFF" fillRule="nonzero" d="M662.16 160.81c3.74,0 5.79,-2.04 5.79,-5.78l0 -16.84c0,-3.74 -2.04,-5.78 -5.79,-5.78l-32.15 0 0 -15.48 34.36 0c3.91,0 5.78,-1.87 5.78,-5.78l0 -18.03c0,-3.91 -1.87,-5.78 -5.78,-5.78l-62.26 0c-3.91,0 -5.79,1.87 -5.79,5.78l0 108.87c0,3.91 1.87,5.78 5.79,5.78l63.11 0c3.91,0 5.78,-1.87 5.78,-5.78l0 -18.03c0,-3.91 -1.87,-5.78 -5.78,-5.78l-35.21 0 0 -17.35 32.15 0zm100.02 -16.5c0,-20.07 -7.48,-31.64 -25.69,-31.64 -10.89,0 -18.71,5.1 -22.45,10.2l-1.19 -4.25c-0.68,-2.72 -2.04,-4.25 -5.96,-4.25l-18.88 0c-3.57,0 -5.27,1.7 -5.27,5.27l0 82.84c0,3.57 1.7,5.27 5.27,5.27l21.43 0c3.57,0 5.27,-1.7 5.27,-5.27l0 -48.14c0,-8.68 2.21,-13.44 8.68,-13.44 5.27,0 6.63,3.57 6.63,11.06l0 50.52c0,3.57 1.7,5.27 5.27,5.27l21.43 0c3.74,0 5.44,-1.7 5.44,-5.27l0 -58.18zm58.35 1.53c3.57,0 5.27,-1.7 5.27,-5.28l0 -15.48c0,-3.57 -1.7,-5.28 -5.27,-5.28l-10.38 0 0 -19.39c0,-3.4 -1.7,-5.1 -5.44,-5.1l-20.07 0c-3.74,0 -5.44,1.7 -5.44,5.1l0 19.39 -4.59 0c-3.57,0 -5.1,1.53 -5.1,5.1l0 15.82c0,3.57 1.53,5.1 5.1,5.1l4.42 0 0 33.85c0,22.12 7.99,29.26 28.41,29.26 5.61,0 10.55,-0.51 13.78,-1.36 3.06,-0.85 4.59,-2.21 4.59,-5.44l0 -15.14c0,-3.57 -1.7,-5.1 -4.93,-5.1 -1.19,0 -3.23,0.17 -4.08,0.17 -5.1,0 -6.47,-1.7 -6.47,-7.65l0 -28.58 10.21 0zm20.75 -31.47c-3.57,0 -5.27,1.7 -5.27,5.27l0 82.84c0,3.57 1.7,5.27 5.27,5.27l21.43 0c3.57,0 5.27,-1.7 5.27,-5.27l0 -40.83c0,-9.53 4.59,-14.97 13.44,-14.97 2.72,0 4.25,0.51 6.47,0.51 2.72,0 4.59,-1.02 4.59,-4.59l0 -23.98c0,-3.74 -1.36,-5.27 -5.44,-5.27 -9.7,0 -16.5,7.31 -19.56,13.44l-1.19 -7.49c-0.51,-3.4 -1.7,-4.93 -5.78,-4.93l-19.22 0zm107.17 71.1c-11.57,0 -16.67,-3.23 -18.03,-12.76l42.53 0c4.08,0 5.95,-1.53 5.95,-5.78l0 -9.87c0,-28.75 -12.25,-44.4 -38.95,-44.4 -26.88,0 -41.17,14.8 -41.17,47.97 0,34.7 15.31,48.82 46.61,48.82 10.72,0 19.73,-2.04 26.03,-4.76 3.06,-1.53 4.59,-3.06 4.08,-6.8l-1.7 -12.08c-0.51,-3.57 -3.06,-4.93 -6.63,-3.74 -4.76,1.7 -11.57,3.4 -18.71,3.4zm-8.17 -49.67c6.63,0 9.53,5.1 9.53,16.16l0 1.87 -20.24 0c0.85,-13.61 3.57,-18.03 10.72,-18.03zm97.64 18.2c0,11.91 -2.55,17.69 -8.85,17.69 -6.47,0 -8.34,-5.78 -8.34,-17.69 0,-11.74 2.04,-17.35 8.34,-17.35 6.29,0 8.85,5.61 8.85,17.35zm31.13 -34.36c0,-3.57 -1.7,-5.27 -5.44,-5.27l-17.52 0c-3.74,0 -5.27,1.53 -5.96,4.25l-1.02 3.74c-3.57,-4.93 -10.38,-9.53 -20.41,-9.53 -18.54,0 -30.11,11.06 -30.11,41.17 0,29.77 10.38,41 29.94,41 9.87,0 16.67,-3.06 20.24,-8.16l0 3.57c0,9.53 -4.77,13.61 -16.33,13.61 -8.17,0 -15.82,-2.04 -20.07,-3.23 -3.91,-1.19 -6.12,0.17 -6.63,3.74l-1.7 12.76c-0.51,3.91 1.02,5.28 4.08,6.8 5.61,2.55 17.86,4.08 28.24,4.08 28.92,0 42.7,-11.4 42.7,-36.74l0 -71.79zm87.95 23.3c0,-20.75 -11.57,-30.11 -37.6,-30.11 -11.06,0 -22.96,2.21 -30.11,4.93 -3.06,1.02 -4.42,2.89 -3.91,6.3l2.04 14.12c0.51,3.57 3.06,4.76 6.63,3.74 4.77,-1.53 12.08,-3.74 20.24,-3.74 8.17,0 11.74,2.04 11.74,7.66l0 4.08c-29.26,0.51 -46.78,4.25 -46.78,30.62 0,19.56 11.06,28.24 25.35,28.24 12.42,0 19.39,-4.42 23.13,-9.01l1.02 3.74c0.68,2.72 2.21,4.25 5.96,4.25l16.84 0c3.74,0 5.44,-1.7 5.44,-5.27l0 -59.54zm-30.96 32.15c0,7.31 -1.7,12.25 -9.01,12.25 -5.1,0 -7.31,-3.57 -7.31,-9.19 0,-9.19 3.91,-11.06 16.33,-11.4l0 8.34zm108.7 6.29c0,-17.52 -9.01,-23.64 -22.28,-29.43 -8.67,-3.74 -14.29,-5.78 -14.29,-9.69 0,-3.57 3.74,-4.59 9.7,-4.59 5.61,0 11.4,1.19 14.63,2.04 3.57,0.85 5.78,-0.51 6.12,-3.74l1.53 -13.78c0.51,3.57 -0.68,-5.1 -3.91,-6.29 -4.93,-1.7 -14.63,-3.23 -24.16,-3.23 -23.3,0 -35.38,8.16 -35.38,28.07 0,21.09 11.74,25.68 23.82,30.62 8.17,3.4 12.76,5.1 12.76,8.68 0,3.4 -5.1,4.25 -11.4,4.25 -6.8,0 -12.93,-1.19 -16.33,-2.38 -3.91,-1.19 -6.12,0.34 -6.46,3.57l-1.53 13.95c-0.51,3.57 0.68,5.1 3.91,6.29 5.61,1.87 15.14,3.74 25.86,3.74 19.22,0 37.42,-4.59 37.42,-28.07z"/>
                                                        {/* Caminho 4: Detalhe interno da caixa ("raio") */}
                                                        <path fill="#ED2B05" d="M10240.99 10130.51l0 3809.72 816.14 -465.19c170.05,-96.98 388.6,-37.29 485.43,132.93 96.98,170.22 37.12,388.26 -133.1,485.24l-898.76 512.35c-182.42,103.99 -387.93,161.85 -592.25,166.03 -7.21,1.17 -20.24,1.83 -33.13,1.83 -13.03,0 -26.09,-0.67 -33.1,-1.83 -204.15,-4.02 -410.5,-62.04 -592.75,-166.2l-3145.39 -1797.35c-389.43,-222.56 -628.54,-638.08 -628.54,-1086.19l0 -3594.67c0,-447.95 239.28,-863.8 628.54,-1086.36l3145.39 -1797.35c190.46,-108.84 406.31,-167.2 625.85,-167.2 219.4,0 435.42,58.52 625.88,167.2l3145.39 1797.35c389.26,222.56 628.54,638.41 628.54,1086.36l0 898.59c0,195.95 -159.69,355.83 -355.66,355.83 -196.14,0 -355.99,-159.69 -355.99,-355.83l0 -808.13 -1463.09 839.4c-15.05,11.03 -35.93,23.23 -52.84,30.25l-1816.56 1043.22zm2340.45 1986.78l1545.35 -1545.68c138.78,-138.78 364.7,-138.95 503.48,0.17 138.28,138.45 138.45,364.7 0,503.15l-1797.35 1797.16c-138.78,138.78 -364.51,138.78 -503.31,0l-898.73 -898.76c-138.62,-138.78 -138.45,-364.67 0.17,-503.29 138.78,-138.62 364.67,-138.62 503.29,0l647.11 647.26zm-3051.91 -1986.78l-3332.33 -1912.87 0 3504.21c0,192.62 102.33,372.71 269.86,468.36l3062.47 1749.53 0 -3809.22zm1661.06 -1365.59l-3327.31 -1903.86 -1303.07 744.42 3325.12 1908.85 1305.26 -749.42zm715.15 -410.33l1304.74 -749.11 -3052.41 -1744.01c-82.95,-47.49 -177.09,-73.55 -272.74,-73.55 -95.64,0 -189.77,26.06 -272.71,73.55l-1032.69 589.92 3325.81 1903.19z"/>
                                                    </g>
                                                  </svg>
                                            </div>
                                            <h3 className="font-bold text-lg mb-1">R$ 1.450,00</h3>
                                            <p className="text-[10px] text-brand-100 opacity-80">Saldo Disponível</p>
                                        </div>
                                        <div className="p-4 space-y-4">
                                            <div className="h-20 bg-gray-100 rounded-2xl"></div>
                                            <div className="space-y-2">
                                                <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                                            </div>
                                            <div className="h-32 bg-gray-100 rounded-2xl mt-4"></div>
                                        </div>
                                        {/* Bottom Navigation Mockup */}
                                        <div className="mt-auto h-16 bg-white border-t border-gray-100 flex justify-around items-center px-6">
                                            <div className="w-6 h-6 bg-brand-600 rounded-full"></div>
                                            <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                                            <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                                            <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                                        </div>
                                    </div>
                                    
                                    {/* Reflection Overlay */}
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-[2rem]"></div>
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
                                icon={<Zap className="w-8 h-8"/>}
                                title="Ultra Rápido"
                                description="Conexão instantânea entre lojas e entregadores. Otimização de rotas para entregas em tempo recorde."
                                colorClass="from-yellow-400 to-orange-500"
                            />
                            <BenefitCard 
                                icon={<Shield className="w-8 h-8"/>}
                                title="Segurança Total"
                                description="Verificação rigorosa de parceiros, monitoramento em tempo real e suporte dedicado para qualquer imprevisto."
                                colorClass="from-blue-500 to-cyan-500"
                            />
                            <BenefitCard 
                                icon={<Wallet className="w-8 h-8"/>}
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
                                className="bg-white text-brand-600 hover:bg-gray-100 py-6 px-10 text-lg rounded-2xl shadow-xl shadow-brand-900/20 transform hover:-translate-y-1 transition-all border-none"
                            >
                                <Store className="w-6 h-6 mr-3" />
                                Cadastrar Minha Loja
                            </Button>
                            <Button 
                                onClick={() => onSignupClick('DELIVERY_PARTNER')}
                                className="bg-gray-900 text-white hover:bg-gray-800 py-6 px-10 text-lg rounded-2xl shadow-xl shadow-gray-900/20 transform hover:-translate-y-1 transition-all border-none"
                            >
                                <Bike className="w-6 h-6 mr-3" />
                                Quero Entregar
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 pt-16 pb-8 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-1">
                            <div className="flex items-center gap-2 mb-6">
                                <Logo className="h-8 w-auto text-brand-600" />
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Conectando a cidade, uma entrega de cada vez. Tecnologia e eficiência para o seu negócio.
                            </p>
                            <div className="flex gap-4">
                                {socialLinks.instagram && <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Instagram className="w-5 h-5" /></a>}
                                {socialLinks.facebook && <a href={socialLinks.facebook} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Facebook className="w-5 h-5" /></a>}
                                {socialLinks.twitter && <a href={socialLinks.twitter} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Twitter className="w-5 h-5" /></a>}
                                {socialLinks.linkedin && <a href={socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Linkedin className="w-5 h-5" /></a>}
                            </div>
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Empresa</h4>
                            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                <li><button onClick={() => setCompanyModal('about')} className="hover:text-brand-600 transition-colors">Sobre Nós</button></li>
                                <li><button onClick={() => setCompanyModal('careers')} className="hover:text-brand-600 transition-colors">Carreiras</button></li>
                                <li><button onClick={() => setCompanyModal('press')} className="hover:text-brand-600 transition-colors">Imprensa</button></li>
                                <li><button onClick={() => setCompanyModal('contact')} className="hover:text-brand-600 transition-colors">Contato</button></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Legal</h4>
                            <ul className="space-y-3 text-sm text-gray-500 dark:text-gray-400">
                                <li><button onClick={() => setShowTermsModal(true)} className="hover:text-brand-600 transition-colors">Termos de Uso</button></li>
                                <li><button onClick={() => setShowPrivacyModal(true)} className="hover:text-brand-600 transition-colors">Política de Privacidade</button></li>
                                <li><button onClick={() => setShowCookieModal(true)} className="hover:text-brand-600 transition-colors">Cookies</button></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white mb-6">Baixe o App</h4>
                            <div className="space-y-3">
                                <button className="w-full bg-black text-white p-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors">
                                    <Smartphone className="w-5 h-5" />
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase">Disponível no</div>
                                        <div className="text-sm font-bold leading-none">Google Play</div>
                                    </div>
                                </button>
                                <button className="w-full bg-black text-white p-3 rounded-xl flex items-center justify-center gap-3 hover:bg-gray-800 transition-colors">
                                    <Smartphone className="w-5 h-5" />
                                    <div className="text-left">
                                        <div className="text-[10px] uppercase">Baixar na</div>
                                        <div className="text-sm font-bold leading-none">App Store</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400 text-center md:text-left">
                        <p>© {new Date().getFullYear()} Zé Entregas. Todos os direitos reservados.</p>
                        <p>Feito com 🧡 para o corre.</p>
                    </div>
                </div>
            </footer>

            {/* Modals */}
            {showTermsModal && <TermsOfService onClose={() => setShowTermsModal(false)} />}
            {showPrivacyModal && <PrivacyPolicy onClose={() => setShowPrivacyModal(false)} />}
            {showCookieModal && <CookiePreferencesModal onClose={() => setShowCookieModal(false)} />}
            {companyModal && <CompanyModal type={companyModal} onClose={() => setCompanyModal(null)} data={companyInfo} />}
        </div>
    );
};
