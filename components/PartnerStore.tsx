import React, { useState, useEffect } from 'react';
import { Store, Zap, Shield, BarChart3, MessageCircle, ArrowRight, CheckCircle, Smartphone, LayoutGrid, Users } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';

export const PartnerStore: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const onLoginClick = () => {
        window.location.href = '/login';
    };

    const onSignupClick = () => {
        window.location.href = '/cadastro?tipo=lojista';
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
            <header className="relative pt-32 pb-20 px-4 overflow-hidden bg-brand-600">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl delay-1000 animate-pulse"></div>

                <div className="max-w-6xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-bold mb-8 border border-white/20">
                        <Zap className="w-4 h-4 text-yellow-300" />
                        A plataforma número 1 para o seu negócio
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight tracking-tighter">
                        Venda mais com a <br /><span className="text-brand-100">Partner Store</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-brand-50 mb-12 max-w-3xl mx-auto leading-relaxed">
                        A solução completa para digitalizar sua loja, gerir pedidos e alcançar milhares de clientes com agilidade e inteligência artificial.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-6">
                        <Button onClick={onSignupClick} className="bg-white !text-brand-600 hover:bg-white/90 py-6 px-10 text-lg  font-black flex items-center gap-3">
                            Começar Agora <ArrowRight className="w-6 h-6 !text-brand-600" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">Tudo o que você precisa para crescer</h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                            Uma suíte completa de ferramentas pensadas para a rotina do lojista moderno.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <LayoutGrid className="w-10 h-10" />,
                                title: "Catálogo Digital Premium",
                                description: "Crie um cardápio online lindo em minutos, com fotos, categorias e controle de estoque real.",
                                color: "bg-blue-500"
                            },
                            {
                                icon: <MessageCircle className="w-10 h-10" />,
                                title: "IA de Atendimento (Zé)",
                                description: "Nosso assistente inteligente atende seus clientes no WhatsApp e fecha pedidos sozinho 24h por dia.",
                                color: "bg-brand-500"
                            },
                            {
                                icon: <BarChart3 className="w-10 h-10" />,
                                title: "Gestão Financeira",
                                description: "Acompanhe suas vendas, controle taxas e receba seus repasses com total transparência na carteira ZéPay.",
                                color: "bg-emerald-500"
                            },
                            {
                                icon: <Smartphone className="w-10 h-10" />,
                                title: "App Gestor",
                                description: "Gerencie tudo pelo celular: receba notificações, mude status de pedidos e veja seu faturamento.",
                                color: "bg-purple-500"
                            },
                            {
                                icon: <Shield className="w-10 h-10" />,
                                title: "Segurança Avançada",
                                description: "Proteção contra fraudes, verificação de entregadores e suporte prioritário para o seu negócio.",
                                color: "bg-orange-500"
                            },
                            {
                                icon: <Users className="w-10 h-10" />,
                                title: "Rede de Entregadores",
                                description: "Acesso instantâneo a milhares de entregadores parceiros verificados para entregas ultra rápidas.",
                                color: "bg-indigo-500"
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

            {/* Why Partner Section */}
            <section className="py-24 px-4 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 text-left">
                            <h2 className="text-4xl md:text-5xl font-black mb-10 leading-tight">Por que ser um parceiro <br />Partner Store?</h2>
                            <div className="space-y-6">
                                {[
                                    "Taxas justas e competitivas",
                                    "Recebimento rápido (D+1 disponível)",
                                    "Integração direta com WhatsApp",
                                    "Marketing integrado para sua região",
                                    "Suporte humanizado 7 dias por semana"
                                ].map((step, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                        <span className="text-lg font-bold text-gray-700 dark:text-gray-300">{step}</span>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={onSignupClick} className="mt-12 bg-brand-600 text-white hover:bg-brand-700 py-6 px-10 rounded-2xl text-lg font-black shadow-lg">
                                Quero Ser Parceiro
                            </Button>
                        </div>
                        <div className="flex-1 relative">
                            <div className="absolute inset-0 bg-brand-600/10 rounded-[40px] -rotate-3"></div>
                            <div className="relative bg-white dark:bg-gray-800 p-8 rounded-[40px] border border-gray-100 dark:border-gray-700 shadow-2xl">
                                <BarChart3 className="w-full h-auto text-brand-600 opacity-20" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center p-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl border border-white/20">
                                        <p className="text-brand-600 font-black text-6xl mb-2">+45%</p>
                                        <p className="text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest text-sm">Média de Crescimento</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-24 px-4 bg-brand-600 relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-8">O futuro do seu <br />negócio começa aqui.</h2>
                    <p className="text-xl text-brand-50 mb-12 max-w-2xl mx-auto">
                        Junte-se a milhares de lojistas que estão transformando a maneira de vender. Cadastro grátis e rápido.
                    </p>
                    <Button onClick={onSignupClick} className="inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-[0.98] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed gap-2 select-none bg-brand-600 text-white hover:bg-brand-700 border border-black/5 dark:border-white/10 dark:bg-brand-500 dark:hover:bg-brand-400  py-3 px-6 text-base rounded-2xl bg-white !text-brand-600 hover:bg-white/90 py-6 px-10 text-lg font-black flex items-center gap-3">
                        Criar Minha Loja Grátis
                    </Button>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="py-12 border-t border-gray-100 dark:border-gray-800 text-center">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <Logo className="h-6 w-auto opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all" />
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">
                        © {new Date().getFullYear()} Partner Store &bull; Zé Entregas Corp
                    </p>
                </div>
            </footer>
        </div>
    );
};
