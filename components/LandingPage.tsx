import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Zap, Star, Instagram, Facebook, Twitter, Linkedin, ChevronLeft, ChevronRight, ArrowRight, Activity, DollarSign, Users, BarChart } from 'lucide-react';
import { Button } from './Button';
import { TermsOfService } from './TermsOfService';
import { PrivacyPolicy } from './PrivacyPolicy';
import { CookiePreferencesModal } from './CookiePreferencesModal';
import { CompanyModal } from './CompanyModals';
import { Logo } from './Logo';
import * as cloud from '../services/cloud';
import { ShopSettings } from '../types';

// #region --- Hooks ---

/**
 * Hook customizado para o carrossel.
 * Gerencia o estado do slide, navegação e autoplay.
 */
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

/**
 * Hook customizado para observar a interseção de um elemento.
 * Anima elementos quando entram na viewport.
 */
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
            if (ref) {
                observer.unobserve(ref);
            }
        };
    }, [ref, options]);

    return [setRef, isVisible] as const;
};

// #endregion

// #region --- New Block Components ---

const slideData = [
    {
        image: 'https://images.unsplash.com/photo-1579621970795-87facc2f976d?q=80&w=2070&auto=format&fit=crop', // Placeholder for "Painel de Controle"
        title: 'Painel de Controle Intuitivo',
        description: 'Gerencie todas as suas entregas, frotas e finanças em um dashboard unificado e poderoso.',
    },
    {
        image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=1887&auto=format&fit=crop', // Placeholder for "Rastreamento em Tempo Real"
        title: 'Rastreamento em Tempo Real',
        description: 'Acompanhe cada etapa da entrega com geolocalização precisa e atualizações instantâneas.',
    },
    {
        image: 'https://images.unsplash.com/photo-1604357209793-f5d928be2742?q=80&w=1974&auto=format&fit=crop', // Placeholder for "Otimização de Rotas"
        title: 'Otimização de Rotas Inteligente',
        description: 'Economize tempo e combustível com nosso algoritmo que calcula as rotas mais eficientes.',
    },
];

const HeroCarousel: React.FC = () => {
    const { currentSlide, nextSlide, prevSlide, goToSlide, pause, resume } = useCarousel(slideData.length);

    return (
        <section 
            id="home" 
            className="relative h-screen w-full overflow-hidden bg-gray-900"
            onMouseEnter={pause}
            onMouseLeave={resume}
        >
            <div className="absolute inset-0">
                {slideData.map((slide, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <img
                            src={slide.image}
                            alt={slide.title}
                            className="h-full w-full object-cover"
                            loading={index === 0 ? 'eager' : 'lazy'} // Carrega a primeira imagem imediatamente
                        />
                        <div className="absolute inset-0 bg-black/60"></div>
                    </div>
                ))}
            </div>

            <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-white p-6">
                <div className="w-full">
                    <div className="relative h-24 overflow-hidden mb-4">
                        {slideData.map((slide, index) => (
                             <div
                                key={index}
                                className={`absolute inset-0 transition-all duration-700 ease-in-out ${index === currentSlide ? 'opacity-100 transform-none' : 'opacity-0 transform translate-y-4'}`}
                            >
                                <h1 className="text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
                                    {slide.title}
                                </h1>
                             </div>
                        ))}
                    </div>
                    <div className="relative h-16 overflow-hidden mb-8">
                         {slideData.map((slide, index) => (
                             <p
                                key={index}
                                className={`absolute inset-0 text-lg leading-8 text-gray-300 transition-all duration-700 ease-in-out delay-100 ${index === currentSlide ? 'opacity-100 transform-none' : 'opacity-0 transform -translate-y-4'}`}
                             >
                                 {slide.description}
                             </p>
                        ))}
                    </div>
                   
                    <a href="#cta" className="inline-block">
                        <Button size="lg" className="rounded-full group">
                            Comece a usar
                            <ArrowRight className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
                        </Button>
                    </a>
                </div>
            </div>
            
            {/* Navegação */}
            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <ChevronLeft className="h-6 w-6 text-white"/>
            </button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <ChevronRight className="h-6 w-6 text-white"/>
            </button>

            {/* Paginação */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
                {slideData.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`h-2 w-2 rounded-full transition-all duration-300 ${index === currentSlide ? 'w-6 bg-brand-500' : 'bg-white/50 hover:bg-white'}`}
                    />
                ))}
            </div>
        </section>
    );
};

