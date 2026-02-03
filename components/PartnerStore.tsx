import React, { useState, useEffect } from 'react';
import {
    Store, Zap, Shield, BarChart3, MessageCircle, ArrowRight, CheckCircle,
    Smartphone, LayoutGrid, Users, DollarSign, Crown, HelpCircle, ChevronDown,
    ChevronUp, Star, Rocket, MapPin, Grid
} from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';
import * as cloud from '../services/cloud';
import { PartnerFeeSettings } from '../types';
import { Loading } from './Loading';

export const PartnerStore: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [loadingFees, setLoadingFees] = useState(true);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Fetch public fee settings
        const loadFees = async () => {
            try {
                const data = await cloud.getPublicFeeSettings();
                setFees(data);
            } catch (error) {
                console.error("Erro ao carregar taxas:", error);
            } finally {
                setLoadingFees(false);
            }
        };
        loadFees();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const onLoginClick = () => {
        window.location.href = '/login';
    };

    const onSignupClick = () => {
        window.location.href = '/cadastro?tipo=lojista';
    };

    const toggleFaq = (index: number) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100">
            {/* Header */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-gray-950/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    <a href="/" className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95">
                        <Logo
                            className="h-8 w-auto"
                            variant={scrolled ? 'default' : 'full-white'}
                        />
                    </a>
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={onLoginClick}
                            variant={scrolled ? "ghost" : "ghost"}
                            className={`font-bold transition-all ${scrolled ? 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-white hover:bg-white/10'}`}
                        >
                            Entrar
                        </Button>
                        <Button
                            onClick={onSignupClick}
                            className={`font-bold px-6 rounded-xl transition-all ${scrolled ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-white text-brand-600 hover:bg-gray-100'}`}
                        >
                            Começar Grátis
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-32 pb-24 px-4 overflow-hidden bg-brand-600">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>

                <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-bold mb-8 border border-white/20 shadow-lg">
                            <Rocket className="w-4 h-4 text-yellow-300 animate-pulse" />
                            Acelere suas vendas hoje mesmo
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tighter">
                            Venda mais e gerencie melhor com o <span className="text-yellow-300">Zé Entregas</span>
                        </h1>
                        <p className="text-xl text-brand-50 mb-10 max-w-2xl mx-auto md:mx-0 leading-relaxed font-medium">
                            A plataforma completa que une entregas rápidas, gestão financeira e inteligência artificial para transformar o seu negócio.
                        </p>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center md:justify-start">
                            <Button onClick={onSignupClick} className="bg-white text-brand-600 hover:bg-brand-50 hover:scale-105 active:scale-95 py-6 px-8 text-lg font-black flex items-center gap-3 shadow-xl rounded-2xl transition-all">
                                Criar Loja Grátis <ArrowRight className="w-6 h-6" />
                            </Button>
                            <Button onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })} className="bg-brand-700 text-white hover:bg-brand-800 py-6 px-8 text-lg font-bold flex items-center gap-3 rounded-2xl shadow-lg transition-all border border-white/10">
                                Ver Planos
                            </Button>
                        </div>
                        <div className="mt-8 flex items-center justify-center md:justify-start gap-6 text-brand-100 text-sm font-medium">
                            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Sem taxa de adesão</span>
                            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Cadastro em 2 minutos</span>
                        </div>
                    </div>

                    <div className="flex-1 relative w-full max-w-lg md:max-w-none">
                        <div className="relative z-10 bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-2xl border border-gray-100 dark:border-gray-800 rotate-1 hover:rotate-0 transition-transform duration-500">
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl p-6 mb-6">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Faturamento Hoje</p>
                                        <h3 className="text-3xl font-black text-gray-900 dark:text-white">R$ 1.240,50</h3>
                                    </div>
                                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                        <ArrowRight className="w-3 h-3 -rotate-45" /> +15%
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {[1, 2, 3].map((_, i) => (
                                        <div key={i} className="flex items-center gap-4 bg-white dark:bg-gray-700 p-3 rounded-xl shadow-sm">
                                            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                                                <Store className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-800 dark:text-gray-200">Novo Pedido #{4820 + i}</p>
                                                <p className="text-xs text-gray-500">Aguardando confirmação</p>
                                            </div>
                                            <Button size="sm" className="bg-brand-600 text-white">Ver</Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between bg-brand-50 dark:bg-brand-900/20 p-4 rounded-2xl border border-brand-100 dark:border-brand-800/30">
                                <div className="flex items-center gap-3">
                                    <div className="bg-brand-600 p-2 rounded-lg text-white"><Crown className="w-5 h-5" /></div>
                                    <div>
                                        <p className="font-bold text-brand-900 dark:text-brand-100 text-sm">Modo Super Lojista</p>
                                        <p className="text-xs text-brand-700 dark:text-brand-300">Taxas Reduzidas Ativas</p>
                                    </div>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                            </div>
                        </div>
                        {/* Decorative elements behind */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-300 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-600 rounded-full blur-3xl opacity-20"></div>
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-gray-900 dark:text-white">O ecossistema completo</h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                            Tudo o que você precisa para operar, vender e crescer, em um só lugar.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <MessageCircle className="w-8 h-8" />,
                                title: "IA de Atendimento (Zé)",
                                description: "Nosso robô inteligente atende seus clientes no WhatsApp, tira dúvidas e fecha pedidos automaticamente.",
                                color: "bg-blue-500"
                            },
                            {
                                icon: <Users className="w-8 h-8" />,
                                title: "Entregadores Parceiros",
                                description: "Acesso imediato a uma rede de milhares de entregadores verificados. Aceite o pedido e acompanhe a entrega em tempo real.",
                                color: "bg-brand-500"
                            },
                            {
                                icon: <DollarSign className="w-8 h-8" />,
                                title: "ZéPay Integrado",
                                description: "Receba seus pagamentos com segurança, controle o fluxo de caixa, faça transferências Pix e pague contas.",
                                color: "bg-green-500"
                            },
                            {
                                icon: <Grid className="w-8 h-8" />,
                                title: "Catálogo & Loja Virtual",
                                description: "Seu próprio site de delivery personalizável. Crie promoções, cupons de desconto e organize seus produtos.",
                                color: "bg-purple-500"
                            },
                            {
                                icon: <BarChart3 className="w-8 h-8" />,
                                title: "Relatórios & Insights",
                                description: "Saiba quais são seus horários de pico, produtos mais vendidos e entregadores mais eficientes.",
                                color: "bg-orange-500"
                            },
                            {
                                icon: <Users className="w-8 h-8" />,
                                title: "Gestão de Equipe",
                                description: "Cadastre seus funcionários como gerentes, com acessos personalizados para ajudar na operação da loja.",
                                color: "bg-indigo-500"
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="group p-8 bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                <div className={`w-14 h-14 ${item.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{item.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Plans Comparison */}
            <section id="plans" className="py-24 px-4 bg-white dark:bg-gray-950">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-bold text-sm mb-4">
                            Escolha o melhor para você
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900 dark:text-white">Planos que cabem no bolso</h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                            Comece grátis e escale com o plano Super Lojista para ter taxas reduzidas, relatórios avançados e recursos exclusivos.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        {/* Free Plan */}
                        <div className="p-8 rounded-[40px] border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20 relative">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Lojista Parceiro</h3>
                            <p className="text-gray-500 text-sm mb-6">Ideal para quem está começando</p>
                            <div className="text-4xl font-black text-gray-900 dark:text-white mb-8">Grátis</div>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300">Loja Online e App Gestor</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300">Gestão de Pedidos Ilimitada</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300">Acesso a Rede de Entregadores</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300">ZéPay Básico (Recebimentos)</span>
                                </li>
                                <li className="flex items-center gap-3 opacity-50">
                                    <div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div></div>
                                    <span className="text-gray-400">Relatórios de Pico e Performance</span>
                                </li>
                                <li className="flex items-center gap-3 opacity-50">
                                    <div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div></div>
                                    <span className="text-gray-400">Regras de Frete Avançadas</span>
                                </li>
                            </ul>

                            <Button onClick={onSignupClick} variant="outline" className="w-full py-6 rounded-2xl font-bold text-lg border-2 hover:bg-white hover:text-brand-600">
                                Começar Grátis
                            </Button>
                        </div>

                        {/* Super Plan */}
                        <div className="p-8 rounded-[40px] border-2 border-brand-500 bg-white dark:bg-gray-900 shadow-2xl relative overflow-hidden transform md:-translate-y-4">
                            <div className="absolute top-0 right-0 bg-brand-500 text-white text-xs font-bold px-4 py-2 rounded-bl-2xl">
                                MAIS VANTAJOSO
                            </div>
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-400 to-yellow-400"></div>

                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">Super Lojista</h3>
                                <Crown className="w-6 h-6 text-yellow-400 fill-current" />
                            </div>
                            <p className="text-gray-500 text-sm mb-6">Para quem quer crescer de verdade</p>
                            <div className="flex items-baseline gap-1 mb-8">
                                {loadingFees ? (
                                    <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>
                                ) : (
                                    <>
                                        <span className="text-5xl font-black text-brand-600">
                                            {fees?.super_store_monthly_fee ? formatCurrency(fees.super_store_monthly_fee) : 'R$ 99,90'}
                                        </span>
                                        <span className="text-gray-500">/mês</span>
                                    </>
                                )}
                            </div>

                            <ul className="space-y-4 mb-10">
                                <li className="flex items-center gap-3">
                                    <div className="bg-brand-100 p-1 rounded-full text-brand-600"><CheckCircle className="w-4 h-4" /></div>
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">Tudo do plano Grátis</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="bg-brand-100 p-1 rounded-full text-brand-600"><CheckCircle className="w-4 h-4" /></div>
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">Taxas de entrega reduzidas</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="bg-brand-100 p-1 rounded-full text-brand-600"><CheckCircle className="w-4 h-4" /></div>
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">Relatórios Completos (Horários de Pico)</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="bg-brand-100 p-1 rounded-full text-brand-600"><CheckCircle className="w-4 h-4" /></div>
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">Gestão de Gerentes Adicionais</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="bg-brand-100 p-1 rounded-full text-brand-600"><CheckCircle className="w-4 h-4" /></div>
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">Regras de Frete Personalizadas</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <div className="bg-brand-100 p-1 rounded-full text-brand-600"><CheckCircle className="w-4 h-4" /></div>
                                    <span className="text-gray-900 dark:text-gray-100 font-medium">Suporte Prioritário via WhatsApp</span>
                                </li>
                            </ul>

                            <Button onClick={onSignupClick} className="w-full py-6 rounded-2xl font-bold text-lg bg-brand-600 hover:bg-brand-700 text-white shadow-xl shadow-brand-500/30">
                                Quero ser Super Lojista
                            </Button>
                            <p className="text-center text-xs text-gray-400 mt-4">Cancele quando quiser, sem multa.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900/30">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-black mb-4 text-gray-900 dark:text-white">Perguntas Frequentes</h2>
                        <p className="text-gray-500">Tire suas dúvidas sobre como funciona a parceria.</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                q: "Preciso pagar para me cadastrar?",
                                a: "Não! O cadastro é 100% gratuito. Você pode começar a usar a plataforma imediatamente no plano Lojista Parceiro sem mensalidade e pagar apenas pelos serviços utilizados (taxas de entrega)."
                            },
                            {
                                q: "Como funcionam as entregas?",
                                a: "Ao receber um pedido, você clica em 'Chamar Entregador' no seu painel. Nossa plataforma localiza o parceiro mais próximo e ele vai até sua loja retirar o pedido. Você acompanha o trajeto em tempo real no mapa."
                            },
                            {
                                q: "O que é o plano Super Lojista?",
                                a: `É uma assinatura mensal de ${fees?.super_store_monthly_fee ? formatCurrency(fees.super_store_monthly_fee) : 'valor reduzido'} que desbloqueia taxas de entrega reduzidas, relatórios detalhados de performance, gestão de equipe de gerentes e prioridade no suporte. Vale muito a pena para quem tem volume de vendas.`
                            },
                            {
                                q: "O dinheiro cai na hora?",
                                a: "As vendas feitas no dinheiro ficam com você na hora. Vendas online ou via ZéPay caem na sua carteira digital, onde você pode usar para pagar entregadores, contas ou transferir para seu banco."
                            },
                            {
                                q: "Preciso ter CNPJ?",
                                a: "Recomendamos, mas você pode começar o cadastro com CPF e regularizar depois conforme suas vendas aumentarem. A validação de identidade é obrigatória para segurança."
                            }
                        ].map((item, i) => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                <button
                                    onClick={() => toggleFaq(i)}
                                    className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                                >
                                    <span className="font-bold text-lg text-gray-900 dark:text-white">{item.q}</span>
                                    {openFaqIndex === i ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                </button>
                                {openFaqIndex === i && (
                                    <div className="px-6 pb-6 text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-4">
                                        {item.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-20 px-4 bg-brand-600 relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-8">Pronto para transformar seu negócio?</h2>
                    <Button onClick={onSignupClick} className="bg-white text-brand-600 hover:bg-gray-100 py-5 px-10 text-xl font-black rounded-2xl shadow-xl hover:scale-105 transition-transform">
                        Criar Minha Loja Agora
                    </Button>
                    <p className="text-brand-100 mt-6 text-sm font-medium">Junte-se a mais de 5.000 lojistas parceiros.</p>
                </div>
            </section>

            {/* Simple Footer */}
            <footer className="py-12 border-t border-gray-100 dark:border-gray-800 text-center bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                        <Logo className="h-6 w-auto" />
                        <span className="text-sm font-bold text-gray-500">Parceiros</span>
                    </div>
                    <p className="text-gray-400 text-sm font-medium">
                        © {new Date().getFullYear()} Zé Entregas. Todos os direitos reservados.
                    </p>
                    <div className="flex gap-6">
                        <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors text-sm font-bold">Termos</a>
                        <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors text-sm font-bold">Privacidade</a>
                        <a href="#" className="text-gray-400 hover:text-brand-600 transition-colors text-sm font-bold">Ajuda</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};
