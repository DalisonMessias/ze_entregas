import React, { useState, useEffect } from 'react';
import { Bike, Zap, Shield, Map, History, ArrowRight, CheckCircle, Navigation, Wallet, Clock, TrendingUp, Smartphone } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';
import * as cloud from '../services/cloud';
import { PartnerFeeSettings } from '../types';

export const PartnerDelivery: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);
    const [feeSettings, setFeeSettings] = useState<PartnerFeeSettings | null>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });

        const loadFees = async () => {
            try {
                const fees = await cloud.getPublicFeeSettings();
                setFeeSettings(fees);
            } catch (e) { }
        };

        loadFees();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const onLoginClick = () => {
        window.location.href = '/login';
    };

    const onSignupClick = () => {
        window.location.href = '/cadastro?tipo=entregador';
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100">
            {/* Header iFood Style */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    <a href="/" className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95">
                        <Logo
                            className="h-8 w-auto"
                            variant={scrolled ? 'default' : 'full-white'}
                        />
                    </a>
                    <div className="flex items-center gap-4">
                        {scrolled ? (
                            <>
                                <Button
                                    onClick={onLoginClick}
                                    className="bg-[#EA1D2C] text-white hover:bg-brand-700 font-bold px-6 rounded-xl transition-all"
                                >
                                    Entrar
                                </Button>
                                <Button
                                    onClick={onSignupClick}
                                    className="bg-[#EA1D2C] text-white hover:bg-brand-700 font-bold px-6 rounded-xl hidden md:block transition-all"
                                >
                                    Cadastrar
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    onClick={onLoginClick}
                                    variant="ghost"
                                    className="text-white font-bold hover:bg-white/10 hover:text-white"
                                >
                                    Entrar
                                </Button>
                                <Button
                                    onClick={onSignupClick}
                                    variant="ghost"
                                    className="text-white font-bold hover:bg-white/10 hover:text-white hidden md:block"
                                >
                                    Cadastrar
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </nav>
            {/* Hero Section */}
            <header className="relative pt-32 pb-20 px-4 overflow-hidden bg-green-600">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-green-400/20 rounded-full blur-3xl delay-1000 animate-pulse"></div>

                <div className="max-w-6xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-bold mb-8 border border-white/20">
                        <Bike className="w-4 h-4 text-white" />
                        Faça seu próprio horário e ganhe mais
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight tracking-tighter">
                        Entregue com a <br /><span className="text-green-100">Partner Delivery</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-green-50 mb-12 max-w-3xl mx-auto leading-relaxed">
                        A plataforma que valoriza o entregador. Ganhe dinheiro com total liberdade, rotas inteligentes e transparência absoluta nos pagamentos.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <Button onClick={onSignupClick} className="bg-white !text-green-700 hover:bg-white/90 py-6 px-10 text-lg rounded-2xl shadow-xl shadow-green-900/40 font-black flex items-center gap-3">
                            Quero Ser Entregador <ArrowRight className="w-6 h-6 !text-green-700" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <section className="py-16 bg-white dark:bg-gray-950 px-4 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[
                            { value: `R$ ${feeSettings?.base_delivery_value || '4,00 a 7'},00`, label: "Por Entrega" },
                            { value: "0% Taxa", label: "Plataforma Grátis" },
                            { value: "D+0", label: "Saque Instantâneo" },
                            { value: "Seguro", label: "Proteção Opcional" }
                        ].map((stat, i) => (
                            <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <p className="text-3xl md:text-4xl font-black text-green-600 mb-1">{stat.value}</p>
                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Advantages Section */}
            <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">O que faz a Partner ser diferente?</h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                            Tecnologia de ponta a serviço de quem realmente faz a entrega acontecer.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Navigation className="w-10 h-10" />,
                                title: "Rotas Inteligentes",
                                description: "Menos tempo no trânsito, mais dinheiro no bolso. Nosso algoritmo otimiza cada entrega para você rodar menos.",
                                color: "bg-blue-500"
                            },
                            {
                                icon: <Wallet className="w-10 h-10" />,
                                title: "ZeBank Integrado",
                                description: "Receba seus pagamentos instantaneamente. Controle seus ganhos e faça saques via PIX em segundos.",
                                color: "bg-emerald-500"
                            },
                            {
                                icon: <Smartphone className="w-10 h-10" />,
                                title: "App Nota 10",
                                description: "Interface intuitiva, mapa de calor com as melhores zonas e todos os detalhes do pedido na ponta do dedo.",
                                color: "bg-purple-500"
                            },
                            {
                                icon: <Shield className="w-10 h-10" />,
                                title: "Seguro Parceiro",
                                description: "Proteção para você e seu veículo durante as entregas. Segurança em primeiro lugar, sempre.",
                                color: "bg-orange-500"
                            },
                            {
                                icon: <Clock className="w-10 h-10" />,
                                title: "Liberdade Real",
                                description: "Trabalhe quando quiser, onde quiser. Você é o chefe da sua própria jornada e meta de ganhos.",
                                color: "bg-indigo-500"
                            },
                            {
                                icon: <TrendingUp className="w-10 h-10" />,
                                title: "Plano de Carreira",
                                description: "Cresça na plataforma! Parceiros de Elite têm taxas menores e prioridade nas melhores corridas.",
                                color: "bg-green-500"
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="group p-10 bg-white dark:bg-gray-800 rounded-[40px] border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                                <div className={`w-16 h-16 ${item.color} text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-2xl font-black mb-4">{item.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimony Section */}
            <section className="py-24 px-4">
                <div className="max-w-4xl mx-auto bg-green-600 rounded-[50px] p-12 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-2xl"></div>
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <History className="w-16 h-16 mb-8 text-green-200" />
                        <p className="text-2xl md:text-3xl font-medium mb-10 leading-relaxed italic">
                            "A Partner mudou a forma como eu trabalho. As taxas são as melhores do mercado e o PIX cai na hora. Rodar com segurança e liberdade faz toda a diferença no meu dia."
                        </p>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                                <Bike className="w-8 h-8" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-xl">Carlos Silva</p>
                                <p className="text-green-100 text-sm">Entregador Parceiro Elite</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-24 px-4 bg-gray-900 relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-8">Ligue o motor <br />e faça o seu futuro.</h2>
                    <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-medium">
                        O processo de cadastro leva menos de 5 minutos. Comece a entregar ainda hoje.
                    </p>
                    <Button onClick={onSignupClick} className="bg-green-600 text-white hover:bg-green-700 py-6 px-12 text-2xl rounded-3xl shadow-2xl font-black transition-transform hover:scale-105 active:scale-95 border-none">
                        Cadastrar Meu Veículo
                    </Button>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="py-12 border-t border-gray-100 dark:border-gray-800 text-center">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <Logo className="h-6 w-auto opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all" />
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">
                        © {new Date().getFullYear()} Partner Delivery &bull; Zé Entregas Corp
                    </p>
                </div>
            </footer>
        </div>
    );
};
