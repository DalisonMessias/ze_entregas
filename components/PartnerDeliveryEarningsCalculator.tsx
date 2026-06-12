import React, { useState, useMemo } from 'react';
import { PartnerFeeSettings } from '../types';
import { Calculator, Zap, Moon, CloudRain, Clock, MapPin, Calendar, TrendingUp, AlertCircle, BarChart3, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface Props {
    feeSettings: PartnerFeeSettings | null;
}

const SCENARIOS = {
    LEVE: { deliveriesPerDay: 5, daysPerWeek: 3, avgKm: 3, hoursPerDay: 4, period: 'TARDE' },
    MODERADO: { deliveriesPerDay: 12, daysPerWeek: 5, avgKm: 4, hoursPerDay: 6, period: 'MANHA_TARDE' },
    INTENSO: { deliveriesPerDay: 20, daysPerWeek: 6, avgKm: 5, hoursPerDay: 8, period: 'TARDE_NOITE' },
    INTEGRAL: { deliveriesPerDay: 30, daysPerWeek: 6, avgKm: 5, hoursPerDay: 10, period: 'TODOS' },
};

export const PartnerDeliveryEarningsCalculator: React.FC<Props> = ({ feeSettings }) => {
    // Campos da simulação
    const [deliveriesPerDay, setDeliveriesPerDay] = useState(15);
    const [daysPerWeek, setDaysPerWeek] = useState(5);
    const [avgKm, setAvgKm] = useState(4);
    const [hoursPerDay, setHoursPerDay] = useState(6);
    
    // Modificadores Adicionais (Simulados ou baseados em configurações do painel)
    const [isNight, setIsNight] = useState(false);
    const [isRain, setIsRain] = useState(false);
    const [isPeak, setIsPeak] = useState(false);

    // Cálculos
    const results = useMemo(() => {
        // Fallbacks caso a configuração ainda não tenha carregado
        const baseValue = feeSettings?.base_delivery_value || 5.00;
        const extraKmValue = feeSettings?.extra_km_value || 1.00;
        const baseKm = feeSettings?.base_delivery_km || 2;
        
        // Adicionais e Bônus (Estimativas comuns, usando regras dinâmicas se existissem na configuração)
        const nightBonus = isNight ? 1.50 : 0;
        const rainBonus = isRain ? 2.00 : 0;
        const peakBonus = isPeak ? 1.50 : 0;
        
        // Cálculo por entrega
        const kmExcedente = Math.max(0, avgKm - baseKm);
        const valorKmExcedente = kmExcedente * extraKmValue;
        
        const baseEntrega = baseValue + valorKmExcedente;
        const totalAdicionaisPorEntrega = nightBonus + rainBonus + peakBonus;
        const ganhoPorEntrega = baseEntrega + totalAdicionaisPorEntrega;

        // Projeções
        const ganhoDiario = ganhoPorEntrega * deliveriesPerDay;
        const ganhoSemanal = ganhoDiario * daysPerWeek;
        const ganhoMensal = ganhoSemanal * 4; // 4 semanas

        const mediaPorHora = hoursPerDay > 0 ? ganhoDiario / hoursPerDay : 0;
        const kmDiario = avgKm * deliveriesPerDay;
        
        const totalBonusDiario = totalAdicionaisPorEntrega * deliveriesPerDay;
        const totalBaseDiario = baseEntrega * deliveriesPerDay;

        return {
            ganhoPorEntrega,
            ganhoDiario,
            ganhoSemanal,
            ganhoMensal,
            mediaPorHora,
            kmDiario,
            totalBonusDiario,
            totalBaseDiario,
            baseValue,
            extraKmValue,
            baseKm
        };
    }, [feeSettings, deliveriesPerDay, daysPerWeek, avgKm, hoursPerDay, isNight, isRain, isPeak]);

    const applyScenario = (key: keyof typeof SCENARIOS) => {
        const scenario = SCENARIOS[key];
        setDeliveriesPerDay(scenario.deliveriesPerDay);
        setDaysPerWeek(scenario.daysPerWeek);
        setAvgKm(scenario.avgKm);
        setHoursPerDay(scenario.hoursPerDay);
        
        // Ajustar adicionais baseado no período do cenário
        if (scenario.period.includes('NOITE') || scenario.period === 'TODOS') setIsNight(true);
        else setIsNight(false);
        
        if (scenario.period.includes('TARDE') || scenario.period === 'TODOS') setIsPeak(true); // Simulando pico à tarde
        else setIsPeak(false);
        
        setIsRain(false);
    };

    const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

    return (
        <section className="py-24 px-4 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800" id="calculadora">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl mb-4">
                        <Calculator className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black mb-4 text-gray-900 dark:text-white tracking-tight">Simule seus ganhos</h2>
                    <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                        Utilizamos as regras e taxas reais da plataforma para estimar seus ganhos. Ajuste os campos abaixo e descubra o seu potencial.
                    </p>
                </div>

                {/* Cenários Rápidos */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                    <Button onClick={() => applyScenario('LEVE')} variant="outline" className="rounded-full text-sm font-bold hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 hover:border-green-300">Trabalho Leve</Button>
                    <Button onClick={() => applyScenario('MODERADO')} variant="outline" className="rounded-full text-sm font-bold hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 hover:border-green-300">Trabalho Moderado</Button>
                    <Button onClick={() => applyScenario('INTENSO')} variant="outline" className="rounded-full text-sm font-bold hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 hover:border-green-300">Trabalho Intenso</Button>
                    <Button onClick={() => applyScenario('INTEGRAL')} variant="outline" className="rounded-full text-sm font-bold hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 hover:border-green-300">Tempo Integral</Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* Controles de Simulação */}
                    <div className="lg:col-span-5 bg-gray-50 dark:bg-gray-900 rounded-[40px] p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
                        <h3 className="text-xl font-black mb-8 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-green-500" /> Sua Rotina
                        </h3>

                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="font-bold text-gray-700 dark:text-gray-300 text-sm">Entregas por dia</label>
                                    <span className="font-black text-green-600">{deliveriesPerDay}</span>
                                </div>
                                <input type="range" min="1" max="50" value={deliveriesPerDay} onChange={e => setDeliveriesPerDay(Number(e.target.value))} className="w-full accent-green-600" />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="font-bold text-gray-700 dark:text-gray-300 text-sm">Dias por semana</label>
                                    <span className="font-black text-green-600">{daysPerWeek} dias</span>
                                </div>
                                <input type="range" min="1" max="7" value={daysPerWeek} onChange={e => setDaysPerWeek(Number(e.target.value))} className="w-full accent-green-600" />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="font-bold text-gray-700 dark:text-gray-300 text-sm">Distância média (Km/entrega)</label>
                                    <span className="font-black text-green-600">{avgKm} km</span>
                                </div>
                                <input type="range" min="1" max="15" value={avgKm} onChange={e => setAvgKm(Number(e.target.value))} className="w-full accent-green-600" />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="font-bold text-gray-700 dark:text-gray-300 text-sm">Horas trabalhadas (por dia)</label>
                                    <span className="font-black text-green-600">{hoursPerDay}h</span>
                                </div>
                                <input type="range" min="1" max="14" value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))} className="w-full accent-green-600" />
                            </div>

                            <hr className="border-gray-200 dark:border-gray-800" />
                            
                            {/* Adicionais / Modificadores */}
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Adicionais Dinâmicos</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setIsNight(!isNight)}
                                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-bold text-left ${isNight ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300'}`}
                                    >
                                        <Moon className="w-4 h-4" /> Adicional Noturno
                                    </button>
                                    <button 
                                        onClick={() => setIsRain(!isRain)}
                                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-bold text-left ${isRain ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300'}`}
                                    >
                                        <CloudRain className="w-4 h-4" /> Bônus de Chuva
                                    </button>
                                    <button 
                                        onClick={() => setIsPeak(!isPeak)}
                                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm font-bold text-left ${isPeak ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-300'}`}
                                    >
                                        <TrendingUp className="w-4 h-4" /> Horário de Pico
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resultados */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        {/* Cards Principais */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-green-600 text-white p-8 rounded-[40px] shadow-xl shadow-green-600/20 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-20"><BarChart3 className="w-24 h-24" /></div>
                                <p className="text-green-100 font-bold mb-2 uppercase tracking-widest text-xs">Ganho Mensal Estimado</p>
                                <h3 className="text-4xl lg:text-5xl font-black mb-1">{formatCurrency(results.ganhoMensal)}</h3>
                                <p className="text-green-200 text-sm font-medium">Projeção para 4 semanas</p>
                            </div>
                            
                            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-[40px] shadow-sm">
                                <p className="text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase tracking-widest text-xs flex items-center gap-2">
                                    <Calendar className="w-4 h-4" /> Ganho Semanal
                                </p>
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-1">{formatCurrency(results.ganhoSemanal)}</h3>
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                        Média de {formatCurrency(results.ganhoDiario)} / dia
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Breakdown e Gráficos */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-8 rounded-[40px] shadow-sm flex-1">
                            <h4 className="font-black text-xl mb-6 text-gray-900 dark:text-white">Resumo e Composição</h4>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Por Entrega (Méd.)</p>
                                    <p className="font-black text-xl text-green-600">{formatCurrency(results.ganhoPorEntrega)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Por Hora Trabalhada</p>
                                    <p className="font-black text-xl text-gray-900 dark:text-white">{formatCurrency(results.mediaPorHora)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">KM Rodado / Dia</p>
                                    <p className="font-black text-xl text-gray-900 dark:text-white">{results.kmDiario} km</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Bônus Adicionais</p>
                                    <p className="font-black text-xl text-blue-600">{formatCurrency(results.totalBonusDiario)}/dia</p>
                                </div>
                            </div>

                            {/* Gráfico Simples Projeção */}
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-sm font-bold mb-1">
                                        <span className="text-gray-600 dark:text-gray-400">Valores Base das Entregas (Sem Bônus)</span>
                                        <span className="text-gray-900 dark:text-white">{formatCurrency(results.totalBaseDiario)}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                                        <div className="bg-gray-800 dark:bg-gray-400 h-3 rounded-full" style={{ width: `${(results.totalBaseDiario / results.ganhoDiario) * 100}%` }}></div>
                                    </div>
                                </div>
                                {results.totalBonusDiario > 0 && (
                                    <div>
                                        <div className="flex justify-between text-sm font-bold mb-1">
                                            <span className="text-blue-600">Total em Bônus Dinâmicos</span>
                                            <span className="text-blue-600">{formatCurrency(results.totalBonusDiario)}</span>
                                        </div>
                                        <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-3">
                                            <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${(results.totalBonusDiario / results.ganhoDiario) * 100}%` }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex items-start gap-3 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-2xl">
                                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-yellow-700 dark:text-yellow-500 font-medium">
                                    <strong>Os valores são estimativas</strong> baseadas nas configurações atuais da plataforma ({formatCurrency(results.baseValue)} base + {formatCurrency(results.extraKmValue)}/km extra). Os ganhos reais podem variar conforme demanda diária, rotas específicas, taxas de aceitação, gorjetas (que são 100% suas) e outras variáveis regionais.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
