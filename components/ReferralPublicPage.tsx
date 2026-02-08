import React, { useState, useEffect } from 'react';
import {
    Gift, Users, Store, Bike, ArrowRight, CheckCircle, Info, Loader2, Sparkles,
    Trophy, Heart, Rocket, Star, ChevronDown, ChevronUp, Share2, Wallet,
    Award, Target, Coins
} from 'lucide-react';
import * as cloud from '../services/cloud';
import { ReferralConfig } from '../types';
import { Button } from './Button';
import { Logo } from './Logo';

export const ReferralPublicPage: React.FC = () => {
    const [config, setConfig] = useState<ReferralConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });

        const init = async () => {
            try {
                const [configData, auth] = await Promise.all([
                    cloud.adminGetReferralConfig(),
                    cloud.getUserWithCache()
                ]);
                setConfig(configData);
                setCurrentUser(auth.user);
            } catch (error) {
                console.error('Erro ao inicializar página de indicação:', error);
            } finally {
                setLoading(false);
            }
        };
        init();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleGoToPanel = () => {
        window.location.href = '/home'; // Redireciona para o painel principal
    };

    const handleSignup = (type?: 'USER' | 'STORE_PARTNER' | 'DELIVERY_PARTNER') => {
        const event = new CustomEvent('navigateToTab', { detail: { tab: 'signup', signupType: type } });
        window.dispatchEvent(event);
    };

    const toggleFaq = (index: number) => {
        setOpenFaqIndex(openFaqIndex === index ? null : index);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 selection:bg-brand-100 selection:text-brand-900">
            {/* Header Dinâmico */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 dark:bg-gray-950/90 backdrop-blur-md shadow-sm py-4' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
                    <a href="/" className="flex-shrink-0 transition-transform hover:scale-105">
                        <Logo
                            className="h-8 w-auto"
                            variant={scrolled ? 'default' : 'full-white'}
                        />
                    </a>
                    <div className="flex items-center gap-4">
                        {currentUser ? (
                            <Button
                                onClick={handleGoToPanel}
                                className={`font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg ${scrolled ? '!bg-brand-600 !text-white hover:!bg-brand-700' : '!bg-white !text-brand-600 hover:!bg-gray-100'}`}
                            >
                                Meu Painel
                            </Button>
                        ) : (
                            <>
                                <Button
                                    onClick={() => window.location.href = '/login'}
                                    variant="ghost"
                                    className={`font-bold transition-all ${scrolled ? 'text-gray-700 dark:text-gray-200' : '!text-white hover:!bg-white/10'}`}
                                >
                                    Entrar
                                </Button>
                                <Button
                                    onClick={() => handleSignup()}
                                    className={`font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg ${scrolled ? '!bg-brand-600 !text-white hover:!bg-brand-700' : '!bg-white !text-brand-600 hover:!bg-gray-100'}`}
                                >
                                    Começar Agora
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section Premium */}
            <header className="relative pt-48 pb-32 px-4 overflow-hidden bg-brand-600 text-white">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

                <div className="max-w-5xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-black uppercase tracking-widest mb-8 border border-white/20 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700">
                        <Rocket className="w-4 h-4 text-yellow-300 animate-pulse" />
                        Seu impacto vale prêmios
                    </div>
                    <h1 className="text-4xl md:text-7xl font-black mb-8 leading-tight tracking-tighter animate-in fade-in slide-in-from-bottom-8 duration-700">
                        Transforme suas conexões em <span className="text-yellow-300">pontos reais.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-brand-50 mb-12 max-w-3xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-12 duration-1000">
                        Indique amigos, lojistas e entregadores para o Zé Entregas e seja recompensado por fortalecer a maior rede logística da cidade.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-16 duration-1000">
                        {currentUser ? (
                            <Button
                                onClick={handleGoToPanel}
                                className="!bg-white !text-brand-600 hover:scale-105 py-6 px-10 text-xl font-black rounded-2xl shadow-2xl transition-all"
                            >
                                Ir para o Painel
                            </Button>
                        ) : (
                            <Button
                                onClick={() => handleSignup()}
                                className="!bg-white !text-brand-600 hover:scale-105 py-6 px-10 text-xl font-black rounded-2xl shadow-2xl transition-all"
                            >
                                Quero indicar agora
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="pb-24">
                {/* How it Works - Step Cards */}
                <section className="py-24 px-4">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-6">Como funciona?</h2>
                            <p className="text-lg text-gray-500 dark:text-gray-400 font-medium max-w-2xl mx-auto">
                                Três passos simples para você começar a acumular pontos e trocar por vantagens.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: Share2,
                                    title: "1. Compartilhe",
                                    desc: "Cada usuário tem um código único. Envie para seus contatos via WhatsApp ou Redes Sociais.",
                                    color: "bg-blue-500"
                                },
                                {
                                    icon: Target,
                                    title: "2. Cadastro",
                                    desc: "Seu convidado se cadastra no sistema e realiza a primeira ação (compra ou ativação).",
                                    color: "bg-brand-500"
                                },
                                {
                                    icon: Coins,
                                    title: "3. Receba Pontos",
                                    desc: "Os pontos caem na sua conta automaticamente assim que a indicação for validada.",
                                    color: "bg-green-500"
                                }
                            ].map((step, idx) => (
                                <div key={idx} className="group p-10 bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                                    <div className={`w-16 h-16 ${step.color} text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform`}>
                                        <step.icon className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">{step.title}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Earnings Dashboard - Visualized Data */}
                <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900/40 border-y border-gray-100 dark:border-gray-800">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row items-end justify-between gap-6 mb-16">
                            <div className="max-w-2xl">
                                <span className="text-brand-600 font-black uppercase tracking-widest text-sm mb-4 block">Tabela de ganhos</span>
                                <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 leading-tight">Quanto você pode ganhar hoje?</h2>
                                <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">Os valores são cumulativos. Quanto mais você indica, mais rápido sua carteira de pontos cresce.</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-lg flex items-center gap-4">
                                <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl"><Award className="w-6 h-6 text-brand-600" /></div>
                                <div>
                                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-wider">Status do Programa</p>
                                    <p className="text-sm font-black text-green-600 uppercase">Ativo e Pagando</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-[42px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative bg-white dark:bg-gray-900 rounded-[40px] p-10 border border-gray-100 dark:border-gray-800 h-full flex flex-col">
                                    <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6"><Users className="w-7 h-7 text-blue-600" /></div>
                                    <h3 className="text-xl font-black mb-2">Indicar Amigo</h3>
                                    <p className="text-sm text-gray-500 mb-8 font-medium">Ganhe por cada novo cliente que realizar um pedido na plataforma.</p>
                                    <div className="mt-auto flex items-baseline gap-2">
                                        <span className="text-5xl font-black text-blue-600">{config?.points_per_referral_user || 100}</span>
                                        <span className="text-gray-400 font-bold uppercase text-xs tracking-widest">pts</span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-brand-500 rounded-[42px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative bg-white dark:bg-gray-900 rounded-[40px] p-10 border border-gray-100 dark:border-gray-800 h-full flex flex-col">
                                    <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-6"><Store className="w-7 h-7 text-purple-600" /></div>
                                    <h3 className="text-xl font-black mb-2">Indicar Loja</h3>
                                    <p className="text-sm text-gray-500 mb-8 font-medium">Recompensa alta por cada estabelecimento comercial ativado.</p>
                                    <div className="mt-auto flex items-baseline gap-2">
                                        <span className="text-5xl font-black text-purple-600">{config?.points_per_referral_store || 500}</span>
                                        <span className="text-gray-400 font-bold uppercase text-xs tracking-widest">pts</span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-[42px] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative bg-white dark:bg-gray-900 rounded-[40px] p-10 border border-gray-100 dark:border-gray-800 h-full flex flex-col">
                                    <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center mb-6"><Bike className="w-7 h-7 text-orange-600" /></div>
                                    <h3 className="text-xl font-black mb-2">Indicar Entregador</h3>
                                    <p className="text-sm text-gray-500 mb-8 font-medium">Fortaleça a frota e ganhe quando o parceiro realizar a 1ª entrega.</p>
                                    <div className="mt-auto flex items-baseline gap-2">
                                        <span className="text-5xl font-black text-orange-600">{config?.points_per_referral_courier || 200}</span>
                                        <span className="text-gray-400 font-bold uppercase text-xs tracking-widest">pts</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 bg-white dark:bg-gray-800 p-8 rounded-[32px] border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-600 shrink-0"><Info className="w-6 h-6" /></div>
                                <div className="text-sm">
                                    <p className="font-black text-gray-900 dark:text-white mb-1">Regras de Crédito</p>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-xl font-medium">
                                        Os pontos são calculados com base na configuração vigente do dia da indicação. {config?.min_order_value_for_credit ? `O bônus para indicação de usuários é ativado após a primeira compra acima de R$ ${config.min_order_value_for_credit}.` : 'O bônus de indicação cai na hora após a validação do cadastro.'} Validade dos pontos: {config?.reward_validity_days || 180} dias.
                                    </p>
                                </div>
                            </div>
                            <Button onClick={() => handleSignup()} variant="outline" className="px-8 py-4 rounded-2xl font-black text-sm whitespace-nowrap">
                                Ver todos os termos
                            </Button>
                        </div>
                    </div>
                </section>

                {/* FAQ Style Partner Page */}
                <section className="py-24 px-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Dúvidas Frequentes</h2>
                            <p className="text-gray-500 font-medium">Tudo o que você precisa saber sobre o programa.</p>
                        </div>
                        <div className="space-y-4">
                            {[
                                {
                                    q: "Onde encontro meu código de indicação?",
                                    a: "Após criar sua conta e fazer login, seu código estará disponível no Dashboard Principal, na seção 'Indique e Ganhe'. Lá você também encontra um link direto para compartilhar."
                                },
                                {
                                    q: "O que posso fazer com meus pontos?",
                                    a: "Seus pontos podem ser trocados no ZéMarket por cupons de desconto em pedidos, isenção de taxas de entrega, upgrade de fidelidade e até bônus em dinheiro no ZéBank dependendo do nível da sua conta."
                                },
                                {
                                    q: "Existe limite de indicações?",
                                    a: "Não! Você pode indicar quantas pessoas, lojas ou entregadores desejar. Quanto mais indicar, mais pontos irá acumular."
                                },
                                {
                                    q: "Quanto tempo demora para os pontos entrarem?",
                                    a: "A validação é automática. Assim que o sistema detectar que o novo usuário realizou a ação necessária (primeira compra ou aprovação de documentos), o saldo é atualizado instantaneamente."
                                }
                            ].map((item, i) => (
                                <div key={i} className="bg-white dark:bg-gray-900 rounded-[28px] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    <button
                                        onClick={() => toggleFaq(i)}
                                        className="w-full flex items-center justify-between p-7 text-left focus:outline-none"
                                    >
                                        <span className="font-bold text-lg text-gray-900 dark:text-white">{item.q}</span>
                                        {openFaqIndex === i ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                    </button>
                                    {openFaqIndex === i && (
                                        <div className="px-7 pb-7 text-gray-600 dark:text-gray-400 leading-relaxed font-medium border-t border-gray-50 dark:border-gray-800/50 pt-5">
                                            {item.a}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA Final Premium */}
                <section className="px-4">
                    <div className="max-w-5xl mx-auto bg-brand-600 rounded-[64px] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-[0_24px_48px_rgba(235,0,0,0.2)]">
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}></div>
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-6xl font-black mb-8 leading-tight">Comece a lucrar <br />com sua rede hoje.</h2>
                            <p className="text-xl text-brand-100 mb-12 max-w-xl mx-auto font-medium">Junte-se a milhares de parceiros que estão transformando indicações em benefícios reais.</p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                {currentUser ? (
                                    <Button
                                        onClick={handleGoToPanel}
                                        className="!bg-white !text-brand-600 hover:scale-105 py-6 px-12 text-xl font-black rounded-2xl shadow-2xl transition-all"
                                    >
                                        Acessar meu Painel
                                    </Button>
                                ) : (
                                    <>
                                        <Button
                                            onClick={() => handleSignup()}
                                            className="!bg-white !text-brand-600 hover:scale-105 py-6 px-12 text-xl font-black rounded-2xl shadow-2xl transition-all"
                                        >
                                            Abrir conta gratuita
                                        </Button>
                                        <Button
                                            onClick={() => window.location.href = '/login'}
                                            variant="outline"
                                            className="border-white/30 text-white hover:bg-white/10 py-6 px-12 text-xl font-black rounded-2xl"
                                        >
                                            Acessar minha conta
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Premium Footer */}
            <footer className="py-16 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                        <div className="flex flex-col items-center md:items-start gap-4">
                            <Logo className="h-8 w-auto" />
                            <p className="text-gray-400 text-sm font-medium max-w-xs text-center md:text-left">O maior programa de indicações logísticas do Brasil. Conectando pessoas e oportunidades.</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-8">
                            <a href="/" className="text-gray-500 hover:text-brand-600 font-black uppercase text-xs tracking-widest transition-colors">Home</a>
                            <a href="/faq" className="text-gray-500 hover:text-brand-600 font-black uppercase text-xs tracking-widest transition-colors">FAQ</a>
                            <a href="/partner-store" className="text-gray-500 hover:text-brand-600 font-black uppercase text-xs tracking-widest transition-colors">Seja Parceiro</a>
                            <a href="/privacidade" className="text-gray-500 hover:text-brand-600 font-black uppercase text-xs tracking-widest transition-colors">Privacidade</a>
                        </div>
                    </div>
                    <div className="mt-16 pt-8 border-t border-gray-50 dark:border-gray-900 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                        <span>© {new Date().getFullYear()} Zé Entregas Group</span>
                        <span>Desenvolvido com tecnologia de ponta</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};
