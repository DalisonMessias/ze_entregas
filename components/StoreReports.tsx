
import React, { useState, useEffect } from 'react';
import { Loader2, BarChart3, Clock, Users } from 'lucide-react';
import { StoreReportData } from '../types';
import * as cloud from '../services/cloud';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const PeakHoursChart = ({ data }: { data: { hour: number, count: number }[] }) => {
    const max = Math.max(...data.map(d => d.count), 1);
    const fullDay = Array.from({ length: 24 }, (_, i) => {
        const hourData = data.find(d => d.hour === i);
        return { hour: i, count: hourData ? hourData.count : 0 };
    });

    return (
        <div className="flex items-end justify-between h-40 gap-1 w-full">
            {fullDay.map((item) => (
                <div key={item.hour} className="flex-1 flex flex-col items-center gap-1 group h-full justify-end">
                    <div className="w-full flex-1 flex items-end justify-center relative">
                        <div 
                            className="w-full bg-brand-200 dark:bg-brand-800 rounded-t-sm group-hover:bg-brand-400 dark:group-hover:bg-brand-500 transition-colors"
                            style={{ height: `${(item.count / max) * 100}%`, minHeight: '2px' }}
                        >
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-[10px] py-0.5 px-1.5 rounded pointer-events-none z-10">
                                {item.count}
                            </div>
                        </div>
                    </div>
                    <span className="text-[8px] font-bold text-gray-400">{item.hour.toString().padStart(2, '0')}h</span>
                </div>
            ))}
        </div>
    );
};

export const StoreReports: React.FC = () => {
    const [report, setReport] = useState<StoreReportData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadReport = async () => {
            setLoading(true);
            try {
                const data = await cloud.getStoreReportsData();
                setReport(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadReport();
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-10 h-10 animate-spin text-brand-600"/></div>;
    }

    if (!report) {
        return <div className="text-center text-gray-400 py-10">Não foi possível carregar os relatórios.</div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 font-bold uppercase">Total de Entregas</p>
                    <p className="text-3xl font-black text-gray-900 dark:text-white">{report.totalRequests}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 font-bold uppercase">Faturamento (Frete)</p>
                    <p className="text-3xl font-black text-green-600 dark:text-green-400">{formatCurrency(report.totalValue)}</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-gray-500"/> Horários de Pico
                </h3>
                <PeakHoursChart data={report.peakHours} />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                 <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-500"/> Desempenho dos Entregadores
                </h3>
                <div className="space-y-3">
                    {report.driverPerformance.length === 0 ? (
                        <p className="text-sm text-center text-gray-400 py-4">Nenhum dado de entregadores associados.</p>
                    ) : (
                        report.driverPerformance.map((driver, index) => (
                            <div key={driver.partner_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-sm text-gray-400 w-6">#{index + 1}</span>
                                    <p className="font-bold text-gray-900 dark:text-white">{driver.partner_name}</p>
                                </div>
                                <p className="font-black text-brand-600 dark:text-brand-400">{driver.count} <span className="text-xs font-normal text-gray-500">entregas</span></p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};