const AnimatedSection: React.FC<{children: React.ReactNode; className?: string}> = ({ children, className }) => {
    const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1, rootMargin: '0px 0px -100px 0px' });
    return (
        <section
            ref={ref}
            className={`transition-all duration-1000 ease-out ${className} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
            {children}
        </section>
    );
};

const SectionHeader: React.FC<{title: string; subtitle: string}> = ({ title, subtitle }) => (
    <div className="mb-16 text-center max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">
            {title}
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
            {subtitle}
        </p>
    </div>
);

const featureItems = [
  { icon: Activity, title: 'Dashboard Centralizado', description: 'Visão completa das operações, com relatórios e métricas em tempo real.' },
  { icon: BarChart, title: 'Relatórios Avançados', description: 'Gere insights valiosos para otimizar suas finanças, desempenho e logística.' },
  { icon: Users, title: 'Gestão de Equipe', description: 'Controle entregadores, parceiros e administradores com permissões flexíveis.' },
  { icon: DollarSign, title: 'Controle Financeiro', description: 'Gerencie taxas, comissões, pagamentos e a carteira digital de forma integrada.' },
];

const AdminPanelSection: React.FC = () => (
    <AnimatedSection className="py-24 px-6 bg-white dark:bg-gray-950/50">
        <div className="max-w-7xl mx-auto">
            <SectionHeader 
                title="Painel Administrativo Robusto"
                subtitle="Controle total sobre a sua operação logística com ferramentas poderosas e fáceis de usar."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {featureItems.map(item => (
                    <div key={item.title} className="text-center p-6">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-brand-50 dark:bg-gray-800 text-brand-600 dark:text-brand-400 mx-auto">
                           <item.icon className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
                    </div>
                ))}
            </div>
        </div>
    </AnimatedSection>
);

const benefits = [
  { icon: Zap, title: 'Performance PWA', description: 'App ultrarrápido, funciona offline e consome poucos dados e bateria.' },
  { icon: Shield, title: 'Segurança de Ponta', description: 'Dados criptografados, validação de identidade e transações seguras.' },
  { icon: Star, title: 'Ecossistema Justo', description: 'Taxas competitivas para lojistas e as melhores recompensas para entregadores.' },
];

const BenefitsSection: React.FC = () => (
     <AnimatedSection className="py-24 px-6 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                        Diferenciais que impulsionam o seu negócio
                    </h2>
                    <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
                        Nossa plataforma foi construída sobre pilares de tecnologia, segurança e justiça, criando um ambiente onde todos prosperam.
                    </p>
                    <div className="space-y-6">
                        {benefits.map(benefit => (
                            <div key={benefit.title} className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 shadow-md">
                                    <benefit.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{benefit.title}</h4>
                                    <p className="text-gray-600 dark:text-gray-400">{benefit.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="hidden md:block">
                     <img 
                        src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1887&auto=format&fit=crop" // placeholder
                        alt="Time colaborando" 
                        className="rounded-3xl shadow-2xl"
                        loading="lazy"
                    />
                </div>
            </div>
        </div>
     </AnimatedSection>
);

const UseCasesSection: React.FC = () => (
    <AnimatedSection className="py-24 px-6 bg-white dark:bg-gray-950/50">
        <div className="max-w-7xl mx-auto">
            <SectionHeader 
                title="Para Todos os Tipos de Negócio"
                subtitle="Seja você um restaurante, e-commerce ou farmácia, nossa plataforma se adapta às suas necessidades."
            />
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="relative p-8 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Restaurantes</h3>
                    <p className="text-gray-600 dark:text-gray-400">Entregas rápidas para garantir que a comida chegue quente e fresca ao cliente.</p>
                </div>
                <div className="relative p-8 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
                     <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">E-commerce</h3>
                    <p className="text-gray-600 dark:text-gray-400">Logística de same-day-delivery para encantar seus clientes e aumentar a conversão.</p>
                </div>
                <div className="relative p-8 rounded-2xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Serviços</h3>
                    <p className="text-gray-600 dark:text-gray-400">Coleta e entrega de documentos, produtos ou equipamentos com agilidade e segurança.</p>
                </div>
             </div>
        </div>
    </AnimatedSection>
);


const CtaSection: React.FC<Pick<LandingPageProps, 'onLoginClick' | 'onSignupClick'>> = ({ onLoginClick, onSignupClick }) => (
    <AnimatedSection className="py-24 px-6">
        <div
            className="max-w-5xl mx-auto bg-gray-900 rounded-[32px] p-12 md:p-20 text-center relative overflow-hidden">
            <div
                className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.05),_transparent)]"></div>
            <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                    Transforme sua logística hoje mesmo
                </h2>
                <p className="text-lg text-brand-50 mb-10 max-w-2xl mx-auto font-medium">
                    Junte-se a centenas de empresas que já estão economizando tempo e dinheiro.
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <Button onClick={() => onSignupClick('STORE_PARTNER')}
                        className="bg-brand-600 text-white hover:bg-brand-500 py-4 px-10 text-lg rounded-full shadow-2xl hover:scale-105 transition-transform duration-300">
                        Quero ser parceiro
                    </Button>
                    <Button onClick={() => onSignupClick('DELIVERY_PARTNER')}
                        className="bg-brand-600 text-white hover:bg-brand-500 py-4 px-10 text-lg rounded-full shadow-2xl hover:scale-105 transition-transform duration-300">
                        Quero ser entregador
                    </Button>
                    <Button onClick={onLoginClick} 
                        className="bg-brand-600 text-white hover:bg-brand-500 py-4 px-10 text-lg rounded-full shadow-2xl hover:scale-105 transition-transform duration-300">
                        Acessar minha conta
                    </Button>
                </div>
            </div>
        </div>
    </AnimatedSection>
);

// #endregion

// #region --- Main Components ---

const NavBar: React.FC<{ onLoginClick: () => void; isScrolled: boolean }> = ({ onLoginClick, isScrolled }) => (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <a href="#home" className="group flex items-center gap-2">
                <Logo className="h-8 md:h-10 w-auto text-brand-600 transition-transform group-hover:scale-105" mode="full" />
            </a>
            <div className="hidden md:flex gap-6 items-center">
                <a href="#features" className={`text-sm font-semibold transition-colors hover:text-brand-500 ${!isScrolled ? 'text-brand-600' : 'text-gray-600 dark:text-gray-300'}`}>Funcionalidades</a>
                <a href="#solutions" className={`text-sm font-semibold transition-colors hover:text-brand-500 ${!isScrolled ? 'text-brand-600' : 'text-gray-600 dark:text-gray-300'}`}>Soluções</a>
                <a href="#use-cases" className={`text-sm font-semibold transition-colors hover:text-brand-500 ${!isScrolled ? 'text-brand-600' : 'text-gray-600 dark:text-gray-300'}`}>Casos de Uso</a>
            </div>
            <div className="flex items-center gap-4">
                <Button onClick={onLoginClick} className="rounded-full px-6 shadow-lg shadow-brand-500/20">
                    Entrar
                </Button>
            </div>
        </div>
    </nav>
);

const Footer: React.FC<{
    shopSettings: ShopSettings | null;
    setShowTerms: (show: boolean) => void;
    setShowPrivacy: (show: boolean) => void;
    setShowCookiePrefs: (show: boolean) => void;
    setCompanyModal: (modal: 'about' | 'careers' | 'press' | 'contact' | null) => void;
    onLoginClick: () => void;
}> = ({ shopSettings, setShowTerms, setShowPrivacy, setShowCookiePrefs, setCompanyModal, onLoginClick }) => (
    <footer className="bg-white dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800/50 pt-20 pb-10 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
                <Logo className="h-8 w-auto text-brand-600 mb-6" mode="full" />
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">Plataforma completa para logística urbana inteligente, conectando lojistas a entregadores de elite.</p>
                <div className="flex gap-4">
                    {shopSettings?.social_media?.instagram && <a href={shopSettings.social_media.instagram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Instagram /></a>}
                    {shopSettings?.social_media?.facebook && <a href={shopSettings.social_media.facebook} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Facebook /></a>}
                    {shopSettings?.social_media?.linkedin && <a href={shopSettings.social_media.linkedin} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Linkedin /></a>}
                    {shopSettings?.social_media?.twitter && <a href={shopSettings.social_media.twitter} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-brand-600 transition-colors"><Twitter /></a>}
                </div>
            </div>
            <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-6">Empresa</h4>
                <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
                    <li><button onClick={() => setCompanyModal('about')} className="hover:text-brand-600 transition-colors">Sobre Nós</button></li>
                    <li><button onClick={() => setCompanyModal('careers')} className="hover:text-brand-600 transition-colors">Carreiras</button></li>
                    <li><button onClick={() => setCompanyModal('press')} className="hover:text-brand-600 transition-colors">Imprensa</button></li>
                    <li><button onClick={() => setCompanyModal('contact')} className="hover:text-brand-600 transition-colors">Contato</button></li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-6">Legal</h4>
                <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
                    <li><button onClick={() => setShowTerms(true)} className="hover:text-brand-600 transition-colors">Termos de Uso</button></li>
                    <li><button onClick={() => setShowPrivacy(true)} className="hover:text-brand-600 transition-colors">Política de Privacidade</button></li>
                    <li><button onClick={() => setShowCookiePrefs(true)} className="hover:text-brand-600 transition-colors">Cookies</button></li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-6">Acesso</h4>
                <Button onClick={onLoginClick} variant='outline' className="w-full">Área do Cliente</Button>
            </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800/50 pt-8 text-center text-sm text-gray-400">
            <p>© {new Date().getFullYear()} Zé Entregas. Todos os direitos reservados.</p>
        </div>
    </footer>
);

interface LandingPageProps {
    onLoginClick: () => void;
    onSignupClick: (type: 'STORE_PARTNER' | 'DELIVERY_PARTNER') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onSignupClick }) => {
    const [scrolled, setScrolled] = useState(false);
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
    
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

    // Smooth scroll for anchor links
    useEffect(() => {
        const handleAnchorClick = (event: MouseEvent) => {
            const target = event.target as HTMLAnchorElement;
            const href = target.getAttribute('href');
            if (href && href.startsWith('#')) {
                event.preventDefault();
                const element = document.getElementById(href.substring(1));
                if (element) {
                     const offset = 80; // Navbar height
                     const elementPosition = element.getBoundingClientRect().top;
                     const offsetPosition = elementPosition + window.pageYOffset - offset;
                     window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
            }
        };

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', handleAnchorClick);
        });

        return () => {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.removeEventListener('click', handleAnchorClick);
            });
        };
    }, []);

    return (
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen font-sans text-gray-800 dark:text-white selection:bg-brand-100 selection:text-brand-900">
            <NavBar onLoginClick={onLoginClick} isScrolled={scrolled} />

            <main>
                <HeroCarousel />
                <div id="features">
                    <AdminPanelSection />
                </div>
                <div id="solutions">
                    <BenefitsSection />
                </div>
                 <div id="use-cases">
                    <UseCasesSection />
                </div>
                <div id="cta">
                <CtaSection onLoginClick={onLoginClick} onSignupClick={onSignupClick} />
            </div>
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
// #endregion
