import React, { useEffect, useState } from 'react';
import { BarChart3, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as cloud from '../services/cloud';
import { DataErrorDisplay } from './DataErrorDisplay';

export const AdminDeliveryBreaks = () => {
    const { t } = useTranslation();
    const [breakStats, setBreakStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const loadStats = async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const bStats = await cloud.getDeliveryBreakStats();
            if (!signal?.aborted) {
                setBreakStats(bStats);
                setErrorMsg(null);
            }
        } catch (e: any) {
            if (e.name !== 'AbortError' && e.code !== '20') {
                console.error("Dashboard delivery breaks error:", e);
                const msg = e?.message || (typeof e === 'string' ? e : "Erro desconhecido ao carregar estatísticas.");
                setErrorMsg(msg);
            }
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        loadStats(controller.signal);

        const interval = setInterval(() => {
            if (!document.hidden) {
                loadStats(controller.signal);
            }
        }, 60000);

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, []);

    if (loading && !breakStats) {
        return (
            <div className="p-10 flex justify-center items-center">
                <div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (errorMsg && !breakStats) {
        return (
            <div className="p-8">
                <DataErrorDisplay title="Falha ao Carregar Dados" message={errorMsg} onRetry={() => loadStats()} />
            </div>
        );
    }

    return (
        <div className="space-y-[15px] animate-in fade-in p-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Clock className="w-6 h-6 text-amber-500" />
                {t('breaks.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('breaks.subtitle')}</p>            

            {breakStats && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">{t('breaks.totalBreaks')}</p>
                            <p className="text-3xl font-black text-amber-700 dark:text-amber-300 mt-2">{breakStats.total_breaks}</p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">{t('breaks.totalDuration')}</p>
                            <p className="text-3xl font-black text-orange-700 dark:text-orange-300 mt-2">
                                {Math.round(breakStats.total_duration_minutes)} min
                            </p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                            <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">{t('breaks.avgDuration')}</p>
                            <p className="text-3xl font-black text-red-700 dark:text-red-300 mt-2">
                                {breakStats.avg_duration_minutes} min
                            </p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" /> {t('breaks.rankingTitle')}
                        </h4>
                        {breakStats.ranking && breakStats.ranking.length > 0 ? (
                            <div className="overflow-hidden border border-gray-150 dark:border-gray-700 rounded-xl">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">
                                        <tr>
                                            <th className="px-6 py-4">{t('breaks.position')}</th>
                                            <th className="px-6 py-4">{t('breaks.driver')}</th>
                                            <th className="px-6 py-4 text-center">{t('breaks.breaksCount')}</th>
                                            <th className="px-6 py-4 text-right">{t('breaks.accumulatedTime')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-150 dark:divide-gray-700">
                                        {breakStats.ranking.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-sm dark:text-gray-200">
                                                <td className="px-6 py-4">
                                                    <span className="w-6 h-6 flex items-center justify-center bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-xs font-black">
                                                        {idx + 1}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-bold">{item.name}</td>
                                                <td className="px-6 py-4 text-center">{item.break_count} pausas</td>
                                                <td className="px-6 py-4 text-right font-black text-amber-600">{item.total_minutes} min</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <AlertTriangle className="w-8 h-8 text-gray-300 mb-3" />
                                <p className="text-sm text-gray-400 font-bold">{t('breaks.noRecords')}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
