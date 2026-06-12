import React, { useState, useEffect } from 'react';
import { Bike, Zap, Shield, Map, History, ArrowRight, CheckCircle, Navigation, Wallet, Clock, TrendingUp, Smartphone, Star, Crown, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Logo } from './Logo';
import { PartnerDeliveryEarningsCalculator } from './PartnerDeliveryEarningsCalculator';
import { getPublicFeeSettings, getPlatformStats } from '../services/cloud';
import { PartnerFeeSettings } from '../types';


export const PartnerDelivery = () => {
    // const navigate = useNavigate(); // Removido pois não estamos usando react-router-dom neste projeto
    const [scrolled, setScrolled] = useState(false);
    const [feeSettings, setFeeSettings] = useState<PartnerFeeSettings | null>(null);
    const [platformStats, setPlatformStats] = useState<{ cities: number | null, partners: number | null, deliveries: number | null } | null>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });

        const loadData = async () => {
            try {
                // Carregar em paralelo para performance
                const [fees, stats] = await Promise.all([
                    getPublicFeeSettings(),
                    getPlatformStats()
                ]);
                setFeeSettings(fees);
                setPlatformStats(stats);
            } catch (e) {
                console.error('Error loading partner data:', e);
            }
        };

        loadData();
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
                                    className="bg-[#EA1D2C] text-white hover:bg-brand-700 font-bold text-xs sm:text-base px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all"
                                >
                                    Entrar
                                </Button>
                                <Button
                                    onClick={onSignupClick}
                                    className="bg-[#EA1D2C] text-white hover:bg-brand-700 font-bold text-xs sm:text-base px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all"
                                >
                                    <span className="sm:hidden">Cadastro</span>
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
                                    onClick={onSignupClick}
                                    variant="ghost"
                                    className="text-white font-bold hover:bg-white/10 hover:text-white text-xs sm:text-base px-2 sm:px-4 border border-white/20 sm:border-none rounded-lg"
                                >
                                    <span className="sm:hidden">Cadastro</span>
                                    <span className="hidden sm:inline">Cadastrar</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section Reformulado */}
            <header className="relative pt-32 pb-24 px-4 overflow-hidden bg-gradient-to-br from-green-600 to-green-700">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white dark:from-gray-950 to-transparent"></div>

                <div className="max-w-6xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-bold mb-8 border border-white/20 shadow-lg">
                        <Crown className="w-4 h-4 text-yellow-300" />
                        Seja dono da sua própria jornada
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight tracking-tighter drop-shadow-lg">
                        Sua liberdade <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-200 to-white">tem valor aqui.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-green-50 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
                        Escolha como quer trabalhar: comece com liberdade total ou torne-se um Associado Elite para desbloquear benefícios exclusivos.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button onClick={onSignupClick} className="bg-white !text-green-700 hover:bg-gray-100 py-4 px-8 text-lg rounded-2xl shadow-xl font-black flex items-center justify-center gap-2 transform hover:scale-105 transition-all">
                            Quero me Cadastrar <ArrowRight className="w-5 h-5 !text-green-700" />
                        </Button>
                        <Button onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })} variant="outline" className="border-white/30 text-white hover:bg-white/10 py-4 px-8 text-lg rounded-2xl font-bold backdrop-blur-sm">
                            Ver Benefícios
                        </Button>
                    </div>
                </div>
            </header>

            {/* Comparativo de Níveis (Nova Seção) */}
            <section id="plans" className="py-20 px-4 bg-white dark:bg-gray-950">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-black mb-4 text-gray-900 dark:text-white tracking-tight">Escolha seu nível</h2>
                        <p className="text-lg text-gray-500 dark:text-gray-400">Comece grátis e evolua conforme seu desempenho.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Card Entregador Padrão */}
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-[40px] p-8 md:p-12 border border-gray-100 dark:border-gray-800 relative">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Entregador Padrão</h3>
                            <p className="text-gray-500 font-medium mb-8">Ideal para renda extra com total flexibilidade.</p>
                            <div className="text-4xl font-black text-gray-900 dark:text-white mb-8">Grátis<span className="text-base font-medium text-gray-400">/sempre</span></div>

                            <ul className="space-y-4 mb-10">
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="font-bold text-gray-700 dark:text-gray-300">Pagamentos D+1 (PIX)</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="font-bold text-gray-700 dark:text-gray-300">Acesso a todas as regiões</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="font-bold text-gray-700 dark:text-gray-300">Suporte via Chat</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                    <span className="font-bold text-gray-700 dark:text-gray-300">Sem horários fixos</span>
                                </li>
                            </ul>
                            <Button onClick={onSignupClick} variant="outline" className="w-full py-4 rounded-xl font-black border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
                                Começar Grátis
                            </Button>
                        </div>

                        {/* Card Associado Elite */}
                        <div className="bg-white dark:bg-gray-900 rounded-[40px] p-1 relative border-2 border-transparent bg-clip-padding" style={{ backgroundImage: 'linear-gradient(white, white), linear-gradient(to bottom right, #22c55e, #15803d)', backgroundOrigin: 'border-box', backgroundClip: 'content-box, border-box' }}>
                            {/* Gradient Border Glow Mock - usando div absoluta para garantir visual */}
                            <div className="absolute inset-0 rounded-[40px] border-2 border-green-500 opacity-50 blur-sm -z-10"></div>

                            <div className="bg-white dark:bg-gray-900 rounded-[36px] p-8 md:p-12 h-full relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-black px-4 py-2 rounded-bl-2xl">
                                    RECOMENDADO
                                </div>
                                <div className="absolute top-0 left-0 w-full h-24 bg-green-500/5 blur-3xl"></div>

                                <div className="flex items-center gap-2 mb-2">
                                    <Crown className="w-6 h-6 text-yellow-500 fill-current" />
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">Parceiro Associado</h3>
                                </div>
                                <p className="text-green-600 font-medium mb-8">Para quem quer viver de entregas e maximizar ganhos.</p>
                                <div className="text-4xl font-black text-gray-900 dark:text-white mb-8">VIP<span className="text-base font-medium text-gray-400">/acesso</span></div>

                                <ul className="space-y-4 mb-10">
                                    <li className="flex items-center gap-3">
                                        <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full"><CheckCircle className="w-4 h-4 text-green-600" /></div>
                                        <span className="font-bold text-gray-900 dark:text-white">Saques Instantâneos (D+0)</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full"><CheckCircle className="w-4 h-4 text-green-600" /></div>
                                        <span className="font-bold text-gray-900 dark:text-white">Taxas Reduzidas (Ganhe mais)</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full"><CheckCircle className="w-4 h-4 text-green-600" /></div>
                                        <span className="font-bold text-gray-900 dark:text-white">Prioridade na Fila de Pedidos</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full"><CheckCircle className="w-4 h-4 text-green-600" /></div>
                                        <span className="font-bold text-gray-900 dark:text-white">Seguro de Vida e Acidentes Completo</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded-full"><CheckCircle className="w-4 h-4 text-green-600" /></div>
                                        <span className="font-bold text-gray-900 dark:text-white">Suporte WhatsApp 24h Exclusivo</span>
                                    </li>
                                </ul>
                                <Button onClick={onSignupClick} className="w-full py-4 rounded-xl font-black bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-500/30">
                                    Quero ser Associado
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Advantages Grid */}
            <section className="py-24 px-4 bg-gray-50 dark:bg-gray-900/50">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Navigation className="w-10 h-10" />,
                                title: "Rotas Otimizadas",
                                description: "Nosso algoritmo garante que você rode menos e ganhe mais, agrupando entregas próximas.",
                                color: "bg-blue-500"
                            },
                            {
                                icon: <Wallet className="w-10 h-10" />,
                                title: "ZeBank Integrado",
                                description: "Conta digital gratuita integrada ao app. Controle ganhos, faça recargas e pague contas.",
                                color: "bg-emerald-500"
                            },
                            {
                                icon: <Shield className="w-10 h-10" />,
                                title: "Segurança Total",
                                description: "Monitoramento em tempo real e seguro contra acidentes para todos os parceiros ativos.",
                                color: "bg-orange-500"
                            },
                            {
                                icon: <Smartphone className="w-10 h-10" />,
                                title: "App Nota 10",
                                description: "Interface intuitiva, mapa de calor e modo escuro. Feito de entregador para entregador.",
                                color: "bg-purple-500"
                            },
                            {
                                icon: <Clock className="w-10 h-10" />,
                                title: "Flexibilidade",
                                description: "Sem chefe, sem horário. Ligue o app quando quiser trabalhar e desligue quando terminar.",
                                color: "bg-indigo-500"
                            },
                            {
                                icon: <TrendingUp className="w-10 h-10" />,
                                title: "Bonus e Metas",
                                description: "Campanhas semanais de incentivo e taxas dinâmicas em horários de pico e chuva.",
                                color: "bg-green-500"
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="group p-10 bg-white dark:bg-gray-800 rounded-[40px] border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                                <div className={`w-16 h-16 ${item.color} text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-2xl font-black mb-4">{item.title}</h3>
                                <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                                    {item.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <PartnerDeliveryEarningsCalculator feeSettings={feeSettings} />

            {/* Stats Section Simplified */}
            <section className="py-20 bg-white dark:bg-gray-950 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-black mb-12">Transparência em números</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            {
                                value: feeSettings ? `R$ ${feeSettings.base_delivery_value.toFixed(2).replace('.', ',')}` : '...',
                                label: "Mínimo por Entrega"
                            },
                            {
                                value: feeSettings ? `R$ ${feeSettings.extra_km_value.toFixed(2).replace('.', ',')}` : '...',
                                label: "Km Rodado Adicional"
                            },
                            { value: "100%", label: "Da Gorjeta é Sua" },
                            { value: "24h", label: "Suporte Humano" }
                        ].map((stat, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-3xl">
                                <p className="text-3xl font-black text-green-600 mb-1">{stat.value}</p>
                                <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-widest">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* New Platform Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-12 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex flex-col items-center">
                            <p className="text-4xl font-black text-gray-900 dark:text-white mb-1">
                                {platformStats?.cities ? `+${platformStats.cities}` : '...'}
                            </p>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Cidades Atendidas</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <p className="text-4xl font-black text-gray-900 dark:text-white mb-1">
                                {platformStats?.partners ? `+${platformStats.partners}` : '...'}
                            </p>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Parceiros Ativos</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <p className="text-4xl font-black text-gray-900 dark:text-white mb-1">
                                {platformStats?.deliveries ? `+${platformStats.deliveries}` : '...'}
                            </p>
                            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Entregas Realizadas</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-400 mt-8 italic">*Valores base podem variar conforme cidade e demanda dinâmica.</p>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-24 px-4 bg-gray-900 relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-8">Pronto para começar?</h2>
                    <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-medium">
                        Baixe o app, faça seu cadastro em 5 minutos e aguarde a aprovação.
                    </p>
                    <Button onClick={onSignupClick} className="bg-green-600 text-white hover:bg-green-700 py-6 px-12 text-2xl rounded-3xl shadow-2xl font-black transition-transform hover:scale-105 active:scale-95 border-none">
                        Cadastrar Agora
                    </Button>
                </div>
            </section>

            <footer className="py-12 border-t border-gray-100 dark:border-gray-800 text-center bg-white dark:bg-gray-950">
                <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4">
                    <Logo className="h-6 w-auto opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all" />
                    <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">
                        © {new Date().getFullYear()} &bull; Zé Entregas
                    </p>
                </div>
            </footer>
        </div>
    );
};
