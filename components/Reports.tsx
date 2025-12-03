
import React, { useState } from 'react';
import { BarChart3, Calendar, TrendingUp, TrendingDown, DollarSign, Package, Gauge, PieChart } from 'lucide-react';
import { DeliveryRecord } from '../types';

interface ReportsProps {
  history: DeliveryRecord[];
  todayStats: {
    value: number;
    count: number;
    km: number;
  };
}

type Period = 'week' | 'month';

export const Reports: React.FC<ReportsProps> = ({ history, todayStats }) => {
  const [period, setPeriod] = useState<Period>('week');

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  // MERGE TODAY INTO HISTORY FOR CALCS
  const fullHistory: DeliveryRecord[] = [
    {
      id: 'today',
      date: new Date().toISOString(),
      formattedDate: 'Hoje',
      formattedTime: '',
      count: todayStats.count,
      totalValue: todayStats.value,
      totalKm: todayStats.km,
      timestamp: Date.now(),
      // We don't have detailed breakdown for "today" in reports props yet, strictly speaking, 
      // but simplistic total is enough for the bar charts.
    } as DeliveryRecord,
    ...history
  ].sort((a, b) => b.timestamp - a.timestamp); // Newest first

  // FILTER DATA BASED ON PERIOD
  const now = new Date();
  const filteredData = fullHistory.filter(item => {
    const itemDate = new Date(item.timestamp);
    if (period === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return itemDate >= sevenDaysAgo;
    } else {
      // Month
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    }
  });

  // CHART DATA PREP
  // Reverse for chart (Oldest -> Newest)
  const chartData = [...filteredData].reverse();
  const maxVal = Math.max(...chartData.map(d => d.totalValue || 0), 1);

  // SUMMARY TOTALS (FILTERED)
  const totalEarnings = filteredData.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
  const totalDeliveries = filteredData.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const totalKm = filteredData.reduce((acc, curr) => acc + (curr.totalKm || 0), 0);
  const averageTicket = totalDeliveries > 0 ? totalEarnings / totalDeliveries : 0;
  const earningsPerKm = totalKm > 0 ? totalEarnings / totalKm : 0;

  // Comparison Logic (Mock for now, or based on previous period)
  // Simple: Positive if earnings > 0
  const isPositiveTrend = totalEarnings > 0;

  // EXPENSE BREAKDOWN (Aggregated from history)
  const expenseStats: Record<string, number> = {};
  filteredData.forEach(record => {
    if (record.expenseBreakdown) {
      Object.entries(record.expenseBreakdown).forEach(([cat, val]) => {
        expenseStats[cat] = (expenseStats[cat] || 0) + (val as number);
      });
    }
  });
  
  const totalExpenses = Object.values(expenseStats).reduce((sum, val) => sum + val, 0);
  const hasExpenses = Object.keys(expenseStats).length > 0;
  const expenseCategories: Record<string, string> = {
    fuel: 'Combustível',
    food: 'Alimentação',
    maintenance: 'Manutenção',
    other: 'Outros'
  };
  const expenseColors: Record<string, string> = {
    fuel: 'bg-orange-500',
    food: 'bg-blue-500',
    maintenance: 'bg-gray-600',
    other: 'bg-rose-500'
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-6">
      
      {/* Period Selector */}
      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button 
          onClick={() => setPeriod('week')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${period === 'week' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
        >
          7 Dias
        </button>
        <button 
          onClick={() => setPeriod('month')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${period === 'month' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand-600 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
        >
          Este Mês
        </button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-brand-600 text-white p-4 rounded-2xl shadow-lg shadow-brand-200 dark:shadow-none relative overflow-hidden">
           <div className="relative z-10">
             <div className="text-xs font-bold uppercase opacity-80 mb-1 flex justify-between">
                Faturamento
                {isPositiveTrend ? <TrendingUp className="w-4 h-4 text-green-300"/> : <TrendingDown className="w-4 h-4 text-red-300"/>}
             </div>
             <div className="text-2xl font-black">{formatCurrency(totalEarnings)}</div>
             <div className="text-[10px] mt-1 opacity-70">
                {period === 'week' ? 'Últimos 7 dias' : 'Total acumulado em ' + now.toLocaleDateString('pt-BR', { month: 'long' })}
             </div>
           </div>
           <div className="absolute -right-4 -bottom-4 opacity-10"><DollarSign className="w-24 h-24" /></div>
        </div>

        <div className="grid grid-rows-2 gap-3">
           <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase">Entregas</div>
                <div className="font-bold text-lg dark:text-white">{totalDeliveries}</div>
              </div>
              <Package className="w-5 h-5 text-blue-500" />
           </div>
           <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase">R$ / KM</div>
                <div className="font-bold text-lg dark:text-white">{formatCurrency(earningsPerKm)}</div>
              </div>
              <Gauge className="w-5 h-5 text-orange-500" />
           </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2 mb-6">
          <BarChart3 className="w-4 h-4" />
          Desempenho Diário
        </h3>

        {chartData.length > 0 ? (
          <div className="flex items-end justify-between h-48 gap-2">
            {chartData.map((day) => {
              const heightPercent = Math.max(0, Math.min(100, ((day.totalValue || 0) / maxVal) * 100));
              const isToday = day.id === 'today';
              
              return (
                <div key={day.id} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="w-full flex-1 flex items-end justify-center relative">
                     {/* Invisible wrapper ensures flex item sizing */}
                     <div 
                      className={`w-full rounded-t-lg transition-all duration-500 ease-out relative min-h-[4px] ${isToday ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-600 group-hover:bg-brand-300'}`}
                      style={{ height: `${heightPercent}%` }}
                    >
                        {/* Tooltip Overlay */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] p-1 rounded whitespace-nowrap pointer-events-none z-10">
                            {formatCurrency(day.totalValue || 0)}
                        </div>
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold ${isToday ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400'}`}>
                    {day.formattedDate.substring(0, 3)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400">
            Sem dados para o período.
          </div>
        )}
      </div>

      {/* Expense Pie Chart */}
      {hasExpenses && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-bold text-gray-500 uppercase flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4" />
              Análise de Gastos
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative w-32 h-32 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        {Object.entries(expenseStats).reduce((acc, [category, value]) => {
                            const percent = (value / totalExpenses) * 100;
                            const offset = acc.offset;
                            const dashArray = `${percent} ${100 - percent}`;
                            acc.elements.push(
                                <circle
                                    key={category}
                                    className={`stroke-current ${expenseColors[category]?.replace('bg-', 'text-') || 'text-gray-400'}`}
                                    cx="18"
                                    cy="18"
                                    r="15.915"
                                    fill="transparent"
                                    strokeWidth="3.8"
                                    strokeDasharray={dashArray}
                                    strokeDashoffset={-offset} // SVG path direction fix
                                />
                            );
                            acc.offset += percent;
                            return acc;
                        }, { elements: [] as React.ReactElement[], offset: 0 }).elements}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-400">Total</span>
                        <span className="font-black text-lg text-gray-800 dark:text-white">{formatCurrency(totalExpenses)}</span>
                    </div>
                </div>
                <div className="w-full space-y-2">
                    {Object.entries(expenseStats).sort((a,b) => b[1] - a[1]).map(([category, value]) => (
                        <div key={category} className="flex justify-between items-center text-xs">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${expenseColors[category]}`}></div>
                                <span className="font-medium text-gray-600 dark:text-gray-300">{expenseCategories[category]}</span>
                            </div>
                            <div className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(value)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
