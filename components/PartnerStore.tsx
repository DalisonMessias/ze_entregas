import React, { useState, useEffect } from 'react';
import {
    Store, Zap, Shield, BarChart3, MessageCircle, ArrowRight, CheckCircle,
    Smartphone, LayoutGrid, Users, DollarSign, Crown, HelpCircle, ChevronDown,
    ChevronUp, Star, Rocket, MapPin, Grid, Sparkles, CreditCard, Truck
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

        // Buscando configurações reais do sistema
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
                            className={`font-bold transition-all text-xs sm:text-base px-2 sm:px-4 ${scrolled ? 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800' : '!text-white hover:!bg-white/10'}`}
                        >
                            Entrar
                        </Button>
                        <Button
                            onClick={onSignupClick}
                            className={`font-bold text-xs sm:text-base px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all ${scrolled ? '!bg-brand-600 !text-white hover:!bg-brand-700' : '!bg-white !text-brand-600 hover:!bg-gray-100'}`}
                        >
                            <span className="sm:hidden">Criar Loja</span>
                            <span className="hidden sm:inline">Começar Grátis</span>
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
                            A solução completa para sua logística
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tighter">
                            A tecnologia que sua entrega <span className="text-yellow-300">precisa</span>
                        </h1>
                        <p className="text-xl text-brand-50 mb-10 max-w-2xl mx-auto md:mx-0 leading-relaxed font-medium">
                            Conecte sua loja à maior rede de entregadores, gerencie pedidos e automatize seu catálogo com Inteligência Artificial.
                        </p>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center md:justify-start">
                            <Button onClick={onSignupClick} className="!bg-gray-100 !text-brand-600 hover:!bg-gray-200 hover:scale-105 active:scale-95 py-6 px-8 text-lg font-black flex items-center gap-3 shadow-xl rounded-2xl transition-all">
                                Criar Loja Grátis <ArrowRight className="w-6 h-6" />
                            </Button>
                            <Button onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })} className="bg-brand-700 text-white hover:bg-brand-800 py-6 px-8 text-lg font-bold flex items-center gap-3 rounded-2xl shadow-lg transition-all border border-white/10">
                                Conheça o Super Lojista
                            </Button>
                        </div>
                        <div className="mt-8 flex items-center justify-center md:justify-start gap-6 text-brand-100 text-sm font-medium">
                            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Sem mensalidade obrigatória</span>
                            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Cadastro simplificado</span>
                        </div>
                    </div>

                    <div className="flex-1 relative w-full max-w-lg md:max-w-none">
                        <div className="relative z-10 bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-2xl border border-gray-100 dark:border-gray-800 rotate-1 hover:rotate-0 transition-transform duration-500">
                            {/* Mockup Realista baseado em StoreReports */}
                            <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl p-6 mb-6">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Desempenho Hoje</p>
                                        <h3 className="text-3xl font-black text-gray-900 dark:text-white">R$ 1.240,50</h3>
                                    </div>
                                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                                        <BarChart3 className="w-4 h-4" /> Relatórios
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 bg-white dark:bg-gray-700 p-3 rounded-xl shadow-sm">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold"><Truck className="w-5 h-5" /></div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800 dark:text-gray-200">Entrega #3920</p>
                                            <p className="text-xs text-green-600 font-bold">Concluída em 18 min</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-white dark:bg-gray-700 p-3 rounded-xl shadow-sm opacity-60">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold"><Truck className="w-5 h-5" /></div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800 dark:text-gray-200">Entrega #3919</p>
                                            <p className="text-xs text-gray-500">Finalizada</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between bg-brand-50 dark:bg-brand-900/20 p-4 rounded-2xl border border-brand-100 dark:border-brand-800/30">
                                <div className="flex items-center gap-3">
                                    <div className="bg-brand-600 p-2 rounded-lg text-white"><Sparkles className="w-5 h-5" /></div>
                                    <div>
                                        <p className="font-bold text-brand-900 dark:text-brand-100 text-sm">IA Criativa Ativa</p>
                                        <p className="text-xs text-brand-700 dark:text-brand-300">Catálogo Otimizado</p>
                                    </div>
                                </div>
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features Realistas (Baseadas na Auditoria de Código) */}
            <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-gray-900 dark:text-white">Ferramentas Reais para seu Negócio</h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                            Funcionalidades desenvolvidas pensando na operação real de delivery.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Truck className="w-8 h-8" />,
                                title: "Rede de Entregadores",
                                description: "Chame entregadores parceiros da plataforma diretamente pelo seu painel. O sistema localiza o parceiro mais próximo automaticamente.",
                                color: "bg-brand-500",
                                tag: "Essencial"
                            },
                            {
                                icon: <Sparkles className="w-8 h-8" />,
                                title: "IA Criativa de Produtos",
                                description: "Use nossa Inteligência Artificial para gerar descrições atraentes e profissionais para os itens do seu catálogo em segundos.",
                                color: "bg-purple-500",
                                tag: "Super Lojista"
                            },
                            {
                                icon: <CreditCard className="w-8 h-8" />,
                                title: "ZéPay Corporativo",
                                description: "Crie cartões virtuais para despesas da sua equipe e faça transferências B2B diretamente do saldo das suas vendas.",
                                color: "bg-green-500",
                                tag: "Super Lojista"
                            },
                            {
                                icon: <Grid className="w-8 h-8" />,
                                title: "Catálogo Digital",
                                description: "Tenha sua própria loja online. Configure produtos, adicionais e receba pedidos organizados no seu gestor.",
                                color: "bg-blue-500",
                                tag: "Grátis"
                            },
                            {
                                icon: <BarChart3 className="w-8 h-8" />,
                                title: "Relatórios Avançados",
                                description: "Visualize horários de pico, faturamento detalhado e desempenho individual de cada entregador (entregas realizadas).",
                                color: "bg-orange-500",
                                tag: "Super Lojista"
                            },
                            {
                                icon: <Users className="w-8 h-8" />,
                                title: "Gestão de Colaboradores",
                                description: "Cadastre garçons e equipe de cozinha. Acompanhe a produtividade e organize o fluxo de pedidos internos.",
                                color: "bg-indigo-500",
                                tag: "Grátis"
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="group p-8 bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                                {item.tag && (
                                    <span className={`absolute top-6 right-6 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${item.tag === 'Super Lojista' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                        {item.tag}
                                    </span>
                                )}
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

            {/* Plans Comparison - Baseado Estritamente no Código */}
            <section id="plans" className="py-24 px-4 bg-white dark:bg-gray-950">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-block px-4 py-1.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-bold text-sm mb-4">
                            Investimento Inteligente
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black mb-6 text-gray-900 dark:text-white">Compare e Decida</h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                            Do básico ao avançado, temos a solução certa para o estágio da sua empresa.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 items-start">
                        {/* Free Plan */}
                        <div className="p-8 rounded-[40px] border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/20 relative">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Lojista Parceiro</h3>
                            <p className="text-gray-500 text-sm mb-6">Start sem custos fixos</p>
                            <div className="text-4xl font-black text-gray-900 dark:text-white mb-8">Grátis</div>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300">Acesso à Rede de Entregadores</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300">Catálogo Digital Completo</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300">Gestão de Pedidos Ilimitada</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="text-gray-700 dark:text-gray-300">Gestão de Equipe (Colaboradores)</span>
                                </li>
                                <li className="flex items-center gap-3 opacity-50">
                                    <div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div></div>
                                    <span className="text-gray-400">IA Criativa para Produtos</span>
                                </li>
                                <li className="flex items-center gap-3 opacity-50">
                                    <div className="w-5 h-5 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div></div>
                                    <span className="text-gray-400">Taxa ZERO de Serviço na Entrega</span>
                                </li>
                            </ul>

                            <Button onClick={onSignupClick} variant="outline" className="w-full py-6 rounded-2xl font-bold text-lg border-2 hover:bg-white hover:text-brand-600">
                                Começar Grátis
                            </Button>
                        </div>

                        {/* Super Plan */}
                        {/* Super Plan - Redesign Premium */}
                        <div className="relative group">
                            {/* Gradient Border Glow */}
                            <div className="absolute -inset-[2px] bg-gradient-to-b from-brand-500 to-brand-600 rounded-[42px] blur sm opacity-20 group-hover:opacity-40 transition-opacity"></div>

                            <div className="relative bg-white dark:bg-gray-900 rounded-[40px] p-1 shadow-2xl transform md:-translate-y-4 h-full border border-brand-100 dark:border-brand-900/30">
                                {/* Border Gradient Wrapper */}
                                <div className="absolute inset-0 rounded-[40px] bg-gradient-to-b from-brand-500/20 to-transparent pointer-events-none"></div>

                                {/* Badge Flutuante */}
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                                    <div className="bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-lg shadow-brand-500/30 flex items-center gap-2 ring-4 ring-white dark:ring-gray-950">
                                        <Star className="w-3 h-3 fill-current text-yellow-300" />
                                        Recomendado
                                    </div>
                                </div>

                                <div className="p-8 pt-12 relative h-full flex flex-col">
                                    {/* Top Light Effect */}
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-brand-500/10 blur-[60px] rounded-full pointer-events-none"></div>

                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">Super Lojista</h3>
                                        <Crown className="w-6 h-6 text-yellow-400 fill-current" />
                                    </div>
                                    <p className="text-gray-500 text-sm mb-6">Para máxima eficiência e economia</p>
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
                                            <span className="text-gray-900 dark:text-gray-100 font-bold">Taxa ZERO de Serviço por Entrega</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="bg-brand-100 p-1 rounded-full text-brand-600"><CheckCircle className="w-4 h-4" /></div>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium">IA Criativa para Produtos</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="bg-brand-100 p-1 rounded-full text-brand-600"><CheckCircle className="w-4 h-4" /></div>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium">Relatórios Completos de Performance</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="bg-brand-100 p-1 rounded-full text-brand-600"><CheckCircle className="w-4 h-4" /></div>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium">Cartões Corporativos & Transferências</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <div className="bg-brand-100 p-1 rounded-full text-brand-600"><CheckCircle className="w-4 h-4" /></div>
                                            <span className="text-gray-900 dark:text-gray-100 font-medium">Regras de Frete Promocionais</span>
                                        </li>
                                    </ul>

                                    <Button onClick={onSignupClick} className="w-full py-6 rounded-2xl font-bold text-lg bg-brand-600 hover:bg-brand-700 text-white shadow-xl shadow-brand-500/30">
                                        Quero ser Super Lojista
                                    </Button>
                                    <p className="text-center text-xs text-gray-400 mt-4">Economia estimada de +20% em custos logísticos.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900/30">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-black mb-4 text-gray-900 dark:text-white">Dúvidas Comuns</h2>
                        <p className="text-gray-500">Entenda os detalhes operacionais.</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                q: "Como funciona a 'Taxa Zero' do Super Lojista?",
                                a: "No plano gratuito, cada entrega solicitada inclui uma pequena taxa de serviço da plataforma além do valor do entregador. Como Super Lojista, removemos essa taxa, e você paga apenas o valor líquido do quilômetro e do entregador. Para quem tem alto volume, a economia paga a assinatura."
                            },
                            {
                                q: "O que a IA faz pelo meu catálogo?",
                                a: "Nossa IA analisa o nome e categoria do seu produto e gera descrições vendedoras automaticamente. Isso ajuda a profissionalizar seu cardápio e aumentar a conversão de vendas, sem você perder tempo escrevendo textos."
                            },
                            {
                                q: "Posso cancelar o plano Super Lojista?",
                                a: `Sim, você pode cancelar a assinatura a qualquer momento. Ao cancelar, você volta para o plano Gratuito e perde o acesso às taxas reduzidas, IA e relatórios avançados ao fim do ciclo atual.`
                            },
                            {
                                q: "O ZéPay Corporativo é uma conta bancária?",
                                a: "Funciona como uma carteira digital empresarial. Você usa o saldo das suas vendas para criar cartões virtuais para sua equipe (ex: cartão para compras da cozinha) ou para transferir valores para outros parceiros da rede."
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
                    <h2 className="text-4xl md:text-5xl font-black text-white mb-8">Comece agora, evolua sempre.</h2>
                    <Button onClick={onSignupClick} className="!bg-white !text-brand-600 hover:!bg-gray-100 py-5 px-10 text-xl font-black rounded-2xl shadow-xl hover:scale-105 transition-transform">
                        Criar Minha Loja
                    </Button>
                    <p className="text-brand-100 mt-6 text-sm font-medium">Junte-se à revolução do delivery profissional.</p>
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
